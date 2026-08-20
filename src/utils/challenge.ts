import type {
  ChallengeComparison,
  ChallengePayload,
  ChallengeSummary,
  Movie,
  QuizResult,
  QuizSession,
  TestMode,
} from '../types'

const CHALLENGE_VERSION = 1 as const
const VALID_MODES: TestMode[] = [10, 20, 30]
const CHALLENGE_API_BASE = '/api/challenges'
const SHORT_CODE_PATTERN = /^[A-Za-z0-9_-]{16}$/
const REQUEST_TIMEOUT_MS = 8_000

const bytesToBase64Url = (bytes: Uint8Array) => {
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

const base64UrlToBytes = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

const compress = async (value: string) => {
  const bytes = new TextEncoder().encode(value)
  if (typeof CompressionStream === 'undefined') return `j${bytesToBase64Url(bytes)}`
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer())
  return `g${bytesToBase64Url(compressed)}`
}

const decompress = async (value: string) => {
  const format = value.slice(0, 1)
  const bytes = base64UrlToBytes(value.slice(1))
  if (format === 'j') return new TextDecoder().decode(bytes)
  if (format !== 'g' || typeof DecompressionStream === 'undefined') throw new Error('Unsupported challenge format')
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new TextDecoder().decode(await new Response(stream).arrayBuffer())
}

const compactMovie = (movie: Movie): Movie => ({
  id: movie.id,
  title: movie.title,
  originalTitle: movie.originalTitle,
  year: movie.year,
  region: movie.region,
  genres: movie.genres,
  director: movie.director,
  imageUrl: movie.imageUrl,
  imageUrls: movie.imageUrls?.slice(0, 1),
  imageAlt: movie.imageAlt,
  accent: movie.accent,
  recognitionDistractors: movie.recognitionDistractors,
  localizedTitles: movie.localizedTitles,
  localizedDistractors: movie.localizedDistractors,
  localizedSynopses: movie.localizedSynopses
    ? Object.fromEntries(Object.entries(movie.localizedSynopses).map(([language, text]) => [language, text?.slice(0, 160)]))
    : undefined,
  synopsis: movie.synopsis.slice(0, 160),
  question: '',
  options: [],
  answer: movie.answer,
  explanation: '',
  spoiler: false,
  difficulty: movie.difficulty,
  recommendation: '',
  source: movie.source,
  tmdbId: movie.tmdbId,
  rating: movie.rating,
  textlessArtwork: movie.textlessArtwork,
})

const resultSummary = (result: QuizResult, session: QuizSession): ChallengeSummary => ({
  score: result.score,
  correctCount: result.recognizedCount,
  correctMovieIds: session.answers
    .map((answer, index) => answer.recognized ? session.movies[index]?.id : undefined)
    .filter((movieId): movieId is string => Boolean(movieId)),
  categoryScores: result.categoryScores,
})

export const createChallengePayload = (session: QuizSession, result: QuizResult): ChallengePayload => ({
  version: CHALLENGE_VERSION,
  challengeId: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  createdAt: Date.now(),
  mode: session.mode,
  category: session.category,
  playerLevel: session.playerLevel,
  movies: session.movies.map(compactMovie),
  inviter: resultSummary(result, session),
})

export const createChallengeLink = async (session: QuizSession, result: QuizResult) => {
  const payload = createChallengePayload(session, result)
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(CHALLENGE_API_BASE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`Challenge API returned ${response.status}`)
    const body = await response.json() as { code?: unknown }
    if (typeof body.code !== 'string' || !SHORT_CODE_PATTERN.test(body.code)) {
      throw new Error('Challenge API returned an invalid code')
    }
    url.searchParams.set('challenge', body.code)
    return url.toString()
  } catch {
    // Plain Vite development has no Netlify Function. Keep a fully offline fallback
    // so challenge creation still works when the short-link service is unavailable.
    const encoded = await compress(JSON.stringify(payload))
    url.hash = `challenge=${encoded}`
    return url.toString()
  } finally {
    window.clearTimeout(timeout)
  }
}

