/* ============================================================
   太阳系 · 3D 运转演示  (纯 Canvas 实现，零依赖，可断网双击运行)
   - 太阳居中；八大行星按真实相对距离(压缩)与真实相对公转/自转周期绕转
   - 鼠标滚轮缩放、拖动旋转视角；速度滑块；行星名字标签
   - 轨道先用圆；自转按"相对快慢 + 整体加速"(⚠️ 待定项，见 index.html 底部标注)
   ============================================================ */

/* ---------- 向量小工具 ---------- */
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const norm = (a) => {
  const l = Math.hypot(a.x, a.y, a.z) || 1;
  return { x: a.x / l, y: a.y / l, z: a.z / l };
};
const ORIGIN = { x: 0, y: 0, z: 0 };
const UP = { x: 0, y: 1, z: 0 };

/* ---------- 颜色处理 ---------- */
function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function adjust(hex, p) {
  const c = hexToRgb(hex);
  let r, g, b;
  if (p > 0) { r = c.r + (255 - c.r) * p; g = c.g + (255 - c.g) * p; b = c.b + (255 - c.b) * p; }
  else { r = c.r * (1 + p); g = c.g * (1 + p); b = c.b * (1 + p); }
  const f = (v) => ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2);
  return '#' + f(r) + f(g) + f(b);
}

/* ---------- 行星数据（真实天文数据，按比例压缩可视化） ---------- */
// 轨道半径：用幂律压缩，外行星明显收进画面、内行星基本不动（示意比例）
//   orbit = ORBIT_K * au^ORBIT_EXP
//   ORBIT_EXP<1 让外圈相对"压扁"：海王星(30AU)不再被拉到水星(0.39AU)的 77 倍远
const ORBIT_K = 48;
const ORBIT_EXP = 0.8;
const EARTH_KM = 6371;
const ORBIT_ACCEL = 30.4;        // 公转整体加速：地球约 12 秒/圈（保持相对快慢）
const SPIN_ACCEL = 8.0;          // 自转整体加速（⚠️ 待定项）

// 各天体表面重力（相对地球 = 1，真实天文数据），用于详情页「体重体验」小工具
const SURFACE_G = {
  '水星': 0.38, '金星': 0.90, '地球': 1.00, '火星': 0.38,
  '木星': 2.53, '土星': 1.07, '天王星': 0.89, '海王星': 1.14,
  '太阳': 27.9, '月球': 0.166, '小行星带': null,
};

const PLANETS = [
  { name: '水星', au: 0.39,  period: 87.97,    rot: 1407.6,  km: 2440,   color: '#9c8e80', spinDir:  1,
    tagline: '离太阳最近的「小火炉」，一天竟比一年还长',
    stats: ['距太阳 ≈ 0.39 AU（约 5800 万 km）', '公转一圈：88 天', '自转一周：约 59 天', '卫星数：0'],
    facts: [
      '太阳系里最小、离太阳最近的行星，表面布满陨石坑，样子很像月亮。',
      '几乎没有大气保温，昼夜温差极其夸张：白天约 430℃，夜里降到约 -180℃。',
      '公转很快（88 天一圈），但自转很慢，一个「水星日」比它的「年」还长。',
      '因为离太阳太近、白天被烤得滚烫，探测器也只能远远探测它。',
    ],
    childExplain: '水星是离太阳最近的小不点。它白天被太阳烤得滚烫（430℃），晚上又冷到结冰（-180℃），因为它没有大气这床「被子」保暖。它跑得最快，88 天就绕太阳一圈，可自己转得超慢——一个「白天」比它的一「年」还长！',
    quiz: [
      { q: '水星为什么白天热、晚上冷？', a: [['没有大气保温', 1], ['离地球太远', 0], ['它自己会发热', 0]], why: '水星几乎没有大气这层「被子」，太阳一晒就烫、太阳一走就冻，所以温差极大。' },
      { q: '水星绕太阳一圈要多久？', a: [['约 88 天', 1], ['一整年', 0], ['10 年', 0]], why: '水星离太阳最近、跑得最快，88 天就绕太阳一圈。' },
    ] },
  { name: '金星', au: 0.72,  period: 224.70,   rot: 5832.5,  km: 6052,   color: '#e6c178', spinDir: -1,
    tagline: '被厚云裹住的「地狱姊妹」，还倒着慢转',
    stats: ['距太阳 ≈ 0.72 AU', '公转一圈：225 天', '自转一周：243 天（反向）', '卫星数：0'],
    facts: [
      '大小和地球几乎一样，被称为「地球的姊妹星」。',
      '浓厚的二氧化碳大气造成失控的温室效应，表面约 465℃，是太阳系最热的行星。',
      '自转方向和别的行星相反（自东向西），而且慢得惊人，一天比一年还长。',
      '云层太厚，过去人们一直看不清它的表面，还曾误以为上面有海洋和生命。',
    ],
    childExplain: '金星是地球的「双胞胎姐姐」，大小差不多，但脾气超坏！它被厚厚的云裹着像个大火炉，表面比烤箱还热（465℃）。最奇怪的是它倒着转，而且转得超慢——金星上的一天比它的一年还长。',
    quiz: [
      { q: '金星为什么是太阳系最热的行星？', a: [['厚云造成温室效应', 1], ['离太阳最近', 0], ['它自己会发热', 0]], why: '金星浓厚的二氧化碳大气像厚被子，把热量全捂住，表面热到 465℃。' },
      { q: '金星的自转方向有什么特别？', a: [['和大多数行星相反', 1], ['完全不转', 0], ['和地球一模一样', 0]], why: '金星是自东向西倒着转的，和别的行星都不一样。' },
    ] },
  { name: '地球', au: 1.00,  period: 365.25,   rot: 23.93,   km: 6371,   color: '#2a6fdb', spinDir:  1,
    tagline: '我们的蓝色家园，宇宙里唯一有生命的地方',
    stats: ['距太阳 1 AU（约 1.5 亿 km）', '公转一圈：365 天', '自转一周：24 小时', '卫星数：1（月球）'],
    facts: [
      '目前已知宇宙里唯一有生命的行星，约 71% 的表面被液态水覆盖。',
      '合适的大气、温和的气候和磁场，像一层「保护罩」挡住有害辐射。',
      '只有一颗天然卫星——月球，它带来了潮汐，也稳定了地轴倾角。',
      '从太空看，它是一颗蓝白相间的美丽星球。',
    ],
    childExplain: '地球是我们的家！它穿着蓝色的外衣（海洋），有空气、有生命，还有月亮陪着。它是目前我们知道唯一有生命的星球，所以要好好保护它哦。',
    quiz: [
      { q: '地球表面大约多少被水覆盖？', a: [['约 71%', 1], ['约 10%', 0], ['约一半', 0]], why: '地球约 71% 的表面是海洋，所以从太空看它是蓝色的。' },
      { q: '地球唯一的天然卫星是？', a: [['月球', 1], ['火星', 0], ['太阳', 0]], why: '地球只有一颗天然卫星——月球，它带来了潮汐。' },
    ] },
  { name: '火星', au: 1.52,  period: 686.98,   rot: 24.62,   km: 3390,   color: '#c1440e', spinDir:  1,
    tagline: '锈红色的「红色星球」，还有太阳系最高的山',
    stats: ['距太阳 ≈ 1.52 AU', '公转一圈：687 天', '自转一周：24.6 小时', '卫星数：2（火卫一、火卫二）'],
    facts: [
      '表面富含氧化铁（铁锈），所以呈现红色，人称「红色星球」。',
      '有太阳系最高的山——奥林匹斯山，高约 22 公里，是珠峰的近 3 倍。',
      '两极有白色的冰冠（水冰 + 干冰），地形和地球有不少相似之处。',
      '一天约 24.6 小时，和地球很像，因此成为人类探测最频繁的行星。',
    ],
    childExplain: '火星是个「生锈了的红色小球」，因为土里含铁，氧化后变红。它有太阳系最高的山——奥林匹斯山，还有白白的冰帽子。科学家觉得它最有可能住过生命，所以老去探索它。',
    quiz: [
      { q: '火星为什么是红色的？', a: [['表面含铁氧化（铁锈）', 1], ['被太阳晒红', 0], ['有人涂了红漆', 0]], why: '火星土壤富含氧化铁，就像铁生锈一样，所以发红。' },
      { q: '太阳系最高的山在哪颗星球上？', a: [['火星', 1], ['地球', 0], ['木星', 0]], why: '火星上的奥林匹斯山高约 22 公里，是太阳系最高的山。' },
    ] },
  { name: '木星', au: 5.20,  period: 4332.59,  rot: 9.93,    km: 69911,  color: '#d8a06a', spinDir:  1,
    tagline: '太阳系「大胖子」，能装下 1300 个地球',
    stats: ['距太阳 ≈ 5.2 AU', '公转一圈：约 12 年', '自转一周：9.9 小时', '卫星数：90 多颗'],
    facts: [
      '太阳系最大的行星，是颗没有固体表面的气态巨行星，能装下约 1300 个地球。',
      '著名的「大红斑」是一场比地球还大的风暴，已经刮了至少几百年。',
      '自转最快，一天还不到 10 小时，所以被甩得有点「扁」。',
      '最大的四颗卫星叫「伽利略卫星」，其中有的冰层下还藏着海洋。',
    ],
    childExplain: '木星是行星里的「大胖子」，能装下 1300 个地球！它身上有个「大红斑」，其实是一场比地球还大的超级风暴，刮了几百年都没停。它转得最快，一天不到 10 小时。',
    quiz: [
      { q: '木星上的「大红斑」到底是什么？', a: [['一场超级大风暴', 1], ['一个巨大的湖', 0], ['一座大山', 0]], why: '大红斑是木星上一场比地球还大的风暴，已经刮了几百年。' },
      { q: '木星大约能装下多少个地球？', a: [['约 1300 个', 1], ['约 10 个', 0], ['约 100 个', 0]], why: '木星是太阳系最大的行星，体积能装下约 1300 个地球。' },
    ] },
  { name: '土星', au: 9.58,  period: 10759.22, rot: 10.66,   km: 58232,  color: '#e3c98f', spinDir:  1, ring: true,
    tagline: '戴漂亮光环的「指环王」，轻得能浮在水上',
    stats: ['距太阳 ≈ 9.6 AU', '公转一圈：约 29 年', '自转一周：10.7 小时', '卫星数：140 多颗'],
    facts: [
      '以壮观的光环闻名，环由无数冰块和岩石碎块组成，宽达数十万公里。',
      '光环位于土星的赤道面上，并随约 26.7° 的自转轴倾角一起倾斜——不是水平的。',
      '阳光被土星挡住时，会在光环上投下一道阴影带，这是真实存在的现象。',
      '环里还有明显的「卡西尼缝」等缝隙，是受到卫星引力扰动形成的。',
      '密度比水还小——理论上若有个足够大的浴缸，土星能浮在水面上。',
      '也是气态巨行星，自转很快，同样有点「扁」。',
      '最大的卫星泰坦（土卫六）有浓厚大气和甲烷湖泊，是寻找地外生命的热门目标。',
    ],
    childExplain: '土星是「指环王」，戴着一条超宽超亮的光环，环里有数不清的冰块和石头在转。它轻得不可思议——要是有一个超级大浴缸，土星能浮在水面上！',
    quiz: [
      { q: '土星的光环主要由什么组成？', a: [['冰块和岩石碎块', 1], ['金子', 0], ['云朵', 0]], why: '土星环是无数冰块和岩石碎块组成的，宽达数十万公里。' },
      { q: '关于土星密度，正确的是？', a: [['比水还小，能浮在水面', 1], ['比地球重很多', 0], ['是实心铁球', 0]], why: '土星密度比水还小，理论上能浮在水面上。' },
    ] },
  { name: '天王星', au: 19.20, period: 30688.5, rot: 17.24,  km: 25362,  color: '#9fe0e6', spinDir: -1,
    tagline: '躺着滚的「冰蓝巨人」，歪了 98 度',
    stats: ['距太阳 ≈ 19.2 AU', '公转一圈：约 84 年', '自转一周：约 17 小时（反向）', '卫星数：27 颗'],
    facts: [
      '一颗冰巨星，大气里的甲烷吸收红光，让它呈现淡蓝绿色。',
      '自转轴几乎「躺」在轨道面上（倾角约 98°），像皮球一样侧着滚动。',
      '离太阳很远、极其寒冷，表面温度低到约 -195℃。',
      '1781 年由赫歇耳用望远镜首次发现，是历史上第一颗用望远镜找到的行星。',
    ],
    childExplain: '天王星是个「躺着转」的冰蓝巨人，像皮球一样侧着滚，因为它歪了 98 度！它离太阳超远，冷得要命（-195℃），大气里的甲烷让它发蓝绿色。',
    quiz: [
      { q: '天王星的自转轴有什么特别？', a: [['几乎躺着（倾角约 98°）', 1], ['完全竖直', 0], ['它不自转', 0]], why: '天王星自转轴倾角约 98°，几乎是「躺」在轨道面上滚动。' },
      { q: '天王星为什么是蓝绿色？', a: [['大气里的甲烷吸收红光', 1], ['有人涂了颜色', 0], ['海里全是水', 0]], why: '天王星大气中的甲烷吸收红光，让它呈现蓝绿色。' },
    ] },
  { name: '海王星', au: 30.07, period: 60182,   rot: 16.11,   km: 24622,  color: '#3b5bdb', spinDir:  1,
    tagline: '深蓝的「风暴之王」，风是太阳系最快的',
    stats: ['距太阳 ≈ 30 AU', '公转一圈：约 165 年', '自转一周：约 16 小时', '卫星数：14 颗'],
    facts: [
      '离太阳最远的行星，呈深邃的蓝色，也是最后一颗「大行星」。',
      '有太阳系最强的风，风速可超过每小时 2000 公里。',
      '上面的「大暗斑」是一场类似木星大红斑的巨大风暴。',
      '它是先靠数学计算预测、再被望远镜找到的行星（1846 年），很神奇。',
    ],
    childExplain: '海王星是离太阳最远的行星，深蓝色的，风超大——风速能超过每小时 2000 公里，是太阳系「风暴之王」。它还是先靠数学算出来、再被望远镜找到的，很厉害！',
    quiz: [
      { q: '海王星以什么闻名？', a: [['太阳系最强的风暴和大风', 1], ['它是太阳系最热的', 0], ['它是最小的行星', 0]], why: '海王星有太阳系最强的风，风速超每小时 2000 公里。' },
      { q: '海王星是怎么被发现的？', a: [['先靠数学算出来，再用望远镜找到', 1], ['偶然抬头看见的', 0], ['飞船带过去的', 0]], why: '海王星是 1846 年先靠数学预测位置、再用望远镜找到的。' },
    ] },
];
const SUN = { name: '太阳', km: 696000, color: '#ffcf4d',
  tagline: '太阳系的中心大灯泡，所有行星都围着它转',
  stats: ['类型：黄矮星（G 型主序星）', '质量：占太阳系总质量约 99.86%', '表面温度：约 5500℃', '年龄：约 46 亿年'],
  facts: [
    '太阳是一颗恒星，靠核心的核聚变发光发热，是太阳系里绝对的主角。',
    '它的质量占了整个太阳系的 99.86%，所有行星都绕着它转。',
    '地球所有的光和热都来自太阳，没有它就没有生命。',
    '太阳未来还会稳定燃烧约 50 亿年，之后会逐渐膨胀成红巨星。',
  ],
  childExplain: '太阳是太阳系的「大灯泡」，一颗会发光发热的大星星。它占了整个太阳系 99.86% 的质量，所有行星都围着它转。没有太阳，就没有光、没有热、也没有生命。',
  quiz: [
    { q: '太阳占了太阳系总质量的多少？', a: [['约 99.86%', 1], ['大约一半', 0], ['约十分之一', 0]], why: '太阳质量占了整个太阳系的约 99.86%，是绝对的主角。' },
    { q: '地球的光和热主要来自哪里？', a: [['太阳', 1], ['月亮', 0], ['其它星星', 0]], why: '地球所有的光和热都来自太阳。' },
  ] };

