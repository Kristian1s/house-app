import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/expenses', label: 'Utgifter' },
  { to: '/renovation', label: 'Renovering' },
  { to: '/power', label: 'Strøm' },
  { to: '/inventory', label: 'Inventar' },
]

export default function Layout() {
  const { logout } = useAuth()

  return (
    <div>
      <nav>
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}>
            {item.label}
          </NavLink>
        ))}
        <button onClick={logout}>Logg ut</button>
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
