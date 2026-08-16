import { useMemo, useRef, useState } from 'react'
import { movies } from '../data/movies'
import { getIdentityAssessment, getRank } from '../data/ranks'
import type { QuizResult } from '../types'
import { getLevelPerformanceSummary } from '../utils/performance'
import { RadarChart } from './RadarChart'
import { TmdbAttribution } from './TmdbAttribution'

interface Props {
  result: QuizResult
  onRetry: () => void
  onChangeCategory: () => void
}

export function ResultScreen({ result, onRetry, onChangeCategory }: Props) {
  const playerLevel = result.playerLevel ?? '略知一二'
  const rank = getRank(result.score, playerLevel)
  const assessment = getIdentityAssessment(result.score, playerLevel)
  const levelSummary = useMemo(() => getLevelPerformanceSummary(playerLevel), [playerLevel, result.completedAt])
  const [shareOpen, setShareOpen] = useState(false)
  const [toast, setToast] = useState('')
  const shareCardRef = useRef<HTMLDivElement>(null)
  const strongest = [...result.categoryScores].sort((a, b) => b.score - a.score).find((item) => item.total > 0)
  const recommendations = useMemo(() => {
    const preferred = strongest?.label
    return movies.filter((movie) => !preferred || movie.genres.includes(preferred)).slice(0, 4)
  }, [strongest?.label])

  const shareText = `我以「${playerLevel}」身份完成光影鉴赏局，获得 ${result.score} 分，身份段位：${rank.name}（${assessment.label}）。你也来试试？`

  const share = async () => {
    const shareApi = (navigator as unknown as { share?: (data: ShareData) => Promise<void> }).share
    try {
      if (shareApi) await shareApi.call(navigator, { title: '我的阅片段位', text: shareText })
      else await navigator.clipboard.writeText(shareText)
      setToast(shareApi ? '已打开系统分享' : '成绩文案已复制')
    } catch {
      setToast('已取消分享')
    }
    window.setTimeout(() => setToast(''), 2200)
  }

  const downloadCard = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1440
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1440)
    gradient.addColorStop(0, '#15171b')
    gradient.addColorStop(1, '#08090b')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 1080, 1440)
    ctx.strokeStyle = '#34302a'
    ctx.lineWidth = 2
    ctx.strokeRect(60, 60, 960, 1320)
    ctx.fillStyle = rank.color
    ctx.font = '34px sans-serif'
    ctx.fillText('光影鉴赏局  ·  CINE MEMORY', 110, 145)
    ctx.font = '180px serif'
    ctx.fillText(rank.icon, 110, 390)
    ctx.fillStyle = '#f4efe6'
    ctx.font = 'bold 92px serif'
    ctx.fillText(rank.name, 110, 540)
    ctx.fillStyle = '#9d998f'
    ctx.font = '32px sans-serif'
    ctx.fillText(rank.eyebrow, 114, 595)
    ctx.fillStyle = rank.color
    ctx.font = 'bold 260px serif'
    ctx.fillText(String(result.score), 100, 910)
    ctx.font = '36px sans-serif'
    ctx.fillText('/ 100', 600, 885)
    ctx.fillStyle = '#f4efe6'
    ctx.font = '34px sans-serif'
    ctx.fillText(`猜中 ${result.recognizedCount} 部  ·  答错 ${result.fuzzyCount} 部  ·  最长连胜 ${result.bestStreak}`, 110, 1050)
    ctx.fillStyle = '#9d998f'
    ctx.font = '30px sans-serif'
    ctx.fillText(`${playerLevel}  ·  擅长：${strongest?.label ?? '综合'}  ·  ${assessment.label}`, 110, 1120)
    ctx.strokeStyle = rank.color
    ctx.beginPath(); ctx.moveTo(110, 1200); ctx.lineTo(970, 1200); ctx.stroke()
    ctx.fillStyle = '#f4efe6'
    ctx.font = 'bold 32px sans-serif'
    ctx.fillText('看过不算，记得才算。', 110, 1280)
    const link = document.createElement('a')
    link.download = `光影鉴赏局-${rank.name}-${result.score}分.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    setToast('分享卡已保存')
    window.setTimeout(() => setToast(''), 2200)
  }

  return (
    <main className="result-shell">
      <header className="result-header"><span className="brand-static"><b>◉</b> 光影鉴赏局</span><span>SCREENING REPORT · {new Date(result.completedAt).toLocaleDateString('zh-CN')}</span></header>

      <section className="rank-hero" style={{ '--rank-color': rank.color } as React.CSSProperties}>
        <div className="rank-copy">
          <span className="section-index">测试完成 · YOUR CINEMA RANK</span>
          <div className="rank-name-line"><span className="rank-icon">{rank.icon}</span><div><small>{rank.eyebrow}</small><h1>{rank.name}</h1></div></div>
          <p>{rank.description}</p>
          <div className="identity-assessment">
            <span>挑战身份：<b>{playerLevel}</b></span>
            <strong>{assessment.label}</strong>
            <small>{assessment.nextStep}</small>
          </div>
        </div>
        <div className="score-dial"><span>{result.score}</span><small>/ 100</small><i style={{ '--score': `${result.score * 3.6}deg` } as React.CSSProperties} /></div>
      </section>

      <section className="result-grid">
        <div className="result-card metrics-card">
          <div className="card-heading"><span className="section-index">01 / 放映数据</span><h2>你的识片成绩</h2></div>
          <div className="metric-grid">
            <div><span>正确猜中</span><strong>{result.recognizedCount}<small> / {result.mode}</small></strong></div>
            <div><span>答错影片</span><strong>{result.fuzzyCount}<small> 部</small></strong></div>
            <div><span>识别正确率</span><strong>{result.accuracy}<small> %</small></strong></div>
            <div><span>最长连胜</span><strong>{result.bestStreak}<small> 次</small></strong></div>
          </div>
          <div className="calibration-note">
            <span>LOCAL CALIBRATION · 本机真实记录</span>
            <p>当前浏览器已在「{playerLevel}」下记录 {levelSummary.attempts} 次作答，覆盖 {levelSummary.movieCount} 部电影。此数据只用于个人题目校准，不代表全站玩家排名。</p>
            <strong>{levelSummary.accuracy}<small>% 历史正确率</small></strong>
          </div>
        </div>

        <div className="result-card radar-card">
          <div className="card-heading"><span className="section-index">02 / 类型光谱</span><h2>你的擅长领域</h2></div>
          <div className="radar-layout"><RadarChart scores={result.categoryScores} /><div className="genre-rankings">
            {result.categoryScores.filter((item) => item.total > 0).sort((a, b) => b.score - a.score).slice(0, 4).map((item) => (
              <div key={item.label}><span>{item.label}</span><div><i style={{ width: `${item.score}%` }} /></div><strong>{item.score}</strong></div>
            ))}
          </div></div>
        </div>

        <div className="result-card recommendation-card">
          <div className="card-heading"><span className="section-index">03 / 下一场推荐</span><h2>沿着「{strongest?.label ?? '综合'}」继续</h2></div>
          <div className="recommendation-list">
            {recommendations.map((movie, index) => <div key={movie.id}><span>0{index + 1}</span><div><strong>{movie.title}</strong><small>{movie.year} · {movie.director}</small></div><p>{movie.recommendation}</p></div>)}
          </div>
        </div>
      </section>

      <div className="result-actions">
        <button className="primary-button" onClick={onRetry}>再测一次 <span>↻</span></button>
        <button className="secondary-button" onClick={onChangeCategory}>换一个类型</button>
        <button className="secondary-button" onClick={() => setShareOpen(true)}>生成分享卡 <span>↗</span></button>
      </div>
      {result.dataSource === 'tmdb' && <div className="result-attribution"><TmdbAttribution /></div>}

      {shareOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="分享成绩">
        <div className="share-modal">
          <button className="modal-close" onClick={() => setShareOpen(false)} aria-label="关闭">×</button>
          <div className="share-preview" ref={shareCardRef} style={{ '--rank-color': rank.color } as React.CSSProperties}>
            <span>光影鉴赏局 · CINE MEMORY</span><b>{rank.icon}</b><small>我的阅片段位</small><h2>{rank.name}</h2><strong>{result.score}<i>/100</i></strong>
            <p>{playerLevel} · 猜中 {result.recognizedCount} · 答错 {result.fuzzyCount} · 连胜 {result.bestStreak}</p><em>一张画面，唤醒一段电影记忆。</em>
          </div>
          <div className="share-buttons"><button className="primary-button" onClick={downloadCard}>保存为图片</button><button className="secondary-button" onClick={share}>分享成绩</button></div>
        </div>
      </div>}
      {toast && <div className="toast">{toast}</div>}
    </main>
  )
}
