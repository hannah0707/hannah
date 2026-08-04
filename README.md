# Hannah 的像素工作台（hannah-pixel-workbench）

一个**纯前端、零后端、零数据库**的像素风个人生产力工作台。所有用户数据均保存在浏览器 `localStorage` 中，下载解压后即可直接双击 `index.html` 运行，或部署到任意静态服务器。

---

## 一、目录结构与文件清单

```
hannah-pixel-workbench/
├── index.html                # 页面入口：定义侧栏/抽屉导航、各分栏容器、按序引入 css 与 js
├── css/
│   └── style.css             # 全局样式：主题变量、布局、动画、分栏样式（含生活分栏全部 .life-* 样式）
├── js/
│   ├── data.js               # 数据中心：书单/灵感/学习/健身/三丽鸥等静态数据 + 占位图工具
│   ├── api.js                # 统一数据请求层（Mock 占位，预留可替换接口地址）
│   ├── app.js                # 应用主逻辑：视图切换、各分栏模块、桌面宠物；分栏图标以 base64 内联于本文件
│   ├── books.js              # 书单数据：212 本书的封面映射（assets/covers/cover_*.jpg）
│   ├── bookRecommend.js      # 今日书单推荐：每日种子打乱、换一批、加入书架
│   ├── inspirations.js       # 灵感数据：6 大分类 × 30 条真实链接（共 180 条）
│   ├── inspiration.js        # 灵感分栏逻辑：分类切换、卡片渲染、收藏、角标
│   ├── takeout.js            # 【生活·外卖推荐】数据+逻辑，暴露 window.Takeout（localStorage: takeout_list）
│   ├── water.js              # 【生活·喝水记录】数据+逻辑，暴露 window.Water（localStorage: water_setting / water_records）
│   ├── recipe.js             # 【生活·食谱】数据+逻辑，暴露 window.Recipe（localStorage: recipe_list）
│   ├── period.js             # 【生活·生理期记录】数据+预测，暴露 window.Period（localStorage: period_records）
│   ├── life.js               # 【生活】分栏渲染与全部交互，暴露 window.renderLife()（四 Tab 容器）
│   ├── vision_data.js        # 【资讯·数据】330 条种子资讯（6 分类 × 55 条），全部链接指向用户指定的 34 个真实公开站点
│   └── vision.js             # 【资讯】分栏渲染与全部交互，暴露 window.renderVision()（三 Tab 容器）
│   ├── backup.js             # 【全局·备份】右上角常驻「💾 备份」按钮：导出/导入/分区重置（localStorage 全量扫描）
│   ├── quicknote.js          # 【全局·速记】「✏️ 速记」弹窗，随时追加短笔记到今日日记
│   ├── inspiration_add.js    # 【灵感·增强】手动新增灵感（表单/编辑/删除），与预置混合展示
│   └── takeout_enhance.js    # 【外卖·增强】黑名单 / 排序 / 进阶随机（连续3次拉黑·优先7天未吃）
│   ├── portfolio.js          # 【作品集·核心】PFUtil(图片压缩/富文本/工具) + Tab 路由 + 接入 switchView
│   ├── portfolio_chars.js     # 【作品集·人物库】增删改查 / 分组筛选 / 参考图（localStorage: hannah_pf_chars）
│   ├── portfolio_world.js     # 【作品集·世界观设定】4 分类·富文本·图片（localStorage: hannah_pf_world）
│   └── portfolio_insp.js      # 【作品集·灵感素材库】图文碎片 / 标签 / 分类（localStorage: hannah_pf_insp）
│   └── fitness_app.js        # 【健身·升级】单文件模块：场景/部位/时长三段选择 + 推荐生成 + 记录/计划库/身体档案/视频库/徽章
├── selftest/                 # 端到端自检（jsdom 加载真实页面验证新功能）
│   ├── selftest.js           # 全局备份 / 外卖增强 / 灵感增强 / 日记 / 速记
│   ├── selftest_portfolio.js # 作品集三模块端到端自检（40 项断言）
│   └── selftest_fitness.js   # 健身模块端到端自检（28 项断言）
├── assets/
│   ├── avatars/
│   │   └── pet/              # 桌面宠物 GIF 动画（6 个，由 app.js 按状态切换）
│   │       ├── happy.gif     # 开心 / 待机 / 兴奋 / 摸摸
│   │       ├── think.gif     # 思考 / 坐下
│   │       ├── sniff.gif     # 嗅闻 / 走动
│   │       ├── sleep.gif     # 睡觉
│   │       ├── bone.gif      # 啃骨头（喂食）
│   │       └── ball.gif      # 玩球（出去遛）
│   └── covers/               # 书单封面图（211 张，cover_0.jpg ~ cover_210.jpg，由 books.js 引用）
│       ├── cover_0.jpg
│       ├── cover_1.jpg
│       └── ...（共 211 张）
└── README.md                 # 本交付说明（文件清单、引用关系、运行/部署、验证清单）
```

