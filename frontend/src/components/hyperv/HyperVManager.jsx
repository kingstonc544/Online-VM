import React, { useEffect, useMemo, useState } from 'react'
import {
  Camera, Filter, FolderOpen, HardDrive, HelpCircle, Layers, Monitor, Network,
  Pause, Play, Plus, RefreshCw, RotateCcw, Search, Server, Settings, Square, CheckCircle2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import MenuBar from './MenuBar'
import Toolbar from './Toolbar'
import TreePane from './TreePane'
import VMListView from './VMListView'
import ISOListView from './ISOListView'
import ActionsPane from './ActionsPane'
import StatusBar from './StatusBar'
import NewVMWizard from './NewVMWizard'
import VMSettingsDialog from './VMSettingsDialog'
import CheckpointsDialog from './CheckpointsDialog'
import VirtualSwitchManager from './VirtualSwitchManager'
import HyperVServerSettings from './HyperVServerSettings'
import FilterDialog from './FilterDialog'
import RenameDialog from './RenameDialog'
import DeleteVMDialog from './DeleteVMDialog'
import AboutDialog from './AboutDialog'
import MessageBox from './MessageBox'

import useVMs from '../../hooks/useVMs'
import useISOs from '../../hooks/useISOs'

const HOST_NAME = 'localhost'

export default function HyperVManager({ initialNode = 'vms', initialSettingsId = null }) {
  const navigate = useNavigate()
  const {
    vms, loading, error: vmError, refresh: refreshVMs,
    startVM, stopVM, forceStopVM, pauseVM, resumeVM, resetVM,
    updateVM, deleteVM,
  } = useVMs()
  const {
    isos, loading: isoLoading, error: isoError,
    refresh: refreshISOs, upload: uploadISO, remove: removeISO,
  } = useISOs()

  const [node, setNode] = useState(initialNode)
  const [selectedId, setSelectedId] = useState(initialSettingsId)
  const [selectedIso, setSelectedIso] = useState(null)
  const [showActions, setShowActions] = useState(true)
  const [filter, setFilter] = useState({ name: '', state: 'all' })
  const [dialog, setDialog] = useState(initialSettingsId ? { type: 'settings', vmId: initialSettingsId } : null)
  const [message, setMessage] = useState(null)
  const [toast, setToast] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadName, setUploadName] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const selectedVm = vms.find((vm) => vm.id === selectedId) || null
  const selectedIsoItem = isos.find((iso) => iso.name === selectedIso) || null

  useEffect(() => {
    if (selectedId && !loading && !vms.some((vm) => vm.id === selectedId)) {
      setSelectedId(null)
    }
  }, [vms, loading, selectedId])

  useEffect(() => {
    if (vmError) setMessage({ title: 'Hyper-V Manager', message: vmError, variant: 'error' })
  }, [vmError])

  useEffect(() => {
    if (isoError) setMessage({ title: 'ISO Library', message: isoError, variant: 'error' })
  }, [isoError])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'F5') {
        e.preventDefault()
        refreshAll()
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n' && !dialog) {
        e.preventDefault()
        openNewVM()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(timer)
  }, [toast])

  function notify(text) {
    setToast(text)
  }

  function showError(title, err, fallback = 'The operation could not be completed.') {
    setMessage({
      title,
      message: err?.response?.data?.detail || err?.message || fallback,
      variant: 'error',
    })
  }

  async function refreshAll() {
    setRefreshing(true)
    try {
      await Promise.all([refreshVMs(), refreshISOs({ silent: true })])
      notify('Virtual machines refreshed.')
    } finally {
      setRefreshing(false)
    }
  }

  function closeDialog() {
    const closing = dialog
    setDialog(null)
    if (initialSettingsId && closing?.type === 'settings') navigate('/')
  }

  function openNewVM() {
    setDialog({ type: 'new' })
  }

  function openSettings(vm = selectedVm) {
    if (!vm) return
    setSelectedId(vm.id)
    setDialog({ type: 'settings', vmId: vm.id })
  }

  function openCheckpoints(vm = selectedVm) {
    if (!vm) return
    setSelectedId(vm.id)
    setDialog({ type: 'checkpoints', vmId: vm.id })
  }

  function openRename(vm = selectedVm) {
    if (!vm) return
    setSelectedId(vm.id)
    setDialog({ type: 'rename', vmId: vm.id })
  }

  function openDelete(vm = selectedVm) {
    if (!vm) return
    setSelectedId(vm.id)
    setDialog({ type: 'delete', vmId: vm.id })
  }

  function connectSelected() {
    if (!selectedVm) return
    navigate(`/vm/${selectedVm.id}`)
  }

  async function perform(action, successMessage) {
    try {
      await action()
      if (successMessage) notify(successMessage)
    } catch (err) {
      showError('Hyper-V Manager', err)
    }
  }

  async function handleIsoUpload(file) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.iso')) {
      setMessage({
        title: 'Import ISO Image',
        message: 'Only .iso files can be imported into the ISO library.',
        variant: 'warning',
      })
      return
    }
    setUploading(true)
    setUploadProgress(0)
    setUploadName(file.name)
    try {
      await uploadISO(file, setUploadProgress)
      notify('ISO image imported.')
    } catch (err) {
      showError('Import ISO Image', err, 'The ISO file could not be uploaded.')
    } finally {
      setUploading(false)
      setUploadName('')
      setUploadProgress(0)
    }
  }

  function confirmDeleteIso(iso) {
    if (!iso) return
    setMessage({
      title: 'Delete ISO Image',
      variant: 'warning',
      message: (
        <div>
          <p>Are you sure you want to delete <strong>{iso.name}</strong> from the ISO library?</p>
          <p>Virtual machines that use this image will no longer be able to boot from it.</p>
        </div>
      ),
      buttons: [
        {
          label: 'Delete',
          danger: true,
          onClick: async () => {
            try {
              await removeISO(iso.name)
              setSelectedIso(null)
              notify('ISO image deleted.')
            } catch (err) {
              showError('Delete ISO Image', err, 'The ISO image could not be deleted.')
            }
          },
        },
        { label: 'Cancel' },
      ],
    })
  }

  async function renameVm(vmId, name) {
    await updateVM(vmId, { name })
    notify('Virtual machine renamed.')
  }

  async function deleteVm(vm) {
    await deleteVM(vm.id)
    if (selectedId === vm.id) setSelectedId(null)
    notify('Virtual machine deleted.')
  }

  const filterActive = filter.name.trim() !== '' || filter.state !== 'all'
  const shownVms = useMemo(() => {
    const name = filter.name.trim().toLowerCase()
    return vms.filter((vm) => {
      if (name && !vm.name.toLowerCase().includes(name)) return false
      if (filter.state !== 'all' && vm.status !== filter.state) return false
      return true
    })
  }, [vms, filter])

  const anyRunning = selectedVm && (selectedVm.status === 'running' || selectedVm.status === 'paused')

  const menus = [
    {
      label: 'File',
      items: [
        {
          label: 'New',
          items: [
            { label: 'Virtual Machine…', shortcut: 'Ctrl+N', onClick: openNewVM },
            { label: 'Hard Disk…', disabled: true },
            { label: 'Floppy Disk…', disabled: true },
          ],
        },
        { label: 'Import Virtual Machine…', disabled: true },
        { separator: true },
        { label: 'Hyper-V Settings…', onClick: () => setDialog({ type: 'server' }) },
        { separator: true },
        { label: 'Exit', disabled: true },
      ],
    },
    {
      label: 'Action',
      items: [
        { label: 'Connect…', disabled: !selectedVm || selectedVm.status !== 'running', onClick: connectSelected },
        { label: 'Settings…', disabled: !selectedVm, onClick: () => openSettings() },
        { separator: true },
        {
          label: 'Start',
          disabled: !selectedVm || selectedVm.status === 'running' || selectedVm.status === 'paused',
          onClick: () => perform(() => startVM(selectedVm.id), 'Virtual machine starting.'),
        },
        {
          label: 'Shut Down',
          disabled: !selectedVm || selectedVm.status !== 'running',
          onClick: () => perform(() => stopVM(selectedVm.id), 'Shut down request sent.'),
        },
        {
          label: 'Turn Off',
          disabled: !selectedVm || (selectedVm.status !== 'running' && selectedVm.status !== 'paused'),
          onClick: () => perform(() => forceStopVM(selectedVm.id), 'Virtual machine turned off.'),
        },
        { label: 'Save', disabled: true },
        {
          label: 'Pause',
          disabled: !selectedVm || selectedVm.status !== 'running',
          onClick: () => perform(() => pauseVM(selectedVm.id), 'Virtual machine paused.'),
        },
        {
          label: 'Resume',
          disabled: !selectedVm || selectedVm.status !== 'paused',
          onClick: () => perform(() => resumeVM(selectedVm.id), 'Virtual machine resumed.'),
        },
        {
          label: 'Reset',
          disabled: !selectedVm || selectedVm.status !== 'running',
          onClick: () => perform(() => resetVM(selectedVm.id), 'Virtual machine reset.'),
        },
        { separator: true },
        {
          label: 'Checkpoint…',
          disabled: !selectedVm || selectedVm.status !== 'running',
          onClick: () => openCheckpoints(),
        },
        { label: 'Rename…', disabled: !selectedVm || anyRunning, onClick: () => openRename() },
        { label: 'Delete…', disabled: !selectedVm || anyRunning, onClick: () => openDelete() },
        { separator: true },
        { label: 'Help', onClick: () => setDialog({ type: 'about' }) },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Refresh', shortcut: 'F5', onClick: refreshAll },
        { label: 'Filter…', onClick: () => setDialog({ type: 'filter' }) },
        { separator: true },
        { label: 'Virtual Machines', checked: node === 'vms', onClick: () => setNode('vms') },
        { label: 'ISO Library', checked: node === 'isos', onClick: () => setNode('isos') },
        { separator: true },
        { label: 'Actions Pane', checked: showActions, onClick: () => setShowActions((value) => !value) },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'Help Topics', disabled: true },
        { separator: true },
        { label: 'About Hyper-V Manager', onClick: () => setDialog({ type: 'about' }) },
      ],
    },
  ]

  const toolbar = [
    { id: 'new', icon: Plus, title: 'New Virtual Machine', onClick: openNewVM },
    { id: 'import', icon: FolderOpen, title: 'Import Virtual Machine', disabled: true },
    { id: 'sep-1', separator: true },
    { id: 'hvsettings', icon: Settings, title: 'Hyper-V Settings', onClick: () => setDialog({ type: 'server' }) },
    { id: 'switches', icon: Network, title: 'Virtual Switch Manager', onClick: () => setDialog({ type: 'switches' }) },
    { id: 'san', icon: Layers, title: 'Virtual SAN Manager', disabled: true },
    { id: 'editdisk', icon: HardDrive, title: 'Edit Disk', disabled: true },
    { id: 'inspect', icon: Search, title: 'Inspect Disk', disabled: true },
    { id: 'sep-2', separator: true },
    { id: 'stopservice', icon: Server, title: 'Stop Service', disabled: true },
    { id: 'removeserver', icon: Server, title: 'Remove Server', disabled: true },
    { id: 'connectserver', icon: Server, title: 'Connect to Server', disabled: true },
    { id: 'sep-3', separator: true },
    {
      id: 'refresh',
      icon: RefreshCw,
      title: 'Refresh',
      label: 'Refresh',
      spinning: refreshing,
      disabled: refreshing,
      onClick: refreshAll,
    },
    { id: 'filter', icon: Filter, title: 'Filter', onClick: () => setDialog({ type: 'filter' }) },
    { id: 'help', icon: HelpCircle, title: 'Help', onClick: () => setDialog({ type: 'about' }) },
  ]

  const dialogVm = dialog?.vmId ? vms.find((vm) => vm.id === dialog.vmId) : null

  return (
    <div className="app-shell">
      <div className="app-titlebar">
        <div className="app-title">
          <Monitor size={15} />
          Hyper-V Manager
        </div>
        <div className="app-connection">
          <span className="connection-dot" />
          Connected to {HOST_NAME}
        </div>
      </div>

      <MenuBar menus={menus} />
      <Toolbar items={toolbar} />

      <div className="main-row">
        <TreePane
          hostName={HOST_NAME}
          node={node}
          onSelect={setNode}
          vmCount={vms.length}
          isoCount={isos.length}
        />

        <div className="center-pane">
          {node === 'vms' ? (
            <VMListView
              vms={vms}
              loading={loading}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onOpenSettings={(vm) => openSettings(vm)}
              filter={filter}
              onNew={openNewVM}
            />
          ) : (
            <ISOListView
              isos={isos}
              loading={isoLoading}
              uploading={uploading}
              progress={uploadProgress}
              uploadName={uploadName}
              onUpload={handleIsoUpload}
              onDelete={confirmDeleteIso}
              onRefresh={() => refreshISOs({ silent: true })}
              selectedIso={selectedIso}
              onSelectIso={setSelectedIso}
            />
          )}
        </div>

        {showActions && (
          <ActionsPane
            hostName={HOST_NAME}
            node={node}
            vm={node === 'vms' ? selectedVm : null}
            iso={node === 'isos' ? selectedIsoItem : null}
            server={{
              newVM: openNewVM,
              settings: () => setDialog({ type: 'server' }),
              switches: () => setDialog({ type: 'switches' }),
              refresh: refreshAll,
              filter: () => setDialog({ type: 'filter' }),
              help: () => setDialog({ type: 'about' }),
            }}
            vmActions={{
              connect: connectSelected,
              settings: () => openSettings(),
              start: () => perform(() => startVM(selectedVm.id), 'Virtual machine starting.'),
              shutdown: () => perform(() => stopVM(selectedVm.id), 'Shut down request sent.'),
              turnOff: () => perform(() => forceStopVM(selectedVm.id), 'Virtual machine turned off.'),
              pause: () => perform(() => pauseVM(selectedVm.id), 'Virtual machine paused.'),
              resume: () => perform(() => resumeVM(selectedVm.id), 'Virtual machine resumed.'),
              reset: () => perform(() => resetVM(selectedVm.id), 'Virtual machine reset.'),
              checkpoint: () => openCheckpoints(),
              rename: () => openRename(),
              remove: () => openDelete(),
            }}
            onDeleteIso={() => confirmDeleteIso(selectedIsoItem)}
          />
        )}
      </div>

      <StatusBar
        node={node}
        total={node === 'vms' ? vms.length : isos.length}
        shown={node === 'vms' ? shownVms.length : isos.length}
        selectedName={node === 'vms' ? selectedVm?.name : selectedIsoItem?.name}
        filterActive={node === 'vms' && filterActive}
      />

      {dialog?.type === 'new' && (
        <NewVMWizard
          onClose={closeDialog}
          onCreated={async (vm) => {
            await refreshVMs()
            setSelectedId(vm.id)
            setDialog(null)
            notify('Virtual machine created.')
          }}
        />
      )}

      {dialog?.type === 'settings' && (
        <VMSettingsDialog
          vmId={dialog.vmId}
          onClose={closeDialog}
          notify={notify}
        />
      )}

      {dialog?.type === 'checkpoints' && (
        <CheckpointsDialog vmId={dialog.vmId} onClose={closeDialog} notify={notify} />
      )}

      {dialog?.type === 'switches' && (
        <VirtualSwitchManager vms={vms} onClose={closeDialog} />
      )}

      {dialog?.type === 'server' && (
        <HyperVServerSettings onClose={closeDialog} />
      )}

      {dialog?.type === 'filter' && (
        <FilterDialog
          filter={filter}
          onApply={setFilter}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.type === 'rename' && dialogVm && (
        <RenameDialog
          vm={dialogVm}
          onClose={closeDialog}
          onRename={(name) => renameVm(dialogVm.id, name)}
        />
      )}

      {dialog?.type === 'delete' && dialogVm && (
        <DeleteVMDialog
          vm={dialogVm}
          onClose={closeDialog}
          onConfirm={() => deleteVm(dialogVm)}
        />
      )}

      {dialog?.type === 'about' && (
        <AboutDialog onClose={closeDialog} />
      )}

      {message && (
        <MessageBox
          title={message.title}
          message={message.message}
          variant={message.variant}
          buttons={message.buttons}
          onClose={() => setMessage(null)}
        />
      )}

      {toast && (
        <div className="toast">
          <CheckCircle2 size={14} />
          {toast}
        </div>
      )}
    </div>
  )
}
