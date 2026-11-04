import React from 'react'
import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import HyperVManager from './components/hyperv/HyperVManager'
import VMConnect from './components/hyperv/VMConnect'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('App error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'Segoe UI, Tahoma, sans-serif', color: '#1a1a1a' }}>
          <h2 style={{ marginTop: 0, fontSize: 15 }}>Hyper-V Manager could not start</h2>
          <pre style={{ fontSize: 12, color: '#616161', whiteSpace: 'pre-wrap' }}>
            {this.state.error?.message}
          </pre>
          <button
            type="button"
            className="btn btn-primary"
            style={{ marginTop: 8 }}
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function SettingsRoute() {
  const { id } = useParams()
  return <HyperVManager initialSettingsId={id} />
}

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<HyperVManager />} />
        <Route path="/isos" element={<HyperVManager initialNode="isos" />} />
        <Route path="/vm/:id" element={<VMConnect />} />
        <Route path="/vm/:id/settings" element={<SettingsRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}
