import type { Category, Difficulty, Movie, PlayerLevel, TestMode } from '../types'

const TMDB_API_BASE = 'https://api.themoviedb.org/3'
const TMDB_PROXY_BASE = '/api/tmdb'
const PROXY_CREDENTIAL = 'netlify-proxy'
const REQUEST_TIMEOUT_MS = 5_000
const DISCOVERY_CACHE_MS = 5 * 60 * 1_000
const RECENT_MOVIES_STORAGE_KEY = 'cine-recent-tmdb-movies-v1'
const RECENT_MOVIES_LIMIT = 240
const DOCUMENTARY_GENRE_ID = 99
const MUSIC_GENRE_ID = 10402
const TV_MOVIE_GENRE_ID = 10770
const NARRATIVE_GENRE_IDS = new Set([12, 14, 16, 18, 27, 28, 35, 36, 37, 53, 80, 878, 9648, 10749, 10751, 10752])
const NON_FEATURE_PATTERN = /演唱会|巡回演出|音乐现场|现场实录|演出实录|音乐会|粉丝见面会|concert|world tour|stadium tour|live at|live in|on stage|the tour/i

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

const levelProfiles: Record<PlayerLevel, {
  sortBy: string
  minVotes: number
  maxVotes?: number
  minRating: number
  maxPopularity?: number
  maxPage: number
}> = {
  入门菜鸟: { sortBy: 'popularity.desc', minVotes: 2_500, minRating: 5.5, maxPage: 20 },
  略知一二: { sortBy: 'vote_average.desc', minVotes: 500, maxVotes: 8_000, minRating: 6.1, maxPopularity: 180, maxPage: 30 },
  // 困难模式靠相似干扰项制造难度，不靠低分、极冷门或非院线内容为难用户。
  阅片无数: { sortBy: 'vote_average.desc', minVotes: 300, minRating: 6.5, maxPage: 36 },
}

