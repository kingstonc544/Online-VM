import React, { useState } from 'react'
import Dialog from './Dialog'
import { Field } from './Controls'

export default function RenameDialog({ vm, onClose, onRename }) {
  const [name, setName] = useState(vm.name)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!name.trim()) {
      setError('The virtual machine name is required.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await onRename(name.trim())
      onClose()
    } catch (err) {
      setError(err?.response?.data?.detail || 'The virtual machine could not be renamed.')
      setBusy(false)
    }
  }

  return (
    <Dialog
      title="Rename Virtual Machine"
      onClose={onClose}
      width={420}
      footer={(
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? <span className="spinner" /> : 'Rename'}
          </button>
        </>
      )}
    >
      {error && <div className="error-banner">{error}</div>}
      <Field label="New name">
        <input
          className="input"
          value={name}
          autoFocus
          disabled={busy}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        />
      </Field>
      <div className="note">The virtual machine must be turned off before it can be renamed.</div>
    </Dialog>
  )
}