PLANETS.forEach((p) => {
  p.orbit = ORBIT_K * Math.pow(p.au, ORBIT_EXP);
  p.visualR = 2.0 * Math.pow(p.km / EARTH_KM, 0.4);
  p.angle = Math.random() * Math.PI * 2;     // 初始位置随机
  p.spin = Math.random() * Math.PI * 2;
  p.orbitSpeed = (2 * Math.PI / p.period) * ORBIT_ACCEL;
  p.spinSpeed = (2 * Math.PI / p.rot) * SPIN_ACCEL * p.spinDir;
  // 表面特征点（用于看出自转）
  p.features = [];
  const k = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < k; i++) {
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    p.features.push({ x: s * Math.cos(t), y: u, z: s * Math.sin(t) });
  }
});
const EARTH = PLANETS.find((p) => p.name === '地球');
/* ---------- 小行星带：真实 3D 岩石模型（程序化不规则多面体，离线可用） ----------
   每颗小行星是独立生成的「不规则石块」3D 网格：二十面体细分后顶点沿径向抖动，
   再逐面做 Lambert 受光 + 背面剔除，看起来是一块块石头而非一堆像素。 */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function buildAsteroidGeometry(rng, subdiv = 1) {
  const t = (1 + Math.sqrt(5)) / 2;
  let verts = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map(v => ({ x: v[0], y: v[1], z: v[2] }));
  verts = verts.map(norm);
  let faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  const cache = {};
  const getMid = (a, b) => {
    const key = a < b ? a + '_' + b : b + '_' + a;
    if (cache[key] != null) return cache[key];
    const va = verts[a], vb = verts[b];
    const m = norm({ x: (va.x + vb.x) / 2, y: (va.y + vb.y) / 2, z: (va.z + vb.z) / 2 });
    verts.push(m); cache[key] = verts.length - 1; return cache[key];
  };
  let nf = [];
  for (let sd = 0; sd < subdiv; sd++) {
    const next = [];
    for (const f of faces) {
      const ab = getMid(f[0], f[1]), bc = getMid(f[1], f[2]), ca = getMid(f[2], f[0]);
      next.push([f[0], ab, ca], [f[1], bc, ab], [f[2], ca, bc], [ab, bc, ca]);
    }
    faces = next;
  }
  nf = faces;
  // 顶点沿径向抖动 → 不规则石块
  for (let i = 0; i < verts.length; i++) {
    const d = 0.78 + rng() * 0.5;
    verts[i] = { x: verts[i].x * d, y: verts[i].y * d, z: verts[i].z * d };
  }
  const normals = [], faceShade = [];
  for (const f of faces) {
    const v0 = verts[f[0]], v1 = verts[f[1]], v2 = verts[f[2]];
    const u = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
    const w = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };
    normals.push(norm({ x: u.y * w.z - u.z * w.y, y: u.z * w.x - u.x * w.z, z: u.x * w.y - u.y * w.x }));
    faceShade.push(0.82 + rng() * 0.36);
  }
  return { verts, faces, normals, faceShade };
}
const ASTEROID_GEOMS = (function () {
  const r = mulberry32(20260609), out = [];
  for (let i = 0; i < 8; i++) out.push(buildAsteroidGeometry(r));
  return out;
})();
// 详情页里展示的「代表小行星」（细分两级=320 面，更精致）
const BELT_FEATURED = buildAsteroidGeometry(mulberry32(990011), 2);

// 真实小行星三维网格：内嵌 NASA OSIRIS-REx 实测的「贝努」(101955 Bennu) 形状模型
// 原生分辨率约 6 米、49,152 个面，未经任何网格简化；由 bennu_model.js 以 <script> 注入 window.BENNU_OBJ，双击离线即可运行。
let BELT_MODEL = null;
function parseOBJ(text) {
  const pos = [];
  const faces = [];
  const lines = text.split('\n');
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li].trim();
    if (!line || line[0] === '#') continue;
    const sp = line.split(/\s+/);
    const tag = sp[0];
    if (tag === 'v') {
      pos.push({ x: parseFloat(sp[1]), y: parseFloat(sp[2]), z: parseFloat(sp[3]) });
    } else if (tag === 'f') {
      const idx = [];
      for (let i = 1; i < sp.length; i++) {
        let vi = parseInt(sp[i].split('/')[0], 10);
        if (!isFinite(vi)) continue;
        vi = vi < 0 ? pos.length + vi : vi - 1;   // OBJ 为 1-based；负数表示相对
        idx.push(vi);
      }
      for (let i = 1; i < idx.length - 1; i++) faces.push([idx[0], idx[i], idx[i + 1]]);
    }
  }
  // 重心归零 + 归一化到单位半径
  let cx = 0, cy = 0, cz = 0;
  for (const p of pos) { cx += p.x; cy += p.y; cz += p.z; }
  const n = pos.length || 1; cx /= n; cy /= n; cz /= n;
  let maxR = 1e-9;
  for (const p of pos) { const dx = p.x - cx, dy = p.y - cy, dz = p.z - cz; const r = Math.sqrt(dx * dx + dy * dy + dz * dz); if (r > maxR) maxR = r; }
  const verts = pos.map(p => ({ x: (p.x - cx) / maxR, y: (p.y - cy) / maxR, z: (p.z - cz) / maxR }));
  const normals = [], faceShade = [];
  for (const f of faces) {
    const v0 = verts[f[0]], v1 = verts[f[1]], v2 = verts[f[2]];
    const ux = v1.x - v0.x, uy = v1.y - v0.y, uz = v1.z - v0.z;
    const wx = v2.x - v0.x, wy = v2.y - v0.y, wz = v2.z - v0.z;
    let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const len = Math.hypot(nx, ny, nz) || 1; nx /= len; ny /= len; nz /= len;
    const mx = (v0.x + v1.x + v2.x) / 3, my = (v0.y + v1.y + v2.y) / 3, mz = (v0.z + v1.z + v2.z) / 3;
    if (nx * mx + ny * my + nz * mz < 0) { nx = -nx; ny = -ny; nz = -nz; }   // 法线朝外
    normals.push({ x: nx, y: ny, z: nz });
    faceShade.push(1);   // 真实模型用纯法线漫反射着色，不再叠加随机噪声
  }
  return { verts, faces, normals, faceShade };
}
function loadAsteroidModel() {
  // 优先使用内嵌的真实贝努形状模型；若缺失则 BELT_MODEL 保持 null，渲染回退到程序化岩石
  try {
    if (typeof window !== 'undefined' && window.BENNU_OBJ) BELT_MODEL = parseOBJ(window.BENNU_OBJ);
  } catch (e) { BELT_MODEL = null; }
}

// 小行星带（火星与木星轨道之间，真实范围约 2.2~3.3 AU）
const ASTEROIDS = [];
(function () {
  const N = 140;
  for (let i = 0; i < N; i++) {
    const au = 2.15 + Math.random() * 1.2;
    ASTEROIDS.push({
      au, orbit: ORBIT_K * Math.pow(au, ORBIT_EXP),
      angle: Math.random() * Math.PI * 2,
      orbitSpeed: (2 * Math.PI / Math.pow(au, 1.5)) * ORBIT_ACCEL * 0.032, // 公转速度降到原 1/10，缓慢漂移更接近真实小行星带
      visualR: 0.5 + Math.random() * 0.6,
      spin: Math.random() * Math.PI * 2,
      spinSpeed: (0.06 + Math.random() * 0.18) * (Math.random() < 0.5 ? -1 : 1),
      axis: norm({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() * 2 - 1 }),
      geom: ASTEROID_GEOMS[i % ASTEROID_GEOMS.length],
      tint: 0.82 + Math.random() * 0.28,
      color: Math.random() < 0.5 ? { r: 156, g: 148, b: 138 } : { r: 150, g: 140, b: 126 },
    });
  }
})();
// 月球（绕地球公转，真实周期约 27.3 天；可点击查看详情）
const MOON = {
  name: '月球',
  visualR: EARTH.visualR * 0.27,
  orbitR: EARTH.visualR * 2.8,
  angle: Math.random() * Math.PI * 2,
  orbitSpeed: (2 * Math.PI / 27.3) * ORBIT_ACCEL,
  spin: 0, src: null,
  tagline: '地球唯一的天然伙伴，被陨石砸得满脸「麻子」',
  stats: ['距地球平均约 38.4 万 km', '绕地球一圈：约 27.3 天', '自转一周：约 27.3 天（潮汐锁定）', '直径：约 3474 km（地球的 1/4）'],
  facts: [
    '月球是地球唯一的天然卫星，也是人类唯一亲自踏足过的地外天体。',
    '它几乎没有大气和液态水，表面布满陨石坑，看起来坑坑洼洼。',
    '因为被地球「潮汐锁定」，月球总是用同一面朝向我们，背面直到航天时代才被看清。',
    '月光其实是它反射的太阳光；满月时最亮。',
    '月球引力造成了地球的潮汐，也悄悄让地球自转一点点变慢。',
  ],
  childExplain: '月球是地球唯一的小伙伴。它自己不会发光，我们看到的月光其实是它反射的太阳光。它被陨石砸得满脸「麻子」（坑坑洼洼）。因为被地球用看不见的「绳子」锁住，它总用同一面对着我们——背面我们很久以后才看清。它还会引起海水涨落，就是潮汐！',
  quiz: [
    { q: '月光其实是什么？', a: [['它反射的太阳光', 1], ['月亮自己会发光', 0], ['星星的光', 0]], why: '月球本身不发光，我们看到的月光是它反射的太阳光。' },
    { q: '为什么我们总看到月球的同一面？', a: [['被地球潮汐锁定', 1], ['它不转', 0], ['它太小了', 0]], why: '月球被地球潮汐锁定，自转和公转周期相同，所以总用同一面朝向地球。' },
  ],
};
MOON.spinSpeed = MOON.orbitSpeed;   // 潮汐锁定：自转≈公转

// 小行星带（火星与木星之间，可点击查看信息）
const BELT = {
  name: '小行星带',
  spin: 0,                 // 详情页建模用：自转初值（避免 undefined→NaN 导致建模不显示）
  tagline: '夹在火星和木星之间的「太空碎石场」',
  stats: ['位置：火星(1.5 AU) 与 木星(5.2 AU) 轨道之间', '范围：距太阳约 2.2~3.3 AU', '已知小行星：超过 100 万颗', '最大天体：谷神星（直径约 940 km，矮行星）'],
  facts: [
    '小行星带是太阳系形成时没能聚成大行星的「残余碎块」。',
    '这里绝大多数都是岩石和金属小块，最大的谷神星也比月球小很多。',
    '它们都绕着太阳公转，只是又小又远，肉眼完全看不见。',
    '木星强大的引力像「搅拌机」，把这片区域搅得无法聚成一颗大行星。',
    '导致恐龙灭绝的那颗陨石，很可能就来自这里或附近。',
  ],
  childExplain: '小行星带就像火星和木星之间的一片「太空碎石场」。很久以前这些物质本来想聚成一颗大行星，可是旁边的木星太大、引力太强，一直把它们「搅散」，所以到现在还是一颗颗小石头。它们都乖乖绕着太阳转，因为又小又远，我们肉眼根本看不到。',
  quiz: [
    { q: '小行星带在哪里？', a: [['火星和木星之间', 1], ['地球和火星之间', 0], ['木星和土星之间', 0]], why: '小行星带位于火星与木星的轨道之间，距太阳约 2.2~3.3 AU。' },
    { q: '为什么这里没聚成一颗大行星？', a: [['木星引力太强把它搅散了', 1], ['太阳太热', 0], ['太空太小', 0]], why: '木星强大的引力把这片区域搅动得无法聚集成一颗行星。' },
  ],
  modelNote: '右侧 3D 模型 = 真实小行星「贝努」(101955 Bennu) 的三维形状（NASA OSIRIS-REx 探测器实测，原生分辨率约 6 米，未经网格简化）',
};
let RING_SRC = null, ringGrad = null;
const SUN_R = 6.5;
let sunSpin = 0;

