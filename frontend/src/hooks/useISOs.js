import { useCallback, useEffect, useState } from 'react'
import { getISOs, uploadISO, deleteISO } from '../api/client'

export default function useISOs() {
  const [isos, setIsos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      setIsos(await getISOs())
      setError(null)
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to load ISO images')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const upload = async (file, onProgress) => {
    const formData = new FormData()
    formData.append('file', file)
    const result = await uploadISO(formData, (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    })
    await refresh({ silent: true })
    return result
  }

  const remove = async (name) => {
    await deleteISO(name)
    await refresh({ silent: true })
  }

  return { isos, loading, error, refresh, upload, remove }
}
