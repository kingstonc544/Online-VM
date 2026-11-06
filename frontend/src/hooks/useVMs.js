import { useCallback, useEffect, useState } from 'react'
import * as api from '../api/client'

const sameData = (left, right) => JSON.stringify(left) === JSON.stringify(right)

export default function useVMs() {
  const [vms, setVMs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const data = await api.getVMs()
      // Keep the previous array when nothing changed so the whole UI does not
      // re-render every poll tick.
      setVMs((prev) => (sameData(prev, data) ? prev : data))
      setError(null)
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load virtual machines')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    // Skip polling while the tab is hidden; refresh as soon as it returns.
    const timer = setInterval(() => {
      if (!document.hidden) refresh({ silent: true })
    }, 5000)
    const wake = () => {
      if (!document.hidden) refresh({ silent: true })
    }
    window.addEventListener('focus', wake)
    document.addEventListener('visibilitychange', wake)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', wake)
      document.removeEventListener('visibilitychange', wake)
    }
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
