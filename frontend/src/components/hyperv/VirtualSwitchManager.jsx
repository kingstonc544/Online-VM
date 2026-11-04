import React, { useState } from 'react'
import Dialog from './Dialog'

const SWITCHES = [
  {
    key: 'nat',
    name: 'Default Switch',
    type: 'NAT',
    description: 'Provides network address translation so virtual machines can reach external networks through the host. No host configuration is required.',
  },
  {
    key: 'bridged',
    name: 'External Switch',
    type: 'External',
    description: 'Binds virtual machines to the host bridge br0, connecting them directly to the physical network.',
  },
  {
    key: 'host-only',
    name: 'Internal Switch',
    type: 'Internal',
    description: 'Connects virtual machines to each other and to the host, isolated from external networks.',
  },
  {
    key: 'none',
    name: 'Not Connected',
    type: 'None',
    description: 'The virtual machine is created without a connected virtual network adapter.',
  },
]

export default function VirtualSwitchManager({ vms, onClose }) {
  const [selected, setSelected] = useState('nat')
  const current = SWITCHES.find((item) => item.key === selected) || SWITCHES[0]

  return (
    <Dialog
      title="Virtual Switch Manager for localhost"
      onClose={onClose}
      width={640}
      footer={<button type="button" className="btn" onClick={onClose}>Close</button>}
    >
      <p style={{ margin: '0 0 10px', color: '#444' }}>
        Virtual switches route network traffic between virtual machines, the host and external networks.
      </p>

      <table className="checkpoint-table">
        <thead>
          <tr>
            <th style={{ width: 190 }}>Name</th>
            <th style={{ width: 110 }}>Type</th>
            <th style={{ width: 90 }}>VMs</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {SWITCHES.map((item) => {
            const count = vms.filter((vm) => vm.network_type === item.key).length
            return (
              <tr
                key={item.key}
                className={selected === item.key ? 'selected' : ''}
                onClick={() => setSelected(item.key)}
                style={selected === item.key ? { background: 'var(--hv-select)' } : undefined}
              >
                <td>{item.name}</td>
                <td>{item.type}</td>
                <td>{count}</td>
                <td style={{ whiteSpace: 'normal' }}>{item.description}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="details-box">
        <h3>{current.name} properties</h3>
        <div><strong>Type:</strong> {current.type}</div>
        <div style={{ marginTop: 4 }}>{current.description}</div>
      </div>

      <div className="note" style={{ marginTop: 10 }}>
        Virtual switches on this host are predefined by the QEMU backend. Creating or removing custom
        switches isn't available in this build; choose a switch in the virtual machine settings instead.
      </div>
    </Dialog>
  )
}
