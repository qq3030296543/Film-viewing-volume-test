import { useEffect, useMemo, useState } from 'react'

interface Props {
  sources: string[]
  className?: string
  alt: string
  loading?: 'eager' | 'lazy'
  fetchPriority?: 'high' | 'low' | 'auto'
  timeoutMs?: number
  onExhausted?: () => void
}

export function ResilientPosterImage({
  sources,
  className,
  alt,
  loading = 'lazy',
  fetchPriority = 'auto',
  timeoutMs = 8_000,
  onExhausted,
}: Props) {
  const candidates = useMemo(() => [...new Set(sources.filter(Boolean))], [sources])
  const [sourceIndex, setSourceIndex] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => { setSourceIndex(0); setLoaded(false) }, [candidates.join('|')])

  const source = candidates[sourceIndex]

  const tryNextSource = () => {
    setLoaded(false)
    if (sourceIndex + 1 < candidates.length) setSourceIndex((current) => current + 1)
    else {
      setSourceIndex(candidates.length)
      onExhausted?.()
    }
  }

  useEffect(() => {
    if (!source || loaded || timeoutMs <= 0) return undefined
    const timer = window.setTimeout(tryNextSource, timeoutMs)
    return () => window.clearTimeout(timer)
  }, [source, loaded, timeoutMs])

  if (!source) {
    return <span className={`${className ?? ''} resilient-poster-placeholder`} role="img" aria-label={alt} />
  }

  return (
    <img
      key={source}
      className={className}
      src={source}
      alt={alt}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={tryNextSource}
    />
  )
}
