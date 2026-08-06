/* =====================================================================
 * finance_app.js —— 像素工作台「记账」模块（纯前端 · 原生 JS · localStorage）
 * ---------------------------------------------------------------------
 * 设计原则：
 *  1) 单文件独立模块：所有记账逻辑都在这一个文件里，不依赖任何框架 / 后端 / 数据库。
 *  2) 不修改工作台其它模块代码：
 *     · 渲染入口通过 app.js 的 renderers 桥接（renderFinanceBridge）；
 *     · 与健身模块的打通采用「包装 window.renderFitnessModule」的方式，
 *       fitness_app.js 一行代码都没改。
 *  3) 主题自适应：全部使用 style.css 的主题变量（--primary / --bg-card / --danger …），
 *     切换 樱花粉 / 薰衣草紫 / 抹茶绿 / 夜间 四套主题时自动跟随。
 *  4) 数据落地：
 *     · 账单沿用工作台大对象 state.finance.records（键 pixel_workbench_v3），
 *       这样「桌面页最近账目 / 今日记账数」等既有联动不会失效；
 *     · 预算 / 自定义分类 / 固定模板 / UI 偏好 存在 `hannahFin:` 前缀的独立键；
 *     · 右上角「💾 备份」为全量扫描 localStorage，以上数据自动纳入导出 / 导入 / 清空。
 *
 * ★ 如何自行扩展（需求 9）
 *   · 新增内置分类：在下方 DEFAULT_CATS.income / DEFAULT_CATS.expense 数组里
 *     照格式加一行 { name:'分类名', icon:'🎀', color:'#FFB6C1' } 即可，
 *     图表配色、图例、筛选下拉、预算面板都会自动出现这一项。
 *   · 运行时新增分类：记账弹窗里点「＋ 自定义」，或明细区「🏷 分类管理」。
 *     自定义分类存 hannahFin:cats，未指定颜色时按名称哈希从 PALETTE 里取色。
 *   · 新增固定收支模板：在 DEFAULT_TPLS 里加一条，或页面上点「＋ 新增模板」。
 *   · 新增图表区间：在 BAR_RANGES 加一项，并在 buildBarSeries() 里补一个分支。
 * ===================================================================== */
