import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useFellesExpenses } from '../hooks/useFellesExpenses'
import { usePersonalExpenses } from '../hooks/usePersonalExpenses'
import { useHouseMembers } from '../hooks/useHouseMembers'
import { useBudget } from '../hooks/useBudget'
import AddExpenseModal from '../components/AddExpenseModal'
import type { ManualExpense } from '../types'

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: number) {
  return amount.toLocaleString('nb-NO', { maximumFractionDigits: 0 }) + ' kr'
}

function fmtDate(d: any): string {
  if (!d) return '—'
  const date = typeof d === 'object' && 'toDate' in d ? d.toDate() : new Date(d)
  return date.toLocaleDateString('nb-NO', { day: '2-digit', month: 'short' })
}

function thisMonth(dateStr: string) {
  const now = new Date()
  return dateStr?.startsWith(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
}

function sumMonth(expenses: ManualExpense[]) {
  return expenses.filter(e => thisMonth(e.date)).reduce((s, e) => s + e.amount, 0)
}

function dueWithin30(expenses: ManualExpense[]) {
  const cutoff = Date.now() + 30 * 24 * 60 * 60 * 1000
  return expenses
    .filter(e => e.dueDate && new Date(e.dueDate).getTime() <= cutoff && new Date(e.dueDate).getTime() >= Date.now())
    .reduce((s, e) => s + e.amount, 0)
}

// ── sub-components ────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div style={{
      flex: 1, minWidth: 140, padding: '14px 16px',
      background: accent ? 'var(--accent-bg)' : 'var(--code-bg)',
      border: `1px solid ${accent ? 'var(--accent-border)' : 'var(--border)'}`,
      borderRadius: 10,
    }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: accent ? 'var(--accent)' : 'var(--text-h)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function BudgetBar({ label, spent, limit, onEditLimit }: { label: string; spent: number; limit: number; onEditLimit: (v: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(String(limit))
  const pct = Math.min((spent / limit) * 100, 100)
  const over = spent > limit

  function save() {
    const n = parseFloat(val.replace(',', '.'))
    if (!isNaN(n) && n > 0) onEditLimit(n)
    setEditing(false)
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ color: over ? '#f85149' : 'var(--text-h)', fontWeight: 500 }}>
          {fmt(spent)} / {editing
            ? <input autoFocus value={val} onChange={e => setVal(e.target.value)} onBlur={save} onKeyDown={e => e.key === 'Enter' && save()}
                style={{ width: 80, background: 'transparent', border: 'none', borderBottom: '1px solid var(--accent)', color: 'var(--text-h)', fontSize: 13, outline: 'none' }} />
            : <span style={{ cursor: 'pointer', borderBottom: '1px dashed var(--border)' }} onClick={() => setEditing(true)}>{fmt(limit)}</span>
          }
        </span>
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: over ? '#f85149' : 'var(--accent)', transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

function AttachmentLink({ url, name }: { url: string; name: string }) {
  const isPdf = name.toLowerCase().endsWith('.pdf')
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      title={name}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--accent)', textDecoration: 'none', padding: '2px 6px', borderRadius: 5, border: '1px solid var(--accent-border)', background: 'var(--accent-bg)', whiteSpace: 'nowrap' }}>
      {isPdf ? '📄' : '🖼'} {name.length > 20 ? name.slice(0, 18) + '…' : name}
    </a>
  )
}

function ExpenseRow({ expense, onDelete, extra }: { expense: ManualExpense; onDelete?: () => void; extra?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: 'var(--text-h)', fontWeight: 500 }}>{expense.title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {expense.type === 'recurring' ? `Fast · ${expense.recurrence === 'monthly' ? 'månedlig' : expense.recurrence === 'quarterly' ? 'kvartalsvis' : 'årlig'}` : fmtDate(expense.date)}
          {expense.dueDate && ` · forfall ${fmtDate(expense.dueDate)}`}
        </div>
        {expense.attachmentUrl && expense.attachmentName && (
          <div style={{ marginTop: 4 }}>
            <AttachmentLink url={expense.attachmentUrl} name={expense.attachmentName} />
          </div>
        )}
      </div>
      {extra}
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)', whiteSpace: 'nowrap' }}>{fmt(expense.amount)}</div>
      {onDelete && (
        <button onClick={onDelete} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: '2px 4px' }}>✕</button>
      )}
    </div>
  )
}


