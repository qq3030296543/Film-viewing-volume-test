import type { Category, Difficulty, Movie, TestMode } from '../types'

const API_BASE = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w780'
const CREDENTIAL_KEY = 'cine-memory-tmdb-credential-v1'

interface TmdbListMovie {
  id: number
  title: string
  original_title: string
  release_date?: string
  poster_path?: string | null
  backdrop_path?: string | null
  overview?: string
  original_language?: string
  vote_average?: number
  vote_count?: number
  popularity?: number
}

interface TmdbPerson { id: number; name: string; job?: string; character?: string; order?: number }
interface TmdbGenre { id: number; name: string }
interface TmdbTranslation { iso_639_1: string; iso_3166_1: string; data?: { title?: string; overview?: string } }

interface TmdbMovieDetail extends TmdbListMovie {
  runtime?: number
  genres?: TmdbGenre[]
  production_countries?: { iso_3166_1: string; name: string }[]
  credits?: { cast?: TmdbPerson[]; crew?: TmdbPerson[] }
  translations?: { translations?: TmdbTranslation[] }
}

interface DiscoverResponse { page: number; total_pages: number; total_results: number; results: TmdbListMovie[] }

const genreNameMap: Record<string, string> = {
  Drama: '剧情', Comedy: '喜剧', Animation: '动画', Horror: '恐怖', Mystery: '悬疑',
  'Science Fiction': '科幻', Romance: '爱情', Action: '动作', Fantasy: '奇幻',
  Thriller: '惊悚', Crime: '犯罪', Adventure: '冒险', History: '历史', Documentary: '纪录片',
}

const fallbackDirectors = ['克里斯托弗·诺兰', '奉俊昊', '李安', '宫崎骏', '斯坦利·库布里克', '王家卫']
const fallbackActors = ['梁朝伟', '凯特·布兰切特', '宋康昊', '蒂尔达·斯文顿', '役所广司', '朱丽叶·比诺什']

export const readTmdbCredential = () => {
  const envToken = import.meta.env.VITE_TMDB_READ_TOKEN?.trim()
  const envKey = import.meta.env.VITE_TMDB_API_KEY?.trim()
  if (envToken) return envToken
  if (envKey) return envKey
  try { return localStorage.getItem(CREDENTIAL_KEY)?.trim() ?? '' } catch { return '' }
}

export const saveTmdbCredential = (credential: string) => {
  const clean = credential.trim()
  if (clean) localStorage.setItem(CREDENTIAL_KEY, clean)
  else localStorage.removeItem(CREDENTIAL_KEY)
}

const isReadToken = (credential: string) => credential.startsWith('eyJ') || credential.length > 80

async function tmdbRequest<T>(path: string, credential: string, params: Record<string, string | number | boolean | undefined> = {}): Promise<T> {
  if (!credential) throw new Error('尚未配置 TMDB API 凭证')
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => value !== undefined && search.set(key, String(value)))
  const headers: HeadersInit = { accept: 'application/json' }
  if (isReadToken(credential)) headers.Authorization = `Bearer ${credential}`
  else search.set('api_key', credential)
  const response = await fetch(`${API_BASE}${path}?${search}`, { headers })
  if (response.status === 401) throw new Error('TMDB 凭证无效，请检查 API Key 或 Read Access Token')
  if (response.status === 429) throw new Error('TMDB 请求过于频繁，请稍后重试')
  if (!response.ok) throw new Error(`TMDB 暂时不可用（HTTP ${response.status}）`)
  return response.json() as Promise<T>
}

export async function testTmdbConnection(credential: string) {
  await tmdbRequest('/configuration', credential)
  return true
}

const shuffle = <T,>(items: T[]) => {
  const output = [...items]
  for (let index = output.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[output[index], output[target]] = [output[target], output[index]]
  }
  return output
}

