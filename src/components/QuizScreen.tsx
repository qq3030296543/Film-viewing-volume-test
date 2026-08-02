import { useEffect, useMemo, useState } from 'react'
import type { AnswerRecord, Movie, QuizSession } from '../types'
import { makeAnswer, shuffledOptions } from '../utils/quiz'
import { PosterCard } from './PosterCard'
import { ProgressBar } from './ProgressBar'
import { TmdbAttribution } from './TmdbAttribution'

interface Props {
  session: QuizSession
  onAnswer: (answer: AnswerRecord) => void
  onExit: () => void
}

type Stage = 'recognition' | 'recognition-wrong' | 'verification' | 'verification-result'

export function QuizScreen({ session, onAnswer, onExit }: Props) {
  const movie = session.movies[session.currentIndex]
  const [stage, setStage] = useState<Stage>('recognition')
  const [selected, setSelected] = useState<string | null>(null)
  const [verificationCorrect, setVerificationCorrect] = useState(false)
  const [skipped, setSkipped] = useState(false)
  const recognitionOptions = useMemo(() => shuffledOptions([movie.title, ...movie.recognitionDistractors]), [movie.id])
  const verificationOptions = useMemo(() => shuffledOptions(movie.options), [movie.id])

  const revealed = stage !== 'recognition'
  const isVerification = stage === 'verification' || stage === 'verification-result'

  const selectRecognition = (option: string) => {
    if (stage !== 'recognition') return
    setSelected(option)
    setStage(option === movie.title ? 'verification' : 'recognition-wrong')
  }

  const selectVerification = (option: string) => {
    if (stage !== 'verification') return
    setSelected(option)
    setSkipped(option === '没看过 / 记不清了')
    setVerificationCorrect(option === movie.answer)
    setStage('verification-result')
  }

  const finish = () => {
    const recognized = stage !== 'recognition-wrong'
    onAnswer(makeAnswer(movie, recognized, recognized && verificationCorrect, skipped))
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const digit = Number(event.key)
      if (digit < 1 || digit > 4) return
      const options = stage === 'recognition' ? recognitionOptions : stage === 'verification' ? verificationOptions : []
      const option = options[digit - 1]
      if (!option) return
      if (stage === 'recognition') selectRecognition(option)
      if (stage === 'verification') selectVerification(option)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  return (
    <main className="quiz-shell">
      <header className="quiz-header">
        <button className="brand-button" onClick={onExit} aria-label="返回首页"><span>◉</span> 光影鉴赏局</button>
        <ProgressBar current={session.currentIndex + 1} total={session.mode} />
        <div className="streak-pill"><span>✦</span> 连胜 <strong>{session.currentStreak}</strong></div>
      </header>

      <div className="quiz-layout">
        <PosterCard movie={movie} revealed={revealed} />

        <section className="question-panel">
          <div className="question-kicker">
            <span>{isVerification ? 'STEP 02 · 阅片验证' : 'STEP 01 · 看图识片'}</span>
            <span className={`difficulty ${movie.difficulty}`}>{movie.difficulty}</span>
          </div>

          {stage === 'recognition' && <>
            <h1>这张海报来自哪部电影？</h1>
            <p className="question-lead">凭第一印象作答。你也可以按键盘数字 1—4 快速选择。</p>
            <OptionList options={recognitionOptions} onSelect={selectRecognition} />
          </>}

          {stage === 'recognition-wrong' && <>
            <div className="answer-status wrong"><span>×</span><div><small>识别未命中</small><strong>正确答案是《{movie.title}》</strong></div></div>
            <p className="movie-synopsis">{movie.synopsis}</p>
            <div className="fact-line"><span>{movie.year}</span><span>{movie.region}</span><span>{movie.genres.join(' · ')}</span>{movie.rating !== undefined && <span>TMDB {movie.rating.toFixed(1)}</span>}</div>
            <p className="explain-note">本题不进入内容验证。下一部也许正是你的熟悉领域。</p>
            <button className="primary-button next-button" onClick={finish}>下一部电影 <span>→</span></button>
          </>}

          {stage === 'verification' && <>
            <div className="identified-line"><span>✓ 识别正确 · +1</span><p>{movie.synopsis}</p></div>
            <div className="verification-title">
              <h1>{movie.question}</h1>
              {movie.spoiler && <span className="spoiler-badge">含剧透</span>}
            </div>
            <p className="question-lead">再答对这一题，才能证明它真的留在你的记忆里。</p>
            <OptionList options={verificationOptions} onSelect={selectVerification} />
            <button className="skip-button" onClick={() => selectVerification('没看过 / 记不清了')}>没看过 / 记不清了</button>
          </>}

          {stage === 'verification-result' && <>
            <div className={`answer-status ${verificationCorrect ? 'correct' : 'wrong'}`}>
              <span>{verificationCorrect ? '✓' : '×'}</span>
              <div><small>{verificationCorrect ? '验证通过 · +2' : skipped ? '诚实作答' : '记忆有些模糊'}</small><strong>{verificationCorrect ? '这部电影确实被你记住了' : `正确答案：${movie.answer}`}</strong></div>
            </div>
            <div className="explanation-card"><small>答案解析</small><p>{movie.explanation}</p></div>
            <button className="primary-button next-button" onClick={finish}>
              {session.currentIndex + 1 === session.mode ? '查看我的段位' : '下一部电影'} <span>→</span>
            </button>
          </>}
        </section>
      </div>

      <footer className="quiz-footer"><span>QUESTION {session.currentIndex + 1} / {session.mode}</span>{movie.source === 'tmdb' ? <TmdbAttribution compact /> : <span>ESC 返回首页 · 1—4 选择答案</span>}</footer>
    </main>
  )
}

function OptionList({ options, onSelect }: { options: string[]; onSelect: (option: string) => void }) {
  return <div className="option-list">{options.map((option, index) => (
    <button key={option} onClick={() => onSelect(option)}>
      <kbd>{index + 1}</kbd><span>{option}</span><i aria-hidden="true">↗</i>
    </button>
  ))}</div>
}
