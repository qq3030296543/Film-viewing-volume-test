import type { Movie } from '../types'

const TMDB_SIZE_PATTERN = /\/t\/p\/(w\d+|original)\//

export function expandPosterUrl(url: string) {
  if (!url) return []
  if (!TMDB_SIZE_PATTERN.test(url)) return [url]

  return ['w780', 'w500', 'w342', 'original'].map((size) =>
    url.replace(TMDB_SIZE_PATTERN, `/t/p/${size}/`),
  )
}

export function moviePosterCandidates(movie: Pick<Movie, 'imageUrl' | 'imageUrls'>) {
  return [...new Set(
    [movie.imageUrl, ...(movie.imageUrls ?? [])]
      .filter(Boolean)
      .flatMap(expandPosterUrl),
  )]
}

export function homePosterCandidates(movie: Pick<Movie, 'imageUrl' | 'imageUrls'>) {
  const candidates = moviePosterCandidates(movie)
  const sizePriority = (url: string) => {
    if (url.includes('/w342/')) return 0
    if (url.includes('/w500/')) return 1
    if (url.includes('/w780/')) return 2
    return 3
  }
  return [...candidates].sort((left, right) => sizePriority(left) - sizePriority(right))
}

export function shuffleItems<T>(items: readonly T[]) {
  const output = [...items]
  for (let index = output.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[output[index], output[target]] = [output[target], output[index]]
  }
  return output
}
