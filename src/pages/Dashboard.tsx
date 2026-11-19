import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useHouseExpenses } from '../hooks/useHouseExpenses'
import { useRenovationExpenses } from '../hooks/useRenovationExpenses'
import { HOUSE_CATEGORIES, RECURRING_CATEGORIES, nameFromUser } from '../types'
import type { HouseCategory, HouseExpense } from '../types'

function fmt(n: number) {
  return n.toLocaleString('nb-NO', { maximumFractionDigits: 0 }) + ' kr'
}

function expensesForMonth<T extends { date: string }>(expenses: T[], year: number, month: number) {
  const key = `${year}-${String(month + 1).padStart(2, '0')}`
  return expenses.filter(e => e.date.startsWith(key))
}

function categoryTotal(expenses: HouseExpense[], category: HouseCategory) {
  return expenses.filter(e => e.category === category).reduce((s, e) => s + e.amount, 0)
}

function MomIndicator({ current, prev }: { current: number; prev: number }) {
  if (prev === 0 || current === 0) return null
  const pct = Math.round(((current - prev) / prev) * 100)
  if (pct === 0) return null
  return (
    <span style={{ fontSize: 11, color: pct > 0 ? '#f85149' : '#3fb950', marginLeft: 6 }}>
      {pct > 0 ? '↑' : '↓'} {Math.abs(pct)}%
    </span>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { expenses, loading: loadingHouse } = useHouseExpenses(user?.uid ?? null)
  const { expenses: renovationExpenses, loading: loadingReno } = useRenovationExpenses()

  const loading = loadingHouse || loadingReno

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  if (!user) return null

  const currentUserName = nameFromUser(user)
  const otherName = currentUserName === 'Kristian' ? 'Kristine' : 'Kristian'

  // Monthly house expenses
  const monthExpenses = expensesForMonth(expenses, year, month)
  const prevMonth = month === 0 ? 11 : month - 1
  const prevYear = month === 0 ? year - 1 : year
  const prevExpenses = expensesForMonth(expenses, prevYear, prevMonth)

  // Monthly renovation expenses
  const monthRenovation = expensesForMonth(renovationExpenses, year, month)
  const monthRenovationTotal = monthRenovation.reduce((s, e) => s + e.amount, 0)

  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0) + monthRenovationTotal

  // All-time 50/50 balance — house + renovation combined
  const allExpenses = [...expenses, ...renovationExpenses]
  const myAll = allExpenses.reduce((s, e) => e.paidBy === currentUserName ? s + e.amount : s, 0)
  const theirAll = allExpenses.reduce((s, e) => e.paidBy !== currentUserName ? s + e.amount : s, 0)
  const totalAll = myAll + theirAll
  const diff = myAll - totalAll / 2

  const monthLabel = new Date(year, month, 1).toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' })

  function prevM() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextM() {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()
    if (isCurrentMonth) return
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()

  const row = (label: string, amount: number, right?: React.ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ flex: 1, fontSize: 13, color: 'var(--text-h)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)' }}>{fmt(amount)}</span>
      {right}
    </div>
  )

  return (
    <div className="page">
      <h1 style={{ marginBottom: 20 }}>Oversikt</h1>

      {/* 50/50 balance */}
      <div className="card" style={{ marginBottom: 16, ...(diff !== 0 && { background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }) }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>50/50 balanse — utgifter + renovering</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: diff !== 0 ? 'var(--accent)' : 'var(--text-h)' }}>
          {loading ? '…' : diff === 0 ? 'Dere er kvitt' : diff > 0 ? `${otherName} skylder deg ${fmt(diff)}` : `Du skylder ${otherName} ${fmt(Math.abs(diff))}`}
        </div>
        {!loading && totalAll > 0 && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            {currentUserName}: {fmt(myAll)} · {otherName}: {fmt(theirAll)} · totalt {fmt(totalAll)}
          </div>
        )}
      </div>

      {/* Month navigator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button onClick={prevM} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '4px 12px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>
          ‹
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-h)', textTransform: 'capitalize', minWidth: 170, textAlign: 'center' }}>
          {monthLabel}
        </span>
        <button onClick={nextM} disabled={isCurrentMonth} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '4px 12px', color: isCurrentMonth ? 'var(--border)' : 'var(--text-muted)', cursor: isCurrentMonth ? 'default' : 'pointer', fontSize: 16, lineHeight: 1 }}>
          ›
        </button>
        {!loading && monthTotal > 0 && (
          <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {fmt(monthTotal)} totalt
          </span>
        )}
      </div>

      {/* Category breakdown */}
      <div className="card">
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 14 }}>
          Per kategori
        </div>
        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Laster…</p>
        ) : (
          <>
            {HOUSE_CATEGORIES.map(cat => {
              const amount = categoryTotal(monthExpenses, cat)
              const prevAmount = categoryTotal(prevExpenses, cat)
              if (amount === 0 && prevAmount === 0) return null
              const isRecurring = RECURRING_CATEGORIES.includes(cat)
              return (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text-h)' }}>{cat}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)' }}>{amount > 0 ? fmt(amount) : '—'}</span>
                  {isRecurring && <MomIndicator current={amount} prev={prevAmount} />}
                </div>
              )
            })}

            {/* Renovation row */}
            {monthRenovationTotal > 0 && row(
              'Renovering',
              monthRenovationTotal,
              (() => {
                const myReno = monthRenovation.reduce((s, e) => e.paidBy === currentUserName ? s + e.amount : s, 0)
                const theirReno = monthRenovation.reduce((s, e) => e.paidBy !== currentUserName ? s + e.amount : s, 0)
                return (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                    {currentUserName}: {fmt(myReno)} · {otherName}: {fmt(theirReno)}
                  </span>
                )
              })()
            )}

            {monthExpenses.length === 0 && monthRenovationTotal === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Ingen utgifter registrert denne måneden.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