---

## 二、文件用途与引用关系

### 1. 入口与样式
| 文件 | 用途 | 被谁引用 |
|------|------|----------|
| `index.html` | 定义导航（`.nav-item[data-view]` 通用切换）、14 个分栏容器（含 `#view-life`、`#view-english`）、按序加载样式与脚本 | 浏览器直接打开 |
| `css/style.css` | 全局像素风样式；生活分栏的 `.life-*`、`.recipe-*`、`.lp-*`、`.insp-*` 等样式均在此 | `index.html` 的 `<link>` |

### 2. 脚本加载顺序（`index.html` 内，均位于 `app.js` 之前/之中）
```
data.js → api.js → books.js → bookRecommend.js → inspirations.js → inspiration.js
        → takeout.js → water.js → recipe.js → period.js → life.js
        → vision_data.js → vision.js → app.js
```
> 说明：`life.js` 与 `vision.js` 通过**捕获阶段**的 `document` 事件委托（`addEventListener('click', onDocClick, true)`）渲染「生活 / 资讯」分栏，因此**无需修改 `app.js` 即可接入**（仅在 `renderers` 映射里加了一行 `vision: renderVision`），原 `#view-english` 块保留不删，避免影响既有初始化。

### 3. 模块职责与全局对象
| 模块 | 暴露全局 | 负责的分栏 / 功能 |
|------|----------|-------------------|
| `app.js` | （内部 IIFE） | 视图切换、桌面宠物、阅读/日记/灵感/记账等模块；分栏图标 base64 内联 |
| `books.js` / `bookRecommend.js` | `window.Books`（数据） | 阅读分栏书单与每日推荐 |
| `inspirations.js` / `inspiration.js` | `window.Inspirations` | 灵感分栏（6 分类链接） |
| `takeout.js` | `window.Takeout` | 生活 → 🍱 外卖推荐 |
| `water.js` | `window.Water` | 生活 → 💧 喝水记录 |
| `recipe.js` | `window.Recipe` | 生活 → 🥘 食谱（含自定义添加/编辑/删除） |
| `period.js` | `window.Period` | 生活 → 🩸 生理期记录 |
| `life.js` | `window.renderLife()` | 生活分栏总渲染与四 Tab 事件分发 |
| `vision_data.js` | `window.VisionData` | 资讯分栏素材库（330 条 / 6 分类 / 34 真实来源） |
| `vision.js` | `window.renderVision()` | 资讯分栏总渲染与三 Tab 事件分发 |

### 4. 静态资源引用关系
- **分栏图标**：base64 内联在 `app.js`（约第 5827–5842 行 `ICONS` 对象），按 `data-icon` 文件名取用；**新模块「资讯」的图标为 `vision.png`**，因体量极小直接以独立 PNG 存放在 `assets/avatars/vision.png`，由 `app.js` 走 `assets/avatars/${iconFile}` 路径 fallback 取用。
- **桌面宠物**：`index.html` 中 `<img id="petImg" src="assets/avatars/pet/happy.gif">`，运行时由 `app.js` 切换到 `think/sniff/sleep/bone/ball`。
- **书单封面**：`books.js` 中每本书的 `cover: 'assets/covers/cover_N.jpg'`，全部 211 张均存在、0 缺失。
- **灵感/健身/学习占位图**：`data.js` 在无本地图时调用 `picsum.photos`（见外部依赖说明）。

---

## 三、外部依赖说明（仅 1 项必需，其余可选）

