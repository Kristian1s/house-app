import { useAuth } from '../hooks/useAuth'
import { useGmail } from '../hooks/useGmail'
import GmailConnect from '../components/GmailConnect'

function formatDate(date: { toDate: () => Date } | Date | string): string {
  const d = typeof date === 'object' && 'toDate' in date ? date.toDate() : new Date(date as string)
  return d.toLocaleDateString('nb-NO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Expenses() {
  const { user } = useAuth()
  const { connected, loading, invoices } = useGmail(user?.uid)

  return (
    <div style={{ padding: '24px 16px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Utgifter</h1>
        {!loading && <GmailConnect connected={connected} />}
      </div>

      {connected && (
        <>
          <h2>Fakturaer fra Gmail</h2>
          {invoices.length === 0 ? (
            <p style={{ color: 'var(--text)' }}>Ingen fakturaer funnet ennå. Første skann kjører om en time.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '8px 12px' }}>Dato</th>
                  <th style={{ padding: '8px 12px' }}>Fra</th>
                  <th style={{ padding: '8px 12px' }}>Emne</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Beløp</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{formatDate(inv.date)}</td>
                    <td style={{ padding: '8px 12px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.from}</td>
                    <td style={{ padding: '8px 12px' }}>{inv.subject}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {inv.amount != null ? `${inv.amount.toLocaleString('nb-NO')} kr` : '—'}
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
