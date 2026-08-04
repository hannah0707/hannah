/* =========================================================================
 * bookRecommend.js —— 「今日书单推荐」推荐逻辑 + 渲染（纯前端）
 * -------------------------------------------------------------------------
 * 设计要点：
 *   1. 数据来源：window.BOOKS（见 books.js），全部预置在文件里，无后端。
 *   2. 每日推荐：用「当天日期」作为随机种子，确定性洗牌后取前 8 本。
 *      - 同一天内刷新页面 → 种子相同 → 推荐结果保持一致；
 *      - 第二天（日期变） → 种子变 → 自动换新的一批。
 *   3. 分类筛选：顶部按钮切换分类（全部 / 小说 / 历史 / …），每个分类内
 *      同样按「日期 + 分类」做确定性洗牌，保证当天同分类稳定。
 *   4. 换一批：点击右上角「🎲 换一批」手动重新随机；为保持「当天内稳定」，
 *      手动偏移量按日期存进 localStorage，刷新后仍保持手动选的那一批。
 *   5. 阅读记录：点击「豆瓣查看 / 微信读书搜」会把浏览行为写入 localStorage，
 *      作为用户的阅读/兴趣记录（纯前端、无后端）。
 *   6. 链接：书名/封面点击、以及「豆瓣查看」按钮 → 新标签页打开豆瓣页；
 *      「微信读书搜」按钮 → 新标签页打开微信读书搜索页（均真实可打开）。
 *
 * 交互方式：采用【事件委托】——只在 document 上绑定一次点击监听，
 * 通过 closest 判定点击目标（换一批 / 分类标签 / 卡片动作）。
 * 这样无论 render() 内部是否异常、是否反复重渲染，按钮都永远有效。
 *
 * 暴露接口：window.renderBookRecommend()  —— 由 app.js 的 renderReading() 调用。
 * ========================================================================= */

