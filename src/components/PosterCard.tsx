import { useEffect, useMemo, useState } from 'react'
import type { Movie } from '../types'
import { moviePosterCandidates } from '../utils/posters'

export function PosterCard({ movie }: { movie: Movie }) {
  const candidates = useMemo(() => moviePosterCandidates(movie), [movie])
  const [sourceIndex, setSourceIndex] = useState(0)
  const [artOrientation, setArtOrientation] = useState<'unknown' | 'portrait' | 'landscape'>('unknown')
  const source = candidates[sourceIndex]

  useEffect(() => { setSourceIndex(0); setArtOrientation('unknown') }, [movie.id])

  return (
    <figure
      className={`poster-card concealed poster-showcase ${movie.source === 'tmdb' ? 'tmdb-visual' : 'local-visual'} ${movie.textlessArtwork ? 'textless-visual' : 'unverified-visual'} ${artOrientation === 'portrait' ? 'portrait-art' : artOrientation === 'landscape' ? 'landscape-art' : 'orientation-pending'}`}
      style={{ '--poster-a': movie.accent[0], '--poster-b': movie.accent[1] } as React.CSSProperties}
    >
      {source ? (
        <div className="poster-media">
          <span className="poster-backdrop" style={{ backgroundImage: `url("${source}")` }} aria-hidden="true" />
          <img
            key={source}
            className="poster-main-image"
            src={source}
            alt="待识别的电影海报"
            decoding="async"
            onLoad={(event) => setArtOrientation(event.currentTarget.naturalHeight / event.currentTarget.naturalWidth > 1.25 ? 'portrait' : 'landscape')}
            onError={() => { setArtOrientation('unknown'); setSourceIndex((current) => current + 1) }}
          />
        </div>
      ) : (
        <div className="poster-fallback" role="img" aria-label="电影海报正在恢复">
          <span className="fallback-ring" />
          <span className="fallback-mark">◆</span>
          <small>FILM ARCHIVE · IMAGE RECOVERY</small>
        </div>
      )}

      {!movie.textlessArtwork && artOrientation === 'portrait' && (
        <div className="artwork-preparing" role="status">
          <small>TEXTLESS POSTER</small>
          <strong>正在准备无字海报</strong>
        </div>
      )}

      <span className="poster-scrim" />
      <span className="title-guard title-guard-top" aria-hidden="true"><i>IDENTITY SEALED</i></span>
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
