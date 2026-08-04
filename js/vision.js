/* =====================================================================
 * vision.js —— 资讯模块：三个子 Tab 渲染 + 交互
 * ---------------------------------------------------------------------
 * 依赖：window.VisionData（来自 vision_data.js）
 * Tab 1：每日行业速览（默认）
 *   - 6 大分类（要闻/科技/财经/文娱/国际/深度）
 *   - 当日日期做种子的稳定随机：同一天刷新结果固定，次日自动轮换
 *   - 收藏（vision_collect）、已读（vision_readRecord）存 localStorage
 *   - 分类切换 / 重新换一批（按新种子）/ 收藏 toggle / 标记已读
 * Tab 2：随机破茧房
 *   - 85 个跨领域优质站点池（已逐一实测可达，覆盖时政/科技/商业/医学/教育/设计/艺术/游戏/影视/文学/心理/航天/体育/美食/旅行/摄影/音乐/汽车/法律/编程等约 40 个领域）
 *   - 中央大按钮 → 在新标签页打开随机一个
 *   - 显示历史最近 5 个访问记录
 * Tab 3：常识补全库
 *   - 6 大分类（金融入门 / 政策解读 / 法律常识 / 健康常识 / 科学常识 / 历史人文），共 29 个权威站点卡片（全部实测可达，已替换失效链接）
 *   - 点击在新标签页打开
 * 设计约束：变量统一加 Vision_ 前缀；事件全部用文档级捕获监听（和 life.js 一致）
 * ===================================================================== */

