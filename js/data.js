
/* === data.js === */
/* ============================================
 📚 数据中心 - 书单 / 灵感 / 学习 / 健身 / 三丽鸥
 ============================================ */

// ============================================
// 📚 每日推荐书单（按月份轮换 + 当天随机5本）
// ============================================
// 书籍类型分类（参考豆瓣读书分类，用于阅读页类型筛选）
// 注意：豆瓣主分类 = 文学 / 小说 / 历史 / 社科 / 心理 / 哲学 / 科幻 等
// 这里既包含豆瓣主类，也包含常见的细分类
const BOOK_TYPES = [
 { id: 'all', label: ' 全部' },
 { id: 'literature', label: '📜 文学' },
 { id: 'novel', label: '📖 小说' },
 { id: 'history', label: ' 历史' },
 { id: 'social', label: ' 社科' },
 { id: 'psychology', label: ' 心理' },
 { id: 'philosophy', label: ' 哲学' },
 { id: 'scifi', label: ' 科幻' },
 { id: 'fantasy', label: ' 奇幻' },
 { id: 'mystery', label: '🔍 推理悬疑' },
 { id: 'biography', label: ' 传记' },
 { id: 'art', label: '🎨 艺术' },
 { id: 'children', label: ' 童书' },
 { id: 'education', label: '🎓 教育' },
 { id: 'science', label: ' 科技' },
];

// 「分类 → 微信读书搜索关键词」映射（详情跳转到微信读书）
// 不再调用 Google Books / Open Library（国外接口在国内经常被 GFW 阻断）
// 改为本地图书库 + 微信读书搜索（与「灵感」分区用 picsum 兜底图、真实平台 URL 的策略一致）
const BOOK_ONLINE_QUERY = {
 all: { subject: '畅销', extra: ['豆瓣 Top250','年度榜单','必读经典','新书速递','口碑之作'] },
 literature: { subject: '文学', extra: ['外国文学','现当代','散文随笔','诗歌','经典名著'] },
 novel: { subject: '小说', extra: ['长篇小说','当代小说','言情','中国小说','外国小说'] },
 history: { subject: '历史', extra: ['中国历史','世界史','古代史','近代史','二战','明朝','唐朝'] },
 social: { subject: '社科', extra: ['社会学','人类学','经济','政治','文化','城市研究'] },
 psychology: { subject: '心理', extra: ['认知心理','情感','人际','成长','疗愈','亲密关系'] },
 philosophy: { subject: '哲学', extra: ['中国哲学','西方哲学','存在主义','伦理学','美学','佛学'] },
 scifi: { subject: '科幻', extra: ['硬科幻','软科幻','太空歌剧','末日','赛博朋克','刘慈欣','阿西莫夫'] },
 fantasy: { subject: '奇幻', extra: ['西方奇幻','玄幻','魔法','史诗','龙族','北欧神话'] },
 mystery: { subject: '悬疑', extra: ['推理','社会派','本格','东野圭吾','阿加莎','烧脑','反转'] },
 biography: { subject: '传记', extra: ['回忆录','自传','伟人','艺术家','科学家','企业家'] },
 art: { subject: '艺术', extra: ['绘画','设计','摄影','电影','音乐','建筑','当代艺术'] },
 children: { subject: '童书', extra: ['绘本','童话','成长','冒险','友情','0-3岁','6-12岁'] },
 education: { subject: '教育', extra: ['育儿','教学','认知','家庭','早教','通识'] },
 science: { subject: '科技', extra: ['人工智能','互联网','生物','宇宙','数学','医学','新能源'] },
};

// 微信读书搜索 URL（用于书籍详情跳转）
function _weixinReadSearch(kw) { return 'https://weread.qq.com/search?keyword=' + encodeURIComponent(kw); }

// 离线兜底书库（联网失败时使用；分类与 BOOK_TYPES 完全对齐，不再混入职场/健身/英语/游戏）
const DAILY_BOOKS = [
 // 文学
 { title: "人间失格", author: "太宰治", type: "literature", intro: "日本无赖派文学代表作。软弱、敏感、渴望被爱又害怕人类的叶藏，是你笔下人物的原型。" },
 { title: "挪威的森林", author: "村上春树", type: "literature", intro: "青春、死亡、爱与孤独。直子、绿子、渡边——三种人生态度的碰撞。" },
 { title: "霍乱时期的爱情", author: "马尔克斯", type: "literature", intro: "跨越半个世纪的爱情史诗。暗恋、婚姻、衰老、重逢——爱情的所有可能。" },
 { title: "百年孤独", author: "马尔克斯", type: "literature", intro: "魔幻现实主义巅峰之作。马孔多镇布恩迪亚家族七代人的命运，时间的迷宫。" },
 { title: "小王子", author: "圣埃克苏佩里", type: "literature", intro: "写给大人的童话。驯养、玫瑰、狐狸——爱与责任的永恒寓言。" },
 { title: "月亮与六便士", author: "毛姆", type: "literature", intro: "一个中年人抛弃家庭追求绘画理想。理想与现实的撕扯，灵魂的觉醒与毁灭。" },
 { title: "了不起的盖茨比", author: "菲茨杰拉德", type: "literature", intro: "美国梦的破灭。黛西、绿光、盖茨比——爵士时代的挽歌。" },
 { title: "红楼梦", author: "曹雪芹", type: "literature", intro: "中国古典小说巅峰。宝黛爱情、大家族兴衰，写人写情的至高境界。" },
 // 小说
 { title: "活着", author: "余华", type: "novel", intro: "中国人命运的史诗。福贵的一生，哭过笑过之后是对生命的敬畏。" },
 { title: "繁花", author: "金宇澄", type: "novel", intro: "上海老底子的味道。沪语写作的典范，市井生活的诗意与苍凉。" },
 { title: "白鹿原", author: "陈忠实", type: "novel", intro: "关中平原五十年的家族史诗。土地、宗族、革命与人性的纠缠。" },
 { title: "围城", author: "钱钟书", type: "novel", intro: "围在城里的人想冲出来，城外的人想冲进去。知识分子的众生相。" },
 { title: "三体", author: "刘慈欣", type: "scifi", intro: "中国科幻里程碑。宏大的宇宙观、深刻的人性思辨，硬科幻与软人文的完美结合。" },
 // 历史
 { title: "万历十五年", author: "黄仁宇", type: "history", intro: "大历史观的经典入门。通过一个看似平淡的年份，透视明朝乃至整个中国传统社会的症结。" },
 { title: "人类简史", author: "尤瓦尔·赫拉利", type: "history", intro: "从认知革命到科学革命，重新理解人类如何走到今天。宏大叙事与独特视角。" },
 { title: "叫魂", author: "孔飞力", type: "history", intro: "1768年中国妖术大恐慌。借一场民间闹剧，剖析专制权力与社会心理的互动。" },
 { title: "枪炮、病菌与钢铁", author: "贾雷德·戴蒙德", type: "history", intro: "为什么不同大陆文明发展差异巨大？环境、地理与生物因素的长时段解释。" },
 { title: "史记", author: "司马迁", type: "history", intro: "史家之绝唱，无韵之离骚。中国叙事传统的源头，写人写事的至高典范。" },
 { title: "明朝那些事儿", author: "当年明月", type: "history", intro: "用现代语言重写明朝三百年。历史可以很好看，也可以很动人。" },
 // 社科
 { title: "思考，快与慢", author: "丹尼尔·卡尼曼", type: "social", intro: "诺贝尔奖得主揭示人类双系统思维。理性和直觉如何共同决定我们的判断。" },
 { title: "影响力", author: "罗伯特·西奥迪尼", type: "social", intro: "顺从心理的六大武器。理解说服机制，对写作人物动机也极有帮助。" },
 { title: "乌合之众", author: "古斯塔夫·勒庞", type: "social", intro: "群体心理经典。理解 crowds 如何思考、情绪如何传染。" },
 { title: "社会心理学", author: "戴维·迈尔斯", type: "social", intro: "系统理解人与人之间的关系、态度与行为。观察人性的绝佳工具书。" },
 // 心理
 { title: "被讨厌的勇气", author: "岸见一郎", type: "psychology", intro: "阿德勒心理学的通俗入门。课题分离、自由与幸福的关系。" },
 { title: "少有人走的路", author: "M·斯科特·派克", type: "psychology", intro: "心智成熟的旅程：推迟满足、承担责任、忠于事实、保持平衡。" },
 { title: "自卑与超越", author: "阿尔弗雷德·阿德勒", type: "psychology", intro: "个体心理学奠基之作。理解自卑感如何成为成长的动力。" },
 { title: "亲密关系", author: "罗兰·米勒", type: "psychology", intro: "系统理解爱情、婚姻与人际吸引的科学。理性看待亲密关系。" },
 // 哲学
 { title: "苏菲的世界", author: "乔斯坦·贾德", type: "philosophy", intro: "用一封神秘信件带你走完西方哲学史。写作者的哲学扫盲书。" },
 { title: "中国哲学简史", author: "冯友兰", type: "philosophy", intro: "中国哲学的入门经典。儒道佛三家的源流与对话。" },
 { title: "作为意志和表象的世界", author: "叔本华", type: "philosophy", intro: "意志即痛苦，唯美可救赎。悲观主义哲学的代表作。" },
 // 科幻
 { title: "三体", author: "刘慈欣", type: "scifi", intro: "中国科幻里程碑。宏大的宇宙观、深刻的人性思辨。" },
 { title: "沙丘", author: "弗兰克·赫伯特", type: "scifi", intro: "科幻史诗。政治、宗教、生态与命运的交织，世界观建造的教科书。" },
 { title: "基地", author: "阿西莫夫", type: "scifi", intro: "银河帝国的衰落与重生。心理史学、机器人三定律。" },
 { title: "神经漫游者", author: "威廉·吉布森", type: "scifi", intro: "赛博朋克开山之作。黑客、人工智能与虚拟空间的预言式书写。" },
 { title: "流浪地球", author: "刘慈欣", type: "scifi", intro: "带着地球去流浪的壮烈想象。集体主义与生存意志的太空史诗。" },
 // 奇幻
 { title: "魔戒", author: "J.R.R.托尔金", type: "fantasy", intro: "现代奇幻文学的开山鼻祖。中土世界的史诗与语言之美。" },
 { title: "哈利·波特", author: "J.K.罗琳", type: "fantasy", intro: "陪伴一代人长大的魔法世界。友情、成长、选择。" },
 { title: "冰与火之歌", author: "乔治·R·R·马丁", type: "fantasy", intro: "权力的游戏原著。政治、家族、阴谋与龙的低语。" },
 // 推理悬疑
 { title: "嫌疑人X的献身", author: "东野圭吾", type: "mystery", intro: "数学天才的极致献身。爱的极致是掩盖还是成全？" },
 { title: "白夜行", author: "东野圭吾", type: "mystery", intro: "在白夜里行走的人，灵魂早已被阴影覆盖。" },
 { title: "无人生还", author: "阿加莎·克里斯蒂", type: "mystery", intro: "推理女王代表作。十个人被困孤岛，一首童谣预言了死亡。" },
 { title: "福尔摩斯探案全集", author: "柯南·道尔", type: "mystery", intro: "侦探小说的鼻祖。逻辑、演绎、戏剧性兼具。" },
 // 传记
 { title: "活着本来单纯", author: "丰子恺", type: "biography", intro: "漫画大师的生活散文集，温柔通透。" },
 { title: "苏东坡传", author: "林语堂", type: "biography", intro: "一代文豪的坎坷与旷达。字里行间皆是诗酒趁年华。" },
 { title: "史蒂夫·乔布斯传", author: "沃尔特·艾萨克森", type: "biography", intro: "苹果教主的双面人生——偏执、远见、疯狂与温柔。" },
 // 艺术
 { title: "艺术的故事", author: "E.H.贡布里希", type: "art", intro: "西方艺术史的经典入门。每一幅画背后的故事和时代。" },
 { title: "设计的觉醒", author: "原研哉", type: "art", intro: "日本设计大师的设计哲学与日常美学。" },
 // 童书
 { title: "夏洛的网", author: "E.B.怀特", type: "children", intro: "一只蜘蛛和一头小猪的友谊，温柔得让人落泪。" },
 { title: "窗边的小豆豆", author: "黑柳彻子", type: "children", intro: "巴学园里长大的孩子，看见了最理想的教育模样。" },
 { title: "草房子", author: "曹文轩", type: "children", intro: "中国儿童文学的纯美之作，乡愁与成长的史诗。" },
 // 教育
 { title: "爱弥儿", author: "卢梭", type: "education", intro: "现代教育思想的起点。论自然教育与自由成长。" },
 { title: "民主主义与教育", author: "杜威", type: "education", intro: "教育即经验的不断改造。理解现代教育的钥匙。" },
 // 科技
 { title: "时间简史", author: "史蒂芬·霍金", type: "science", intro: "从大爆炸到黑洞，宇宙奥秘的科普经典。" },
 { title: "人工智能：一种现代的方法", author: "Stuart Russell", type: "science", intro: "AI领域的标准教材，理论与实践兼具。" },
 { title: "人类简史", author: "尤瓦尔·赫拉利", type: "science", intro: "从认知革命到科学革命，重新理解人类。" },
 // 写作工具书（保留写作相关，分类并入「文学」/「教育」）
 { title: "故事工程", author: "拉里·布鲁克斯", type: "literature", intro: "掌握故事结构的6大核心技能，从概念到完稿的全流程指南。" },
 { title: "写作风格的意识", author: "斯蒂芬·平克", type: "literature", intro: "哈佛心理学教授教你写出清晰优雅的句子。" },
 { title: "小说面面观", author: "E.M.福斯特", type: "literature", intro: "文学批评经典。圆形人物vs扁平人物、故事vs情节的精辟分析。" },
 { title: "救猫咪", author: "布莱克·斯奈德", type: "literature", intro: "好莱坞编剧圣经。10种故事类型、15个节拍点。" },
 { title: "人物弧线", author: "丽莎·克龙", type: "literature", intro: "揭示人物成长的内在逻辑，让角色立体丰满。" },
 { title: "冲突与悬念", author: "詹姆斯·斯科特·贝尔", type: "literature", intro: "小说创作核心技巧合集。如何制造冲突、维持张力。" },
 { title: "写作这回事", author: "史蒂芬·金", type: "literature", intro: "恐怖小说大师的创作回忆录。真实、幽默、实用。" },
 { title: "如何阅读一本文学书", author: "托马斯·福斯特", type: "literature", intro: "破解文学密码的钥匙。象征、隐喻、互文的解读方法。" },
];

