import React, { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Dialog({ title, onClose, children, footer, width = 520, className = '', flush = false }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div
        className={`dialog ${className}`}
        style={{ width }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="dialog-titlebar">
          <span>{title}</span>
          <button type="button" className="dialog-close" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>
        <div className={`dialog-body${flush ? ' flush' : ''}`}>{children}</div>
        {footer && <div className="dialog-footer">{footer}</div>}
      </div>
    </div>
  )
}
