import React from 'react'
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react'
import Dialog from './Dialog'

const ICONS = {
  info: Info,
  warning: AlertTriangle,
  error: ShieldAlert,
}

export default function MessageBox({
  title = 'Hyper-V Manager',
  message,
  variant = 'info',
  buttons,
  onClose,
}) {
  const Icon = ICONS[variant] || Info
  const actions = buttons && buttons.length > 0
    ? buttons
    : [{ label: 'OK', primary: true, onClick: onClose }]

  return (
    <Dialog
      title={title}
      onClose={onClose}
      width={440}
      className="message-dialog"
      flush
      footer={actions.map((button) => (
        <button
          key={button.label}
          type="button"
          className={`btn${button.primary ? ' btn-primary' : ''}${button.danger ? ' btn-danger' : ''}`}
          onClick={() => {
            button.onClick?.()
            if (button.close !== false) onClose?.()
          }}
        >
          {button.label}
        </button>
      ))}
    >
      <div className="message-body">
        <div className={`message-icon ${variant}`}><Icon size={26} /></div>
        <div className="message-text">
          {typeof message === 'string' ? <p>{message}</p> : message}
        </div>
      </div>
    </Dialog>
  )
}
