import React from 'react'

export default function Toolbar({ items }) {
  return (
    <div className="toolbar" role="toolbar" aria-label="Hyper-V Manager toolbar">
      {items.map((item, index) => {
        if (item.separator) {
          return <div className="tool-sep" key={`sep-${index}`} />
        }
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            className={`tool-btn${item.label ? ' labeled' : ''}`}
            title={item.title}
            aria-label={item.title}
            onClick={item.onClick}
            disabled={item.disabled}
          >
            <Icon size={16} strokeWidth={1.7} className={item.spinning ? 'spin' : undefined} />
            {item.label && <span>{item.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
