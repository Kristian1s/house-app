import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useHouseExpenses } from '../hooks/useHouseExpenses'
import AddExpenseModal from '../components/AddExpenseModal'
import { HOUSE_CATEGORIES } from '../types'
import type { HouseCategory } from '../types'

function fmt(n: number) {
  return n.toLocaleString('nb-NO', { maximumFractionDigits: 0 }) + ' kr'
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('nb-NO', { day: '2-digit', month: 'short', year: 'numeric' })
}

const PAYER_FILTERS = ['Alle', 'Kristian', 'Kristine'] as const

export default function Expenses() {
  const { user } = useAuth()
  const { expenses, loading, addExpense, deleteExpense } = useHouseExpenses()
  const [showModal, setShowModal] = useState(false)
  const [filterCategory, setFilterCategory] = useState<HouseCategory | 'Alle'>('Alle')
  const [filterPayer, setFilterPayer] = useState<string>('Alle')

  if (!user) return null

  const currentUserName = user.displayName || user.email?.split('@')[0] || 'Kristian'

  const filtered = expenses.filter(e => {
    if (filterCategory !== 'Alle' && e.category !== filterCategory) return false
    if (filterPayer !== 'Alle' && e.paidBy !== filterPayer) return false
    return true
  })

  const myTotal = expenses.reduce((s, e) => e.paidBy === currentUserName ? s + e.amount : s, 0)
  const theirTotal = expenses.reduce((s, e) => e.paidBy !== currentUserName ? s + e.amount : s, 0)
  const total = myTotal + theirTotal
  const diff = myTotal - total / 2
  const otherName = currentUserName === 'Kristian' ? 'Kristine' : 'Kristian'

  const card: React.CSSProperties = {
    background: 'var(--code-bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px',
  }
  const chip = (active: boolean): React.CSSProperties => ({
    padding: '4px 10px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
    border: '1px solid var(--border)',
    background: active ? 'var(--accent-bg)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    fontWeight: active ? 600 : 400,
  })

  return (
    <div style={{ padding: '24px 16px', maxWidth: 800, margin: '0 auto' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Utgifter</h1>
        <button
          onClick={() => setShowModal(true)}
          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
        >
          + Legg til
        </button>
      </div>

      {/* 50/50 balance */}
      <div style={{ ...card, marginBottom: 16, background: diff !== 0 ? 'var(--accent-bg)' : 'var(--code-bg)', border: `1px solid ${diff !== 0 ? 'var(--accent-border)' : 'var(--border)'}` }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>50/50 balanse</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: diff !== 0 ? 'var(--accent)' : 'var(--text-h)' }}>
          {loading ? '…' : diff === 0 ? 'Dere er kvitt' : diff > 0 ? `${otherName} skylder deg ${fmt(diff)}` : `Du skylder ${otherName} ${fmt(Math.abs(diff))}`}
        </div>
        {!loading && total > 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {currentUserName}: {fmt(myTotal)} · {otherName}: {fmt(theirTotal)} · totalt {fmt(total)}
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button style={chip(filterCategory === 'Alle')} onClick={() => setFilterCategory('Alle')}>Alle kategorier</button>
          {HOUSE_CATEGORIES.map(c => (
            <button key={c} style={chip(filterCategory === c)} onClick={() => setFilterCategory(c)}>{c}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {PAYER_FILTERS.map(p => (
            <button key={p} style={chip(filterPayer === p)} onClick={() => setFilterPayer(p)}>{p}</button>
          ))}
        </div>
      </div>

      {/* Expense list */}
      <div style={card}>
        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Laster…</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Ingen utgifter funnet.</p>
        ) : (
          filtered.map((e, i) => (
            <div
              key={e.id}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)' }}>
                  {e.category}
                  {e.description && <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>{e.description}</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {fmtDate(e.date)} · {e.paidBy}
                </div>
              </div>
              <a
                href={e.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', padding: '2px 7px', borderRadius: 5, border: '1px solid var(--accent-border)', background: 'var(--accent-bg)', whiteSpace: 'nowrap' }}
              >
                📄 PDF
              </a>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)', whiteSpace: 'nowrap' }}>{fmt(e.amount)}</div>
              <button
                onClick={() => deleteExpense(e.id)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: '2px 4px' }}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <AddExpenseModal
          currentUserName={currentUserName}
          currentUserUid={user.uid}
          onAdd={addExpense}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
