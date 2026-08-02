# 光影鉴赏局

一个通过“看图识片 + 内容验证”判断真实阅片记忆的电影测试网站。使用 React、TypeScript 和 Vite 构建，支持 TMDB 实时电影数据库与本地离线题库。

## 启动

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run typecheck
npm run build
npm run preview
```

## 测试规则

- 正确识别电影：1 分。
- 正确回答内容验证题：再得 2 分。
- 连续完整验证 3 部电影后获得少量连胜奖励。
- 基础答题占 90 分，电影类型覆盖占 10 分，最终最高 100 分。
- 识别正确但验证错误或跳过，会计入“印象模糊”。

## 添加电影

在 `src/data/movies.ts` 的 `movies` 数组中新增一条符合 `Movie` 类型的数据。字段定义位于 `src/types.ts`，每条数据应包含：

- 片名、原名、年份、地区、类型、导演与简介；
- 海报地址、图片替代文本、两种占位视觉色；
- 三个识别干扰项；
- 一道验证题、四个选项、正确答案、解析和剧透标记；
- 难度、推荐理由。

海报加载失败时，`PosterCard` 会自动显示电影感占位图，不会破坏页面布局。

## 数据存储

当前答题进度、历史成绩与最高分保存在浏览器 `localStorage`。网站不上传个人数据。

## TMDB 实时数据库

网站支持两种连接方式：在首页点击“连接 TMDB”并将凭证保存在当前浏览器，或复制 `.env.example` 为 `.env.local`。v3 API Key 与 v4 Read Access Token 二选一：

```env
VITE_TMDB_API_KEY=你的密钥
# 或
VITE_TMDB_READ_TOKEN=你的ReadAccessToken
```

连接后，每场测试会通过 Discover API 获取片单，再实时请求电影详情、中文简介、海报、导演、主要演员、片长、评分和投票数，并动态生成识别题及验证题。没有凭证时仍可使用 33 部本地题库。

不要把 `.env.local` 提交到版本库。纯前端环境变量最终会进入浏览器构建产物，公开部署时应增加服务端 API 代理来保护凭证。

本产品使用 TMDB API，但不受 TMDB 认可或认证。TMDB 数据和图片遵循其 API 使用条款。
