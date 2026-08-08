import type { Category, PlayerLevel, TestMode } from '../types'
import { categories } from '../utils/quiz'

interface Props {
  mode: TestMode
  category: Category
  playerLevel: PlayerLevel
  onCategoryChange: (category: Category) => void
  onSelectPlayerLevel: (level: PlayerLevel) => void
  onBack: () => void
}

const levels: Array<{
  value: PlayerLevel
  index: string
  eyebrow: string
  description: string
  profile: string
}> = [
  {
    value: '入门菜鸟',
    index: '01',
    eyebrow: '大众经典 · 高辨识度',
    description: '从公认经典和热门佳作开始，但错误选项仍会来自相近类型与年代。',
    profile: '适合刚开始建立阅片坐标的人',
  },
  {
    value: '略知一二',
    index: '02',
    eyebrow: '口碑佳作 · 类型迷阵',
    description: '降低商业大片占比，加入影展佳作、地区代表作与更相似的片名干扰。',
    profile: '适合稳定观影、熟悉多种类型的人',
  },
  {
    value: '阅片无数',
    index: '03',
    eyebrow: '低曝光杰作 · 深水片单',
    description: '优先抽取评价可靠但曝光较低的影片，选项集中于相近地区、年代与题材。',
    profile: '适合长期观影、主动探索冷门佳作的人',
  },
]

export function DifficultyScreen({
  mode,
  category,
  playerLevel,
  onCategoryChange,
  onSelectPlayerLevel,
  onBack,
}: Props) {
  return (
    <main className="difficulty-shell">
      <div className="difficulty-film-strip" aria-hidden="true"><span /><span /><span /><span /><span /><span /></div>
      <header className="difficulty-header">
        <button className="difficulty-logo" onClick={onBack}>光影鉴赏局<sup>®</sup></button>
        <div className="difficulty-progress"><span>01 题量</span><i /><strong>02 身份</strong><i /><span>03 开场</span></div>
        <button className="liquid-glass difficulty-back" onClick={onBack}>← 返回首页</button>
      </header>

      <section className="difficulty-content" aria-labelledby="difficulty-title">
        <div className="difficulty-title-block animate-fade-rise">
          <span>IDENTITY / DIFFICULTY PROFILE</span>
          <h1 id="difficulty-title">你认为自己是哪一种影迷？</h1>
          <p>已选择 <strong>{mode} 部电影</strong>。选择身份后将立即按对应难度实时生成片单与相似干扰项。</p>
        </div>

        <div className="difficulty-cards animate-fade-rise-delay" role="radiogroup" aria-label="选择测试难度">
          {levels.map((level) => (
            <button
              key={level.value}
              className={playerLevel === level.value ? 'selected' : ''}
              onClick={() => onSelectPlayerLevel(level.value)}
              role="radio"
              aria-checked={playerLevel === level.value}
            >
              <span className="difficulty-card-index">{level.index}</span>
              <small>{level.eyebrow}</small>
              <h2>{level.value}</h2>
              <p>{level.description}</p>
              <em>{level.profile}</em>
              <i className="difficulty-radio" aria-hidden="true" />
            </button>
          ))}
        </div>

        <div className="difficulty-launch liquid-glass animate-fade-rise-delay-2">
          <div>
            <label htmlFor="difficulty-category">本场电影类型</label>
            <select id="difficulty-category" value={category} onChange={(event) => onCategoryChange(event.target.value as Category)}>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <p><span>点击上方身份后立即出题</span><strong>{category} · {mode} 题</strong></p>
          <div className="difficulty-live-note"><i /><span>TMDB LIVE</span><small>按身份实时筛选</small></div>
        </div>
      </section>

      <footer className="difficulty-footer"><span>难度只改变题库，不改变每题分值</span><span>看过不算，记得才算。</span></footer>
    </main>
  )
}
