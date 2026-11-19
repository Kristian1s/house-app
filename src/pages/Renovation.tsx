import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { nameFromUser } from '../types'
import { useRenovationProjects } from '../hooks/useRenovationProjects'
import { useRenovationExpenses } from '../hooks/useRenovationExpenses'
import AddProjectModal from '../components/AddProjectModal'
import AddRenovationExpenseModal from '../components/AddRenovationExpenseModal'
import type { RenovationProject } from '../types'

function fmt(n: number) {
  return n.toLocaleString('nb-NO', { maximumFractionDigits: 0 }) + ' kr'
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('nb-NO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusLabel(s: RenovationProject['status']) {
  if (s === 'active') return 'Pågår'
  if (s === 'done') return 'Ferdig'
  return 'Planlagt'
}

function statusStyle(s: RenovationProject['status']): { color: string; bg: string } {
  if (s === 'active') return { color: 'var(--accent)', bg: 'var(--accent-bg)' }
  if (s === 'done') return { color: '#3fb950', bg: 'rgba(63,185,80,0.1)' }
  return { color: 'var(--text-muted)', bg: 'var(--border)' }
}

function warrantyStyle(end: string): { color: string; bg: string } {
  const days = Math.round((new Date(end).getTime() - Date.now()) / 86400000)
  if (days < 30) return { color: '#f85149', bg: 'rgba(248,81,73,0.1)' }
  if (days < 180) return { color: '#d29922', bg: 'rgba(210,153,34,0.1)' }
  return { color: '#3fb950', bg: 'rgba(63,185,80,0.1)' }
}

export default function Renovation() {
  const { user } = useAuth()
  const { projects, loading: loadingProjects, addProject } = useRenovationProjects()
  const { expenses, loading: loadingExpenses, addExpense, deleteExpense } = useRenovationExpenses()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAddProject, setShowAddProject] = useState(false)
  const [showAddExpense, setShowAddExpense] = useState(false)

  if (!user) return null
  const currentUserName = nameFromUser(user)
  const otherName = currentUserName === 'Kristian' ? 'Kristine' : 'Kristian'

  const selectedProject = projects.find(p => p.id === selectedId) ?? null

  // Cost per project (for list view cards)
  const costByProject = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.projectId] = (acc[e.projectId] ?? 0) + e.amount
    return acc
  }, {})

  // ── Detail view ───────────────────────────────────────────
  if (selectedProject) {
    const projectExpenses = expenses.filter(e => e.projectId === selectedId)
    const myTotal = projectExpenses.reduce((s, e) => e.paidBy === currentUserName ? s + e.amount : s, 0)
    const theirTotal = projectExpenses.reduce((s, e) => e.paidBy !== currentUserName ? s + e.amount : s, 0)
    const total = myTotal + theirTotal
    const diff = myTotal - total / 2
    const ss = statusStyle(selectedProject.status)

    return (
      <div className="page">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelectedId(null)}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 7, padding: '5px 12px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--sans)', flexShrink: 0 }}
          >
            ← Tilbake
          </button>
          <h1 style={{ flex: 1, minWidth: 0 }}>{selectedProject.name}</h1>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: ss.bg, color: ss.color, flexShrink: 0 }}>
            {statusLabel(selectedProject.status)}
          </span>
          <button
            onClick={() => setShowAddExpense(true)}
            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)', flexShrink: 0 }}
          >
            + Legg til utgift
          </button>
        </div>

        {/* 50/50 balance */}
        {total > 0 && (
          <div className="card" style={{ marginBottom: 16, ...(diff !== 0 && { background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }) }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>50/50 balanse</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: diff !== 0 ? 'var(--accent)' : 'var(--text-h)' }}>
              {diff === 0 ? 'Dere er kvitt' : diff > 0 ? `${otherName} skylder deg ${fmt(diff)}` : `Du skylder ${otherName} ${fmt(Math.abs(diff))}`}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {currentUserName}: {fmt(myTotal)} · {otherName}: {fmt(theirTotal)} · totalt {fmt(total)}
              {selectedProject.budget ? ` · budsjett ${fmt(selectedProject.budget)}` : ''}
            </div>
          </div>
        )}

        {/* Expense list */}
        <div className="card">
          {loadingExpenses ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Laster…</p>
          ) : projectExpenses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 12 }}>Ingen utgifter enda.</p>
              <button
                onClick={() => setShowAddExpense(true)}
                style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' }}
              >
                + Legg til første utgift
              </button>
            </div>
          ) : (
            projectExpenses.map((e, i) => {
              const ws = e.warrantyEnd ? warrantyStyle(e.warrantyEnd) : null
              return (
                <div key={e.id} style={{ padding: '12px 0', borderBottom: i < projectExpenses.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Title row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-h)' }}>{e.description}</span>
                        <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 4, background: 'var(--accent-bg)', color: 'var(--accent)', fontWeight: 500 }}>
                          {e.category}
                        </span>
                        {ws && e.warrantyEnd && (
                          <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 4, background: ws.bg, color: ws.color, fontWeight: 500 }}>
                            Garanti til {fmtDate(e.warrantyEnd)}
                          </span>
                        )}
                      </div>
                      {/* Meta row */}
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {fmtDate(e.date)} · {e.paidBy}
                        {e.contractor?.name && (
                          <>
                            {' · '}
                            <span style={{ fontWeight: 500, color: 'var(--text-h)' }}>{e.contractor.name}</span>
                            {e.contractor.contact && ` · ${e.contractor.contact}`}
                            {e.contractor.phone && (
                              <> · <a href={`tel:${e.contractor.phone}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{e.contractor.phone}</a></>
                            )}
                            {e.contractor.email && (
                              <> · <a href={`mailto:${e.contractor.email}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{e.contractor.email}</a></>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right side */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {e.receiptUrl && (
                        <a
                          href={e.receiptUrl} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none', padding: '2px 7px', borderRadius: 5, border: '1px solid var(--accent-border)', background: 'var(--accent-bg)', whiteSpace: 'nowrap' }}
                        >
                          PDF
                        </a>
                      )}
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-h)', whiteSpace: 'nowrap' }}>{fmt(e.amount)}</span>
                      <button
                        onClick={() => deleteExpense(e.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: '2px 4px', lineHeight: 1 }}
                        title="Slett utgift"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {showAddExpense && (
          <AddRenovationExpenseModal
            projectId={selectedProject.id}
            currentUserName={currentUserName}
            currentUserUid={user.uid}
            onAdd={addExpense}
            onClose={() => setShowAddExpense(false)}
          />
        )}
      </div>
    )
  }

  // ── List view ─────────────────────────────────────────────
  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1>Renovering</h1>
        <button
          onClick={() => setShowAddProject(true)}
          style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' }}
        >
          + Nytt prosjekt
        </button>
      </div>

      {loadingProjects ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Laster…</p>
      ) : projects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16 }}>Ingen prosjekter enda.</p>
          <button
            onClick={() => setShowAddProject(true)}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' }}
          >
            + Legg til første prosjekt
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {projects.map(p => {
            const spent = costByProject[p.id] ?? 0
            const pct = p.budget ? (spent / p.budget) * 100 : null
            const over = p.budget ? spent > p.budget : false
            const expCount = expenses.filter(e => e.projectId === p.id).length
            const ss = statusStyle(p.status)
            const barColor = over ? '#f85149' : pct && pct > 80 ? '#d29922' : 'var(--accent)'

            return (
              <div
                key={p.id}
                className="card"
                onClick={() => setSelectedId(p.id)}
                style={{ cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'; e.currentTarget.style.borderColor = 'var(--accent-border)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--text-h)' }}>{p.name}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: ss.bg, color: ss.color, flexShrink: 0 }}>
                    {statusLabel(p.status)}
                  </span>
                </div>

                {p.description && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{p.description}</p>
                )}

                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: pct !== null ? 10 : 0 }}>
                  <span style={{ color: over ? '#f85149' : 'var(--text-h)', fontWeight: 600 }}>{fmt(spent)}</span>
                  {p.budget ? <span> / {fmt(p.budget)}</span> : ''}
                  <span> · {expCount} utgift{expCount !== 1 ? 'er' : ''}</span>
                  {over && <span style={{ color: '#f85149', fontWeight: 600 }}> · Over budsjett!</span>}
                </div>

                {pct !== null && (
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, borderRadius: 2, background: barColor, transition: 'width 0.3s' }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showAddProject && (
        <AddProjectModal onAdd={addProject} onClose={() => setShowAddProject(false)} />
      )}
    </div>
  )
}
