import React from 'react'

export function Field({ label, htmlFor, children, note }) {
  return (
    <div className="field">
      {label && <label className="field-label" htmlFor={htmlFor}>{label}</label>}
      {children}
      {note && <div className="note">{note}</div>}
    </div>
  )
}

export function CheckRow({ checked, onChange, label, disabled = false, note }) {
  return (
    <div className="check-row">
      <label className="check-label">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{label}</span>
      </label>
      {note && <div className="note" style={{ marginLeft: 20 }}>{note}</div>}
    </div>
  )
}

export function RadioRow({ checked, onChange, name, title, description, disabled = false }) {
  return (
    <label className="radio-row" style={{ opacity: disabled ? 0.6 : 1 }}>
      <input
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange?.()}
      />
      <span>
        <span className="option-title">{title}</span>
        {description && <span className="option-desc" style={{ display: 'block' }}>{description}</span>}
      </span>
    </label>
  )
}