/* ---------- 地月系专题场景（示意比例）：把太阳 + 地球 + 月球单独拉出来 ---------- */
let emMode = false;
let emEarthSpin = 0, emMoonAngle = 0, emMoonSpin = 0;
const EM = {
  earthR: 26,            // 地球显示半径（示意，非真实比例）
  moonR: 7,              // 月球显示半径（≈ 地球 0.27 倍，保留真实大小比）
  moonOrbitR: 95,        // 月球绕地轨道半径（示意，真实约 60 倍地球半径，已压缩便于观察）
  sunDist: 300,          // 太阳示意距离（真实约 390 倍地月距离，已大幅压缩）
  sunR: 40,              // 太阳显示半径（示意，真实约地球 109 倍）
  earthSpinSpeed: (2 * Math.PI * 3) / 8,    // 地球自转：约 8 秒一圈（timeScale=1）
  moonOrbitSpeed: (2 * Math.PI * 3) / 14,   // 月球公转：约 14 秒一圈 = 一个「月相周期」
};

/* ============================================================
   更新日志（CHANGELOG）
   版本规则：小版本 = 1.1 / 1.2 / 1.x（普通修复与优化）；大版本 = x.0（含大机制更新）。
   每次发布更新时，在数组「顶部」追加一条（newest-first），并相应递增版本号。
   字段：ver 版本号 / date 日期 / type 'major'|'minor' / title 标题 / changes 变更点数组
   ============================================================ */
const CHANGELOG = [
  { ver: '2.12', date: '2026-07-10', type: 'minor', title: '月相条改到顶部 + 偶发流星', changes: [
    '修复：地月系「月相周期 8 相条」原本贴在屏幕底部，被含“速度”滑块的控制面板挡住中间几个相；现移到顶部信息区（标题与“当前月相”下方），更醒目且不再被遮挡',
    '新增：星空背景下偶发流星划过（平均约每 3 秒一颗、自动淡出），让页面更有活力与趣味',
  ]},
  { ver: '2.11', date: '2026-07-10', type: 'minor', title: '体重体验 + 月相周期条', changes: [
    '详情页新增「💪 你的体重在这里」小工具：输入体重即实时算出在该天体表面的体重（基于真实表面重力），并用孩子能懂的话解释轻重感受',
    '地月系模式新增「月相周期」8 相名称条（新月/蛾眉/上弦/盈凸/满月/亏凸/下弦/残月），实时高亮当前所在月相，帮孩子建立完整月相周期概念',
  ]},
  { ver: '2.10', date: '2026-07-10', type: 'minor', title: '土星环卡通化重做', changes: [
    '参考卡通土星风格，弃用脏噪声纹理，改用干净平滑的暖金环带（明亮 B 环 + 清晰卡西尼缝 + A 环 + 恩克缝）',
    '主场景与详情页统一画法：倾斜椭圆「还原成圆」+ 环形裁剪 + 径向渐变实心填充，彻底消除网格 / 框线 / 发糊',
    '新增土星本影楔形暗带（环被星球影子切断的迷人细节）与受光侧柔和高光，立体感更强',
  ]},
  { ver: '2.9', date: '2026-07-10', type: 'minor', title: '土星环弃框线改实心椭圆环带', changes: [
    '详情页环由分段描边改为实心同心椭圆环带（线宽彼此叠盖成连续实体），消除「只剩框线」的观感',
    '恢复真实环带数据（含卡西尼缝留空），整体提亮、更饱满',
    '加土星本影暗带，并随土星轴倾角与自转同步倾斜',
  ]},
  { ver: '2.8', date: '2026-07-10', type: 'minor', title: '土星环随星球自转 + 本影暗带', changes: [
    '详情页环重写：真正 3D 环网格，随土星自转轴倾斜并随行星自转一起转（拖动旋转时环与星球同步）',
    '加入土星本体本影（背阳侧楔形暗带）与卡西尼缝亮边',
    '环材质整体增亮、更饱满（修复上一版「只剩框线」的问题）',
  ]},
  { ver: '2.7', date: '2026-07-10', type: 'minor', title: '主场景环提亮 + 小行星公转降至 1/10', changes: [
    '主场景土星环大幅提亮（增亮系数 + 提高不透明度），不再发暗发灰',
    '详情页环改用同心椭圆环带 + 横向渐变光照，彻底消除网格',
    '小行星带公转速度降至原来的 1/10，更接近真实缓慢漂移的观感',
  ]},
  { ver: '2.6', date: '2026-07-10', type: 'minor', title: '土星环暖金程序化环带', changes: [
    '重写程序化环渐变：暖金色调 + 细密同心环纹 + 真实卡西尼 / 恩克 / 惠更斯缝',
    '主场景与详情页改用径向连续渐变 + 前向散射白化高光，质感更真实',
  ]},
  { ver: '2.5', date: '2026-07-10', type: 'minor', title: '详情页土星环消除网格', changes: [
    '详情页环由 150×22 离散四边形改为径向连续渐变 + 角向扇形，消除网格纹理',
  ]},
  { ver: '2.4', date: '2026-07-10', type: 'minor', title: '月相相位序列修正', changes: [
    '月相相位角取负，使月相按正确天文顺序循环（新月 → 上弦 → 满月 → 下弦），与屏幕逆时针公转一致',
  ]},
  { ver: '2.3', date: '2026-07-10', type: 'minor', title: '全太阳系公转 / 自转统一逆时针', changes: [
    '行星、小行星带、月球公转与自转统一改为逆时针（屏幕视觉），与地月系方向一致',
  ]},
  { ver: '2.2', date: '2026-07-10', type: 'minor', title: '月球公转改逆时针', changes: [
    '月球公转方向改为逆时针（自北向南看），与主场景行星公转方向一致',
  ]},
  { ver: '2.1', date: '2026-07-10', type: 'minor', title: '地月系月相示意图', changes: [
    '在「当前月相」文字旁绘制对应月相示意图（含终止线正确的盈亏形状），便于孩子直观对照',
  ]},
  { ver: '2.0', date: '2026-07-10', type: 'major', title: '新增「太阳系 / 地月系」双模式切换', changes: [
    '新增顶部切换按钮，可在「太阳系」与「地月系」之间切换 ★ 大机制更新',
    '独立地月系场景：地球居中、月球绕地公转、太阳侧方光源、实时月相计算',
    '地月系距离 / 大小为示意比例（界面注明），物理规律（月相 / 潮汐锁定 / 光照）严格真实',
  ]},
  { ver: '1.2', date: '2026-07-09', type: 'minor', title: '修复详情页环「只有一半且很丑」', changes: [
    '修复错误本影把半环压黑的问题，改为楔形暗带 + 立体感 + 柔化处理',
  ]},
  { ver: '1.1', date: '2026-07-09', type: 'minor', title: '修复详情页土星环「消失」', changes: [
    '修复详情页土星环因错误的双重缩放而飞出画布（环直接消失）的问题',
  ]},
  { ver: '1.0', date: '2026-07-09', type: 'major', title: '初始版本发布', changes: [
    '太阳系主场景：八大行星 + 小行星带按真实轨道规律公转 / 自转',
    '点击星球进入详情页：趣味小知识、给孩子讲解、小测验',
    '真实照片贴图（联网加载，断网自动回退为程序化生成）',
    '纯 Canvas 2D 零依赖，双击即开、断网可跑',
  ]},
];
const CURRENT_VERSION = CHANGELOG[0].ver;

/* ---------- 画布 ---------- */
const canvas = document.getElementById('sky');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
const FOV = 50 * Math.PI / 180;
let focal = 1;
function resize() {
  const cw = canvas.clientWidth, ch = canvas.clientHeight;
  if (!cw || !ch) return;   // 画布不可见（如详情页打开时 display:none）时不更新，避免把 W/H/focal 清零导致返回时黑屏
  W = cw; H = ch;
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  focal = (H / 2) / Math.tan(FOV / 2);
}
window.addEventListener('resize', resize);

/* ---------- 相机 ---------- */
let camYaw = 0.6, camPitch = 0.5, camDist = 1100;
let target = { x: 0, y: 0, z: 0 };     // 视线中心（拖动平移时移动它）
const cam = { pos: ORIGIN, f: ORIGIN, right: ORIGIN, up: ORIGIN };
function cameraPos() {
  return {
    x: camDist * Math.cos(camPitch) * Math.sin(camYaw),
    y: camDist * Math.sin(camPitch),
    z: camDist * Math.cos(camPitch) * Math.cos(camYaw),
  };
}
function updateCamera() {
  cam.pos = cameraPos();
  cam.f = norm(sub(target, cam.pos));
  cam.right = norm(cross(cam.f, UP));
  cam.up = cross(cam.right, cam.f);
}
function project(P) {
  const d = sub(P, cam.pos);
  const vx = dot(d, cam.right), vy = dot(d, cam.up), vz = dot(d, cam.f);
  if (vz <= 0.1) return { visible: false };
  return { visible: true, x: W / 2 + (focal * vx) / vz, y: H / 2 - (focal * vy) / vz, depth: vz };
}
function planetWorld(p) {
  return { x: p.orbit * Math.cos(p.angle), y: 0, z: p.orbit * Math.sin(p.angle) };
}

/* ---------- 星空背景（固定在大球上，随相机旋转） ---------- */
const STARS = [];
for (let i = 0; i < 420; i++) {
  const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u), R = 3000;
  STARS.push({ x: R * s * Math.cos(t), y: R * u, z: R * s * Math.sin(t), a: 0.3 + Math.random() * 0.7 });
}

