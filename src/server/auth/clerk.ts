import { verifyToken } from '@clerk/backend'
import type { Context, MiddlewareHandler } from 'hono'
import { getCookie } from 'hono/cookie'

export type AuthContext = {
  userId: string
  sessionId: string | null
}

export type AppEnv = {
  Variables: {
    auth: AuthContext | null
  }
}

function getSessionToken(c: Context<AppEnv>): string | null {
  const authorization = c.req.header('authorization')
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice('Bearer '.length)
  }

  return getCookie(c, '__session') ?? null
}

function getAuthorizedParties(): string[] {
  const appUrl = process.env.APP_URL ?? 'http://localhost:5173'
  const extraParties = (process.env.CLERK_AUTHORIZED_PARTIES ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  return [appUrl, ...extraParties]
}

async function resolveAuth(c: Context<AppEnv>): Promise<AuthContext | null> {
  const token = getSessionToken(c)
  if (!token) {
    return null
  }

  const jwtKey = process.env.CLERK_JWT_KEY
  const secretKey = process.env.CLERK_SECRET_KEY

  if (!jwtKey && !secretKey) {
    throw new Error('Missing CLERK_JWT_KEY or CLERK_SECRET_KEY')
  }

  const payload = await verifyToken(token, {
    jwtKey,
    secretKey,
    authorizedParties: getAuthorizedParties(),
  })

  if (!payload.sub) {
    throw new Error('Verified Clerk token did not include a subject')
  }

  return {
    userId: payload.sub,
    sessionId: payload.sid ?? null,
  }
}

export const optionalAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  try {
    c.set('auth', await resolveAuth(c))
  } catch {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  await next()
}

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const auth = c.get('auth')

  if (!auth) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  await next()
}

export function getAuth(c: Context<AppEnv>): AuthContext | null {
  return c.get('auth')
}