function SectionHeader({ title, count, total }: { title: string; count: number; total?: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)' }}>
        {title} {count > 0 && <span style={{ background: 'var(--border)', borderRadius: 10, padding: '1px 6px' }}>{count}</span>}
      </span>
      {total != null && total > 0 && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)' }}>{fmt(total)}</span>}
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function Expenses() {
  const { user } = useAuth()
  const { expenses: felles, loading: fellesLoading, addExpense: addFelles, deleteExpense: deleteFelles, settleAll, toggleSettled } = useFellesExpenses()
  const { expenses: personal, loading: personalLoading, addExpense: addPersonal, deleteExpense: deletePersonal } = usePersonalExpenses(user?.uid)
  const members = useHouseMembers(user)
  const { budget, updateBudget } = useBudget()
  const [showModal, setShowModal] = useState(false)

  if (!user) return null
  const loading = fellesLoading || personalLoading

  const currentUser = {
    uid: user.uid,
    name: user.displayName || user.email?.split('@')[0] || 'Meg',
  }

  // Split manual expenses
  const fellesRecurring = felles.filter(e => e.type === 'recurring')
  const fellesOneTime = felles.filter(e => e.type === 'one-time')
  const personalRecurring = personal.filter(e => e.type === 'recurring')
  const personalOneTime = personal.filter(e => e.type === 'one-time')

  // Summary numbers
  const fellesTotal = sumMonth(felles)
  const personalTotal = sumMonth(personal)
  const upcoming = dueWithin30([...felles, ...personal])

  // Balance calculation (unsettled felles only)
  const unsettled = felles.filter(e => !e.settled)
  const myPaid = unsettled.filter(e => e.paidByUid === user.uid).reduce((s, e) => s + e.amount, 0)
  const otherPaid = unsettled.filter(e => e.paidByUid !== user.uid).reduce((s, e) => s + e.amount, 0)
  const balanceDiff = myPaid - otherPaid
  const otherName = members.find(m => m.uid !== user.uid)?.name || 'Samboer'

  async function handleAdd(scope: 'felles' | 'personlig', data: Omit<ManualExpense, 'id' | 'createdAt'>) {
    if (scope === 'felles') await addFelles(data)
    else await addPersonal(data)
  }

  const card: React.CSSProperties = {
    background: 'var(--code-bg)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '20px',
  }

  return (
    <div style={{ padding: '24px 16px', maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Utgifter</h1>
        <button onClick={() => setShowModal(true)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          + Legg til
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <SummaryCard label="Felles denne måneden" value={loading ? '…' : fmt(fellesTotal)} sub="denne måneden" />
        <SummaryCard label="Min personlig" value={loading ? '…' : fmt(personalTotal)} sub="denne måneden" />
        <SummaryCard label="Forfall 30 dager" value={loading ? '…' : fmt(upcoming)} sub="kommende betalinger" />
        <SummaryCard
          label="Balanse"
          value={loading ? '…' : balanceDiff === 0 ? 'Oppgjort' : `${fmt(Math.abs(balanceDiff / 2))}`}
          sub={balanceDiff > 0 ? `${otherName} skylder deg` : balanceDiff < 0 ? `Du skylder ${otherName}` : 'Alt er oppgjort'}
          accent={balanceDiff !== 0}
        />
      </div>

      {/* Budget bars */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 14 }}>Budsjett denne måneden</div>
        <BudgetBar label="Felles" spent={fellesTotal} limit={budget.fellesLimit} onEditLimit={v => updateBudget({ fellesLimit: v })} />
        <BudgetBar label="Personlig" spent={personalTotal} limit={budget.personligLimit} onEditLimit={v => updateBudget({ personligLimit: v })} />
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Klikk på beløpet for å endre budsjett</div>
      </div>

      {/* Felles */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-h)', marginBottom: 16 }}>Felles</div>

        {fellesRecurring.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <SectionHeader title="Faste utgifter" count={fellesRecurring.length} total={fellesRecurring.reduce((s, e) => s + e.amount, 0)} />
            {fellesRecurring.map(e => (
              <ExpenseRow key={e.id} expense={e} onDelete={() => deleteFelles(e.id)}
                extra={<span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, background: e.paidByUid === user.uid ? 'rgba(88,166,255,0.15)' : 'rgba(63,185,80,0.15)', color: e.paidByUid === user.uid ? '#58a6ff' : '#3fb950' }}>{e.paidByName}</span>}
              />
            ))}
          </div>
        )}

        {fellesOneTime.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <SectionHeader title="Engangsutgifter" count={fellesOneTime.length} total={fellesOneTime.filter(e => !e.settled).reduce((s, e) => s + e.amount, 0)} />
            {fellesOneTime.map(e => (
              <ExpenseRow key={e.id} expense={e} onDelete={() => deleteFelles(e.id)}
                extra={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, background: e.paidByUid === user.uid ? 'rgba(88,166,255,0.15)' : 'rgba(63,185,80,0.15)', color: e.paidByUid === user.uid ? '#58a6ff' : '#3fb950' }}>{e.paidByName}</span>
                    <input type="checkbox" checked={e.settled} onChange={() => toggleSettled(e.id, e.settled)} title="Merk som gjort opp" style={{ cursor: 'pointer' }} />
                  </div>
                }
              />
            ))}
          </div>
        )}

        {felles.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Ingen felles utgifter ennå. Legg til med + knappen.</p>
        )}

        {/* Balance */}
        {unsettled.length > 0 && (
          <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                {balanceDiff > 0 ? `${otherName} skylder deg ${fmt(balanceDiff / 2)}` : balanceDiff < 0 ? `Du skylder ${otherName} ${fmt(Math.abs(balanceDiff / 2))}` : 'Dere er kvitt'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Basert på {unsettled.length} uoppgjorte poster</div>
            </div>
            <button onClick={settleAll} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--accent-border)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              Gjør opp
            </button>
          </div>
        )}
      </div>

      {/* Personlig */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-h)', marginBottom: 16 }}>Min personlig</div>

        {personalRecurring.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <SectionHeader title="Faste utgifter" count={personalRecurring.length} total={personalRecurring.reduce((s, e) => s + e.amount, 0)} />
            {personalRecurring.map(e => <ExpenseRow key={e.id} expense={e} onDelete={() => deletePersonal(e.id)} />)}
          </div>
        )}

        {personalOneTime.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <SectionHeader title="Engangsutgifter" count={personalOneTime.length} />
            {personalOneTime.map(e => <ExpenseRow key={e.id} expense={e} onDelete={() => deletePersonal(e.id)} />)}
          </div>
        )}

        {personal.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Ingen personlige utgifter ennå.</p>
        )}
      </div>

      {showModal && (
        <AddExpenseModal
          currentUser={currentUser}
          members={members}
          onAdd={handleAdd}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
