import { useState } from 'react'
import type { FormEvent } from 'react'
import type { RenovationProject } from '../types'

const STATUSES: { value: RenovationProject['status']; label: string }[] = [
  { value: 'planned', label: 'Planlagt' },
  { value: 'active', label: 'Pågår' },
  { value: 'done', label: 'Ferdig' },
]

interface Props {
  onAdd: (data: Omit<RenovationProject, 'id'>) => Promise<void>
  onClose: () => void
}

export default function AddProjectModal({ onAdd, onClose }: Props) {
  const [name, setName] = useState('')
  const [status, setStatus] = useState<RenovationProject['status']>('active')
  const [budget, setBudget] = useState('')
  const [startDate, setStartDate] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    const parsedBudget = budget ? parseFloat(budget.replace(',', '.')) : undefined
    await onAdd({
      name: name.trim(),
      status,
      ...(parsedBudget && !isNaN(parsedBudget) && { budget: parsedBudget }),
      ...(startDate && { startDate }),
      ...(description.trim() && { description: description.trim() }),
    })
    onClose()
  }

  const field: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--bg)',
    color: 'var(--text-h)', fontSize: 14, boxSizing: 'border-box', outline: 'none',
    fontFamily: 'var(--sans)',
  }

  const segBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '7px 0', border: '1px solid var(--border)', borderRadius: 7,
    background: active ? 'var(--accent-bg)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    cursor: 'pointer', fontWeight: active ? 600 : 400, fontSize: 13,
    fontFamily: 'var(--sans)',
  })

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 style={{ margin: '0 0 20px', fontSize: 17 }}>Nytt prosjekt</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Prosjektnavn *
            </label>
            <input style={field} type="text" placeholder="f.eks. Stue — nytt gulv" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Status
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              {STATUSES.map(s => (
                <button key={s.value} type="button" style={segBtn(status === s.value)} onClick={() => setStatus(s.value)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Budsjett (kr)
            </label>
            <input style={field} type="text" inputMode="decimal" placeholder="0" value={budget} onChange={e => setBudget(e.target.value)} />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Startdato
            </label>
            <input style={field} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Beskrivelse
            </label>
            <input style={field} type="text" placeholder="Kort beskrivelse" value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              type="button" onClick={onClose}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--sans)' }}
            >
              Avbryt
            </button>
            <button
              type="submit" disabled={saving}
              style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1, fontFamily: 'var(--sans)' }}
            >
              {saving ? 'Oppretter…' : 'Opprett prosjekt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
