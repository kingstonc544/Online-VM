import React from 'react'
import {
  Camera, Filter, FolderOpen, HardDrive, HelpCircle, Layers, Monitor, Network,
  Pause, Pencil, Play, Plug, Power, RefreshCw, RotateCcw, Save, Search, Server,
  Settings, Square, Trash2, Plus,
} from 'lucide-react'

function ActionLink({ icon: Icon, label, onClick, disabled, title }) {
  return (
    <button
      type="button"
      className="action-link"
      onClick={onClick}
      disabled={disabled}
      title={title || label}
    >
      <Icon size={14} className="action-icon" />
      <span>{label}</span>
    </button>
  )
}

export default function ActionsPane({ hostName, node, vm, iso, server, vmActions, onDeleteIso }) {
  return (
    <div className="actions-pane" aria-label="Actions">
      {vm && node === 'vms' && (
        <div className="action-group">
          <div className="action-group-title" title={vm.name}>{vm.name.toUpperCase()}</div>
          <ActionLink icon={Monitor} label="Connect…" onClick={vmActions.connect} disabled={vm.status !== 'running'} title="Start the virtual machine to connect" />
          <ActionLink icon={Settings} label="Settings…" onClick={vmActions.settings} />
          <ActionLink icon={Play} label="Start" onClick={vmActions.start} disabled={vm.status === 'running' || vm.status === 'paused'} />
          <ActionLink icon={Power} label="Shut Down" onClick={vmActions.shutdown} disabled={vm.status !== 'running'} />
          <ActionLink icon={Square} label="Turn Off" onClick={vmActions.turnOff} disabled={vm.status !== 'running' && vm.status !== 'paused'} />
          <ActionLink icon={Save} label="Save" disabled title="Saving state isn't supported by the QEMU backend" />
          <ActionLink icon={Pause} label="Pause" onClick={vmActions.pause} disabled={vm.status !== 'running'} />
          <ActionLink icon={Play} label="Resume" onClick={vmActions.resume} disabled={vm.status !== 'paused'} />
          <ActionLink icon={RotateCcw} label="Reset" onClick={vmActions.reset} disabled={vm.status !== 'running'} />
          <ActionLink icon={Camera} label="Checkpoint…" onClick={vmActions.checkpoint} disabled={vm.status !== 'running'} title="The virtual machine must be running to create a checkpoint" />
          <ActionLink icon={Pencil} label="Rename…" onClick={vmActions.rename} disabled={vm.status === 'running' || vm.status === 'paused'} title="Turn off the virtual machine to rename it" />
          <ActionLink icon={Trash2} label="Delete…" onClick={vmActions.remove} disabled={vm.status === 'running' || vm.status === 'paused'} title="Turn off the virtual machine to delete it" />
        </div>
      )}

      {iso && node === 'isos' && (
        <div className="action-group">
          <div className="action-group-title" title={iso.name}>{iso.name.toUpperCase()}</div>
          <ActionLink icon={Trash2} label="Delete ISO…" onClick={onDeleteIso} />
        </div>
      )}

      <div className="action-group">
        <div className="action-group-title" title={hostName}>{hostName.toUpperCase()}</div>
        <ActionLink icon={Plus} label="New Virtual Machine…" onClick={server.newVM} />
        <ActionLink icon={FolderOpen} label="Import Virtual Machine…" disabled title="Import isn't supported by the QEMU backend" />
        <ActionLink icon={Settings} label="Hyper-V Settings…" onClick={server.settings} />
        <ActionLink icon={Network} label="Virtual Switch Manager…" onClick={server.switches} />
        <ActionLink icon={Layers} label="Virtual SAN Manager…" disabled title="Not available in this build" />
        <ActionLink icon={HardDrive} label="Edit Disk…" disabled title="Not available in this build" />
        <ActionLink icon={Search} label="Inspect Disk…" disabled title="Not available in this build" />
        <ActionLink icon={Server} label="Stop Service" disabled title="The Hyper-V service is managed by the server" />
        <ActionLink icon={Server} label="Remove Server" disabled title="The local server can't be removed" />
        <ActionLink icon={RefreshCw} label="Refresh" onClick={server.refresh} />
        <ActionLink icon={Filter} label="Filter…" onClick={server.filter} />
        <ActionLink icon={HelpCircle} label="Help" onClick={server.help} />
      </div>
    </div>
  )
}
