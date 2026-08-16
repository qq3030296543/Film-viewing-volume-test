import type { CategoryScore } from '../types'
import { genreLabel, useLanguage } from '../i18n'

export function RadarChart({ scores }: { scores: CategoryScore[] }) {
  const { language } = useLanguage()
  const size = 260
  const center = size / 2
  const radius = 92
  const pointsAt = (factor: number) => scores.map((_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / scores.length
    return `${center + Math.cos(angle) * radius * factor},${center + Math.sin(angle) * radius * factor}`
  }).join(' ')
  const dataPoints = scores.map((score, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / scores.length
    const factor = Math.max(0.06, score.score / 100)
    return `${center + Math.cos(angle) * radius * factor},${center + Math.sin(angle) * radius * factor}`
  }).join(' ')

  return (
    <svg className="radar-chart" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={language === 'en' ? 'Film genre performance radar chart' : '不同电影类型能力雷达图'}>
      {[0.25, 0.5, 0.75, 1].map((factor) => <polygon key={factor} points={pointsAt(factor)} className="radar-grid" />)}
      {scores.map((score, index) => {
        const angle = -Math.PI / 2 + (index * Math.PI * 2) / scores.length
        const endX = center + Math.cos(angle) * radius
        const endY = center + Math.sin(angle) * radius
        const textX = center + Math.cos(angle) * (radius + 25)
        const textY = center + Math.sin(angle) * (radius + 25)
        return <g key={score.label}><line x1={center} y1={center} x2={endX} y2={endY} className="radar-axis" /><text x={textX} y={textY} textAnchor="middle" dominantBaseline="middle">{genreLabel(score.label, language)}</text></g>
      })}
      <polygon points={dataPoints} className="radar-data" />
    </svg>
  )
}