| 依赖 | 位置 | 是否必需 | 说明 |
|------|------|----------|------|
| **Google Fonts**（Press Start 2P / VT323 / Pixelify Sans） | `css/style.css` 顶部 `@import` | 建议联网 | 像素字体；**离线时自动回退到系统等宽字体**，不影响功能 |
| `picsum.photos` 占位图 | `data.js` / `app.js` | 否 | 仅当灵感/健身/学习等无本地图时作为占位封面；核心功能不依赖 |
| `unpkg.com/mammoth` | `app.js`（人才库 DOCX 导入） | 否 | 仅首次预览 Word 文档时懒加载，约 200KB；不使用该功能则完全不触发 |

> ✅ **「生活」四功能（外卖/喝水/食谱/生理期）与「资讯」三功能（每日速览/破茧房/常识库）核心逻辑完全离线、无外部请求**，数据全部在 `localStorage`。仅在点击资讯卡片时会跳转对应真实公开站点。

---

## 四、运行方式

### 方式 A：直接打开（最简单）
双击 `index.html` 即可在浏览器中运行（推荐 Chrome / Edge）。

> 小提示：直接 `file://` 打开时个别浏览器对 `localStorage` 与字体加载更严格，建议用方式 B 的本地服务器获得最佳体验。

### 方式 B：本地静态服务器（推荐）
在项目根目录执行其一：
```bash
# Python（系统自带）
python -m http.server 8000

# 或 Node
npx serve .
```
然后访问 **http://localhost:8000** （或 **http://127.0.0.1:8000**）。

---

## 五、部署说明

本项目为纯静态站点，**可直接部署到任意静态托管**：
- 将整个 `hannah-pixel-workbench/` 目录上传到：GitHub Pages / Vercel / Netlify / 腾讯云 COS / Nginx 静态目录 / CloudStudio 等。
- 无需构建步骤、无需服务端环境变量。
- 入口即为 `index.html`，确保 `css/`、`js/`、`assets/` 三个目录与 `index.html` **保持相对路径不变**即可。

---

## 六、数据持久化（localStorage 键）

| 键名 | 功能 | 说明 |
|------|------|------|
| `takeout_list` | 外卖推荐 | 预置 64 条 + 用户自定义；含收藏/吃过次数/日期 |
| `water_setting` | 喝水设置 | `dailyGoal`（默认 2000ml） |
| `water_records` | 喝水记录 | 按日期存放 `{id, amount, time, date}` |
| `recipe_list` | 食谱 | 预置 50 道 + 用户自定义；含食材/步骤/卡路里/打卡 |
| `period_records` | 生理期 | 每次记录起止/出血量/痛经/情绪/症状/备注 |
| `vision_collect` | 资讯收藏 | 用户点 ☆ 收藏的资讯 id 集合 |
| `vision_readRecord` | 资讯已读 | 点击标题/已读按钮后写入的 id 集合 |
| `vision_random_history` | 资讯破茧房历史 | 最近 5 次随机跳过的领域记录 |

---

## 七、「生活」分栏功能验证清单

打开页面后点击左侧「生活」导航（**硬刷新 `Ctrl+Shift+R` / Mac `Cmd+Shift+R`** 避免旧缓存）：

**🍱 外卖推荐**
- [ ] 默认展示，64 条预置外卖覆盖全部品类
- [ ] 按品类 / 健康度筛选；「只看收藏」「近 7 天没吃」开关
- [ ] 「🎲 帮我选」弹窗随机推荐，「就它了」记录、「再换一个」
- [ ] ☆ 收藏、⋮ 更多（标记今天吃 / 编辑 / 删除）、＋ 添加

**💧 喝水记录**
- [ ] SVG 圆环进度（达标变绿 + 「今日达标 🎉」）
- [ ] +100/200/300/500 与「撤销」
- [ ] 今日记录逐条删除；近 7 天柱状图 + 平均/连续达标
- [ ] 修改每日目标并保存

**🥘 食谱**
- [ ] 7 分类（快手菜/减脂餐/家常菜/硬菜/汤羹/早餐/便当菜）+ ⭐收藏 + 🍳做过的
- [ ] 难度 / 烹饪时间筛选；按菜名或食材（如「西红柿」）搜索
- [ ] 卡片与详情显示卡路里、食材清单、编号步骤、小贴士
- [ ] 「✅ 今天做了」打卡；「＋ 添加菜谱」自定义（可编辑/删除）

