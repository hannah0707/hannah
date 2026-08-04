// ============================================================
// 📅 日程模块（纯前端 / 原生 JS / localStorage 单文件）
// ------------------------------------------------------------
// 接入方式：app.js 的 renderScheduleBridge 会调用 window.renderScheduleModule()
// 数据存放：window.state.schedule（落在 pixel_workbench_v3 大对象里，
//           这样桌面页「今日日程」统计、FAB 快捷记账等联动不会失效）
//   - events  : { 'YYYY-MM-DD': [ event, ... ] }  按日期键存的日程数组
//   - cats    : [ { name, color } ]               用户自定义分类（默认分类见 DEFAULT_CATS）
//   - recurring: [ recurringTemplate, ... ]        循环日程模板
//   - ui/hf/notified/lastSummaryYm: 界面偏好 / 历史筛选 / 提醒去重 / 月小结标记
// 主题适配：所有样式使用 --primary/--bg-card/--text-main/--danger 等 CSS 变量，
//           自动适配工作台 4 套全局配色（见 css/style.css 的 .sched-* 段）。
// 跨模块联动（不改动其他模块）：
//   · 健身类日程（category==='健身'）勾选完成后 → 自动写入 state.checkin.fitness[date]=true（同步健身打卡）
//   · 带 link.module==='vision' 的日程 → 可一键跳转到「资讯」视图
//   · 暴露 window.ScheduleAPI.addFromText(text) / convertFromText(text)，供速记一键转日程
// ============================================================
(function () {
  'use strict';

  // —— 模块级状态（翻页/选中日期跨渲染保持）——
  var calYear = null, calMonth = null, selectedDate = null;
  var root = null; // 渲染容器，每次 render 时再取

  // —— 复用宿主（app.js）暴露的全局助手 ——
  function toast(m) { if (window.toast) window.toast(m); }
  function save() { if (window.saveData) window.saveData(); }
  function esc(s) {
    if (window.escapeHtml) return window.escapeHtml(s);
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function getDateStr(d) {
    if (window.getDateStr) return window.getDateStr(d);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function uid() { return 'se_' + Date.now() + '_' + Math.floor(Math.random() * 1e6); }

  // —— 日程数据根对象（懒初始化）——
  function S() {
    if (!window.state) return null;
    if (!window.state.schedule) window.state.schedule = { events: {}, historyPage: 1, viewMode: 'today' };
    return window.state.schedule;
  }
  function eventsOf(dateStr) { var s = S(); return (s && s.events[dateStr]) || []; }

  // ============================================================
  // 分类与优先级（便于后续新增分类：改 DEFAULT_CATS 或运行时「+ 添加分类」）
  // ============================================================
  var DEFAULT_CATS = [
    { name: '工作', color: '#4a90d9' },
    { name: '面试', color: '#b06ab3' },
    { name: '学习', color: '#3aa76d' },
    { name: '健身', color: '#e8833a' },
    { name: '生活', color: '#2bb3a3' },
    { name: '社交', color: '#d9a441' },
    { name: '其他', color: '#8a8f99' }
  ];
  var PRIORITY_META = {
    low: { label: '低', emoji: '🟢' },
    medium: { label: '中', emoji: '🟡' },
    high: { label: '高', emoji: '🔴' }
  };
  var REPEAT_LABEL = { none: '不重复', daily: '每日', weekly: '每周', monthly: '每月' };
  function repeatLabel(r) { return REPEAT_LABEL[r] || '不重复'; }
  function priorityMeta(p) { return PRIORITY_META[p] || PRIORITY_META.medium; }

  // 合并默认 + 自定义分类（按名字去重）
  function allCats() {
    var s = S(); var custom = (s && s.cats) || [];
    var map = {};
    DEFAULT_CATS.forEach(function (c) { map[c.name] = c.color; });
    custom.forEach(function (c) { map[c.name] = c.color; });
    return Object.keys(map).map(function (n) { return { name: n, color: map[n] }; });
  }
  function catColor(name) {
    var all = allCats();
    for (var i = 0; i < all.length; i++) if (all[i].name === name) return all[i].color;
    return '#8a8f99';
  }
  function ensureCat(name) {
    var s = S(); if (!s) return;
    s.cats = s.cats || [];
    if (name && !s.cats.some(function (c) { return c.name === name; })) {
      s.cats.push({ name: name, color: randomColor() });
    }
  }
  function randomColor() {
    var cols = ['#4a90d9', '#b06ab3', '#3aa76d', '#e8833a', '#2bb3a3', '#d9a441', '#c0506a', '#7b6fd1'];
    return cols[Math.floor(Math.random() * cols.length)];
  }

  // 旧数据结构迁移：{ time,title,desc,urgency } → 新结构（仅一次）
  function migrate() {
    var s = S(); if (!s || s.migrated) return;
    s.migrated = true;
    Object.keys(s.events).forEach(function (d) {
      s.events[d] = (s.events[d] || []).map(function (e) {
        if (e.startTime !== undefined || e.time === undefined) return e; // 已是新结构
        return {
          id: e.id || uid(), date: d, title: e.title || '未命名',
          startTime: e.time || '09:00', endTime: '', category: e.category || '其他',
          repeat: 'none', remind: 0, note: e.desc || '',
          priority: e.urgency || 'medium', done: false, src: 'import'
        };
      });
    });
    save();
  }

  // ============================================================
  // 工具
  // ============================================================
  function weekdayOf(dateStr) {
    var d = new Date(dateStr.replace(/-/g, '/'));
    var w = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
    return '周' + w;
  }
  function byTime(a, b) { return (a.startTime || '').localeCompare(b.startTime || ''); }
  function findEvent(id) {
    var s = S(); if (!s) return null;
    for (var d in s.events) { var f = s.events[d].find(function (e) { return e.id === id; }); if (f) return f; }
    return null;
  }
  function findEventDate(id) {
    var s = S(); if (!s) return null;
    for (var d in s.events) { if (s.events[d].some(function (e) { return e.id === id; })) return d; }
    return null;
  }
  function findRec(id) {
    var s = S(); if (!s) return null;
    return (s.recurring || []).find(function (r) { return r.id === id; }) || null;
  }
  function uniqueMonths(dates) {
    var set = {};
    dates.forEach(function (d) { set[d.slice(0, 7)] = true; });
    return Object.keys(set).sort().reverse();
  }

  // ============================================================
  // 主渲染入口（由 app.js 桥接调用）
  // ============================================================
  function renderScheduleModule() {
    root = document.getElementById('schedRoot');
    if (!root) return;
    var s = S(); if (!s) return;
    // 状态默认
    if (!s.viewMode) s.viewMode = 'today';
    if (!s.cats) s.cats = [];
    if (!s.recurring) s.recurring = [];
    if (!s.notified) s.notified = {};
    if (!s.hf) s.hf = { month: '', cat: '', status: '', page: 1 };
    migrate();

    var now = new Date();
    if (calYear == null) calYear = now.getFullYear();
    if (calMonth == null) calMonth = now.getMonth();
    if (selectedDate == null) selectedDate = getDateStr(now);

    // 每月 1 号自动生成「上月小结」
    maybeMonthlySummary();

    var tabs = topTabsHTML();
    var body = (s.viewMode === 'today') ? todayView() : historyView();
    root.innerHTML = tabs + body;

    bindOnce();
    startReminderEngine(); // 开启临近提醒轮询（幂等）
  }

  // 顶部双 Tab（保留原有「当天日历 / 历史浏览」布局）
  function topTabsHTML() {
    var s = S();
    return '' +
      '<div class="sched-tabs">' +
        '<button class="sched-tab ' + (s.viewMode === 'today' ? 'active' : '') + '" data-act="tab" data-v="today">📅 当天日历</button>' +
        '<button class="sched-tab ' + (s.viewMode === 'history' ? 'active' : '') + '" data-act="tab" data-v="history"> 历史浏览</button>' +
        '<button class="sched-icon-btn" data-act="enable-notify" title="开启临近提醒通知">🔔</button>' +
      '</div>';
  }

  // ============================================================
  // 「当天日历」视图：日历 + 选中日面板 + 三张子卡片
  // ============================================================
  function todayView() {
    return calendarHTML() + dayPanelHTML() + subCardsHTML();
  }

  // —— 日历格子（分类彩色圆点 / 周末弱化 / 选中高亮 / 今天高亮）——
  function calendarHTML() {
    var now = new Date();
    var first = new Date(calYear, calMonth, 1);
    var start = first.getDay();
    var days = new Date(calYear, calMonth + 1, 0).getDate();
    var prevDays = new Date(calYear, calMonth, 0).getDate();
    var todayStr = getDateStr(now);

    var html = '<div class="sched-card">' +
      '<div class="sched-cal-head">' +
        '<button class="sched-nav" data-act="prev" title="上一月">◀</button>' +
        '<div class="sched-cal-title">' + calYear + '年 ' + (calMonth + 1) + '月</div>' +
        '<button class="sched-nav" data-act="next" title="下一月">▶</button>' +
      '</div>' +
      '<div class="sched-cal-grid">';
    ['日', '一', '二', '三', '四', '五', '六'].forEach(function (w) { html += '<div class="sched-wd">' + w + '</div>'; });
    // 上月补位
    for (var i = start - 1; i >= 0; i--) html += '<div class="sched-day other"><span class="sched-day-num">' + (prevDays - i) + '</span></div>';
    // 当月
    for (var d = 1; d <= days; d++) {
      var ds = calYear + '-' + String(calMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      var evs = eventsOf(ds);
      var wd = new Date(calYear, calMonth, d).getDay();
      var cls = 'sched-day';
      if (ds === todayStr) cls += ' today';
      if (ds === selectedDate) cls += ' selected';
      if (wd === 0 || wd === 6) cls += ' weekend'; // 周末灰色弱化
      if (evs.length) cls += ' hasev';
      // 按分类聚合圆点颜色（最多 4 个）
      var dotMap = {};
      evs.forEach(function (e) { var c = catColor(e.category); dotMap[c] = (dotMap[c] || 0) + 1; });
      var dots = Object.keys(dotMap).slice(0, 4).map(function (col) {
        return '<span class="sched-dot" style="background:' + col + '"></span>';
      }).join('');
      html += '<div class="' + cls + '" data-act="day" data-date="' + ds + '">' +
        '<span class="sched-day-num">' + d + '</span>' +
        (dots ? '<div class="sched-dots">' + dots + '</div>' : '') +
        '</div>';
    }
    // 下月补位
    var total = start + days;
    var next = (7 - total % 7) % 7;
    for (var k = 1; k <= next; k++) html += '<div class="sched-day other"><span class="sched-day-num">' + k + '</span></div>';
    html += '</div></div>';
    return html;
  }

  // —— 选中日期面板：待完成 / 已完成 分组，按时间排序，可编辑/删除/完成 ——
  function dayPanelHTML() {
    var evs = eventsOf(selectedDate).slice().sort(byTime);
    var pending = evs.filter(function (e) { return !e.done; });
    var done = evs.filter(function (e) { return e.done; });
    function row(e) {
      var meta = priorityMeta(e.priority);
      var cat = catColor(e.category);
      var jumpBtn = e.link ? '<button class="sched-mini" data-act="jump" data-id="' + e.id + '" title="跳转关联模块">↗ 跳转</button>' : '';
      return '<div class="sched-ev ' + (e.done ? 'done' : '') + '">' +
        '<button class="sched-check" data-act="toggle" data-id="' + e.id + '" title="完成切换">' + (e.done ? '☑' : '☐') + '</button>' +
        '<div class="sched-ev-main">' +
          '<div class="sched-ev-top">' +
            '<span class="sched-ev-time">' + esc(e.startTime || '') + (e.endTime ? ('–' + esc(e.endTime)) : '') + '</span>' +
            '<span class="sched-cat-tag" style="--c:' + cat + '">' + esc(e.category || '其他') + '</span>' +
            '<span class="sched-prio ' + (e.priority || 'medium') + '">' + meta.emoji + meta.label + '</span>' +
          '</div>' +
          '<div class="sched-ev-title">' + esc(e.title) + '</div>' +
          (e.note ? '<div class="sched-ev-note">' + esc(e.note) + '</div>' : '') +
        '</div>' +
        '<div class="sched-ev-ops">' + jumpBtn +
          '<button class="sched-mini" data-act="edit" data-id="' + e.id + '" title="编辑">✏</button>' +
          '<button class="sched-mini danger" data-act="del" data-id="' + e.id + '" title="删除">🗑</button>' +
        '</div>' +
      '</div>';
    }
    var body = '';
    if (evs.length === 0) {
      body = '<div class="sched-empty">这一天还没有安排~ 点右侧「+ 添加日程」</div>';
    } else {
      body += '<div class="sched-group-label">待完成（' + pending.length + '）</div>' +
        (pending.length ? pending.map(row).join('') : '<div class="sched-empty sm">暂无</div>');
      body += '<div class="sched-group-label done">已完成（' + done.length + '）</div>' +
        (done.length ? done.map(row).join('') : '<div class="sched-empty sm">暂无</div>');
    }
    return '<div class="sched-card">' +
      '<div class="sched-day-head">' +
        '<div><span class="sched-day-title">📌 选中日期：</span><b>' + selectedDate + '</b>' +
          ' <span class="sched-pill">' + weekdayOf(selectedDate) + '</span></div>' +
        '<button class="btn primary sched-add" data-act="add-selected">+ 添加日程</button>' +
      '</div>' +
      '<div class="sched-ev-list">' + body + '</div>' +
    '</div>';
  }

  // —— 日历下方三张子卡片 ——
  function subCardsHTML() {
    return '<div class="sched-subcards">' + todayTodoHTML() + recurringHTML() + '</div>';
  }

  // ① 今日待办卡片（含完成进度）
  function todayTodoHTML() {
    var todayStr = getDateStr(new Date());
    var evs = eventsOf(todayStr).slice().sort(byTime);
    var pending = evs.filter(function (e) { return !e.done; });
    var rows = pending.length ? pending.map(function (e) {
      return '<div class="sched-todo ' + (e.priority === 'high' ? 'hot' : '') + '" data-act="toggle" data-id="' + e.id + '">' +
        '<span class="sched-check sm">' + (e.done ? '☑' : '☐') + '</span>' +
        '<span class="sched-todo-time">' + esc(e.startTime || '') + '</span>' +
        '<span class="sched-todo-title">' + esc(e.title) + '</span>' +
        '<span class="sched-cat-tag" style="--c:' + catColor(e.category) + '">' + esc(e.category || '其他') + '</span>' +
      '</div>';
    }).join('') : '<div class="sched-empty sm">今天没有待办 🎉</div>';
    var total = evs.length, done = evs.filter(function (e) { return e.done; }).length;
    var pct = total ? Math.round(done / total * 100) : 0;
    return '<div class="sched-card sched-today-todo">' +
      '<div class="sched-card-title">✅ 今日待办 <span class="sched-count">' + done + '/' + total + '</span></div>' +
      '<div class="sched-progress"><div class="sched-progress-bar" style="width:' + pct + '%"></div></div>' +
      '<div class="sched-todo-list">' + rows + '</div>' +
    '</div>';
  }

  // ② 循环日程管理
  function recurringHTML() {
    var recs = (S().recurring || []);
    var rows = recs.length ? recs.map(function (r) {
      return '<div class="sched-rec" data-id="' + r.id + '">' +
        '<div class="sched-rec-main">' +
          '<span class="sched-cat-tag" style="--c:' + catColor(r.category) + '">' + esc(r.category || '其他') + '</span>' +
          '<b>' + esc(r.title) + '</b>' +
          '<span class="sched-rec-meta">' + esc(r.startTime || '') + ' · ' + repeatLabel(r.repeat) + ' · 提前' + (r.remind || 0) + '分</span>' +
        '</div>' +
        '<div class="sched-ev-ops">' +
          '<button class="sched-mini" data-act="rec-gen" data-id="' + r.id + '" title="生成本月实例">⤓ 生成</button>' +
          '<button class="sched-mini" data-act="rec-edit" data-id="' + r.id + '" title="编辑">✏</button>' +
          '<button class="sched-mini danger" data-act="rec-del" data-id="' + r.id + '" title="删除">🗑</button>' +
        '</div>' +
      '</div>';
    }).join('') : '<div class="sched-empty sm">还没有循环日程</div>';
    return '<div class="sched-card">' +
      '<div class="sched-card-title">🔁 循环日程管理</div>' +
      '<div class="sched-rec-list">' + rows + '</div>' +
      '<button class="btn sched-add-rec" data-act="rec-add">＋ 新建循环日程</button>' +
    '</div>';
  }

  // ============================================================
  // 「历史浏览」视图：筛选（时间/分类/状态）+ 统计
  // ============================================================
  function historyView() {
    var s = S();
    var hf = s.hf;
    var allDates = Object.keys(s.events).filter(function (d) { return (s.events[d] || []).length > 0; })
      .sort(function (a, b) { return b.localeCompare(a); });

    // 单条事件是否命中「分类 / 完成状态」筛选
    function matchEv(e) {
      if (hf.cat && e.category !== hf.cat) return false;
      if (hf.status === 'done' && !e.done) return false;
      if (hf.status === 'pending' && e.done) return false;
      return true;
    }
    // 应用筛选：月份筛「天」，分类/状态筛「天 + 天内的事件」
    var filtered = allDates.filter(function (d) {
      if (hf.month && d.indexOf(hf.month) === -1) return false;
      if (hf.cat || hf.status) {
        if (!(s.events[d] || []).some(matchEv)) return false;
      }
      return true;
    });

    // 统计
    var totalDays = allDates.length;
    var totalEv = Object.keys(s.events).reduce(function (sum, d) { return sum + s.events[d].length; }, 0);

    // 选项
    var months = uniqueMonths(allDates);
    var monthOpts = '<option value="">全部月份</option>' + months.map(function (m) {
      return '<option value="' + m + '" ' + (hf.month === m ? 'selected' : '') + '>' + m + '</option>';
    }).join('');
    var catOpts = '<option value="">全部分类</option>' + allCats().map(function (c) {
      return '<option value="' + esc(c.name) + '" ' + (hf.cat === c.name ? 'selected' : '') + '>' + esc(c.name) + '</option>';
    }).join('');
    var statusOpts = '<option value="">全部状态</option>' +
      '<option value="pending" ' + (hf.status === 'pending' ? 'selected' : '') + '>待完成</option>' +
      '<option value="done" ' + (hf.status === 'done' ? 'selected' : '') + '>已完成</option>';

    // 分页（每次 7 天）
    var PAGE = 7;
    var page = hf.page || 1;
    var loaded = Math.min(filtered.length, page * PAGE);
    var vis = filtered.slice(0, loaded);

    var listHtml = vis.length ? vis.map(function (d) {
      var evs = s.events[d];
      return '<div class="sched-hist-day" data-date="' + d + '">' +
        '<div class="sched-hist-head"><b>' + d + '</b> <span class="sched-pill">' + weekdayOf(d) + '</span>' +
          ' <span class="sched-hist-count">' + evs.length + ' 条</span></div>' +
        '<div class="sched-hist-events">' + evs.filter(matchEv).sort(byTime).map(function (e) {
          var cat = catColor(e.category);
          return '<div class="sched-hist-ev ' + (e.done ? 'done' : '') + '">' +
            '<span class="sched-dot" style="background:' + cat + '"></span>' +
            '<span class="sched-ev-time">' + esc(e.startTime || '') + '</span>' +
            '<span class="sched-ev-title">' + esc(e.title) + '</span>' +
            '<span class="sched-cat-tag" style="--c:' + cat + '">' + esc(e.category || '其他') + '</span>' +
            (e.done ? '<span class="sched-done-flag">✓</span>' : '') +
          '</div>';
        }).join('') + '</div>' +
      '</div>';
    }).join('') : '<div class="sched-empty">没有符合条件的历史日程</div>';

    var loadMore = loaded < filtered.length
      ? '<div class="sched-load-more"><button class="btn" data-act="loadmore">📥 加载更早（剩余 ' + (filtered.length - loaded) + ' 天）</button></div>'
      : '<div class="sched-end-mark">— 已显示全部历史日程 —</div>';

    return '' +
      '<div class="sched-card">' +
        '<div class="sched-hist-toolbar">' +
          '<div class="sched-hist-stats">' +
            '<span class="sched-stat-chip">📊 共 <strong>' + totalDays + '</strong> 天</span>' +
            '<span class="sched-stat-chip">📋 累计 <strong>' + totalEv + '</strong> 条</span>' +
          '</div>' +
        '</div>' +
        '<div class="sched-hist-filters">' +
          '<select class="sched-filter" data-filter="month">' + monthOpts + '</select>' +
          '<select class="sched-filter" data-filter="cat">' + catOpts + '</select>' +
          '<select class="sched-filter" data-filter="status">' + statusOpts + '</select>' +
        '</div>' +
        '<div class="sched-hist-list" id="schedHistList">' + listHtml + '</div>' +
        loadMore +
      '</div>';
  }

  // ============================================================
  // 事件委托（一次性绑定在 #schedRoot 上，重渲染后无需重复绑定）
  // ============================================================
  function bindOnce() {
    if (root._schedBound) return;
    root._schedBound = true;
    root.addEventListener('click', onClick);
    root.addEventListener('change', onFilterChange);
  }
  function onClick(e) {
    var t = e.target.closest('[data-act]'); if (!t) return;
    var act = t.dataset.act;
    var s = S(); if (!s) return;
    if (act === 'tab') { s.viewMode = t.dataset.v; save(); renderScheduleModule(); }
    else if (act === 'prev') { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderScheduleModule(); }
    else if (act === 'next') { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderScheduleModule(); }
    else if (act === 'day') { selectedDate = t.dataset.date; renderScheduleModule(); }
    else if (act === 'add-selected') { openEventModal(selectedDate); }
    else if (act === 'toggle') { toggleDone(t.dataset.id); }
    else if (act === 'edit') { openEventModal(null, findEvent(t.dataset.id)); }
    else if (act === 'del') { delEvent(t.dataset.id); }
    else if (act === 'jump') { var ev = findEvent(t.dataset.id); if (ev && ev.link) gotoView(ev.link.module); }
    else if (act === 'rec-add') { openRecModal(); }
    else if (act === 'rec-edit') { openRecModal(findRec(t.dataset.id)); }
    else if (act === 'rec-del') { delRec(t.dataset.id); }
    else if (act === 'rec-gen') { genRec(t.dataset.id); }
    else if (act === 'enable-notify') { requestNotify(); }
    else if (act === 'loadmore') { s.hf.page = (s.hf.page || 1) + 1; renderScheduleModule(); }
  }
  function onFilterChange(e) {
    var el = e.target.closest('[data-filter]'); if (!el) return;
    var s = S(); if (!s) return;
    s.hf = s.hf || {}; s.hf.page = 1; s.hf[el.dataset.filter] = el.value;
    save(); renderScheduleModule();
  }

  // ============================================================
  // 日程的增 / 改 / 删 / 完成
  // ============================================================
  function toggleDone(id) {
    var s = S(); var d = findEventDate(id); if (!d) return;
    var ev = s.events[d].find(function (e) { return e.id === id; }); if (!ev) return;
ev.done = !ev.done;
// 健身类日程完成后 → 自动同步健身打卡
if (ev.done && ev.category === '健身') syncFitnessCheckin(d);
// 完成日程 → 给能量；误触取消 → 退回能量
if (ev.done) window.awardEnergy('schedule_done'); else window.awardEnergy('schedule_done', { reverse: true });
save(); renderScheduleModule();
    if (window.dispatchEvent) window.dispatchEvent(new Event('schedule-changed'));
    toast(ev.done ? ('✓ 已完成：' + ev.title) : ('↩ 已恢复：' + ev.title));
  }
  function delEvent(id) {
    var title = ((findEvent(id) || {}).title || '');
    // 宿主 confirmDialog 签名：confirmDialog(message, onConfirm, onCancel, options)
    confirmDialog('确定删除「' + title + '」吗？\n此操作不可撤销。', function () {
      var d = findEventDate(id); if (!d) return;
      var wasDone = S().events[d] && S().events[d].some(function (e) { return e.id === id && e.done; });
      S().events[d] = S().events[d].filter(function (e) { return e.id !== id; });
      if (S().events[d].length === 0) delete S().events[d];
      if (wasDone) window.awardEnergy('schedule_done', { reverse: true });
      window.awardEnergy('schedule_add', { reverse: true });
      save(); renderScheduleModule();
      if (window.dispatchEvent) window.dispatchEvent(new Event('schedule-changed'));
      toast('🗑 已删除');
    });
  }

  // —— 添加 / 编辑 日程弹窗表单 ——
  function eventFormHTML(ev) {
    ev = ev || {};
    var cats = allCats();
    var catOpts = cats.map(function (c) {
      return '<option value="' + esc(c.name) + '" ' + (ev.category === c.name ? 'selected' : '') + '>' + esc(c.name) + '</option>';
    }).join('');
    var repOpts = [['none', '不重复'], ['daily', '每日'], ['weekly', '每周'], ['monthly', '每月']].map(function (r) {
      return '<option value="' + r[0] + '" ' + (ev.repeat === r[0] ? 'selected' : '') + '>' + r[1] + '</option>';
    }).join('');
    var remindOpts = [['0', '不提醒'], ['5', '提前 5 分钟'], ['10', '提前 10 分钟'], ['15', '提前 15 分钟'], ['30', '提前 30 分钟'], ['60', '提前 1 小时']].map(function (r) {
      return '<option value="' + r[0] + '" ' + ((ev.remind == null ? 0 : ev.remind) === (r[0] * 1) ? 'selected' : '') + '>' + r[1] + '</option>';
    }).join('');
    var prio = ev.priority || 'medium';
    var chips = cats.map(function (c) {
      return '<button type="button" class="sched-cat-chip ' + (ev.category === c.name ? 'active' : '') + '" data-cat="' + esc(c.name) + '" style="--c:' + c.color + '">' + esc(c.name) + '</button>';
    }).join('');
    return '<div class="sched-form">' +
      '<div class="sched-field"><label>标题 *</label>' +
        '<input class="modal-input" id="seTitle" value="' + esc(ev.title || '') + '" placeholder="如：项目周会"></div>' +
      '<div class="sched-field"><label>日期</label><input class="modal-input" id="seDate" type="date" value="' + esc(ev.date || selectedDate || getDateStr(new Date())) + '"></div>' +
      '<div class="sched-row">' +
        '<div class="sched-field"><label>开始时间</label><input class="modal-input" id="seStart" type="time" value="' + esc(ev.startTime || '09:00') + '"></div>' +
        '<div class="sched-field"><label>结束时间</label><input class="modal-input" id="seEnd" type="time" value="' + esc(ev.endTime || '') + '"></div>' +
      '</div>' +
      '<div class="sched-field"><label>分类</label>' +
        '<div class="sched-cat-pick" id="seCatPick">' + chips + '</div>' +
        '<input class="modal-input" id="seCat" value="' + esc(ev.category || '工作') + '" placeholder="选择或输入自定义分类">' +
        '<button type="button" class="sched-link-btn" id="seCatAdd">＋ 添加为自定义分类</button>' +
      '</div>' +
      '<div class="sched-row">' +
        '<div class="sched-field"><label>重复周期</label><select class="modal-input" id="seRepeat">' + repOpts + '</select></div>' +
        '<div class="sched-field"><label>提前提醒</label><select class="modal-input" id="seRemind">' + remindOpts + '</select></div>' +
      '</div>' +
      '<div class="sched-field"><label>优先级</label>' +
        '<div class="urgency-picker" id="sePrio">' +
          '<button type="button" class="urgency-pick urgency-low ' + (prio === 'low' ? 'selected' : '') + '" data-prio="low">🟢 低</button>' +
          '<button type="button" class="urgency-pick urgency-medium ' + (prio === 'medium' ? 'selected' : '') + '" data-prio="medium">🟡 中</button>' +
          '<button type="button" class="urgency-pick urgency-high ' + (prio === 'high' ? 'selected' : '') + '" data-prio="high">🔴 高</button>' +
        '</div>' +
        '<input type="hidden" id="sePrioVal" value="' + prio + '">' +
      '</div>' +
      '<div class="sched-field"><label>备注</label><textarea class="modal-textarea" id="seNote" placeholder="补充说明…">' + esc(ev.note || '') + '</textarea></div>' +
      '<label class="sched-check-line"><input type="checkbox" id="seDone" ' + (ev.done ? 'checked' : '') + '> 标记为已完成</label>' +
    '</div>';
  }
  function openEventModal(dateStr, ev) {
    // 注意：isEdit 取决于 ev 是否「真实已存在事件（有 id）」。
    var isEdit = !!(ev && ev.id);
    var base = ev ? Object.assign({}, ev) : { category: (allCats()[0] && allCats()[0].name) || '工作', priority: 'medium', repeat: 'none', remind: 0, startTime: '09:00', date: dateStr || selectedDate };
    openModal(isEdit ? '✏ 编辑日程' : '➕ 添加日程', eventFormHTML(base), [
      { text: '取消', onClick: closeModal },
      { text: '💾 保存', primary: true, onClick: function () {
        var title = (document.getElementById('seTitle').value || '').trim();
        if (!title) { toast('请输入标题'); return; }
        var cat = (document.getElementById('seCat').value || '').trim() || '其他';
        ensureCat(cat);
        var obj = {
          title: title,
          startTime: document.getElementById('seStart').value || '09:00',
          endTime: document.getElementById('seEnd').value || '',
          category: cat,
          repeat: document.getElementById('seRepeat').value || 'none',
          remind: parseInt(document.getElementById('seRemind').value || '0', 10),
          priority: document.getElementById('sePrioVal').value || 'medium',
          note: document.getElementById('seNote').value || '',
          done: document.getElementById('seDone').checked
        };
        var newDate = (document.getElementById('seDate').value || '').trim() || (dateStr || selectedDate) || getDateStr(new Date());
        if (isEdit) {
          var oldDate = ev.date;
          Object.assign(ev, obj);
          ev.date = newDate;
          if (newDate !== oldDate) {
            if (S().events[oldDate]) S().events[oldDate] = S().events[oldDate].filter(function (x) { return x !== ev; });
            if (!S().events[newDate]) S().events[newDate] = [];
            S().events[newDate].push(ev);
          }
} else {
obj.id = uid(); obj.date = newDate; obj.createdAt = getDateStr(new Date()); obj.src = 'manual';
if (!S().events[obj.date]) S().events[obj.date] = [];
S().events[obj.date].push(obj);
window.awardEnergy('schedule_add');
}
save(); closeModal(); renderScheduleModule();
        if (window.dispatchEvent) window.dispatchEvent(new Event('schedule-changed'));
        toast(isEdit ? '✓ 已保存' : '✓ 已添加');
      } }
    ]);
    bindEventForm();
  }
  // 绑定弹窗内的分类芯片 / 优先级 / 自定义分类按钮
  function bindEventForm() {
    var mask = document.getElementById('schedModalMask'); if (!mask) return;
    bindChips(mask);
    var prio = mask.querySelector('#sePrio');
    if (prio) prio.querySelectorAll('.urgency-pick').forEach(function (b) {
      b.onclick = function () {
        prio.querySelectorAll('.urgency-pick').forEach(function (x) { x.classList.remove('selected'); });
        b.classList.add('selected');
        mask.querySelector('#sePrioVal').value = b.dataset.prio;
      };
    });
    var addBtn = mask.querySelector('#seCatAdd');
    if (addBtn) addBtn.onclick = function () {
      var v = (mask.querySelector('#seCat').value || '').trim();
      if (!v) { toast('请先输入分类名'); return; }
      ensureCat(v); save();
      mask.querySelector('#seCatPick').innerHTML = allCats().map(function (c) {
        return '<button type="button" class="sched-cat-chip" data-cat="' + esc(c.name) + '" style="--c:' + c.color + '">' + esc(c.name) + '</button>';
      }).join('');
      bindChips(mask);
      toast('✓ 已添加分类：' + v);
    };
  }
  function bindChips(mask) {
    var pick = mask.querySelector('#seCatPick'); if (!pick) return;
    pick.querySelectorAll('.sched-cat-chip').forEach(function (b) {
      b.onclick = function () {
        mask.querySelector('#seCat').value = b.dataset.cat;
        pick.querySelectorAll('.sched-cat-chip').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
      };
    });
  }

  // ============================================================
  // 循环日程：模板 / 生成实例 / 删除
  // ============================================================
  function recFormHTML(r) {
    r = r || {};
    var cats = allCats();
    var catOpts = cats.map(function (c) {
      return '<option value="' + esc(c.name) + '" ' + (r.category === c.name ? 'selected' : '') + '>' + esc(c.name) + '</option>';
    }).join('');
    var repOpts = [['daily', '每日'], ['weekly', '每周'], ['monthly', '每月']].map(function (x) {
      return '<option value="' + x[0] + '" ' + (r.repeat === x[0] ? 'selected' : '') + '>' + x[1] + '</option>';
    }).join('');
    var wdOpts = [['1', '周一'], ['2', '周二'], ['3', '周三'], ['4', '周四'], ['5', '周五'], ['6', '周六'], ['0', '周日']].map(function (x) {
      return '<option value="' + x[0] + '" ' + ((r.weekday == null ? 1 : r.weekday) === (x[0] * 1) ? 'selected' : '') + '>' + x[1] + '</option>';
    }).join('');
    var mdOpts = ''; for (var i = 1; i <= 28; i++) mdOpts += '<option value="' + i + '" ' + ((r.monthDay == null ? 1 : r.monthDay) === i ? 'selected' : '') + '>' + i + ' 号</option>';
    return '<div class="sched-form">' +
      '<div class="sched-field"><label>标题 *</label><input class="modal-input" id="rcTitle" value="' + esc(r.title || '') + '" placeholder="如：晨跑"></div>' +
      '<div class="sched-row">' +
        '<div class="sched-field"><label>时间</label><input class="modal-input" id="rcStart" type="time" value="' + esc(r.startTime || '07:00') + '"></div>' +
        '<div class="sched-field"><label>结束</label><input class="modal-input" id="rcEnd" type="time" value="' + esc(r.endTime || '') + '"></div>' +
      '</div>' +
      '<div class="sched-field"><label>分类</label>' +
        '<input class="modal-input" id="rcCat" value="' + esc(r.category || '健身') + '" placeholder="如：健身">' +
        '<button type="button" class="sched-link-btn" id="rcCatAdd">＋ 添加为自定义分类</button></div>' +
      '<div class="sched-row">' +
        '<div class="sched-field"><label>重复</label><select class="modal-input" id="rcRepeat">' + repOpts + '</select></div>' +
        '<div class="sched-field"><label>提前提醒</label><select class="modal-input" id="rcRemind">' +
          [['0', '不提醒'], ['5', '5 分'], ['10', '10 分'], ['15', '15 分'], ['30', '30 分'], ['60', '1 小时']].map(function (x) {
            return '<option value="' + x[0] + '" ' + ((r.remind == null ? 0 : r.remind) === (x[0] * 1) ? 'selected' : '') + '>' + x[1] + '</option>';
          }).join('') + '</select></div>' +
      '</div>' +
      '<div class="sched-row">' +
        '<div class="sched-field"><label>每周（周几）</label><select class="modal-input" id="rcWeekday">' + wdOpts + '</select></div>' +
        '<div class="sched-field"><label>每月（几号）</label><select class="modal-input" id="rcMonthDay">' + mdOpts + '</select></div>' +
      '</div>' +
      '<div class="sched-field"><label>备注</label><textarea class="modal-textarea" id="rcNote" placeholder="可选">' + esc(r.note || '') + '</textarea></div>' +
    '</div>';
  }
  function openRecModal(r) {
    var isEdit = !!r;
    openModal(isEdit ? '✏ 编辑循环日程' : '➕ 新建循环日程', recFormHTML(r), [
      { text: '取消', onClick: closeModal },
      { text: '💾 保存', primary: true, onClick: function () {
        var title = (document.getElementById('rcTitle').value || '').trim();
        if (!title) { toast('请输入标题'); return; }
        var cat = (document.getElementById('rcCat').value || '').trim() || '其他';
        ensureCat(cat);
        var obj = {
          title: title,
          startTime: document.getElementById('rcStart').value || '07:00',
          endTime: document.getElementById('rcEnd').value || '',
          category: cat,
          repeat: document.getElementById('rcRepeat').value || 'weekly',
          weekday: parseInt(document.getElementById('rcWeekday').value, 10),
          monthDay: parseInt(document.getElementById('rcMonthDay').value, 10),
          remind: parseInt(document.getElementById('rcRemind').value || '0', 10),
          priority: 'medium',
          note: document.getElementById('rcNote').value || ''
        };
        var s = S(); s.recurring = s.recurring || [];
        if (isEdit) { Object.assign(r, obj); } else { obj.id = uid(); s.recurring.push(obj); }
        save(); closeModal(); renderScheduleModule();
        toast(isEdit ? '✓ 已保存循环模板' : '✓ 已新建循环模板');
      } }
    ]);
    var mask = document.getElementById('schedModalMask');
    if (mask) {
      var addBtn = mask.querySelector('#rcCatAdd');
      if (addBtn) addBtn.onclick = function () {
        var v = (mask.querySelector('#rcCat').value || '').trim();
        if (!v) { toast('请先输入分类名'); return; }
        ensureCat(v); save(); toast('✓ 已添加分类：' + v);
      };
    }
  }
  function delRec(id) {
    // 宿主 confirmDialog 签名：confirmDialog(message, onConfirm, onCancel, options)
    confirmDialog('确定删除该循环日程模板吗？\n（已生成的实例不受影响）', function () {
      var s = S(); s.recurring = (s.recurring || []).filter(function (r) { return r.id !== id; });
      save(); renderScheduleModule(); toast('🗑 已删除循环模板');
    });
  }
  // 把循环模板展开成本月具体实例（去重）
  function genRec(id) {
    var r = findRec(id); if (!r) return;
    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth();
    var days = new Date(y, m + 1, 0).getDate();
    var added = 0;
    for (var d = 1; d <= days; d++) {
      var dt = new Date(y, m, d); var wd = dt.getDay();
      var match = false;
      if (r.repeat === 'daily') match = true;
      else if (r.repeat === 'weekly') match = (wd === (r.weekday == null ? 1 : r.weekday));
      else if (r.repeat === 'monthly') match = (d === (r.monthDay == null ? 1 : r.monthDay));
      if (!match) continue;
      var ds = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      if (!S().events[ds]) S().events[ds] = [];
      if (S().events[ds].some(function (e) { return e.recId === id && e.date === ds; })) continue;
      S().events[ds].push({
        id: uid(), recId: id, date: ds, title: r.title, startTime: r.startTime, endTime: r.endTime || '',
        category: r.category, repeat: r.repeat, remind: r.remind || 0, priority: r.priority || 'medium',
        note: r.note || '', done: false, src: 'recurring', createdAt: getDateStr(now)
      });
      added++;
    }
    save(); renderScheduleModule();
    toast('✓ 已生成 ' + added + ' 条循环实例（本月）');
  }

  // ============================================================
  // 跨模块联动
  // ============================================================
  // 健身打卡同步（不改动健身模块：直接写入 state.checkin.fitness，健身模块渲染时即视为已打卡）
  function syncFitnessCheckin(dateStr) {
    try {
      if (window.state && window.state.checkin) {
        window.state.checkin.fitness = window.state.checkin.fitness || {};
        window.state.checkin.fitness[dateStr] = true;
        if (window.saveData) window.saveData();
        toast('💪 已同步健身打卡（' + dateStr + '）');
      }
    } catch (e) { /* 忽略 */ }
  }
  // 跳转到其他视图（模拟点击导航，不改动其他模块）
  function gotoView(name) {
    var el = document.querySelector('.nav-item[data-view="' + name + '"]') ||
      document.querySelector('.drawer-nav-item[data-view="' + name + '"]');
    if (el) { el.click(); toast('↗ 已跳转到「' + name + '」'); }
    else toast('未找到对应模块');
  }

  // 速记 → 日程：读取今日日记里的速记行并识别转换
  function openImportQuickNote() {
    var notes = [];
    var diary = window.state && window.state.diary;
    if (diary) {
      Object.keys(diary).forEach(function (d) {
        var c = diary[d]; var content = (c && (c.content || c.text)) || '';
        content.split('\n').forEach(function (line) {
          if (line.indexOf('速记：') >= 0) notes.push({ date: d, text: line.split('速记：')[1].trim() });
        });
      });
    }
    window.__qnNotes = notes;
    var rows = notes.length ? notes.map(function (n, i) {
      var ev = convertFromText(n.text);
      if (!ev) return '';
      return '<div class="sched-qn-row"><div><b>' + esc(n.text) + '</b><br>' +
        '<span class="sched-qn-meta">' + n.date + ' → 识别为：' + ev.date + ' ' + esc(ev.startTime) + ' · ' + esc(ev.category) + '</span></div>' +
        '<button class="btn primary sched-mini" data-qn="' + i + '">转为日程</button></div>';
    }).join('') : '<div class="sched-empty">没有可识别的速记内容</div>';
    openModal('📥 从速记导入日程', '<div class="sched-qn-list">' + rows + '</div>', [{ text: '关闭', onClick: closeModal }]);
    var mask = document.getElementById('schedModalMask');
    if (mask) mask.querySelectorAll('[data-qn]').forEach(function (b) {
      b.onclick = function () {
        var n = window.__qnNotes[+b.dataset.qn]; var ev = convertFromText(n.text);
        if (ev) {
          if (!S().events[ev.date]) S().events[ev.date] = [];
          S().events[ev.date].push(ev); save(); closeModal(); renderScheduleModule();
          toast('✓ 已转为日程：' + ev.title);
        }
      };
    });
  }

  // 文本解析：识别日期 / 时间 / 分类，转成日程对象
  function parseDateFromText(text, base) {
    var d = new Date(base || new Date());
    if (/后天/.test(text)) d.setDate(d.getDate() + 2);
    else if (/明天/.test(text)) d.setDate(d.getDate() + 1);
    else if (/周([一二三四五六日天])/.test(text)) {
      var map = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0 };
      var wd = map[RegExp.$1]; var cur = d.getDay(); var diff = (wd - cur + 7) % 7; if (diff === 0) diff = 7;
      d.setDate(d.getDate() + diff);
    } else {
      var md = text.match(/(\d{1,2})月(\d{1,2})[日号]/);
      if (md) d = new Date(d.getFullYear(), parseInt(md[1], 10) - 1, parseInt(md[2], 10));
      else {
        var iso = text.match(/(\d{4}-\d{1,2}-\d{1,2})/);
        if (iso) { var p = iso[1].split('-'); d = new Date(+p[0], +p[1] - 1, +p[2]); }
        else return null;
      }
    }
    return getDateStr(d);
  }
  function parseTimeFromText(text) {
    var m = text.match(/(\d{1,2})[:：](\d{2})/); if (m) return String(m[1]).padStart(2, '0') + ':' + m[2];
    var h = text.match(/(\d{1,2})\s*点(?:(\d{1,2})\s*分)?/);
    if (h) return String(h[1]).padStart(2, '0') + ':' + (h[2] ? String(h[2]).padStart(2, '0') : '00');
    return '09:00';
  }
  function convertFromText(text) {
    text = (text || '').trim(); if (!text) return null;
    var date = parseDateFromText(text); if (!date) return null;
    var time = parseTimeFromText(text);
    var cat = '其他';
    var kw = [['面试', '面试'], ['健身', '健身'], ['运动', '健身'], ['学习', '学习'], ['读书', '学习'], ['会议', '工作'], ['周会', '工作'], ['聚餐', '社交'], ['团建', '社交']];
    for (var i = 0; i < kw.length; i++) { if (text.indexOf(kw[i][0]) >= 0) { cat = kw[i][1]; break; } }
    var title = text.replace(/今天|明天|后天|周[一二三四五六日天]|(\d{1,2})月(\d{1,2})[日号]|(\d{4}-\d{1,2}-\d{1,2})|(\d{1,2})[:：](\d{2})|(\d{1,2})\s*点(?:(\d{1,2})\s*分)?/g, '')
      .replace(/\s+/g, ' ').trim() || '日程';
    return {
      id: uid(), date: date, title: title.slice(0, 30), startTime: time, endTime: '', category: cat,
      repeat: 'none', remind: 0, priority: 'medium', note: '', done: false, src: 'import'
    };
  }

  // ============================================================
  // 浏览器通知 + 临近提醒 + 每月小结
  // ============================================================
  function ensureNotify() { return ('Notification' in window) && Notification.permission === 'granted'; }
  function requestNotify() {
    if (!('Notification' in window)) { toast('当前浏览器不支持通知'); return; }
    Notification.requestPermission().then(function (p) {
      if (p === 'granted') { toast('🔔 已开启日程提醒'); startReminderEngine(); }
      else toast('未授权桌面通知（仍可在页内提醒）');
    });
  }
  function startReminderEngine() {
    if (window.__schedReminderTimer || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    window.__schedReminderTimer = setInterval(checkReminders, 30000);
    checkReminders();
  }
  function checkReminders() {
    if (!ensureNotify()) return;
    var now = new Date();
    var s = S(); if (!s) return;
    Object.keys(s.events).forEach(function (d) {
      (s.events[d] || []).forEach(function (ev) {
        if (ev.done || !ev.remind) return;
        var dt = parseDateTime(d, ev.startTime); if (!dt) return;
        var diff = (dt - now) / 60000; // 距开始的分钟
        if (diff > 0 && diff <= ev.remind) {
          var key = ev.id + '_' + getDateStr(now);
          s.notified = s.notified || {};
          if (!s.notified[key]) {
            s.notified[key] = true; save();
            try { new Notification('⏰ 日程提醒：' + ev.title, { body: d + ' ' + ev.startTime + ' · ' + ev.category }); } catch (e) {}
            toast('⏰ ' + ev.title + ' 即将开始（' + ev.startTime + '）');
          }
        }
      });
    });
  }
  function parseDateTime(dateStr, timeStr) {
    if (!timeStr) return null;
    var p = timeStr.split(':');
    var dt = new Date(dateStr.replace(/-/g, '/'));
    dt.setHours(+p[0] || 0, +p[1] || 0, 0, 0);
    return dt;
  }
  // 每月 1 号自动生成「上月完成情况小结」
  function maybeMonthlySummary() {
    var s = S(); if (!s) return;
    var now = new Date();
    var ym = now.getFullYear() + '-' + (now.getMonth() + 1);
    if (s.lastSummaryYm === ym) return;
    var pd = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    var pym = pd.getFullYear() + '-' + String(pd.getMonth() + 1).padStart(2, '0');
    var total = 0, done = 0, interview = 0, study = 0;
    Object.keys(s.events).forEach(function (d) {
      if (d.indexOf(pym) !== 0) return;
      s.events[d].forEach(function (ev) {
        total++; if (ev.done) done++;
        if (ev.category === '面试') interview++;
        if (ev.category === '学习') study++;
      });
    });
    s.lastSummaryYm = ym; save();
    if (total > 0) {
      var rate = Math.round(done / total * 100);
      toast('📅 ' + pym + ' 小结：共 ' + total + ' 项，完成 ' + done + ' 项（' + rate + '%），面试 ' + interview + ' 场，学习 ' + study + ' 次');
    }
  }

  // ============================================================
  // 自建弹窗（渲染进 body，复用主题 .modal-* 样式，不依赖其他模块）
  // ============================================================
  function openModal(title, bodyHTML, actions) {
    closeModal();
    var mask = document.createElement('div');
    mask.className = 'modal-mask';
    mask.id = 'schedModalMask';
    var actHTML = (actions || []).map(function (a, i) {
      var cls = 'btn ' + (a.primary ? 'primary' : (a.danger ? 'danger' : ''));
      return '<button class="' + cls + '" data-act="a' + i + '">' + esc(a.text) + '</button>';
    }).join('');
    mask.innerHTML =
      '<div class="modal" role="dialog" aria-label="' + esc(title) + '">' +
        '<div class="modal-title">' + esc(title) + '</div>' +
        '<div class="wb-modal-body">' + bodyHTML + '</div>' +
        (actHTML ? '<div class="modal-actions">' + actHTML + '</div>' : '') +
      '</div>';
    document.body.appendChild(mask);
    mask.addEventListener('click', function (e) { if (e.target === mask) closeModal(); });
    (actions || []).forEach(function (a, i) {
      var b = mask.querySelector('[data-act="a' + i + '"]');
      if (b && a.onClick) b.addEventListener('click', function () { a.onClick(); });
    });
    return mask;
  }
  function closeModal() { var m = document.getElementById('schedModalMask'); if (m) m.remove(); }

  // ============================================================
  // 对外暴露（供 app.js 桥接 / FAB / 速记联动）
  // ============================================================
  window.renderScheduleModule = renderScheduleModule;
  window.ScheduleAPI = {
    // 打开日程模块（切到当天日历）
    open: function () { var s = S(); if (s) { s.viewMode = 'today'; save(); } renderScheduleModule(); },
    // 直接打开添加弹窗（可选预填事件）
    addEvent: function (dateStr, ev) { openEventModal(dateStr || getDateStr(new Date()), ev); },
    // 解析文本为日程对象（供速记调用）
    convertFromText: function (text) { return convertFromText(text); },
    // 直接切换「完成 / 未完成」（供桌面时间线快捷勾选）
    toggleDone: function (id) { toggleDone(id); },
    // 解析并直接落库（返回是否成功）
    addFromText: function (text) {
      var ev = convertFromText(text); if (!ev) return false;
      if (!S().events[ev.date]) S().events[ev.date] = [];
      S().events[ev.date].push(ev); save(); renderScheduleModule(); return true;
    }
  };
})();