/* ---------- 绘制：轨道圆环 ---------- */
function drawOrbit(p) {
  const SEG = 96, pts = [];
  for (let i = 0; i <= SEG; i++) {
    const a = (i / SEG) * Math.PI * 2;
    pts.push(project({ x: p.orbit * Math.cos(a), y: 0, z: p.orbit * Math.sin(a) }));
  }
  ctx.beginPath();
  let started = false;
  for (let i = 0; i <= SEG; i++) {
    const q = pts[i];
    if (q.visible) { if (!started) { ctx.moveTo(q.x, q.y); started = true; } else ctx.lineTo(q.x, q.y); }
    else started = false;
  }
  ctx.strokeStyle = 'rgba(120,140,200,0.22)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

/* ---------- 绘制：土星环（按真实自转轴倾角倾斜 + 土星投影阴影 + 卡西尼缝） ---------- */
// 土星自转轴倾角（赤道面相对公转面的夹角），真实值约 26.73°，环就在赤道面内
const SATURN_TILT = 26.73 * Math.PI / 180;
// 环上一点：先落在以土星为中心的黄道圆环，再整体绕世界 X 轴倾斜 SATURN_TILT（保持圆心不动）
function ringWorld(r, a, pos) {
  const rx = r * Math.cos(a), rz = r * Math.sin(a);
  const ly = -rz * Math.sin(SATURN_TILT);
  const lz = rz * Math.cos(SATURN_TILT);
  return { x: pos.x + rx, y: pos.y + ly, z: pos.z + lz };
}
function drawSaturnRing(pos, centerDepth, visualR) {
  const rin = visualR * 1.3, rout = visualR * 2.4;
  const sd = norm(pos);                             // 太阳→土星方向（阴影轴）
  const sp = project(pos);                          // 土星屏幕投影（环中心）
  if (!sp.visible || !isFinite(sp.depth) || sp.depth <= 0) return null;
  const scale = focal / sp.depth;
  const rinS = scale * rin, routS = scale * rout;
  // 屏幕受光方向（指向太阳）≈ -sd 在屏幕上的近似
  const Lscr = { x: -sd.x, y: -sd.y };
  // 投影椭圆的竖直压扁比（外缘）：直接量取两个正交环点的投影跨度，最稳
  let rxO = routS, ryO = routS * Math.max(0.06, Math.abs(Math.sin(SATURN_TILT)));
  const pa = project(ringWorld(rout, 0, pos)), pb = project(ringWorld(rout, Math.PI / 2, pos));
  if (pa.visible && pb.visible) {
    rxO = Math.max(1, Math.abs(pa.x - sp.x));
    ryO = Math.max(1, Math.abs(pb.y - sp.y));
  }
  const rxI = rxO * rin / rout, ryI = ryO * rin / rout;
  const sq = ryO / rxO;                             // 压扁比 → 用于把椭圆还原成圆
  const rN = rinS;                                  // 本体屏幕半径（本影尺度）
  // 由环带数据构建"圆形空间"的径向渐变（之后经压扁变换映射到椭圆环面）
  const buildGrad = (c) => {
    const g = c.createRadialGradient(0, 0, rxI, 0, 0, rxO);
    const ST = 64;
    for (let s = 0; s <= ST; s++) {
      const t = s / ST;
      const idx = Math.round(t * 255);
      const a = ringGrad ? ringGrad.a[idx] : 0.5;
      let r = ringGrad ? ringGrad.r[idx] : 214, g0 = ringGrad ? ringGrad.g[idx] : 198, b0 = ringGrad ? ringGrad.b[idx] : 160;
      r = Math.min(255, r * 1.08); g0 = Math.min(255, g0 * 1.08); b0 = Math.min(255, b0 * 1.08);
      if (a < 0.02) g.addColorStop(t, 'rgba(0,0,0,0)');
      else g.addColorStop(t, `rgba(${r | 0},${g0 | 0},${b0 | 0},${Math.min(1, a * 1.4)})`);
    }
    return g;
  };
  // 画半个环（back=true 背向相机=上半，先画；front=下半，后画盖星球）
  const drawHalf = (back) => {
    ctx.save();
    ctx.beginPath();
    if (back) ctx.rect(0, 0, 1e6, sp.y); else ctx.rect(0, sp.y, 1e6, 1e6);
    ctx.clip();
    ctx.translate(sp.x, sp.y);
    ctx.scale(1, sq);
    // 环形裁剪：外圆 - 内圆（evenodd）
    ctx.beginPath();
    ctx.arc(0, 0, rxO, 0, Math.PI * 2);
    ctx.arc(0, 0, rxI, 0, Math.PI * 2);
    ctx.clip('evenodd');
    // 实心环面（干净平滑渐变）
    ctx.fillStyle = buildGrad(ctx);
    ctx.beginPath(); ctx.arc(0, 0, rxO, 0, Math.PI * 2); ctx.fill();
    // 土星本影：背光侧的柔和暗影（真实照片里环被星球影子切断）
    const sgx = Lscr.x * rN * 0.78, sgy = (Lscr.y * rN * 0.78) / sq;
    const sg = ctx.createRadialGradient(sgx, sgy, 0, sgx, sgy, rN * 1.75);
    sg.addColorStop(0, 'rgba(16,11,5,0.62)');
    sg.addColorStop(0.7, 'rgba(16,11,5,0.28)');
    sg.addColorStop(1, 'rgba(16,11,5,0)');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.arc(0, 0, rxO, 0, Math.PI * 2); ctx.fill();
    // 受光侧柔和高光（前向散射，让环发亮有质感）
    const hx = Lscr.x * rxO * 0.5, hy = (Lscr.y * rxO * 0.5) / sq;
    const hg = ctx.createRadialGradient(hx, hy, 0, hx, hy, rxO * 1.1);
    hg.addColorStop(0, 'rgba(255,250,235,0.22)');
    hg.addColorStop(0.5, 'rgba(255,250,235,0.05)');
    hg.addColorStop(1, 'rgba(255,250,235,0)');
    ctx.fillStyle = hg;
    ctx.beginPath(); ctx.arc(0, 0, rxO, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  drawHalf(true);            // 背半先画（被星球遮挡）
  return () => drawHalf(false);   // 前半个由调用方在画完星球后调用
}
// 月球（绕地球公转）
function moonWorld() {
  const e = planetWorld(EARTH);
  const r = MOON.orbitR;
  return { x: e.x + r * Math.cos(MOON.angle), y: 0, z: e.z + r * Math.sin(MOON.angle) };
}
function drawMoon() {
  const e = planetWorld(EARTH);
  const ep = project(e);
  const m = moonWorld();
  const mp = project(m);
  if (!mp.visible) return;
  const rS = (focal * MOON.visualR) / mp.depth;
  if (ep.visible) {
    const eR = (focal * EARTH.visualR) / ep.depth;
    if (mp.depth < ep.depth && Math.hypot(mp.x - ep.x, mp.y - ep.y) < eR) return; // 被地球挡住
  }
  const L = norm(sub(ORIGIN, m));
  drawSphere(MOON.src, mp, rS, MOON.spin, L, false);
  ctx.font = '11px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText('月球', mp.x + 1, mp.y - rS - 3 + 1);
  ctx.fillStyle = '#dfe6f5'; ctx.fillText('月球', mp.x, mp.y - rS - 3);
}
// 小行星带（真实 3D 岩石）
function rotMat(ax, ay, az, ang) {
  const c = Math.cos(ang), s = Math.sin(ang), t = 1 - c;
  return [
    [t * ax * ax + c, t * ax * ay - s * az, t * ax * az + s * ay],
    [t * ax * ay + s * az, t * ay * ay + c, t * ay * az - s * ax],
    [t * ax * az - s * ay, t * ay * az + s * ax, t * az * az + c],
  ];
}
function drawAsteroidBelt() {
  const list = [];
  for (const a of ASTEROIDS) {
    const pos = { x: a.orbit * Math.cos(a.angle), y: 0, z: a.orbit * Math.sin(a.angle) };
    const cp = project(pos);
    if (!cp.visible) continue;
    const rS = (focal * a.visualR) / cp.depth;
    if (rS < 0.35) continue;
    list.push({ a, pos, depth: cp.depth });
  }
  list.sort((p, q) => q.depth - p.depth);   // 远→近，画家算法
  for (const it of list) drawAsteroid(it.a, it.pos);
}
function drawAsteroid(a, pos) {
  const ax = a.axis.x, ay = a.axis.y, az = a.axis.z;
  const M = rotMat(ax, ay, az, a.spin);
  const light = norm(sub(ORIGIN, pos));
  const g = a.geom;
  const wv = new Array(g.verts.length);
  for (let i = 0; i < g.verts.length; i++) {
    const v = g.verts[i];
    const rx = M[0][0] * v.x + M[0][1] * v.y + M[0][2] * v.z;
    const ry = M[1][0] * v.x + M[1][1] * v.y + M[1][2] * v.z;
    const rz = M[2][0] * v.x + M[2][1] * v.y + M[2][2] * v.z;
    wv[i] = { x: pos.x + a.visualR * rx, y: pos.y + a.visualR * ry, z: pos.z + a.visualR * rz };
  }
  const ambient = 0.4, gain = 1.12;
  for (let i = 0; i < g.faces.length; i++) {
    const f = g.faces[i], n0 = g.normals[i];
    const nx = M[0][0] * n0.x + M[0][1] * n0.y + M[0][2] * n0.z;
    const ny = M[1][0] * n0.x + M[1][1] * n0.y + M[1][2] * n0.z;
    const nz = M[2][0] * n0.x + M[2][1] * n0.y + M[2][2] * n0.z;
    const c0 = wv[f[0]], c1 = wv[f[1]], c2 = wv[f[2]];
    const cx = (c0.x + c1.x + c2.x) / 3, cy = (c0.y + c1.y + c2.y) / 3, cz = (c0.z + c1.z + c2.z) / 3;
    const view = norm(sub(cam.pos, { x: cx, y: cy, z: cz }));
    if (nx * view.x + ny * view.y + nz * view.z <= 0) continue;   // 背面剔除
    const diff = nx * light.x + ny * light.y + nz * light.z;
    const bright = (ambient + (1 - ambient) * (diff > 0 ? diff : 0)) * g.faceShade[i] * a.tint * gain;
    const p0 = project(c0), p1 = project(c1), p2 = project(c2);
    if (!(p0.visible && p1.visible && p2.visible)) continue;
    const r = Math.min(255, a.color.r * bright) | 0;
    const gg = Math.min(255, a.color.g * bright) | 0;
    const b = Math.min(255, a.color.b * bright) | 0;
    ctx.fillStyle = `rgb(${r},${gg},${b})`;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.closePath();
    ctx.fill();
  }
}

/* ============================================================
   程序化生成「真实感」表面纹理（离屏 canvas，离线、零依赖）
   依据真实行星外观：木星云带+大红斑、火星锈红+极冠、地球海陆、
   金星云层漩涡、水星陨石坑、土星浅色云带、天王/海王星青蓝淡带、太阳米粒
   ============================================================ */
function makeOffscreen(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function rgbToHex(r, g, b) { const f = (v) => ('0' + Math.max(0, Math.min(255, Math.round(v))).toString(16)).slice(-2); return '#' + f(r) + f(g) + f(b); }
function lerpColor(a, b, t) { const A = hexToRgb(a), B = hexToRgb(b); return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
function bandGradient(t, stops) {
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i][0] && t <= stops[i + 1][0]) {
      const f = (t - stops[i][0]) / (stops[i + 1][0] - stops[i][0] || 1);
      return lerpColor(stops[i][1], stops[i + 1][1], f);
    }
  }
  return stops[stops.length - 1][1];
}
function fillBands(g, W, H, stops) { for (let y = 0; y < H; y++) { g.fillStyle = bandGradient(y / H, stops); g.fillRect(0, y, W, 1); } }
function addTurbulence(g, W, H, color, alpha, count, maxR) {
  g.globalAlpha = 1;
  for (let i = 0; i < count; i++) {
    const x = Math.random() * W, y = Math.random() * H, r = Math.random() * maxR + 2;
    g.globalAlpha = alpha * (0.5 + Math.random() * 0.5); g.fillStyle = color;
    g.beginPath(); g.ellipse(x, y, r, r * (0.4 + Math.random() * 0.5), 0, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
}
function blob(g, x, y, r, color, squash) {
  g.fillStyle = color; g.beginPath();
  for (let a = 0; a < 8; a++) { const ang = a / 8 * Math.PI * 2; const rr = r * (0.6 + Math.random() * 0.7); const px = x + Math.cos(ang) * rr, py = y + Math.sin(ang) * rr * (squash || 0.7); if (a === 0) g.moveTo(px, py); else g.lineTo(px, py); }
  g.closePath(); g.fill();
}
function drawSurface(g, W, H, name) {
  if (name === '水星') {
    fillBands(g, W, H, [[0, '#8a8073'], [0.5, '#a99c8c'], [1, '#7d7468']]);
    addTurbulence(g, W, H, '#6f6557', 0.22, 30, 30);
    for (let i = 0; i < 150; i++) { const x = Math.random() * W, y = Math.random() * H, r = Math.random() * 9 + 2; g.fillStyle = 'rgba(60,54,46,0.5)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.strokeStyle = 'rgba(205,195,180,0.5)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); }
  } else if (name === '金星') {
    fillBands(g, W, H, [[0, '#e9d9a8'], [0.5, '#f2e3b0'], [1, '#d9c48f']]);
    for (let i = 0; i < 70; i++) { const y = Math.random() * H; g.globalAlpha = 0.12; g.strokeStyle = Math.random() < 0.5 ? '#fff3cf' : '#c9b27e'; g.lineWidth = Math.random() * 6 + 2; g.beginPath(); for (let x = 0; x <= W; x += 20) { const yy = y + Math.sin(x / W * Math.PI * 4 + i) * 8; if (x === 0) g.moveTo(x, yy); else g.lineTo(x, yy); } g.stroke(); }
    g.globalAlpha = 1;
  } else if (name === '地球') {
    g.fillStyle = '#1b4f9c'; g.fillRect(0, 0, W, H);
    const conts = ['#2e7d32', '#3e8e41', '#6b8e23', '#8d6e3a', '#4e7a34'];
    for (let i = 0; i < 28; i++) blob(g, Math.random() * W, H * 0.1 + Math.random() * H * 0.8, Math.random() * 30 + 10, conts[i % conts.length], 0.7);
    g.fillStyle = '#eef4ff'; g.fillRect(0, 0, W, H * 0.07); g.fillRect(0, H * 0.93, W, H * 0.07);
    blob(g, W * 0.5, H * 0.05, 22, '#eef4ff', 0.5); blob(g, W * 0.5, H * 0.95, 20, '#eef4ff', 0.5);
    addTurbulence(g, W, H, '#ffffff', 0.16, 42, 24);
  } else if (name === '火星') {
    fillBands(g, W, H, [[0, '#c1502e'], [0.5, '#d9663b'], [1, '#a8411f']]);
    addTurbulence(g, W, H, '#7a2e16', 0.3, 42, 26);
    for (let i = 0; i < 34; i++) { const x = Math.random() * W, y = Math.random() * H, r = Math.random() * 6 + 2; g.fillStyle = 'rgba(80,30,15,0.4)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    g.fillStyle = '#f3ede6'; g.beginPath(); g.ellipse(W * 0.5, H * 0.04, W * 0.18, H * 0.05, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(W * 0.5, H * 0.96, W * 0.16, H * 0.05, 0, 0, 7); g.fill();
  } else if (name === '木星') {
    fillBands(g, W, H, [[0, '#c9a06a'], [0.12, '#e6cfa6'], [0.2, '#b07a4a'], [0.32, '#e3c79b'], [0.45, '#9c5f33'], [0.55, '#d8b483'], [0.68, '#b07a4a'], [0.8, '#e6cfa6'], [0.9, '#a86a3c'], [1, '#c9a06a']]);
    addTurbulence(g, W, H, '#7a4a26', 0.16, 50, 22); addTurbulence(g, W, H, '#f0e0bf', 0.16, 50, 18);
    const gx = W * 0.62, gy = H * 0.62; g.fillStyle = '#b5462f'; g.beginPath(); g.ellipse(gx, gy, W * 0.07, H * 0.05, 0, 0, 7); g.fill(); g.fillStyle = '#d9744f'; g.beginPath(); g.ellipse(gx, gy, W * 0.05, H * 0.035, 0, 0, 7); g.fill();
  } else if (name === '土星') {
    fillBands(g, W, H, [[0, '#d9c79a'], [0.3, '#efe2bf'], [0.5, '#cdb98a'], [0.7, '#efe2bf'], [1, '#d9c79a']]);
    addTurbulence(g, W, H, '#b7a274', 0.14, 40, 18); addTurbulence(g, W, H, '#f5ecd2', 0.14, 40, 16);
  } else if (name === '天王星') {
    fillBands(g, W, H, [[0, '#9fe0e6'], [0.5, '#b6e9ee'], [1, '#8fd6dd']]); addTurbulence(g, W, H, '#bfeef2', 0.1, 30, 16);
  } else if (name === '海王星') {
    fillBands(g, W, H, [[0, '#2f55c9'], [0.5, '#3b6bdb'], [1, '#2746a8']]);
    addTurbulence(g, W, H, '#1f3a8f', 0.15, 30, 16); addTurbulence(g, W, H, '#cfe0ff', 0.18, 20, 12);
    g.fillStyle = 'rgba(15,25,70,0.7)'; g.beginPath(); g.ellipse(W * 0.4, H * 0.4, W * 0.06, H * 0.045, 0, 0, 7); g.fill();
  }
}
function drawSunSurface(g, W, H) {
  fillBands(g, W, H, [[0, '#ffcf4d'], [0.5, '#ffb300'], [1, '#ff9b1f']]);
  addTurbulence(g, W, H, '#ffe48a', 0.3, 120, 10); addTurbulence(g, W, H, '#ff7a00', 0.25, 120, 9);
}
function drawMoonSurface(g, W, H) {
  fillBands(g, W, H, [[0, '#9a9a9a'], [0.5, '#c2c2c2'], [1, '#8d8d8d']]);
  for (let i = 0; i < 16; i++) blob(g, Math.random() * W, Math.random() * H, Math.random() * 42 + 14, 'rgba(96,96,108,0.5)', 0.85); // 月海
  for (let i = 0; i < 240; i++) {
    const x = Math.random() * W, y = Math.random() * H, r = Math.random() * 11 + 2;
    g.fillStyle = 'rgba(74,74,84,0.5)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.strokeStyle = 'rgba(232,232,238,0.5)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke();
  }
}
function buildTextures() {
  const W = 512, H = 256;
  for (const p of PLANETS) { const c = makeOffscreen(W, H); drawSurface(c.getContext('2d'), W, H, p.name); p.src = toSrc(c, W, H); }
  const sc = makeOffscreen(W, H); drawSunSurface(sc.getContext('2d'), W, H); SUN.src = toSrc(sc, W, H);
  const mc = makeOffscreen(W, H); drawMoonSurface(mc.getContext('2d'), W, H); MOON.src = toSrc(mc, W, H);
}

/* ---------- 真实照片贴图（打开网页时从公开图库经 jsdelivr 加载，带 CORS 可读像素）----------
   断网时静默失败，继续使用上面的程序化回退，保证「双击也能跑」。 */
const TEX_BASE = 'https://cdn.jsdelivr.net/gh/5h45h4nk/solar-system@main/assets/textures/';
const TEX_FILES = {
  '太阳': 'Sun.jpg', '水星': 'Mercury.jpg', '金星': 'Venus.jpg', '地球': 'Earth.jpg',
  '火星': 'Mars.jpg', '木星': 'Jupiter.jpg', '土星': 'Saturn.jpg', '天王星': 'Uranus.jpg', '海王星': 'Neptune.jpg',
};
let realTexCount = 0;
function loadRealTexture(name, assign) {
  const file = TEX_FILES[name]; if (!file) return;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try { assign(toSrc(img, 1024, 512)); realTexCount++; } catch (e) { /* 跨域读取失败则保留回退 */ }
  };
  img.onerror = () => { /* 断网/失败：保留程序化回退 */ };
  img.src = TEX_BASE + file;
}
function loadRealTextures() {
  for (const p of PLANETS) loadRealTexture(p.name, (s) => { p.src = s; });
  loadRealTexture('太阳', (s) => { SUN.src = s; });
  loadMoonTexture();
  loadRingTexture();
}
function loadMoonTexture() {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => { try { MOON.src = toSrc(img, 512, 256); } catch (e) {} };
  img.onerror = () => {};
  img.src = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/textures/planets/moon_1024.jpg';
}
function buildRingGrad(tex) {
  const n = 256; ringGrad = { r: [], g: [], b: [], a: [] };
  for (let i = 0; i < n; i++) {
    const v = (i + 0.5) / n;
    const ty = Math.max(0, Math.min(tex.h - 1, Math.floor(v * (tex.h - 1))));
    let rs = 0, gs = 0, bs = 0, as = 0, c = 0;
    const step = Math.max(1, Math.floor(tex.w / 128));
    for (let x = 0; x < tex.w; x += step) {
      const idx = (ty * tex.w + x) * 4;
      rs += tex.data[idx]; gs += tex.data[idx + 1]; bs += tex.data[idx + 2]; as += tex.data[idx + 3]; c++;
    }
    ringGrad.r.push(rs / c); ringGrad.g.push(gs / c); ringGrad.b.push(bs / c); ringGrad.a.push(as / c / 255);
  }
  smoothRingGrad(ringGrad);   // 真实贴图版柔化，消除采样硬边（离线程序化版不含此步以保留细密环纹）
}
// 程序化环渐变（离线回退）：暖金/香槟色调 + 细密同心环纹 + 真实环缝结构
// 先由控制点描述大尺度环带（C→B→卡西尼缝→A→F），再在其上叠加细密环纹，
// 颜色用亮纹偏暖金白、暗纹偏棕褐，模拟卡西尼号看到的真实土星环质感。
function buildProceduralRingGrad() {
  const n = 256;
  const out = { r: [], g: [], b: [], a: [] };
  // 卡通土星环：干净平滑的暖金环带，凸显明亮的 B 环 + 清晰的卡西尼缝。
  // 控制点（t, alpha, R, G, B），wide smoothstep 过渡 → 无硬边、无脏噪声。
  const cps = [
    [0.00, 0.10, 196, 178, 146],   // 内缘（C 环最内，极淡）
    [0.12, 0.30, 206, 187, 150],
    [0.18, 0.44, 214, 195, 156],   // C / B 交界
    [0.21, 0.88, 246, 222, 168],   // B 环内缘，明亮起
    [0.30, 0.96, 251, 229, 178],   // B 环最宽最亮（金色主体）
    [0.40, 0.92, 247, 223, 172],
    [0.46, 0.80, 237, 211, 161],
    [0.472, 0.05, 150, 134, 104],  // 卡西尼缝（干净大缝隙）
    [0.485, 0.05, 150, 134, 104],
    [0.50, 0.72, 232, 210, 166],   // 卡西尼缝后亮环（A 环内缘）
    [0.62, 0.60, 224, 202, 159],
    [0.72, 0.66, 229, 207, 163],
    [0.80, 0.46, 212, 190, 149],   // 恩克缝（A 环中细缝，略暗）
    [0.835, 0.62, 227, 205, 161],
    [0.92, 0.40, 215, 195, 154],
    [1.00, 0.07, 192, 173, 142],   // 外缘淡出
  ];
  const sm = (x) => x * x * (3 - 2 * x);          // smoothstep 平滑插值
  function sample(t) {
    let i = 0; while (i < cps.length - 1 && t > cps[i + 1][0]) i++;
    const a = cps[i], b = cps[Math.min(i + 1, cps.length - 1)];
    const span = (b[0] - a[0]) || 1;
    const u = sm(Math.max(0, Math.min(1, (t - a[0]) / span)));
    return {
      al: a[1] + (b[1] - a[1]) * u,
      r:  a[2] + (b[2] - a[2]) * u,
      g:  a[3] + (b[3] - a[3]) * u,
      b:  a[4] + (b[4] - a[4]) * u,
    };
  }
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const base = sample(t);
    // 极轻微的大尺度明暗起伏（±6%），让环有生气但不脏
    const shimmer = 1 + 0.06 * Math.sin(t * Math.PI * 2 * 1.5);
    const a = Math.max(0, Math.min(1, base.al * shimmer));
    out.r.push(Math.min(255, base.r * 1.05));
    out.g.push(Math.min(255, base.g * 1.05));
    out.b.push(Math.min(255, base.b * 1.05));
    out.a.push(a);
  }
  return out;
}
// 柔化程序化环的径向分布，消除分带硬边/锯齿（不影响联网的真实贴图版）
function smoothRingGrad(g, pass) {
  const rad = 2, n = g.a.length;
  let cur = { r: g.r.slice(), g: g.g.slice(), b: g.b.slice(), a: g.a.slice() };
  const passN = pass || 1;
  for (let p = 0; p < passN; p++) {
    const out = { r: new Array(n), g: new Array(n), b: new Array(n), a: new Array(n) };
    for (let i = 0; i < n; i++) {
      let sr = 0, sg = 0, sb = 0, sa = 0, c = 0;
      for (let k = -rad; k <= rad; k++) {
        const j = i + k; if (j < 0 || j >= n) continue;
        sr += cur.r[j]; sg += cur.g[j]; sb += cur.b[j]; sa += cur.a[j]; c++;
      }
      out.r[i] = sr / c; out.g[i] = sg / c; out.b[i] = sb / c; out.a[i] = sa / c;
    }
    cur = out;
  }
  g.r = cur.r; g.g = cur.g; g.b = cur.b; g.a = cur.a;
}
function loadRingTexture() {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => { try { RING_SRC = toSrc(img, img.width, img.height); buildRingGrad(RING_SRC); } catch (e) {} };
  img.onerror = () => {};               // 离线：保留程序化环（已含卡西尼缝等分带）
  img.src = 'https://cdn.jsdelivr.net/gh/tom-bermingham/solar-system@main/textures/8k_saturn_ring_alpha.png';
}
/* 从贴图（Image 或 canvas）生成可逐像素采样的源数据（等距柱状 RGBA） */
function toSrc(img, w, h) {
  const c = makeOffscreen(w, h);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  return { data: d, w, h };
}

/* 逐像素球面映射：把等距柱状源贴图按真实球面几何投影到屏幕，
   世界法线 + 太阳方向做受光，自转绕自转轴旋转。离屏渲染后整体贴回主画布。 */
const sphereBuf = makeOffscreen(8, 8);
const sphereCtx = sphereBuf.getContext('2d');
function drawSphere(src, pr, rScreen, spin, Lworld, emissive, opts) {
  const gctx = (opts && opts.gctx) || ctx;
  const basis = (opts && opts.basis) || null;
  const rX = basis ? basis.right : cam.right;
  const uX = basis ? basis.up : cam.up;
  const fX = basis ? basis.f : cam.f;
  const tilt = (opts && opts.tilt) || 0;
  if (!src) {
    const g = gctx.createRadialGradient(pr.x, pr.y, rScreen * 0.1, pr.x, pr.y, rScreen);
    g.addColorStop(0, '#cfd6e6'); g.addColorStop(1, '#43485c');
    gctx.fillStyle = g; gctx.beginPath(); gctx.arc(pr.x, pr.y, rScreen, 0, Math.PI * 2); gctx.fill();
    return;
  }
  const res = Math.max(24, Math.min(340, Math.round(rScreen * 1.7)));
  const R = res / 2;
  sphereBuf.width = res; sphereBuf.height = res;
  const img = sphereCtx.createImageData(res, res);
  const D = img.data, S = src.data, sw = src.w, sh = src.h;
  const cs = Math.cos(spin), sn = Math.sin(spin);
  const ct = Math.cos(tilt), st = Math.sin(tilt);
  const ambient = 0.5, gain = 1.14;          // ↑ 提高整体亮度：夜面≥50%，白天再增益
  const Lx = Lworld.x, Ly = Lworld.y, Lz = Lworld.z;
  const TWO_PI = Math.PI * 2, HALF_PI = Math.PI / 2;
  for (let py = 0; py < res; py++) {
    const v = (R - py) / R;
    for (let px = 0; px < res; px++) {
      const u = (px - R) / R;
      const rr = u * u + v * v;
      const idx = (py * res + px) * 4;
      if (rr > 1) { D[idx + 3] = 0; continue; }
      const w = Math.sqrt(1 - rr);                 // 朝向相机分量
      // 屏幕圆盘坐标 -> 世界法线（相机基向量组合，-f 指向相机）
      const nx = u * rX.x + v * uX.x - w * fX.x;
      const ny = u * rX.y + v * uX.y - w * fX.y;
      const nz = u * rX.z + v * uX.z - w * fX.z;
      // 受光
      let bright;
      if (emissive) { bright = 1; }
      else { const diff = nx * Lx + ny * Ly + nz * Lz; bright = ambient + (1 - ambient) * (diff > 0 ? diff : 0); }
      // 世界法线 -> 行星本体坐标：先绕 X 轴反向倾斜 tilt，再绕 Y 轴反向自转 spin
      const n1y = ny * ct + nz * st;
      const n1z = -ny * st + nz * ct;
      const lxr = nx * cs - n1z * sn;
      const lzr = nx * sn + n1z * cs;
      const lyr = n1y;
      const lat = Math.asin(lyr < -1 ? -1 : lyr > 1 ? 1 : lyr);
      const lon = Math.atan2(-lzr, lxr);   // 经度取反：修正等距柱状图的东西镜像（非洲/美洲不再左右翻转）
      let sxp = ((lon / TWO_PI + 0.5) * sw) | 0; if (sxp >= sw) sxp -= sw; else if (sxp < 0) sxp += sw;
      let syp = (((HALF_PI - lat) / Math.PI) * sh) | 0; if (syp < 0) syp = 0; else if (syp >= sh) syp = sh - 1;
      const s = (syp * sw + sxp) * 4;
      const b = bright * gain;
      let r0 = S[s] * b, g0 = S[s + 1] * b, b0 = S[s + 2] * b;
      D[idx] = r0 > 255 ? 255 : r0;
      D[idx + 1] = g0 > 255 ? 255 : g0;
      D[idx + 2] = b0 > 255 ? 255 : b0;
      D[idx + 3] = 255;
    }
  }
  sphereCtx.putImageData(img, 0, 0);
  gctx.imageSmoothingEnabled = true;
  gctx.drawImage(sphereBuf, pr.x - rScreen, pr.y - rScreen, rScreen * 2, rScreen * 2);
}

/* ---------- 绘制：单颗行星 ---------- */
function drawPlanet(p) {
  const pos = planetWorld(p);
  const pr = project(pos);
  if (!pr.visible) return;
  const rScreen = (focal * p.visualR) / pr.depth;

  // 土星环（后半部分，先画）
  let ringFront = null;
  if (p.ring) ringFront = drawSaturnRing(pos, pr.depth, p.visualR);

  // 受光方向（指向太阳）世界向量
  const L = norm(sub(ORIGIN, pos));
  // 土星按真实自转轴倾角倾斜，使本体自转轴与环面一致
  drawSphere(p.src, pr, rScreen, p.spin, L, false, p.ring ? { tilt: SATURN_TILT } : null);

  // 土星环（前半部分，后画）
  if (ringFront) ringFront();

  // 名字标签
  ctx.font = '13px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillText(p.name, pr.x + 1, pr.y - rScreen - 5 + 1);
  ctx.fillStyle = '#eaf0ff';
  ctx.fillText(p.name, pr.x, pr.y - rScreen - 5);
}

/* ---------- 绘制：太阳 ---------- */
function drawSun() {
  const pr = project(ORIGIN);
  if (!pr.visible) return;
  const r = (focal * SUN_R) / pr.depth;
  // 外晕
  const glow = ctx.createRadialGradient(pr.x, pr.y, r * 0.6, pr.x, pr.y, r * 2.0);
  glow.addColorStop(0, 'rgba(255,200,80,0.55)');
  glow.addColorStop(1, 'rgba(255,160,40,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(pr.x, pr.y, r * 2.6, 0, Math.PI * 2); ctx.fill();
  // 本体（真实照片纹理，自发光）
  drawSphere(SUN.src, pr, r, sunSpin, UP, true);
  // 标签
  ctx.font = '14px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#fff3c4';
  ctx.fillText('太阳', pr.x, pr.y - r - 6);
}

/* ---------- 小行星带标注（虚线边界 + 文字标签，整条带可点击）---------- */
const BELT_AU_IN = 2.15, BELT_AU_OUT = 3.35;
function drawBeltMarkers() {
  const rIn = ORBIT_K * Math.pow(BELT_AU_IN, ORBIT_EXP);
  const rOut = ORBIT_K * Math.pow(BELT_AU_OUT, ORBIT_EXP);
  const mid = (rIn + rOut) / 2;
  ctx.save();
  ctx.strokeStyle = 'rgba(170,200,255,0.30)';
  ctx.setLineDash([7, 7]); ctx.lineWidth = 1.1;
  for (const r of [rIn, rOut]) {
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= 72; i++) {
      const a = i / 72 * Math.PI * 2;
      const pr = project({ x: r * Math.cos(a), y: 0, z: r * Math.sin(a) });
      if (!pr.visible) { started = false; continue; }
      if (!started) { ctx.moveTo(pr.x, pr.y); started = true; } else ctx.lineTo(pr.x, pr.y);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  const lp = project({ x: mid * Math.cos(-Math.PI / 2), y: 0, z: mid * Math.sin(-Math.PI / 2) });
  if (lp.visible) {
    ctx.font = '600 13px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillText('⬡ 小行星带', lp.x + 1, lp.y - 6 + 1);
    ctx.fillStyle = 'rgba(206,222,255,0.96)';
    ctx.fillText('⬡ 小行星带', lp.x, lp.y - 6);
  }
  ctx.restore();
}
function pointInPolygon(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
// 命中判定：在「投影后的小行星带环带」内（内环与外环之间的椭圆带），比简单按到太阳的径向距离更准
function hitTestBelt(mx, my) {
  const rIn = ORBIT_K * Math.pow(BELT_AU_IN, ORBIT_EXP);
  const rOut = ORBIT_K * Math.pow(BELT_AU_OUT, ORBIT_EXP);
  const inner = [], outer = [];
  for (let i = 0; i <= 90; i++) {
    const a = i / 90 * Math.PI * 2;
    const ca = Math.cos(a), sa = Math.sin(a);
    const pi = project({ x: rIn * ca, y: 0, z: rIn * sa });
    const po = project({ x: rOut * ca, y: 0, z: rOut * sa });
    if (pi.visible) inner.push({ x: pi.x, y: pi.y });
    if (po.visible) outer.push({ x: po.x, y: po.y });
  }
  if (inner.length < 3 || outer.length < 3) return false;
  return pointInPolygon(mx, my, outer) && !pointInPolygon(mx, my, inner);
}

/* ---------- 地月系专题渲染（示意比例）---------- */
// 由月球相对太阳的方位角（公转方向）判断月相名称
function emPhaseName(deg) {
  const a = ((deg % 360) + 360) % 360;
  if (a < 15 || a >= 345) return '新月';
  if (a < 75) return '蛾眉月（盈）';
  if (a <= 105) return '上弦月';
  if (a < 165) return '盈凸月';
  if (a <= 195) return '满月';
  if (a < 255) return '亏凸月';
  if (a <= 285) return '下弦月';
  return '残月';
}
// 在 2D 圆盘上画出「当前月相」的样子（北半球习惯：盈=右侧受光，亏=左侧受光）
// illum: 受光比例 0~1；litOnRight: 受光面是否朝右
function drawMoonPhaseDisk(cx, cy, R, illum, litOnRight) {
  // 阴影面（整盘先铺底）
  ctx.fillStyle = 'rgba(38,44,62,0.96)';
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
  // 受光面：由半圆轮廓 + 终止线半椭圆组成
  ctx.fillStyle = '#f3efe2';
  const a = (1 - 2 * illum) * R;            // 终止线水平半轴（带符号：>0 凸向右，<0 凸向左）
  ctx.beginPath();
  if (litOnRight) ctx.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2, false);   // 右半圆轮廓（顶→底经右侧）
  else            ctx.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2, true);    // 左半圆轮廓（顶→底经左侧）
  const bulgeRight = litOnRight ? (a > 0) : (a < 0);
  ctx.ellipse(cx, cy, Math.abs(a) || 1e-4, R, 0, Math.PI / 2, -Math.PI / 2, bulgeRight);
  ctx.closePath(); ctx.fill();
  // 细描边，深色背景上更清晰
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
}
// 圆角矩形路径
function rr(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function drawEarthMoonScene() {
  const sunPos = { x: EM.sunDist, y: 0, z: 0 };
  // 月球位置（地球在原点）
  const mPos = { x: EM.moonOrbitR * Math.cos(emMoonAngle), y: 0, z: EM.moonOrbitR * Math.sin(emMoonAngle) };
  // 月相：月球相对太阳的夹角（0=新月, 90=上弦, 180=满月, 270=下弦）
  // 注意：emMoonAngle 是递减的（屏幕上月球逆时针公转），故相位角取负，使月相按
  // 正确天文顺序循环：新月→上弦→满月→下弦→新月（北半球：盈=右亮、亏=左亮）
  const ang = (-emMoonAngle) * 180 / Math.PI;
  const illum = (1 - Math.cos(ang * Math.PI / 180)) / 2;
  const phase = emPhaseName(ang);

  // 月球公转轨道（淡虚线，帮助理解"月球绕着地球转"）
  ctx.save();
  ctx.strokeStyle = 'rgba(180,200,255,0.18)';
  ctx.setLineDash([4, 7]); ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= 80; i++) {
    const a = i / 80 * Math.PI * 2;
    const q = project({ x: EM.moonOrbitR * Math.cos(a), y: 0, z: EM.moonOrbitR * Math.sin(a) });
    if (!q.visible) continue;
    if (i === 0) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y);
  }
  ctx.stroke(); ctx.setLineDash([]); ctx.restore();

  // 太阳（侧方光源，先画）
  const sp = project(sunPos);
  if (sp.visible) {
    const r = (focal * EM.sunR) / sp.depth;
    const glow = ctx.createRadialGradient(sp.x, sp.y, r * 0.6, sp.x, sp.y, r * 2.2);
    glow.addColorStop(0, 'rgba(255,200,80,0.5)');
    glow.addColorStop(1, 'rgba(255,160,40,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(sp.x, sp.y, r * 2.6, 0, Math.PI * 2); ctx.fill();
    drawSphere(SUN.src, sp, r, sunSpin, UP, true);
    ctx.font = '14px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText('太阳（示意）', sp.x + 1, sp.y - r - 6 + 1);
    ctx.fillStyle = '#fff3c4'; ctx.fillText('太阳（示意）', sp.x, sp.y - r - 6);
  }

  // 地球 + 月球，按深度从远到近绘制
  const bodies = [];
  const ep = project(ORIGIN);
  if (ep.visible) bodies.push({ name: '地球', proj: ep, r: (focal * EM.earthR) / ep.depth,
    L: norm(sub(sunPos, ORIGIN)), src: EARTH.src, spin: emEarthSpin });
  const mp = project(mPos);
  if (mp.visible) bodies.push({ name: '月球', proj: mp, r: (focal * EM.moonR) / mp.depth,
    L: norm(sub(sunPos, mPos)), src: MOON.src, spin: emMoonSpin });
  bodies.sort((a, b) => b.proj.depth - a.proj.depth);
  for (const b of bodies) {
    drawSphere(b.src, b.proj, b.r, b.spin, b.L, false);
    ctx.font = '13px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(b.name, b.proj.x + 1, b.proj.y - b.r - 5 + 1);
    ctx.fillStyle = (b.name === '地球') ? '#bfe0ff' : '#dfe6f5';
    ctx.fillText(b.name, b.proj.x, b.proj.y - b.r - 5);
  }

  // 顶部说明 + 当前月相
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.font = '600 15px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText('地月系（示意比例：距离与大小为方便观察已压缩）', W / 2 + 1, 58 + 1);
  ctx.fillStyle = '#cfe0ff';
  ctx.fillText('地月系（示意比例：距离与大小为方便观察已压缩）', W / 2, 58);
  const cap = '当前月相：' + phase + '（亮面约 ' + Math.round(illum * 100) + '%）';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '14px "PingFang SC","Microsoft YaHei",sans-serif';
  const capY = 104;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText(cap, W / 2 + 1, capY + 1);
  ctx.fillStyle = '#ffe08a';
  ctx.fillText(cap, W / 2, capY);
  // 在文字右侧画一个真实的月相小图，让孩子直观看到「当前是哪一种月相」
  const litOnRight = (ang >= 0 && ang < 180);
  const diskR = 15, diskX = W / 2 + ctx.measureText(cap).width / 2 + 24, diskY = capY;
  drawMoonPhaseDisk(diskX, diskY, diskR, illum, litOnRight);

  // 月相周期 8 相名称条（实时高亮当前所在相）
  const PH = [
    ['新月', '新月'], ['蛾眉月（盈）', '蛾眉'], ['上弦月', '上弦'], ['盈凸月', '盈凸'],
    ['满月', '满月'], ['亏凸月', '亏凸'], ['下弦月', '下弦'], ['残月', '残月'],
  ];
  const curIdx = PH.findIndex(x => x[0] === phase);
  const gap = 6, n = PH.length;
  const maxW = Math.min(W - 24, 560);
  const chipW = Math.max(38, (maxW - (n - 1) * gap) / n);
  const chipH = 26;
  const totalW = n * chipW + (n - 1) * gap;
  // 移到顶部信息区（标题 + “当前月相”下方），避开底部含“速度”滑块的控制面板遮挡
  const barTop = 140, labelY = barTop - 16;
  const sx = W / 2 - totalW / 2, sy = barTop;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '12.5px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillStyle = '#9fb0d8';
  ctx.fillText('月相周期（当前高亮）', W / 2, labelY);
  for (let i = 0; i < n; i++) {
    const x = sx + i * (chipW + gap);
    const on = i === curIdx;
    rr(ctx, x, sy, chipW, chipH, 8);
    ctx.fillStyle = on ? '#ffd166' : 'rgba(20,28,56,0.85)';
    ctx.fill();
    ctx.strokeStyle = on ? '#ffd166' : 'rgba(90,110,160,0.5)'; ctx.lineWidth = 1;
    rr(ctx, x, sy, chipW, chipH, 8); ctx.stroke();
    ctx.fillStyle = on ? '#1a1300' : '#cdd8ff';
    ctx.fillText(PH[i][1], x + chipW / 2, sy + chipH / 2 + 0.5);
  }
}

/* ---------- 偶发流星（增加趣味） ---------- */
let meteors = [];
function spawnMeteor() {
  // 从顶部或左侧随机出现，向右下方划过，约 45° 偏下
  const fromTop = Math.random() < 0.5;
  const x = fromTop ? Math.random() * W : -20;
  const y = fromTop ? -20 : Math.random() * H * 0.5;
  const ang = Math.PI / 4 + (Math.random() - 0.5) * 0.5;
  const sp = 380 + Math.random() * 260;
  meteors.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0, max: 0.9 + Math.random() * 0.5, len: 70 + Math.random() * 60 });
}
function updateMeteors(dt) {
  if (playing && Math.random() < dt * 0.35 && meteors.length < 4) spawnMeteor(); // 平均约每 3 秒一颗
  for (const m of meteors) { m.x += m.vx * dt; m.y += m.vy * dt; m.life += dt; }
  meteors = meteors.filter(m => m.life < m.max && m.x < W + 90 && m.y < H + 90);
}
function drawMeteors() {
  for (const m of meteors) {
    const t = m.life / m.max;
    const a = (1 - t) * 0.9;
    const d = Math.hypot(m.vx, m.vy);
    const tx = m.x - m.vx / d * m.len, ty = m.y - m.vy / d * m.len;
    const g = ctx.createLinearGradient(m.x, m.y, tx, ty);
    g.addColorStop(0, 'rgba(255,255,255,' + a + ')');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.fillStyle = 'rgba(255,250,220,' + a + ')';
    ctx.beginPath(); ctx.arc(m.x, m.y, 2.2, 0, Math.PI * 2); ctx.fill();
  }
}

/* ---------- 主渲染 ---------- */
function render() {
  ctx.clearRect(0, 0, W, H);
  // 星空
  for (const s of STARS) {
    const q = project(s);
    if (!q.visible) continue;
    ctx.fillStyle = 'rgba(255,255,255,' + s.a + ')';
    ctx.fillRect(q.x, q.y, 1.4, 1.4);
  }
  // 偶发流星
  drawMeteors();
  // 轨道
  if (emMode) { drawEarthMoonScene(); return; }
  for (const p of PLANETS) drawOrbit(p);
  // 太阳 + 行星
  drawSun();
  for (const p of PLANETS) drawPlanet(p);
  drawAsteroidBelt();
  drawBeltMarkers();
  drawMoon();
}

/* ---------- 动画循环 ---------- */
// 速度标定：滑块显示仍为 0.1~10×（数值不变），但实际转动幅度降到原来的 1/3
const SPEED_CALIB = 1 / 3;
let playing = true, timeScale = 1, last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (playing) {
    const eff = timeScale * SPEED_CALIB;   // 真实生效速度 = 显示值 × 1/3
    sunSpin += 0.4 * eff * dt;
    if (emMode) {
      // 地月系：地球自转 + 月球绕地球公转（示意节奏）；月球潮汐锁定（同一面朝向地球）
      emEarthSpin += EM.earthSpinSpeed * eff * dt;
      emMoonAngle -= EM.moonOrbitSpeed * eff * dt;   // 月球公转方向与行星一致（自北向南看为逆时针）
      emMoonSpin = emMoonAngle;
    } else {
      // 太阳系：所有行星、小行星带、月球公转与自转均为逆时针（自北黄极俯视为逆时针；本俯视相机下屏幕呈逆时针）
      for (const p of PLANETS) { p.angle -= p.orbitSpeed * eff * dt; p.spin -= p.spinSpeed * eff * dt; }
      for (const a of ASTEROIDS) { a.angle -= a.orbitSpeed * eff * dt; a.spin -= a.spinSpeed * eff * dt; }
      MOON.angle -= MOON.orbitSpeed * eff * dt;
      MOON.spin -= MOON.spinSpeed * eff * dt;
    }
  }
  updateCamera();
  updateMeteors(dt);
  if (!detailOpen) render();
  requestAnimationFrame(frame);
}

