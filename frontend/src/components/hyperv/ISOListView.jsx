import React, { useRef, useState } from 'react'
import { HardDrive, RefreshCw, Trash2, UploadCloud } from 'lucide-react'

export default function ISOListView({
  isos,
  loading,
  uploading,
  progress,
  uploadName,
  onUpload,
  onDelete,
  onRefresh,
  selectedIso,
  onSelectIso,
}) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  function handleFiles(files) {
    const file = files && files[0]
    if (file) onUpload(file)
  }

  return (
    <div
      className="iso-view"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        handleFiles(e.dataTransfer.files)
      }}
    >
      <div className="view-toolbar">
        <span className="view-title">ISO Library</span>
        <button type="button" className="btn btn-sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <UploadCloud size={13} />
          Import ISO…
        </button>
        <button type="button" className="btn btn-sm" onClick={onRefresh} disabled={uploading}>
          <RefreshCw size={13} />
          Refresh
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".iso"
          style={{ display: 'none' }}
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </div>

      {uploading && (
        <div className="upload-strip">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span>{uploadName}</span>
            <span>{progress}%</span>
          </div>
          <div className="progress"><span style={{ width: `${progress}%` }} /></div>
        </div>
      )}

      <div className="list-scroll">
        <table className="vm-table">
          <colgroup>
            <col style={{ width: '42%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '38%' }} />
            <col style={{ width: '6%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Name</th>
              <th>Size</th>
              <th>Path</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {isos.map((iso) => (
              <tr
                key={iso.name}
                className={selectedIso === iso.name ? 'selected' : ''}
                onClick={() => onSelectIso(iso.name)}
              >
                <td title={iso.name}>
                  <span className="vm-name">
                    <HardDrive size={13} style={{ color: '#54708a', flex: 'none' }} />
                    <span>{iso.name}</span>
                  </span>
                </td>
                <td>{iso.size_human}</td>
                <td className="mono" title={iso.path}>{iso.path}</td>
                <td>
                  <button
                    type="button"
                    className="tool-btn"
                    title="Delete ISO"
                    aria-label={`Delete ${iso.name}`}
                    onClick={(e) => { e.stopPropagation(); onDelete(iso) }}
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && (
          <div className="empty-list">
            <p><span className="spinner" /> Loading ISO images…</p>
          </div>
        )}

        {!loading && isos.length === 0 && (
          <div className="empty-list">
            <h3>No ISO images are available</h3>
            <p>Import an ISO file to install an operating system in a virtual machine.</p>
            <button type="button" className="btn" onClick={() => inputRef.current?.click()}>
              <UploadCloud size={13} />
              Import ISO…
            </button>
          </div>
        )}
      </div>

      {dragOver && <div className="drop-hint">Drop the ISO file here to import it</div>}
    </div>
  )
}
