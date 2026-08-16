import { useLanguage } from '../i18n'

export function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage()
  return (
    <div className={`language-switch ${compact ? 'compact' : ''}`} role="group" aria-label={language === 'zh' ? '选择网站语言' : 'Choose site language'}>
      <button type="button" className={language === 'zh' ? 'active' : ''} onClick={() => setLanguage('zh')} aria-pressed={language === 'zh'}>中</button>
      <button type="button" className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')} aria-pressed={language === 'en'}>EN</button>
    </div>
  )
}
