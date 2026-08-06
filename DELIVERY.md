# 🌸 像素工作台（Hannah's Pixel Workbench）· 交付包说明

> 一个纯前端、零依赖、可离线运行的个人成长 / 生活管理单页应用。
> 全部数据保存在浏览器 `localStorage`，无需任何后端即可直接打开或部署。
> 本文件为**交付清单**：列明每一个文件的名称、存放路径、用途，以及它们之间的引用关系，确保解压 / 下载后即可直接运行。

---

## 一、如何运行 / 部署

### 方式 A：本地直接打开
用浏览器打开根目录下的 `index.html` 即可（推荐 Chrome / Edge / Firefox）。
> 说明：本项目所有模块均为本地静态文件，未使用 ES Module（`type="module"`），因此**双击打开 `index.html` 也能正常运行**，无需本地服务器。

### 方式 B：静态服务器（推荐，避免个别浏览器对 `file://` 的限制）
```bash
# 任选其一，在项目根目录执行：
python3 -m http.server 8081
# 或
npx serve .
```
然后访问 `http://localhost:8081/`。

### 方式 C：部署到静态托管
将整个压缩包解压后，把以下目录原样上传到任意静态空间即可：
- **GitHub Pages**：推送到仓库后开启 Pages，根目录即为站点根。
- **CloudStudio / Vercel / Netlify**：选择「静态站点」，构建命令留空，发布目录设为解压根目录。
- 所有资源均使用**相对路径**（`css/`、`js/`、`assets/`），不依赖域名或子路径，放到任何层级都可用。

---

## 二、目录结构（解压后）

```
pixel-workbench/
├─ index.html                 # 应用入口（唯一 HTML，含全部视图骨架）
├─ css/
│  └─ style.css               # 全局样式（像素风 + 主题变量 + 卡片/背景系统）
├─ js/                        # 全部业务逻辑（按模块拆分，详见第三节）
│  ├─ data.js                 # 静态字典（角色头像、分类等）
│  ├─ api.js                  # 通用工具 / 接口封装
│  ├─ app.js                  # 主控制器：导航、渲染调度、能量系统、背景模块
│  ├─ ai_helper.js            # AI 助手设置 + 对话（独立密钥存储）
│  ├─ schedule_app.js         # 日程 / 今日时间线
│  ├─ books.js / bookRecommend.js   # 书架 / 推荐
│  ├─ inspiration.js / inspirations.js / inspiration_add.js  # 灵感资讯
│  ├─ vision.js / vision_data.js     # 破茧房 / 常识库
│  ├─ life.js / takeout.js / takeout_enhance.js / recipe.js / water.js / period.js  # 生活模块
│  ├─ fitness_app.js          # 健身打卡
│  ├─ finance_app.js          # 记账
│  ├─ portfolio.js / portfolio_chars.js / portfolio_world.js / portfolio_insp.js   # 作品集
│  ├─ backup.js / quicknote.js   # 备份恢复 / 速记
├─ assets/
│  ├─ icons/                  # 站点图标 + PWA + 社交分享图（15 个文件）
│  ├─ avatars/
│  │  ├─ vision.png           # 「资讯」导航图标
│  │  └─ pet/                 # 桌面小狗 6 个状态 GIF
│  ├─ covers/                 # 书籍封面缩略图（cover_0.jpg ~ cover_210.jpg，共 211 张）
│  └─ bg/                     # 可选装饰背景图（3 张，非运行必需）
├─ README.md                  # 原项目说明
└─ DELIVERY.md                # 本文件
```

---

## 三、文件清单（名称 · 路径 · 用途）

### 1) 入口与样式

| 文件名 | 路径 | 用途 |
|---|---|---|
| `index.html` | 根目录 | 应用唯一 HTML 入口。包含：`<head>` 元信息（图标/OG 分享）、侧边导航、全部视图容器骨架、桌面宠物、AI 助手与设置面板结构、`</body>` 前按顺序引入全部 JS。 |
| `style.css` | `css/style.css` | 全局样式表。定义 8 个主题核心变量（`--primary` / `--bg-card` 等）、衍生调色板、`color-mix` 半透明卡片层级、各模块样式、夜间/紫/抹茶主题、以及「主题背景」固定全屏层 `#appBackground`。 |

### 2) JavaScript 模块（运行必需，加载顺序见第四节）

