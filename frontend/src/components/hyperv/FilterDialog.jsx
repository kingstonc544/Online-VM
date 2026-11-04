import React, { useState } from 'react'
import Dialog from './Dialog'
import { Field } from './Controls'

export default function FilterDialog({ filter, onApply, onClose }) {
  const [name, setName] = useState(filter?.name || '')
  const [state, setState] = useState(filter?.state || 'all')

  return (
    <Dialog
      title="Filter"
      onClose={onClose}
      width={420}
      footer={(
        <>
          <button
            type="button"
            className="btn"
            onClick={() => { onApply({ name: '', state: 'all' }); onClose() }}
          >
            Clear
          </button>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => { onApply({ name, state }); onClose() }}
          >
            Apply
          </button>
        </>
      )}
    >
      <Field label="Name contains">
        <input
          className="input"
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          placeholder="All virtual machines"
        />
      </Field>
      <Field label="State">
        <select className="input" value={state} onChange={(e) => setState(e.target.value)}>
          <option value="all">All</option>
          <option value="running">Running</option>
          <option value="paused">Paused</option>
          <option value="stopped">Off</option>
          <option value="error">Error</option>
        </select>
      </Field>
    </Dialog>
  )
}
