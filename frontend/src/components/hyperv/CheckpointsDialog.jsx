import React, { useEffect, useState } from 'react'
import { Camera, RotateCcw, Trash2 } from 'lucide-react'
import Dialog from './Dialog'
import { createSnapshot, deleteSnapshot, getVM, restoreSnapshot } from '../../api/client'
import { checkpointName, formatDate } from '../../utils/format'

export default function CheckpointsDialog({ vmId, onClose, notify }) {
  const [vm, setVm] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      setVm(await getVM(vmId))
      setError(null)
    } catch (err) {
      setError(err?.response?.data?.detail || 'The virtual machine could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [vmId])

  const snapshots = vm?.snapshots || []
  const running = vm?.status === 'running'

  async function addCheckpoint() {
    setBusy('create')
    setError(null)
    try {
      await createSnapshot(vmId, { name: checkpointName(vm.name), description: '' })
      await load()
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
      await load()
      notify?.('Checkpoint deleted.')
    } catch (err) {
      setError(err?.response?.data?.detail || 'The checkpoint could not be deleted.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Dialog
      title={`Checkpoints — ${vm?.name || ''}`}
      onClose={onClose}
      width={620}
      footer={(
        <div style={{ display: 'flex', width: '100%', gap: 8 }}>
          <span style={{ marginRight: 'auto', color: '#666', fontSize: 11, alignSelf: 'center' }}>
            {running ? 'Checkpoints are stored with the virtual hard disk.' : 'The virtual machine must be running to manage checkpoints.'}
          </span>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!running || busy === 'create'}
            onClick={addCheckpoint}
            title={!running ? 'Start the virtual machine to create a checkpoint' : ''}
          >
            {busy === 'create' ? <span className="spinner" /> : <Camera size={13} />}
            Create Checkpoint
          </button>
          <button type="button" className="btn" onClick={onClose}>Close</button>
        </div>
      )}
    >
      {error && <div className="error-banner">{error}</div>}

      {loading && <div style={{ padding: 10 }}><span className="spinner" /> Loading checkpoints…</div>}

      {!loading && snapshots.length === 0 && (
        <p style={{ margin: 0, color: '#555' }}>
          No checkpoints have been created for this virtual machine.
        </p>
      )}

      {snapshots.length > 0 && (
        <table className="checkpoint-table">
          <thead>
            <tr>
              <th>Name</th>
              <th style={{ width: 140 }}>Created</th>
              <th>Description</th>
              <th style={{ width: 88 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((snapshot) => (
              <tr key={snapshot.id}>
                <td>{snapshot.name}</td>
                <td>{formatDate(snapshot.created_at)}</td>
                <td>{snapshot.description || '—'}</td>
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
      )}
    </Dialog>
  )
}