| 文件名 | 路径 | 用途 |
|---|---|---|
| `data.js` | `js/data.js` | 静态数据字典：像素猫头像集、事项分类等。 |
| `api.js` | `js/api.js` | 通用工具函数、接口封装、DOM 辅助。 |
| `app.js` | `js/app.js` | 主控制器：路由切换（`switchView` / `renderers`）、各视图渲染调度、统一能量系统（`awardEnergy`）、主题切换、`localStorage` 读写、主题背景模块（`renderBackgroundSettings` / `bgApplySaved`）、清除数据。 |
| `ai_helper.js` | `js/ai_helper.js` | AI 助手：设置表单（平台/模型/API 地址/Key）、保存/测试连接/清除按钮、与官方 `/chat/completions` 对话。Key 隔离存于 `pixel_workbench_ai`，页面全掩码。 |
| `schedule_app.js` | `js/schedule_app.js` | 日程模块 + 桌面「今日时间线」。`ScheduleAPI.toggleDone` 直接勾选完成，并派发 `schedule-changed` 刷新。 |
| `books.js` | `js/books.js` | 书架数据（含封面路径映射 `assets/covers/cover_*.jpg`）+ 渲染。 |
| `bookRecommend.js` | `js/bookRecommend.js` | 读书推荐逻辑。 |
| `inspirations.js` | `js/inspirations.js` | 灵感数据池（抖音/小红书风）。 |
| `inspiration.js` | `js/inspiration.js` | 灵感页面渲染与交互。 |
| `inspiration_add.js` | `js/inspiration_add.js` | 新增灵感。 |
| `vision_data.js` | `js/vision_data.js` | 破茧房候选池 + 常识补全库数据。 |
| `vision.js` | `js/vision.js` | 资讯/破茧房页面渲染。 |
| `life.js` | `js/life.js` | 生活（外卖/人物）模块。 |
| `takeout.js` | `js/takeout.js` | 外卖模块。 |
| `takeout_enhance.js` | `js/takeout_enhance.js` | 外卖增强（地图/评分）。 |
| `recipe.js` | `js/recipe.js` | 菜谱模块。 |
| `water.js` | `js/water.js` | 饮水打卡。 |
| `period.js` | `js/period.js` | 生理周期记录。 |
| `fitness_app.js` | `js/fitness_app.js` | 健身打卡（含能量结算）。 |
| `finance_app.js` | `js/finance_app.js` | 记账（收入/支出/结余）。 |
| `portfolio.js` | `js/portfolio.js` | 作品集主模块。 |
| `portfolio_chars.js` | `js/portfolio_chars.js` | 作品集·角色。 |
| `portfolio_world.js` | `js/portfolio_world.js` | 作品集·世界观。 |
| `portfolio_insp.js` | `js/portfolio_insp.js` | 作品集·灵感。 |
| `backup.js` | `js/backup.js` | 数据备份 / 恢复（导出导入 JSON）。 |
| `quicknote.js` | `js/quicknote.js` | 随手速记。 |

> 备注：仓库内另有 `tools/gen_assets.js`（图标/背景生成脚本）与 `selftest/`（自测用例），属于**开发期工具，运行应用不需要**，因此未纳入本交付 zip。如需可另行获取。

### 3) 静态图片资源

**`assets/icons/`（站点图标 + PWA + 社交分享，共 15 个）**

| 文件 | 用途 |
|---|---|
| `favicon.svg` | 浏览器标签图标（矢量，首选）。 |
| `favicon-16.png` / `favicon-32.png` | 16/32 尺寸 favicon 别名。 |
| `icon-16/32/48/64/128/180/192/512.png` | 多尺寸 PWA / 桌面图标。 |
| `apple-touch-icon.png` | iOS 主屏图标（180×180）。 |
| `logo-pixel.svg` | 像素 Logo（矢量）。 |
| `og-cover.png` | Open Graph 社交分享封面图。 |
| `manifest.webmanifest` | PWA 清单（名称/图标/主题色）。 |

**`assets/avatars/`**

| 文件 | 用途 |
|---|---|
| `vision.png` | 左侧导航「资讯」图标。 |
| `pet/happy.gif` `pet/ball.gif` `pet/bone.gif` `pet/sleep.gif` `pet/sniff.gif` `pet/think.gif` | 桌面小狗的 6 种状态动画（开心/玩球/啃骨头/睡觉/嗅探/思考）。`index.html` 默认引用 `happy.gif`。 |

**`assets/covers/`**

| 文件 | 用途 |
|---|---|
| `cover_0.jpg` ~ `cover_210.jpg`（共 211 张） | 书籍封面缩略图，由 `js/books.js` 按书名映射到具体编号。所有引用路径均存在，无死链。 |

**`assets/bg/`（可选，非运行必需）**

| 文件 | 用途 |
|---|---|
| `bg-pixel-dots.png` `bg-pixel-grid.png` `bg-sakura-confetti.png` | 装饰性像素背景瓦片，由 `tools/gen_assets.js` 生成，可作为主题背景候选；当前主题背景功能以用户本地上传图片为主，故这 3 张图不参与运行依赖。 |