**🩸 生理期记录**
- [ ] 状态卡：当前阶段 / 下次预计 / 平均周期 / 平均持续
- [ ] 「🩸 今天来例假了」「✅ 例假结束了」一键记录
- [ ] 表单记录出血量/痛经/情绪/症状；历史可编辑、可删除

**🗞 资讯**
- [ ] 默认 Tab：每日行业速览，6 分类（要闻/科技/财经/文娱/国际/深度）每分类 8 张卡
- [ ] 顶部日期 + 「🎲 换一批」按钮（不重置收藏） + 「⭐ 我的收藏」modal
- [ ] ☆ 收藏 / ✓ 标记已读；点击标题在新标签页打开对应来源（target=_blank）
- [ ] 「🌐 随机破茧房」Tab：大按钮随机跳 20 个跨领域站点，20 个候选格子可直点，历史区显示最近 5 次
- [ ] 「📚 常识补全库」Tab：3 分类（金融入门/政策解读/法律常识）每类 5 张站点卡
- [ ] 同一天刷新结果固定；第二天自动轮换一批新资讯

---

## 八、其它说明
- 代码中含中文注释，便于二次开发与维护。
- 风格与既有分栏（桌面/日记/阅读/灵感等）保持一致，新增功能**未改动任何既有模块逻辑**。
- 若需重置某功能数据：浏览器控制台执行 `localStorage.removeItem('takeout_list')` 等对应键后刷新即可恢复预置。
- **「资讯」模块的素材说明**：内置 330 条种子资讯的标题/摘要为按真实行业常见话题生成的代表性条目；点击后会跳到该条对应的**真实公开来源**（34 个用户指定站点之一），用户可在来源页浏览**当天真实的新闻**。这与「每天换一批新资讯」的设计目标一致——条目是种子，链接是真实的。

---

## 九、整体优化升级（数据备份 / 日记 / 灵感 / 外卖增强）

在**不改动原有页面样式与布局、不触碰视野/书架/宠物/喝水/生理期/食谱既有逻辑**的前提下，新增四大能力，全部纯前端、仅用 `localStorage`。

### 1. 全局数据备份（防缓存清理丢数据）— `backup.js`
- 右上角常驻 **「💾 备份」** 按钮，所有分栏通用。
- 弹窗提供三大功能：
  - **📤 导出全部数据**：一次性把当前 `localStorage` **全量**打包成 JSON 下载（含日记/外卖/喝水/生理期/灵感收藏/视野收藏/书架阅读等）。
  - **📥 导入备份**：上传此前导出的 JSON，一键覆盖恢复（导入后自动刷新）。
  - **🗑 分区重置**：逐项单独清空（仅外卖 / 仅日记 / 仅灵感…），每一项都带**二次确认**；另有「清空全部」入口（同样二次确认），避免误删。
- 仅做「读取 → 打包 → 写入」，**不改动任何业务模块读写逻辑**；导入/重置后通过 `location.reload()` 让各模块重新加载。

### 2. 日记精细化 — `app.js`（标签/时间筛选/速记）
- **自定义标签**：预设「日常 / 创作随笔 / 心情 / 灵感碎记」，可手动追加自定义标签；写日记后点选标签，支持按标签筛选。
- **时间筛选**：日记列表支持「全部 / 本周 / 本月」切换。
- **✏️ 随手速记弹窗**（右上角常驻）：无需进入日记页，随时写一句话，自动追加到今日日记（带时间戳）。
- 原有的编辑 / 删除 / 时间记录全部保留。

### 3. 灵感补强（手动新增）— `inspiration_add.js`
- 灵感页顶部 **「＋ 新增灵感」**：表单含 标题* / 分类 / 来源 / 链接* / 简介（仅标题+链接必填）。
- 用户新增数据与预置混合展示，用户条目带「我添加的」浅色标识，可**编辑 / 删除**；预置条目仅可收藏、不可删。
- 数据存 `hannah_insp_user`，与 `inspiration.js` 通过钩子（`__inspRenderUser` 等）解耦混入。