/* ---------- 交互 ---------- */
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  camDist *= 1 + e.deltaY * 0.0012;
  camDist = Math.max(30, Math.min(6000, camDist));
}, { passive: false });

let dragging = false, lx = 0, ly = 0;
let dragMode = 'rotate';   // 'rotate' = 旋转视角；'pan' = 拖动平移
canvas.addEventListener('pointerdown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - lx, dy = e.clientY - ly;
  if (dragMode === 'pan') {
    // 抓着场景平移：移动视线中心，让内容跟着手指走
    const k = camDist / focal;
    target.x += (-cam.right.x * dx + cam.up.x * dy) * k;
    target.y += (-cam.right.y * dx + cam.up.y * dy) * k;
    target.z += (-cam.right.z * dx + cam.up.z * dy) * k;
  } else {
    camYaw -= dx * 0.005;
    camPitch += dy * 0.005;
    camPitch = Math.max(-1.4, Math.min(1.4, camPitch));
  }
  lx = e.clientX; ly = e.clientY;
});
canvas.addEventListener('pointerup', (e) => { dragging = false; });
canvas.addEventListener('pointercancel', () => { dragging = false; });

// 拖动模式切换：旋转视角 / 拖动平移
document.querySelectorAll('#modes button').forEach((b) => {
  b.addEventListener('click', () => {
    dragMode = b.dataset.mode;
    document.querySelectorAll('#modes button').forEach((x) => x.classList.toggle('active', x === b));
  });
});

