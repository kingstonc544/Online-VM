import asyncio
import functools
import os
import platform
import random
import shutil
import signal
import socket
import subprocess
from typing import List, Dict, Any, Optional

from models.vm import VMConfig

# Maps vm_id -> {"process": asyncio.subprocess.Process, "monitor_socket": str, "vnc_port": int}
running_vms: Dict[str, Any] = {}

# QEMU processes found after a backend reload, when the in-memory registry is empty.
adopted_pids: Dict[str, int] = {}

KVM_DEVICE = "/dev/kvm"
DEFAULT_BRIDGE = "br0"

# Guest architectures this server can virtualize. "native" means the guest
# architecture is the same as the host, so KVM can run it unmodified;
# everything else is translated by QEMU's TCG engine (the Linux counterpart of
# Apple's Rosetta translation layer, in full-system form).
ARCHITECTURES: Dict[str, Dict[str, Any]] = {
    "x86_64": {
        "label": "x86-64 (64-bit Intel / AMD)",
        "binary": "qemu-system-x86_64",
        "machine": "q35",
        "cpu": "qemu64",
        "legacy_devices": True,
        "firmware": ("ovmf",),
    },
    "i386": {
        "label": "x86 (32-bit Intel)",
        "binary": "qemu-system-i386",
        "machine": "pc-i440fx",
        "cpu": "qemu32",
        "legacy_devices": True,
        "firmware": ("ovmf",),
    },
    "aarch64": {
        "label": "ARM64 (aarch64)",
        "binary": "qemu-system-aarch64",
        "machine": "virt",
        "cpu": "max",
        "legacy_devices": False,
        "firmware": ("aavmf",),
    },
    "arm": {
        "label": "ARM (32-bit)",
        "binary": "qemu-system-arm",
        "machine": "virt",
        "cpu": "cortex-a15",
        "legacy_devices": False,
        "firmware": ("aavmf32",),
    },
}

FIRMWARE_PATHS = {
    "ovmf": ["/usr/share/ovmf/OVMF.fd", "/usr/share/OVMF/OVMF_CODE.fd"],
    "aavmf": [
        "/usr/share/AAVMF/AAVMF_CODE.fd",
        "/usr/share/qemu-efi-aarch64/QEMU_EFI.fd",
    ],
    "aavmf32": [
        "/usr/share/AAVMF/AAVMF32_CODE.fd",
        "/usr/share/qemu-efi-arm/QEMU_EFI.fd",
    ],
}

ENGINE_LABELS = {
    "auto": "Automatic",
    "kvm": "Native (KVM)",
    "tcg": "Translation (TCG)",
}


class VirtualizationUnavailable(RuntimeError):
    """The requested type of virtualization cannot run on this host."""


def host_arch() -> str:
    """Normalized architecture of the host CPU."""
    machine = platform.machine().lower()
    if machine in ("x86_64", "amd64"):
        return "x86_64"
    if machine in ("i386", "i486", "i586", "i686", "x86"):
        return "i386"
    if machine in ("aarch64", "arm64"):
        return "aarch64"
    if machine.startswith("arm"):
        return "arm"
    return machine


def normalize_arch(arch: Optional[str]) -> str:
    """Return a supported architecture id, defaulting to x86_64."""
    return arch if arch in ARCHITECTURES else "x86_64"


def qemu_binary(arch: str) -> str:
    return ARCHITECTURES[normalize_arch(arch)]["binary"]


def binary_available(arch: str) -> bool:
    return shutil.which(qemu_binary(arch)) is not None


def firmware_path(kind: str) -> Optional[str]:
    for path in FIRMWARE_PATHS.get(kind, []):
        if os.path.exists(path):
            return path
    return None


def kvm_compatible(arch: str) -> bool:
    """True when KVM can virtualize this guest architecture on this host."""
    host = host_arch()
    return arch == host or (host == "x86_64" and arch == "i386")


