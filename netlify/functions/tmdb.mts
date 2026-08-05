import type { Config, Context } from '@netlify/functions'

const TMDB_API_BASE = 'https://api.themoviedb.org/3'
const ALLOWED_PATHS = [
  /^\/discover\/movie$/,
  /^\/movie\/\d+\/images$/,
]

const jsonError = (message: string, status: number) => new Response(
  JSON.stringify({ error: message }),
  {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  },
)

export default async (request: Request, _context: Context) => {
  if (request.method !== 'GET') return jsonError('Method not allowed', 405)

  const apiKey = Netlify.env.get('TMDB_API_KEY')
  if (!apiKey) return jsonError('TMDB service is not configured', 503)

  const incomingUrl = new URL(request.url)
  const upstreamPath = incomingUrl.pathname.replace(/^\/api\/tmdb/, '')
  if (!ALLOWED_PATHS.some((pattern) => pattern.test(upstreamPath))) {
    return jsonError('TMDB endpoint is not allowed', 404)
  }

  const upstreamUrl = new URL(`${TMDB_API_BASE}${upstreamPath}`)
  incomingUrl.searchParams.forEach((value, key) => {
    if (key !== 'api_key') upstreamUrl.searchParams.append(key, value)
  })
  upstreamUrl.searchParams.set('api_key', apiKey)

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    })
    const body = await upstreamResponse.text()

    return new Response(body, {
      status: upstreamResponse.status,
      headers: {
        'content-type': upstreamResponse.headers.get('content-type') ?? 'application/json; charset=utf-8',
        'cache-control': upstreamResponse.ok
          ? 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600'
          : 'no-store',
        'x-content-type-options': 'nosniff',
      },
    })
  } catch {
    return jsonError('TMDB upstream request failed', 502)
  }
}

export const config: Config = {
  path: '/api/tmdb/*',
}
