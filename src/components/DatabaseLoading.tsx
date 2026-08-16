import type { Category, PlayerLevel, TestMode } from '../types'
import { TmdbAttribution } from './TmdbAttribution'
import { categoryLabel, levelLabel, useLanguage } from '../i18n'
import { LanguageSwitch } from './LanguageSwitch'

export function DatabaseLoading({ mode, category, playerLevel }: { mode: TestMode; category: Category; playerLevel: PlayerLevel }) {
  const { language } = useLanguage()
  const en = language === 'en'
  return (
    <main className="database-loading cinematic-database-loading">
      <div className="loading-language"><LanguageSwitch /></div>
      <div className="loading-reel"><span /><span /><span /><span /></div>
      <span className="section-index">SYNCING LIVE DATABASE</span>
      <h1>{en ? <>Curating your<br />live film selection</> : <>正在编排<br />你的实时片单</>}</h1>
      <p>{en
        ? `Building a ${mode}-film ${categoryLabel(category, language)} test from TMDB for the ${levelLabel(playerLevel, language)} identity.`
        : `按「${levelLabel(playerLevel, language)}」标准，从 TMDB 获取 ${categoryLabel(category, language)} · ${mode} 部电影的最新画面与资料。`}</p>
      <div className="loading-steps"><span>{en ? 'Balancing eras' : '筛选知名度'}</span><span>{en ? 'Syncing artwork' : '同步画面'}</span><span>{en ? 'Building distractors' : '生成相似选项'}</span></div>
      <TmdbAttribution />
    </main>
  )
}
