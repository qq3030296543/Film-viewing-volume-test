import type { Category, Difficulty, Movie, TestMode } from '../types'

const TMDB_API_BASE = 'https://api.themoviedb.org/3'
const TMDB_PROXY_BASE = '/api/tmdb'
const PROXY_CREDENTIAL = 'netlify-proxy'
const REQUEST_TIMEOUT_MS = 5_000
const DISCOVERY_CACHE_MS = 5 * 60 * 1_000

interface TmdbListMovie {
  id: number
  title: string
  original_title: string
  release_date?: string
  poster_path?: string | null
  backdrop_path?: string | null
  overview?: string
  original_language?: string
  genre_ids?: number[]
  vote_average?: number
  vote_count?: number
  popularity?: number
}

interface DiscoverResponse {
  page: number
  total_pages: number
  total_results: number
  results: TmdbListMovie[]
}

interface TmdbImage {
  file_path: string
  width?: number
  height?: number
  vote_average?: number
  vote_count?: number
  iso_639_1?: string | null
}

interface MovieImagesResponse {
  posters?: TmdbImage[]
}

export interface HomePosterItem {
  id: string
  imageUrls: string[]
}

const genreById: Record<number, string> = {
  12: '冒险', 14: '奇幻', 16: '动画', 18: '剧情', 27: '恐怖', 28: '动作',
  35: '喜剧', 36: '历史', 53: '惊悚', 80: '犯罪', 99: '纪录片',
  878: '科幻', 9648: '悬疑', 10402: '音乐', 10749: '爱情', 10751: '家庭',
}

const discoveryCache = new Map<string, { expiresAt: number; movies: TmdbListMovie[] }>()
const textlessPosterCache = new Map<number, string[]>()

export const readTmdbCredential = () => {
  const envKey = import.meta.env.VITE_TMDB_API_KEY?.trim()
  const envToken = import.meta.env.VITE_TMDB_READ_TOKEN?.trim()
  if (import.meta.env.DEV) return envKey || envToken || PROXY_CREDENTIAL
  return PROXY_CREDENTIAL
}

const isReadToken = (credential: string) => credential.startsWith('eyJ') || credential.length > 80

async function tmdbRequest<T>(
  path: string,
  credential: string,
  params: Record<string, string | number | boolean | undefined> = {},
): Promise<T> {
  if (!credential) throw new Error('尚未配置 TMDB API 凭证')

  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => value !== undefined && search.set(key, String(value)))
  const headers: HeadersInit = { accept: 'application/json' }
  const usesProxy = credential === PROXY_CREDENTIAL
  if (!usesProxy) {
    if (isReadToken(credential)) headers.Authorization = `Bearer ${credential}`
    else search.set('api_key', credential)
  }

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const apiBase = usesProxy ? TMDB_PROXY_BASE : TMDB_API_BASE
    const response = await fetch(`${apiBase}${path}?${search}`, { headers, signal: controller.signal })
    if (response.status === 401) throw new Error('TMDB 凭证无效')
    if (response.status === 429) throw new Error('TMDB 请求过于频繁')
    if (!response.ok) throw new Error(`TMDB 暂时不可用（HTTP ${response.status}）`)
    return response.json() as Promise<T>
  } finally {
    window.clearTimeout(timeout)
  }
}

const shuffle = <T,>(items: readonly T[]) => {
  const output = [...items]
  for (let index = output.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[output[index], output[target]] = [output[target], output[index]]
  }
  return output
}

function discoverParams(category: Category, page: number): Record<string, string | number | boolean> {
  const common: Record<string, string | number | boolean> = {
    language: 'zh-CN',
    include_adult: false,
    include_video: false,
    page,
    sort_by: category === '文艺经典' ? 'vote_average.desc' : 'popularity.desc',
    'vote_count.gte': category === '文艺经典' ? 500 : 800,
  }
  if (category === '华语电影') common.with_original_language = 'zh'
  if (category === '欧美电影') common.with_original_language = 'en'
  if (category === '日韩电影') common.with_original_language = page % 2 ? 'ja' : 'ko'
  if (category === '动画电影') common.with_genres = 16
  if (category === '科幻') common.with_genres = 878
  if (category === '悬疑') common.with_genres = 9648
  if (category === '恐怖') common.with_genres = 27
  if (category === '喜剧') common.with_genres = 35
  if (category === '文艺经典') {
    common.with_genres = 18
    common['primary_release_date.lte'] = '2005-12-31'
  }
  return common
}

