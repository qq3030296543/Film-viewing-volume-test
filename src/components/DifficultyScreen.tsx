import type { Category, PlayerLevel, TestMode } from '../types'
import { categories } from '../utils/quiz'
import { categoryLabel, levelLabel, useLanguage } from '../i18n'
import { LanguageSwitch } from './LanguageSwitch'

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
  eyebrowEn: string
  descriptionEn: string
  profileEn: string
}> = [
  {
    value: '入门菜鸟',
    index: '01',
    eyebrow: '大众经典 · 高辨识度',
    description: '从公认经典和热门佳作开始，但错误选项仍会来自相近类型与年代。',
    profile: '适合刚开始建立阅片坐标的人',
    eyebrowEn: 'POPULAR CLASSICS · HIGH RECOGNITION',
    descriptionEn: 'Start with acclaimed classics and popular favorites, with distractors drawn from similar eras and genres.',
    profileEn: 'For viewers beginning to map the world of cinema',
  },
  {
    value: '略知一二',
    index: '02',
    eyebrow: '口碑佳作 · 类型迷阵',
    description: '降低商业大片占比，加入影展佳作、地区代表作与更相似的片名干扰。',
    profile: '适合稳定观影、熟悉多种类型的人',
    eyebrowEn: 'ACCLAIMED FILMS · CLOSE DISTRACTORS',
    descriptionEn: 'Fewer blockbusters, more festival favorites and regional standouts, with more convincing title choices.',
    profileEn: 'For regular viewers familiar with several genres',
  },
  {
    value: '阅片无数',
    index: '03',
    eyebrow: '低曝光杰作 · 深水片单',
    description: '优先抽取评价可靠但曝光较低的影片，选项集中于相近地区、年代与题材。',
    profile: '适合长期观影、主动探索冷门佳作的人',
    eyebrowEn: 'DEEP CUTS · CINEMA HISTORY',
    descriptionEn: 'Explore respected films across cinema history, with choices matched by region, era and subject.',
    profileEn: 'For long-term viewers who actively explore cinema',
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
  const { language } = useLanguage()
  const en = language === 'en'
  return (
    <main className="difficulty-shell">
      <div className="difficulty-film-strip" aria-hidden="true"><span /><span /><span /><span /><span /><span /></div>
      <header className="difficulty-header">
        <button className="difficulty-logo" onClick={onBack}>{en ? 'Cine Memory Bureau' : '光影鉴赏局'}<sup>®</sup></button>
        <div className="difficulty-progress"><span>01 {en ? 'LENGTH' : '题量'}</span><i /><strong>02 {en ? 'IDENTITY' : '身份'}</strong><i /><span>03 {en ? 'BEGIN' : '开场'}</span></div>
        <div className="difficulty-header-actions"><LanguageSwitch compact /><button className="liquid-glass difficulty-back" onClick={onBack}>← {en ? 'Home' : '返回首页'}</button></div>
      </header>

      <section className="difficulty-content" aria-labelledby="difficulty-title">
        <div className="difficulty-title-block animate-fade-rise">
          <span>IDENTITY / DIFFICULTY PROFILE</span>
          <h1 id="difficulty-title">{en ? 'What kind of film lover are you?' : '你认为自己是哪一种影迷？'}</h1>
          <p>{en ? <>You selected <strong>{mode} films</strong>. Choose an identity to generate a live selection with difficulty-matched distractors.</> : <>已选择 <strong>{mode} 部电影</strong>。选择身份后将立即按对应难度实时生成片单与相似干扰项。</>}</p>
        </div>

        <div className="difficulty-cards animate-fade-rise-delay" role="radiogroup" aria-label={en ? 'Choose test difficulty' : '选择测试难度'}>
          {levels.map((level) => (
            <button
              key={level.value}
              className={playerLevel === level.value ? 'selected' : ''}
              onClick={() => onSelectPlayerLevel(level.value)}
              role="radio"
              aria-checked={playerLevel === level.value}
            >
              <span className="difficulty-card-index">{level.index}</span>
              <small>{en ? level.eyebrowEn : level.eyebrow}</small>
              <h2>{levelLabel(level.value, language)}</h2>
              <p>{en ? level.descriptionEn : level.description}</p>
              <em>{en ? level.profileEn : level.profile}</em>
              <i className="difficulty-radio" aria-hidden="true" />
            </button>
          ))}
        </div>

        <div className="difficulty-launch liquid-glass animate-fade-rise-delay-2">
          <div>
            <label htmlFor="difficulty-category">{en ? 'FILM CATEGORY' : '本场电影类型'}</label>
            <select id="difficulty-category" value={category} onChange={(event) => onCategoryChange(event.target.value as Category)}>
              {categories.map((item) => <option key={item} value={item}>{categoryLabel(item, language)}</option>)}
            </select>
          </div>
          <p><span>{en ? 'SELECT AN IDENTITY TO BEGIN' : '点击上方身份后立即出题'}</span><strong>{categoryLabel(category, language)} · {mode} {en ? 'QUESTIONS' : '题'}</strong></p>
          <div className="difficulty-live-note"><i /><span>TMDB LIVE</span><small>{en ? 'Filtered by identity' : '按身份实时筛选'}</small></div>
        </div>
      </section>

      <footer className="difficulty-footer"><span>{en ? 'Difficulty changes the selection, not the points per question' : '难度只改变题库，不改变每题分值'}</span><span>{en ? 'Seeing is easy. Remembering is the test.' : '看过不算，记得才算。'}</span></footer>
    </main>
  )
}
