import { movies } from '../data/movies'
import type { Category, QuizResult, TestMode } from '../types'
import { categories } from '../utils/quiz'

interface Props {
  mode: TestMode
  category: Category
  bestResult?: QuizResult
  historyCount: number
  hasActiveQuiz: boolean
  onModeChange: (mode: TestMode) => void
  onCategoryChange: (category: Category) => void
  onStart: () => void
  onResume: () => void
}

const modes: { value: TestMode; label: string; note: string; duration: string }[] = [
  { value: 10, label: '快速试映', note: '10 部电影', duration: '约 2 分钟' },
  { value: 20, label: '标准场', note: '20 部电影', duration: '约 5 分钟' },
  { value: 30, label: '导演剪辑版', note: '30 部电影', duration: '约 8 分钟' },
]

const wallMovies = movies.slice(0, 12)

export function HomeScreen({ mode, category, bestResult, historyCount, hasActiveQuiz, onModeChange, onCategoryChange, onStart, onResume }: Props) {
  return (
    <main className="home-shell cyber-home">
      <div className="cyber-grid" aria-hidden="true" />
      <div className="cyber-scanline" aria-hidden="true" />
      <div className="cyber-poster-wall" aria-hidden="true">
        {wallMovies.map((movie, index) => (
          <div className={`wall-poster wall-poster-${index + 1}`} key={movie.id}>
            <img src={movie.imageUrl} alt="" onError={(event) => { event.currentTarget.parentElement?.classList.add('image-missing') }} />
          </div>
        ))}
      </div>

      <section className="hero">
        <div className="hero-kicker"><span className="live-dot" /> CINE MEMORY // ONLINE</div>
        <h1 className="cyber-title" aria-label="光影鉴赏局">
          <span data-text="光影">光影</span>
          <em data-text="鉴赏局">鉴赏局</em>
        </h1>
        <p className="hero-copy">一张画面，四个片名。<br /><strong>看看你的电影记忆能走多远。</strong></p>
        <div className="hero-stats" aria-label="测试信息">
          <div><strong>01</strong><span>单阶段识片</span></div>
          <div><strong>10</strong><span>电影类型</span></div>
          <div><strong>∞</strong><span>实时片库</span></div>
        </div>
      </section>

      <section className="ticket-panel" aria-labelledby="config-title">
        <div className="ticket-top">
          <div>
            <span className="section-index">01 / TEST CONFIG</span>
            <h2 id="config-title">选择你的测试场次</h2>
          </div>
          <span className="ticket-code">CINE—MEMORY<br />READY // 01</span>
        </div>

        <div className="config-block">
          <label className="config-label">测试长度</label>
          <div className="mode-grid">
            {modes.map((item) => (
              <button className={`mode-card ${mode === item.value ? 'selected' : ''}`} key={item.value} onClick={() => onModeChange(item.value)} aria-pressed={mode === item.value}>
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
              <button key={item} className={category === item ? 'active' : ''} onClick={() => onCategoryChange(item)} aria-pressed={category === item}>{item}</button>
            ))}
          </div>
        </div>

        {hasActiveQuiz && <div className="resume-notice"><span>检测到未完成测试</span><button onClick={onResume}>继续上次进度 →</button></div>}

        <div className="start-row">
          <button className="primary-button start-button" onClick={onStart}><span>{hasActiveQuiz ? '重新开始测试' : '开始测试'}</span><span aria-hidden="true">→</span></button>
          <p>无需登录 · 无需输入 API · 成绩仅保存在当前浏览器</p>
        </div>
      </section>

      <aside className="best-card">
        <span>PERSONAL RECORD</span>
        {bestResult ? <p>历史最佳 {bestResult.score} 分 · 已完成 {historyCount} 场</p> : <p>完成首场测试后点亮记录</p>}
      </aside>
    </main>
  )
}
