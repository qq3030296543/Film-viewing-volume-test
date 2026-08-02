import { useState } from 'react'
import type { Movie } from '../types'

interface Props { movie: Movie; revealed: boolean }

export function PosterCard({ movie, revealed }: Props) {
  const [failed, setFailed] = useState(false)
  return (
    <figure className={`poster-card ${revealed ? 'revealed' : ''}`} style={{ '--poster-a': movie.accent[0], '--poster-b': movie.accent[1] } as React.CSSProperties}>
      {!failed ? (
        <img src={movie.imageUrl} alt={movie.imageAlt} onError={() => setFailed(true)} />
      ) : (
        <div className="poster-fallback" role="img" aria-label={`${movie.imageAlt}图片暂时无法加载`}>
          <span className="fallback-ring" /><span className="fallback-mark">◈</span><small>POSTER OFFLINE</small>
        </div>
      )}
      <span className="poster-scrim" />
      <figcaption>
        {revealed ? (
          <><small>{movie.originalTitle} · {movie.year}</small><strong>{movie.title}</strong><span>{movie.director} 导演</span></>
        ) : (
          <><small>ARCHIVE NO. {movie.id.slice(0, 5).toUpperCase()}</small><strong>片名待揭晓</strong><span>{movie.region} · {movie.difficulty}难度</span></>
        )}
      </figcaption>
      {movie.source === 'tmdb' && <span className="live-source-badge"><i /> TMDB LIVE</span>}
    </figure>
  )
}
