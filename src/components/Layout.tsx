import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/expenses', label: 'Utgifter' },
  { to: '/renovation', label: 'Renovering' },
  { to: '/inventory', label: 'Inventar' },
  { to: '/insights', label: 'Innsikt' },
]

export default function Layout() {
  const { logout } = useAuth()

  return (
    <div>
      <nav className="app-nav">
        <span className="brand">Leiteveien</span>
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}>
            {item.label}
          </NavLink>
        ))}
        <div className="nav-spacer" />
        <button className="btn-logout" onClick={logout}>Logg ut</button>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
