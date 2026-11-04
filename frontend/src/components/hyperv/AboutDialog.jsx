import React from 'react'
import { Monitor } from 'lucide-react'
import Dialog from './Dialog'

export default function AboutDialog({ onClose }) {
  return (
    <Dialog
      title="About Hyper-V Manager"
      onClose={onClose}
      width={470}
      footer={<button type="button" className="btn" onClick={onClose}>OK</button>}
    >
      <div style={{ display: 'flex', gap: 14 }}>
        <Monitor size={40} style={{ color: '#0f6cbd', flex: 'none' }} />
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 14 }}>Hyper-V Manager</h2>
          <div style={{ color: '#555', marginBottom: 10 }}>Version 10.0</div>
          <div style={{ lineHeight: 1.6, color: '#333' }}>
            Manages virtual machines on <strong>localhost</strong> through the QEMU/KVM backend.
            Virtual machines run with the QEMU system emulator, configurable virtual hardware,
            VNC console access and qcow2 checkpoints.
          </div>
          <div className="note" style={{ marginTop: 10 }}>
            Browser-based Hyper-V Manager interface for the Online VM application.
          </div>
        </div>
      </div>
    </Dialog>
  )
}