---

## 四、引用关系（谁加载谁）

1. **HTML → CSS**：`index.html` 第 20 行 `<link rel="stylesheet" href="css/style.css?v=20260808">`。所有本地 `css/*.css` 与 `js/*.js` 引用均带 `?v=20260808` 版本号（缓存失效用），静态服务器会忽略查询串正常返回文件，不影响 `file://` 双击打开。
2. **HTML → JS**：`index.html` 末尾按依赖顺序依次 `<script src>` 引入（见下），全部为普通脚本，依赖全局函数与 `window` 挂载：
   ```
   data.js → api.js → books.js → bookRecommend.js → inspirations.js → inspiration.js
          → takeout.js → water.js → recipe.js → period.js → life.js
          → vision_data.js → vision.js → ai_helper.js → app.js
          → backup.js → quicknote.js → inspiration_add.js → takeout_enhance.js
          → portfolio.js → portfolio_chars.js → portfolio_world.js → portfolio_insp.js
          → fitness_app.js → finance_app.js → schedule_app.js
   ```
   - `app.js` 最后加载并负责初始化全部模块；各子模块通过 `window.renderXxx` / `ScheduleAPI` / `awardEnergy` 等暴露接口，`app.js` 在 `renderers` 中惰性调用，避免加载顺序问题。
3. **JS → CSS 变量**：所有模块只使用 `style.css` 中定义的主题变量（`--primary`、`--bg-card`、`--text-main`、`--danger` 等），切换主题整体联动，**不写死颜色**。
4. **JS → 图片**：
   - 图标：`index.html` 的 `data-icon="vision.png"` 由 `app.js` 通过 `NAV_ICON_BASE64`/路径填充到 `.nav-icon`；导航 SVG 图标以 base64 内联（`NAV_ICON_BASE64`），无外链。
   - 小狗：`index.html` `<img id="petImg" src="assets/avatars/pet/happy.gif">`。
   - 封面：`books.js` → `assets/covers/cover_*.jpg`。
   - 站点图标/分享图：`index.html` `<head>` 内 `<link>` / `<meta>` 引用 `assets/icons/*`。
5. **数据流向**：用户数据 → `localStorage`（主键 `pixel_workbench_v3`）；AI Key → 独立键 `pixel_workbench_ai`；主题背景 → 独立键 `pixel_workbench_background`。三者互不污染，导出主数据时不会泄露 API Key。

---

## 五、数据存储说明（用户须知）

| 存储键 | 内容 | 导出/清除 |
|---|---|---|
| `pixel_workbench_v3` | 全部业务数据（日程、日记、记账、健身、书架、灵感等） | 由「备份」按钮导出/导入；「清除数据」按钮会清空 |
| `pixel_workbench_ai` | AI 平台 / 模型 / API 地址 / **Key** | 仅在 AI 设置面板内「清除配置」时删除，不随主数据导出 |
| `pixel_workbench_background` | 用户导入的主题背景图（base64）+ 模糊/亮度/透明度参数 | 「恢复默认」时删除 |
| `pixel_workbench_timeline` | 桌面「今日时间线」的跨模块操作动态（类型 / 时间戳 / 是否撤销），上限 400 条滚动覆盖 | 「清除数据」时随主数据一起清空 |

> 安全提示：API Key 在页面中默认隐藏、仅显示末 4 位、仅发往用户填写的官方地址；请勿将 Key 粘贴到聊天 / 群聊 / 截图。

---

## 六、本交付包已包含 / 已排除

**包含（运行必需）：** `index.html`、`css/style.css`、`js/*`（26 个）、`assets/icons/*`（15 个）、`assets/avatars/*`（含 `pet/` 6 个 GIF）、`assets/covers/*`（211 张）、`assets/bg/*`（3 张，可选）、`README.md`、`DELIVERY.md`。

**已排除（非运行必需 / 临时）：** `.workbuddy/`（工作台内部数据）、`_verify*.txt` / `_verify_urls.py` / `err.tmp`（早期验证脚本与临时文件）、`daily-schedule.html`（早期未启用的独立页面）、`tools/`、`selftest/`（开发期工具与自测）。如需要这些文件，可单独索取。

---

## 六-B、本次交付包含的定制改动（相较最初版本）

本交付包在原始像素工作台基础上，已应用以下七项定制（均为纯前端改动，不影响数据格式与部署方式）：

