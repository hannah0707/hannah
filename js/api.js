
/* === api.js === */
/* ============================================================
 * api.js — 统一数据请求层（Mock 占位 + 可替换接口地址）
 * ------------------------------------------------------------
 * 设计目标：
 *   1. 用 mock 数据占位，前端结构/类型先行，后端可后接；
 *   2. 部署到 HTTPS 环境（如 GitHub Pages + 独立 API 网关）后，
 *      只需把 API_BASE 改为真实后端地址，业务代码无需改动；
 *   3. 所有数据类型用 JSDoc @typedef 显式声明。
 *
 * ⚠️ GitHub Pages 仅托管静态文件，无法运行后端。
 *    因此 API_BASE 应指向一个独立可访问的 HTTPS 接口
 *    （例如 https://api.your-domain.com），而非 Pages 自身。
 *
 * 接入真实后端时：
 *   - 把 API_BASE 改为你的接口根地址；
 *   - 保证各接口返回与下方 @typedef 对齐的 JSON；
 *   - 若某个接口尚未就绪，返回 404/500 时方法会抛出异常，
 *     可在调用处 catch 并回退到本地 mock（见各方法示例）。
 * ============================================================ */
(function (global) {
  'use strict';

  /* ★ 部署到 HTTPS 后，仅修改这一行即可切换到真实后端 ★ */
  const API_BASE = ''; // 例：'https://api.your-domain.com'

  /* ----------------------------- 数据类型定义 ----------------------------- */

  /**
   * @typedef {Object} Book
   * @property {string} title   书名
   * @property {string} author  作者
   * @property {string} type    分类 id（见 data.js 的 BOOK_TYPES）
   * @property {string} intro   简介
   */

  /**
   * @typedef {Object} Inspiration
   * @property {string} id       唯一 id
   * @property {string} category 分类（文学/电影/职场…）
   * @property {string} platform 平台（B站/抖音/小红书…）
   * @property {string} title    标题
   * @property {string} url      内容页完整 URL（https）
   * @property {string} [cover]  封面图 URL（可选）
   * @property {string} [metric] 数据指标（播放/点赞，可选）
   */

  /**
   * @typedef {Object} EnglishItem
   * @property {string} word      单词
   * @property {string} phonetic  音标
   * @property {string} pos       词性
   * @property {string} cn        中文释义
   * @property {string[]} examples 例句
   */

  /**
   * @typedef {Object} HrItem
   * @property {string} title   课程/资料标题
   * @property {string} link    内容页 URL（https）
   * @property {string} platform 平台
   * @property {string} duration 时长/集数
   */

  /**
   * @typedef {Object} WorkoutPlan
   * @property {string} name      计划名
   * @property {number} calories  预计消耗（kcal）
   * @property {string[]} steps   动作步骤
   */

  /**
   * @typedef {Object} SearchResult
   * @property {string} platform 平台标识
   * @property {string} url      搜索/内容页完整 URL（https）
   */

  /* ----------------------------- 内部工具 ----------------------------- */

  /** 安全读取 data.js 暴露的全局常量，作为本地 mock 数据源 */
  function g(name, fallback) {
    try { return (typeof global[name] !== 'undefined' && global[name] != null) ? global[name] : fallback; }
    catch (e) { return fallback; }
  }

  /**
   * 统一请求封装：API_BASE 非空时请求真实后端，否则返回 null（走 mock）。
   * @param {string} path 接口路径，如 '/books/daily'
   * @param {RequestInit=} options fetch 选项
   * @returns {Promise<any>|null}
   */
  async function request(path, options) {
    if (!API_BASE) return null; // 未配置后端 → 调用方使用本地 mock
    const res = await fetch(API_BASE + path, Object.assign({
      headers: { 'Accept': 'application/json' }
    }, options || {}));
    if (!res.ok) throw new Error('API ' + path + ' 失败: ' + res.status);
    return res.json();
  }

  /* ----------------------------- 对外 API ----------------------------- */

  const Api = {
    /** 当前后端根地址（空字符串表示使用本地 mock） */
    API_BASE: API_BASE,

    /**
     * 每日推荐书单
     * @returns {Promise<Book[]>}
     */
    async getDailyBooks() {
      try { const r = await request('/books/daily'); if (r) return r; }
      catch (e) { console.warn('[api] getDailyBooks 回退 mock:', e.message); }
      return g('DAILY_BOOKS', []);
    },

    /**
     * 在线图书库
     * @returns {Promise<Book[]>}
     */
    async getBookLibrary() {
      try { const r = await request('/books/library'); if (r) return r; }
      catch (e) { console.warn('[api] getBookLibrary 回退 mock:', e.message); }
      return g('BOOK_ONLINE_LIBRARY', []);
    },

    /**
     * 灵感/内容池
     * @returns {Promise<Inspiration[]>}
     */
    async getInspirations() {
      try { const r = await request('/inspirations'); if (r) return r; }
      catch (e) { console.warn('[api] getInspirations 回退 mock:', e.message); }
      return g('INSPIRATION_POOL', []);
    },

    /**
     * 英语学习每日内容
     * @returns {Promise<EnglishItem[]>}
     */
    async getEnglishDaily() {
      try { const r = await request('/english/daily'); if (r) return r; }
      catch (e) { console.warn('[api] getEnglishDaily 回退 mock:', e.message); }
      return g('ENGLISH_DAILY', []);
    },

    /**
     * 职场/HR 每日内容
     * @returns {Promise<HrItem[]>}
     */
    async getHrDaily() {
      try { const r = await request('/hr/daily'); if (r) return r; }
      catch (e) { console.warn('[api] getHrDaily 回退 mock:', e.message); }
      return g('HR_DAILY', []);
    },

    /**
     * 健身推荐计划
     * @returns {Promise<WorkoutPlan|Object>}
     */
    async getWorkouts() {
      try { const r = await request('/workouts'); if (r) return r; }
      catch (e) { console.warn('[api] getWorkouts 回退 mock:', e.message); }
      return g('WORKOUT_RECOMMEND', {});
    },

    /**
     * 生成第三方平台搜索/内容页 URL（全部 https，指向具体结果页）。
     * 复用 data.js 中既有的各平台搜索函数；未知平台回退到搜索首页。
     * @param {string} platform 平台标识：bilibili|douyin|xiaohongshu|douban_book|douban_movie|ximalaya|weread
     * @param {string} kw 关键词
     * @returns {SearchResult}
     */
    getSearchUrl(platform, kw) {
      const map = {
        bilibili: 'searchBilibili',
        douyin: 'searchDouyin',
        xiaohongshu: 'searchXhs',
        douban_book: 'searchDoubanBook',
        douban_movie: 'searchDoubanMovie',
        ximalaya: 'searchXimalaya',
        weread: 'searchWeixinRead'
      };
      const fnName = map[platform];
      let url = '';
      if (fnName && typeof global[fnName] === 'function') {
        url = global[fnName](kw || '');
      } else if (typeof global.searchExternal === 'function') {
        url = global.searchExternal(platform, kw || '');
      }
      if (!url) url = 'https://www.baidu.com/s?wd=' + encodeURIComponent((platform || '') + ' ' + (kw || ''));
      return { platform: platform, url: url };
    }
  };

  // 兼容全局函数命名（data.js 中的搜索辅助函数别名）
  global.searchBilibili = global.searchBilibili || global._bilibiliSearch;
  global.searchDouyin = global.searchDouyin || global._douyinSearch;
  global.searchXhs = global.searchXhs || global._xhsSearch;
  global.searchDoubanBook = global.searchDoubanBook || global._doubanBookSearch;
  global.searchDoubanMovie = global.searchDoubanMovie || global._doubanMovieSearch;
  global.searchXimalaya = global.searchXimalaya || global._ximalayaSearch;
  global.searchWeixinRead = global.searchWeixinRead || global._weixinReadSearch;

  global.Api = Api;
})(typeof window !== 'undefined' ? window : this);

