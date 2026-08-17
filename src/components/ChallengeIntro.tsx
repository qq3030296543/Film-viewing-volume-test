import type { ChallengePayload } from '../types'
import { categoryLabel, levelLabel, useLanguage } from '../i18n'
import { LanguageSwitch } from './LanguageSwitch'
import { ResilientPosterImage } from './ResilientPosterImage'
import { moviePosterCandidates } from '../utils/posters'

interface Props {
  challenge: ChallengePayload
  onAccept: () => void
  onBack: () => void
}

export function ChallengeIntro({ challenge, onAccept, onBack }: Props) {
  const { language } = useLanguage()
  const en = language === 'en'
  return (
    <main className="challenge-intro-shell">
      <header className="profile-header">
        <button className="brand-button" onClick={onBack}>{en ? 'Cine Memory Bureau' : '光影鉴赏局'}<sup>®</sup></button>
        <LanguageSwitch compact />
      </header>
      <section className="challenge-intro-card liquid-glass">
        <div className="challenge-poster-stack" aria-hidden="true">
          {challenge.movies.slice(0, 4).map((movie, index) => (
            <figure key={movie.id} style={{ '--challenge-poster-index': index } as React.CSSProperties}>
              <ResilientPosterImage sources={moviePosterCandidates(movie)} alt="" />
            </figure>
          ))}
        </div>
        <div className="challenge-intro-copy">
          <span className="section-index">FRIEND CHALLENGE · SAME REEL</span>
          <h1>{en ? 'A friend left you the same set of films.' : '好友向你发来了一组同题挑战。'}</h1>
          <p>{en ? 'Recognize exactly the same films, then compare where your cinema memories overlap—and where they differ.' : '回答完全相同的电影题目，完成后比较你们共同答对、各自答对和擅长类型。'}</p>
          <div className="challenge-intro-metrics">
            <div><small>{en ? 'FILMS' : '电影数量'}</small><strong>{challenge.mode}</strong></div>
            <div><small>{en ? 'IDENTITY' : '挑战身份'}</small><strong>{levelLabel(challenge.playerLevel, language)}</strong></div>
            <div><small>{en ? 'CATEGORY' : '电影范围'}</small><strong>{categoryLabel(challenge.category, language)}</strong></div>
            <div><small>{en ? 'SCORE TO BEAT' : '好友成绩'}</small><strong>{challenge.inviter.correctCount} / {challenge.mode}</strong></div>
          </div>
          <div className="challenge-intro-actions">
            <button className="primary-button" onClick={onAccept}>{en ? 'Accept Challenge' : '开始同题挑战'} <span>→</span></button>
            <button className="secondary-button" onClick={onBack}>{en ? 'Back Home' : '返回首页'}</button>
          </div>
        </div>
      </section>
    </main>
  )
}