def resolve_engine(vm: VMConfig) -> str:
    """Pick the effective engine ('kvm' or 'tcg') for the VM, or explain why not."""
    arch = normalize_arch(vm.guest_arch)
    requested = vm.virtualization if vm.virtualization in ENGINE_LABELS else "auto"

    if requested == "tcg":
        return "tcg"

    # KVM can only virtualize architectures the host CPU supports.
    if not kvm_compatible(arch):
        if requested == "kvm":
            raise VirtualizationUnavailable(
                f"Native KVM virtualization cannot run {ARCHITECTURES[arch]['label']} guests "
                f"on this {ARCHITECTURES.get(host_arch(), {}).get('label', host_arch())} host. "
                "Choose the translation (TCG) engine to emulate a foreign architecture."
            )
        return "tcg"

    if not kvm_available():
        if requested == "kvm":
            raise VirtualizationUnavailable(
                "Native KVM virtualization is unavailable: /dev/kvm is not present on this host. "
                "Choose automatic or translation (TCG) mode instead."
            )
        return "tcg"

    return "kvm"


def capabilities() -> Dict[str, Any]:
    """Describe the types of virtualization and guest architectures this host supports."""
    kvm = kvm_available()
    host = host_arch()

    engines = [
        {
            "id": "auto",
            "label": ENGINE_LABELS["auto"],
            "available": True,
            "reason": None,
            "description": (
                "Uses KVM whenever the host and guest architectures match and /dev/kvm is "
                "available; otherwise falls back to software translation."
            ),
        },
        {
            "id": "kvm",
            "label": ENGINE_LABELS["kvm"],
            "available": kvm,
            "reason": None if kvm else "/dev/kvm is not available on this host",
            "description": (
                "Runs guest instructions directly on the host CPU through hardware "
                "virtualization. Fastest, but limited to the host architecture."
            ),
        },
        {
            "id": "tcg",
            "label": ENGINE_LABELS["tcg"],
            "available": True,
            "reason": None,
            "description": (
                "Translates guest instructions to the host CPU at runtime — the Linux "
                "counterpart of Apple's Rosetta — so foreign-architecture systems run "
                "without hardware virtualization. Slower than KVM."
            ),
        },
    ]

    architectures = []
    for arch, profile in ARCHITECTURES.items():
        installed = binary_available(arch)
        firmware_kind = profile["firmware"][0]
        firmware_ok = firmware_kind == "ovmf" or firmware_path(firmware_kind) is not None
        reason = None
        if not installed:
            reason = f"{profile['binary']} is not installed on the server"
        elif not firmware_ok:
            reason = "UEFI firmware for this architecture is not installed on the server"
        architectures.append({
            "id": arch,
            "label": profile["label"],
            "available": installed and firmware_ok,
            "native": arch == host,
            "reason": reason,
        })

    return {
        "host_arch": host,
        "host_label": ARCHITECTURES.get(host, {}).get("label", host),
        "kvm_available": kvm,
        "engines": engines,
        "architectures": architectures,
    }


def monitor_socket_path(vm_id: str) -> str:
    return f"/tmp/qemu-{vm_id}.sock"


def _pid_alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False
    except PermissionError:
        return True


def _find_qemu_pid(vm_id: str) -> Optional[int]:
    """Locate a QEMU process for this VM by its monitor socket in /proc cmdline."""
    marker = monitor_socket_path(vm_id)
    try:
        entries = os.listdir("/proc")
    except OSError:
        return None
    for name in entries:
        if not name.isdigit():
            continue
        try:
            with open(f"/proc/{name}/cmdline", "rb") as handle:
                cmdline = handle.read().decode(errors="ignore")
        except OSError:
            continue
        if "qemu-system" in cmdline and marker in cmdline:
            return int(name)
    return None


def qemu_pid(vm_id: str) -> Optional[int]:
    """PID of the VM's QEMU process, whether tracked here or started before a reload."""
    entry = running_vms.get(vm_id)
    if entry:
        return entry["process"].pid if entry["process"].returncode is None else None

    pid = adopted_pids.get(vm_id)
    if pid and _pid_alive(pid):
        return pid
    pid = _find_qemu_pid(vm_id)
    if pid:
        adopted_pids[vm_id] = pid
    else:
        adopted_pids.pop(vm_id, None)
    return pid


def kvm_available() -> bool:
    """True when the host exposes /dev/kvm and it is usable."""
    return os.path.exists(KVM_DEVICE) and os.access(KVM_DEVICE, os.R_OK | os.W_OK)


