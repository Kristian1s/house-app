import { useAuth } from '../hooks/useAuth'
import { useHouseExpenses } from '../hooks/useHouseExpenses'
import { useRenovationExpenses } from '../hooks/useRenovationExpenses'
import { nameFromUser, HOUSE_CATEGORIES } from '../types'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'

const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const GRID = isDark ? '#2e303a' : '#e5e4e7'
const MUTED = isDark ? '#6b7280' : '#9ca3af'
const SURFACE = isDark ? '#16171d' : '#ffffff'
const TEXT = isDark ? '#f3f4f6' : '#08060d'

const C_KRISTIAN = '#8b5cf6'
const C_KRISTINE = '#06b6d4'
const C_HOUSE = '#8b5cf6'
const C_RENO = '#f59e0b'

function fmt(n: number) {
  if (n >= 1000) return (n / 1000).toLocaleString('nb-NO', { maximumFractionDigits: 1 }) + 'k'
  return n.toLocaleString('nb-NO', { maximumFractionDigits: 0 })
}

function fmtFull(n: number) {
  return n.toLocaleString('nb-NO', { maximumFractionDigits: 0 }) + ' kr'
}

function getLast12Months() {
  const now = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('nb-NO', { month: 'short' }).replace('.', ''),
    }
  })
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: SURFACE, border: `1px solid ${GRID}`, borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
      <div style={{ fontWeight: 600, color: TEXT, marginBottom: 6 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: {fmtFull(p.value)}
        </div>
      ))}
    </div>
  )
}

export default function Insights() {
  const { user } = useAuth()
  const { expenses, loading: loadingHouse } = useHouseExpenses(user?.uid ?? null)
  const { expenses: renoExpenses, loading: loadingReno } = useRenovationExpenses()

  if (!user) return null
  if (loadingHouse || loadingReno) {
    return <div className="page"><p style={{ color: MUTED, fontSize: 13 }}>Laster…</p></div>
  }

  const currentUserName = nameFromUser(user)
  const otherName = currentUserName === 'Kristian' ? 'Kristine' : 'Kristian'
  const months = getLast12Months()
  const allExpenses = [...expenses, ...renoExpenses]

  // ── Monthly trend data (12 months, stacked house + reno) ──
  const trendData = months.map(({ key, label }) => {
    const house = expenses.filter(e => e.date.startsWith(key)).reduce((s, e) => s + e.amount, 0)
    const reno = renoExpenses.filter(e => e.date.startsWith(key)).reduce((s, e) => s + e.amount, 0)
    return { label, house, reno, total: house + reno }
  })

  const nonZeroMonths = trendData.filter(d => d.total > 0)
  const avg = nonZeroMonths.length > 0
    ? Math.round(nonZeroMonths.reduce((s, d) => s + d.total, 0) / nonZeroMonths.length)
    : 0

  // ── Per-person data (last 6 months) ──
  const last6 = months.slice(6)
  const personData = last6.map(({ key, label }) => {
    const mine = allExpenses.filter(e => e.date.startsWith(key) && e.paidBy === currentUserName).reduce((s, e) => s + e.amount, 0)
    const theirs = allExpenses.filter(e => e.date.startsWith(key) && e.paidBy !== currentUserName).reduce((s, e) => s + e.amount, 0)
    return { label, [currentUserName]: mine, [otherName]: theirs }
  })

  // ── Category breakdown (this year) ──
  const thisYear = new Date().getFullYear().toString()
  const yearExpenses = expenses.filter(e => e.date.startsWith(thisYear))
  const catTotals = HOUSE_CATEGORIES.map(cat => ({
    cat,
    amount: yearExpenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount)
  const catMax = catTotals[0]?.amount ?? 1

  // ── Summary stats ──
  const thisYearAll = allExpenses.filter(e => e.date.startsWith(thisYear)).reduce((s, e) => s + e.amount, 0)
  const highestMonth = trendData.reduce((best, d) => d.total > best.total ? d : best, trendData[0])

  return (
    <div className="page">
      <h1 style={{ marginBottom: 20 }}>Innsikt</h1>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Snitt per måned', value: fmtFull(avg) },
          { label: `Totalt ${thisYear}`, value: fmtFull(thisYearAll) },
          { label: 'Høyeste måned', value: highestMonth?.total > 0 ? `${highestMonth.label} · ${fmtFull(highestMonth.total)}` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: TEXT }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Monthly trend */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 16 }}>
          Månedlig trend — siste 12 måneder
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={trendData} barSize={18} barGap={2}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: GRID, radius: 4 }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            {avg > 0 && <ReferenceLine y={avg} stroke={MUTED} strokeDasharray="4 3" label={{ value: 'snitt', position: 'insideTopRight', fontSize: 10, fill: MUTED }} />}
            <Bar dataKey="house" name="Utgifter" stackId="a" fill={C_HOUSE} radius={[0, 0, 0, 0]} />
            <Bar dataKey="reno" name="Renovering" stackId="a" fill={C_RENO} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Per person */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 16 }}>
          Fordeling mellom dere — siste 6 måneder
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={personData} barSize={16} barGap={4} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmt} tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: GRID, radius: 4 }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            <Bar dataKey={currentUserName} fill={C_KRISTIAN} radius={[4, 4, 0, 0]} />
            <Bar dataKey={otherName} fill={C_KRISTINE} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category breakdown */}
      {catTotals.length > 0 && (
        <div className="card">
          <div style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 16 }}>
            Hva pengene går til — {thisYear}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {catTotals.map(({ cat, amount }) => (
              <div key={cat}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: TEXT }}>{cat}</span>
                  <span style={{ fontWeight: 600, color: TEXT }}>{fmtFull(amount)}</span>
                </div>
                <div style={{ height: 6, background: GRID, borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${(amount / catMax) * 100}%`, background: C_HOUSE, borderRadius: 3, transition: 'width 0.4s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
