import React from 'react'

export default function StatusBar({ node, total, shown, selectedName, filterActive }) {
  const noun = node === 'isos'
    ? `${total} ISO image${total === 1 ? '' : 's'}`
    : `${total} virtual machine${total === 1 ? '' : 's'}`

  return (
    <div className="status-bar">
      <span>
        {noun}
        {filterActive ? ` (${shown} shown)` : ''}
        {selectedName ? ` — ${selectedName} selected` : ''}
      </span>
      <span>Refresh rate: 5 seconds</span>
    </div>
  )
}
