import { useEffect, useMemo, useState } from 'react'
import type { AnswerRecord, QuizSession } from '../types'
import { moviePosterCandidates } from '../utils/posters'
import { makeAnswer, shuffledOptions } from '../utils/quiz'
import { PosterCard } from './PosterCard'
import { ProgressBar } from './ProgressBar'
import { ResilientPosterImage } from './ResilientPosterImage'
import { TmdbAttribution } from './TmdbAttribution'
import { difficultyLabel, genreLabel, levelLabel, regionLabel, useLanguage } from '../i18n'
import { LanguageSwitch } from './LanguageSwitch'

interface Props {
  session: QuizSession
  onAnswer: (answer: AnswerRecord) => void
  onExit: () => void
  onRestart: () => void
}

export function QuizScreen({ session, onAnswer, onExit, onRestart }: Props) {
  const { language } = useLanguage()
  const en = language === 'en'
  const movie = session.movies[session.currentIndex]
  const [selected, setSelected] = useState<string | null>(null)
  const options = useMemo(() => shuffledOptions([movie.title, ...movie.recognitionDistractors]), [movie.id])
  const ambientMovies = useMemo(
    () => session.movies.filter((item) => item.id !== movie.id).slice(0, 6),
    [movie.id, session.movies],
  )
  const answered = selected !== null
  const correct = selected === movie.title
  const movieDetailsUrl = movie.tmdbId
    ? `https://www.themoviedb.org/movie/${movie.tmdbId}?language=${en ? 'en-US' : 'zh-CN'}`
    : `https://www.themoviedb.org/search?query=${encodeURIComponent(movie.originalTitle || movie.title)}&language=${en ? 'en-US' : 'zh-CN'}`

  const selectOption = (option: string) => {
    if (!answered) setSelected(option)
  }

  const finish = () => selected && onAnswer(makeAnswer(movie, correct, selected))

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onExit(); return }
      const digit = Number(event.key)
      if (!answered && digit >= 1 && digit <= 4 && options[digit - 1]) selectOption(options[digit - 1])
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  return (
    <main className="quiz-shell single-stage-quiz cinema-quiz">
      <div className="quiz-ambient-posters" aria-hidden="true">
        {ambientMovies.map((item, index) => (
          <figure key={item.id} style={{ '--poster-index': index } as React.CSSProperties}>
            <ResilientPosterImage sources={moviePosterCandidates(item)} alt="" />
          </figure>
        ))}
      </div>
      <div className="quiz-film-light" aria-hidden="true" />

      <header className="quiz-header cinema-quiz-header">
        <button className="brand-button" onClick={onExit} aria-label={en ? 'Return home' : '返回首页'}>
          {en ? 'Cine Memory Bureau' : '光影鉴赏局'}<sup>®</sup>
        </button>
        <ProgressBar current={session.currentIndex + 1} total={session.mode} />
        <div className="quiz-header-actions">
          <LanguageSwitch compact />
          <button className="liquid-glass" onClick={onExit}>{en ? 'Home' : '返回首页'}</button>
          <button className="liquid-glass" onClick={onRestart}>{en ? 'Restart' : '重新测试'}</button>
        </div>
      </header>

      <div className="quiz-layout">
        <div className="quiz-poster-column">
          <p className="quiz-archive-label"><span>FRAME</span> {String(session.currentIndex + 1).padStart(2, '0')} / {session.mode}</p>
          <PosterCard movie={movie} />
        </div>

        <section className="question-panel liquid-glass quiz-question-card">
          <div className="question-kicker">
            <span>{levelLabel(session.playerLevel ?? '略知一二', language)} · VISUAL TEST</span>
            <span className={`difficulty ${movie.difficulty}`}>{difficultyLabel(movie.difficulty, language)}</span>
          </div>
          <h1>{en ? 'Which film is this frame from?' : '这一帧光影，来自哪部电影？'}</h1>
          <p className="question-lead">{en ? 'The title is hidden. Trust your cinema memory, or press number keys 1—4 to answer.' : '片名信息已被隐藏。凭你的电影记忆作答，也可以按数字键 1—4 快速选择。'}</p>

          <OptionList options={options} selected={selected} answer={movie.title} onSelect={selectOption} />

          {answered && (
            <div className="single-answer-feedback">
              <div className={`answer-status ${correct ? 'correct' : 'wrong'}`}>
                <span>{correct ? '✓' : '×'}</span>
                <div>
                  <small>{correct ? (en ? 'CORRECT · +1' : '识别正确 · +1') : (en ? 'NOT RECOGNIZED' : '识别未命中')}</small>
                  <strong>{correct ? (en ? 'Your cinema memory is sharp' : '你的电影记忆很准确') : (en ? `The correct answer is “${movie.title}”` : `正确答案是《${movie.title}》`)}</strong>
                </div>
              </div>
              <p className="movie-synopsis">{movie.synopsis}</p>
              <div className="fact-line">
                <span>{movie.year}</span><span>{regionLabel(movie.region, language)}</span><span>{movie.genres.map((genre) => genreLabel(genre, language)).join(' · ')}</span>
                {movie.rating !== undefined && <span>TMDB {movie.rating.toFixed(1)}</span>}
              </div>
              <a
                className="movie-detail-link"
                href={movieDetailsUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={en ? `View ${movie.title} on TMDB in a new tab` : `在 TMDB 查看《${movie.title}》的电影资料（新标签页打开）`}
              >
                <span><small>{en ? 'FILM DETAILS · OFFICIAL LINK' : '电影详细资料 · OFFICIAL LINK'}</small><strong>{en ? `View “${movie.title}” on TMDB` : `在 TMDB 查看《${movie.title}》`}</strong></span>
                <em>themoviedb.org ↗</em>
              </a>
              <button className="primary-button next-button" onClick={finish}>
                {session.currentIndex + 1 === session.mode ? (en ? 'Reveal My Rank' : '查看我的段位') : (en ? 'Next Film' : '下一部电影')} <span>→</span>
              </button>
            </div>
          )}
        </section>
      </div>

      <footer className="quiz-footer">
        <span>{levelLabel(session.playerLevel ?? '略知一二', language)} · QUESTION {session.currentIndex + 1} / {session.mode}</span>
        {movie.source === 'tmdb' ? <TmdbAttribution compact /> : <span>{en ? 'ESC HOME · 1—4 SELECT' : 'ESC 返回首页 · 1—4 选择答案'}</span>}
      </footer>
    </main>
  )
}

function OptionList({ options, selected, answer, onSelect }: { options: string[]; selected: string | null; answer: string; onSelect: (option: string) => void }) {
  return (
    <div className="option-list">
      {options.map((option, index) => {
        const className = selected ? option === answer ? 'option-correct' : option === selected ? 'option-wrong' : 'option-muted' : ''
        return (
          <button className={className} key={option} onClick={() => onSelect(option)} disabled={selected !== null}>
            <kbd>{index + 1}</kbd><span>{option}</span><i aria-hidden="true">→</i>
          </button>
        )
      })}
    </div>
  )
}