### 4. 外卖增强 — `takeout_enhance.js`
- **🚫 黑名单**：吃腻的店加入黑名单后，随机选餐与列表自动屏蔽；支持弹窗管理（加入/移出）。
- **进阶随机**：连续 3 次选中同一店铺 → 自动拉黑 1 天；优先推荐 **7 天以上没吃过**的店（加权 ×2.2）。
- **排序方式**：久未吃优先 / 吃过最多 / 收藏靠前，下拉切换即时生效。
- 通过包裹 `window.Takeout.filter` 实现，不改动 `takeout.js` 原有增删改查与收藏逻辑。

### 5. 端到端自检（selftest）
项目内置 `selftest/selftest.js`，用 **jsdom** 加载真实 `index.html` 与全部脚本，对以上新功能做自动断言（35 项断言，覆盖备份键、黑名单、排序、进阶随机、灵感混入、日记标签/时间筛选、速记钩子）。

```bash
# 在项目根目录执行（需先安装 jsdom 到本地 node_modules，或用下方 NODE_PATH 指向已安装的 jsdom）
NODE_PATH=<jsdom 所在 node_modules> node selftest/selftest.js
# 例如（Windows，使用盘符格式路径）：
# NODE_PATH=C:/Users/xxx/.workbuddy/binaries/node/workspace/node_modules node selftest/selftest.js
```
全部通过时输出 `通过 35/35` 且进程退出码为 0；任一项失败则退出码非 0。建议每次改动后运行本自检。

---

## 十、作品集（人物库 / 世界观设定 / 灵感素材库）

「作品集」分栏升级为**创作工作台**，含四个一级 Tab，全程纯前端、仅用 `localStorage`，**不改动任何原有模块样式与逻辑**（「作品」Tab 复用原逻辑，历史数据不丢失）。

### 1. 🧙 人物库 — `portfolio_chars.js`（键 `hannah_pf_chars`）
- 角色档案字段：姓名* / 种族 / 身份 / 分组（主角团·重要NPC·配角路人）/ 外貌 / 性格 / 背景故事 / 能力 / 人物关系 / 备注 / 参考图片（上传自动压缩）。
- 支持：新增 / 编辑 / 删除、按姓名·种族·身份·备注搜索、按分组筛选、卡片网格展示、点击查看完整档案。

### 2. 🌍 世界观设定 — `portfolio_world.js`（键 `hannah_pf_world`）
- 四大分类 Tab：**地理设定 / 种族设定 / 势力设定 / 历史设定**，每分类下自由增删条目。
- 每条目含：标题* / 子类型（如 大陆·城市·秘境·纪元，可选）/ **富文本正文**（加粗·斜体·列表·小标题·链接·清除格式）/ 参考图片。
- 富文本经轻量消毒后存储；列表按更新时间倒序，分类间切换即时筛选。

### 3. 💡 灵感素材库 — `portfolio_insp.js`（键 `hannah_pf_insp`）
- 收集灵感碎片：标题（可选）/ 正文 / 分类（参考游戏影视书籍·参考图片·音乐音效·好词好句·随机灵感脑洞·未分类）/ **标签（逗号分隔）** / 参考图片。
- 支持：图文混排、搜索、按分类筛选、按标签筛选（多选 OR）、卡片网格展示、编辑 / 删除。
- 与「灵感」分栏相互独立（那里是外部灵感流，这里是自己沉淀的素材库）。

### 4. 通用与接入
- 图片统一经 `PFUtil.compressImage` 压缩为 dataURL，控制 `localStorage` 体积。
- 通过 `app.js` 的 `renderPortfolioBridge` 接入 `switchView`（因 app.js 整体包在 IIFE 内，`renderPortfolio` 非全局，故用桥接而非覆盖）。
- 三个键已纳入全局备份的**全量导出**与**分区重置**（备份面板可见「作品集·人物库 / 世界观 / 灵感素材」三项单独清空）。

### 5. 端到端自检（selftest_portfolio）
```bash
NODE_PATH=C:/Users/xxx/.workbuddy/binaries/node/workspace/node_modules node selftest/selftest_portfolio.js
# 全部通过输出 `通过 40/40` 且退出码 0；覆盖三模块增删改查、localStorage 落库、Tab 切换、备份纳入。
```

## 十一、健身模块（fitness_app.js）

