import { categories } from '../utils/quiz'
import type { Category, QuizResult, TestMode } from '../types'

interface Props {
  mode: TestMode
  category: Category
  bestResult?: QuizResult
  historyCount: number
  hasActiveQuiz: boolean
  databaseStatus: 'offline' | 'checking' | 'connected' | 'error'
  databaseError?: string
  onModeChange: (mode: TestMode) => void
  onCategoryChange: (category: Category) => void
  onStart: () => void
  onResume: () => void
  onDatabaseSettings: () => void
  onStartOffline: () => void
}

const modes: { value: TestMode; label: string; note: string; duration: string }[] = [
  { value: 10, label: '快速试映', note: '10 部电影', duration: '约 3 分钟' },
  { value: 20, label: '标准场', note: '20 部电影', duration: '约 7 分钟' },
  { value: 30, label: '导演剪辑版', note: '30 部电影', duration: '约 12 分钟' },
]

export function HomeScreen({ mode, category, bestResult, historyCount, hasActiveQuiz, databaseStatus, databaseError, onModeChange, onCategoryChange, onStart, onResume, onDatabaseSettings, onStartOffline }: Props) {
  return (
    <main className="home-shell">
      <section className="hero">
        <div className="hero-kicker"><span className="live-dot" /> NOW TESTING · 你的电影记忆</div>
        <h1>光影<br /><em>鉴赏局</em></h1>
        <p className="hero-copy">看过不算，<strong>记得才算。</strong><br />从一帧画面出发，看看多少电影真正留在了你心里。</p>
        <div className="hero-stats" aria-label="题库信息">
          <div><strong>30</strong><span>精选影片</span></div>
          <div><strong>3</strong><span>地区电影</span></div>
          <div><strong>10</strong><span>测试类别</span></div>
        </div>
      </section>

      <section className="ticket-panel" aria-labelledby="config-title">
        <div className="ticket-top">
          <div>
            <span className="section-index">01 / 入场设置</span>
            <h2 id="config-title">选择你的场次</h2>
          </div>
          <span className="ticket-code">CINE—MEMORY<br />ADMIT ONE</span>
        </div>

        <div className="config-block">
          <label className="config-label">测试长度</label>
          <div className="mode-grid">
            {modes.map((item) => (
              <button
                className={`mode-card ${mode === item.value ? 'selected' : ''}`}
                key={item.value}
                onClick={() => onModeChange(item.value)}
                aria-pressed={mode === item.value}
              >
                <span className="mode-radio" />
                <strong>{item.label}</strong>
                <span>{item.note}</span>
                <small>{item.duration}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="config-block">
          <label className="config-label">偏好片单</label>
          <div className="category-list">
            {categories.map((item) => (
              <button
                key={item}
                className={category === item ? 'active' : ''}
                onClick={() => onCategoryChange(item)}
                aria-pressed={category === item}
              >
                {item}
              </button>
            ))}
          </div>
          {category !== '综合' && <p className="category-hint">优先抽取「{category}」，题量不足时将补充其他经典影片。</p>}
        </div>

        <div className={`data-source-bar ${databaseStatus}`}>
          <span className="source-pulse" />
          <div>
            <strong>{databaseStatus === 'connected' ? 'TMDB 实时数据库已连接' : databaseStatus === 'checking' ? '正在检测 TMDB 连接' : databaseStatus === 'error' ? 'TMDB 连接异常' : '当前使用本地示例题库'}</strong>
            <small>{databaseStatus === 'connected' ? '每场测试开始时同步最新电影、图片与演职员资料' : databaseError || '连接后可从真实数据库动态生成片单与题目'}</small>
          </div>
          <button onClick={onDatabaseSettings}>{databaseStatus === 'connected' ? '管理' : '立即连接'}</button>
        </div>

        <div className="start-row">
          <button className="primary-button start-button" onClick={onStart}>
            <span>{databaseStatus === 'connected' ? '开始实时测试' : '连接并开始'}</span><span aria-hidden="true">→</span>
          </button>
          {hasActiveQuiz && <button className="text-button" onClick={onResume}>继续上次测试</button>}
          {databaseStatus !== 'connected' && <button className="text-button offline-button" onClick={onStartOffline}>使用本地题库体验</button>}
          <p>无需登录 · 成绩仅保存在当前浏览器</p>
        </div>
      </section>

      <aside className="best-card">
        <span>个人放映记录</span>
        {bestResult ? (
          <>
            <strong>{bestResult.score}<small> / 100</small></strong>
            <p>历史最佳 · 已完成 {historyCount} 场</p>
          </>
        ) : (
          <>
            <strong>—<small> / 100</small></strong>
            <p>完成首场测试后点亮记录</p>
          </>
        )}
      </aside>

      <div className="hero-orbit orbit-one" />
      <div className="hero-orbit orbit-two" />
    </main>
  )
}
