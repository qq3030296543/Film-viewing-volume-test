import { useEffect, useMemo, useState } from 'react'
import type { AnswerRecord, QuizSession } from '../types'
import { makeAnswer, shuffledOptions } from '../utils/quiz'
import { PosterCard } from './PosterCard'
import { ProgressBar } from './ProgressBar'
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
    <main className="quiz-shell single-stage-quiz">
      <header className="quiz-header">
        <button className="brand-button" onClick={onExit} aria-label="返回首页"><span>◉</span> 光影鉴赏局</button>
        <ProgressBar current={session.currentIndex + 1} total={session.mode} />
        <div className="quiz-header-actions">
          <button onClick={onExit}>返回首页</button>
          <button onClick={onRestart}>重新测试</button>
        </div>
      </header>

      <div className="quiz-layout">
        <PosterCard movie={movie} />

        <section className="question-panel">
          <div className="question-kicker"><span>VISUAL IDENTITY TEST</span><span className={`difficulty ${movie.difficulty}`}>{movie.difficulty}</span></div>
          <h1>这张电影画面来自哪部作品？</h1>
          <p className="question-lead">画面中的片名信息已隐藏。选择你认为正确的电影，或按数字键 1—4。</p>

          <OptionList options={options} selected={selected} answer={movie.title} onSelect={selectOption} />

          {answered && <div className="single-answer-feedback">
            <div className={`answer-status ${correct ? 'correct' : 'wrong'}`}>
              <span>{correct ? '✓' : '×'}</span>
              <div><small>{correct ? '识别正确 · +1' : '识别未命中'}</small><strong>{correct ? '你的电影记忆很准确' : `正确答案是《${movie.title}》`}</strong></div>
            </div>
            <p className="movie-synopsis">{movie.synopsis}</p>
            <div className="fact-line"><span>{movie.year}</span><span>{movie.region}</span><span>{movie.genres.join(' · ')}</span>{movie.rating !== undefined && <span>TMDB {movie.rating.toFixed(1)}</span>}</div>
            <button className="primary-button next-button" onClick={finish}>{session.currentIndex + 1 === session.mode ? '查看我的段位' : '下一部电影'} <span>→</span></button>
          </div>}
        </section>
      </div>

      <footer className="quiz-footer"><span>QUESTION {session.currentIndex + 1} / {session.mode}</span>{movie.source === 'tmdb' ? <TmdbAttribution compact /> : <span>ESC 返回首页 · 1—4 选择答案</span>}</footer>
    </main>
  )
}

function OptionList({ options, selected, answer, onSelect }: { options: string[]; selected: string | null; answer: string; onSelect: (option: string) => void }) {
  return <div className="option-list">{options.map((option, index) => {
    const className = selected ? option === answer ? 'option-correct' : option === selected ? 'option-wrong' : 'option-muted' : ''
    return <button className={className} key={option} onClick={() => onSelect(option)} disabled={selected !== null}>
      <kbd>{index + 1}</kbd><span>{option}</span><i aria-hidden="true">↗</i>
    </button>
  })}</div>
}