function discoverParams(category: Category, page: number): Record<string, string | number | boolean> {
  const common: Record<string, string | number | boolean> = {
    language: 'zh-CN', include_adult: false, include_video: false, page,
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

function translatedOverview(detail: TmdbMovieDetail) {
  if (detail.overview?.trim()) return detail.overview.trim()
  const candidates = detail.translations?.translations ?? []
  const preferred = ['CN', 'TW', 'HK', 'US']
  for (const country of preferred) {
    const value = candidates.find((item) => item.iso_3166_1 === country)?.data?.overview?.trim()
    if (value) return value
  }
  return '这部电影的中文简介尚未补充，详细资料以 TMDB 最新记录为准。'
}

function regionFrom(detail: TmdbMovieDetail): '华语' | '欧美' | '日韩' {
  const countries = new Set((detail.production_countries ?? []).map((item) => item.iso_3166_1))
  if (['CN', 'HK', 'TW', 'SG'].some((item) => countries.has(item)) || detail.original_language === 'zh') return '华语'
  if (['JP', 'KR'].some((item) => countries.has(item)) || ['ja', 'ko'].includes(detail.original_language ?? '')) return '日韩'
  return '欧美'
}

function difficultyFrom(detail: TmdbMovieDetail): Difficulty {
  const votes = detail.vote_count ?? 0
  if (votes >= 12000) return '入门'
  if (votes >= 3000) return '进阶'
  return '资深'
}

function uniqueChoices(answer: string, pool: string[], fallback: string[]) {
  const choices = [answer, ...shuffle([...pool, ...fallback]).filter((item) => item && item !== answer)]
  return [...new Set(choices)].slice(0, 4)
}

function makeMovie(detail: TmdbMovieDetail, all: TmdbMovieDetail[], index: number): Movie | null {
  if (!detail.poster_path || !detail.title) return null
  const director = detail.credits?.crew?.find((person) => person.job === 'Director')?.name
  const lead = [...(detail.credits?.cast ?? [])].sort((a, b) => (a.order ?? 99) - (b.order ?? 99))[0]
  const otherDirectors = all.map((item) => item.credits?.crew?.find((person) => person.job === 'Director')?.name).filter((item): item is string => Boolean(item))
  const otherActors = all.map((item) => [...(item.credits?.cast ?? [])].sort((a, b) => (a.order ?? 99) - (b.order ?? 99))[0]?.name).filter((item): item is string => Boolean(item))
  const useCastQuestion = index % 2 === 1 && Boolean(lead)
  const answer = useCastQuestion ? lead!.name : director ?? lead?.name ?? '资料暂缺'
  const options = uniqueChoices(answer, useCastQuestion ? otherActors : otherDirectors, useCastQuestion ? fallbackActors : fallbackDirectors)
  if (options.length < 4 || answer === '资料暂缺') return null
  const year = Number(detail.release_date?.slice(0, 4)) || new Date().getFullYear()
  const genres = (detail.genres ?? []).map((genre) => genreNameMap[genre.name] ?? genre.name).slice(0, 4)
  const recognitionDistractors = shuffle(all.filter((item) => item.id !== detail.id).map((item) => item.title)).filter((title) => title !== detail.title).slice(0, 3)
  if (recognitionDistractors.length < 3) return null
  const rating = detail.vote_average ?? 0
  const votes = detail.vote_count ?? 0
  const explanation = useCastQuestion
    ? `${lead!.name}在本片中饰演${lead!.character ? `“${lead!.character}”` : '主要角色'}。资料于答题开始时从 TMDB 实时同步。`
    : `${director}是本片导演；影片时长约 ${detail.runtime ?? '—'} 分钟，TMDB 当前评分 ${rating.toFixed(1)}。`
  return {
    id: `tmdb-${detail.id}`,
    title: detail.title,
    originalTitle: detail.original_title || detail.title,
    year,
    region: regionFrom(detail),
    genres: genres.length ? genres : ['剧情'],
    director: director ?? '资料暂缺',
    imageUrl: `${IMAGE_BASE}${detail.poster_path}`,
    imageAlt: `TMDB 实时海报：《${detail.title}》`,
    accent: index % 3 === 0 ? ['#263c4a', '#c48a54'] : index % 3 === 1 ? ['#552c32', '#d3aa66'] : ['#2f4639', '#b8a56d'],
    recognitionDistractors,
    synopsis: translatedOverview(detail),
    question: useCastQuestion ? '下列哪位演员出演了这部电影的主要角色？' : '这部电影的导演是谁？',
    options,
    answer,
    explanation,
    spoiler: false,
    difficulty: difficultyFrom(detail),
    recommendation: `TMDB ${rating.toFixed(1)} 分 · ${votes.toLocaleString('zh-CN')} 人评分，适合继续探索。`,
    source: 'tmdb',
    tmdbId: detail.id,
    tmdbUrl: `https://www.themoviedb.org/movie/${detail.id}`,
    rating,
    voteCount: votes,
    runtime: detail.runtime,
    lastSyncedAt: Date.now(),
  }
}

async function fetchDetails(ids: number[], credential: string) {
  const output: TmdbMovieDetail[] = []
  for (let index = 0; index < ids.length; index += 6) {
    const batch = ids.slice(index, index + 6)
    const results = await Promise.allSettled(batch.map((id) => tmdbRequest<TmdbMovieDetail>(`/movie/${id}`, credential, {
      language: 'zh-CN', append_to_response: 'credits,images,translations', include_image_language: 'zh,en,null',
    })))
    results.forEach((result) => result.status === 'fulfilled' && output.push(result.value))
  }
  return output
}

export async function createTmdbQuiz(mode: TestMode, category: Category, credential: string): Promise<Movie[]> {
  const pages = category === '日韩电影' ? [1, 2, 3, 4] : shuffle([1, 2, 3, 4, 5]).slice(0, mode === 30 ? 3 : 2)
  const discovered = await Promise.all(pages.map((page) => tmdbRequest<DiscoverResponse>('/discover/movie', credential, discoverParams(category, page))))
  const unique = [...new Map(discovered.flatMap((result) => result.results).filter((movie) => movie.poster_path).map((movie) => [movie.id, movie])).values()]
  const candidateIds = shuffle(unique).slice(0, Math.min(unique.length, mode + 10)).map((movie) => movie.id)
  const details = await fetchDetails(candidateIds, credential)
  const quiz = details.map((detail, index) => makeMovie(detail, details, index)).filter((movie): movie is Movie => Boolean(movie)).slice(0, mode)
  if (quiz.length < mode) throw new Error(`TMDB 返回的完整电影资料不足（需要 ${mode} 部，得到 ${quiz.length} 部），请重试或换一个类型。`)
  return quiz
}
