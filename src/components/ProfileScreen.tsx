import { useMemo } from 'react'
import type { QuizResult } from '../types'
import { genreLabel, levelLabel, regionLabel, useLanguage } from '../i18n'
import { getViewingProfile } from '../utils/performance'
import { LanguageSwitch } from './LanguageSwitch'

interface Props {
  history: QuizResult[]
  onBack: () => void
  onStartTest: () => void
}

const eraTranslation: Record<string, string> = {
  '未知年代': 'Unknown era',
  '1960 年以前': 'Before 1960',
  '1960—1979': '1960—1979',
  '1980—1999': '1980—1999',
  '2000—2014': '2000—2014',
  '2015 至今': '2015—present',
}

export function ProfileScreen({ history, onBack, onStartTest }: Props) {
  const { language } = useLanguage()
  const en = language === 'en'
  const profile = useMemo(() => getViewingProfile(history), [history])
  const localizeRegion = (value?: string) => value ? regionLabel(value as '华语' | '欧美' | '日韩', language) : (en ? 'Not enough data' : '数据不足')
  const localizeEra = (value?: string) => value ? (en ? eraTranslation[value] ?? value : value) : (en ? 'Not enough data' : '数据不足')
  const localizeGenre = (value?: string) => value ? genreLabel(value, language) : (en ? 'Not enough data' : '数据不足')
  const trendPoints = profile.trend.map((item, index) => {
    const x = profile.trend.length <= 1 ? 50 : (index / (profile.trend.length - 1)) * 100
    const y = 100 - item.score
    return `${x},${y}`
  }).join(' ')

  return (
    <main className="profile-shell">
      <header className="profile-header">
        <button className="brand-button" onClick={onBack}>{en ? 'Cine Memory Bureau' : '光影鉴赏局'}<sup>®</sup></button>
        <div><LanguageSwitch compact /><button className="liquid-glass" onClick={onBack}>{en ? 'Home' : '返回首页'}</button></div>
      </header>

      <section className="profile-hero">
        <span className="section-index">PERSONAL CINEMA ARCHIVE · LOCAL PROFILE</span>
        <h1>{en ? 'Your cinema memory, accumulated over time.' : '你的阅片档案，正在被每次测试慢慢写成。'}</h1>
        <p>{en ? 'This profile is calculated only from test history stored in this browser.' : '档案仅根据当前浏览器保存的真实答题记录生成，不上传个人数据。'}</p>
        <button className="primary-button" onClick={onStartTest}>{en ? 'Start Another Test' : '继续积累档案'} <span>→</span></button>
      </section>

      <section className="profile-summary-grid">
        <article><small>{en ? 'IDENTIFIED FILMS' : '已识别电影'}</small><strong>{profile.recognizedMovieCount}</strong><span>{en ? `${profile.correct} correct answers` : `累计答对 ${profile.correct} 次`}</span></article>
        <article><small>{en ? 'HISTORICAL ACCURACY' : '历史正确率'}</small><strong>{profile.accuracy}<i>%</i></strong><span>{en ? `${profile.attempts} total answers` : `共完成 ${profile.attempts} 次作答`}</span></article>
        <article><small>{en ? 'HIGHEST IDENTITY' : '历史最高难度'}</small><strong className="profile-text-value">{profile.highestLevel ? levelLabel(profile.highestLevel, language) : (en ? 'Not started' : '尚未开始')}</strong><span>{en ? `${history.length} completed tests` : `已完成 ${history.length} 场测试`}</span></article>
      </section>

      <section className="profile-grid">
        <article className="profile-card profile-strength-card">
          <div className="card-heading"><span className="section-index">01 / {en ? 'STRENGTHS' : '能力画像'}</span><h2>{en ? 'What You Remember Best' : '你最擅长记住什么'}</h2></div>
          <div className="profile-strength-list">
            <div><small>{en ? 'Region' : '擅长地区'}</small><strong>{localizeRegion(profile.strongestRegion?.label)}</strong><span>{profile.strongestRegion?.accuracy ?? 0}%</span></div>
            <div><small>{en ? 'Era' : '擅长年代'}</small><strong>{localizeEra(profile.strongestEra?.label)}</strong><span>{profile.strongestEra?.accuracy ?? 0}%</span></div>
            <div><small>{en ? 'Genre' : '擅长类型'}</small><strong>{localizeGenre(profile.strongestGenre?.label)}</strong><span>{profile.strongestGenre?.accuracy ?? 0}%</span></div>
            <div className="profile-weakness"><small>{en ? 'Most missed' : '最容易失误'}</small><strong>{localizeGenre(profile.weakestGenre?.label)}</strong><span>{profile.weakestGenre?.accuracy ?? 0}%</span></div>
          </div>
        </article>

        <article className="profile-card profile-trend-card">
          <div className="card-heading"><span className="section-index">02 / {en ? 'TREND' : '能力趋势'}</span><h2>{en ? 'Recent Test Scores' : '最近的阅片能力变化'}</h2></div>
          {profile.trend.length ? <>
            <div className="profile-trend-chart">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={en ? 'Recent score trend' : '最近成绩趋势'}>
                <line x1="0" y1="25" x2="100" y2="25" /><line x1="0" y1="50" x2="100" y2="50" /><line x1="0" y1="75" x2="100" y2="75" />
                <polyline points={trendPoints} />
                {profile.trend.map((item, index) => {
                  const x = profile.trend.length <= 1 ? 50 : (index / (profile.trend.length - 1)) * 100
                  return <circle key={`${item.completedAt}-${index}`} cx={x} cy={100 - item.score} r="2.2" />
                })}
              </svg>
              <div><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
            </div>
            <p>{en ? 'Scores are shown chronologically for the latest 12 completed tests.' : '按时间顺序展示最近 12 场已完成测试的成绩。'}</p>
          </> : <div className="profile-empty">{en ? 'Complete your first test to reveal a trend.' : '完成第一场测试后，这里会出现你的能力趋势。'}</div>}
        </article>

        <article className="profile-card profile-detail-card">
          <div className="card-heading"><span className="section-index">03 / {en ? 'GENRE DETAIL' : '类型明细'}</span><h2>{en ? 'Accuracy by Genre' : '不同类型的历史表现'}</h2></div>
          <div className="profile-bars">
            {profile.genreMetrics.slice(0, 8).map((metric) => <div key={metric.label}><span>{genreLabel(metric.label, language)}</span><div><i style={{ width: `${metric.accuracy}%` }} /></div><strong>{metric.accuracy}%</strong><small>{metric.attempts}</small></div>)}
            {!profile.genreMetrics.length && <div className="profile-empty">{en ? 'No genre data yet.' : '暂时还没有类型数据。'}</div>}
          </div>
        </article>
      </section>
    </main>
  )
}