基于原有「今日运动顾问」升级为**完整训练管理系统**，纯前端、单文件 `js/fitness_app.js`、仅用 `localStorage`（键统一以 `hannahFit:` 开头），**不修改生活 / HR / 人才库等其它模块**。样式全部沿用工作台主题变量，自动适配樱花粉 / 薰衣草紫 / 抹茶绿 / 夜间四套主题。

### 1. 三段选择 + 推荐生成
- **场景**：保留 居家 / 健身房 / 游泳 / 户外，新增「精简 / 详细」切换；详细模式拆为 居家徒手·居家器械·健身房力量·健身房有氧·户外慢跑。
- **部位**：在原有基础上新增 **肩 / 胸 / 臀部**。
- **时长**：15 / 30 / 45 / 60 分钟。
- 选中项「跟随主题色高亮」（`--primary`）。
- 点「🎯 为我推荐跟练」生成结构化方案：**热身 → 正式训练 → 收尾拉伸**，每个动作附 **易错提醒** 与 **视频链接填写框**；点「✓ 记录本次训练」自动存入下方运动记录（并联动桌面页打卡），也可「保存到计划库 / 开始训练(倒计时)」。

### 2. 运动记录增强
- 日历打卡视图（当月训练日打勾）、**连续健身天数 / 最长连续 / 本月次数 / 本月时长 / 累计** 统计。
- 每条记录可补填 **负重(kg) / 星级评价 / 训练感受**。

### 3. 运动记录下方三大板块
- **📋 我的训练计划库**：保存推荐方案、自定义**循环周期计划**（如 推/拉/腿 三分化）、复制 / 删除。
- **📐 身体数据档案**：体重·腰·胸·臀·臂·腿围度录入，**自动折线走势图**（SVG 多序列），可上传体态照片留存。
- **🎬 收藏视频库**：按部位分类收藏跟练链接，点击即跳。

### 4. 训练模式 + 组间倒计时
- 「开始训练」弹出训练模式：逐动作播放，组间按设定秒数**倒计时**（复用像素计时风格）。

### 5. 成就徽章 & 备份
- **🏅 成就徽章**：连续 3/7/14/30/100 天、累计 10/50/100 次自动点亮。
- 全部 `hannahFit:*` 数据已纳入右上角「💾 备份」的**全量导出 / 导入 / 分区清空**（重置面板可见「💪 健身（全部）」单独清空）。

### 6. 自行扩展（需求：可后续新增动作 / 视频）
- 新增动作：在 `fitness_app.js` 顶部的 `BASE_EXERCISES` 数组按格式加一条即可；或运行时点「＋ 自定义动作」录入。
- 新增视频：在「收藏视频库」点「＋ 添加视频」；生成方案后给动作填的链接也会自动进视频库。

### 7. 端到端自检（selftest_fitness）
```bash
NODE_PATH=C:/Users/xxx/.workbuddy/binaries/node/workspace/node_modules node selftest/selftest_fitness.js
# 全部通过输出 `通过 28/28` 且退出码 0；覆盖场景模式切换、方案生成、记录落库+打卡联动、计划库、身体数据、视频库、徽章、备份键纳入。
```

---

## 八、近期修复（2026-08-03）

针对用户反馈的 4 个问题进行了修复，全部已通过 selftest 回归（main 35/35 + fitness 28/28 + portfolio 40/40）。

### 1. 健身板块全部空白
**根因**：`app.js` 的 `renderers.fitness` 仍指向旧版 `renderFitness()`（依赖已被 `#fitRoot` 容器取代的 DOM 元素）。  
**修复**：在 `app.js` 新增 `renderFitnessBridge()`，复用记账的桥接模式，调用 `window.renderFitnessModule()`（`fitness_app.js` 暴露）。`renderers.fitness` 改为 `renderFitnessBridge`，原函数仍保留为兜底。

