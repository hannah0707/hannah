/* === takeout.js === */
/* ============================================
   外卖推荐 - 预置数据 + 本地存储逻辑（纯前端）
   - 数据全部存在 localStorage，key = takeout_list
   - 首次运行自动写入 60+ 条预置外卖
   - 对外暴露 window.Takeout 命名空间
   ============================================ */

(function () {
  'use strict';

  // 本地存储 key
  var STORE_KEY = 'takeout_list';

  // 品类（与页面筛选一致）
  var CATS = ['米饭', '面食', '粉', '轻食', '快餐', '小吃', '日韩', '火锅', '早餐', '其他'];
  // 健康程度
  var HEALTH = ['低脂', '中等', '高热量'];
  // 价格区间
  var PRICE = ['便宜', '中等', '稍贵'];

  // 预置数据：[店名/菜名, 品类, 健康程度, 价格, [口味标签], 备注]
  // 覆盖全部 10 个品类，尽量选常见、真实存在的外卖选项
  var PRESET_RAW = [
    // —— 米饭 ——
    ['黄焖鸡米饭', '米饭', '中等', '便宜', ['下饭', '咸鲜'], '国民级米饭快餐，酱汁浓郁'],
    ['隆江猪脚饭', '米饭', '高热量', '便宜', ['不辣', '下饭', '油腻'], '卤猪脚配酸菜，很顶饱'],
    ['腊味煲仔饭', '米饭', '高热量', '中等', ['不辣', '锅巴', '咸鲜'], '砂锅现煲，锅巴是灵魂'],
    ['日式咖喱饭', '米饭', '中等', '中等', ['不辣', '酸甜', '下饭'], '温和咖喱，老少皆宜'],
    ['照烧鸡排饭', '米饭', '中等', '中等', ['不辣', '微甜', '下饭'], '甜咸照烧汁，配溏心蛋更赞'],
    ['梅菜扣肉饭', '米饭', '高热量', '中等', ['不辣', '下饭', '油腻'], '梅菜吸油，扣肉软糯'],
    ['卤肉饭', '米饭', '高热量', '便宜', ['不辣', '下饭'], '台式经典，五花卤得软烂'],
    ['牛肉盖浇饭', '米饭', '中等', '中等', ['咸鲜', '下饭'], '洋葱炒牛肉浇在米饭上'],

    // —— 面食 ——
    ['西红柿鸡蛋面', '面食', '低脂', '便宜', ['不辣', '清爽', '清淡'], '酸甜开胃，负担小'],
    ['红烧牛肉面', '面食', '中等', '中等', ['辣', '重口', '下饭'], '牛腩炖烂，汤头浓'],
    ['炸酱面', '面食', '高热量', '便宜', ['不辣', '重口'], '北方经典，酱香浓郁'],
    ['葱油拌面', '面食', '中等', '便宜', ['不辣', '咸鲜', '清淡'], '葱油熬香，简单却上头'],
    ['武汉热干面', '面食', '高热量', '便宜', ['不辣', '重口'], '芝麻酱拌碱面，扎实顶饱'],
    ['重庆小面', '面食', '中等', '便宜', ['辣', '重口', '开胃'], '麻辣鲜香，早餐夜宵都行'],
    ['兰州拉面', '面食', '低脂', '便宜', ['不辣', '清淡', '清爽'], '清汤牛肉面，相对清爽'],
    ['意大利肉酱面', '面食', '中等', '稍贵', ['不辣', '酸甜'], '番茄肉末，西式快手餐'],

    // —— 粉 ——
    ['螺蛳粉', '粉', '高热量', '中等', ['辣', '重口', '重口味'], '闻着臭吃着香，广西名粉'],
    ['桂林米粉', '粉', '低脂', '便宜', ['不辣', '清淡', '清爽'], '卤水鲜香，米粉爽滑'],
    ['湖南米粉', '粉', '中等', '便宜', ['辣', '重口'], '码子丰富，辣得过瘾'],
    ['砂锅米线', '粉', '中等', '便宜', ['辣', '重口', '下饭'], '砂锅保温，配鹌鹑蛋'],
    ['越南河粉 Pho', '粉', '低脂', '稍贵', ['不辣', '清爽', '清淡'], '清透牛骨汤，配柠檬罗勒'],
    ['酸辣粉', '粉', '中等', '便宜', ['辣', '重口', '开胃'], '红薯粉加花生，酸辣开胃'],

    // —— 轻食 ——
    ['鸡胸肉沙拉', '轻食', '低脂', '中等', ['不辣', '清爽', '清淡'], '高蛋白低卡，健身友好'],
    ['牛油果鸡蛋三明治', '轻食', '低脂', '中等', ['不辣', '清爽'], '全麦面包夹牛油果，饱腹'],
    ['藜麦碗', '轻食', '低脂', '稍贵', ['不辣', '清爽', '清淡'], '藜麦+时蔬，营养密度高'],
    ['凯撒沙拉', '轻食', '低脂', '中等', ['不辣', '清爽'], '罗马生菜配凯撒酱'],
    ['全麦鸡腿贝果', '轻食', '低脂', '中等', ['不辣', '清淡'], '烟熏鸡腿，碳水适中'],
    ['希腊酸奶碗', '轻食', '低脂', '中等', ['不辣', '清爽', '微甜'], '无糖酸奶+莓果+坚果'],

    // —— 快餐 ——
    ['麦辣鸡腿堡', '快餐', '高热量', '便宜', ['辣', '重口'], '炸鸡腿排，香但偏油'],
    ['鳕鱼堡套餐', '快餐', '中等', '中等', ['不辣', '咸鲜'], '深海鳕鱼，相对清爽些'],
    ['板烧鸡腿堡', '快餐', '中等', '中等', ['不辣', '咸鲜'], '铁板煎鸡腿，汁水多'],
    ['老北京鸡肉卷', '快餐', '中等', '便宜', ['不辣', '清爽'], '薄饼卷鸡丝黄瓜'],
    ['香辣鸡翅桶', '快餐', '高热量', '稍贵', ['辣', '重口'], '多人分享更划算'],
    ['牛肉饭（吉野家式）', '快餐', '中等', '便宜', ['不辣', '下饭', '咸鲜'], '洋葱肥牛盖饭，快捷'],

    // —— 小吃 ——
    ['煎饼果子', '小吃', '中等', '便宜', ['不辣', '咸鲜'], '杂粮煎饼夹脆饼+果蓖'],
    ['肉夹馍', '小吃', '高热量', '便宜', ['不辣', '重口'], '腊汁肉剁碎夹白吉馍'],
    ['鸡蛋灌饼', '小吃', '中等', '便宜', ['不辣', '咸鲜'], '饼皮灌蛋，外脆里嫩'],
    ['烤冷面', '小吃', '中等', '便宜', ['不辣', '咸鲜'], '东北街头，酸甜酱汁'],
    ['手抓饼', '小吃', '高热量', '便宜', ['不辣', '油腻'], '起层酥脆，加蛋加肠'],
    ['章鱼小丸子', '小吃', '中等', '便宜', ['不辣', '咸鲜'], '外软内嫩，木鱼花飘动'],
    ['生煎包', '小吃', '高热量', '便宜', ['不辣', '重口'], '底部焦脆，咬开爆汁'],

    // —— 日韩 ——
    ['寿司拼盘', '日韩', '低脂', '稍贵', ['不辣', '清爽', '清淡'], '刺身+寿司，低负担'],
    ['肥牛石锅拌饭', '日韩', '中等', '中等', ['辣', '下饭'], '韩式拌饭，配溏心蛋'],
    ['日式豚骨拉面', '日韩', '高热量', '稍贵', ['不辣', '重口'], '浓白汤底，叉烧溏心蛋'],
    ['韩式炸鸡', '日韩', '高热量', '稍贵', ['辣', '重口'], '裹酱炸鸡，配啤酒'],
    ['部队锅', '日韩', '中等', '稍贵', ['辣', '重口', '下饭'], '火腿午餐肉+泡面，热乎'],
    ['天妇罗定食', '日韩', '中等', '稍贵', ['不辣', '清爽'], '炸虾蔬+米饭+味噌汤'],

    // —— 火锅 ——
    ['麻辣烫（自选）', '火锅', '中等', '便宜', ['辣', '重口', '下饭'], '按串自选，麻酱小锅'],
    ['冒菜', '火锅', '中等', '便宜', ['辣', '重口'], '一人份火锅，配米饭'],
    ['重庆火锅（双人）', '火锅', '高热量', '稍贵', ['辣', '重口'], '牛油锅底，毛肚鸭肠'],
    ['番茄锅（单人）', '火锅', '低脂', '中等', ['不辣', '清爽', '清淡'], '番茄汤底，解辣友好'],
    ['寿喜锅', '火锅', '中等', '稍贵', ['不辣', '微甜'], '日式甜酱油涮牛肉'],

    // —— 早餐 ——
    ['豆浆油条', '早餐', '高热量', '便宜', ['不辣', '油腻'], '经典中式，油条蘸豆浆'],
    ['小笼包', '早餐', '中等', '便宜', ['不辣', '咸鲜'], '皮薄汁多，一笼管饱'],
    ['皮蛋瘦肉粥', '早餐', '低脂', '便宜', ['不辣', '清淡', '清爽'], '暖胃养胃，负担小'],
    ['生煎馒头', '早餐', '中等', '便宜', ['不辣', '咸鲜'], '上海生煎，底脆汁鲜'],
    ['肠粉', '早餐', '低脂', '便宜', ['不辣', '清淡', '清爽'], '米皮滑嫩，淋酱油'],
    ['杂粮煎饼', '早餐', '中等', '便宜', ['不辣', '清爽'], '杂粮版煎饼，纤维更高'],

    // —— 其他 ——
    ['和风沙拉碗', '其他', '低脂', '中等', ['不辣', '清爽', '清淡'], '日式油醋汁蔬菜碗'],
    ['关东煮', '其他', '低脂', '便宜', ['不辣', '清淡', '清爽'], '萝卜魔芋海带，热汤暖'],
    ['饭团组合', '其他', '中等', '便宜', ['不辣', '咸鲜'], '梅子/鲑鱼饭团，便携'],
    ['麻辣香锅', '其他', '高热量', '稍贵', ['辣', '重口', '下饭'], '自选荤素干锅，重油'],
    ['咖喱乌冬', '其他', '中等', '中等', ['不辣', '清爽'], '浓咖喱配粗乌冬'],
    ['墨西哥卷饼', '其他', '中等', '稍贵', ['不辣', '清爽'], '鸡肉+牛油果+莎莎酱']
  ];

  // 把原始数组转成标准对象，并补上运行时字段
  function buildPreset() {
    return PRESET_RAW.map(function (row, i) {
      return {
        id: 'p' + String(i + 1).padStart(3, '0'), // p001, p002 ...
        name: row[0],
        category: row[1],
        healthLevel: row[2],
        price: row[3],
        tags: row[4].slice(),
        note: row[5] || '',
        isFavorite: false,
        eatCount: 0,
        lastEatDate: null,
        isCustom: false
      };
    });
  }

  // —— 存储读写 ——
  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) return arr;
      }
    } catch (e) {}
    // 首次：写入预置
    var seed = buildPreset();
    save(seed);
    return seed;
  }
  function save(list) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch (e) {}
  }

  // 内存缓存（首次加载时种子化）
  var cache = load();

  function uid() {
    return 't_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  // 计算距今天数（基于日期字符串 YYYY-MM-DD）
  function daysAgo(dateStr) {
    if (!dateStr) return Infinity;
    var t = new Date(dateStr + 'T00:00:00');
    var now = new Date();
    var today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var diff = Math.floor((today0 - t) / 86400000);
    return diff;
  }

  // —— 对外 API ——
  function getAll() { return cache; }
  function getById(id) { return cache.find(function (x) { return x.id === id; }) || null; }

  function add(data) {
    var item = {
      id: uid(),
      name: (data.name || '').trim() || '未命名',
      category: data.category || '其他',
      healthLevel: data.healthLevel || '中等',
      price: data.price || '便宜',
      tags: Array.isArray(data.tags) ? data.tags : (data.tags ? [data.tags] : []),
      note: data.note || '',
      isFavorite: false,
      eatCount: 0,
      lastEatDate: null,
      isCustom: true
    };
    cache.unshift(item); // 新加的放最前
    save(cache);
    return item;
  }

  function update(id, patch) {
    var it = getById(id);
    if (!it) return null;
    ['name', 'category', 'healthLevel', 'price', 'note'].forEach(function (k) {
      if (patch[k] !== undefined) it[k] = patch[k];
    });
    if (patch.tags !== undefined) it.tags = Array.isArray(patch.tags) ? patch.tags : [];
    save(cache);
    return it;
  }

  function remove(id) {
    var i = cache.findIndex(function (x) { return x.id === id; });
    if (i >= 0) { cache.splice(i, 1); save(cache); return true; }
    return false;
  }

  function toggleFav(id) {
    var it = getById(id);
    if (!it) return;
    it.isFavorite = !it.isFavorite;
    save(cache);
    return it.isFavorite;
  }

  // 记录吃过：eatCount +1，lastEatDate 更新为今天
  function recordEat(id) {
    var it = getById(id);
    if (!it) return;
    it.eatCount = (it.eatCount || 0) + 1;
    it.lastEatDate = todayStr();
    save(cache);
    return it;
  }

  // 筛选：filters = { cat, health, favOnly, notEaten7 }
  function filter(filters) {
    filters = filters || {};
    return cache.filter(function (x) {
      if (filters.cat && filters.cat !== 'all' && x.category !== filters.cat) return false;
      if (filters.health && filters.health !== 'all' && x.healthLevel !== filters.health) return false;
      if (filters.favOnly && !x.isFavorite) return false;
      if (filters.notEaten7 && daysAgo(x.lastEatDate) < 7) return false;
      return true;
    });
  }

  // 暴露到全局
  window.Takeout = {
    CATS: CATS,
    HEALTH: HEALTH,
    PRICE: PRICE,
    getAll: getAll,
    getById: getById,
    add: add,
    update: update,
    remove: remove,
    toggleFav: toggleFav,
    recordEat: recordEat,
    filter: filter,
    daysAgo: daysAgo,
    todayStr: todayStr
  };
})();