function regionFromLanguage(language?: string): Movie['region'] {
  if (language === 'zh') return '华语'
  if (language === 'ja' || language === 'ko') return '日韩'
  return '欧美'
}

function difficultyFromVotes(votes: number): Difficulty {
  if (votes >= 12_000) return '入门'
  if (votes >= 3_000) return '进阶'
  return '资深'
}

const imageUrl = (path: string, size: 'w342' | 'w500' | 'w780' | 'original') =>
  `https://image.tmdb.org/t/p/${size}${path}`

function makeQuizMovie(item: TmdbListMovie, all: TmdbListMovie[], index: number): Movie | null {
  const primaryPath = item.backdrop_path ?? item.poster_path
  if (!primaryPath || !item.title) return null

  const distractors = shuffle(all)
    .filter((movie) => movie.id !== item.id && movie.title && movie.title !== item.title)
    .map((movie) => movie.title)
    .slice(0, 3)
  if (distractors.length < 3) return null

  // 识别题优先使用横版剧照。TMDB 的主海报经常自带片名，剧照更适合无提示识别。
  const backdropUrls = item.backdrop_path
    ? [imageUrl(item.backdrop_path, 'w780'), imageUrl(item.backdrop_path, 'w500'), imageUrl(item.backdrop_path, 'original')]
    : []
  const posterUrls = item.poster_path
    ? [imageUrl(item.poster_path, 'w500'), imageUrl(item.poster_path, 'w342'), imageUrl(item.poster_path, 'w780'), imageUrl(item.poster_path, 'original')]
    : []
  const artworkUrls = [...backdropUrls, ...posterUrls]
  const rating = item.vote_average ?? 0
  const votes = item.vote_count ?? 0
  const genres = (item.genre_ids ?? []).map((id) => genreById[id]).filter(Boolean).slice(0, 4)
  const year = Number(item.release_date?.slice(0, 4)) || new Date().getFullYear()

  return {
    id: `tmdb-${item.id}`,
    title: item.title,
    originalTitle: item.original_title || item.title,
    year,
    region: regionFromLanguage(item.original_language),
    genres: genres.length ? genres : ['剧情'],
    director: 'TMDB 实时资料',
    imageUrl: artworkUrls[0] ?? imageUrl(primaryPath, 'w500'),
    imageUrls: [...new Set(artworkUrls)],
    imageAlt: 'TMDB 实时电影画面',
    accent: index % 3 === 0 ? ['#263c4a', '#c48a54'] : index % 3 === 1 ? ['#552c32', '#d3aa66'] : ['#2f4639', '#b8a56d'],
    recognitionDistractors: distractors,
    synopsis: item.overview?.trim() || '这部电影的中文简介尚未补全，详细资料以 TMDB 最新记录为准。',
    question: '',
    options: [],
    answer: item.title,
    explanation: '资料于测试开始时从 TMDB 实时同步。',
    spoiler: false,
    difficulty: difficultyFromVotes(votes),
    recommendation: `TMDB ${rating.toFixed(1)} 分 · ${votes.toLocaleString('zh-CN')} 人评分。`,
    source: 'tmdb',
    tmdbId: item.id,
    tmdbUrl: `https://www.themoviedb.org/movie/${item.id}`,
    rating,
    voteCount: votes,
    lastSyncedAt: Date.now(),
    textlessArtwork: false,
  }
}

function readTextlessPosterCache(tmdbId: number) {
  const memoryValue = textlessPosterCache.get(tmdbId)
  if (memoryValue?.length) return memoryValue
  try {
    const value = sessionStorage.getItem(`cine-textless-poster-${tmdbId}`)
    if (!value) return null
    const urls = JSON.parse(value) as string[]
    if (!Array.isArray(urls) || !urls.length) return null
    textlessPosterCache.set(tmdbId, urls)
    return urls
  } catch {
    return null
  }
}

