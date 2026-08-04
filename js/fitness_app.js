/* =====================================================================
 * fitness_app.js —— 像素工作台「健身」模块（纯前端 · 原生 JS · localStorage）
 * ---------------------------------------------------------------------
 * 设计原则：
 *  1) 单文件独立模块：所有健身逻辑都在这一个文件里，不依赖任何框架/后端。
 *  2) 不修改工作台其它模块（生活/HR/人才库/作品集等）的代码。
 *  3) 主题自适应：全部使用 style.css 里的主题变量（--primary / --bg-card 等），
 *     切换 樱花粉 / 薰衣草紫 / 抹茶绿 / 夜间 四套主题时自动跟随。
 *  4) 数据全部落在 localStorage，键名统一以 `hannahFit:` 开头；
 *     已接入右上角全局「💾 备份」按钮（全量导出 / 导入 / 分区清空都会覆盖这些键）。
 *
 * ★ 如何自行扩展（需求 9）：
 *   · 新增动作：在下面的 BASE_EXERCISES 数组里照着格式加一条即可。
 *   · 新增/收藏视频链接：在「收藏视频库」里点「＋ 添加视频」，或直接在
 *     生成方案后给每个动作填「视频链接」框（会自动存进记录与视频库）。
 *   · 自定义动作：点「＋ 自定义动作」可运行时录入，落库到 hannahFit:exercises。
 * ===================================================================== */