function discoverParams(
  category: Category,
  page: number,
  playerLevel: PlayerLevel,
  languageOverride?: 'ja' | 'ko',
): Record<string, string | number | boolean> {
  const profile = levelProfiles[playerLevel]
  const common: Record<string, string | number | boolean> = {
    language: 'zh-CN',
    include_adult: false,
    include_video: false,
    page,
    sort_by: category === '文艺经典' ? 'vote_average.desc' : profile.sortBy,
    'vote_count.gte': category === '文艺经典' ? Math.min(profile.minVotes, 400) : profile.minVotes,
    'vote_average.gte': profile.minRating,
    without_genres: `${DOCUMENTARY_GENRE_ID},${TV_MOVIE_GENRE_ID}`,
  }
  if (playerLevel === '阅片无数') {
    common['primary_release_date.lte'] = `${new Date().getFullYear() - 1}-12-31`
  }
  if (profile.maxVotes) common['vote_count.lte'] = profile.maxVotes
  if (profile.maxPopularity) common['popularity.lte'] = profile.maxPopularity
  if (category === '华语电影') {
    common.with_original_language = 'zh'
    if (playerLevel === '阅片无数') common['vote_count.gte'] = 200
  }
  if (category === '欧美电影') common.with_original_language = 'en'
  if (category === '日韩电影') common.with_original_language = languageOverride ?? (page % 2 ? 'ja' : 'ko')
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

function isFeatureFilm(movie: TmdbListMovie) {
  const genres = new Set(movie.genre_ids ?? [])
  if (genres.has(DOCUMENTARY_GENRE_ID) || genres.has(TV_MOVIE_GENRE_ID)) return false

  // 音乐剧情片仍然保留；只有音乐类型且缺少叙事类型，或明确标注现场演出的内容才排除。
  if (genres.has(MUSIC_GENRE_ID)) {
    const hasNarrativeGenre = [...genres].some((genre) => NARRATIVE_GENRE_IDS.has(genre))
    const searchableText = `${movie.title} ${movie.original_title} ${movie.overview ?? ''}`
    if (!hasNarrativeGenre || NON_FEATURE_PATTERN.test(searchableText)) return false
  }

  return Boolean(movie.release_date && movie.title && (movie.poster_path || movie.backdrop_path))
}

function featureQualityScore(movie: TmdbListMovie) {
  const rating = movie.vote_average ?? 0
  const votes = movie.vote_count ?? 0
  const releaseYear = Number(movie.release_date?.slice(0, 4)) || new Date().getFullYear()
  const voteConfidence = votes / (votes + 1_500)
  const weightedRating = voteConfidence * rating + (1 - voteConfidence) * 6.8
  const establishedBonus = releaseYear <= 2005 ? 10 : releaseYear <= 2015 ? 7 : releaseYear <= 2022 ? 3 : 0
  const imageBonus = movie.poster_path && movie.backdrop_path ? 4 : 0
  return weightedRating * 30 + Math.min(90, Math.log10(votes + 1) * 20) + establishedBonus + imageBonus
}

function randomPages(maxPage: number, count: number, startAt = 2) {
  if (maxPage < startAt || count <= 0) return []
  return shuffle(Array.from({ length: maxPage - startAt + 1 }, (_, index) => index + startAt)).slice(0, count)
}

function readRecentMovieIds() {
  try {
    const stored = localStorage.getItem(RECENT_MOVIES_STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored) as unknown
    return Array.isArray(parsed) ? parsed.filter((id): id is number => Number.isInteger(id)) : []
  } catch {
    return []
  }
}

function prioritizeUnseenMovies(movies: TmdbListMovie[]) {
  const recentIds = readRecentMovieIds()
  if (!recentIds.length) return shuffle(movies)

  const recentPosition = new Map(recentIds.map((id, index) => [id, index]))
  const unseen = shuffle(movies.filter((movie) => !recentPosition.has(movie.id)))
  const previouslySeen = movies
    .filter((movie) => recentPosition.has(movie.id))
    .sort((left, right) => (recentPosition.get(left.id) ?? 0) - (recentPosition.get(right.id) ?? 0))
  return [...unseen, ...previouslySeen]
}

function rememberQuizMovies(movies: Movie[]) {
  const selectedIds = movies.flatMap((movie) => movie.tmdbId ? [movie.tmdbId] : [])
  if (!selectedIds.length) return
  try {
    const selectedSet = new Set(selectedIds)
    const history = readRecentMovieIds().filter((id) => !selectedSet.has(id))
    localStorage.setItem(
      RECENT_MOVIES_STORAGE_KEY,
      JSON.stringify([...history, ...selectedIds].slice(-RECENT_MOVIES_LIMIT)),
    )
  } catch {
    // 隐私模式或存储空间不足时，仍然可以正常实时抽题。
  }
}

function regionFromLanguage(language?: string): Movie['region'] {
  if (language === 'zh') return '华语'
  if (language === 'ja' || language === 'ko') return '日韩'
  return '欧美'
}

function difficultyFromVotes(votes: number): Difficulty {
  if (votes >= 6_000) return '入门'
  if (votes >= 900) return '进阶'
  return '资深'
}

const imageUrl = (path: string, size: 'w342' | 'w500' | 'w780' | 'original') =>
  `https://image.tmdb.org/t/p/${size}${path}`

const genreOverlap = (left: TmdbListMovie, right: TmdbListMovie) => {
  const rightGenres = new Set(right.genre_ids ?? [])
  return (left.genre_ids ?? []).filter((genre) => rightGenres.has(genre)).length
}

function distractorScore(target: TmdbListMovie, candidate: TmdbListMovie, playerLevel: PlayerLevel) {
  const targetYear = Number(target.release_date?.slice(0, 4)) || 2000
  const candidateYear = Number(candidate.release_date?.slice(0, 4)) || 2000
  const yearDistance = Math.abs(targetYear - candidateYear)
  const voteDistance = Math.abs(Math.log10((target.vote_count ?? 0) + 10) - Math.log10((candidate.vote_count ?? 0) + 10))
  const popularityDistance = Math.abs(Math.log10((target.popularity ?? 0) + 2) - Math.log10((candidate.popularity ?? 0) + 2))
  const titleLengthDistance = Math.abs(target.title.length - candidate.title.length)
  const sameLanguage = target.original_language === candidate.original_language
  const weights = playerLevel === '阅片无数'
    ? { genre: 135, language: 125, year: 3.2, votes: 38, popularity: 26, title: 2.6 }
    : playerLevel === '略知一二'
      ? { genre: 108, language: 100, year: 2.6, votes: 31, popularity: 21, title: 2.2 }
      : { genre: 76, language: 68, year: 1.8, votes: 20, popularity: 13, title: 1.5 }

  return genreOverlap(target, candidate) * weights.genre
    + (sameLanguage ? weights.language : 0)
    + Math.max(0, 52 - yearDistance * weights.year)
    + Math.max(0, 40 - voteDistance * weights.votes)
    + Math.max(0, 28 - popularityDistance * weights.popularity)
    + Math.max(0, 15 - titleLengthDistance * weights.title)
}

function selectDistractors(item: TmdbListMovie, all: TmdbListMovie[], playerLevel: PlayerLevel) {
  const uniqueCandidates = [...new Map(
    shuffle(all)
      .filter((movie) => movie.id !== item.id && movie.title && movie.title !== item.title)
      .map((movie) => [movie.title, movie]),
  ).values()]
  return uniqueCandidates
    .sort((left, right) => distractorScore(item, right, playerLevel) - distractorScore(item, left, playerLevel))
    .slice(0, 3)
    .map((movie) => movie.title)
}

function makeQuizMovie(
  item: TmdbListMovie,
  all: TmdbListMovie[],
  index: number,
  playerLevel: PlayerLevel,
): Movie | null {
  const primaryPath = item.backdrop_path ?? item.poster_path
  if (!primaryPath || !item.title) return null

  const distractors = selectDistractors(item, all, playerLevel)
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
    recommendation: `TMDB ${rating.toFixed(1)} 分 · ${votes.toLocaleString('zh-CN')} 人评分 · ${playerLevel}片单。`,
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

async function discoverQuizMovies(
  mode: TestMode,
  category: Category,
  playerLevel: PlayerLevel,
  credential: string,
) {
  const pageCount = mode === 10 ? 4 : mode === 20 ? 6 : 8
  const cacheKey = `${category}:${playerLevel}:${pageCount}`
  const cached = discoveryCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.movies

  const profile = levelProfiles[playerLevel]
  let responses: DiscoverResponse[]
  if (category === '日韩电影') {
    const [japaneseSeed, koreanSeed] = await Promise.all([
      tmdbRequest<DiscoverResponse>('/discover/movie', credential, discoverParams(category, 1, playerLevel, 'ja')),
      tmdbRequest<DiscoverResponse>('/discover/movie', credential, discoverParams(category, 1, playerLevel, 'ko')),
    ])
    const remainingCount = Math.max(0, pageCount - 2)
    const japanesePages = randomPages(Math.min(japaneseSeed.total_pages, profile.maxPage), Math.ceil(remainingCount / 2))
    const koreanPages = randomPages(Math.min(koreanSeed.total_pages, profile.maxPage), Math.floor(remainingCount / 2))
    const extraResponses = await Promise.all([
      ...japanesePages.map((page) => tmdbRequest<DiscoverResponse>('/discover/movie', credential, discoverParams(category, page, playerLevel, 'ja'))),
      ...koreanPages.map((page) => tmdbRequest<DiscoverResponse>('/discover/movie', credential, discoverParams(category, page, playerLevel, 'ko'))),
    ])
    responses = [japaneseSeed, koreanSeed, ...extraResponses]
  } else {
    const seed = await tmdbRequest<DiscoverResponse>('/discover/movie', credential, discoverParams(category, 1, playerLevel))
    const extraPages = randomPages(Math.min(seed.total_pages, profile.maxPage), pageCount - 1)
    const extraResponses = await Promise.all(extraPages.map((page) => tmdbRequest<DiscoverResponse>(
      '/discover/movie',
      credential,
      discoverParams(category, page, playerLevel),
    )))
    responses = [seed, ...extraResponses]
  }
  const unique = [...new Map(
    responses.flatMap((response) => response.results)
      .filter(isFeatureFilm)
      .map((movie) => [movie.id, movie]),
  ).values()]
  const qualityPool = playerLevel === '阅片无数'
    ? unique
        .sort((left, right) => featureQualityScore(right) - featureQualityScore(left))
        .slice(0, Math.max(mode * 5, 100))
    : unique
  discoveryCache.set(cacheKey, { expiresAt: Date.now() + DISCOVERY_CACHE_MS, movies: qualityPool })
  return qualityPool
}

export async function createTmdbQuiz(
  mode: TestMode,
  category: Category,
  playerLevel: PlayerLevel,
  credential: string,
): Promise<Movie[]> {
  const discovered = await discoverQuizMovies(mode, category, playerLevel, credential)
  const prioritized = prioritizeUnseenMovies(discovered)
  const quiz = [...new Map(
    prioritized
      .map((item, index) => makeQuizMovie(item, discovered, index, playerLevel))
      .filter((movie): movie is Movie => Boolean(movie))
      .map((movie) => [movie.title, movie]),
  ).values()].slice(0, mode)

  if (quiz.length < mode) throw new Error(`TMDB 返回的可用电影不足：需要 ${mode} 部，得到 ${quiz.length} 部。`)
  rememberQuizMovies(quiz)

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
