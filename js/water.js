/* === water.js === */
/* ============================================
   喝水记录 - 本地存储逻辑（纯前端）
   - 设置：localStorage.water_setting  -> { dailyGoal }
   - 记录：localStorage.water_records -> [{ id, amount, time, date }]
   - 对外暴露 window.Water 命名空间
   ============================================ */

(function () {
  'use strict';

  var SKEY = 'water_setting';
  var RKEY = 'water_records';

  function getSettings() {
    try {
      var s = JSON.parse(localStorage.getItem(SKEY));
      if (s && typeof s.dailyGoal === 'number') return s;
    } catch (e) {}
    return { dailyGoal: 2000 };
  }
  function setGoal(g) {
    var s = getSettings();
    s.dailyGoal = g;
    try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) {}
  }

  function getRecords() {
    try {
      var r = JSON.parse(localStorage.getItem(RKEY));
      return Array.isArray(r) ? r : [];
    } catch (e) { return []; }
  }
  function saveRecords(r) {
    try { localStorage.setItem(RKEY, JSON.stringify(r)); } catch (e) {}
  }

  function uid() {
    return 'w_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  // 返回前 n 天（含今天）的日期字符串数组，按时间升序
  function lastNDates(n) {
    var arr = [];
    var base = new Date();
    base.setHours(0, 0, 0, 0);
    for (var i = n - 1; i >= 0; i--) {
      var d = new Date(base.getTime() - i * 86400000);
      arr.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
    }
    return arr;
  }

  // 新增一条喝水记录（默认记到今天）
  function addRecord(amount) {
    var recs = getRecords();
    var rec = { id: uid(), amount: amount, time: Date.now(), date: todayStr() };
    recs.push(rec);
    saveRecords(recs);
    return rec;
  }

  // 撤销：删除"今天最近添加"的一条（按 time 倒序取第一条且 date===today）
  function undoLast() {
    var recs = getRecords();
    if (!recs.length) return false;
    var t = todayStr();
    // 倒序找今天最后一条
    for (var i = recs.length - 1; i >= 0; i--) {
      if (recs[i].date === t) {
        var removed = recs.splice(i, 1)[0];
        saveRecords(recs);
        return removed;
      }
    }
    return false;
  }

  function deleteRecord(id) {
    var recs = getRecords();
    var i = recs.findIndex(function (r) { return r.id === id; });
    if (i >= 0) { recs.splice(i, 1); saveRecords(recs); return true; }
    return false;
  }

  function getRecordsOfDay(date) {
    return getRecords().filter(function (r) { return r.date === date; });
  }
  function dayTotal(date) {
    return getRecordsOfDay(date).reduce(function (s, r) { return s + (r.amount || 0); }, 0);
  }

  // 近 n 天：[{ date, total }]
  function lastDays(n) {
    return lastNDates(n).map(function (d) {
      return { date: d, total: dayTotal(d) };
    });
  }

  // 连续达标天数（从今天往前数，今天未达标则算 0）
  function streak(goal) {
    var days = lastNDates(366);
    var count = 0;
    for (var i = days.length - 1; i >= 0; i--) {
      if (dayTotal(days[i]) >= goal) count++;
      else break;
    }
    return count;
  }

  // 近 7 天平均每日饮水量
  function avg7() {
    var days = lastDays(7);
    var sum = days.reduce(function (s, d) { return s + d.total; }, 0);
    return Math.round(sum / 7);
  }

  window.Water = {
    getSettings: getSettings,
    setGoal: setGoal,
    addRecord: addRecord,
    undoLast: undoLast,
    deleteRecord: deleteRecord,
    getRecordsOfDay: getRecordsOfDay,
    dayTotal: dayTotal,
    lastDays: lastDays,
    streak: streak,
    avg7: avg7,
    todayStr: todayStr
  };
})();
