import { useMemo, useRef, useState } from 'react'
import { movies } from '../data/movies'
import { getIdentityAssessment, getRank } from '../data/ranks'
import type { ChallengeComparison, QuizResult, QuizSession } from '../types'
import { getLevelPerformanceSummary } from '../utils/performance'
import { createChallengeLink } from '../utils/challenge'
import { RadarChart } from './RadarChart'
import { TmdbAttribution } from './TmdbAttribution'
import { genreLabel, levelLabel, useLanguage } from '../i18n'
import { LanguageSwitch } from './LanguageSwitch'

interface Props {
  result: QuizResult
  session?: QuizSession
  comparison?: ChallengeComparison
  onRetry: () => void
  onChangeCategory: () => void
  onOpenProfile: () => void
}

export function ResultScreen({ result, session, comparison, onRetry, onChangeCategory, onOpenProfile }: Props) {
  const { language } = useLanguage()
  const en = language === 'en'
  const playerLevel = result.playerLevel ?? '略知一二'
  const rank = getRank(result.score, playerLevel, language)
  const assessment = getIdentityAssessment(result.score, playerLevel, language)
  const levelSummary = useMemo(() => getLevelPerformanceSummary(playerLevel), [playerLevel, result.completedAt])
  const [shareOpen, setShareOpen] = useState(false)
  const [challengeOpen, setChallengeOpen] = useState(false)
  const [challengeLink, setChallengeLink] = useState('')
  const [challengeLoading, setChallengeLoading] = useState(false)
  const [toast, setToast] = useState('')
  const shareCardRef = useRef<HTMLDivElement>(null)
  const strongest = [...result.categoryScores].sort((a, b) => b.score - a.score).find((item) => item.total > 0)
  const recommendations = useMemo(() => {
    const preferred = strongest?.label
    return movies.filter((movie) => !preferred || movie.genres.includes(preferred)).slice(0, 4)
  }, [strongest?.label])
  const titleForMovieId = (movieId: string) => {
    const movie = session?.movies.find((item) => item.id === movieId)
    if (!movie) return movieId
    return en ? (movie.localizedTitles?.en || movie.originalTitle || movie.title) : (movie.localizedTitles?.zh || movie.title)
  }

  const openChallenge = async () => {
    if (!session) return
    setChallengeOpen(true)
    if (challengeLink) return
    setChallengeLoading(true)
    try {
      setChallengeLink(await createChallengeLink(session, result))
    } catch {
      setToast(en ? 'Could not create challenge link' : '暂时无法生成挑战链接')
    } finally {
      setChallengeLoading(false)
    }
  }

  const copyChallenge = async () => {
    if (!challengeLink) return
    try {
      await navigator.clipboard.writeText(challengeLink)
      setToast(en ? 'Challenge link copied' : '好友挑战链接已复制')
    } catch {
      window.prompt(en ? 'Copy this challenge link:' : '请复制下面的挑战链接：', challengeLink)
    }
    window.setTimeout(() => setToast(''), 2200)
  }

  const shareChallenge = async () => {
    if (!challengeLink) return
    const shareApi = (navigator as unknown as { share?: (data: ShareData) => Promise<void> }).share
    if (!shareApi) { await copyChallenge(); return }
    try {
      await shareApi.call(navigator, {
        title: en ? 'Cine Memory Friend Challenge' : '光影鉴赏局 · 好友同题挑战',
        text: en ? `I recognized ${result.recognizedCount}/${result.mode} films. Try the exact same set.` : `我在这组电影中答对了 ${result.recognizedCount}/${result.mode} 部，来挑战同一套题吧。`,
        url: challengeLink,
      })
    } catch {
      setToast(en ? 'Share cancelled' : '已取消分享')
      window.setTimeout(() => setToast(''), 2200)
    }
  }

  const shareText = en
    ? `I completed Cine Memory Bureau as a ${levelLabel(playerLevel, language)}, scored ${result.score}, and earned the rank ${rank.name}. Think you can beat it?`
    : `我以「${levelLabel(playerLevel, language)}」身份完成光影鉴赏局，获得 ${result.score} 分，身份段位：${rank.name}（${assessment.label}）。你也来试试？`

  const share = async () => {
    const shareApi = (navigator as unknown as { share?: (data: ShareData) => Promise<void> }).share
    try {
      if (shareApi) await shareApi.call(navigator, { title: en ? 'My Cinema Rank' : '我的阅片段位', text: shareText })
      else await navigator.clipboard.writeText(shareText)
      setToast(shareApi ? (en ? 'System share opened' : '已打开系统分享') : (en ? 'Result text copied' : '成绩文案已复制'))
    } catch {
      setToast(en ? 'Share cancelled' : '已取消分享')
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
    ctx.fillText(en ? 'CINE MEMORY BUREAU' : '光影鉴赏局  ·  CINE MEMORY', 110, 145)
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
    ctx.fillText(en ? `Correct ${result.recognizedCount}  ·  Missed ${result.fuzzyCount}  ·  Best streak ${result.bestStreak}` : `猜中 ${result.recognizedCount} 部  ·  答错 ${result.fuzzyCount} 部  ·  最长连胜 ${result.bestStreak}`, 110, 1050)
    ctx.fillStyle = '#9d998f'
    ctx.font = '30px sans-serif'
    ctx.fillText(`${levelLabel(playerLevel, language)}  ·  ${en ? 'Best' : '擅长'}: ${genreLabel(strongest?.label ?? '综合', language)}  ·  ${assessment.label}`, 110, 1120)
    ctx.strokeStyle = rank.color
    ctx.beginPath(); ctx.moveTo(110, 1200); ctx.lineTo(970, 1200); ctx.stroke()
    ctx.fillStyle = '#f4efe6'
    ctx.font = 'bold 32px sans-serif'
    ctx.fillText(en ? 'Seeing is easy. Remembering is the test.' : '看过不算，记得才算。', 110, 1280)
    const link = document.createElement('a')
    link.download = `${en ? 'cine-memory' : '光影鉴赏局'}-${rank.name}-${result.score}${en ? 'pts' : '分'}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    setToast(en ? 'Share card saved' : '分享卡已保存')
    window.setTimeout(() => setToast(''), 2200)
  }

  return (
    <main className="result-shell">
      <header className="result-header"><span className="brand-static"><b>◉</b> {en ? 'Cine Memory Bureau' : '光影鉴赏局'}</span><div className="result-header-actions"><span>SCREENING REPORT · {new Date(result.completedAt).toLocaleDateString(en ? 'en-US' : 'zh-CN')}</span><LanguageSwitch compact /></div></header>

      <section className="rank-hero" style={{ '--rank-color': rank.color } as React.CSSProperties}>
        <div className="rank-copy">
          <span className="section-index">{en ? 'TEST COMPLETE' : '测试完成'} · YOUR CINEMA RANK</span>
          <div className="rank-name-line"><span className="rank-icon">{rank.icon}</span><div><small>{rank.eyebrow}</small><h1>{rank.name}</h1></div></div>
          <p>{rank.description}</p>
          <div className="identity-assessment">
            <span>{en ? 'Identity: ' : '挑战身份：'}<b>{levelLabel(playerLevel, language)}</b></span>
            <strong>{assessment.label}</strong>
            <small>{assessment.nextStep}</small>
          </div>
        </div>
        <div className="score-dial"><span>{result.score}</span><small>/ 100</small><i style={{ '--score': `${result.score * 3.6}deg` } as React.CSSProperties} /></div>
      </section>

      {comparison && <section className="challenge-comparison result-card">
        <div className="card-heading"><span className="section-index">FRIEND CHALLENGE / {en ? 'SAME FILMS' : '同题对决'}</span><h2>{en ? 'Where Your Cinema Memories Meet' : '你们的电影记忆，在哪里相遇'}</h2></div>
        <div className="challenge-score-duel">
          <div><small>{en ? 'CHALLENGE CREATOR' : '挑战发起者'}</small><strong>{comparison.inviterCorrectCount}<i> / {result.mode}</i></strong></div>
          <span>VS</span>
          <div><small>{en ? 'YOU' : '你的成绩'}</small><strong>{comparison.friendCorrectCount}<i> / {result.mode}</i></strong></div>
        </div>
        <div className="challenge-comparison-grid">
          <div><small>{en ? 'BOTH CORRECT' : '双方共同答对'}</small><strong>{comparison.bothCorrectIds.length}</strong><p>{comparison.bothCorrectIds.slice(0, 8).map(titleForMovieId).join(en ? ', ' : '、') || (en ? 'None yet' : '暂无')}</p></div>
          <div><small>{en ? 'CREATOR ONLY' : '只有发起者答对'}</small><strong>{comparison.inviterOnlyIds.length}</strong><p>{comparison.inviterOnlyIds.slice(0, 8).map(titleForMovieId).join(en ? ', ' : '、') || (en ? 'None' : '暂无')}</p></div>
          <div><small>{en ? 'YOU ONLY' : '只有你答对'}</small><strong>{comparison.friendOnlyIds.length}</strong><p>{comparison.friendOnlyIds.slice(0, 8).map(titleForMovieId).join(en ? ', ' : '、') || (en ? 'None' : '暂无')}</p></div>
          <div><small>{en ? 'GENRE STRENGTHS' : '双方擅长类型'}</small><strong>◎</strong><p>{en ? 'Creator: ' : '发起者：'}{comparison.inviterTopGenres.map((genre) => genreLabel(genre, language)).join(' · ') || '—'}<br />{en ? 'You: ' : '你：'}{comparison.friendTopGenres.map((genre) => genreLabel(genre, language)).join(' · ') || '—'}</p></div>
        </div>
      </section>}

      <section className="result-grid">
        <div className="result-card metrics-card">
          <div className="card-heading"><span className="section-index">01 / {en ? 'SCREENING DATA' : '放映数据'}</span><h2>{en ? 'Your Recognition Score' : '你的识片成绩'}</h2></div>
          <div className="metric-grid">
            <div><span>{en ? 'Correct' : '正确猜中'}</span><strong>{result.recognizedCount}<small> / {result.mode}</small></strong></div>
            <div><span>{en ? 'Missed' : '答错影片'}</span><strong>{result.fuzzyCount}<small>{en ? ' films' : ' 部'}</small></strong></div>
            <div><span>{en ? 'Accuracy' : '识别正确率'}</span><strong>{result.accuracy}<small> %</small></strong></div>
            <div><span>{en ? 'Best streak' : '最长连胜'}</span><strong>{result.bestStreak}<small>{en ? ' correct' : ' 次'}</small></strong></div>
          </div>
          <div className="calibration-note">
            <span>LOCAL CALIBRATION · {en ? 'THIS DEVICE' : '本机真实记录'}</span>
            <p>{en ? `This browser has recorded ${levelSummary.attempts} answers across ${levelSummary.movieCount} films as ${levelLabel(playerLevel, language)}. This personal calibration is not a global player ranking.` : `当前浏览器已在「${levelLabel(playerLevel, language)}」下记录 ${levelSummary.attempts} 次作答，覆盖 ${levelSummary.movieCount} 部电影。此数据只用于个人题目校准，不代表全站玩家排名。`}</p>
            <strong>{levelSummary.accuracy}<small>% {en ? 'historical accuracy' : '历史正确率'}</small></strong>
          </div>
        </div>

        <div className="result-card radar-card">
          <div className="card-heading"><span className="section-index">02 / {en ? 'GENRE SPECTRUM' : '类型光谱'}</span><h2>{en ? 'Your Strongest Genres' : '你的擅长领域'}</h2></div>
          <div className="radar-layout"><RadarChart scores={result.categoryScores} /><div className="genre-rankings">
            {result.categoryScores.filter((item) => item.total > 0).sort((a, b) => b.score - a.score).slice(0, 4).map((item) => (
              <div key={item.label}><span>{genreLabel(item.label, language)}</span><div><i style={{ width: `${item.score}%` }} /></div><strong>{item.score}</strong></div>
            ))}
          </div></div>
        </div>

        <div className="result-card recommendation-card">
          <div className="card-heading"><span className="section-index">03 / {en ? 'NEXT SCREENING' : '下一场推荐'}</span><h2>{en ? `Continue with ${genreLabel(strongest?.label ?? '综合', language)}` : `沿着「${strongest?.label ?? '综合'}」继续`}</h2></div>
          <div className="recommendation-list">
            {recommendations.map((movie, index) => <div key={movie.id}><span>0{index + 1}</span><div><strong>{en ? movie.originalTitle : movie.title}</strong><small>{movie.year}{en ? '' : ` · ${movie.director}`}</small></div><p>{en ? 'A recommendation based on your strongest genre.' : movie.recommendation}</p></div>)}
          </div>
        </div>
      </section>

      <div className="result-actions">
        <button className="primary-button" onClick={onRetry}>{en ? 'Test Again' : '再测一次'} <span>↻</span></button>
        <button className="secondary-button" onClick={onChangeCategory}>{en ? 'Change Category' : '换一个类型'}</button>
        <button className="secondary-button challenge-action-button" onClick={() => void openChallenge()} disabled={!session}>{en ? 'Challenge a Friend' : '好友同题挑战'} <span>↗</span></button>
        <button className="secondary-button" onClick={onOpenProfile}>{en ? 'My Cinema Archive' : '查看阅片档案'}</button>
        <button className="secondary-button" onClick={() => setShareOpen(true)}>{en ? 'Create Share Card' : '生成分享卡'} <span>↗</span></button>
      </div>
      {result.dataSource === 'tmdb' && <div className="result-attribution"><TmdbAttribution /></div>}

      {shareOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={en ? 'Share result' : '分享成绩'}>
        <div className="share-modal">
          <button className="modal-close" onClick={() => setShareOpen(false)} aria-label={en ? 'Close' : '关闭'}>×</button>
          <div className="share-preview" ref={shareCardRef} style={{ '--rank-color': rank.color } as React.CSSProperties}>
            <span>{en ? 'CINE MEMORY BUREAU' : '光影鉴赏局 · CINE MEMORY'}</span><b>{rank.icon}</b><small>{en ? 'MY CINEMA RANK' : '我的阅片段位'}</small><h2>{rank.name}</h2><strong>{result.score}<i>/100</i></strong>
            <p>{levelLabel(playerLevel, language)} · {en ? 'Correct' : '猜中'} {result.recognizedCount} · {en ? 'Missed' : '答错'} {result.fuzzyCount} · {en ? 'Streak' : '连胜'} {result.bestStreak}</p><em>{en ? 'One frame awakens a memory of cinema.' : '一张画面，唤醒一段电影记忆。'}</em>
          </div>
          <div className="share-buttons"><button className="primary-button" onClick={downloadCard}>{en ? 'Save Image' : '保存为图片'}</button><button className="secondary-button" onClick={share}>{en ? 'Share Result' : '分享成绩'}</button></div>
        </div>
      </div>}
      {challengeOpen && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={en ? 'Friend challenge link' : '好友挑战链接'}>
        <div className="share-modal challenge-link-modal">
          <button className="modal-close" onClick={() => setChallengeOpen(false)} aria-label={en ? 'Close' : '关闭'}>×</button>
          <span className="section-index">SAME REEL · FRIEND CHALLENGE</span>
          <h2>{en ? 'Let a friend answer the exact same films.' : '让朋友回答完全相同的电影题目'}</h2>
          <p>{en ? 'The film set and your result are compressed into the link fragment. No account is required.' : '电影题目与本次成绩会被压缩进链接片段，无需注册，也不会公开你的历史记录。'}</p>
          <label>{en ? 'Challenge link' : '挑战链接'}
            <textarea readOnly value={challengeLoading ? (en ? 'Creating link…' : '正在生成链接…') : challengeLink} rows={4} />
          </label>
          <div className="share-buttons"><button className="primary-button" onClick={() => void copyChallenge()} disabled={!challengeLink}>{en ? 'Copy Link' : '复制链接'}</button><button className="secondary-button" onClick={() => void shareChallenge()} disabled={!challengeLink}>{en ? 'Share Challenge' : '发送挑战'}</button></div>
        </div>
      </div>}
      {toast && <div className="toast">{toast}</div>}
    </main>
  )
}
