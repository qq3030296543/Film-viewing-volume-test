/**
 * 人工片单只负责质量校正，不直接充当固定题库。
 *
 * - curatedTmdbMovieIds：来自不同年代与地区、适合作为阅片测试题目的代表作。
 * - manuallyBlockedTmdbIds：即使通过自动筛选，也不应进入测试的 TMDB 电影 ID。
 *
 * 修改名单后无需调整抽题算法；下一次重新加载题库时即可生效。
 */
export const curatedTmdbMovieIds = new Set<number>([
  11, 13, 73, 98, 120, 121, 122, 129, 146, 155, 238, 240, 278, 346, 389,
  424, 539, 548, 550, 603, 637, 670, 680, 694, 769, 807, 843, 857, 149,
  1891, 10997, 11104, 11423, 12477, 157336, 372058, 496243,
])

export const manuallyBlockedTmdbIds = new Set<number>([
  // 在这里添加需要永久排除的 TMDB 电影 ID，例如：123456。
])

export const nonFeatureTitlePattern = /演唱会|巡回演出|音乐现场|现场实录|演出实录|音乐会|粉丝见面会|幕后特辑|制作特辑|concert|world tour|stadium tour|live at|live in|on stage|the tour|making of|behind the scenes/i

export const isCuratedTmdbMovie = (tmdbId: number) => curatedTmdbMovieIds.has(tmdbId)

