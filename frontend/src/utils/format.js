export function vmState(status) {
  switch (status) {
    case 'running': return 'Running'
    case 'paused': return 'Paused'
    case 'error': return 'Error'
    default: return 'Off'
  }
}

export function vmStateClass(status) {
  switch (status) {
    case 'running': return 'running'
    case 'paused': return 'paused'
    case 'error': return 'error'
    default: return 'off'
  }
}

export function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString([], {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export function formatMemory(mb) {
  if (!mb && mb !== 0) return '—'
  return `${mb} MB`
}

export function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(1)} ${units[unit]}`
}

export function checkpointName(vmName) {
  const stamp = new Date().toLocaleString([], {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  return `${vmName} - ${stamp}`
}
