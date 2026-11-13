import { useState } from 'react'
import type { FormEvent } from 'react'
import type { HouseMember, ManualExpense } from '../types'

interface Props {
  currentUser: { uid: string; name: string }
  members: HouseMember[]
  onAdd: (scope: 'felles' | 'personlig', data: Omit<ManualExpense, 'id' | 'createdAt'>) => Promise<void>
  onClose: () => void
}

export default function AddExpenseModal({ currentUser, members, onAdd, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [scope, setScope] = useState<'felles' | 'personlig'>('felles')
  const [type, setType] = useState<'recurring' | 'one-time'>('one-time')
  const [recurrence, setRecurrence] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly')
  const [paidByUid, setPaidByUid] = useState(currentUser.uid)
  const [saving, setSaving] = useState(false)

  const paidByName = members.find(m => m.uid === paidByUid)?.name
    || (paidByUid === currentUser.uid ? currentUser.name : 'Ukjent')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title || !amount) return
    setSaving(true)
    await onAdd(scope, {
      title: title.trim(),
      amount: parseFloat(amount.replace(',', '.')),
      date,
      dueDate: dueDate || null,
      type,
      recurrence: type === 'recurring' ? recurrence : null,
      scope,
      paidByUid,
      paidByName,
      settled: false,
    })
    onClose()
  }

  const field: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 7,
    border: '1px solid var(--border)', background: 'var(--code-bg)',
    color: 'var(--text-h)', fontSize: 14, boxSizing: 'border-box',
    outline: 'none',
  }

  const segBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '7px 0', border: '1px solid var(--border)',
    borderRadius: 7, background: active ? 'var(--accent-bg)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    cursor: 'pointer', fontWeight: active ? 600 : 400, fontSize: 13,
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface, #1a1d27)', border: '1px solid var(--border)',
        borderRadius: 14, padding: 24, width: '100%', maxWidth: 420,
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18 }}>Legg til utgift</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Scope */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" style={segBtn(scope === 'felles')} onClick={() => setScope('felles')}>Felles</button>
            <button type="button" style={segBtn(scope === 'personlig')} onClick={() => setScope('personlig')}>Min personlig</button>
          </div>

          {/* Title */}
          <input style={field} placeholder="Tittel (f.eks. Strøm, Lån)" value={title} onChange={e => setTitle(e.target.value)} required />

          {/* Amount + Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <input style={field} type="text" inputMode="decimal" placeholder="Beløp kr" value={amount} onChange={e => setAmount(e.target.value)} required />
            <input style={field} type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {/* Type */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" style={segBtn(type === 'one-time')} onClick={() => setType('one-time')}>Engangskostnad</button>
            <button type="button" style={segBtn(type === 'recurring')} onClick={() => setType('recurring')}>Fast utgift</button>
          </div>

          {type === 'recurring' && (
            <select style={field} value={recurrence} onChange={e => setRecurrence(e.target.value as any)}>
              <option value="monthly">Månedlig</option>
              <option value="quarterly">Kvartalsvis</option>
              <option value="yearly">Årlig</option>
            </select>
          )}

          {/* Due date (optional) */}
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Forfallsdato (valgfritt)</label>
            <input style={field} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>

          {/* Paid by — only for felles */}
          {scope === 'felles' && (
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Hvem betalte?</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {members.length > 0 ? members.map(m => (
                  <button key={m.uid} type="button" style={segBtn(paidByUid === m.uid)} onClick={() => setPaidByUid(m.uid)}>
                    {m.uid === currentUser.uid ? `${m.name} (deg)` : m.name}
                  </button>
                )) : (
                  <>
                    <button type="button" style={segBtn(paidByUid === currentUser.uid)} onClick={() => setPaidByUid(currentUser.uid)}>Meg</button>
                    <button type="button" style={segBtn(paidByUid === 'other')} onClick={() => setPaidByUid('other')}>Samboer</button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
              Avbryt
            </button>
            <button type="submit" disabled={saving} style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Lagrer…' : 'Legg til'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
