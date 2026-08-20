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
import { localTmdbMovieIds } from '../data/movies'

interface Props {
  session: QuizSession
  onAnswer: (answer: AnswerRecord) => void
  onExit: () => void
  onDiscard: () => void
  onRestart: () => void
}

type QuizOptionKey = 'answer' | `distractor-${number}`

interface QuizOption {
  key: QuizOptionKey
  label: string
}

const firstNonBlank = (...values: Array<string | null | undefined>) =>
  values.find((value) => value?.trim())?.trim() ?? ''

const clarifyMinimalTitle = (title: string, alternateTitle: string, en: boolean) => {
  if (en || !/^[一丨｜—–\-·・\s]{1,4}$/.test(title)) return title
  const alternate = alternateTitle.trim()
  return alternate && alternate !== title ? `${title}（${alternate}）` : title
}

export function QuizScreen({ session, onAnswer, onExit, onDiscard, onRestart }: Props) {
  const { language } = useLanguage()
  const en = language === 'en'
  const movie = session.movies[session.currentIndex]
  const [selectedKey, setSelectedKey] = useState<QuizOptionKey | null>(null)
  const [confirmAction, setConfirmAction] = useState<'exit' | 'restart' | null>(null)
  const answerTitle = en
    ? firstNonBlank(movie.localizedTitles?.en, movie.originalTitle, movie.title, movie.localizedTitles?.zh)
    : firstNonBlank(movie.localizedTitles?.zh, movie.title, movie.originalTitle, movie.localizedTitles?.en)
  const localizedDistractors = movie.localizedDistractors?.[language] ?? movie.recognitionDistractors
  const alternateDistractors = movie.localizedDistractors?.[en ? 'zh' : 'en'] ?? []
  const synopsis = movie.localizedSynopses?.[language] ?? movie.synopsis
  const optionOrder = useMemo(
    () => shuffledOptions<QuizOptionKey>(['answer', 'distractor-0', 'distractor-1', 'distractor-2']),
    [movie.id],
  )
  const options = useMemo<QuizOption[]>(
    () => optionOrder.map((key) => {
      if (key === 'answer') {
        return {
          key,
          label: clarifyMinimalTitle(
            answerTitle,
            firstNonBlank(movie.localizedTitles?.en, movie.originalTitle),
            en,
          ),
        }
      }
      const distractorIndex = Number(key.replace('distractor-', ''))
      const alternateTitle = firstNonBlank(alternateDistractors[distractorIndex])
      const title = firstNonBlank(
        localizedDistractors[distractorIndex],
        alternateTitle,
        movie.recognitionDistractors[distractorIndex],
        en ? `Film option ${distractorIndex + 1}` : `电影选项 ${distractorIndex + 1}`,
      )
      return {
        key,
        label: clarifyMinimalTitle(title, alternateTitle, en),
      }
    }),
    [alternateDistractors, answerTitle, en, localizedDistractors, movie.localizedTitles, movie.originalTitle, movie.recognitionDistractors, optionOrder],
  )
  const ambientMovies = useMemo(
    () => session.movies.filter((item) => item.id !== movie.id).slice(0, 6),
    [movie.id, session.movies],
  )
  const answered = selectedKey !== null
  const correct = selectedKey === 'answer'
  const resolvedTmdbId = movie.tmdbId ?? localTmdbMovieIds[movie.id]
  const movieDetailsUrl = resolvedTmdbId
    ? `https://www.themoviedb.org/movie/${resolvedTmdbId}?language=${en ? 'en-US' : 'zh-CN'}`
    : undefined

  const selectOption = (optionKey: QuizOptionKey) => {
    if (!answered) setSelectedKey(optionKey)
  }

  const finish = () => {
    if (!selectedKey) return
    const selectedLabel = options.find((option) => option.key === selectedKey)?.label ?? ''
    onAnswer(makeAnswer(movie, correct, selectedLabel))
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setConfirmAction('exit'); return }
      const digit = Number(event.key)
      if (!answered && digit >= 1 && digit <= 4 && options[digit - 1]) selectOption(options[digit - 1].key)
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
        <button className="brand-button" onClick={() => setConfirmAction('exit')} aria-label={en ? 'Return home' : '返回首页'}>
          {en ? 'Cine Memory Bureau' : '光影鉴赏局'}<sup>®</sup>
        </button>
        <ProgressBar current={session.currentIndex + 1} total={session.mode} />
        <div className="quiz-header-actions">
          <LanguageSwitch compact />
          <button className="liquid-glass" onClick={() => setConfirmAction('exit')}>{en ? 'Home' : '返回首页'}</button>
          <button className="liquid-glass" onClick={() => setConfirmAction('restart')}>{en ? 'Restart' : '重新测试'}</button>
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

          <OptionList options={options} selectedKey={selectedKey} onSelect={selectOption} />

          {answered && (
            <div className="single-answer-feedback">
              <div className={`answer-status ${correct ? 'correct' : 'wrong'}`}>
                <span>{correct ? '✓' : '×'}</span>
                <div>
                  <small>{correct ? (en ? 'CORRECT · +1' : '识别正确 · +1') : (en ? 'NOT RECOGNIZED' : '识别未命中')}</small>
                  <strong>{correct ? (en ? 'Your cinema memory is sharp' : '你的电影记忆很准确') : (en ? `The correct answer is “${answerTitle}”` : `正确答案是《${answerTitle}》`)}</strong>
                </div>
              </div>
              <p className="movie-synopsis">{synopsis}</p>
              <div className="fact-line">
                <span>{movie.year}</span><span>{regionLabel(movie.region, language)}</span><span>{movie.genres.map((genre) => genreLabel(genre, language)).join(' · ')}</span>
                {movie.rating !== undefined && <span>TMDB {movie.rating.toFixed(1)}</span>}
              </div>
              {movieDetailsUrl && <a
                  className="movie-detail-link"
                  href={movieDetailsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={en ? `View ${answerTitle} on TMDB in a new tab` : `在 TMDB 查看《${answerTitle}》的电影资料（新标签页打开）`}
                >
                  <span><small>{en ? 'FILM DETAILS · OFFICIAL LINK' : '电影详细资料 · OFFICIAL LINK'}</small><strong>{en ? `View “${answerTitle}” on TMDB` : `在 TMDB 查看《${answerTitle}》`}</strong></span>
                  <em>themoviedb.org ↗</em>
                </a>}
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

      {confirmAction && <div className="modal-backdrop exit-confirm-backdrop" role="dialog" aria-modal="true" aria-labelledby="exit-confirm-title">
        <div className="exit-confirm-modal liquid-glass">
          <span className="section-index">CURRENT REEL · {String(session.currentIndex + 1).padStart(2, '0')} / {session.mode}</span>
          <h2 id="exit-confirm-title">{confirmAction === 'restart'
            ? (en ? 'Restart this screening?' : '要重新开始这场测试吗？')
            : (en ? 'Return to the home screen?' : '当前进度将保留，要返回首页吗？')}</h2>
          <p>{confirmAction === 'restart'
            ? (en ? 'Your completed answers are saved. Restarting will discard this unfinished session.' : '已完成的答题进度已经保存；重新测试会放弃本次未完成的场次。')
            : (en ? 'You can resume this test later, or discard it and start fresh.' : '稍后可以从首页继续，也可以放弃本次测试并重新开始。')}</p>
          <div className="exit-confirm-actions">
            <button className="primary-button" onClick={onExit}>{en ? 'Save & Return' : '保存并返回'}</button>
            <button className="danger-button" onClick={confirmAction === 'restart' ? onRestart : onDiscard}>
              {confirmAction === 'restart' ? (en ? 'Discard & Restart' : '放弃并重新测试') : (en ? 'Discard This Test' : '放弃本次测试')}
            </button>
            <button className="secondary-button" onClick={() => setConfirmAction(null)}>{en ? 'Keep Answering' : '继续答题'}</button>
          </div>
        </div>
      </div>}
    </main>
  )
}

function OptionList({ options, selectedKey, onSelect }: { options: QuizOption[]; selectedKey: QuizOptionKey | null; onSelect: (optionKey: QuizOptionKey) => void }) {
  return (
    <div className="option-list">
      {options.map((option, index) => {
        const className = selectedKey
          ? option.key === 'answer'
            ? 'option-correct'
            : option.key === selectedKey
              ? 'option-wrong'
              : 'option-muted'
          : ''
        return (
          <button className={className} key={option.key} onClick={() => onSelect(option.key)} disabled={selectedKey !== null}>
            <kbd>{index + 1}</kbd><span>{option.label}</span><i aria-hidden="true">→</i>
          </button>
        )
      })}
    </div>
  )
}
