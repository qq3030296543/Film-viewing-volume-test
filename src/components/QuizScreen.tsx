import { useEffect, useMemo, useState } from 'react'
import type { AnswerRecord, QuizSession } from '../types'
import { moviePosterCandidates } from '../utils/posters'
import { makeAnswer, shuffledOptions } from '../utils/quiz'
import { PosterCard } from './PosterCard'
import { ProgressBar } from './ProgressBar'
import { ResilientPosterImage } from './ResilientPosterImage'
import { TmdbAttribution } from './TmdbAttribution'

interface Props {
  session: QuizSession
  onAnswer: (answer: AnswerRecord) => void
  onExit: () => void
  onRestart: () => void
}

export function QuizScreen({ session, onAnswer, onExit, onRestart }: Props) {
  const movie = session.movies[session.currentIndex]
  const [selected, setSelected] = useState<string | null>(null)
  const options = useMemo(() => shuffledOptions([movie.title, ...movie.recognitionDistractors]), [movie.id])
  const ambientMovies = useMemo(
    () => session.movies.filter((item) => item.id !== movie.id).slice(0, 6),
    [movie.id, session.movies],
  )
  const answered = selected !== null
  const correct = selected === movie.title

  const selectOption = (option: string) => {
    if (!answered) setSelected(option)
  }

  const finish = () => onAnswer(makeAnswer(movie, correct))

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
        <button className="brand-button" onClick={onExit} aria-label="返回首页">
          光影鉴赏局<sup>®</sup>
        </button>
        <ProgressBar current={session.currentIndex + 1} total={session.mode} />
        <div className="quiz-header-actions">
          <button className="liquid-glass" onClick={onExit}>返回首页</button>
          <button className="liquid-glass" onClick={onRestart}>重新测试</button>
        </div>
      </header>

      <div className="quiz-layout">
        <div className="quiz-poster-column">
          <p className="quiz-archive-label"><span>FRAME</span> {String(session.currentIndex + 1).padStart(2, '0')} / {session.mode}</p>
          <PosterCard movie={movie} />
        </div>

        <section className="question-panel liquid-glass quiz-question-card">
          <div className="question-kicker">
            <span>{session.playerLevel ?? '略知一二'} · VISUAL TEST</span>
            <span className={`difficulty ${movie.difficulty}`}>{movie.difficulty}</span>
          </div>
          <h1>这一帧光影，来自哪部电影？</h1>
          <p className="question-lead">片名信息已被隐藏。凭你的电影记忆作答，也可以按数字键 1—4 快速选择。</p>

          <OptionList options={options} selected={selected} answer={movie.title} onSelect={selectOption} />

          {answered && (
            <div className="single-answer-feedback">
              <div className={`answer-status ${correct ? 'correct' : 'wrong'}`}>
                <span>{correct ? '✓' : '×'}</span>
                <div>
                  <small>{correct ? '识别正确 · +1' : '识别未命中'}</small>
                  <strong>{correct ? '你的电影记忆很准确' : `正确答案是《${movie.title}》`}</strong>
                </div>
              </div>
              <p className="movie-synopsis">{movie.synopsis}</p>
              <div className="fact-line">
                <span>{movie.year}</span><span>{movie.region}</span><span>{movie.genres.join(' · ')}</span>
                {movie.rating !== undefined && <span>TMDB {movie.rating.toFixed(1)}</span>}
              </div>
              <button className="primary-button next-button" onClick={finish}>
                {session.currentIndex + 1 === session.mode ? '查看我的段位' : '下一部电影'} <span>→</span>
              </button>
            </div>
          )}
        </section>
      </div>

      <footer className="quiz-footer">
        <span>{session.playerLevel ?? '略知一二'} · QUESTION {session.currentIndex + 1} / {session.mode}</span>
        {movie.source === 'tmdb' ? <TmdbAttribution compact /> : <span>ESC 返回首页 · 1—4 选择答案</span>}
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
