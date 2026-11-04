import React, { useEffect, useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'

export default function MenuBar({ menus }) {
  const [openIndex, setOpenIndex] = useState(null)
  const [openSub, setOpenSub] = useState(null)
  const rootRef = useRef(null)

  useEffect(() => {
    function onDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpenIndex(null)
        setOpenSub(null)
      }
    }
    function onKey(e) {
      if (e.key === 'Escape') {
        setOpenIndex(null)
        setOpenSub(null)
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  function close() {
    setOpenIndex(null)
    setOpenSub(null)
  }

  function renderItems(items) {
    return items.map((item, index) => {
      if (item.separator) {
        return <div className="menu-sep" key={`sep-${index}`} />
      }
      if (item.items && item.items.length > 0) {
        return (
          <div
            className="menu-sub-wrap"
            key={item.label}
            onMouseEnter={() => setOpenSub(item.label)}
          >
            <button type="button" className="menu-entry" disabled={item.disabled}>
              <span>{item.label}</span>
              <ChevronRight size={12} className="menu-arrow" />
            </button>
            {openSub === item.label && (
              <div className="menu-popup submenu">{renderItems(item.items)}</div>
            )}
          </div>
        )
      }
      return (
        <button
          key={item.label}
          type="button"
          className="menu-entry"
          disabled={item.disabled}
          onClick={() => {
            if (item.disabled) return
            item.onClick?.()
            close()
          }}
        >
          <span>{item.checked ? '✓ ' : ''}{item.label}</span>
          {item.shortcut && <span className="menu-shortcut">{item.shortcut}</span>}
        </button>
      )
    })
  }

  return (
    <div className="menu-bar" ref={rootRef} role="menubar">
      {menus.map((menu, index) => (
        <div className="menu-root" key={menu.label}>
          <button
            type="button"
            className={`menu-item${openIndex === index ? ' open' : ''}`}
            aria-haspopup="true"
            aria-expanded={openIndex === index}
            onClick={() => {
              setOpenIndex(openIndex === index ? null : index)
              setOpenSub(null)
            }}
            onMouseEnter={() => {
              if (openIndex !== null && openIndex !== index) {
                setOpenIndex(index)
                setOpenSub(null)
              }
            }}
          >
            {menu.label}
          </button>
          {openIndex === index && (
            <div className="menu-popup" role="menu">
              {renderItems(menu.items)}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