// ============================================
// 📖 在线推荐书库（替代 Google Books / Open Library，国内稳定可用）
// 策略：与「灵感」分区一致——本地精选 + picsum 封面 + 详情跳微信读书搜索
// 分类沿用 BOOK_TYPES 的 id（豆瓣主类：文学 / 小说 / 历史 / 社科 / 心理 / 哲学 / 科幻 / 奇幻 / 悬疑 / 传记 / 艺术 / 童书 / 教育 / 科技）
// 每次「换一批」按今天日期 + 翻页偏移滚动抽取，给用户"在线刷新"的体感
// ============================================
const BOOK_ONLINE_LIBRARY = [
 // 文学
 { title: "百年孤独", author: "加西亚·马尔克斯", type: "literature", intro: "魔幻现实主义巅峰之作。马孔多镇布恩迪亚家族七代人的命运。", tags: ["魔幻","家族","经典"] },
 { title: "霍乱时期的爱情", author: "加西亚·马尔克斯", type: "literature", intro: "跨越半个世纪的爱情史诗。暗恋、婚姻、衰老、重逢。", tags: ["爱情","拉美"] },
 { title: "人间失格", author: "太宰治", type: "literature", intro: "日本无赖派文学代表作。软弱、敏感、渴望被爱又害怕人类。", tags: ["日本","私小说"] },
 { title: "挪威的森林", author: "村上春树", type: "literature", intro: "青春、死亡、爱与孤独。直子、绿子、渡边——三种人生态度的碰撞。", tags: ["日本","青春"] },
 { title: "月亮与六便士", author: "毛姆", type: "literature", intro: "一个中年人抛弃家庭追求绘画理想。理想与现实的撕扯。", tags: ["理想","英国"] },
 { title: "了不起的盖茨比", author: "菲茨杰拉德", type: "literature", intro: "美国梦的破灭。黛西、绿光、盖茨比——爵士时代的挽歌。", tags: ["美国","梦想"] },
 { title: "小王子", author: "圣埃克苏佩里", type: "literature", intro: "写给大人的童话。驯养、玫瑰、狐狸——爱与责任的永恒寓言。", tags: ["童话","寓言"] },
 { title: "红楼梦", author: "曹雪芹", type: "literature", intro: "中国古典小说巅峰。宝黛爱情、大家族兴衰。", tags: ["古典","中国"] },
 { title: "追风筝的人", author: "卡勒德·胡赛尼", type: "literature", intro: "为你千千万万遍。阿米尔与哈桑的友情与背叛。", tags: ["成长","救赎"] },
 { title: "局外人", author: "阿尔贝·加缪", type: "literature", intro: "存在主义文学经典。默尔索的冷漠与社会的荒诞。", tags: ["存在主义","法国"] },
 { title: "生命中不能承受之轻", author: "米兰·昆德拉", type: "literature", intro: "轻与重的辩证。托马斯、特蕾莎、萨比娜的纠缠。", tags: ["哲思","捷克"] },
 { title: "瓦尔登湖", author: "亨利·戴维·梭罗", type: "literature", intro: "回归自然的极简生活实验。简单、简单、再简单。", tags: ["自然","哲思"] },
 { title: "刀锋", author: "毛姆", type: "literature", intro: "拉里放弃优渥生活，走向自我求索的一生。", tags: ["存在主义","成长"] },
 { title: "生命中的一天", author: "彼得·汉德克", type: "literature", intro: "诺贝尔文学奖得主。日常语言的诗意。", tags: ["奥地利"] },
 // 小说
 { title: "活着", author: "余华", type: "novel", intro: "中国人命运的史诗。福贵的一生，哭过笑过之后是对生命的敬畏。", tags: ["中国","苦难"] },
 { title: "繁花", author: "金宇澄", type: "novel", intro: "上海老底子的味道。沪语写作的典范，市井生活的诗意与苍凉。", tags: ["上海","方言"] },
 { title: "白鹿原", author: "陈忠实", type: "novel", intro: "关中平原五十年的家族史诗。土地、宗族、革命与人性的纠缠。", tags: ["乡土","中国"] },
 { title: "围城", author: "钱钟书", type: "novel", intro: "围在城里的人想冲出来，城外的人想冲进去。", tags: ["讽刺","知识"] },
 { title: "许三观卖血记", author: "余华", type: "novel", intro: "用一次次卖血撑起一个家的中国故事。", tags: ["底层","中国"] },
 { title: "长恨歌", author: "王安忆", type: "novel", intro: "上海小姐王琦瑶的一生。一个女人的命运与一座城市的变迁。", tags: ["上海","女性"] },
 { title: "额尔古纳河右岸", author: "迟子建", type: "novel", intro: "鄂温克族百年沧桑。茅盾文学奖获奖作品。", tags: ["民族","史诗"] },
 { title: "废都", author: "贾平凹", type: "novel", intro: "知识分子的当代困境。古城西京的浮世绘。", tags: ["当代","中国"] },
 { title: "黄金时代", author: "王小波", type: "novel", intro: "我把我整个灵魂都给你，连同它的怪癖。", tags: ["黑色幽默"] },
 { title: "骆驼祥子", author: "老舍", type: "novel", intro: "北平车夫的悲剧。一个人的命运被时代碾碎。", tags: ["老北京"] },
 // 历史
 { title: "万历十五年", author: "黄仁宇", type: "history", intro: "大历史观的经典入门。一个平淡年份透视明朝症结。", tags: ["明史","大历史"] },
 { title: "人类简史", author: "尤瓦尔·赫拉利", type: "history", intro: "从认知革命到科学革命，重新理解人类如何走到今天。", tags: ["通识","全球史"] },
 { title: "叫魂", author: "孔飞力", type: "history", intro: "1768年中国妖术大恐慌。专制权力与社会心理的互动。", tags: ["清史","社会"] },
 { title: "枪炮、病菌与钢铁", author: "贾雷德·戴蒙德", type: "history", intro: "为什么不同大陆文明发展差异巨大？", tags: ["全球史","环境"] },
 { title: "史记", author: "司马迁", type: "history", intro: "史家之绝唱，无韵之离骚。", tags: ["古典","纪传体"] },
 { title: "明朝那些事儿", author: "当年明月", type: "history", intro: "用现代语言重写明朝三百年。历史可以很好看。", tags: ["明史","通俗"] },
 { title: "中国大历史", author: "黄仁宇", type: "history", intro: "用数字管理重新理解中国历史。", tags: ["通史"] },
 { title: "大秦帝国", author: "孙皓晖", type: "history", intro: "赳赳老秦，共赴国难。战国时代的群雄逐鹿。", tags: ["战国","小说"] },
 { title: "长安的荔枝", author: "马伯庸", type: "history", intro: "一个小吏运送鲜荔枝的唐代职场故事。", tags: ["唐","职场"] },
 { title: "显微镜下的大明", author: "马伯庸", type: "history", intro: "从基层档案看明代社会的真实肌理。", tags: ["明","社会"] },
 // 社科
 { title: "思考，快与慢", author: "丹尼尔·卡尼曼", type: "social", intro: "诺贝尔奖得主揭示人类双系统思维。", tags: ["认知","决策"] },
 { title: "影响力", author: "罗伯特·西奥迪尼", type: "social", intro: "顺从心理的六大武器。", tags: ["说服","营销"] },
 { title: "乌合之众", author: "古斯塔夫·勒庞", type: "social", intro: "群体心理经典。理解 crowds 如何思考。", tags: ["群体","法国"] },
 { title: "社会心理学", author: "戴维·迈尔斯", type: "social", intro: "系统理解人与人之间的关系、态度与行为。", tags: ["教材","人际"] },
 { title: "娱乐至死", author: "尼尔·波兹曼", type: "social", intro: "媒介即认识论。电视时代的内容如何被娱乐化。", tags: ["媒介","批判"] },
 { title: "乡土中国", author: "费孝通", type: "social", intro: "中国乡村社会的经典社会学分析。", tags: ["中国","乡村"] },
 { title: "江村经济", author: "费孝通", type: "social", intro: "开弦弓村的人类学田野调查报告。", tags: ["人类学","中国"] },
 { title: "枪与玫瑰", author: "理查德·佛罗里达", type: "social", intro: "创意阶层的崛起如何重塑城市与经济。", tags: ["经济","城市"] },
 // 心理
 { title: "被讨厌的勇气", author: "岸见一郎", type: "psychology", intro: "阿德勒心理学的通俗入门。课题分离、自由与幸福。", tags: ["阿德勒","成长"] },
 { title: "少有人走的路", author: "M·斯科特·派克", type: "psychology", intro: "心智成熟的旅程：推迟满足、承担责任、忠于事实。", tags: ["成熟","心理"] },
 { title: "自卑与超越", author: "阿尔弗雷德·阿德勒", type: "psychology", intro: "个体心理学奠基之作。", tags: ["阿德勒","自卑"] },
 { title: "亲密关系", author: "罗兰·米勒", type: "psychology", intro: "系统理解爱情、婚姻与人际吸引的科学。", tags: ["爱情","科学"] },
 { title: "非暴力沟通", author: "马歇尔·卢森堡", type: "psychology", intro: "观察、感受、需要、请求——让爱自然流露。", tags: ["沟通","实用"] },
 { title: "蛤蟆先生去看心理医生", author: "罗伯特·戴博德", type: "psychology", intro: "用童话讲心理咨询。亲子、夫妻、自我成长都适用。", tags: ["入门","童话"] },
 { title: "也许你该找个人聊聊", author: "洛莉·戈特利布", type: "psychology", intro: "一位心理治疗师的回忆录。来访者与自己的双向疗愈。", tags: ["回忆录","疗愈"] },
 { title: "心流", author: "米哈里·契克森米哈赖", type: "psychology", intro: "最优体验心理学。投入与幸福的内在结构。", tags: ["积极","心流"] },
 // 哲学
 { title: "苏菲的世界", author: "乔斯坦·贾德", type: "philosophy", intro: "用一封神秘信件带你走完西方哲学史。", tags: ["入门","西方"] },
 { title: "中国哲学简史", author: "冯友兰", type: "philosophy", intro: "中国哲学的入门经典。儒道佛三家的源流与对话。", tags: ["中国","入门"] },
 { title: "作为意志和表象的世界", author: "叔本华", type: "philosophy", intro: "意志即痛苦，唯美可救赎。悲观主义哲学的代表作。", tags: ["德国","悲观"] },
 { title: "查拉图斯特拉如是说", author: "尼采", type: "philosophy", intro: "上帝已死，超人将至。重估一切价值的诗化哲学。", tags: ["尼采","诗化"] },
 { title: "存在与时间", author: "海德格尔", type: "philosophy", intro: "此在、此在的在世存在、向死而生。", tags: ["存在主义"] },
 { title: "禅与摩托车维修艺术", author: "罗伯特·M·波西格", type: "philosophy", intro: "在摩托车上修行。东方禅意与西方逻辑的对话。", tags: ["禅","旅行"] },
 { title: "传习录", author: "王阳明", type: "philosophy", intro: "心即理、知行合一、致良知。明代心学集大成。", tags: ["心学","中国"] },
 // 科幻
 { title: "三体", author: "刘慈欣", type: "scifi", intro: "中国科幻里程碑。宏大的宇宙观、深刻的人性思辨。", tags: ["硬科幻","中国"] },
 { title: "三体Ⅱ：黑暗森林", author: "刘慈欣", type: "scifi", intro: "宇宙社会学：黑暗森林法则与猜疑链。", tags: ["硬科幻","续作"] },
 { title: "三体Ⅲ：死神永生", author: "刘慈欣", type: "scifi", intro: "降维打击。宇宙尺度的命运与人性。", tags: ["硬科幻","史诗"] },
 { title: "流浪地球", author: "刘慈欣", type: "scifi", intro: "带着地球去流浪的壮烈想象。", tags: ["中国","末日"] },
 { title: "沙丘", author: "弗兰克·赫伯特", type: "scifi", intro: "科幻史诗。政治、宗教、生态与命运的交织。", tags: ["太空歌剧","美国"] },
 { title: "基地", author: "艾萨克·阿西莫夫", type: "scifi", intro: "银河帝国的衰落与重生。心理史学、机器人三定律。", tags: ["经典","美国"] },
 { title: "神经漫游者", author: "威廉·吉布森", type: "scifi", intro: "赛博朋克开山之作。黑客、人工智能与虚拟空间。", tags: ["赛博朋克"] },
 { title: "时间机器", author: "H.G.威尔斯", type: "scifi", intro: "科幻小说的源头之一。阶级、进化与未来。", tags: ["经典"] },
 // 奇幻
 { title: "魔戒", author: "J.R.R.托尔金", type: "fantasy", intro: "现代奇幻文学的开山鼻祖。中土世界的史诗与语言之美。", tags: ["史诗","英国"] },
 { title: "霍比特人", author: "J.R.R.托尔金", type: "fantasy", intro: "比尔博的意外冒险。魔戒的前传。", tags: ["冒险","英国"] },
 { title: "哈利·波特与魔法石", author: "J.K.罗琳", type: "fantasy", intro: "陪伴一代人长大的魔法世界。", tags: ["魔法","成长"] },
 { title: "冰与火之歌", author: "乔治·R·R·马丁", type: "fantasy", intro: "权力的游戏原著。政治、家族、阴谋与龙的低语。", tags: ["史诗","政治"] },
 { title: "猎魔人：最后的愿望", author: "安杰伊·萨普科夫斯基", type: "fantasy", intro: "杰洛特与命运女神的短篇集。东欧奇幻经典。", tags: ["短篇","东欧"] },
 { title: "牧羊少年奇幻之旅", author: "保罗·柯艾略", type: "fantasy", intro: "当你真心渴望某样东西时，整个宇宙都会联合起来帮你。", tags: ["寓言","巴西"] },
 // 悬疑
 { title: "嫌疑人X的献身", author: "东野圭吾", type: "mystery", intro: "数学天才的极致献身。爱的极致是掩盖还是成全？", tags: ["日本","推理"] },
 { title: "白夜行", author: "东野圭吾", type: "mystery", intro: "在白夜里行走的人，灵魂早已被阴影覆盖。", tags: ["日本","社会派"] },
 { title: "无人生还", author: "阿加莎·克里斯蒂", type: "mystery", intro: "推理女王代表作。十个人被困孤岛，一首童谣预言了死亡。", tags: ["本格","英国"] },
 { title: "福尔摩斯探案全集", author: "柯南·道尔", type: "mystery", intro: "侦探小说的鼻祖。逻辑、演绎、戏剧性兼具。", tags: ["经典"] },
 { title: "长夜难明", author: "紫金陈", type: "mystery", intro: "社会派推理。检察官的十年追凶。", tags: ["中国","社会派"] },
 { title: "坏小孩", author: "紫金陈", type: "mystery", intro: "隐秘的角落原著。家庭与未成年人犯罪的灰色地带。", tags: ["中国"] },
 { title: "东方快车谋杀案", author: "阿加莎·克里斯蒂", type: "mystery", intro: "波洛破案经典。道德困境与法律的灰色地带。", tags: ["本格"] },
 { title: "沉默的巡游", author: "东野圭吾", type: "mystery", intro: "用一场烟火杀死一个人。东野圭吾近年力作。", tags: ["日本","新本格"] },
 // 传记
 { title: "苏东坡传", author: "林语堂", type: "biography", intro: "一代文豪的坎坷与旷达。", tags: ["宋代","中国"] },
 { title: "史蒂夫·乔布斯传", author: "沃尔特·艾萨克森", type: "biography", intro: "苹果教主的双面人生——偏执、远见、疯狂与温柔。", tags: ["科技","美国"] },
 { title: "活着本来单纯", author: "丰子恺", type: "biography", intro: "漫画大师的生活散文集，温柔通透。", tags: ["散文","中国"] },
 { title: "曾国藩家书", author: "曾国藩", type: "biography", intro: "晚清名臣的治家修身之道。", tags: ["清代","家训"] },
 { title: "当我谈跑步时我谈些什么", author: "村上春树", type: "biography", intro: "一个小说家的跑步哲学与日常坚持。", tags: ["日本","随笔"] },
 // 艺术
 { title: "艺术的故事", author: "E.H.贡布里希", type: "art", intro: "西方艺术史的经典入门。", tags: ["艺术史","西方"] },
 { title: "设计的觉醒", author: "原研哉", type: "art", intro: "日本设计大师的设计哲学与日常美学。", tags: ["设计","日本"] },
 { title: "故事", author: "罗伯特·麦基", type: "art", intro: "编剧圣经。情节、人物、戏剧结构的终极解析。", tags: ["编剧","电影"] },
 { title: "百年衣裳", author: "袁仄", type: "art", intro: "20世纪中国服装演变。", tags: ["服装","中国"] },
 // 童书
 { title: "夏洛的网", author: "E.B.怀特", type: "children", intro: "一只蜘蛛和一头小猪的友谊，温柔得让人落泪。", tags: ["友谊","美国"] },
 { title: "窗边的小豆豆", author: "黑柳彻子", type: "children", intro: "巴学园里长大的孩子，看见了最理想的教育模样。", tags: ["日本","教育"] },
 { title: "草房子", author: "曹文轩", type: "children", intro: "中国儿童文学的纯美之作，乡愁与成长的史诗。", tags: ["成长","中国"] },
 { title: "查理和巧克力工厂", author: "罗尔德·达尔", type: "children", intro: "一个穷人家的孩子抽中金票，闯入奇幻工厂。", tags: ["奇幻","英国"] },
 { title: "尼尔斯骑鹅旅行记", author: "塞尔玛·拉格洛夫", type: "children", intro: "一个不爱学习的小男孩变成拇指大的小人，骑着家鹅游历瑞典。", tags: ["瑞典","冒险"] },
 // 教育
 { title: "爱弥儿", author: "卢梭", type: "education", intro: "现代教育思想的起点。论自然教育与自由成长。", tags: ["西方","古典"] },
 { title: "民主主义与教育", author: "杜威", type: "education", intro: "教育即经验的不断改造。", tags: ["美国","现代"] },
 { title: "孩子：挑战", author: "鲁道夫·德雷克斯", type: "education", intro: "儿童心理学经典。平等、尊重、规则的现代育儿。", tags: ["育儿","阿德勒"] },
 { title: "正面管教", author: "简·尼尔森", type: "education", intro: "和善而坚定的教养方式。", tags: ["育儿","实用"] },
 // 科技
 { title: "时间简史", author: "史蒂芬·霍金", type: "science", intro: "从大爆炸到黑洞，宇宙奥秘的科普经典。", tags: ["宇宙","物理"] },
 { title: "人工智能：一种现代的方法", author: "Stuart Russell", type: "science", intro: "AI领域的标准教材，理论与实践兼具。", tags: ["AI","教材"] },
 { title: "生命是什么", author: "埃尔温·薛定谔", type: "science", intro: "从物理学家的视角看生命的本质。", tags: ["生物","经典"] },
 { title: "从一到无穷大", author: "乔治·伽莫夫", type: "science", intro: "科学素养入门经典。数学、物理、生物、天文一网打尽。", tags: ["通识"] },
 { title: "复杂", author: "梅拉妮·米歇尔", type: "science", intro: "复杂系统的科学。生命、计算机、社会背后的共同规律。", tags: ["复杂","跨学科"] },
];

// 为 BOOK_ONLINE_LIBRARY 的每本书生成稳定的 picsum 封面（与灵感区一致的"稳定 seed"策略）
function _bookCover(seed) {
 const s = String(seed || 'book').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '').slice(0, 24);
 return `https://picsum.photos/seed/book${encodeURIComponent(s)}/480/270`;
}
// 给每条数据补上 cover 字段（保持与 DAILY_BOOKS 兼容，cover 字段会被消费端忽略，但保留无害）
BOOK_ONLINE_LIBRARY.forEach(b => { b.cover = _bookCover(b.title + b.author); });

// ============================================
// 💡 灵感素材库（抖音/小红书/B站/微博/知乎）
// ============================================
// ============================================
// 💡 灵感池（多平台真实来源，按文学相关分类推送）
// 说明：每条内容都链接到【真实平台】的搜索结果页，关键词即 topic，
// 来源平台含 哔哩哔哩 / 豆瓣读书 / 豆瓣电影 / 喜马拉雅，
// 均为真实、可打开、且内容高度相关的平台（不限单一平台）。
// 不再使用任何具体视频 BV 号或杜撰链接。
// ============================================
const INSPIRATION_CATEGORIES = [
 { id: 'all', label: ' 全部' },
 { id: 'writing', label: '✍ 写作指导' },
 { id: 'film', label: '🎬 影视解说' },
 { id: 'book', label: '📚 书籍推荐' },
 { id: 'podcast', label: ' 文学播客' },
 { id: 'poem', label: '📜 诗词文学' },
];

// 真实平台来源：name 展示用，build(kw) 生成真实可打开的搜索链接（兼容旧数据）
// 封面图生成：基于标题产生稳定的 picsum 图片（保证视觉与内容绑定）
function _inspirePic(seed) {
 const s = String(seed || 'inspire').replace(/[^a-zA-Z0-9]/g, '');
 return `https://picsum.photos/seed/inspire${encodeURIComponent(s)}/480/270`;
}

// 平台搜索 URL 生成器（输入关键词，返回真实可打开的搜索页 URL）
function _bilibiliSearch(kw) { return 'https://search.bilibili.com/all?keyword=' + encodeURIComponent(kw); }
function _doubanBookSearch(kw) { return 'https://search.douban.com/book/subject_search?search_text=' + encodeURIComponent(kw); }
function _doubanMovieSearch(kw) { return 'https://movie.douban.com/subject_search?search_text=' + encodeURIComponent(kw); }
function _douyinSearch(kw) { return 'https://www.douyin.com/search/' + encodeURIComponent(kw); }
function _xhsSearch(kw) { return 'https://www.xiaohongshu.com/search_result?keyword=' + encodeURIComponent(kw); }
function _ximalayaSearch(kw) { return 'https://www.ximalaya.com/search/' + encodeURIComponent(kw); }

const INSPIRATION_PLATFORMS = {
 bilibili: { name: '哔哩哔哩', color: '#FB7299', build: _bilibiliSearch },
 douban_book: { name: '豆瓣读书', color: '#2E8B57', build: _doubanBookSearch },
 douban_movie: { name: '豆瓣电影', color: '#2E8B57', build: _doubanMovieSearch },
 ximalaya: { name: '喜马拉雅', color: '#F5A623', build: _ximalayaSearch },
 douyin: { name: '抖音', color: '#000000', build: _douyinSearch },
 xhs: { name: '小红书', color: '#FF2442', build: _xhsSearch },
};

// ============================================
// 🎯 精准推荐系统 —— 基于「用户画像 × 行为习惯 × 上下文场景」
// ============================================
// 用户画像（Hannah）：小说作者 + 游戏文案策划，在学英语/HR，有健身目标
// → 写作类权重最高，书籍次之，影视/播客/诗词依次递减
const INSPIRATION_PROFILE = {
 writing: 3.0, // 小说/游戏文案创作者，写作需求最强
 book: 2.4, // 阅读量大的写作者
 film: 1.8, // 影视叙事对写作/游戏文案有启发
 podcast: 1.5, // 通勤/碎片时间
 poem: 1.2, // 文学修养
};

// 上下文场景：按时段调整权重（早晨重学习/阅读，晚间重放松/影视，深夜重安静文学）
const INSPIRATION_CONTEXT = {
 morning: { writing: 1.3, book: 1.3, film: 0.8, podcast: 0.9, poem: 1.0 },
 noon: { writing: 1.1, book: 1.1, film: 1.0, podcast: 1.0, poem: 1.0 },
 afternoon: { writing: 1.1, book: 1.0, film: 1.1, podcast: 1.0, poem: 1.0 },
 evening: { writing: 0.9, book: 0.9, film: 1.4, podcast: 1.3, poem: 1.1 },
 night: { writing: 1.0, book: 1.0, film: 0.9, podcast: 1.3, poem: 1.4 },
};

