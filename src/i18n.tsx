import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Category, Difficulty, Language, Movie, PlayerLevel } from './types'

const LANGUAGE_STORAGE_KEY = 'cine-language-v1'

const categoryLabels: Record<Category, Record<Language, string>> = {
  综合: { zh: '综合', en: 'All films' },
  华语电影: { zh: '华语电影', en: 'Chinese-language' },
  欧美电影: { zh: '欧美电影', en: 'Western cinema' },
  日韩电影: { zh: '日韩电影', en: 'Japanese & Korean' },
  动画电影: { zh: '动画电影', en: 'Animation' },
  科幻: { zh: '科幻', en: 'Science fiction' },
  悬疑: { zh: '悬疑', en: 'Mystery' },
  恐怖: { zh: '恐怖', en: 'Horror' },
  喜剧: { zh: '喜剧', en: 'Comedy' },
  文艺经典: { zh: '文艺经典', en: 'Arthouse classics' },
}

const levelLabels: Record<PlayerLevel, Record<Language, string>> = {
  入门菜鸟: { zh: '入门菜鸟', en: 'Cinema Rookie' },
  略知一二: { zh: '略知一二', en: 'Seasoned Viewer' },
  阅片无数: { zh: '阅片无数', en: 'Cinephile' },
}

const difficultyLabels: Record<Difficulty, Record<Language, string>> = {
  入门: { zh: '入门', en: 'Accessible' },
  进阶: { zh: '进阶', en: 'Advanced' },
  资深: { zh: '资深', en: 'Expert' },
}

const regionLabels: Record<Movie['region'], Record<Language, string>> = {
  华语: { zh: '华语', en: 'Chinese-language' },
  欧美: { zh: '欧美', en: 'Western' },
  日韩: { zh: '日韩', en: 'Japan & Korea' },
}

const genreLabels: Record<string, string> = {
  综合: 'All films',
  剧情: 'Drama',
  科幻: 'Science Fiction',
  悬疑: 'Mystery',
  动画: 'Animation',
  喜剧: 'Comedy',
  恐怖: 'Horror',
  动作: 'Action',
  冒险: 'Adventure',
  奇幻: 'Fantasy',
  历史: 'History',
  惊悚: 'Thriller',
  犯罪: 'Crime',
  纪录片: 'Documentary',
  音乐: 'Music',
  爱情: 'Romance',
  家庭: 'Family',
  文艺经典: 'Arthouse Classic',
}

interface LanguageContextValue {
  language: Language
  setLanguage: (language: Language) => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function readInitialLanguage(): Language {
  try {
    const requested = new URLSearchParams(window.location.search).get('lang')
    if (requested === 'zh' || requested === 'en') return requested
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return stored === 'en' ? 'en' : 'zh'
  } catch {
    return 'zh'
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(readInitialLanguage)

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
    document.title = language === 'zh' ? '光影鉴赏局' : 'Cine Memory Bureau'
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, language) } catch { /* private browsing */ }
  }, [language])

  const value = useMemo(() => ({ language, setLanguage }), [language])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider')
  return context
}

export const categoryLabel = (category: Category, language: Language) => categoryLabels[category][language]
export const levelLabel = (level: PlayerLevel, language: Language) => levelLabels[level][language]
export const difficultyLabel = (difficulty: Difficulty, language: Language) => difficultyLabels[difficulty][language]
export const regionLabel = (region: Movie['region'], language: Language) => regionLabels[region][language]
export const genreLabel = (genre: string, language: Language) => language === 'en' ? (genreLabels[genre] ?? genre) : genre