const isChallengePayload = (value: unknown): value is ChallengePayload => {
  if (!value || typeof value !== 'object') return false
  const payload = value as Partial<ChallengePayload>
  return payload.version === CHALLENGE_VERSION
    && typeof payload.challengeId === 'string'
    && typeof payload.createdAt === 'number'
    && VALID_MODES.includes(payload.mode as TestMode)
    && Array.isArray(payload.movies)
    && payload.movies.length === payload.mode
    && payload.movies.every((movie) => movie && typeof movie.id === 'string' && typeof movie.title === 'string')
    && Boolean(payload.inviter)
    && Array.isArray(payload.inviter?.correctMovieIds)
}

export const readChallengeFromLocation = async (): Promise<ChallengePayload | null> => {
  try {
    const shortCode = new URL(window.location.href).searchParams.get('challenge')
    if (shortCode && SHORT_CODE_PATTERN.test(shortCode)) {
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      try {
        const response = await fetch(`${CHALLENGE_API_BASE}/${encodeURIComponent(shortCode)}`, {
          headers: { accept: 'application/json' },
          signal: controller.signal,
        })
        if (!response.ok) return null
        const parsed = await response.json() as unknown
        return isChallengePayload(parsed) ? parsed : null
      } finally {
        window.clearTimeout(timeout)
      }
    }

    const match = window.location.hash.match(/^#challenge=(.+)$/)
    if (!match) return null
    const json = await decompress(match[1])
    const parsed = JSON.parse(json) as unknown
    return isChallengePayload(parsed) ? parsed : null
  } catch {
    return null
  }
}

export const challengeSession = (payload: ChallengePayload): QuizSession => ({
  mode: payload.mode,
  category: payload.category,
  playerLevel: payload.playerLevel,
  movies: payload.movies,
  currentIndex: 0,
  answers: [],
  currentStreak: 0,
  bestStreak: 0,
  startedAt: Date.now(),
  challenge: {
    challengeId: payload.challengeId,
    createdAt: payload.createdAt,
    inviter: payload.inviter,
  },
})

const topGenres = (scores: ChallengeSummary['categoryScores']) => [...scores]
  .filter((score) => score.total > 0)
  .sort((left, right) => right.score - left.score || right.total - left.total)
  .slice(0, 2)
  .map((score) => score.label)

export const compareChallenge = (session: QuizSession, result: QuizResult): ChallengeComparison | undefined => {
  if (!session.challenge) return undefined
  const friendCorrectIds = session.answers
    .map((answer, index) => answer.recognized ? session.movies[index]?.id : undefined)
    .filter((movieId): movieId is string => Boolean(movieId))
  const inviterCorrect = new Set(session.challenge.inviter.correctMovieIds)
  const friendCorrect = new Set(friendCorrectIds)
  const movieIds = session.movies.map((movie) => movie.id)

  return {
    inviterCorrectCount: session.challenge.inviter.correctCount,
    friendCorrectCount: result.recognizedCount,
    bothCorrectIds: movieIds.filter((movieId) => inviterCorrect.has(movieId) && friendCorrect.has(movieId)),
    inviterOnlyIds: movieIds.filter((movieId) => inviterCorrect.has(movieId) && !friendCorrect.has(movieId)),
    friendOnlyIds: movieIds.filter((movieId) => !inviterCorrect.has(movieId) && friendCorrect.has(movieId)),
    inviterTopGenres: topGenres(session.challenge.inviter.categoryScores),
    friendTopGenres: topGenres(result.categoryScores),
  }
}

export const clearChallengeHash = () => {
  const url = new URL(window.location.href)
  const hasShortChallenge = url.searchParams.has('challenge')
  const hasLegacyChallenge = url.hash.startsWith('#challenge=')
  if (!hasShortChallenge && !hasLegacyChallenge) return
  url.searchParams.delete('challenge')
  url.hash = ''
  window.history.replaceState(null, '', `${url.pathname}${url.search}`)
}