(function () {
  'use strict';

  /* ==================================================================
   * 0. 通用工具
   * ================================================================== */
  var FN = {
    load: function (key, def) {
      try {
        var raw = localStorage.getItem(key);
        if (raw == null) return def;
        var v = JSON.parse(raw);
        return v == null ? def : v;
      } catch (e) { return def; }
    },
    save: function (key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
    },
    uid: function () { return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },
    // HTML 转义（先转 String，避免数字类型调用 replace 报错）
    esc: function (s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
  };

  // localStorage 键名集中管理（新增键请在此登记，并同步到 backup.js 的 KNOWN 列表）
  var K = {
    cats:    'hannahFin:cats',    // 自定义分类 { income:[], expense:[] }
    budgets: 'hannahFin:budgets', // 月度预算 { period, items:{分类:额度}, history:{}, lastReset }
    tpls:    'hannahFin:tpls',    // 固定收支模板 []
    ui:      'hannahFin:ui'       // 界面偏好（图表区间 / 筛选条件 / 折叠状态）
  };

  function toast(m) { if (window.toast) window.toast(m); }

  /* ---- 日期工具（一律按本地时区，避免 new Date('YYYY-MM-DD') 被当成 UTC） ---- */
  function ymd(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function parseDate(s) { return new Date(String(s || '').slice(0, 10) + 'T00:00:00'); }
  function today() { return ymd(new Date()); }
  function ymNow() { return today().slice(0, 7); }
  function ymOf(dateStr) { return String(dateStr || '').slice(0, 7); }
  function shiftYm(ym, delta) {
    var y = parseInt(ym.slice(0, 4), 10), m = parseInt(ym.slice(5, 7), 10) - 1 + delta;
    var d = new Date(y, m, 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }
  // 本周一（国内习惯以周一为一周起点）
  function weekStart(d) {
    d = d || new Date();
    var day = d.getDay(); // 0=周日
    var back = day === 0 ? 6 : day - 1;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - back);
  }
  function daysInMonth(ym) {
    return new Date(parseInt(ym.slice(0, 4), 10), parseInt(ym.slice(5, 7), 10), 0).getDate();
  }
  var WEEK_CN = ['日', '一', '二', '三', '四', '五', '六'];

  // 金额格式化：千分位 + 最多两位小数（整数不显示 .00）
  function fmt(n) {
    n = Number(n) || 0;
    var s = (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
    var p = s.split('.');
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return p.join('.');
  }

  /* ==================================================================
   * 1. 收支分类配置  ★ 新增分类改这里
   * ================================================================== */
  var DEFAULT_CATS = {
    income: [
      { name: '工资薪资', icon: '💰', color: '#B8E6C8' },
      { name: '绩效奖金', icon: '🏆', color: '#FFE89B' },
      { name: '理财收益', icon: '📈', color: '#A8D8EA' },
      { name: '红包',     icon: '🧧', color: '#FFA8C4' }
    ],
    expense: [
      { name: '餐饮',     icon: '🍜', color: '#FFB6C1' },
      { name: '购物',     icon: '🛍️', color: '#FFE89B' },
      { name: '交通',     icon: '🚇', color: '#BFE3F5' },
      { name: '职场办公', icon: '💼', color: '#C8B6E2' },
      { name: '租房',     icon: '🏠', color: '#FFCBA4' },
      { name: '健身运动', icon: '💪', color: '#B5EAD7' },
      { name: '医疗',     icon: '💊', color: '#FFA8C4' },
      { name: '人情往来', icon: '🎁', color: '#F7C8E0' },
      { name: '学习书籍', icon: '📚', color: '#A8E6CF' },
      { name: '娱乐',     icon: '🎮', color: '#C8A8E9' },
      { name: '宠物',     icon: '🐾', color: '#FFDAC1' }
    ]
  };

  // 旧版本 / 历史数据里出现过的分类，保留图标以免老账单变成问号
  var LEGACY_ICON = {
    '工资': '💰', '奖金': '🏆', '副业': '🧰', '投资': '📈',
    '居住': '🏠', '学习': '📚', '健身': '💪', '其他': '🎀'
  };

  // 自定义分类没指定颜色时，按名称哈希取一个稳定的像素配色
  var PALETTE = ['#FFB6C1', '#BFE3F5', '#FFE89B', '#C8A8E9', '#B8E6C8', '#FFCBA4',
    '#FFA8C4', '#A8D8EA', '#F7C8E0', '#B5EAD7', '#FFDAC1', '#C8B6E2'];
  function hashColor(name) {
    var h = 0, s = String(name);
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return PALETTE[h % PALETTE.length];
  }

  function customCats() {
    var c = FN.load(K.cats, null);
    if (!c || typeof c !== 'object') c = { income: [], expense: [] };
    c.income = Array.isArray(c.income) ? c.income : [];
    c.expense = Array.isArray(c.expense) ? c.expense : [];
    return c;
  }
  function saveCustomCats(c) { FN.save(K.cats, c); }

  // 某类型下的全部分类（内置 + 自定义 + 历史数据里出现过的），已去重
  function catsOf(type) {
    var out = [], seen = {};
    DEFAULT_CATS[type].forEach(function (c) { if (!seen[c.name]) { seen[c.name] = 1; out.push(c); } });
    customCats()[type].forEach(function (c) {
      if (!c || !c.name || seen[c.name]) return;
      seen[c.name] = 1;
      out.push({ name: c.name, icon: c.icon || '🏷️', color: c.color || hashColor(c.name), custom: true });
    });
    getRecords().forEach(function (r) {
      if (r.type !== type || !r.category || seen[r.category]) return;
      seen[r.category] = 1;
      out.push({ name: r.category, icon: LEGACY_ICON[r.category] || '🏷️', color: hashColor(r.category), legacy: true });
    });
    return out;
  }
  function catMeta(name, type) {
    var list = catsOf(type || 'expense');
    for (var i = 0; i < list.length; i++) if (list[i].name === name) return list[i];
    var other = catsOf(type === 'income' ? 'expense' : 'income');
    for (var j = 0; j < other.length; j++) if (other[j].name === name) return other[j];
    return { name: name, icon: LEGACY_ICON[name] || '🏷️', color: hashColor(name) };
  }

  /* ==================================================================
   * 2. 账单读写（沿用 state.finance.records，保证与桌面页联动不断）
   * ================================================================== */
  function ensureStore() {
    var st = window.state;
    if (!st) return null;
    if (!st.finance || typeof st.finance !== 'object') st.finance = { records: [] };
    if (!Array.isArray(st.finance.records)) st.finance.records = [];
    return st.finance;
  }
  function getRecords() {
    var f = ensureStore();
    if (!f) return [];
    return f.records.map(normalize);
  }
  // 补齐新字段，兼容老账单（老数据没有 note / tags）
  function normalize(r) {
    r.note = r.note || '';
    r.tags = Array.isArray(r.tags) ? r.tags : [];
    r.amount = Number(r.amount) || 0;
    r.date = String(r.date || today()).slice(0, 10);
    return r;
  }
  function commit() {
    if (window.saveData) window.saveData();
  }
  function addRecordRaw(rec) {
    var f = ensureStore();
    if (!f) return null;
    rec.id = rec.id || Date.now() + Math.floor(Math.random() * 1000);
    f.records.push(normalize(rec));
    commit();
    return rec;
  }
function removeRecord(id) {
var f = ensureStore();
if (!f) return null;
var hit = null;
f.records = f.records.filter(function (r) {
/* eslint-disable eqeqeq */
if (r.id == id) { hit = r; return false; }
return true;
});
commit();
if (hit) window.awardEnergy('finance', { reverse: true });
return hit;
}
  function findRecord(id) {
    var list = getRecords();
    for (var i = 0; i < list.length; i++) if (list[i].id == id) return list[i];
    return null;
  }
  function updateRecord(id, patch) {
    var f = ensureStore();
    if (!f) return;
    f.records.forEach(function (r) {
      if (r.id == id) { Object.keys(patch).forEach(function (k) { r[k] = patch[k]; }); normalize(r); }
    });
    commit();
  }

  function sumOf(list, type) {
    return list.reduce(function (s, r) { return r.type === type ? s + (Number(r.amount) || 0) : s; }, 0);
  }
  function inMonth(list, ym) { return list.filter(function (r) { return ymOf(r.date) === ym; }); }

  /* ==================================================================
   * 3. 预算（每月 1 号自动重置：归档上月实际花销，额度延续）
   * ================================================================== */
  function spentByCat(ym) {
    var m = {};
    inMonth(getRecords(), ym).forEach(function (r) {
      if (r.type !== 'expense') return;
      m[r.category] = (m[r.category] || 0) + r.amount;
    });
    return m;
  }
  function loadBudgets() {
    var b = FN.load(K.budgets, null);
    var cur = ymNow();
    if (!b || typeof b !== 'object') {
      b = { period: cur, items: {}, history: {}, lastReset: null };
      FN.save(K.budgets, b);
      return b;
    }
    b.items = b.items || {};
    b.history = b.history || {};
    // ★ 跨月自动重置：把上一周期的额度与实际花销存进 history，进度归零，额度延续
    if (b.period !== cur) {
      if (b.period) {
        b.history[b.period] = { items: JSON.parse(JSON.stringify(b.items)), spent: spentByCat(b.period) };
      }
      b.period = cur;
      b.lastReset = today();
      FN.save(K.budgets, b);
    }
    return b;
  }
  function saveBudgets(b) { FN.save(K.budgets, b); }

  /* ==================================================================
   * 4. 固定收支模板  ★ 新增模板改这里
   * ================================================================== */
  var DEFAULT_TPLS = [
    { id: 't_salary',  type: 'income',  category: '工资薪资', name: '月薪',       amount: 0, note: '每月固定工资', tags: ['固定'] },
    { id: 't_bonus',   type: 'income',  category: '绩效奖金', name: '季度绩效',   amount: 0, note: '',           tags: ['固定'] },
    { id: 't_rent',    type: 'expense', category: '租房',     name: '房租',       amount: 0, note: '每月房租',   tags: ['固定'] },
    { id: 't_commute', type: 'expense', category: '交通',     name: '通勤',       amount: 0, note: '地铁/公交',  tags: ['通勤'] },
    { id: 't_gym',     type: 'expense', category: '健身运动', name: '健身房月卡', amount: 0, note: '',           tags: ['固定'] },
    { id: 't_lunch',   type: 'expense', category: '餐饮',     name: '午餐',       amount: 0, note: '',           tags: [] }
  ];
  function loadTpls() {
    var t = FN.load(K.tpls, null);
    if (!Array.isArray(t)) { t = JSON.parse(JSON.stringify(DEFAULT_TPLS)); FN.save(K.tpls, t); }
    return t;
  }
  function saveTpls(t) { FN.save(K.tpls, t); }

  /* ==================================================================
   * 5. 界面偏好（图表区间 / 饼图模式 / 筛选条件 / 分组折叠）
   * ================================================================== */
  var BAR_RANGES = [
    { id: 'week',  label: '本周' },
    { id: 'month', label: '本月' },
    { id: '3m',    label: '近三月' }
  ];
  var PIE_MODES = [
    { id: 'all',     label: '全部收支占比' },
    { id: 'expense', label: '仅支出占比' },
    { id: 'income',  label: '仅收入占比' }
  ];
  var DATE_RANGES = [
    { id: 'all',   label: '全部时间' },
    { id: 'today', label: '今天' },
    { id: 'week',  label: '本周' },
    { id: 'month', label: '本月' },
    { id: 'last',  label: '上月' },
    { id: '3m',    label: '近三月' },
    { id: 'custom',label: '自定义区间' }
  ];

  var ui = (function () {
    var d = FN.load(K.ui, null) || {};
    return {
      bar: d.bar || 'week',
      pie: d.pie || 'expense',
      filter: Object.assign({ range: 'month', type: 'all', cat: 'all', kw: '', from: '', to: '' }, d.filter || {}),
      collapsed: Array.isArray(d.collapsed) ? d.collapsed : [],
      reviewYm: d.reviewYm || ''
    };
  })();
  function saveUI() { FN.save(K.ui, ui); }

  /* ==================================================================
   * 6. 自建弹窗（渲染进 #modalRoot，与工作台其它模块共用样式；
   *    直接给按钮绑 onClick，不依赖全局 showModal 的实现差异）
   * ================================================================== */
  function showModal(title, bodyHTML, actions) {
    var root = document.getElementById('modalRoot');
    if (!root) { root = document.createElement('div'); root.id = 'modalRoot'; document.body.appendChild(root); }
    var actHTML = (actions || []).map(function (a, i) {
      var cls = 'btn ' + (a.primary ? 'primary' : (a.danger ? 'danger' : ''));
      return '<button class="' + cls + '" data-midx="' + i + '">' + FN.esc(a.text) + '</button>';
    }).join('');
    root.innerHTML = '<div class="modal-mask" id="finModalMask"><div class="modal">'
      + '<div class="modal-title">' + FN.esc(title) + '</div>'
      + '<div class="wb-modal-body">' + bodyHTML + '</div>'
      + (actHTML ? '<div class="modal-actions">' + actHTML + '</div>' : '')
      + '</div></div>';
    var mask = document.getElementById('finModalMask');
    mask.addEventListener('click', function (e) { if (e.target === mask) closeModal(); });
    (actions || []).forEach(function (a, i) {
      var btn = mask.querySelector('[data-midx="' + i + '"]');
      if (btn && a.onClick) btn.addEventListener('click', function () { a.onClick(); });
    });
    return mask;
  }
  function closeModal() {
    var r = document.getElementById('modalRoot');
    if (r) r.innerHTML = '';
  }

  /* ==================================================================
   * 7. 悬浮提示（图表 hover 显示金额与占比）
   * ================================================================== */
  function ensureTip() {
    var t = document.getElementById('finTip');
    if (!t) { t = document.createElement('div'); t.id = 'finTip'; t.className = 'fin-tip'; document.body.appendChild(t); }
    return t;
  }
  function bindTips(scope) {
    Array.prototype.forEach.call(scope.querySelectorAll('[data-tip]'), function (el) {
      el.addEventListener('mouseenter', function () {
        var t = ensureTip(); t.textContent = el.getAttribute('data-tip'); t.classList.add('show');
      });
      el.addEventListener('mousemove', function (e) {
        var t = ensureTip();
        t.style.left = Math.min(e.clientX + 14, (window.innerWidth || 1200) - 190) + 'px';
        t.style.top = (e.clientY + 16) + 'px';
      });
      el.addEventListener('mouseleave', function () { ensureTip().classList.remove('show'); });
    });
  }

  /* ==================================================================
   * 8. 渲染主入口
   * ================================================================== */
  function renderFinanceModule() {
    var root = document.getElementById('finRoot');
    if (!root) return;
    root.innerHTML = entryCard() + summaryCards() + barCard() + pieCard() + listCard() + budgetCard() + tplCard() + reviewCard();
    bindEvents(root);
    bindTips(root);
  }

  /* ---- 8.0 快速记账入口（置顶，方便一键记收入/支出） ---- */
  function entryCard() {
    return '<div class="card fin-card fin-quick-card">'
      + '<div class="fin-card-head"><div class="card-title fin-title">✨ 快速记账</div>'
      + '<div class="fin-head-btns">'
      + '<button class="btn" id="finCatMgrBtn">🏷 分类管理</button>'
      + '<button class="btn" id="addIncomeBtn">+ 收入</button>'
      + '<button class="btn primary" id="addExpenseBtn">+ 支出</button>'
      + '</div></div></div>';
  }

  /* ---- 8.1 顶部收支卡片（本月收入 / 本月支出 / 本月结余 / 今日收支 / 本周结余） ---- */
  function summaryCards() {
    var all = getRecords();
    var ym = ymNow(), td = today();
    var mList = inMonth(all, ym);
    var mIn = sumOf(mList, 'income'), mOut = sumOf(mList, 'expense'), mBal = mIn - mOut;

    var tList = all.filter(function (r) { return r.date === td; });
    var tIn = sumOf(tList, 'income'), tOut = sumOf(tList, 'expense');

    var ws = ymd(weekStart());
    var wList = all.filter(function (r) { return r.date >= ws && r.date <= td; });
    var wBal = sumOf(wList, 'income') - sumOf(wList, 'expense');

    // 结余为负 → 加 .neg 类，红色高亮提醒
    function card(cls, icon, value, label, sub, neg) {
      return '<div class="fin-sum-card ' + cls + (neg ? ' neg' : '') + '">'
        + '<span class="fin-sum-icon">' + icon + '</span>'
        + '<div class="fin-sum-value">' + value + '</div>'
        + '<div class="fin-sum-label">' + FN.esc(label) + '</div>'
        + (sub ? '<div class="fin-sum-sub">' + sub + '</div>' : '')
        + '</div>';
    }
    return '<div class="fin-summary">'
      + card('income',  '💰', '¥' + fmt(mIn),  '本月收入', mList.length + ' 笔账目', false)
      + card('expense', '🧾', '¥' + fmt(mOut), '本月支出', ym + ' 累计', false)
      + card('balance', mBal < 0 ? '⚠️' : '🐷', (mBal < 0 ? '-¥' : '¥') + fmt(Math.abs(mBal)), '本月结余',
             mBal < 0 ? '入不敷出啦' : '继续保持～', mBal < 0)
      + card('today',   '📅', '+¥' + fmt(tIn) + ' / -¥' + fmt(tOut), '今日收支', td, false)
      + card('week',    '📆', (wBal < 0 ? '-¥' : '¥') + fmt(Math.abs(wBal)), '本周结余',
             ws.slice(5) + ' 起', wBal < 0)
      + '</div>';
  }

  /* ---- 8.2 柱状趋势图（本周 / 本月 / 近三月，收入 + 支出双柱） ---- */
  function buildBarSeries(range) {
    var all = getRecords(), out = [];
    if (range === 'week') {
      var ws = weekStart();
      for (var i = 0; i < 7; i++) {
        var d = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + i);
        var ds = ymd(d);
        var day = all.filter(function (r) { return r.date === ds; });
        out.push({ label: WEEK_CN[d.getDay()], full: ds, income: sumOf(day, 'income'), expense: sumOf(day, 'expense') });
      }
    } else if (range === 'month') {
      var ym = ymNow(), n = daysInMonth(ym);
      for (var k = 1; k <= n; k++) {
        var ks = ym + '-' + String(k).padStart(2, '0');
        var dl = all.filter(function (r) { return r.date === ks; });
        out.push({ label: String(k), full: ks, income: sumOf(dl, 'income'), expense: sumOf(dl, 'expense') });
      }
    } else { // '3m' 近三月（含本月）
      for (var j = 2; j >= 0; j--) {
        var m = shiftYm(ymNow(), -j);
        var ml = inMonth(all, m);
        out.push({ label: parseInt(m.slice(5), 10) + '月', full: m, income: sumOf(ml, 'income'), expense: sumOf(ml, 'expense') });
      }
    }
    return out;
  }
  function barCard() {
    var series = buildBarSeries(ui.bar);
    var max = Math.max(1, Math.max.apply(null, series.map(function (s) { return Math.max(s.income, s.expense); })));
    var totalIn = series.reduce(function (a, s) { return a + s.income; }, 0);
    var totalOut = series.reduce(function (a, s) { return a + s.expense; }, 0);
    var switcher = BAR_RANGES.map(function (r) {
      return '<button class="fin-seg' + (ui.bar === r.id ? ' sel' : '') + '" data-act="bar" data-range="' + r.id + '">' + r.label + '</button>';
    }).join('');
    var bars = series.map(function (s) {
      var hi = (s.income / max) * 100, he = (s.expense / max) * 100;
      var tip = s.full + '\n收入 ¥' + fmt(s.income) + '\n支出 ¥' + fmt(s.expense) + '\n结余 ' + (s.income - s.expense >= 0 ? '+' : '-') + '¥' + fmt(Math.abs(s.income - s.expense));
      return '<div class="fin-bar-col" data-tip="' + FN.esc(tip) + '">'
        + '<div class="fin-bar-stack">'
        + '<div class="fin-bar in" style="height:' + hi.toFixed(1) + '%"></div>'
        + '<div class="fin-bar out" style="height:' + he.toFixed(1) + '%"></div>'
        + '</div><div class="fin-bar-label">' + FN.esc(s.label) + '</div></div>';
    }).join('');
    return '<div class="card fin-card">'
      + '<div class="fin-card-head"><div class="card-title fin-title">📊 收支趋势</div>'
      + '<div class="fin-segs">' + switcher + '</div></div>'
      + '<div class="fin-legend-row">'
      + '<span class="fin-dot in"></span>收入 ¥' + fmt(totalIn)
      + '<span class="fin-dot out" style="margin-left:14px"></span>支出 ¥' + fmt(totalOut)
      + '<span class="fin-hint">（鼠标悬浮柱子查看当日/当月明细）</span></div>'
      + '<div class="fin-bars' + (series.length > 12 ? ' scroll' : '') + '">' + bars + '</div>'
      + '</div>';
  }

  /* ---- 8.3 环形饼图（全部收支 / 仅支出 / 仅收入，hover 显示金额+占比） ---- */
  function buildPieData(mode) {
    var list = inMonth(getRecords(), ymNow());
    var bucket = {};
    list.forEach(function (r) {
      if (mode === 'expense' && r.type !== 'expense') return;
      if (mode === 'income' && r.type !== 'income') return;
      var key = (mode === 'all' ? (r.type === 'income' ? '收·' : '支·') : '') + r.category;
      if (!bucket[key]) bucket[key] = { name: key, raw: r.category, type: r.type, value: 0 };
      bucket[key].value += r.amount;
    });
    var arr = Object.keys(bucket).map(function (k) { return bucket[k]; });
    var total = arr.reduce(function (a, b) { return a + b.value; }, 0) || 1;
    arr.forEach(function (a) {
      a.percent = a.value / total * 100;
      a.color = catMeta(a.raw, a.type).color;
    });
    return { list: arr.sort(function (a, b) { return b.value - a.value; }), total: total, count: arr.length };
  }
  function pieCard() {
    var data = buildPieData(ui.pie);
    var switcher = PIE_MODES.map(function (m) {
      return '<button class="fin-seg' + (ui.pie === m.id ? ' sel' : '') + '" data-act="pie" data-mode="' + m.id + '">' + m.label + '</button>';
    }).join('');

    var svg, legend;
    if (!data.count) {
      svg = '<div class="fin-pie-empty">🐣<div>本月暂无数据</div></div>';
      legend = '<div class="fin-empty-sm">还没有账目～</div>';
    } else {
      var cx = 80, cy = 80, R = 68, r0 = 40, cum = 0;
      var paths = data.list.map(function (s) {
        var a0 = cum / 100 * Math.PI * 2 - Math.PI / 2;
        cum += s.percent;
        var a1 = cum / 100 * Math.PI * 2 - Math.PI / 2;
        // 单一分类占满 100% 时用整圆，避免起止点重合画不出扇形
        if (s.percent >= 99.999) {
          return '<circle cx="' + cx + '" cy="' + cy + '" r="' + ((R + r0) / 2) + '" fill="none" stroke="' + s.color
            + '" stroke-width="' + (R - r0) + '" class="fin-slice" data-tip="' + FN.esc(s.name + '\n¥' + fmt(s.value) + '\n占比 100%') + '"/>';
        }
        var large = s.percent > 50 ? 1 : 0;
        var p = 'M ' + (cx + R * Math.cos(a0)) + ' ' + (cy + R * Math.sin(a0))
          + ' A ' + R + ' ' + R + ' 0 ' + large + ' 1 ' + (cx + R * Math.cos(a1)) + ' ' + (cy + R * Math.sin(a1))
          + ' L ' + (cx + r0 * Math.cos(a1)) + ' ' + (cy + r0 * Math.sin(a1))
          + ' A ' + r0 + ' ' + r0 + ' 0 ' + large + ' 0 ' + (cx + r0 * Math.cos(a0)) + ' ' + (cy + r0 * Math.sin(a0)) + ' Z';
        var tip = s.name + '\n¥' + fmt(s.value) + '\n占比 ' + s.percent.toFixed(1) + '%';
        return '<path d="' + p + '" fill="' + s.color + '" stroke="var(--text-main)" stroke-width="1.5" class="fin-slice" data-tip="' + FN.esc(tip) + '"/>';
      }).join('');
      svg = '<div class="fin-pie-wrap"><svg viewBox="0 0 160 160" class="fin-pie-svg">' + paths + '</svg>'
        + '<div class="fin-pie-center"><div class="fin-pie-total">¥' + fmt(data.total) + '</div><div class="fin-pie-cap">合计</div></div></div>';
      legend = data.list.map(function (s) {
        return '<div class="fin-legend-item" data-tip="' + FN.esc(s.name + '\n¥' + fmt(s.value) + '\n占比 ' + s.percent.toFixed(1) + '%') + '">'
          + '<span class="fin-legend-dot" style="background:' + s.color + '"></span>'
          + '<span class="fin-legend-name">' + FN.esc(s.name) + '</span>'
          + '<span class="fin-legend-val">¥' + fmt(s.value) + '</span>'
          + '<span class="fin-legend-pct">' + s.percent.toFixed(1) + '%</span></div>';
      }).join('');
    }
    return '<div class="card fin-card">'
      + '<div class="fin-card-head"><div class="card-title fin-title">🍰 收支构成（本月）</div>'
      + '<div class="fin-segs">' + switcher + '</div></div>'
      + '<div class="fin-pie-row">' + svg + '<div class="fin-pie-legend">' + legend + '</div></div>'
      + '</div>';
  }

  /* ---- 8.4 筛选栏 + 账目明细（按天分组折叠 + 编辑 / 删除） ---- */
  function rangeBounds(range) {
    var td = today();
    if (range === 'today') return [td, td];
    if (range === 'week') return [ymd(weekStart()), td];
    if (range === 'month') return [ymNow() + '-01', ymNow() + '-31'];
    if (range === 'last') { var lm = shiftYm(ymNow(), -1); return [lm + '-01', lm + '-31']; }
    if (range === '3m') return [shiftYm(ymNow(), -2) + '-01', ymNow() + '-31'];
    if (range === 'custom') return [ui.filter.from || '0000-01-01', ui.filter.to || '9999-12-31'];
    return ['0000-01-01', '9999-12-31'];
  }
  function filteredRecords() {
    var f = ui.filter, b = rangeBounds(f.range), kw = (f.kw || '').trim().toLowerCase();
    return getRecords().filter(function (r) {
      if (r.date < b[0] || r.date > b[1]) return false;
      if (f.type !== 'all' && r.type !== f.type) return false;
      if (f.cat !== 'all' && r.category !== f.cat) return false;
      if (kw) {
        var hay = (r.name + ' ' + r.category + ' ' + r.note + ' ' + (r.tags || []).join(' ')).toLowerCase();
        if (hay.indexOf(kw) < 0) return false;
      }
      return true;
    }).sort(function (a, b2) { return a.date === b2.date ? (b2.id > a.id ? 1 : -1) : (a.date < b2.date ? 1 : -1); });
  }
  function allCatNames() {
    var s = {}, out = [];
    catsOf('income').concat(catsOf('expense')).forEach(function (c) { if (!s[c.name]) { s[c.name] = 1; out.push(c.name); } });
    return out;
  }
  function listCard() {
    var f = ui.filter;
    var list = filteredRecords();
    var fIn = sumOf(list, 'income'), fOut = sumOf(list, 'expense');

    var rangeSel = '<select class="fin-input sm" id="finFRange">' + DATE_RANGES.map(function (r) {
      return '<option value="' + r.id + '"' + (f.range === r.id ? ' selected' : '') + '>' + r.label + '</option>';
    }).join('') + '</select>';
    var typeSel = '<select class="fin-input sm" id="finFType">'
      + ['all:全部收支', 'income:仅收入', 'expense:仅支出'].map(function (o) {
        var kv = o.split(':');
        return '<option value="' + kv[0] + '"' + (f.type === kv[0] ? ' selected' : '') + '>' + kv[1] + '</option>';
      }).join('') + '</select>';
    var catSel = '<select class="fin-input sm" id="finFCat"><option value="all"' + (f.cat === 'all' ? ' selected' : '') + '>全部分类</option>'
      + allCatNames().map(function (n) {
        return '<option value="' + FN.esc(n) + '"' + (f.cat === n ? ' selected' : '') + '>' + FN.esc(n) + '</option>';
      }).join('') + '</select>';
    var customRange = f.range === 'custom'
      ? '<input type="date" class="fin-input sm" id="finFFrom" value="' + FN.esc(f.from) + '">'
        + '<span class="fin-hint">至</span>'
        + '<input type="date" class="fin-input sm" id="finFTo" value="' + FN.esc(f.to) + '">'
      : '';

    // 按日期分组
    var groups = [], gmap = {};
    list.forEach(function (r) {
      if (!gmap[r.date]) { gmap[r.date] = { date: r.date, items: [] }; groups.push(gmap[r.date]); }
      gmap[r.date].items.push(r);
    });

    var body = groups.length === 0
      ? '<div class="empty-state">没有符合条件的账目～换个筛选试试 🐰</div>'
      : groups.map(function (g) {
        var collapsed = ui.collapsed.indexOf(g.date) >= 0;
        var gi = sumOf(g.items, 'income'), go = sumOf(g.items, 'expense');
        var d = parseDate(g.date);
        var head = '<div class="fin-day-head" data-act="toggle-day" data-date="' + g.date + '">'
          + '<span class="fin-caret">' + (collapsed ? '▶' : '▼') + '</span>'
          + '<span class="fin-day-date">' + g.date + '</span>'
          + '<span class="fin-day-dow">周' + WEEK_CN[d.getDay()] + '</span>'
          + '<span class="fin-day-cnt">' + g.items.length + ' 笔</span>'
          + '<span class="fin-day-sum">' + (gi ? '<b class="in">+¥' + fmt(gi) + '</b>' : '')
          + (go ? '<b class="out">-¥' + fmt(go) + '</b>' : '') + '</span></div>';
        var rows = collapsed ? '' : '<div class="fin-day-body">' + g.items.map(recordRow).join('') + '</div>';
        return '<div class="fin-day-group">' + head + rows + '</div>';
      }).join('');

    return '<div class="card fin-card">'
      + '<div class="fin-card-head"><div class="card-title fin-title">🧾 账目明细</div></div>'
      + '<div class="fin-filter-bar">' + rangeSel + customRange + typeSel + catSel
      + '<input class="fin-input search" id="finFKw" placeholder="🔍 搜索名称/备注/标签" value="' + FN.esc(f.kw) + '">'
      + '<button class="btn sm" id="finFReset">重置</button></div>'
      + '<div class="fin-filter-sum">筛选结果：<b>' + list.length + '</b> 笔 · 收入 <b class="in">¥' + fmt(fIn)
      + '</b> · 支出 <b class="out">¥' + fmt(fOut) + '</b> · 结余 <b class="' + (fIn - fOut < 0 ? 'out' : 'in') + '">'
      + (fIn - fOut < 0 ? '-' : '') + '¥' + fmt(Math.abs(fIn - fOut)) + '</b></div>'
      + body + '</div>';
  }
  function recordRow(r) {
    var meta = catMeta(r.category, r.type);
    var tags = (r.tags || []).map(function (t) { return '<span class="fin-tag">#' + FN.esc(t) + '</span>'; }).join('');
    return '<div class="fin-row">'
      + '<div class="fin-row-icon" style="background:' + meta.color + '">' + meta.icon + '</div>'
      + '<div class="fin-row-main">'
      + '<div class="fin-row-name">' + FN.esc(r.name) + tags + '</div>'
      + '<div class="fin-row-meta">' + FN.esc(r.category) + (r.note ? ' · ' + FN.esc(r.note) : '') + '</div>'
      + '</div>'
      + '<div class="fin-row-amt ' + r.type + '">' + (r.type === 'income' ? '+' : '-') + '¥' + fmt(r.amount) + '</div>'
      + '<button class="fin-mini" data-act="edit" data-id="' + FN.esc(r.id) + '" title="编辑">✎</button>'
      + '<button class="fin-mini danger" data-act="del" data-id="' + FN.esc(r.id) + '" title="删除">🗑</button>'
      + '</div>';
  }

  /* ---- 8.5 预算面板 ---- */
  function budgetCard() {
    var b = loadBudgets();
    var spent = spentByCat(b.period);
    var names = Object.keys(b.items).filter(function (n) { return Number(b.items[n]) > 0; });
    var totalBudget = names.reduce(function (a, n) { return a + Number(b.items[n]); }, 0);
    var totalSpent = names.reduce(function (a, n) { return a + (spent[n] || 0); }, 0);

    var rows = names.length === 0
      ? '<div class="empty-state">还没有设置预算，点右上角「设置预算」给分类定个小目标吧 🎯</div>'
      : names.sort(function (x, y) {
        return (spent[y] || 0) / b.items[y] - (spent[x] || 0) / b.items[x];
      }).map(function (n) {
        var quota = Number(b.items[n]) || 0;
        var used = spent[n] || 0;
        var pct = quota > 0 ? used / quota * 100 : 0;
        // 预警配色：<80% 安全 / 80~99% 临近 / >=100% 超支
        var lv = pct >= 100 ? 'over' : (pct >= 80 ? 'warn' : 'ok');
        var meta = catMeta(n, 'expense');
        var badge = lv === 'over' ? '🚨 已超支 ¥' + fmt(used - quota) : (lv === 'warn' ? '⚠️ 临近预算' : '✅ 安全');
        return '<div class="fin-bg-item ' + lv + '">'
          + '<div class="fin-bg-top"><span class="fin-bg-icon" style="background:' + meta.color + '">' + meta.icon + '</span>'
          + '<span class="fin-bg-name">' + FN.esc(n) + '</span>'
          + '<span class="fin-bg-badge">' + badge + '</span>'
          + '<span class="fin-bg-num">¥' + fmt(used) + ' / ¥' + fmt(quota) + '</span></div>'
          + '<div class="fin-bg-track"><div class="fin-bg-fill" style="width:' + Math.min(100, pct).toFixed(1) + '%"></div></div>'
          + '<div class="fin-bg-pct">' + pct.toFixed(0) + '%　剩余 ¥' + fmt(Math.max(0, quota - used)) + '</div>'
          + '</div>';
      }).join('');

    var overall = totalBudget > 0
      ? '<div class="fin-bg-overall">本月总预算 <b>¥' + fmt(totalBudget) + '</b> · 已用 <b>¥' + fmt(totalSpent)
        + '</b> · 剩余 <b class="' + (totalBudget - totalSpent < 0 ? 'out' : 'in') + '">¥' + fmt(Math.abs(totalBudget - totalSpent)) + '</b></div>'
      : '';

    return '<div class="card fin-card">'
      + '<div class="fin-card-head"><div class="card-title fin-title">🎯 预算面板</div>'
      + '<div class="fin-head-btns"><button class="btn primary" id="finBudgetBtn">设置预算</button></div></div>'
      + '<div class="fin-hint-line">预算周期 <b>' + b.period + '</b>，每月 1 日自动重置进度（额度延续上月设置）'
      + (b.lastReset ? '　·　上次重置：' + b.lastReset : '') + '</div>'
      + overall + '<div class="fin-bg-list">' + rows + '</div></div>';
  }

  /* ---- 8.6 固定收支模板 ---- */
  function tplCard() {
    var tpls = loadTpls();
    var rows = tpls.length === 0
      ? '<div class="empty-state">还没有模板，点「＋ 新增模板」把高频账单存起来吧 ⚡</div>'
      : tpls.map(function (t) {
        var meta = catMeta(t.category, t.type);
        return '<div class="fin-tpl">'
          + '<span class="fin-tpl-icon" style="background:' + meta.color + '">' + meta.icon + '</span>'
          + '<div class="fin-tpl-main"><div class="fin-tpl-name">' + FN.esc(t.name)
          + '<span class="fin-tpl-type ' + t.type + '">' + (t.type === 'income' ? '收' : '支') + '</span></div>'
          + '<div class="fin-tpl-meta">' + FN.esc(t.category) + (t.note ? ' · ' + FN.esc(t.note) : '') + '</div></div>'
          + '<div class="fin-tpl-amt ' + t.type + '">' + (Number(t.amount) > 0 ? (t.type === 'income' ? '+' : '-') + '¥' + fmt(t.amount) : '未设金额') + '</div>'
          + '<button class="btn sm primary" data-act="tpl-use" data-id="' + FN.esc(t.id) + '">一键记账</button>'
          + '<button class="fin-mini" data-act="tpl-edit" data-id="' + FN.esc(t.id) + '" title="编辑">✎</button>'
          + '<button class="fin-mini danger" data-act="tpl-del" data-id="' + FN.esc(t.id) + '" title="删除">🗑</button>'
          + '</div>';
      }).join('');
    return '<div class="card fin-card">'
      + '<div class="fin-card-head"><div class="card-title fin-title">⚡ 固定收支模板</div>'
      + '<div class="fin-head-btns"><button class="btn" id="finTplAddBtn">＋ 新增模板</button></div></div>'
      + '<div class="fin-hint-line">月薪 / 房租 / 通勤等高频账单，点「一键记账」立即按今天日期入账（金额为 0 时会先弹出表单让你填）</div>'
      + '<div class="fin-tpl-list">' + rows + '</div></div>';
  }

  /* ---- 8.7 月度自动复盘 ---- */
  function monthOptions() {
    var out = [];
    for (var i = 0; i < 6; i++) out.push(shiftYm(ymNow(), -i));
    return out;
  }
  function buildReview(ym) {
    var all = getRecords();
    var list = inMonth(all, ym);
    if (!list.length) return ['📭 ' + ym + ' 还没有任何账目记录，先去记一笔吧～'];

    var inc = sumOf(list, 'income'), exp = sumOf(list, 'expense'), bal = inc - exp;
    var lines = [];
    lines.push('📅 ' + ym + ' 共记录 ' + list.length + ' 笔账目：收入 ¥' + fmt(inc) + '，支出 ¥' + fmt(exp)
      + '，结余 ' + (bal >= 0 ? '+' : '-') + '¥' + fmt(Math.abs(bal)) + '。');

    if (bal < 0) lines.push('⚠️ 本月支出超过收入 ¥' + fmt(-bal) + '，属于「倒贴月」，下个月要收紧一点啦。');
    else if (inc > 0) {
      var rate = Math.round(bal / inc * 100);
      lines.push('💰 存钱率 ' + rate + '%，' + (rate >= 40 ? '非常能存，给你鼓掌 👏' : rate >= 20 ? '节奏健康，继续保持～' : '存得偏少，可以给大头分类设个预算。'));
    }

    // 支出结构
    var byCat = {};
    list.forEach(function (r) { if (r.type === 'expense') byCat[r.category] = (byCat[r.category] || 0) + r.amount; });
    var cats = Object.keys(byCat).map(function (n) { return { name: n, v: byCat[n] }; }).sort(function (a, b) { return b.v - a.v; });
    if (cats.length) {
      var top = cats.slice(0, 3).map(function (c) {
        return c.name + ' ¥' + fmt(c.v) + '（' + Math.round(c.v / exp * 100) + '%）';
      }).join('、');
      lines.push('🏆 支出大头 TOP3：' + top + '。');
      var p0 = Math.round(cats[0].v / exp * 100);
      lines.push('🍰 最大单项「' + cats[0].name + '」占总支出 ' + p0 + '%，'
        + (p0 >= 50 ? '集中度偏高，可以看看是否有压缩空间。' : p0 >= 30 ? '占比合理，属于主要开销。' : '消费结构比较分散均衡。'));
    }

    // 日均
    var days = ym === ymNow() ? new Date().getDate() : daysInMonth(ym);
    lines.push('📊 日均支出 ¥' + fmt(exp / days) + '（按 ' + days + ' 天计），单笔平均 ¥'
      + fmt(exp / Math.max(1, list.filter(function (r) { return r.type === 'expense'; }).length)) + '。');

    // 环比
    var prev = shiftYm(ym, -1), pl = inMonth(all, prev), pexp = sumOf(pl, 'expense');
    if (pexp > 0) {
      var diff = exp - pexp;
      lines.push('↔️ 与上月（' + prev + '）相比，支出' + (diff >= 0 ? '增加' : '减少') + ' ¥' + fmt(Math.abs(diff))
        + '（' + Math.round(Math.abs(diff) / pexp * 100) + '%）。');
    }

    // 最大单笔
    var bigs = list.filter(function (r) { return r.type === 'expense'; }).sort(function (a, b) { return b.amount - a.amount; });
    if (bigs.length) lines.push('💸 最大单笔支出：「' + bigs[0].name + '」¥' + fmt(bigs[0].amount) + '（' + bigs[0].date + ' · ' + bigs[0].category + '）。');

    // 预算达成（仅当前预算周期有意义）
    var b = loadBudgets();
    var quota = b.period === ym ? b.items : ((b.history[ym] && b.history[ym].items) || null);
    if (quota) {
      var over = [], safe = 0, cnt = 0;
      Object.keys(quota).forEach(function (n) {
        var q = Number(quota[n]) || 0; if (q <= 0) return;
        cnt++;
        var used = byCat[n] || 0;
        if (used > q) over.push(n + '（超 ¥' + fmt(used - q) + '）'); else safe++;
      });
      if (cnt) {
        lines.push(over.length
          ? '🚨 预算达成：' + safe + '/' + cnt + ' 个分类守住了，超支分类：' + over.join('、') + '。'
          : '🎯 预算达成：' + cnt + ' 个分类全部守住，完美达标！');
      }
    }

    // 健身花销专项（与健身模块打通）
    var fitSpend = fitnessSpendOfMonth(ym);
    if (fitSpend.total > 0) lines.push('💪 健身相关花销 ¥' + fmt(fitSpend.total) + '（' + fitSpend.count + ' 笔），已同步到健身模块的花销统计。');

    lines.push('🐰 小结：' + (bal >= 0
      ? '这个月整体是「攒下钱」的节奏，保持记账习惯就很棒啦～'
      : '这个月花超了，下月建议先把 TOP1 分类的预算调低 10%~20% 试试。'));
    return lines;
  }
  function reviewCard() {
    var ym = ui.reviewYm || ymNow();
    var opts = monthOptions().map(function (m) {
      return '<option value="' + m + '"' + (m === ym ? ' selected' : '') + '>' + m + '</option>';
    }).join('');
    var lines = buildReview(ym);
    return '<div class="card fin-card">'
      + '<div class="fin-card-head"><div class="card-title fin-title">📝 月度自动复盘</div>'
      + '<div class="fin-head-btns"><select class="fin-input sm" id="finReviewYm">' + opts + '</select>'
      + '<button class="btn" id="finReviewRefresh">🔄 重新生成</button></div></div>'
      + '<div class="fin-review" id="finReviewBox">'
      + lines.map(function (l) { return '<p class="fin-review-line">' + FN.esc(l) + '</p>'; }).join('')
      + '</div></div>';
  }

  /* ==================================================================
   * 9. 事件绑定
   * ================================================================== */
  function bindEvents(root) {
    root.addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('[data-act]') : null;
      if (!el || !root.contains(el)) return;
      var act = el.getAttribute('data-act');
      var id = el.getAttribute('data-id');
      switch (act) {
        case 'bar': ui.bar = el.getAttribute('data-range'); saveUI(); renderFinanceModule(); break;
        case 'pie': ui.pie = el.getAttribute('data-mode'); saveUI(); renderFinanceModule(); break;
        case 'toggle-day': {
          var d = el.getAttribute('data-date');
          var i = ui.collapsed.indexOf(d);
          if (i >= 0) ui.collapsed.splice(i, 1); else ui.collapsed.push(d);
          saveUI(); renderFinanceModule(); break;
        }
        case 'edit': openBillForm(null, id); break;
        case 'del': doDelete(id); break;
        case 'tpl-use': useTpl(id); break;
        case 'tpl-edit': openTplForm(id); break;
        case 'tpl-del': delTpl(id); break;
      }
    });

    var byId = function (i) { return root.querySelector('#' + i); };
    var bind = function (i, ev, fn) { var el = byId(i); if (el) el.addEventListener(ev, fn); };

    bind('addIncomeBtn', 'click', function () { openBillForm('income'); });
    bind('addExpenseBtn', 'click', function () { openBillForm('expense'); });
    bind('finCatMgrBtn', 'click', openCatManager);
    bind('finBudgetBtn', 'click', openBudgetEditor);
    bind('finTplAddBtn', 'click', function () { openTplForm(null); });

    bind('finFRange', 'change', function (e) { ui.filter.range = e.target.value; saveUI(); renderFinanceModule(); });
    bind('finFType', 'change', function (e) { ui.filter.type = e.target.value; saveUI(); renderFinanceModule(); });
    bind('finFCat', 'change', function (e) { ui.filter.cat = e.target.value; saveUI(); renderFinanceModule(); });
    bind('finFFrom', 'change', function (e) { ui.filter.from = e.target.value; saveUI(); renderFinanceModule(); });
    bind('finFTo', 'change', function (e) { ui.filter.to = e.target.value; saveUI(); renderFinanceModule(); });
    bind('finFReset', 'click', function () {
      ui.filter = { range: 'month', type: 'all', cat: 'all', kw: '', from: '', to: '' };
      saveUI(); renderFinanceModule();
    });
    // 搜索框实时过滤（保留光标位置：只重渲列表区不现实，这里做防抖后整体重渲并回焦）
    var kwEl = byId('finFKw');
    if (kwEl) {
      var timer = null;
      kwEl.addEventListener('input', function (e) {
        ui.filter.kw = e.target.value;
        clearTimeout(timer);
        timer = setTimeout(function () {
          saveUI(); renderFinanceModule();
          var again = document.querySelector('#finFKw');
          if (again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
        }, 320);
      });
    }

    bind('finReviewYm', 'change', function (e) { ui.reviewYm = e.target.value; saveUI(); renderFinanceModule(); });
    bind('finReviewRefresh', 'click', function () { renderFinanceModule(); toast('✓ 已重新生成复盘'); });
  }

  /* ==================================================================
   * 10. 记账 / 编辑弹窗（备注 + 自定义标签 + 运行时新增分类）
   * ================================================================== */
  function catOptionsHTML(type, selected) {
    return catsOf(type).map(function (c) {
      return '<option value="' + FN.esc(c.name) + '"' + (c.name === selected ? ' selected' : '') + '>' + c.icon + ' ' + FN.esc(c.name) + '</option>';
    }).join('');
  }
  function openBillForm(type, editId, preset) {
    var rec = editId ? findRecord(editId) : null;
    var t = rec ? rec.type : (type || 'expense');
    preset = preset || {};
    var cur = {
      category: rec ? rec.category : (preset.category || catsOf(t)[0].name),
      name: rec ? rec.name : (preset.name || ''),
      amount: rec ? rec.amount : (preset.amount || ''),
      date: rec ? rec.date : (preset.date || today()),
      note: rec ? rec.note : (preset.note || ''),
      tags: rec ? (rec.tags || []).join(',') : ((preset.tags || []).join(','))
    };

    var body = '<div class="fin-type-toggle">'
      + '<button type="button" class="fin-tt' + (t === 'expense' ? ' sel' : '') + '" data-t="expense">🧾 支出</button>'
      + '<button type="button" class="fin-tt' + (t === 'income' ? ' sel' : '') + '" data-t="income">💰 收入</button>'
      + '</div>'
      + '<div class="modal-field"><label class="modal-label">分类</label>'
      + '<div class="fin-inline"><select class="modal-select" id="finFormCat">' + catOptionsHTML(t, cur.category) + '</select>'
      + '<button type="button" class="btn sm" id="finAddCatToggle">＋ 自定义</button></div>'
      + '<div class="fin-inline" id="finNewCatRow" style="display:none;margin-top:6px;">'
      + '<input class="modal-input" id="finNewCatName" placeholder="新分类名称，如：咖啡">'
      + '<input class="modal-input" id="finNewCatIcon" placeholder="图标(可选) ☕" style="max-width:120px">'
      + '<button type="button" class="btn sm primary" id="finNewCatSave">添加</button></div></div>'
      + '<div class="pf-form-2col">'
      + '<div class="modal-field"><label class="modal-label">名称</label><input class="modal-input" id="finFormName" placeholder="例如：午餐 / 月薪" value="' + FN.esc(cur.name) + '"></div>'
      + '<div class="modal-field"><label class="modal-label">金额（元）</label><input class="modal-input" id="finFormAmt" type="number" step="0.01" min="0" placeholder="0.00" value="' + FN.esc(cur.amount) + '"></div>'
      + '</div>'
      + '<div class="modal-field"><label class="modal-label">日期</label><input class="modal-input" id="finFormDate" type="date" value="' + FN.esc(cur.date) + '"></div>'
      + '<div class="modal-field"><label class="modal-label">备注</label><input class="modal-input" id="finFormNote" placeholder="选填，例如：和同事聚餐" value="' + FN.esc(cur.note) + '"></div>'
      + '<div class="modal-field"><label class="modal-label">自定义标签（英文逗号分隔）</label><input class="modal-input" id="finFormTags" placeholder="例如：固定,报销" value="' + FN.esc(cur.tags) + '"></div>';

    var state = { type: t };
    var mask = showModal(rec ? '编辑账单' : '记一笔', body, [
      { text: '取消', onClick: closeModal },
      {
        text: rec ? '保存修改' : '记好啦', primary: true, onClick: function () {
          var category = mask.querySelector('#finFormCat').value;
          var name = mask.querySelector('#finFormName').value.trim();
          var amount = parseFloat(mask.querySelector('#finFormAmt').value);
          var date = mask.querySelector('#finFormDate').value || today();
          var note = mask.querySelector('#finFormNote').value.trim();
          var tags = mask.querySelector('#finFormTags').value.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean);
          if (!name) { toast('请输入名称'); return; }
          if (!(amount > 0)) { toast('请输入大于 0 的金额'); return; }
          if (rec) {
            updateRecord(rec.id, { type: state.type, category: category, name: name, amount: amount, date: date, note: note, tags: tags });
            toast('✓ 已保存修改');
} else {
addRecordRaw({ type: state.type, category: category, name: name, amount: amount, date: date, note: note, tags: tags, createdAt: Date.now() });
window.awardEnergy('finance', { amount: amount, type: state.type, category: category, note: note, name: name });
toast('✓ 已记一笔');
}
          closeModal();
          renderFinanceModule();
          refreshFitnessCard();
        }
      }
    ]);

    // 收/支切换 → 重建分类下拉
    Array.prototype.forEach.call(mask.querySelectorAll('.fin-tt'), function (btn) {
      btn.addEventListener('click', function () {
        state.type = btn.getAttribute('data-t');
        Array.prototype.forEach.call(mask.querySelectorAll('.fin-tt'), function (b) { b.classList.remove('sel'); });
        btn.classList.add('sel');
        mask.querySelector('#finFormCat').innerHTML = catOptionsHTML(state.type, null);
      });
    });
    // 运行时新增自定义分类（不关闭当前弹窗）
    mask.querySelector('#finAddCatToggle').addEventListener('click', function () {
      var row = mask.querySelector('#finNewCatRow');
      row.style.display = row.style.display === 'none' ? 'flex' : 'none';
    });
    mask.querySelector('#finNewCatSave').addEventListener('click', function () {
      var n = mask.querySelector('#finNewCatName').value.trim();
      var ic = mask.querySelector('#finNewCatIcon').value.trim() || '🏷️';
      if (!n) { toast('请输入分类名称'); return; }
      var c = customCats();
      if (c[state.type].some(function (x) { return x.name === n; }) || DEFAULT_CATS[state.type].some(function (x) { return x.name === n; })) {
        toast('该分类已存在'); return;
      }
      c[state.type].push({ name: n, icon: ic, color: hashColor(n) });
      saveCustomCats(c);
      mask.querySelector('#finFormCat').innerHTML = catOptionsHTML(state.type, n);
      mask.querySelector('#finNewCatName').value = '';
      mask.querySelector('#finNewCatRow').style.display = 'none';
      toast('✓ 已新增分类「' + n + '」');
    });
  }

  /* ---- 分类管理（删除自定义分类） ---- */
  function openCatManager() {
    var c = customCats();
    function rowsOf(type) {
      var arr = c[type];
      if (!arr.length) return '<div class="fin-empty-sm">暂无自定义' + (type === 'income' ? '收入' : '支出') + '分类</div>';
      return arr.map(function (x) {
        return '<div class="fin-cat-row"><span class="fin-tpl-icon" style="background:' + (x.color || hashColor(x.name)) + '">' + FN.esc(x.icon || '🏷️') + '</span>'
          + '<span class="fin-cat-name">' + FN.esc(x.name) + '</span>'
          + '<button class="fin-mini danger" data-delcat="' + FN.esc(type) + '|' + FN.esc(x.name) + '">🗑</button></div>';
      }).join('');
    }
    var body = '<div class="fin-hint-line">内置分类不可删除；这里管理你自己新增的分类（删除不会影响已记录的账单）。</div>'
      + '<div class="modal-label" style="margin-top:8px">自定义收入分类</div>' + rowsOf('income')
      + '<div class="modal-label" style="margin-top:10px">自定义支出分类</div>' + rowsOf('expense')
      + '<div class="fin-hint-line" style="margin-top:10px">内置分类：'
      + DEFAULT_CATS.income.concat(DEFAULT_CATS.expense).map(function (x) { return x.icon + x.name; }).join('、') + '</div>';
    var mask = showModal('🏷 分类管理', body, [{ text: '关闭', primary: true, onClick: function () { closeModal(); renderFinanceModule(); } }]);
    Array.prototype.forEach.call(mask.querySelectorAll('[data-delcat]'), function (btn) {
      btn.addEventListener('click', function () {
        var kv = btn.getAttribute('data-delcat').split('|');
        var cc = customCats();
        cc[kv[0]] = cc[kv[0]].filter(function (x) { return x.name !== kv[1]; });
        saveCustomCats(cc);
        closeModal(); openCatManager();
        toast('已删除分类「' + kv[1] + '」');
      });
    });
  }

  /* ==================================================================
   * 11. 删除 + 30 秒撤销
   * ================================================================== */
  var undoState = null; // { rec, timer, tick, left }
  function doDelete(id) {
    var rec = removeRecord(id);
    if (!rec) return;
    renderFinanceModule();
    refreshFitnessCard();
    showUndoBar(rec);
  }
  function clearUndo() {
    if (undoState) {
      clearTimeout(undoState.timer);
      clearInterval(undoState.tick);
      undoState = null;
    }
    var bar = document.getElementById('finUndoBar');
    if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
  }
  function showUndoBar(rec) {
    clearUndo();
    var bar = document.createElement('div');
    bar.id = 'finUndoBar';
    bar.className = 'fin-undo';
    bar.innerHTML = '<span class="fin-undo-txt">🗑 已删除「' + FN.esc(rec.name) + '」</span>'
      + '<button class="fin-undo-btn" id="finUndoBtn">撤销</button>'
      + '<span class="fin-undo-sec" id="finUndoSec">30s</span>';
    document.body.appendChild(bar);
    var left = 30;
    undoState = {
      rec: rec,
      timer: setTimeout(clearUndo, 30000),
      tick: setInterval(function () {
        left--;
        var s = document.getElementById('finUndoSec');
        if (s) s.textContent = Math.max(0, left) + 's';
        if (left <= 0) clearUndo();
      }, 1000)
    };
    document.getElementById('finUndoBtn').addEventListener('click', function () {
      addRecordRaw(rec);           // 原样恢复（保留 id / 日期 / 备注 / 标签）
      clearUndo();
      renderFinanceModule();
      refreshFitnessCard();
      toast('✓ 已撤销删除');
    });
  }

  /* ==================================================================
   * 12. 预算编辑器
   * ================================================================== */
  function openBudgetEditor() {
    var b = loadBudgets();
    var cats = catsOf('expense');
    var body = '<div class="fin-hint-line">为支出分类设置<strong>月度预算</strong>（填 0 或留空表示不设预算）。'
      + '每月 1 日进度自动归零，额度会延续到下个月。</div>'
      + '<div class="fin-budget-form">' + cats.map(function (c) {
        var v = Number(b.items[c.name]) || '';
        return '<div class="fin-budget-row"><span class="fin-tpl-icon" style="background:' + c.color + '">' + c.icon + '</span>'
          + '<span class="fin-cat-name">' + FN.esc(c.name) + '</span>'
          + '<input class="modal-input sm" type="number" min="0" step="1" data-bcat="' + FN.esc(c.name) + '" value="' + v + '" placeholder="0"></div>';
      }).join('') + '</div>';
    var mask = showModal('🎯 设置月度预算', body, [
      { text: '取消', onClick: closeModal },
      {
        text: '保存预算', primary: true, onClick: function () {
          var items = {};
          Array.prototype.forEach.call(mask.querySelectorAll('[data-bcat]'), function (inp) {
            var v = parseFloat(inp.value);
            if (v > 0) items[inp.getAttribute('data-bcat')] = v;
          });
          b.items = items;
          saveBudgets(b);
          closeModal(); renderFinanceModule();
          toast('✓ 预算已保存');
        }
      }
    ]);
  }

  /* ==================================================================
   * 13. 模板：一键记账 / 编辑 / 删除
   * ================================================================== */
  function useTpl(id) {
    var t = loadTpls().filter(function (x) { return x.id === id; })[0];
    if (!t) return;
    if (!(Number(t.amount) > 0)) {
      // 金额未设置 → 打开预填表单，让用户补金额
      openBillForm(t.type, null, { category: t.category, name: t.name, note: t.note, tags: t.tags || [] });
      return;
    }
addRecordRaw({
type: t.type, category: t.category, name: t.name, amount: Number(t.amount),
date: today(), note: t.note || '', tags: (t.tags || []).slice(), createdAt: Date.now()
});
window.awardEnergy('finance', { amount: Number(t.amount), type: t.type, category: t.category, note: t.note, name: t.name });
renderFinanceModule();
refreshFitnessCard();
toast('⚡ 已按模板记一笔：' + t.name);
  }
  function openTplForm(id) {
    var list = loadTpls();
    var t = id ? list.filter(function (x) { return x.id === id; })[0] : null;
    var type = t ? t.type : 'expense';
    var body = '<div class="fin-type-toggle">'
      + '<button type="button" class="fin-tt' + (type === 'expense' ? ' sel' : '') + '" data-t="expense">🧾 支出</button>'
      + '<button type="button" class="fin-tt' + (type === 'income' ? ' sel' : '') + '" data-t="income">💰 收入</button></div>'
      + '<div class="modal-field"><label class="modal-label">分类</label><select class="modal-select" id="finTplCat">'
      + catOptionsHTML(type, t ? t.category : null) + '</select></div>'
      + '<div class="pf-form-2col">'
      + '<div class="modal-field"><label class="modal-label">模板名称</label><input class="modal-input" id="finTplName" placeholder="例如：房租" value="' + FN.esc(t ? t.name : '') + '"></div>'
      + '<div class="modal-field"><label class="modal-label">默认金额（可留空）</label><input class="modal-input" id="finTplAmt" type="number" step="0.01" min="0" value="' + FN.esc(t && t.amount ? t.amount : '') + '"></div>'
      + '</div>'
      + '<div class="modal-field"><label class="modal-label">备注</label><input class="modal-input" id="finTplNote" value="' + FN.esc(t ? t.note : '') + '"></div>'
      + '<div class="modal-field"><label class="modal-label">标签（英文逗号分隔）</label><input class="modal-input" id="finTplTags" value="' + FN.esc(t ? (t.tags || []).join(',') : '固定') + '"></div>';
    var st = { type: type };
    var mask = showModal(t ? '编辑模板' : '新增固定收支模板', body, [
      { text: '取消', onClick: closeModal },
      {
        text: '保存', primary: true, onClick: function () {
          var name = mask.querySelector('#finTplName').value.trim();
          if (!name) { toast('请输入模板名称'); return; }
          var obj = {
            id: t ? t.id : FN.uid(),
            type: st.type,
            category: mask.querySelector('#finTplCat').value,
            name: name,
            amount: parseFloat(mask.querySelector('#finTplAmt').value) || 0,
            note: mask.querySelector('#finTplNote').value.trim(),
            tags: mask.querySelector('#finTplTags').value.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean)
          };
          var arr = loadTpls();
          if (t) arr = arr.map(function (x) { return x.id === t.id ? obj : x; });
          else arr.push(obj);
          saveTpls(arr);
          closeModal(); renderFinanceModule();
          toast('✓ 模板已保存');
        }
      }
    ]);
    Array.prototype.forEach.call(mask.querySelectorAll('.fin-tt'), function (btn) {
      btn.addEventListener('click', function () {
        st.type = btn.getAttribute('data-t');
        Array.prototype.forEach.call(mask.querySelectorAll('.fin-tt'), function (b) { b.classList.remove('sel'); });
        btn.classList.add('sel');
        mask.querySelector('#finTplCat').innerHTML = catOptionsHTML(st.type, null);
      });
    });
  }
  function delTpl(id) {
    var t = loadTpls().filter(function (x) { return x.id === id; })[0];
    if (!t) return;
    showModal('删除模板？', '<p>确定删除模板「' + FN.esc(t.name) + '」吗？（已记录的账单不受影响）</p>', [
      { text: '取消', onClick: closeModal },
      {
        text: '确认删除', danger: true, onClick: function () {
          saveTpls(loadTpls().filter(function (x) { return x.id !== id; }));
          closeModal(); renderFinanceModule(); toast('已删除模板');
        }
      }
    ]);
  }

  /* ==================================================================
   * 14. 与健身模块打通（需求 8）
   *     实现方式：包装 window.renderFitnessModule，在健身页渲染完成后
   *     往 #fitRoot 追加一张「健身花销」卡片。fitness_app.js 无需任何改动。
   *     统计口径：支出分类为「健身运动」（兼容旧数据的「健身」）。
   * ================================================================== */
  var FIT_CATS = ['健身运动', '健身'];
  function fitnessRecords() {
    return getRecords().filter(function (r) {
      return r.type === 'expense' && FIT_CATS.indexOf(r.category) >= 0;
    });
  }
  function fitnessSpendOfMonth(ym) {
    var list = fitnessRecords().filter(function (r) { return ymOf(r.date) === ym; });
    return { total: list.reduce(function (a, r) { return a + r.amount; }, 0), count: list.length, list: list };
  }
  function fitnessCardHTML() {
    var all = fitnessRecords();
    var cur = fitnessSpendOfMonth(ymNow());
    var total = all.reduce(function (a, r) { return a + r.amount; }, 0);

    // 近 6 个月迷你柱状
    var months = [];
    for (var i = 5; i >= 0; i--) {
      var m = shiftYm(ymNow(), -i);
      months.push({ ym: m, v: fitnessSpendOfMonth(m).total });
    }
    var max = Math.max(1, Math.max.apply(null, months.map(function (m) { return m.v; })));
    var mini = months.map(function (m) {
      return '<div class="fin-mini-col" title="' + m.ym + ' ¥' + fmt(m.v) + '">'
        + '<div class="fin-mini-bar" style="height:' + ((m.v / max) * 100).toFixed(1) + '%"></div>'
        + '<div class="fin-mini-lab">' + parseInt(m.ym.slice(5), 10) + '月</div></div>';
    }).join('');

    var recent = all.sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 4);
    var recentHTML = recent.length
      ? recent.map(function (r) {
        return '<div class="fin-fit-row"><span>' + FN.esc(r.date) + '</span><span class="fin-fit-name">' + FN.esc(r.name) + '</span>'
          + '<b class="out">-¥' + fmt(r.amount) + '</b></div>';
      }).join('')
      : '<div class="fin-empty-sm">还没有健身相关支出，去记一笔吧～</div>';

    return '<div class="fin-card-head"><div class="card-title fin-title">💸 健身花销统计</div>'
      + '<div class="fin-head-btns"><button class="btn primary" id="finFitAddBtn">＋ 记一笔健身花销</button>'
      + '<button class="btn" id="finFitGoBtn">查看账本</button></div></div>'
      + '<div class="fin-hint-line">数据来自记账模块「健身运动」分类，两边实时同步</div>'
      + '<div class="fin-fit-stats">'
      + '<div class="fin-fit-box"><div class="fin-fit-val">¥' + fmt(cur.total) + '</div><div class="fin-fit-cap">本月花销</div></div>'
      + '<div class="fin-fit-box"><div class="fin-fit-val">¥' + fmt(total) + '</div><div class="fin-fit-cap">累计花销</div></div>'
      + '<div class="fin-fit-box"><div class="fin-fit-val">' + all.length + '</div><div class="fin-fit-cap">总笔数</div></div>'
      + '<div class="fin-fit-box"><div class="fin-fit-val">¥' + fmt(cur.count ? cur.total / cur.count : 0) + '</div><div class="fin-fit-cap">本月单笔均值</div></div>'
      + '</div>'
      + '<div class="fin-mini-bars">' + mini + '</div>'
      + '<div class="fin-fit-list">' + recentHTML + '</div>';
  }
  function injectFitnessCard() {
    var root = document.getElementById('fitRoot');
    if (!root) return;
    var old = document.getElementById('finFitCard');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var box = document.createElement('div');
    box.id = 'finFitCard';
    box.className = 'card fin-card fit-card';
    box.innerHTML = fitnessCardHTML();
    root.appendChild(box);
    var add = box.querySelector('#finFitAddBtn');
    if (add) add.addEventListener('click', function () {
      openBillForm('expense', null, { category: '健身运动', name: '', tags: ['健身'] });
    });
    var go = box.querySelector('#finFitGoBtn');
    if (go) go.addEventListener('click', function () {
      var nav = document.querySelector('.nav-item[data-view="finance"]');
      if (nav) nav.click();
    });
  }
  // 健身页已渲染时，账单变化后同步刷新那张卡片
  function refreshFitnessCard() {
    if (document.getElementById('finFitCard')) injectFitnessCard();
  }
  (function wrapFitness() {
    var orig = window.renderFitnessModule;
    window.renderFitnessModule = function () {
      if (typeof orig === 'function') orig.apply(this, arguments);
      injectFitnessCard();
    };
  })();

  /* ==================================================================
   * 15. 暴露入口
   * ================================================================== */
  window.renderFinanceModule = renderFinanceModule;
  window.FinanceAPI = {
    open: openBillForm,
    records: getRecords,
    fitnessSpend: fitnessSpendOfMonth,
    review: buildReview,
    budgets: loadBudgets,
    templates: loadTpls,
    categories: catsOf
  };
})();
