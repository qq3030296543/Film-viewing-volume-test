interface Props { current: number; total: number }

export function ProgressBar({ current, total }: Props) {
  const percent = Math.round((current / total) * 100)
  return (
    <div className="progress-wrap" aria-label={`测试进度 ${current}/${total}`}>
      <div className="progress-meta"><span>REEL {String(current).padStart(2, '0')}</span><span>{percent}%</span></div>
      <div className="progress-track"><span style={{ width: `${percent}%` }} /></div>
    </div>
  )
}
