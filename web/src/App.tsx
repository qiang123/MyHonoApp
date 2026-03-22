import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
  useAuth,
  useUser,
} from '@clerk/clerk-react'
import { useState } from 'react'

const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

type MeResponse = {
  userId: string
  sessionId: string | null
}

export default function App() {
  const { getToken } = useAuth()
  const { user, isLoaded } = useUser()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function loadProfile() {
    setLoading(true)
    setError(null)

    try {
      const token = await getToken()
      if (!token) {
        throw new Error('No session token is available')
      }

      const response = await fetch(`${apiBaseUrl}/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const payload = (await response.json()) as MeResponse
      setMe(payload)
    } catch (cause) {
      setMe(null)
      setError(cause instanceof Error ? cause.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="layout">
      <section className="hero">
        <p className="eyebrow">Clerk + Hono</p>
        <h1>Minimal auth slice for this repository.</h1>
        <p className="lede">
          The frontend signs users in with Clerk. The Hono backend verifies the
          session token and exposes a protected <code>/me</code> endpoint.
        </p>
      </section>

      <SignedOut>
        <section className="panel">
          <h2>Authentication</h2>
          <p>Sign in or create an account to fetch your protected profile.</p>
          <div className="actions">
            <SignInButton mode="modal">
              <button className="button button-primary">Sign in</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="button button-secondary">Create account</button>
            </SignUpButton>
          </div>
        </section>
      </SignedOut>

      <SignedIn>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Session</h2>
              <p>
                {isLoaded && user
                  ? `Signed in as ${user.primaryEmailAddress?.emailAddress ?? user.id}`
                  : 'Loading user'}
              </p>
            </div>
            <UserButton />
          </div>

          <div className="actions">
            <button
              className="button button-primary"
              disabled={loading}
              onClick={() => {
                void loadProfile()
              }}
            >
              {loading ? 'Loading…' : 'Fetch /me'}
            </button>
          </div>

          <div className="result-grid">
            <article className="result-card">
              <h3>Client user</h3>
              <pre>{JSON.stringify(user, null, 2)}</pre>
            </article>
            <article className="result-card">
              <h3>Backend response</h3>
              <pre>{JSON.stringify(me ?? { error }, null, 2)}</pre>
            </article>
          </div>
        </section>
      </SignedIn>
    </main>
  )
}
