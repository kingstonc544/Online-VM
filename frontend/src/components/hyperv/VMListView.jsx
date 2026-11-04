import React, { useMemo, useState } from 'react'
import { AlertTriangle, Monitor, Pause, Play, Plus, Square } from 'lucide-react'
import { vmState, vmStateClass } from '../../utils/format'

const HEADERS = [
  { key: 'name', label: 'Name', width: '30%' },
  { key: 'state', label: 'State', width: '13%' },
  { key: null, label: 'CPU Usage', width: '11%' },
  { key: 'memory', label: 'Assigned Memory', width: '14%' },
  { key: null, label: 'Uptime', width: '10%' },
  { key: null, label: 'Status', width: '16%' },
  { key: null, label: 'Version', width: '8%' },
]

function StateMark({ status }) {
  const className = `state-mark ${vmStateClass(status)}`
  if (status === 'running') return <Play size={12} className={className} fill="currentColor" />
  if (status === 'paused') return <Pause size={12} className={className} fill="currentColor" />
  if (status === 'error') return <AlertTriangle size={12} className={className} />
  return <Square size={11} className={className} fill="currentColor" />
}

export default function VMListView({
  vms,
  loading,
  selectedId,
  onSelect,
  onOpenSettings,
  filter,
  onNew,
}) {
  const [sort, setSort] = useState({ key: 'name', dir: 1 })

  const rows = useMemo(() => {
    const nameFilter = (filter?.name || '').trim().toLowerCase()
    const stateFilter = filter?.state || 'all'
    const list = vms.filter((vm) => {
      if (nameFilter && !vm.name.toLowerCase().includes(nameFilter)) return false
      if (stateFilter !== 'all' && vm.status !== stateFilter) return false
      return true
    })
    const value = (vm) => {
      if (sort.key === 'state') return vm.status
      if (sort.key === 'memory') return vm.ram_mb
      return vm.name.toLowerCase()
    }
    return [...list].sort((a, b) => {
      const left = value(a)
      const right = value(b)
      if (left < right) return -sort.dir
      if (left > right) return sort.dir
      return 0
    })
  }, [vms, filter, sort])

  function toggleSort(key) {
    if (!key) return
    setSort((current) => ({
      key,
      dir: current.key === key ? -current.dir : 1,
    }))
  }

  return (
    <div className="list-scroll">
      <table className="vm-table">
        <colgroup>
          {HEADERS.map((header) => <col key={header.label} style={{ width: header.width }} />)}
        </colgroup>
        <thead>
          <tr>
            {HEADERS.map((header) => (
              <th
                key={header.label}
                className={header.key ? 'sortable' : ''}
                onClick={() => toggleSort(header.key)}
                aria-sort={sort.key === header.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
              >
                {header.label}
                {sort.key === header.key && (
                  <span className="sort-mark">{sort.dir === 1 ? '▲' : '▼'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((vm) => (
            <tr
              key={vm.id}
              className={selectedId === vm.id ? 'selected' : ''}
              onClick={() => onSelect(vm.id)}
              onDoubleClick={() => onOpenSettings(vm)}
            >
              <td title={vm.name}>
                <span className="vm-name">
                  <Monitor size={13} style={{ color: '#54708a', flex: 'none' }} />
                  <span>{vm.name}</span>
                </span>
              </td>
              <td>
                <span className="state-cell">
                  <StateMark status={vm.status} />
                  {vmState(vm.status)}
                </span>
              </td>
              <td style={{ color: '#767676' }}>—</td>
              <td>{vm.ram_mb} MB</td>
              <td style={{ color: '#767676' }}>—</td>
              <td>{vm.status === 'running' ? 'Operating normally' : vm.status === 'error' ? 'Critical' : ''}</td>
              <td>10.0</td>
            </tr>
          ))}
        </tbody>
      </table>

      {!loading && rows.length === 0 && (
        <div className="empty-list">
          <h3>No virtual machines {vms.length > 0 ? 'match the current filter' : 'on this server'}</h3>
          <p>
            {vms.length > 0
              ? 'Clear or change the filter to see more virtual machines.'
              : 'Create a virtual machine to install an operating system and run applications.'}
          </p>
          {vms.length === 0 && (
            <button type="button" className="btn" onClick={onNew}>
              <Plus size={13} />
              New Virtual Machine…
            </button>
          )}
        </div>
      )}

      {loading && (
        <div className="empty-list">
          <p><span className="spinner" /> Loading virtual machines…</p>
        </div>
      )}
    </div>
  )
}