(function () {
  'use strict';

  // ============================================================
  // 工具
  // ============================================================
  var Vision_todayStr = function () {
    var d = new Date();
    var y = d.getFullYear();
    var m = ('0' + (d.getMonth() + 1)).slice(-2);
    var dd = ('0' + d.getDate()).slice(-2);
    return y + '-' + m + '-' + dd;
  };
  var Vision_esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  // 当天种子 hash（稳定：同一天结果固定；跨天变）
  function Vision_seedFromDate(dateStr) {
    var h = 5381;
    for (var i = 0; i < dateStr.length; i++) {
      h = ((h << 5) + h) + dateStr.charCodeAt(i);
      h = h & 0x7fffffff;
    }
    return h;
  }
  // 简单 mulberry32 PRNG
  function Vision_prng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function Vision_shuffle(arr, rand) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // ============================================================
  // 状态
  // ============================================================
  var Vision_TAB = 'daily';            // 当前子 tab: daily / random / kb
  var Vision_DAILY_CAT = '要闻';        // 当前 6 分类过滤
  var Vision_DAILY_DATE = Vision_todayStr(); // 当前展示的"日期种子"
  var Vision_DAILY_NONCE = 0;          // 换一批计数器（不随跨天检测重置）
  var Vision_DAILY_SHOW = 8;           // 每分类每次展示条数

  // localStorage 键
  var VKEY_COLLECT = 'vision_collect';
  var VKEY_READ    = 'vision_readRecord';
  var VKEY_RANDOM_HISTORY = 'vision_random_history';
  var VKEY_BREAK_DEAD = 'vision_break_dead';  // 用户标记的失效链接黑名单（按 url 字符串去重）

  function Vision_loadSet(key) {
    try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); }
    catch (e) { return new Set(); }
  }
  function Vision_saveSet(key, set) {
    try { localStorage.setItem(key, JSON.stringify(Array.from(set))); } catch (e) {}
  }
  function Vision_loadArr(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; }
  }
  function Vision_saveArr(key, arr) {
    try { localStorage.setItem(key, JSON.stringify(arr)); } catch (e) {}
  }

  // ============================================================
  // 每日速览：取当天的内容
  // ============================================================
  function Vision_dailyPick() {
    var dateSeed = Vision_seedFromDate(Vision_DAILY_DATE) ^ (Vision_DAILY_NONCE * 2654435761);
    var byCat = {};
    VisionData.ALL.forEach(function (n) {
      (byCat[n.category] = byCat[n.category] || []).push(n);
    });
    // 每天为每个分类做一次"洗牌种子 = dateSeed + 分类名" 的稳定随机
    var picked = {};
    Object.keys(byCat).forEach(function (cat) {
      var catSeed = dateSeed + Vision_seedFromDate(cat);
      var arr = Vision_shuffle(byCat[cat], Vision_prng(catSeed));
      picked[cat] = arr.slice(0, Vision_DAILY_SHOW);
    });
    return picked;
  }

  // ============================================================
  // 渲染：每日速览
  // ============================================================
  function Vision_renderDaily() {
    var collect = Vision_loadSet(VKEY_COLLECT);
    var read    = Vision_loadSet(VKEY_READ);
    var picked  = Vision_dailyPick();

    // 分类 tab
    var cats = VisionData.CATS;
    var catTabsHtml = '<button class="life-vision-cat ' + (Vision_DAILY_CAT === 'all' ? 'active' : '') + '" data-vcat="all">全部</button>'
      + cats.map(function (c) {
        return '<button class="life-vision-cat ' + (Vision_DAILY_CAT === c ? 'active' : '') + '" data-vcat="' + Vision_esc(c) + '">' + Vision_esc(c) + '</button>';
      }).join('');

    // 列表
    var list = picked[Vision_DAILY_CAT] || [];
    var cardsHtml = '';
    if (Vision_DAILY_CAT === 'all') {
      // 全部模式：合并所有分类，按时间倒序后展示
      var merged = [];
      cats.forEach(function (c) { (picked[c] || []).forEach(function (n) { merged.push(n); }); });
      merged.sort(function (a, b) { return b.publish_time.localeCompare(a.publish_time); });
      cardsHtml = merged.map(function (n) { return Vision_cardHTML(n, collect, read); }).join('');
    } else {
      cardsHtml = list.map(function (n) { return Vision_cardHTML(n, collect, read); }).join('');
    }
    if (!cardsHtml) cardsHtml = '<div class="life-empty">该分类今日暂无内容～</div>';

    return '' +
      '<div class="life-vision-toolbar">' +
        '<div class="life-vision-date">📅 今日 ' + Vision_esc(Vision_DAILY_DATE) + ' · 同一天稳定，次日自动轮换</div>' +
        '<div class="life-vision-actions">' +
          '<button class="btn primary btn-sm" data-action="vreshuffle" title="用当前日期重新洗牌（不会清收藏）">🎲 换一批</button>' +
          '<button class="btn btn-sm" data-action="vshowcollect">⭐ 我的收藏</button>' +
        '</div>' +
      '</div>' +
      '<div class="life-vision-cats">' + catTabsHtml + '</div>' +
      '<div class="life-vision-list" id="vDailyList">' + cardsHtml + '</div>';
  }

  function Vision_cardHTML(n, collect, read) {
    var isFav = collect.has(n.id);
    var isRead = read.has(n.id);
    return '' +
      '<div class="life-vision-card ' + (isRead ? 'is-read' : '') + '">' +
        '<div class="life-vision-card-main">' +
          '<div class="life-vision-card-title">' +
            '<a href="' + Vision_esc(n.source_url) + '" target="_blank" rel="noopener noreferrer" data-action="vopen" data-id="' + Vision_esc(n.id) + '">' + Vision_esc(n.title) + '</a>' +
          '</div>' +
          '<div class="life-vision-card-summary">' + Vision_esc(n.summary) + '</div>' +
          '<div class="life-vision-card-meta">' +
            '<span class="life-vision-cat-tag cat-' + Vision_esc(n.category) + '">' + Vision_esc(n.category) + '</span>' +
            '<span class="life-vision-source">📡 ' + Vision_esc(n.source) + '</span>' +
            '<span class="life-vision-time">🕐 ' + Vision_esc(n.publish_time) + '</span>' +
            (isRead ? '<span class="life-vision-read">✓ 已读</span>' : '') +
          '</div>' +
        '</div>' +
        '<div class="life-vision-card-side">' +
          '<button class="life-vision-fav ' + (isFav ? 'on' : '') + '" data-action="vfav" data-id="' + Vision_esc(n.id) + '" title="' + (isFav ? '取消收藏' : '收藏') + '">' + (isFav ? '★' : '☆') + '</button>' +
          '<button class="life-vision-read-btn" data-action="vread" data-id="' + Vision_esc(n.id) + '" title="标记为已读">✓</button>' +
        '</div>' +
      '</div>';
  }

  // ============================================================
  // 渲染：随机破茧房
  // ============================================================
  // 85 个跨领域站点池（已逐一实测可达：HTTP 2xx 或 403/405 视为有效宿主；
  // 剔除 DNS 失效的 natgeo.com.cn / dmzj.com，GitHub 超时改为国内可达的 Gitee）
  var Vision_BUBBLE_BREAK_POOL = [
    { name: '澎湃新闻', url: 'https://www.thepaper.cn', cat: '时政要闻' },
    { name: '人民网', url: 'https://www.people.com.cn', cat: '时政要闻' },
    { name: '新华网', url: 'https://www.xinhuanet.com', cat: '时政要闻' },
    { name: '央视网', url: 'https://www.cctv.com', cat: '时政要闻' },
    { name: '观察者网', url: 'https://www.guancha.cn', cat: '时政要闻' },
    { name: '环球网', url: 'https://www.huanqiu.com', cat: '时政要闻' },
    { name: '36氪', url: 'https://www.36kr.com', cat: '创投商业' },
    { name: '虎嗅', url: 'https://www.huxiu.com', cat: '商业洞察' },
    { name: '爱范儿', url: 'https://www.ifanr.com', cat: '科技数码' },
    { name: '品玩', url: 'https://www.pingwest.com', cat: '科技数码' },
    { name: '钛媒体', url: 'https://www.tmtpost.com', cat: '科技商业' },
    { name: '极客公园', url: 'https://www.geekpark.net', cat: '科技数码' },
    { name: '量子位', url: 'https://www.qbitai.com', cat: '人工智能' },
    { name: 'IT之家', url: 'https://www.ithome.com', cat: '科技资讯' },
    { name: '雷锋网', url: 'https://www.leiphone.com', cat: '人工智能' },
    { name: '机器之心', url: 'https://www.jiqizhixin.com', cat: '人工智能' },
    { name: '少数派', url: 'https://sspai.com', cat: '效率与生活' },
    { name: '阮一峰的网络日志', url: 'https://www.ruanyifeng.com', cat: '编程技术' },
    { name: '掘金', url: 'https://juejin.cn', cat: '编程技术' },
    { name: '果壳网', url: 'https://www.guokr.com', cat: '生物科普' },
    { name: '科学网', url: 'https://www.sciencenet.cn', cat: '科学科普' },
    { name: '中国科普博览', url: 'https://www.kepu.net.cn', cat: '科学科普' },
    { name: '中国科学院', url: 'https://www.cas.cn', cat: '科学科普' },
    { name: '中国国家地理', url: 'https://www.dili360.com', cat: '地理自然' },
    { name: '丁香园', url: 'https://www.dxy.cn', cat: '医学科普' },
    { name: '丁香医生', url: 'https://dxy.com', cat: '健康科普' },
    { name: '医学界', url: 'https://www.yxj.org.cn', cat: '医学科普' },
    { name: '芥末堆', url: 'https://www.jiemodui.com', cat: '教育行业' },
    { name: '可汗学院', url: 'https://zh.khanacademy.org', cat: '教育学习' },
    { name: '中国大学MOOC', url: 'https://www.icourse163.org', cat: '教育学习' },
    { name: '学堂在线', url: 'https://www.xuetangx.com', cat: '教育学习' },
    { name: '多邻国', url: 'https://www.duolingo.com', cat: '语言学习' },
    { name: '谷德设计网', url: 'https://www.gooood.cn', cat: '建筑设计' },
    { name: '站酷', url: 'https://www.zcool.com.cn', cat: '设计创意' },
    { name: '优设网', url: 'https://www.uisdc.com', cat: '设计创意' },
    { name: '花瓣网', url: 'https://huaban.com', cat: '设计灵感' },
    { name: '雅昌艺术网', url: 'https://www.artron.net', cat: '艺术收藏' },
    { name: '中央美术学院', url: 'https://www.cafa.edu.cn', cat: '艺术教育' },
    { name: '建筑日报 ArchDaily', url: 'https://www.archdaily.com/zh', cat: '建筑文化' },
    { name: '游戏葡萄', url: 'https://youxiputao.com', cat: '游戏产业' },
    { name: '触乐', url: 'https://www.chuapp.com', cat: '游戏文化' },
    { name: '游研社', url: 'https://www.yystv.cn', cat: '游戏文化' },
    { name: '机核', url: 'https://www.gcores.com', cat: '游戏文化' },
    { name: '豆瓣电影', url: 'https://movie.douban.com', cat: '影视娱乐' },
    { name: '时光网', url: 'https://www.mtime.com', cat: '影视娱乐' },
    { name: '哔哩哔哩', url: 'https://www.bilibili.com', cat: '视频社区' },
    { name: '豆瓣读书', url: 'https://book.douban.com', cat: '文学读书' },
    { name: '中国作家网', url: 'https://www.chinawriter.com.cn', cat: '文学文化' },
    { name: '爱思想', url: 'https://www.aisixiang.com', cat: '哲学思想' },
    { name: '壹心理', url: 'https://www.xinli001.com', cat: '心理学科普' },
    { name: '简单心理', url: 'https://www.jiandanxinli.com', cat: '心理学科普' },
    { name: '国家航天局', url: 'https://www.cnsa.gov.cn', cat: '航天科技' },
    { name: '虎扑', url: 'https://www.hupu.com', cat: '体育社区' },
    { name: '懂球帝', url: 'https://www.dongqiudi.com', cat: '体育资讯' },
    { name: '下厨房', url: 'https://www.xiachufang.com', cat: '美食料理' },
    { name: '美食杰', url: 'https://www.meishij.net', cat: '美食料理' },
    { name: '豆果美食', url: 'https://www.douguo.com', cat: '美食料理' },
    { name: '马蜂窝', url: 'https://www.mafengwo.cn', cat: '旅行攻略' },
    { name: '穷游网', url: 'https://www.qyer.com', cat: '旅行攻略' },
    { name: '携程', url: 'https://www.ctrip.com', cat: '旅行预订' },
    { name: '蜂鸟网', url: 'https://www.fengniao.com', cat: '摄影社区' },
    { name: '图虫', url: 'https://tuchong.com', cat: '摄影社区' },
    { name: '网易云音乐', url: 'https://music.163.com', cat: '音乐社区' },
    { name: '汽车之家', url: 'https://www.autohome.com.cn', cat: '汽车资讯' },
    { name: '懂车帝', url: 'https://www.dongchedi.com', cat: '汽车资讯' },
    { name: '民航资源网', url: 'https://www.carnoc.com', cat: '航空交通' },
    { name: '中国军网', url: 'https://www.81.cn', cat: '军事国防' },
    { name: '第一财经', url: 'https://www.yicai.com', cat: '财经商业' },
    { name: '界面新闻', url: 'https://www.jiemian.com', cat: '财经商业' },
    { name: '财新网', url: 'https://www.caixin.com', cat: '财经新闻' },
    { name: '雪球', url: 'https://xueqiu.com', cat: '投资社区' },
    { name: '正和岛', url: 'https://www.zhisland.com', cat: '商业洞察' },
    { name: '华尔街见闻', url: 'https://wallstreetcn.com', cat: '全球财经' },
    { name: '国家法律法规数据库', url: 'https://flk.npc.gov.cn', cat: '法律常识' },
    { name: '中国裁判文书网', url: 'https://wenshu.court.gov.cn', cat: '法律常识' },
    { name: '最高人民法院', url: 'https://www.court.gov.cn', cat: '法律常识' },
    { name: '最高人民检察院', url: 'https://www.spp.gov.cn', cat: '法律常识' },
    { name: 'CSDN', url: 'https://www.csdn.net', cat: '编程技术' },
    { name: '廖雪峰的官方网站', url: 'https://www.liaoxuefeng.com', cat: '编程技术' },
    { name: 'Gitee', url: 'https://gitee.com', cat: '开源技术' },
    { name: '中国环境网', url: 'https://www.cenews.com.cn', cat: '环境生态' },
    { name: '中国农业信息网', url: 'https://www.agri.cn', cat: '农业农村' },
    { name: '新周刊', url: 'https://www.neweekly.com.cn', cat: '文化生活' },
    { name: '全历史', url: 'https://www.allhistory.com', cat: '历史人文' },
    { name: '中国社会科学网', url: 'https://www.cssn.cn', cat: '学术人文' }
  ];

  // 用户标记的失效 URL 黑名单（按 url 字符串去重）
  function Vision_loadDead() { return Vision_loadArr(VKEY_BREAK_DEAD); }
  function Vision_saveDead(arr) { Vision_saveArr(VKEY_BREAK_DEAD, arr); }
  function Vision_isDead(url) {
    var arr = Vision_loadDead();
    for (var i = 0; i < arr.length; i++) if (arr[i] === url) return true;
    return false;
  }
  function Vision_markDead(url) {
    var arr = Vision_loadDead();
    if (Vision_isDead(url)) return;
    arr.push(url);
    Vision_saveDead(arr);
  }
  function Vision_unmarkDead(url) {
    var arr = Vision_loadDead().filter(function (u) { return u !== url; });
    Vision_saveDead(arr);
  }
  // 取剔除黑名单后的可用池；若全被剔除则回退到全池（避免空集）
  function Vision_alivePool() {
    var all = Vision_BUBBLE_BREAK_POOL;
    var alive = all.filter(function (x) { return !Vision_isDead(x.url); });
    return alive.length ? alive : all;
  }

  function Vision_renderRandom() {
    var history = Vision_loadArr(VKEY_RANDOM_HISTORY).slice(0, 5);
    var deadArr = Vision_loadDead();
    var deadSet = {}; for (var i = 0; i < deadArr.length; i++) deadSet[deadArr[i]] = 1;

    var histHtml = history.length
      ? history.map(function (h) {
          var isDead = !!deadSet[h.url];
          return '<div class="life-vision-hist-row">'
            + '<a class="life-vision-hist-item" href="' + Vision_esc(h.url) + '" target="_blank" rel="noopener noreferrer">' + Vision_esc(h.name) + ' · ' + Vision_esc(h.cat) + '</a>'
            + (isDead
                ? '<button class="life-vision-hist-mark isdead" data-action="vunmarkdead" data-url="' + Vision_esc(h.url) + '" title="恢复该链接">✓ 已失效，点此恢复</button>'
                : '<button class="life-vision-hist-mark" data-action="vmarkdead" data-url="' + Vision_esc(h.url) + '" title="标记为失效，下次随机不再选中">🚫 标记失效</button>')
            + '</div>';
        }).join('')
      : '<div class="life-vision-hist-empty">还没有跳过的领域，点下面按钮试试～</div>';

    // 池子列表：死链的隐藏 + 一栏"已失效 N 项"+ 恢复按钮
    var alive = Vision_alivePool();
    var deadCount = Vision_BUBBLE_BREAK_POOL.length - alive.length;
    var poolHtml = alive.map(function (p) {
        return '<a class="life-vision-pool-cell" href="' + Vision_esc(p.url) + '" target="_blank" rel="noopener noreferrer" data-action="vjumphist" data-url="' + Vision_esc(p.url) + '" data-name="' + Vision_esc(p.name) + '" data-cat="' + Vision_esc(p.cat) + '">'
          + '<div class="life-vision-pool-cell-cat">' + Vision_esc(p.cat) + '</div>'
          + '<div class="life-vision-pool-cell-name">' + Vision_esc(p.name) + '</div>'
          + '<button class="life-vision-pool-cell-dead" data-action="vmarkdead" data-url="' + Vision_esc(p.url) + '" title="标记为失效" onclick="event.preventDefault();event.stopPropagation();">🚫</button>'
          + '</a>';
      }).join('');
    var deadPanel = '';
    if (deadCount > 0) {
      var deadList = Vision_BUBBLE_BREAK_POOL.filter(function (p) { return deadSet[p.url]; });
      deadPanel = '<div class="life-vision-pool-dead">'
        + '<div class="life-vision-pool-dead-title">🚫 已失效 ' + deadCount + ' 项（隐藏中）<button class="life-vision-pool-dead-clear" data-action="vcleardeadd">🧹 全部恢复</button></div>'
        + '<div class="life-vision-pool-dead-list">'
        + deadList.map(function (p) {
            return '<span class="life-vision-pool-dead-chip">' + Vision_esc(p.name)
              + ' <button data-action="vunmarkdead" data-url="' + Vision_esc(p.url) + '" title="恢复">✓</button>'
              + '</span>';
          }).join('')
        + '</div>'
        + '</div>';
    }

    var aliveHint = '提示：每次会从 ' + alive.length + ' 个可达领域里随机抽一个（已剔除失效链接），在新标签页打开';
    var totalHint = '候选池共 ' + Vision_BUBBLE_BREAK_POOL.length + ' 个，活跃 ' + alive.length + ' 个';

    return '' +
      '<div class="life-vision-bubble">' +
        '<div class="life-vision-bubble-title">🌐 随机破茧房</div>' +
        '<div class="life-vision-bubble-sub">跳出舒适区，遇见一个完全陌生的领域</div>' +
        '<button class="life-vision-bubble-btn" data-action="vrjump">🎲 随机跳一个陌生领域</button>' +
        '<div class="life-vision-bubble-hint">' + aliveHint + '</div>' +
      '</div>' +
      '<div class="life-vision-bubble-history">' +
        '<div class="life-vision-bubble-history-title">📝 最近跳过的领域</div>' +
        '<div class="life-vision-bubble-history-list">' + histHtml + '</div>' +
      '</div>' +
      '<div class="life-vision-bubble-pool">' +
        '<div class="life-vision-bubble-pool-title">🗂 候选领域池 · ' + totalHint + '（可点击直达，🚫 标记失效）</div>' +
        '<div class="life-vision-bubble-pool-grid">' + poolHtml + '</div>' +
        deadPanel +
      '</div>';
  }

  // ============================================================
  // 渲染：常识补全库
  // ============================================================
  // 6 大分类 × 多站点，链接均已逐一实测可达（替换了原失效/404/超时项）
  var Vision_KB_GROUPS = [
    {
      title: '💰 金融入门',
      desc: '面向非专业人士的金融常识，从央行、监管到投资者保护一站打通。',
      items: [
        { name: '中国人民银行',             url: 'https://www.pbc.gov.cn' },
        { name: '国家金融监督管理总局',     url: 'https://www.nfra.gov.cn' },
        { name: '中国证监会',               url: 'https://www.csrc.gov.cn' },
        { name: '中国证券业协会',           url: 'https://www.sac.net.cn' },
        { name: '上交所投资者教育',         url: 'https://edu.sse.com.cn' },
        { name: '雪球（投资社区）',         url: 'https://xueqiu.com' },
        { name: '第一财经',                 url: 'https://www.yicai.com' }
      ]
    },
    {
      title: '📜 政策解读',
      desc: '权威机构政策发布与解读专栏，看懂文件背后的产业逻辑。',
      items: [
        { name: '中国政府网-政策',     url: 'https://www.gov.cn/zhengce' },
        { name: '国家发展和改革委员会', url: 'https://www.ndrc.gov.cn' },
        { name: '财政部',               url: 'https://www.mof.gov.cn' },
        { name: '求是网',               url: 'https://www.qstheory.cn' },
        { name: '人民网-时政',         url: 'https://politics.people.com.cn' },
        { name: '新华网-政策',         url: 'https://www.xinhuanet.com/politics' }
      ]
    },
    {
      title: '⚖️ 法律常识',
      desc: '日常法律知识科普与权威查询，遇事不慌的常识储备。',
      items: [
        { name: '国家法律法规数据库',   url: 'https://flk.npc.gov.cn' },
        { name: '司法部',               url: 'https://www.moj.gov.cn' },
        { name: '最高人民法院',         url: 'https://www.court.gov.cn' },
        { name: '最高人民检察院',       url: 'https://www.spp.gov.cn' },
        { name: '12348 中国法网',       url: 'https://www.12348.gov.cn' },
        { name: '中国裁判文书网',       url: 'https://wenshu.court.gov.cn' }
      ]
    },
    {
      title: '🩺 健康常识',
      desc: '权威健康科普与官方疾控信息，科学养生不踩坑。',
      items: [
        { name: '国家卫生健康委员会',     url: 'https://www.nhc.gov.cn' },
        { name: '丁香医生',               url: 'https://dxy.com' },
        { name: '中国疾病预防控制中心',   url: 'https://www.chinacdc.cn' }
      ]
    },
    {
      title: '🔬 科学常识',
      desc: '靠谱的科普阵地，建立自己的科学素养底座。',
      items: [
        { name: '中国科普博览',   url: 'https://www.kepu.net.cn' },
        { name: '果壳网',         url: 'https://www.guokr.com' },
        { name: '科学网',         url: 'https://www.sciencenet.cn' },
        { name: '中国科学院',     url: 'https://www.cas.cn' }
      ]
    },
    {
      title: '📚 历史人文',
      desc: '穿越时空看文明，拓展人文视野与思辨能力。',
      items: [
        { name: '全历史',         url: 'https://www.allhistory.com' },
        { name: '中国社会科学网', url: 'https://www.cssn.cn' },
        { name: '澎湃-私家历史',  url: 'https://www.thepaper.cn/list_25447' }
      ]
    }
  ];

  function Vision_renderKB() {
    return Vision_KB_GROUPS.map(function (g) {
      var items = g.items.map(function (it) {
        return '<a class="life-vision-kb-card" href="' + Vision_esc(it.url) + '" target="_blank" rel="noopener noreferrer">' +
          '<div class="life-vision-kb-card-name">' + Vision_esc(it.name) + '</div>' +
          '<div class="life-vision-kb-card-arrow">→</div>' +
        '</a>';
      }).join('');
      return '' +
        '<div class="life-vision-kb-group">' +
          '<div class="life-vision-kb-title">' + Vision_esc(g.title) + '</div>' +
          '<div class="life-vision-kb-desc">' + Vision_esc(g.desc) + '</div>' +
          '<div class="life-vision-kb-grid">' + items + '</div>' +
        '</div>';
    }).join('');
  }

  // ============================================================
  // 收藏 modal
  // ============================================================
  function Vision_openCollectModal() {
    var collect = Vision_loadSet(VKEY_COLLECT);
    if (!collect.size) {
      Vision_openSimpleModal('⭐ 我的收藏', '<div class="life-empty">还没有收藏任何资讯。点击卡片右上角的 ☆ 即可收藏～</div>');
      return;
    }
    var list = VisionData.ALL.filter(function (n) { return collect.has(n.id); });
    list.sort(function (a, b) { return b.publish_time.localeCompare(a.publish_time); });
    var html = list.map(function (n) {
      return '<div class="life-vision-collect-row">' +
        '<a href="' + Vision_esc(n.source_url) + '" target="_blank" rel="noopener noreferrer" data-action="vopen" data-id="' + Vision_esc(n.id) + '">' + Vision_esc(n.title) + '</a>' +
        '<span class="life-vision-source">📡 ' + Vision_esc(n.source) + '</span>' +
        '<button class="life-vision-fav on" data-action="vfav" data-id="' + Vision_esc(n.id) + '" title="取消收藏">★</button>' +
      '</div>';
    }).join('');
    Vision_openSimpleModal('⭐ 我的收藏（' + list.length + '）', html);
  }

  function Vision_openSimpleModal(title, bodyHtml) {
    var old = document.getElementById('visionModal');
    if (old) old.remove();
    var mask = document.createElement('div');
    mask.id = 'visionModal';
    mask.className = 'life-modal-mask';
    mask.innerHTML = '' +
      '<div class="life-modal" onclick="event.stopPropagation()">' +
        '<div class="life-modal-title">' + Vision_esc(title) + '</div>' +
        '<div class="life-vision-modal-body">' + bodyHtml + '</div>' +
        '<div class="life-modal-actions">' +
          '<button class="btn primary btn-sm" data-action="vclose">关闭</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(mask);
  }
  function Vision_closeModal() {
    var m = document.getElementById('visionModal');
    if (m) m.remove();
  }

  // ============================================================
  // 主入口 render
  // ============================================================
  function renderVision() {
    var root = document.getElementById('view-vision');
    if (!root) return;
    var tabBtns = '' +
      '<button class="life-tab ' + (Vision_TAB === 'daily'  ? 'active' : '') + '" data-vtab="daily">📅 每日行业速览</button>' +
      '<button class="life-tab ' + (Vision_TAB === 'random' ? 'active' : '') + '" data-vtab="random">🌐 随机破茧房</button>' +
      '<button class="life-tab ' + (Vision_TAB === 'kb'    ? 'active' : '') + '" data-vtab="kb">📚 常识补全库</button>';

    var body = '';
    if (Vision_TAB === 'daily')      body = Vision_renderDaily();
    else if (Vision_TAB === 'random') body = Vision_renderRandom();
    else                              body = Vision_renderKB();

    root.innerHTML = '' +
      '<div class="life-page">' +
        '<div class="life-header"><div class="life-title">资讯</div></div>' +
        '<div class="life-tabs">' + tabBtns + '</div>' +
        '<div class="life-vision-body" id="visionBody">' + body + '</div>' +
      '</div>';

    // 每次进入页面：日期种子若跨天则刷新（非手动洗牌情况下）
    var today = Vision_todayStr();
    if (today !== Vision_DAILY_DATE && Vision_DAILY_NONCE === 0) {
      Vision_DAILY_DATE = today;
      if (Vision_TAB === 'daily') renderVision();
    } else if (today !== Vision_DAILY_DATE && Vision_DAILY_NONCE > 0) {
      // 跨天了：把日期推到新一天，但保留手动洗牌的 nonce
      Vision_DAILY_DATE = today;
    }
  }

  // 暴露给 app.js 的 switchView 调用
  window.renderVision = renderVision;

  // ============================================================
  // 事件：捕获阶段（确保即便 app.js stopPropagation 也能进入）
  // ============================================================
  document.addEventListener('click', function (e) {
    // 1) 模态框遮罩点击 → 关闭
    var modal = e.target.closest('#visionModal');
    if (modal && e.target === modal) { Vision_closeModal(); return; }

    // 2) 模态框内部按钮
    var modalBtn = e.target.closest('#visionModal [data-action]');
    if (modalBtn) {
      var a = modalBtn.getAttribute('data-action');
      if (a === 'vclose') Vision_closeModal();
      else if (a === 'vfav' || a === 'vopen' || a === 'vread') {
        // 委托到主逻辑
      } else {
        return;
      }
    }

    // 3) 仅在 #view-vision 激活时处理主逻辑
    var v = document.getElementById('view-vision');
    if (!v || !v.classList.contains('active')) return;

    // 3a) 顶部 tab
    var tab = e.target.closest('[data-vtab]');
    if (tab) {
      Vision_TAB = tab.getAttribute('data-vtab');
      renderVision();
      return;
    }

    // 3b) 仅在 daily 子 tab 处理以下按钮
    if (Vision_TAB === 'daily') {
      // 分类切换
      var cat = e.target.closest('[data-vcat]');
      if (cat) {
        var vcat = cat.getAttribute('data-vcat');
        Vision_DAILY_CAT = vcat === 'all' ? 'all' : vcat;
        renderVision();
        return;
      }
      // 收藏
      var fav = e.target.closest('[data-action="vfav"]');
      if (fav) {
        e.preventDefault();
        e.stopPropagation();
        var id = fav.getAttribute('data-id');
        var set = Vision_loadSet(VKEY_COLLECT);
        if (set.has(id)) { set.delete(id); if (window.awardEnergy) window.awardEnergy('vision_fav', { reverse: true }); }
        else { set.add(id); if (window.awardEnergy) window.awardEnergy('vision_fav'); }
        Vision_saveSet(VKEY_COLLECT, set);
        renderVision();
        return;
      }
      // 标记已读（按钮 or 标题链接点击时也记）
      var rd = e.target.closest('[data-action="vread"]');
      if (rd) {
        e.preventDefault();
        e.stopPropagation();
        var id2 = rd.getAttribute('data-id');
        var set2 = Vision_loadSet(VKEY_READ);
        if (!set2.has(id2)) { set2.add(id2); if (window.awardEnergy) window.awardEnergy('vision_read'); }
        Vision_saveSet(VKEY_READ, set2);
        renderVision();
        return;
      }
      // 打开链接 → 顺带标记已读
      var op = e.target.closest('[data-action="vopen"]');
      if (op) {
        var id3 = op.getAttribute('data-id');
        if (id3) {
          var set3 = Vision_loadSet(VKEY_READ);
          if (!set3.has(id3)) { set3.add(id3); if (window.awardEnergy) window.awardEnergy('vision_read'); }
          Vision_saveSet(VKEY_READ, set3);
        }
        return; // 让 <a target="_blank"> 正常打开
      }
      // 重新洗牌
      if (e.target.closest('[data-action="vreshuffle"]')) {
        // 用递增的 nonce 强制换一批（nonce 不受跨天检测影响）
        Vision_DAILY_NONCE++;
        renderVision();
        return;
      }
      // 收藏夹
      if (e.target.closest('[data-action="vshowcollect"]')) {
        Vision_openCollectModal();
        return;
      }
    }

    // 3c) 随机破茧房
    if (Vision_TAB === 'random') {
      if (e.target.closest('[data-action="vrjump"]')) {
        e.preventDefault();
        // 用当前秒数作种子，保证真随机（不想让每天固定）；自动剔除用户标记的失效链接
        var pool = Vision_alivePool();
        var r = Math.floor(Math.random() * pool.length);
        var pick = pool[r];
        window.open(pick.url, '_blank', 'noopener,noreferrer');
        // 记录历史
        var hist = Vision_loadArr(VKEY_RANDOM_HISTORY);
        hist.unshift({ name: pick.name, cat: pick.cat, url: pick.url, at: Vision_todayStr() });
        Vision_saveArr(VKEY_RANDOM_HISTORY, hist.slice(0, 5));
        return;
      }
      // 直接点站点池格子
      var jh = e.target.closest('[data-action="vjumphist"]');
      if (jh) {
        e.preventDefault();
        var url2 = jh.getAttribute('data-url');
        var name2 = jh.getAttribute('data-name');
        var cat2 = jh.getAttribute('data-cat');
        window.open(url2, '_blank', 'noopener,noreferrer');
        var hist2 = Vision_loadArr(VKEY_RANDOM_HISTORY);
        hist2.unshift({ name: name2, cat: cat2, url: url2, at: Vision_todayStr() });
        Vision_saveArr(VKEY_RANDOM_HISTORY, hist2.slice(0, 5));
        return;
      }
      // 标记失效 / 取消标记
      var mb = e.target.closest('[data-action="vmarkdead"]');
      if (mb) {
        e.preventDefault();
        var u = mb.getAttribute('data-url');
        Vision_markDead(u);
        if (window.toast) window.toast('🚫 已标记失效，下次随机不会再选中');
        // 重新渲染破茧房面板（隐藏刚标记的项）
        var vwrap = document.getElementById('visionView');
        if (vwrap && typeof window.renderVision === 'function') window.renderVision();
        return;
      }
      var ub = e.target.closest('[data-action="vunmarkdead"]');
      if (ub) {
        e.preventDefault();
        var uu = ub.getAttribute('data-url');
        Vision_unmarkDead(uu);
        if (window.toast) window.toast('✓ 已恢复该链接到候选池');
        var vwrap2 = document.getElementById('visionView');
        if (vwrap2 && typeof window.renderVision === 'function') window.renderVision();
        return;
      }
      // 一键清空失效名单
      if (e.target.closest('[data-action="vcleardeadd"]')) {
        e.preventDefault();
        Vision_saveArr(VKEY_BREAK_DEAD, []);
        if (window.toast) window.toast('✓ 已清空失效链接名单');
        var vwrap3 = document.getElementById('visionView');
        if (vwrap3 && typeof window.renderVision === 'function') window.renderVision();
        return;
      }
    }

  }, true); // 捕获阶段

})();
