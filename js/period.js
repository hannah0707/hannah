/* === period.js === */
/* ============================================
   生理期记录 - 本地存储 + 预测逻辑（纯前端）
   - 记录：localStorage.period_records -> [{ id, startDate, endDate, flowLevel, painLevel, mood, symptoms[], note }]
   - 预测：≥3 次记录用历史平均周期；否则默认 28 天
   - 排卵期 = 下次月经前 14 天左右
   - 对外暴露 window.Period 命名空间
   ============================================ */

(function () {
  'use strict';

  var RKEY = 'period_records';

  // 出血量 / 痛经程度 / 情绪 选项
  var FLOW = ['少', '中', '多'];
  var PAIN = ['无', '轻', '中', '重'];

  // —— 日期工具 ——
  function validDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }
  function parse(s) { return new Date(s + 'T00:00:00'); }
  function fmt(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  // 两个日期字符串相差天数（b - a）
  function daysBetween(a, b) {
    return Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);
  }
  function addDays(s, n) {
    var d = parse(s);
    d.setDate(d.getDate() + n);
    return fmt(d);
  }
  function todayStr() {
    return fmt(new Date());
  }

  // —— 存储读写 ——
  function load() {
    try {
      var raw = localStorage.getItem(RKEY);
      var arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    } catch (e) {}
    return [];
  }
  function save(list) {
    try { localStorage.setItem(RKEY, JSON.stringify(list)); } catch (e) {}
  }
  var cache = load();

  function uid() {
    return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // —— 基础 CRUD ——
  function getAll() { return cache; }
  function getById(id) { return cache.find(function (x) { return x.id === id; }) || null; }

  function add(data) {
    var rec = {
      id: uid(),
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      flowLevel: data.flowLevel || '',
      painLevel: data.painLevel || '',
      mood: data.mood || '',
      symptoms: Array.isArray(data.symptoms) ? data.symptoms : (data.symptoms ? [data.symptoms] : []),
      note: data.note || ''
    };
    cache.push(rec);
    save(cache);
    return rec;
  }
  function update(id, patch) {
    var it = getById(id);
    if (!it) return null;
    ['startDate', 'endDate', 'flowLevel', 'painLevel', 'mood', 'note'].forEach(function (k) {
      if (patch[k] !== undefined) it[k] = patch[k];
    });
    if (patch.symptoms !== undefined) {
      it.symptoms = Array.isArray(patch.symptoms) ? patch.symptoms : [];
    }
    save(cache);
    return it;
  }
  function remove(id) {
    var i = cache.findIndex(function (x) { return x.id === id; });
    if (i >= 0) { cache.splice(i, 1); save(cache); return true; }
    return false;
  }

  // —— 当前进行中的记录（已开始、未结束）——
  function ongoing() {
    return cache.filter(function (r) { return validDate(r.startDate) && !r.endDate; })
      .sort(function (a, b) { return a.startDate < b.startDate ? 1 : -1; })[0] || null;
  }

  // —— 一键开始 / 结束 ——
  function startToday() {
    var o = ongoing();
    if (o) { o.startDate = todayStr(); save(cache); return o; }
    return add({ startDate: todayStr() });
  }
  function endToday() {
    var o = ongoing();
    if (!o) return null;
    o.endDate = todayStr();
    save(cache);
    return o;
  }

  // —— 平均周期（相邻两次开始日期之差）——
  function avgCycle() {
    var starts = cache.map(function (r) { return r.startDate; })
      .filter(validDate).sort();
    if (starts.length < 2) return 28;
    var sum = 0, c = 0;
    for (var i = 1; i < starts.length; i++) {
      sum += daysBetween(starts[i - 1], starts[i]);
      c++;
    }
    return c ? Math.round(sum / c) : 28;
  }

  // —— 平均持续天数（已开始且已结束的记录）——
  function avgDuration() {
    var recs = cache.filter(function (r) { return validDate(r.startDate) && validDate(r.endDate); });
    if (!recs.length) return 0;
    var sum = recs.reduce(function (s, r) { return s + (daysBetween(r.startDate, r.endDate) + 1); }, 0);
    return Math.round(sum / recs.length);
  }

  // 是否用历史数据预测（≥3 次记录）
  function useHistory() { return cache.length >= 3; }

  // —— 预测下次经期日期 ——
  function predictNext() {
    var recs = cache.filter(function (r) { return validDate(r.startDate); })
      .sort(function (a, b) { return a.startDate < b.startDate ? -1 : 1; });
    if (recs.length === 0) return addDays(todayStr(), 28);
    var last = recs[recs.length - 1].startDate;
    return addDays(last, useHistory() ? avgCycle() : 28);
  }

  // —— 当前所处阶段 ——
  function currentPhase() {
    var t = todayStr();
    // 1) 是否正在经期
    var inPeriod = cache.some(function (r) {
      if (!validDate(r.startDate)) return false;
      if (validDate(r.endDate)) {
        return daysBetween(r.startDate, t) >= 0 && daysBetween(t, r.endDate) >= 0;
      }
      return daysBetween(r.startDate, t) >= 0; // 进行中
    });
    if (inPeriod) return { key: 'period', label: '经期' };

    // 2) 预测下次 + 排卵期
    var next = predictNext();
    var dNext = daysBetween(t, next); // 距下次还有几天（负=已过）
    if (dNext <= 3) return { key: 'coming', label: '即将来' };

    var ovu = addDays(next, -14);
    var dOvu = Math.abs(daysBetween(t, ovu));
    if (dOvu <= 2) return { key: 'ovulation', label: '排卵期' };

    return { key: 'safe', label: '安全期' };
  }

  // 暴露到全局
  window.Period = {
    FLOW: FLOW,
    PAIN: PAIN,
    getAll: getAll,
    getById: getById,
    add: add,
    update: update,
    remove: remove,
    ongoing: ongoing,
    startToday: startToday,
    endToday: endToday,
    avgCycle: avgCycle,
    avgDuration: avgDuration,
    useHistory: useHistory,
    predictNext: predictNext,
    currentPhase: currentPhase,
    addDays: addDays,
    todayStr: todayStr
  };
})();
