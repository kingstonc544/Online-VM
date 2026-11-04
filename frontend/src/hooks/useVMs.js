import { useCallback, useEffect, useState } from 'react'
import * as api from '../api/client'

export default function useVMs() {
  const [vms, setVMs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const data = await api.getVMs()
      setVMs(data)
      setError(null)
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load virtual machines')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const timer = setInterval(() => refresh({ silent: true }), 5000)
    return () => clearInterval(timer)
  }, [refresh])

  const run = (fn) => async (...args) => {
    const result = await fn(...args)
    await refresh({ silent: true })
    return result
  }

  return {
    vms,
    loading,
    error,
    refresh,
    createVM: run(api.createVM),
    updateVM: run(api.updateVM),
    deleteVM: run(api.deleteVM),
    startVM: run(api.startVM),
    stopVM: run(api.stopVM),
    forceStopVM: run(api.forceStopVM),
    pauseVM: run(api.pauseVM),
    resumeVM: run(api.resumeVM),
    resetVM: run(api.resetVM),
    createSnapshot: run(api.createSnapshot),
    restoreSnapshot: run(api.restoreSnapshot),
    deleteSnapshot: run(api.deleteSnapshot),
  }
}