export async function hydrateTmdbMovieArtwork(movie: Movie, credential: string): Promise<Movie> {
  if (movie.source !== 'tmdb' || !movie.tmdbId || movie.textlessArtwork) return movie

  let urls = readTextlessPosterCache(movie.tmdbId)
  if (!urls) {
    const response = await tmdbRequest<MovieImagesResponse>(`/movie/${movie.tmdbId}/images`, credential, {
      include_image_language: 'null',
    })
    const textlessPosters = (response.posters ?? [])
      .filter((image) => image.iso_639_1 == null && image.file_path && (image.height ?? 0) > (image.width ?? 0))
      .sort((left, right) => {
        const voteDifference = (right.vote_average ?? 0) - (left.vote_average ?? 0)
        return voteDifference || (right.vote_count ?? 0) - (left.vote_count ?? 0)
      })
      .slice(0, 6)

    urls = textlessPosters.flatMap((poster) => [
      imageUrl(poster.file_path, 'w500'),
      imageUrl(poster.file_path, 'w780'),
      imageUrl(poster.file_path, 'original'),
    ])
    if (!urls.length) return movie
    textlessPosterCache.set(movie.tmdbId, urls)
    try {
      sessionStorage.setItem(`cine-textless-poster-${movie.tmdbId}`, JSON.stringify(urls))
    } catch {
      // 浏览器禁止存储时仍可使用当前请求结果。
    }
  }

  return {
    ...movie,
    imageUrl: urls[0],
    imageUrls: [...new Set([...urls, ...(movie.imageUrls ?? [])])],
    imageAlt: '不含片名的完整电影海报',
    textlessArtwork: true,
  }
}

async function discoverQuizMovies(mode: TestMode, category: Category, credential: string) {
  const pageCount = category === '日韩电影' ? 2 : mode === 10 ? 1 : 2
  const cacheKey = `${category}:${pageCount}`
  const cached = discoveryCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return shuffle(cached.movies)

  const pages = category === '日韩电影' ? [1, 2] : shuffle([1, 2, 3, 4, 5]).slice(0, pageCount)
  const responses = await Promise.all(
    pages.map((page) => tmdbRequest<DiscoverResponse>('/discover/movie', credential, discoverParams(category, page))),
  )
  const unique = [...new Map(
    responses.flatMap((response) => response.results)
      .filter((movie) => movie.title && (movie.poster_path || movie.backdrop_path))
      .map((movie) => [movie.id, movie]),
  ).values()]
  discoveryCache.set(cacheKey, { expiresAt: Date.now() + DISCOVERY_CACHE_MS, movies: unique })
  return shuffle(unique)
}

export async function createTmdbQuiz(mode: TestMode, category: Category, credential: string): Promise<Movie[]> {
  const discovered = await discoverQuizMovies(mode, category, credential)
  const quiz = discovered
    .map((item, index) => makeQuizMovie(item, discovered, index))
    .filter((movie): movie is Movie => Boolean(movie))
    .slice(0, mode)

  if (quiz.length < mode) throw new Error(`TMDB 返回的可用电影不足：需要 ${mode} 部，得到 ${quiz.length} 部。`)

  // 只阻塞等待第一题的无字海报；其余题目由 App 在用户答题时后台预取。
  try {
    quiz[0] = await hydrateTmdbMovieArtwork(quiz[0], credential)
  } catch {
    // 图片接口不可用时仍可使用发现接口返回的完整横版剧照。
  }
  return quiz
}

const homeImageVariants = (path?: string | null) => path
  ? ['w342', 'w500', 'w780'].map((size) => `https://image.tmdb.org/t/p/${size}${path}`)
  : []

export async function createTmdbHomePosterPool(count: number, credential: string): Promise<HomePosterItem[]> {
  const pages = shuffle(Array.from({ length: 14 }, (_, index) => index + 1)).slice(0, 2)
  const responses = await Promise.all(pages.map((page) => tmdbRequest<DiscoverResponse>('/discover/movie', credential, {
    language: 'zh-CN',
    include_adult: false,
    include_video: false,
    page,
    sort_by: 'popularity.desc',
    'vote_count.gte': 300,
  })))

  const unique = [...new Map(
    responses.flatMap((response) => response.results)
      .filter((movie) => movie.poster_path || movie.backdrop_path)
      .map((movie) => [movie.id, movie]),
  ).values()]

  return shuffle(unique).slice(0, count).map((movie) => ({
    id: `tmdb-home-${movie.id}`,
    imageUrls: [...new Set([
      ...homeImageVariants(movie.poster_path),
      ...homeImageVariants(movie.backdrop_path),
    ])],
  }))
}
