import { TmdbAttribution } from './TmdbAttribution'
import type { Category, TestMode } from '../types'

export function DatabaseLoading({ mode, category }: { mode: TestMode; category: Category }) {
  return <main className="database-loading">
    <div className="loading-reel"><span /><span /><span /><span /></div>
    <span className="section-index">SYNCING LIVE DATABASE</span>
    <h1>正在编排<br />你的实时片单</h1>
    <p>从 TMDB 获取 {category} · {mode} 部电影的最新海报、简介、演职员与评分。</p>
    <div className="loading-steps"><span>发现片单</span><span>同步详情</span><span>生成题目</span></div>
    <TmdbAttribution />
  </main>
}