const INSPIRATION_POOL = [
 // —— 写作指导（B 站真实热门教程 + 豆瓣真实书单）——
 {
 id: 'bilibili-writing-101',
 category: 'writing', platform: 'bilibili',
 title: '小说写作技巧入门',
 subtitle: '新手如何下笔：剧情、人物、世界观搭建',
 desc: '剧情、人物、世界观搭建的基础方法，从 0 到 1 把故事立起来。',
 tags: ['#写作技巧', '#新手'],
 keyword: '小说写作技巧入门 教程',
 url: _bilibiliSearch('小说写作技巧入门 教程'),
 actions: [
 { label: '看教学视频', url: _bilibiliSearch('小说写作技巧入门 教学视频'), primary: true },
 { label: 'B站搜更多', url: _bilibiliSearch('小说写作入门') },
 { label: '抖音跟练', url: _douyinSearch('小说写作技巧') },
 ],
 },
 {
 id: 'bilibili-netwriting',
 category: 'writing', platform: 'bilibili',
 title: '网文写作实战教程',
 subtitle: '爽点、节奏、信息差、热梗融入',
 desc: '网文核心技巧逐一拆解：怎么写出让人停不下来的故事。',
 tags: ['#网文', '#爽点'],
 keyword: '网文写作实战 教程',
 url: _bilibiliSearch('网文写作实战教程'),
 actions: [
 { label: '看教学视频', url: _bilibiliSearch('网文写作实战 教学'), primary: true },
 { label: 'B站搜更多', url: _bilibiliSearch('网文写作技巧') },
 ],
 },
 {
 id: 'bilibili-character',
 category: 'writing', platform: 'bilibili',
 title: '小说人物塑造方法',
 subtitle: '写出有血有肉、让读者共情的主角',
 desc: '动机、缺陷、弧光设计：主角与配角如何立体起来。',
 tags: ['#人物塑造', '#角色'],
 keyword: '小说人物塑造 方法',
 url: _bilibiliSearch('小说人物塑造方法'),
 actions: [
 { label: '看教学视频', url: _bilibiliSearch('人物塑造 教学'), primary: true },
 { label: 'B站搜更多', url: _bilibiliSearch('角色弧光') },
 ],
 },
 {
 id: 'bilibili-outline',
 category: 'writing', platform: 'bilibili',
 title: '故事大纲怎么写',
 subtitle: '三幕式 / 雪花法 / 英雄之旅',
 desc: '多种大纲结构实操，先搭骨架再填血肉。',
 tags: ['#大纲', '#故事结构'],
 keyword: '故事大纲 写法 教程',
 url: _bilibiliSearch('故事大纲怎么写'),
 actions: [
 { label: '看教学视频', url: _bilibiliSearch('小说大纲写法'), primary: true },
 { label: 'B站搜更多', url: _bilibiliSearch('雪花法大纲') },
 ],
 },
 {
 id: 'bilibili-dialogue',
 category: 'writing', platform: 'bilibili',
 title: '小说对话写作技巧',
 subtitle: '用对话推动剧情、塑造人物、埋潜台词',
 desc: '告别「他说她道」，让对话本身成为故事的发动机。',
 tags: ['#对话', '#技巧'],
 keyword: '小说对话 写作技巧',
 url: _bilibiliSearch('小说对话写作技巧'),
 actions: [
 { label: '看教学视频', url: _bilibiliSearch('对话写作技巧'), primary: true },
 { label: 'B站搜更多', url: _bilibiliSearch('潜台词 写作') },
 ],
 },
 {
 id: 'douban-book-writing',
 category: 'book', platform: 'douban_book',
 title: '写作工具书单',
 subtitle: '从技法到心法一次补齐',
 desc: '《故事工程》《写作风格的意识》《小说面面观》—— 提升写作能力的经典工具书清单。',
 tags: ['#写作书', '#工具书'],
 keyword: '小说写作工具书 经典',
 url: _doubanBookSearch('小说写作 工具书'),
 actions: [
 { label: '去豆瓣看', url: _doubanBookSearch('小说写作 工具书'), primary: true },
 { label: 'B站解读', url: _bilibiliSearch('故事工程 解读') },
 { label: '小红书笔记', url: _xhsSearch('小说写作工具书') },
 ],
 },
 {
 id: 'douban-book-masterpiece',
 category: 'book', platform: 'douban_book',
 title: '豆瓣读书 Top250',
 subtitle: '评分人数最多的 250 本好书',
 desc: '人生必读榜单。从文学经典到当代佳作，一份值得反复读的书单。',
 tags: ['#书单', '#必读'],
 keyword: '豆瓣读书 Top250',
 url: 'https://book.douban.com/top250?start=0',
 actions: [
 { label: '看 Top250', url: 'https://book.douban.com/top250?start=0', primary: true },
 { label: 'B站书评', url: _bilibiliSearch('豆瓣Top250 解读') },
 ],
 },
 {
 id: 'douban-book-mystery',
 category: 'book', platform: 'douban_book',
 title: '豆瓣悬疑推理书单',
 subtitle: '本格与社会派精选',
 desc: '反转不断、后劲十足的悬疑推理小说集合。',
 tags: ['#悬疑', '#推理'],
 keyword: '悬疑推理小说 书单',
 url: 'https://www.douban.com/doulist/40369759/',
 actions: [
 { label: '看书单', url: 'https://www.douban.com/doulist/40369759/', primary: true },
 { label: 'B站解读', url: _bilibiliSearch('悬疑小说 解读') },
 ],
 },
 {
 id: 'douban-book-scifi',
 category: 'book', platform: 'douban_book',
 title: '豆瓣科幻小说榜',
 subtitle: '硬科幻与软科幻佳作',
 desc: '想象力的边界在哪里？从《三体》到《基地》，科幻经典一网打尽。',
 tags: ['#科幻', '#想象力'],
 keyword: '科幻小说 豆瓣',
 url: 'https://www.douban.com/doulist/40369762/',
 actions: [
 { label: '看书单', url: 'https://www.douban.com/doulist/40369762/', primary: true },
 { label: 'B站解读', url: _bilibiliSearch('科幻小说 解读') },
 ],
 },
 {
 id: 'douban-book-female',
 category: 'book', platform: 'douban_book',
 title: '豆瓣女性文学书单',
 subtitle: '温柔而有力',
 desc: '女性视角的文学经典与当代佳作，《简爱》《房思琪》《醒来的女性》……',
 tags: ['#女性', '#文学'],
 keyword: '女性文学 豆瓣',
 url: 'https://www.douban.com/doulist/40369748/',
 actions: [
 { label: '看书单', url: 'https://www.douban.com/doulist/40369748/', primary: true },
 { label: '小红书', url: _xhsSearch('女性文学书单') },
 ],
 },
 {
 id: 'douban-movie-top250',
 category: 'film', platform: 'douban_movie',
 title: '豆瓣电影 Top250',
 subtitle: '影迷必看经典',
 desc: '主题、隐喻与视听语言深度解析，把一部电影看出三层意思。',
 tags: ['#电影解读', '#经典'],
 keyword: '豆瓣电影 Top250',
 url: 'https://movie.douban.com/top250?start=0',
 actions: [
 { label: '看榜单', url: 'https://movie.douban.com/top250?start=0', primary: true },
 { label: 'B站拉片', url: _bilibiliSearch('豆瓣Top250 拉片') },
 { label: '小红书', url: _xhsSearch('豆瓣电影Top250 解读') },
 ],
 },
 {
 id: 'douban-movie-mystery',
 category: 'film', platform: 'douban_movie',
 title: '豆瓣高分悬疑电影',
 subtitle: '反转不断 · 后劲十足',
 desc: '烧脑本格与社会派悬疑精选，挑灯夜战的观影清单。',
 tags: ['#悬疑', '#电影'],
 keyword: '豆瓣高分悬疑电影',
 url: 'https://movie.douban.com/typerank?type_name=%E6%82%AC%E7%96%91&type=17&interval_id=100:90',
 actions: [
 { label: '看榜单', url: 'https://movie.douban.com/typerank?type_name=%E6%82%AC%E7%96%91&type=17&interval_id=100:90', primary: true },
 { label: 'B站解说', url: _bilibiliSearch('悬疑电影 解说') },
 ],
 },
 {
 id: 'bilibili-film-analysis',
 category: 'film', platform: 'bilibili',
 title: '电影拉片分析',
 subtitle: '逐镜拆解经典电影',
 desc: '镜头语言、场面调度与叙事技巧，看懂导演的用心。',
 tags: ['#拉片', '#镜头'],
 keyword: '电影拉片分析 教程',
 url: _bilibiliSearch('电影拉片分析 教程'),
 actions: [
 { label: '看教学视频', url: _bilibiliSearch('电影拉片 教学'), primary: true },
 { label: 'B站搜更多', url: _bilibiliSearch('电影叙事结构') },
 ],
 },
 {
 id: 'bilibili-screenwriting',
 category: 'film', platform: 'bilibili',
 title: '影视编剧技巧',
 subtitle: '剧本结构、对白、冲突设计',
 desc: '从观众视角反推好故事——剧本写法的核心秘密。',
 tags: ['#编剧', '#剧本'],
 keyword: '影视编剧技巧 教程',
 url: _bilibiliSearch('影视编剧技巧'),
 actions: [
 { label: '看教学视频', url: _bilibiliSearch('编剧教程'), primary: true },
 { label: 'B站搜更多', url: _bilibiliSearch('剧本结构') },
 ],
 },
 {
 id: 'ximalaya-dandu',
 category: 'podcast', platform: 'ximalaya',
 title: '单读 · 文学播客',
 subtitle: '单向空间《单读》音频版',
 desc: '作家访谈 + 深度长文朗读，主播许知远与吴琦。',
 tags: ['#播客', '#访谈'],
 keyword: '单读 文学播客 喜马拉雅',
 url: 'https://www.ximalaya.com/album/19371849',
 actions: [
 { label: '去收听', url: 'https://www.ximalaya.com/album/19371849', primary: true },
 { label: 'B站解读', url: _bilibiliSearch('单读 许知远') },
 ],
 },
 {
 id: 'ximalaya-writers',
 category: 'podcast', platform: 'ximalaya',
 title: '作家访谈录',
 subtitle: '离大师更近一点',
 desc: '名家创作心路、写作习惯与灵感来源分享。',
 tags: ['#访谈', '#作家'],
 keyword: '作家访谈 喜马拉雅',
 url: 'https://www.ximalaya.com/album/47591088',
 actions: [
 { label: '去收听', url: 'https://www.ximalaya.com/album/47591088', primary: true },
 { label: 'B站更多', url: _bilibiliSearch('作家访谈') },
 ],
 },
 {
 id: 'ximalaya-reading',
 category: 'podcast', platform: 'ximalaya',
 title: '豆瓣 · 读书电台',
 subtitle: '睡前 / 通勤陪你读好书',
 desc: '温柔又治愈的声音栏目，让碎片时间也有书香。',
 tags: ['#电台', '#读书'],
 keyword: '豆瓣读书电台 喜马拉雅',
 url: 'https://www.ximalaya.com/album/31763033',
 actions: [
 { label: '去收听', url: 'https://www.ximalaya.com/album/31763033', primary: true },
 ],
 },
 {
 id: 'ximalaya-poetry',
 category: 'podcast', platform: 'ximalaya',
 title: '诗歌与散文朗诵',
 subtitle: '经典诗文配乐朗读',
 desc: '感受汉语的韵律与意境之美，配乐版本的文学之夜。',
 tags: ['#朗诵', '#诗歌'],
 keyword: '诗歌散文朗诵 喜马拉雅',
 url: 'https://www.ximalaya.com/album/48687006',
 actions: [
 { label: '去收听', url: 'https://www.ximalaya.com/album/48687006', primary: true },
 ],
 },
 {
 id: 'ximalaya-writing',
 category: 'podcast', platform: 'ximalaya',
 title: '写作经验分享',
 subtitle: '一线作者聊创作',
 desc: '创作、改稿与投稿的真实经验，干货满满。',
 tags: ['#写作', '#经验'],
 keyword: '写作经验分享 喜马拉雅',
 url: 'https://www.ximalaya.com/album/56723617',
 actions: [
 { label: '去收听', url: 'https://www.ximalaya.com/album/56723617', primary: true },
 ],
 },
 {
 id: 'bilibili-poem-li-bai',
 category: 'poem', platform: 'bilibili',
 title: '古诗赏析 · 李白',
 subtitle: '把课本里的诗读懂读活',
 desc: '李白名篇的背景、意境与手法解读，蜀道难、将近酒、行路难……',
 tags: ['#古诗', '#赏析'],
 keyword: '李白古诗赏析 视频',
 url: _bilibiliSearch('李白古诗赏析'),
 actions: [
 { label: '看教学视频', url: _bilibiliSearch('李白古诗 教学'), primary: true },
 { label: 'B站搜更多', url: _bilibiliSearch('唐诗三百首 赏析') },
 { label: '喜马拉雅', url: _ximalayaSearch('李白古诗 朗诵') },
 ],
 },
 {
 id: 'bilibili-prose',
 category: 'poem', platform: 'bilibili',
 title: '散文写作技巧',
 subtitle: '形散神聚 · 真情实感',
 desc: '散文选材、线索与语言节奏，让你的文字有呼吸。',
 tags: ['#散文', '#写作'],
 keyword: '散文写作技巧 教程',
 url: _bilibiliSearch('散文写作技巧'),
 actions: [
 { label: '看教学视频', url: _bilibiliSearch('散文写作 教学'), primary: true },
 { label: '小红书', url: _xhsSearch('散文写作技巧') },
 ],
 },
 {
 id: 'bilibili-modern-poem',
 category: 'poem', platform: 'bilibili',
 title: '现代诗赏析',
 subtitle: '学会读「看不懂」的诗',
 desc: '朦胧诗与当代诗代表作解读——北岛、顾城、海子、舒婷……',
 tags: ['#现代诗', '#赏析'],
 keyword: '现代诗歌赏析 视频',
 url: _bilibiliSearch('现代诗歌赏析'),
 actions: [
 { label: '看教学视频', url: _bilibiliSearch('现代诗 解读'), primary: true },
 { label: 'B站搜更多', url: _bilibiliSearch('顾城 海子 赏析') },
 ],
 },
 {
 id: 'douban-book-masterpiece-list',
 category: 'poem', platform: 'douban_book',
 title: '豆瓣 · 世界名著导读',
 subtitle: '跨越时代的文学经典',
 desc: '读懂人类共通的情感与困境，从《百年孤独》到《追风筝的人》。',
 tags: ['#名著', '#导读'],
 keyword: '世界名著 豆瓣',
 url: 'https://book.douban.com/top250?start=0',
 actions: [
 { label: '看书单', url: 'https://book.douban.com/top250?start=0', primary: true },
 { label: 'B站解读', url: _bilibiliSearch('百年孤独 解读') },
 ],
 },
];

// 后处理：给每条注入封面图 pic 字段（基于 id 产生稳定 picsum 图）
INSPIRATION_POOL.forEach(item => {
 if (!item.pic) item.pic = _inspirePic(item.id || item.title);
});


