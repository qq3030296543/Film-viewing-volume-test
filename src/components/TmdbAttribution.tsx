import { useLanguage } from '../i18n'

export function TmdbAttribution({ compact = false }: { compact?: boolean }) {
  const { language } = useLanguage()
  return <div className={`tmdb-attribution ${compact ? 'compact' : ''}`}>
    <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer" aria-label={language === 'en' ? 'Visit The Movie Database' : '访问 The Movie Database'}>
      <img src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.svg" alt="TMDB" />
    </a>
    {!compact && <span>This product uses the TMDB API but is not endorsed or certified by TMDB.</span>}
  </div>
}
