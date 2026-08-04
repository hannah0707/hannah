/* =====================================================================
 * takeout_enhance.js —— 外卖模块增强（纯前端，仅扩展 window.Takeout）
 * ---------------------------------------------------------------------
 * 功能：
 *  1) 黑名单：takeout_blacklist（含过期时间）。随机选餐与列表自动屏蔽。
 *  2) 排序：吃过次数最多 / 距上次进食由久到近 / 收藏靠前。
 *  3) 进阶随机：优先推荐 7 天以上没吃过的；连续 3 次选中同一店铺自动拉黑 1 天。
 * 实现方式：包裹 window.Takeout.filter（列表与选餐池共用），并暴露
 * window.TakeoutEnhance 供 life.js 调用（排序、smartPick、黑名单管理）。
 * 不改动 takeout.js / 不破坏原有增删改查与收藏逻辑。
 * ===================================================================== */
(function () {
  'use strict';

  var BL_KEY = 'takeout_blacklist';   // [{ id, until }]  until: YYYY-MM-DD（含当天仍生效）
  var SORT_KEY = 'takeout_sort_mode'; // 'eatCount' | 'lastEat' | 'fav'
  var HIST_KEY = 'takeout_pick_history'; // 最近选中的店铺 id（最多保留 5 条）

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function dateAfter(days) {
    var d = new Date();
    d.setDate(d.getDate() + days);
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  // ---------- 黑名单 ----------
  function loadBL() {
    try { var a = JSON.parse(localStorage.getItem(BL_KEY) || '[]'); return Array.isArray(a) ? a : []; }
    catch (e) { return []; }
  }
  function saveBL(arr) { try { localStorage.setItem(BL_KEY, JSON.stringify(arr)); } catch (e) {} }
  function isBlacklisted(id) {
    var t = todayStr();
    return loadBL().some(function (x) { return x.id === id && x.until >= t; });
  }
  function addBlacklist(id, days) {
    var arr = loadBL().filter(function (x) { return x.id !== id; });
    arr.push({ id: id, until: dateAfter(days || 1) });
    saveBL(arr);
  }
  function removeBlacklist(id) {
    saveBL(loadBL().filter(function (x) { return x.id !== id; }));
  }

  // ---------- 排序 ----------
  function getSort() {
    try { return localStorage.getItem(SORT_KEY) || 'lastEat'; } catch (e) { return 'lastEat'; }
  }
  function setSort(mode) { try { localStorage.setItem(SORT_KEY, mode); } catch (e) {} }

  function applyListSort(list, mode) {
    if (!Array.isArray(list)) return list;
    var arr = list.slice();
    if (mode === 'eatCount') {
      arr.sort(function (a, b) { return (b.eatCount || 0) - (a.eatCount || 0); });
    } else if (mode === 'lastEat') {
      arr.sort(function (a, b) {
        var da = window.Takeout ? window.Takeout.daysAgo(a.lastEatDate) : 9999;
        var db = window.Takeout ? window.Takeout.daysAgo(b.lastEatDate) : 9999;
        return db - da; // 越久没吃越靠前
      });
    } else if (mode === 'fav') {
      arr.sort(function (a, b) { return (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0); });
    }
    return arr;
  }

  // ---------- 进阶随机 ----------
  function loadHist() { try { var a = JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function saveHist(a) { try { localStorage.setItem(HIST_KEY, JSON.stringify(a.slice(-5))); } catch (e) {} }

  function weightOf(it) {
    var w = 1;
    var days = window.Takeout ? window.Takeout.daysAgo(it.lastEatDate) : 9999;
    if (days === Infinity || days >= 7) w *= 2.2;      // 很久没吃 → 加权
    else if (days <= 3) w *= 0.3;                       // 最近吃过 → 降权
    if (it.isFavorite) w *= 1.25;
    return w;
  }

  // 加权随机选一个（已保证 pool 不含黑名单）
  function weightedChoice(pool) {
    if (!pool.length) return null;
    var weights = pool.map(weightOf);
    var sum = weights.reduce(function (s, w) { return s + w; }, 0);
    var r = Math.random() * sum;
    for (var i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  // 主选餐逻辑：优先 7 天以上未吃；连续 3 次同店自动拉黑 1 天
  function smartPick(pool) {
    if (!pool || !pool.length) return null;
    var hist = loadHist();
    var lastTwo = [hist[hist.length - 1], hist[hist.length - 2]];
    var chosen = null, guard = 0;
    while (guard++ < 8) {
      var candidate = weightedChoice(pool);
      if (!candidate) break;
      // 连续 3 次同店（本次 + 历史最近两次）→ 拉黑 1 天并重选
      if (lastTwo[0] === candidate.id && lastTwo[1] === candidate.id) {
        addBlacklist(candidate.id, 1);
        if (window.toast) window.toast('🔁 连续 3 次都是「' + candidate.name + '」，已暂时拉黑 1 天');
        pool = pool.filter(function (x) { return x.id !== candidate.id; });
        if (!pool.length) { chosen = candidate; break; }
        continue;
      }
      chosen = candidate;
      break;
    }
    if (chosen) {
      hist.push(chosen.id);
      saveHist(hist);
    }
    return chosen;
  }

  // ---------- 黑名单管理弹窗 ----------
  function blacklistModal() {
    function build() {
      var all = (window.Takeout && window.Takeout.getAll) ? window.Takeout.getAll() : [];
      var rows = all.map(function (it) {
        var bl = isBlacklisted(it.id);
        return '<div class="tk-bl-row">' +
          '<span class="tk-bl-name">' + esc(it.name) + '</span>' +
          '<button class="btn ' + (bl ? 'danger' : '') + '" data-bl="' + esc(it.id) + '">' + (bl ? '移出黑名单' : '加入黑名单') + '</button>' +
        '</div>';
      }).join('');
      var mask = document.getElementById('tkBlMask');
      if (mask && mask.parentNode) mask.parentNode.removeChild(mask);
      mask = document.createElement('div');
      mask.className = 'modal-mask';
      mask.id = 'tkBlMask';
      mask.innerHTML =
        '<div class="modal" role="dialog" aria-label="外卖黑名单">' +
          '<div class="modal-title">🚫 外卖黑名单</div>' +
          '<p style="color:var(--text-mid);font-size:12px;">加入黑名单的店铺在「帮我选一个」与列表中都会自动屏蔽。</p>' +
          '<div class="tk-bl-list">' + (rows || '<div class="empty-state">暂无外卖</div>') + '</div>' +
          '<div class="modal-actions"><button class="btn" id="tkBlClose">关闭</button></div>' +
        '</div>';
      document.body.appendChild(mask);
      mask.addEventListener('click', function (e) { if (e.target === mask) close(); });
      document.getElementById('tkBlClose').addEventListener('click', close);
      mask.querySelectorAll('[data-bl]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-bl');
          if (isBlacklisted(id)) removeBlacklist(id); else addBlacklist(id, 1);
          if (window.renderLife) window.renderLife();
          build(); // 重建弹窗内容
        });
      });
    }
    function close() { var m = document.getElementById('tkBlMask'); if (m && m.parentNode) m.parentNode.removeChild(m); }
    build();
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ---------- 包裹 Takeout.filter：屏蔽黑名单 + 应用排序 ----------
  function wrapFilter() {
    if (!window.Takeout || typeof window.Takeout.filter !== 'function') return;
    var orig = window.Takeout.filter;
    window.Takeout.filter = function (filters) {
      var list = orig(filters) || [];
      list = list.filter(function (x) { return !isBlacklisted(x.id); });
      return applyListSort(list, getSort());
    };
  }

  // ---------- 事件：排序切换 / 黑名单按钮（委托，兼容 life.js 重渲染） ----------
  function bindDelegation() {
    document.addEventListener('change', function (e) {
      var sel = e.target.closest && e.target.closest('#takeoutSort');
      if (sel) {
        setSort(sel.value);
        if (window.renderLife) window.renderLife();
      }
    });
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-action="open-blacklist"]');
      if (btn) { e.stopPropagation(); blacklistModal(); }
    }, true); // 捕获阶段，确保在 life.js 之前响应；life.js 不识别该 action，无副作用
  }

  // ---------- 暴露 ----------
  window.TakeoutEnhance = {
    isBlacklisted: isBlacklisted,
    addBlacklist: addBlacklist,
    removeBlacklist: removeBlacklist,
    getBlacklist: loadBL,
    getSort: getSort,
    setSort: setSort,
    applyListSort: applyListSort,
    smartPick: smartPick,
    blacklistModal: blacklistModal
  };

  wrapFilter();
  bindDelegation();
})();