// ============================================
// 🎓 英语每日内容
// ============================================
const ENGLISH_DAILY = [
 { day: 1, theme: "词根 spect-（看）", words: [
 { en: "spectacle", phonetic: "/ˈspektəkl/", pos: "n.", root: "spect (看) + -acle (名词后缀)", etymology: "源自拉丁语 spectare（注视），与 inspect/spectator 同源", cn: "壮观场面；奇观；(pl.)眼镜", examples: ["The sunrise was a spectacular spectacle. (日出是一道壮观的奇观。)", "She wore her spectacles to read. (她戴上眼镜看书。)"], synonyms: ["display", "sight", "marvel"], collocations: ["a spectacular spectacle", "make a spectacle of oneself", "put on a spectacle"] },
 { en: "introspection", phonetic: "/ˌɪntrəˈspekʃn/", pos: "n.", root: "intro- (向内) + spect (看) + -ion (名词后缀)", etymology: "拉丁语 introspicere，内向审视自己的思想与情感", cn: "内省；反省；自我审视", examples: ["After the failure, he engaged in deep introspection. (失败后他进行了深刻的自我反省。)", "Her poetry is full of quiet introspection. (她的诗充满了安静的内省。)"], synonyms: ["self-examination", "reflection", "contemplation"], collocations: ["deep introspection", "engage in introspection", "through introspection"] },
 { en: "perspective", phonetic: "/pəˈspektɪv/", pos: "n.", root: "per- (通过/贯穿) + spect (看) + -ive", etymology: "拉丁语 perspicere（看透），通过某个角度全面观察", cn: "视角；观点；透视法", examples: ["From my perspective, the plan needs revision. (从我的角度看，这个计划需要修改。)", "The novel offers a fresh perspective on war. (这部小说提供了对战争的新视角。)"], synonyms: ["viewpoint", "standpoint", "angle"], collocations: ["from a new perspective", "broaden one's perspective", "a historical perspective"] },
 { en: "retrospect", phonetic: "/ˈretrəspekt/", pos: "n./v.", root: "retro- (向后) + spect (看)", etymology: "拉丁语 retrospicere，回顾过去", cn: "回顾；追溯", examples: ["In retrospect, I should have taken the job. (事后想想，我当初该接受那份工作。)", "She retrospected on her college years with a smile. (她微笑着回顾大学时光。)"], synonyms: ["reflection", "review", "reminiscence"], collocations: ["in retrospect", "retrospect on"] },
 { en: "prospect", phonetic: "/ˈprɒspekt/", pos: "n./v.", root: "pro- (向前) + spect (看)", etymology: "拉丁语 prospicere，向前看、展望未来", cn: "前景；预期；勘探", examples: ["Job prospects for graduates are improving. (毕业生的就业前景在改善。)", "The prospect of traveling excited her. (旅行的前景让她兴奋。)"], synonyms: ["outlook", "expectation", "possibility"], collocations: ["job prospects", "in prospect", "prospect for (勘探)"] },
 ], grammar: {
 name: "现在完成进行时",
 pattern: "have/has been + V-ing",
 explanation: "表示从过去某时开始一直持续到现在的动作。强调动作的持续性，可能刚刚停止，也可能继续下去。与现在完成时的区别：完成时强调结果，进行时强调过程。",
 examples: [
 "I have been studying English for 3 years. (我学英语已经3年了——强调持续过程)",
 "She has been writing her novel since morning. (她从早上就一直在写小说——强调持续)",
 "How long have you been waiting? (你等了多久了？)",
 ],
 commonMistakes: [
 " I have been knowing him for years. (know是状态动词，不用进行时)",
 " I have known him for years.",
 " She has been belonging to the club since 2020.",
 " She has belonged to the club since 2020.",
 ],
 tips: "状态动词（be, know, belong, like, love, hate, own等）通常不用进行时。记住：进行时是给动作动词准备的。",
 }, sentence: "Life is what happens when you're busy making other plans. — John Lennon", resources: [
 { title: "英语语法精讲合集（英语兔）", platform: "B站", duration: "系列", emoji: "", link: "https://www.bilibili.com/video/BV1XY411J7aG/" },
 { title: "一个视频说清整个英语语法体系", platform: "B站", duration: "60分钟", emoji: "", link: "https://www.bilibili.com/video/BV1r54y1m7gd/" },
 { title: "全300集 词根词缀记忆法8000词", platform: "B站", duration: "300集", emoji: "📚", link: "https://www.bilibili.com/video/BV1qSwpeREhW/" },
 ]},
 { day: 2, theme: "词根 port-（搬运/携带）", words: [
 { en: "transport", phonetic: "/trænˈspɔːt/", pos: "v./n.", root: "trans- (跨越) + port (搬运)", etymology: "拉丁语 transportare，从一处搬到另一处", cn: "运输；交通；运送", examples: ["Goods are transported by truck. (货物用卡车运输。)", "Public transport in this city is excellent. (这个城市的公共交通很好。)"], synonyms: ["convey", "carry", "transfer"], collocations: ["transport goods", "public transport", "means of transport"] },
 { en: "deport", phonetic: "/dɪˈpɔːt/", pos: "v.", root: "de- (离开) + port (搬运)", etymology: "拉丁语 deportare，带走、驱逐出境", cn: "驱逐出境；放逐", examples: ["The criminal was deported to his home country. (罪犯被驱逐回母国。)", "He was deported for violating immigration laws. (他因违反移民法被驱逐出境。)"], synonyms: ["exile", "expel", "banish"], collocations: ["deport to", "deport for illegal entry"] },
 { en: "import", phonetic: "/ˈɪmpɔːt/", pos: "v./n.", root: "im- (in) + port (搬运)", etymology: "拉丁语 importare，搬入、进口", cn: "进口；输入；含义", examples: ["China imports oil from the Middle East. (中国从中东进口石油。)", "What are the imports of this statement? (这番话的含义是什么？)"], synonyms: ["introduce", "bring in"], collocations: ["import from", "import duty", "import goods"] },
 { en: "portable", phonetic: "/ˈpɔːtəbl/", pos: "adj.", root: "port (搬运) + -able (能...的)", etymology: "拉丁语 portabilis，可以搬运的", cn: "便携的；手提的", examples: ["This portable charger is a lifesaver. (这个便携充电器救了命。)", "She always carries a portable laptop. (她总带着一台便携笔记本。)"], synonyms: ["mobile", "compact", "lightweight"], collocations: ["portable device", "portable battery", "easily portable"] },
 { en: "report", phonetic: "/rɪˈpɔːt/", pos: "v./n.", root: "re- (回/再) + port (搬运)", etymology: "拉丁语 reportare，带回信息、汇报", cn: "报告；报道；汇报", examples: ["She reported the incident to the police. (她向警方报告了这起事件。)", "The annual report is due next week. (年度报告下周到期。)"], synonyms: ["account", "narrate", "describe"], collocations: ["report to", "annual report", "weather report"] },
 ], grammar: {
 name: "虚拟语气",
 pattern: "If I were / If I had done / I wish I were",
 explanation: "表达与现实相反的假设。①与现在相反：If + 过去时, would + V；②与过去相反：If + had done, would have done；③与将来相反：If + were to do / should do。注意：be动词在虚拟语气中所有人称都用 were。",
 examples: [
 "If I were you, I would take the job. (如果我是你，我会接受这份工作。——与现在相反)",
 "If she had studied harder, she would have passed. (如果她更努力学习，就能通过了。——与过去相反)",
 "I wish I were a bird. (我希望我是一只鸟。——wish后虚拟)",
 ],
 commonMistakes: [
 " If I was you, I would go. (虚拟语气中be动词用were)",
 " If I were you, I would go.",
 " I wish I am taller. (wish后用虚拟)",
 " I wish I were taller.",
 ],
 tips: "记住口诀：与现在相反用过去时，与过去相反用过去完成时。be动词一律用 were。",
 }, sentence: "We are all in the gutter, but some of us are looking at the stars. — Oscar Wilde", resources: [
 { title: "英语「虚拟语气」就是这么简单", platform: "B站", duration: "15分钟", emoji: "🎬", link: "https://www.bilibili.com/video/BV1bt4y1S779/" },
 { title: "所有英语从句，一个视频合集搞定", platform: "B站", duration: "系列", emoji: "📖", link: "https://www.bilibili.com/video/BV1764y1f7nq/" },
 { title: "全258集 思维导图速记8000词", platform: "B站", duration: "258集", emoji: "", link: "https://www.bilibili.com/video/BV1JiH8zdEg9/" },
 ]},
 { day: 3, theme: "词根 dict-（说/言语）", words: [
 { en: "predict", phonetic: "/prɪˈdɪkt/", pos: "v.", root: "pre- (前) + dict (说)", etymology: "拉丁语 praedicere，提前说出", cn: "预言；预测；预告", examples: ["Experts predict economic growth next year. (专家预测明年经济增长。)", "Can you predict the outcome? (你能预测结果吗？)"], synonyms: ["forecast", "prophesy", "anticipate"], collocations: ["predict the outcome", "hard to predict", "accurately predict"] },
 { en: "dictate", phonetic: "/dɪkˈteɪt/", pos: "v.", root: "dict (说) + -ate (动词后缀)", etymology: "拉丁语 dictare，口述、命令", cn: "口述；命令；支配", examples: ["The boss dictated a letter to his secretary. (老板向秘书口述一封信。)", "Don't dictate what I should do. (别命令我该做什么。)"], synonyms: ["command", "order", "prescribe"], collocations: ["dictate to", "dictate terms", "dictate a letter"] },
 { en: "contradict", phonetic: "/ˌkɒntrəˈdɪkt/", pos: "v.", root: "contra- (反对) + dict (说)", etymology: "拉丁语 contradicere，说反话、反驳", cn: "反驳；矛盾；与…抵触", examples: ["His actions contradict his words. (他的行为与言辞矛盾。)", "Don't contradict me in public. (别在公开场合反驳我。)"], synonyms: ["refute", "oppose", "deny"], collocations: ["contradict oneself", "contradict each other"] },
 { en: "verdict", phonetic: "/ˈvɜːdɪkt/", pos: "n.", root: "ver (真实) + dict (说)", etymology: "拉丁语 veredictum，真实地说出→裁决", cn: "裁决；判决；定论", examples: ["The jury reached a verdict of not guilty. (陪审团做出了无罪裁决。)", "What's your verdict on the new restaurant? (你对新餐厅怎么看？)"], synonyms: ["judgment", "decision", "conclusion"], collocations: ["reach a verdict", "guilty verdict", "final verdict"] },
 { en: "edict", phonetic: "/ˈiːdɪkt/", pos: "n.", root: "e- (出) + dict (说)", etymology: "拉丁语 edicere，说出→颁布", cn: "法令；敕令；布告", examples: ["The emperor issued an edict banning the religion. (皇帝颁布法令禁止该宗教。)", "The royal edict changed the course of history. (皇家敕令改变了历史进程。)"], synonyms: ["decree", "ordinance", "proclamation"], collocations: ["issue an edict", "royal edict"] },
 ], grammar: {
 name: "定语从句",
 pattern: "...who/which/that/where/when/why...",
 explanation: "修饰名词或代词的从句，相当于一个形容词。①关系代词：who(人)、which(物)、that(人/物)、whose(所属)；②关系副词：where(地点)、when(时间)、why(原因)。限制性定语从句不可省略（影响句意），非限制性用逗号隔开（补充说明）。",
 examples: [
 "The book that I bought yesterday is excellent. (我昨天买的那本书很棒。——限制性)",
 "My mother, who is a teacher, loves reading. (我妈妈是老师，她爱读书。——非限制性)",
 "The city where I grew up has changed a lot. (我长大的城市变了很多。)",
 ],
 commonMistakes: [
 " The book what I bought is good. (what不能引导定语从句)",
 " The book that/which I bought is good.",
 " This is the house which I lived. (live后缺介词in或用where)",
 " This is the house where I lived. / This is the house in which I lived.",
 ],
 tips: "判断用关系代词还是副词：看从句是否缺主语/宾语。缺→用代词(who/which/that)；不缺→用副词(where/when/why)。",
 }, sentence: "The only way to do great work is to love what you do. — Steve Jobs", resources: [
 { title: "英语从句到底怎么回事？", platform: "B站", duration: "20分钟", emoji: "🔗", link: "https://www.bilibili.com/video/BV1Dp4y1e7zm/" },
 { title: "形容词从句（定语从句）精讲", platform: "B站", duration: "25分钟", emoji: "📖", link: "https://www.bilibili.com/video/BV1YA411J74X/" },
 { title: "英语语法全程课 零基础50讲", platform: "B站", duration: "50讲", emoji: "🎓", link: "https://www.bilibili.com/video/BV1e54y1s7AC/" },
 ]},
 { day: 4, theme: "词根 ject-（投掷/抛）", words: [
 { en: "eject", phonetic: "/ɪˈdʒekt/", pos: "v.", root: "e- (出) + ject (抛)", etymology: "拉丁语 eicere，抛出去", cn: "喷射；驱逐；弹出", examples: ["The pilot ejected from the damaged plane. (飞行员从受损飞机中弹射。)", "He was ejected from the bar for fighting. (他因打架被赶出酒吧。)"], synonyms: ["expel", "oust", "discharge"], collocations: ["eject from", "eject a disk"] },
 { en: "reject", phonetic: "/rɪˈdʒekt/", pos: "v.", root: "re- (回) + ject (抛)", etymology: "拉丁语 reicere，抛回去→拒绝", cn: "拒绝；驳回；排斥", examples: ["She rejected his marriage proposal. (她拒绝了他的求婚。)", "The court rejected the appeal. (法院驳回了上诉。)"], synonyms: ["refuse", "decline", "dismiss"], collocations: ["reject an offer", "reject a proposal", "reject outright"] },
 { en: "project", phonetic: "/ˈprɒdʒekt/ (n.) /prəˈdʒekt/ (v.)", pos: "n./v.", root: "pro- (前) + ject (抛)", etymology: "拉丁语 proicere，向前抛→投射、计划", cn: "项目；工程；投射；投影", examples: ["The construction project is ahead of schedule. (建设项目提前了。)", "She projected confidence during the interview. (面试时她展现出自信。)"], synonyms: ["plan", "scheme", "predict"], collocations: ["project management", "a major project", "project onto"] },
 { en: "subject", phonetic: "/ˈsʌbdʒɪkt/ (adj.) /səbˈdʒekt/ (v.)", pos: "n./adj./v.", root: "sub- (下) + ject (抛)", etymology: "拉丁语 subicere，抛在下面→使臣服", cn: "主题；科目；受支配的；使经受", examples: ["Math is my favorite subject. (数学是我最喜欢的科目。)", "The city was subjected to heavy bombing. (这座城市遭受了猛烈轰炸。)"], synonyms: ["topic", "theme", "expose"], collocations: ["subject to", "on the subject of", "a controversial subject"] },
 { en: "object", phonetic: "/ˈɒbdʒɪkt/ (n.) /əbˈdʒekt/ (v.)", pos: "n./v.", root: "ob- (对/反) + ject (抛)", etymology: "拉丁语 obicere，抛到面前→反对", cn: "物体；目标；反对", examples: ["What's that shiny object in the sky? (天空中那个闪亮的物体是什么？)", "I object to this proposal. (我反对这个提案。)"], synonyms: ["item", "thing", "oppose"], collocations: ["object to", "an everyday object", "unidentified object"] },
 ], grammar: {
 name: "倒装句",
 pattern: "Never/Seldom/Hardly/Only + 助动词 + 主语 + ...",
 explanation: "将助动词/情态动词/be动词提到主语前面。①否定词开头（Never, Seldom, Hardly, No sooner, Not only）；②Only+状语开头；③方位副词开头（Here/There/Up/Down）。倒装是为了强调或使描写更生动。",
 examples: [
 "Never have I seen such beauty. (我从未见过如此美景。——否定词倒装)",
 "Only when you try will you succeed. (只有尝试了才能成功。——Only倒装)",
 "Here comes the bus. (公交车来了。——方位倒装)",
 ],
 commonMistakes: [
 " Never I have seen such a thing. (否定词开头需倒装)",
 " Never have I seen such a thing.",
 " Hardly I had arrived when it started to rain.",
 " Hardly had I arrived when it started to rain.",
 ],
 tips: "看到否定词/Only开头→找助动词→提到主语前。没有助动词就加 do/does/did。",
 }, sentence: "The journey of a thousand miles begins with a single step. — Lao Tzu", resources: [
 { title: "英语语法：16种时态终极详解", platform: "B站", duration: "系列", emoji: "⏰", link: "https://www.bilibili.com/video/BV1Sv411y7d8/" },
 { title: "【易筋经】B站最好的英语基础教学", platform: "B站", duration: "系列", emoji: "💪", link: "https://www.bilibili.com/video/BV1J4411B7n8/" },
 { title: "英语语法全程课 零基础起点", platform: "B站", duration: "系列", emoji: "📚", link: "https://www.bilibili.com/video/BV1D7411J71b/" },
 ]},
 { day: 5, theme: "词根 tract-（拉/拖）", words: [
 { en: "attract", phonetic: "/əˈtrækt/", pos: "v.", root: "at- (ad-向) + tract (拉)", etymology: "拉丁语 attrahere，拉向→吸引", cn: "吸引；引起；引诱", examples: ["The magnet attracts iron. (磁铁吸引铁。)", "Her smile attracted everyone's attention. (她的微笑吸引了所有人的注意。)"], synonyms: ["draw", "entice", "captivate"], collocations: ["attract attention", "attract visitors", "opposites attract"] },
 { en: "distract", phonetic: "/dɪˈstrækt/", pos: "v.", root: "dis- (分开) + tract (拉)", etymology: "拉丁语 distrahere，拉开注意力→分心", cn: "分散注意力；使分心", examples: ["Don't distract me while I'm driving. (我开车时别让我分心。)", "The noise distracted her from studying. (噪音让她无法专心学习。)"], synonyms: ["divert", "sidetrack", "confuse"], collocations: ["distract from", "easily distracted", "distract one's attention"] },
 { en: "extract", phonetic: "/ɪkˈstrækt/", pos: "v./n.", root: "ex- (出) + tract (拉)", etymology: "拉丁语 extrahere，拉出→提取", cn: "提取；拔出；摘录", examples: ["The dentist extracted a wisdom tooth. (牙医拔了一颗智齿。)", "Vanilla extract is used in baking. (香草精用于烘焙。)"], synonyms: ["remove", "draw out", "excerpt"], collocations: ["extract from", "tooth extraction", "vanilla extract"] },
 { en: "subtract", phonetic: "/səbˈtrækt/", pos: "v.", root: "sub- (下/ away) + tract (拉)", etymology: "拉丁语 subtrahere，拉走→减去", cn: "减去；扣除", examples: ["Subtract 5 from 10 and you get 5. (10减5等于5。)", "Taxes were subtracted from his salary. (税从他的工资中扣除了。)"], synonyms: ["deduct", "minus", "take away"], collocations: ["subtract from", "subtract A from B"] },
 { en: "contract", phonetic: "/ˈkɒntrækt/ (n.) /kənˈtrækt/ (v.)", pos: "n./v.", root: "con- (一起) + tract (拉)", etymology: "拉丁语 contrahere，拉到一起→收缩/合约", cn: "合同；收缩；感染", examples: ["Please sign the employment contract. (请签署雇佣合同。)", "Metals contract when cooled. (金属冷却时收缩。)"], synonyms: ["agreement", "shrink", "shorten"], collocations: ["sign a contract", "breach of contract", "muscle contraction"] },
 ], grammar: {
 name: "非谓语动词",
 pattern: "to do / doing / done",
 explanation: "动词的非谓语形式，不作句子的谓语。①不定式(to do)：表目的、将来、具体动作；②动名词(doing)：表习惯性、已发生的动作，可作主语/宾语；③分词(doing主动/done被动)：作定语、状语。关键区别：to do表将来/目的，doing表进行/习惯，done表完成/被动。",
 examples: [
 "I decided to study abroad. (我决定出国留学。——不定式表将来)",
 "Swimming is good for your health. (游泳对健康有益。——动名词作主语)",
 "The broken window needs repair. (破损的窗户需要修。——过去分词表被动)",
 ],
 commonMistakes: [
 " I enjoy to swim. (enjoy后接doing)",
 " I enjoy swimming.",
 " I want going home. (want后接to do)",
 " I want to go home.",
 ],
 tips: "记口诀：enjoy/finish/practice/mind后接doing；want/decide/hope/plan后接to do。有些词两者皆可但意思不同：stop to do(停下来去做) vs stop doing(停止做)。",
 }, sentence: "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment. — Emerson", resources: [
 { title: "超清晰语法教程！非谓语全面讲解", platform: "B站", duration: "30分钟", emoji: "📝", link: "https://www.bilibili.com/video/BV1iP4y1P7ET/" },
 { title: "to do/doing傻傻分不清？非谓语剖析", platform: "B站", duration: "25分钟", emoji: "", link: "https://www.bilibili.com/read/readlist/rl684327" },
 { title: "英语语法精讲合集（英语兔）", platform: "B站", duration: "系列", emoji: "", link: "https://www.bilibili.com/video/BV1XY411J7aG/" },
 ]},
 { day: 6, theme: "词根 duc/duct-（引导）", words: [
 { en: "conduct", phonetic: "/kənˈdʌkt/ (v.) /ˈkɒndʌkt/ (n.)", pos: "v./n.", root: "con- (一起) + duct (引导)", etymology: "拉丁语 conducere，引导到一起→指挥/进行", cn: "进行；指挥；行为；导电", examples: ["The scientist conducted an experiment. (科学家进行了一项实验。)", "His conduct at the meeting was unprofessional. (他在会议上的行为不专业。)"], synonyms: ["perform", "direct", "behavior"], collocations: ["conduct research", "conduct an experiment", "code of conduct"] },
 { en: "deduce", phonetic: "/dɪˈdjuːs/", pos: "v.", root: "de- (向下) + duce (引导)", etymology: "拉丁语 deducere，向下引→演绎推论", cn: "推断；演绎；推论", examples: ["From the clues, she deduced the suspect's identity. (从线索中她推断出嫌疑人身份。)", "Sherlock Holmes deduced the answer instantly. (福尔摩斯瞬间推论出答案。)"], synonyms: ["infer", "conclude", "reason"], collocations: ["deduce from", "deduce that"] },
 { en: "induce", phonetic: "/ɪnˈdjuːs/", pos: "v.", root: "in- (向内) + duce (引导)", etymology: "拉丁语 inducere，引入→诱导", cn: "诱导；引起；感应", examples: ["Stress can induce health problems. (压力会引发健康问题。)", "The doctor induced labor. (医生进行了引产。)"], synonyms: ["cause", "prompt", "provoke"], collocations: ["induce vomiting", "induce sleep", "drug-induced"] },
 { en: "reduce", phonetic: "/rɪˈdjuːs/", pos: "v.", root: "re- (回) + duce (引导)", etymology: "拉丁语 reducere，引回→减少", cn: "减少；降低；缩小", examples: ["We need to reduce our carbon footprint. (我们需要减少碳足迹。)", "The price was reduced by 30%. (价格降低了30%。)"], synonyms: ["decrease", "diminish", "lower"], collocations: ["reduce by", "reduce to", "reduce costs"] },
 { en: "produce", phonetic: "/prəˈdjuːs/ (v.) /ˈprɒdjuːs/ (n.)", pos: "v./n.", root: "pro- (向前) + duce (引导)", etymology: "拉丁语 producere，向前引→生产", cn: "生产；产生；农产品", examples: ["This factory produces electronic components. (这家工厂生产电子元件。)", "She buys fresh produce at the farmers' market. (她在农贸市场买新鲜农产品。)"], synonyms: ["make", "create", "generate"], collocations: ["produce goods", "local produce", "mass-produce"] },
 ], grammar: {
 name: "强调句",
 pattern: "It is/was + 被强调部分 + that/who + ...",
 explanation: "用来强调句子的某一部分（主语、宾语、状语）。结构固定：It is/was + 强调部分 + that/who + 句子其余部分。判断方法：去掉 It is/was...that 后，句子仍然完整。",
 examples: [
 "It was her smile that captivated me. (正是她的微笑吸引了我。——强调宾语)",
 "It is in this city that I met my wife. (就是在这座城市我遇到了妻子。——强调地点状语)",
 "It was yesterday that he called. (就是昨天他打来的电话。——强调时间状语)",
 ],
 commonMistakes: [
 " It was her who helped me. (强调人时可用who，但口语中也可用that)",
 " It was her that/who helped me.",
 " It is because he was ill why he was absent. (强调原因用that不用why)",
 " It is because he was ill that he was absent.",
 ],
 tips: "验证是否为强调句：删掉 It is/was 和 that/who，如果剩下的词仍能组成完整句子，就是强调句。",
 }, sentence: "Be the change that you wish to see in the world. — Gandhi", resources: [
 { title: "英语语法精讲合集（英语兔）", platform: "B站", duration: "系列", emoji: "", link: "https://www.bilibili.com/video/BV1XY411J7aG/" },
 { title: "全300集 词根词缀记忆法", platform: "B站", duration: "300集", emoji: "📚", link: "https://www.bilibili.com/video/BV1qSwpeREhW/" },
 { title: "一个视频说清整个英语语法体系", platform: "B站", duration: "60分钟", emoji: "", link: "https://www.bilibili.com/video/BV1r54y1m7gd/" },
 ]},
 { day: 7, theme: "词根 scrib/script-（写）", words: [
 { en: "describe", phonetic: "/dɪˈskraɪb/", pos: "v.", root: "de- (向下) + scribe (写)", etymology: "拉丁语 describere，写下→描写", cn: "描述；形容；描绘", examples: ["Can you describe the suspect? (你能描述一下嫌疑人吗？)", "She described the scene in vivid detail. (她生动地描述了那个场景。)"], synonyms: ["depict", "portray", "characterize"], collocations: ["describe as", "describe in detail", "hard to describe"] },
 { en: "prescribe", phonetic: "/prɪˈskraɪb/", pos: "v.", root: "pre- (前) + scribe (写)", etymology: "拉丁语 praescribere，预先写→开处方/规定", cn: "开处方；规定；指示", examples: ["The doctor prescribed antibiotics. (医生开了抗生素。)", "The law prescribes severe penalties. (法律规定了严厉的处罚。)"], synonyms: ["recommend", "stipulate", "mandate"], collocations: ["prescribe medicine", "prescribe by law", "prescribe a diet"] },
 { en: "subscribe", phonetic: "/səbˈskraɪb/", pos: "v.", root: "sub- (下) + scribe (写)", etymology: "拉丁语 subscribere，在下面签名→订阅/赞成", cn: "订阅；赞助；同意", examples: ["I subscribe to several magazines. (我订了几本杂志。)", "I don't subscribe to that theory. (我不赞同那个理论。)"], synonyms: ["pay for", "endorse", "support"], collocations: ["subscribe to", "subscribe to a channel", "annual subscription"] },
 { en: "transcript", phonetic: "/ˈtrænskrɪpt/", pos: "n.", root: "trans- (跨越) + script (写)", etymology: "拉丁语 transcriptum，抄写→副本", cn: "抄本；成绩单；文字稿", examples: ["Please request your academic transcript. (请申请你的学术成绩单。)", "The transcript of the interview is available. (采访的文字稿可查看。)"], synonyms: ["copy", "record", "documentation"], collocations: ["academic transcript", "official transcript", "video transcript"] },
 { en: "manuscript", phonetic: "/ˈmænjəskrɪpt/", pos: "n.", root: "manu (手) + script (写)", etymology: "拉丁语 manuscriptus，手写的→手稿", cn: "手稿；原稿； manuscript", examples: ["She submitted her manuscript to the publisher. (她把手稿提交给了出版社。)", "The ancient manuscript was found in a cave. (古代手稿在洞穴中被发现。)"], synonyms: ["draft", "typescript", "original"], collocations: ["submit a manuscript", "unpublished manuscript", "original manuscript"] },
 ], grammar: {
 name: "主语从句",
 pattern: "That/Whether/What/Who/How/When/Where + ... + 谓语",
 explanation: "整个从句作句子的主语。①That引导（无实际意义，不可省略）；②Whether引导（是否）；③疑问词引导（what/who/how等）。注意：主语从句较长时，常用 it 作形式主语，把从句后置。",
 examples: [
 "That she passed the exam surprised everyone. (她通过考试让所有人惊讶。——That引导)",
 "Whether we will go depends on the weather. (我们是否去取决于天气。——Whether引导)",
 "It is important that you finish on time. (你按时完成很重要。——it形式主语)",
 ],
 commonMistakes: [
 " She passed the exam surprised everyone. (缺That引导词)",
 " That she passed the exam surprised everyone.",
 " If we will go depends on the weather. (主语从句用whether不用if)",
 " Whether we will go depends on the weather.",
 ],
 tips: "主语从句的谓语用单数。That引导主语从句时that不可省略（和定语从句不同）。",
 }, sentence: "In the middle of difficulty lies opportunity. — Albert Einstein", resources: [
 { title: "主语从句（名词从句#1）含形式主语", platform: "B站", duration: "20分钟", emoji: "📝", link: "https://www.bilibili.com/video/BV1YA411J74X/" },
 { title: "英语语法精讲合集（英语兔）", platform: "B站", duration: "系列", emoji: "", link: "https://www.bilibili.com/video/BV1XY411J7aG/" },
 { title: "全258集 思维导图速记8000词", platform: "B站", duration: "258集", emoji: "", link: "https://www.bilibili.com/video/BV1JiH8zdEg9/" },
 ]},
];