### 2. 资讯「随机破茧房」80% 死链
**根因**：`vision.js` 的 `Vision_BUBBLE_BREAK_POOL` 20 个站点中实测 11 个已失效（`nationalastronomy.com.cn`、`legalinfo.gov.cn`、`dandangdushu.com`、`iriscine.cn`、`musicbusiness.com.cn`、`eightpoints.cn`、`gongyishibao.com`、`nongshijie.com`、`energynews.com.cn`、`jiandanxinli.com/learn`、`nationalgeographic.com.cn`）。  
**修复**：
- 替换为 12 个实测可达的站点池（澎湃 / 果壳 / 谷德 / 丁香园 / 科学网 / 芥末堆 / 游戏葡萄 / 建筑学报 / 少数派 / IT之家 / 36氪 / 虎嗅）。
- 新增「🚫 标记失效」按钮：每个候选格子、历史条目都加 `data-action="vmarkdead"`，标记后自动加入本地黑名单 `vision_break_dead`，下次随机不再选中。
- 失效链接以独立面板展示，支持「✓ 恢复」和「🧹 全部恢复」。

### 3. 人才库导入后 UI 颜色太相近
**根因**：`css/style.css` 中 `.talent-card` / `.talent-avatar` / `.talent-stat-card` / `.talent-field` 等大量使用 `background: var(--bg-card)` 配合 `border: 2px solid var(--bg-card)`（边框与背景同色 → 视觉上「全粉」无层次）。  
**修复**：
- 卡片改用 `--pure-white` 背景 + 28-38% primary 边框 + 4px 投影，区分清晰。
- 头像加 real gradient（`--primary` → `--info`）。
- 4 张统计卡顶部色条 + 圆形图标背景，强调主题色（每张 `--accent` 颜色独立：粉/绿/蓝/橙）。
- 字段块按类型配色：性别（粉/蓝）、年龄（橙）、年限（绿）。
- 标签 / 详情图标 / 联系电话图标全部使用真实主题色 token，移除所有「`bg-card` → `bg-card`」无用渐变。

### 4. 备份导出/导入后简历原文件全部损毁
**根因**：`backup.js` 仅打包 `localStorage`，而简历原文件（PDF/TXT 等）实际存在 IndexedDB（数据库 `pixel_workbench_talent`，store `resumes`）。  
**修复**：
- `backup.js` 新增 `IDB_DBS` 白名单 + `collectIDB()` / `restoreIDB()`，导出时把所有 blob 转 base64 嵌入 `payload._idbFiles`，导入时还原写入。
- 备份格式升至 `_version: 2`（兼容旧版 v1）。
- 备份面板动态展示 IndexedDB 文件数；「🧹 清空全部本地数据」也会同步清空所有 IDB store。
- 各分区清空支持 `scope.idb` 字段，可同时清 localStorage + IndexedDB。




---

## 十二、日程模块（schedule_app.js）

保留原有「当天日历 / 历史浏览」双 Tab 布局与日历翻页逻辑，UI 全部走 CSS 变量，自动适配 4 套主题。纯前端 + localStorage，无后端。

### 12.1 功能清单

| # | 功能 | 说明 |
|---|------|------|
| 1 | 日历彩色圆点 | 有日程的日期角落点亮圆点，按分类着色；周末灰色弱化；选中日期主题色高亮 |
| 2 | 重构添加弹窗 | 标题 / 起止时间 / 分类（含自定义）/ 重复周期 / 提前提醒 / 备注 / 优先级；完成可勾选划掉 |
| 3 | 选中日期区 | 同日日程按时间自动排序，分「待完成 / 已完成」两组，逐条支持编辑、删除 |
| 4 | 历史浏览升级 | 新增时间 / 分类 / 完成状态三重筛选；保留日期跳转与统计；新增本月面试场次、学习次数 |
| 5 | 日历下方两卡片 | 今日待办卡片（进度条）+ 循环日程管理 |
| 6 | 跨模块联动 | 资讯日程跳咨询库；健身日程完成自动同步健身打卡 |
| 7 | 全局备份 | 数据存于 pixel_workbench_v3，右上角备份按钮统一导入 / 导出 / 清空（分区「日程（全部）」） |
| 8 | 通知与月报 | 授权后临近日程弹窗提醒（30s 轮询）；每月自动生成上月完成情况小结 |
| 9 | 移动端自适应 | 768px / 420px 两档断点；全文中文注释，便于新增分类 |

### 12.2 数据结构

日程数据存放在全局 `state.schedule`（属于 `pixel_workbench_v3`，因此自动被备份系统覆盖）：

