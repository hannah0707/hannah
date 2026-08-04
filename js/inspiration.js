/**
 * 灵感板块 —— 纯前端渲染与交互（无后端、无数据库）
 * 数据见 js/inspirations.js（window.INSPIRATIONS）
 * 收藏数据存 localStorage（key: hannah_insp_fav）
 *
 * 功能：
 *  - 顶部 6 个分类 Tab + “⭐ 我的收藏” Tab
 *  - 每个分类默认随机展示 6 条；点底部“🎲 换一批”重新随机
 *  - 点击卡片（标题/简介/封面区）→ 新标签页打开真实原文链接
 *  - 每张卡片右上角 ☆/★ 收藏按钮，收藏存 localStorage
 *  - “⭐ 我的收藏”展示所有已收藏内容
 *
 * 采用 document 事件委托，按钮永远有效，不会因重渲染失效。
 */
(function () {
  'use strict';

  // ---------- 基础配置 ----------
  var CATS = ['写作指导', '影视解说', '书籍推荐', '文学', '播客', '诗词文学'];
  var FAV_KEY = 'hannah_insp_fav';          // localStorage 收藏键
  var PER_CAT = 6;                          // 每分类默认展示条数

  // 每个分类的“随机种子偏移”，刷新页面随机、换一批 +1（当天/当次会话内稳定）
  var offsets = {};
  CATS.forEach(function (c) { offsets[c] = Math.floor(Math.random() * 9973); });
  offsets['⭐ 我的收藏'] = 0;

  var activeCat = CATS[0];                  // 默认进入第一个分类
  var favCache = null;                      // 收藏缓存

  // ---------- 工具函数 ----------
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  // 收藏用的复合键：分类 + 标题（避免不同分类同名作品冲突，如“红楼梦”）
  function favKey(item) { return item.category + '||' + item.title; }

  function getFav() {
    if (favCache) return favCache;
    try { favCache = JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); }
    catch (e) { favCache = []; }
    if (!Array.isArray(favCache)) favCache = [];
    return favCache;
  }
  function setFav(arr) { favCache = arr; try { localStorage.setItem(FAV_KEY, JSON.stringify(arr)); } catch (e) {} }
  function isFav(item) { return getFav().indexOf(favKey(item)) >= 0; }
  function toggleFav(item) {
    var f = getFav();
    var k = favKey(item);
    var i = f.indexOf(k);
    if (i >= 0) f.splice(i, 1); else f.push(k);
    setFav(f);
  }

  function getByCat(cat) {
    return (window.INSPIRATIONS || []).filter(function (x) { return x.category === cat; });
  }

  // 确定性洗牌：用 分类名 + 偏移 作为种子，保证“换一批会变、刷新保持”
  function hashStr(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }
  function makeRng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seededShuffle(arr, seed) {
    var a = arr.slice();
    var rng = makeRng(seed);
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function pick(cat, count) {
    var pool = getByCat(cat);
    var seed = (hashStr(cat) + (offsets[cat] || 0) * 1000003) >>> 0;
    return seededShuffle(pool, seed).slice(0, count);
  }

  // ---------- 单张卡片 ----------
  function cardHTML(item) {
    var fav = isFav(item);
    // 视频 / 播客 角标（需求：明确标注类型）
    var typeBadge = '';
    if (item.type === 'video') typeBadge = '<span class="insp-type-badge video">▶ 视频</span>';
    else if (item.type === 'podcast') typeBadge = '<span class="insp-type-badge podcast">🎧 播客</span>';

    return '' +
      '<div class="insp-card" data-title="' + esc(item.title) + '" data-url="' + esc(item.url) + '">' +
        // 右上角收藏按钮
        '<div class="insp-fav ' + (fav ? 'on' : '') + '" data-act="fav" data-cat="' + esc(item.category) + '" data-title="' + esc(item.title) + '" title="收藏/取消收藏">' + (fav ? '★' : '☆') + '</div>' +
        typeBadge +
        '<div class="insp-title">' + esc(item.title) + '</div>' +
        '<div class="insp-src-line"><span class="insp-src">' + esc(item.source) + '</span></div>' +
        '<div class="insp-desc">' + esc(item.summary) + '</div>' +
        '<div class="insp-tags">' + (item.tags || []).map(function (t) { return '<span class="insp-tag">' + esc(t) + '</span>'; }).join('') + '</div>' +
        '<div class="insp-go">查看原文 →</div>' +
      '</div>';
  }

  // ---------- 渲染列表 ----------
  function renderList() {
    var listEl = document.getElementById('inspirationList');
    var dateEl = document.getElementById('inspirationDate');
    if (!listEl) return;

    // “⭐ 我的收藏” Tab
    if (activeCat === '⭐ 我的收藏') {
      var keys = getFav();
      var items = [];
      (window.INSPIRATIONS || []).forEach(function (x) {
        if (keys.indexOf(favKey(x)) >= 0) items.push(x);
      });
      if (!items.length) {
        listEl.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><span class="empty-state-icon">⭐</span>还没有收藏，点卡片右上角的 ☆ 收藏喜欢的内容吧～</div>';
      } else {
        listEl.innerHTML = items.map(cardHTML).join('') +
          '<div style="grid-column:1/-1; text-align:center; padding:10px 0; color:var(--text-mid); font-size:12px;">⭐ 共收藏 ' + items.length + ' 条</div>';
      }
        if (dateEl) dateEl.textContent = '⭐ 我的收藏 · 共 ' + items.length + ' 条';
        if (window.__inspRenderUser) window.__inspRenderUser(listEl, activeCat); // 混入用户新增
        return;
    }

    // 普通分类
    var items = pick(activeCat, PER_CAT);
    if (!items.length) {
      listEl.innerHTML = '<div class="empty-state" style="grid-column:1/-1;"><span class="empty-state-icon">💡</span>这个分类暂时没有内容，换一个看看～</div>';
      if (dateEl) dateEl.textContent = '';
      if (window.__inspRenderUser) window.__inspRenderUser(listEl, activeCat); // 混入用户新增（即便预置为空）
      return;
    }
    listEl.innerHTML = items.map(cardHTML).join('') +
      // 每分类底部的“换一批”按钮（grid-column:1/-1 占满整行）
      '<div style="grid-column:1/-1; text-align:center; padding:10px 0;">' +
        '<button class="insp-refresh-btn" data-act="refresh">🎲 换一批</button>' +
      '</div>';
    if (dateEl) dateEl.textContent = '📌 ' + activeCat + ' · 随机推荐 ' + items.length + ' 条（点卡片看原文，☆ 收藏）';
    if (window.__inspRenderUser) window.__inspRenderUser(listEl, activeCat); // 混入用户新增灵感
  }

  // ---------- 渲染 Tab ----------
  function renderTabs() {
    var tabsEl = document.getElementById('sourceTabs');
    if (!tabsEl) return;
    var all = CATS.concat(['⭐ 我的收藏']);
    tabsEl.innerHTML = all.map(function (c) {
      return '<div class="source-tab ' + (c === activeCat ? 'active' : '') + '" data-cat="' + esc(c) + '">' + esc(c) + '</div>';
    }).join('');
  }

  function render() { renderTabs(); renderList(); }

  // ---------- 事件委托（document 一次性绑定，永不失效） ----------
  document.addEventListener('click', function (e) {
    // 1) 分类 Tab 切换
    var tab = e.target.closest('.source-tab');
    if (tab) { activeCat = tab.getAttribute('data-cat'); render(); return; }

    // 2) 收藏按钮（阻止冒泡，避免触发卡片打开）
    var fav = e.target.closest('[data-act="fav"]');
    if (fav) {
      e.stopPropagation();
      toggleFav({ category: fav.getAttribute('data-cat'), title: fav.getAttribute('data-title') });
      renderList(); // 重新渲染列表，刷新收藏状态 / 我的收藏数
      return;
    }

    // 2.5) 用户手动新增灵感的 编辑 / 删除（交给 inspiration_add.js 处理）
    var uedit = e.target.closest('[data-act="user-edit"]');
    if (uedit) { e.stopPropagation(); if (window.__inspUserEdit) window.__inspUserEdit(uedit.getAttribute('data-id')); return; }
    var udel = e.target.closest('[data-act="user-del"]');
    if (udel) { e.stopPropagation(); if (window.__inspUserDelete) window.__inspUserDelete(udel.getAttribute('data-id')); return; }

    // 3) 换一批按钮
    var ref = e.target.closest('[data-act="refresh"]');
    if (ref) {
      offsets[activeCat] = (offsets[activeCat] || 0) + 1;
      renderList();
      return;
    }

    // 4) 点击卡片 → 新标签页打开原文
    var card = e.target.closest('.insp-card');
    if (card) {
      var u = card.getAttribute('data-url');
      if (u) window.open(u, '_blank', 'noopener');
      return;
    }
  });

  // ---------- 保留原有搜索框（在当前展示结果内过滤） ----------
  var searchEl = document.getElementById('inspirationSearch');
  if (searchEl) {
    searchEl.addEventListener('input', function () {
      var q = this.value.trim().toLowerCase();
      var cards = document.querySelectorAll('#inspirationList .insp-card');
      cards.forEach(function (c) {
        var txt = (c.getAttribute('data-title') + ' ' + c.textContent).toLowerCase();
        c.style.display = (!q || txt.indexOf(q) >= 0) ? '' : 'none';
      });
    });
  }

  // 顶部原来的全局“换一批”按钮已下移为每分类底部按钮，这里隐藏以免重复
  var oldRefresh = document.getElementById('inspirationRefresh');
  if (oldRefresh) oldRefresh.style.display = 'none';

  // 暴露给 app.js（app.js 切换灵感视图时调用）
  window.renderInspiration = render;
})();
