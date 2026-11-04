import React, { useState } from 'react'
import { ChevronDown, ChevronRight, HardDrive, Monitor, Server } from 'lucide-react'

export default function TreePane({ hostName, node, onSelect, vmCount, isoCount }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="tree-pane" role="tree" aria-label="Hyper-V Manager navigation">
      <div className="tree-node root">
        <span className="tree-twisty" />
        <Monitor size={15} className="tree-icon" />
        <span className="tree-label">Hyper-V Manager</span>
      </div>

      <div className="tree-node" style={{ paddingLeft: 10 }}>
        <button
          type="button"
          className="tree-twisty"
          onClick={() => setExpanded((value) => !value)}
          aria-label={expanded ? 'Collapse server' : 'Expand server'}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <Server size={15} className="tree-icon" />
        <span className="tree-label">{hostName}</span>
      </div>

      {expanded && (
        <div>
          <div
            className={`tree-node selectable${node === 'vms' ? ' selected' : ''}`}
            style={{ paddingLeft: 42 }}
            role="treeitem"
            aria-selected={node === 'vms'}
            tabIndex={0}
            onClick={() => onSelect('vms')}
            onKeyDown={(e) => { if (e.key === 'Enter') onSelect('vms') }}
          >
            <Monitor size={14} className="tree-icon" />
            <span className="tree-label">Virtual Machines</span>
            <span className="tree-count">{vmCount}</span>
          </div>
          <div
            className={`tree-node selectable${node === 'isos' ? ' selected' : ''}`}
            style={{ paddingLeft: 42 }}
            role="treeitem"
            aria-selected={node === 'isos'}
            tabIndex={0}
            onClick={() => onSelect('isos')}
            onKeyDown={(e) => { if (e.key === 'Enter') onSelect('isos') }}
          >
            <HardDrive size={14} className="tree-icon" />
            <span className="tree-label">ISO Library</span>
            <span className="tree-count">{isoCount}</span>
          </div>
        </div>
      )}
    </div>
  )
}