const playBtn = document.getElementById('playBtn');
playBtn.addEventListener('click', () => {
  playing = !playing;
  playBtn.textContent = playing ? '⏸ 暂停' : '▶ 播放';
});
const speed = document.getElementById('speed');
const speedVal = document.getElementById('speedVal');
speed.addEventListener('input', () => { timeScale = parseFloat(speed.value); speedVal.textContent = timeScale.toFixed(1) + '×'; });
// 太阳系 / 地月系 切换
function setViewMode(mode) {
  emMode = (mode === 'earthmoon');
  document.querySelectorAll('#viewModes button').forEach((b) => b.classList.toggle('active', b.dataset.view === mode));
  if (emMode) { camYaw = 0.5; camPitch = 0.42; camDist = 430; target = { x: 90, y: 0, z: 0 }; }
  else { camYaw = 0.6; camPitch = 0.5; camDist = 1500; target = { x: 0, y: 0, z: 0 }; }
  updateCamera();
  if (!detailOpen) render();
}
document.querySelectorAll('#viewModes button').forEach((b) => {
  b.addEventListener('click', () => setViewMode(b.dataset.view));
});
document.getElementById('resetBtn').addEventListener('click', () => {
  if (emMode) { camYaw = 0.5; camPitch = 0.42; camDist = 430; target = { x: 90, y: 0, z: 0 }; }
  else { camYaw = 0.6; camPitch = 0.5; camDist = 1500; target = { x: 0, y: 0, z: 0 }; }
});