def bridge_available(name: str = DEFAULT_BRIDGE) -> bool:
    """True when the requested bridged network device exists on the host."""
    return os.path.isdir(f"/sys/class/net/{name}")


@functools.lru_cache(maxsize=1)
def audio_driver() -> str:
    """Pick an audio backend this QEMU build can actually open."""
    try:
        result = subprocess.run(
            ["qemu-system-x86_64", "-audiodev", "help"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        lines = result.stdout.splitlines()
    except Exception:
        return "none"
    drivers = {
        line.strip()
        for line in lines
        if line.strip() and not line.lower().startswith("available")
    }
    # VNC carries no audio anyway; only use a real device when it can open.
    if "pa" in drivers:
        return "pa"
    if "alsa" in drivers and os.path.isdir("/dev/snd"):
        return "alsa"
    return "none"


def find_free_vnc_port() -> int:
    """Scan ports 5900-5999 and return the first free one."""
    used_ports = {v["vnc_port"] for v in running_vms.values()}
    for port in range(5900, 6000):
        if port in used_ports:
            continue
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            s.bind(("127.0.0.1", port))
            s.close()
            return port
        except OSError:
            pass
    raise RuntimeError("No free VNC ports available in range 5900-5999")


def build_qemu_args(vm: VMConfig) -> List[str]:
    """Build the QEMU argument list for the VM's selected type of virtualization."""
    arch = normalize_arch(vm.guest_arch)
    profile = ARCHITECTURES[arch]
    binary = profile["binary"]
    if not binary_available(arch):
        raise VirtualizationUnavailable(
            f"{profile['label']} emulation is not installed on the server ({binary} is missing)."
        )

    engine = resolve_engine(vm)
    legacy = profile["legacy_devices"]

    args = [binary]

    # Name
    args += ["-name", vm.name]

    # Machine type. x86 keeps the configured chipset; other architectures use
    # their generic "virt" board, which only exists with the right firmware.
    if arch == "x86_64" and vm.machine_type in ("q35", "pc-i440fx"):
        machine = vm.machine_type
    else:
        machine = profile["machine"]

    if engine == "kvm":
        args += ["-machine", f"{machine},accel=kvm"]
    else:
        args += ["-machine", machine]
        # Multi-threaded TCG plus a larger translation cache is noticeably
        # faster than the single-threaded default. This is the translation
        # layer that runs foreign-architecture guests on this host.
        args += ["-accel", "tcg,thread=multi,tb-size=512"]

    # CPU ("host" only exists with KVM; TCG needs a portable model)
    if legacy:
        cpu_model = vm.cpu_model or profile["cpu"]
        if engine == "tcg" and cpu_model in ("host", "host-passthrough"):
            cpu_model = "max"
        if arch == "i386" and cpu_model not in ("qemu32", "pentium3", "coreduo"):
            cpu_model = profile["cpu"]
    else:
        cpu_model = profile["cpu"]
    args += ["-cpu", cpu_model]
    args += ["-smp", str(vm.cpu_cores)]
    args += ["-m", str(vm.ram_mb)]

    # Disk
    if vm.disk_path:
        disk = f"file={vm.disk_path},format={vm.disk_format},cache=writeback"
        if legacy:
            args += ["-drive", f"{disk},if=virtio"]
        else:
            args += ["-drive", f"{disk},if=none,id=disk0"]
            args += ["-device", "virtio-blk-pci,drive=disk0"]

    # CD-ROM / ISO. x86 boards offer an IDE CD-ROM; virt boards attach the
    # image through virtio-scsi instead.
    if vm.iso_path:
        if legacy:
            args += ["-cdrom", vm.iso_path]
        else:
            args += ["-drive", f"file={vm.iso_path},format=raw,media=cdrom,readonly=on,if=none,id=cd0"]
            args += ["-device", "virtio-scsi-pci,id=scsi0"]
            args += ["-device", "scsi-cd,drive=cd0"]

    # Boot order
    args += ["-boot", f"order={vm.boot_order}"]

    # Network
    mac_suffix = ":".join([f"{random.randint(0, 255):02x}" for _ in range(3)])
    mac = f"52:54:00:{mac_suffix}"

    network_type = vm.network_type
    # A bridge that does not exist would make QEMU exit immediately; fall back to NAT.
    if network_type == "bridged" and not bridge_available():
        network_type = "nat"

    if network_type == "nat":
        args += ["-netdev", "user,id=net0"]
        args += ["-device", f"{vm.network_interface},netdev=net0,mac={mac}"]
    elif network_type == "bridged":
        args += ["-netdev", f"bridge,id=net0,br={DEFAULT_BRIDGE}"]
        args += ["-device", f"{vm.network_interface},netdev=net0"]
    elif network_type == "host-only":
        args += ["-netdev", "user,id=net0,restrict=on"]
        args += ["-device", f"{vm.network_interface},netdev=net0,mac={mac}"]
    # "none" — skip network args

    # VNC display — bound to loopback only; browsers reach it through the WebSocket proxy.
    display = vm.vnc_port - 5900
    vnc_arg = f"127.0.0.1:{display}"
    if vm.vnc_password:
        vnc_arg += ",password=on"
    args += ["-vnc", vnc_arg]

    # Monitor socket
    monitor_socket = f"/tmp/qemu-{vm.id}.sock"
    args += ["-monitor", f"unix:{monitor_socket},server,nowait"]

    # USB
    if vm.usb_enabled:
        if legacy:
            args += ["-usb", "-device", "usb-tablet"]
        else:
            # virt boards have no legacy USB controller.
            args += ["-device", "qemu-xhci,id=xhci"]
            args += ["-device", "usb-tablet,bus=xhci.0"]

    # Sound
    if vm.sound_enabled:
        sound_model = vm.sound_model if legacy else "ich9-intel-hda"
        args += ["-audiodev", f"{audio_driver()},id=audio0"]
        if "hda" in sound_model.lower():
            # HDA controllers have no audiodev property; the codec carries it.
            args += ["-device", sound_model]
            args += ["-device", "hda-duplex,audiodev=audio0"]
        else:
            args += ["-device", f"{sound_model},audiodev=audio0"]

    # Firmware. x86 can use BIOS or OVMF; every other board has no legacy BIOS
    # and boots the architecture's UEFI firmware.
    if not legacy:
        kind = profile["firmware"][0]
        path = firmware_path(kind)
        if not path:
            raise VirtualizationUnavailable(
                f"UEFI firmware for {profile['label']} is not installed on the server."
            )
        args += ["-drive", f"if=pflash,format=raw,readonly=on,file={path}"]
    elif vm.enable_uefi:
        path = firmware_path("ovmf")
        if path:
            args += ["-bios", path]

    return args


async def _wait_for_vnc(host: str, port: int, timeout: float = 15.0) -> bool:
    """Wait until the VNC server accepts TCP connections."""
    loop = asyncio.get_running_loop()
    deadline = loop.time() + timeout
    while loop.time() < deadline:
        try:
            _, writer = await asyncio.open_connection(host, port)
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:
                pass
            return True
        except OSError:
            await asyncio.sleep(0.25)
    return False


async def start_vm(vm: VMConfig) -> None:
    """Create disk if missing, then launch QEMU and register the process."""
    # Create disk image if it doesn't exist yet
    if vm.disk_path and not os.path.exists(vm.disk_path):
        await create_disk(vm.disk_path, vm.disk_size_gb, vm.disk_format)

    # Pick a free VNC port
    vnc_port = find_free_vnc_port()
    vm.vnc_port = vnc_port

    args = build_qemu_args(vm)
    monitor_socket = monitor_socket_path(vm.id)

    # A stale monitor socket from a crashed VM makes QEMU refuse to start.
    try:
        os.unlink(monitor_socket)
    except FileNotFoundError:
        pass
    except OSError:
        pass

    process = await asyncio.create_subprocess_exec(
        *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    if not await _wait_for_vnc("127.0.0.1", vnc_port):
        # QEMU died or never opened its VNC port: report why instead of a fake "running".
        if process.returncode is None:
            process.kill()
        try:
            _, stderr = await asyncio.wait_for(process.communicate(), timeout=5.0)
        except Exception:
            stderr = b""
        detail = stderr.decode(errors="replace").strip().splitlines()
        message = detail[-1] if detail else "QEMU did not open its VNC port"
        raise RuntimeError(message)

    running_vms[vm.id] = {
        "process": process,
        "monitor_socket": monitor_socket,
        "vnc_port": vnc_port,
    }
    adopted_pids.pop(vm.id, None)

    # QEMU only accepts VNC clients after the password is set through the monitor.
    if vm.vnc_password:
        await send_monitor_command(vm.id, f"set_password vnc {vm.vnc_password}")


async def stop_vm(vm_id: str) -> None:
    """Send a graceful powerdown command via the QEMU monitor."""
    await send_monitor_command(vm_id, "system_powerdown")


async def force_stop_vm(vm_id: str) -> None:
    """Kill the QEMU process immediately."""
    entry = running_vms.get(vm_id)
    if entry:
        entry["process"].kill()
        await entry["process"].wait()
        running_vms.pop(vm_id, None)
    else:
        pid = qemu_pid(vm_id)
        if pid:
            try:
                os.kill(pid, signal.SIGKILL)
            except OSError:
                pass
    adopted_pids.pop(vm_id, None)


async def wait_for_exit(vm_id: str, timeout: float = 3.0) -> bool:
    """Wait briefly for the QEMU process to exit; True when it is gone."""
    entry = running_vms.get(vm_id)
    if entry:
        try:
            await asyncio.wait_for(entry["process"].wait(), timeout=timeout)
        except asyncio.TimeoutError:
            pass
        if entry["process"].returncode is not None:
            running_vms.pop(vm_id, None)
            return True
        return False

    # Process started before a reload: poll for its exit.
    loop = asyncio.get_running_loop()
    deadline = loop.time() + timeout
    while loop.time() < deadline:
        if qemu_pid(vm_id) is None:
            return True
        await asyncio.sleep(0.1)
    return qemu_pid(vm_id) is None


async def pause_vm(vm_id: str) -> None:
    """Pause (freeze) VM execution via the QEMU monitor."""
    await send_monitor_command(vm_id, "stop")


async def resume_vm(vm_id: str) -> None:
    """Resume a paused VM via the QEMU monitor."""
    await send_monitor_command(vm_id, "cont")


async def reset_vm(vm_id: str) -> None:
    """Hard-reset the VM via the QEMU monitor."""
    await send_monitor_command(vm_id, "system_reset")


async def send_monitor_command(vm_id: str, command: str) -> str:
    """Open the QEMU HMP monitor Unix socket, send a command, and return the response."""
    if qemu_pid(vm_id) is None:
        return ""

    entry = running_vms.get(vm_id)
    monitor_socket = entry["monitor_socket"] if entry else monitor_socket_path(vm_id)

    try:
        reader, writer = await asyncio.open_unix_connection(monitor_socket)

        # Read the QEMU greeting banner
        greeting = await asyncio.wait_for(reader.read(1024), timeout=3.0)

        # Send the command
        writer.write((command + "\n").encode())
        await writer.drain()

        # Read the response
        response = await asyncio.wait_for(reader.read(4096), timeout=5.0)
        writer.close()
        await writer.wait_closed()

        return response.decode(errors="replace").strip()
    except Exception as exc:
        return f"error: {exc}"


def is_running(vm_id: str) -> bool:
    """Return True if the QEMU process for the given VM is still alive."""
    return qemu_pid(vm_id) is not None


def vnc_port_open(port: int, timeout: float = 0.3) -> bool:
    """True when something is listening on the VNC port (e.g. a QEMU surviving a reload)."""
    if not port:
        return False
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(timeout)
    try:
        return s.connect_ex(("127.0.0.1", port)) == 0
    except OSError:
        return False
    finally:
        s.close()


async def create_disk(path: str, size_gb: int, fmt: str) -> None:
    """Create a new QEMU disk image using qemu-img."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    process = await asyncio.create_subprocess_exec(
        "qemu-img", "create", "-f", fmt, path, f"{size_gb}G",
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await process.communicate()
    if process.returncode != 0:
        raise RuntimeError(f"qemu-img create failed: {stderr.decode()}")
