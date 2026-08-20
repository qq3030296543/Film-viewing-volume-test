import { getStore } from '@netlify/blobs'
import type { Config, Context } from '@netlify/functions'

const STORE_NAME = 'cine-friend-challenges-v1'
const MAX_BODY_BYTES = 96 * 1024
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1_000
const VALID_MODES = new Set([10, 20, 30])
const CHALLENGE_CODE_PATTERN = /^[A-Za-z0-9_-]{16}$/

interface StoredChallenge {
  version: 1
  challengeId: string
  createdAt: number
  mode: number
  movies: Array<{ id: string; title: string }>
  inviter: { correctMovieIds: string[] }
  [key: string]: unknown
}

const jsonResponse = (body: unknown, status = 200, cacheControl = 'no-store') => new Response(
  JSON.stringify(body),
  {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheControl,
      'x-content-type-options': 'nosniff',
    },
  },
)

const isStoredChallenge = (value: unknown): value is StoredChallenge => {
  if (!value || typeof value !== 'object') return false
  const payload = value as Partial<StoredChallenge>
  return payload.version === 1
    && typeof payload.challengeId === 'string'
    && typeof payload.createdAt === 'number'
    && VALID_MODES.has(payload.mode ?? 0)
    && Array.isArray(payload.movies)
    && payload.movies.length === payload.mode
    && payload.movies.every((movie) => movie && typeof movie.id === 'string' && typeof movie.title === 'string')
    && Boolean(payload.inviter)
    && Array.isArray(payload.inviter?.correctMovieIds)
}

const createChallengeCode = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

const challengeCodeFromPath = (request: Request) => {
  const pathname = new URL(request.url).pathname
  const match = pathname.match(/^\/api\/challenges\/([^/]+)$/)
  return match?.[1]
}

export default async (request: Request, _context: Context) => {
  const store = getStore({ name: STORE_NAME, consistency: 'strong' })

  if (request.method === 'POST') {
    const contentLength = Number(request.headers.get('content-length') ?? 0)
    if (contentLength > MAX_BODY_BYTES) return jsonResponse({ error: 'Challenge payload is too large' }, 413)

    let rawBody = ''
    try {
      rawBody = await request.text()
      if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
        return jsonResponse({ error: 'Challenge payload is too large' }, 413)
      }
    } catch {
      return jsonResponse({ error: 'Could not read challenge payload' }, 400)
    }

    let payload: unknown
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return jsonResponse({ error: 'Challenge payload is not valid JSON' }, 400)
    }
    if (!isStoredChallenge(payload)) return jsonResponse({ error: 'Invalid challenge payload' }, 400)

    const code = createChallengeCode()
    const expiresAt = Date.now() + MAX_AGE_MS
    await store.setJSON(code, payload, {
      metadata: { createdAt: payload.createdAt, expiresAt },
    })
    return jsonResponse({ code, expiresAt }, 201)
  }

  if (request.method === 'GET') {
    const code = challengeCodeFromPath(request)
    if (!code || !CHALLENGE_CODE_PATTERN.test(code)) return jsonResponse({ error: 'Invalid challenge code' }, 400)

    const stored = await store.getWithMetadata(code, { type: 'json' })
    if (!stored) return jsonResponse({ error: 'Challenge not found' }, 404)
    const expiresAt = Number(stored.metadata?.expiresAt ?? 0)
    if (!expiresAt || expiresAt <= Date.now()) {
      await store.delete(code)
      return jsonResponse({ error: 'Challenge has expired' }, 410)
    }
    if (!isStoredChallenge(stored.data)) return jsonResponse({ error: 'Challenge data is invalid' }, 500)

    return jsonResponse(stored.data, 200, 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600')
  }

  return jsonResponse({ error: 'Method not allowed' }, 405)
}

export const config: Config = {
  path: ['/api/challenges', '/api/challenges/*'],
}
