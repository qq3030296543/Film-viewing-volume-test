import type { Rank } from '../types'

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

export const getRank = (score: number) => ranks.find((rank) => score >= rank.min && score <= rank.max) ?? ranks[0]