// ============================================
// 👥 HR 每日内容
// ============================================
const HR_DAILY = [
 { day: 1, theme: "招聘与选拔", knowledge: "【结构化面试 STAR 法则】Situation（情境）+ Task（任务）+ Action（行动）+ Result（结果）。这是行为面试的核心工具，能让候选人讲述真实案例，避免理论化回答。HR 在面试中应针对每个能力维度设计 1-2 个 STAR 问题，深入挖掘候选人过往经历。", case: "某互联网公司招聘产品经理岗位。一位候选人在描述自己'成功推动跨部门合作'时，回答很泛泛。HR 用 STAR 法追问：'当时的情境是什么？你具体做了什么？结果如何量化？'候选人补充后才暴露：他只是发了邮件、开了会，并未真正推动落地。最终公司没有录用。", resources: [
 { title: "非人力资源经理的人力资源管理", platform: "B站", duration: "系列课程", emoji: "", link: "https://www.bilibili.com/video/BV1YaK3zQEcL/" },
 { title: "劳动合同订立实操指引", platform: "B站", duration: "法律讲解", emoji: "📋", link: "https://www.bilibili.com/video/BV12bL4zGEPX/" },
 { title: "HR面试能力-准备工作", platform: "B站", duration: "10分钟", emoji: "🎯", link: "https://space.bilibili.com/1735049597/" },
 ]},
 { day: 2, theme: "绩效管理", knowledge: "【OKR vs KPI】OKR（目标与关键结果）强调挑战性目标和定性结果，适合创新型团队；KPI（关键绩效指标）强调可量化指标，适合流程成熟岗位。OKR 不是考核工具，而是目标管理工具。设置 O 时要'敢想'，KR 要'可量化、有挑战'。", case: "某创业公司盲目套用 OKR，将销售目标设为'销售额翻倍'（O），KR 是'销售数量翻倍'。结果团队只追求数量,牺牲了客户质量。HR 介入后重设：O 不变,KR 改为'高价值客户增长 80%'、'客户续约率 90%'。3个月后,业绩质量明显提升。", resources: [
 { title: "绩效管理的核心法则", platform: "B站", duration: "76分钟", emoji: "📊", link: "https://space.bilibili.com/1735049597/" },
 { title: "用Excel制作高逼格员工花名册", platform: "B站", duration: "实用教程", emoji: "", link: "https://www.bilibili.com/video/BV1DPVBz3Egx/" },
 { title: "中级经济师·人力资源 全套课程", platform: "B站", duration: "168集", emoji: "🎓", link: "https://www.bilibili.com/video/BV1kDhnzoE5k/" },
 ]},
 { day: 3, theme: "员工关系", knowledge: "【员工离职的3个真相】员工离开的不是公司，是糟糕的经理（盖洛普研究）。离职前通常会经历'震惊—否定—愤怒—讨价还价—沮丧—接受'六个阶段。HR 要在员工入职第一周、第一月、第一季设置关键触点，建立归属感。", case: "某公司一年内核心员工流失率高达 40%。HR 调研发现：员工对直属上级的满意度平均 2.1/5。HR 启动'管理者的管理者'培训，要求所有中层每月与下属 1v1 一次，并接受 360 度评估。半年后，员工满意度提升到 3.8，离职率降至 18%。", resources: [
 { title: "19天搞定人力资源必考考点", platform: "B站", duration: "19天系列", emoji: "📖", link: "https://www.bilibili.com/video/BV1pSaPz7Eqp/" },
 { title: "企业用工合规文件体系解析", platform: "B站", duration: "系列课程", emoji: "", link: "https://space.bilibili.com/1735049597/" },
 { title: "劳动合同订立实操指引", platform: "B站", duration: "法律讲解", emoji: "📋", link: "https://www.bilibili.com/video/BV12bL4zGEPX/" },
 ]},
 { day: 4, theme: "培训与发展", knowledge: "【70-20-10 学习模型】70% 来自实战经验、20% 来自他人指导、10% 来自正式培训。这意味着 HR 设计培训时不能只依赖课堂，要把员工放进真实挑战中，配以导师辅导。培训效果评估采用柯氏四级模型：反应、学习、行为、结果。", case: "某零售企业花 50 万请外部讲师做销售话术培训，课堂上学员反馈热烈，但3个月后业绩无变化。HR 反思后改为：'实战工作坊'模式——让销售在真实场景中演练，经理即时反馈；'师傅带教'——金牌销售带新人；'复盘会'——每周分享成功案例。6 个月后新人留存率提升 35%。", resources: [
 { title: "职场沟通的价值解析", platform: "B站", duration: "公开课", emoji: "", link: "https://www.bilibili.com/video/BV1a2duYZEuf/" },
 { title: "中级经济师·人力资源全套", platform: "B站", duration: "168集", emoji: "🎓", link: "https://www.bilibili.com/video/BV1kDhnzoE5k/" },
 { title: "绩效管理的核心法则", platform: "B站", duration: "76分钟", emoji: "📊", link: "https://space.bilibili.com/1735049597/" },
 ]},
 { day: 5, theme: "薪酬激励", knowledge: "【薪酬宽带设计】将传统多级薪酬合并为宽带（3-5 个等级），扩大每级范围。优点：减少晋升压力、鼓励技能发展、灵活调薪。缺点：管理复杂、可能产生不公平感。需要配套：清晰的胜任力模型 + 公开的晋升标准。", case: "某科技公司薪酬带宽窄，技术员工晋升到 P6 就要等 P7 空缺，优秀员工看不到希望。HR 重新设计：P5-P6 合并为'高级工程师'，内部按 A/B/C 三档定级。员工不再为'职级'焦虑，转而追求技能提升。3 年内人才保留率提升 50%。", resources: [
 { title: "帮我涨薪60%的动态工资表", platform: "B站", duration: "实用Excel", emoji: "", link: "https://www.bilibili.com/video/BV1iDTCzXEif/" },
 { title: "中级经济师·薪酬管理", platform: "B站", duration: "课程", emoji: "📊", link: "https://www.bilibili.com/video/BV1kDhnzoE5k/" },
 { title: "4小时搞定人力资源管理核心", platform: "B站", duration: "4小时", emoji: "", link: "https://www.bilibili.com/video/BV1pSaPz7Eqp/" },
 ]},
 { day: 6, theme: "组织文化", knowledge: "【企业文化三层模型】人工制品（看得见的环境、制度）+ 价值观（信仰与规范）+ 基本假设（潜意识行为）。很多公司只装饰了第一层，文化失败是第二三层没建好。HR 推动文化变革要从'基本假设'入手,通过故事、仪式、榜样潜移默化。", case: "某外企中国分公司推动'扁平化'改革，去掉所有 title，员工可以直接找 CEO。开始大家很兴奋，但3个月后老员工抱怨'不知道谁负责什么'。HR 调整：保留 title 但弱化级别感；设立'圆桌会议'让所有员工参与决策；用 OKR 替代 KPI。6 个月后，公司真正实现了'去中心化'协作。", resources: [
 { title: "6小时搞定人力资源120分高频考点", platform: "B站", duration: "6小时", emoji: "🎯", link: "https://www.bilibili.com/video/BV1pSaPz7Eqp/" },
 { title: "职场沟通的价值解析", platform: "B站", duration: "公开课", emoji: "", link: "https://www.bilibili.com/video/BV1a2duYZEuf/" },
 { title: "中级经济师·人力资源全套", platform: "B站", duration: "168集", emoji: "🎓", link: "https://www.bilibili.com/video/BV1kDhnzoE5k/" },
 ]},
 { day: 7, theme: "HR数据与分析", knowledge: "【People Analytics 核心指标】人均产值、招聘周期、试用期通过率、关键人才保留率、培训 ROI、内部晋升率。HR 要从'事务专家'转型为'业务伙伴',用数据说话。重点关注'预警指标'，如关键员工 3 个月内的敬业度下降、薪资倒挂率、岗位空缺时长等。", case: "某制造业 HR 发现：销售部门新员工试用期通过率仅 40%。深入分析：发现新员工流失集中在入职第 30-60 天。HR 推出'30 天融入计划'：每周 Buddy 沟通、月度反馈、试用期导师制。半年后,试用期通过率提升至 75%，招聘成本下降 30%。", resources: [
 { title: "用Excel制作员工档案花名册", platform: "B站", duration: "实用教程", emoji: "📈", link: "https://www.bilibili.com/video/BV1DPVBz3Egx/" },
 { title: "动态工资表制作教程", platform: "B站", duration: "Excel技巧", emoji: "📊", link: "https://www.bilibili.com/video/BV1iDTCzXEif/" },
 { title: "9小时搞定人力资源高频考点", platform: "B站", duration: "9小时", emoji: "", link: "https://www.bilibili.com/video/BV1pSaPz7Eqp/" },
 ]},
];

// ============================================
// 💪 健身跟练推荐
// ============================================
// 健身视频真实搜索 URL + 稳定封面图生成
function _workoutPic(title) {
 const s = String(title || 'workout').replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '');
 return `https://picsum.photos/seed/workout${encodeURIComponent(s.slice(0, 16))}/480/270`;
}
function _workoutSearch(title, instructor) {
 // 用「UP主+关键词」搜 B 站，更容易命中真实视频
 return 'https://search.bilibili.com/all?keyword=' + encodeURIComponent(`${instructor || ''} ${title}`.trim());
}
function _douyinWorkout(title) {
 return 'https://www.douyin.com/search/' + encodeURIComponent(title);
}

// 通用包装：批量给一个视频数组注入 pic 与真实 url
function _wrapWorkout(arr, instructor) {
 arr.forEach(v => {
 if (!v.pic) v.pic = _workoutPic(v.title);
 if (!v.url) v.url = _workoutSearch(v.title, instructor);
 if (!v.douyin) v.douyin = _douyinWorkout(v.title);
 });
 return arr;
}

const WORKOUT_RECOMMEND = {
 home: {
 full: _wrapWorkout([
 { title: '帕梅拉 30分钟经典燃脂三部曲', duration: '30分钟', instructor: '帕梅拉', desc: '暴汗内啡肽 + 最佳HIIT + 站立腹肌，怒燃200-350卡', level: '中高强度', kcal: '~300' },
 { title: '15分钟全身初学者锻炼（无器械）', duration: '15分钟', instructor: '', desc: '350万播放，无需设备，居家零基础友好', level: '入门', kcal: '~120' },
 { title: '韩小四 30分钟站立无跑跳有氧燃脂操', duration: '30分钟', instructor: '韩小四', desc: '新手/大基数友好，不伤膝盖', level: '入门', kcal: '~250' },
 ]),
 core: _wrapWorkout([
 { title: '周六野 五分钟在家瘦腰运动', duration: '5分钟', instructor: '周六野', desc: '经典马甲线入门，每天5分钟见效', level: '入门', kcal: '~40' },
 { title: '周六野 马甲线进阶版', duration: '12分钟', instructor: '周六野', desc: '进阶腹肌训练，全方位雕刻', level: '进阶', kcal: '~110' },
 { title: '帕梅拉 10分钟新手腹肌训练', duration: '10分钟', instructor: '帕梅拉', desc: '新手友好，每个动作间有休息', level: '入门', kcal: '~90' },
 ]),
 leg: _wrapWorkout([
 { title: '韩小四 10分钟高效瘦大腿', duration: '10分钟', instructor: '韩小四', desc: '经典瘦腿训练，改善腿型', level: '入门', kcal: '~90' },
 { title: '周六野 9分钟瘦大腿+HIIT燃脂', duration: '9分钟', instructor: '周六野', desc: '大腿内侧专项，超燃脂', level: '中强度', kcal: '~120' },
 { title: '帕梅拉 15分钟瘦腿内外侧', duration: '15分钟', instructor: '帕梅拉', desc: '腿部内外侧综合训练', level: '中强度', kcal: '~150' },
 ]),
 arm: _wrapWorkout([
 { title: '周六野 5分钟瘦手臂运动（无工具）', duration: '5分钟', instructor: '周六野', desc: '无器械，坐着就能完成', level: '入门', kcal: '~40' },
 { title: '周六野 10分钟瘦手臂显锁骨', duration: '10分钟', instructor: '周六野', desc: '28天比基尼身材挑战，锁骨+手臂', level: '中强度', kcal: '~80' },
 { title: '韩小四 8分钟简单高效瘦胳膊', duration: '8分钟', instructor: '韩小四', desc: '超简单，新手也能跟', level: '入门', kcal: '~60' },
 ]),
 back: _wrapWorkout([
 { title: '每天10min 直角肩+少女背', duration: '10分钟', instructor: '', desc: '消除猥琐斜方肌，圆肩驼背必看', level: '入门', kcal: '~80' },
 { title: '周六野 快速矫正驼背圆肩', duration: '12分钟', instructor: '周六野', desc: '改善体态，缓解肩颈酸痛', level: '入门', kcal: '~90' },
 { title: '周六野 10分钟改善斜方肌粗大', duration: '10分钟', instructor: '周六野', desc: '溜肩圆肩富贵包一起改善', level: '入门', kcal: '~80' },
 ]),
 hip: _wrapWorkout([
 { title: '帕梅拉 10分钟站立瘦腹+纤腿', duration: '10分钟', instructor: '帕梅拉', desc: '二合一训练，新手友好', level: '入门', kcal: '~100' },
 { title: '韩小四 10分钟瘦臀腿+改善膝超伸', duration: '10分钟', instructor: '韩小四', desc: '臀腿同步改善', level: '中强度', kcal: '~100' },
 { title: '韩小四 每天5分钟甩掉小肚子', duration: '5分钟', instructor: '韩小四', desc: '马甲线+马甲线，躺床就能做', level: '入门', kcal: '~50' },
 ]),
 cardio: _wrapWorkout([
 { title: '逗逗 热门金曲健身燃脂舞60分钟', duration: '60分钟', instructor: '逗逗', desc: '金曲+燃脂舞，快乐运动不痛苦', level: '中强度', kcal: '~500' },
 { title: '春晓 无跑跳50min燃脂塑形全身训练', duration: '50分钟', instructor: '春晓', desc: '狂甩600大卡，三天轻松掉秤', level: '中高强度', kcal: '~600' },
 { title: 'growwithjo 40-60分钟有氧训练', duration: '40分钟', instructor: 'growwithjo', desc: '快走健身操+搏击操系列，新手友好', level: '入门', kcal: '~300' },
 ]),
 stretch: _wrapWorkout([
 { title: '运动前后拉伸 缓解酸痛解压', duration: '15分钟', instructor: '', desc: '改善体态，早上睡前也能做', level: '入门', kcal: '~50' },
 { title: '韩小四 站立腿部拉伸+泡沫轴按摩', duration: '10分钟', instructor: '韩小四', desc: '告别肌肉/水肿腿，运动后必做', level: '入门', kcal: '~40' },
 { title: '帕梅拉 X 周六野 10分钟身心放松拉伸', duration: '10分钟', instructor: '帕梅拉 周六野', desc: '舒展脊背，优雅体态', level: '入门', kcal: '~40' },
 ]),
 },
 gym: {
 full: _wrapWorkout([
 { title: '全身力量训练计划（深蹲+硬拉+卧推）', duration: '60分钟', instructor: '', desc: '三大项基础力量日', level: '中高强度', kcal: '~400' },
 { title: '分化训练 · 推拉腿计划', duration: '60分钟', instructor: '', desc: '科学分化，均衡发展', level: '中高强度', kcal: '~400' },
 { title: '全身循环训练 8个动作', duration: '45分钟', instructor: '', desc: '心率燃脂，适合健身房', level: '中强度', kcal: '~350' },
 ]),
 core: _wrapWorkout([
 { title: '健身房腹肌训练（帕梅拉负重版）', duration: '12分钟', instructor: '帕梅拉', desc: '地板动作+哑铃，练出立体腹肌', level: '进阶', kcal: '~120' },
 { title: '周六野 下腹部专项训练', duration: '10分钟', instructor: '周六野', desc: '下腹赘肉克星', level: '中强度', kcal: '~100' },
 { title: '10分钟腹部训练 全方位', duration: '10分钟', instructor: '', desc: '高级&初级&中级全方位', level: '入门', kcal: '~90' },
 ]),
 leg: _wrapWorkout([
 { title: '深蹲+腿举+弓步（腿部增肌日）', duration: '60分钟', instructor: '', desc: '健身房器械腿部训练', level: '中高强度', kcal: '~400' },
 { title: '韩小四 10分钟瘦臀腿改善膝超伸', duration: '10分钟', instructor: '韩小四', desc: '器械辅助臀腿训练', level: '入门', kcal: '~90' },
 { title: '帕梅拉 15分钟瘦腿内外侧', duration: '15分钟', instructor: '帕梅拉', desc: '健身房腿部塑形', level: '中强度', kcal: '~150' },
 ]),
 arm: _wrapWorkout([
 { title: '帕梅拉 手臂10分钟负重训练', duration: '10分钟', instructor: '帕梅拉', desc: '负重手臂训练，手臂线条', level: '中强度', kcal: '~100' },
 { title: '周六野 10分钟进阶丰胸运动', duration: '10分钟', instructor: '周六野', desc: '胸肌+手臂综合训练', level: '中强度', kcal: '~90' },
 { title: '美丽芭蕾 狂瘦上半身合集', duration: '20分钟', instructor: '美丽芭蕾', desc: '天鹅臂经典系列', level: '中强度', kcal: '~150' },
 ]),
 back: _wrapWorkout([
 { title: '每天10min 直角肩+少女背', duration: '10分钟', instructor: '', desc: '改善圆肩驼背，雕刻背部线条', level: '入门', kcal: '~80' },
 { title: '周六野 快速矫正驼背圆肩', duration: '12分钟', instructor: '周六野', desc: '体态改善必练', level: '入门', kcal: '~90' },
 { title: '10分钟改善斜方肌+溜肩圆肩', duration: '10分钟', instructor: '', desc: '肩颈背疼痛+高低肩一起改善', level: '入门', kcal: '~80' },
 ]),
 hip: _wrapWorkout([
 { title: '韩小四 每天5分钟甩掉小肚子+马甲线', duration: '5分钟', instructor: '韩小四', desc: '马甲线养成，躺床就能做', level: '入门', kcal: '~50' },
 { title: '帕梅拉 10分钟站立瘦腹+纤腿', duration: '10分钟', instructor: '帕梅拉', desc: '臀腿腹综合训练', level: '入门', kcal: '~100' },
 { title: '周六野 9分钟瘦大腿+HIIT', duration: '9分钟', instructor: '周六野', desc: '大腿内侧+臀部综合', level: '中强度', kcal: '~120' },
 ]),
 cardio: _wrapWorkout([
 { title: '帕梅拉 40分钟有氧踏步三部曲', duration: '40分钟', instructor: '帕梅拉', desc: '新手大基数友好', level: '中强度', kcal: '~350' },
 { title: '帕梅拉 30分钟新版三部曲', duration: '30分钟', instructor: '帕梅拉', desc: '电音心跳加速', level: '中高强度', kcal: '~300' },
 { title: '逗逗 60分钟金曲健身燃脂舞', duration: '60分钟', instructor: '逗逗', desc: '快乐燃脂，不痛苦', level: '中强度', kcal: '~500' },
 ]),
 stretch: _wrapWorkout([
 { title: '运动前后拉伸 缓解酸痛', duration: '15分钟', instructor: '', desc: '韩小四拉伸系列', level: '入门', kcal: '~50' },
 { title: '韩小四 站立腿部拉伸+泡沫轴', duration: '10分钟', instructor: '韩小四', desc: '告别肌肉腿/水肿腿', level: '入门', kcal: '~40' },
 { title: '帕梅拉 X 周六野 10分钟身心拉伸', duration: '10分钟', instructor: '帕梅拉 周六野', desc: '舒展脊背，优雅体态', level: '入门', kcal: '~40' },
 ]),
 },
 swim: {
 full: _wrapWorkout([
 { title: '15分钟全身初学者锻炼（游泳辅助）', duration: '15分钟', instructor: '', desc: '居家辅助训练，增强游泳体能', level: '入门', kcal: '~120' },
 { title: '帕梅拉 30分钟全身燃脂（游泳替代有氧）', duration: '30分钟', instructor: '帕梅拉', desc: '雨天替代游泳的居家有氧', level: '中强度', kcal: '~280' },
 ]),
 core: _wrapWorkout([
 { title: '周六野 五分钟瘦腰运动', duration: '5分钟', instructor: '周六野', desc: '核心稳定，辅助游泳姿态', level: '入门', kcal: '~40' },
 { title: '帕梅拉 10分钟腹肌训练', duration: '10分钟', instructor: '帕梅拉', desc: '核心力量增强', level: '入门', kcal: '~90' },
 ]),
 leg: _wrapWorkout([
 { title: '韩小四 10分钟瘦大腿', duration: '10分钟', instructor: '韩小四', desc: '腿部力量，改善打水效率', level: '入门', kcal: '~90' },
 { title: '帕梅拉 15分钟瘦腿内外侧', duration: '15分钟', instructor: '帕梅拉', desc: '腿部综合塑形', level: '中强度', kcal: '~150' },
 ]),
 arm: _wrapWorkout([
 { title: '周六野 5分钟瘦手臂', duration: '5分钟', instructor: '周六野', desc: '手臂力量，提升划水效率', level: '入门', kcal: '~40' },
 { title: '帕梅拉 手臂10分钟负重训练', duration: '10分钟', instructor: '帕梅拉', desc: '负重手臂训练', level: '中强度', kcal: '~100' },
 ]),
 back: _wrapWorkout([
 { title: '每天10min 直角肩+少女背', duration: '10分钟', instructor: '', desc: '背部力量，改善泳姿', level: '入门', kcal: '~80' },
 { title: '周六野 快速矫正驼背圆肩', duration: '12分钟', instructor: '周六野', desc: '体态改善，辅助游泳', level: '入门', kcal: '~90' },
 ]),
 cardio: _wrapWorkout([
 { title: '帕梅拉 30分钟经典燃脂三部曲', duration: '30分钟', instructor: '帕梅拉', desc: '游泳替代有氧训练', level: '中强度', kcal: '~280' },
 { title: '韩小四 30分钟站立无跑跳有氧', duration: '30分钟', instructor: '韩小四', desc: '低冲击有氧，游泳辅助', level: '入门', kcal: '~250' },
 ]),
 stretch: _wrapWorkout([
 { title: '运动前后拉伸 缓解酸痛', duration: '15分钟', instructor: '', desc: '游泳前后必做拉伸', level: '入门', kcal: '~50' },
 { title: '韩小四 站立腿部拉伸', duration: '10分钟', instructor: '韩小四', desc: '肩部+腿部伸展', level: '入门', kcal: '~40' },
 ]),
 hip: _wrapWorkout([
 { title: '韩小四 5分钟甩掉小肚子', duration: '5分钟', instructor: '韩小四', desc: '髋部灵活性训练', level: '入门', kcal: '~50' },
 { title: '韩小四 10分钟瘦臀腿', duration: '10分钟', instructor: '韩小四', desc: '改善髋部开合', level: '入门', kcal: '~90' },
 ]),
 },
 outdoor: {
 full: _wrapWorkout([
 { title: '帕梅拉 30分钟经典燃脂三部曲', duration: '30分钟', instructor: '帕梅拉', desc: '户外操场/公园即可跟练', level: '中强度', kcal: '~280' },
 { title: '15分钟全身初学者锻炼', duration: '15分钟', instructor: '', desc: '公园空地就能做，无需器械', level: '入门', kcal: '~120' },
 ]),
 core: _wrapWorkout([
 { title: '周六野 五分钟瘦腰运动', duration: '5分钟', instructor: '周六野', desc: '户外草地即可', level: '入门', kcal: '~40' },
 { title: '周六野 马甲线进阶版', duration: '12分钟', instructor: '周六野', desc: '公园长凳辅助', level: '进阶', kcal: '~110' },
 ]),
 leg: _wrapWorkout([
 { title: '周六野 9分钟瘦大腿+HIIT', duration: '9分钟', instructor: '周六野', desc: '爬楼梯+户外训练', level: '中强度', kcal: '~120' },
 { title: '韩小四 10分钟瘦大腿', duration: '10分钟', instructor: '韩小四', desc: '户外腿部塑形', level: '入门', kcal: '~90' },
 ]),
 arm: _wrapWorkout([
 { title: '周六野 5分钟瘦手臂', duration: '5分钟', instructor: '周六野', desc: '户外俯卧撑辅助', level: '入门', kcal: '~40' },
 { title: '意志健身 俯卧撑教学系列', duration: '15分钟', instructor: '意志健身', desc: '保姆级俯卧撑教学', level: '入门', kcal: '~80' },
 ]),
 back: _wrapWorkout([
 { title: '每天10min 直角肩+少女背', duration: '10分钟', instructor: '', desc: '公园单杠辅助背部训练', level: '入门', kcal: '~80' },
 { title: '周六野 快速矫正驼背圆肩', duration: '12分钟', instructor: '周六野', desc: '户外体态改善', level: '入门', kcal: '~90' },
 ]),
 hip: _wrapWorkout([
 { title: '韩小四 5分钟甩掉小肚子', duration: '5分钟', instructor: '韩小四', desc: '户外弓步走+核心', level: '入门', kcal: '~50' },
 { title: '帕梅拉 10分钟站立瘦腹+纤腿', duration: '10分钟', instructor: '帕梅拉', desc: '户外臀腿训练', level: '入门', kcal: '~100' },
 ]),
 cardio: _wrapWorkout([
 { title: '逗逗 60分钟金曲健身燃脂舞', duration: '60分钟', instructor: '逗逗', desc: '公园跟练，快乐燃脂', level: '中强度', kcal: '~500' },
 { title: '韩小四 30分钟站立有氧燃脂操', duration: '30分钟', instructor: '韩小四', desc: '户外有氧，新手友好', level: '入门', kcal: '~250' },
 ]),
 stretch: _wrapWorkout([
 { title: '运动前后拉伸 缓解酸痛', duration: '15分钟', instructor: '', desc: '公园草地拉伸', level: '入门', kcal: '~50' },
 { title: '帕梅拉 X 周六野 10分钟身心拉伸', duration: '10分钟', instructor: '帕梅拉 周六野', desc: '户外身心放松', level: '入门', kcal: '~40' },
 ]),
 },
};

