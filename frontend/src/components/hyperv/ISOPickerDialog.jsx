import React, { useRef, useState } from 'react'
import { HardDrive, UploadCloud } from 'lucide-react'
import Dialog from './Dialog'
import useISOs from '../../hooks/useISOs'

export default function ISOPickerDialog({ selectedPath, onSelect, onClose, title = 'Insert Disk' }) {
  const { isos, loading, refresh, upload } = useISOs()
  const [selected, setSelected] = useState(selectedPath || '')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploadName, setUploadName] = useState('')
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  async function handleFile(file) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.iso')) {
      setError('Only .iso files can be imported.')
      return
    }
    setError(null)
    setUploading(true)
    setProgress(0)
    setUploadName(file.name)
    try {
      const iso = await upload(file, setProgress)
      await refresh({ silent: true })
      setSelected(iso.path)
    } catch (err) {
      setError(err?.response?.data?.detail || 'The ISO file could not be uploaded.')
    } finally {
      setUploading(false)
      setUploadName('')
    }
  }

  return (
    <Dialog
      title={title}
      onClose={onClose}
      width={560}
      footer={(
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
          <button
            type="button"
            className="btn"
            style={{ marginRight: 'auto' }}
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <UploadCloud size={13} />
            Import ISO…
          </button>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!selected || uploading}
            onClick={() => { onSelect(selected); onClose() }}
          >
            Insert
          </button>
        </div>
      )}
    >
      <p style={{ margin: '0 0 10px', color: '#444' }}>
        Select an ISO image from the ISO library on the server.
      </p>

      {error && <div className="error-banner">{error}</div>}

      {uploading && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span>{uploadName}</span>
            <span>{progress}%</span>
          </div>
          <div className="progress"><span style={{ width: `${progress}%` }} /></div>
        </div>
      )}

      <div style={{ maxHeight: 280, overflow: 'auto', border: '1px solid #dcdcdc' }}>
        <table className="picker-table">
          <thead>
            <tr>
              <th style={{ width: 30 }} aria-label="Select" />
              <th>Name</th>
              <th style={{ width: 90 }}>Size</th>
            </tr>
          </thead>
          <tbody>
            {isos.map((iso) => (
              <tr
                key={iso.name}
                className={selected === iso.path ? 'selected' : ''}
                onClick={() => setSelected(iso.path)}
              >
                <td>
                  <input
                    type="radio"
                    name="iso-picker"
                    checked={selected === iso.path}
                    onChange={() => setSelected(iso.path)}
                  />
                </td>
                <td>
                  <span className="vm-name">
                    <HardDrive size={13} style={{ color: '#54708a', flex: 'none' }} />
                    <span>{iso.name}</span>
                  </span>
                </td>
                <td>{iso.size_human}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && isos.length === 0 && (
          <div className="picker-empty">
            No ISO images are available. Import an ISO file to continue.
          </div>
        )}
        {loading && <div className="picker-empty"><span className="spinner" /> Loading…</div>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".iso"
        style={{ display: 'none' }}
        onChange={(e) => {
          handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      <div className="note">ISO images are stored on the server and can be reused by any virtual machine.</div>
    </Dialog>
  )
}