/* ---------- 更新日志弹窗 ---------- */
const clEl = document.getElementById('changelog');
const clBody = document.getElementById('clBody');
const clBtn = document.getElementById('changelogBtn');
clBtn.textContent = '📋 更新日志 v' + CURRENT_VERSION;   // 按钮显示当前版本号
function renderChangelog() {
  clBody.innerHTML = CHANGELOG.map((e) => {
    const major = e.type === 'major';
    const items = (e.changes || []).map((c) => `<li>${c}</li>`).join('');
    return `<div class="cl-ver">
      <div class="cl-vhead">
        <span class="cl-vnum${major ? ' major' : ''}">v${e.ver}</span>
        <span class="cl-type${major ? ' major' : ''}">${major ? '大版本' : '小版本'}</span>
        <span class="cl-date">${e.date}</span>
      </div>
      <div class="cl-title">${e.title}</div>
      <ul class="cl-list">${items}</ul>
    </div>`;
  }).join('');
}
function openChangelog() { renderChangelog(); clEl.classList.remove('hidden'); }
function closeChangelog() { clEl.classList.add('hidden'); }
clBtn.addEventListener('click', openChangelog);
document.getElementById('clClose').addEventListener('click', closeChangelog);
document.getElementById('clBackdrop').addEventListener('click', closeChangelog);
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeChangelog(); });

/* ============================================================
   星球详情页：点击星球 -> 左侧信息 + 右侧可旋转 3D 建模
   右侧用和主场景同一套真实表面贴图，逐像素球面映射，拖动旋转、滚轮缩放
   ============================================================ */
const detailCanvas = document.getElementById('detailCanvas');
const dctx = detailCanvas.getContext('2d');
let detailPlanet = null, detailOpen = false, detailBelt = false;
let detailSpin = 0, detailTilt = 0.5, detailZoom = 1;
let dDrag = false, dLX = 0, dLY = 0, dLastW = 0, dLastH = 0;
let detailRAF = null, downX = 0, downY = 0;

// 详情页「下一个」浏览顺序：水星…海王星，月球紧跟地球之后，木星之后是小行星带，最后太阳
const DETAIL_SEQUENCE = (function () {
  const seq = [];
  for (const p of PLANETS) { seq.push(p); if (p.name === '地球') seq.push(MOON); if (p.name === '木星') seq.push(BELT); }
  seq.push(SUN);
  return seq;
})();

// 详情页相机：正对星球（right=+X, up=+Y, 视线沿 -Z），可独立旋转/倾斜
const DETAIL_BASIS = { right: { x: 1, y: 0, z: 0 }, up: { x: 0, y: 1, z: 0 }, f: { x: 0, y: 0, z: -1 } };
const DETAIL_LIGHT = norm({ x: -0.4, y: 0.35, z: 0.85 });  // 固定的"太阳"方向：照亮朝向我们的一面

function hitTestPlanet(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const mx = clientX - rect.left, my = clientY - rect.top;
  if (emMode) {
    const sp = project({ x: EM.sunDist, y: 0, z: 0 });
    if (sp.visible && Math.hypot(mx - sp.x, my - sp.y) <= (focal * EM.sunR) / sp.depth + 8) return SUN;
    const ep = project(ORIGIN);
    if (ep.visible && Math.hypot(mx - ep.x, my - ep.y) <= (focal * EM.earthR) / ep.depth + 8) return EARTH;
    const mPos = { x: EM.moonOrbitR * Math.cos(emMoonAngle), y: 0, z: EM.moonOrbitR * Math.sin(emMoonAngle) };
    const mp = project(mPos);
    if (mp.visible && Math.hypot(mx - mp.x, my - mp.y) <= (focal * EM.moonR) / mp.depth + 8) return MOON;
    return null;
  }
  const sp = project(ORIGIN);
  if (sp.visible) {
    const sr = (focal * SUN_R) / sp.depth;
    if (Math.hypot(mx - sp.x, my - sp.y) <= sr + 8) return SUN;
  }
  for (const p of PLANETS) {
    const pr = project(planetWorld(p));
    if (!pr.visible) continue;
    const rScreen = (focal * p.visualR) / pr.depth;
    if (Math.hypot(mx - pr.x, my - pr.y) <= rScreen + 8) return p;
  }
  // 月球（位置跟随地球）
  const mp = project(moonWorld());
  if (mp.visible) {
    const mr = (focal * MOON.visualR) / mp.depth;
    if (Math.hypot(mx - mp.x, my - mp.y) <= mr + 8) return MOON;
  }
  // 小行星带（整条环带可点）
  if (hitTestBelt(mx, my)) return BELT;
  return null;
}

