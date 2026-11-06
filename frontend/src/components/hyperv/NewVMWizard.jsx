import React, { useState } from 'react'
import { Check } from 'lucide-react'
import Dialog from './Dialog'
import { CheckRow, Field, RadioRow } from './Controls'
import ISOPickerDialog from './ISOPickerDialog'
import VirtualizationSelector, { architectureLabel, effectiveEngine } from './VirtualizationSelector'
import useISOs from '../../hooks/useISOs'
import useCapabilities from '../../hooks/useCapabilities'
import { createVM } from '../../api/client'
import { formatMemory } from '../../utils/format'

const STEPS = [
  { key: 'before', title: 'Before You Begin' },
  { key: 'name', title: 'Specify Name and Location' },
  { key: 'generation', title: 'Specify Generation' },
  { key: 'virtualization', title: 'Choose Virtualization' },
  { key: 'memory', title: 'Assign Memory' },
  { key: 'network', title: 'Configure Networking' },
  { key: 'disk', title: 'Connect Virtual Hard Disk' },
  { key: 'install', title: 'Installation Options' },
  { key: 'summary', title: 'Summary' },
]

const DEFAULTS = {
  name: '',
  description: '',
  tags: [],
  cpu_cores: 2,
  cpu_model: 'qemu64',
  ram_mb: 2048,
  disk_size_gb: 20,
  disk_format: 'qcow2',
  iso_path: null,
  network_type: 'nat',
  network_interface: 'virtio-net-pci',
  display_type: 'vnc',
  vnc_password: null,
  boot_order: 'dc',
  virtualization: 'auto',
  guest_arch: 'x86_64',
  enable_kvm: false,
  enable_uefi: false,
  machine_type: 'q35',
  usb_enabled: true,
  sound_enabled: false,
  sound_model: 'ich9-intel-hda',
}

function diskName(name, format) {
  const base = (name || 'New Virtual Machine').trim().replace(/\s+/g, '-').toLowerCase()
  return `${base}.${format}`
}

