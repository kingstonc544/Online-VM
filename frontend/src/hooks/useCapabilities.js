import { useEffect, useState } from 'react'
import { getCapabilities } from '../api/client'

/** Host virtualization capabilities: available engines and guest architectures. */
export default function useCapabilities() {
  const [capabilities, setCapabilities] = useState(null)

  useEffect(() => {
    let cancelled = false
    getCapabilities()
      .then((data) => { if (!cancelled) setCapabilities(data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return capabilities
}