// ============================================
// 像素头像库（PNG 文件名）
// ============================================
const PIXEL_AVATARS = [
 { id: "av_0a0950", file: "0a0950cdeb7b66a240c38b00c11d5395.png", name: "沉思猫" },
 { id: "av_1c280b", file: "1c280bbdd65d06b5e664175ab9ac69b4.png", name: "泪光猫" },
 { id: "av_2ac8f9", file: "2ac8f9325a5af6ed3f77501d6d1d6fb6.png", name: "微笑猫" },
 { id: "av_7c80a7", file: "7c80a70aeed609066e30be12e1ae51fa.png", name: "害羞猫" },
 { id: "av_7f8afd", file: "7f8afddb5e863c9c7ef95e4c49356f66.png", name: "眼镜猫" },
 { id: "av_50b0c1", file: "50b0c14c03be1d6bab6eabdadc12058a.png", name: "记号猫" },
 { id: "av_93bd58", file: "93bd58cc3a452b8b8c4bbe45bb556958.png", name: "闪电猫" },
 { id: "av_0932cd", file: "0932cdaca17d51e79a69ebb930649529.png", name: "荆棘猫" },
 { id: "av_713216", file: "7132168e66e8204922d710b561269aa2.png", name: "墨镜猫" },
 { id: "av_c2b975", file: "c2b9750f9f7ec39abc8664e2c13d3784.png", name: "祈祷猫" },
 { id: "av_d97bb7", file: "d97bb7cb32ce65846faf77921bfee12a.png", name: "温柔猫" },
 { id: "av_e22f0c", file: "e22f0c10d68698c28c4b6ac95ab13915.png", name: "乖巧猫" },
];

// 默认头像
const DEFAULT_AVATAR = "av_0a0950";

// ============================================
// 📚 文学关怀语录（按时段分类）
// ============================================
const LITERARY_GREETINGS = {
 morning: [
 "晨光熹微，又是新的一页等待落笔。 ——三毛",
 "早安。每一个清晨，都是世界对你说的『早安』。 ——泰戈尔",
 "清晨到来，便把昨夜的不安统统留在枕边。 ——村上春树",
 "愿你早晨醒来时，心里有光，纸上有字。 ——林清玄",
 "早起不一定是胜利，但容易看见奇迹。 ——汪曾祺",
 "生命，像晨光中一滴露珠，明亮而短暂。 ——简媜",
 "新的一天，愿你的故事比昨天更精彩。 ——张晓风",
 "早安。把今天过成你愿意记住的样子。 ——安东尼",
 ],
 noon: [
 "午后的光，是时间煮过的温柔。 ——舒国治",
 "日子不慌不忙，我们也不必焦急。 ——汪曾祺",
 "午饭的香味，是世界上最朴素的诗意。 ——蔡澜",
 "请你不要走得太快，等一等灵魂。 ——纪伯伦",
 "一个人吃饭，也是一种完整的享受。 ——吉本芭娜娜",
 "闲，才是生活的不急不徐。 ——梁实秋",
 "愿你午休后，世界仍是温柔的。 ——张晓风",
 "写作与吃饭一样，是日课，不可荒废。 ——村上春树",
 ],
 afternoon: [
 "午后阳光很好，适合与文字私会。 ——林清玄",
 "下午的茶，胜过清晨的酒。 ——周作人",
 "人之所以为人，是有不愿被催促的事。 ——汪曾祺",
 "一盏灯，一本书，一个下午。 ——梁实秋",
 "愿你永葆赤子之心，长夜也有星光。 ——冰心",
 "做一个明媚的人，不必向世界解释。 ——三毛",
 "慢一点，才能闻到生活的香气。 ——舒国治",
 "下午的我们，是早晨看不到的那一面。 ——简媜",
 ],
 evening: [
 "暮色四合时，星星开始营业。 ——蔡澜",
 "傍晚的光，是一日之中最诚实的颜色。 ——张晓风",
 "晚饭的烟火，是一天最温柔的句号。 ——汪曾祺",
 "夜色降临，请把心还给月光。 ——林清玄",
 "愿你日落之后，拥有一盏自己的灯。 ——梁实秋",
 "晚安，世界。把未说的话，留给星星。 ——纪伯伦",
 "一天将尽，回想自己，是最浪漫的事。 ——木心",
 "夜来了，不必害怕，灯下还有文字陪伴。 ——周作人",
 ],
 night: [
 "夜深时，所有的字都变得更诚实。 ——村上春树",
 "晚安，愿你做一个比醒来更美的梦。 ——简媜",
 "深夜是一天中最像自己的时间。 ——汪曾祺",
 "把今天的疲惫，统统交给被窝吧。 ——三毛",
 "星星不问赶路人，岁月不负有心人。 ——古龙",
 "夜深时读书，光与字互相取暖。 ——梁实秋",
 "睡不着的人，最懂夜的温柔。 ——林清玄",
 "晚安。把世界关在外面，留自己一盏灯。 ——木心",
 ],
};

// 写作专属关怀（不同时段穿插）
const WRITING_INSPIRATIONS = [
 "最好的写作，是生活本身。 ——汪曾祺",
 "写作是一场漫长的散步，与自己相遇。 ——村上春树",
 "每个写作者都有一条看不见的河。 ——三毛",
 "把第一个句子写下来，第二个就会来。 ——斯蒂芬·金",
 "故事从不逃离，逃离的只有不写的自己。 ——博尔赫斯",
 "灵感偏爱坚持写字的人。 ——林清玄",
 "写不出来时，去生活；生活不够时，去写。 ——张晓风",
 "人物一旦开口说话，故事就会自己走。 ——契诃夫",
];

// ============================================
// 关怀提醒（已替换为文学句子）
// ============================================
const CARE_REMINDERS = LITERARY_GREETINGS; // 向后兼容

// ============================================
// 🎓 英语学习目标
// ============================================
const ENGLISH_GOALS = [
 { id: 'CET4', name: '大学英语四级', icon: '', desc: '核心高频词', dailyCount: 20 },
 { id: 'CET6', name: '大学英语六级', icon: '', desc: '进阶学术词', dailyCount: 20 },
 { id: 'IELTS', name: '雅思 IELTS', icon: '', desc: '学术场景词', dailyCount: 20 },
 { id: 'TOEFL', name: '托福 TOEFL', icon: '', desc: '高阶学术词', dailyCount: 20 },
 { id: '考研', name: '考研英语', icon: '', desc: '大纲核心词', dailyCount: 20 },
 { id: 'free', name: '自由模式', icon: '', desc: '全部词汇池', dailyCount: 25 },
];

