import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { useAuth } from './hooks/useAuth'
import Dashboard from './pages/Dashboard'
import Expenses from './pages/Expenses'
import GmailCallback from './pages/GmailCallback'
import Inventory from './pages/Inventory'
import Login from './pages/Login'
import Power from './pages/Power'
import Renovation from './pages/Renovation'

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100svh' }}>
      <span style={{ color: 'var(--text)' }}>Laster...</span>
    </div>
  )
}

function ProtectedRoutes() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return <Layout />
}

function LoginGuard() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/" replace />
  return <Login />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginGuard />} />
        <Route path="/gmail-callback" element={<GmailCallback />} />
        <Route element={<ProtectedRoutes />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/renovation" element={<Renovation />} />
          <Route path="/power" element={<Power />} />
          <Route path="/inventory" element={<Inventory />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