1. **主题背景中性毛玻璃**：导入图片作背景后自动套用「中性无色毛玻璃」——底色与遮罩改为中性白 / 中性深灰（去除原粉色调），叠加模糊 + 半透明磨砂遮罩，柔和自然且保留图片可见性与前景可读性。涉及文件：`css/style.css`、`js/app.js`。
2. **日程「历史浏览」精简**：移除日期选择器和「跳转」按钮（`js/schedule_app.js` 的 `historyView` 与事件委托 `pick` 分支、`css/style.css` 的 `.sched-picker-*` 样式）。
3. **日程统计栏精简**：移除「本月面试 / 本月学习」两个统计标签及其专属计算逻辑，仅保留「共 X 天 / 累计 X 条」。
4. **桌面今日时间线 · 跨模块自动同步（具体文案）**：在桌面「🗓 今日时间线」面板，除了原有当日日程事件，现在会**自动并入各分栏的操作动态**，且每条动态都是**具体描述**而非笼统的「做了一次操作」。示例：
   - 饮水 → `喝了 200ml 水`
   - 记账 → `记了一笔 ¥50 支出` + 备注「午饭」
   - 书架 → `往书架加了《三体》`
   - 外卖 → `吃了「黄焖鸡」`；菜谱 → `打卡了菜谱「番茄炒蛋」`
   - 日记 → `记了一篇日记` + 「今天很开心」
   - 灵感 → `记了一条灵感` + 摘要
   - 健身 → `完成了HIIT训练`
   - 桌面宠物（旺仔）→ `抚摸了旺仔` / `喂了旺仔零食` / `陪旺仔玩了会儿` / `和旺仔聊了会儿`
   - AI 助手 → `和 AI 助手聊了会儿`
   实现方式：利用全局动作枢纽 `awardEnergy()` 作为唯一埋点，每个操作把细节（饮水量 / 书名 / 金额 / 分类 / 备注 / 宠物名等）透传给 `logTimelineActivity()`；`TIMELINE_TYPE_MAP` 为每个类型提供 `make(opts)` 生成具体 `{标题, 副标题}`，`buildTimelineText()` 兜底用交互规则中文 label；`renderDesktopTimeline()` 合并「当日日程 + 跨模块动态」按时间渲染，动态条目带图标徽标、点击跳回对应分栏，并通过 `timeline-changed` 事件自动重渲染。涉及文件：`js/app.js`（地图 + 采集 + 合并渲染 + 监听器 + 暴露 `window.renderDesktopTimeline`）、`js/life.js` `js/finance_app.js` `js/inspiration_add.js` `js/fitness_app.js`（调用点补传操作细节）、`css/style.css`（`.dt-act` 等样式）。逻辑单测 11/11 通过。
5. **导航「记账」置顶**：侧边栏与移动端抽屉导航中，「记账」从原靠后位置移到「桌面」之后、「日程」之前，成为桌面下方第一个功能模块，点击即用。涉及文件：`index.html`（`.nav-item` / `.drawer-nav-item` 兄弟节点重排）。
6. **桌面时间线区分收入 / 支出**：记账同步到时间线时，原生成器把 `type` 当中文「收入/支出」判断，而记账模块实际传英文 `'income'/'expense'`，导致收支被吞掉只显示「记了一笔 ¥X」。改为按英文/中文双判定，输出「记了一笔支出 -¥X / 记了一笔收入 +¥X」（带 +/- 符号与「收入/支出」字样）；纯撤销显示「撤销了一笔记账」。涉及文件：`js/app.js`（`TIMELINE_TYPE_MAP.finance.make`）。逻辑单测 5/5 通过。
7. **记账模块内「快速记账」入口置顶**：在「记账」分栏内，新增顶部「✨ 快速记账」卡片，把「🏷 分类管理 / + 收入 / + 支出」三个按钮从「账目明细」卡片头部抽离，放到页面最上方，一进记账页即可记账；「账目明细」卡片只保留筛选与列表。涉及文件：`js/finance_app.js`（`entryCard()` + `renderFinanceModule()` 顺序调整）、`css/style.css`（`.fin-quick-card` 紧凑样式）。`finance_app.js` 通过 `node --check`。

> 缓存策略：所有本地 `css/*.css` 与 `js/*.js` 引用均带 `?v=20260808` 版本号（见第四节）；再次分发或部署后若需强制浏览器刷新，可将该版本号 +1。

---

## 七、预览

- 最稳妥方式：**直接双击解压后的 `index.html`**（以 `file://` 打开，纯前端可离线运行，`?v=` 查询串会被忽略，不影响加载）。
- 也可起本地静态服务器：`python -m http.server 8081`，访问 `http://localhost:8081/index.html`（注意：若浏览器与该服务器不在同一网络环境，可能需改用本机回环地址 `http://127.0.0.1:8081` 或 `file://` 方式）。