// ============================================
// 📚 英语单词池（按词根分组，带难度标签）
// 每个单词包含：音标、词性、词根、词源、释义、例句、同义词、搭配、难度等级
// ============================================
const ENGLISH_WORD_POOL = [
 // --- spect (看) ---
 { en:"spectacle", phonetic:"/ˈspektəkl/", pos:"n.", root:"spect(看)+-acle", etymology:"拉丁语 spectare 注视", cn:"壮观场面；奇观；(pl.)眼镜", examples:["The sunrise was a spectacular spectacle.","She wore her spectacles to read."], synonyms:["display","sight","marvel"], collocations:["make a spectacle of oneself","put on a spectacle"], levels:["CET6","IELTS","TOEFL","考研"] },
 { en:"introspection", phonetic:"/ˌɪntrəˈspekʃn/", pos:"n.", root:"intro-(向内)+spect(看)+-ion", etymology:"拉丁语 introspicere 内向审视", cn:"内省；反省", examples:["After the failure, he engaged in deep introspection.","Her poetry is full of quiet introspection."], synonyms:["self-examination","reflection","contemplation"], collocations:["deep introspection","engage in introspection"], levels:["IELTS","TOEFL","考研"] },
 { en:"perspective", phonetic:"/pəˈspektɪv/", pos:"n.", root:"per-(通过)+spect(看)+-ive", etymology:"拉丁语 perspicere 看透", cn:"视角；观点；透视法", examples:["From my perspective, the plan needs revision.","The novel offers a fresh perspective on war."], synonyms:["viewpoint","standpoint","angle"], collocations:["from a new perspective","broaden one's perspective"], levels:["CET4","CET6","IELTS","TOEFL","考研"] },
 { en:"retrospect", phonetic:"/ˈretrəspekt/", pos:"n./v.", root:"retro-(向后)+spect(看)", etymology:"拉丁语 retrospicere 回顾", cn:"回顾；追溯", examples:["In retrospect, I should have taken the job.","She retrospected on her college years."], synonyms:["reflection","review","reminiscence"], collocations:["in retrospect","retrospect on"], levels:["CET6","IELTS","TOEFL","考研"] },
 { en:"prospect", phonetic:"/ˈprɒspekt/", pos:"n./v.", root:"pro-(向前)+spect(看)", etymology:"拉丁语 prospicere 展望", cn:"前景；预期；勘探", examples:["Job prospects for graduates are improving.","The prospect of traveling excited her."], synonyms:["outlook","expectation","possibility"], collocations:["job prospects","in prospect"], levels:["CET4","CET6","IELTS","TOEFL","考研"] },
 { en:"spectator", phonetic:"/ˈspektətə/", pos:"n.", root:"spect(看)+-ator(人)", etymology:"拉丁语 spectator 观众", cn:"观众；旁观者", examples:["The stadium can hold 50,000 spectators.","A spectator caught the ball."], synonyms:["onlooker","viewer","witness"], collocations:["spectator sport","spectator stand"], levels:["CET4","CET6","IELTS"] },
 { en:"spectrum", phonetic:"/ˈspektrəm/", pos:"n.", root:"spect(看)+-rum", etymology:"拉丁语 spectrum 影像/光谱", cn:"光谱；范围；系列", examples:["The electromagnetic spectrum includes visible light.","A wide spectrum of opinions was heard."], synonyms:["range","scope","gamut"], collocations:["across the spectrum","political spectrum"], levels:["CET6","IELTS","TOEFL","考研"] },
 { en:"suspect", phonetic:"/səˈspekt/", pos:"v./n.", root:"sus-(下面)+spect(看)", etymology:"拉丁语 suspicere 从下面看→怀疑", cn:"怀疑；嫌疑犯", examples:["I suspect he is lying.","The police arrested the prime suspect."], synonyms:["doubt","mistrust","accused"], collocations:["prime suspect","suspect foul play"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"circumspect", phonetic:"/ˈsɜːkəmspekt/", pos:"adj.", root:"circum-(周围)+spect(看)", etymology:"拉丁语 circumspectus 环顾四周→谨慎", cn:"谨慎的；周到的", examples:["She was circumspect in her remarks.","A circumspect investor does thorough research."], synonyms:["cautious","prudent","wary"], collocations:["circumspect approach","circumspect manner"], levels:["TOEFL","考研"] },
 { en:"respectable", phonetic:"/rɪˈspektəbl/", pos:"adj.", root:"re-(回)+spect(看)+-able", etymology:"值得回头看→值得尊敬", cn:"体面的；可敬的；相当好的", examples:["He comes from a respectable family.","A respectable number of people attended."], synonyms:["decent","honorable","creditable"], collocations:["respectable distance","respectable income"], levels:["CET6","IELTS","考研"] },

 // --- port (搬运/携带) ---
 { en:"transport", phonetic:"/trænˈspɔːt/", pos:"v./n.", root:"trans-(跨越)+port(搬运)", etymology:"拉丁语 transportare 从一处搬到另一处", cn:"运输；交通", examples:["Goods are transported by truck.","Public transport in this city is excellent."], synonyms:["convey","carry","transfer"], collocations:["transport goods","public transport"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"deport", phonetic:"/dɪˈpɔːt/", pos:"v.", root:"de-(离开)+port(搬运)", etymology:"拉丁语 deportare 带走→驱逐", cn:"驱逐出境；放逐", examples:["The criminal was deported to his home country.","He was deported for violating immigration laws."], synonyms:["exile","expel","banish"], collocations:["deport to","deport for illegal entry"], levels:["IELTS","TOEFL","考研"] },
 { en:"import", phonetic:"/ˈɪmpɔːt/", pos:"v./n.", root:"im-(in)+port(搬运)", etymology:"拉丁语 importare 搬入", cn:"进口；输入；含义", examples:["China imports oil from the Middle East.","What are the imports of this statement?"], synonyms:["introduce","bring in"], collocations:["import from","import duty"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"portable", phonetic:"/ˈpɔːtəbl/", pos:"adj.", root:"port(搬运)+-able(能...的)", etymology:"拉丁语 portabilis 可搬运的", cn:"便携的；手提的", examples:["This portable charger is a lifesaver.","She always carries a portable laptop."], synonyms:["mobile","compact","lightweight"], collocations:["portable device","portable battery"], levels:["CET4","CET6","IELTS"] },
 { en:"report", phonetic:"/rɪˈpɔːt/", pos:"v./n.", root:"re-(回)+port(搬运)", etymology:"拉丁语 reportare 带回信息→汇报", cn:"报告；报道；汇报", examples:["She reported the incident to the police.","The annual report is due next week."], synonyms:["account","narrate","describe"], collocations:["report to","annual report"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"export", phonetic:"/ɪkˈspɔːt/", pos:"v./n.", root:"ex-(出)+port(搬运)", etymology:"拉丁语 exportare 搬出→出口", cn:"出口；输出", examples:["The country exports coffee and tea.","Software is a major export for India."], synonyms:["ship out","sell abroad"], collocations:["export to","export revenue"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"support", phonetic:"/səˈpɔːt/", pos:"v./n.", root:"sup-(下面)+port(搬运)", etymology:"拉丁语 supportare 从下面撑住→支持", cn:"支持；支撑；赞助", examples:["I support your decision.","Thank you for your support."], synonyms:["back","endorse","uphold"], collocations:["support a cause","in support of"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"portfolio", phonetic:"/pɔːtˈfəʊliəʊ/", pos:"n.", root:"port(搬运)+folio(页)", etymology:"意大利语 portafoglio 搬页→文件夹", cn:"作品集；投资组合", examples:["She showed her design portfolio at the interview.","His investment portfolio is diverse."], synonyms:["collection","compilation"], collocations:["design portfolio","investment portfolio"], levels:["IELTS","TOEFL","考研"] },
 { en:"important", phonetic:"/ɪmˈpɔːtnt/", pos:"adj.", root:"im-(in)+port(搬运)+-ant", etymology:"拉丁语 importans 带入→重要的", cn:"重要的；有影响的", examples:["Family is important to me.","This is an important decision."], synonyms:["significant","crucial","vital"], collocations:["important decision","important role"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"opportunity", phonetic:"/ˌɒpəˈtjuːnəti/", pos:"n.", root:"ob-(向)+port(港口)+-unity", etymology:"拉丁语 ob portum 在港口等风→时机", cn:"机会；时机", examples:["Don't miss this opportunity.","Equal opportunity for all."], synonyms:["chance","occasion","opening"], collocations:["seize the opportunity","equal opportunity"], levels:["CET4","CET6","IELTS","TOEFL","考研"] },

 // --- dict (说/言语) ---
 { en:"predict", phonetic:"/prɪˈdɪkt/", pos:"v.", root:"pre-(前)+dict(说)", etymology:"拉丁语 praedicere 提前说", cn:"预言；预测", examples:["Experts predict economic growth next year.","Can you predict the outcome?"], synonyms:["forecast","prophesy","anticipate"], collocations:["predict the outcome","hard to predict"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"dictate", phonetic:"/dɪkˈteɪt/", pos:"v.", root:"dict(说)+-ate(动词后缀)", etymology:"拉丁语 dictare 口述", cn:"口述；命令；支配", examples:["The boss dictated a letter to his secretary.","Don't dictate what I should do."], synonyms:["command","order","prescribe"], collocations:["dictate terms","dictate a letter"], levels:["CET6","IELTS","TOEFL","考研"] },
 { en:"contradict", phonetic:"/ˌkɒntrəˈdɪkt/", pos:"v.", root:"contra-(反对)+dict(说)", etymology:"拉丁语 contradicere 说反话", cn:"反驳；矛盾", examples:["His actions contradict his words.","Don't contradict me in public."], synonyms:["refute","oppose","deny"], collocations:["contradict oneself","contradict each other"], levels:["CET6","IELTS","TOEFL","考研"] },
 { en:"verdict", phonetic:"/ˈvɜːdɪkt/", pos:"n.", root:"ver(真实)+dict(说)", etymology:"拉丁语 veredictum 真实地说→裁决", cn:"裁决；判决；定论", examples:["The jury reached a verdict of not guilty.","What's your verdict on the new restaurant?"], synonyms:["judgment","decision","conclusion"], collocations:["reach a verdict","guilty verdict"], levels:["CET6","IELTS","TOEFL","考研"] },
 { en:"edict", phonetic:"/ˈiːdɪkt/", pos:"n.", root:"e-(出)+dict(说)", etymology:"拉丁语 edicere 说出→颁布", cn:"法令；敕令；布告", examples:["The emperor issued an edict banning the religion.","The royal edict changed history."], synonyms:["decree","ordinance","proclamation"], collocations:["issue an edict","royal edict"], levels:["TOEFL","考研"] },
 { en:"dictator", phonetic:"/dɪkˈteɪtə/", pos:"n.", root:"dict(说)+-ator(人)", etymology:"拉丁语 dictator 独断地说者", cn:"独裁者；命令者", examples:["The dictator ruled with an iron fist.","He acts like a dictator in the office."], synonyms:["tyrant","autocrat","despot"], collocations:["military dictator","benevolent dictator"], levels:["CET6","IELTS","考研"] },
 { en:"indicate", phonetic:"/ˈɪndɪkeɪt/", pos:"v.", root:"in-(向)+dic(说)+-ate", etymology:"拉丁语 indicare 指出", cn:"指示；表明；暗示", examples:["The arrow indicates the direction.","Studies indicate a link between diet and health."], synonyms:["show","signal","point out"], collocations:["indicate direction","indicate that"], levels:["CET4","CET6","IELTS","TOEFL","考研"] },
 { en:"dedicate", phonetic:"/ˈdedɪkeɪt/", pos:"v.", root:"de-(强调)+dic(说)+-ate", etymology:"拉丁语 dedicare 宣布奉献", cn:"奉献；致力于；题献", examples:["She dedicated her life to teaching.","This book is dedicated to my mother."], synonyms:["devote","commit","pledge"], collocations:["dedicate to","dedicated effort"], levels:["CET6","IELTS","TOEFL","考研"] },
 { en:"predicate", phonetic:"/ˈpredɪkət/", pos:"n./v.", root:"pre-(前)+dic(说)+-ate", etymology:"拉丁语 praedicare 断言", cn:"谓语；断言；基于", examples:["The predicate comes after the subject.","Your argument is predicated on false assumptions."], synonyms:["base","ground","found"], collocations:["predicate on","predicate logic"], levels:["TOEFL","考研"] },
 { en:"benediction", phonetic:"/ˌbenɪˈdɪkʃn/", pos:"n.", root:"bene-(好)+dict(说)+-ion", etymology:"拉丁语 benedictio 说好话→祝福", cn:"祝福；赐福", examples:["The priest gave his benediction.","Her benediction warmed our hearts."], synonyms:["blessing","consecration","grace"], collocations:["papal benediction","give one's benediction"], levels:["TOEFL"] },

 // --- ject (投掷) ---
 { en:"eject", phonetic:"/ɪˈdʒekt/", pos:"v.", root:"e-(出)+ject(投掷)", etymology:"拉丁语 eicere 投出", cn:"弹出；驱逐；喷射", examples:["The pilot ejected from the aircraft.","He was ejected from the bar for fighting."], synonyms:["expel","oust","discharge"], collocations:["eject from","eject button"], levels:["CET6","IELTS","TOEFL","考研"] },
 { en:"reject", phonetic:"/rɪˈdʒekt/", pos:"v./n.", root:"re-(回)+ject(投掷)", etymology:"拉丁语 rejicere 投回→拒绝", cn:"拒绝；驳回；不合格品", examples:["She rejected his offer of help.","The proposal was rejected by the committee."], synonyms:["refuse","decline","dismiss"], collocations:["reject a proposal","reject an offer"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"inject", phonetic:"/ɪnˈdʒekt/", pos:"v.", root:"in-(入)+ject(投掷)", etymology:"拉丁语 inicere 投入", cn:"注射；注入", examples:["The nurse injected the medicine into his arm.","They injected new life into the project."], synonyms:["infuse","insert","introduce"], collocations:["inject into","inject money"], levels:["CET6","IELTS","考研"] },
 { en:"project", phonetic:"/ˈprɒdʒekt/", pos:"n./v.", root:"pro-(向前)+ject(投掷)", etymology:"拉丁语 proicere 向前投", cn:"项目；投射；预测", examples:["The project is due next month.","She projected confidence during the interview."], synonyms:["plan","scheme","forecast"], collocations:["project management","project onto"], levels:["CET4","CET6","IELTS","TOEFL","考研"] },
 { en:"subject", phonetic:"/ˈsʌbdʒɪkt/", pos:"n./v./adj.", root:"sub-(下面)+ject(投掷)", etymology:"拉丁语 subjicere 投于旗下→使服从", cn:"主题；科目；使服从", examples:["What subject are you studying?","The plan is subject to approval."], synonyms:["topic","theme","subordinate"], collocations:["subject to","subject matter"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"object", phonetic:"/ˈɒbdʒɪkt/", pos:"n./v.", root:"ob-(对)+ject(投掷)", etymology:"拉丁语 objicere 投向→反对", cn:"物体；目标；反对", examples:["What is that object in the sky?","I object to this proposal."], synonyms:["item","target","oppose"], collocations:["object to","object of study"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"interject", phonetic:"/ˌɪntəˈdʒekt/", pos:"v.", root:"inter-(之间)+ject(投掷)", etymology:"拉丁语 interjicere 投入中间", cn:"插话；突然插入", examples:["He interjected a comment during the debate.","She interjected to clarify the point."], synonyms:["interrupt","insert","interpose"], collocations:["interject a remark","interject into"], levels:["TOEFL","考研"] },
 { en:"conjecture", phonetic:"/kənˈdʒektʃə/", pos:"n./v.", root:"con-(一起)+ject(投掷)+-ure", etymology:"拉丁语 conjectura 抛到一起→推测", cn:"推测；猜想", examples:["His theory is pure conjecture.","We can only conjecture about what happened."], synonyms:["speculation","guess","hypothesis"], collocations:["pure conjecture","conjecture about"], levels:["TOEFL","考研"] },
 { en:"projectile", phonetic:"/prəˈdʒektaɪl/", pos:"n.", root:"pro-(前)+ject(投)+-ile", etymology:"拉丁语 projicere 向前投之物", cn:"抛射物； projectile", examples:["The catapult launched a projectile.","A projectile hit the wall."], synonyms:["missile","bullet","shell"], collocations:["projectile motion","projectile weapon"], levels:["IELTS","TOEFL"] },
 { en:"trajectory", phonetic:"/trəˈdʒektəri/", pos:"n.", root:"tra-(跨)+ject(投)+-ory", etymology:"拉丁语 trajectus 跨越→轨迹", cn:"轨迹；弹道", examples:["The rocket followed a curved trajectory.","His career trajectory has been impressive."], synonyms:["path","course","orbit"], collocations:["career trajectory","flight trajectory"], levels:["TOEFL","考研"] },

 // --- tract (拉/拖) ---
 { en:"attract", phonetic:"/əˈtrækt/", pos:"v.", root:"at-(向)+tract(拉)", etymology:"拉丁语 attrahere 拉向", cn:"吸引；引起", examples:["The flowers attract bees.","Her smile attracted everyone's attention."], synonyms:["draw","appeal","lure"], collocations:["attract attention","attract investment"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"distract", phonetic:"/dɪˈstrækt/", pos:"v.", root:"dis-(分开)+tract(拉)", etymology:"拉丁语 distrahere 拉开→分散注意", cn:"分散；使分心", examples:["The noise distracted me from my work.","Don't distract the driver."], synonyms:["divert","confuse","disturb"], collocations:["distract from","distract attention"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"extract", phonetic:"/ɪkˈstrækt/", pos:"v./n.", root:"ex-(出)+tract(拉)", etymology:"拉丁语 extrahere 拉出", cn:"提取；摘录；萃取物", examples:["The dentist extracted the tooth.","She extracted a key quote from the article."], synonyms:["remove","draw out","excerpt"], collocations:["extract from","tooth extraction"], levels:["CET6","IELTS","TOEFL","考研"] },
 { en:"subtract", phonetic:"/səbˈtrækt/", pos:"v.", root:"sub-(下)+tract(拉)", etymology:"拉丁语 subtrahere 拉下→减去", cn:"减去；扣除", examples:["Subtract 5 from 10 and you get 5.","Taxes are subtracted from your salary."], synonyms:["deduct","remove","take away"], collocations:["subtract from","subtraction method"], levels:["CET4","CET6","IELTS"] },
 { en:"retract", phonetic:"/rɪˈtrækt/", pos:"v.", root:"re-(回)+tract(拉)", etymology:"拉丁语 retrahere 拉回", cn:"缩回；撤回；收回", examples:["The cat retracted its claws.","He retracted his earlier statement."], synonyms:["withdraw","revoke","recant"], collocations:["retract a statement","retract claws"], levels:["CET6","IELTS","TOEFL","考研"] },
 { en:"detract", phonetic:"/dɪˈtrækt/", pos:"v.", root:"de-(向下)+tract(拉)", etymology:"拉丁语 detrahere 拉走→贬低", cn:"贬低；减损", examples:["This flaw detracts from the painting's beauty.","Nothing can detract from her achievements."], synonyms:["diminish","belittle","disparage"], collocations:["detract from","detract value"], levels:["TOEFL","考研"] },
 { en:"protracted", phonetic:"/prəˈtræktɪd/", pos:"adj.", root:"pro-(向前)+tract(拉)+-ed", etymology:"拉丁语 protrahere 拉长", cn:"拖延的；持久的", examples:["The negotiations were long and protracted.","A protracted illness kept him in bed."], synonyms:["prolonged","extended","drawn-out"], collocations:["protracted negotiation","protracted war"], levels:["IELTS","TOEFL","考研"] },
 { en:"intractable", phonetic:"/ɪnˈtræktəbl/", pos:"adj.", root:"in-(不)+tract(拉)+-able", etymology:"拉丁语 intractabilis 拉不动→难处理的", cn:"难对付的；倔强的", examples:["An intractable problem requires creative thinking.","The child was loud and intractable."], synonyms:["unruly","stubborn","unmanageable"], collocations:["intractable problem","intractable pain"], levels:["TOEFL","考研"] },
 { en:"abstract", phonetic:"/ˈæbstrækt/", pos:"adj./n.", root:"abs-( away)+tract(拉)", etymology:"拉丁语 abstrahere 拉走→抽象", cn:"抽象的；摘要", examples:["Beauty is an abstract concept.","The paper's abstract summarizes the findings."], synonyms:["theoretical","conceptual","summary"], collocations:["abstract concept","abstract art"], levels:["CET4","CET6","IELTS","TOEFL","考研"] },
 { en:"contract", phonetic:"/ˈkɒntrækt/", pos:"n./v.", root:"con-(一起)+tract(拉)", etymology:"拉丁语 contrahere 拉到一起→收缩/契约", cn:"合同；收缩；感染", examples:["They signed a contract for the house.","Metals contract when cooled."], synonyms:["agreement","shrink","compress"], collocations:["sign a contract","contract muscles"], levels:["CET4","CET6","IELTS","考研"] },

 // --- vis/vid (看) ---
 { en:"visible", phonetic:"/ˈvɪzəbl/", pos:"adj.", root:"vis(看)+-ible(能)", etymology:"拉丁语 visibilis 可见的", cn:"可见的；明显的", examples:["Stars are visible on a clear night.","She has no visible injuries."], synonyms:["perceptible","observable","apparent"], collocations:["visible light","barely visible"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"invisible", phonetic:"/ɪnˈvɪzəbl/", pos:"adj.", root:"in-(不)+vis(看)+-ible", etymology:"拉丁语 invisibilis 不可见的", cn:"看不见的；无形的", examples:["Bacteria are invisible to the naked eye.","She felt an invisible barrier between them."], synonyms:["hidden","unseen","concealed"], collocations:["invisible ink","invisible hand"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"vision", phonetic:"/ˈvɪʒn/", pos:"n.", root:"vis(看)+-ion", etymology:"拉丁语 visio 视力/远见", cn:"视力；远见；愿景", examples:["She has perfect vision.","His vision for the company inspired everyone."], synonyms:["sight","foresight","dream"], collocations:["vision for the future","blurred vision"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"visual", phonetic:"/ˈvɪʒuəl/", pos:"adj.", root:"vis(看)+-ual", etymology:"拉丁语 visualis 视觉的", cn:"视觉的；看的", examples:["The film has stunning visual effects.","Visual learning works best for me."], synonyms:["optical","sight-related","graphic"], collocations:["visual arts","visual effects"], levels:["CET4","CET6","IELTS"] },
 { en:"revise", phonetic:"/rɪˈvaɪz/", pos:"v.", root:"re-(再)+vis(看)", etymology:"拉丁语 revisere 再看→修订", cn:"修订；复习；修改", examples:["I need to revise my essay.","She revised for the exam all weekend."], synonyms:["review","amend","edit"], collocations:["revise for an exam","revise a draft"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"supervise", phonetic:"/ˈsuːpəvaɪz/", pos:"v.", root:"super-(上面)+vis(看)", etymology:"拉丁语 supervidere 从上面看→监督", cn:"监督；管理；指导", examples:["She supervises a team of 20 people.","The teacher supervised the exam."], synonyms:["oversee","manage","direct"], collocations:["supervise work","supervise students"], levels:["CET6","IELTS","TOEFL","考研"] },
 { en:"evident", phonetic:"/ˈevɪdənt/", pos:"adj.", root:"e-(出)+vid(看)+-ent", etymology:"拉丁语 evidens 看出来的→明显的", cn:"明显的；显然的", examples:["It was evident that she was unhappy.","His talent was evident from a young age."], synonyms:["obvious","apparent","clear"], collocations:["evident that","self-evident"], levels:["CET6","IELTS","TOEFL","考研"] },
 { en:"provide", phonetic:"/prəˈvaɪd/", pos:"v.", root:"pro-(前)+vid(看)", etymology:"拉丁语 providere 提前看到→预备→提供", cn:"提供；供给；规定", examples:["The school provides free lunches.","The contract provides for annual leave."], synonyms:["supply","furnish","equip"], collocations:["provide for","provide with"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"envision", phonetic:"/ɪnˈvɪʒn/", pos:"v.", root:"en-(使)+vis(看)+-ion", etymology:"en- + vision 使看见→想象", cn:"想象；预想；展望", examples:["She envisioned a better future for her children.","Can you envision the final product?"], synonyms:["imagine","visualize","foresee"], collocations:["envision a future","envision doing"], levels:["IELTS","TOEFL","考研"] },
 { en:"prevail", phonetic:"/prɪˈveɪl/", pos:"v.", root:"pre-(前)+vail(=val力量)", etymology:"拉丁语 praevalere 更有力量→胜过", cn:"盛行；获胜；说服", examples:["Justice will prevail in the end.","The prevailing wind is from the west."], synonyms:["triumph","predominate","win"], collocations:["prevail over","prevail upon"], levels:["CET6","IELTS","TOEFL","考研"] },

 // --- mit/miss (送/发) ---
 { en:"submit", phonetic:"/səbˈmɪt/", pos:"v.", root:"sub-(下)+mit(送)", etymology:"拉丁语 submittere 送到下面→提交", cn:"提交；屈服；主张", examples:["Please submit your report by Friday.","They refused to submit to the enemy."], synonyms:["present","yield","surrender"], collocations:["submit a report","submit to"], levels:["CET4","CET6","IELTS","TOEFL","考研"] },
 { en:"permit", phonetic:"/pəˈmɪt/", pos:"v./n.", root:"per-(通过)+mit(送)", etymology:"拉丁语 permittere 允许通过", cn:"许可；允许；许可证", examples:["Smoking is not permitted here.","You need a permit to park."], synonyms:["allow","authorize","license"], collocations:["permit to do","work permit"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"emit", phonetic:"/iˈmɪt/", pos:"v.", root:"e-(出)+mit(送)", etymology:"拉丁语 emittere 送出", cn:"发出；发射；散发", examples:["The sun emits light and heat.","The factory was fined for emitting pollutants."], synonyms:["release","discharge","radiate"], collocations:["emit radiation","emit gas"], levels:["CET6","IELTS","TOEFL","考研"] },
 { en:"transmit", phonetic:"/trænsˈmɪt/", pos:"v.", root:"trans-(跨)+mit(送)", etymology:"拉丁语 transmittere 传送", cn:"传送；传播；传达", examples:["The signal is transmitted via satellite.","Mosquitoes transmit malaria."], synonyms:["convey","broadcast","transfer"], collocations:["transmit data","transmit disease"], levels:["CET4","CET6","IELTS","TOEFL","考研"] },
 { en:"dismiss", phonetic:"/dɪsˈmɪs/", pos:"v.", root:"dis-(离开)+miss(送)", etymology:"拉丁语 dimittere 打发走", cn:"驳回；解雇；不予考虑", examples:["The judge dismissed the case.","He dismissed the idea as ridiculous."], synonyms:["reject","discharge","discard"], collocations:["dismiss a case","dismiss concerns"], levels:["CET4","CET6","IELTS","TOEFL","考研"] },
 { en:"admit", phonetic:"/ədˈmɪt/", pos:"v.", root:"ad-(向)+mit(送)", etymology:"拉丁语 admittere 允许进入", cn:"承认；准许进入", examples:["He admitted his mistake.","The ticket admits one person."], synonyms:["confess","acknowledge","concede"], collocations:["admit to","admit defeat"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"commit", phonetic:"/kəˈmɪt/", pos:"v.", root:"com-(一起)+mit(送)", etymology:"拉丁语 committere 交托→承诺", cn:"承诺；犯(罪)；投入", examples:["She committed herself to the project.","He committed a serious crime."], synonyms:["pledge","undertake","perpetrate"], collocations:["commit to","commit a crime"], levels:["CET4","CET6","IELTS","TOEFL","考研"] },
 { en:"omit", phonetic:"/əˈmɪt/", pos:"v.", root:"o-(=ob离开)+mit(送)", etymology:"拉丁语 omittere 放开→省略", cn:"省略；遗漏；忽略", examples:["He omitted an important detail.","You can omit the salt in this recipe."], synonyms:["exclude","neglect","skip"], collocations:["omit from","omit to mention"], levels:["CET6","IELTS","TOEFL","考研"] },
 { en:"mission", phonetic:"/ˈmɪʃn/", pos:"n.", root:"miss(送)+-ion", etymology:"拉丁语 missio 派遣→任务", cn:"任务；使命；代表团", examples:["Their mission was to rescue the hostages.","A trade mission visited China."], synonyms:["assignment","task","delegation"], collocations:["mission impossible","diplomatic mission"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"compromise", phonetic:"/ˈkɒmprəmaɪz/", pos:"n./v.", root:"com-(一起)+pro(前)+mise(送)", etymology:"拉丁语 compromittere 相互承诺→妥协", cn:"妥协；折中；损害", examples:["We reached a compromise on the price.","Don't compromise your principles."], synonyms:["concession","settlement","endanger"], collocations:["reach a compromise","compromise on"], levels:["CET6","IELTS","TOEFL","考研"] },

 // --- fer (带来/承载) ---
 { en:"refer", phonetic:"/rɪˈfɜː/", pos:"v.", root:"re-(回)+fer(带)", etymology:"拉丁语 referre 带回→提及", cn:"参考；提及；指向", examples:["Please refer to the manual.","The symbol refers to peace."], synonyms:["mention","cite","allude"], collocations:["refer to","refer back"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"prefer", phonetic:"/prɪˈfɜː/", pos:"v.", root:"pre-(前)+fer(带)", etymology:"拉丁语 praeferre 带到前面→更喜欢", cn:"更喜欢；宁愿", examples:["I prefer tea to coffee.","She prefers to work alone."], synonyms:["favor","choose","opt for"], collocations:["prefer to","prefer A to B"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"transfer", phonetic:"/trænsˈfɜː/", pos:"v./n.", root:"trans-(跨)+fer(带)", etymology:"拉丁语 transferre 带过去→转移", cn:"转移；转让；换乘", examples:["She transferred to a new school.","The money was transferred to my account."], synonyms:["move","relocate","shift"], collocations:["transfer to","bank transfer"], levels:["CET4","CET6","IELTS","TOEFL","考研"] },
 { en:"offer", phonetic:"/ˈɒfə/", pos:"v./n.", root:"of-(=ob对)+fer(带)", etymology:"拉丁语 offerre 带到面前→提供", cn:"提供；提议；报价", examples:["He offered me a cup of tea.","Thank you for your kind offer."], synonyms:["propose","present","volunteer"], collocations:["offer a job","make an offer"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"differ", phonetic:"/ˈdɪfə/", pos:"v.", root:"dif-(分开)+fer(带)", etymology:"拉丁语 differre 分开带→不同", cn:"不同；相异；意见不合", examples:["Their opinions differ on this issue.","The two models differ in price."], synonyms:["vary","diverge","disagree"], collocations:["differ from","differ in"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"suffer", phonetic:"/ˈsʌfə/", pos:"v.", root:"suf-(下面)+fer(带)", etymology:"拉丁语 sufferi 承受→受苦", cn:"受苦；患病；遭受", examples:["She suffers from migraines.","The company suffered huge losses."], synonyms:["endure","experience","tolerate"], collocations:["suffer from","suffer losses"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"infer", phonetic:"/ɪnˈfɜː/", pos:"v.", root:"in-(入)+fer(带)", etymology:"拉丁语 inferre 带入→推断", cn:"推断；推论；暗示", examples:["From his tone, I inferred he was angry.","Can you infer the meaning from context?"], synonyms:["deduce","conclude","derive"], collocations:["infer from","infer that"], levels:["CET6","IELTS","TOEFL","考研"] },
 { en:"confer", phonetic:"/kənˈfɜː/", pos:"v.", root:"con-(一起)+fer(带)", etymology:"拉丁语 conferre 带到一起→商议", cn:"商议；授予；赋予", examples:["The committee conferred for three hours.","The university conferred a degree on her."], synonyms:["consult","discuss","bestow"], collocations:["confer with","confer a degree"], levels:["CET6","IELTS","TOEFL","考研"] },
 { en:"defer", phonetic:"/dɪˈfɜː/", pos:"v.", root:"de-(向下)+fer(带)", etymology:"拉丁语 deferre 带下→推迟/服从", cn:"推迟；延期；听从", examples:["The decision was deferred to next week.","I defer to your expertise in this matter."], synonyms:["postpone","delay","yield"], collocations:["defer to","defer payment"], levels:["IELTS","TOEFL","考研"] },
 { en:"proliferate", phonetic:"/prəˈlɪfəreɪt/", pos:"v.", root:"pro-(向前)+lifer(后代)+-ate", etymology:"拉丁语 proliferare 繁殖", cn:"激增；繁殖；扩散", examples:["Online scams have proliferated in recent years.","Cancer cells proliferate rapidly."], synonyms:["multiply","increase","spread"], collocations:["proliferate rapidly","proliferation of"], levels:["TOEFL","考研"] },

 // --- duc/duct (引导) ---
 { en:"conduct", phonetic:"/kənˈdʌkt/", pos:"v./n.", root:"con-(一起)+duct(引导)", etymology:"拉丁语 conducere 引到一起→引导", cn:"进行；指挥；行为", examples:["The scientist conducted an experiment.","His conduct was unprofessional."], synonyms:["perform","direct","behavior"], collocations:["conduct research","code of conduct"], levels:["CET4","CET6","IELTS","TOEFL","考研"] },
 { en:"deduct", phonetic:"/dɪˈdʌkt/", pos:"v.", root:"de-(向下)+duct(引导)", etymology:"拉丁语 deducere 引下→减去", cn:"扣除；减去", examples:["Tax is deducted from your salary.","You can deduct travel expenses."], synonyms:["subtract","withhold","remove"], collocations:["deduct from","tax-deductible"], levels:["CET6","IELTS","TOEFL","考研"] },
 { en:"produce", phonetic:"/prəˈdjuːs/", pos:"v./n.", root:"pro-(前)+duc(引导)", etymology:"拉丁语 producere 向前引→生产", cn:"生产；产生；农产品", examples:["The factory produces cars.","Local produce is fresher."], synonyms:["manufacture","generate","yield"], collocations:["produce results","farm produce"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"reduce", phonetic:"/rɪˈdjuːs/", pos:"v.", root:"re-(回)+duc(引导)", etymology:"拉丁语 reducere 引回→减少", cn:"减少；降低；缩小", examples:["We need to reduce our carbon footprint.","The price was reduced by 20%."], synonyms:["decrease","diminish","lower"], collocations:["reduce costs","reduce risk"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"introduce", phonetic:"/ˌɪntrəˈdjuːs/", pos:"v.", root:"intro-(向内)+duc(引导)", etymology:"拉丁语 introducere 引入", cn:"介绍；引进；推行", examples:["Let me introduce my friend to you.","The company introduced a new policy."], synonyms:["present","launch","implement"], collocations:["introduce to","introduce a bill"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"educate", phonetic:"/ˈedʒukeɪt/", pos:"v.", root:"e-(出)+duc(引导)+-ate", etymology:"拉丁语 educare 引出→教育", cn:"教育；培养；训练", examples:["She was educated at Oxford.","We must educate people about climate change."], synonyms:["teach","train","instruct"], collocations:["educate about","well-educated"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"induce", phonetic:"/ɪnˈdjuːs/", pos:"v.", root:"in-(入)+duc(引导)", etymology:"拉丁语 inducere 引入→诱导", cn:"诱导；引起；催产", examples:["Stress can induce health problems.","The doctor induced labor."], synonyms:["cause","prompt","trigger"], collocations:["induce sleep","induce labor"], levels:["CET6","IELTS","TOEFL","考研"] },
 { en:"seduce", phonetic:"/sɪˈdjuːs/", pos:"v.", root:"se-(离开)+duc(引导)", etymology:"拉丁语 seducere 引开→诱惑", cn:"诱惑；吸引；唆使", examples:["The idea seduced him into investing.","She was seduced by the promise of fame."], synonyms:["lure","entice","tempt"], collocations:["seduce into","seduced by"], levels:["IELTS","TOEFL","考研"] },
 { en:"aqueduct", phonetic:"/ˈækwɪdʌkt/", pos:"n.", root:"aque(水)+duct(引导)", etymology:"拉丁语 aquaeductus 引水道", cn:"渡槽；水道", examples:["The Roman aqueduct still stands today.","Water flows through the aqueduct."], synonyms:["waterway","channel","conduit"], collocations:["Roman aqueduct","build an aqueduct"], levels:["TOEFL"] },
 { en:"viaduct", phonetic:"/ˈvaɪədʌkt/", pos:"n.", root:"via(路)+duct(引导)", etymology:"拉丁语 viaductus 道路桥", cn:"高架桥；栈道", examples:["The train crossed the viaduct.","A spectacular viaduct spans the valley."], synonyms:["overpass","flyover","bridge"], collocations:["railway viaduct","stone viaduct"], levels:["IELTS","TOEFL"] },

 // --- scrib/script (写) ---
 { en:"describe", phonetic:"/dɪˈskraɪb/", pos:"v.", root:"de-(下)+scrib(写)", etymology:"拉丁语 describere 写下→描述", cn:"描述；描写；形容", examples:["Can you describe the suspect?","She described the scene in vivid detail."], synonyms:["depict","portray","characterize"], collocations:["describe as","describe in detail"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"prescribe", phonetic:"/prɪˈskraɪb/", pos:"v.", root:"pre-(前)+scrib(写)", etymology:"拉丁语 praescribera 预先写→开处方", cn:"开处方；规定；指定", examples:["The doctor prescribed antibiotics.","The law prescribes a minimum age."], synonyms:["recommend","stipulate","ordain"], collocations:["prescribe medicine","prescribe by law"], levels:["CET6","IELTS","TOEFL","考研"] },
 { en:"subscribe", phonetic:"/səbˈskraɪb/", pos:"v.", root:"sub-(下)+scrib(写)", etymology:"拉丁语 subscribere 签名于下→订阅", cn:"订阅；赞成；捐赠", examples:["I subscribe to several magazines.","Do you subscribe to that theory?"], synonyms:["endorse","support","sign up"], collocations:["subscribe to","subscribe a newsletter"], levels:["CET6","IELTS","TOEFL","考研"] },
 { en:"transcript", phonetic:"/ˈtrænskrɪpt/", pos:"n.", root:"trans-(跨)+script(写)", etymology:"拉丁语 transcriptum 抄写本", cn:"抄本；成绩单；文字稿", examples:["I need my college transcript for the application.","The transcript of the interview is attached."], synonyms:["copy","record","notation"], collocations:["academic transcript","interview transcript"], levels:["IELTS","TOEFL","考研"] },
 { en:"manuscript", phonetic:"/ˈmænjʊskrɪpt/", pos:"n.", root:"manu(手)+script(写)", etymology:"拉丁语 manuscriptum 手写稿", cn:"手稿；原稿；手抄本", examples:["The library has ancient manuscripts.","She submitted her manuscript to the publisher."], synonyms:["document","draft","text"], collocations:["original manuscript","unpublished manuscript"], levels:["IELTS","TOEFL","考研"] },
 { en:"inscription", phonetic:"/ɪnˈskrɪpʃn/", pos:"n.", root:"in-(上)+script(写)+-ion", etymology:"拉丁语 inscriptio 刻写", cn:"铭文；题词；碑文", examples:["The inscription on the tomb was in Latin.","A golden inscription adorned the gate."], synonyms:["engraving","epigraph","legend"], collocations:["ancient inscription","stone inscription"], levels:["TOEFL","考研"] },
 { en:"circumscribe", phonetic:"/ˈsɜːkəmskraɪb/", pos:"v.", root:"circum-(周围)+scrib(写)", etymology:"拉丁语 circumscribere 画圈→限制", cn:"限制；限定；画圈", examples:["The rules circumscribe what students can do.","Her ambition was circumscribed by lack of money."], synonyms:["limit","restrict","confine"], collocations:["circumscribe by","circumscribe authority"], levels:["TOEFL","考研"] },
 { en:"postscript", phonetic:"/ˈpəʊstskrɪpt/", pos:"n.", root:"post-(后)+script(写)", etymology:"拉丁语 postscriptum 写在后面→附言", cn:"附言；后记", examples:["She added a postscript to her letter.","P.S. is short for postscript."], synonyms:["afterword","addendum","note"], collocations:["add a postscript","letter postscript"], levels:["CET6","IELTS"] },
 { en:"ascribe", phonetic:"/əˈskraɪb/", pos:"v.", root:"a-(向)+scrib(写)", etymology:"拉丁语 ascribere 归于名下→归因", cn:"归因于；归属于", examples:["He ascribed his success to hard work.","The painting is ascribed to Picasso."], synonyms:["attribute","assign","credit"], collocations:["ascribe to","ascribe success to"], levels:["CET6","IELTS","TOEFL","考研"] },
 { en:"conscription", phonetic:"/kənˈskrɪpʃn/", pos:"n.", root:"con-(一起)+script(写)+-ion", etymology:"拉丁语 conscriptio 征召入伍", cn:"征兵；征召", examples:["Conscription was abolished in 2001.","He was called up for conscription."], synonyms:["draft","enlistment","muster"], collocations:["military conscription","conscription into"], levels:["TOEFL","考研"] },

 // --- vert/vers (转) ---
 { en:"convert", phonetic:"/kənˈvɜːt/", pos:"v.", root:"con-(一起)+vert(转)", etymology:"拉丁语 convertere 转变", cn:"转换；改变信仰；兑换", examples:["They converted the garage into a studio.","She converted to Buddhism."], synonyms:["transform","change","adapt"], collocations:["convert to","convert into"], levels:["CET4","CET6","IELTS","TOEFL","考研"] },
 { en:"divert", phonetic:"/daɪˈvɜːt/", pos:"v.", root:"di-(分开)+vert(转)", etymology:"拉丁语 divertere 转开→转移", cn:"转移；使转向；娱乐", examples:["The traffic was diverted to a side road.","The game diverted the children for hours."], synonyms:["redirect","distract","entertain"], collocations:["divert to","divert attention"], levels:["CET6","IELTS","TOEFL","考研"] },
 { en:"invert", phonetic:"/ɪnˈvɜːt/", pos:"v.", root:"in-(颠倒)+vert(转)", etymology:"拉丁语 invertere 翻转", cn:"倒置；颠倒；反转", examples:["If you invert the cup, water spills out.","She inverted the traditional hierarchy."], synonyms:["reverse","flip","overturn"], collocations:["invert the order","invert a matrix"], levels:["IELTS","TOEFL","考研"] },
 { en:"revert", phonetic:"/rɪˈvɜːt/", pos:"v.", root:"re-(回)+vert(转)", etymology:"拉丁语 revertere 转回→恢复", cn:"恢复；回到；归属", examples:["The land reverted to the crown.","She reverted to her old habits."], synonyms:["return","regress","revert"], collocations:["revert to","revert back"], levels:["CET6","IELTS","TOEFL","考研"] },
 { en:"diverse", phonetic:"/daɪˈvɜːs/", pos:"adj.", root:"di-(分开)+vers(转)", etymology:"拉丁语 diversus 转向不同方向→多样的", cn:"多样的；不同的", examples:["The city has a diverse population.","We offer a diverse range of products."], synonyms:["varied","different","multifaceted"], collocations:["diverse population","culturally diverse"], levels:["CET4","CET6","IELTS","TOEFL","考研"] },
 { en:"reverse", phonetic:"/rɪˈvɜːs/", pos:"v./adj.", root:"re-(回)+vers(转)", etymology:"拉丁语 revertere 转回→反转", cn:"反转；颠倒；相反的", examples:["She reversed the car into the garage.","The court reversed the earlier decision."], synonyms:["invert","overturn","backward"], collocations:["reverse the decision","in reverse"], levels:["CET4","CET6","IELTS","考研"] },
 { en:"adversary", phonetic:"/ˈædvəsəri/", pos:"n.", root:"ad-(对)+vers(转)+-ary", etymology:"拉丁语 adversarius 转向对立→对手", cn:"对手；敌手", examples:["He faced his adversary in court.","A formidable adversary on the chessboard."], synonyms:["opponent","rival","enemy"], collocations:["formidable adversary","political adversary"], levels:["CET6","IELTS","TOEFL","考研"] },
 { en:"versatile", phonetic:"/ˈvɜːsətaɪl/", pos:"adj.", root:"vers(转)+-atile", etymology:"拉丁语 versatilis 可转动的→多才多艺", cn:"多才多艺的；多功能的", examples:["She is a versatile actress.","A versatile tool for any kitchen."], synonyms:["adaptable","flexible","all-around"], collocations:["versatile player","versatile material"], levels:["CET6","IELTS","TOEFL","考研"] },
 { en:"aversion", phonetic:"/əˈvɜːʃn/", pos:"n.", root:"a-(离)+vers(转)+-ion", etymology:"拉丁语 aversio 转离→厌恶", cn:"厌恶；反感", examples:["She has an aversion to spiders.","His aversion to risk cost him opportunities."], synonyms:["dislike","repugnance","antipathy"], collocations:["aversion to","risk aversion"], levels:["IELTS","TOEFL","考研"] },
 { en:"traverse", phonetic:"/trəˈvɜːs/", pos:"v.", root:"tra-(跨)+vers(转)", etymology:"拉丁语 traversare 横越", cn:"横越；穿过；往返", examples:["They traversed the desert on foot.","The bridge traverses the river."], synonyms:["cross","navigate","span"], collocations:["traverse the terrain","traverse a graph"], levels:["TOEFL","考研"] },
];

// ============================================
// 📊 三丽鸥图标映射
// ============================================
const SANRIO_ICON = {
 dashboard: { emoji: "🏠", sanrio: "", name: "My Melody的桌面" },
 schedule: { emoji: "📅", sanrio: "", name: "Hello Kitty的日程" },
 diary: { emoji: "📖", sanrio: "", name: "小双子星的日记" },
 reading: { emoji: "📚", sanrio: "📖", name: "Cinnamoroll的阅读" },
 inspiration: { emoji: "💡", sanrio: "💡", name: "Pompompurin's灵感" },
 english: { emoji: "🎓", sanrio: "", name: "My Melody的英语角" },
 hr: { emoji: "👥", sanrio: "", name: "Kuromi的HR课堂" },
 talentPool: { emoji: "", sanrio: "", name: "Talent Pool 人才库" },
 fitness: { emoji: "💪", sanrio: "", name: "Keroppi的健身房" },
 portfolio: { emoji: "🎮", sanrio: "⭐", name: "小双子星的作品集" },
 finance: { emoji: "", sanrio: "", name: "Tuxedo的账本" },
 settings: { emoji: "", sanrio: "", name: "Hello Kitty的设置" },
};

// 暴露到 window
window.APP_DATA = {
 DAILY_BOOKS,
 BOOK_TYPES,
 BOOK_ONLINE_LIBRARY,
 BOOK_ONLINE_QUERY,
 _weixinReadSearch,
 INSPIRATION_POOL,
 INSPIRATION_CATEGORIES,
 INSPIRATION_PLATFORMS,
 INSPIRATION_PROFILE,
 INSPIRATION_CONTEXT,
 ENGLISH_DAILY,
 ENGLISH_GOALS,
 ENGLISH_WORD_POOL,
 HR_DAILY,
 WORKOUT_RECOMMEND,
 PIXEL_AVATARS,
 LITERARY_GREETINGS,
 WRITING_INSPIRATIONS,
 DEFAULT_AVATAR,
 CARE_REMINDERS,
 SANRIO_ICON,
};

