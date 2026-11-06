import React, { useEffect, useState } from 'react'
import {
  Camera, Cpu, Database, Disc, HardDrive, Monitor, Network, RotateCcw,
  Settings2, Tag, Trash2, Usb, Volume2, Zap,
} from 'lucide-react'
import Dialog from './Dialog'
import { CheckRow, Field, RadioRow } from './Controls'
import ISOPickerDialog from './ISOPickerDialog'
import VirtualizationSelector from './VirtualizationSelector'
import useISOs from '../../hooks/useISOs'
import useCapabilities from '../../hooks/useCapabilities'
import {
  createSnapshot, deleteSnapshot, getVM, restoreSnapshot, updateVM,
} from '../../api/client'
import { checkpointName, formatDate, formatMemory } from '../../utils/format'

const SECTIONS = [
  {
    group: 'Hardware',
    items: [
      { key: 'firmware', label: 'Firmware', icon: Settings2 },
      { key: 'memory', label: 'Memory', icon: Database },
      { key: 'processor', label: 'Processor', icon: Cpu },
      { key: 'virtualization', label: 'Virtualization', icon: Zap },
      { key: 'harddrive', label: 'Hard Drive', icon: HardDrive },
      { key: 'dvd', label: 'DVD Drive', icon: Disc },
      { key: 'network', label: 'Network Adapter', icon: Network },
      { key: 'sound', label: 'Sound Card', icon: Volume2 },
      { key: 'usb', label: 'USB', icon: Usb },
    ],
  },
  {
    group: 'Management',
    items: [
      { key: 'name', label: 'Name', icon: Tag },
      { key: 'checkpoints', label: 'Checkpoints', icon: Camera },
      { key: 'remote', label: 'Remote Control', icon: Monitor },
    ],
  },
]

function toForm(vm) {
  return {
    name: vm.name || '',
    description: vm.description || '',
    tagsText: (vm.tags || []).join(', '),
    cpu_cores: vm.cpu_cores,
    cpu_model: vm.cpu_model,
    ram_mb: vm.ram_mb,
    iso_path: vm.iso_path || null,
    network_type: vm.network_type,
    network_interface: vm.network_interface,
    vnc_password: vm.vnc_password || '',
    boot_order: vm.boot_order,
    virtualization: vm.virtualization || 'auto',
    guest_arch: vm.guest_arch || 'x86_64',
    enable_kvm: vm.enable_kvm,
    enable_uefi: vm.enable_uefi,
    machine_type: vm.machine_type,
    usb_enabled: vm.usb_enabled,
    sound_enabled: vm.sound_enabled,
    sound_model: vm.sound_model,
  }
}