(function () {
  'use strict';

  // ---------- 0. 通用工具 ----------
  var FIT = {
    // localStorage 读写（带默认值 / 容错）
    load: function (key, def) {
      try {
        var raw = localStorage.getItem(key);
        if (raw == null) return def;
        return JSON.parse(raw);
      } catch (e) { return def; }
    },
    save: function (key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
    },
    uid: function () { return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },
    // 本地日期 YYYY-MM-DD
    today: function () {
      var d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },
    dateAdd: function (dateStr, days) {
      var d = new Date(dateStr + 'T00:00:00');
      d.setDate(d.getDate() + days);
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },
    esc: function (s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
  };

  // 键名集中管理
  var K = {
    records: 'hannahFit:records',
    plans: 'hannahFit:plans',
    exercises: 'hannahFit:exercises',
    body: 'hannahFit:body',
    videos: 'hannahFit:videos',
    settings: 'hannahFit:settings'
  };

  // 安全调用工作台已暴露的全局函数（app.js 中暴露）
  function toast(m) { if (window.toast) window.toast(m); }
  // 自建弹窗：渲染进 #modalRoot（与工作台其它模块共用容器，样式一致），
  // 直接给按钮绑定 onClick，不依赖 data-act 查找，避免被全局 showModal 忽略。
  function showModal(title, bodyHTML, actions) {
    var root = document.getElementById('modalRoot');
    if (!root) { root = document.createElement('div'); root.id = 'modalRoot'; document.body.appendChild(root); }
    var actHTML = (actions || []).map(function (a, i) {
      var cls = 'btn ' + (a.primary ? 'primary' : (a.danger ? 'danger' : ''));
      return '<button class="' + cls + '" data-midx="' + i + '">' + FIT.esc(a.text) + '</button>';
    }).join('');
    root.innerHTML = '<div class="modal-mask" id="fitModalMask"><div class="modal">'
      + '<div class="modal-title">' + FIT.esc(title) + '</div>'
      + '<div class="wb-modal-body">' + bodyHTML + '</div>'
      + (actHTML ? '<div class="modal-actions">' + actHTML + '</div>' : '')
      + '</div></div>';
    var mask = document.getElementById('fitModalMask');
    mask.addEventListener('click', function (e) { if (e.target === mask) closeModalSafe(); });
    (actions || []).forEach(function (a, i) {
      var btn = mask.querySelector('[data-midx="' + i + '"]');
      if (btn && a.onClick) btn.addEventListener('click', function () { a.onClick(); });
    });
    return mask;
  }
  function confirmDialog(t, ok, cancel, opt) { if (window.confirmDialog) return window.confirmDialog(t, ok, cancel, opt); }
  function escHtml(s) { return FIT.esc(s); } // FIT.esc 会先转 String，避免 escapeHtml 对数字报 s.replace 错误

  // 把今天的打卡同步给「桌面」页（dashboard 读取 state.checkin.fitness）
  function markCheckin(dateStr) {
    dateStr = dateStr || FIT.today();
    if (window.state && window.state.checkin) {
      window.state.checkin.fitness = window.state.checkin.fitness || {};
      window.state.checkin.fitness[dateStr] = true;
      if (window.saveData) window.saveData();
    }
  }

  // ---------- 1. 场景 & 部位 配置 ----------
  // 简易模式：保留 居家 / 健身房 / 游泳 / 户外 四大场景
  var SCENES = [
    { id: 'home', label: '🏠 居家' },
    { id: 'gym', label: '🏋 健身房' },
    { id: 'swim', label: '🏊 游泳' },
    { id: 'outdoor', label: '🌳 户外健身' }
  ];
  // 详细模式：把四大场景拆细
  var SCENE_DETAIL = [
    { id: 'home_bodyweight', label: '🏠 居家徒手', scene: 'home' },
    { id: 'home_equip', label: '🏋 居家器械', scene: 'home' },
    { id: 'gym_strength', label: '💪 健身房力量', scene: 'gym' },
    { id: 'gym_cardio', label: '🚴 健身房有氧', scene: 'gym' },
    { id: 'swim', label: '🏊 游泳', scene: 'swim' },
    { id: 'outdoor_run', label: '🏃 户外慢跑', scene: 'outdoor' },
    { id: 'outdoor', label: '🌳 户外健身', scene: 'outdoor' }
  ];
  // 锻炼部位：在原有基础上新增「肩 / 胸 / 臀部」
  var PARTS = [
    { id: 'full', label: '🧍 全身' },
    { id: 'shoulder', label: '💪 肩' },
    { id: 'chest', label: '🫁 胸' },
    { id: 'back', label: '🏋 背部' },
    { id: 'arm', label: '💪 手臂' },
    { id: 'core', label: '🧘 核心/腰腹' },
    { id: 'hip', label: '🍑 臀部' },
    { id: 'leg', label: '🦵 腿部' },
    { id: 'cardio', label: '❤️ 有氧' },
    { id: 'stretch', label: '🤸 拉伸' }
  ];
  var DURATIONS = [15, 30, 45, 60];

  // ---------- 2. 基础动作库（★ 自行新增动作就加在这里） ----------
  // 字段说明：
  //   name   动作名
  //   parts  针对部位（见 PARTS 的 id）
  //   scene  适用场景主类：home / gym / swim / outdoor / 'any'
  //   sets   建议组数（有氧可填 1）
  //   reps   每组次数（有氧可填如 '20分钟' 的字符串）
  //   restSec 组间休息秒数
  //   note   易错提醒（展示给用户）
  //   videoUrl 默认视频链接（可留空，生成方案后用户自行填）
  var BASE_EXERCISES = [
    // —— 热身（通用，任何方案都会带）——
    { name: '手腕脚踝绕环', parts: ['full'], scene: ['any'], sets: 1, reps: '30秒', restSec: 10, note: '动作要慢，活动开关节再开始。', videoUrl: '' },
    { name: '肩部绕环', parts: ['full', 'shoulder'], scene: ['any'], sets: 1, reps: '前后各10次', restSec: 10, note: '避免耸肩，画大圈。', videoUrl: '' },
    { name: '原地小碎步', parts: ['full', 'cardio'], scene: ['any'], sets: 1, reps: '30秒', restSec: 10, note: '脚尖点地，保持轻盈。', videoUrl: '' },
    { name: '扩胸运动', parts: ['full', 'chest'], scene: ['any'], sets: 1, reps: '12次', restSec: 10, note: '打开时吐气，感受胸肌拉伸。', videoUrl: '' },

    // —— 肩 ——
    { name: '哑铃推举', parts: ['shoulder'], scene: ['home', 'gym'], sets: 3, reps: '12次', restSec: 60, note: '核心收紧，不要塌腰借力。', videoUrl: '' },
    { name: '侧平举', parts: ['shoulder'], scene: ['home', 'gym'], sets: 3, reps: '15次', restSec: 45, note: '小重量慢起慢落，肘部微屈。', videoUrl: '' },
    { name: '前平举', parts: ['shoulder'], scene: ['home', 'gym'], sets: 3, reps: '12次', restSec: 45, note: '避免身体晃动甩重量。', videoUrl: '' },
    { name: '俯身飞鸟', parts: ['shoulder', 'back'], scene: ['home', 'gym'], sets: 3, reps: '15次', restSec: 45, note: '上身稳定，靠肩后束发力。', videoUrl: '' },

    // —— 胸 ——
    { name: '俯卧撑', parts: ['chest', 'arm'], scene: ['home', 'outdoor'], sets: 3, reps: '12次', restSec: 60, note: '身体成一条线，下落时胸贴近地面。', videoUrl: '' },
    { name: '上斜俯卧撑', parts: ['chest'], scene: ['home'], sets: 3, reps: '12次', restSec: 60, note: '手撑高处， targeting 上胸。', videoUrl: '' },
    { name: '哑铃卧推', parts: ['chest', 'arm'], scene: ['gym', 'home'], sets: 4, reps: '10次', restSec: 75, note: '杠铃/哑铃下放至胸，不要弹震。', videoUrl: '' },
    { name: '双杠臂屈伸', parts: ['chest', 'arm'], scene: ['gym', 'outdoor'], sets: 3, reps: '10次', restSec: 60, note: '身体前倾更多练胸，挺直更多练三头。', videoUrl: '' },

    // —— 背 ——
    { name: '俯身划船', parts: ['back'], scene: ['home', 'gym'], sets: 3, reps: '12次', restSec: 60, note: '背阔肌主导，肘部贴身体后拉。', videoUrl: '' },
    { name: '高位下拉', parts: ['back'], scene: ['gym'], sets: 3, reps: '12次', restSec: 60, note: '下拉到锁骨，不要耸肩。', videoUrl: '' },
    { name: '超人式', parts: ['back', 'core'], scene: ['home', 'outdoor'], sets: 3, reps: '15次', restSec: 30, note: '同时抬起四肢，感受下背收缩。', videoUrl: '' },

    // —— 手臂 ——
    { name: '哑铃弯举', parts: ['arm'], scene: ['home', 'gym'], sets: 3, reps: '15次', restSec: 45, note: '大臂固定，靠二头发力。', videoUrl: '' },
    { name: '三头下压', parts: ['arm'], scene: ['gym', 'home'], sets: 3, reps: '15次', restSec: 45, note: '肘部贴紧身体，只动小臂。', videoUrl: '' },
    { name: '窄距俯卧撑', parts: ['arm', 'chest'], scene: ['home', 'outdoor'], sets: 3, reps: '12次', restSec: 45, note: '双手并拢，重点刺激三头。', videoUrl: '' },

    // —— 核心 ——
    { name: '卷腹', parts: ['core'], scene: ['home', 'gym', 'outdoor'], sets: 3, reps: '20次', restSec: 30, note: '用腹肌卷起，脖子放松不发力。', videoUrl: '' },
    { name: '平板支撑', parts: ['core', 'full'], scene: ['any'], sets: 3, reps: '45秒', restSec: 30, note: '臀部不塌不撅，肩肘垂直。', videoUrl: '' },
    { name: '俄罗斯转体', parts: ['core'], scene: ['home', 'gym'], sets: 3, reps: '每侧15次', restSec: 30, note: '脚可着地降低难度，转体时收紧腹斜肌。', videoUrl: '' },
    { name: '仰卧抬腿', parts: ['core', 'hip'], scene: ['home'], sets: 3, reps: '15次', restSec: 30, note: '下放放慢，避免腰部离地代偿。', videoUrl: '' },

    // —— 臀 / 腿 ——
    { name: '深蹲', parts: ['leg', 'hip', 'full'], scene: ['home', 'gym', 'outdoor'], sets: 4, reps: '15次', restSec: 60, note: '膝盖朝脚尖方向，重心在脚跟。', videoUrl: '' },
    { name: '箭步蹲', parts: ['leg', 'hip'], scene: ['home', 'gym', 'outdoor'], sets: 3, reps: '每侧12次', restSec: 60, note: '前膝不超过脚尖，上身直立。', videoUrl: '' },
    { name: '臀桥', parts: ['hip', 'leg'], scene: ['home', 'gym'], sets: 3, reps: '15次', restSec: 30, note: '顶髋时夹紧臀部，肩膀到膝盖成直线。', videoUrl: '' },
    { name: '蚌式开合', parts: ['hip'], scene: ['home'], sets: 3, reps: '每侧20次', restSec: 20, note: '侧卧脚踝并拢，靠臀中肌打开。', videoUrl: '' },
    { name: '罗马尼亚硬拉', parts: ['hip', 'leg', 'back'], scene: ['gym', 'home'], sets: 3, reps: '12次', restSec: 60, note: '髋部后推，背部保持平直。', videoUrl: '' },
    { name: '提踵', parts: ['leg'], scene: ['any'], sets: 3, reps: '20次', restSec: 20, note: '顶峰停顿，感受小腿收缩。', videoUrl: '' },

    // —— 有氧 / 全身 ——
    { name: '开合跳', parts: ['cardio', 'full'], scene: ['any'], sets: 3, reps: '40秒', restSec: 20, note: '落地轻，手脚同步开合。', videoUrl: '' },
    { name: '高抬腿', parts: ['cardio', 'full'], scene: ['any'], sets: 3, reps: '40秒', restSec: 20, note: '膝盖抬至腰高，核心收紧。', videoUrl: '' },
    { name: '波比跳', parts: ['cardio', 'full'], scene: ['any'], sets: 3, reps: '10次', restSec: 30, note: '下蹲-撑地-跳起连贯，保护手腕膝盖。', videoUrl: '' },
    { name: '慢跑', parts: ['cardio', 'leg'], scene: ['outdoor', 'gym'], sets: 1, reps: '20分钟', restSec: 0, note: '保持能说话的配速，注意呼吸节奏。', videoUrl: '' },
    { name: '游泳', parts: ['cardio', 'full'], scene: ['swim'], sets: 1, reps: '30分钟', restSec: 0, note: '充分热身肩颈，注意换气节奏。', videoUrl: '' },

    // —— 拉伸（收尾）——
    { name: '肩部拉伸', parts: ['shoulder', 'stretch'], scene: ['any'], sets: 1, reps: '每侧30秒', restSec: 10, note: '轻拉不弹震，有拉伸感即可。', videoUrl: '' },
    { name: '胸肌拉伸', parts: ['chest', 'stretch'], scene: ['any'], sets: 1, reps: '每侧30秒', restSec: 10, note: '手臂贴墙外展，挺胸。', videoUrl: '' },
    { name: '大腿前侧拉伸', parts: ['leg', 'stretch'], scene: ['any'], sets: 1, reps: '每侧30秒', restSec: 10, note: '手抓脚踝拉向臀部，膝盖朝下。', videoUrl: '' },
    { name: '猫牛式', parts: ['back', 'stretch', 'core'], scene: ['any'], sets: 1, reps: '10次', restSec: 10, note: '配合呼吸，脊柱逐节活动。', videoUrl: '' },
    { name: '婴儿式放松', parts: ['full', 'stretch'], scene: ['any'], sets: 1, reps: '60秒', restSec: 0, note: '臀部坐脚跟，全身放松。', videoUrl: '' }
  ];

  // 所有可用动作 = 基础库 + 用户自定义（hannahFit:exercises）
  function allExercises() {
    var user = FIT.load(K.exercises, []);
    return BASE_EXERCISES.concat(user || []);
  }

  // ---------- 3. 当前选择状态 ----------
  var sel = {
    mode: (FIT.load(K.settings, {})).sceneMode || 'simple', // simple | detail
    scene: null,        // 简易模式：主场景 id
    detail: null,       // 详细模式：子场景 id
    parts: [],          // 选中的部位 id 数组
    dur: null,          // 时长（分钟）
    previewPlan: null   // 当前正在预览的方案（切换场景/部位时清空）
  };
  function saveSettings() {
    var s = FIT.load(K.settings, {});
    s.sceneMode = sel.mode;
    FIT.save(K.settings, s);
  }

  // 当前生效的「主场景」（用于筛选动作）
  function activeMainScene() {
    if (sel.mode === 'detail') {
      var d = SCENE_DETAIL.filter(function (x) { return x.id === sel.detail; })[0];
      return d ? d.scene : null;
    }
    return sel.scene;
  }

  // ---------- 4. 生成结构化训练方案 ----------
  function pick(arr, n) {
    var pool = arr.slice();
    var out = [];
    while (out.length < n && pool.length) {
      var i = Math.floor(Math.random() * pool.length);
      out.push(pool.splice(i, 1)[0]);
    }
    // 数量不够时允许重复（用 full 类补充）
    if (out.length < n) {
      var full = BASE_EXERCISES.filter(function (e) { return e.parts.indexOf('full') >= 0; });
      while (out.length < n && full.length) {
        out.push(full[out.length % full.length]);
      }
    }
    return out;
  }

  function generatePlan() {
    var mainScene = activeMainScene();
    var parts = sel.parts.slice();
    if (!mainScene) { toast('请选择运动场景'); return null; }
    if (!parts.length) { toast('请选择锻炼部位'); return null; }
    if (!sel.dur) { toast('请选择时长'); return null; }

    // 主训练目标数量随时长递增
    var mainCount = sel.dur <= 15 ? 4 : sel.dur <= 30 ? 6 : sel.dur <= 45 ? 8 : 10;

    // 热身 3 个通用
    var warm = pick(BASE_EXERCISES.filter(function (e) { return e.parts.indexOf('full') >= 0 && e.scene.indexOf('any') >= 0 && e.sets === 1; }), 3);
    // 正式训练：匹配 部位 ∩ 场景
    var candidates = allExercises().filter(function (e) {
      var hitPart = e.parts.some(function (p) { return parts.indexOf(p) >= 0; });
      var hitScene = e.scene.indexOf('any') >= 0 || e.scene.indexOf(mainScene) >= 0;
      // 排除纯热身/拉伸项进入正式组
      var isMain = e.parts.indexOf('full') < 0 || e.parts.length > 1;
      return hitPart && hitScene && isMain && e.parts.indexOf('stretch') < 0;
    });
    if (candidates.length < mainCount) {
      // 放宽：仅匹配场景（不限部位）
      var more = allExercises().filter(function (e) {
        return (e.scene.indexOf('any') >= 0 || e.scene.indexOf(mainScene) >= 0) && e.parts.indexOf('stretch') < 0 && e.parts.indexOf('full') < 0;
      });
      candidates = candidates.concat(more);
    }
    var main = pick(candidates, mainCount);
    // 收尾拉伸 3 个
    var cool = pick(BASE_EXERCISES.filter(function (e) { return e.parts.indexOf('stretch') >= 0; }), 3);

    function toItem(e) {
      return { name: e.name, sets: e.sets, reps: e.reps, restSec: e.restSec, note: e.note || '', videoUrl: e.videoUrl || '', done: false };
    }
    var sceneLabel = sel.mode === 'detail'
      ? (SCENE_DETAIL.filter(function (x) { return x.id === sel.detail; })[0] || {}).label
      : (SCENES.filter(function (x) { return x.id === sel.scene; })[0] || {}).label;
    var partLabels = parts.map(function (p) { return (PARTS.filter(function (x) { return x.id === p; })[0] || {}).label || p; });

    return {
      date: FIT.today(),
      title: sceneLabel + ' · ' + partLabels.join('+') + ' · ' + sel.dur + '分钟',
      scene: mainScene,
      sceneDetail: sel.mode === 'detail' ? sel.detail : null,
      parts: parts.slice(),
      durationMin: sel.dur,
      sections: [
        { phase: 'warmup', title: '🔥 热身环节', items: warm.map(toItem) },
        { phase: 'main', title: '💪 正式训练', items: main.map(toItem) },
        { phase: 'cooldown', title: '🤸 收尾拉伸', items: cool.map(toItem) }
      ]
    };
  }

  // ---------- 5. 运动记录 ----------
  function getRecords() { return FIT.load(K.records, []); }
  function setRecords(arr) { FIT.save(K.records, arr); }

  function addRecord(plan, extra) {
    extra = extra || {};
    var rec = {
      id: FIT.uid(),
      date: FIT.today(),
      scene: plan.scene,
      sceneDetail: plan.sceneDetail || null,
      parts: plan.parts.slice(),
      durationMin: plan.durationMin,
      title: plan.title,
      status: 'done',
      weight: extra.weight != null ? extra.weight : null,
      star: extra.star != null ? extra.star : null,
      feel: extra.feel || null,
      sections: JSON.parse(JSON.stringify(plan.sections))
    };
    var arr = getRecords();
    arr.push(rec);
    setRecords(arr);
    markCheckin(rec.date);
    if (window.awardEnergy) window.awardEnergy('fitness');
    return rec;
  }

  // 统计：连续天数 / 本月
  function stats() {
    var recs = getRecords();
    var dates = {};
    var month = FIT.today().slice(0, 7);
    var monthCount = 0, monthDur = 0;
    recs.forEach(function (r) {
      if (r.status === 'cancelled') return;
      dates[r.date] = true;
      if ((r.date || '').slice(0, 7) === month) { monthCount++; monthDur += (r.durationMin || 0); }
    });
    var dateList = Object.keys(dates).sort();
    // 当前连续天数（从今天往前数）
    var cur = 0;
    var d = FIT.today();
    while (dates[d]) { cur++; d = FIT.dateAdd(d, -1); }
    // 最长连续
    var longest = 0, run = 0, prev = null;
    dateList.forEach(function (dt) {
      if (prev && FIT.dateAdd(prev, 1) === dt) run++; else run = 1;
      if (run > longest) longest = run;
      prev = dt;
    });
    return { total: dateList.length, currentStreak: cur, longestStreak: longest, monthCount: monthCount, monthDur: monthDur, workedDates: dates };
  }

  // ---------- 6. 成就徽章 ----------
  var BADGES = [
    { id: 's3', type: 'streak', need: 3, icon: '🌱', name: '三日萌芽', desc: '连续健身 3 天' },
    { id: 's7', type: 'streak', need: 7, icon: '🔥', name: '一周火焰', desc: '连续健身 7 天' },
    { id: 's14', type: 'streak', need: 14, icon: '⚡', name: '双周雷霆', desc: '连续健身 14 天' },
    { id: 's30', type: 'streak', need: 30, icon: '🏆', name: '月度王者', desc: '连续健身 30 天' },
    { id: 's100', type: 'streak', need: 100, icon: '👑', name: '百日为王', desc: '连续健身 100 天' },
    { id: 't10', type: 'total', need: 10, icon: '🥉', name: '初露锋芒', desc: '累计训练 10 次' },
    { id: 't50', type: 'total', need: 50, icon: '🥈', name: '渐入佳境', desc: '累计训练 50 次' },
    { id: 't100', type: 'total', need: 100, icon: '🥇', name: '健身达人', desc: '累计训练 100 次' }
  ];
  function earnedBadges() {
    var s = stats();
    return BADGES.map(function (b) {
      var v = b.type === 'streak' ? s.currentStreak : s.total;
      return { badge: b, earned: v >= b.need, value: v };
    });
  }

  // ---------- 7. 渲染主入口 ----------
  function renderFitnessModule() {
    var root = document.getElementById('fitRoot');
    if (!root) return;
    root.innerHTML = buildHTML();
    bindEvents();
  }

  function buildHTML() {
    var s = stats();
    return ''
      + wizardCard()
      + recordsCard(s)
      + planLibraryCard()
      + bodyArchiveCard()
      + videoLibraryCard()
      + badgeCard();
  }

  // ---- 7.1 顶部三段选择 + 推荐 ----
  function wizardCard() {
    var sceneOpts = SCENES.map(function (sc) {
      var on = sel.mode === 'simple' && sel.scene === sc.id;
      return '<div class="fit-opt' + (on ? ' sel' : '') + '" data-act="scene" data-scene="' + sc.id + '">' + sc.label + '</div>';
    }).join('');
    var detailOpts = SCENE_DETAIL.map(function (sc) {
      var on = sel.mode === 'detail' && sel.detail === sc.id;
      return '<div class="fit-opt' + (on ? ' sel' : '') + '" data-act="scene-detail" data-detail="' + sc.id + '">' + sc.label + '</div>';
    }).join('');
    var partOpts = PARTS.map(function (p) {
      var on = sel.parts.indexOf(p.id) >= 0;
      return '<div class="fit-opt' + (on ? ' sel' : '') + '" data-act="part" data-part="' + p.id + '">' + p.label + '</div>';
    }).join('');
    var durOpts = DURATIONS.map(function (d) {
      var on = sel.dur === d;
      return '<div class="fit-opt' + (on ? ' sel' : '') + '" data-act="dur" data-dur="' + d + '">' + d + '分钟</div>';
    }).join('');

    return ''
      + '<div class="card fit-card">'
      +   '<div class="card-title">💪 今日运动顾问</div>'
      +   '<div class="fit-mode-bar">'
      +     '<span class="fit-mode-label">模式：</span>'
      +     '<div class="fit-opt' + (sel.mode === 'simple' ? ' sel' : '') + '" data-act="scene-mode" data-mode="simple">精简</div>'
      +     '<div class="fit-opt' + (sel.mode === 'detail' ? ' sel' : '') + '" data-act="scene-mode" data-mode="detail">详细</div>'
      +   '</div>'
      +   '<div class="fit-step"><div class="fit-step-title">1⃣ 今天的运动场景？</div>'
      +     '<div class="fit-opts" id="fitSceneOpt">' + (sel.mode === 'detail' ? detailOpts : sceneOpts) + '</div></div>'
      +   '<div class="fit-step"><div class="fit-step-title">2⃣ 想锻炼的部位？（可多选，已含肩/胸/臀部）</div>'
      +     '<div class="fit-opts" id="fitPartOpt">' + partOpts + '</div></div>'
      +   '<div class="fit-step"><div class="fit-step-title">3⃣ 时长？</div>'
      +     '<div class="fit-opts" id="fitDurOpt">' + durOpts + '</div></div>'
      +   '<button class="btn primary fit-recommend-btn" data-act="recommend" style="width:100%;padding:12px;font-size:15px;">🎯 为我推荐跟练</button>'
      +   '<div id="fitPlanPreview">' + (sel.previewPlan ? planPreviewHTML(sel.previewPlan) : '') + '</div>'
      + '</div>';
  }

  // 生成方案后的预览
  function planPreviewHTML(plan) {
    if (!plan) return '';
    var html = '<div class="fit-plan-preview">';
    html += '<div class="recommend-title">🎬 ' + escHtml(plan.title) + '</div>';
    plan.sections.forEach(function (sec, si) {
      html += '<div class="fit-sec"><div class="fit-sec-title">' + escHtml(sec.title) + '</div>';
      sec.items.forEach(function (it, ii) {
        var idx = si + '-' + ii;
        html += '<div class="fit-ex">'
          + '<div class="fit-ex-main">'
          + '<div class="fit-ex-name">' + escHtml(it.name) + '</div>'
          + '<div class="fit-ex-meta">' + escHtml(it.sets) + ' 组 · ' + escHtml(it.reps) + (it.restSec ? ' · 组间休息 ' + it.restSec + 's' : '') + '</div>'
          + '<div class="fit-ex-note">⚠️ 易错：' + escHtml(it.note) + '</div>'
          + '</div>'
          + '<div class="fit-ex-vurl"><input class="fit-input" data-vurl="' + idx + '" placeholder="视频链接（可留空）" value="' + escHtml(it.videoUrl) + '"></div>'
          + '</div>';
      });
      html += '</div>';
    });
    html += '<div class="fit-preview-actions">'
      + '<label class="fit-weight-label">本次负重(kg)：<input class="fit-input fit-weight-input" id="fitWeight" type="number" min="0" placeholder="选填"></label>'
      + '<button class="btn primary" data-act="start-record">✓ 记录本次训练</button>'
      + '<button class="btn" data-act="save-plan">📥 保存到计划库</button>'
      + '<button class="btn" data-act="open-trainer">⏱ 开始训练(倒计时)</button>'
      + '</div>';
    html += '</div>';
    return html;
  }

  // ---- 7.2 运动记录（日历 / 连续 / 月度 / 列表）----
  function recordsCard(s) {
    var cal = calendarHTML(s.workedDates);
    var recs = getRecords().slice().reverse();
    var list = recs.length
      ? recs.map(function (r) { return recordRowHTML(r); }).join('')
      : '<div class="empty-state"><span class="empty-state-icon">💪</span>还没有运动记录，先生成一套方案吧～</div>';
    return ''
      + '<div class="card fit-card">'
      +   '<div class="card-title">📊 运动记录</div>'
      +   '<div class="fit-stat-row">'
      +     statBox('🔥 连续', s.currentStreak + ' 天')
      +     statBox('📅 最长连续', s.longestStreak + ' 天')
      +     statBox('📆 本月', s.monthCount + ' 次')
      +     statBox('⏱ 本月时长', s.monthDur + ' 分')
      +     statBox('🏁 累计', s.total + ' 次')
      +   '</div>'
      +   '<div class="fit-cal">' + cal + '</div>'
      +   '<div id="fitRecordList" class="fit-rec-list">' + list + '</div>'
      + '</div>';
  }
  function statBox(label, val) {
    return '<div class="fit-stat"><div class="fit-stat-val">' + escHtml(val) + '</div><div class="fit-stat-label">' + escHtml(label) + '</div></div>';
  }
  function calendarHTML(worked) {
    worked = worked || {};
    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth();
    var first = new Date(y, m, 1).getDay(); // 0=日
    var days = new Date(y, m + 1, 0).getDate();
    var html = '<div class="fit-cal-head">' + y + '年 ' + (m + 1) + '月</div><div class="fit-cal-grid">';
    ['日', '一', '二', '三', '四', '五', '六'].forEach(function (w) { html += '<div class="fit-cal-wd">' + w + '</div>'; });
    for (var i = 0; i < first; i++) html += '<div class="fit-cal-cell empty"></div>';
    for (var d = 1; d <= days; d++) {
      var ds = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
      var on = worked[ds] ? ' on' : '';
      html += '<div class="fit-cal-cell' + on + '">' + d + (worked[ds] ? '<span class="fit-dot">✓</span>' : '') + '</div>';
    }
    html += '</div>';
    return html;
  }
  function recordRowHTML(r) {
    var stars = '';
    for (var i = 1; i <= 5; i++) stars += '<span class="fit-star' + (r.star && i <= r.star ? ' on' : '') + '">★</span>';
    return '<div class="fit-rec" data-rid="' + r.id + '">'
      + '<div class="fit-rec-main">'
      +   '<div class="fit-rec-title">' + escHtml(r.title || '未命名') + (r.weight ? ' · 负重' + r.weight + 'kg' : '') + '</div>'
      +   '<div class="fit-rec-meta">' + escHtml(r.date) + ' · ' + escHtml(r.durationMin) + '分钟</div>'
      +   '<div class="fit-rec-stars">' + stars + '</div>'
      +   (r.feel ? '<div class="fit-rec-feel">💬 ' + escHtml(r.feel) + '</div>' : '')
      + '</div>'
      + '<div class="fit-rec-actions">'
      +   '<button class="btn btn-sm" data-act="edit-record" data-rid="' + r.id + '">评价</button>'
      +   '<button class="btn btn-sm" data-act="open-trainer-rec" data-rid="' + r.id + '">跟练</button>'
      +   '<button class="btn btn-sm danger" data-act="del-record" data-rid="' + r.id + '">删除</button>'
      + '</div></div>';
  }

  // ---- 7.3 训练计划库 ----
  function planLibraryCard() {
    var plans = FIT.load(K.plans, []);
    var list = plans.length
      ? plans.map(function (p) { return planRowHTML(p); }).join('')
      : '<div class="empty-state"><span class="empty-state-icon">📋</span>还没有保存的计划，生成方案后点「保存到计划库」即可。</div>';
    return ''
      + '<div class="card fit-card">'
      +   '<div class="card-title">📋 我的训练计划库'
      +     '<button class="btn btn-sm fit-right-btn" data-act="add-plan">＋ 自定义循环计划</button></div>'
      +   '<div id="fitPlanList" class="fit-plan-list">' + list + '</div>'
      + '</div>';
  }
  function planRowHTML(p) {
    var tag = p.type === 'cyclic' ? '🔁 循环周期' : '🎯 推荐方案';
    var count = 0;
    (p.sections || []).forEach(function (s) { count += (s.items || []).length; });
    if (p.type === 'cyclic') count = (p.cycle || []).length + ' 天循环';
    return '<div class="fit-plan-row" data-pid="' + p.id + '">'
      + '<div class="fit-plan-main"><div class="fit-plan-name">' + escHtml(p.name) + '</div>'
      + '<div class="fit-plan-meta">' + tag + ' · ' + (typeof count === 'number' ? count + ' 个动作' : count) + '</div></div>'
      + '<div class="fit-plan-actions">'
      +   '<button class="btn btn-sm" data-act="open-plan" data-pid="' + p.id + '">查看/跟练</button>'
      +   '<button class="btn btn-sm" data-act="copy-plan" data-pid="' + p.id + '">复制</button>'
      +   '<button class="btn btn-sm danger" data-act="del-plan" data-pid="' + p.id + '">删除</button>'
      + '</div></div>';
  }

  // ---- 7.4 身体数据档案 ----
  function bodyArchiveCard() {
    var arr = FIT.load(K.body, []).slice().reverse();
    var form = '<div class="fit-body-form">'
      + '<input class="fit-input" id="bfWeight" type="number" step="0.1" placeholder="体重kg">'
      + '<input class="fit-input" id="bfWaist" type="number" step="0.1" placeholder="腰围cm">'
      + '<input class="fit-input" id="bfChest" type="number" step="0.1" placeholder="胸围cm">'
      + '<input class="fit-input" id="bfHip" type="number" step="0.1" placeholder="臀围cm">'
      + '<input class="fit-input" id="bfArm" type="number" step="0.1" placeholder="臂围cm">'
      + '<input class="fit-input" id="bfThigh" type="number" step="0.1" placeholder="腿围cm">'
      + '<button class="btn primary btn-sm" data-act="add-body">＋ 录入</button>'
      + '<label class="fit-photo-label">体态照<input class="fit-input" id="bfPhoto" type="file" accept="image/*"></label>'
      + '</div>';
    var chart = bodyChartHTML(arr.slice().reverse());
    var photos = arr.filter(function (b) { return b.photo; })
      .map(function (b) { return '<img class="fit-photo" src="' + b.photo + '" title="' + escHtml(b.date) + '">'; }).join('');
    var table = arr.length ? arr.slice(0, 6).map(function (b) {
      return '<tr><td>' + escHtml(b.date) + '</td><td>' + num(b.weight) + '</td><td>' + num(b.waist) + '</td><td>' + num(b.hip) + '</td><td>' + num(b.chest) + '</td><td>' + num(b.arm) + '</td><td>' + num(b.thigh) + '</td>'
        + '<td><button class="btn btn-sm danger" data-act="del-body" data-bid="' + b.id + '">删</button></td></tr>';
    }).join('') : '';
    return ''
      + '<div class="card fit-card">'
      +   '<div class="card-title">📐 身体数据档案</div>'
      +   form
      +   '<div class="fit-chart">' + chart + '</div>'
      +   (photos ? '<div class="fit-photos">' + photos + '</div>' : '')
      +   '<table class="fit-table"><thead><tr><th>日期</th><th>体重</th><th>腰</th><th>臀</th><th>胸</th><th>臂</th><th>腿</th><th></th></tr></thead><tbody>' + table + '</tbody></table>'
      + '</div>';
  }
  function num(v) { return v == null ? '—' : v; }

  // 简易 SVG 多序列折线图（各指标按自身 min/max 归一化）
  function bodyChartHTML(arr) {
    if (!arr.length) return '<div class="empty-state" style="padding:20px;">录入数据后自动生成走势图～</div>';
    var metrics = [
      { key: 'weight', name: '体重', color: '#FF8FB1' },
      { key: 'waist', name: '腰', color: '#8BC4A0' },
      { key: 'hip', name: '臀', color: '#6BA4E8' },
      { key: 'chest', name: '胸', color: '#FFD966' },
      { key: 'arm', name: '臂', color: '#9C89B8' },
      { key: 'thigh', name: '腿', color: '#E8A0BF' }
    ];
    var W = 320, H = 160, pl = 28, pr = 8, pt = 10, pb = 20;
    var iw = W - pl - pr, ih = H - pt - pb;
    var n = arr.length;
    // 计算每条线的点
    var series = metrics.map(function (m) {
      var vals = arr.map(function (b) { return b[m.key]; }).filter(function (v) { return v != null; });
      if (!vals.length) return null;
      var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
      var span = (max - min) || 1;
      var pts = arr.map(function (b, i) {
        if (b[m.key] == null) return null;
        var x = pl + (n === 1 ? iw / 2 : iw * i / (n - 1));
        var y = pt + ih - ((b[m.key] - min) / span) * ih;
        return x.toFixed(1) + ',' + y.toFixed(1);
      }).filter(Boolean);
      return { name: m.name, color: m.color, pts: pts };
    }).filter(Boolean);
    if (!series.length) return '<div class="empty-state" style="padding:20px;">暂无数值指标</div>';
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="fit-svg" preserveAspectRatio="xMidYMid meet">';
    svg += '<line x1="' + pl + '" y1="' + pt + '" x2="' + pl + '" y2="' + (pt + ih) + '" stroke="var(--border-soft)"/><line x1="' + pl + '" y1="' + (pt + ih) + '" x2="' + (W - pr) + '" y2="' + (pt + ih) + '" stroke="var(--border-soft)"/>';
    series.forEach(function (s) {
      svg += '<polyline points="' + s.pts.join(' ') + '" fill="none" stroke="' + s.color + '" stroke-width="2" stroke-linejoin="round"/>';
    });
    svg += '</svg><div class="fit-legend">';
    series.forEach(function (s) { svg += '<span class="fit-legend-item"><i style="background:' + s.color + '"></i>' + escHtml(s.name) + '</span>'; });
    svg += '</div>';
    return svg;
  }

  // ---- 7.5 收藏视频库 ----
  function videoLibraryCard() {
    var vids = FIT.load(K.videos, []);
    var cats = PARTS;
    var blocks = cats.map(function (c) {
      var items = vids.filter(function (v) { return v.part === c.id; });
      if (!items.length) return '';
      var lis = items.map(function (v) {
        return '<div class="fit-vid-row" data-vid="' + v.id + '"><a href="' + escHtml(v.url) + '" target="_blank" rel="noopener" class="fit-vid-link">' + escHtml(v.title) + '</a>'
          + '<button class="btn btn-sm danger" data-act="del-video" data-vid="' + v.id + '">删</button></div>';
      }).join('');
      return '<div class="fit-vid-cat"><div class="fit-vid-cat-title">' + escHtml(c.label) + '</div>' + lis + '</div>';
    }).filter(Boolean).join('');
    return ''
      + '<div class="card fit-card">'
      +   '<div class="card-title">🎬 收藏视频库'
      +     '<button class="btn btn-sm fit-right-btn" data-act="add-video">＋ 添加视频</button></div>'
      +   (blocks || '<div class="empty-state"><span class="empty-state-icon">🎬</span>还没有收藏视频，点「添加视频」按部位收纳跟练链接。</div>')
      + '</div>';
  }

  // ---- 7.6 成就徽章 ----
  function badgeCard() {
    var earned = earnedBadges();
    var items = earned.map(function (e) {
      return '<div class="fit-badge' + (e.earned ? ' on' : '') + '"><div class="fit-badge-icon">' + e.badge.icon + '</div>'
        + '<div class="fit-badge-name">' + escHtml(e.badge.name) + '</div>'
        + '<div class="fit-badge-desc">' + escHtml(e.badge.desc) + (e.earned ? '' : '（还差 ' + Math.max(0, e.badge.need - e.value) + '）') + '</div></div>';
    }).join('');
    return ''
      + '<div class="card fit-card">'
      +   '<div class="card-title">🏅 成就徽章 <span style="font-size:12px;color:var(--text-mid)">（连续/累计达标自动点亮）</span></div>'
      +   '<div class="fit-badges">' + items + '</div>'
      + '</div>';
  }

  // ---------- 8. 事件绑定（委托，只绑一次）----------
  var bound = false;
  function bindEvents() {
    if (bound) return; bound = true;
    document.addEventListener('click', function (e) {
      var root = document.getElementById('fitRoot');
      if (!root || !root.contains(e.target)) return; // 仅处理健身区内点击
      var el = e.target.closest('[data-act]');
      if (!el) return;
      var act = el.getAttribute('data-act');
      handleAct(act, el, e);
    });
  }

  function handleAct(act, el, e) {
    switch (act) {
      case 'scene-mode':
        sel.mode = el.getAttribute('data-mode'); sel.previewPlan = null; saveSettings(); renderFitnessModule(); break;
      case 'scene':
        sel.scene = el.getAttribute('data-scene'); sel.detail = null; sel.previewPlan = null; renderFitnessModule(); break;
      case 'scene-detail':
        sel.detail = el.getAttribute('data-detail'); sel.scene = null; sel.previewPlan = null; renderFitnessModule(); break;
      case 'part': {
        var p = el.getAttribute('data-part');
        var i = sel.parts.indexOf(p);
        if (i >= 0) sel.parts.splice(i, 1); else sel.parts.push(p);
        sel.previewPlan = null; renderFitnessModule(); break;
      }
      case 'dur':
        sel.dur = parseInt(el.getAttribute('data-dur'), 10); sel.previewPlan = null; renderFitnessModule(); break;
      case 'recommend': {
        var plan = generatePlan();
        if (!plan) return;
        sel.previewPlan = plan;
        renderFitnessModule();
        toast('已生成专属方案，可填写视频链接后记录～');
        break;
      }
      case 'start-record': {
        if (!sel.previewPlan) { toast('请先生成方案'); return; }
        collectVurls(sel.previewPlan);
        var weight = parseFloat(document.getElementById('fitWeight').value);
        addRecord(sel.previewPlan, { weight: isNaN(weight) ? null : weight });
        // 把方案里填了链接的动作也收进视频库
        collectVideosFromPlan(sel.previewPlan);
        sel.previewPlan = null;
        toast('✓ 已记录本次训练');
        renderFitnessModule();
        break;
      }
      case 'save-plan': {
        if (!sel.previewPlan) { toast('请先生成方案'); return; }
        collectVurls(sel.previewPlan);
        var plans = FIT.load(K.plans, []);
        plans.push({ id: FIT.uid(), type: 'recommended', name: sel.previewPlan.title, createdAt: Date.now(), sections: JSON.parse(JSON.stringify(sel.previewPlan.sections)), parts: sel.previewPlan.parts, durationMin: sel.previewPlan.durationMin });
        FIT.save(K.plans, plans);
        // 顺便把视频收进视频库
        collectVideosFromPlan(sel.previewPlan);
        toast('📥 已保存到计划库');
        renderFitnessModule();
        break;
      }
      case 'open-trainer':
        if (!sel.previewPlan) { toast('请先生成方案'); return; }
        collectVurls(sel.previewPlan);
        openTrainer(sel.previewPlan.sections);
        break;
      case 'open-trainer-rec': {
        var r = findRecord(el.getAttribute('data-rid'));
        if (r) openTrainer(r.sections);
        break;
      }
      case 'edit-record': editRecord(el.getAttribute('data-rid')); break;
      case 'del-record': delRecord(el.getAttribute('data-rid')); break;
      case 'add-plan': addCyclicPlan(); break;
      case 'open-plan': viewPlan(el.getAttribute('data-pid')); break;
      case 'copy-plan': copyPlan(el.getAttribute('data-pid')); break;
      case 'del-plan': delPlan(el.getAttribute('data-pid')); break;
      case 'add-body': addBody(); break;
      case 'del-body': delBody(el.getAttribute('data-bid')); break;
      case 'add-video': addVideo(); break;
      case 'del-video': delVideo(el.getAttribute('data-vid')); break;
      case 'add-exercise': addExercise(); break; // 预留：自定义动作入口
    }
  }

  // 从预览输入框收集视频链接
  function collectVurls(plan) {
    var inputs = document.querySelectorAll('#fitPlanPreview [data-vurl]');
    inputs.forEach(function (inp) {
      var parts = inp.getAttribute('data-vurl').split('-');
      var si = +parts[0], ii = +parts[1];
      if (plan.sections[si] && plan.sections[si].items[ii]) plan.sections[si].items[ii].videoUrl = inp.value.trim();
    });
  }
  // 把方案里的视频收进视频库
  function collectVideosFromPlan(plan) {
    var vids = FIT.load(K.videos, []);
    plan.sections.forEach(function (sec) {
      sec.items.forEach(function (it) {
        if (it.videoUrl && it.videoUrl.indexOf('http') === 0) {
          var part = guessPart(it.name);
          if (!vids.some(function (v) { return v.url === it.videoUrl; }))
            vids.push({ id: FIT.uid(), title: it.name, url: it.videoUrl, part: part });
        }
      });
    });
    FIT.save(K.videos, vids);
  }
  function guessPart(name) {
    var map = [['肩', 'shoulder'], ['胸', 'chest'], ['背', 'back'], ['臂', 'arm'], ['核心', 'core'], ['腰', 'core'], ['臀', 'hip'], ['腿', 'leg'], ['有氧', 'cardio'], ['拉伸', 'stretch']];
    for (var i = 0; i < map.length; i++) if (name.indexOf(map[i][0]) >= 0) return map[i][1];
    return 'full';
  }

  // ---------- 9. 记录 / 计划 操作 ----------
  function findRecord(id) { return getRecords().filter(function (r) { return r.id === id; })[0]; }
  function delRecord(id) {
    confirmDialog('删除这条运动记录？', function () {
      setRecords(getRecords().filter(function (r) { return r.id !== id; }));
      if (window.awardEnergy) window.awardEnergy('fitness', { reverse: true });
      toast('已删除'); renderFitnessModule();
    });
  }
  function editRecord(id) {
    var r = findRecord(id); if (!r) return;
    var body = '<div class="modal-field"><label>星级评价</label><div id="fitStarPick" class="fit-stars-pick">'
      + [1, 2, 3, 4, 5].map(function (n) { return '<span class="fit-star-pick' + (r.star >= n ? ' on' : '') + '" data-star="' + n + '">★</span>'; }).join('') + '</div></div>'
      + '<div class="modal-field"><label>本次负重(kg)</label><input class="modal-input" id="fitEditWeight" type="number" value="' + (r.weight || '') + '" placeholder="选填"></div>'
      + '<div class="modal-field"><label>训练感受</label><textarea class="modal-textarea" id="fitEditFeel" placeholder="今天练得怎么样？">' + escHtml(r.feel || '') + '</textarea></div>';
    showModal('评价这次训练', body, [
      { text: '取消', onClick: closeModalSafe },
      { text: '保存', primary: true, onClick: function () {
        var arr = getRecords();
        var target = arr.filter(function (x) { return x.id === r.id; })[0];
        if (!target) { closeModalSafe(); return; }
        var star = document.querySelector('#fitStarPick .fit-star-pick.on');
        target.star = star ? +star.getAttribute('data-star') : null;
        var w = parseFloat(document.getElementById('fitEditWeight').value);
        target.weight = isNaN(w) ? null : w;
        target.feel = document.getElementById('fitEditFeel').value.trim();
        setRecords(arr);
        closeModalSafe(); toast('已保存评价'); renderFitnessModule();
      } }
    ]);
    // 星级点选
    var picker = document.getElementById('fitStarPick');
    if (picker) picker.querySelectorAll('.fit-star-pick').forEach(function (sp) {
      sp.addEventListener('click', function () {
        picker.querySelectorAll('.fit-star-pick').forEach(function (x) { x.classList.remove('on'); });
        sp.classList.add('on');
      });
    });
  }

  function findPlan(id) { return FIT.load(K.plans, []).filter(function (p) { return p.id === id; })[0]; }
  function delPlan(id) {
    confirmDialog('删除这个计划？', function () {
      FIT.save(K.plans, FIT.load(K.plans, []).filter(function (p) { return p.id !== id; }));
      toast('已删除'); renderFitnessModule();
    });
  }
  function copyPlan(id) {
    var p = findPlan(id); if (!p) return;
    var copy = JSON.parse(JSON.stringify(p));
    copy.id = FIT.uid(); copy.name = p.name + ' (副本)'; copy.createdAt = Date.now();
        var plans = FIT.load(K.plans, []); plans.push(copy); FIT.save(K.plans, plans);
    if (window.awardEnergy) window.awardEnergy('fitness_plan', { count: 2 });
    toast('已复制计划'); renderFitnessModule();
  }
  function viewPlan(id) {
    var p = findPlan(id); if (!p) return;
    var html = '<div class="fit-plan-detail">';
    if (p.type === 'cyclic') {
      html += '<p style="color:var(--text-mid);font-size:13px;">🔁 ' + escHtml(p.name) + '（' + (p.cycle || []).length + ' 天循环）</p>';
      (p.cycle || []).forEach(function (d) {
        html += '<div class="fit-cyc-day"><b>第' + d.day + '天 · ' + escHtml(d.name) + '</b>：'
          + (d.sections || []).reduce(function (a, s) { return a + s.title + '(' + (s.items || []).length + '动作) '; }, '') + '</div>';
      });
    } else {
      p.sections.forEach(function (sec) {
        html += '<div class="fit-sec"><div class="fit-sec-title">' + escHtml(sec.title) + '</div>';
        (sec.items || []).forEach(function (it) {
          html += '<div class="fit-ex"><div class="fit-ex-name">' + escHtml(it.name) + '</div>'
            + '<div class="fit-ex-meta">' + escHtml(it.sets) + ' 组 · ' + escHtml(it.reps) + (it.restSec ? ' · 休息' + it.restSec + 's' : '') + '</div>'
            + (it.videoUrl ? '<a href="' + escHtml(it.videoUrl) + '" target="_blank" class="fit-vid-link">▶ 视频</a>' : '') + '</div>';
        });
        html += '</div>';
      });
    }
    html += '</div>';
    showModal('📋 ' + escHtml(p.name), html, [
      { text: '关闭', onClick: closeModalSafe },
      { text: '⏱ 开始跟练', primary: true, onClick: function () {
        closeModalSafe();
        openTrainer(p.type === 'cyclic' ? flattenCycle(p) : p.sections);
      } }
    ]);
  }
  function flattenCycle(p) {
    // 把循环计划第 1 天展开成 sections 用于倒计时
    var day = (p.cycle || [])[0];
    return day ? day.sections : [];
  }

  // 自定义循环周期计划
  function addCyclicPlan() {
    var body = '<div class="modal-field"><label>计划名称</label><input class="modal-input" id="cycName" placeholder="如：推拉腿三分化"></div>'
      + '<div id="cycDays"></div>'
      + '<button class="btn btn-sm" id="cycAddDay">＋ 添加一天</button>';
    showModal('自定义循环周期计划', body, [
      { text: '取消', onClick: closeModalSafe },
      { text: '保存计划', primary: true, onClick: function () {
        var name = document.getElementById('cycName').value.trim() || '我的循环计划';
        var days = [];
        document.querySelectorAll('#cycDays .cyc-day').forEach(function (row, i) {
          var dname = row.querySelector('.cyc-day-name').value.trim();
          var dparts = row.querySelector('.cyc-day-parts').value.split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean);
          // 用这些部位即时生成一套动作
          var exs = allExercises().filter(function (e) { return e.parts.some(function (p) { return dparts.indexOf(p) >= 0; }); }).slice(0, 6);
          var sections = [{ phase: 'main', title: '正式训练', items: exs.map(function (e) { return { name: e.name, sets: e.sets, reps: e.reps, restSec: e.restSec, note: e.note || '', videoUrl: e.videoUrl || '', done: false }; }) }];
          days.push({ day: i + 1, name: dname || ('第' + (i + 1) + '天'), parts: dparts, sections: sections });
        });
        var plans = FIT.load(K.plans, []);
        plans.push({ id: FIT.uid(), type: 'cyclic', name: name, createdAt: Date.now(), cycle: days });
        FIT.save(K.plans, plans);
        if (window.awardEnergy) window.awardEnergy('fitness_plan');
        closeModalSafe(); toast('已保存循环计划'); renderFitnessModule();
      } }
    ]);
    // 动态增删天
    var addDay = function () {
      var box = document.getElementById('cycDays');
      var row = document.createElement('div');
      row.className = 'cyc-day';
      row.innerHTML = '<input class="modal-input cyc-day-name" placeholder="第N天/名称(如 推)">'
        + '<input class="modal-input cyc-day-parts" placeholder="部位关键词，逗号分隔(如 胸,肩)">'
        + '<button class="btn btn-sm danger cyc-day-del">×</button>';
      row.querySelector('.cyc-day-del').onclick = function () { row.remove(); };
      box.appendChild(row);
    };
    document.getElementById('cycAddDay').onclick = addDay;
    addDay(); addDay(); addDay();
  }

  // ---------- 10. 身体数据 ----------
  function addBody() {
    var get = function (id) { var v = document.getElementById(id).value; return v === '' ? null : parseFloat(v); };
    var photo = null;
    var fileInput = document.getElementById('bfPhoto');
    // 若有图片则先读成 dataURL（异步），读完再存
    function finish(photoData) {
      var b = {
        id: FIT.uid(), date: FIT.today(),
        weight: get('bfWeight'), waist: get('bfWaist'), chest: get('bfChest'),
        hip: get('bfHip'), arm: get('bfArm'), thigh: get('bfThigh'), photo: photoData
      };
      var arr = FIT.load(K.body, []); arr.push(b); FIT.save(K.body, arr);
      if (window.awardEnergy) window.awardEnergy('fitness_body');
      toast('已录入身体数据'); renderFitnessModule();
    }
    if (fileInput && fileInput.files && fileInput.files[0]) {
      var fr = new FileReader();
      fr.onload = function () { finish(fr.result); };
      fr.readAsDataURL(fileInput.files[0]);
    } else { finish(null); }
  }
  function delBody(id) {
    FIT.save(K.body, FIT.load(K.body, []).filter(function (b) { return b.id !== id; }));
    if (window.awardEnergy) window.awardEnergy('fitness_body', { reverse: true });
    toast('已删除'); renderFitnessModule();
  }

  // ---------- 11. 视频库 ----------
  function addVideo() {
    var opts = PARTS.map(function (p) { return '<option value="' + p.id + '">' + escHtml(p.label) + '</option>'; }).join('');
    var body = '<div class="modal-field"><label>标题</label><input class="modal-input" id="vidTitle" placeholder="如：胸肌轰炸跟练"></div>'
      + '<div class="modal-field"><label>链接</label><input class="modal-input" id="vidUrl" placeholder="https://..."></div>'
      + '<div class="modal-field"><label>部位分类</label><select class="modal-input" id="vidPart">' + opts + '</select></div>';
    showModal('添加收藏视频', body, [
      { text: '取消', onClick: closeModalSafe },
      { text: '保存', primary: true, onClick: function () {
        var title = document.getElementById('vidTitle').value.trim();
        var url = document.getElementById('vidUrl').value.trim();
        var part = document.getElementById('vidPart').value;
        if (!url) { toast('请填写链接'); return; }
        var vids = FIT.load(K.videos, []);
        vids.push({ id: FIT.uid(), title: title || url, url: url, part: part });
        FIT.save(K.videos, vids);
        if (window.awardEnergy) window.awardEnergy('fitness_video');
        closeModalSafe(); toast('已收藏'); renderFitnessModule();
      } }
    ]);
  }
  function delVideo(id) {
    FIT.save(K.videos, FIT.load(K.videos, []).filter(function (v) { return v.id !== id; }));
    if (window.awardEnergy) window.awardEnergy('fitness_video', { reverse: true });
    toast('已删除'); renderFitnessModule();
  }

  // ---------- 12. 自定义动作（★ 运行时新增动作）----------
  function addExercise() {
    var partOpts = PARTS.map(function (p) { return '<option value="' + p.id + '">' + escHtml(p.label) + '</option>'; }).join('');
    var sceneOpts = SCENES.map(function (s) { return '<option value="' + s.id + '">' + escHtml(s.label) + '</option>'; }).join('');
    var body = '<div class="modal-field"><label>动作名</label><input class="modal-input" id="exName" placeholder="如：壶铃摇摆"></div>'
      + '<div class="modal-field"><label>部位（可多选，Ctrl/⌘ 多选）</label><select class="modal-input" id="exParts" multiple>' + partOpts + '</select></div>'
      + '<div class="modal-field"><label>场景</label><select class="modal-input" id="exScene">' + sceneOpts + '</select></div>'
      + '<div class="modal-field"><label>组数</label><input class="modal-input" id="exSets" type="number" value="3"></div>'
      + '<div class="modal-field"><label>每组次数</label><input class="modal-input" id="exReps" placeholder="如 12次 / 20分钟"></div>'
      + '<div class="modal-field"><label>组间休息(秒)</label><input class="modal-input" id="exRest" type="number" value="60"></div>'
      + '<div class="modal-field"><label>易错提醒</label><input class="modal-input" id="exNote" placeholder="如：保持背部挺直"></div>';
    showModal('自定义动作', body, [
      { text: '取消', onClick: closeModalSafe },
      { text: '添加', primary: true, onClick: function () {
        var parts = Array.from(document.getElementById('exParts').selectedOptions).map(function (o) { return o.value; });
        if (!parts.length) parts = ['full'];
        var ex = {
          name: document.getElementById('exName').value.trim() || '自定义动作',
          parts: parts,
          scene: [document.getElementById('exScene').value],
          sets: parseInt(document.getElementById('exSets').value, 10) || 3,
          reps: document.getElementById('exReps').value.trim() || '12次',
          restSec: parseInt(document.getElementById('exRest').value, 10) || 60,
          note: document.getElementById('exNote').value.trim(),
          videoUrl: ''
        };
        var arr = FIT.load(K.exercises, []); arr.push(ex); FIT.save(K.exercises, arr);
        if (window.awardEnergy) window.awardEnergy('fitness_exercise');
        closeModalSafe(); toast('已添加自定义动作'); renderFitnessModule();
      } }
    ]);
  }

  // ---------- 13. 训练模式 + 组间倒计时（复用像素计时风格）----------
  // 把方案铺平成「动作队列」，逐个播放；每个动作后按组间休息倒计时
  function openTrainer(sections) {
    var queue = [];
    (sections || []).forEach(function (sec) {
      (sec.items || []).forEach(function (it) {
        queue.push({ name: it.name, sets: it.sets, reps: it.reps, restSec: it.restSec || 0, note: it.note, videoUrl: it.videoUrl });
      });
    });
    if (!queue.length) { toast('该计划没有可训练动作'); return; }
    var idx = 0, restTimer = null;
    var mask = document.createElement('div');
    mask.className = 'modal-mask';
    mask.id = 'fitTrainerMask';
    mask.innerHTML = ''
      + '<div class="modal fit-trainer">'
      +   '<div class="modal-title">⏱ 训练模式 <span id="trProg" style="font-size:12px;color:var(--text-mid)"></span></div>'
      +   '<div id="trBody"></div>'
      +   '<div class="modal-actions"><button class="btn" id="trClose">结束</button></div>'
      + '</div>';
    document.body.appendChild(mask);
    mask.addEventListener('click', function (e) { if (e.target === mask) closeTrainer(); });
    document.getElementById('trClose').onclick = closeTrainer;

    function renderItem() {
      if (restTimer) { clearInterval(restTimer); restTimer = null; }
      if (idx >= queue.length) { document.getElementById('trBody').innerHTML = '<div class="fit-tr-done">🎉 全部完成！太棒了～</div>'; document.getElementById('trProg').textContent = ''; return; }
      var it = queue[idx];
      document.getElementById('trProg').textContent = '（' + (idx + 1) + '/' + queue.length + '）';
      var html = '<div class="fit-tr-item">'
        + '<div class="fit-tr-name">' + escHtml(it.name) + '</div>'
        + '<div class="fit-tr-meta">' + escHtml(it.sets) + ' 组 · ' + escHtml(it.reps) + '</div>'
        + (it.note ? '<div class="fit-ex-note">⚠️ ' + escHtml(it.note) + '</div>' : '')
        + (it.videoUrl ? '<a class="fit-vid-link" href="' + escHtml(it.videoUrl) + '" target="_blank">▶ 看视频</a>' : '')
        + '<div class="fit-tr-timer" id="trTimer" style="display:none;"></div>'
        + '<div class="fit-tr-btns">'
        +   '<button class="btn primary" id="trNext">下一组 / 完成本动作</button>'
        + '</div></div>';
      document.getElementById('trBody').innerHTML = html;
      document.getElementById('trNext').onclick = function () {
        if (it.restSec > 0) startRest(it.restSec); else next();
      };
    }
    function startRest(sec) {
      var box = document.getElementById('trTimer');
      if (!box) { next(); return; }
      box.style.display = 'block';
      var left = sec;
      box.innerHTML = '组间休息 <b>' + left + '</b> 秒';
      if (restTimer) clearInterval(restTimer);
      restTimer = setInterval(function () {
        left--;
        box.innerHTML = '组间休息 <b>' + Math.max(0, left) + '</b> 秒';
        if (left <= 0) { clearInterval(restTimer); restTimer = null; next(); }
      }, 1000);
    }
    function next() { idx++; renderItem(); }
    renderItem();
  }
  function closeTrainer() {
    var m = document.getElementById('fitTrainerMask');
    if (m && m.parentNode) m.parentNode.removeChild(m);
    renderFitnessModule(); // 刷新（训练可能伴随记录变化）
  }

  // 关闭弹窗（本模块 showModal 渲染进 #modalRoot）
  function closeModalSafe() {
    var r = document.getElementById('modalRoot');
    if (r) r.innerHTML = '';
  }

  // ---------- 14. 暴露入口 ----------
  window.renderFitnessModule = renderFitnessModule;
})();
