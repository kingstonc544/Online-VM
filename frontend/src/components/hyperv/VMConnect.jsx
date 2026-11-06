import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ExternalLink, Monitor, Pause, Play, Power, RefreshCw, RotateCcw, Square, X,
} from 'lucide-react'
import {
  forceStopVM, getVM, pauseVM, resetVM, resumeVM, startVM, stopVM,
} from '../../api/client'
import { vmState } from '../../utils/format'
import VNCViewer from './VNCViewer'

export default function VMConnect() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [vm, setVm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)

  async function load() {
    try {
      setVm(await getVM(id))
      setError(null)
    } catch (err) {
      setError(err?.response?.data?.detail || 'The virtual machine could not be loaded.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const timer = setInterval(load, 5000)
    return () => clearInterval(timer)
  }, [id])

  async function perform(action, label) {
    setBusy(label)
    setError(null)
    try {
      await action()
      await load()
    } catch (err) {
      setError(err?.response?.data?.detail || 'The operation could not be completed.')
    } finally {
      setBusy(null)
    }
  }

  const running = vm?.status === 'running'
  const paused = vm?.status === 'paused'
  const off = vm?.status === 'stopped' || vm?.status === 'error'

  const host = window.location.hostname
  const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80')
  const consoleUrl = `/vm/${id}`

  return (
    <div className="connect-page">
      <div className="connect-window">
        <div className="connect-titlebar">
          <span>{vm?.name || 'Virtual Machine'} — Virtual Machine Connection</span>
          <button
            type="button"
            className="connect-close"
            aria-label="Close"
            onClick={() => navigate('/')}
          >
            <X size={15} />
          </button>
        </div>

        <div className="connect-toolbar">
          <button
            type="button"
            className="connect-tool-btn"
            disabled={!off || !!busy}
            onClick={() => perform(() => startVM(id), 'start')}
          >
            <Play size={13} />
            Start
          </button>
          <button
            type="button"
            className="connect-tool-btn"
            disabled={!running || !!busy}
            onClick={() => perform(() => stopVM(id), 'shutdown')}
          >
            <Power size={13} />
            Shut Down
          </button>
          <button
            type="button"
            className="connect-tool-btn"
            disabled={(!running && !paused) || !!busy}
            onClick={() => perform(() => forceStopVM(id), 'turnoff')}
          >
            <Square size={12} />
            Turn Off
          </button>
          <button
            type="button"
            className="connect-tool-btn"
            disabled={!running || !!busy}
            onClick={() => perform(() => pauseVM(id), 'pause')}
          >
            <Pause size={13} />
            Pause
          </button>
          <button
            type="button"
            className="connect-tool-btn"
            disabled={(!paused && !running) || !!busy}
            onClick={() => perform(() => (paused ? resumeVM(id) : resetVM(id)), paused ? 'resume' : 'reset')}
          >
            {paused ? <Play size={13} /> : <RotateCcw size={13} />}
            {paused ? 'Resume' : 'Reset'}
          </button>
          <div className="tool-sep" />
          <button type="button" className="connect-tool-btn" onClick={load}>
            <RefreshCw size={13} />
            Refresh
          </button>
          <a
            className="connect-tool-btn"
            style={{ textDecoration: 'none' }}
            href={consoleUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={13} />
            Open in new window
          </a>
          <div className="tool-sep" />
          <button type="button" className="connect-tool-btn" onClick={() => navigate('/')}>
            <X size={13} />
            Close
          </button>
        </div>

        {error && <div className="error-banner" style={{ margin: 8 }}>{error}</div>}

        <div className="connect-screen">
          {running ? (
            <VNCViewer vmId={id} password={vm?.vnc_password} />
          ) : (
            <div className="connect-off">
              <Monitor size={46} color="#6d6d6d" />
              <h2>The virtual machine is {loading ? 'loading' : vmState(vm?.status)}</h2>
              <p>
                {paused
                  ? 'Resume the virtual machine to continue working in its console.'
                  : 'Start the virtual machine to connect to its console.'}
              </p>
              {off && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!!busy}
                  onClick={() => perform(() => startVM(id), 'start')}
                >
                  {busy === 'start' ? <span className="spinner" /> : <Play size={13} />}
                  Start
                </button>
              )}
              {paused && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!!busy}
                  onClick={() => perform(() => resumeVM(id), 'resume')}
                >
                  Resume
                </button>
              )}
              <div className="console-note">
                The console is provided by the noVNC viewer over the VNC WebSocket proxy.
              </div>
            </div>
          )}
        </div>

        <div className="connect-status">
          <span>{vm ? `${vm.name}: ${vmState(vm.status)}` : 'Loading…'}</span>
          <span>VNC port {vm?.vnc_port || '—'} · {host}:{port}</span>
        </div>
      </div>
    </div>
  )
}