function openDetail(p) {
  detailPlanet = p;
  detailBelt = (p === BELT);
  detailOpen = true;
  detailSpin = (p === SUN) ? sunSpin : (p.spin || 0);   // 沿用当前角度，视觉连续（兜底避免 NaN）
  detailTilt = 0.5; detailZoom = 1;
  document.getElementById('detail').classList.remove('hidden');
  document.getElementById('sky').style.display = 'none';
  document.getElementById('ui').style.display = 'none';
  document.getElementById('panel').style.display = 'none';
  document.getElementById('flag').style.display = 'none';
  fillDetailInfo(p);
  if (!detailRAF) detailRAF = requestAnimationFrame(detailFrame);
}
function closeDetail() {
  detailOpen = false;
  detailPlanet = null;
  detailBelt = false;
  document.getElementById('detail').classList.add('hidden');
  document.getElementById('sky').style.display = '';
  document.getElementById('ui').style.display = '';
  document.getElementById('panel').style.display = '';
  document.getElementById('flag').style.display = '';
  if (detailRAF) { cancelAnimationFrame(detailRAF); detailRAF = null; }
  resize();            // 详情页打开期间画布曾被隐藏，恢复尺寸（防止 W/H 被清零）
  updateCamera();
  render();            // 立即重绘主场景，避免返回瞬间出现黑屏
}
function fillDetailInfo(p) {
  document.getElementById('d-name').textContent = p.name;
  document.getElementById('d-tag').textContent = p.tagline || '';
  document.getElementById('d-explain').textContent = p.childExplain || '';
  document.getElementById('d-stats').innerHTML = (p.stats || []).map(s => `<li>${s}</li>`).join('');
  document.getElementById('d-facts').innerHTML = (p.facts || []).map(f => `<li>${f}</li>`).join('');
  // 体重体验小工具：基于真实表面重力实时换算
  const gEl = document.getElementById('d-gravity');
  const gRes = document.getElementById('d-gresult');
  const gInput = document.getElementById('d-weight');
  const g = SURFACE_G[p.name];
  if (typeof g === 'number' && gEl && gRes && gInput) {
    gEl.style.display = '';
    const calc = () => {
      const w = parseFloat(gInput.value);
      if (!isFinite(w) || w <= 0) { gRes.textContent = '请输入有效体重～'; return; }
      const onBody = w * g;
      let extra = '';
      if (g >= 2) extra = '（比地球上重好多，轻轻一跳都很费力！）';
      else if (g <= 0.4) extra = '（比地球上轻很多，一蹦就能跳得老高！）';
      const where = (p.name === '太阳') ? '太阳表面（如果能站在炽热气体上）' : (p.name + '表面');
      gRes.innerHTML = `站在 <b>${where}</b>，你约 <b>${onBody.toFixed(1)}</b> 公斤 ${extra}`;
    };
    gInput.oninput = calc;
    calc();
  } else if (gEl) {
    gEl.style.display = 'none';
  }
  const note = document.getElementById('d-model-note');
  if (note) note.textContent = p.modelNote || '';
  const hint = document.getElementById('d-hint3d');
  if (hint) hint.textContent = p.modelNote
    ? '拖动旋转 · 滚轮缩放（真实小行星三维形状）'
    : '拖动旋转 · 滚轮缩放（真实表面贴图）';
  renderQuiz(p);
  const next = document.getElementById('d-next');
  next.style.display = 'none';
  next.onclick = () => {
    const i = DETAIL_SEQUENCE.indexOf(p);
    openDetail(DETAIL_SEQUENCE[(i + 1) % DETAIL_SEQUENCE.length]);
  };
}
function renderQuiz(p) {
  const box = document.getElementById('d-quiz');
  box.innerHTML = '';
  if (!p.quiz || !p.quiz.length) { box.style.display = 'none'; return; }
  box.style.display = '';
  p.quiz.forEach((item, qi) => {
    const qEl = document.createElement('div'); qEl.className = 'q';
    const qt = document.createElement('div'); qt.className = 'qt'; qt.textContent = (qi + 1) + '. ' + item.q;
    qEl.appendChild(qt);
    const fb = document.createElement('div'); fb.className = 'feedback';
    item.a.forEach((opt) => {
      const b = document.createElement('button'); b.className = 'opt'; b.type = 'button'; b.textContent = opt[0];
      b.addEventListener('click', () => {
        if (qEl.dataset.done) return;
        qEl.dataset.done = '1';
        if (opt[1]) {
          b.classList.add('right'); fb.textContent = '✅ 答对啦！'; fb.className = 'feedback ok';
        } else {
          b.classList.add('wrong'); fb.textContent = '❌ ' + item.why; fb.className = 'feedback bad';
          qEl.querySelectorAll('.opt').forEach((ob, j) => { if (item.a[j][1]) ob.classList.add('right'); });
        }
        qEl.querySelectorAll('.opt').forEach((ob) => { ob.disabled = true; });
        checkAllDone();
      });
      qEl.appendChild(b);
    });
    qEl.appendChild(fb);
    box.appendChild(qEl);
  });
}
function checkAllDone() {
  const qs = document.querySelectorAll('#d-quiz .q');
  let all = true; for (const q of qs) if (!q.dataset.done) all = false;
  document.getElementById('d-next').style.display = all ? '' : 'none';
}
// 详情页土星环：与主场景一致——环在真实赤道面、按 SATURN_TILT+用户视角倾斜，并投射土星本影
// which: 'back' 画背向相机的一半(星球之前)；'front' 画朝向相机的一半(星球之后)
function drawDetailRing(rScreen, cx, cy, tilt, which, spin) {
  // 卡通实心土星环：把倾斜椭圆还原成"圆空间"，用环形裁剪 + 圆形径向渐变填充，
  // 颜色取自干净平滑的环带数据 → 连续实心、无框线/网格；再叠加土星本影与受光高光。
  const rin = rScreen * 1.3 * (ringGrad ? 0.92 : 1), rout = rScreen * 2.4;
  const T = Math.max(0.04, Math.abs(tilt));
  const sT = Math.sin(T);
  const rxO = rout, rxI = rin;                        // 水平半轴（外/内）
  const ryO = rxO * Math.max(0.05, Math.abs(sT));    // 竖直半轴：随倾斜压扁 → 优美椭圆
  const sq = ryO / rxO;                              // 压扁比 → 还原成圆
  const L = DETAIL_LIGHT, rN = rScreen * 1.0;
  const backHalf = (which === 'back');               // 背半=上半(先画被星球盖)；前半=下半(盖星球)
  dctx.save();
  // 屏幕空间：上/下半拆分前后环
  dctx.beginPath();
  if (backHalf) dctx.rect(0, 0, 1e6, cy); else dctx.rect(0, cy, 1e6, 1e6);
  dctx.clip();
  // 变换到"环平面未压扁"坐标：y 放大，椭圆→圆
  dctx.translate(cx, cy);
  dctx.scale(1, sq);
  // 环形裁剪：外圆 - 内圆（evenodd）
  dctx.beginPath();
  dctx.arc(0, 0, rxO, 0, Math.PI * 2);
  dctx.arc(0, 0, rxI, 0, Math.PI * 2);
  dctx.clip('evenodd');
  // 实心环面：圆形径向渐变（映射到椭圆环带），干净平滑无网格
  const grad = dctx.createRadialGradient(0, 0, rxI, 0, 0, rxO);
  const ST = 64;
  for (let s = 0; s <= ST; s++) {
    const t = s / ST;
    const idx = Math.round(t * 255);
    const a = ringGrad ? ringGrad.a[idx] : 0.5;
    let r = ringGrad ? ringGrad.r[idx] : 214, g = ringGrad ? ringGrad.g[idx] : 198, b = ringGrad ? ringGrad.b[idx] : 160;
    r = Math.min(255, r * 1.08); g = Math.min(255, g * 1.08); b = Math.min(255, b * 1.08);
    if (a < 0.02) grad.addColorStop(t, 'rgba(0,0,0,0)');
    else grad.addColorStop(t, `rgba(${r | 0},${g | 0},${b | 0},${Math.min(1, a * 1.4)})`);
  }
  dctx.fillStyle = grad;
  dctx.beginPath(); dctx.arc(0, 0, rxO, 0, Math.PI * 2); dctx.fill();
  // 土星本影：背光侧的柔和暗影（楔形，真实照片里环被星球影子切断）
  const sgx = -L.x * rN * 0.78, sgy = (-L.y * rN * 0.78) / sq;
  const sg = dctx.createRadialGradient(sgx, sgy, 0, sgx, sgy, rN * 1.75);
  sg.addColorStop(0, 'rgba(16,11,5,0.62)');
  sg.addColorStop(0.7, 'rgba(16,11,5,0.28)');
  sg.addColorStop(1, 'rgba(16,11,5,0)');
  dctx.fillStyle = sg;
  dctx.beginPath(); dctx.arc(0, 0, rxO, 0, Math.PI * 2); dctx.fill();
  // 受光侧柔和高光（前向散射，让环发亮有质感）
  const hx = L.x * rxO * 0.5, hy = (L.y * rxO * 0.5) / sq;
  const hg = dctx.createRadialGradient(hx, hy, 0, hx, hy, rxO * 1.1);
  hg.addColorStop(0, 'rgba(255,250,235,0.22)');
  hg.addColorStop(0.5, 'rgba(255,250,235,0.05)');
  hg.addColorStop(1, 'rgba(255,250,235,0)');
  dctx.fillStyle = hg;
  dctx.beginPath(); dctx.arc(0, 0, rxO, 0, Math.PI * 2); dctx.fill();
  dctx.restore();
}
function drawDetail() {
  const w = detailCanvas.clientWidth, h = detailCanvas.clientHeight;
  if (w !== dLastW || h !== dLastH) {
    detailCanvas.width = Math.round(w * DPR);
    detailCanvas.height = Math.round(h * DPR);
    dLastW = w; dLastH = h;
  }
  dctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  dctx.clearRect(0, 0, w, h);
  if (!detailPlanet) return;
  const cx = w / 2, cy = h / 2;
  const rScreen = (detailBelt ? Math.min(w, h) * 0.42 : Math.min(w, h) * 0.34) * detailZoom;
  if (detailBelt) {
    // 接触阴影，强调这是一颗悬浮的 3D 岩石
    dctx.save();
    dctx.fillStyle = 'rgba(0,0,0,0.28)';
    dctx.beginPath();
    dctx.ellipse(cx, cy + rScreen * 0.78, rScreen * 0.7, rScreen * 0.22, 0, 0, Math.PI * 2);
    dctx.fill();
    dctx.restore();
    drawDetailBeltAsteroid(cx, cy, rScreen, detailSpin, detailTilt);
    return;
  }
  // 土星：环在真实赤道面，倾角 = 真实自转轴倾角(26.73°) + 用户视角；本体同步，保证环与球体一致
  const effTilt = detailPlanet.ring ? (SATURN_TILT + detailTilt) : detailTilt;
  if (detailPlanet.ring) drawDetailRing(rScreen, cx, cy, effTilt, 'back', detailSpin);   // 环后半（先画，被星球盖住）
  drawSphere(detailPlanet.src, { x: cx, y: cy }, rScreen, detailSpin, DETAIL_LIGHT, detailPlanet === SUN,
    { gctx: dctx, basis: DETAIL_BASIS, tilt: effTilt });
  if (detailPlanet.ring) drawDetailRing(rScreen, cx, cy, effTilt, 'front', detailSpin);  // 环前半（盖在星球上）
}

// 详情页里展示一颗可旋转的代表小行星（程序化不规则岩石，逐面受光 + 背面剔除）
function drawDetailBeltAsteroid(cx, cy, R, spin, tilt) {
  const c = Math.cos(tilt), s = Math.sin(tilt);
  const right = DETAIL_BASIS.right;                         // (1,0,0)
  const up = { x: 0, y: c, z: -s };
  const f = { x: 0, y: s, z: c };                            // 视线方向（远离相机）
  const light = DETAIL_LIGHT;
  const geom = BELT_MODEL || BELT_FEATURED;   // 真实贝努形状（内嵌）；缺失则回退程序化岩石
  const nv = geom.verts.length, nf = geom.faces.length;
  // 复用缓冲，避免每帧大量对象分配（真实模型面数多，必须省 GC）
  if (!geom._rv || geom._rv.length !== nv * 3) {
    geom._rv = new Float32Array(nv * 3);
    geom._rn = new Float32Array(nf * 3);
    geom._zc = new Float32Array(nf);
    geom._order = new Int32Array(nf);
  }
  const rv = geom._rv, rn = geom._rn, zc = geom._zc, order = geom._order;
  const axis = norm({ x: 0.35, y: 0.5, z: 0.78 });
  const M = rotMat(axis.x, axis.y, axis.z, spin);
  for (let i = 0; i < nv; i++) {
    const v = geom.verts[i];
    rv[i * 3]     = M[0][0] * v.x + M[0][1] * v.y + M[0][2] * v.z;
    rv[i * 3 + 1] = M[1][0] * v.x + M[1][1] * v.y + M[1][2] * v.z;
    rv[i * 3 + 2] = M[2][0] * v.x + M[2][1] * v.y + M[2][2] * v.z;
  }
  let cnt = 0;
  for (let i = 0; i < nf; i++) {
    const n0 = geom.normals[i];
    const nx = M[0][0] * n0.x + M[0][1] * n0.y + M[0][2] * n0.z;
    const ny = M[1][0] * n0.x + M[1][1] * n0.y + M[1][2] * n0.z;
    const nz = M[2][0] * n0.x + M[2][1] * n0.y + M[2][2] * n0.z;
    if (nx * f.x + ny * f.y + nz * f.z >= 0) continue;       // 背面剔除（法线·视线 >=0 即背对相机）
    rn[i * 3] = nx; rn[i * 3 + 1] = ny; rn[i * 3 + 2] = nz;
    order[cnt++] = i;
  }
  // 按深度排序（远→近），直接对 Int32Array 子区间排序，避免额外数组分配
  order.subarray(0, cnt).sort((p, q) => {
    const fp = geom.faces[p], fq = geom.faces[q];
    const zp = rv[fp[0] * 3 + 2] + rv[fp[1] * 3 + 2] + rv[fp[2] * 3 + 2];
    const zq = rv[fq[0] * 3 + 2] + rv[fq[1] * 3 + 2] + rv[fq[2] * 3 + 2];
    return zp - zq;
  });
  for (let k = 0; k < cnt; k++) {
    const i = order[k];
    const fc = geom.faces[i];
    const a = fc[0] * 3, b = fc[1] * 3, c3 = fc[2] * 3;
    const nx = rn[i * 3], ny = rn[i * 3 + 1], nz = rn[i * 3 + 2];
    const diff = nx * light.x + ny * light.y + nz * light.z;
    const bright = 0.40 + 0.60 * (diff > 0 ? diff : 0);     // 纯法线漫反射，真实陨石质感
    const p0x = cx + R * (rv[a] * right.x + rv[a + 1] * right.y + rv[a + 2] * right.z);
    const p0y = cy - R * (rv[a] * up.x + rv[a + 1] * up.y + rv[a + 2] * up.z);
    const p1x = cx + R * (rv[b] * right.x + rv[b + 1] * right.y + rv[b + 2] * right.z);
    const p1y = cy - R * (rv[b] * up.x + rv[b + 1] * up.y + rv[b + 2] * up.z);
    const p2x = cx + R * (rv[c3] * right.x + rv[c3 + 1] * right.y + rv[c3 + 2] * right.z);
    const p2y = cy - R * (rv[c3] * up.x + rv[c3 + 1] * up.y + rv[c3 + 2] * up.z);
    const r = (150 * bright) | 0, g = (142 * bright) | 0, bl = (128 * bright) | 0;
    dctx.fillStyle = 'rgb(' + r + ',' + g + ',' + bl + ')';
    dctx.beginPath();
    dctx.moveTo(p0x, p0y); dctx.lineTo(p1x, p1y); dctx.lineTo(p2x, p2y); dctx.closePath();
    dctx.fill();
  }
}
let detailLastT = 0;
function detailFrame(now) {
  if (!detailOpen || !detailPlanet) { detailRAF = null; return; }
  detailRAF = requestAnimationFrame(detailFrame);
  now = now || performance.now();
  if (now - detailLastT < 33) return;        // ~30fps 上限：真实模型面数多，限制重绘频率保证流畅
  detailLastT = now;
  detailSpin += 0.004;          // 缓慢自转，让真实模型"活"起来
  drawDetail();
}

// 主画布：记录按下位置 + 点击命中 + 悬停指针
canvas.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; });
canvas.addEventListener('click', (e) => {
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) return;   // 拖动过则不算点击
  const hit = hitTestPlanet(e.clientX, e.clientY);
  if (hit) openDetail(hit);
});
canvas.addEventListener('pointermove', (e) => {
  if (dragging) return;
  const hit = hitTestPlanet(e.clientX, e.clientY);
  canvas.style.cursor = hit ? 'pointer' : (dragMode === 'pan' ? 'move' : 'grab');
});

// 详情页：拖动旋转、滚轮缩放
detailCanvas.addEventListener('pointerdown', (e) => { dDrag = true; dLX = e.clientX; dLY = e.clientY; detailCanvas.setPointerCapture(e.pointerId); });
detailCanvas.addEventListener('pointermove', (e) => {
  if (!dDrag) return;
  detailSpin += (e.clientX - dLX) * 0.01;
  detailTilt += (e.clientY - dLY) * 0.006;
  detailTilt = Math.max(-1.3, Math.min(1.3, detailTilt));
  dLX = e.clientX; dLY = e.clientY;
});
detailCanvas.addEventListener('pointerup', () => { dDrag = false; });
detailCanvas.addEventListener('pointercancel', () => { dDrag = false; });
detailCanvas.addEventListener('wheel', (e) => { e.preventDefault(); detailZoom *= 1 - e.deltaY * 0.0012; detailZoom = Math.max(0.6, Math.min(3, detailZoom)); }, { passive: false });
document.getElementById('backBtn').addEventListener('click', closeDetail);

/* ---------- 启动 ---------- */
resize();
buildTextures();      // 程序化回退源（断网可用）
ringGrad = buildProceduralRingGrad();   // 土星环离线版：自带平滑控制点+细密环纹，无需再柔化（否则会抹平环纹）；联网真实贴图由 buildRingGrad 内柔化
loadRealTextures();   // 联网时用真实照片贴图覆盖
loadAsteroidModel();  // 解析内嵌的真实贝努(Bennu)形状模型（window.BENNU_OBJ），离线可用；缺失则回退程序化岩石
updateCamera();
requestAnimationFrame(frame);
