import React from 'react'
import { Field, RadioRow } from './Controls'

const ENGINE_TITLES = {
  auto: 'Automatic — hardware acceleration when available',
  kvm: 'Native — KVM hardware virtualization',
  tcg: 'Translation — QEMU TCG (Rosetta-style)',
}

const FALLBACK_ENGINES = [
  { id: 'auto', label: 'Automatic', available: true, reason: null, description: 'Choose hardware virtualization when possible, otherwise translate instructions in software.' },
  { id: 'kvm', label: 'Native', available: false, reason: 'Checking the host…', description: 'Run guest instructions directly on the host CPU.' },
  { id: 'tcg', label: 'Translation', available: true, reason: null, description: 'Translate guest instructions to the host CPU at runtime, like Apple Rosetta does for applications.' },
]

const FALLBACK_ARCHITECTURES = [
  { id: 'x86_64', label: 'x86-64 (64-bit Intel / AMD)', available: true, native: true, reason: null },
]

export function engineTitle(id) {
  return ENGINE_TITLES[id] || ENGINE_TITLES.auto
}

export function architectureLabel(id, capabilities) {
  return capabilities?.architectures?.find((arch) => arch.id === id)?.label || id
}

/** Effective engine after the host's capabilities are taken into account. */
export function effectiveEngine(virtualization, guestArch, capabilities) {
  if (virtualization === 'kvm' || virtualization === 'tcg') return virtualization
  const native = capabilities
    ? capabilities.kvm_available && guestArch === capabilities.host_arch
    : false
  return native ? 'kvm' : 'tcg'
}

/**
 * Selects the type of virtualization (engine) and the guest architecture.
 * Rendering is read-only while `disabled` is set.
 */
export default function VirtualizationSelector({
  capabilities,
  virtualization,
  guestArch,
  onChange,
  disabled = false,
}) {
  const engines = capabilities?.engines || FALLBACK_ENGINES
  const architectures = capabilities?.architectures || FALLBACK_ARCHITECTURES
  const selectedArch = architectures.find((arch) => arch.id === guestArch) || architectures[0]

  // Wait for the host report before offering choices: the fallback list would
  // otherwise let a selection point at an architecture the host can't run.
  if (!capabilities) {
    return (
      <div className="note">
        <span className="spinner" /> Detecting the host's virtualization capabilities…
      </div>
    )
  }

  return (
    <>
      <div className="group-box">
        <div className="field-label" style={{ marginBottom: 4 }}>Type of virtualization</div>
        {engines.map((engine) => (
          <div key={engine.id} className="engine-option">
            <RadioRow
              name="virtualization"
              checked={virtualization === engine.id}
              disabled={disabled || !engine.available}
              onChange={() => onChange('virtualization', engine.id)}
              title={engineTitle(engine.id)}
              description={engine.description}
            />
            {!engine.available && engine.reason && (
              <div className="engine-unavailable">Unavailable — {engine.reason}</div>
            )}
          </div>
        ))}
      </div>

      <Field
        label="Guest architecture"
        htmlFor="guest-arch"
        note={selectedArch?.native
          ? 'This is the host architecture, so the guest can use hardware virtualization.'
          : 'A foreign architecture is translated to the host CPU at runtime.'}
      >
        <select
          id="guest-arch"
          className="input"
          value={guestArch}
          disabled={disabled}
          onChange={(e) => onChange('guest_arch', e.target.value)}
        >
          {architectures.map((arch) => (
            <option key={arch.id} value={arch.id} disabled={!arch.available}>
              {arch.label}
              {arch.native ? ' — native' : ''}
              {!arch.available ? ' (not installed)' : ''}
            </option>
          ))}
        </select>
      </Field>

      {selectedArch && !selectedArch.available && selectedArch.reason && (
        <div className="warn-banner">{selectedArch.reason}. Pick another architecture.</div>
      )}

      {capabilities && (
        <div className="note">
          Host architecture: {capabilities.host_label}.{' '}
          {capabilities.kvm_available
            ? 'KVM hardware virtualization is available.'
            : 'No /dev/kvm on this host, so virtual machines run through software translation.'}
        </div>
      )}
    </>
  )
}
