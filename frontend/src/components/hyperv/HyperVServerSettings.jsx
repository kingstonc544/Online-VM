import React, { useState } from 'react'
import { Disc, HardDrive, Monitor } from 'lucide-react'
import Dialog from './Dialog'

const SECTIONS = [
  { key: 'disks', label: 'Virtual Hard Disks', icon: HardDrive },
  { key: 'machines', label: 'Virtual Machines', icon: Monitor },
  { key: 'isos', label: 'ISO Images', icon: Disc },
]

export default function HyperVServerSettings({ onClose }) {
  const [section, setSection] = useState('disks')

  const content = {
    disks: {
      title: 'Virtual hard disks',
      path: '/data/disks',
      text: 'Virtual hard disks created by this server are stored in this folder. The folder is provided by the QEMU backend and can\'t be changed from Hyper-V Manager.',
    },
    machines: {
      title: 'Virtual machines',
      path: '/data/vms.json',
      text: 'Virtual machine configuration and checkpoints are stored in this file on the server.',
    },
    isos: {
      title: 'ISO images',
      path: '/data/isos',
      text: 'ISO images imported through the ISO Library are stored in this folder and can be attached to any virtual machine.',
    },
  }[section]

  return (
    <Dialog
      title="Hyper-V Settings for localhost"
      onClose={onClose}
      width={640}
      flush
      footer={<button type="button" className="btn" onClick={onClose}>Close</button>}
    >
      <div className="settings-main" style={{ minHeight: 280 }}>
        <div className="settings-nav">
          <div className="settings-nav-title">Server</div>
          {SECTIONS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                type="button"
                className={`settings-nav-item${section === item.key ? ' selected' : ''}`}
                onClick={() => setSection(item.key)}
              >
                <Icon size={13} className="nav-icon" />
                {item.label}
              </button>
            )
          })}
        </div>
        <div className="settings-content">
          <h2>{content.title}</h2>
          <p style={{ color: '#444', marginTop: 0 }}>{content.text}</p>
          <div className="field">
            <div className="field-label">Location</div>
            <span className="path-value">{content.path}</span>
          </div>
          <div className="note">
            Settings on this page are read-only. Server paths and services are managed by the
            QEMU backend that runs the virtual machines.
          </div>
        </div>
      </div>
    </Dialog>
  )
}
