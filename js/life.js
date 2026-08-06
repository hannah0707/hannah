/* === life.js === */
/* ============================================
   生活页面 - 渲染与交互（纯前端）
   - 顶部标题「生活」+ 四个 Tab：🍱 外卖推荐 / 💧 喝水记录 / 🥘 食谱 / 🩸 生理期
   - 默认显示外卖推荐
   - 数据：外卖 takeout_list / 喝水 water_setting+water_records / 食谱 recipe_list / 生理期 period_records
   - 全部事件用「事件委托」，挂载在 document 上，重渲染也不会失效
   - 对外暴露 window.renderLife()
   ============================================ */

(function () {
  'use strict';

  // —— 模块级状态（重渲染后在，不丢失）——
  var LIFE_TAB = 'takeout';
  var FILTERS = { cat: 'all', health: 'all', favOnly: false, notEaten7: false };
  var pickPool = [];      // 「帮我选」时锁定的候选池
  var pickCurrent = null; // 当前抽中的外卖

  // 食谱状态
  var recipeCat = 'all';      // 当前分类 Tab：all / 分类名 / fav / cooked
  var recipeSearch = '';      // 搜索关键词
  var recipeDiff = 'all';     // 难度筛选
  var recipeTime = 'all';     // 烹饪时间筛选（all / 15 / 30 / 45）
  var recipeCurrentId = null; // 详情页查看的菜谱 id（null=列表）

  // 食谱表单：食材行 / 步骤行的 HTML 构造（模块级，供「加一行/加一步」按钮动态复用）
  function recipeIngRow(name, amt) {
    return '<div class="r-ing-row">' +
      '<input class="life-input r-ing-name" placeholder="食材名" value="' + esc(name || '') + '">' +
      '<input class="life-input r-ing-amt" placeholder="用量" value="' + esc(amt || '') + '">' +
      '<button type="button" class="r-row-del" data-action="r-del-ing" title="删除该行">✕</button>' +
    '</div>';
  }
  function recipeStepRow(t) {
    return '<div class="r-step-row">' +
      '<input class="life-input r-step-t" placeholder="步骤说明" value="' + esc(t || '') + '">' +
      '<button type="button" class="r-row-del" data-action="r-del-step" title="删除该行">✕</button>' +
    '</div>';
  }

  // —— 工具 ——
  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function fmtTime(ts) {
    var d = new Date(ts);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function toast(msg) {
    if (typeof window.toast === 'function') { window.toast(msg); return; }
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:48px;transform:translateX(-50%);background:rgba(40,30,45,.92);color:#fff;padding:10px 16px;border-radius:10px;font-size:13px;z-index:99999;max-width:80vw;text-align:center;';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 1800);
  }

  // —— 轻量弹窗（追加到 body，不受 #view-life 重渲染影响）——
  function openModal(html) {
    closeModal();
    var mask = document.createElement('div');
    mask.className = 'life-modal-mask';
    mask.innerHTML = html;
    document.body.appendChild(mask);
    return mask;
  }
  function closeModal() {
    var m = document.querySelector('.life-modal-mask');
    if (m) m.remove();
  }

  // ============================================
  // 渲染：整页骨架
  // ============================================
  function renderLife() {
    var root = document.getElementById('view-life');
    if (!root) return;
    var tabs = [
      ['takeout', '🍱 外卖推荐'],
      ['water', '💧 喝水记录'],
      ['recipe', '🥘 食谱'],
      ['period', '🩸 生理期']
    ];
    var tabHtml = tabs.map(function (t) {
      return '<button class="life-tab ' + (LIFE_TAB === t[0] ? 'active' : '') + '" data-life-tab="' + t[0] + '">' + t[1] + '</button>';
    }).join('');

    root.innerHTML =
      '<div class="life-page">' +
        '<div class="life-header"><div class="life-title">生活</div></div>' +
        '<div class="life-tabs">' + tabHtml + '</div>' +
        '<div class="life-panel" id="lifeTakeout">' + (LIFE_TAB === 'takeout' ? renderTakeout() : '') + '</div>' +
        '<div class="life-panel" id="lifeWater" style="display:' + (LIFE_TAB === 'water' ? 'block' : 'none') + '">' + (LIFE_TAB === 'water' ? renderWater() : '') + '</div>' +
        '<div class="life-panel" id="lifeRecipe" style="display:' + (LIFE_TAB === 'recipe' ? 'block' : 'none') + '">' + (LIFE_TAB === 'recipe' ? renderRecipe() : '') + '</div>' +
        '<div class="life-panel" id="lifePeriod" style="display:' + (LIFE_TAB === 'period' ? 'block' : 'none') + '">' + (LIFE_TAB === 'period' ? renderPeriod() : '') + '</div>' +
      '</div>';
  }

  // ============================================
  // 外卖推荐
  // ============================================
  function renderTakeout() {
    var curSort = (window.TakeoutEnhance && window.TakeoutEnhance.getSort) ? window.TakeoutEnhance.getSort() : 'lastEat';
    return '' +
      '<div class="life-toolbar">' +
        '<div class="life-filters">' +
          '<select class="life-select" data-filter="cat">' +
            '<option value="all">全部品类</option>' +
            Takeout.CATS.map(function (c) { return '<option value="' + esc(c) + '"' + (FILTERS.cat === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') +
          '</select>' +
          '<select class="life-select" data-filter="health">' +
            '<option value="all">全部健康度</option>' +
            Takeout.HEALTH.map(function (h) { return '<option value="' + esc(h) + '"' + (FILTERS.health === h ? ' selected' : '') + '>' + esc(h) + '</option>'; }).join('') +
          '</select>' +
          '<label class="life-check"><input type="checkbox" data-filter="favOnly"' + (FILTERS.favOnly ? ' checked' : '') + '> 只看收藏</label>' +
          '<label class="life-check"><input type="checkbox" data-filter="notEaten7"' + (FILTERS.notEaten7 ? ' checked' : '') + '> 近7天没吃</label>' +
        '</div>' +
        '<select class="life-select" id="takeoutSort" title="列表排序方式">' +
          '<option value="lastEat"' + (curSort === 'lastEat' ? ' selected' : '') + '>排序：久未吃优先</option>' +
          '<option value="eatCount"' + (curSort === 'eatCount' ? ' selected' : '') + '>排序：吃过最多</option>' +
          '<option value="fav"' + (curSort === 'fav' ? ' selected' : '') + '>排序：收藏靠前</option>' +
        '</select>' +
        '<button class="btn life-bl-btn" data-action="open-blacklist" title="外卖黑名单">🚫 黑名单</button>' +
        '<button class="btn primary life-add-btn" data-action="add">＋ 添加</button>' +
      '</div>' +

      '<button class="life-pick-btn" data-action="pick">🎲 帮我选一个</button>' +

      '<div class="life-list" id="takeoutList">' + takeoutListHTML() + '</div>';
  }

  function takeoutListHTML() {
    var list = Takeout.filter(FILTERS);
    if (!list.length) {
      return '<div class="life-empty">没有符合筛选的外卖～<br>试试放宽条件，或点「＋ 添加」一条</div>';
    }
    return list.map(takeoutCardHTML).join('');
  }

  function takeoutCardHTML(it) {
    var tags = (it.tags || []).map(function (t) { return '<span class="life-tag">' + esc(t) + '</span>'; }).join('');
    var lastEat = it.lastEatDate ? ('上次 ' + esc(it.lastEatDate)) : '还没吃过';
    return '' +
      '<div class="life-card" data-id="' + esc(it.id) + '">' +
        '<button class="life-fav ' + (it.isFavorite ? 'on' : '') + '" data-action="fav" data-id="' + esc(it.id) + '" title="收藏">'
          + (it.isFavorite ? '★' : '☆') + '</button>' +
        '<button class="life-more" data-action="more" data-id="' + esc(it.id) + '" title="更多">⋮</button>' +
        '<div class="life-card-name">' + esc(it.name) + '</div>' +
        '<div class="life-card-tags">' +
          '<span class="life-cat cat-' + esc(it.category) + '">' + esc(it.category) + '</span>' +
          '<span class="life-health health-' + esc(it.healthLevel) + '">' + esc(it.healthLevel) + '</span>' +
          '<span class="life-price">· ' + esc(it.price) + '</span>' +
        '</div>' +
        (tags ? '<div class="life-card-tags">' + tags + '</div>' : '') +
        (it.note ? '<div class="life-card-note">' + esc(it.note) + '</div>' : '') +
        '<div class="life-card-meta">吃过 ' + (it.eatCount || 0) + ' 次 · ' + lastEat + '</div>' +
      '</div>';
  }

  // 加权随机：近 3 天吃过的降权，尽量不重复
  function weightedPick(pool) {
    if (!pool.length) return null;
    var weights = pool.map(function (it) {
      return Takeout.daysAgo(it.lastEatDate) <= 3 ? 0.15 : 1;
    });
    var sum = weights.reduce(function (s, w) { return s + w; }, 0);
    var r = Math.random() * sum;
    for (var i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  function doPick() {
    pickPool = Takeout.filter(FILTERS);
    if (!pickPool.length) {
      toast('没有符合筛选的外卖，放宽条件试试～');
      return;
    }
    // 优先使用增强模块的「进阶随机」（黑名单屏蔽 + 7天以上优先 + 连续3次同店自动拉黑）
    pickCurrent = (window.TakeoutEnhance && window.TakeoutEnhance.smartPick)
      ? window.TakeoutEnhance.smartPick(pickPool)
      : weightedPick(pickPool);
    showPickResult(pickCurrent);
  }

  function showPickResult(it) {
    var tags = (it.tags || []).map(function (t) { return '<span class="life-tag">' + esc(t) + '</span>'; }).join('');
    openModal(
      '<div class="life-modal">' +
        '<div class="life-pick-emoji">🍽</div>' +
        '<div class="life-pick-name">' + esc(it.name) + '</div>' +
        '<div class="life-card-tags" style="justify-content:center">' +
          '<span class="life-cat cat-' + esc(it.category) + '">' + esc(it.category) + '</span>' +
          '<span class="life-health health-' + esc(it.healthLevel) + '">' + esc(it.healthLevel) + '</span>' +
          '<span class="life-price">· ' + esc(it.price) + '</span>' +
        '</div>' +
        (tags ? '<div class="life-card-tags" style="justify-content:center">' + tags + '</div>' : '') +
        (it.note ? '<div class="life-card-note" style="text-align:center">' + esc(it.note) + '</div>' : '') +
        '<div class="life-pick-actions">' +
          '<button class="btn primary" data-action="pick-eat" data-id="' + esc(it.id) + '">就它了 ✓</button>' +
          '<button class="btn" data-action="pick-again">再换一个 🎲</button>' +
        '</div>' +
      '</div>'
    );
  }

  // 添加 / 编辑 表单
  function openTakeoutForm(item) {
    var isEdit = !!item;
    var it = item || { name: '', category: '米饭', healthLevel: '中等', price: '便宜', tags: [], note: '' };
    var tagStr = (it.tags || []).join('，');
    openModal(
      '<div class="life-modal">' +
        '<div class="life-modal-title">' + (isEdit ? '✏ 编辑外卖' : '＋ 添加外卖') + '</div>' +
        '<div class="life-form">' +
          '<label class="life-form-row"><span>名称 *</span><input class="life-input" id="lfName" value="' + esc(it.name) + '" placeholder="店名或菜名"></label>' +
          '<label class="life-form-row"><span>品类</span><select class="life-input" id="lfCat">' +
            Takeout.CATS.map(function (c) { return '<option value="' + esc(c) + '"' + (it.category === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') +
          '</select></label>' +
          '<label class="life-form-row"><span>健康度</span><select class="life-input" id="lfHealth">' +
            Takeout.HEALTH.map(function (h) { return '<option value="' + esc(h) + '"' + (it.healthLevel === h ? ' selected' : '') + '>' + esc(h) + '</option>'; }).join('') +
          '</select></label>' +
          '<label class="life-form-row"><span>价格</span><select class="life-input" id="lfPrice">' +
            Takeout.PRICE.map(function (p) { return '<option value="' + esc(p) + '"' + (it.price === p ? ' selected' : '') + '>' + esc(p) + '</option>'; }).join('') +
          '</select></label>' +
          '<label class="life-form-row"><span>口味标签</span><input class="life-input" id="lfTags" value="' + esc(tagStr) + '" placeholder="辣，下饭，清爽（逗号分隔）"></label>' +
          '<label class="life-form-row"><span>备注</span><input class="life-input" id="lfNote" value="' + esc(it.note) + '" placeholder="选填"></label>' +
        '</div>' +
        '<div class="life-pick-actions">' +
          '<button class="btn primary" data-action="save-form" data-id="' + esc(it.id || '') + '">保存</button>' +
          '<button class="btn" data-action="close">取消</button>' +
        '</div>' +
      '</div>'
    );
  }

  function saveTakeoutForm(id) {
    var name = ($('#lfName') || {}).value || '';
    name = name.trim();
    if (!name) { toast('请填写名称'); return; }
    var data = {
      name: name,
      category: ($('#lfCat') || {}).value,
      healthLevel: ($('#lfHealth') || {}).value,
      price: ($('#lfPrice') || {}).value,
      tags: (($('#lfTags') || {}).value || '').split(/[，,]/).map(function (s) { return s.trim(); }).filter(Boolean),
      note: (($('#lfNote') || {}).value || '').trim()
    };
    if (id) { Takeout.update(id, data); toast('✓ 已更新'); }
    else { Takeout.add(data); toast('✓ 已添加'); }
    closeModal();
    if (LIFE_TAB === 'takeout') renderLife();
  }

  // 更多菜单（动作面板）
  function openActions(id) {
    openModal(
      '<div class="life-modal life-actions">' +
        '<div class="life-modal-title">更多操作</div>' +
        '<button class="life-action" data-action="eat-today" data-id="' + esc(id) + '">✓ 标记今天吃了</button>' +
        '<button class="life-action" data-action="edit" data-id="' + esc(id) + '">✏ 编辑</button>' +
        '<button class="life-action danger" data-action="delete" data-id="' + esc(id) + '">🗑 删除</button>' +
        '<button class="life-action" data-action="close">取消</button>' +
      '</div>'
    );
  }

  // ============================================
  // 喝水记录
  // ============================================
  function renderWater() {
    var s = Water.getSettings();
    var goal = s.dailyGoal || 2000;
    var today = Water.dayTotal(Water.todayStr());
    var pct = goal > 0 ? Math.min(100, Math.round(today / goal * 100)) : 0;
    var reached = today >= goal;
    var C = 2 * Math.PI * 52;
    var offset = C * (1 - pct / 100);

    var todayRecs = Water.getRecordsOfDay(Water.todayStr()).slice().sort(function (a, b) { return b.time - a.time; });
    var listHTML = todayRecs.length
      ? todayRecs.map(function (r) {
          return '<div class="life-water-row">' +
            '<span class="life-water-time">' + fmtTime(r.time) + '</span>' +
            '<span class="life-water-amt">+ ' + r.amount + ' ml</span>' +
            '<button class="life-water-del" data-action="del-water" data-id="' + esc(r.id) + '" title="删除">✕</button>' +
          '</div>';
        }).join('')
      : '<div class="life-empty">今天还没喝水，点上面的按钮记录一下吧 💧</div>';

    // 近 7 天柱状图
    var days = Water.lastDays(7);
    var maxV = Math.max(goal, days.reduce(function (m, d) { return Math.max(m, d.total); }, 0), 1);
    var bars = days.map(function (d) {
      var h = Math.round(d.total / maxV * 100);
      var isToday = d.date === Water.todayStr();
      return '<div class="life-bar-col">' +
        '<div class="life-bar-wrap"><div class="life-bar ' + (d.total >= goal ? 'ok' : '') + '" style="height:' + h + '%"></div></div>' +
        '<div class="life-bar-val">' + (d.total >= 1000 ? (d.total / 1000) + 'L' : d.total) + '</div>' +
        '<div class="life-bar-date' + (isToday ? ' today' : '') + '">' + d.date.slice(5) + '</div>' +
      '</div>';
    }).join('');

    var avg = Water.avg7();
    var st = Water.streak(goal);

    return '' +
      '<div class="life-water-progress ' + (reached ? 'reached' : '') + '">' +
        '<svg viewBox="0 0 120 120" class="life-ring">' +
          '<circle cx="60" cy="60" r="52" class="ring-bg"></circle>' +
          '<circle cx="60" cy="60" r="52" class="ring-fg" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) + '" transform="rotate(-90 60 60)"></circle>' +
        '</svg>' +
        '<div class="ring-center">' +
          '<div class="ring-pct">' + pct + '%</div>' +
          '<div class="ring-num">已喝 ' + today + ' / ' + goal + ' ml</div>' +
          (reached ? '<div class="ring-badge">今日达标 🎉</div>' : '') +
        '</div>' +
      '</div>' +

      '<div class="life-water-quick">' +
        '<button class="life-water-btn" data-action="add-water" data-amt="100">+100</button>' +
        '<button class="life-water-btn" data-action="add-water" data-amt="200">+200</button>' +
        '<button class="life-water-btn" data-action="add-water" data-amt="300">+300</button>' +
        '<button class="life-water-btn" data-action="add-water" data-amt="500">+500</button>' +
        '<button class="life-water-btn undo" data-action="undo-water">↩ 撤销</button>' +
      '</div>' +

      '<div class="life-card-title">📋 今日记录</div>' +
      '<div class="life-water-list">' + listHTML + '</div>' +

      '<div class="life-card-title">📊 近 7 天</div>' +
      '<div class="life-bars">' + bars + '</div>' +
      '<div class="life-water-stat">平均每日 ' + avg + ' ml · 连续达标 ' + st + ' 天</div>' +

      '<div class="life-card-title">⚙ 每日目标</div>' +
      '<div class="life-goal-row">' +
        '<input class="life-input" id="lfGoal" type="number" min="200" step="100" value="' + goal + '" style="width:120px"> ml' +
        '<button class="btn primary" data-action="save-goal">保存</button>' +
      '</div>';
  }

  // ============================================
  // 食谱
  // ============================================
  function renderRecipe() {
    if (recipeCurrentId) return renderRecipeDetail(recipeCurrentId);
    return '' +
      '<div class="life-toolbar">' +
        '<input class="life-input life-search" data-rsearch value="' + esc(recipeSearch) + '" placeholder="🔍 搜索菜名或食材...">' +
        '<button class="btn primary life-add-btn" data-action="radd">＋ 添加菜谱</button>' +
      '</div>' +
      '<div class="life-filters">' +
        '<select class="life-select" data-rfilter="diff">' +
          '<option value="all">全部难度</option>' +
          Recipe.DIFF.map(function (d) { return '<option value="' + esc(d) + '"' + (recipeDiff === d ? ' selected' : '') + '>' + esc(d) + '</option>'; }).join('') +
        '</select>' +
        '<select class="life-select" data-rfilter="time">' +
          '<option value="all">全部时间</option>' +
          '<option value="15"' + (recipeTime === 15 ? ' selected' : '') + '>≤15分钟</option>' +
          '<option value="30"' + (recipeTime === 30 ? ' selected' : '') + '>≤30分钟</option>' +
          '<option value="45"' + (recipeTime === 45 ? ' selected' : '') + '>≤45分钟</option>' +
        '</select>' +
      '</div>' +
      '<div class="life-rtabs">' +
        '<button class="life-rtab ' + (recipeCat === 'all' ? 'active' : '') + '" data-rcat="all">全部</button>' +
        Recipe.CATS.map(function (c) {
          return '<button class="life-rtab ' + (recipeCat === c ? 'active' : '') + '" data-rcat="' + esc(c) + '">' + esc(c) + '</button>';
        }).join('') +
        '<button class="life-rtab ' + (recipeCat === 'fav' ? 'active' : '') + '" data-rcat="fav">⭐ 收藏</button>' +
        '<button class="life-rtab ' + (recipeCat === 'cooked' ? 'active' : '') + '" data-rcat="cooked">🍳 做过的</button>' +
      '</div>' +
      '<div class="life-list" id="recipeList">' + recipeCardsHTML() + '</div>';
  }

  function recipeCardsHTML() {
    var list = Recipe.getAll();
    // 分类 Tab
    if (recipeCat === 'fav') list = list.filter(function (x) { return x.isFavorite; });
    else if (recipeCat === 'cooked') {
      list = list.filter(function (x) { return (x.cookedCount || 0) > 0; })
                 .sort(function (a, b) { return (b.lastCooked || '').localeCompare(a.lastCooked || ''); });
    } else if (recipeCat !== 'all') list = list.filter(function (x) { return x.category === recipeCat; });
    // 难度 / 时间 筛选
    list = Recipe.filterBy(list, { diff: recipeDiff, timeMax: recipeTime === 'all' ? 0 : parseInt(recipeTime, 10) });
    // 关键字搜索（菜名 / 食材）
    list = Recipe.search(list, recipeSearch);
    if (!list.length) {
      return '<div class="life-empty">没有符合条件的菜谱～<br>换个分类或搜索词试试</div>';
    }
    return list.map(recipeCardHTML).join('');
  }

  function recipeCardHTML(it) {
    var lastCook = it.lastCooked ? ('上次 ' + esc(it.lastCooked)) : '还没做过';
    return '' +
      '<div class="life-card recipe-card" data-action="rview" data-id="' + esc(it.id) + '">' +
        '<button class="life-fav ' + (it.isFavorite ? 'on' : '') + '" data-action="rfav" data-id="' + esc(it.id) + '" title="收藏">'
          + (it.isFavorite ? '★' : '☆') + '</button>' +
        '<div class="life-card-name">' + esc(it.name) + '</div>' +
        '<div class="life-card-tags">' +
          '<span class="life-cat cat-' + esc(it.category) + '">' + esc(it.category) + '</span>' +
          '<span class="life-health health-' + esc(it.difficulty) + '">' + esc(it.difficulty) + '</span>' +
          '<span class="life-price">· ' + it.cookTime + '分钟</span>' +
          '<span class="life-kcal">' + (it.calories || '?') + ' kcal</span>' +
        '</div>' +
        '<div class="life-card-meta">' +
          (it.isCustom ? '<button class="life-card-del" data-action="rdel" data-id="' + esc(it.id) + '" title="删除">🗑 删除</button>' : '') +
          '做过 ' + (it.cookedCount || 0) + ' 次 · ' + lastCook +
        '</div>' +
      '</div>';
  }

  function renderRecipeDetail(id) {
    var it = Recipe.getById(id);
    if (!it) { recipeCurrentId = null; return renderRecipe(); }
    var ings = (it.ingredients || []).map(function (g) {
      return '<li><span class="rp-ing-name">' + esc(g[0]) + '</span><span class="rp-amt">' + esc(g[1]) + '</span></li>';
    }).join('');
    var steps = (it.steps || []).map(function (s, i) {
      return '<li><span class="rp-step-n">' + (i + 1) + '</span><span class="rp-step-t">' + esc(s) + '</span></li>';
    }).join('');
    return '' +
      '<button class="life-back" data-action="rback">← 返回</button>' +
      '<div class="rp-head">' +
        '<div class="life-card-name">' + esc(it.name) + '</div>' +
        '<div class="life-card-tags">' +
          '<span class="life-cat cat-' + esc(it.category) + '">' + esc(it.category) + '</span>' +
          '<span class="life-health health-' + esc(it.difficulty) + '">' + esc(it.difficulty) + '</span>' +
          '<span class="life-price">· ' + it.cookTime + '分钟</span>' +
          '<span class="life-kcal">' + (it.calories || '?') + ' kcal</span>' +
        '</div>' +
        '<button class="btn primary life-cook-btn" data-action="rcook" data-id="' + esc(it.id) + '">✅ 今天做了</button>' +
        (it.isCustom ?
          '<button class="btn" data-action="redit" data-id="' + esc(it.id) + '">✏ 编辑</button>' +
          '<button class="btn danger" data-action="rdel" data-id="' + esc(it.id) + '">🗑 删除</button>'
          : '') +
      '</div>' +
      '<div class="life-card-title">🥬 食材清单</div>' +
      '<ul class="rp-ings">' + ings + '</ul>' +
      '<div class="life-card-title">🍳 步骤</div>' +
      '<ol class="rp-steps">' + steps + '</ol>' +
      (it.tips ? '<div class="life-card-note">💡 ' + esc(it.tips) + '</div>' : '') +
      '<div class="life-card-meta">做过 ' + (it.cookedCount || 0) + ' 次' + (it.lastCooked ? ' · 上次 ' + esc(it.lastCooked) : '') + '</div>';
  }

  // 添加 / 编辑 自定义菜谱表单
  function openRecipeForm(item) {
    var isEdit = !!item;
    var it = item || { name: '', category: '快手菜', difficulty: '简单', cookTime: '', calories: '', ingredients: [], steps: [], tips: '' };

    // 至少保留一行空白，方便直接填写
    var ingSeed = (it.ingredients && it.ingredients.length) ? it.ingredients : [['', '']];
    var stepSeed = (it.steps && it.steps.length) ? it.steps : [''];
    var ingHTML = ingSeed.map(function (g) { return recipeIngRow(g[0], g[1]); }).join('');
    var stepHTML = stepSeed.map(function (t) { return recipeStepRow(t); }).join('');

    openModal(
      '<div class="life-modal life-recipe-form">' +
        '<div class="life-modal-title">' + (isEdit ? '✏ 编辑菜谱' : '＋ 添加菜谱') + '</div>' +
        '<div class="life-form">' +
          '<label class="life-form-row"><span>菜名 *</span><input class="life-input" id="rfName" value="' + esc(it.name) + '" placeholder="如：我的秘制红烧肉"></label>' +
          '<label class="life-form-row"><span>分类 *</span><select class="life-input" id="rfCat">' +
            Recipe.CATS.map(function (c) { return '<option value="' + esc(c) + '"' + (it.category === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') +
          '</select></label>' +
          '<div class="life-form-row life-form-inline">' +
            '<label><span>难度</span><select class="life-input" id="rfDiff">' +
              Recipe.DIFF.map(function (d) { return '<option value="' + esc(d) + '"' + (it.difficulty === d ? ' selected' : '') + '>' + esc(d) + '</option>'; }).join('') +
            '</select></label>' +
            '<label><span>时间(分)</span><input class="life-input" id="rfTime" type="number" min="0" value="' + esc(it.cookTime || '') + '" style="width:70px"></label>' +
            '<label><span>卡路里</span><input class="life-input" id="rfKcal" type="number" min="0" value="' + esc(it.calories || '') + '" style="width:70px"></label>' +
          '</div>' +
          '<div class="life-card-title">🥬 食材清单 <button type="button" class="btn" data-action="r-add-ing">＋ 加一行</button></div>' +
          '<div id="rIngList">' + ingHTML + '</div>' +
          '<div class="life-card-title">🍳 做法步骤 <button type="button" class="btn" data-action="r-add-step">＋ 加一步</button></div>' +
          '<div id="rStepList">' + stepHTML + '</div>' +
          '<label class="life-form-row"><span>小贴士</span><input class="life-input" id="rfTips" value="' + esc(it.tips || '') + '" placeholder="选填"></label>' +
        '</div>' +
        '<div class="life-pick-actions">' +
          '<button class="btn primary" data-action="save-recipe" data-id="' + esc(it.id || '') + '">保存</button>' +
          '<button class="btn" data-action="close">取消</button>' +
        '</div>' +
      '</div>'
    );
  }

  function saveRecipeForm(id) {
    var name = (($('#rfName') || {}).value || '').trim();
    if (!name) { toast('请填写菜名'); return; }
    var category = ($('#rfCat') || {}).value;
    if (!category) { toast('请选择分类'); return; }

    // 读取食材行
    var ings = [];
    var ingRows = document.querySelectorAll('#rIngList .r-ing-row');
    Array.prototype.forEach.call(ingRows, function (row) {
      var n = (row.querySelector('.r-ing-name').value || '').trim();
      var a = (row.querySelector('.r-ing-amt').value || '').trim();
      if (n) ings.push([n, a]);
    });
    // 读取步骤行
    var steps = [];
    var stepRows = document.querySelectorAll('#rStepList .r-step-row');
    Array.prototype.forEach.call(stepRows, function (row) {
      var t = (row.querySelector('.r-step-t').value || '').trim();
      if (t) steps.push(t);
    });

    if (!ings.length) { toast('请至少添加一行食材'); return; }
    if (!steps.length) { toast('请至少添加一步做法'); return; }

    var timeRaw = ($('#rfTime') || {}).value || '';
    var kcalRaw = ($('#rfKcal') || {}).value || '';
    var data = {
      name: name,
      category: category,
      difficulty: ($('#rfDiff') || {}).value || '简单',
      cookTime: parseInt(timeRaw, 10) || 0,
      calories: parseInt(kcalRaw, 10) || 0,
      ingredients: ings,
      steps: steps,
      tips: (($('#rfTips') || {}).value || '').trim()
    };

    if (id) { Recipe.update(id, data); toast('✓ 已更新'); }
    else { Recipe.add(data); toast('✓ 已添加'); }
    closeModal();
    if (LIFE_TAB === 'recipe') renderLife();
  }

  // ============================================
  // 生理期记录
  // ============================================
  function renderPeriod() {
    var phase = Period.currentPhase();
    var next = Period.predictNext();
    var cycle = Period.avgCycle();
    var dur = Period.avgDuration();
    var hint = Period.useHistory() ? '' : '<div class="lp-hint">📝 记录越多，预测越准（当前不足 3 次，暂按 28 天估算）</div>';

    var recs = Period.getAll().slice().sort(function (a, b) {
      var sa = a.startDate || '', sb = b.startDate || '';
      return sb < sa ? -1 : (sb > sa ? 1 : 0);
    });
    var listHTML = recs.length
      ? recs.map(periodRowHTML).join('')
      : '<div class="life-empty">还没有记录，点「🩸 今天来例假了」开始吧～</div>';

    return '' +
      '<div class="lp-status lp-' + phase.key + '">' +
        '<div class="lp-phase">' + phase.label + '</div>' +
        '<div class="lp-meta">下次预计 <b>' + next + '</b> · 平均周期 ' + cycle + ' 天 · 平均持续 ' + (dur || '—') + ' 天</div>' +
        hint +
      '</div>' +
      '<div class="lp-quick">' +
        '<button class="btn primary" data-action="pstart">🩸 今天来例假了</button>' +
        '<button class="btn" data-action="pend">✅ 例假结束了</button>' +
        '<button class="btn" data-action="padd">➕ 记录/编辑</button>' +
      '</div>' +
      '<div class="life-card-title">📋 历史记录</div>' +
      '<div class="lp-list">' + listHTML + '</div>';
  }

  function periodRowHTML(r) {
    var range = esc(r.startDate || '?') + ' ~ ' + (r.endDate ? esc(r.endDate) : '进行中');
    var badges = '';
    if (r.flowLevel) badges += '<span class="lp-badge lp-flow">' + esc(r.flowLevel) + '出血</span>';
    if (r.painLevel) badges += '<span class="lp-badge lp-pain">' + esc(r.painLevel) + '痛经</span>';
    if (r.mood) badges += '<span class="lp-badge lp-mood">' + esc(r.mood) + '</span>';
    var syms = (r.symptoms || []).map(function (s) { return '<span class="lp-sym-tag">' + esc(s) + '</span>'; }).join('');
    return '' +
      '<div class="lp-row" data-id="' + esc(r.id) + '">' +
        '<div class="lp-row-head">' +
          '<span class="lp-range">' + range + '</span>' +
          '<span class="lp-actions">' +
            '<button class="lp-ico" data-action="pedit" data-id="' + esc(r.id) + '" title="编辑">✏</button>' +
            '<button class="lp-ico danger" data-action="pdel" data-id="' + esc(r.id) + '" title="删除">🗑</button>' +
          '</span>' +
        '</div>' +
        (badges ? '<div class="lp-badges">' + badges + '</div>' : '') +
        (syms ? '<div class="lp-syms">' + syms + '</div>' : '') +
        (r.note ? '<div class="lp-note">' + esc(r.note) + '</div>' : '') +
      '</div>';
  }

  // 记录/编辑 表单
  function openPeriodForm(id) {
    var isEdit = !!id;
    var it = isEdit ? Period.getById(id) : (Period.ongoing() || { startDate: Period.todayStr() });
    if (!it) it = { startDate: Period.todayStr() };
    var flowOpts = Period.FLOW.map(function (f) { return '<option value="' + f + '"' + (it.flowLevel === f ? ' selected' : '') + '>' + f + '</option>'; }).join('');
    var painOpts = Period.PAIN.map(function (p) { return '<option value="' + p + '"' + (it.painLevel === p ? ' selected' : '') + '>' + p + '</option>'; }).join('');
    openModal(
      '<div class="life-modal">' +
        '<div class="life-modal-title">' + (isEdit ? '✏ 编辑记录' : '➕ 记录生理期') + '</div>' +
        '<div class="life-form">' +
          '<label class="life-form-row"><span>开始</span><input class="life-input" id="pfStart" type="date" value="' + esc(it.startDate || '') + '"></label>' +
          '<label class="life-form-row"><span>结束</span><input class="life-input" id="pfEnd" type="date" value="' + esc(it.endDate || '') + '"></label>' +
          '<label class="life-form-row"><span>出血量</span><select class="life-input" id="pfFlow"><option value="">不选</option>' + flowOpts + '</select></label>' +
          '<label class="life-form-row"><span>痛经</span><select class="life-input" id="pfPain"><option value="">不选</option>' + painOpts + '</select></label>' +
          '<label class="life-form-row"><span>情绪</span><input class="life-input" id="pfMood" value="' + esc(it.mood || '') + '" placeholder="如：烦躁/平静"></label>' +
          '<label class="life-form-row"><span>症状</span><input class="life-input" id="pfSymptoms" value="' + esc((it.symptoms || []).join('，')) + '" placeholder="腰酸，头痛（逗号分隔）"></label>' +
          '<label class="life-form-row"><span>备注</span><input class="life-input" id="pfNote" value="' + esc(it.note || '') + '" placeholder="选填"></label>' +
        '</div>' +
        '<div class="life-pick-actions">' +
          '<button class="btn primary" data-action="save-period" data-id="' + esc(it.id || '') + '">保存</button>' +
          '<button class="btn" data-action="close">取消</button>' +
        '</div>' +
      '</div>'
    );
  }

  function savePeriodForm(id) {
    var start = ($('#pfStart') || {}).value || '';
    var end = ($('#pfEnd') || {}).value || '';
    if (!start) { toast('请填写开始日期'); return; }
    if (end && start > end) { toast('结束日期不能早于开始'); return; }
    var data = {
      startDate: start,
      endDate: end,
      flowLevel: ($('#pfFlow') || {}).value || '',
      painLevel: ($('#pfPain') || {}).value || '',
      mood: (($('#pfMood') || {}).value || '').trim(),
      symptoms: (($('#pfSymptoms') || {}).value || '').split(/[，,]/).map(function (s) { return s.trim(); }).filter(Boolean),
      note: (($('#pfNote') || {}).value || '').trim()
    };
    if (id) { Period.update(id, data); toast('✓ 已更新'); }
    else { Period.add(data); if (window.awardEnergy) window.awardEnergy('period'); toast('✓ 已记录'); }
    closeModal();
    if (LIFE_TAB === 'period') renderLife();
  }

  // ============================================
  // 事件处理
  // ============================================
  function handleLifeClick(e) {
    var t = e.target;

    // Tab 切换
    var tabBtn = t.closest('[data-life-tab]');
    if (tabBtn) { LIFE_TAB = tabBtn.getAttribute('data-life-tab'); renderLife(); return; }

    // 食谱分类 Tab
    var rcatBtn = t.closest('[data-rcat]');
    if (rcatBtn) { recipeCat = rcatBtn.getAttribute('data-rcat'); recipeCurrentId = null; renderLife(); return; }

    var actionEl = t.closest('[data-action]');
    if (!actionEl) return;
    var action = actionEl.getAttribute('data-action');
    var id = actionEl.getAttribute('data-id');

    switch (action) {
      // —— 外卖 ——
      case 'add':
        openTakeoutForm(null);
        break;
      case 'pick':
        doPick();
        break;
      case 'pick-again':
        if (pickPool.length > 1) {
          var pool = pickPool.filter(function (x) { return x.id !== (pickCurrent && pickCurrent.id); });
          pickCurrent = weightedPick(pool.length ? pool : pickPool);
          showPickResult(pickCurrent);
        } else {
          toast('候选太少了，放宽筛选再试～');
        }
        break;
      case 'pick-eat':
        if (id) { Takeout.recordEat(id); if (window.awardEnergy) window.awardEnergy('takeout_eat', { name: Takeout.getById(id).name }); toast('✓ 已记录吃过「' + (Takeout.getById(id).name) + '」'); }
        closeModal();
        if (LIFE_TAB === 'takeout') renderLife();
        break;
      case 'fav':
        if (id) { Takeout.toggleFav(id); renderLife(); }
        break;
      case 'more':
        if (id) openActions(id);
        break;
      case 'eat-today':
        if (id) { Takeout.recordEat(id); if (window.awardEnergy) window.awardEnergy('takeout_eat', { name: Takeout.getById(id).name }); toast('✓ 标记今天吃了'); closeModal(); if (LIFE_TAB === 'takeout') renderLife(); }
        break;
      case 'edit':
        if (id) { var it = Takeout.getById(id); closeModal(); openTakeoutForm(it); }
        break;
      case 'delete':
        if (id) { Takeout.remove(id); toast('🗑 已删除'); closeModal(); if (LIFE_TAB === 'takeout') renderLife(); }
        break;
      case 'save-form':
        saveTakeoutForm(id);
        break;

      // —— 喝水 ——
      case 'add-water':
        var amt = parseInt(actionEl.getAttribute('data-amt'), 10);
        if (amt > 0) { Water.addRecord(amt); if (window.awardEnergy) window.awardEnergy('water', { amount: amt }); renderLife(); }
        break;
      case 'undo-water':
        if (Water.undoLast()) { if (window.awardEnergy) window.awardEnergy('water', { reverse: true }); renderLife(); } else { toast('今天还没有记录可撤销'); }
        break;
      case 'del-water':
        if (id) { Water.deleteRecord(id); if (window.awardEnergy) window.awardEnergy('water', { reverse: true }); renderLife(); }
        break;
      case 'save-goal':
        var g = parseInt(($('#lfGoal') || {}).value, 10);
        if (g && g > 0) { Water.setGoal(g); toast('✓ 目标已更新'); renderLife(); }
        break;

      // —— 食谱 ——
      case 'rfav':
        if (id) { Recipe.toggleFav(id); renderLife(); }
        break;
      case 'rview':
        if (id) { recipeCurrentId = id; renderLife(); }
        break;
      case 'rback':
        recipeCurrentId = null; renderLife();
        break;
      case 'rcook':
        if (id) { Recipe.recordCook(id); if (window.awardEnergy) window.awardEnergy('recipe_cook', { name: Recipe.getById(id).name }); toast('✓ 打卡「' + (Recipe.getById(id).name) + '」'); renderLife(); }
        break;
      case 'radd':
        openRecipeForm(null);
        break;
      case 'redit':
        if (id) { var rit = Recipe.getById(id); closeModal(); recipeCurrentId = null; openRecipeForm(rit); }
        break;
      case 'rdel':
        if (id) { Recipe.remove(id); toast('🗑 已删除'); closeModal(); if (LIFE_TAB === 'recipe') renderLife(); }
        break;
      case 'r-add-ing': {
        var ingList = document.getElementById('rIngList');
        if (ingList) ingList.insertAdjacentHTML('beforeend', recipeIngRow('', ''));
        break;
      }
      case 'r-add-step': {
        var stepList = document.getElementById('rStepList');
        if (stepList) stepList.insertAdjacentHTML('beforeend', recipeStepRow(''));
        break;
      }
      case 'r-del-ing':
      case 'r-del-step': {
        var rowEl = actionEl.closest('.r-ing-row, .r-step-row');
        if (rowEl) rowEl.remove();
        break;
      }
      case 'save-recipe':
        saveRecipeForm(id);
        break;

      // —— 生理期 ——
      case 'pstart':
        Period.startToday(); if (window.awardEnergy) window.awardEnergy('period'); toast('🩸 已记录今天来例假'); renderLife();
        break;
      case 'pend':
        if (Period.endToday()) { toast('✅ 已记录例假结束'); } else { toast('当前没有进行中的记录'); }
        renderLife();
        break;
      case 'padd':
        openPeriodForm(null);
        break;
      case 'pedit':
        if (id) openPeriodForm(id);
        break;
      case 'pdel':
        if (id) { Period.remove(id); if (window.awardEnergy) window.awardEnergy('period', { reverse: true }); toast('🗑 已删除'); renderLife(); }
        break;
      case 'save-period':
        savePeriodForm(id);
        break;

      // —— 通用 ——
      case 'close':
        closeModal();
        break;
    }
  }

  // 弹窗内点击
  function handleModalClick(e) {
    var mask = e.target.closest('.life-modal-mask');
    if (!mask) return;
    if (e.target === mask) { closeModal(); return; } // 点遮罩空白处关闭
    var actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    handleLifeClick(e);
  }

  // 筛选变化
  function handleChange(e) {
    var fEl = e.target.closest('[data-filter]');
    if (!fEl) {
      // 食谱的难度 / 时间筛选
      var rEl = e.target.closest('[data-rfilter]');
      if (!rEl) return;
      var rkey = rEl.getAttribute('data-rfilter');
      if (rkey === 'diff') recipeDiff = rEl.value;
      else if (rkey === 'time') recipeTime = rEl.value;
      if (LIFE_TAB === 'recipe') renderLife();
      return;
    }
    var key = fEl.getAttribute('data-filter');
    if (key === 'favOnly' || key === 'notEaten7') {
      FILTERS[key] = fEl.checked;
    } else {
      FILTERS[key] = fEl.value;
    }
    if (LIFE_TAB === 'takeout') renderLife();
  }

  // 食谱搜索（实时输入）
  function handleInput(e) {
    var s = e.target.closest('[data-rsearch]');
    if (!s) return;
    recipeSearch = s.value;
    var list = document.getElementById('recipeList');
    if (list) list.innerHTML = recipeCardsHTML();
  }

  // document 级委托（只挂一次）
  function onDocClick(e) {
    // 导航进入生活页
    if (e.target.closest('[data-view="life"]')) { setTimeout(renderLife, 0); return; }
    // 弹窗
    if (e.target.closest('.life-modal-mask')) { handleModalClick(e); return; }
    // 生活页内部
    if (e.target.closest('#view-life')) { handleLifeClick(e); }
  }

  // 用捕获阶段监听，确保即使 app.js 的导航处理器调用了 stopPropagation，
  // 也能触发生活页渲染（捕获阶段先于目标/冒泡阶段执行）
  document.addEventListener('click', onDocClick, true);
  document.addEventListener('change', handleChange);
  document.addEventListener('input', handleInput);

  // 供 app.js 在切换视图时调用
  window.renderLife = renderLife;
})();
