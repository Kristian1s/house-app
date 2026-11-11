import { useAuth } from '../hooks/useAuth'

const FUNCTIONS_BASE = 'https://europe-west1-leiteveien-d99b9.cloudfunctions.net'
const REDIRECT_URI = `${window.location.origin}/gmail-callback`

function buildAuthUrl() {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
    access_type: 'offline',
    prompt: 'consent',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

interface Props {
  connected: boolean
}

export default function GmailConnect({ connected }: Props) {
  const { user } = useAuth()

  async function handleDisconnect() {
    if (!user) return
    await fetch(`${FUNCTIONS_BASE}/disconnectGmail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: user.uid }),
    })
  }

  if (connected) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: 'green', fontSize: 14 }}>● Gmail tilkoblet</span>
        <button onClick={handleDisconnect}>Koble fra</button>
      </div>
    )
  }

  return (
    <a href={buildAuthUrl()}>
      <button>Koble til Gmail</button>
    </a>
  )
}
