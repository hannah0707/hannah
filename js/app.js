
/* === app.js === */
/* ============================================
 像素工作台 v3.0 - 主应用
 ============================================ */

(function() {
 'use strict';

 // 加载数据
 const DATA = window.APP_DATA || {};

 // ============================================
 // 数据存储
 // ============================================
 const STORAGE_KEY = 'pixel_workbench_v3';

// ---- 跨设备同步配置（Supabase）----
// 把下面的两个值替换成你自己的 Supabase 项目值（详见 SUPABASE_SETUP.md）
const SYNC_SUPABASE_URL = 'https://yjmkmkbixsnuxvpmjgnz.supabase.co';       // 例：https://xxxx.supabase.co
const SYNC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqbWtta2JpeHNudXh2cG1qZ256Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4Nzg2MjMsImV4cCI6MjEwMTQ1NDYyM30.MP4sDRmBSXoZ-cYn4tmIaxOi52DE6MgL7ZZblNwA0jw';  // Project Settings → API → anon public key
const SYNC_ENABLED = !!(SYNC_SUPABASE_URL && SYNC_SUPABASE_URL.indexOf('http') === 0);

// 同步运行时状态（在 saveData 之前声明，避免 TDZ）
let supabaseClient = null;
let currentRoom = '';
let _pushTimer = null;
const SYNC_ROOM_KEY = 'pixel_sync_room';
try { currentRoom = localStorage.getItem(SYNC_ROOM_KEY) || ''; } catch (e) {}
if (SYNC_ENABLED && typeof window.supabase !== 'undefined') {
  try {
    supabaseClient = window.supabase.createClient(SYNC_SUPABASE_URL, SYNC_SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn('[sync] supabase 初始化失败：', e);
    supabaseClient = null;
  }
}
 const defaultData = {
 nickname: 'Hannah',
 city: '',
 settings: { dailyGoal: 6 },

 mascot: { id: 'av_0a0950', energy: 0 },
 avatar: 'av_0a0950', // 当前选中的像素头像 ID
 customAvatar: null, // 自定义上传头像 (base64)

 checkin: {
 diary: {}, // { '2026-08-02': true }
 reading: {},
 writing: {},
 english: {},
 fitness: {},
 },

 reading: {
 books: [
 { id: 'b1', title: '故事工程', author: '拉里·布鲁克斯', totalPages: 360, cover: '' },
 { id: 'b2', title: '写作风格的意识', author: '斯蒂芬·平克', totalPages: 320, cover: '✍' },
 { id: 'b3', title: '小王子', author: '圣埃克苏佩里', totalPages: 96, cover: '' },
 ],
 logs: [],
 favorites: [],
 bookStatus: { // { bookId: 'reading' | 'finished' | 'wishlist' }
 b1: 'reading',
 b2: 'wishlist',
 b3: 'finished',
 },
 reviews: {}, // { bookId: { rating: 1-5, content: string, updatedAt: ISO } }
 statusFilter: 'all', // 'all' | 'reading' | 'finished' | 'wishlist'
 },

 writing: {
 projects: [
 { id: 'w1', name: '长篇小说《星海》', targetWords: 100000, currentWords: 0, emoji: '' },
 ],
 logs: [],
 },

 schedule: {
 events: {}, // { '2026-08-02': [{id, title, time, desc}] }
 historyPage: 1, // 已加载的历史页数（每页 = 7 天，向前无限滚动）
 historyViewMode: 'today', // 'today' 当天日历 / 'history' 历史浏览
 },

 diary: {
 entries: {}, // { '2026-08-02': { mood, weather, content } }
 filterMood: null, // 当前按心情筛选的 id，null = 不过滤
 filterWeather: null, // 当前按天气筛选的 id，null = 不过滤
 historyPage: 1, // 历史列表已加载页数（每页 10 条）
 historyPickDate: null, // 用户指定的查询日期（picker）
 selectedDate: null, // 日历上当前选中查看的日期（高亮用，重画后保持）
 },

 diaryTabMode: 'today', // 'today' = 写今天 / 'history' = 日历+历史

 english: {
 streak: 0,
 lastDate: null,
 goal: 'CET6',
 wordStates: {}, // { 'spectacle': { box: 2, nextReview: '2026-08-05', lastStatus: 'mastered', lastSeen: '2026-08-02' } }
 newWordIdx: 0, // 下一个新单词在过滤池中的索引
 lastTestMonth: null, // '2026-07' 上次测试的月份
 testHistory: [], // [{ month: '2026-07', score: 85, total: 20, date: '2026-07-31' }]
 },

 fitness: {
 records: [], // { date, scene, part, duration, video }
 },

 // 👥 人才库（人事招聘）：候选人简历集合
 talentPool: {
 candidates: [], // [{ id, name, gender, age, years, position, expectedCity, phone, email, tags:[], source:'import'|'manual', fileName, fileType, fileSize, fileId, rawText, addedAt }]
 lastSearch: '', // 上次检索关键词（恢复使用）
 selectedTags: [], // 多选标签（检索标签多选）
 tagMode: 'or', // 'or' = 任意命中；'and' = 全部命中
 },

 portfolio: [
 {
 id: 'demo1',
 name: '示例：长篇小说《星海》',
 desc: '科幻长篇，讲述星际殖民时代的故事',
 emoji: '',
 subitems: [
 { name: '风格', content: '硬科幻+人文思辨，参考《三体》《基地》' },
 { name: '主题', content: '文明存亡与人性抉择' },
 { name: '地理设定', content: '地球→半人马座α星系，主场景「新伊甸」' },
 { name: '种族设定', content: '人类、合成人、AI意识体、外星智慧生物' },
 { name: '主要人物', content: '林夏（女主，考古学家）、罗恩（男主，AI研究员）' },
 ],
 },
 ],

 finance: {
 records: [
 { id: 1, type: 'expense', amount: 35, category: '餐饮', name: '午餐', date: getDateStr(new Date()) },
 { id: 2, type: 'expense', amount: 12, category: '交通', name: '地铁', date: getDateStr(new Date()) },
 { id: 3, type: 'income', amount: 5000, category: '工资', name: '月薪', date: getDateStr(new Date()) },
 { id: 4, type: 'expense', amount: 88, category: '购物', name: '小说实体书', date: getDateStr(new Date()) },
 ],
 },

 social: [],


 // 番茄钟 / 专注模块
 focus: {
 sessions: [], // 已完成专注记录 { date, startTs, endTs, durationSec, mode:'up'|'cd', plannedSec, energy }
 running: null, // 进行中的计时 { mode, plannedSec, startTs, accumSec, status:'running'|'paused' }
 settings: { mode: 'cd', plannedSec: 1500, activeTab: 'timer' }, // 默认 25 分钟倒计时
 },

 lastBookDate: null,
 lastInspirationDate: null,
 };

 function getDateStr(d) {
 return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
 }

 function loadData() {
 try {
 const raw = localStorage.getItem(STORAGE_KEY);
 if (!raw) return JSON.parse(JSON.stringify(defaultData));
 const parsed = JSON.parse(raw);
 const merged = { ...JSON.parse(JSON.stringify(defaultData)), ...parsed };
 // 一次性迁移：清理旧版失效的 pdfBlobUrl，给候选人补 fileId 字段
 try {
 const cands = merged.talentPool && merged.talentPool.candidates;
 if (Array.isArray(cands)) {
 let mutated = false;
 for (const c of cands) {
 if (c && c.pdfBlobUrl) { delete c.pdfBlobUrl; mutated = true; }
 if (c && c.fileId === undefined) { c.fileId = ''; mutated = true; }
 if (c && c.fileSize === undefined) { c.fileSize = 0; mutated = true; }
 if (c && c.expectedCity === undefined) { c.expectedCity = ''; mutated = true; }
 }
 if (mutated) {
 // 同步回 localStorage（异步避免阻塞 loadData）
 try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch (e) {}
 }
 }
 } catch (e) { /* 静默 */ }
 return merged;
 } catch (e) {
 console.error('Load data error:', e);
 return JSON.parse(JSON.stringify(defaultData));
 }
 }

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Save data error:', e);
  }
  // 跨设备同步：已设同步码则防抖上传到云端
  if (SYNC_ENABLED && supabaseClient && currentRoom) {
    schedulePush();
  }
}

 let state = loadData();

 // ============================================
 // 工具函数
 // ============================================
 function $(sel) { return document.querySelector(sel); }
 function $$(sel) { return document.querySelectorAll(sel); }

 // 数值夹紧（健康/心情限定在 0~100）
 function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

 // 当前时段键（用于推荐系统的上下文场景）
 function getTimeOfDayKey(d) {
 const h = d.getHours();
 if (h >= 6 && h < 11) return 'morning';
 if (h >= 11 && h < 14) return 'noon';
 if (h >= 14 && h < 18) return 'afternoon';
 if (h >= 18 && h < 22) return 'evening';
 return 'night';
 }

 function showModal(title, content, onConfirm, onCancel, options) {
 const root = $('#modalRoot');
 const opts = options || {};
 const confirmText = opts.confirmText || '确认';
 const cancelText = opts.cancelText || '取消';
 const showCancel = opts.showCancel !== false; // 默认显示取消按钮
 root.innerHTML = `
 <div class="modal-mask" id="modalMask">
 <div class="modal">
 <div class="modal-title">${title}</div>
 <div>${content}</div>
 <div class="modal-actions">
 ${showCancel ? '<button class="btn" id="modalCancel">' + cancelText + '</button>' : ''}
 <button class="btn primary" id="modalConfirm">${confirmText}</button>
 </div>
 </div>
 </div>
 `;
 const cancelBtn = $('#modalCancel');
 if (cancelBtn) cancelBtn.onclick = () => { if (onCancel) onCancel(); root.innerHTML = ''; };
 $('#modalMask').onclick = (e) => {
 if (e.target.id === 'modalMask') { if (onCancel) onCancel(); root.innerHTML = ''; }
 };
 if (onConfirm) {
 $('#modalConfirm').onclick = () => {
 const ret = onConfirm();
 if (ret === false) return; // 校验失败：保留弹窗
 root.innerHTML = '';
 };
 }
 }

 function confirmDialog(message, onConfirm, onCancel, options) {
 showModal(
 (options && options.title) || '确认',
 `<div style="font-family: 'Pixelify Sans',sans-serif; font-size: 14px; padding: 10px 0; white-space: pre-line;">${message}</div>`,
 onConfirm,
 onCancel,
 options
 );
 }

 function toast(msg) {
 const t = document.createElement('div');
 t.style.cssText = `
 position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
 background: var(--pink-300); color: var(--on-primary); padding: 12px 20px;
 border: 3px solid var(--text-dark); box-shadow: var(--pixel-shadow);
 font-family: 'Pixelify Sans',sans-serif; font-weight: 700; font-size: 14px;
 z-index: 2000; pointer-events: none;
 `;
 t.textContent = msg;
 document.body.appendChild(t);
 setTimeout(() => t.remove(), 2000);
 }

 // ============================================
 // 视图切换 + 抽屉导航
 // ============================================
 function openNavDrawer() {
 const drawer = $('#navDrawer');
 if (!drawer) return;
 drawer.classList.add('open');
 drawer.setAttribute('aria-hidden', 'false');
 const bd = $('#navDrawerBackdrop');
 if (bd) bd.classList.add('open');
 document.body.style.overflow = 'hidden';
 }
 function closeNavDrawer() {
 const drawer = $('#navDrawer');
 if (!drawer) return;
 drawer.classList.remove('open');
 drawer.setAttribute('aria-hidden', 'true');
 const bd = $('#navDrawerBackdrop');
 if (bd) bd.classList.remove('open');
 document.body.style.overflow = '';
 }
 function toggleNavDrawer() {
 const drawer = $('#navDrawer');
 if (!drawer) return;
 if (drawer.classList.contains('open')) closeNavDrawer();
 else openNavDrawer();
 }

 function switchView(viewName) {
 $$('.nav-item').forEach(item => {
 item.classList.toggle('active', item.dataset.view === viewName);
 });
 $$('.drawer-nav-item').forEach(item => {
 item.classList.toggle('active', item.dataset.view === viewName);
 });
 $$('.view').forEach(v => {
 v.classList.toggle('active', v.id === `view-${viewName}`);
 });
 closeNavDrawer();
 window.scrollTo({ top: 0, behavior: 'smooth' });

 // 作品集桥接：把导航事件转交给作品集模块（portfolio.js 暴露 window.renderPortfolioModule），
 // 同时把原 renderPortfolio 暴露给 window.__origRenderPortfolio，供「作品」Tab 复用（历史数据不丢失）。
 function renderPortfolioBridge() {
 if (!window.__origRenderPortfolio) window.__origRenderPortfolio = renderPortfolio;
 if (typeof window.renderPortfolioModule === 'function') window.renderPortfolioModule();
 else renderPortfolio();
 }

 // 记账桥接：把导航渲染转交给记账模块（finance_app.js 暴露 window.renderFinanceModule），
 // 同时把原 renderFinance 暴露给 window.__origRenderFinance，供兜底复用（历史数据不丢失）。
 function renderFinanceBridge() {
 if (!window.__origRenderFinance) window.__origRenderFinance = renderFinance;
 if (typeof window.renderFinanceModule === 'function') window.renderFinanceModule();
 else renderFinance();
 }

// 健身桥接：把导航渲染转交给健身模块（fitness_app.js 暴露 window.renderFitnessModule），
// 同时把原 renderFitness 暴露给 window.__origRenderFitness，供兜底复用（历史数据不丢失）。
function renderFitnessBridge() {
  if (!window.__origRenderFitness) window.__origRenderFitness = renderFitness;
  if (typeof window.renderFitnessModule === 'function') window.renderFitnessModule();
  else renderFitness();
}

// 日程桥接：把导航渲染转交给日程模块（schedule_app.js 暴露 window.renderScheduleModule），
// 同时把原 renderSchedule 暴露给 window.__origRenderSchedule，供兜底复用（历史数据不丢失）。
function renderScheduleBridge() {
  if (!window.__origRenderSchedule) window.__origRenderSchedule = renderSchedule;
  if (typeof window.renderScheduleModule === 'function') window.renderScheduleModule();
  else renderSchedule();
}

 // 触发各视图渲染
 const renderers = {
 dashboard: renderDashboard,
 schedule: renderScheduleBridge,
 diary: renderDiary,
 reading: renderReading,
 inspiration: renderInspiration,
  english: renderEnglish,
  vision: renderVision,
 fitness: renderFitnessBridge,
 portfolio: renderPortfolioBridge,
 finance: renderFinanceBridge,
  settings: renderSettings,
  focus: renderFocus,
  'talent-pool': renderTalentPool,
  ai: function () { if (window.renderAIModule) window.renderAIModule(); },
 };
 if (renderers[viewName]) renderers[viewName]();
 }

 // ============================================
 // 🏠 主桌面
 // ============================================
 function renderDashboard() {
 const now = new Date();
 const h = now.getHours();
 let timeOfDay = 'morning', greeting = '早安';
 if (h >= 11 && h < 14) { timeOfDay = 'noon'; greeting = '午安'; }
 else if (h >= 14 && h < 18) { timeOfDay = 'afternoon'; greeting = '下午好'; }
 else if (h >= 18 && h < 22) { timeOfDay = 'evening'; greeting = '晚上好'; }
 else if (h >= 22 || h < 6) { timeOfDay = 'night'; greeting = '夜深了'; }

 const name = state.nickname || 'Hannah';
 $('#welcomeText').innerHTML = `${greeting}，<span class="name">${name}</span>～`;

 // 侧边栏头像 + 昵称
 renderSidebarProfile();

 // 文学关怀语录：按时段选，按日期+小时做种子保证同一天不重复
 const msgs = (DATA.LITERARY_GREETINGS && DATA.LITERARY_GREETINGS[timeOfDay]) || ['今天也要加油哦～'];
 const seed = now.getDate() + h + 3;
 const idx = seed % msgs.length;
 $('#welcomeMsg').textContent = msgs[idx];
 $('#welcomeMsg').style.fontStyle = 'italic';

 // 桌面助手（像素头像 PNG 或自定义头像）
 // 注：欢迎卡内的旧 #mascotSprite 已移除（新版宠物是全屏自由走动的边牧 #petSprite）。
 // 这里仅更新数值徽章，不再操作 sprite。
 updateMascotStats();

 // 4个统计
 const today = getDateStr(now);
 const todayEvents = (state.schedule.events[today] || []).length;
 $('#statTodayEvents').textContent = todayEvents;

 const todayReading = state.reading.logs
 .filter(l => l.date === today)
 .reduce((sum, l) => sum + (l.pages || 0), 0);
 $('#statReadingPages').textContent = todayReading;

 const todayWorkout = state.fitness.records
 .filter(r => r.date === today)
 .reduce((sum, r) => sum + (r.duration || 0), 0);
 $('#statWorkoutMin').textContent = todayWorkout;

 const todayWords = state.writing.logs
 .filter(l => l.date === today)
 .reduce((sum, l) => sum + (l.words || 0), 0);
 $('#statWords').textContent = todayWords;

 // 更新统计卡片的图标为三丽鸥风格
 const statCards = $$('.stats-grid .stat-card');
 if (statCards[0]) statCards[0].querySelector('.stat-icon').textContent = ['📅','','',''][new Date().getDate() % 4];
 if (statCards[1]) statCards[1].querySelector('.stat-icon').textContent = ['📚','📖','',''][new Date().getDate() % 4];
 if (statCards[2]) statCards[2].querySelector('.stat-icon').textContent = ['💪','','',''][new Date().getDate() % 4];
 if (statCards[3]) statCards[3].querySelector('.stat-icon').textContent = ['✍','','',''][new Date().getDate() % 4];

 // 首页四宫格数据卡片（待办 / 饮水 / 支出 / 经期）
 renderDesktopTimeline();
}

 // ============================================
 // 🖥 桌面「今日时间线」——内嵌于工作台桌面视图
 // ============================================
 function dtEsc(s) {
   var d = document.createElement('div');
   d.textContent = s == null ? '' : String(s);
   return d.innerHTML;
 }
 function catColorFor(name) {
   var m = { '工作': '#FFB3C6', '学习': '#A0D8F0', '运动': '#A8E6CF', '饮食': '#FFD8A8', '面试': '#D6B3F0', '阅读': '#C9B6F0', '其他': '#D9D9E3' };
   return m[name] || '#D9D9E3';
 }
 function renderDesktopTimeline() {
   var box = document.getElementById('desktopTimeline');
   if (!box) return;
   var today = getDateStr(new Date());
   var events = (window.state && window.state.schedule && window.state.schedule.events[today]) || [];
   events = events.slice().sort(function (a, b) { return (a.startTime || '').localeCompare(b.startTime || ''); });
   if (events.length === 0) {
     box.innerHTML = '<div class="dt-empty">🌿 今天还没有安排，点「＋ 添加日程」规划一下吧～</div>';
     return;
   }
   var now = new Date();
   var curMin = now.getHours() * 60 + now.getMinutes();
   var activeIdx = -1;
   for (var i = 0; i < events.length; i++) {
     var t = events[i].startTime || '00:00';
     var p = t.split(':');
     var m = (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
     if (m <= curMin) activeIdx = i; else break;
   }
   box.innerHTML = events.map(function (e, idx) {
     var color = catColorFor(e.category);
     var done = e.done ? ' done' : '';
     var cur = idx === activeIdx ? ' current' : '';
     return '<div class="dt-item' + done + cur + '" data-evid="' + dtEsc(e.id || '') + '">' +
       '<div class="dt-track"><div class="dt-dot"></div></div>' +
       '<div class="dt-time">' + dtEsc(e.startTime || '') + '</div>' +
       '<button class="dt-check" data-act="toggle" title="标记完成 / 取消完成" aria-label="标记完成">' + (e.done ? '☑' : '☐') + '</button>' +
       '<div class="dt-main">' +
         '<div class="dt-title">' + dtEsc(e.title || '（未命名）') + '</div>' +
       '</div>' +
       '<span class="dt-cat" style="--c:' + color + '">' + dtEsc(e.category || '其他') + '</span>' +
     '</div>';
   }).join('');
   Array.prototype.forEach.call(box.querySelectorAll('.dt-item'), function (el) {
     el.addEventListener('click', function (evt) {
       // 点勾选框：直接切换完成，不打开编辑弹窗
       if (evt.target.closest('.dt-check')) {
         var tid = el.dataset.evid;
         if (window.ScheduleAPI && window.ScheduleAPI.toggleDone) window.ScheduleAPI.toggleDone(tid);
         return;
       }
       // 点其他区域：打开编辑弹窗
       var id = el.dataset.evid;
       var ev = (window.state.schedule.events[today] || []).find(function (x) { return x.id === id; });
       if (ev && window.ScheduleAPI) window.ScheduleAPI.addEvent(today, ev);
     });
   });
 }


 // ============================================
 // 🐶 桌面宠物系统 —— 边牧，自由走动、随机活动、可对话
 // （参考 QQ 宠物：屏幕范围内自由漫步、随机坐下/摆尾/睡觉/转圈，
 // 点击触发互动菜单，再点一次显示对话气泡，
 // 性格活泼黏人，边牧特征爱追、爱摇尾巴、爱用鼻子拱）
 // ============================================

 // 互动动作：消耗能量，提升健康/心情
 var MASCOT_ACTIONS = [
 { id: 'pet', icon: '', name: '摸摸', cost: 5,
 dialogues: ['汪～好舒服～再摸一会儿嘛！', '咕噜咕噜～你最暖啦～', '尾巴摇到要飞起来啦！', '鼻子蹭蹭你的手～', '我喜欢被摸耳朵！'] },
 { id: 'feed', icon: '🦴', name: '喂零食', cost: 10,
 dialogues: ['哇！肉干！我最爱的！', '嚼嚼嚼～谢谢你～', '骨头归我啦！', '我还能再吃十根！', '嘴巴还在嚼别跟我说话~'] },
 { id: 'play', icon: '', name: '丢球玩', cost: 15,
 dialogues: ['汪汪！球球球球！', '冲冲冲！去捡回来啦！', '我抓到啦！', '再来一次！', '球呢？球跑哪去啦？'] },
 { id: 'walk', icon: '', name: '出去遛', cost: 20,
 dialogues: ['耶耶耶！出门啦！', '走走走！', '外面的鸟最可爱了！', '草的味道太香啦！', '我跑得比风还快～'] },
 { id: 'sleep', icon: '', name: '睡觉', cost: 0,
 dialogues: ['呼……ZZZ…', '梦到骨头了…zzz', '耳朵还在听你打字哦…', '别走太远…zzz', '梦里也在摇尾巴…'] },
 ];

 // 边牧性格对话池：按场景 / 心情 / 时段
 var PET_DIALOGUE = {
 random: [
 '汪～', '在干嘛呀？', '陪我玩一会嘛～', '我看见一只蝴蝶啦！', '咕噜咕噜…',
 '摇尾巴摇尾巴～', '你今天看起来心情不错嘛！', '那个本子好香，让我闻闻～',
 '能出门吗？求求了！', '我刚睡醒精神满满！', '今天的太阳好暖和！',
 '汪汪汪！', '偷偷告诉你：我最喜欢你了。', '听说写完稿子就可以遛我？',
 '我帮你把灵感叼回来！', '等你写累了再来摸我。', '我在练习坐下呢～',
 ],
 greeting: [
 '你回来啦！我等你好久！', '汪汪！欢迎回家！', '过来过来让我看看你！',
 '今天辛苦啦～', '来来来～让我闻闻你带了什么味道～',
 ],
 clickNoMenu: [
 '汪？', '干嘛呀～', '嗯？摸我？', '要我做什么呀？', '汪～摸摸我可以，不许凶我哦！',
 ],
 walking: [
 '嗅嗅～这边有味道！', '那是什么？让我去瞧瞧！', '跑跑跑！',
 '我巡视一下领地！', '跟着气味走～',
 ],
 sleep: [
 'ZZZ…', '呼…', '梦里在追兔子…', 'zzz…别走太远…',
 ],
 excited: [
 '汪汪汪汪！', '太开心啦！', '尾巴停不下来啦！', '耶！',
 ],
 missYou: [
 '我好想你呀～', '你在哪里呀～', '快回来陪我嘛～',
 ],
 encouragement: [
 '写稿子不孤单，有我陪你呀！', '累了就抱我一下嘛！', '加油加油！我摇尾巴支持你！',
 '你写的东西一定超好看！', '咕噜咕噜，给你暖手～',
 ],
 byHour: {
 morning: ['早安呀！今天也请多关照～', '伸个懒腰！新的一天开始啦！', '汪～给你叼来一支笔！'],
 noon: ['中午啦！该吃饭啦！', '你饿不饿？我饿了～', '先歇一会嘛～'],
 afternoon:['下午加油！', '要不要喝口水？', '我陪你熬过这阵子！'],
 evening:['天黑啦～', '晚饭吃了吗？', '今天辛苦啦！'],
 night: ['该睡觉啦～', '别熬太晚嘛～', '我也困了…zzz…'],
 },
 };

// ============================================
// 交互数值影响规则（区分类型，各自明确数值）
 // 不同交互行为 → 不同数值变化：能量(energy)/健康(health)/心情(mood)/积分(points)
 // 助手互动消耗能量、提升健康或心情；学习活动正向加成；任务打卡按优先级分配积分。
 // ============================================
var INTERACTION_RULES = {
// 桌面助手互动（消耗能量，提升健康/心情）
pet: { energy: -5, health: 0, mood: +3, label: '抚摸助手' },
feed: { energy: -10, health: +4, mood: +2, label: '喂食助手' },
play: { energy: -15, health: +2, mood: +3, label: '陪玩助手' },
talk: { energy: -20, health: 0, mood: +5, label: '与助手对话' },


// 学习活动（完成即加成，对应不同数值侧重）
read: { energy: +4, health: 0, mood: +2, label: '阅读' },
write: { energy: +4, health: 0, mood: +3, label: '写作' },
english: { energy: +4, health: 0, mood: +1, label: '学英语' },
fitness: { energy: +6, health: +4, mood: +1, label: '健身运动' },
diary: { energy: +4, health: 0, mood: +3, label: '写日记' },

// —— 通用行为能量：按事件难易程度分配（轻量/高频=1~2，中=2~3，重/费时=4~6）——
// 任何正向行为都给能量；误触取消时 reverse:true 退回相应能量（见下方 awardEnergy）。
finance:         { energy: +3, health: 0, mood: +1, label: '记账' },
schedule_add:    { energy: +2, health: 0, mood: 0,  label: '安排日程' },
schedule_done:   { energy: +3, health: 0, mood: +1, label: '完成日程' },
water:           { energy: +1, health: 0, mood: 0,  label: '喝水' },
period:          { energy: +2, health: 0, mood: 0,  label: '记录经期' },
recipe_cook:     { energy: +3, health: 0, mood: 0,  label: '做菜打卡' },
takeout_eat:     { energy: +2, health: 0, mood: 0,  label: '记录用餐' },
vision_read:     { energy: +1, health: 0, mood: 0,  label: '读完资讯' },
vision_fav:      { energy: +1, health: 0, mood: 0,  label: '收藏资讯' },
ai_chat:         { energy: +1, health: 0, mood: +1, label: '与AI对话' },
book_add:        { energy: +2, health: 0, mood: 0,  label: '加入书架' },
book_review:     { energy: +3, health: 0, mood: +1, label: '写书评' },
talent_import:   { energy: +6, health: 0, mood: +2, label: '导入简历' },
talent_add:      { energy: +4, health: 0, mood: +1, label: '新增人才' },
portfolio_add:   { energy: +3, health: 0, mood: +1, label: '创作记录' },
inspiration_add: { energy: +3, health: 0, mood: +1, label: '记录灵感' },
english_word:    { energy: +1, health: 0, mood: 0,  label: '背单词' },
fitness_plan:    { energy: +3, health: 0, mood: 0,  label: '制定训练计划' },
fitness_body:    { energy: +2, health: 0, mood: 0,  label: '录入身体数据' },
fitness_video:   { energy: +1, health: 0, mood: 0,  label: '收藏健身视频' },
fitness_exercise:{ energy: +1, health: 0, mood: 0,  label: '新增自定义动作' },
};

// 统一能量结算（支持批量 count 与撤销 reverse）
// opts: { reverse:Boolean, count:Number, silent:Boolean }
//  - 正向行为给能量；消耗类规则 energy 为负（桌面互动）
//  - 误触取消 → reverse:true 退回相应能量
function awardEnergy(type, opts) {
opts = opts || {};
var rule = INTERACTION_RULES[type];
if (!rule) return null;
var sign = opts.reverse ? -1 : 1;
var mult = (typeof opts.count === 'number' && opts.count > 0) ? opts.count : 1;
var dE = (rule.energy || 0) * sign * mult;
var dH = (rule.health || 0) * sign * mult;
var dM = (rule.mood   || 0) * sign * mult;
var dP = (rule.points || 0) * sign * mult;

var m = state.mascot;
m.energy = Math.max(0, (m.energy || 0) + dE);
m.health = clamp((m.health == null ? 70 : m.health) + dH, 0, 100);
m.mood   = clamp((m.mood   == null ? 70 : m.mood)   + dM, 0, 100);
state.points = (state.points || 0) + dP;
saveData();
updateMascotStats();

// 反馈文案（silent 不弹；notify:false 也不弹，供旧调用保留自身文案）
var notify = opts.notify !== false;
if (!opts.silent && notify && dE !== 0) {
  if (dE > 0) {
    if (sign < 0) toast('↩ 退回 ' + dE + ' 能量');   // 撤销了"消耗类"行为，能量返还
    else toast('⚡ +' + dE + ' 能量');                 // 正向获得
  } else {
    if (sign < 0) toast('↩ 退回 ' + (-dE) + ' 能量');  // 撤销了"获得类"行为，收回能量
    else toast('🐾 消耗 ' + (-dE) + ' 能量（' + (rule.label || '') + '）'); // 桌面互动消耗
  }
}
return { rule: rule, summary: (dE > 0 ? '+' : '') + dE + '能量' };
}

// 兼容旧调用：applyInteraction(type, reverse) —— 不自动弹 toast，沿用调用方自己的文案
function applyInteraction(type, reverse) {
return awardEnergy(type, { reverse: !!reverse, notify: false });
}

 // 同步桌面助手的 能量/健康/心情 三枚徽章显示
 function updateMascotStats() {
 var m = state.mascot;
 var e = $('#mascotEnergy'), h = $('#mascotHealth'), mo = $('#mascotMood');
 if (e) e.textContent = ' ' + (m.energy || 0);
 if (h) h.textContent = ' ' + (m.health == null ? 70 : m.health);
 if (mo) mo.textContent = ' ' + (m.mood == null ? 70 : m.mood);
 }

 // 已迁移到自由走动小狗系统 (startDesktopPet)，旧的下拉菜单废弃。
 function renderMascotMenu() { /* no-op */ }


 function renderSidebarProfile() {
 const avatars = DATA.PIXEL_AVATARS || [];
 const currentAvatar = avatars.find(a => a.id === state.avatar) || avatars[0];
 const src = state.customAvatar || (NAV_ICON_BASE64[currentAvatar.file] ? NAV_ICON_BASE64[currentAvatar.file] : `assets/avatars/${currentAvatar.file}`);
 const name = state.nickname || 'Hannah';

 const avatarEl = $('#sidebarAvatar');
 if (avatarEl) avatarEl.src = src;
 const nick = $('#sidebarNickname');
 if (nick) nick.textContent = name;

 // 同步抽屉导航头像/昵称
 const drawerAvatar = $('#drawerAvatar');
 if (drawerAvatar) drawerAvatar.src = src;
 const drawerName = $('#drawerName');
 if (drawerName) drawerName.textContent = name;
 }



 // ============================================
 // ⏰ 顶部时间
 // ============================================
 function updateTopTime() {
 const now = new Date();
 const h = String(now.getHours()).padStart(2, '0');
 const m = String(now.getMinutes()).padStart(2, '0');
 const s = String(now.getSeconds()).padStart(2, '0');
 const dateStr = `${now.getMonth() + 1}/${now.getDate()} ${['日','一','二','三','四','五','六'][now.getDay()]}`;
 const timeEmojis = ['','','','','','',''];
 const emoji = timeEmojis[now.getHours() % timeEmojis.length];
 const timeEl = $('#topTime');
 if (timeEl) timeEl.textContent = `${h}:${m}:${s}`;
 const greetingEl = $('#topGreeting');
 if (greetingEl) greetingEl.textContent = ` ${state.nickname || 'Hannah'} · ${dateStr} ${emoji}`;
 }

 // ============================================
 // 📅 日程
 // ============================================
 let calYear, calMonth, selectedDate;

 function renderSchedule() {
 const now = new Date();
 calYear = calYear || now.getFullYear();
 calMonth = calMonth || now.getMonth();
 selectedDate = selectedDate || getDateStr(now);
 if (!state.schedule) state.schedule = { events: {}, historyPage: 1, historyViewMode: 'today' };
 if (typeof state.schedule.historyPage !== 'number') state.schedule.historyPage = 1;
 if (!state.schedule.historyViewMode) state.schedule.historyViewMode = 'today';

 const viewMode = state.schedule.historyViewMode;
 const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

 // === 视图顶部 Tab 切换：日历 / 历史浏览 ===
 let html = `
 <div class="schedule-view-tabs">
 <button class="schedule-tab ${viewMode === 'today' ? 'active' : ''}" data-schedtab="today">📅 当天日历</button>
 <button class="schedule-tab ${viewMode === 'history' ? 'active' : ''}" data-schedtab="history"> 历史浏览</button>
 </div>
 `;

 if (viewMode === 'today') {
 html += renderScheduleToday(now, monthNames);
 } else {
 html += renderScheduleHistory(now, monthNames);
 }

 $('#calendar').innerHTML = html;

 // 顶部 Tab 切换
 $$('.schedule-tab').forEach(btn => {
 btn.onclick = () => {
 state.schedule.historyViewMode = btn.dataset.schedtab;
 saveData();
 renderSchedule();
 };
 });

 if (viewMode === 'today') {
 // 当月日历交互
 const prevBtn = $('#prevMonth');
 const nextBtn = $('#nextMonth');
 if (prevBtn) prevBtn.onclick = () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderSchedule(); };
 if (nextBtn) nextBtn.onclick = () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderSchedule(); };

 // 选择某一天
 $$('.cal-day:not(.other-month)').forEach(el => {
 el.onclick = () => {
 selectedDate = el.dataset.date;
 renderSchedule();
 };
 });

 // 「添加日程」按钮（保留原交互）
 const addBtn = $('#addEventBtn');
 if (addBtn) {
 addBtn.onclick = () => openAddEventModal(selectedDate);
 }

 // 「删除日程」按钮
 $$('#calendar .day-event-row .btn.danger').forEach(btn => {
 btn.onclick = () => {
 const idx = parseInt(btn.dataset.idx);
 const events = state.schedule.events[selectedDate] || [];
 events.splice(idx, 1);
 if (events.length === 0) delete state.schedule.events[selectedDate];
 else state.schedule.events[selectedDate] = events;
 saveData();
 renderSchedule();
 };
 });
 } else {
 // === 历史浏览交互 ===
 bindScheduleHistory();
 }
 }

 // 当天日历视图（原 renderSchedule 主体）
 function renderScheduleToday(now, monthNames) {
 const firstDay = new Date(calYear, calMonth, 1);
 const lastDay = new Date(calYear, calMonth + 1, 0);
 const startWeekday = firstDay.getDay();
 const daysInMonth = lastDay.getDate();
 const prevMonthDays = new Date(calYear, calMonth, 0).getDate();

 const today = getDateStr(now);
 let html = `
 <div class="calendar-header">
 <button class="cal-nav-btn" id="prevMonth">◀</button>
 <div class="calendar-title">${calYear}年 ${monthNames[calMonth]}</div>
 <button class="cal-nav-btn" id="nextMonth">▶</button>
 </div>
 <div class="calendar-grid">
 `;
 ['日','一','二','三','四','五','六'].forEach(d => {
 html += `<div class="cal-weekday">${d}</div>`;
 });
 for (let i = startWeekday - 1; i >= 0; i--) {
 const day = prevMonthDays - i;
 html += `<div class="cal-day other-month"><span class="cal-day-num">${day}</span></div>`;
 }
 for (let d = 1; d <= daysInMonth; d++) {
 const ds = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
 const isToday = ds === today;
 const isSelected = ds === selectedDate;
 const hasEvent = (state.schedule.events[ds] || []).length > 0;
 html += `<div class="cal-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasEvent ? 'has-event' : ''}" data-date="${ds}">
 <span class="cal-day-num">${d}</span>
 </div>`;
 }
 const totalCells = startWeekday + daysInMonth;
 const nextDays = (7 - totalCells % 7) % 7;
 for (let i = 1; i <= nextDays; i++) {
 html += `<div class="cal-day other-month"><span class="cal-day-num">${i}</span></div>`;
 }
 html += '</div>';

 // 当天日程（用独立容器 dayEvents）
 const events = state.schedule.events[selectedDate] || [];
 let eventsHtml = `
 <div style="display:flex; align-items:center; gap:10px; margin-top:8px;">
 <div class="card-title" style="margin:0; border:none; padding:0;">📌 选中日期：<span id="selectedDate">${selectedDate}</span></div>
 <span class="diary-day-pill ${selectedDate === today ? 'today-pill' : ''}">${selectedDate === today ? '今天' : weekdayOf(selectedDate)}</span>
 </div>
 <div id="dayEventsInner"></div>
 <button class="btn primary" id="addEventBtn" style="margin-top: 12px;">+ 添加日程</button>
 `;
 let inner = '';
 if (events.length === 0) {
 inner = '<div class="empty-state">这一天还没有安排~</div>';
 } else {
 inner = events.map((e, idx) => `
 <div class="day-event-row urgency-row-${e.urgency || 'medium'}">
 <div class="day-event-side">${urgencyDot(e.urgency)}</div>
 <div class="day-event-main">
 <div class="day-event-time">${escapeHtml(e.time)} ${urgencyBadge(e.urgency)}</div>
 <div class="day-event-title">${escapeHtml(e.title)}</div>
 ${e.desc ? `<div class="day-event-desc">${escapeHtml(e.desc)}</div>` : ''}
 </div>
 <button class="btn danger" data-idx="${idx}" style="font-size: 11px; padding: 4px 8px;">删</button>
 </div>
 `).join('');
 }
 html += `<div class="day-events-wrap" id="dayEventsWrap">${eventsHtml.replace('<div id="dayEventsInner"></div>', `<div id="dayEventsInner">${inner}</div>`)}</div>`;

 return html;
 }

 // 历史浏览视图：日期选择器 + 向前无限滚动
 function renderScheduleHistory(now, monthNames) {
 // 收集所有有日程的日期（排序倒序：最新在上）
 const allDates = Object.keys(state.schedule.events)
 .filter(d => (state.schedule.events[d] || []).length > 0)
 .sort((a, b) => b.localeCompare(a));

 // 总数
 const totalDays = allDates.length;
 // 向上滚动加载：每次拉出 7 天
 const PAGE_SIZE = 7;
 const loaded = Math.min(totalDays, (state.schedule.historyPage || 1) * PAGE_SIZE);
 const visibleDates = allDates.slice(0, loaded);

 // 头部：日期选择器 + 统计
 let html = `
 <div class="schedule-history-toolbar">
 <div class="schedule-picker-wrap">
 <label class="schedule-picker-label">📅 跳到指定日期：</label>
 <input type="date" id="schedulePickDate" class="schedule-picker-input" value="${selectedDate}">
 <button class="btn" id="schedulePickBtn">跳转</button>
 </div>
 <div class="schedule-history-stats">
 <span class="history-stat-chip">📊 共 <strong>${totalDays}</strong> 天有日程</span>
 <span class="history-stat-chip">📋 累计 <strong>${Object.values(state.schedule.events).reduce((s, arr) => s + arr.length, 0)}</strong> 条</span>
 </div>
 </div>
 <div class="schedule-history-list" id="scheduleHistoryList">
 `;

 if (visibleDates.length === 0) {
 html += `<div class="empty-state"><span class="empty-state-icon"></span>还没有任何历史日程，先在「当天日历」添加一条吧～</div>`;
 } else {
 visibleDates.forEach(ds => {
 const events = state.schedule.events[ds] || [];
 const isToday = ds === getDateStr(now);
 html += `
 <div class="history-day-block" data-date="${ds}">
 <div class="history-day-header">
 <span class="history-day-date">${ds}</span>
 <span class="history-day-tag ${isToday ? 'today-tag' : ''}">${isToday ? '今天' : weekdayOf(ds)}</span>
 <span class="history-day-count">${events.length} 条日程</span>
 </div>
 <div class="history-day-events">
 ${events.map(e => `
 <div class="history-event-row urgency-row-${e.urgency || 'medium'}">
 <span class="urgency-dot urgency-dot-${e.urgency || 'medium'}" style="background:${(URGENCY_META[e.urgency || 'medium'] || URGENCY_META.medium).color};"></span>
 <span class="history-event-time">${escapeHtml(e.time)}</span>
 <span class="history-event-title">${escapeHtml(e.title)}</span>
 ${urgencyBadge(e.urgency)}
 ${e.desc ? `<span class="history-event-desc">${escapeHtml(e.desc)}</span>` : ''}
 </div>
 `).join('')}
 </div>
 </div>
 `;
 });

 // 加载更多触发器
 if (loaded < totalDays) {
 html += `<div class="history-load-more" id="historyLoadMore">
 <button class="btn" id="loadMoreHistoryBtn">📥 加载更早的日程（剩余 ${totalDays - loaded} 天）</button>
 </div>`;
 } else {
 html += `<div class="history-end-mark">— 已显示全部历史日程 —</div>`;
 }
 }

 html += `</div>`;
 return html;
 }

 // 绑定历史视图的事件（每次重渲染后调用）
 function bindScheduleHistory() {
 const pickBtn = $('#schedulePickBtn');
 const pickInput = $('#schedulePickDate');
 if (pickBtn && pickInput) {
 pickBtn.onclick = () => {
 const v = pickInput.value;
 if (!v) { toast('请先选一个日期'); return; }
 selectedDate = v;
 // 滚动到对应 block
 const target = document.querySelector(`.history-day-block[data-date="${v}"]`);
 if (target) {
 target.scrollIntoView({ behavior: 'smooth', block: 'start' });
 target.classList.add('history-flash');
 setTimeout(() => target.classList.remove('history-flash'), 1500);
 toast(` 已定位到 ${v}`);
 } else {
 // 该日期没日程 → 切回 today tab 并选中该日期
 if (Object.keys(state.schedule.events).includes(v)) {
 toast(`${v} 暂无日程记录`);
 } else {
 toast(`${v} 无日程，切回日历视图`);
 state.schedule.historyViewMode = 'today';
 saveData();
 renderSchedule();
 }
 }
 };
 // 输入变化时实时联动滚动
 pickInput.onchange = () => {
 const v = pickInput.value;
 if (!v) return;
 const target = document.querySelector(`.history-day-block[data-date="${v}"]`);
 if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
 };
 }

 const loadMoreBtn = $('#loadMoreHistoryBtn');
 if (loadMoreBtn) {
 loadMoreBtn.onclick = () => {
 state.schedule.historyPage = (state.schedule.historyPage || 1) + 1;
 saveData();
 renderSchedule();
 // 滚到新加载的最早一条
 setTimeout(() => {
 const list = $('#scheduleHistoryList');
 if (list) {
 const first = list.querySelector('.history-day-block');
 if (first) first.scrollIntoView({ behavior: 'smooth', block: 'start' });
 }
 }, 60);
 };
 }
 }

 // 中文星期
 function weekdayOf(dateStr) {
 const d = new Date(dateStr);
 const w = ['日','一','二','三','四','五','六'][d.getDay()];
 return `周${w}`;
 }

 // 日程紧急度 → 视觉徽章（HTML 片段）
 const URGENCY_META = {
 low: { label: '低', emoji: '🟢', color: 'var(--accent-green)', bg: 'color-mix(in srgb, var(--accent-green) 30%, var(--bg-card))' },
 medium: { label: '中', emoji: '🟡', color: 'var(--accent-yellow)', bg: 'color-mix(in srgb, var(--accent-yellow) 35%, var(--bg-card))' },
 high: { label: '高', emoji: '🔴', color: 'var(--danger)', bg: 'color-mix(in srgb, var(--primary) 35%, var(--bg-card))' },
 };
 function urgencyBadge(u) {
 const meta = URGENCY_META[u] || URGENCY_META.medium;
 return `<span class="urgency-badge urgency-${u || 'medium'}" title="紧急度：${meta.label}">${meta.emoji}${meta.label}</span>`;
 }
 function urgencyDot(u) {
 const meta = URGENCY_META[u] || URGENCY_META.medium;
 return `<span class="urgency-dot urgency-dot-${u || 'medium'}" style="background:${meta.color};" title="紧急度：${meta.label}"></span>`;
 }

 // 抽出添加日程弹窗（保留原有交互不变）
 function openAddEventModal(targetDate) {
 showModal('添加日程', `
 <div class="modal-field">
 <label class="modal-label">时间</label>
 <input class="modal-input" id="evtTime" placeholder="例如 14:00" value="09:00">
 </div>
 <div class="modal-field">
 <label class="modal-label">标题</label>
 <input class="modal-input" id="evtTitle" placeholder="日程标题">
 </div>
 <div class="modal-field">
 <label class="modal-label">紧急程度</label>
 <div class="urgency-picker" id="evtUrgencyPicker">
 <button type="button" class="urgency-pick urgency-low" data-urgency="low">🟢 低</button>
 <button type="button" class="urgency-pick urgency-medium selected" data-urgency="medium">🟡 中</button>
 <button type="button" class="urgency-pick urgency-high" data-urgency="high">🔴 高</button>
 </div>
 <input type="hidden" id="evtUrgency" value="medium">
 </div>
 <div class="modal-field">
 <label class="modal-label">备注（可选）</label>
 <textarea class="modal-textarea" id="evtDesc" placeholder="详细说明"></textarea>
 </div>
 `, () => {
 const time = $('#evtTime').value || '09:00';
 const title = $('#evtTitle').value.trim();
 const desc = $('#evtDesc').value.trim();
 const urgency = $('#evtUrgency').value || 'medium';
 if (!title) { toast('请输入标题'); return; }
 if (!state.schedule.events[targetDate]) state.schedule.events[targetDate] = [];
 state.schedule.events[targetDate].push({ time, title, desc, urgency });
 saveData();
 renderSchedule();
 toast('✓ 已添加');
 });

 // 紧急度选择器：点击高亮 + 同步到 hidden 输入
 const picker = $('#evtUrgencyPicker');
 if (picker) {
 picker.querySelectorAll('.urgency-pick').forEach(btn => {
 btn.onclick = () => {
 picker.querySelectorAll('.urgency-pick').forEach(b => b.classList.remove('selected'));
 btn.classList.add('selected');
 $('#evtUrgency').value = btn.dataset.urgency;
 };
 });
 }
 }

 // ============================================
 // 📖 日记
 // ============================================
 // 心情：每条带 id / emoji / label / category（积极/中性/消极）/ score（用于计算情绪得分）
  const MOOD_LIST = [
    { id: 'happy',    emoji: '😊', label: '开心',   category: 'positive', score: +1 },
    { id: 'joyful',   emoji: '😄', label: '快乐',   category: 'positive', score: +2 },
    { id: 'loved',    emoji: '🥰', label: '幸福',   category: 'positive', score: +2 },
    { id: 'calm',     emoji: '😌', label: '平静',   category: 'positive', score: +1 },
    { id: 'excited',  emoji: '😍', label: '兴奋',   category: 'positive', score: +2 },
    { id: 'cool',     emoji: '😎', label: '自信',   category: 'positive', score: +1 },
    { id: 'sleepy',   emoji: '😴', label: '疲惫',   category: 'neutral',  score: -1 },
    { id: 'thinking', emoji: '🤔', label: '沉思',   category: 'neutral',  score:  0 },
    { id: 'pout',     emoji: '🥺', label: '委屈',   category: 'negative', score: -1 },
    { id: 'sad',      emoji: '😔', label: '失落',   category: 'negative', score: -1 },
    { id: 'cry',      emoji: '😢', label: '难过',   category: 'negative', score: -2 },
    { id: 'angry',    emoji: '😡', label: '愤怒',   category: 'negative', score: -2 },
  ];
  const MOOD_BY_ID = {};
  const MOOD_BY_EMOJI = {};
  MOOD_LIST.forEach(m => { MOOD_BY_ID[m.id] = m; MOOD_BY_EMOJI[m.emoji] = m; });

 // 天气：每条带 id / emoji / label / category（晴朗/降水/恶劣）
 const WEATHER_LIST = [
 { id: 'sunny', emoji: '', label: '晴', category: 'sunny', score: 0 },
 { id: 'cloudy', emoji: '', label: '多云', category: 'sunny', score: 0 },
 { id: 'rainy', emoji: '', label: '雨', category: 'rainy', score: -1 },
 { id: 'snowy', emoji: '', label: '雪', category: 'rainy', score: 0 },
 { id: 'fog', emoji: '', label: '雾', category: 'rainy', score: -1 },
 { id: 'windy', emoji: '', label: '大风', category: 'storm', score: 0 },
 { id: 'thunder',emoji: '', label: '雷', category: 'storm', score: -2 },
 { id: 'hot', emoji: '', label: '高温', category: 'storm', score: -1 },
 ];
 const WEATHER_BY_ID = {};
 WEATHER_LIST.forEach(w => { WEATHER_BY_ID[w.id] = w; });

 // 根据 id 或遗留 emoji 获取心情对象；找不到则回退到 emoji 字符串或默认
 function getMoodObj(val) {
 if (!val) return null;
    return MOOD_BY_ID[val] || MOOD_BY_EMOJI[val] || null;
 }
 function getMoodEmoji(val) {
 const m = getMoodObj(val);
    if (m) return m.emoji;
 // 未知值：可能是遗留 emoji 字符串
 return val || '';
 }
 function getMoodLabel(val) {
 const m = getMoodObj(val);
 if (m) return m.label;
 return '';
 }
 function getMoodCategory(val) {
 const m = getMoodObj(val);
 return m ? m.category : 'unknown';
 }

 // 一次性迁移：把历史日记里的 emoji 形式 mood 转成 id；weather 已是 id，无需迁移
 function migrateDiaryEntries() {
 if (!state.diary || !state.diary.entries) return;
 let changed = false;
 Object.keys(state.diary.entries).forEach(date => {
 const e = state.diary.entries[date];
      if (e && e.mood && !MOOD_BY_ID[e.mood] && MOOD_BY_EMOJI[e.mood]) {
        e.mood = MOOD_BY_EMOJI[e.mood].id;
 changed = true;
 }
 });
 if (changed) saveData();
 }

 // 计算日记统计（基于全部 entries 或筛选后的子集）
 // 返回：{ totalDays, moodCounts:{id:count}, weatherCounts:{id:count}, moodScoreAvg, topMood, topWeather, correlation: { moodId: { weatherId: count } } }
 function computeDiaryStats(entriesObj) {
 const entries = Object.values(entriesObj || {});
 const moodCounts = {};
 const weatherCounts = {};
 const correlation = {};
 let totalScore = 0, scoreCount = 0;
 entries.forEach(e => {
      const m = e.mood ? MOOD_BY_ID[e.mood] : null;
 const w = e.weather ? WEATHER_BY_ID[e.weather] : null;
 if (m) {
 moodCounts[m.id] = (moodCounts[m.id] || 0) + 1;
 totalScore += m.score; scoreCount++;
 }
 if (w) {
 weatherCounts[w.id] = (weatherCounts[w.id] || 0) + 1;
 }
 if (m && w) {
 correlation[m.id] = correlation[m.id] || {};
 correlation[m.id][w.id] = (correlation[m.id][w.id] || 0) + 1;
 }
 });

 const topMood = Object.keys(moodCounts).sort((a,b) => moodCounts[b]-moodCounts[a])[0] || null;
 const topWeather = Object.keys(weatherCounts).sort((a,b) => weatherCounts[b]-weatherCounts[a])[0] || null;

 // 心情×天气最常共现
 let bestCombo = null, bestComboCount = 0;
 Object.keys(correlation).forEach(mid => {
 Object.keys(correlation[mid]).forEach(wid => {
 if (correlation[mid][wid] > bestComboCount) {
 bestComboCount = correlation[mid][wid];
 bestCombo = { mood: mid, weather: wid };
 }
 });
 });

 return {
 totalDays: entries.length,
 moodCounts, weatherCounts, correlation,
 moodScoreAvg: scoreCount ? (totalScore / scoreCount) : 0,
 topMood, topWeather,
 bestCombo, bestComboCount,
 };
 }

 // 日记日历的当前显示月份（独立于日程的日历）
 let diaryCalYear = new Date().getFullYear();
 let diaryCalMonth = new Date().getMonth(); // 0-based

 function renderDiary() {
 const today = getDateStr(new Date());
 const entry = state.diary.entries[today] || { mood: '', weather: '', content: '' };

 // 双 Tab 切换：「今天」/「日记」
 const tabMode = state.diaryTabMode || 'today';
 $$('.diary-tab').forEach(tab => {
 tab.classList.toggle('active', tab.dataset.diarytab === tabMode);
 });
 const panelToday = $('#diaryPanelToday');
 const panelHistory = $('#diaryPanelHistory');
 if (panelToday) panelToday.style.display = (tabMode === 'today') ? '' : 'none';
 if (panelHistory) panelHistory.style.display = (tabMode === 'history') ? '' : 'none';
 $$('.diary-tab').forEach(tab => {
 tab.onclick = () => {
 state.diaryTabMode = tab.dataset.diarytab;
 saveData();
 renderDiary();
 };
 });

    $('#moodPicker').innerHTML = MOOD_LIST.map(m => `
      <div class="mood-pick ${entry.mood === m.id ? 'selected' : ''}" data-mood="${m.id}" title="${m.label}（${m.category==='positive'?'积极':m.category==='negative'?'消极':'中性'}）">${m.emoji}</div>
 `).join('');
 $('#weatherPicker').innerHTML = WEATHER_LIST.map(w => `
 <div class="weather-pick ${entry.weather === w.id ? 'selected' : ''}" data-weather="${w.id}" title="${w.label}（${w.category==='sunny'?'晴朗':w.category==='rainy'?'降水':'恶劣'}）">${w.emoji} ${w.label}</div>
 `).join('');
 $('#diaryContent').value = entry.content;
 const todayLabel = $('#diaryTodayLabel');
 if (todayLabel) todayLabel.textContent = today;

 // 渲染日记日历总览（仅在 history Tab 才可见，但数据先准备好）
 renderDiaryCalendar();
 renderDiaryFilters();
 renderDiaryStats();
 renderDiaryTagEditor();
 renderDiaryTimeBar();
 renderDiaryTagFilterBar();

 $$('.mood-pick').forEach(el => {
 el.onclick = () => {
 const m = el.dataset.mood;
 // 写入当前已输入的正文，避免与文本框内容脱节（防止编辑/日历数据不同步）
 if (!state.diary.entries[today]) state.diary.entries[today] = { mood: '', weather: '', content: $('#diaryContent').value };
 state.diary.entries[today].mood = m;
 saveData();
 // 只更新选中态与日历，避免整面板重渲染时清空正在输入的文本框
 $$('.mood-pick').forEach(p => p.classList.toggle('selected', p.dataset.mood === m));
 renderDiaryCalendar();
 };
 });
 $$('.weather-pick').forEach(el => {
 el.onclick = () => {
 const w = el.dataset.weather;
 if (!state.diary.entries[today]) state.diary.entries[today] = { mood: '', weather: '', content: $('#diaryContent').value };
 state.diary.entries[today].weather = w;
 saveData();
 $$('.weather-pick').forEach(p => p.classList.toggle('selected', p.dataset.weather === w));
 renderDiaryCalendar();
 };
 });

 // 自动保存
 let saveTimer;
 $('#diaryContent').oninput = (e) => {
 $('#diarySaveStatus').textContent = '正在保存...';
 clearTimeout(saveTimer);
 saveTimer = setTimeout(() => {
 if (!state.diary.entries[today]) state.diary.entries[today] = { mood: '', weather: '', content: '' };
 const cur = state.diary.entries[today];
 cur.content = e.target.value;
 // 首次输入时自动补默认心情/天气
        if (!cur.mood) cur.mood = MOOD_LIST[0].id;
 if (!cur.weather) cur.weather = WEATHER_LIST[0].id;
 saveData();
 $('#diarySaveStatus').textContent = '✓ 已自动保存';
 // 把自动补上的默认值同步回选择器高亮，否则日历有表情、选择器却空着（数据不同步）
 $$('.mood-pick').forEach(p => p.classList.toggle('selected', p.dataset.mood === cur.mood));
 $$('.weather-pick').forEach(p => p.classList.toggle('selected', p.dataset.weather === cur.weather));
 // 重画日历/统计/历史，让"按日期查看"入口立刻可用且计数准确
 // （注意：不调用 renderDiary()，否则会重置正在输入的文本框）
 renderDiaryCalendar();
 renderDiaryStats();
 renderDiaryHistorySection();
 }, 800);
 };

 $('#diaryCheckinBtn').onclick = () => {
 // 关键：实时读取最新状态，不能用渲染时捕获的 entry 快照
 // （否则「刚输入完正文就打卡」会因为快照仍是空对象而误报"请先写点什么"）
 const liveEntry = state.diary.entries[today] || { mood: '', weather: '', content: '' };
 const liveText = ($('#diaryContent') && $('#diaryContent').value) || liveEntry.content || '';
 if (!liveText.trim() && !liveEntry.mood) { toast('请先写点什么吧~'); return; }
 // 打卡前把文本框里尚未防抖落盘的内容立即持久化，避免日历/历史与正文脱节
 if (liveText.trim()) {
 if (!state.diary.entries[today]) state.diary.entries[today] = { mood: '', weather: '', content: '' };
 state.diary.entries[today].content = liveText;
        if (!state.diary.entries[today].mood) state.diary.entries[today].mood = MOOD_LIST[0].id;
 if (!state.diary.entries[today].weather) state.diary.entries[today].weather = WEATHER_LIST[0].id;
 }
 state.checkin.diary[today] = !state.checkin.diary[today];
 saveData();
if (state.checkin.diary[today]) {
var r = applyInteraction('diary');
updateMascotStats();
toast('✓ 打卡成功！' + (r ? r.summary : ''));
} else {
// 误触取消打卡 → 退回相应能量
awardEnergy('diary', { reverse: true });
toast('已取消打卡');
}
 // 打卡后同步刷新日历/统计/历史：刚落盘的今日日记要立刻能在日历上点开查看
 $$('.mood-pick').forEach(p => p.classList.toggle('selected', p.dataset.mood === (state.diary.entries[today] || {}).mood));
 $$('.weather-pick').forEach(p => p.classList.toggle('selected', p.dataset.weather === (state.diary.entries[today] || {}).weather));
 renderDiaryCalendar();
 renderDiaryStats();
 renderDiaryHistorySection();
 };

 // 月份翻页
 const prevBtn = $('#diaryPrevMonth');
 const nextBtn = $('#diaryNextMonth');
 if (prevBtn) prevBtn.onclick = () => { diaryCalMonth--; if (diaryCalMonth < 0) { diaryCalMonth = 11; diaryCalYear--; } renderDiaryCalendar(); };
 if (nextBtn) nextBtn.onclick = () => { diaryCalMonth++; if (diaryCalMonth > 11) { diaryCalMonth = 0; diaryCalYear++; } renderDiaryCalendar(); };

 // 清除筛选
 const clearBtn = $('#diaryClearFilterBtn');
 if (clearBtn) clearBtn.onclick = () => {
 state.diary.filterMood = null;
 state.diary.filterWeather = null;
 saveData();
 renderDiaryFilters();
 renderDiaryCalendar();
 renderDiaryStats();
 renderDiaryHistorySection();
 };

 // 历史（最近 50 条，按筛选过滤）
 renderDiaryHistorySection();
 }

 // 渲染日记日历总览：每一天格子上显示当天的「心情 + 天气」小标签
 function renderDiaryCalendar() {
 const grid = $('#diaryCalGrid');
 const title = $('#diaryCalTitle');
 if (!grid || !title) return;
 const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
 title.textContent = `${diaryCalYear} 年 ${monthNames[diaryCalMonth]}`;

 const firstDay = new Date(diaryCalYear, diaryCalMonth, 1);
 const startWeekday = firstDay.getDay(); // 0=日
 const daysInMonth = new Date(diaryCalYear, diaryCalMonth + 1, 0).getDate();
 const prevMonthDays = new Date(diaryCalYear, diaryCalMonth, 0).getDate();
 const today = getDateStr(new Date());

 let html = '';
 ['日','一','二','三','四','五','六'].forEach(d => {
 html += `<div class="dcal-weekday">${d}</div>`;
 });

 // 上月尾巴
 for (let i = startWeekday - 1; i >= 0; i--) {
 const day = prevMonthDays - i;
 html += `<div class="dcal-cell other-month"><span class="dcal-num">${day}</span></div>`;
 }

 // 当月
 for (let d = 1; d <= daysInMonth; d++) {
 const ds = `${diaryCalYear}-${String(diaryCalMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
 const e = state.diary.entries[ds];
 const hasEntry = !!e;
 const isToday = ds === today;
 const moodObj = hasEntry ? getMoodObj(e.mood) : null;
 const moodEmoji = moodObj ? moodObj.emoji : (hasEntry && e.mood ? e.mood : '');
 const moodCat = moodObj ? moodObj.category : '';
 const weatherObj = hasEntry ? WEATHER_BY_ID[e.weather] : null;
 const weatherEmoji = weatherObj ? weatherObj.emoji : '';
 // 当前筛选条件：是否命中
 const matchFilter = (!state.diary.filterMood || (e && e.mood === state.diary.filterMood))
 && (!state.diary.filterWeather || (e && e.weather === state.diary.filterWeather));
 const classes = ['dcal-cell'];
 if (isToday) classes.push('today');
 if (hasEntry) classes.push('has-entry');
 // 选中态要写进渲染结果，否则每次重画（保存/打卡/翻月）高亮就丢了
 if (state.diary.selectedDate === ds) classes.push('selected');
 if (hasEntry && moodCat) classes.push('mood-' + moodCat);
 if ((state.diary.filterMood || state.diary.filterWeather) && !matchFilter) classes.push('filtered-out');
 html += `
 <div class="${classes.join(' ')}" data-date="${ds}" title="${hasEntry ? ds + ' · 心情/天气' : ds}">
 <span class="dcal-num">${d}</span>
 ${hasEntry ? `
 <div class="dcal-tags">
 <span class="dcal-mood">${moodEmoji}</span>
 <span class="dcal-weather">${weatherEmoji}</span>
 </div>
 <span class="dcal-view-hint" aria-hidden="true">›</span>` : ''}
 </div>`;
 }

 // 下月开头
 const totalCells = startWeekday + daysInMonth;
 const nextDays = (7 - totalCells % 7) % 7;
 for (let i = 1; i <= nextDays; i++) {
 html += `<div class="dcal-cell other-month"><span class="dcal-num">${i}</span></div>`;
 }

 grid.innerHTML = html;
 // 日历格子点击：有日记的日期 → 打开该日详情；无日记 → 轻提示
 // 这样「编辑保存后点击日历查看对应日期日记」在编辑前后都能稳定工作
 grid.querySelectorAll('.dcal-cell[data-date]').forEach(cell => {
 const ds = cell.dataset.date;
 cell.style.cursor = 'pointer';
 cell.onclick = () => {
 // 统一：无论有无日记，都把"当前查看日期"同步到历史面板，保证日历与列表不脱节
 grid.querySelectorAll('.dcal-cell.selected').forEach(c => c.classList.remove('selected'));
 cell.classList.add('selected');
 state.diary.selectedDate = ds;
 state.diary.historyPickDate = ds;
 saveData();
 // 每次点击都实时读取最新数据，编辑保存前后行为一致
 const entry = state.diary.entries[ds];
 if (entry) {
 renderDiaryHistorySection(); // 列表定位到该日期
 openDiaryDetail(ds); // 弹出该日详情
 } else {
 // 没有日记的日期：切到「日记」Tab 并定位，给出轻提示
 state.diaryTabMode = 'history';
 switchView('diary');
 toast(ds + ' 这一天还没有写日记～');
 }
 };
 });
 }

 // 渲染"选中日期"编辑面板：显示在日记日历下方，可编辑该日心情/天气/内容

 // 渲染心情/天气筛选 chip（带实时计数 + 当前选中高亮）
 function renderDiaryFilters() {
 const moodBar = $('#diaryMoodFilter');
 const weatherBar = $('#diaryWeatherFilter');
 if (!moodBar || !weatherBar) return;

 const stats = computeDiaryStats(state.diary.entries);
 const fm = state.diary.filterMood;
 const fw = state.diary.filterWeather;

 // 心情 chips
 let moodHtml = '<span class="filter-label">按心情：</span>';
 moodHtml += `<button class="filter-chip ${!fm ? 'selected' : ''}" data-mood-filter="">全部</button>`;
    MOOD_LIST.forEach(m => {
 const cnt = stats.moodCounts[m.id] || 0;
 if (cnt === 0 && fm !== m.id) return; // 没数据且未选就不显示，避免噪音
      moodHtml += `<button class="filter-chip mood-cat-chip mood-cat-${m.category} ${fm === m.id ? 'selected' : ''}" data-mood-filter="${m.id}" title="${m.label} · ${cnt} 次">${m.emoji} ${m.label} <span class="chip-count">${cnt}</span></button>`;
 });

 // 天气 chips
 let weatherHtml = '<span class="filter-label">按天气：</span>';
 weatherHtml += `<button class="filter-chip ${!fw ? 'selected' : ''}" data-weather-filter="">全部</button>`;
 WEATHER_LIST.forEach(w => {
 const cnt = stats.weatherCounts[w.id] || 0;
 if (cnt === 0 && fw !== w.id) return;
 weatherHtml += `<button class="filter-chip weather-cat-${w.category} ${fw === w.id ? 'selected' : ''}" data-weather-filter="${w.id}" title="${w.label} · ${cnt} 次">${w.emoji} ${w.label} <span class="chip-count">${cnt}</span></button>`;
 });

 moodBar.innerHTML = moodHtml;
 weatherBar.innerHTML = weatherHtml;

 // 绑定 chip 点击：切换 filter → 重渲染日历 + 历史 + 统计
 moodBar.querySelectorAll('[data-mood-filter]').forEach(btn => {
 btn.onclick = () => {
 const v = btn.dataset.moodFilter;
 state.diary.filterMood = v || null;
 saveData();
 renderDiaryFilters();
 renderDiaryCalendar();
 renderDiaryStats();
 renderDiaryHistorySection();
 };
 });
 weatherBar.querySelectorAll('[data-weather-filter]').forEach(btn => {
 btn.onclick = () => {
 const v = btn.dataset.weatherFilter;
 state.diary.filterWeather = v || null;
 saveData();
 renderDiaryFilters();
 renderDiaryCalendar();
 renderDiaryStats();
 renderDiaryHistorySection();
 };
 });
 }

 // ============================================================
 // 🏷 日记增强：标签 / 时间筛选 / 标签筛选（均由本任务新增，不动原有逻辑）
 // ============================================================
 const DIARY_TAG_PRESET = ['日常', '创作随笔', '心情', '灵感碎记']; // 预设标签

 // 取「今天」日记条目（不存在则创建空壳，保证 tags 为数组）
 function ensureTodayEntry() {
 const today = getDateStr(new Date());
 if (!state.diary.entries[today]) state.diary.entries[today] = { mood: '', weather: '', content: '', tags: [] };
 if (!Array.isArray(state.diary.entries[today].tags)) state.diary.entries[today].tags = [];
 return state.diary.entries[today];
 }

 // 本周一 0 点（用于「本周」筛选）
 function getWeekStart(d) {
 const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
 const day = dt.getDay(); // 0=周日..6=周六
 const diff = (day === 0) ? -6 : (1 - day);
 dt.setDate(dt.getDate() + diff);
 return dt;
 }

 // 今日面板：标签编辑器（预设 + 自定义）
 function renderDiaryTagEditor() {
 const box = $('#diaryTagEditor');
 if (!box) return;
 const entry = ensureTodayEntry();
 const tags = Array.isArray(entry.tags) ? entry.tags : [];
 const all = DIARY_TAG_PRESET.slice();
 tags.forEach(t => { if (all.indexOf(t) < 0) all.push(t); });
 let html = '<span class="filter-label">🏷 标签：</span>';
 html += '<button class="filter-chip ' + (tags.length === 0 ? 'selected' : '') + '" data-tag="">无</button>';
 html += all.map(t => {
 const on = tags.indexOf(t) >= 0;
 return '<button class="filter-chip diary-tag-chip ' + (on ? 'selected' : '') + '" data-tag="' + escapeHtml(t) + '">' + escapeHtml(t) + '</button>';
 }).join('');
 html += '<input class="diary-tag-input" id="diaryTagInput" placeholder="自定义标签，回车添加" style="width:120px;">';
 box.innerHTML = html;
 box.querySelectorAll('[data-tag]').forEach(btn => {
 btn.onclick = () => {
 const t = btn.getAttribute('data-tag');
 const e = ensureTodayEntry();
 const arr = Array.isArray(e.tags) ? e.tags.slice() : [];
 if (t === '') { e.tags = []; }
 else {
 const i = arr.indexOf(t);
 if (i >= 0) arr.splice(i, 1); else arr.push(t);
 e.tags = arr;
 }
 saveData();
 renderDiaryTagEditor();
 renderDiaryTagFilterBar();
 renderDiaryHistorySection();
 };
 });
 const inp = $('#diaryTagInput');
 if (inp) inp.onkeydown = (ev) => {
 if (ev.key === 'Enter') {
 const v = (inp.value || '').trim();
 if (!v) return;
 const e = ensureTodayEntry();
 const arr = Array.isArray(e.tags) ? e.tags.slice() : [];
 if (arr.indexOf(v) < 0) arr.push(v);
 e.tags = arr;
 saveData();
 renderDiaryTagEditor();
 renderDiaryTagFilterBar();
 renderDiaryHistorySection();
 }
 };
 }

 // 历史面板：时间筛选（全部 / 本周 / 本月）
 function renderDiaryTimeBar() {
 const box = $('#diaryTimeBar');
 if (!box) return;
 const cur = state.diary.timeRange || 'all';
 const opts = [['all', '全部'], ['week', '本周'], ['month', '本月']];
 box.innerHTML = '<span class="filter-label">🗓 时间：</span>' + opts.map(o =>
 '<button class="filter-chip ' + (cur === o[0] ? 'selected' : '') + '" data-range="' + o[0] + '">' + o[1] + '</button>'
 ).join('');
 box.querySelectorAll('[data-range]').forEach(b => {
 b.onclick = () => {
 state.diary.timeRange = b.getAttribute('data-range');
 saveData();
 renderDiaryTimeBar();
 renderDiaryHistorySection();
 };
 });
 }

 // 历史面板：标签筛选（按已用标签过滤）
 function renderDiaryTagFilterBar() {
 const box = $('#diaryTagFilterBar');
 if (!box) return;
 const used = {};
 Object.keys(state.diary.entries).forEach(d => {
 const t = state.diary.entries[d].tags;
 if (Array.isArray(t)) t.forEach(x => { used[x] = (used[x] || 0) + 1; });
 });
 const all = DIARY_TAG_PRESET.slice();
 Object.keys(used).forEach(t => { if (all.indexOf(t) < 0) all.push(t); });
 const cur = state.diary.filterTag || '';
 let html = '<span class="filter-label">🏷 按标签：</span>';
 html += '<button class="filter-chip ' + (!cur ? 'selected' : '') + '" data-ftag="">全部</button>';
 html += all.map(t => {
 const cnt = used[t] || 0;
 return '<button class="filter-chip diary-tag-chip ' + (cur === t ? 'selected' : '') + '" data-ftag="' + escapeHtml(t) + '">' + escapeHtml(t) + ' <span class="chip-count">' + cnt + '</span></button>';
 }).join('');
 box.innerHTML = html;
 box.querySelectorAll('[data-ftag]').forEach(b => {
 b.onclick = () => {
 const t = b.getAttribute('data-ftag');
 state.diary.filterTag = t || null;
 saveData();
 renderDiaryTagFilterBar();
 renderDiaryHistorySection();
 };
 });
 }

 // ============================================================
 // 渲染统计卡片（本月主导心情/天气/心情得分/记录天数 + 心情×天气最常共现）
 function renderDiaryStats() {
 const wrap = $('#diaryStatsWrap');
 if (!wrap) return;

 // 计算「本月」范围的条目
 const today = new Date();
 const ym = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
 const monthEntries = {};
 Object.keys(state.diary.entries).forEach(d => {
 if (d.startsWith(ym)) monthEntries[d] = state.diary.entries[d];
 });
 const allStats = computeDiaryStats(state.diary.entries);
 const monthStats = computeDiaryStats(monthEntries);
 const filteredActive = !!(state.diary.filterMood || state.diary.filterWeather);
 const shownStats = filteredActive ? computeDiaryStats(getFilteredEntries()) : monthStats;

    const topMoodObj = shownStats.topMood ? MOOD_BY_ID[shownStats.topMood] : null;
 const topWeatherObj = shownStats.topWeather ? WEATHER_BY_ID[shownStats.topWeather] : null;
 const scorePct = Math.round(((shownStats.moodScoreAvg + 2) / 4) * 100); // -2..+2 → 0..100
 const scoreColor = scorePct >= 60 ? 'var(--keroppi-green)' : (scorePct >= 40 ? 'var(--cinnamoroll-blue)' : 'var(--pink-500)');
    const bestComboMood = shownStats.bestCombo ? MOOD_BY_ID[shownStats.bestCombo.mood] : null;
 const bestComboWeather = shownStats.bestCombo ? WEATHER_BY_ID[shownStats.bestCombo.weather] : null;

 const scopeLabel = filteredActive ? '筛选后' : '本月';
 wrap.innerHTML = `
 <div class="diary-stats-title">📊 ${scopeLabel}日记统计</div>
 <div class="diary-stats-grid">
 <div class="diary-stat-card mood-pos-bg">
 <div class="dsc-label">主导心情</div>
 <div class="dsc-value">${topMoodObj ? topMoodObj.emoji : '—'}</div>
 <div class="dsc-meta">${topMoodObj ? topMoodObj.label + ' · ' + (shownStats.moodCounts[topMoodObj.id] || 0) + ' 次' : '暂无数据'}</div>
 </div>
 <div class="diary-stat-card weather-sunny-bg">
 <div class="dsc-label">主导天气</div>
 <div class="dsc-value">${topWeatherObj ? topWeatherObj.emoji : '—'}</div>
 <div class="dsc-meta">${topWeatherObj ? topWeatherObj.label + ' · ' + (shownStats.weatherCounts[topWeatherObj.id] || 0) + ' 次' : '暂无数据'}</div>
 </div>
 <div class="diary-stat-card">
 <div class="dsc-label">心情得分</div>
 <div class="dsc-value" style="color:${scoreColor}">${scorePct}</div>
 <div class="dsc-meta">积极情绪越高分越接近 100</div>
 </div>
 <div class="diary-stat-card">
 <div class="dsc-label">记录天数</div>
 <div class="dsc-value">${shownStats.totalDays}</div>
 <div class="dsc-meta">${shownStats.totalDays > 0 ? '占本月 ' + Math.round(shownStats.totalDays / new Date(today.getFullYear(), today.getMonth()+1, 0).getDate() * 100) + '%' : '开始记录吧～'}</div>
 </div>
 </div>
 ${bestComboMood && bestComboWeather ? `
 <div class="diary-combo">
 <span class="combo-emoji">${bestComboMood.emoji}</span>
 <span class="combo-arrow">+</span>
 <span class="combo-emoji">${bestComboWeather.emoji}</span>
 <span class="combo-text">你${bestComboMood.label}的时候${bestComboWeather.label ? '总是' + bestComboWeather.label : ''}，共 ${shownStats.bestComboCount} 次</span>
 </div>
 ` : ''}
 <div class="diary-stats-foot">📈 全部记录：${allStats.totalDays} 天 · ${Object.keys(allStats.moodCounts).length} 种心情 · ${Object.keys(allStats.weatherCounts).length} 种天气</div>
 `;
 }

 // 取得当前筛选条件下的条目（用于历史列表与统计共用）
 function getFilteredEntries() {
 const result = {};
 const fm = state.diary.filterMood;
 const fw = state.diary.filterWeather;
 Object.keys(state.diary.entries).forEach(d => {
 const e = state.diary.entries[d];
 if (fm && e.mood !== fm) return;
 if (fw && e.weather !== fw) return;
 result[d] = e;
 });
 return result;
 }

 // 重渲染历史日记（独立函数，方便筛选/翻页时复用）
 function renderDiaryHistorySection() {
 if (typeof state.diary.historyPage !== 'number') state.diary.historyPage = 1;
 const PAGE_SIZE = 10;

 let dates = Object.keys(state.diary.entries).sort().reverse();
 const fm = state.diary.filterMood;
 const fw = state.diary.filterWeather;
 if (fm) dates = dates.filter(d => state.diary.entries[d].mood === fm);
 if (fw) dates = dates.filter(d => state.diary.entries[d].weather === fw);

 // —— 新增：时间范围筛选（本周/本月/全部）——
 const tr = state.diary.timeRange || 'all';
 if (tr === 'week' || tr === 'month') {
 const now = new Date();
 const ym = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2);
 if (tr === 'month') {
 dates = dates.filter(d => d.slice(0, 7) === ym);
 } else {
 const wsStr = getDateStr(getWeekStart(now));
 dates = dates.filter(d => d >= wsStr);
 }
 }
 // —— 新增：按标签筛选 ——
 const ft = state.diary.filterTag;
 if (ft) {
 dates = dates.filter(d => {
 const e = state.diary.entries[d];
 return e && Array.isArray(e.tags) && e.tags.indexOf(ft) >= 0;
 });
 }

 // 优先：根据用户指定的查询日期筛到一条最接近的日记
 if (state.diary.historyPickDate) {
 const target = state.diary.historyPickDate;
 const exactIdx = dates.indexOf(target);
 const closestIdx = exactIdx >= 0 ? exactIdx : findClosestDateIdx(dates, target);
 if (closestIdx >= 0) {
 // 把命中条目放在第一页显眼位置
 state.diary.historyPage = Math.floor(closestIdx / PAGE_SIZE) + 1;
 }
 }

 const total = dates.length;
 const loaded = Math.min(total, (state.diary.historyPage || 1) * PAGE_SIZE);
 const visible = dates.slice(0, loaded);

 // 顶部：日期选择器
 let toolbar = '';
 if ($('#diaryHistoryPickerWrap')) {
 toolbar = `
 <div class="diary-history-toolbar">
 <span class="diary-history-toolbar-label">📅 跳到指定日期：</span>
 <input type="date" id="diaryHistoryPickInput" class="schedule-picker-input" value="${state.diary.historyPickDate || ''}">
 <button class="btn" id="diaryHistoryPickBtn">跳转</button>
 <button class="btn" id="diaryHistoryPickClear" style="${state.diary.historyPickDate ? '' : 'display:none;'}">✕ 清除</button>
 <span class="diary-history-stats">📊 共 <strong>${total}</strong> 条日记</span>
 </div>
 `;
 }

 let listHtml = '';
 if (visible.length === 0) {
 listHtml = '<div class="empty-state"><span class="empty-state-icon">📝</span>' +
 ((fm || fw) ? '当前筛选条件下没有日记' : '还没有日记，开始记录吧～') +
 '</div>';
 } else {
 listHtml = visible.map(d => {
 const e = state.diary.entries[d];
 const moodObj = getMoodObj(e.mood);
 const moodEmoji = moodObj ? moodObj.emoji : (e.mood || '');
 const weather = WEATHER_BY_ID[e.weather] || { emoji: '', label: '晴' };
 const highlight = state.diary.historyPickDate && d === state.diary.historyPickDate;
 const isFuture = d > getDateStr(new Date());
 return `
 <div class="diary-entry ${highlight ? 'highlight' : ''}" data-date="${d}" data-jump="${isFuture ? '' : 'edit'}" style="cursor:pointer;" title="点击查看详情">
 <div class="diary-entry-side">${moodEmoji}</div>
 <div class="diary-entry-body">
 <div class="diary-header">
 <div class="diary-date">${d}</div>
 <div class="diary-mood"><span class="mood-cat-chip mood-cat-${getMoodCategory(e.mood)}">${moodObj ? moodObj.label : ''}</span> ${weather.emoji} ${weather.label}</div>
 </div>
 <div class="diary-entry-preview">${escapeHtml(e.content || '（空白）')}</div>
 </div>
 <span class="diary-entry-arrow" aria-hidden="true">›</span>
 </div>
 `;
 }).join('');

 // 加载更多 / 结束标记
 if (loaded < total) {
 listHtml += `<div class="history-load-more"><button class="btn" id="loadMoreDiaryBtn">📥 加载更早的日记（剩余 ${total - loaded} 条）</button></div>`;
 } else {
 listHtml += `<div class="history-end-mark">— 已显示全部 ${total} 条历史日记 —</div>`;
 }
 }

 $('#diaryHistory').innerHTML = toolbar + listHtml;

 // 事件绑定：点击日记打开详情
 $$('.diary-entry[data-date]').forEach(el => {
 el.onclick = () => openDiaryDetail(el.dataset.date);
 });

 // 日期选择器事件
 const pickBtn = $('#diaryHistoryPickBtn');
 const pickInput = $('#diaryHistoryPickInput');
 const pickClear = $('#diaryHistoryPickClear');
 if (pickBtn && pickInput) {
 pickBtn.onclick = () => {
 const v = pickInput.value;
 if (!v) { toast('请先选一个日期'); return; }
 state.diary.historyPickDate = v;
 state.diary.selectedDate = v;
 state.diary.historyPage = 1;
 saveData();
 // 日历跟随跳到该日期所在月份并高亮，避免"选了日期但日历还停在别的月"
 const pm = v.split('-');
 if (pm.length === 3) {
 diaryCalYear = parseInt(pm[0], 10);
 diaryCalMonth = parseInt(pm[1], 10) - 1;
 }
 renderDiaryCalendar();
 renderDiaryHistorySection();
 // 自动滚动到命中项
 setTimeout(() => {
 const target = document.querySelector(`.diary-entry[data-date="${v}"]`);
 if (target) {
 target.scrollIntoView({ behavior: 'smooth', block: 'center' });
 toast(` 已定位到 ${v}`);
 } else if (Object.keys(state.diary.entries).length === 0) {
 toast('还没有日记记录');
 } else {
 toast(`${v} 附近没有日记，已显示最接近的 ${state.diary.historyPage * PAGE_SIZE} 条`);
 }
 }, 80);
 };
 pickInput.onchange = () => {
 // 实时预览滚动
 const v = pickInput.value;
 if (!v) return;
 const target = document.querySelector(`.diary-entry[data-date="${v}"]`);
 if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
 };
 }
 if (pickClear) {
 pickClear.onclick = () => {
 state.diary.historyPickDate = null;
 state.diary.selectedDate = null; // 同时取消日历上的高亮，保持两处状态一致
 state.diary.historyPage = 1;
 saveData();
 renderDiaryHistorySection();
 renderDiaryCalendar();
 };
 }

 // 加载更多
 const more = $('#loadMoreDiaryBtn');
 if (more) {
 more.onclick = () => {
 state.diary.historyPage = (state.diary.historyPage || 1) + 1;
 saveData();
 renderDiaryHistorySection();
 setTimeout(() => {
 const list = $('#diaryHistory');
 if (list) list.scrollIntoView({ behavior: 'smooth', block: 'end' });
 }, 50);
 };
 }
 }

 // 随手速记：把短句追加进「今天」的日记条目（供全局速记弹窗调用）
 // 不进入日记页也能记录；保留文本框里尚未防抖落盘的内容，避免丢失。
 window.__diaryQuickNote = function (text) {
 const e = ensureTodayEntry();
 const ta = document.getElementById('diaryContent');
 const live = ta ? ta.value : '';
 const base = (live && live.trim()) ? live : (e.content || '');
 const now = new Date();
 const hh = ('0' + now.getHours()).slice(-2), mm = ('0' + now.getMinutes()).slice(-2);
 const line = '· [' + hh + ':' + mm + '] 速记：' + text;
 e.content = (base && base.trim()) ? (base + '\n' + line) : line;
 if (!e.mood) e.mood = MOOD_LIST[0].id;
 if (!e.weather) e.weather = WEATHER_LIST[0].id;
 saveData();
 if (window.toast) window.toast('✓ 已存入今日日记');
 const dp = document.getElementById('diaryPanelToday');
 if (dp && dp.style.display !== 'none') {
 renderDiaryCalendar();
 renderDiaryStats();
 renderDiaryHistorySection();
 renderDiaryTagFilterBar();
 }
 };

 // 在已排序(倒序)日期数组里找与 target 最接近的索引
 function findClosestDateIdx(sortedDatesDesc, target) {
 if (!sortedDatesDesc.length) return -1;
 const t = new Date(target).getTime();
 let best = -1, bestDiff = Infinity;
 for (let i = 0; i < sortedDatesDesc.length; i++) {
 const diff = Math.abs(new Date(sortedDatesDesc[i]).getTime() - t);
 if (diff < bestDiff) { bestDiff = diff; best = i; }
 }
 return best;
 }

 // 弹窗：显示某一天日记的详情（支持删除）
 function openDiaryDetail(dateStr) {
 const e = state.diary.entries[dateStr];
 if (!e) { toast('这一天没有日记'); return; }
 const w = WEATHER_BY_ID[e.weather] || { emoji: '', label: '晴' };
 const moodObj = getMoodObj(e.mood);
 const moodEmoji = moodObj ? moodObj.emoji : (e.mood || '');
 const moodLabel = moodObj ? moodObj.label : '';
 const moodCat = moodObj ? moodObj.category : 'unknown';
 const isToday = dateStr === getDateStr(new Date());
 const isChecked = !!state.checkin.diary[dateStr];

 // 字数统计
 const wordCount = (e.content || '').replace(/\s+/g, '').length;

 showModal(`📖 ${dateStr} 的日记`, `
 <div class="diary-detail">
 <div class="diary-detail-meta">
 <span class="diary-detail-chip mood-cat-chip mood-cat-${moodCat}">${moodEmoji} ${moodLabel || '心情'}</span>
 <span class="diary-detail-chip weather-cat-${w.category}">${w.emoji} ${w.label}</span>
 ${isChecked ? '<span class="diary-detail-chip green">✓ 已打卡</span>' : ''}
 <span class="diary-detail-chip gray">📝 ${wordCount} 字</span>
 </div>
 <div class="diary-detail-content">${escapeHtml(e.content || '（这一天没有写正文）')}</div>
 ${isToday ? '<div style="margin-top:10px; font-size:12px; color:var(--text-mid); font-family:Pixelify Sans,sans-serif;">💡 这是今天，可以切到「✏ 今天」Tab 继续编辑～</div>' : ''}
 <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; padding-top:12px; border-top:2px dashed var(--pink-200);">
 <button class="btn" id="diaryDetailEditBtn" style="flex:1; min-width:120px;">✏ ${isToday ? '去今天编辑' : '查看日历'}</button>
 <button class="btn danger" id="diaryDetailDeleteBtn" style="flex:1; min-width:120px;">🗑 删除这条日记</button>
 </div>
 <div style="margin-top:10px; font-size:12px; color:var(--text-mid); font-family:Pixelify Sans,sans-serif; text-align:center;">
 ${isToday ? '💡 这是今天，可切到「✏ 今天」Tab 继续编辑' : '💡 切换到「📖 日记」Tab 可以直接浏览/编辑其他日期'}
 </div>
 </div>
 `, null);
 const cf = $('#modalConfirm'); if (cf) cf.style.display = 'none';
 const cc = $('#modalCancel'); if (cc) cc.textContent = '关闭';

 // 跳到「今天」或「日记」Tab 去编辑
 const editBtn = $('#diaryDetailEditBtn');
 if (editBtn) editBtn.onclick = () => {
 $('#modalRoot').innerHTML = '';
 state.diaryTabMode = isToday ? 'today' : 'history';
 saveData();
 switchView('diary');
 if (isToday) {
 setTimeout(() => { const ta = $('#diaryContent'); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } }, 60);
 }
 toast(isToday ? '已切到「今天」Tab' : '已切到「日记」日历');
 };

 // 删除这条日记
 const delBtn = $('#diaryDetailDeleteBtn');
 if (delBtn) delBtn.onclick = () => {
const doDelete = () => {
// 删除当日日记 → 若曾打卡则退回能量
if (state.checkin.diary[dateStr]) awardEnergy('diary', { reverse: true });
delete state.diary.entries[dateStr];
delete state.checkin.diary[dateStr];
saveData();
 $('#modalRoot').innerHTML = '';
 renderDiary();
 toast('🗑 已删除 ' + dateStr + ' 的日记');
 };
 confirmDialog(`确定要删除 <strong>${dateStr}</strong> 的日记吗？<br/><span style="color:var(--text-mid); font-size:12px;">这条记录会从日历和历史中消失，无法恢复。</span>`, doDelete);
 const confirmBtn = $('#modalConfirm');
 if (confirmBtn) {
 confirmBtn.textContent = '确认删除';
 confirmBtn.style.background = 'var(--danger)';
 confirmBtn.style.color = 'var(--on-primary)';
 }
 };
 }

 function escapeHtml(s) {
 if (!s) return '';
 return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
 }
 const escapeAttr = escapeHtml; // 属性值同样需要转义 &<>"'，复用 escapeHtml

 // ============================================
 // 📚 阅读
 // ============================================
 let bookFilterType = 'all';
 let bookRefreshOffset = 0; // 用户每次手动"换一批" +1
 let bookOnlineCache = null; // { type: { items: [...], offset, ts } }
 let bookOnlineLoading = false;

 // 随机选一个不重复的关键词（按当前分类从 extra 里抽）
 function pickKeyword(typeId) {
 const cfg = DATA.BOOK_ONLINE_QUERY && DATA.BOOK_ONLINE_QUERY[typeId];
 if (!cfg) return '';
 // 根据 offset 滚动选择，保证每次刷都能换
 const idx = (bookRefreshOffset + Math.floor(Math.random() * 1000)) % cfg.extra.length;
 return cfg.extra[idx];
 }

 // Google Books 在线拉取真实书籍
 // CORS 友好、无需鉴权、中文资源充足（可用 langRestrict=zh）
 // 返回的数组字段：title / author / type / intro / link / source
 // ============================================
 // 📖 在线推荐书库（国内稳定可用）
 // 之前用 Google Books / Open Library 真实接口，但这两个域名在国内经常被 GFW 阻断，
 // 导致"推荐书籍"功能永远连不上。其他分区（灵感用 picsum 图 + 真实平台 URL）都正常。
 // 现在改成本地精选库 + picsum 封面 + 详情跳微信读书搜索——
 // 策略与「灵感」分区完全一致：稳定 seed 出图、平台 URL 用真实可打开的页面。
 // ============================================

 // 工具：根据 typeId 过滤本地图书库；为每本补齐 link（微信读书搜索）。
 // 返回与旧 fetchOnlineBooks 同构的数组，让调用方零改动切换。
 function _buildCuratedBooks(typeId, offset) {
 const raw = (DATA.BOOK_ONLINE_LIBRARY && DATA.BOOK_ONLINE_LIBRARY.length)
 ? DATA.BOOK_ONLINE_LIBRARY
 : (DATA.DAILY_BOOKS || []);
 // 1) 先按「书名」去重，杜绝源数据本身存在重复条目导致刷新后出现重复
 const seenTitle = new Set();
 const all = [];
 raw.forEach(b => {
 const key = (b.title || '').trim();
 if (!key || seenTitle.has(key)) return;
 seenTitle.add(key);
 all.push(b);
 });
 const basePool = (typeId === 'all') ? all : all.filter(b => b.type === typeId);
 if (basePool.length === 0) return [];

 // 2) 确定性洗牌：用 typeId 做种子，保证同一分类每次进页面顺序一致（稳定加载），
 // 但又不是数据文件里的原始排列，翻页时观感更像"随机推荐"。
 let seed = 0;
 for (let i = 0; i < typeId.length; i++) seed = (seed * 31 + typeId.charCodeAt(i)) >>> 0;
 const rand = () => {
 // xorshift32：纯确定性伪随机，同一 seed 永远同一序列
 seed ^= seed << 13; seed >>>= 0;
 seed ^= seed >> 17;
 seed ^= seed << 5; seed >>>= 0;
 return seed / 4294967296;
 };
 const pool = basePool.slice();
 for (let i = pool.length - 1; i > 0; i--) {
 const j = Math.floor(rand() * (i + 1));
 [pool[i], pool[j]] = [pool[j], pool[i]];
 }

 const n = pool.length;
 const PAGE = 5;
 // 3) 分页轮播（关键修复）：把池子切成 ceil(n/PAGE) 页，offset 对页数取模。
 // 旧实现用「固定步长 7 平移」，当 n 与 7 不互质时（如文学 n=14、哲学 n=7），
 // offset=2 会算出 14%14=0，正好回到第一批 —— 这就是"刷新超过两次出现重复"的根因。
 // 分页方式保证：① 单批内绝不重复；② 走完一轮才回到起点，覆盖整个池子。
 const totalPages = Math.max(1, Math.ceil(n / PAGE));
 const page = ((Math.max(0, offset | 0) % totalPages) + totalPages) % totalPages;
 // 末页不足 PAGE 本时把起点往回收，保证每批都是满 5 本，且批内仍然唯一
 const start = Math.min(page * PAGE, Math.max(0, n - PAGE));
 const picked = [];
 const localSeen = new Set();
 for (let i = start; i < n && picked.length < PAGE; i++) {
 const b = pool[i];
 const k = (b.title || '').trim();
 if (localSeen.has(k)) continue; // 双保险：批内绝不出现重复条目
 localSeen.add(k);
 picked.push(b);
 }
 // 同构化：注入微信读书搜索 link（与原 google_Books 的 link 字段对齐）
 const weixinSearch = (typeof DATA._weixinReadSearch === 'function')
 ? DATA._weixinReadSearch
 : (kw) => 'https://weread.qq.com/search?keyword=' + encodeURIComponent(kw);
 return picked.map(b => Object.assign({}, b, {
 link: weixinSearch(b.title + ' ' + (b.author || '')),
 source: 'curated',
 }));
 }

 // 异步包装，给 200ms 的"取数据"假时延，与之前 fetch 的体验保持一致
 // 同时给消费者一个"在线/加载中"的视觉信号
 function fetchOnlineBooks(typeId, offset) {
 return new Promise((resolve) => {
 const items = _buildCuratedBooks(typeId, offset || 0);
 // 短延迟（150-300ms），让 loading 态能看到，但不会让人等
 const delay = 150 + Math.floor(Math.random() * 150);
 setTimeout(() => resolve(items), delay);
 });
 }

 // 旧版 fetchOpenLibrary 已废弃（依赖被 GFW 阻断的 openlibrary.org）。
 // 为防止其它地方误引用导致运行时崩，这里保留一个同名 no-op（立即 resolve 空数组）
 function fetchOpenLibrary(/* typeId, offset */) {
 return Promise.resolve([]);
 }

 // 旧版 mapGoogleCategoryToOurs 已废弃（Google Books 分类字符串不再用）。
 // 保留同名的直通版本，所有 type 字段直接信任上游（curated 库自带正确 type）。
 function mapGoogleCategoryToOurs(_googleCat, fallback) {
 return fallback || 'literature';
 }

 function toggleBookFav(title) {
 state.reading.favorites = state.reading.favorites || [];
 const i = state.reading.favorites.indexOf(title);
 if (i >= 0) { state.reading.favorites.splice(i, 1); toast('已取消收藏'); }
 else { state.reading.favorites.push(title); toast('★ 已收藏'); }
 saveData();
 renderReading();
 }

 function addBookToShelf(title, author) {
 if (state.reading.books.some(b => b.title === title)) { toast('已在书架'); return; }
 const bookId = 'book_' + Date.now();
 state.reading.books.push({
 id: bookId,
 title: title,
 author: author || '佚名',
 totalPages: 0,
 cover: '', // 不再有图标
 });
 // 新加入的书默认状态 = 想读
 if (!state.reading.bookStatus) state.reading.bookStatus = {};
 state.reading.bookStatus[bookId] = 'wishlist';
 saveData();
 renderReading();
 toast('✓ 已加入书架（想读）');
 }

 // 暴露给书单推荐模块（bookRecommend.js）调用，不影响其他逻辑
 window.addBookToShelf = addBookToShelf;
 window.toast = toast;
 // 暴露通用弹窗/确认/转义，供各增强模块（作品集等）直接复用，避免重复造轮子
 window.showModal = showModal;
 window.confirmDialog = confirmDialog;
 window.escapeHtml = escapeHtml;
// 暴露给健身模块（fitness_app.js）：写入打卡状态供「桌面」页推荐，以及持久化
window.state = state;
window.saveData = saveData;
window.getDateStr = getDateStr;
// 暴露统一能量结算与桌面助手状态刷新，供各功能模块（健身/理财/日程/生活/视野/AI 等）接入"任何行为都给能量"
window.awardEnergy = awardEnergy;
window.updateMascotStats = updateMascotStats;
window.INTERACTION_RULES = INTERACTION_RULES;

// ============================================================
// 跨设备同步（Supabase · 共享同步码方案）
// 免注册 / 免邮箱：两台设备输入【同一个同步码】即可互传数据。
// 数据存 sync_rooms 表，room = 同步码，data = localStorage 的完整 JSON 字符串。
// ============================================================
function schedulePush() {
  if (_pushTimer) clearTimeout(_pushTimer);
  _pushTimer = setTimeout(function () {
    syncPush().catch(function (err) { console.warn('[sync] 上传失败：', err); });
  }, 800);
}

async function syncPush() {
  if (!supabaseClient || !currentRoom) return;
  var payload = { room: currentRoom, data: JSON.stringify(state), updated_at: new Date().toISOString() };
  var res = await supabaseClient.from('sync_rooms').upsert(payload, { onConflict: 'room' });
  if (res.error) throw res.error;
}

async function syncPullAndReload() {
  if (!supabaseClient || !currentRoom) return;
  var res = await supabaseClient.from('sync_rooms').select('data').eq('room', currentRoom).maybeSingle();
  if (res.error) { console.warn('[sync] 拉取失败：', res.error); return; }
  if (res.data && res.data.data) {
    try { localStorage.setItem(STORAGE_KEY, res.data.data); } catch (e) {}
    try { await syncDownloadResumeFiles(); } catch (e) { console.warn('[sync] 简历原文件还原失败', e); }
    location.reload();
  }
}

// 设置同步码：仅记录房间码，不自动上传/下载（避免新设备把云端数据冲掉）
function syncSetRoom(room) {
  room = (room || '').trim();
  if (room.length < 3) throw new Error('同步码至少 3 位');
  currentRoom = room;
  try { localStorage.setItem(SYNC_ROOM_KEY, room); } catch (e) {}
  updateSyncUI();
}

// 上传：把【本机】数据保存到云端（覆盖云端）。数据最全的那台设备用。
async function syncUpload() {
  if (!supabaseClient || !currentRoom) throw new Error('请先输入同步码');
  await syncPush(); // 文字数据
  try {
    var n = await syncPushResumeFiles(); // 简历原文件
    if (window.toast) window.toast('☁ 已保存到云端（含 ' + n + ' 份简历原文件）');
  } catch (e) {
    console.warn('[sync] 简历原文件上传失败', e);
    if (window.toast) window.toast('⚠️ 文字已同步，简历原文件上传失败：' + (e.message || e));
  }
}

// 下载：把【云端】数据拉到本机（覆盖本机）。新设备 / 想恢复数据时用。
async function syncDownload() {
  if (!supabaseClient || !currentRoom) throw new Error('请先输入同步码');
  await syncPullAndReload();
}

// 把本机 IndexedDB 里的简历原文件上传到云端独立表（避免单包过大传失败）
async function syncPushResumeFiles() {
  if (!supabaseClient || !currentRoom) return 0;
  let all = null;
  try { all = await TALENT_IDB.getAllFiles(); }
  catch (e) { console.warn('[sync] 读取简历原文件失败', e); return 0; }
  if (all === null) return 0; // 读取失败，不触碰云端
  const ids = Object.keys(all);
  if (ids.length === 0) {
    // 本机无简历文件：清空云端该 room 的旧文件，保持镜像一致
    await supabaseClient.from('sync_resume_files').delete().eq('room', currentRoom);
    return 0;
  }
  const rows = [];
  const skipped = [];
  for (const id of ids) {
    const f = all[id];
    if (f && f.size && f.size > 8 * 1024 * 1024) { skipped.push(f.name || id); continue; }
    try {
      const dataUrl = await blobToBase64(f);
      rows.push({ room: currentRoom, file_id: String(id), name: f.name || '', mime: f.type || '', data: dataUrl, updated_at: new Date().toISOString() });
    } catch (e) { console.warn('[sync] 简历文件编码失败', id, e); }
  }
  if (rows.length) {
    const res = await supabaseClient.from('sync_resume_files').upsert(rows, { onConflict: 'room,file_id' });
    if (res.error) throw res.error;
  }
  if (skipped.length && window.toast) window.toast('⚠️ 跳过 ' + skipped.length + ' 个过大文件(>8MB)：' + skipped.join('、'));
  return rows.length;
}

// 把云端简历原文件下载并写回本机 IndexedDB
async function syncDownloadResumeFiles() {
  if (!supabaseClient || !currentRoom) return 0;
  const res = await supabaseClient.from('sync_resume_files').select('file_id,name,mime,data').eq('room', currentRoom);
  if (res.error) { console.warn('[sync] 下载简历原文件失败', res.error); return 0; }
  if (!res.data || !res.data.length) return 0;
  let n = 0;
  for (const row of res.data) {
    try {
      const blob = dataUrlToBlob(row.data);
      await TALENT_IDB.putFile(row.file_id, blob);
      n++;
    } catch (e) { console.warn('[sync] 简历文件还原失败', row.file_id, e); }
  }
  return n;
}

// 退出同步：仅本机清除房间码，云端数据保留
function syncClearRoom() {
  currentRoom = '';
  try { localStorage.removeItem(SYNC_ROOM_KEY); } catch (e) {}
  if (window.toast) window.toast('已退出云同步（本机数据保留）');
}

function updateSyncUI() {
  var statusEl = document.getElementById('syncStatus');
  if (statusEl) statusEl.textContent = currentRoom ? ('同步码：' + currentRoom) : '未设置同步码';
  var btn = document.getElementById('globalSyncBtn');
  if (btn) btn.textContent = currentRoom ? '☁ 已同步' : '☁ 同步';
}

async function syncPullIfNewer() {
  if (!supabaseClient || !currentRoom) return;
  var res = await supabaseClient.from('sync_rooms').select('data, updated_at').eq('room', currentRoom).maybeSingle();
  if (res.error || !res.data || !res.data.data) return;
  var local = localStorage.getItem(STORAGE_KEY);
  if (local && local === res.data.data) return;
  try { localStorage.setItem(STORAGE_KEY, res.data.data); } catch (e) {}
  try { await syncDownloadResumeFiles(); } catch (e) { console.warn('[sync] 简历原文件还原失败', e); }
  if (window.toast) window.toast('☁ 已从云端同步最新数据');
  location.reload();
}

async function initSync() {
  if (!supabaseClient) return;
  updateSyncUI();
  if (currentRoom) {
    // 已设过码：延迟静默拉取，远程有更新才刷新
    setTimeout(function () {
      syncPullIfNewer().catch(function (err) { console.warn('[sync] 启动拉取失败：', err); });
    }, 1500);
  }
}

// UI 绑定（弹窗 + 按钮）
(function bindSyncUI() {
  var modal = document.getElementById('syncModal');
  var openBtn = document.getElementById('globalSyncBtn');
  if (openBtn) openBtn.addEventListener('click', function () {
    if (modal) modal.style.display = 'flex';
    updateSyncUI();
    var input = document.getElementById('syncRoom');
    if (input && currentRoom) input.value = currentRoom;
  });
  if (modal) modal.addEventListener('click', function (e) { if (e.target === modal) modal.style.display = 'none'; });
  var closeBtn = document.getElementById('syncCloseBtn');
  if (closeBtn) closeBtn.addEventListener('click', function () { if (modal) modal.style.display = 'none'; });
  var downloadBtn = document.getElementById('syncDownloadBtn');
  if (downloadBtn) downloadBtn.addEventListener('click', async function () {
    var input = document.getElementById('syncRoom');
    try {
      await syncSetRoom(input.value); // 先记下同步码
      await syncDownload();           // 再从云端拉到本机
      if (window.toast) window.toast('✅ 已从云端下载，本机数据已更新');
      if (modal) modal.style.display = 'none';
    } catch (e) { if (window.toast) window.toast('❌ ' + (e.message || e)); }
  });
  var uploadBtn = document.getElementById('syncUploadBtn');
  if (uploadBtn) uploadBtn.addEventListener('click', async function () {
    var input = document.getElementById('syncRoom');
    try {
      await syncSetRoom(input.value); // 先记下同步码
      await syncUpload();             // 再把本机保存到云端
      if (window.toast) window.toast('✅ 已保存到云端，其他设备输入相同同步码即可下载');
      if (modal) modal.style.display = 'none';
    } catch (e) { if (window.toast) window.toast('❌ ' + (e.message || e)); }
  });
  var clearBtn = document.getElementById('syncClearBtn');
  if (clearBtn) clearBtn.addEventListener('click', function () {
    syncClearRoom();
    if (modal) modal.style.display = 'none';
  });
})();

// 暴露给全局（供其他模块 / 调试）
window.syncSetRoom = syncSetRoom;
window.syncUpload = syncUpload;
window.syncDownload = syncDownload;
window.syncClearRoom = syncClearRoom;
window.syncStatus = function () { return currentRoom || null; };

// 启动同步（已设码则静默拉取）
initSync();

 // 一次性迁移：为已存在的书补齐默认状态
 function migrateReadingStatus() {
 if (!state.reading.bookStatus) state.reading.bookStatus = {};
 if (!state.reading.reviews) state.reading.reviews = {};
 if (!state.reading.statusFilter) state.reading.statusFilter = 'all';
 let changed = false;
 (state.reading.books || []).forEach(b => {
 if (!state.reading.bookStatus[b.id]) {
 // 按累计阅读页数猜默认状态
 const totalPages = (state.reading.logs || []).filter(l => l.bookId === b.id).reduce((s, l) => s + l.pages, 0);
 if (totalPages >= (b.totalPages || Infinity)) state.reading.bookStatus[b.id] = 'finished';
 else if (totalPages > 0) state.reading.bookStatus[b.id] = 'reading';
 else state.reading.bookStatus[b.id] = 'wishlist';
 changed = true;
 }
 });
 if (changed) saveData();
 }

 // 切换书的状态（在读 / 已读完 / 想读）
 function setBookStatus(bookId, status) {
 if (!state.reading.bookStatus) state.reading.bookStatus = {};
 state.reading.bookStatus[bookId] = status;
 saveData();
 renderReading();
 }

 // 获取书的当前状态
 function getBookStatus(bookId) {
 if (!state.reading.bookStatus) return 'wishlist';
 return state.reading.bookStatus[bookId] || 'wishlist';
 }

 // 打开写/编辑读后感弹窗
 function openBookReviewModal(bookId) {
 const book = state.reading.books.find(b => b.id === bookId);
 if (!book) return;
 if (!state.reading.reviews) state.reading.reviews = {};
 const existing = state.reading.reviews[bookId] || { rating: 0, content: '' };
 showModal(`📝 读后感 · ${book.title}`, `
 <div class="modal-field">
 <label class="modal-label">评分</label>
 <div class="review-stars" id="reviewStars">
 ${[1,2,3,4,5].map(n => `<span class="review-star ${n <= existing.rating ? 'filled' : ''}" data-star="${n}">★</span>`).join('')}
 </div>
 </div>
 <div class="modal-field">
 <label class="modal-label">读后感</label>
 <textarea class="modal-textarea" id="reviewContent" rows="6" placeholder="记录你对这本书的真实感受、收获与思考...">${escapeHtml(existing.content || '')}</textarea>
 </div>
 `, () => {
 const rating = parseInt($('#reviewStars').dataset.rating || existing.rating);
 const content = $('#reviewContent').value.trim();
state.reading.reviews[bookId] = {
rating: isNaN(rating) ? 0 : rating,
content,
updatedAt: new Date().toISOString(),
};
saveData();
renderReading();
toast('✓ 读后感已保存');
if (!existing.content) awardEnergy('book_review');
 });
 // 评分交互
 $$('#reviewStars .review-star').forEach(el => {
 el.onclick = () => {
 const n = parseInt(el.dataset.star);
 $('#reviewStars').dataset.rating = n;
 $$('#reviewStars .review-star').forEach(s => s.classList.toggle('filled', parseInt(s.dataset.star) <= n));
 };
 });
 // 已存在的读后感时回填评分到 dataset
 if (existing.rating) $('#reviewStars').dataset.rating = existing.rating;
 }

 // 只读查看读后感
 function viewBookReview(bookId) {
 const book = state.reading.books.find(b => b.id === bookId);
 if (!book) return;
 const r = (state.reading.reviews || {})[bookId];
 if (!r || !r.content) { toast('还没有写读后感'); return; }
 const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
 showModal(`📖 读后感 · ${book.title}`, `
 <div style="margin-bottom: 12px;">
 <div class="review-stars readonly" style="font-size: 22px;">${stars}</div>
 </div>
 <div class="diary-detail-content" style="background: var(--bg-pixel); padding: 14px; border: 2px solid var(--text-dark); border-radius: 6px;">${escapeHtml(r.content)}</div>
 <div style="margin-top:8px; font-size:11px; color:var(--text-mid); font-family:Pixelify Sans,sans-serif;">最后更新：${new Date(r.updatedAt).toLocaleString('zh-CN')}</div>
 `, null);
 const cf = $('#modalConfirm'); if (cf) cf.style.display = 'none';
 const cc = $('#modalCancel'); if (cc) cc.textContent = '关闭';
 }

 function openBookRead(title, link) {
 // 详情跳转到微信读书搜索（用户在 WeRead 内可继续免费试读、收藏、做笔记）
 const search = (kw) => 'https://weread.qq.com/search?keyword=' + encodeURIComponent(kw);
 const url = link || search(title);
 window.open(url, '_blank', 'noopener');
 }

 // 离线兜底用：把 DAILY_BOOKS 转成与在线源同构的形状
 // 兜底时也指向微信读书搜索（与"在线"行为一致）
 function buildOfflinePool(typeId) {
 const all = DATA.DAILY_BOOKS || [];
 const pool = (typeId === 'all') ? all : all.filter(b => b.type === typeId);
 const search = (kw) => 'https://weread.qq.com/search?keyword=' + encodeURIComponent(kw);
 return pool.map(b => ({
 title: b.title,
 author: b.author,
 type: b.type,
 intro: b.intro,
 link: search(b.title),
 source: 'offline',
 }));
 }

 function renderReading() {
 const today = getDateStr(new Date());
  // 【书单推荐已重构为纯前端】
  // 书籍数据见 js/books.js，推荐逻辑见 js/bookRecommend.js。
  // 旧实现依赖在线抓取（国内常被阻断），已全部移除。
  if (typeof window.renderBookRecommend === 'function') {
    window.renderBookRecommend();
  }

 // 统计
 const todayPages = state.reading.logs.filter(l => l.date === today).reduce((s, l) => s + l.pages, 0);
 const now = new Date();
 const month = now.getMonth();
 const year = now.getFullYear();
 const monthPages = state.reading.logs.filter(l => {
 const d = new Date(l.date);
 return d.getFullYear() === year && d.getMonth() === month;
 }).reduce((s, l) => s + l.pages, 0);
 const yearPages = state.reading.logs.filter(l => {
 const d = new Date(l.date);
 return d.getFullYear() === year;
 }).reduce((s, l) => s + l.pages, 0);

 $('#readingToday').textContent = todayPages;
 $('#readingMonth').textContent = monthPages;
 $('#readingYear').textContent = yearPages;

 // 月度阅读曲线（按周）
 const nowDate = new Date();
 const weekBars = [];
 for (let w = 0; w < 6; w++) {
 const start = new Date(nowDate);
 start.setDate(start.getDate() - (5 - w) * 7);
 const end = new Date(start);
 end.setDate(end.getDate() + 6);
 const pages = state.reading.logs.filter(l => {
 const d = new Date(l.date);
 return d >= start && d <= end;
 }).reduce((s, l) => s + l.pages, 0);
 weekBars.push({ label: `${start.getMonth() + 1}/${start.getDate()}`, value: pages });
 }
 const maxWeek = Math.max(...weekBars.map(b => b.value), 1);
 $('#monthReadingChart').innerHTML = weekBars.map((b, i) => {
 const emoji = ['📖','','','','',''][i];
 const height = (b.value / maxWeek) * 100;
 return `
 <div class="sanrio-bar">
 <div class="sanrio-bar-fill" style="height: ${height}%; --bar-color: var(--cinnamoroll-blue); background: linear-gradient(180deg, var(--cinnamoroll-blue), var(--kuromi-purple))">${b.value > 0 ? emoji : ''}</div>
 <div class="sanrio-bar-label">${b.label}</div>
 </div>
 `;
 }).join('');

 // 年度总览（按书籍本数：每月读完的不同书数量）
 const yearData = [];
 for (let m = 0; m < 12; m++) {
 const ids = new Set();
 state.reading.logs.forEach(l => {
 const d = new Date(l.date);
 if (d.getFullYear() === year && d.getMonth() === m && l.bookId) ids.add(l.bookId);
 });
 yearData.push({ month: m + 1, books: ids.size });
 }
 const yearBookIds = new Set(
 state.reading.logs
 .filter(l => new Date(l.date).getFullYear() === year && l.bookId)
 .map(l => l.bookId)
 );
 const maxMonth = Math.max(...yearData.map(d => d.books), 1);
 $('#yearOverview').innerHTML = `
 <div class="sanrio-bars" style="height: 140px;">
 ${yearData.map(d => {
 const height = (d.books / maxMonth) * 100;
 const emoji = d.books > 0 ? '📚' : '';
 return `
 <div class="sanrio-bar">
 <div class="sanrio-bar-fill" style="height: ${height}%; background: linear-gradient(180deg, var(--pompompurin-yellow), var(--tuxedo-orange))">${emoji}</div>
 <div class="sanrio-bar-label">${d.month}月</div>
 </div>
 `;
 }).join('')}
 </div>
 <div style="text-align: center; margin-top: 12px; font-family: 'Pixelify Sans',sans-serif; font-size: 13px; color: var(--text-mid);">
 ${year}年共读完 <strong style="color: var(--pink-500);">${yearBookIds.size}</strong> 本
 </div>
 `;

 // 书架
 migrateReadingStatus();
 const statusFilter = state.reading.statusFilter || 'all';

 // 状态统计
 const statusCount = { all: state.reading.books.length, reading: 0, finished: 0, wishlist: 0 };
 state.reading.books.forEach(b => {
 const s = getBookStatus(b.id);
 statusCount[s] = (statusCount[s] || 0) + 1;
 });

 // 状态筛选 chips —— 横向排列于书架顶部，样式与「今日书单推荐」的 .book-type-tabs 保持一致
 // ⚠ 必须渲染到独立容器 #bookShelfTabs，而不是拼进 #bookshelf。
 // #bookshelf 是 display:grid + minmax(160px,1fr)，塞进去会被当成第一个网格单元 → 被压成窄竖列（旧版"侧边栏"错觉的根因）
 const SHELF_TABS = [
 { key: 'all', label: '📚 全部' },
 { key: 'reading', label: '📖 在读' },
 { key: 'finished', label: '✓ 已读完' },
 { key: 'wishlist', label: ' 想读' },
 ];
 const shelfTabsHtml = SHELF_TABS.map(t =>
 `<button class="book-type-tab shelf-status-tab ${statusFilter === t.key ? 'active' : ''}" data-status="${t.key}">` +
 `${t.label}<span class="shelf-tab-count">${statusCount[t.key] || 0}</span></button>`
 ).join('');
 const $shelfTabs = $('#bookShelfTabs');
 if ($shelfTabs) $shelfTabs.innerHTML = shelfTabsHtml;

 // 过滤后的书
 const visibleBooks = state.reading.books.filter(b => statusFilter === 'all' || getBookStatus(b.id) === statusFilter);

 let shelfHtml = '';
 if (state.reading.books.length === 0) {
 shelfHtml = '<div class="empty-state" style="grid-column: 1/-1;"><span class="empty-state-icon">📚</span>书架空空的，添加你想读的书吧～</div>';
 } else if (visibleBooks.length === 0) {
 shelfHtml = '<div class="empty-state" style="grid-column: 1/-1;"><span class="empty-state-icon">🔍</span>该状态下暂无书籍</div>';
 } else {
 shelfHtml = visibleBooks.map((book, idx) => {
 const logs = state.reading.logs.filter(l => l.bookId === book.id);
 const totalPages = logs.reduce((s, l) => s + l.pages, 0);
 const progress = book.totalPages ? Math.min(100, Math.round((totalPages / book.totalPages) * 100)) : 0;
 const status = getBookStatus(book.id);
 const hasReview = !!(state.reading.reviews && state.reading.reviews[book.id] && state.reading.reviews[book.id].content);
 const review = hasReview ? state.reading.reviews[book.id] : null;
 return `
 <div class="shelf-book status-${status}" data-bookid="${book.id}">
 <div class="shelf-book-title">${escapeHtml(book.title)}</div>
 <div class="shelf-book-author">${escapeHtml(book.author || '')}</div>
 <div class="shelf-book-status">
 <select class="status-select" data-status-book="${book.id}">
 <option value="reading" ${status==='reading'?'selected':''}>📖 在读</option>
 <option value="finished" ${status==='finished'?'selected':''}>✓ 已读完</option>
 <option value="wishlist" ${status==='wishlist'?'selected':''}> 想读</option>
 </select>
 </div>
 <div class="shelf-progress">${progress}%</div>
 <div class="shelf-progress-bar"><div class="shelf-progress-fill" style="width: ${progress}%"></div></div>
 <div style="font-family: 'Pixelify Sans',sans-serif; font-size: 10px; color: var(--text-mid); margin-top: 2px;">${totalPages}/${book.totalPages || '?'}页</div>
 <div class="shelf-book-actions">
 <button class="btn" data-booklog="${book.id}" title="记录阅读">+ 记录</button>
 ${hasReview ? `<button class="btn book-review-btn has-review" data-bookreview="${book.id}" title="查看读后感">📝 读后感 <span class="review-rating-mini">${'★'.repeat(review.rating)}</span></button>` : ''}
 <button class="btn ${hasReview ? '' : 'primary'}" data-bookreviewedit="${book.id}" title="写读后感">${hasReview ? '✏ 修改' : '✏ 写读后感'}</button>
 <button class="btn danger" data-bookdel="${book.id}" title="删除">删</button>
 </div>
 </div>
 `;
 }).join('');
 }

 $('#bookshelf').innerHTML = shelfHtml;

 // 状态筛选（顶部横向 tab）
 $$('.shelf-status-tab[data-status]').forEach(btn => {
 btn.onclick = () => {
 state.reading.statusFilter = btn.dataset.status;
 saveData();
 renderReading();
 };
 });

 // 状态切换
 $$('.status-select[data-status-book]').forEach(sel => {
 sel.onchange = () => setBookStatus(sel.dataset.statusBook, sel.value);
 });

 // 读后感查看
 $$('[data-bookreview]').forEach(btn => {
 btn.onclick = () => viewBookReview(btn.dataset.bookreview);
 });
 // 读后感编辑
 $$('[data-bookreviewedit]').forEach(btn => {
 btn.onclick = () => openBookReviewModal(btn.dataset.bookreviewedit);
 });

 $$('[data-booklog]').forEach(btn => {
 btn.onclick = () => {
 const bookId = btn.dataset.booklog;
 const book = state.reading.books.find(b => b.id === bookId);
 showModal(`记录阅读 - ${book.title}`, `
 <div class="modal-field">
 <label class="modal-label">今日页数</label>
 <input class="modal-input" type="number" id="logPages" placeholder="页数" min="1" value="10">
 </div>
 <div class="modal-field">
 <label class="modal-label">读后感（可选）</label>
 <textarea class="modal-textarea" id="logNote" placeholder="今天的收获..."></textarea>
 </div>
 `, () => {
 const pages = parseInt($('#logPages').value) || 0;
 const note = $('#logNote').value;
 if (pages <= 0) { toast('请输入有效页数'); return; }
 state.reading.logs.push({ date: getDateStr(new Date()), pages, bookId, bookName: book.title, note });
 state.checkin.reading[getDateStr(new Date())] = true;
 var r = applyInteraction('read');
 updateMascotStats();
 renderReading();
 toast('✓ 已记录 ' + (r ? r.summary : ''));
 });
 };
 });

 $$('[data-bookdel]').forEach(btn => {
 btn.onclick = () => {
 const bookId = btn.dataset.bookdel;
 confirmDialog('确定删除这本书吗？相关阅读记录也会被删除。', () => {
 state.reading.books = state.reading.books.filter(b => b.id !== bookId);
 state.reading.logs = state.reading.logs.filter(l => l.bookId !== bookId);
 if (state.reading.bookStatus) delete state.reading.bookStatus[bookId];
 if (state.reading.reviews) delete state.reading.reviews[bookId];
 saveData();
 renderReading();
 });
 };
 });

 $('#addBookBtn').onclick = () => {
 showModal('添加书籍', `
 <div class="modal-field">
 <label class="modal-label">书名</label>
 <input class="modal-input" id="newBookTitle" placeholder="例如：故事工程">
 </div>
 <div class="modal-field">
 <label class="modal-label">作者</label>
 <input class="modal-input" id="newBookAuthor" placeholder="作者名">
 </div>
 <div class="modal-field">
 <label class="modal-label">总页数</label>
 <input class="modal-input" id="newBookPages" type="number" placeholder="总页数">
 </div>
 <div style="font-size:12px; color:var(--text-mid); font-family:Pixelify Sans,sans-serif; margin-top:6px;">💡 书籍将以书名作为卡片显示，不再使用图标。</div>
 `, () => {
 const title = $('#newBookTitle').value.trim();
 const author = $('#newBookAuthor').value.trim();
 const totalPages = parseInt($('#newBookPages').value) || 0;
 if (!title) { toast('请输入书名'); return; }
state.reading.books.push({
id: 'book_' + Date.now(),
title, author, totalPages, cover: '',
});
awardEnergy('book_add');
saveData();
renderReading();
toast('✓ 已添加到书架');
 });
 };

 $('#logReadingBtn').onclick = () => {
 if (state.reading.books.length === 0) {
 toast('请先添加书籍');
 return;
 }
 showModal('记录阅读', `
 <div class="modal-field">
 <label class="modal-label">选择书籍</label>
 <select class="modal-select" id="logBookSelect">
 ${state.reading.books.map(b => `<option value="${b.id}">${b.title}</option>`).join('')}
 </select>
 </div>
 <div class="modal-field">
 <label class="modal-label">页数</label>
 <input class="modal-input" type="number" id="logPages" value="10" min="1">
 </div>
 `, () => {
 const bookId = $('#logBookSelect').value;
 const pages = parseInt($('#logPages').value) || 0;
 if (pages <= 0) { toast('请输入页数'); return; }
 const book = state.reading.books.find(b => b.id === bookId);
 state.reading.logs.push({ date: getDateStr(new Date()), pages, bookId, bookName: book.title });
 state.checkin.reading[getDateStr(new Date())] = true;
 var r = applyInteraction('read');
 updateMascotStats();
 renderReading();
 toast('✓ 已记录 ' + (r ? r.summary : ''));
 });
 };
 }

 function hashStr(s) {
 let h = 0;
 for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
 return Math.abs(h);
 }

 // ============================================
// 💡 灵感
// ============================================
// 灵感板块已重构为纯前端：数据见 js/inspirations.js，渲染/交互见 js/inspiration.js。
// 旧实现依赖 DATA.INSPIRATION_* 与平台搜索链接，已全部移除，改为真实原文链接。
if (typeof window.renderInspiration === "function") {
  window.renderInspiration();
}

 // ============================================
 // 🎓 英语 - 间隔重复学习系统
 // ============================================
 const REVIEW_INTERVALS = [0, 1, 3, 7, 14, 30]; // box → days until next review
 let testMode = { active: false, questions: [], currentIdx: 0, answers: [] };

 function getFilteredWordPool() {
 const goal = state.english.goal || 'CET6';
 if (goal === 'free') return DATA.ENGLISH_WORD_POOL || [];
 return (DATA.ENGLISH_WORD_POOL || []).filter(w => w.levels && w.levels.includes(goal));
 }

 function getTodayWordList() {
 const today = getDateStr(new Date());
 const pool = getFilteredWordPool();
 const goalData = (DATA.ENGLISH_GOALS || []).find(g => g.id === state.english.goal);
 const dailyCount = goalData ? goalData.dailyCount : 20;

 // 1. Review words (nextReview <= today, box > 0)
 const reviewWords = [];
 Object.entries(state.english.wordStates || {}).forEach(([en, st]) => {
 if (st.nextReview && st.nextReview <= today && st.box > 0) {
 const word = pool.find(w => w.en === en);
 if (word) reviewWords.push(word);
 }
 });

 // 2. New words
 const newWords = [];
 const learnedSet = new Set(Object.keys(state.english.wordStates || {}));
 let idx = state.english.newWordIdx || 0;
 while (newWords.length + reviewWords.length < dailyCount && idx < pool.length) {
 const w = pool[idx];
 if (!learnedSet.has(w.en)) newWords.push(w);
 idx++;
 }
 state.english.newWordIdx = idx;

 return { words: [...reviewWords, ...newWords], newCount: newWords.length, reviewCount: reviewWords.length };
 }

 function markWord(en, status) {
 const today = getDateStr(new Date());
 const ws = state.english.wordStates[en] || { box: 0, nextReview: today, lastStatus: null, lastSeen: null };
 if (status === 'mastered') {
 ws.box = Math.min(ws.box + 1, 5);
 } else if (status === 'fuzzy') {
 ws.box = Math.max(ws.box - 1, 1);
 if (ws.box < 1) ws.box = 1;
 } else if (status === 'forgotten') {
 ws.box = 1;
 }
 const interval = REVIEW_INTERVALS[ws.box] || 1;
 const next = new Date();
 next.setDate(next.getDate() + interval);
 ws.nextReview = getDateStr(next);
 ws.lastStatus = status;
 ws.lastSeen = today;
state.english.wordStates[en] = ws;
saveData();
awardEnergy('english_word', { silent: true });
}

 function isLastDayOfMonth() {
 const today = new Date();
 const tomorrow = new Date(today);
 tomorrow.setDate(tomorrow.getDate() + 1);
 return today.getMonth() !== tomorrow.getMonth();
 }

 function getCurrentMonth() {
 const d = new Date();
 return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
 }

 function renderEnglish() {
 const today = getDateStr(new Date());
 const pool = getFilteredWordPool();
 const currentMonth = getCurrentMonth();
 const needTest = isLastDayOfMonth() && state.english.lastTestMonth !== currentMonth;

 $('#englishDate').textContent = today;
 $('#englishStreak').textContent = ' 连续 ' + state.english.streak + ' 天';

 if (state.english.lastDate === today) {
 $('#englishCheckinBtn').textContent = '✓ 今日已打卡';
 $('#englishCheckinBtn').disabled = true;
 $('#englishCheckinBtn').style.background = 'var(--keroppi-green)';
 } else {
 $('#englishCheckinBtn').disabled = false;
 $('#englishCheckinBtn').textContent = '✓ 完成今日打卡';
 $('#englishCheckinBtn').style.background = '';
 }

 // Goal selector
 $('#goalSelector').innerHTML = (DATA.ENGLISH_GOALS || []).map(g =>
 '<div class="goal-chip ' + (g.id === state.english.goal ? 'active' : '') + '" data-goal="' + g.id + '">' + g.icon + ' ' + g.name + '</div>'
 ).join('');

 $$('.goal-chip').forEach(chip => {
 chip.onclick = () => {
 state.english.goal = chip.dataset.goal;
 state.english.newWordIdx = 0;
 saveData();
 renderEnglish();
 };
 });

 // Goal stats
 const learnedCount = Object.keys(state.english.wordStates || {}).length;
 const masteredCount = Object.values(state.english.wordStates || {}).filter(w => w.box >= 4).length;
 $('#goalStats').innerHTML =
 '<div class="goal-stat-row">' +
 '<span>📚 词库: <strong>' + pool.length + '</strong></span>' +
 '<span>📖 已学: <strong>' + learnedCount + '</strong></span>' +
 '<span> 掌握: <strong>' + masteredCount + '</strong></span>' +
 '</div>';

 // Monthly test banner
 if (needTest) {
 $('#monthlyTestBanner').style.display = 'block';
 $('#monthlyTestBanner').innerHTML =
 '<div class="test-banner">' +
 '<div class="test-banner-title"> 月末水平自测</div>' +
 '<div class="test-banner-desc">今天是本月最后一天，来一场水平自测吧！测试你对本月词汇的掌握程度。</div>' +
 '<button class="btn primary" id="startTestBtn">开始自测</button>' +
 '</div>';
 $('#startTestBtn').onclick = () => { startMonthlyTest(); };
 } else {
 $('#monthlyTestBanner').style.display = 'none';
 }

 // Render words or test
 if (testMode.active) {
 renderTestMode();
 } else {
 renderWordList();
 }

 // Grammar, sentence, resources from ENGLISH_DAILY rotation
 const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
 const dayIdx = (dayOfYear - 1) % (DATA.ENGLISH_DAILY || []).length;
 const day = (DATA.ENGLISH_DAILY || [])[dayIdx] || {};

 if (day.grammar) {
 const g = day.grammar;
 $('#englishGrammar').innerHTML =
 '<div class="grammar-card">' +
 '<div class="grammar-card-header" data-expand="grammar-body">' +
 '<span class="grammar-name"> ' + g.name + '</span>' +
 '<span class="grammar-pattern">' + g.pattern + '</span>' +
 '<span class="expand-arrow">▼</span>' +
 '</div>' +
 '<div class="grammar-card-body" id="grammar-body" style="display:none;">' +
 '<div class="grammar-section"><div class="grammar-section-title">📝 详解</div><div class="grammar-explanation">' + g.explanation + '</div></div>' +
 '<div class="grammar-section"><div class="grammar-section-title"> 例句</div>' + g.examples.map(ex => '<div class="grammar-example">' + ex + '</div>').join('') + '</div>' +
 '<div class="grammar-section"><div class="grammar-section-title">⚠ 常见错误</div>' + g.commonMistakes.map(m => '<div class="grammar-mistake">' + m + '</div>').join('') + '</div>' +
 '<div class="grammar-section"><div class="grammar-section-title">💡 小贴士</div><div class="grammar-tip">' + g.tips + '</div></div>' +
 '</div>' +
 '</div>';
 var gh = document.querySelector('.grammar-card-header');
 if (gh) {
 gh.onclick = () => {
 var body = $('#grammar-body');
 var arrow = gh.querySelector('.expand-arrow');
 if (body.style.display === 'none') { body.style.display = 'block'; arrow.classList.add('expanded'); }
 else { body.style.display = 'none'; arrow.classList.remove('expanded'); }
 };
 }
 }

 $('#englishSentence').innerHTML = '<strong style="color: var(--pink-500);">' + (day.sentence || '') + '</strong>';

 if (day.resources) {
 $('#englishResources').innerHTML = day.resources.map(r =>
 '<a class="learn-resource" href="' + r.link + '" target="_blank" rel="noopener noreferrer">' +
 '<div class="learn-resource-thumb">' + r.emoji + '</div>' +
 '<div class="learn-resource-info"><div class="learn-resource-title">' + r.title + '</div><div class="learn-resource-meta">' + r.platform + ' · ' + r.duration + '</div></div>' +
 '<span class="learn-resource-link">▶ 观看</span>' +
 '</a>'
 ).join('');
 }

 // Checkin
 $('#englishCheckinBtn').onclick = () => {
 if (state.english.lastDate === today) return;
 var yesterday = getDateStr(new Date(Date.now() - 86400000));
 state.english.streak = state.english.lastDate === yesterday ? state.english.streak + 1 : 1;
 state.english.lastDate = today;
 state.checkin.english[today] = true;
 var r = applyInteraction('english');
 renderEnglish();
 renderDashboard();
 toast('✓ 打卡成功！连续 ' + state.english.streak + ' 天 ' + (r ? r.summary : ''));
 };
 }

 function renderWordList() {
 var result = getTodayWordList();
 var words = result.words;
 var pool = getFilteredWordPool();

 // Theme
 var roots = [];
 words.forEach(function(w) { if (roots.indexOf(w.root) === -1) roots.push(w.root); });
 $('#englishTheme').textContent = roots.length > 0 ? '· 词根: ' + roots.slice(0, 3).join(' / ') + (roots.length > 3 ? '...' : '') : '';
 $('#wordProgress').textContent = words.length + ' 词 (新' + result.newCount + ' + 复习' + result.reviewCount + ')';

 // Render word cards
 $('#englishWords').innerHTML = words.map(function(w, i) {
 var ws = state.english.wordStates[w.en];
 var statusBadge = '';
 var boxInfo = '';
 if (ws) {
 if (ws.lastStatus === 'mastered') statusBadge = '<span class="word-status-badge mastered">✓</span>';
 else if (ws.lastStatus === 'fuzzy') statusBadge = '<span class="word-status-badge fuzzy">~</span>';
 else if (ws.lastStatus === 'forgotten') statusBadge = '<span class="word-status-badge forgotten">✗</span>';
 boxInfo = '<span class="word-box">Lv.' + ws.box + '</span>';
 } else {
 boxInfo = '<span class="word-box new">NEW</span>';
 }

 return '<div class="word-card" data-word-en="' + w.en + '">' +
 '<div class="word-card-header" data-expand="word-' + i + '">' +
 '<div class="word-card-main">' +
 '<span class="word-en">' + w.en + '</span>' +
 boxInfo + statusBadge +
 '</div>' +
 '<span class="expand-arrow">▼</span>' +
 '</div>' +
 '<div class="word-card-body" id="word-' + i + '" style="display:none;">' +
 '<div class="word-detail"><span class="detail-label"> 音标</span><span class="detail-value">' + w.phonetic + '</span></div>' +
 '<div class="word-detail"><span class="detail-label">📌 词性</span><span class="detail-value">' + w.pos + '</span></div>' +
 '<div class="word-detail"><span class="detail-label"> 词根</span><span class="detail-value">' + w.root + '</span></div>' +
 '<div class="word-detail"><span class="detail-label">📜 词源</span><span class="detail-value">' + w.etymology + '</span></div>' +
 '<div class="word-detail"><span class="detail-label">📖 释义</span><span class="detail-value">' + w.cn + '</span></div>' +
 '<div class="word-detail"><span class="detail-label">💡 例句</span><div class="detail-examples">' + w.examples.map(function(ex) { return '<div class="example-line">' + ex + '</div>'; }).join('') + '</div></div>' +
 '<div class="word-detail"><span class="detail-label">🔄 同义词</span><div class="detail-tags">' + w.synonyms.map(function(s) { return '<span class="syn-tag">' + s + '</span>'; }).join('') + '</div></div>' +
 '<div class="word-detail"><span class="detail-label">🔗 搭配</span><div class="detail-tags">' + w.collocations.map(function(c) { return '<span class="col-tag">' + c + '</span>'; }).join('') + '</div></div>' +
 '<div class="word-marking">' +
 '<button class="mark-btn mark-mastered" data-mark="mastered" data-word="' + w.en + '">✓ 学会</button>' +
 '<button class="mark-btn mark-fuzzy" data-mark="fuzzy" data-word="' + w.en + '">~ 模糊</button>' +
 '<button class="mark-btn mark-forgotten" data-mark="forgotten" data-word="' + w.en + '">✗ 忘记</button>' +
 '</div>' +
 '</div>' +
 '</div>';
 }).join('');

 // Bind click to expand
 $$('.word-card-header').forEach(function(h) {
 h.onclick = function(e) {
 if (h.dataset.longPressed === '1') { h.dataset.longPressed = '0'; e.preventDefault(); return; }
 var target = $('#' + h.dataset.expand);
 var arrow = h.querySelector('.expand-arrow');
 if (target.style.display === 'none') { target.style.display = 'block'; arrow.classList.add('expanded'); }
 else { target.style.display = 'none'; arrow.classList.remove('expanded'); }
 };
 });

 // Long-press for marking
 $$('.word-card').forEach(function(card) {
 var header = card.querySelector('.word-card-header');
 var pressTimer = null;

 var startPress = function() {
 pressTimer = setTimeout(function() {
 header.dataset.longPressed = '1';
 var body = $('#' + header.dataset.expand);
 if (body.style.display === 'none') {
 body.style.display = 'block';
 header.querySelector('.expand-arrow').classList.add('expanded');
 }
 var marking = body.querySelector('.word-marking');
 if (marking) {
 marking.classList.add('pulse-highlight');
 setTimeout(function() { marking.classList.remove('pulse-highlight'); }, 1500);
 }
 toast(' 选择掌握程度');
 }, 500);
 };

 var cancelPress = function() { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };

 header.addEventListener('mousedown', startPress);
 header.addEventListener('mouseup', cancelPress);
 header.addEventListener('mouseleave', cancelPress);
 header.addEventListener('touchstart', startPress, { passive: true });
 header.addEventListener('touchend', cancelPress);
 header.addEventListener('touchmove', cancelPress);
 });

 // Marking buttons
 $$('.mark-btn').forEach(function(btn) {
 btn.onclick = function(e) {
 e.stopPropagation();
 var word = btn.dataset.word;
 var status = btn.dataset.mark;
 markWord(word, status);
 var msg = status === 'mastered' ? '✓ 「' + word + '」已掌握！下次复习：' + ['','明天','3天后','7天后','14天后','30天后'][(state.english.wordStates[word] || {}).box || 1]
 : status === 'fuzzy' ? '~ 「' + word + '」还需复习，明天再来'
 : '✗ 「' + word + '」已重置，明天重新学';
 toast(msg);
 // Update stats without full re-render
 var learnedCount = Object.keys(state.english.wordStates || {}).length;
 var masteredCount = Object.values(state.english.wordStates || {}).filter(function(w) { return w.box >= 4; }).length;
 $('#goalStats').innerHTML = '<div class="goal-stat-row"><span>📚 词库: <strong>' + pool.length + '</strong></span><span>📖 已学: <strong>' + learnedCount + '</strong></span><span> 掌握: <strong>' + masteredCount + '</strong></span></div>';
 renderWordList();
 };
 });
 }

 function startMonthlyTest() {
 var pool = getFilteredWordPool();
 var learnedWords = Object.keys(state.english.wordStates || {})
 .map(function(en) { return pool.find(function(w) { return w.en === en; }); })
 .filter(function(w) { return w; });

 if (learnedWords.length < 5) {
 toast(' 学过的单词太少，至少需要5个才能测试');
 return;
 }

 var shuffled = learnedWords.sort(function() { return Math.random() - 0.5; });
 var questions = shuffled.slice(0, Math.min(20, shuffled.length));
 testMode = { active: true, questions: questions, currentIdx: 0, answers: [] };
 renderTestMode();
 }

 function renderTestMode() {
 if (!testMode.active) return;

 var q = testMode.questions[testMode.currentIdx];
 var total = testMode.questions.length;
 var idx = testMode.currentIdx + 1;

 if (!q) {
 // Test finished
 var score = testMode.answers.filter(function(a) { return a === 'mastered'; }).length;
 var percentage = Math.round((score / total) * 100);
 var currentMonth = getCurrentMonth();
 state.english.lastTestMonth = currentMonth;
 state.english.testHistory.push({ month: currentMonth, score: score, total: total, date: getDateStr(new Date()) });
 saveData();

 var grade = percentage >= 90 ? ' 优秀！' : percentage >= 75 ? ' 良好' : percentage >= 60 ? '💪 及格' : '📚 继续加油';
 var masteredN = testMode.answers.filter(function(a) { return a === 'mastered'; }).length;
 var fuzzyN = testMode.answers.filter(function(a) { return a === 'fuzzy'; }).length;
 var forgottenN = testMode.answers.filter(function(a) { return a === 'forgotten'; }).length;

 $('#englishWords').innerHTML =
 '<div class="test-result">' +
 '<div class="test-result-score">' + percentage + '<span style="font-size:24px;">分</span></div>' +
 '<div class="test-result-grade">' + grade + '</div>' +
 '<div class="test-result-detail">' +
 '<div> 掌握: ' + masteredN + '</div>' +
 '<div>~ 模糊: ' + fuzzyN + '</div>' +
 '<div>✗ 忘记: ' + forgottenN + '</div>' +
 '</div>' +
 '<button class="btn primary" id="exitTestBtn" style="margin-top:16px;">返回学习</button>' +
 '</div>';
 $('#wordProgress').textContent = '自测完成';
 $('#englishTheme').textContent = '';

 $('#exitTestBtn').onclick = function() {
 testMode = { active: false, questions: [], currentIdx: 0, answers: [] };
 renderEnglish();
 };
 return;
 }

 // Show question
 $('#wordProgress').textContent = '自测 ' + idx + '/' + total;
 $('#englishTheme').textContent = '';

 var answered = testMode.currentIdx < testMode.answers.length;

 $('#englishWords').innerHTML =
 '<div class="test-question">' +
 '<div class="test-q-header">第 ' + idx + ' / ' + total + ' 题</div>' +
 '<div class="test-q-word">' + q.en + '</div>' +
 '<div class="test-q-prompt">回想这个词的意思、词根、词性</div>' +
 '<div id="testRevealArea" style="' + (answered ? '' : 'display:none;') + '">' +
 '<div class="test-reveal-card">' +
 '<div class="word-detail"><span class="detail-label"> 音标</span><span class="detail-value">' + q.phonetic + '</span></div>' +
 '<div class="word-detail"><span class="detail-label">📌 词性</span><span class="detail-value">' + q.pos + '</span></div>' +
 '<div class="word-detail"><span class="detail-label"> 词根</span><span class="detail-value">' + q.root + '</span></div>' +
 '<div class="word-detail"><span class="detail-label">📖 释义</span><span class="detail-value">' + q.cn + '</span></div>' +
 '<div class="word-detail"><span class="detail-label">💡 例句</span><div class="detail-examples">' + q.examples.map(function(ex) { return '<div class="example-line">' + ex + '</div>'; }).join('') + '</div></div>' +
 '</div>' +
 '<div class="test-grading">' +
 '<div class="test-grading-prompt">你答对了吗？</div>' +
 '<div class="test-grading-btns">' +
 '<button class="mark-btn mark-mastered" data-test-mark="mastered">✓ 学会</button>' +
 '<button class="mark-btn mark-fuzzy" data-test-mark="fuzzy">~ 模糊</button>' +
 '<button class="mark-btn mark-forgotten" data-test-mark="forgotten">✗ 忘记</button>' +
 '</div>' +
 '</div>' +
 '</div>' +
 (answered ? '' : '<button class="btn primary" id="revealBtn" style="margin-top:12px;">显示答案</button>') +
 '</div>';

 if (!answered) {
 $('#revealBtn').onclick = function() {
 $('#testRevealArea').style.display = '';
 $('#revealBtn').style.display = 'none';
 };
 }

 $$('[data-test-mark]').forEach(function(btn) {
 btn.onclick = function() {
 var status = btn.dataset.testMark;
 testMode.answers[testMode.currentIdx] = status;
 markWord(q.en, status);
 testMode.currentIdx++;
 renderTestMode();
 };
 });
 }


 // ============================================
 // 💪 健身
 // ============================================
 let workoutSelection = { scene: null, part: null, duration: null, selectedVideo: null };

 // 从 "30min" / "30 分钟" 之类的字符串里抽分钟数；返回 null 表示解析不出
 function parseDurationMin(s) {
 if (s == null) return null;
 const m = String(s).match(/(\d+)/);
 return m ? parseInt(m[1], 10) : null;
 }

 // 自动生成稳定的封面图 URL（picsum.photos 真实图片服务，CORS 友好）
 // 优先级：v.pic > v.bvid 拼 B站 archive CDN > 按 title 哈希
 function getRecommendPic(v) {
 if (v.pic) return v.pic;
 // B站视频：从链接里抽 BV id，拼成 https://i0.hdslb.com/bfs/archive/{hash}.jpg 是不可能的（hash 不可猜）
 // 用 picsum 兜底：同标题永远出同一张图
 const seed = (v.bvid || v.title || '').replace(/[^a-zA-Z0-9]/g, '');
 return `https://picsum.photos/seed/${encodeURIComponent(seed || 'pixel')}/480/270`;
 }

 function renderFitness() {
 workoutSelection = { scene: null, part: null, duration: null, selectedVideo: null };

 // 渲染记录
 if (state.fitness.records.length === 0) {
 $('#fitnessRecords').innerHTML = '<div class="empty-state"><span class="empty-state-icon">💪</span>还没有运动记录，开始第一次吧～</div>';
 } else {
 const recent = state.fitness.records.slice(-10).reverse();
 $('#fitnessRecords').innerHTML = recent.map((r, ridx) => {
 const title = r.video?.title || r.part || '未命名';
 const dur = r.duration != null ? r.duration : parseDurationMin(r.video?.duration);
 const durText = dur != null ? `${dur} 分钟` : '时长未记录';
 const statusBadge = r.status === 'cancelled'
 ? '<span class="record-status cancelled">已取消</span>'
 : (r.status === 'ongoing' || r.status === 'completed'
 ? `<span class="record-status ${r.status}">${r.status === 'ongoing' ? '进行中' : '已完成'}</span>`
 : '');
 return `
 <div class="fitness-record" data-ridx="${ridx}">
 <div class="fitness-record-main">
 <div class="fitness-record-title">${escapeHtml(title)} ${statusBadge}</div>
 <div class="fitness-record-meta">${r.date} · ${r.scene || ''}${r.part ? ' · ' + r.part : ''} · ${durText}</div>
 </div>
 <button class="btn danger fitness-record-del" data-del-record="${ridx}" title="删除/取消这条记录">×</button>
 </div>
 `;
 }).join('');

 // 删除/取消运动记录
 $$('[data-del-record]').forEach(btn => {
 btn.onclick = () => {
 const ridx = parseInt(btn.dataset.delRecord, 10);
 // 倒序渲染的逆映射：slice(-10).reverse() 后，原数组索引 = records.length - 1 - ridx
 const realIdx = state.fitness.records.length - 1 - ridx;
 const target = state.fitness.records[realIdx];
 if (!target) return;
 const label = target.status === 'ongoing' ? '取消这条运动（误触 / 未完成）？' : '删除这条运动记录？';
 confirmDialog(label, () => {
 // 同步：若今天只有这一条记录，且被取消，撤销 checkin
 const today = getDateStr(new Date());
 if (target.date === today) {
 const sameDayRecords = state.fitness.records.filter(r => r.date === today);
 state.checkin.fitness[today] = sameDayRecords.length > 1;
 }
 state.fitness.records.splice(realIdx, 1);
 // 修复：删除记录时应反向结算能量（之前误调正向结算，导致删越多能量越多）
 var r2 = applyInteraction('fitness', true);
 saveData();
 renderFitness();
 updateMascotStats();
 toast('✓ 已移除' + (r2 ? ' · ' + r2.summary : ''));
 });
 };
 });
 }

 // 选项
 $$('#workoutScene .wizard-option').forEach(opt => {
 opt.onclick = () => {
 $$('#workoutScene .wizard-option').forEach(o => o.classList.remove('selected'));
 opt.classList.add('selected');
 workoutSelection.scene = opt.dataset.scene;
 };
 });
 $$('#workoutPart .wizard-option').forEach(opt => {
 opt.onclick = () => {
 opt.classList.toggle('selected');
 const selected = Array.from($$('#workoutPart .wizard-option.selected')).map(o => o.dataset.part);
 workoutSelection.part = selected.length === 0 ? null : selected;
 };
 });
 $$('#workoutDuration .wizard-option').forEach(opt => {
 opt.onclick = () => {
 $$('#workoutDuration .wizard-option').forEach(o => o.classList.remove('selected'));
 opt.classList.add('selected');
 workoutSelection.duration = parseInt(opt.dataset.dur);
 };
 });

 $('#getRecommendBtn').onclick = () => {
 if (!workoutSelection.scene) { toast('请选择运动场景'); return; }
 if (!workoutSelection.part || workoutSelection.part.length === 0) { toast('请选择锻炼部位'); return; }
 if (!workoutSelection.duration) { toast('请选择时长'); return; }

 const sceneData = DATA.WORKOUT_RECOMMEND[workoutSelection.scene];
 let videos = [];
 const parts = Array.isArray(workoutSelection.part) ? workoutSelection.part : [workoutSelection.part];
 parts.forEach(p => {
 if (sceneData[p]) videos = videos.concat(sceneData[p]);
 });

 workoutSelection.selectedVideo = null;

 $('#workoutRecommendList').innerHTML = videos.map((v, vidx) => `
 <div class="recommend-video" data-vidx="${vidx}">
 <a class="recommend-video-link-wrap" href="${v.url || '#'}" target="_blank" rel="noopener noreferrer" data-pick-vidx="${vidx}">
 <div class="recommend-video-thumb" style="background-image: url('${getRecommendPic(v)}')">
 <div class="play-icon">▶</div>
 </div>
 <div class="recommend-video-info">
 <div class="recommend-video-title">${escapeHtml(v.title)}</div>
 <div class="recommend-video-meta">${[v.duration, v.instructor, v.level, v.kcal ? v.kcal + 'kcal' : ''].filter(Boolean).map(escapeHtml).join(' · ')}</div>
 <div class="recommend-video-desc">${escapeHtml(v.desc || '')}</div>
 </div>
 <span class="recommend-video-link">▶ 跟练</span>
 </a>
 ${v.douyin ? `<a class="recommend-video-douyin" href="${v.douyin}" target="_blank" rel="noopener noreferrer">抖音跟练</a>` : ''}
 <button class="btn recommend-pick-btn" data-pick-vidx="${vidx}" type="button">选这个</button>
 </div>
 `).join('');
 $('#workoutRecommend').style.display = 'block';

 // 选视频（点击卡内空白 / 选这个按钮 / 跟练链接都触发；点跟练链接不直接开始运动，只选中）
 $$('[data-pick-vidx]').forEach(el => {
 el.addEventListener('click', (e) => {
 e.preventDefault();
 e.stopPropagation();
 const idx = parseInt(el.dataset.pickVidx, 10);
 workoutSelection.selectedVideo = videos[idx];
 $$('.recommend-video').forEach(c => c.classList.remove('selected'));
 const card = document.querySelector(`.recommend-video[data-vidx="${idx}"]`);
 if (card) card.classList.add('selected');
 toast(`已选：${videos[idx].title}`);
 });
 });

 $('#startWorkoutBtn').onclick = () => {
 // 必须先选一个视频
 const video = workoutSelection.selectedVideo || videos[0];
 if (!video) { toast('没有可用的推荐视频'); return; }

 // 时长兜底：用户没选就用视频自带的
 let duration = workoutSelection.duration;
 if (duration == null) duration = parseDurationMin(video.duration);
 if (duration == null) {
 // 实在没时长，让用户输入
 const input = prompt(`视频「${video.title}」没有自带时长（${video.duration || '未知'}），请输入分钟数：`, '15');
 if (input == null) return; // 取消
 const n = parseInt(input, 10);
 if (!n || n <= 0 || n > 600) { toast('请输入合理的分钟数（1-600）'); return; }
 duration = n;
 }

 const record = {
 date: getDateStr(new Date()),
 scene: workoutSelection.scene,
 part: Array.isArray(workoutSelection.part) ? workoutSelection.part.join('+') : workoutSelection.part,
 duration,
 video,
 status: 'ongoing',
 startAt: Date.now(),
 };
 state.fitness.records.push(record);
 state.checkin.fitness[getDateStr(new Date())] = true;
 var r = applyInteraction('fitness');
 updateMascotStats();
 // 实时展示当前选中的视频
 toast(`💪 已开始：${video.title}（${duration} 分钟）` + (r ? ' · ' + r.summary : ''));
 renderFitness();

 // 弹一个小窗，确认是否已完成（避免误触）
 setTimeout(() => {
 confirmDialog(
 `已开始 <strong>${escapeHtml(video.title)}</strong>（${duration} 分钟）。\n\n完成后点这里 ；误触或还没做完点取消会移除这条记录。`,
 () => {
 // 确认完成
 const idx = state.fitness.records.lastIndexOf(record);
 if (idx >= 0) {
 state.fitness.records[idx] = { ...state.fitness.records[idx], status: 'completed', endAt: Date.now() };
 // 完成奖励：在「开始 +6」基础上再叠加 +2 能量 / +3 健康 / +2 心情，让完成有明确回报
 var bonus = applyInteraction('fitness');
 saveData();
 renderFitness();
 updateMascotStats();
 toast(' 运动完成！' + (bonus ? ' · ' + bonus.summary : ''));
 }
 },
 () => {
 // 取消（误触）
 const idx = state.fitness.records.lastIndexOf(record);
 if (idx >= 0) {
 state.fitness.records.splice(idx, 1);
 // 撤销 checkin
 const today = getDateStr(new Date());
 const stillToday = state.fitness.records.some(x => x.date === today);
 state.checkin.fitness[today] = stillToday;
 // 修复：误触取消时反向结算能量（开始时已 +6）
 var rev = applyInteraction('fitness', true);
 saveData();
 renderFitness();
 updateMascotStats();
 toast('已取消，未记录' + (rev ? ' · ' + rev.summary : ''));
 }
 },
 { confirmText: ' 完成', cancelText: '↩ 误触取消', title: ' 运动完成了吗？' }
 );
 }, 300);
 };
 };
 }

 // ============================================
 // 🎮 作品集
 // ============================================
 let portfolioExpanded = new Set();

 // 常用 emoji 调色板（作品集封面备选）
  const PORTFOLIO_EMOJIS = ['🎮','📚','🎬','🎨','✍️','🎵','🚀','🌌','🌸','💖','✨','🐱','🐰','🧶','🍰','⚔️','🏯','🪐','📷','🎻','🧪','🗡️','🌙','🪄'];

 // 渲染封面 HTML：emoji | url | upload（dataURL）
 function portfolioCoverHtml(p, size) {
 size = size || 60;
 if (p.coverType === 'url' && p.cover) {
 return `<div class="portfolio-icon portfolio-icon-img" style="width:${size}px;height:${size}px;background-image:url('${escapeHtml(p.cover)}');background-size:cover;background-position:center;"></div>`;
 }
 if (p.coverType === 'upload' && p.cover) {
 return `<div class="portfolio-icon portfolio-icon-img" style="width:${size}px;height:${size}px;background-image:url('${p.cover}');background-size:cover;background-position:center;"></div>`;
 }
 return `<div class="portfolio-icon" style="width:${size}px;height:${size}px;font-size:${Math.round(size*0.55)}px;">${p.emoji || '🎮'}</div>`;
 }

 // 通用封面编辑器 HTML（用于添加/编辑作品）
 function portfolioCoverPickerHtml(cur) {
 cur = cur || { coverType: 'emoji', cover: '🎮', emoji: '🎮' };
 const type = cur.coverType || 'emoji';
 const emoji = cur.emoji || cur.cover || '🎮';
 const url = (type === 'url') ? (cur.cover || '') : '';
 return `
 <div class="modal-field">
 <label class="modal-label">🎨 封面</label>
 <div class="cover-tabs" id="coverTabs">
 <button type="button" class="cover-tab ${type==='emoji'?'active':''}" data-ctab="emoji">Emoji</button>
 <button type="button" class="cover-tab ${type==='url'?'active':''}" data-ctab="url">图片链接</button>
 <button type="button" class="cover-tab ${type==='upload'?'active':''}" data-ctab="upload">本地上传</button>
 </div>
 <div class="cover-panel" data-cpanel="emoji" style="display:${type==='emoji'?'block':'none'};">
          <div class="emoji-palette" id="emojiPalette">
            ${PORTFOLIO_EMOJIS.map(e => `<button type="button" class="emoji-cell ${e===emoji?'active':''}" data-emoji="${e}">${e}</button>`).join('')}
 </div>
 <input class="modal-input" id="customEmoji" value="${escapeHtml(emoji)}" placeholder="或输入自定义 emoji" style="margin-top:6px;" maxlength="4">
 </div>
 <div class="cover-panel" data-cpanel="url" style="display:${type==='url'?'block':'none'};">
 <input class="modal-input" id="coverUrl" value="${escapeHtml(url)}" placeholder="https://... （封面图片直链）">
 </div>
 <div class="cover-panel" data-cpanel="upload" style="display:${type==='upload'?'block':'none'};">
 <input type="file" id="coverFile" accept="image/*" style="font-family: 'Pixelify Sans',sans-serif; font-size: 12px;">
 <div class="cover-upload-hint">支持 jpg/png/webp，建议方形；本机存储，不会外传</div>
 </div>
 <div class="cover-preview-wrap">
 <div class="cover-preview-label">预览</div>
 <div class="cover-preview" id="coverPreview"></div>
 </div>
 </div>
 `;
 }

 // 绑定封面编辑器的事件（tab 切换、emoji 选择、URL 预览、上传预览）
 function bindCoverPicker(prefill) {
 prefill = prefill || { coverType: 'emoji', cover: '🎮', emoji: '🎮' };
 let curType = prefill.coverType || 'emoji';
    let curEmoji = prefill.emoji || prefill.cover || '🎮';
 let curUrl = curType === 'url' ? (prefill.cover || '') : '';
 let curDataUrl = curType === 'upload' ? (prefill.cover || '') : '';
 const tabs = $$('#coverTabs .cover-tab');
 const panels = $$('.cover-panel');

 function refreshPreview() {
 const el = $('#coverPreview');
 if (!el) return;
 if (curType === 'emoji') {
        el.innerHTML = `<div class="portfolio-icon" style="font-size:32px;">${curEmoji || '🎮'}</div>`;
 } else if (curType === 'url' && curUrl) {
 el.innerHTML = `<div class="portfolio-icon portfolio-icon-img" style="background-image:url('${escapeHtml(curUrl)}');"></div>`;
 } else if (curType === 'upload' && curDataUrl) {
 el.innerHTML = `<div class="portfolio-icon portfolio-icon-img" style="background-image:url('${curDataUrl}');"></div>`;
 } else {
 el.innerHTML = `<div class="portfolio-icon" style="font-size:32px; opacity:0.5;"></div>`;
 }
 }

 function showPanel(name) {
 panels.forEach(p => p.style.display = p.dataset.cpanel === name ? 'block' : 'none');
 tabs.forEach(t => t.classList.toggle('active', t.dataset.ctab === name));
 curType = name;
 refreshPreview();
 }
 tabs.forEach(t => t.onclick = () => showPanel(t.dataset.ctab));

 // emoji 选择
    $$('#emojiPalette .emoji-cell').forEach(b => {
 b.onclick = () => {
        $$('#emojiPalette .emoji-cell').forEach(x => x.classList.remove('active'));
 b.classList.add('active');
        curEmoji = b.dataset.emoji;
        const ce = $('#customEmoji'); if (ce) ce.value = curEmoji;
 refreshPreview();
 };
 });
 const ce = $('#customEmoji');
 if (ce) ce.oninput = () => {
      curEmoji = ce.value.trim() || '🎮';
      $$('#emojiPalette .emoji-cell').forEach(x => x.classList.toggle('active', x.dataset.emoji === curEmoji));
 refreshPreview();
 };

 // URL 预览
 const cu = $('#coverUrl');
 if (cu) cu.oninput = () => { curUrl = cu.value.trim(); refreshPreview(); };

 // 上传预览（读为 dataURL）
 const cf = $('#coverFile');
 if (cf) cf.onchange = (e) => {
 const f = e.target.files && e.target.files[0];
 if (!f) return;
 if (f.size > 5 * 1024 * 1024) { toast('图片太大（>5MB），请压缩后再试'); cf.value = ''; return; }
 const reader = new FileReader();
 reader.onload = () => {
 curDataUrl = reader.result;
 refreshPreview();
 toast('✓ 已选择本地封面');
 };
 reader.readAsDataURL(f);
 };

 refreshPreview();

 return {
 getCover() {
        if (curType === 'emoji') return { coverType: 'emoji', cover: curEmoji, emoji: curEmoji };
 if (curType === 'url') return { coverType: 'url', cover: curUrl, emoji: '' };
 if (curType === 'upload') return { coverType: 'upload', cover: curDataUrl, emoji: '' };
 }
 };
 }

 function renderPortfolio() {
 if (state.portfolio.length === 0) {
 $('#portfolioList').innerHTML = '<div class="empty-state" style="grid-column: 1/-1;"><span class="empty-state-icon">🎮</span>还没有作品，点击"添加作品"开始吧～</div>';
 } else {
 $('#portfolioList').innerHTML = state.portfolio.map((p) => {
 const open = portfolioExpanded.has(p.id);
 return `
 <div class="portfolio-card ${open ? 'open' : ''}" data-portfolio="${p.id}">
 <div class="portfolio-head" data-toggle="${p.id}">
 ${portfolioCoverHtml(p, 60)}
 <div class="portfolio-name">${escapeHtml(p.name)}</div>
 <span class="portfolio-chevron ${open ? 'up' : ''}">${open ? '▾' : '▸'}</span>
 </div>
 ${open ? `
 <div class="portfolio-detail">
 <div class="portfolio-desc">${escapeHtml(p.desc || '')}</div>
 <div class="portfolio-count">${p.subitems.length} 个子项目</div>
 <div class="portfolio-subitems">
 ${p.subitems.map((s, sidx) => `
 <div class="subitem">
 <div style="flex: 1;">
 <div class="subitem-name">${escapeHtml(s.name)}</div>
 <div class="subitem-content">${escapeHtml(s.content)}</div>
 </div>
 <button class="btn danger" data-del-subitem="${p.id}|${sidx}" style="font-size: 10px; padding: 2px 6px;">×</button>
 </div>
 `).join('')}
 <button class="btn" data-add-subitem="${p.id}" style="margin-top: 8px; font-size: 11px; padding: 4px 8px;">+ 添加子项目</button>
 </div>
 <div style="margin-top: 10px; text-align: right;">
 <button class="btn" data-rename-portfolio="${p.id}" style="font-size: 11px; padding: 4px 8px;">编辑</button>
 <button class="btn danger" data-del-portfolio="${p.id}" style="font-size: 11px; padding: 4px 8px;">删除</button>
 </div>
 </div>` : ''}
 </div>`;
 }).join('');

 // 折叠 / 展开
 $$('[data-toggle]').forEach(h => {
 h.onclick = () => {
 const id = h.dataset.toggle;
 if (portfolioExpanded.has(id)) portfolioExpanded.delete(id);
 else portfolioExpanded.add(id);
 renderPortfolio();
 };
 });

 // 删除子项
 $$('[data-del-subitem]').forEach(btn => {
 btn.onclick = () => {
 const [pid, sidx] = btn.dataset.delSubitem.split('|');
 const portfolio = state.portfolio.find(p => p.id === pid);
 portfolio.subitems.splice(parseInt(sidx), 1);
 saveData();
 renderPortfolio();
 };
 });

 // 添加子项
 $$('[data-add-subitem]').forEach(btn => {
 btn.onclick = () => {
 const pid = btn.dataset.addSubitem;
 showModal('添加子项目', `
 <div class="modal-field">
 <label class="modal-label">子项目名称</label>
 <input class="modal-input" id="subName" placeholder="例如：风格 / 主题 / 人物设定">
 </div>
 <div class="modal-field">
 <label class="modal-label">内容</label>
 <textarea class="modal-textarea" id="subContent" placeholder="详细描述..."></textarea>
 </div>
 `, () => {
 const name = $('#subName').value.trim();
 const content = $('#subContent').value.trim();
 if (!name) { toast('请输入子项目名'); return; }
 const portfolio = state.portfolio.find(p => p.id === pid);
 portfolio.subitems.push({ name, content });
 saveData();
 renderPortfolio();
 toast('✓ 已添加');
 });
 };
 });

 // 编辑作品
 $$('[data-rename-portfolio]').forEach(btn => {
 btn.onclick = () => {
 const pid = btn.dataset.renamePortfolio;
 const portfolio = state.portfolio.find(p => p.id === pid);
 const content = `
 <div class="modal-field">
 <label class="modal-label">作品名</label>
 <input class="modal-input" id="editName" value="${escapeHtml(portfolio.name)}">
 </div>
 <div class="modal-field">
 <label class="modal-label">简介</label>
 <textarea class="modal-textarea" id="editDesc">${escapeHtml(portfolio.desc || '')}</textarea>
 </div>
 ${portfolioCoverPickerHtml(portfolio)}
 `;
 showModal('编辑作品', content, () => {
 const picker = bindCoverPicker(portfolio);
 // 重新绑定一次以取最新值
 const finalCover = (() => {
 const ce = $('#customEmoji');
 const cu = $('#coverUrl');
 const cf = $('#coverFile');
 // 直接读 DOM 当前值（更可靠，不依赖 bindCoverPicker 闭包）
 const activeTab = $$('#coverTabs .cover-tab').find(t => t.classList.contains('active'));
 const t = activeTab ? activeTab.dataset.ctab : 'emoji';
 if (t === 'emoji') return { coverType: 'emoji', cover: ce ? ce.value.trim() || '🎮' : '🎮', emoji: ce ? ce.value.trim() || '🎮' : '🎮' };
 if (t === 'url') return { coverType: 'url', cover: cu ? cu.value.trim() : '', emoji: '' };
 if (t === 'upload') {
 // 上传值在 coverPreview 的 background-image dataURL 上
 const pv = $('#coverPreview .portfolio-icon-img');
 if (pv) {
 const m = (pv.style.backgroundImage || '').match(/url\("?(.+?)"?\)/);
 if (m) return { coverType: 'upload', cover: m[1], emoji: '' };
 }
 // 没新上传：保留旧的
 return { coverType: portfolio.coverType || 'upload', cover: portfolio.cover || '', emoji: '' };
 }
 return { coverType: 'emoji', cover: '🎮', emoji: '🎮' };
 })();
 portfolio.name = $('#editName').value.trim();
 portfolio.desc = $('#editDesc').value.trim();
 portfolio.coverType = finalCover.coverType;
 portfolio.cover = finalCover.cover;
 portfolio.emoji = finalCover.coverType === 'emoji' ? finalCover.cover : '';
 saveData();
 renderPortfolio();
 toast('✓ 已保存');
 });
 // 首次渲染后立即绑定（让 tab / emoji 预览可交互）
 setTimeout(() => bindCoverPicker(portfolio), 0);
 };
 });

 $$('[data-del-portfolio]').forEach(btn => {
 btn.onclick = () => {
 const pid = btn.dataset.delPortfolio;
 confirmDialog('确定删除这个作品吗？所有子项目都会丢失。', () => {
 state.portfolio = state.portfolio.filter(p => p.id !== pid);
 saveData();
 renderPortfolio();
 });
 };
 });
 }

 $('#addPortfolioBtn').onclick = () => {
 const initial = { coverType: 'emoji', cover: '🎮', emoji: '🎮' };
 const content = `
 <div class="modal-field">
 <label class="modal-label">作品名</label>
 <input class="modal-input" id="newPfName" placeholder="例如：长篇小说《星海》">
 </div>
 <div class="modal-field">
 <label class="modal-label">简介</label>
 <textarea class="modal-textarea" id="newPfDesc" placeholder="一句话介绍"></textarea>
 </div>
 ${portfolioCoverPickerHtml(initial)}
 `;
 showModal('添加作品', content, () => {
 const name = $('#newPfName').value.trim();
 if (!name) { toast('请输入作品名'); return false; }
 const activeTab = $$('#coverTabs .cover-tab').find(t => t.classList.contains('active'));
 const t = activeTab ? activeTab.dataset.ctab : 'emoji';
 let finalCover = { coverType: 'emoji', cover: '🎮', emoji: '🎮' };
 if (t === 'emoji') {
 const ce = $('#customEmoji');
 const e = ce ? ce.value.trim() : '🎮';
 finalCover = { coverType: 'emoji', cover: e || '🎮', emoji: e || '🎮' };
 } else if (t === 'url') {
 const cu = $('#coverUrl');
 const u = cu ? cu.value.trim() : '';
 if (!u) { toast('请填写图片链接，或切到 Emoji 模式'); return false; }
 finalCover = { coverType: 'url', cover: u, emoji: '' };
 } else if (t === 'upload') {
 const pv = $('#coverPreview .portfolio-icon-img');
 if (pv) {
 const m = (pv.style.backgroundImage || '').match(/url\("?(.+?)"?\)/);
 if (m) finalCover = { coverType: 'upload', cover: m[1], emoji: '' };
 }
 if (finalCover.coverType !== 'upload') { toast('请先选择一张本地图片'); return false; }
 }
 state.portfolio.push({
 id: 'pf_' + Date.now(),
 name,
 desc: $('#newPfDesc').value.trim(),
 coverType: finalCover.coverType,
 cover: finalCover.cover,
 emoji: finalCover.coverType === 'emoji' ? finalCover.cover : '',
 subitems: [],
 });
 saveData();
 renderPortfolio();
 toast('✓ 已添加作品');
 });
 setTimeout(() => bindCoverPicker(initial), 0);
 };
 }

 // ============================================
 // 记账
 // ============================================
 function renderFinance() {
 const now = new Date();
 const month = now.getMonth();
 const year = now.getFullYear();
 const records = state.finance.records.filter(r => {
 const d = new Date(r.date);
 return d.getFullYear() === year && d.getMonth() === month;
 });

 const income = records.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
 const expense = records.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
 const balance = income - expense;

 $('#totalIncome').textContent = '¥' + income.toFixed(0);
 $('#totalExpense').textContent = '¥' + expense.toFixed(0);
 $('#totalBalance').textContent = '¥' + balance.toFixed(0);

 // 本周支出（按日）
 const weekData = [];
 const today = new Date();
 const dayOfWeek = today.getDay();
 const weekStart = new Date(today);
 weekStart.setDate(today.getDate() - dayOfWeek);
 for (let i = 0; i < 7; i++) {
 const d = new Date(weekStart);
 d.setDate(weekStart.getDate() + i);
 const ds = getDateStr(d);
 const dayExpense = state.finance.records
 .filter(r => r.date === ds && r.type === 'expense')
 .reduce((s, r) => s + r.amount, 0);
 weekData.push({ day: d.getDate(), dow: ['日','一','二','三','四','五','六'][i], value: dayExpense });
 }
 const maxWeek = Math.max(...weekData.map(d => d.value), 1);
 const weekEmojis = ['','','','','','',''];
 $('#weekChart').innerHTML = weekData.map((d, i) => {
 const height = (d.value / maxWeek) * 100;
 return `
 <div class="sanrio-bar">
 <div class="sanrio-bar-fill" style="height: ${height}%; background: linear-gradient(180deg, var(--pink-300), var(--cinnamoroll-blue))">${d.value > 0 ? weekEmojis[i] : ''}</div>
 <div class="sanrio-bar-label">${d.dow}</div>
 </div>
 `;
 }).join('');

 // 分类饼图（像素风格）
 const categoryData = {};
 records.filter(r => r.type === 'expense').forEach(r => {
 categoryData[r.category] = (categoryData[r.category] || 0) + r.amount;
 });

 const catColors = {
 '餐饮': '#FFB6C1',
 '交通': '#BFE3F5',
 '购物': '#FFE89B',
 '娱乐': '#C8A8E9',
 '学习': '#B8E6C8',
 '居住': '#FFCBA4',
 '医疗': '#FFA8C4',
 '其他': '#D4D4D4',
 };

 const totalCat = Object.values(categoryData).reduce((s, v) => s + v, 0) || 1;
 const pieData = Object.entries(categoryData).map(([cat, val]) => ({
 name: cat,
 value: val,
 percent: Math.round((val / totalCat) * 100),
 color: catColors[cat] || 'var(--text-light)',
 })).sort((a, b) => b.value - a.value);

 // 绘制 SVG 饼图
 if (pieData.length === 0) {
 $('#pieChart').innerHTML = '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: var(--bg-pixel); border: 2px solid var(--text-dark); font-size: 36px;"></div>';
 } else {
 let cumulative = 0;
 const radius = 60;
 const cx = 70, cy = 70;
 const svgParts = pieData.map(slice => {
 const startAngle = (cumulative / 100) * Math.PI * 2 - Math.PI / 2;
 cumulative += slice.percent;
 const endAngle = (cumulative / 100) * Math.PI * 2 - Math.PI / 2;
 const x1 = cx + radius * Math.cos(startAngle);
 const y1 = cy + radius * Math.sin(startAngle);
 const x2 = cx + radius * Math.cos(endAngle);
 const y2 = cy + radius * Math.sin(endAngle);
 const largeArc = slice.percent > 50 ? 1 : 0;
 const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
 return `<path d="${path}" fill="${slice.color}" stroke="var(--text-main)" stroke-width="2"/>`;
 }).join('');
 $('#pieChart').innerHTML = `
 <svg viewBox="0 0 140 140" style="width: 100%; height: 100%;">
 ${svgParts}
 <circle cx="70" cy="70" r="22" fill="var(--bg-card)" stroke="var(--text-main)" stroke-width="2"/>
 </svg>
 <div class="sanrio-pie-center"></div>
 `;
 }

 $('#pieLegend').innerHTML = pieData.length === 0 ? '<div style="color: var(--text-mid); font-size: 12px;">暂无支出</div>' : pieData.map(p => `
 <div class="pie-legend-item">
 <div class="pie-legend-dot" style="background: ${p.color}"></div>
 <span>${p.name}</span>
 <span style="margin-left: auto; color: var(--pink-500); font-weight: 700;">${p.percent}%</span>
 </div>
 `).join('');

 // 记录
 if (records.length === 0) {
 $('#financeRecords').innerHTML = '<div class="empty-state">本月还没有记账～</div>';
 } else {
 const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
 $('#financeRecords').innerHTML = sorted.slice(0, 20).map(r => {
 const icons = { '餐饮':'','交通':'','购物':'','娱乐':'🎮','学习':'📚','居住':'🏠','医疗':'','其他':'' };
 return `
 <div class="finance-record">
 <div class="finance-record-icon">${icons[r.category] || ''}</div>
 <div class="finance-record-info">
 <div class="finance-record-name">${r.name}</div>
 <div class="finance-record-meta">${r.date} · ${r.category}</div>
 </div>
 <div class="finance-record-amount ${r.type}">${r.type === 'income' ? '+' : '-'}¥${r.amount}</div>
 <button class="btn danger" data-del-fin="${r.id}" style="font-size: 10px; padding: 2px 6px;">删</button>
 </div>
 `;
 }).join('');

 $$('[data-del-fin]').forEach(btn => {
 btn.onclick = () => {
 const id = parseInt(btn.dataset.delFin);
 state.finance.records = state.finance.records.filter(r => r.id !== id);
 saveData();
 renderFinance();
 };
 });
 }

 // 添加按钮
 const showAddFinance = (type) => {
 const cats = type === 'income' ? ['工资','奖金','副业','投资','其他'] : ['餐饮','交通','购物','娱乐','学习','居住','医疗','其他'];
 showModal(`添加${type === 'income' ? '收入' : '支出'}`, `
 <div class="modal-field">
 <label class="modal-label">类别</label>
 <select class="modal-select" id="finCat">
 ${cats.map(c => `<option value="${c}">${c}</option>`).join('')}
 </select>
 </div>
 <div class="modal-field">
 <label class="modal-label">名称</label>
 <input class="modal-input" id="finName" placeholder="例如：午餐">
 </div>
 <div class="modal-field">
 <label class="modal-label">金额</label>
 <input class="modal-input" id="finAmount" type="number" placeholder="金额" step="0.01">
 </div>
 `, () => {
 const category = $('#finCat').value;
 const name = $('#finName').value.trim();
 const amount = parseFloat($('#finAmount').value) || 0;
 if (!name) { toast('请输入名称'); return; }
 if (amount <= 0) { toast('请输入金额'); return; }
 state.finance.records.push({
 id: Date.now(),
 type,
 category,
 name,
 amount,
 date: getDateStr(new Date()),
 });
 saveData();
 renderFinance();
 toast('✓ 已添加');
 });
 };
 $('#addIncomeBtn').onclick = () => showAddFinance('income');
 $('#addExpenseBtn').onclick = () => showAddFinance('expense');
 }

 // ============================================
 // 设置
 // ============================================
 function renderSettings() {
 $('#nicknameInput').value = state.nickname;
 $('#cityInput').value = state.city || '';
 $('#profileName').textContent = state.nickname || 'Hannah';

 const avatars = DATA.PIXEL_AVATARS || [];
 const current = avatars.find(a => a.id === state.avatar) || avatars[0];

 // Use custom avatar if set, otherwise preset
 if (state.customAvatar) {
 $('#profileAvatar').src = state.customAvatar;
 } else {
 $('#profileAvatar').src = NAV_ICON_BASE64[current.file] ? NAV_ICON_BASE64[current.file] : `assets/avatars/${current.file}`;
 }
 $('#currentMascotName').textContent = '旺仔';
 $('#mascotEnergyValue').textContent = ` ${state.mascot.energy || 0}`;
 var hv = $('#mascotHealthValue'), mv = $('#mascotMoodValue');
 if (hv) hv.textContent = ` ${state.mascot.health == null ? 70 : state.mascot.health}`;
 if (mv) mv.textContent = ` ${state.mascot.mood == null ? 70 : state.mascot.mood}`;

 // 头像上传
 const uploadBox = $('#avatarUploadBox');
 const uploadInput = $('#avatarUpload');
 if (uploadBox) {
 uploadBox.onclick = () => uploadInput.click();
 uploadInput.onchange = (e) => {
 const file = e.target.files[0];
 if (!file) return;
 if (file.size > 2 * 1024 * 1024) {
 toast('⚠ 图片不能超过2MB');
 return;
 }
 const reader = new FileReader();
 reader.onload = (ev) => {
 state.customAvatar = ev.target.result;
 saveData();
 renderSettings();
 renderDashboard();
 toast('✓ 头像上传成功！');
 };
 reader.readAsDataURL(file);
 };
 }

 $('#nicknameInput').onchange = (e) => {
 state.nickname = e.target.value.trim() || 'Hannah';
 saveData();
 updateTopTime();
 $('#profileName').textContent = state.nickname;
 toast('✓ 昵称已更新');
 };
 $('#cityInput').onchange = (e) => {
 state.city = e.target.value.trim();
 saveData();
 toast('✓ 城市已更新');
 };

 $('#exportDataBtn').onclick = () => {
 const json = JSON.stringify(state, null, 2);
 const blob = new Blob([json], { type: 'application/json' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url;
 a.download = `pixel_workbench_${getDateStr(new Date())}.json`;
 a.click();
 URL.revokeObjectURL(url);
 toast('✓ 已导出');
 };

 $('#importDataBtn').onclick = () => $('#importFile').click();
 $('#importFile').onchange = (e) => {
 const file = e.target.files[0];
 if (!file) return;
 const reader = new FileReader();
 reader.onload = (ev) => {
 try {
 const imported = JSON.parse(ev.target.result);
 confirmDialog('导入将覆盖当前数据，确定吗？', () => {
 state = imported;
 saveData();
 location.reload();
 });
 } catch (err) {
 toast(' 文件格式错误');
 }
 };
 reader.readAsText(file);
 };

 $('#clearDataBtn').onclick = () => {
 confirmDialog('⚠ 确定清空所有数据吗？此操作不可恢复！', () => {
 localStorage.removeItem(STORAGE_KEY);
 try { localStorage.removeItem(BG_KEY); } catch (e) {}
 location.reload();
 });
 };
 renderBackgroundSettings();
 }

// ============================================
// 主题背景：用户本地图片作为全站背景
// 独立 localStorage 键（不污染数据导出、不随清空以外场景丢失）
// ============================================
const BG_KEY = 'pixel_workbench_background';
let _bgImage = ''; // 当前图片 dataURL（模块内缓存，含未保存的实时预览）

// 磨砂玻璃默认参数：导入图片后自动套用，背景柔和自然、保持中性无色
const FROST_BLUR = 12;   // 模糊半径（px）
const FROST_SCRIM = 40; // 中性磨砂遮罩强度（%）

// 将图片压缩/缩放后写入（限制最长边 1920，webp 优先、回退 jpeg），避免 localStorage 爆容量
function bgDownscale(dataUrl, maxDim, cb) {
  try {
    const img = new Image();
    img.onload = function () {
      const w = img.width, h = img.height;
      if (w <= maxDim && h <= maxDim) { cb(dataUrl); return; }
      const scale = Math.min(1, maxDim / Math.max(w, h));
      const cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
      const cv = document.createElement('canvas');
      cv.width = cw; cv.height = ch;
      const ctx = cv.getContext('2d');
      ctx.drawImage(img, 0, 0, cw, ch);
      let out = cv.toDataURL('image/webp', 0.85);
      if (out.indexOf('data:image/webp') !== 0) out = cv.toDataURL('image/jpeg', 0.85);
      cb(out);
    };
    img.onerror = function () { cb(dataUrl); };
    img.src = dataUrl;
  } catch (e) { cb(dataUrl); }
}

function bgLoadConfig() {
  try {
    const raw = localStorage.getItem(BG_KEY);
    if (!raw) return null;
    const cfg = JSON.parse(raw);
    if (!cfg || typeof cfg !== 'object') return null;
    return cfg;
  } catch (e) { return null; }
}

function bgCollectFromUI() {
  const sizeEl = document.querySelector('input[name="bgSize"]:checked');
  const size = sizeEl ? sizeEl.value : 'cover';
  const blur = parseInt($('#bgBlur').value, 10) || 0;
  const brightness = parseInt($('#bgBrightness').value, 10) || 100;
  const opv = parseInt($('#bgOpacity').value, 10);
  if (isNaN(opv)) return null;
  const scrim = parseInt($('#bgScrim').value, 10) || 0;
  return { image: _bgImage || '', size: size, blur: blur, brightness: brightness, opacity: opv, scrim: scrim };
}

// 通过 CSS 变量统一注入，避免局部样式冲突；各页面/组件背景表现一致
function applyAppBackground(cfg) {
  cfg = cfg || {};
  const root = document.documentElement;
  const hasImg = !!cfg.image;
  root.style.setProperty('--app-bg-image', hasImg ? 'url("' + cfg.image + '")' : 'none');
  root.style.setProperty('--app-bg-size', cfg.size || 'cover');
  root.style.setProperty('--app-bg-blur', (cfg.blur != null ? cfg.blur : 0) + 'px');
  root.style.setProperty('--app-bg-brightness', (cfg.brightness != null ? cfg.brightness : 100) + '%');
  root.style.setProperty('--app-bg-opacity', ((cfg.opacity != null ? cfg.opacity : 100) / 100));
  const scrim = cfg.scrim != null ? cfg.scrim : 0;
  root.style.setProperty('--app-bg-scrim', scrim > 0 ? 'color-mix(in srgb, var(--app-bg-glass) ' + scrim + '%, transparent)' : 'transparent');
  document.body.classList.toggle('app-bg-on', hasImg);
}

// 页面加载时应用已保存背景
function bgApplySaved() {
  let cfg = bgLoadConfig();
  if (cfg) {
    // 旧版「无磨砂 + 粉色调」配置迁移为中性磨砂玻璃默认，去除粉色调
    if (cfg.image && (!cfg.blur) && (!cfg.scrim)) {
      cfg.blur = FROST_BLUR;
      cfg.scrim = FROST_SCRIM;
      try { localStorage.setItem(BG_KEY, JSON.stringify(cfg)); } catch (e) {}
    }
    _bgImage = cfg.image || '';
    applyAppBackground(cfg);
  }
  else { _bgImage = ''; applyAppBackground({}); }
}

function renderBackgroundSettings() {
  const cfg = bgLoadConfig() || {};
  _bgImage = cfg.image || '';

  const size = cfg.size || 'cover';
  const rCover = document.querySelector('input[name="bgSize"][value="cover"]');
  const rContain = document.querySelector('input[name="bgSize"][value="contain"]');
  if (rCover) rCover.checked = (size === 'cover');
  if (rContain) rContain.checked = (size === 'contain');

  const setS = (id, valId, val, suffix) => {
    const el = $('#' + id), vel = $('#' + valId);
    if (el) el.value = val;
    if (vel) vel.textContent = val + suffix;
  };
  setS('bgBlur', 'bgBlurVal', cfg.blur != null ? cfg.blur : 0, 'px');
  setS('bgBrightness', 'bgBrightVal', cfg.brightness != null ? cfg.brightness : 100, '%');
  setS('bgOpacity', 'bgOpacityVal', cfg.opacity != null ? cfg.opacity : 100, '%');
  setS('bgScrim', 'bgScrimVal', cfg.scrim != null ? cfg.scrim : 0, '%');

  const prev = $('#bgPreview'), prevImg = $('#bgPreviewImg');
  if (prevImg && _bgImage) prevImg.src = _bgImage;
  if (prev) prev.style.display = _bgImage ? '' : 'none';

  const box = $('#bgUploadBox'), inp = $('#bgUpload');
  if (box && inp) {
    box.onclick = () => inp.click();
    inp.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 8 * 1024 * 1024) { toast('⚠ 图片建议小于 8MB'); inp.value = ''; return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        bgDownscale(ev.target.result, 1920, (dataUrl) => {
          const wasEmpty = !_bgImage; // 首次导入图片
          _bgImage = dataUrl;
          if (wasEmpty) {
            // 导入即套用磨砂玻璃默认，背景柔和自然且不带粉色调
            const bEl = $('#bgBlur'); if (bEl) { bEl.value = FROST_BLUR; const bv = $('#bgBlurVal'); if (bv) bv.textContent = FROST_BLUR + 'px'; }
            const sEl = $('#bgScrim'); if (sEl) { sEl.value = FROST_SCRIM; const sv = $('#bgScrimVal'); if (sv) sv.textContent = FROST_SCRIM + '%'; }
          }
          if (prevImg) prevImg.src = dataUrl;
          if (prev) prev.style.display = '';
          applyAppBackground(bgCollectFromUI()); // 实时预览
          toast('✓ 图片已载入，点击「保存背景」生效');
        });
      };
      reader.readAsDataURL(file);
      inp.value = '';
    };
  }

  const bindSlider = (id, valId, suffix) => {
    const el = $('#' + id);
    if (!el) return;
    el.oninput = () => {
      const vel = $('#' + valId);
      if (vel) vel.textContent = el.value + suffix;
      applyAppBackground(bgCollectFromUI()); // 实时预览
    };
  };
  bindSlider('bgBlur', 'bgBlurVal', 'px');
  bindSlider('bgBrightness', 'bgBrightVal', '%');
  bindSlider('bgOpacity', 'bgOpacityVal', '%');
  bindSlider('bgScrim', 'bgScrimVal', '%');

  document.querySelectorAll('input[name="bgSize"]').forEach(r => {
    r.onchange = () => applyAppBackground(bgCollectFromUI());
  });

  const applyBtn = $('#bgApplyBtn');
  if (applyBtn) applyBtn.onclick = () => {
    const c = bgCollectFromUI();
    if (!c || !c.image) { toast('⚠ 请先导入一张图片'); return; }
    try { localStorage.setItem(BG_KEY, JSON.stringify(c)); toast('✓ 背景已保存'); }
    catch (e) { toast('⚠ 保存失败，图片可能过大'); }
  };

  const resetBtn = $('#bgResetBtn');
  if (resetBtn) resetBtn.onclick = () => {
    if (!_bgImage && !bgLoadConfig()) { toast('当前没有背景'); return; }
    _bgImage = '';
    try { localStorage.removeItem(BG_KEY); } catch (e) {}
    applyAppBackground({});
    const rc = document.querySelector('input[name="bgSize"][value="cover"]');
    if (rc) rc.checked = true;
    const defs = { bgBlur: 0, bgBrightness: 100, bgOpacity: 100, bgScrim: 0 };
    Object.keys(defs).forEach(id => { const el = $('#' + id); if (el) el.value = defs[id]; });
    const vmap = { bgBlurVal: '0px', bgBrightVal: '100%', bgOpacityVal: '100%', bgScrimVal: '0%' };
    Object.keys(vmap).forEach(k => { const vel = $('#' + k); if (vel) vel.textContent = vmap[k]; });
    if (prev) prev.style.display = 'none';
    toast('↺ 已恢复默认背景');
  };
}

// ============================================
// 初始化
// ============================================
// ============================================
// 番茄钟 / 专注模块
// ============================================
 let focusTimerId = null; // setInterval 句柄

 // 能量兑换规则：每专注满 2 分钟（120 秒）兑换桌面宠物 1 点能量
 const FOCUS_ENERGY_PER_SEC = 1 / 120;

 function ensureFocusState() {
 if (!state.focus) {
 state.focus = { sessions: [], running: null, settings: { mode: 'cd', plannedSec: 1500, activeTab: 'timer' } };
 }
 if (!state.focus.sessions) state.focus.sessions = [];
 if (!state.focus.settings) state.focus.settings = { mode: 'cd', plannedSec: 1500, activeTab: 'timer' };
 if (!state.focus.settings.activeTab) state.focus.settings.activeTab = 'timer';
 }

 function getFocusElapsedSec(r) {
 if (!r) return 0;
 if (r.status === 'paused') return r.accumSec;
 return r.accumSec + Math.floor((Date.now() - r.startTs) / 1000);
 }

 function formatFocusTime(sec) {
 sec = Math.max(0, Math.floor(sec));
 const h = Math.floor(sec / 3600);
 const m = Math.floor((sec % 3600) / 60);
 const s = sec % 60;
 const mm = String(m).padStart(2, '0');
 const ss = String(s).padStart(2, '0');
 return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
 }

 // 仅刷新计时器动态数字（轻量，供 tick 调用）
 function updateFocusDisplay() {
 const r = state.focus.running;
 const timeEl = $('#focusTime');
 const progWrap = $('#focusProgressWrap');
 const progFill = $('#focusProgressFill');
 const energyEl = $('#focusEnergyPreview');
 if (!timeEl) return;
 if (!r) {
 const planned = state.focus.settings.plannedSec;
 timeEl.textContent = state.focus.settings.mode === 'cd' ? formatFocusTime(planned) : '00:00';
 if (progWrap) progWrap.style.display = 'none';
 if (energyEl) energyEl.textContent = ' 本次预计能量 +0';
 return;
 }
 const elapsed = getFocusElapsedSec(r);
 if (r.mode === 'cd') {
 const remaining = Math.max(0, r.plannedSec - elapsed);
 timeEl.textContent = formatFocusTime(remaining);
 if (progWrap) {
 progWrap.style.display = 'block';
 progFill.style.width = Math.min(100, (elapsed / r.plannedSec) * 100) + '%';
 }
 } else {
 timeEl.textContent = formatFocusTime(elapsed);
 if (progWrap) progWrap.style.display = 'none';
 }
 if (energyEl) energyEl.textContent = ` 本次预计能量 +${Math.floor(elapsed * FOCUS_ENERGY_PER_SEC)}`;
 }

 function paintFocusButtons() {
 const r = state.focus.running;
 const startBtn = $('#focusStartBtn');
 const pauseBtn = $('#focusPauseBtn');
 const stopBtn = $('#focusStopBtn');
 if (!startBtn) return;
 if (!r) {
 startBtn.style.display = '';
 startBtn.textContent = '▶ 开始';
 pauseBtn.style.display = 'none';
 stopBtn.style.display = 'none';
 } else if (r.status === 'running') {
 startBtn.style.display = 'none';
 pauseBtn.style.display = '';
 pauseBtn.textContent = '⏸ 暂停';
 stopBtn.style.display = '';
 } else { // paused
 startBtn.style.display = '';
 startBtn.textContent = '▶ 继续';
 pauseBtn.style.display = 'none';
 stopBtn.style.display = '';
 }
 }

 function renderFocus() {
 ensureFocusState();
 const tab = state.focus.settings.activeTab || 'timer';

 // 标签页高亮 + 面板切换
 $$('.focus-tab').forEach(b => b.classList.toggle('active', b.dataset.focustab === tab));
 const timerPanel = $('#focusTimerPanel');
 const monthPanel = $('#focusMonthPanel');
 const yearPanel = $('#focusYearPanel');
 if (timerPanel) timerPanel.style.display = tab === 'timer' ? '' : 'none';
 if (monthPanel) monthPanel.style.display = tab === 'month' ? '' : 'none';
 if (yearPanel) yearPanel.style.display = tab === 'year' ? '' : 'none';

 if (tab === 'timer') {
 // 模式切换按钮
 $$('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === state.focus.settings.mode));
 const durBox = $('#focusDurationBox');
 if (durBox) durBox.style.display = state.focus.settings.mode === 'cd' ? '' : 'none';
 // 预设高亮
 $$('.dur-btn').forEach(b => b.classList.toggle('active', parseInt(b.dataset.min, 10) * 60 === state.focus.settings.plannedSec));
 const custom = $('#focusCustomMin');
 if (custom) custom.value = Math.round(state.focus.settings.plannedSec / 60);
 updateFocusDisplay();
 paintFocusButtons();
 } else {
 renderFocusCharts(tab);
 }
 }

 function switchFocusTab(tab) {
 ensureFocusState();
 state.focus.settings.activeTab = tab;
 saveData();
 renderFocus();
 }

 function setFocusMode(mode) {
 ensureFocusState();
 if (state.focus.running) {
 toast('计时进行中，结束后才能切换模式～');
 return;
 }
 state.focus.settings.mode = mode;
 saveData();
 renderFocus();
 }

 function setFocusPlanned(min) {
 ensureFocusState();
 if (state.focus.running) return;
 min = Math.max(1, Math.min(180, parseInt(min, 10) || 25));
 state.focus.settings.plannedSec = min * 60;
 saveData();
 renderFocus();
 }

 function startFocusInterval() {
 if (focusTimerId) clearInterval(focusTimerId);
 focusTimerId = setInterval(tickFocus, 250);
 }
 function stopFocusInterval() {
 if (focusTimerId) { clearInterval(focusTimerId); focusTimerId = null; }
 }

 function startFocusTimer() {
 ensureFocusState();
 let r = state.focus.running;
 if (r && r.status === 'paused') {
 // 从暂停恢复
 r.startTs = Date.now();
 r.status = 'running';
 } else if (!r) {
 r = {
 mode: state.focus.settings.mode,
 plannedSec: state.focus.settings.plannedSec,
 startTs: Date.now(),
 accumSec: 0,
 status: 'running',
 };
 state.focus.running = r;
 }
 saveData();
 startFocusInterval();
 renderFocus();
 }

 function pauseFocus() {
 ensureFocusState();
 const r = state.focus.running;
 if (!r || r.status !== 'running') return;
 r.accumSec = getFocusElapsedSec(r);
 r.status = 'paused';
 stopFocusInterval();
 saveData();
 renderFocus();
 }

 function stopFocus() {
 ensureFocusState();
 if (!state.focus.running) return;
 finishFocusSession(false);
 }

 function completeFocus() {
 ensureFocusState();
 if (!state.focus.running) return;
 finishFocusSession(true);
 }

 // 结束一次专注：记录会话 + 换算能量 + 通知桌面宠物
 function finishFocusSession(isComplete) {
 const r = state.focus.running;
 if (!r) return;
 const elapsed = getFocusElapsedSec(r);
 stopFocusInterval();
 state.focus.running = null;

 if (elapsed >= 1) {
 const energy = Math.floor(elapsed * FOCUS_ENERGY_PER_SEC);
 const session = {
 date: getDateStr(new Date()),
 startTs: r.startTs,
 endTs: Date.now(),
 durationSec: elapsed,
 mode: r.mode,
 plannedSec: r.plannedSec,
 energy: energy,
 };
 state.focus.sessions.push(session);
 saveData();
 if (energy > 0) {
 addMascotEnergy(energy);
 toast(` 专注完成！累计 ${Math.round(elapsed / 60)} 分钟，获得 ${energy} 能量，已通知桌面宠物～`);
 } else {
 toast(' 本次专注已记录');
 }
 } else {
 saveData();
 }
 renderFocus();
 }

 // 通知桌面宠物模块更新能量状态
 function addMascotEnergy(amount) {
 if (!amount) return;
 state.mascot.energy = (state.mascot.energy || 0) + amount;
 saveData();
 updateMascotStats(); // 刷新桌面宠物能量徽章（）
 const ev = $('#mascotEnergyValue'); // 设置页能量值
 if (ev) ev.textContent = ' ' + state.mascot.energy;
 // 桌面宠物互动反馈（新 pet 系统：让小狗撒个娇 + 说句话）
 const pet = document.getElementById('desktopPet');
 if (pet && typeof window.petBounce === 'function') window.petBounce();
 if (typeof window.petSay === 'function') {
 window.petSay(`汪汪！收到 ${amount} 点能量，谢谢你专注的样子！`, { mood: 'excited', duration: 3500 });
 }
 }

 function tickFocus() {
 const r = state.focus.running;
 if (!r || r.status !== 'running') { stopFocusInterval(); return; }
 const elapsed = getFocusElapsedSec(r);
 if (r.mode === 'cd' && elapsed >= r.plannedSec) {
 completeFocus();
 return;
 }
 // 仅当停留在计时标签页时才刷新显示（其余标签页无需更新）
 if ((state.focus.settings.activeTab || 'timer') === 'timer') {
 updateFocusDisplay();
 }
 }

 function buildFocusBars(bars) {
 const max = Math.max(...bars.map(b => b.minutes), 1);
 const total = bars.reduce((s, b) => s + b.minutes, 0);
 if (total === 0) {
 return '<div class="focus-empty"> 暂无专注记录，开启第一次番茄钟吧！</div>';
 }
 const emojis = ['', '', '', '', '', '', '', '💪', '', '', '', ''];
 return bars.map((b, i) => {
 const h = (b.minutes / max) * 100;
 const emoji = b.minutes > 0 ? emojis[i % emojis.length] : '';
 return `<div class="sanrio-bar">` +
 `<div class="sanrio-bar-fill" style="height:${h}%; --bar-color: var(--pink-300); background: linear-gradient(180deg, var(--pink-300), var(--pink-500))">${emoji}</div>` +
 `<div class="sanrio-bar-label">${b.label}</div>` +
 `</div>`;
 }).join('');
 }

 function renderFocusCharts(scope) {
 ensureFocusState();
 const sessions = state.focus.sessions || [];
 const now = new Date();
 let totalSec = 0, count = 0, energy = 0;

 if (scope === 'month') {
 const y = now.getFullYear(), m = now.getMonth();
 const daysInMonth = new Date(y, m + 1, 0).getDate();
 const perDay = new Array(daysInMonth).fill(0);
 sessions.forEach(s => {
 const d = new Date(s.date);
 if (d.getFullYear() === y && d.getMonth() === m) {
 perDay[d.getDate() - 1] += s.durationSec;
 totalSec += s.durationSec; count++; energy += (s.energy || 0);
 }
 });
 const bars = perDay.map((sec, i) => ({ label: (i + 1), minutes: Math.round(sec / 60) }));
 const mt = $('#monthTotalMin'); if (mt) mt.textContent = Math.round(totalSec / 60);
 const mc = $('#monthTotalCount'); if (mc) mc.textContent = count;
 const me = $('#monthTotalEnergy'); if (me) me.textContent = energy;
 const chart = $('#focusMonthChart');
 if (chart) chart.innerHTML = buildFocusBars(bars);
 } else {
 const y = now.getFullYear();
 const perMonth = new Array(12).fill(0);
 sessions.forEach(s => {
 const d = new Date(s.date);
 if (d.getFullYear() === y) {
 perMonth[d.getMonth()] += s.durationSec;
 totalSec += s.durationSec; count++; energy += (s.energy || 0);
 }
 });
 const bars = perMonth.map((sec, i) => ({ label: (i + 1) + '月', minutes: Math.round(sec / 60) }));
 const yt = $('#yearTotalMin'); if (yt) yt.textContent = Math.round(totalSec / 60);
 const yc = $('#yearTotalCount'); if (yc) yc.textContent = count;
 const ye = $('#yearTotalEnergy'); if (ye) ye.textContent = energy;
 const chart = $('#focusYearChart');
 if (chart) chart.innerHTML = buildFocusBars(bars);
 }
 }

 // 初始化番茄钟：绑定事件 + 恢复进行中的计时（后台/重开自动续算）
 function initFocus() {
 ensureFocusState();

 $$('.focus-tab').forEach(b => {
 b.onclick = () => switchFocusTab(b.dataset.focustab);
 });
 $$('.mode-btn').forEach(b => {
 b.onclick = () => setFocusMode(b.dataset.mode);
 });
 $$('.dur-btn').forEach(b => {
 b.onclick = () => setFocusPlanned(b.dataset.min);
 });
 const custom = $('#focusCustomMin');
 if (custom) {
 custom.addEventListener('change', e => setFocusPlanned(e.target.value));
 custom.addEventListener('input', e => setFocusPlanned(e.target.value));
 }
 const startBtn = $('#focusStartBtn');
 if (startBtn) startBtn.onclick = startFocusTimer;
 const pauseBtn = $('#focusPauseBtn');
 if (pauseBtn) pauseBtn.onclick = pauseFocus;
 const stopBtn = $('#focusStopBtn');
 if (stopBtn) stopBtn.onclick = stopFocus;

 // 恢复进行中的计时（按 startTs 重新计算，支持跨后台/重开保持计时）
 const r = state.focus.running;
 if (r && r.status === 'running') {
 if (r.mode === 'cd' && getFocusElapsedSec(r) >= r.plannedSec) {
 completeFocus();
 } else {
 startFocusInterval();
 }
 }

 // 回到前台时立即同步一次（应对后台被节流）
 document.addEventListener('visibilitychange', () => {
 if (!document.hidden) {
 const rr = state.focus.running;
 if (rr && rr.status === 'running') {
 if (rr.mode === 'cd' && getFocusElapsedSec(rr) >= rr.plannedSec) completeFocus();
 else updateFocusDisplay();
 }
 }
 });
 }

 // ============================================
 // 人才库（人事招聘系统）- Talent Pool
 // ============================================
 // IndexedDB 简历文件存储（File/Blob 不能 localStorage 序列化）
 const TALENT_IDB = {
 dbName: 'pixel_workbench_talent',
 store: 'resumes',
 version: 1,
 _db: null,
 _open() {
 if (this._db) return Promise.resolve(this._db);
 return new Promise((resolve, reject) => {
 if (!window.indexedDB) { reject(new Error('no-idb')); return; }
 const req = indexedDB.open(this.dbName, this.version);
 req.onupgradeneeded = () => {
 const db = req.result;
 if (!db.objectStoreNames.contains(this.store)) db.createObjectStore(this.store);
 };
 req.onsuccess = () => { this._db = req.result; resolve(this._db); };
 req.onerror = () => reject(req.error);
 });
 },
 async putFile(id, file) {
 const db = await this._open();
 return new Promise((resolve, reject) => {
 const tx = db.transaction(this.store, 'readwrite');
 tx.objectStore(this.store).put(file, id);
 tx.oncomplete = () => resolve();
 tx.onerror = () => reject(tx.error);
 });
 },
 async getFile(id) {
 if (!id) return null;
 const db = await this._open();
 return new Promise((resolve, reject) => {
 const tx = db.transaction(this.store, 'readonly');
 const req = tx.objectStore(this.store).get(id);
 req.onsuccess = () => resolve(req.result || null);
 req.onerror = () => reject(req.error);
 });
 },
  async deleteFile(id) {
    if (!id) return;
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.store, 'readwrite');
      tx.objectStore(this.store).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
  // 读取全部简历原文件：{ fileId: File/Blob }
  async getAllFiles() {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.store, 'readonly');
      const store = tx.objectStore(this.store);
      const valsReq = store.getAll();
      const keysReq = store.getAllKeys();
      let vals = [], keys = [];
      valsReq.onsuccess = () => { vals = valsReq.result; };
      keysReq.onsuccess = () => { keys = keysReq.result; };
      tx.oncomplete = () => {
        const map = {};
        for (let i = 0; i < keys.length; i++) {
          if (vals[i]) map[String(keys[i])] = vals[i];
        }
        resolve(map);
      };
      tx.onerror = () => reject(tx.error);
    });
  },
};

// 简历原文件 ↔ base64（用于云同步打包进云端）
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
function dataUrlToBlob(dataUrl) {
  const [meta, b64] = String(dataUrl).split(',');
  const m = meta.match(/data:([^;]+);base64/);
  const mime = m ? m[1] : '';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// 全局弹窗助手：用事件委托接管 mask/close/cancel 关闭逻辑
 // 解决 onclick="$('#modalRoot')..." 字符串中 $ 找不到 window 引用的问题
 function openModal(html) {
 const root = $('#modalRoot');
 if (!root) return;
 root.innerHTML = html;
 // 委托关闭
 const onClick = (e) => {
 const t = e.target;
 if (!t) return;
 if (t.dataset && t.dataset.action === 'close') {
 root.innerHTML = '';
 document.removeEventListener('click', onClick, true);
 return;
 }
 if (t.classList && t.classList.contains('modal-mask')) {
 root.innerHTML = '';
 document.removeEventListener('click', onClick, true);
 return;
 }
 };
 document.addEventListener('click', onClick, true);
 // ESC 关闭
 const onKey = (e) => {
 if (e.key === 'Escape') {
 root.innerHTML = '';
 document.removeEventListener('keydown', onKey);
 document.removeEventListener('click', onClick, true);
 }
 };
 document.addEventListener('keydown', onKey);
 }

 // 字段识别 - 常见职业关键词（用于推断 position + tags）
 const TALENT_POSITION_HINTS = [
 { key: '前端', tags: ['前端','HTML','CSS','JavaScript','Vue','React','TypeScript','小程序'] },
 { key: '后端', tags: ['后端','Java','Python','Go','Node.js','Spring','Django','MySQL','Redis'] },
 { key: '全栈', tags: ['全栈','Full Stack'] },
 { key: '产品', tags: ['产品经理','PRD','需求分析','Axure','用户调研'] },
 { key: 'UI', tags: ['UI设计','视觉设计','Figma','Sketch','PS'] },
 { key: 'UX', tags: ['UX','交互设计','用户研究','可用性'] },
 { key: '运营', tags: ['运营','用户增长','活动策划','社群'] },
 { key: '市场', tags: ['市场','品牌','投放','内容营销'] },
 { key: 'HR', tags: ['人力资源','招聘','HRBP','薪酬','绩效'] },
 { key: '财务', tags: ['财务','会计','审计','税务'] },
 { key: '测试', tags: ['测试','QA','自动化','性能'] },
 { key: '数据', tags: ['数据分析','BI','SQL','Python','Tableau'] },
 { key: '算法', tags: ['算法','机器学习','深度学习','NLP'] },
 { key: '运维', tags: ['运维','DevOps','Linux','Docker','K8s'] },
 { key: '设计', tags: ['设计','插画','动效','3D'] },
 { key: '编辑', tags: ['编辑','文案','内容','新媒体'] },
 ];

 // 字段识别主函数（强化版）
 function parseResumeText(rawText) {
 const text = (rawText || '').replace(/\r\n/g, '\n');
 const out = { name:'', gender:'', age:'', years:'', position:'', expectedCity:'', phone:'', email:'', tags:[] };

 // 📞 手机号（中国大陆 11 位 1[3-9]xxxxxxx）
 const phoneMatch = text.match(/(?<![0-9])(1[3-9]\d{9})(?![0-9])/);
 if (phoneMatch) out.phone = phoneMatch[1];

 // 📧 邮箱（取第一个）
 const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
 if (emailMatch) out.email = emailMatch[0];

 // 姓名识别（多策略）
 const lines = text.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 60);
 const blockWords = ['简历','个人简历','个人信息','基本信息','教育背景','工作经验','工作经历','项目经验','专业技能','自我评价','联系方式','个人简介','联系电话','电子邮箱','联系信息','求职意向','教育经历'];

 const isPhoneLine = (s) => /(1[3-9]\d{9})|(\d{3,4}[-\s]?\d{3,4}[-\s]?\d{4})/.test(s);
 const isEmailLine = (s) => /@/.test(s);
 const isNumberLine = (s) => /^[\d\s\-:：/.年月日岁]{2,}$/.test(s);

 // 策略 1：显式标签（覆盖中英文 + 多种符号）
 for (const line of lines) {
 // 姓名 / Name / name / NAME
 let m = line.match(/(?:^|[\s,，:：]|\b)(?:姓\s*名|Name|NAME|name|Full\s*Name|Candidate)\s*[:：=]?\s*([^\s,，:：;；]{2,30})/);
 if (m && m[1] && !isPhoneLine(m[1]) && !isEmailLine(m[1]) && !isNumberLine(m[1])) {
 out.name = m[1].trim();
 break;
 }
 }
 // 策略 2：前 3 行中纯中文 2-4 字（跳过纯数字/邮箱/电话/常见章节）
 if (!out.name) {
 for (let i = 0; i < Math.min(5, lines.length); i++) {
 const ln = lines[i];
 if (!ln || blockWords.some(w => ln.includes(w))) continue;
 if (isPhoneLine(ln) || isEmailLine(ln) || isNumberLine(ln)) continue;
 if (ln.length > 20) continue;
 const m2 = ln.match(/^([\u4e00-\u9fa5]{2,4})$/);
 if (m2) { out.name = m2[1]; break; }
 }
 }
 // 策略 3：英文姓名 2-15 字母（含空格/点）
 if (!out.name) {
 for (let i = 0; i < Math.min(5, lines.length); i++) {
 const ln = lines[i];
 if (!ln || blockWords.some(w => ln.toLowerCase().includes(w.toLowerCase()))) continue;
 if (isPhoneLine(ln) || isEmailLine(ln) || isNumberLine(ln)) continue;
 if (ln.length > 30) continue;
 // 大写开头的英文姓名（首字母大写，可含空格/点/-）
 if (/^[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3}$/.test(ln) || /^[A-Z][a-zA-Z]+(?:\.[\s]?[A-Z][a-zA-Z]+)+$/.test(ln)) {
 out.name = ln; break;
 }
 }
 }
 // 策略 4：邮箱前缀推断（如 james.smith@x.com → James Smith）
 if (!out.name && out.email) {
 const prefix = out.email.split('@')[0] || '';
 const cleaned = prefix.replace(/[._\-+]+/g, ' ').replace(/\d+/g, '').trim();
 if (cleaned) {
 const titled = cleaned.split(/\s+/).filter(Boolean)
 .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
 if (titled.length >= 2 && titled.length <= 30) out.name = titled;
 }
 }
 // 策略 5：兜底 —— 前 8 行首个 2-4 字中文（非数字行）
 if (!out.name) {
 for (let i = 0; i < Math.min(8, lines.length); i++) {
 const ln = lines[i];
 if (!ln || blockWords.some(w => ln.includes(w))) continue;
 if (isPhoneLine(ln) || isEmailLine(ln) || isNumberLine(ln)) continue;
 if (ln.length > 20) continue;
 const m3 = ln.match(/([\u4e00-\u9fa5]{2,4})/);
 if (m3) { out.name = m3[1]; break; }
 }
 }
 // 兜底：文件名兜底
 if (!out.name) out.name = '未识别';

 // 性别
 const genderLabel = text.match(/(?:性\s*别|性别|Gender|Sex)\s*[:：=]?\s*([男女]|[MmFf]|Male|Female)/i);
 if (genderLabel) {
 const v = genderLabel[1];
 out.gender = (/m/i.test(v) || v === '男') ? '男' : '女';
 } else {
 // 兜底：在姓名附近查找"男/女"
 const idx = lines.findIndex(l => l.includes(out.name));
 if (idx >= 0) {
 for (let j = idx; j < Math.min(idx + 5, lines.length); j++) {
 if (/男\s*[/／|]?\s*女|男\b/.test(lines[j]) && !/女\b/.test(lines[j])) { out.gender = '男'; break; }
 if (/\b女\b/.test(lines[j])) { out.gender = '女'; break; }
 if (/女\s*[/／|]?\s*男/.test(lines[j])) break;
 }
 }
 }

 // 年龄
 const ageMatch = text.match(/(?:年\s*龄|年龄|Age)\s*[:：=]?\s*(\d{1,2})(?:\s*岁)?/i);
 if (ageMatch) out.age = ageMatch[1];
 else {
 const birthMatch = text.match(/(?:出生|生辰|Birth|DOB|Born)\s*[:：=]?\s*(\d{4})\s*[-年./](\d{1,2})/i);
 if (birthMatch) {
 const year = parseInt(birthMatch[1], 10);
 const cur = new Date().getFullYear();
 const age = cur - year;
 if (age > 0 && age < 80) out.age = String(age);
 }
 }

 // 工作年限
 const yearsMatch = text.match(/(?:工作年限|工作经验|从业年限|司龄|工作经历|Experience|Years?)\s*[:：=]?\s*(\d{1,2})\s*年?/i);
 if (yearsMatch) out.years = yearsMatch[1] + '年';
 else {
 const m2 = text.match(/(\d{1,2})\s*年\s*(?:以上)?(?:工作|从业|经验|experience)/i);
 if (m2) out.years = m2[1] + '年';
 }

 // 职业（基于关键词命中）
 const tagSet = new Set();
 for (const hint of TALENT_POSITION_HINTS) {
 if (text.includes(hint.key)) {
 if (!out.position) out.position = hint.key;
 hint.tags.forEach(t => tagSet.add(t));
 }
 }
 // 若还没识别出职业，使用「求职意向/意向职位/英文 Objective/Position」标签
 if (!out.position) {
 const intent = text.match(/(?:求职意向|意向职位|期望职位|目标岗位|应聘职位|Objective|Position)\s*[:：=]?\s*([\u4e00-\u9fa5A-Za-z·/\-\s]{2,20})/);
 if (intent) {
 const v = intent[1].trim();
 if (v) out.position = v;
 }
 }
 if (!out.position) out.position = '未识别';
 // —— 增强 tag 抽取：抓"专业技能 / 掌握 / 熟悉 / 了解 / 技能"段里的关键词 ——
 const skillSection = text.match(/(?:专业技能|技能清单|核心技能|掌握技能|技能)[：:]\s*([\s\S]{0,400}?)(?:\n\s*\n|\n\s*[一二三四五六七八九十0-9]、|\n\s*[一二三四五六七八九十0-9]\.|$)/);
 if (skillSection) {
 // 抽取"熟练/掌握/熟悉 X"中的 X（X 限 2-8 字中文或常见技术词）
 const skillItems = skillSection[1].match(/[、，,;\n；/／]([\u4e00-\u9fa5A-Za-z+#.\-·]{2,12})/g) || [];
 skillItems.forEach(s => {
 const k = s.replace(/^[、，,;\n；/／\s]+/, '').trim();
 if (k && k.length <= 12) tagSet.add(k);
 });
 // 也从"熟悉 X / 掌握 X"中抓
 const verbItems = skillSection[1].match(/(?:熟练|掌握|熟悉|精通|了解)\s*([\u4e00-\u9fa5A-Za-z+#.\-·]{2,12})/g) || [];
 verbItems.forEach(s => {
 const k = s.replace(/^(熟练|掌握|熟悉|精通|了解)\s*/, '').trim();
 if (k && k.length <= 12) tagSet.add(k);
 });
 }
 // 行业兜底：识别"互联网/金融/教育/医疗/电商/游戏/制造业"等
 const industries = ['互联网','金融','银行','证券','保险','教育','培训','医疗','医院','医药','电商','零售','游戏','制造','汽车','地产','广告','传媒','物流','通信','快消','餐饮','能源','政府','事业单位'];
 for (const ind of industries) {
 if (text.includes(ind)) tagSet.add(ind);
 }
 // 教育兜底：识别"本科/硕士/博士/大专"
 const eduTags = ['本科','硕士','博士','大专','MBA'];
 for (const ed of eduTags) {
 if (text.includes(ed)) tagSet.add(ed);
 }
 out.tags = Array.from(tagSet).slice(0, 8);
 // 兜底：识别失败也给个默认标签，让卡片上的"标签模块"始终可见、提示用户手动补全
 if (out.tags.length === 0) {
 out.tags = (text && text.length > 50) ? ['⚠ 待补全'] : ['📋 导入简历'];
 }

 // 期望城市（关键词：期望城市/期望地点/期望工作地/期望工作地点/意向城市/Location/City）
 const cityMatch = text.match(/(?:期望城市|期望地点|期望工作地(?:点)?|意向城市|目标城市|工作地点|期望驻地|Location|Current\s*Location|City)\s*[:：=]?\s*([\u4e00-\u9fa5A-Za-z·\-\s\/,，]{2,30})/);
 if (cityMatch) {
 let city = cityMatch[1].trim()
 .replace(/[\s,，\/]{1,3}(期望.*|意向.*|工作.*|地点.*|城市.*)$/i, '') // 去尾巴
 .replace(/\s{2,}.*$/, '') // 多空格截断
 .split(/[,,，\n\r\/／]/)[0].trim();
 if (city && city.length <= 20) out.expectedCity = city;
 }

 return out;
 }

 // 提取简历文本（支持 .txt/.md/.docx/.pdf/.doc）
 // ────────────────────────────────────────────────────────────
 // 通用解压层（修复"识别不了"的根因）
 //
 // 【为什么旧版识别不了】
 // 1) DOCX 本质是 ZIP，word/document.xml 用 raw-deflate 压缩存放。
 // 旧代码把整个 zip 字节流当 utf-8 解码后正则找 <w:t> —— 压缩数据里根本没有明文 XML，永远匹配 0 条。
 // 2) PDF 的页面内容流几乎 100% 带 /FlateDecode（zlib 压缩）。
 // 旧代码在原始字节里正则找 "(文本) Tj" —— 压缩后同样没有明文，永远抓不到。
 // 3) 即便流未压缩，中文简历普遍用 CID 字体 + <十六进制> 字符串，
 // 且字节是"字形编号"而非 Unicode，必须借 /ToUnicode CMap 反查才能还原成汉字。
 // 4) .doc（老 OLE 二进制）、扫描件 PDF（只有图片、无文字层）无法用纯文本提取。
 //
 // 【现在的做法】用浏览器原生 DecompressionStream 真正解压，再解析。
 // ────────────────────────────────────────────────────────────
 const HAS_DECOMPRESSION = (typeof DecompressionStream !== 'undefined');

 async function inflateBytes(u8, format) {
 const ds = new DecompressionStream(format);
 const stream = new Blob([u8]).stream().pipeThrough(ds);
 const ab = await new Response(stream).arrayBuffer();
 return new Uint8Array(ab);
 }

 // 自动尝试 zlib(deflate) → raw deflate
 async function inflateAuto(u8) {
 if (!HAS_DECOMPRESSION) return null;
 // zlib 头判定：CMF/FLG，(CMF*256+FLG) % 31 === 0 且低 4 位为 8
 const looksZlib = u8.length > 2 && (u8[0] & 0x0f) === 8 && ((u8[0] << 8 | u8[1]) % 31 === 0);
 const order = looksZlib ? ['deflate', 'deflate-raw'] : ['deflate-raw', 'deflate'];
 for (const fmt of order) {
 try {
 const out = await inflateBytes(u8, fmt);
 if (out && out.length) return out;
 } catch (e) { /* 换下一种 */ }
 }
 return null;
 }

 // ── ZIP 解析：按中央目录定位条目并解压（DOCX / XLSX / PPTX 通用）
 async function unzipReadEntry(u8, wantPath) {
 const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
 // 1. 反向找 EOCD (PK\x05\x06)
 let eocd = -1;
 for (let i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) {
 if (u8[i] === 0x50 && u8[i+1] === 0x4b && u8[i+2] === 0x05 && u8[i+3] === 0x06) { eocd = i; break; }
 }
 if (eocd < 0) return null;
 const entries = dv.getUint16(eocd + 10, true);
 let p = dv.getUint32(eocd + 16, true); // 中央目录起始偏移
 const dec = new TextDecoder('utf-8');
 for (let n = 0; n < entries; n++) {
 if (p + 46 > u8.length) break;
 if (dv.getUint32(p, true) !== 0x02014b50) break;
 const method = dv.getUint16(p + 10, true);
 const compSize = dv.getUint32(p + 20, true);
 const nameLen = dv.getUint16(p + 28, true);
 const extraLen = dv.getUint16(p + 30, true);
 const cmtLen = dv.getUint16(p + 32, true);
 const localOff = dv.getUint32(p + 42, true);
 const fname = dec.decode(u8.subarray(p + 46, p + 46 + nameLen));
 if (fname === wantPath) {
 // 2. 跳到本地文件头取真实数据起点
 if (dv.getUint32(localOff, true) !== 0x04034b50) return null;
 const lNameLen = dv.getUint16(localOff + 26, true);
 const lExtraLen = dv.getUint16(localOff + 28, true);
 const dataStart = localOff + 30 + lNameLen + lExtraLen;
 const data = u8.subarray(dataStart, dataStart + compSize);
 if (method === 0) return data; // STORED 未压缩
 if (method === 8) return await inflateAuto(data); // DEFLATE
 return null;
 }
 p += 46 + nameLen + extraLen + cmtLen;
 }
 return null;
 }

 // ── DOCX → 纯文本
 async function extractDocxText(u8) {
 const parts = ['word/document.xml', 'word/header1.xml', 'word/footer1.xml'];
 let out = '';
 for (const path of parts) {
 let bytes = null;
 try { bytes = await unzipReadEntry(u8, path); } catch (e) {}
 if (!bytes || !bytes.length) continue;
 const xml = new TextDecoder('utf-8').decode(bytes);
 // 段落 <w:p> → 换行；制表 <w:tab/> → 空格；换行符 <w:br/>
 const normalized = xml
 .replace(/<w:tab\b[^>]*\/>/g, '\t')
 .replace(/<w:br\b[^>]*\/>/g, '\n')
 .replace(/<\/w:p>/g, '\n');
 const segs = normalized.match(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|\n|\t/g) || [];
 out += segs.map(s => {
 if (s === '\n' || s === '\t') return s;
 return s.replace(/<[^>]+>/g, '');
 }).join('');
 out += '\n';
 }
 return decodeXmlEntities(out).replace(/\n{3,}/g, '\n\n').trim();
 }

 function decodeXmlEntities(s) {
 return String(s || '')
 .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
 .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
 .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
 .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
 .replace(/&amp;/g, '&');
 }

 // ── PDF：找出所有 stream…endstream 并解压
 async function pdfCollectStreams(u8) {
 const latin = new TextDecoder('latin1').decode(u8);
 const results = [];
 const re = /stream\r?\n?/g;
 let m;
 while ((m = re.exec(latin)) !== null) {
 const dataStart = m.index + m[0].length;
 const endIdx = latin.indexOf('endstream', dataStart);
 if (endIdx < 0) continue;
 // 取 stream 前面的字典判断过滤器
 const dictStart = latin.lastIndexOf('<<', m.index);
 const dict = dictStart >= 0 ? latin.slice(dictStart, m.index) : '';
 const raw = u8.subarray(dataStart, endIdx);
 if (!raw.length) continue;
 if (/\/Flate\s*Decode|\/FlateDecode/.test(dict)) {
 const inflated = await inflateAuto(raw);
 if (inflated && inflated.length) results.push({ dict, bytes: inflated });
 } else if (!/\/DCTDecode|\/JPXDecode|\/CCITTFaxDecode|\/JBIG2Decode/.test(dict)) {
 results.push({ dict, bytes: raw }); // 未压缩的内容流
 }
 re.lastIndex = endIdx + 9;
 }
 return results;
 }

 // ── 解析 /ToUnicode CMap → 建立 「字符码 → Unicode」 映射
 function parseToUnicodeCMap(cmapText, map) {
 // beginbfchar：<srcCode> <dstUnicode>
 const bfcharBlocks = cmapText.match(/beginbfchar([\s\S]*?)endbfchar/g) || [];
 bfcharBlocks.forEach(block => {
 const pairs = block.match(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g) || [];
 pairs.forEach(pair => {
 const mm = pair.match(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/);
 if (!mm) return;
 map[parseInt(mm[1], 16)] = hexToUnicodeStr(mm[2]);
 });
 });
 // beginbfrange：<lo> <hi> <dstStart> 或 <lo> <hi> [<u1> <u2> …]
 const bfrangeBlocks = cmapText.match(/beginbfrange([\s\S]*?)endbfrange/g) || [];
 bfrangeBlocks.forEach(block => {
 const lineRe = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(?:<([0-9A-Fa-f]+)>|\[([\s\S]*?)\])/g;
 let r;
 while ((r = lineRe.exec(block)) !== null) {
 const lo = parseInt(r[1], 16), hi = parseInt(r[2], 16);
 if (hi - lo > 65535) continue;
 if (r[3]) {
 const base = parseInt(r[3], 16);
 for (let i = 0; i <= hi - lo; i++) map[lo + i] = String.fromCharCode(base + i);
 } else if (r[4]) {
 const arr = r[4].match(/<([0-9A-Fa-f]+)>/g) || [];
 arr.forEach((h, i) => { map[lo + i] = hexToUnicodeStr(h.slice(1, -1)); });
 }
 }
 });
 }

 function hexToUnicodeStr(hex) {
 let s = '';
 for (let i = 0; i + 3 < hex.length + 1; i += 4) {
 const code = parseInt(hex.substr(i, 4), 16);
 if (!isNaN(code)) s += String.fromCharCode(code);
 }
 return s || String.fromCharCode(parseInt(hex, 16) || 0);
 }

 // ── 从内容流里抽文本操作符
 function pdfExtractTextOps(content, cmap) {
 const hasCmap = cmap && Object.keys(cmap).length > 0;
 const out = [];
 // 逐个处理 Tj / TJ / ' / " 操作符
 const opRe = /(\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]+>|\[(?:[^\[\]]|\\.)*\])\s*(TJ|Tj|'|")|(T\*|Td|TD|ET)/g;
 let m;
 while ((m = opRe.exec(content)) !== null) {
 if (m[3]) { out.push('\n'); continue; } // 换行类操作符
 const operand = m[1];
 if (operand.startsWith('[')) {
 const items = operand.match(/\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]+>/g) || [];
 items.forEach(it => out.push(decodePdfString(it, cmap, hasCmap)));
 } else {
 out.push(decodePdfString(operand, cmap, hasCmap));
 }
 }
 return out.join('');
 }

 function decodePdfString(tok, cmap, hasCmap) {
 if (tok.startsWith('<')) {
 const hex = tok.slice(1, -1).replace(/\s+/g, '');
 let s = '';
 if (hasCmap) {
 for (let i = 0; i + 1 < hex.length; i += 4) { // 2 字节码
 const code = parseInt(hex.substr(i, 4), 16);
 if (cmap[code] !== undefined) { s += cmap[code]; continue; }
 // 退化：1 字节码
 const c1 = parseInt(hex.substr(i, 2), 16);
 const c2 = parseInt(hex.substr(i + 2, 2), 16);
 s += (cmap[c1] !== undefined ? cmap[c1] : '') + (cmap[c2] !== undefined ? cmap[c2] : '');
 }
 if (s.trim()) return s;
 }
 // 无 CMap：按 UTF-16BE 试解（很多 PDF 生成器直接写 Unicode）
 for (let i = 0; i + 3 < hex.length + 1; i += 4) {
 const code = parseInt(hex.substr(i, 4), 16);
 if (code > 0x1f && code !== 0xfffd) s += String.fromCharCode(code);
 }
 return s;
 }
 // 字面量字符串 (....)
 let body = tok.slice(1, -1);
 body = body
 .replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t')
 .replace(/\\b/g, '').replace(/\\f/g, '')
 .replace(/\\([0-7]{1,3})/g, (_, o) => String.fromCharCode(parseInt(o, 8)))
 .replace(/\\(.)/g, '$1');
 if (hasCmap) {
 // 单字节码经 CMap 映射（部分中文 PDF 用 Type0 + 1 字节码）
 let mapped = '';
 let hit = 0;
 for (let i = 0; i < body.length; i++) {
 const code = body.charCodeAt(i);
 if (cmap[code] !== undefined) { mapped += cmap[code]; hit++; }
 else mapped += body[i];
 }
 if (hit > body.length * 0.5) return mapped;
 }
 return body;
 }

 // ── PDF → 纯文本（带诊断）
 async function extractPdfText(u8) {
 const latinHead = new TextDecoder('latin1').decode(u8.subarray(0, Math.min(u8.length, 4096)));
 const latinAll = new TextDecoder('latin1').decode(u8);
 if (/\/Encrypt\b/.test(latinAll)) {
 return { text: '', reason: 'encrypted' };
 }
 if (!HAS_DECOMPRESSION) {
 return { text: '', reason: 'no-decompression' };
 }
 let streams = [];
 try { streams = await pdfCollectStreams(u8); } catch (e) { streams = []; }
 if (!streams.length) {
 return { text: '', reason: /\/Image\b|\/DCTDecode|\/JPXDecode|\/CCITTFaxDecode/.test(latinAll) ? 'scanned' : 'no-stream' };
 }
 // 1) 先收集所有 ToUnicode CMap
 const cmap = {};
 const contentStreams = [];
 streams.forEach(s => {
 const txt = new TextDecoder('latin1').decode(s.bytes);
 if (/beginbfchar|beginbfrange/.test(txt)) {
 try { parseToUnicodeCMap(txt, cmap); } catch (e) {}
 } else if (/\b(Tj|TJ)\b/.test(txt)) {
 contentStreams.push(txt);
 }
 });
 if (!contentStreams.length) {
 const hasImage = /\/Image\b|\/DCTDecode|\/JPXDecode|\/CCITTFaxDecode/.test(latinAll);
 return { text: '', reason: hasImage ? 'scanned' : 'no-text-layer' };
 }
 // 2) 抽文本
 let text = contentStreams.map(cs => pdfExtractTextOps(cs, cmap)).join('\n');
 text = text.replace(/\u0000/g, '').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
 if (!text) {
 return { text: '', reason: Object.keys(cmap).length ? 'cmap-miss' : 'glyph-only' };
 }
 void latinHead;
 return { text, reason: '' };
 }

 // ── .doc（OLE 二进制）尽力而为：抽 UTF-16LE 可读片段
 function extractLegacyDocText(u8) {
 let s = '';
 for (let i = 0; i + 1 < u8.length; i += 2) {
 const code = u8[i] | (u8[i + 1] << 8);
 // 常见可读区间：ASCII 可打印 + 中日韩
 if ((code >= 0x20 && code <= 0x7e) || (code >= 0x4e00 && code <= 0x9fff) ||
 (code >= 0x3000 && code <= 0x303f) || (code >= 0xff00 && code <= 0xffef)) {
 s += String.fromCharCode(code);
 } else if (code === 0x0d || code === 0x0a) {
 s += '\n';
 }
 }
 // 去掉一大堆无意义短碎片
 const lines = s.split('\n').map(l => l.trim()).filter(l => l.length >= 2);
 return lines.join('\n').slice(0, 20000);
 }

 // 诊断码 → 用户可读说明
 const RESUME_DIAG_TEXT = {
 'ok': '',
 'encrypted': 'PDF 已加密／设了权限密码，浏览器无法解压内容流',
 'scanned': '这是扫描件／图片型 PDF（整页是图片，没有文字层），纯文本提取拿不到任何字符，需要 OCR',
 'no-text-layer': 'PDF 里没有文字绘制指令（可能是纯图片或矢量轮廓化的排版）',
 'glyph-only': 'PDF 用了子集化 CID 字体但没带 /ToUnicode 映射表，字节只是"字形编号"，无法还原成汉字',
 'cmap-miss': '字体映射表不完整，部分字符无法还原',
 'no-stream': '没能在 PDF 里找到可解析的内容流（文件可能损坏或为特殊生成器产物）',
 'no-decompression': '当前浏览器不支持 DecompressionStream，无法解压 PDF/DOCX（请用 Chrome/Edge 103+）',
 'docx-empty': 'DOCX 解压成功但 word/document.xml 里没有文本节点',
 'legacy-doc': '.doc 是老版 Word 的 OLE 二进制格式，只能尽力抽取，建议另存为 .docx 或 .pdf',
 'unsupported': '不支持的文件类型，目前支持 .pdf / .docx / .doc / .txt / .md',
 'empty': '文件内容为空',
 };

 // 主入口：返回 { text, reason, chars }
 async function extractResumeText(file) {
 const name = (file.name || '').toLowerCase();
 try {
 if (name.endsWith('.txt') || name.endsWith('.md')) {
 const t = await file.text();
 return { text: t, reason: t.trim() ? '' : 'empty', chars: t.length };
 }
 const u8 = new Uint8Array(await file.arrayBuffer());

 if (name.endsWith('.docx')) {
 if (!HAS_DECOMPRESSION) return { text: '', reason: 'no-decompression', chars: 0 };
 const t = await extractDocxText(u8);
 return { text: t, reason: t.trim() ? '' : 'docx-empty', chars: t.length };
 }
 if (name.endsWith('.pdf')) {
 const r = await extractPdfText(u8);
 return { text: r.text, reason: r.reason, chars: r.text.length };
 }
 if (name.endsWith('.doc')) {
 const t = extractLegacyDocText(u8);
 return { text: t, reason: t.trim() ? '' : 'legacy-doc', chars: t.length };
 }
 return { text: '', reason: 'unsupported', chars: 0 };
 } catch (e) {
 console.error('[简历解析] 失败：', file.name, e);
 return { text: '', reason: 'no-stream', chars: 0 };
 }
 }

 // —— 批量管理模式状态（需在任何渲染之前完成初始化）——
 let _tpBulkMode = false;
 let _tpSelectedIds = new Set();
 let _tpVisibleIds = [];

 // 主渲染入口
 function renderTalentPool() {
 renderTalentStats();
 renderTalentTagCloud();
 applyTalentSearch(); // 内部已刷新结果摘要 + 批量条状态
 bindTalentEventsOnce();
 }

 // 4 格统计
 function renderTalentStats() {
 const cands = (state.talentPool && state.talentPool.candidates) || [];
 const today = getDateStr(new Date());
 const phoneCount = cands.filter(c => c.phone).length;
 const emailCount = cands.filter(c => c.email).length;
 const todayCount = cands.filter(c => (c.addedAt || '').startsWith(today)).length;
 const $tpTotal = $('#tpTotal'); if ($tpTotal) $tpTotal.textContent = cands.length;
 const $tpToday = $('#tpToday'); if ($tpToday) $tpToday.textContent = todayCount;
 const $tpPhone = $('#tpPhone'); if ($tpPhone) $tpPhone.textContent = phoneCount;
 const $tpEmail = $('#tpEmail'); if ($tpEmail) $tpEmail.textContent = emailCount;
 }

 // —— 标签多选：状态读写小工具 ——
 function tpSelectedTags() {
 if (!state.talentPool) return [];
 if (!Array.isArray(state.talentPool.selectedTags)) state.talentPool.selectedTags = [];
 return state.talentPool.selectedTags;
 }
 function tpTagMode() {
 if (!state.talentPool) return 'or';
 if (state.talentPool.tagMode !== 'and') state.talentPool.tagMode = 'or';
 return state.talentPool.tagMode;
 }
 function tpToggleTag(tag) {
 const sel = tpSelectedTags();
 const i = sel.indexOf(tag);
 if (i >= 0) sel.splice(i, 1); else sel.push(tag);
 saveData();
 renderTalentTagCloud();
 applyTalentSearch();
 }
 function tpClearTags() {
 state.talentPool.selectedTags = [];
 saveData();
 renderTalentTagCloud();
 applyTalentSearch();
 }

 // 标签云（按现有人才库聚合 position + tags）—— 支持多选 AND / OR
 function renderTalentTagCloud() {
 const wrap = $('#tpTagCloud');
 if (!wrap) return;
 const cands = (state.talentPool && state.talentPool.candidates) || [];
 const sel = tpSelectedTags();
 const counter = {};
 cands.forEach(c => {
 if (c.position) counter[c.position] = (counter[c.position] || 0) + 1;
 (c.tags || []).forEach(t => counter[t] = (counter[t] || 0) + 1);
 });
 // 已选标签始终保留在列表里（即使不在 TOP14 内），避免"选了却看不到"
 const ranked = Object.entries(counter).sort((a, b) => b[1] - a[1]);
 const top = ranked.slice(0, 14);
 sel.forEach(t => {
 if (!top.some(([n]) => n === t)) top.push([t, counter[t] || 0]);
 });
 if (!top.length) {
 wrap.innerHTML = '<span class="talent-tag-empty">暂无标签 · 上传简历后将自动汇总</span>';
 renderTalentSelectedBar();
 syncTagModeUI();
 return;
 }
 wrap.innerHTML = top.map(([name, count]) => {
 const on = sel.includes(name);
 return `<button class="talent-tag-chip${on ? ' active' : ''}" data-tag="${escapeAttr(name)}" aria-pressed="${on}">` +
 `<span class="talent-tag-check">${on ? '☑' : '☐'}</span>#${escapeHtml(name)} <span class="talent-tag-count">${count}</span></button>`;
 }).join('');
 wrap.querySelectorAll('.talent-tag-chip').forEach(btn => {
 btn.onclick = () => tpToggleTag(btn.dataset.tag);
 });
 renderTalentSelectedBar();
 syncTagModeUI();
 }

 // 已选标签条（展示 + 单个移除 + 一键清空）
 function renderTalentSelectedBar() {
 const bar = $('#tpSelectedBar');
 if (!bar) return;
 const sel = tpSelectedTags();
 if (!sel.length) {
 bar.style.display = 'none';
 bar.innerHTML = '';
 return;
 }
 const mode = tpTagMode();
 bar.style.display = 'flex';
 bar.innerHTML =
 `<span class="talent-selected-label">已选 ${sel.length} 个标签（${mode === 'and' ? '需全部命中' : '命中任意即可'}）：</span>` +
 sel.map(t => `<span class="talent-selected-chip" data-tag="${escapeAttr(t)}">#${escapeHtml(t)}<b class="talent-selected-x">✕</b></span>`).join('') +
 `<button class="btn talent-selected-clear" id="tpTagClearAll">清空标签</button>`;
 bar.querySelectorAll('.talent-selected-chip').forEach(chip => {
 chip.onclick = () => tpToggleTag(chip.dataset.tag);
 });
 const clearBtn = $('#tpTagClearAll');
 if (clearBtn) clearBtn.onclick = tpClearTags;
 }

 function syncTagModeUI() {
 const mode = tpTagMode();
 const wrap = $('#tpTagMode');
 if (!wrap) return;
 wrap.querySelectorAll('.talent-mode-btn').forEach(b => {
 b.classList.toggle('active', b.dataset.mode === mode);
 });
 }

 // 应用检索过滤（关键词 + 多选标签联合）
 function applyTalentSearch() {
 const cands = (state.talentPool && state.talentPool.candidates) || [];
 const $input = $('#tpSearchInput');
 const kw = ((state.talentPool && state.talentPool.lastSearch) || ($input && $input.value) || '').trim().toLowerCase();
 const sel = tpSelectedTags();
 const mode = tpTagMode();

 const list = cands.filter(c => {
 const blob = [
 c.name, c.position, c.expectedCity, c.gender, c.phone, c.email,
 c.years, c.fileName,
 ...(c.tags || []),
 ].filter(Boolean).join(' ').toLowerCase();
 if (kw && !blob.includes(kw)) return false;
 if (!sel.length) return true;
 const own = [c.position, ...(c.tags || [])].filter(Boolean);
 return mode === 'and'
 ? sel.every(t => own.includes(t))
 : sel.some(t => own.includes(t));
 });

 // 过滤后清理已失效的批量勾选
 if (_tpBulkMode) {
 const alive = new Set(list.map(c => c.id));
 Array.from(_tpSelectedIds).forEach(id => { if (!alive.has(id)) _tpSelectedIds.delete(id); });
 }

 renderTalentGrid(list, kw);
 renderTalentResultMeta(list.length, cands.length, kw, sel, mode);
 updateBulkUI();
 }

 function renderTalentResultMeta(matched, total, kw, sel, mode) {
 const el = $('#tpResultMeta');
 if (!el) return;
 sel = sel || [];
 if (!total) {
 el.innerHTML = `<span class="talent-meta-text"> 人才库为空</span>`;
 return;
 }
 const conds = [];
 if (kw) conds.push(`关键词 "<b>${escapeHtml(kw)}</b>"`);
 if (sel.length) conds.push(`${sel.length} 个标签（${mode === 'and' ? 'AND 全部' : 'OR 任意'}）`);
 if (conds.length) {
 el.innerHTML = `<span class="talent-meta-text">🔎 ${conds.join(' ＋ ')} 命中 <b>${matched}</b> / ${total} 位候选人</span>`;
 } else {
 el.innerHTML = `<span class="talent-meta-text">📚 人才库现有 <b>${total}</b> 位候选人 · 点击上方标签可多选筛选</span>`;
 }
 }

 // 候选人卡片网格
 function renderTalentGrid(list, kw) {
 const grid = $('#talentGrid');
 const empty = $('#talentEmpty');
 if (!grid) return;
 _tpVisibleIds = list.map(c => c.id);
 grid.classList.toggle('bulk-mode', _tpBulkMode);
 if (!list.length) {
 grid.innerHTML = '';
 if (empty) empty.style.display = 'block';
 return;
 }
 if (empty) empty.style.display = 'none';
 grid.innerHTML = list.map(c => buildTalentCard(c, kw)).join('');
 grid.querySelectorAll('[data-talent-action]').forEach(btn => {
 btn.onclick = (e) => {
 e.stopPropagation();
 const id = btn.dataset.id;
 const action = btn.dataset.talentAction;
 if (action === 'detail') openTalentDetailModal(id);
 else if (action === 'edit') openTalentEditModal(id);
 else if (action === 'delete') confirmDeleteTalent(id);
 };
 });
 grid.querySelectorAll('.talent-card').forEach(card => {
 card.onclick = () => {
 const id = card.dataset.id;
 if (_tpBulkMode) { toggleTalentSelect(id); return; }
 openTalentDetailModal(id);
 };
 });
 grid.querySelectorAll('.talent-pick').forEach(box => {
 box.onclick = (e) => { e.stopPropagation(); toggleTalentSelect(box.dataset.id); };
 });
 }

 function toggleTalentSelect(id) {
 if (!id) return;
 if (_tpSelectedIds.has(id)) _tpSelectedIds.delete(id); else _tpSelectedIds.add(id);
 const card = document.querySelector(`.talent-card[data-id="${CSS.escape(id)}"]`);
 if (card) {
 const on = _tpSelectedIds.has(id);
 card.classList.toggle('picked', on);
 const box = card.querySelector('.talent-pick');
 if (box) box.textContent = on ? '☑' : '☐';
 }
 updateBulkUI();
 }

 function updateBulkUI() {
 const bar = $('#tpBulkBar');
 const actions = $('#tpBulkActions');
 const toggle = $('#tpBulkToggle');
 const count = $('#tpBulkCount');
 const del = $('#tpBulkDelete');
 const total = ((state.talentPool && state.talentPool.candidates) || []).length;
 if (bar) bar.style.display = total ? 'flex' : 'none'; // 人才库为空时隐藏整条
 if (toggle) {
 toggle.textContent = _tpBulkMode ? ' 批量管理中' : '☑ 批量管理';
 toggle.classList.toggle('active', _tpBulkMode);
 }
 if (actions) actions.style.display = _tpBulkMode ? 'flex' : 'none';
 if (count) count.textContent = `已选 ${_tpSelectedIds.size} 人`;
 if (del) del.disabled = _tpSelectedIds.size === 0;
 }

 function setBulkMode(on) {
 _tpBulkMode = !!on;
 if (!_tpBulkMode) _tpSelectedIds.clear();
 applyTalentSearch();
 }

 function buildTalentCard(c, kw) {
 const highlight = (txt) => {
 if (!kw || !txt) return escapeHtml(String(txt || ''));
 const re = new RegExp('(' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
 return escapeHtml(String(txt)).replace(re, '<mark class="talent-hit">$1</mark>');
 };
 const avatarEmoji = c.gender === '女' ? '‍' : (c.gender === '男' ? '‍' : '‍');
 const genderIconCls = c.gender === '女' ? 'icon-gender-f' : (c.gender === '男' ? 'icon-gender-m' : '');
 const genderIconEmoji = c.gender === '女' ? '' : (c.gender === '男' ? '' : '');
 const selTags = tpSelectedTags();
 const hasTags = Array.isArray(c.tags) && c.tags.length > 0;
 const tagsHtml = hasTags
 ? c.tags.slice(0, 4).map(t =>
 `<span class="talent-mini-tag${selTags.includes(t) ? ' matched' : ''}">${highlight(t)}</span>`
 ).join('')
 : '';
 // 没标签时显示"＋ 添加"占位（点击直接进入编辑）
 const tagsBlock = hasTags
 ? `<div class="talent-card-tags">${tagsHtml}</div>`
 : `<div class="talent-card-tags empty"><span class="talent-tags-empty-tip">暂未添加标签</span><button class="talent-mini-tag talent-mini-tag-add" data-talent-action="edit" data-id="${escapeAttr(c.id)}" title="点击添加标签">＋ 添加标签</button></div>`;
 const picked = _tpSelectedIds.has(c.id);
 const pickHtml = _tpBulkMode
 ? `<span class="talent-pick" data-id="${escapeAttr(c.id)}" title="选中/取消">${picked ? '☑' : '☐'}</span>`
 : '';
 return `
 <div class="talent-card${picked && _tpBulkMode ? ' picked' : ''}" data-id="${escapeAttr(c.id)}">
 ${pickHtml}
 <div class="talent-card-head">
 <div class="talent-avatar">${avatarEmoji}</div>
 <div class="talent-card-info">
 <div class="talent-name">${highlight(c.name || '未识别姓名')}</div>
 <div class="talent-position">${highlight(c.position || '—')}</div>
 </div>
 <div class="talent-card-actions">
 <button class="talent-icon-btn" data-talent-action="detail" data-id="${escapeAttr(c.id)}" title="查看详情"><span class="talent-icon-emoji"></span></button>
 <button class="talent-icon-btn" data-talent-action="edit" data-id="${escapeAttr(c.id)}" title="编辑"><span class="talent-icon-emoji">✏</span></button>
 <button class="talent-icon-btn danger" data-talent-action="delete" data-id="${escapeAttr(c.id)}" title="删除"><span class="talent-icon-emoji">🗑</span></button>
 </div>
 </div>
 <div class="talent-card-fields">
 <div class="talent-field">
 <span class="talent-field-icon ${genderIconCls}">${genderIconEmoji}</span>
 <span class="talent-field-label">性别</span>
 <span class="talent-field-value">${highlight(c.gender || '—')}</span>
 </div>
 <div class="talent-field">
 <span class="talent-field-icon icon-age"></span>
 <span class="talent-field-label">年龄</span>
 <span class="talent-field-value">${highlight(c.age || '—')}</span>
 </div>
 <div class="talent-field">
 <span class="talent-field-icon icon-years"></span>
 <span class="talent-field-label">年限</span>
 <span class="talent-field-value">${highlight(c.years || '—')}</span>
 </div>
 </div>
 ${c.expectedCity ? `<div class="talent-card-city"> 期望城市：<b>${highlight(c.expectedCity)}</b></div>` : ''}
 <div class="talent-card-contact">
 <div class="talent-contact-row">
 <span class="talent-contact-icon icon-phone">📞</span>
 <span class="talent-contact-value">${highlight(c.phone || '— 未识别')}</span>
 </div>
 <div class="talent-contact-row">
 <span class="talent-contact-icon icon-email">📧</span>
 <span class="talent-contact-value">${highlight(c.email || '— 未识别')}</span>
 </div>
 </div>
 ${tagsBlock}
 <div class="talent-card-foot">
 <span class="talent-source-badge ${c.source === 'manual' ? 'manual' : 'import'}">${c.source === 'manual' ? '✍ 手动' : '📥 导入'}</span>
 <span class="talent-date">${(c.addedAt || '').slice(0, 16)}</span>
 </div>
 </div>
 `;
 }

 // 绑定一次性事件（视图切换时复用）
 let _talentEventsBound = false;
 function bindTalentEventsOnce() {
 if (_talentEventsBound) return;
 _talentEventsBound = true;
 const $search = $('#tpSearchInput');
 const $btn = $('#tpSearchBtn');
 const $clear = $('#tpClearBtn');
 const $file = $('#tpFileInput');
 const $manual = $('#tpManualBtn');

 if ($btn) $btn.onclick = () => {
 state.talentPool.lastSearch = $search ? $search.value.trim() : '';
 applyTalentSearch();
 };
 if ($search) $search.onkeydown = (e) => {
 if (e.key === 'Enter') {
 state.talentPool.lastSearch = $search.value.trim();
 applyTalentSearch();
 }
 };
 if ($clear) $clear.onclick = () => {
 if ($search) $search.value = '';
 state.talentPool.lastSearch = '';
 applyTalentSearch();
 };
 if ($file) $file.onchange = async (e) => {
 const files = Array.from(e.target.files || []);
 if (files.length) await handleTalentImport(files);
 e.target.value = '';
 };
 if ($manual) $manual.onclick = () => openTalentManualModal(null);

 // 标签匹配模式（OR / AND）
 const $mode = $('#tpTagMode');
 if ($mode) {
 $mode.querySelectorAll('.talent-mode-btn').forEach(b => {
 b.onclick = () => {
 state.talentPool.tagMode = b.dataset.mode === 'and' ? 'and' : 'or';
 saveData();
 syncTagModeUI();
 renderTalentSelectedBar();
 applyTalentSearch();
 };
 });
 }

 // 批量管理
 const $bulkToggle = $('#tpBulkToggle');
 if ($bulkToggle) $bulkToggle.onclick = () => setBulkMode(!_tpBulkMode);

 const $bulkCancel = $('#tpBulkCancel');
 if ($bulkCancel) $bulkCancel.onclick = () => setBulkMode(false);

 const $bulkAll = $('#tpBulkSelectAll');
 if ($bulkAll) $bulkAll.onclick = () => {
 const allPicked = _tpVisibleIds.length > 0 && _tpVisibleIds.every(id => _tpSelectedIds.has(id));
 if (allPicked) _tpVisibleIds.forEach(id => _tpSelectedIds.delete(id));
 else _tpVisibleIds.forEach(id => _tpSelectedIds.add(id));
 applyTalentSearch();
 };

 const $bulkInvert = $('#tpBulkInvert');
 if ($bulkInvert) $bulkInvert.onclick = () => {
 _tpVisibleIds.forEach(id => {
 if (_tpSelectedIds.has(id)) _tpSelectedIds.delete(id); else _tpSelectedIds.add(id);
 });
 applyTalentSearch();
 };

 const $bulkDelete = $('#tpBulkDelete');
 if ($bulkDelete) $bulkDelete.onclick = () => confirmBulkDeleteTalents();

 const $clearAll = $('#tpClearAll');
 if ($clearAll) $clearAll.onclick = () => confirmClearTalentPool();
 }

 // 处理简历文件导入（批量）—— 带逐文件识别诊断
 async function handleTalentImport(files) {
 toast(`⏳ 正在解析 ${files.length} 份简历…`);
 let added = 0, dup = 0, fail = 0;
 const report = []; // { fileName, chars, reason, fields:{...}, status }
 for (const file of files) {
 try {
 const res = await extractResumeText(file);
 const text = res.text || '';
 const parsed = parseResumeText(text);
 const okFields = ['name', 'phone', 'email', 'gender', 'age', 'years']
 .filter(k => parsed[k] && parsed[k] !== '未识别').length;

 // 去重：相同姓名 + 电话视为同一候选人
 const existed = state.talentPool.candidates.find(c =>
 (parsed.phone && c.phone === parsed.phone) ||
 (parsed.name && parsed.name !== '未识别' && c.name === parsed.name && (!parsed.phone && !c.phone))
 );
 if (existed) {
 dup++;
 report.push({ fileName: file.name, chars: res.chars || 0, reason: 'duplicate', okFields, status: 'dup', parsed });
 continue;
 }
 // 简历文件 → IndexedDB（避免 blob URL 序列化失败）
 const fileId = 'tp_file_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
 try { await TALENT_IDB.putFile(fileId, file); } catch (e) { /* 忽略，留 fileId 为空 */ }
 const candidate = {
 id: 'tp_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
 ...parsed,
 source: 'import',
 fileName: file.name || '',
 fileType: file.type || '',
 fileSize: file.size || 0,
 fileId: fileId, // IndexedDB 键
 parseReason: res.reason || '',
 parseChars: res.chars || 0,
 rawText: text.slice(0, 4000),
 addedAt: getDateStr(new Date()) + ' ' + new Date().toTimeString().slice(0, 5),
 };
 state.talentPool.candidates.unshift(candidate);
 added++;
 report.push({
 fileName: file.name, chars: res.chars || 0, reason: res.reason || '',
 okFields, status: (res.chars > 0 && okFields >= 2) ? 'ok' : (res.chars > 0 ? 'partial' : 'notext'),
 parsed,
 });
 } catch (e) {
 console.error('简历导入失败', e);
 fail++;
 report.push({ fileName: file.name, chars: 0, reason: 'no-stream', okFields: 0, status: 'fail' });
 }
 }
 saveData();
 saveData();
renderTalentPool();
toast(` 已导入 ${added} 份${dup ? ` · 跳过重复 ${dup}` : ''}${fail ? ` · 失败 ${fail}` : ''}`);
if (added > 0) awardEnergy('talent_import', { count: added });
// 只要有任何一份没识别好，就弹诊断报告，明确告诉用户"识别不了什么、为什么"
 if (report.some(r => r.status !== 'ok')) openTalentDiagnosisModal(report);
 }

 // 识别诊断报告弹窗
 function openTalentDiagnosisModal(report) {
 const STATUS_META = {
 ok: { icon: '', label: '识别成功', cls: 'ok' },
 partial: { icon: '⚠', label: '部分识别', cls: 'partial' },
 notext: { icon: '', label: '取不到文字', cls: 'bad' },
 dup: { icon: '', label: '重复跳过', cls: 'dup' },
 fail: { icon: '', label: '解析异常', cls: 'bad' },
 };
 const rows = report.map(r => {
 const meta = STATUS_META[r.status] || STATUS_META.fail;
 const reasonText = r.reason === 'duplicate'
 ? '库中已有同电话／同姓名的候选人'
 : (RESUME_DIAG_TEXT[r.reason] || (r.chars > 0 ? '文本已提取，但简历里缺少可识别的标准字段标签' : ''));
 const fieldsLine = r.parsed
 ? ['姓名:' + (r.parsed.name || '—'), '电话:' + (r.parsed.phone || '—'), '邮箱:' + (r.parsed.email || '—')].join(' · ')
 : '';
 return `
 <div class="tp-diag-row ${meta.cls}">
 <div class="tp-diag-head">
 <span class="tp-diag-icon">${meta.icon}</span>
 <span class="tp-diag-file">${escapeHtml(r.fileName || '未知文件')}</span>
 <span class="tp-diag-badge ${meta.cls}">${meta.label}</span>
 </div>
 <div class="tp-diag-line">提取字符数：<b>${r.chars}</b> · 命中字段：<b>${r.okFields || 0}</b>/6</div>
 ${fieldsLine ? `<div class="tp-diag-line dim">${escapeHtml(fieldsLine)}</div>` : ''}
 ${reasonText ? `<div class="tp-diag-reason">原因：${escapeHtml(reasonText)}</div>` : ''}
 </div>`;
 }).join('');
 const html = `
 <div class="modal-mask" data-action="close">
 <div class="modal talent-modal">
 <div class="modal-header">
 <div class="modal-title"> 简历识别诊断</div>
 <button class="modal-close" data-action="close" title="关闭">✕</button>
 </div>
 <div class="tp-diag-body">
 ${rows}
 <div class="tp-diag-tip">
 💡 <b>怎么提高识别率</b><br>
 1. 优先用 <b>.docx</b> 或 <b>可复制文字的 PDF</b>（在 PDF 里能选中文字 = 有文字层）<br>
 2. 扫描件／截图拼成的 PDF 没有文字层，任何纯前端方案都读不到，请改用原始文档<br>
 3. 简历里带上 <code>姓名：xxx</code> <code>电话：138…</code> 这类标准字段标签，命中率最高<br>
 4. 识别不全时，用卡片上的 <b>✏ 编辑</b> 手动补齐即可，原简历文件不会丢失
 </div>
 </div>
 <div class="modal-footer">
 <button class="btn primary" data-action="close">知道了</button>
 </div>
 </div>
 </div>`;
 openModal(html);
 }

 // 手动新建/编辑 弹窗
 function openTalentManualModal(candidate) {
 const isEdit = !!candidate;
 const c = candidate || { name:'', gender:'', age:'', years:'', position:'', expectedCity:'', phone:'', email:'', tags:[], source:'manual' };
 const html = `
 <div class="modal-mask" data-action="close">
 <div class="modal talent-modal">
 <div class="modal-header">
 <div class="modal-title">${isEdit ? '✏ 编辑候选人' : '✍ 手动新建候选人'}</div>
 <button class="modal-close" data-action="close" title="关闭">✕</button>
 </div>
 <div class="talent-form">
 <div class="talent-form-row">
 <label class="talent-form-label">姓名 *</label>
 <input class="talent-form-input" id="tpName" value="${escapeAttr(c.name || '')}" placeholder="如：张三">
 </div>
 <div class="talent-form-grid">
 <div><label class="talent-form-label">性别</label>
 <select class="talent-form-input" id="tpGender">
 <option value="">未填</option>
 <option value="男" ${c.gender === '男' ? 'selected' : ''}>男</option>
 <option value="女" ${c.gender === '女' ? 'selected' : ''}>女</option>
 </select>
 </div>
 <div><label class="talent-form-label">年龄</label>
 <input class="talent-form-input" id="tpAge" value="${escapeAttr(c.age || '')}" placeholder="岁">
 </div>
 <div><label class="talent-form-label">工作年限</label>
 <input class="talent-form-input" id="tpYears" value="${escapeAttr(c.years || '')}" placeholder="如：3年">
 </div>
 </div>
 <div class="talent-form-row">
 <label class="talent-form-label">职业 / 岗位</label>
 <input class="talent-form-input" id="tpPosition" value="${escapeAttr(c.position || '')}" placeholder="如：前端工程师">
 </div>
 <div class="talent-form-row">
 <label class="talent-form-label"> 期望城市</label>
 <input class="talent-form-input" id="tpExpectedCity" value="${escapeAttr(c.expectedCity || '')}" placeholder="如：北京、上海、深圳，或 '远程'" list="tpCityOptions">
 <datalist id="tpCityOptions">
 <option value="北京"><option value="上海"><option value="广州"><option value="深圳">
 <option value="杭州"><option value="成都"><option value="南京"><option value="武汉">
 <option value="苏州"><option value="西安"><option value="重庆"><option value="天津">
 <option value="远程"><option value="不限">
 </datalist>
 </div>
 <div class="talent-form-grid">
 <div><label class="talent-form-label">📞 电话</label>
 <input class="talent-form-input" id="tpPhone" value="${escapeAttr(c.phone || '')}" placeholder="11位手机号">
 </div>
 <div><label class="talent-form-label">📧 邮箱</label>
 <input class="talent-form-input" id="tpEmail" value="${escapeAttr(c.email || '')}" placeholder="name@example.com">
 </div>
 </div>
 <div class="talent-form-row">
 <label class="talent-form-label">标签（用逗号分隔）</label>
 <input class="talent-form-input" id="tpTags" value="${escapeAttr((c.tags || []).join(','))}" placeholder="前端,Vue,React,3-5年">
 </div>
 <div class="talent-form-tip">
 💡 字段会自动持久化保存到 localStorage · 简历原文件保存在 IndexedDB（刷新后仍可预览）
 </div>
 </div>
 <div class="modal-footer">
 <button class="btn" data-action="close">取消</button>
 <button class="btn primary" id="tpSaveBtn">${isEdit ? '✓ 保存修改' : '✓ 加入人才库'}</button>
 </div>
 </div>
 </div>`;
 openModal(html);
 $('#tpSaveBtn').onclick = () => {
 const payload = {
 name: ($('#tpName').value || '').trim(),
 gender: $('#tpGender').value,
 age: ($('#tpAge').value || '').trim(),
 years: ($('#tpYears').value || '').trim(),
 position: ($('#tpPosition').value || '').trim() || '未识别',
 expectedCity: ($('#tpExpectedCity').value || '').trim(),
 phone: ($('#tpPhone').value || '').trim(),
 email: ($('#tpEmail').value || '').trim(),
 tags: ($('#tpTags').value || '').split(/[,，]/).map(s => s.trim()).filter(Boolean),
 };
 if (!payload.name) { toast('⚠ 请填写姓名'); return; }
 if (isEdit) {
 // ⚠ 关键：编辑只覆盖字段，保留 fileId/fileName/fileType/fileSize/rawText/addedAt/source
 const idx = state.talentPool.candidates.findIndex(x => x.id === candidate.id);
 if (idx >= 0) {
 const orig = state.talentPool.candidates[idx];
 state.talentPool.candidates[idx] = {
 ...orig, // 保留原 fileId / fileName / fileType / fileSize / rawText / addedAt / source / id
 ...payload, // 覆盖字段
 fileId: orig.fileId, // 二次保险：fileId 不被 payload 误覆盖
 };
 }
 } else {
 state.talentPool.candidates.unshift({
 id: 'tp_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
 ...payload,
 source: 'manual',
 fileName: '',
 fileType: '',
 fileSize: 0,
 fileId: '',
rawText: '',
addedAt: getDateStr(new Date()) + ' ' + new Date().toTimeString().slice(0, 5),
});
awardEnergy('talent_add');
}
saveData();
$('#modalRoot').innerHTML = '';
renderTalentPool();
 toast(isEdit ? '✓ 已保存（原简历文件保留）' : '✓ 已加入人才库');
 };
 }

 function openTalentEditModal(id) {
 const c = state.talentPool.candidates.find(x => x.id === id);
 if (!c) return;
 openTalentManualModal(c);
 }

 // —— 像素风确认弹窗：返回 Promise<boolean> ——
 function talentConfirm(opt) {
 opt = opt || {};
 return new Promise(resolve => {
 const html = `
 <div class="modal-mask" data-action="close">
 <div class="modal talent-modal tp-confirm-modal">
 <div class="modal-header">
 <div class="modal-title">${opt.icon || '⚠'} ${escapeHtml(opt.title || '确认操作')}</div>
 <button class="modal-close" data-action="close" title="关闭">✕</button>
 </div>
 <div class="tp-confirm-body">
 <div class="tp-confirm-emoji">${opt.emoji || '🗑'}</div>
 <div class="tp-confirm-text">${opt.message || ''}</div>
 ${opt.detailHtml ? `<div class="tp-confirm-detail">${opt.detailHtml}</div>` : ''}
 <div class="tp-confirm-warn">${opt.warnText || '⚠ 删除后不可恢复，本地保存的原简历文件也会一并清除'}</div>
 </div>
 <div class="modal-footer">
 <button class="btn" id="tpConfirmCancel">${escapeHtml(opt.cancelText || '再想想')}</button>
 <button class="btn ${opt.danger === false ? 'primary' : 'danger'}" id="tpConfirmOk">${escapeHtml(opt.confirmText || '确定')}</button>
 </div>
 </div>
 </div>`;
 openModal(html);
 let done = false;
 let obs = null;
 const finish = (v) => {
 if (done) return;
 done = true;
 if (obs) obs.disconnect();
 const root = $('#modalRoot');
 if (root) root.innerHTML = '';
 resolve(v);
 };
 const ok = document.getElementById('tpConfirmOk');
 const cancel = document.getElementById('tpConfirmCancel');
 if (ok) ok.onclick = () => finish(true);
 if (cancel) cancel.onclick = () => finish(false);
 // 遮罩 / ✕ / ESC 关闭时视为取消
 const root = $('#modalRoot');
 if (root) {
 obs = new MutationObserver(() => {
 if (!root.querySelector('.tp-confirm-modal')) finish(false);
 });
 obs.observe(root, { childList: true, subtree: true });
 }
 });
 }

 // 实际删除（含 IndexedDB 原文件同步清理）
 async function removeTalents(ids) {
 const set = new Set(ids || []);
 if (!set.size) return 0;
 const cands = (state.talentPool && state.talentPool.candidates) || [];
 const removed = cands.filter(c => set.has(c.id));
 state.talentPool.candidates = cands.filter(c => !set.has(c.id));
 for (const r of removed) {
 if (r && r.fileId) {
 try { await TALENT_IDB.deleteFile(r.fileId); }
 catch (e) { console.warn('[人才库] 原简历文件清理失败：', r.fileId, e); }
 }
 }
set.forEach(id => _tpSelectedIds.delete(id));
var _imp = removed.filter(c => c && c.source === 'import').length;
var _man = removed.length - _imp;
if (_imp) awardEnergy('talent_import', { count: _imp, reverse: true });
if (_man) awardEnergy('talent_add', { reverse: true });
saveData();
renderTalentPool();
return removed.length;
 }

 // 单个删除 —— 自定义二次确认
 async function confirmDeleteTalent(id) {
 const c = state.talentPool.candidates.find(x => x.id === id);
 if (!c) return;
 const detail = `
 <div class="tp-confirm-row"><span>姓名</span><b>${escapeHtml(c.name || '未识别姓名')}</b></div>
 <div class="tp-confirm-row"><span>职务</span><b>${escapeHtml(c.position || '—')}</b></div>
 <div class="tp-confirm-row"><span>电话</span><b>${escapeHtml(c.phone || '—')}</b></div>
 <div class="tp-confirm-row"><span>原简历</span><b>${escapeHtml(c.fileName || '（无文件 · 手动录入）')}</b></div>`;
 const ok = await talentConfirm({
 title: '删除候选人',
 icon: '🗑',
 message: `确定要把 <b>${escapeHtml(c.name || '此候选人')}</b> 从人才库移除吗？`,
 detailHtml: detail,
 confirmText: '🗑 确认删除',
 });
 if (!ok) return;
 const n = await removeTalents([id]);
 toast(n ? `🗑 已移除「${c.name || '候选人'}」` : '未找到该候选人');
 }

 // 批量删除选中
 async function confirmBulkDeleteTalents() {
 const ids = Array.from(_tpSelectedIds);
 if (!ids.length) { toast('请先勾选要删除的候选人'); return; }
 const picked = (state.talentPool.candidates || []).filter(c => ids.includes(c.id));
 const chips = picked.slice(0, 10)
 .map(c => `<span class="tp-confirm-chip">${escapeHtml(c.name || '未识别姓名')}</span>`).join('') +
 (picked.length > 10 ? `<span class="tp-confirm-chip more">…共 ${picked.length} 人</span>` : '');
 const withFile = picked.filter(c => c.fileId).length;
 const ok = await talentConfirm({
 title: '批量删除候选人',
 icon: '🗑',
 message: `即将删除 <b>${picked.length}</b> 位候选人（其中 <b>${withFile}</b> 位含原简历文件）：`,
 detailHtml: `<div class="tp-confirm-chips">${chips}</div>`,
 confirmText: `🗑 删除这 ${picked.length} 位`,
 });
 if (!ok) return;
 const n = await removeTalents(ids);
 setBulkMode(false);
 toast(`🗑 已批量删除 ${n} 位候选人`);
 }

 // 清空整个人才库（双重确认）
 async function confirmClearTalentPool() {
 const all = (state.talentPool && state.talentPool.candidates) || [];
 if (!all.length) { toast('人才库已经是空的啦～'); return; }
 const withFile = all.filter(c => c.fileId).length;
 const step1 = await talentConfirm({
 title: '清空人才库',
 icon: '🧹',
 emoji: '',
 message: `你正在清空<b>整个人才库</b>，共 <b>${all.length}</b> 位候选人（<b>${withFile}</b> 份原简历文件）。`,
 detailHtml: `<div class="tp-confirm-row"><span>影响范围</span><b>全部候选人资料 + 本地简历文件</b></div>
 <div class="tp-confirm-row"><span>是否可恢复</span><b>否</b></div>`,
 warnText: '⚠ 此操作不可撤销！建议先在「导出」中备份数据。',
 confirmText: '我确认清空',
 });
 if (!step1) return;
 const step2 = await talentConfirm({
 title: '最后确认',
 icon: '',
 emoji: '',
 message: `真的要删除全部 <b>${all.length}</b> 位候选人吗？这是最后一次确认。`,
 warnText: '⚠ 点击确认后立即清空，无法撤销。',
 confirmText: '🧹 立即清空',
 cancelText: '取消',
 });
 if (!step2) return;
 const n = await removeTalents(all.map(c => c.id));
 setBulkMode(false);
 toast(`🧹 已清空人才库（共 ${n} 位）`);
 }

 // 详情弹窗（含 PDF 在线浏览）—— 从 IndexedDB 取原文件
 function openTalentDetailModal(id) {
 const c = state.talentPool.candidates.find(x => x.id === id);
 if (!c) return;
 const placeholderBlock = `
 <div class="talent-preview-wrap">
 <div class="talent-preview-toolbar">
 <span class="talent-preview-title"> 原简历加载中…</span>
 </div>
 <div class="talent-preview-frame">
 <div class="talent-preview-loading">⏳ 正在从本地存储读取文件…</div>
 </div>
 </div>`;
 const emptyBlock = '<div class="talent-preview-empty">手动录入的候选人无原简历文件</div>';
 const html = `
 <div class="modal-mask" data-action="close">
 <div class="modal talent-modal talent-detail-modal">
 <div class="modal-header">
 <div class="modal-title"> ${escapeHtml(c.name || '候选人')} · 详情</div>
 <button class="modal-close" data-action="close" title="关闭">✕</button>
 </div>
 <div class="talent-detail-grid">
 <div class="talent-detail-info">
 <div class="talent-detail-pos">${escapeHtml(c.position || '—')}</div>
 <div class="talent-detail-row"><span class="talent-detail-icon icon-position"></span><span>岗位</span><b>${escapeHtml(c.position || '—')}</b></div>
 <div class="talent-detail-row"><span class="talent-detail-icon icon-city"></span><span>期望城市</span><b>${escapeHtml(c.expectedCity || '—')}</b></div>
 <div class="talent-detail-row"><span class="talent-detail-icon icon-gender"></span><span>性别</span><b>${escapeHtml(c.gender || '—')}</b></div>
 <div class="talent-detail-row"><span class="talent-detail-icon icon-age"></span><span>年龄</span><b>${escapeHtml(c.age || '—')}</b></div>
 <div class="talent-detail-row"><span class="talent-detail-icon icon-years"></span><span>工作年限</span><b>${escapeHtml(c.years || '—')}</b></div>
 <div class="talent-detail-row"><span class="talent-detail-icon icon-phone">📞</span><span>电话</span><b>${escapeHtml(c.phone || '—')}</b></div>
 <div class="talent-detail-row"><span class="talent-detail-icon icon-email">📧</span><span>邮箱</span><b>${escapeHtml(c.email || '—')}</b></div>
 <div class="talent-detail-tags">
 ${(c.tags || []).map(t => `<span class="talent-mini-tag">#${escapeHtml(t)}</span>`).join('')}
 </div>
 <div class="talent-detail-meta">
 来源：${c.source === 'manual' ? '✍ 手动录入' : '📥 简历导入'} · 添加于 ${escapeHtml((c.addedAt || '').slice(0, 16))}
 </div>
 </div>
 <div class="talent-detail-preview" id="talentDetailPreview">
 ${c.fileId ? placeholderBlock : emptyBlock}
 </div>
 </div>
 <div class="modal-footer">
 <button class="btn" data-action="close">关闭</button>
 <button class="btn primary" id="talentEditBtn">✏ 编辑</button>
 <button class="btn danger" id="talentDeleteBtn">🗑 删除</button>
 </div>
 </div>
 </div>`;
 openModal(html);
 // 绑定内部按钮
 const editBtn = document.getElementById('talentEditBtn');
 if (editBtn) editBtn.onclick = () => openTalentEditModal(c.id);
 const delBtn = document.getElementById('talentDeleteBtn');
 if (delBtn) delBtn.onclick = () => {
 // 关闭当前弹窗后再走确认删除
 $('#modalRoot').innerHTML = '';
 confirmDeleteTalent(c.id);
 };

 // 异步从 IndexedDB 取文件
 if (c.fileId) {
 TALENT_IDB.getFile(c.fileId).then(file => {
 const wrap = document.getElementById('talentDetailPreview');
 if (!wrap) return;
 if (!file) {
 wrap.innerHTML = `
 <div class="talent-preview-wrap">
 <div class="talent-preview-toolbar">
 <span class="talent-preview-title"> ${escapeHtml(c.fileName || '简历文件')}</span>
 </div>
 <div class="talent-preview-frame">
 <div class="talent-preview-empty">⚠ 原文件已丢失（可能清理了浏览器数据）<br>可重新导入该简历恢复在线预览</div>
 </div>
 </div>`;
 return;
 }
 renderResumePreview(wrap, file, c);
 }).catch(e => {
 const wrap = document.getElementById('talentDetailPreview');
 if (wrap) wrap.innerHTML = `<div class="talent-preview-empty">⚠ 读取失败：${escapeHtml(e.message || String(e))}</div>`;
 });
 }
 }

 // ============================================
 // 简历在线预览（PDF / 图片 / Word / TXT）
 // - PDF：iframe 嵌入 blob URL
 // - 图片：<img> + 缩放
 // - DOCX：mammoth.js CDN 懒加载 → 转 HTML
 // - DOC：浏览器无解，给出下载入口
 // - TXT / MD：直接读文本显示
 // - 其它：提示不支持 + 下载
 // ============================================
 const RESUME_PREVIEW_KIND = {
 pdf: ['pdf'],
 image:['jpg','jpeg','png','gif','webp','bmp'],
 docx: ['docx'],
 doc: ['doc'],
 text: ['txt','md','markdown'],
 };
 const RESUME_KIND_ICON = {
 pdf: '',
 image: '',
 docx: '',
 doc: '',
 text: '📝',
 other: '',
 };
 function resumeDetectKind(fileName, mime) {
 const ext = (String(fileName || '').split('.').pop() || '').toLowerCase();
 if (mime && /^image\//.test(mime)) return 'image';
 if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
 if (ext === 'docx' || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
 if (ext === 'doc' || mime === 'application/msword') return 'doc';
 if (['txt','md','markdown'].includes(ext) || /^text\//.test(mime || '')) return 'text';
 return 'other';
 }

 // mammoth.js 懒加载（仅首次预览 docx 时加载）
 let _mammothPromise = null;
 function loadMammoth() {
 if (_mammothPromise) return _mammothPromise;
 _mammothPromise = new Promise((resolve, reject) => {
 if (window.mammoth) return resolve(window.mammoth);
 const s = document.createElement('script');
 s.src = 'https://unpkg.com/mammoth@1.6.0/mammoth.browser.min.js';
 s.onload = () => window.mammoth ? resolve(window.mammoth) : reject(new Error('mammoth 未挂载'));
 s.onerror = () => reject(new Error('mammoth CDN 加载失败'));
 document.head.appendChild(s);
 });
 return _mammothPromise;
 }

 function renderResumePreview(wrap, file, candidate) {
 const fileName = candidate.fileName || file.name || '简历';
 const mime = candidate.fileType || file.type || '';
 const kind = resumeDetectKind(fileName, mime);
 let blobUrl = '';
 try { blobUrl = URL.createObjectURL(file); } catch (e) {}

 const toolbar = `
 <div class="talent-preview-toolbar">
 <span class="talent-preview-title">${RESUME_KIND_ICON[kind] || ''} ${escapeHtml(fileName)}
 <span class="talent-preview-kind">${escapeHtml(kind.toUpperCase())} · ${formatBytes(file.size)}</span>
 </span>
 <div class="talent-preview-actions">
 ${blobUrl ? `<a class="btn" href="${escapeAttr(blobUrl)}" target="_blank" rel="noopener noreferrer" download="${escapeAttr(fileName)}">📥 下载</a>` : ''}
 ${blobUrl ? `<a class="btn" href="${escapeAttr(blobUrl)}" target="_blank" rel="noopener noreferrer">🔗 新窗口</a>` : ''}
 </div>
 </div>`;

 const cleanupAndObserve = () => {
 const obs = new MutationObserver(() => {
 if (!document.getElementById('talentDetailPreview')) {
 try { URL.revokeObjectURL(blobUrl); } catch (e) {}
 obs.disconnect();
 }
 });
 obs.observe(document.getElementById('modalRoot') || document.body, { childList: true, subtree: true });
 };

 if (kind === 'pdf') {
 wrap.innerHTML = `<div class="talent-preview-wrap">${toolbar}
 <div class="talent-preview-frame">
 <iframe class="talent-pdf-frame" src="${escapeAttr(blobUrl)}" title="PDF 预览"></iframe>
 </div></div>`;
 cleanupAndObserve();
 return;
 }

 if (kind === 'image') {
 wrap.innerHTML = `<div class="talent-preview-wrap">${toolbar}
 <div class="talent-preview-frame talent-preview-image-frame">
 <div class="talent-image-zoombar">
 <button class="btn" data-zoom="out" type="button">➖ 缩小</button>
 <span class="talent-image-zoom-val">100%</span>
 <button class="btn" data-zoom="in" type="button">➕ 放大</button>
 <button class="btn" data-zoom="reset" type="button">↺ 还原</button>
 <button class="btn" data-zoom="rotate" type="button">🔄 旋转</button>
 </div>
 <div class="talent-image-stage"><img id="resumeImg" class="talent-resume-img" src="${escapeAttr(blobUrl)}" alt="${escapeAttr(fileName)}"></div>
 </div></div>`;
 const img = wrap.querySelector('#resumeImg');
 const valEl = wrap.querySelector('.talent-image-zoom-val');
 let scale = 1, rot = 0;
 const update = () => {
 if (img) img.style.transform = `scale(${scale}) rotate(${rot}deg)`;
 if (valEl) valEl.textContent = Math.round(scale * 100) + '%';
 };
 wrap.querySelectorAll('[data-zoom]').forEach(b => {
 b.onclick = () => {
 const z = b.dataset.zoom;
 if (z === 'in') scale = Math.min(4, scale + 0.2);
 else if (z === 'out') scale = Math.max(0.3, scale - 0.2);
 else if (z === 'reset') { scale = 1; rot = 0; }
 else if (z === 'rotate') rot = (rot + 90) % 360;
 update();
 };
 });
 cleanupAndObserve();
 return;
 }

 if (kind === 'docx') {
 wrap.innerHTML = `<div class="talent-preview-wrap">${toolbar}
 <div class="talent-preview-frame">
 <div class="talent-preview-loading">⏳ 正在解析 Word 文档…（首次会下载 mammoth.js，约 200KB）</div>
 </div></div>`;
 loadMammoth().then(mammoth => file.arrayBuffer()).then(buf => mammoth.convertToHtml({ arrayBuffer: buf }))
 .then(result => {
 const frame = wrap.querySelector('.talent-preview-frame');
 if (!frame) return;
 const html = (result && result.value) || '';
 const messages = (result && result.messages) || [];
 frame.innerHTML = `<article class="talent-docx">${html || '<p style="color:var(--text-secondary)">（文档无内容）</p>'}</article>` +
 (messages.length ? `<details class="talent-preview-warn"><summary>⚠ 解析提示（${messages.length}）</summary><pre>${escapeHtml(messages.map(m=>m.message).join('\n'))}</pre></details>` : '');
 })
 .catch(err => {
 const frame = wrap.querySelector('.talent-preview-frame');
 if (frame) frame.innerHTML = `
 <div class="talent-preview-empty">
 Word 解析失败：${escapeHtml(err.message || String(err))}<br>
 <small style="opacity:.7">请下载后用 Word/WPS 打开，或导出为 PDF 后重新导入</small>
 ${blobUrl ? `<div style="margin-top:10px"><a class="btn" href="${escapeAttr(blobUrl)}" download="${escapeAttr(fileName)}">📥 下载原文件</a></div>` : ''}
 </div>`;
 });
 cleanupAndObserve();
 return;
 }

 if (kind === 'text') {
 const reader = new FileReader();
 reader.onload = () => {
 wrap.innerHTML = `<div class="talent-preview-wrap">${toolbar}
 <div class="talent-preview-frame talent-preview-text-frame">
 <pre class="talent-text-pre">${escapeHtml(String(reader.result || ''))}</pre>
 </div></div>`;
 };
 reader.onerror = () => {
 wrap.innerHTML = `<div class="talent-preview-empty"> 读取文本失败</div>`;
 };
 reader.readAsText(file);
 cleanupAndObserve();
 return;
 }

 if (kind === 'doc') {
 wrap.innerHTML = `<div class="talent-preview-wrap">${toolbar}
 <div class="talent-preview-frame">
 <div class="talent-preview-empty">
 <b>.doc（旧版 Word 文档）</b>无法在浏览器直接预览<br>
 <small style="opacity:.75">建议：在 Word/WPS 里另存为 <b>.docx</b> 或 <b>.pdf</b> 后重新导入</small>
 ${blobUrl ? `<div style="margin-top:12px"><a class="btn primary" href="${escapeAttr(blobUrl)}" download="${escapeAttr(fileName)}">📥 下载原文件</a></div>` : ''}
 </div>
 </div></div>`;
 cleanupAndObserve();
 return;
 }

 // 其它未知格式
 wrap.innerHTML = `<div class="talent-preview-wrap">${toolbar}
 <div class="talent-preview-frame">
 <div class="talent-preview-empty">
 当前格式暂不支持在线预览<br>
 <small style="opacity:.75">已支持：PDF / 图片(jpg/png/gif/webp/bmp) / Word(docx) / 文本(txt/md)</small>
 ${blobUrl ? `<div style="margin-top:12px"><a class="btn primary" href="${escapeAttr(blobUrl)}" download="${escapeAttr(fileName)}">📥 下载原文件</a></div>` : ''}
 </div>
 </div></div>`;
 cleanupAndObserve();
 }

 // 字节数 → 人读格式
 function formatBytes(n) {
 if (!n || n < 0) return '0 B';
 const units = ['B','KB','MB','GB'];
 let i = 0;
 while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
 return (i === 0 ? n : n.toFixed(1)) + ' ' + units[i];
 }

 // ============================================
 // 🎨 主题切换
 // ============================================
 const THEMES = [
 { id: 'pink', name: '樱花粉', cls: 'theme-pink', swatches: ['#FF8FB1', '#F8BBD0', '#FFE5A0', '#A8E6CF'] },
 { id: 'purple', name: '蓝莓紫', cls: 'theme-purple', swatches: ['#9C89B8', '#C9B6E4', '#FFD9A0', '#A0D8D0'] },
 { id: 'matcha', name: '抹茶绿', cls: 'theme-matcha', swatches: ['#8BC4A0', '#B8E0D2', '#FFE5A0', '#A8E6CF'] },
 { id: 'night', name: '夜间模式', cls: 'theme-night', swatches: ['#E8A0BF', '#6B4D6B', '#FFD98E', '#88D4B0'] },
 ];
 const THEME_KEY = 'workspace-theme';

 function getSavedTheme() {
 try { return localStorage.getItem(THEME_KEY) || 'pink'; } catch (e) { return 'pink'; }
 }

 function applyTheme(id) {
 const t = THEMES.find(x => x.id === id) || THEMES[0];
 /* 主题调色板别名定义在 :root，且 html 背景取 var(--c-bg)；
 必须让 <html> 与 <body> 同时持有主题 class，否则切换非粉色主题时
 html 背景会卡在默认粉色、四周露出粉色边距。 */
 const root = document.documentElement;
 root.classList.remove('theme-pink', 'theme-purple', 'theme-matcha', 'theme-night');
 document.body.classList.remove('theme-pink', 'theme-purple', 'theme-matcha', 'theme-night');
 root.classList.add(t.cls);
 document.body.classList.add(t.cls);
 try { localStorage.setItem(THEME_KEY, t.id); } catch (e) {}
 const meta = document.querySelector('meta[name="theme-color"]');
 if (meta) meta.setAttribute('content', t.swatches[0]);
 $$('.theme-card').forEach(c => {
 const active = c.dataset.theme === t.id;
 c.classList.toggle('active', active);
 const chk = c.querySelector('.theme-check');
 if (chk) chk.style.display = active ? 'flex' : 'none';
 });
 }

 function renderThemeCards(container) {
 if (!container) return;
 const saved = getSavedTheme();
 container.innerHTML = THEMES.map(t => `
 <div class="theme-card ${t.id === saved ? 'active' : ''}" data-theme="${t.id}" role="button" tabindex="0">
 <div class="theme-check" style="${t.id === saved ? 'display:flex' : 'display:none'}">✓</div>
 <div class="theme-swatch">
 ${t.swatches.map(s => `<span class="theme-dot" style="background:${s}"></span>`).join('')}
 </div>
 <div class="theme-name">${t.name}</div>
 </div>`).join('');
 container.querySelectorAll('.theme-card').forEach(card => {
 const handler = () => { applyTheme(card.dataset.theme); closeThemePopover(); };
 card.onclick = handler;
 card.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); } };
 });
 }

 function openThemePopover() {
 const pv = $('#themePopover');
 const bd = $('#themePopoverBackdrop');
 if (pv) { renderThemeCards($('#themeCardsPopover')); pv.classList.add('open'); }
 if (bd) bd.classList.add('open');
 }
 function closeThemePopover() {
 const pv = $('#themePopover');
 const bd = $('#themePopoverBackdrop');
 if (pv) pv.classList.remove('open');
 if (bd) bd.classList.remove('open');
 }

 function setupThemeUI() {
 renderThemeCards($('#themeCardsSettings'));
 renderThemeCards($('#themeCardsPopover'));
 applyTheme(getSavedTheme());
 const qb = $('#themeQuickBtn');
 if (qb) qb.onclick = openThemePopover;
 const bd = $('#themePopoverBackdrop');
 if (bd) bd.onclick = closeThemePopover;
 }

// 分栏图标 base64 内联（部署时图标不丢失）
const NAV_ICON_BASE64 = {
  '0932cdaca17d51e79a69ebb930649529.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAAC0AgMAAABAo+6hAAAAAXNSR0IArs4c6QAAAAxQTFRFTGlx////AAAA5N/fcYeliAAAAAF0Uk5TAEDm2GYAAADsSURBVGje7ZjRFYMgDEVliO7jEMoQ7NMhoEN0nw5RCwTEYFmA996Hx5AbP3KIISwLRVHz6LEXrdEw1diA6ei2IcknIka6bD0lGJJObp9TZhNRnrK4QdKmuYUokTVshaSbu6OzSfqaTdKkh7QWadJ9ixrQqlEh0KYvrb7eVKNCoUfpc6GdaUiPiw2JljFAJoGavlCHAUzavY6Pb9uoFFj8hKxD0vtlRDzpM6HI9Pur6Zw+TLpsoL8ZDMl162mz0/E0c+/cVpecOvtg0Hv/3wlev+PRci95tiUlX+8u0ejrde1Ng3tNAJqiKGoW/QCVkRXGvyMvygAAAABJRU5ErkJggg==',
  '0a0950cdeb7b66a240c38b00c11d5395.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAAC0AgMAAABAo+6hAAAAAXNSR0IArs4c6QAAAAxQTFRFTGlx////AAAA5N/fcYeliAAAAAF0Uk5TAEDm2GYAAADvSURBVGje7ZjbDcMgDEXDEN0nQ4Rkhy7RKToE2adLdIeKAuZlCBmA66OqkuPjHwSy5WURBGEeHjqyukClYAO2XXo/PcYbrvIZojcVQ9o+bcKR7d6I//Rxg7RVSZMRK1PZCmmXdGOHUOz6NMUWe2hzxG48+gHapUUNbNaoEGzVPq2mgDcqFPvmmXWPDcnew7wbeFlrf8kLgy+orVPBYYlPUjWyTT0723wOBrXzxTrs15QrhWzXNflMcwrNbrvUVYhlu2mmG/3zfYo2m30wbM3T/PjOi3lwfpv2krSGazFpd4lm1+vajsFeE8AWBEGYhT++tQ4KjDXcjwAAAABJRU5ErkJggg==',
  '1c280bbdd65d06b5e664175ab9ac69b4.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAAC0AgMAAABAo+6hAAAAAXNSR0IArs4c6QAAAAxQTFRFTGlx////AAAA5N/fcYeliAAAAAF0Uk5TAEDm2GYAAAEESURBVGje7ZjfEYMwCMZ1iO6TIdTu0CU6hUOYDtEpXKI79E+A5AzR3PnafHwPnsiPF45IoOtMJlM7uoxRLhh9MgZgOrgnT1qICJE3tmYJhqTJvXDKJiLiUz4OkHS/uYWIkSnMQdKbu6DZNDrPptFGV2kto40uW1SFVo0Kge7Lo1VKNSoUWqXv+hWtx4WFRwv68U8dgEzfGXo9UsDbaKaZowCjZVz0sZ6ktnwaGkHp7L+Ta63mu3FajYs+aTnR01qlw21Gj9DFC9Hq7oNBc+Lm8WDbQifw4D7YPi17ya2eQuSkamu3mwGg83WtpC+rs8peE4DeD0vD6XU/AC3ZdJ3RJtMf6AdE3QLJF5vBiwAAAABJRU5ErkJggg==',
  '1cf3dde822a4b28809e9058e6172e9fb.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAAC0AgMAAABAo+6hAAAAAXNSR0IArs4c6QAAAAlQTFRFTGlx////AAAAztsTbQAAAAF0Uk5TAEDm2GYAAADVSURBVGje7ZjJFcMgDERNEenHRTgUQT8pAqoMIPYluTMzBz/L+rrogbVcF0VR5+j1Trq9obLxANPerV2QDYSPNNH6SDAkHdw2pkwHIj3l4wNJq+oWIkXmsBuSru6BjibpNpukSW/pXqRJjyVqQ3eFCoFW49Ua1RUqFPpH+qaDRRqe1nEMkHkgzgDG1d4Xkza2v3LxvbhAaUlcyWAZIJFpnpO5Su1u2rqmHU37buZv5e56Hwy6+fnOqFv0g+fTspc0biWbd5dodLuunbTZawLQFEVRp+gLEFDbW1sDnrUAAAAASUVORK5CYII=',
  '1d657cd930ec753bce5d01932269936a.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAAC0AgMAAABAo+6hAAAAAXNSR0IArs4c6QAAAAxQTFRFTGlx////AAAA5N/fcYeliAAAAAF0Uk5TAEDm2GYAAADvSURBVGje7ZjJEcMgDEVNEenHRTikhzSRKlwENOEqUk5M2Bdhkjtf/+AZSY+LRkZCy8JisebR7R61WkMkYwOmbVhqJ+UIe/LprT0chqRdWPmUSUfEb3BukLQo4UDEk+nYCkmXMKG9yXSdTaaZHtKtmGaatqgB3TQqBFrQX4uqaVQodE4fyWPth6WbVLbzDS79/wICo6V/GtWQLu8BQPpljDkv6MP6P8C0MW9STQ/vhaRtPR0/6LPradPTdpqRsXryXZzLK1Tb3sw+GHR10fSjjL6YB+enw14yrOGoVNpdotH1urbTYK8JQLNYLNYs+gKnpzJAIvZV4AAAAABJRU5ErkJggg==',
  '27f051d34c151422989c968c86822601.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAAC0AgMAAABAo+6hAAAAAXNSR0IArs4c6QAAAAlQTFRFTGlx////AAAAztsTbQAAAAF0Uk5TAEDm2GYAAADSSURBVGje7ZjBFYQgDESliO3HIlyKsB+LgCoFAgJBdu/MzIFnzM8lD0jItlEUtY4+36w9GKYYBzAd3NZHuUiEyDNZlwRD0tHtUspsJPIqPw9I2lS3EDmyhO2QdHUrOpmk22ySJj2le5EmrUvUhO4KFQJt9NHS6goVCv0jfcPGIg1P2/QMaCFfe19MOq7tkUvfjwuULk/Eh84PSGSa+2SsUrOT9l7TlqZDN/O3cne9DwbdXL4j6l/6wfVpmUvK7aPlyuwSjW7HtYMmc00AmqIoahXdqF+s8zAdWCIAAAAASUVORK5CYII=',
  '2ac8f9325a5af6ed3f77501d6d1d6fb6.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAAC0AgMAAABAo+6hAAAAAXNSR0IArs4c6QAAAAxQTFRFTGlx////AAAA5N/fcYeliAAAAAF0Uk5TAEDm2GYAAAEjSURBVGje7ZjRFYMgDEXtEO7jEA3uwBKdwiHAIZzCJdyhpUBUQPH0u768L4T7fnJCDGkakUh0Uz1o1VPoVS2RtkEDUQdL7yHzx36t7NC72XtMNYgAdEQ5ZNbEtaHXm8gb1DmIEDTn0MDxU8GgxxA+NiwGj+Ycokz82a8GDUlrQ3SmNwHSbX6vqCJEeiu+nEBCMz1t4bui048KhracVYcaVF68Doou/9nVGpQSC4OuVOQ8n4SmSxsmrU+JpbMmGJGO9yr1vlTsCC00vwSmT5wjqILmHX+UPRoxaG5onFvG8DgsbtoYNp2n8+ECCB2zxxvmreKsdacPqD0MXDDofNoy7H2MSi3O5WzmxvRuMEVvp+soDF0OK9PU8vfM+9a0SCT6Q30BJLarMNSeKLUAAAAASUVORK5CYII=',
  '50b0c14c03be1d6bab6eabdadc12058a.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAAC0AgMAAABAo+6hAAAAAXNSR0IArs4c6QAAAAxQTFRFTGlx////AAAA5N/fcYeliAAAAAF0Uk5TAEDm2GYAAAD9SURBVGje7ZjLEYMwDEShiPRDEZgi6Ici7BSRflJEEtv6WCaQyZnVHjwIPV008kjWMLhcruvoFlhTNkYxZmA6u5dUFAuRI9dqbRQMSRd3rClbCsEn/Zwh6bG5ieBICZsg6ebe0dV02mYTlm7XzGltTkt6vDoigNO5Od3fWc90HIBI/5HB1qgwaJ5jYjhV16hQ6F1b+llYQHQwY64mjodgWDqXTq0tTWVJayo/N1S6FZa+BMxjAJnWlDEtOUWmubboykk9YdLcpeTUV/Sa2olF1yHP3qtgP8hllwsgtLSogy4lOyk0mvaSGtApyu4Sjbbr2i+d7DUBaJfL5bqKPuUSbri4sepfAAAAAElFTkSuQmCC',
  '7132168e66e8204922d710b561269aa2.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAAC0AgMAAABAo+6hAAAAAXNSR0IArs4c6QAAAAxQTFRFTGlx////AAAA5N/fcYeliAAAAAF0Uk5TAEDm2GYAAAEiSURBVGje7ZjNFYMgEISxiPRDEa7pwSaswiKCRVhFmrAHJcLihp/oOckwB98DPi7zZhFWqaof042I2konxK0zY3u5E4TeCSKd0Q1RtBOOJuofBy2uNW6SUGln1iFdDmHpzjh5y5yhfjRC0pwhTpWTL7nwpZCqd85A6HSZibAz3gxFZ8tnQySaD5p4OXZTlrRCouVvdE7r7KACpFNVutLx9e6CTi55CHSTl1auLr7ToNAX9hXBqjQ63ZsiW51/GADTVJxB8TwsnRxD6dsAlOYM+S8nTHIGSDuzpKgmazczW7tI+X34p/077R/S7N3ItNciMyZtVsLQ0lwY7KG1aCvg0cNmSs0rKr3bdA+lld9jJvuk4t0AQEv/Wp+0ubXCo6u+Ui/yRTbRH8A2WgAAAABJRU5ErkJggg==',
  '7c80a70aeed609066e30be12e1ae51fa.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAAC0AgMAAABAo+6hAAAAAXNSR0IArs4c6QAAAAlQTFRFTGlx////AAAAztsTbQAAAAF0Uk5TAEDm2GYAAADpSURBVGje7ZnREYQgDESlCPuhiAtF0I9FQJUnAkqQY8bPc3fHH8cXP3Y2AnFZKIp6j1YpsqSzjIiLSUHkQ7rY58Phn4ubKFlM2igolWU3s6F9AQpd7Kv0devuOUOk+2Adt5a0brb9KTp99htp0g29yoC+stV1GgJtBq1VjKtLFSCd7fNxXKNThUXLKFv5Fci0ipcreRJw+lGqMOiu2fzcQdJg9K9VSh6t3G+i992M/uhsd7o9MYLQOkDpqjOFwSkag07BOvdzoVa6yWwGgK4F0szmYpgMczHo7uvcT1igaU7v+ZeH//X+S19GqAVAsdPw3wAAAABJRU5ErkJggg==',
  '7f8afddb5e863c9c7ef95e4c49356f66.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAAC0AgMAAABAo+6hAAAAAXNSR0IArs4c6QAAAAxQTFRFTGlx////AAAA5N/fcYeliAAAAAF0Uk5TAEDm2GYAAADoSURBVGje7ZjLEYMwDERJEe6HIvj04H4owmkiVaSJ9MAQ27LxDxiuye4emJH1dNFYFlLXURT1L3qMQYOzVLR6YNq69dNpsYSNnLxhQjAi7d2LT5k26SuHPSStdrcQMTKEDZB05q5oZ5LOs0ma9DldiDTppkUd00WjgqBVVVqNikYFQl+kr71YpEnfKTYoegqjUQ65E//Dl8YkJLoYisoxSUsM6Zw2WbGB0Jddyrnm7ZNuFQRt/2ZOaZu4ebN6p0cZhR7lfTmkxYVGy15S1nCNXmssNjA6X9fWlbavLzs4+s6amzRFUT+hL5MkOUgDOzyWAAAAAElFTkSuQmCC',
  '93bd58cc3a452b8b8c4bbe45bb556958.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAAC0AgMAAABAo+6hAAAAAXNSR0IArs4c6QAAAAxQTFRFTGlx////AAAA5N/fcYeliAAAAAF0Uk5TAEDm2GYAAAD9SURBVGje7ZjdFYMgDIXtEN3HIVqHcB+GUIZwCpdwh0JJgBYhHt+5uQ8efr685FwIZhhUKlU/er6TxjB55MkLlE7ctJIWIsLKzDMTgwHpyFm/c4z5fUPM0iQRhObtzbM+RMw2jWPYiEbzoUrbFe0pp2EKSMdDtWV+n4oxKn3KoNISXQqWjq4qjaX0bQaLQgVBn0pUKceLVaECoadLSx22MRYIfW0p4bApDUuzqzbXeCuvGEA6Z/BoztuhtNLVjWzZRrYuVNRoEKpU77RYud3/p5rom9dMb3QyVnXv5JpNbamq4YJBp4fvKmnJvUs0umzXNhqFTi8GrVKpVL3oC0DUnoNHCHbkAAAAAElFTkSuQmCC',
  'c2b9750f9f7ec39abc8664e2c13d3784.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAAC0AgMAAABAo+6hAAAAAXNSR0IArs4c6QAAAAxQTFRFTGlx////AAAA5N/fcYeliAAAAAF0Uk5TAEDm2GYAAAEBSURBVGje7ZjbEcQgCEWTIrafFBEtwn4sQraI7WeLSNYHBs1r9juX+5EJcvhhFBiGQaVSPUcvw5qiMVZjBqaj21JSSESMdNnyJRiSTu6QU2YTwd9yOEPSo7gLwZE1bIKkxb2js6l0m01YWp6Z0ltzsvRZOsKA07E5vdeoL50HINJ/ZFAaFQbNc0wwl+oaFQq9a0u3FwuI5pGXJJWuHnhU2uUCtC7sTm9v5ZJEAZVuk7glruYUlO65LhKczj8t7S0onfqQFZ9UnxJ87GmPp/OQ55v1yrZc4AIdzXa5AEKbepnORhnaLVww6LKXdHSmUHeXaHS7rj3oYq8JQKtUKtVT9APQKt3QF+AYuQAAAABJRU5ErkJggg==',
  'c4edea873c74b43f5d2aefaca17d2190.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAAC0AgMAAABAo+6hAAAAAXNSR0IArs4c6QAAAAxQTFRFTGlx////AAAA5N/fcYeliAAAAAF0Uk5TAEDm2GYAAAEDSURBVGje7ZjRDcMgDESTIbpPhwgM0SU6BUNAh+gUHaelGHBiCJXy25zvo6qV55+T4ZCnSaVSnUcXU3VNxczFAkynzzaQPBGp85YrV5ohafrss2WWiNrJzYj0zFBWaiv2hUeMn72JKHS1T9Le3GOMbyqVTm4+I3lXpkrplX7x/6B0Gaxy7/CQKW04oo5N1TnpLaIE7daeLqgQ6DaiGuX8dlYGFQrd2dfTzWFTGp622y0s7yBkmn7lkbOVM8g0+yVHKoDTOif7lBqdNMdtWHR6zXTJvS+btw8GvZo1DKrBe/D8dNlLbq9/Kc+7SzRarmu7Y/ZzrwlAD5uXgyt/DFqlUv2JvrOceqxGWe6sAAAAAElFTkSuQmCC',
  'd97bb7cb32ce65846faf77921bfee12a.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAAC0AgMAAABAo+6hAAAAAXNSR0IArs4c6QAAAAlQTFRFTGlx////AAAAztsTbQAAAAF0Uk5TAEDm2GYAAADTSURBVGje7ZjLEcMgDEShiPRDEYQi0o+LcKo0IHksfs453t2DZyQ9XTTIAjlHUdRz9HqrQjb8aURgOofTt2gvRM78VGuTZEi6hPdaslQI/YozQtL+CguhmWdagKSvcEdXk7StJmnSS7oVadL9iFrQzaBCoH3fWr2aQYVC35RvOFikSZMm/Ysef0Dt2wCXtjnGA0irS9YK9jCJZzrTnk3n28xicuvTMUebuw8GXYs177SkOyk0WvaSsoaz2pa7GQDarmvHTovTvSYAvc4PjjRFUf+kA2JZqRWlbiymAAAAAElFTkSuQmCC',
  'e22f0c10d68698c28c4b6ac95ab13915.png': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALQAAAC0AgMAAABAo+6hAAAAAXNSR0IArs4c6QAAAAxQTFRFTGlx////AAAA5N/fcYeliAAAAAF0Uk5TAEDm2GYAAADrSURBVGje7ZjdFcMgCIXjEN0nQ0S7g0t0ig6h+3ScnlbxJ4q6gJf7kBPk48WDghyHSCTaRw+ddQZDFeMCpoPb+CgXiRBpyXqnYEg6uh1tmYlE/qbFC5JWtzsRObKEnZD07WY0mUK3uym00Eu6l9BC8xK1oLtChUArfrS4ukKFQrPte321fv4+88SCpIljAbC0pb6/cvHH0MMAmNblDqoB7Tos3V1D/dsAlE451LwYU55h0tlXY8pMIefZtKbtTYduZkwmttL1Phh0k0BjK+Mn/eD+dJpLWj+TK7NLNLod1w5azDUBaJFIJNpFf8Tl509kYET/AAAAAElFTkSuQmCC',
  'ai.png': 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PHJlY3QgeD0iNiIgeT0iOCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjE2IiByeD0iNSIgZmlsbD0iI2UyNmQ5YSIvPjxjaXJjbGUgY3g9IjEzIiBjeT0iMTYiIHI9IjIuMiIgZmlsbD0iI2ZmZiIvPjxjaXJjbGUgY3g9IjE5IiBjeT0iMTYiIHI9IjIuMiIgZmlsbD0iI2ZmZiIvPjxyZWN0IHg9IjE0LjUiIHk9IjMiIHdpZHRoPSIzIiBoZWlnaHQ9IjUiIHJ4PSIxLjUiIGZpbGw9IiNlMjZkOWEiLz48Y2lyY2xlIGN4PSIxNiIgY3k9IjIuNiIgcj0iMiIgZmlsbD0iI2ZmZDhhOCIvPjwvc3ZnPg==',
};

 function init() {
 // 加载数据
 if (typeof window.APP_DATA === 'undefined') {
 console.error('数据未加载');
 return;
 }

 // 数据迁移：把旧版 emoji 形式的心情字段统一转成 id（一次性）
 migrateDiaryEntries();

 // 顶部时间
 updateTopTime();
 setInterval(updateTopTime, 1000);

 // 主题切换
 setupThemeUI();

 // 主题背景（应用已保存的本地图片背景）
 bgApplySaved();

 // 侧边栏 + 抽屉分栏图标（沿用原三丽鸥图标样式）
 const allNav = [...$$('.nav-item'), ...$$('.drawer-nav-item')];
 allNav.forEach(item => {
 const iconFile = item.dataset.icon;
 const iconEl = item.querySelector('.nav-icon');
 if (iconFile && iconEl) {
 iconEl.style.backgroundImage = NAV_ICON_BASE64[iconFile] ? `url('${NAV_ICON_BASE64[iconFile]}')` : `url('assets/avatars/${iconFile}')`;
 }
 item.onclick = () => switchView(item.dataset.view);
 });

 // 抽屉导航（移动端 ☰ 触发）
 const mobileNavToggle = $('#mobileNavToggle');
 if (mobileNavToggle) mobileNavToggle.onclick = toggleNavDrawer;
 const navDrawerBackdrop = $('#navDrawerBackdrop');
 if (navDrawerBackdrop) navDrawerBackdrop.onclick = closeNavDrawer;
 const navDrawerClose = $('#navDrawerClose');
 if (navDrawerClose) navDrawerClose.onclick = closeNavDrawer;

 // 桌面「今日时间线」：添加按钮 + 数据变更自动刷新
 const desktopAddBtn = document.getElementById('desktopAddEvent');
 if (desktopAddBtn) desktopAddBtn.onclick = function () {
   if (window.ScheduleAPI) window.ScheduleAPI.addEvent(getDateStr(new Date()), null);
 };
 window.addEventListener('schedule-changed', function () {
   var dash = document.getElementById('view-dashboard');
   if (dash && dash.classList.contains('active')) renderDesktopTimeline();
 });

 // 番茄钟模块初始化（事件绑定 + 恢复进行中的计时）
 initFocus();

 // 浮动按钮
 $('#fabBtn').onclick = () => {
 const viewName = $('.view.active').id.replace('view-', '');
 const actions = {
 schedule: () => { if (window.ScheduleAPI && window.ScheduleAPI.open) window.ScheduleAPI.open(); else { var b = $('#addEventBtn'); if (b) b.click(); } },
 diary: () => $('#diaryCheckinBtn').click(),
 reading: () => $('#logReadingBtn').click(),
 portfolio: () => $('#addPortfolioBtn').click(),
 finance: () => $('#addExpenseBtn').click(),
 };
 if (actions[viewName]) actions[viewName]();
 };

 // 视图切换时显示 FAB
 const observer = new MutationObserver(() => {
 const active = $('.view.active');
 const fab = $('#fabBtn');
 if (active && ['schedule', 'diary', 'reading', 'portfolio', 'finance'].some(v => active.id === `view-${v}`)) {
 fab.style.display = 'flex';
 } else {
 fab.style.display = 'none';
 }
 });
 $$('.view').forEach(v => observer.observe(v, { attributes: true, attributeFilter: ['class'] }));


 // 启动边牧宠物（QQ 宠物式自由走动），只启动一次
 if (!window.__petStarted) {
 window.__petStarted = true;
 if (typeof startDesktopPet === 'function') {
 // 等一帧再启动，确保 DOM 完全就绪、宠物容器可被读到
 requestAnimationFrame(() => startDesktopPet());
 }
 }

 // 点击空白处关闭小狗互动菜单
 document.addEventListener('click', (e) => {
 const menu = document.getElementById('petMenu');
 if (!menu) return;
 const pet = document.getElementById('desktopPet');
 if (menu.classList.contains('open') &&
 !menu.contains(e.target) &&
 !(pet && pet.contains(e.target))) {
 menu.classList.remove('open');
 }
 });

 // 默认视图
 switchView('dashboard');
 }

 // ============================================
 // 🐶 自由走动的桌面宠物（边牧）—— 完整实现
 // - 自由走动：随机选目标位置 → 平滑过渡 + 自动转向
 // - 随机活动：walking / idle / sitting / wagging / sleeping / spinning
 // - 互动：点击显示菜单；点菜单项触发心情/能量变化 + 边牧口吻对话
 // - 拖拽：可拖动到任意位置，松手后继续随机活动
 // - 定时自言自语：约每 25-40 秒在合适心情时说一句话
 // ============================================
 const PET = {
 el: null, sprite: null, img: null, shadow: null, bubble: null, menu: null,
 x: 80, y: 80, // 当前位置（视口坐标，sprite 中心点）
 target: null, // 目标位置
 facing: 'right', // 当前朝向
 activity: 'idle', // 当前活动
 size: 150, // 宠物像素尺寸（桌面），移动端会变小
 walkTimer: null, // 选目标的定时器
 moodTimer: null, // 自言自语定时器
 sleepTimer: null, // 睡觉结束定时器
 bubbleTimer: null, // 气泡自动关闭
 dragging: false, // 是否在拖拽
 menuOpen: false, // 互动菜单是否打开（打开时暂停自动行为流转）
 _lastTs: 0,
 _bubbleSeq: 0,
 };

 // 用户导入的 GIF 动态素材（原始循环，不额外叠加 CSS 动画）
 const PET_GIF = {
 happy: 'assets/avatars/pet/happy.gif', // 开心（待机/摆尾/兴奋/摸摸）
 think: 'assets/avatars/pet/think.gif', // 思考（坐下）
 sniff: 'assets/avatars/pet/sniff.gif', // 嗅闻（走动）
 sleep: 'assets/avatars/pet/sleep.gif', // 睡觉
 bone: 'assets/avatars/pet/bone.gif', // 啃骨头（喂食）
 ball: 'assets/avatars/pet/ball.gif', // 玩球（丢球/出去遛）
 };
 // 活动 → 使用的 GIF
 const PET_ACT_GIF = {
 idle: 'happy',
 walking: 'sniff',
 sitting: 'think',
 lying: 'happy',
 sleeping: 'sleep',
 wagging: 'happy',
 excited: 'happy',
 spin: 'ball',
 };

 function petSetPosition(x, y) {
 const W = window.innerWidth, H = window.innerHeight;
 const m = PET.size / 2 + 12;
 PET.x = Math.max(m, Math.min(W - m, x));
 PET.y = Math.max(m, Math.min(H - m, y));
 if (PET.el) {
 PET.el.style.transform = `translate(${PET.x}px, ${PET.y}px)`;
 }
 }

 function petSetFacing(dir) {
 if (!PET.sprite) return;
 if (dir === PET.facing) return;
 PET.facing = dir;
 // 用 CSS 变量控制水平翻转，避免与 GIF 自身动画/缩放冲突
 PET.sprite.style.setProperty('--pet-flip', dir === 'left' ? '-1' : '1');
 }

 function petSetGif(src) {
 if (PET.img && PET.img.getAttribute('src') !== src) {
 PET.img.src = src;
 }
 }

 function petSetActivity(act) {
 if (!PET.el) return;
 PET.activity = act;
 PET.el.classList.remove('is-moving', 'is-sitting', 'is-lying', 'is-sleeping', 'is-wagging', 'is-excited', 'is-spin');
 if (act && act !== 'idle') PET.el.classList.add('is-' + act);
 // 切换到对应 GIF（待机/idle 用 happy 的原生循环；全程不叠加 CSS 动画）
 const key = PET_ACT_GIF[act] || 'happy';
 petSetGif(PET_GIF[key]);
 }

 function petMoveToRandom() {
 if (PET.dragging) return;
 const W = window.innerWidth, H = window.innerHeight;
 const m = PET.size / 2 + 20;
 const pad = m;
 // 80% 概率走远点，20% 走小范围（更自然）
 let nx, ny;
 if (Math.random() < 0.8) {
 nx = pad + Math.random() * (W - 2*pad);
 ny = pad + Math.random() * (H - 2*pad);
 } else {
 nx = PET.x + (Math.random() - 0.5) * 360;
 ny = PET.y + (Math.random() - 0.5) * 260;
 }
 // 决定朝向
 if (Math.abs(nx - PET.x) > 8) petSetFacing(nx < PET.x ? 'left' : 'right');
 // 距离 / 步速估算：整体放慢、过渡更平缓，避免突兀切换
 const dist = Math.hypot(nx - PET.x, ny - PET.y);
 const dur = Math.max(1.8, Math.min(6.5, dist / 70));
 if (PET.el) PET.el.style.transitionDuration = dur + 's';
 petSetActivity('walking');
 petSetPosition(nx, ny);
 // 到点后略作停顿再决定下一步，节奏更舒缓
 clearTimeout(PET.walkTimer);
 PET.walkTimer = setTimeout(() => {
 if (PET.dragging) return;
 petChooseNextActivity();
 }, dur * 1000 + 900);
 }

 // 选下一活动（自动行为流转的唯一调度入口：保证循环永不卡死）
 function petChooseNextActivity() {
 if (PET.dragging) return;
 // 菜单打开时暂停切换，稍后重试；关闭菜单(petCloseMenu)时会主动恢复
 if (PET.menuOpen) {
 clearTimeout(PET._actTimer);
 PET._actTimer = setTimeout(petChooseNextActivity, 700);
 return;
 }
 // 心情健康都高 → 多走动；心情低 → 趴下/睡觉
 const m = (state.mascot.mood == null ? 70 : state.mascot.mood);
 const h = (state.mascot.health == null ? 70 : state.mascot.health);
 const r = Math.random();
 let act;
 if (m < 30) {
 act = r < 0.6 ? 'sleeping' : 'lying';
 } else if (m < 55) {
 act = r < 0.4 ? 'sitting' : (r < 0.7 ? 'lying' : 'walking');
 } else if (m > 85 && h > 70) {
 // 非常开心
 if (r < 0.25) act = 'excited';
 else if (r < 0.5) act = 'wagging';
 else if (r < 0.7) act = 'spin';
 else act = 'walking';
 } else {
 if (r < 0.5) act = 'walking';
 else if (r < 0.7) act = 'sitting';
 else if (r < 0.85) act = 'wagging';
 else act = 'lying';
 }
 petSetActivity(act);

 // 持续时长（整体放慢、切换舒缓，但不至于长时间卡在单一行为）
 let dur = 2600;
 if (act === 'sleeping') dur = 7000 + Math.random() * 5000;
 else if (act === 'lying') dur = 3500 + Math.random() * 3000;
 else if (act === 'sitting') dur = 3000 + Math.random() * 2500;
 else if (act === 'wagging') dur = 3000 + Math.random() * 2500;
 else if (act === 'excited' || act === 'spin') dur = 2500 + Math.random() * 2000;
 else dur = 2000 + Math.random() * 2000; // walking

 clearTimeout(PET._actTimer);
 PET._actTimer = setTimeout(() => {
 if (PET.dragging) { PET._actTimer = setTimeout(petChooseNextActivity, 400); return; }
 if (PET.menuOpen) { PET._actTimer = setTimeout(petChooseNextActivity, 700); return; }
 // 55% 继续走，45% 再做点别的（保证状态持续流转，不长期静止）
 if (act === 'sleeping') {
 // 睡醒时撒个娇
 petSetActivity('wagging');
 window.petSay && window.petSay(PET_DIALOGUE.excited[Math.floor(Math.random() * PET_DIALOGUE.excited.length)], { mood: 'happy' });
 setTimeout(petMoveToRandom, 1800);
 } else if (Math.random() < 0.55) {
 petMoveToRandom();
 } else {
 petChooseNextActivity();
 }
 }, dur);
 }

 // 在小狗头顶显示一段对话（保留当前 GIF 的原生循环，不强行切换动作）
 function petSay(text, opts) {
 if (!PET.bubble) return;
 opts = opts || {};
 PET._bubbleSeq++;
 const seq = PET._bubbleSeq;
 PET.bubbleText.textContent = text;
 PET.bubble.classList.add('show');
 clearTimeout(PET.bubbleTimer);
 PET.bubbleTimer = setTimeout(() => {
 // 若期间没有新气泡再覆盖，就关掉
 if (seq === PET._bubbleSeq) PET.bubble.classList.remove('show');
 }, opts.duration || 3000);
 }
 window.petSay = petSay;

 // 让小狗撒个娇（轻轻一跳，作为点击/互动的反馈，不干扰 GIF 循环）
 function petBounce() {
 if (!PET.sprite) return;
 const s = PET.sprite;
 s.classList.remove('hop');
 void s.offsetWidth; // 强制重排以重启动画
 s.classList.add('hop');
 setTimeout(() => s.classList.remove('hop'), 520);
 }
 window.petBounce = petBounce;

 // 时段判断
 function petHourBucket() {
 const h = new Date().getHours();
 if (h < 6) return 'night';
 if (h < 11) return 'morning';
 if (h < 14) return 'noon';
 if (h < 18) return 'afternoon';
 if (h < 22) return 'evening';
 return 'night';
 }

 // 随机自言自语
 function petAutoMumble() {
 if (PET.dragging) { scheduleNextMumble(); return; }
 const bucket = petHourBucket();
 const lines = (PET_DIALOGUE.byHour[bucket] || []).concat(PET_DIALOGUE.random);
 // 活动贴合
 if (PET.activity === 'walking') lines.push(...PET_DIALOGUE.walking);
 if (PET.activity === 'sleeping') lines.push(...PET_DIALOGUE.sleep);
 const pick = lines[Math.floor(Math.random() * lines.length)];
 petSay(pick);
 scheduleNextMumble();
 }
 function scheduleNextMumble() {
 clearTimeout(PET.moodTimer);
 PET.moodTimer = setTimeout(petAutoMumble, 24000 + Math.random() * 26000); // 24-50s，更舒缓
 }

 // 启动边牧 pet 系统
 function startDesktopPet() {
 PET.el = document.getElementById('desktopPet');
 PET.sprite = document.getElementById('petSprite');
 PET.img = document.getElementById('petImg');
 PET.shadow = PET.el && PET.el.querySelector('.pet-shadow');
 PET.bubble = document.getElementById('petBubble');
 PET.bubbleText = document.getElementById('petBubbleText');
 PET.menu = document.getElementById('petMenu');
 if (!PET.el || !PET.sprite) return;

 // 尺寸：桌面较大，移动端较小（与 CSS 的 --pet-size 同步）
 PET.size = (window.innerWidth <= 560) ? 110 : 150;
 PET.el.style.setProperty('--pet-size', PET.size + 'px');
 PET.sprite.style.setProperty('--pet-flip', '1');

 // 初始位置：右下角
 petSetPosition(window.innerWidth - PET.size - 20, window.innerHeight - PET.size - 20);
 petSetFacing('left');
 petSetActivity('idle');

 // 等一秒钟开始自由走动
 setTimeout(() => {
 petSay(PET_DIALOGUE.greeting[Math.floor(Math.random() * PET_DIALOGUE.greeting.length)], { duration: 3500 });
 setTimeout(petMoveToRandom, 2200);
 }, 1200);

 // 启动自言自语循环
 scheduleNextMumble();
 // 30 秒后第一次自动欢迎
 setTimeout(() => {
 if (PET.activity === 'idle' && !PET.dragging) {
 const hr = petHourBucket();
 const line = PET_DIALOGUE.byHour[hr] ? PET_DIALOGUE.byHour[hr][0] : PET_DIALOGUE.random[0];
 petSay(line);
 }
 }, 30000);

 // 菜单项点击
 if (PET.menu) {
 PET.menu.querySelectorAll('.pet-menu-item').forEach(item => {
 item.onclick = (e) => {
 e.stopPropagation();
 const action = item.dataset.petAction;
 handlePetAction(action);
 };
 });
 // 点击宠物/菜单之外的任意区域 → 收起菜单并恢复行为流转
 document.addEventListener('click', (e) => {
 if (!PET.menuOpen) return;
 if (PET.el && (PET.el.contains(e.target) || PET.menu.contains(e.target))) return;
 petCloseMenu(true);
 });
 }

 // 点击气泡直接关闭
 if (PET.bubble) {
 PET.bubble.addEventListener('click', (e) => {
 e.stopPropagation();
 PET.bubble.classList.remove('show');
 });
 }

 // 点按 / 拖拽（统一用 Pointer 事件，触屏也能稳定点击触发互动）
 setupPetDrag();

 // 视口尺寸变化
 window.addEventListener('resize', () => {
 // 重新同步尺寸（桌面/移动端），并拉回可见范围
 PET.size = (window.innerWidth <= 560) ? 110 : 150;
 PET.el.style.setProperty('--pet-size', PET.size + 'px');
 petSetPosition(PET.x, PET.y);
 });

 // 欢迎卡里的"叫过来"按钮
 const callBtn = document.getElementById('petCallBtn');
 if (callBtn) {
 callBtn.onclick = (e) => {
 e.stopPropagation();
 petComeHere();
 };
 }

 // 显隐切换按钮
 const toggleBtn = document.getElementById('petToggleBtn');
 const applyPetVisible = (visible) => {
 if (!PET.el) return;
 if (visible) PET.el.classList.remove('is-hidden');
 else PET.el.classList.add('is-hidden');
 try { localStorage.setItem('pixel_pet_visible', visible ? '1' : '0'); } catch (e) {}
 if (toggleBtn) toggleBtn.textContent = visible ? ' 隐藏小狗' : '🐶 显示小狗';
 };
 window.applyPetVisible = applyPetVisible;
 if (toggleBtn) {
 toggleBtn.onclick = (e) => {
 e.stopPropagation();
 const isHidden = PET.el && PET.el.classList.contains('is-hidden');
 applyPetVisible(isHidden); // 当前隐藏 → 显示；当前显示 → 隐藏
 };
 }
 // 恢复上次的显隐状态（默认显示）
 let savedVisible = '1';
 try { savedVisible = localStorage.getItem('pixel_pet_visible') || '1'; } catch (e) {}
 applyPetVisible(savedVisible !== '0');
 }

 // 让外部代码（如设置页）也能控制宠物显隐
 window.setPetVisible = function (visible) {
 if (typeof window.applyPetVisible === 'function') window.applyPetVisible(!!visible);
 };

 // 走到当前鼠标位置 / 屏幕中心
 function petComeHere() {
 if (PET.dragging) return;
 const w = window.innerWidth, h = window.innerHeight;
 const tx = Math.max(60, Math.min(w - 60, w / 2 + (Math.random() - 0.5) * 160));
 const ty = Math.max(60, Math.min(h - 80, h * 0.6 + (Math.random() - 0.5) * 100));
 if (Math.abs(tx - PET.x) > 12) petSetFacing(tx < PET.x ? 'left' : 'right');
 const dist = Math.hypot(tx - PET.x, ty - PET.y);
 const dur = Math.max(0.6, Math.min(2.6, dist / 130));
 if (PET.el) PET.el.style.transitionDuration = dur + 's';
 petSetActivity('wagging');
 petSetPosition(tx, ty);
 const greet = ['来啦来啦～', '我来了我来了！', '汪汪！', '蹲下等！'][Math.floor(Math.random() * 4)];
 petSay(greet, { duration: 3000 });
 clearTimeout(PET._actTimer);
 PET._actTimer = setTimeout(() => petChooseNextActivity(), dur * 1000 + 800);
 }

 // 处理菜单动作
 function handlePetAction(action) {
 const a = MASCOT_ACTIONS.find(x => x.id === action);
 if (!a) return;
 // 收起菜单但不立即恢复自动流转（由本次互动的结束回调负责恢复，避免与互动动画冲突）
 if (PET.menu) { PET.menu.classList.remove('open'); PET.menuOpen = false; }
 // 清掉可能残留的自动调度/移动定时器，避免中途被打断
 clearTimeout(PET._actTimer);
 clearTimeout(PET.walkTimer);
 const energy = state.mascot.energy || 0;
 if (a.cost > 0 && energy < a.cost) {
 petSay('呜呜…我没力气了，先去做点事攒点能量嘛～');
 toast(' 能量不足！完成今日打卡获取更多能量～');
 return;
 }
 if (a.cost > 0) {
 const r = applyInteraction(action);
 updateMascotStats();
 }
 // 对话
 const line = a.dialogues[Math.floor(Math.random() * a.dialogues.length)];
 if (action === 'sleep') {
 // 睡觉：睡觉 GIF 原生循环，5-9 秒后自己醒来
 petSetActivity('sleeping');
 petSetGif(PET_GIF.sleep);
 petSay(line, { duration: 4000 });
 petBounce();
 clearTimeout(PET.sleepTimer);
 PET.sleepTimer = setTimeout(() => {
 petSetActivity('wagging');
 petSay('嗯嗯～睡醒啦精神满满！', { duration: 3000 });
 setTimeout(petMoveToRandom, 1800);
 }, 5500 + Math.random() * 4000);
 } else if (action === 'walk') {
 // 出去遛：嗅闻 GIF 跑到视口边缘再回来（不叠加 CSS 动画）
 petSetActivity('walking');
 petSetGif(PET_GIF.sniff);
 petSay(line, { duration: 3000 });
 const goEdge = () => {
 const w = window.innerWidth, h = window.innerHeight;
 const left = PET.x, right = w - PET.x, top = PET.y, bot = h - PET.y;
 const mm = Math.max(left, right, top, bot);
 let tx, ty;
 if (mm === left) { tx = PET.size + 30; ty = h/2 + (Math.random()-0.5)*200; petSetFacing('left'); }
 else if (mm === right) { tx = w - PET.size - 30; ty = h/2 + (Math.random()-0.5)*200; petSetFacing('right'); }
 else if (mm === top) { tx = w/2 + (Math.random()-0.5)*200; ty = PET.size + 30; }
 else { tx = w/2 + (Math.random()-0.5)*200; ty = h - PET.size - 30; }
 if (PET.el) PET.el.style.transitionDuration = '2.2s';
 petSetPosition(tx, ty);
 setTimeout(() => {
 petSay('逛了一圈！外面的世界真大～', { duration: 2500 });
 setTimeout(() => petMoveToRandom(), 1800);
 }, 2300);
 };
 goEdge();
 } else if (action === 'play') {
 // 丢球玩：玩球 GIF，小范围轻快跑动
 petSetActivity('excited');
 petSetGif(PET_GIF.ball);
 petSay(line, { duration: 3000 });
 petBounce();
 let n = 0;
 const burst = () => {
 if (n >= 3) { petSetActivity('wagging'); setTimeout(petMoveToRandom, 1000); return; }
 n++;
 const w = window.innerWidth, h = window.innerHeight;
 const tx = PET.size + 40 + Math.random() * (w - 2*PET.size - 80);
 const ty = PET.size + 40 + Math.random() * (h - 2*PET.size - 80);
 if (Math.abs(tx - PET.x) > 8) petSetFacing(tx < PET.x ? 'left' : 'right');
 if (PET.el) PET.el.style.transitionDuration = '0.9s';
 petSetPosition(tx, ty);
 setTimeout(burst, 1000);
 };
 setTimeout(burst, 300);
 } else if (action === 'feed') {
 // 喂零食：啃骨头 GIF（原生咀嚼循环），原地轻跳两下
 petSetActivity('excited');
 petSetGif(PET_GIF.bone);
 petSay(line, { duration: 3000 });
 petBounce();
 let n = 0;
 const jump = () => {
 if (n >= 2) { setTimeout(petMoveToRandom, 1200); return; }
 n++;
 if (PET.el) {
 PET.el.style.transitionDuration = '0.35s';
 const origY = PET.y;
 petSetPosition(PET.x, origY - 36);
 setTimeout(() => petSetPosition(PET.x, origY), 360);
 }
 setTimeout(jump, 760);
 };
 jump();
 } else {
 // pet 摸摸：开心 GIF + 摆尾
 petSetActivity('wagging');
 petSetGif(PET_GIF.happy);
 petSay(line, { duration: 3000 });
 petBounce();
 setTimeout(petMoveToRandom, 1600);
 }
 toast(a.icon + ' ' + a.name + (a.cost > 0 ? ` · 消耗 ${a.cost}` : '') + '！');
 }

 // —— 互动菜单开合（明确区分“选择互动”与“让角色说话”两种点按）——
 function petOpenMenu() {
 if (!PET.menu) return;
 PET.menuOpen = true;
 PET.menu.classList.add('open');
 // 菜单打开期间暂停自动行为流转，避免遮挡/错位；关闭时自动恢复
 }
 function petCloseMenu(resume) {
 if (!PET.menu) return;
 PET.menuOpen = false;
 PET.menu.classList.remove('open');
 // 关闭菜单后恢复自动行为流转（拖拽中由拖拽逻辑接管，不在此恢复）
 if (resume !== false && !PET.dragging) petChooseNextActivity();
 }

 // 点按宠物时的互动反馈
 // 判定条件：菜单关闭 → 视为“选择互动”（打开互动菜单，任意时机均可）；
 // 菜单已打开 → 视为“让角色说话”（说一句对话并收起菜单）
 function petTap(e) {
 if (PET.menu && PET.menu.classList.contains('open')) {
 petCloseMenu(true); // 让角色说话 + 收起菜单
 const line = PET_DIALOGUE.clickNoMenu[Math.floor(Math.random() * PET_DIALOGUE.clickNoMenu.length)];
 petSay(line, { mood: 'excited' });
 petBounce();
 return;
 }
 // 选择互动：打开互动菜单（不依赖“首次点击”，每次都可用）
 petOpenMenu();
 }

 // 拖拽 + 点按（统一 Pointer 事件：鼠标与触屏都能稳定触发互动）
 function setupPetDrag() {
 let drag = null, moved = false;
 const TH = 6;
 const getPt = (e) => (e.touches && e.touches[0]) ? e.touches[0] : e;

 const onDown = (e) => {
 if (e.target.closest('.pet-bubble') || e.target.closest('.pet-menu')) return;
 // 注意：此处不收起菜单。菜单的开合完全由 petTap / onUp(拖拽) 决定，
 // 否则会破坏“菜单打开时再点宠物本体 = 让角色说话”的判定。
 const pt = getPt(e);
 drag = { x0: pt.clientX, y0: pt.clientY, px: PET.x, py: PET.y };
 moved = false;
 PET.dragging = true;
 PET.sprite.classList.add('dragging');
 clearTimeout(PET.walkTimer);
 clearTimeout(PET._actTimer);
 if (PET.bubble) PET.bubble.classList.remove('show');
 petSetActivity('idle');
 // 捕获指针：拖出元素范围也能持续跟随
 if (PET.sprite.setPointerCapture && e.pointerId != null) {
 try { PET.sprite.setPointerCapture(e.pointerId); } catch (_) {}
 }
 if (e.cancelable) e.preventDefault();
 };
 const onMove = (e) => {
 if (!drag) return;
 const pt = getPt(e);
 const dx = pt.clientX - drag.x0, dy = pt.clientY - drag.y0;
 if (Math.abs(dx) > TH || Math.abs(dy) > TH) moved = true;
 if (moved) {
 if (Math.abs(dx) > 6) petSetFacing(dx < 0 ? 'left' : 'right');
 if (PET.el) PET.el.style.transitionDuration = '0s';
 petSetPosition(drag.px + dx, drag.py + dy);
 }
 if (e.cancelable) e.preventDefault();
 };
 const onUp = (e) => {
 if (!drag) return;
 const wasMoved = moved;
 drag = null;
 PET.dragging = false;
 PET.sprite.classList.remove('dragging');
 if (PET.el) PET.el.style.transitionDuration = '';
 if (!wasMoved) {
 // 位移极小 → 视为点按，触发互动反馈（修复触屏无法点击的问题）
 petTap(e);
 return;
 }
 // 拖拽结束：收起菜单（若拖拽前是打开的）、摆尾 + 一句话，再继续随机活动
 if (PET.menu) { PET.menu.classList.remove('open'); PET.menuOpen = false; }
 petSetActivity('wagging');
 const farewells = [
 '停停走走～', '你放我下来啦！', '嗖～', '放好啦～', '我在这里看着你～',
 '陪你继续写～', '汪～', '嘿嘿～',
 ];
 petSay(farewells[Math.floor(Math.random() * farewells.length)], { duration: 2400 });
 setTimeout(petChooseNextActivity, 1600);
 };

 // 优先 Pointer 事件（统一鼠标/触摸 + 指针捕获）
 PET.sprite.addEventListener('pointerdown', onDown);
 PET.sprite.addEventListener('pointermove', onMove);
 PET.sprite.addEventListener('pointerup', onUp);
 PET.sprite.addEventListener('pointercancel', onUp);
 // 旧浏览器回退：无 PointerEvent 时走触摸事件
 if (!window.PointerEvent) {
 PET.sprite.addEventListener('touchstart', onDown, { passive: false });
 PET.sprite.addEventListener('touchmove', onMove, { passive: false });
 PET.sprite.addEventListener('touchend', onUp);
 }
 }

 // DOM Ready
 if (document.readyState === 'loading') {
 document.addEventListener('DOMContentLoaded', init);
 } else {
 init();
 }
})();

