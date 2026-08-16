import type { Language, PlayerLevel, Rank } from '../types'

export const ranks: Rank[] = [
  { min: 0, max: 15, name: '银幕路人', icon: '◌', eyebrow: '片头刚刚亮起', description: '你与电影的故事才刚开场，下一部也许就是你的本命。', color: '#a4aab4' },
  { min: 16, max: 30, name: '偶尔观影', icon: '◐', eyebrow: '开始留意光影', description: '热门佳作已被你收入记忆，银幕世界正在慢慢展开。', color: '#c7a56b' },
  { min: 31, max: 45, name: '周末影迷', icon: '◒', eyebrow: '稳定出没影院', description: '你不只认得名字，也开始记住人物、镜头与故事。', color: '#d5a24b' },
  { min: 46, max: 60, name: '资深影迷', icon: '◆', eyebrow: '熟悉银幕语言', description: '商业类型与作者表达都在你的观影地图上占有一席。', color: '#e0a245' },
  { min: 61, max: 75, name: '光影猎手', icon: '✦', eyebrow: '穿梭类型边界', description: '你会主动寻找好电影，也擅长从细节认出它们。', color: '#ee9348' },
  { min: 76, max: 88, name: '电影鉴赏家', icon: '✺', eyebrow: '读懂镜头余韵', description: '你记得的不只是情节，还有电影留下的情绪与思考。', color: '#f0b85b' },
  { min: 89, max: 96, name: '移动电影资料库', icon: '✹', eyebrow: '片单在你脑海', description: '从经典到类型片，你的电影记忆令人刮目相看。', color: '#f4c86a' },
  { min: 97, max: 100, name: '银幕宗师', icon: '✷', eyebrow: '光影尽在掌握', description: '片名、人物与主题皆可信手拈来，你就是行走的电影史。', color: '#ffe09a' },
]

const ranksEn: Rank[] = [
  { min: 0, max: 15, name: 'Screen Passerby', icon: '◌', eyebrow: 'THE OPENING CREDITS', description: 'Your story with cinema is just beginning. The next film may become a lifelong favorite.', color: '#a4aab4' },
  { min: 16, max: 30, name: 'Casual Viewer', icon: '◐', eyebrow: 'NOTICING THE LIGHT', description: 'Popular favorites are entering your memory, and the world of cinema is beginning to unfold.', color: '#c7a56b' },
  { min: 31, max: 45, name: 'Weekend Filmgoer', icon: '◒', eyebrow: 'A REGULAR IN THE DARK', description: 'You recognize more than titles—you remember characters, images and stories.', color: '#d5a24b' },
  { min: 46, max: 60, name: 'Seasoned Film Lover', icon: '◆', eyebrow: 'FLUENT IN FILM LANGUAGE', description: 'Both genre cinema and auteur expression have a place on your viewing map.', color: '#e0a245' },
  { min: 61, max: 75, name: 'Cinema Hunter', icon: '✦', eyebrow: 'CROSSING GENRE BORDERS', description: 'You actively seek out good films and recognize them from the smallest details.', color: '#ee9348' },
  { min: 76, max: 88, name: 'Film Connoisseur', icon: '✺', eyebrow: 'READING THE AFTERIMAGE', description: 'You remember not only plots, but also the emotions and ideas a film leaves behind.', color: '#f0b85b' },
  { min: 89, max: 96, name: 'Walking Film Archive', icon: '✹', eyebrow: 'A CATALOGUE IN YOUR MIND', description: 'From classics to genre films, your cinema memory is genuinely impressive.', color: '#f4c86a' },
  { min: 97, max: 100, name: 'Master of the Screen', icon: '✷', eyebrow: 'CINEMA AT YOUR COMMAND', description: 'Titles, characters and themes come effortlessly—you are a walking history of film.', color: '#ffe09a' },
]

const rankLowerBounds: Record<PlayerLevel, number[]> = {
  入门菜鸟: [0, 20, 38, 55, 70, 82, 91, 97],
  略知一二: [0, 16, 31, 46, 61, 76, 89, 97],
  阅片无数: [0, 10, 22, 36, 50, 64, 78, 90],
}

export const getRank = (score: number, playerLevel: PlayerLevel = '略知一二', language: Language = 'zh') => {
  const thresholds = rankLowerBounds[playerLevel]
  const index = thresholds.reduce((matched, minimum, current) => score >= minimum ? current : matched, 0)
  return {
    ...(language === 'en' ? ranksEn[index] : ranks[index]),
    min: thresholds[index],
    max: thresholds[index + 1] ? thresholds[index + 1] - 1 : 100,
  }
}

export const getIdentityAssessment = (score: number, playerLevel: PlayerLevel, language: Language = 'zh') => {
  if (language === 'en') {
    const label = score >= 90
      ? 'Exceptional for this identity'
      : score >= 75
        ? 'Strong for this identity'
        : score >= 60
          ? 'Steady for this identity'
          : score >= 40
            ? 'Progressing within this identity'
            : 'Still warming up'
    const nextStep = playerLevel === '入门菜鸟' && score >= 82
      ? 'Try Seasoned Viewer next time'
      : playerLevel === '略知一二' && score >= 78
        ? 'Challenge the Cinephile identity next time'
        : playerLevel === '阅片无数' && score >= 75
          ? 'You have earned a convincing score at the highest identity'
          : `Keep challenging this identity to make your score more consistent`
    return { label, nextStep }
  }
  const label = score >= 90
    ? '身份内表现卓越'
    : score >= 75
      ? '身份内表现突出'
      : score >= 60
        ? '身份内表现稳定'
        : score >= 40
          ? '身份内正在进阶'
          : '身份内仍需热身'

  const nextStep = playerLevel === '入门菜鸟' && score >= 82
    ? '建议下次选择「略知一二」'
    : playerLevel === '略知一二' && score >= 78
      ? '建议下次挑战「阅片无数」'
      : playerLevel === '阅片无数' && score >= 75
        ? '你已在最高身份中取得有说服力的成绩'
        : `继续挑战「${playerLevel}」，让成绩更加稳定`

  return { label, nextStep }
}
