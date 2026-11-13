import { useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../hooks/useAuth'
import { useGmail } from '../hooks/useGmail'
import GmailConnect from '../components/GmailConnect'
import type { GmailInvoice, InvoiceCategory } from '../types'

type Filter = 'alle' | 'personlig' | 'felles' | 'ukategorisert'

function formatDate(date: { toDate: () => Date } | Date | string | null | undefined): string {
  if (!date) return '—'
  const d = typeof date === 'object' && 'toDate' in date ? date.toDate() : new Date(date as string)
  return d.toLocaleDateString('nb-NO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function CategoryToggle({ invoice, uid }: { invoice: GmailInvoice; uid: string }) {
  const [saving, setSaving] = useState(false)

  async function setCategory(cat: InvoiceCategory) {
    if (saving) return
    setSaving(true)
    await updateDoc(doc(db, 'users', uid, 'invoices', invoice.id), { category: cat })
    setSaving(false)
  }

  const btn = (label: string, val: InvoiceCategory) => {
    const active = invoice.category === val
    return (
      <button
        key={val ?? 'null'}
        onClick={() => setCategory(active ? null : val)}
        disabled={saving}
        style={{
          fontSize: 11,
          padding: '2px 8px',
          borderRadius: 5,
          border: `1px solid ${active ? (val === 'felles' ? 'rgba(124,106,247,0.6)' : 'rgba(88,166,255,0.6)') : 'var(--border)'}`,
          background: active ? (val === 'felles' ? 'rgba(124,106,247,0.15)' : 'rgba(88,166,255,0.15)') : 'transparent',
          color: active ? (val === 'felles' ? 'var(--accent)' : '#58a6ff') : 'var(--text-muted)',
          cursor: 'pointer',
          fontWeight: active ? 600 : 400,
          opacity: saving ? 0.5 : 1,
        }}
      >
        {label}
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {btn('Personlig', 'personlig')}
      {btn('Felles', 'felles')}
    </div>
  )
}

const FILTER_LABELS: { key: Filter; label: string }[] = [
  { key: 'alle', label: 'Alle' },
  { key: 'personlig', label: 'Personlig' },
  { key: 'felles', label: 'Felles' },
  { key: 'ukategorisert', label: 'Ukategorisert' },
]

function filterInvoices(invoices: GmailInvoice[], filter: Filter): GmailInvoice[] {
  if (filter === 'alle') return invoices
  if (filter === 'ukategorisert') return invoices.filter(i => !i.category)
  return invoices.filter(i => i.category === filter)
}

export default function Expenses() {
  const { user } = useAuth()
  const { connected, loading, invoices } = useGmail(user?.uid)
  const [filter, setFilter] = useState<Filter>('alle')

  const visible = filterInvoices(invoices, filter)

  const tabStyle = (active: boolean): React.CSSProperties => ({
    fontSize: 13,
    padding: '5px 14px',
    borderRadius: 7,
    border: 'none',
    background: active ? 'var(--accent-bg)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    cursor: 'pointer',
    fontWeight: active ? 600 : 400,
  })

  return (
    <div style={{ padding: '24px 16px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Utgifter</h1>
        {!loading && <GmailConnect connected={connected} />}
      </div>

      {connected && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 4, background: 'var(--code-bg)', borderRadius: 9, padding: 3 }}>
              {FILTER_LABELS.map(({ key, label }) => {
                const count = key === 'alle' ? invoices.length : filterInvoices(invoices, key).length
                return (
                  <button key={key} onClick={() => setFilter(key)} style={tabStyle(filter === key)}>
                    {label} {count > 0 && <span style={{ opacity: 0.6, fontSize: 11 }}>{count}</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {visible.length === 0 ? (
            <p style={{ color: 'var(--text)', marginTop: 24 }}>
              {filter === 'alle' ? 'Ingen fakturaer funnet ennå. Første skann kjører om en time.' : 'Ingen fakturaer i denne kategorien.'}
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Dato</th>
                  <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Leverandør</th>
                  <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Emne</th>
                  <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Forfall</th>
                  <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500, textAlign: 'right' }}>Beløp</th>
                  <th style={{ padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 500 }}>Kategori</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                      {formatDate(inv.date)}
                    </td>
                    <td style={{ padding: '10px 12px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, color: 'var(--text-h)' }}>
                      {inv.vendor || inv.from.replace(/<.*>/, '').trim()}
                    </td>
                    <td style={{ padding: '10px 12px', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span title={inv.subject}>{inv.subject}</span>
                      {inv.invoiceNumber && (
                        <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-muted)' }}>#{inv.invoiceNumber}</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                      {formatDate(inv.dueDate)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--text-h)' }}>
                      {inv.amount != null ? `${inv.amount.toLocaleString('nb-NO')} kr` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {user && <CategoryToggle invoice={inv} uid={user.uid} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}