```js
state.schedule = {
  events: {                       // 按日期分桶
    '2026-08-03': [{
      id, date, title,
      startTime, endTime,         // 'HH:MM'
      category,                   // 分类名
      repeat,                     // none/daily/weekly/monthly
      remind,                     // 提前提醒分钟数，0 = 不提醒
      priority,                   // low/medium/high
      note, done, src,
    }],
  },
  customCats: [{ name, color }],  // 自定义分类
  recurring:  [{ id, ... }],      // 循环日程模板
  hf: { month, cat, status },     // 历史浏览筛选条件
  lastSummaryMonth: '2026-07',    // 月报去重标记
};
```

### 12.3 如何新增日程分类

在 `js/schedule_app.js` 顶部的 `DEFAULT_CATS` 数组追加一项即可，颜色会自动同步到日历圆点、分类标签、筛选下拉：

```js
const DEFAULT_CATS = [
  { name: '工作', color: '#4a90d9' },
  // ... 追加一行：
  { name: '旅行', color: '#7b68ee' },
];
```

### 12.4 对外 API

```js
window.renderScheduleModule();           // 渲染整个模块（由 app.js 桥接调用）
window.ScheduleAPI.open(dateStr);        // 打开新增弹窗
window.ScheduleAPI.addEvent(evObj);      // 编程式添加
window.ScheduleAPI.convertFromText(str); // 文本 -> 日程对象（识别日期/时间/分类）
window.ScheduleAPI.addFromText(str);     // 文本直接落库
```

### 12.5 自检

```bash
NODE_PATH=C:/Users/xxx/.workbuddy/binaries/node/workspace/node_modules \
  node selftest/selftest_schedule.js
# 全部通过输出「通过 59/59」且退出码 0
```

覆盖：双 Tab 保留、日历翻页、分类圆点、周末弱化、增改删、待完成/已完成分组排序、历史三重筛选、本月面试/学习统计、两张子卡片、循环日程生成、跨模块 API、备份键纳入。

---

## 十三、静态素材（assets/icons、assets/bg）

全部由 `tools/gen_assets.js` 零依赖生成（仅用 Node 内置 zlib 手写 PNG 编码器），可随时重跑覆盖。

```bash
node tools/gen_assets.js
```

| 文件 | 尺寸 | 用途 |
|------|------|------|
| `assets/icons/favicon.svg` | 矢量 | 主 favicon（现代浏览器优先） |
| `assets/icons/favicon-16.png` / `favicon-32.png` | 16 / 32 | 老浏览器 favicon |
| `assets/icons/icon-48/64/128/192/512.png` | 对应尺寸 | PWA / 桌面快捷方式图标 |
| `assets/icons/apple-touch-icon.png` | 180x180 | iOS 添加到主屏图标 |
| `assets/icons/logo-pixel.svg` | 320x64 | 站点横版 Logo（图标 + 字标） |
| `assets/icons/og-cover.png` | 1200x630 | 社交分享封面（OG / Twitter Card） |
| `assets/icons/manifest.webmanifest` | — | PWA 清单（名称、主题色、图标集） |
| `assets/bg/bg-pixel-grid.png` | 16x16 | 可无缝平铺·细网格纹理 |
| `assets/bg/bg-pixel-dots.png` | 24x24 | 可无缝平铺·错落圆点 |
| `assets/bg/bg-sakura-confetti.png` | 64x64 | 可无缝平铺·樱花碎片 |

背景贴图为半透明，可直接叠在任意主题底色上：

```css
body {
  background-image: url('assets/bg/bg-sakura-confetti.png');
  background-repeat: repeat;
}
```

新增图标尺寸：编辑 `tools/gen_assets.js` 中 `main()` 的 `ICON_SIZES` 数组后重跑即可。

---

## 十四、完整自检一览

```bash
export NODE_PATH=C:/Users/xxx/.workbuddy/binaries/node/workspace/node_modules
node selftest/selftest.js              # 主体          通过 35/35
node selftest/selftest_portfolio.js    # 作品集        通过 40/40
node selftest/selftest_fitness.js      # 健身          通过 28/28
node selftest/selftest_talent_tags.js  # 人才库标签    通过  7/7
node selftest/selftest_schedule.js     # 日程          通过 59/59
# 合计 169/169
```