export default function VMSettingsDialog({ vmId, onClose, notify }) {
  const [vm, setVm] = useState(null)
  const [form, setForm] = useState(null)
  const [section, setSection] = useState('firmware')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
  const { isos, refresh: refreshISOs } = useISOs()
  const capabilities = useCapabilities()

  async function load() {
    setLoading(true)
    try {
      const data = await getVM(vmId)
      setVm(data)
      setForm(toForm(data))
      setError(null)
    } catch (err) {
      setError(err?.response?.data?.detail || 'The virtual machine could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [vmId])

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function showNotice(text) {
    setNotice(text)
    setTimeout(() => setNotice(null), 2600)
  }

  const locked = vm ? ['running', 'paused'].includes(vm.status) : false

  async function save(closeAfter) {
    if (!form) return
    if (!form.name.trim()) {
      setSection('name')
      setError('The virtual machine name is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const updated = await updateVM(vmId, {
        name: form.name.trim(),
        description: form.description,
        tags: form.tagsText.split(',').map((tag) => tag.trim()).filter(Boolean),
        cpu_cores: Number(form.cpu_cores),
        cpu_model: form.cpu_model,
        ram_mb: Number(form.ram_mb),
        iso_path: form.iso_path || null,
        network_type: form.network_type,
        network_interface: form.network_interface,
        vnc_password: form.vnc_password || null,
        boot_order: form.boot_order,
        virtualization: form.virtualization,
        guest_arch: form.guest_arch,
        enable_kvm: form.virtualization === 'kvm',
        enable_uefi: form.enable_uefi,
        machine_type: form.machine_type,
        usb_enabled: form.usb_enabled,
        sound_enabled: form.sound_enabled,
        sound_model: form.sound_model,
      })
      setVm(updated)
      setForm(toForm(updated))
      showNotice('Settings saved.')
      notify?.('Settings saved.')
      if (closeAfter) onClose()
    } catch (err) {
      setError(err?.response?.data?.detail || 'The settings could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  async function refreshSnapshots() {
    const data = await getVM(vmId)
    setVm((current) => ({ ...current, snapshots: data.snapshots }))
  }

  async function addCheckpoint() {
    setBusy('checkpoint')
    setError(null)
    try {
      await createSnapshot(vmId, { name: checkpointName(vm.name), description: '' })
      await refreshSnapshots()
      showNotice('Checkpoint created.')
      notify?.('Checkpoint created.')
    } catch (err) {
      setError(err?.response?.data?.detail || 'The checkpoint could not be created.')
    } finally {
      setBusy(null)
    }
  }

  async function applyCheckpoint(snapshot) {
    setBusy(snapshot.id)
    setError(null)
    try {
      await restoreSnapshot(vmId, snapshot.id)
      showNotice(`Applied “${snapshot.name}”.`)
      notify?.(`Checkpoint “${snapshot.name}” applied.`)
    } catch (err) {
      setError(err?.response?.data?.detail || 'The checkpoint could not be applied.')
    } finally {
      setBusy(null)
    }
  }

  async function removeCheckpoint(snapshot) {
    setBusy(snapshot.id)
    setError(null)
    try {
      await deleteSnapshot(vmId, snapshot.id)
      await refreshSnapshots()
      showNotice('Checkpoint deleted.')
      notify?.('Checkpoint deleted.')
    } catch (err) {
      setError(err?.response?.data?.detail || 'The checkpoint could not be deleted.')
    } finally {
      setBusy(null)
    }
  }

  function renderSection() {
    if (!form) return null

    if (section === 'firmware') {
      return (
        <>
          <h2>Firmware</h2>
          <Field label="Boot order">
            <select
              className="input"
              value={form.boot_order}
              disabled={locked}
              onChange={(e) => set('boot_order', e.target.value)}
            >
              <option value="dc">CD/DVD — Hard Drive</option>
              <option value="cd">Hard Drive — CD/DVD</option>
            </select>
          </Field>
          <Field label="Firmware type">
            <RadioRow
              name="firmware"
              checked={!form.enable_uefi}
              onChange={() => set('enable_uefi', false)}
              title="BIOS"
              description="Generation 1 virtual machine using legacy BIOS firmware."
            />
            <RadioRow
              name="firmware"
              checked={form.enable_uefi}
              onChange={() => set('enable_uefi', true)}
              title="UEFI"
              description="Generation 2 virtual machine using UEFI firmware (OVMF)."
            />
          </Field>
          {form.guest_arch === 'x86_64' ? (
            <Field label="Machine type">
              <select
                className="input"
                value={form.machine_type}
                disabled={locked}
                onChange={(e) => set('machine_type', e.target.value)}
              >
                <option value="q35">q35 — modern PCIe</option>
                <option value="pc-i440fx">pc-i440fx — legacy</option>
              </select>
            </Field>
          ) : (
            <div className="note">
              {form.guest_arch === 'aarch64' || form.guest_arch === 'arm'
                ? 'The ARM "virt" machine and its UEFI firmware are used automatically.'
                : 'The generic machine type for this architecture is used automatically.'}
            </div>
          )}
        </>
      )
    }

    if (section === 'memory') {
      return (
        <>
          <h2>Memory</h2>
          <Field label="Startup memory" note="The virtual machine will start with this amount of memory.">
            <div className="input-row">
              <input
                className="input input-narrow"
                type="number"
                min={512}
                max={65536}
                step={512}
                value={form.ram_mb}
                disabled={locked}
                onChange={(e) => set('ram_mb', Number(e.target.value))}
              />
              <span>MB</span>
              <span style={{ color: '#666' }}>({formatMemory(form.ram_mb)})</span>
            </div>
            <div className="quick-values">
              {[512, 1024, 2048, 4096, 8192, 16384, 32768].map((value) => (
                <button
                  key={value}
                  type="button"
                  className="btn btn-sm"
                  disabled={locked}
                  onClick={() => set('ram_mb', value)}
                >
                  {formatMemory(value)}
                </button>
              ))}
            </div>
          </Field>
          <CheckRow
            checked={false}
            onChange={() => {}}
            disabled
            label="Enable Dynamic Memory"
            note="Dynamic memory isn't supported by the QEMU backend."
          />
        </>
      )
    }

    if (section === 'processor') {
      return (
        <>
          <h2>Processor</h2>
          <Field label="Number of virtual processors">
            <input
              className="input input-narrow"
              type="number"
              min={1}
              max={64}
              value={form.cpu_cores}
              disabled={locked}
              onChange={(e) => set('cpu_cores', Number(e.target.value))}
            />
          </Field>
          {form.guest_arch === 'x86_64' ? (
            <Field label="CPU model">
              <select
                className="input"
                value={form.cpu_model}
                disabled={locked}
                onChange={(e) => set('cpu_model', e.target.value)}
              >
                <option value="qemu64">qemu64 — software emulation</option>
                <option value="host">host — requires KVM</option>
                <option value="Haswell">Haswell</option>
                <option value="Skylake-Client">Skylake-Client</option>
                <option value="EPYC">EPYC</option>
              </select>
            </Field>
          ) : (
            <div className="note">
              The CPU model is provided by the selected guest architecture.
            </div>
          )}
          <div className="note">
            Hardware acceleration is configured under Virtualization.
          </div>
        </>
      )
    }

    if (section === 'virtualization') {
      return (
        <>
          <h2>Virtualization</h2>
          <p style={{ margin: '0 0 10px', color: '#555' }}>
            Choose how this virtual machine's instructions run on the server. Changing the guest
            architecture of an existing virtual machine usually requires reinstalling the guest
            operating system.
          </p>
          <VirtualizationSelector
            capabilities={capabilities}
            virtualization={form.virtualization}
            guestArch={form.guest_arch}
            onChange={set}
            disabled={locked}
          />
        </>
      )
    }

    if (section === 'harddrive') {
      return (
        <>
          <h2>Hard Drive</h2>
          <Field label="Virtual hard disk">
            <input className="input" value={vm?.disk_path || '—'} readOnly />
          </Field>
          <Field label="Format">
            <input className="input input-narrow" value={vm?.disk_format || '—'} readOnly />
          </Field>
          <Field label="Size">
            <input className="input input-narrow" value={vm ? `${vm.disk_size_gb} GB` : '—'} readOnly />
          </Field>
          <div className="note">
            The virtual hard disk is created the first time the virtual machine starts. Its size and
            format can't be changed after creation.
          </div>
        </>
      )
    }

    if (section === 'dvd') {
      return (
        <>
          <h2>DVD Drive</h2>
          <Field label="Media">
            <select
              className="input"
              value={form.iso_path || ''}
              disabled={locked}
              onChange={(e) => set('iso_path', e.target.value || null)}
            >
              <option value="">No media</option>
              {isos.map((iso) => (
                <option key={iso.name} value={iso.path}>{iso.name} ({iso.size_human})</option>
              ))}
            </select>
          </Field>
          <div className="input-row">
            <button
              type="button"
              className="btn"
              disabled={locked}
              onClick={() => setShowPicker(true)}
            >
              Insert Disk…
            </button>
            <button
              type="button"
              className="btn"
              disabled={locked || !form.iso_path}
              onClick={() => set('iso_path', null)}
            >
              Remove Disk
            </button>
          </div>
          <div className="note">
            The ISO image is attached as a DVD drive and can be used to install an operating system.
          </div>
        </>
      )
    }

    if (section === 'network') {
      return (
        <>
          <h2>Network Adapter</h2>
          <Field label="Virtual switch">
            <select
              className="input"
              value={form.network_type}
              disabled={locked}
              onChange={(e) => set('network_type', e.target.value)}
            >
              <option value="nat">Default Switch (NAT)</option>
              <option value="bridged">External Switch</option>
              <option value="host-only">Internal Switch</option>
              <option value="none">Not Connected</option>
            </select>
          </Field>
          <Field label="Adapter type">
            <select
              className="input"
              value={form.network_interface}
              disabled={locked}
              onChange={(e) => set('network_interface', e.target.value)}
            >
              <option value="virtio-net-pci">VirtIO — recommended</option>
              <option value="e1000">Intel E1000 — compatible</option>
              <option value="rtl8139">Realtek RTL8139 — legacy</option>
            </select>
          </Field>
          <div className="note">
            A MAC address is generated each time the virtual machine starts.
          </div>
        </>
      )
    }

    if (section === 'sound') {
      return (
        <>
          <h2>Sound Card</h2>
          <CheckRow
            checked={form.sound_enabled}
            disabled={locked}
            onChange={(checked) => set('sound_enabled', checked)}
            label="Enable sound"
          />
          <Field label="Sound model">
            <select
              className="input"
              value={form.sound_model}
              disabled={locked || !form.sound_enabled}
              onChange={(e) => set('sound_model', e.target.value)}
            >
              <option value="ich9-intel-hda">Intel HDA (ich9-intel-hda)</option>
              <option value="ac97">AC97</option>
              <option value="sb16">SoundBlaster 16</option>
            </select>
          </Field>
        </>
      )
    }

    if (section === 'usb') {
      return (
        <>
          <h2>USB</h2>
          <CheckRow
            checked={form.usb_enabled}
            disabled={locked}
            onChange={(checked) => set('usb_enabled', checked)}
            label="USB tablet"
            note="Provides accurate absolute mouse positioning in the virtual machine console."
          />
        </>
      )
    }

    if (section === 'name') {
      return (
        <>
          <h2>Name</h2>
          <Field label="Name">
            <input
              className="input"
              value={form.name}
              disabled={locked}
              onChange={(e) => set('name', e.target.value)}
            />
          </Field>
          <Field label="Notes">
            <textarea
              className="input"
              value={form.description}
              disabled={locked}
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>
          <Field label="Tags" note="Separate tags with commas.">
            <input
              className="input"
              value={form.tagsText}
              disabled={locked}
              onChange={(e) => set('tagsText', e.target.value)}
            />
          </Field>
        </>
      )
    }

    if (section === 'checkpoints') {
      const snapshots = vm?.snapshots || []
      const running = vm?.status === 'running'
      return (
        <>
          <h2>Checkpoints</h2>
          <p style={{ margin: '0 0 10px', color: '#555' }}>
            Checkpoints capture the state of the virtual machine so you can restore it later.
          </p>
          <div className="input-row" style={{ marginBottom: 10 }}>
            <button
              type="button"
              className="btn"
              disabled={!running || busy === 'checkpoint'}
              onClick={addCheckpoint}
              title={!running ? 'The virtual machine must be running to create a checkpoint' : ''}
            >
              {busy === 'checkpoint' ? <span className="spinner" /> : <Camera size={13} />}
              Create Checkpoint
            </button>
          </div>
          {!running && (
            <div className="note" style={{ marginBottom: 8 }}>
              The virtual machine must be running to create, apply or delete checkpoints.
            </div>
          )}
          {snapshots.length > 0 ? (
            <table className="checkpoint-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th style={{ width: 130 }}>Created</th>
                  <th style={{ width: 96 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((snapshot) => (
                  <tr key={snapshot.id}>
                    <td>{snapshot.name}</td>
                    <td>{formatDate(snapshot.created_at)}</td>
                    <td className="actions">
                      <button
                        type="button"
                        className="tool-btn"
                        title="Apply checkpoint"
                        disabled={!running || busy === snapshot.id}
                        onClick={() => applyCheckpoint(snapshot)}
                      >
                        <RotateCcw size={13} />
                      </button>
                      <button
                        type="button"
                        className="tool-btn"
                        title="Delete checkpoint"
                        disabled={!running || busy === snapshot.id}
                        onClick={() => removeCheckpoint(snapshot)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="note">No checkpoints have been created for this virtual machine.</div>
          )}
        </>
      )
    }

    return (
      <>
        <h2>Remote Control</h2>
        <Field
          label="VNC password"
          note="When set, the VNC console requires this password. The password takes effect the next time the virtual machine starts."
        >
          <input
            className="input"
            type="password"
            value={form.vnc_password}
            disabled={locked}
            onChange={(e) => set('vnc_password', e.target.value)}
          />
        </Field>
        {vm?.status === 'running' && (
          <div className="note">VNC port: {vm.vnc_port}</div>
        )}
      </>
    )
  }

  if (loading) {
    return (
      <Dialog title="Virtual Machine Settings" onClose={onClose} width={420}>
        <div style={{ padding: '18px 0', textAlign: 'center' }}>
          <span className="spinner" /> Loading settings…
        </div>
      </Dialog>
    )
  }

  if (!vm) {
    return (
      <Dialog
        title="Virtual Machine Settings"
        onClose={onClose}
        width={440}
        footer={<button type="button" className="btn" onClick={onClose}>Close</button>}
      >
        <div className="error-banner">{error || 'The virtual machine could not be found.'}</div>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog
        title={`Settings for ${vm.name}`}
        onClose={onClose}
        className="settings-dialog"
        flush
        footer={(
          <div className="settings-footer-inner">
            <span className="settings-footer-status">
              {locked ? 'Turn off the virtual machine to change its settings.' : ''}
            </span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={locked ? onClose : () => save(true)}
              disabled={saving}
            >
              OK
            </button>
            <button type="button" className="btn" onClick={onClose} disabled={saving}>Cancel</button>
            <button
              type="button"
              className="btn"
              onClick={() => save(false)}
              disabled={locked || saving}
            >
              Apply
            </button>
          </div>
        )}
      >
        <div className="settings-main">
          <div className="settings-nav">
            {SECTIONS.map((group) => (
              <div key={group.group}>
                <div className="settings-nav-title">{group.group}</div>
                {group.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={`settings-nav-item${section === item.key ? ' selected' : ''}`}
                      onClick={() => setSection(item.key)}
                    >
                      <Icon size={13} className="nav-icon" />
                      {item.label}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
          <div className="settings-content">
            {locked && (
              <div className="warn-banner">
                This virtual machine is running. Turn it off to change its settings.
              </div>
            )}
            {error && <div className="error-banner">{error}</div>}
            {notice && <div className="success-banner">{notice}</div>}
            {renderSection()}
          </div>
        </div>
      </Dialog>

      {showPicker && (
        <ISOPickerDialog
          selectedPath={form.iso_path}
          onSelect={(path) => {
            set('iso_path', path)
            refreshISOs({ silent: true })
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  )
}
