import { useMemo, useState } from 'react'
import type { Movie } from '../types'

export function PosterCard({ movie }: { movie: Movie }) {
  const candidates = useMemo(
    () => [...new Set([movie.imageUrl, ...(movie.imageUrls ?? [])].filter(Boolean))],
    [movie.id, movie.imageUrl, movie.imageUrls],
  )
  const [sourceIndex, setSourceIndex] = useState(0)
  const source = candidates[sourceIndex]
  const failed = sourceIndex >= candidates.length

  const tryNextImage = () => setSourceIndex((current) => current + 1)

  return (
    <figure
      className={`poster-card concealed poster-showcase ${movie.source === 'tmdb' ? 'tmdb-visual' : 'local-visual'}`}
      style={{ '--poster-a': movie.accent[0], '--poster-b': movie.accent[1] } as React.CSSProperties}
    >
      {!failed ? (
        <div className="poster-media">
          <span className="poster-backdrop" style={{ backgroundImage: `url("${source}")` }} aria-hidden="true" />
          <img key={source} className="poster-main-image" src={source} alt="待识别的电影海报" onError={tryNextImage} />
        </div>
      ) : (
        <div className="poster-fallback" role="img" aria-label="电影海报暂时无法加载">
          <span className="fallback-ring" /><span className="fallback-mark">◆</span><small>IMAGE RECOVERY FAILED</small>
        </div>
      )}

      <span className="poster-scrim" />
      <span className="title-guard title-guard-top" aria-hidden="true" />
      <span className="title-guard title-guard-bottom" aria-hidden="true"><i>CLASSIFIED TITLE</i></span>
      <figcaption>
        <small>VISUAL ARCHIVE // {movie.id.slice(0, 6).toUpperCase()}</small>
        <strong>片名已隐藏</strong>
        <span>{movie.region} · {movie.difficulty}难度</span>
      </figcaption>
      {movie.source === 'tmdb' && <span className="live-source-badge"><i /> TMDB LIVE</span>}
    </figure>
  )
}
