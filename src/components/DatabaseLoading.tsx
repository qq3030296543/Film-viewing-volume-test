import type { Category, PlayerLevel, TestMode } from '../types'
import { TmdbAttribution } from './TmdbAttribution'

export function DatabaseLoading({ mode, category, playerLevel }: { mode: TestMode; category: Category; playerLevel: PlayerLevel }) {
  return (
    <main className="database-loading cinematic-database-loading">
      <div className="loading-reel"><span /><span /><span /><span /></div>
      <span className="section-index">SYNCING LIVE DATABASE</span>
      <h1>正在编排<br />你的实时片单</h1>
      <p>按「{playerLevel}」标准，从 TMDB 获取 {category} · {mode} 部电影的最新画面与资料。</p>
      <div className="loading-steps"><span>筛选知名度</span><span>同步画面</span><span>生成相似选项</span></div>
      <TmdbAttribution />
    </main>
  )
}