export default function NewVMWizard({ onClose, onCreated }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(DEFAULTS)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const { isos, refresh: refreshISOs } = useISOs()
  const capabilities = useCapabilities()

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const canContinue = STEPS[step].key !== 'name' || form.name.trim().length > 0

  async function finish() {
    setSubmitting(true)
    setError(null)
    try {
      const vm = await createVM({
        ...form,
        name: form.name.trim(),
        iso_path: form.iso_path || null,
        vnc_password: null,
        tags: [],
      })
      onCreated(vm)
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to create the virtual machine.')
      setSubmitting(false)
    }
  }

  function renderPage() {
    const page = STEPS[step].key

    if (page === 'before') {
      return (
        <>
          <h2>Before You Begin</h2>
          <p>
            This wizard helps you create a virtual machine on <strong>localhost</strong>. You can use
            the settings in this wizard to create a new virtual machine, or you can create a virtual
            machine with default settings and configure it later.
          </p>
          <ul>
            <li>Specify a name and location for the virtual machine.</li>
            <li>Choose the generation of the virtual machine (BIOS or UEFI).</li>
            <li>Choose the type of virtualization — native KVM or software translation.</li>
            <li>Assign memory and configure networking.</li>
            <li>Connect a virtual hard disk and choose an installation source.</li>
          </ul>
          <p>Click Next to continue.</p>
        </>
      )
    }

    if (page === 'name') {
      return (
        <>
          <h2>Specify Name and Location</h2>
          <Field label="Name" htmlFor="new-vm-name" note="The name is displayed in Hyper-V Manager.">
            <input
              id="new-vm-name"
              className="input"
              value={form.name}
              autoFocus
              onChange={(e) => set('name', e.target.value)}
              placeholder="New Virtual Machine"
            />
          </Field>
          <Field label="Notes" htmlFor="new-vm-notes">
            <textarea
              id="new-vm-notes"
              className="input"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </Field>
          <div className="group-box">
            <CheckRow
              checked={false}
              onChange={() => {}}
              disabled
              label="Store the virtual machine in a different location"
              note="Virtual machine configuration and disks are stored under /data on the server."
            />
          </div>
        </>
      )
    }

    if (page === 'generation') {
      return (
        <>
          <h2>Specify Generation</h2>
          <p>Choose the generation of the virtual machine.</p>
          <RadioRow
            name="generation"
            checked={!form.enable_uefi}
            onChange={() => set('enable_uefi', false)}
            title="Generation 1"
            description="Uses BIOS firmware. Supports 32-bit and 64-bit guest operating systems and boot from virtual hard disks, CD/DVD and network."
          />
          <RadioRow
            name="generation"
            checked={form.enable_uefi}
            onChange={() => set('enable_uefi', true)}
            title="Generation 2"
            description="Uses UEFI firmware. Provides faster boot and supports boot from virtual hard disks, CD/DVD and network with UEFI."
          />
          <div className="note">
            Generation 2 requires an operating system that supports UEFI. The selection can be changed
            in the virtual machine settings while it is turned off.
          </div>
        </>
      )
    }

    if (page === 'virtualization') {
      return (
        <>
          <h2>Choose the Type of Virtualization</h2>
          <p>
            Select how the virtual machine runs on this server. Native KVM runs guest code
            directly on the CPU, while the translation engine rewrites guest instructions at
            runtime — the Linux equivalent of Apple's Rosetta — so other architectures can run
            here too.
          </p>
          <VirtualizationSelector
            capabilities={capabilities}
            virtualization={form.virtualization}
            guestArch={form.guest_arch}
            onChange={set}
          />
        </>
      )
    }

    if (page === 'memory') {
      return (
        <>
          <h2>Assign Memory</h2>
          <p>Specify the amount of memory to allocate to the virtual machine when it starts.</p>
          <Field label="Startup memory" htmlFor="new-vm-memory">
            <div className="input-row">
              <input
                id="new-vm-memory"
                className="input input-narrow"
                type="number"
                min={512}
                max={65536}
                step={512}
                value={form.ram_mb}
                onChange={(e) => set('ram_mb', Number(e.target.value))}
              />
              <span>MB</span>
              <span style={{ color: '#666', marginLeft: 6 }}>({formatMemory(form.ram_mb)})</span>
            </div>
            <div className="quick-values">
              {[512, 1024, 2048, 4096, 8192, 16384, 32768].map((value) => (
                <button
                  key={value}
                  type="button"
                  className="btn btn-sm"
                  onClick={() => set('ram_mb', value)}
                >
                  {formatMemory(value)}
                </button>
              ))}
            </div>
          </Field>
          <div className="group-box">
            <CheckRow
              checked={false}
              onChange={() => {}}
              disabled
              label="Use Dynamic Memory for this virtual machine"
              note="Dynamic memory isn't supported by the QEMU backend."
            />
          </div>
        </>
      )
    }

    if (page === 'network') {
      return (
        <>
          <h2>Configure Networking</h2>
          <p>Configure the virtual switch that the virtual machine will use.</p>
          <Field label="Connection" htmlFor="new-vm-network">
            <select
              id="new-vm-network"
              className="input"
              value={form.network_type}
              onChange={(e) => set('network_type', e.target.value)}
            >
              <option value="none">Not Connected</option>
              <option value="nat">Default Switch (NAT)</option>
              <option value="bridged">External Switch</option>
              <option value="host-only">Internal Switch</option>
            </select>
            <div className="note">
              The virtual machine is created with a VirtIO network adapter. The adapter type can be
              changed in the virtual machine settings.
            </div>
          </Field>
        </>
      )
    }

    if (page === 'disk') {
      return (
        <>
          <h2>Connect Virtual Hard Disk</h2>
          <p>A virtual hard disk is required to install an operating system on the virtual machine.</p>
          <RadioRow
            name="disk-mode"
            checked
            onChange={() => {}}
            title="Create a virtual hard disk"
            description="Creates a new dynamically expanding virtual hard disk."
          />
          <div style={{ margin: '4px 0 10px 22px' }}>
            <Field label="Name">
              <input className="input" value={diskName(form.name, form.disk_format)} readOnly />
            </Field>
            <Field label="Location">
              <input className="input" value="/data/disks" readOnly />
            </Field>
            <div className="input-row" style={{ marginBottom: 10 }}>
              <div>
                <label className="field-label" htmlFor="new-vm-disk-size">Size</label>
                <div className="input-row">
                  <input
                    id="new-vm-disk-size"
                    className="input input-narrow"
                    type="number"
                    min={5}
                    max={500}
                    step={5}
                    value={form.disk_size_gb}
                    onChange={(e) => set('disk_size_gb', Number(e.target.value))}
                  />
                  <span>GB</span>
                </div>
              </div>
              <div>
                <label className="field-label" htmlFor="new-vm-disk-format">Format</label>
                <select
                  id="new-vm-disk-format"
                  className="input"
                  style={{ width: 160 }}
                  value={form.disk_format}
                  onChange={(e) => set('disk_format', e.target.value)}
                >
                  <option value="qcow2">qcow2</option>
                  <option value="raw">raw</option>
                </select>
              </div>
            </div>
          </div>
          <RadioRow
            name="disk-mode"
            checked={false}
            onChange={() => {}}
            disabled
            title="Use an existing virtual hard disk"
            description="Not available — attached disks can be selected in the virtual machine settings."
          />
          <RadioRow
            name="disk-mode"
            checked={false}
            onChange={() => {}}
            disabled
            title="Attach a virtual hard disk later"
            description="A virtual hard disk is always created for the virtual machine."
          />
        </>
      )
    }

    if (page === 'install') {
      return (
        <>
          <h2>Installation Options</h2>
          <p>Choose how you want to install an operating system.</p>
          <RadioRow
            name="install"
            checked={!form.iso_path}
            onChange={() => set('iso_path', null)}
            title="Install an operating system later"
            description="The virtual machine starts from its virtual hard disk. An ISO image can be inserted later."
          />
          <RadioRow
            name="install"
            checked={!!form.iso_path}
            onChange={() => {
              if (!form.iso_path && isos.length > 0) set('iso_path', isos[0].path)
            }}
            title="Install an operating system from a bootable image file"
            description="The ISO image is attached as a DVD drive and the virtual machine boots from it."
          />
          {form.iso_path && (
            <div style={{ margin: '4px 0 10px 22px' }}>
              <div className="input-row">
                <select
                  className="input"
                  style={{ maxWidth: 340 }}
                  value={form.iso_path}
                  onChange={(e) => set('iso_path', e.target.value || null)}
                >
                  <option value="">Select an ISO image…</option>
                  {isos.map((iso) => (
                    <option key={iso.name} value={iso.path}>{iso.name}</option>
                  ))}
                </select>
                <button type="button" className="btn btn-sm" onClick={() => setShowPicker(true)}>
                  Browse…
                </button>
              </div>
              <div className="note">ISO images come from the ISO library on the server.</div>
            </div>
          )}
          <RadioRow
            name="install"
            checked={false}
            onChange={() => {}}
            disabled
            title="Install an operating system from a network-based installation server"
            description="Network boot isn't available in this build."
          />
        </>
      )
    }

    return (
      <>
        <h2>Completing the New Virtual Machine Wizard</h2>
        <p>You have successfully completed the New Virtual Machine Wizard. Click Finish to create the virtual machine.</p>
        <dl className="summary-list">
          <div><dt>Name</dt><dd>{form.name || '—'}</dd></div>
          <div><dt>Generation</dt><dd>{form.enable_uefi ? 'Generation 2 (UEFI)' : 'Generation 1 (BIOS)'}</dd></div>
          <div><dt>Memory</dt><dd>{formatMemory(form.ram_mb)}</dd></div>
          <div><dt>Processor</dt><dd>{form.cpu_cores} virtual processor{form.cpu_cores === 1 ? '' : 's'}</dd></div>
          <div>
            <dt>Network</dt>
            <dd>
              {form.network_type === 'nat' ? 'Default Switch (NAT)'
                : form.network_type === 'bridged' ? 'External Switch'
                  : form.network_type === 'host-only' ? 'Internal Switch' : 'Not Connected'}
            </dd>
          </div>
          <div><dt>Virtual hard disk</dt><dd>{diskName(form.name, form.disk_format)} — {form.disk_size_gb} GB ({form.disk_format})</dd></div>
          <div><dt>Installation source</dt><dd>{form.iso_path ? (isos.find((iso) => iso.path === form.iso_path)?.name || form.iso_path) : 'Install later'}</dd></div>
          <div><dt>Guest architecture</dt><dd>{architectureLabel(form.guest_arch, capabilities)}</dd></div>
          <div>
            <dt>Type of virtualization</dt>
            <dd>
              {effectiveEngine(form.virtualization, form.guest_arch, capabilities) === 'kvm'
                ? 'Native — KVM hardware virtualization'
                : 'Translation — QEMU TCG (Rosetta-style)'}
            </dd>
          </div>
        </dl>
      </>
    )
  }

  return (
    <>
      <Dialog
        title="New Virtual Machine Wizard"
        onClose={onClose}
        className="wizard"
        flush
        footer={(
          <div className="wizard-footer-inner">
            <span className="wizard-hint">Step {step + 1} of {STEPS.length}</span>
            <button
              type="button"
              className="btn"
              onClick={() => setStep((value) => Math.max(0, value - 1))}
              disabled={step === 0 || submitting}
            >
              Back
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setStep((value) => value + 1)}
                disabled={!canContinue || submitting}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={finish}
                disabled={submitting}
              >
                {submitting ? <><span className="spinner" /> Creating…</> : <><Check size={13} /> Finish</>}
              </button>
            )}
            <button type="button" className="btn" onClick={onClose} disabled={submitting}>Cancel</button>
          </div>
        )}
      >
        <div className="wizard-main">
          <div className="wizard-steps">
            {STEPS.map((item, index) => (
              <div
                key={item.key}
                className={`wizard-step${index === step ? ' active' : ''}${index < step ? ' done' : ''}`}
              >
                <span className="step-arrow">▸</span>
                <span>{item.title}</span>
              </div>
            ))}
          </div>
          <div className="wizard-content">
            {error && <div className="error-banner">{error}</div>}
            {renderPage()}
          </div>
        </div>
      </Dialog>

      {showPicker && (
        <ISOPickerDialog
          title="Browse ISO Images"
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
