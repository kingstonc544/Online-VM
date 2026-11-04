import React, { useState } from 'react'
import Dialog from './Dialog'
import { AlertTriangle } from 'lucide-react'

export default function DeleteVMDialog({ vm, onClose, onConfirm }) {
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(err?.response?.data?.detail || 'The virtual machine could not be deleted.')
      setBusy(false)
    }
  }

  return (
    <Dialog
      title="Delete Virtual Machine"
      onClose={onClose}
      width={460}
      footer={(
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="btn btn-danger" onClick={confirm} disabled={busy}>
            {busy ? <span className="spinner" /> : 'Delete'}
          </button>
        </>
      )}
    >
      <div className="message-body" style={{ padding: 0 }}>
        <div className="message-icon warning"><AlertTriangle size={26} /></div>
        <div className="message-text">
          <p>
            Are you sure you want to delete the virtual machine <strong>{vm.name}</strong>?
          </p>
          <p>
            Its configuration and checkpoints will be removed. The virtual hard disk at{' '}
            <code>{vm.disk_path}</code> remains on the server after the virtual machine is deleted.
          </p>
          {error && <div className="error-banner">{error}</div>}
        </div>
      </div>
    </Dialog>
  )
}