(function () {
  'use strict';

  /* ----------------------------- 配置 ----------------------------- */

  // 分类标签（顺序即筛选栏顺序；id 与 books.js 中 category 字段一致）
  var CATEGORIES = [
    { id: 'all', label: '全部' },
    { id: '小说', label: '小说' },
    { id: '历史', label: '历史' },
    { id: '科技', label: '科技' },
    { id: '哲学', label: '哲学' },
    { id: '心理学', label: '心理学' },
    { id: '经济', label: '经济' },
    { id: '艺术', label: '艺术' },
    { id: '传记', label: '传记' },
    { id: '散文', label: '散文' },
    { id: '社会科学', label: '社会科学' }
  ];

  var DAILY_COUNT = 8;          // 每天推荐 8 本
  var STORAGE_OFFSET = 'hannah_book_offset';     // localStorage：当天的手动换一批偏移
  var STORAGE_RECORDS = 'hannah_book_records';   // localStorage：用户的阅读/兴趣记录

  /* --------------------------- 状态（会话内） --------------------------- */
  var currentCategory = 'all';   // 当前选中的分类
  var manualOffset = 0;          // 手动换一批偏移量（会话内）

  /* --------------------------- 工具函数 --------------------------- */

  // 简单转义，防止书名/作者里的特殊字符破坏 HTML
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // 轻量 toast（复用 app.js 的全局 toast，若不存在则降级为 console）
  function toast(msg) {
    if (typeof window.toast === 'function') {
      window.toast(msg);
    } else if (window.console) {
      console.log('[书单] ' + msg);
    }
  }

  // 今天日期字符串 YYYY-MM-DD（与 app.js 的 getDateStr 同格式）
  function todayStr() {
    var d = new Date();
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    var day = ('0' + d.getDate()).slice(-2);
    return d.getFullYear() + '-' + m + '-' + day;
  }

  // 字符串 → 32 位整数哈希（用于把分类名混入种子）
  function hashStr(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  // 确定性伪随机（mulberry32）：同一个 seed 永远得到同一串随机数
  function makeRng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 确定性洗牌：同一 seed 下，数组顺序完全可复现（Fisher–Yates）
  function seededShuffle(arr, seed) {
    var a = arr.slice();
    var rng = makeRng(seed);
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  /* --------------------------- localStorage 读写 --------------------------- */

  function lsGet(key, fallback) {
    try {
      var v = window.localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  }
  function lsSet(key, val) {
    try { window.localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  // 读取「当天的」手动换一批偏移
  function getDayOffset() {
    var map = lsGet(STORAGE_OFFSET, {});
    return (map && typeof map[todayStr()] === 'number') ? map[todayStr()] : 0;
  }
  function setDayOffset(n) {
    var map = lsGet(STORAGE_OFFSET, {}) || {};
    map[todayStr()] = n;
    lsSet(STORAGE_OFFSET, map);
  }

  // 阅读记录：记录某本书被「查看/搜索」过（存书名 -> {status, updatedAt}）
  function recordBookView(title, status) {
    var rec = lsGet(STORAGE_RECORDS, {}) || {};
    rec[title] = { status: status || 'viewed', updatedAt: new Date().toISOString() };
    lsSet(STORAGE_RECORDS, rec);
  }

  // 是否已加入「我的书架」：复用 app.js 的存储（pixel_workbench_v3 -> state.reading.books）
  function isOnShelf(title) {
    try {
      var raw = window.localStorage.getItem('pixel_workbench_v3');
      if (!raw) return false;
      var st = JSON.parse(raw);
      var books = st && st.reading && st.reading.books;
      if (!Array.isArray(books)) return false;
      return books.some(function (b) { return b.title === title; });
    } catch (e) { return false; }
  }

  /* --------------------------- 推荐核心 --------------------------- */

  // 根据当前分类 + 日期种子 + 手动偏移，挑出当天要展示的书
  function pickBooks() {
    var all = window.BOOKS || [];
    var pool = (currentCategory === 'all')
      ? all
      : all.filter(function (b) { return b.category === currentCategory; });

    if (pool.length === 0) return [];

    // 种子 = 日期数字 + 分类哈希 + 手动偏移（保证：同天同分类稳定；换一批变化；次日报新）
    var dayNum = parseInt(todayStr().replace(/-/g, ''), 10);
    var seed = (dayNum + hashStr(currentCategory) + manualOffset * 1000003) >>> 0;

    var shuffled = seededShuffle(pool, seed);
    return shuffled.slice(0, Math.min(DAILY_COUNT, shuffled.length));
  }

  // 在全部书中按书名找一本（用于点击动作时定位链接）
  function findBook(title) {
    var all = window.BOOKS || [];
    for (var i = 0; i < all.length; i++) {
      if (all[i].title === title) return all[i];
    }
    return null;
  }

  /* --------------------------- 渲染（只产出 HTML） --------------------------- */

  // 单张书卡 HTML（不含内联 onclick，交互全部走事件委托）
  function cardHtml(b) {
    var coverHtml = b.cover
      ? '<img class="book-cover-img" src="' + esc(b.cover) + '" alt="' + esc(b.title) + '" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\';this.parentNode.classList.add(\'no-cover\')">'
      : '<div class="book-cover-ph">' + esc(b.title) + '</div>';
    var rec = getBookRecord(b.title);
    var recBadge = rec ? '<span class="book-rec-badge">✓ 已记录</span>' : '';
    // 是否已加入书架（复用 app.js 的「我的书架」存储）
    var onShelf = isOnShelf(b.title);
    var shelfLabel = onShelf ? '✓ 已在书架' : '📚 加入书架';
    var shelfCls = onShelf ? ' book-act-shelf added' : ' book-act-shelf';
    return '' +
      '<div class="book-card" data-title="' + esc(b.title) + '">' +
        '<div class="book-cover" data-act="douban" data-title="' + esc(b.title) + '">' + coverHtml + '</div>' +
        '<div class="book-title" data-act="douban" data-title="' + esc(b.title) + '">' + esc(b.title) + '</div>' +
        '<div class="book-author">' + esc(b.author) + '</div>' +
        '<div class="book-rating">★ ' + (b.rating != null ? b.rating : '—') + ' <span class="book-rating-tag">豆瓣</span></div>' +
        '<div class="book-intro">' + esc(b.summary) + '</div>' +
        '<div class="book-actions">' +
          '<button class="book-act" data-act="douban" data-title="' + esc(b.title) + '">豆瓣查看</button>' +
          '<button class="book-act" data-act="weread" data-title="' + esc(b.title) + '">微信读书搜</button>' +
        '</div>' +
        '<button class="' + shelfCls + '" data-act="shelf" data-title="' + esc(b.title) + '" data-author="' + esc(b.author) + '"' + (onShelf ? ' disabled' : '') + '>' + shelfLabel + '</button>' +
        recBadge +
      '</div>';
  }

  // 阅读记录读取（卡片徽标用）
  function getBookRecord(title) {
    var rec = lsGet(STORAGE_RECORDS, {}) || {};
    return rec[title] || null;
  }

  function render() {
    var tabsEl = document.getElementById('bookTypeTabs');
    var listEl = document.getElementById('bookRecommendList');
    var dateEl = document.getElementById('bookRecommendDate');
    if (!listEl) return; // 阅读视图尚未就绪，跳过

    // 同步会话偏移为当天已存值（保证刷新后保持手动选的那一批）
    manualOffset = getDayOffset();

    // 1) 日期
    if (dateEl) dateEl.textContent = todayStr();

    // 2) 分类筛选标签（仅渲染，点击交给事件委托）
    if (tabsEl) {
      tabsEl.innerHTML = CATEGORIES.map(function (c) {
        var active = (c.id === currentCategory) ? ' active' : '';
        return '<div class="book-type-tab' + active + '" data-cat="' + esc(c.id) + '">' + esc(c.label) + '</div>';
      }).join('');
    }

    // 3) 推荐书单
    var books = pickBooks();
    if (!books.length) {
      listEl.innerHTML = '<div class="empty-state"><span class="empty-state-icon">📚</span>该分类暂无推荐，换一批或选「全部」试试～</div>';
    } else {
      listEl.innerHTML = books.map(cardHtml).join('');
    }

    // 4) 确保事件委托已挂上（只挂一次，幂等）
    bindControls();
  }

  /* --------------------------- 事件委托（核心健壮性修复） --------------------------- */

  // 一次性绑定：把监听挂到 document，任何重渲染都不会让按钮失效
  var controlsBound = false;
  function bindControls() {
    if (controlsBound) return;
    controlsBound = true;
    if (!document || !document.addEventListener) return;
    document.addEventListener('click', onGlobalClick);
  }

  // 极简 closest 兼容（旧浏览器/个别环境没有 Element.closest）
  function closest(el, selector) {
    while (el && el !== document) {
      try {
        if (el.matches && el.matches(selector)) return el;
      } catch (e) { /* 选择器非法时忽略 */ }
      el = el.parentNode;
    }
    return null;
  }

  function onGlobalClick(e) {
    var t = e.target;
    if (!t || !t.nodeType) return; // 非元素节点忽略

    // (a) 换一批按钮
    if (t.id === 'bookRefreshBtn' || closest(t, '#bookRefreshBtn')) {
      e.preventDefault();
      doRefresh();
      return;
    }

    // (b) 分类标签
    var tab = closest(t, '.book-type-tab');
    if (tab && tab.getAttribute('data-cat')) {
      doCategory(tab.getAttribute('data-cat'));
      return;
    }

    // (c) 卡片内动作（豆瓣/微信读书/加入书架）
    var actEl = closest(t, '[data-act]');
    if (actEl && closest(t, '.book-card')) {
      handleCardAct(actEl);
      return;
    }
  }

  /* --------------------------- 动作处理 --------------------------- */

  function doRefresh() {
    manualOffset = getDayOffset() + 1;   // 在当天基础上 +1
    setDayOffset(manualOffset);          // 持久化，刷新仍保持
    render();
    toast('🔄 已换一批新书');
  }

  function doCategory(cat) {
    currentCategory = cat;
    manualOffset = 0;            // 切分类时回到该分类的当天默认推荐
    setDayOffset(0);
    render();
  }

  function handleCardAct(actEl) {
    var act = actEl.getAttribute('data-act');
    var title = actEl.getAttribute('data-title');

    // 加入「我的书架」：复用 app.js 的 addBookToShelf
    if (act === 'shelf') {
      if (actEl.disabled) return;
      var author = actEl.getAttribute('data-author');
      if (typeof window.addBookToShelf === 'function') {
        try {
          window.addBookToShelf(title, author);
          // addBookToShelf 内部会重渲染阅读视图，按钮状态会自动更新为「✓ 已在书架」
        } catch (err) {
          console.error('[书单] 加入书架失败：', err);
          toast('加入书架失败，请稍后重试');
        }
      } else {
        toast('书架功能未就绪');
      }
      return;
    }

    var book = findBook(title);
    if (!book) return;

    if (act === 'douban') {
      recordBookView(book.title, 'douban');
      window.open(book.doubanUrl, '_blank', 'noopener');
    } else if (act === 'weread') {
      recordBookView(book.title, 'weread');
      window.open(book.wereadSearchUrl, '_blank', 'noopener');
    }
  }

  // 暴露给 app.js 调用
  window.renderBookRecommend = render;

  // 立即挂上事件委托（即便 render 尚未被调用，按钮也已生效）
  if (typeof document !== 'undefined') bindControls();

  if (window.console && console.log) {
    console.log('[bookRecommend.js] 已就绪（事件委托），分类数：' + CATEGORIES.length);
  }
})();
