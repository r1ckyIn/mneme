---
name: Living 视觉规范 — mneme 生成 HTML 硬契约
date_locked: 2026-05-12
date_scope_decided: 2026-05-14
locked_by: user (Phase 01.1-09 dogfood checkpoint reply 2026-05-12; scope b ratified by user 2026-05-14)
applies_to: 生成 HTML（review / dogfood / handoff / checklist 等用户可见 HTML 输出）
scope_relationship_with_kd13: |
  **DECIDED 2026-05-14: option (b) — 双轨永久。** Living 永远只管工具型 HTML（review / dogfood / handoff / checklist），KD-13（Anthropic/Claude family — warm cream `#faf9f5` + 橙 `#d97757` + Charter serif）永远保留给 mneme 主 App UI（Tauri Svelte 三栏聊天界面 + 后续所有 UI phase）。两套独立演进，不交叠。
  
  Living（cream `#E6E3DC` + olive `#6B6E3D` + Fraunces / Geist / Geist Mono）和 KD-13 的视觉差异是有意保留的——工具型 HTML 是给"分析者视角"的（编辑感、密集信息、editorial），主 App UI 是给"学习者视角"的（暖、亲、聚焦学习）。
  
  历史选项（2026-05-14 已决，仅供参考）：
    (a) Living 完全替换 KD-13（全局收敛）— 否决
    (b) Living 工具型 HTML / KD-13 主 App UI（双轨）— **CHOSEN**
    (c) 二者将来收敛为同一套 token — 否决
  
  任何把 Living token 写入 mneme 主 App UI（或反之）的提议都需要重新拍板这条决定。
---

# Living 视觉规范（生成 HTML 必读）

> 这是一份硬契约：所有视觉值必须通过下列 token 引用，HTML/CSS 里**禁止**出现裸值（颜色、ms、px、字距）。违反任何一条都视为越线。

---

## 1. 调色板（三层底 + 三层墨 + 一抹橄榄）

```css
:root {
  /* — Surface — */
  --c-bg:        #E6E3DC;   /* 暖奶油底，主背景 */
  --c-bg-alt:    #DCD7C9;   /* 中底，图片占位 */
  --c-bg-deep:   #1F1B18;   /* 深底 */
  --c-bg-deep-2: #15110F;   /* 最深，footer 专用 */

  /* — Ink — */
  --c-ink:       #1A1715;   /* 主墨 */
  --c-ink-soft:  #6F6659;   /* meta / lede / 副标 */
  --c-ink-mute:  #9C9384;   /* 第三层灰 */

  /* — Lines — */
  --c-line:      #C8C0AE;   /* 分节线 1px */
  --c-line-fine: #D2CBB9;   /* 内分隔线 */

  /* — 唯一口音色 — */
  --c-accent:    #6B6E3D;   /* muted olive — 仅用在 <em> 斜体 */
  --c-veil:      rgba(20,16,13,0.32);
}
```

**铁律**：
- 禁止新增第四种灰、第二种口音色
- accent **只能用在 `<em>` 斜体**，不能做面、线、按钮、图标
- Hover 用反相（`color: var(--c-bg); background: var(--c-ink)`），不引入新颜色
- mono 编号、章节标签用 `--c-ink` 或 `--c-ink-soft`，**禁止用 accent**

---

## 2. 字体系统（三族 × 三角色）

```css
:root {
  --f-display: "Fraunces", "Times New Roman", Georgia, serif;
  --f-sans:    "Geist", system-ui, -apple-system, "Segoe UI", sans-serif;
  --f-mono:    "Geist Mono", "JetBrains Mono", ui-monospace, monospace;

  /* Fraunces 变量轴预设（必用，不要单独写 wght） */
  --fr-display:        "opsz" 144, "SOFT" 28, "wght" 340;
  --fr-display-italic: "opsz" 144, "SOFT" 60, "wght" 320;
  --fr-card:           "opsz" 36,  "SOFT" 30, "wght" 380;
  --fr-card-italic:    "opsz" 36,  "SOFT" 60, "wght" 340;
  --fr-body:           "opsz" 16,  "SOFT" 50, "wght" 400;
  --fr-light:          "opsz" 24,  "SOFT" 60, "wght" 320;

  /* 字重四档（仅作为兜底，优先用 --fr-* 预设） */
  --w-display: 340;
  --w-card:    380;
  --w-italic:  320;
  --w-body:    400;
}
```

| 族 | 角色 | 必须配 |
|---|---|---|
| Fraunces | 大标题 / 卡片标题 / 正文 lede | `font-variation-settings: var(--fr-display|--fr-card|...)` |
| Geist | meta / eyebrow / CTA / footer label | 全部 `text-transform: uppercase` |
| Geist Mono | 编号 / 型号 / 价格 / 章节序号 | tabular |

**斜体 = 独立轴**：不是 `font-style: italic` 就完事，必须切换到 `--fr-*-italic` 预设（SOFT 60、wght 320），**并把颜色变 olive**（`color: var(--c-accent)`）。这是项目的标志特征。

中文场景可以追加 `"Noto Serif SC"` 到 `--f-display` fallback，但不能改 axis 预设。

---

## 3. Tracking ladder（四档字距）

```css
:root {
  --tr-pill:   0.22em;   /* pill 按钮 */
  --tr-ghost:  0.24em;   /* ghost-link */
  --tr-meta:   0.28em;   /* eyebrow / 章节标签 / footer head */
  --tr-mono:   0.18em;   /* mono 数字 / 型号 */
}
```

标题用负字距 `letter-spacing: -0.022em`；body 用 `0.005em`。

**大字越收紧，meta 越打开**。

---

## 4. Motion contract（铁律：禁止裸 ms / 裸 cubic-bezier）

```css
:root {
  --dur-fast: 320ms;    /* UI 反馈（颜色 / 边框） */
  --dur-base: 620ms;    /* reveal / pill 状态 / scale-on-hover */
  --dur-slow: 1100ms;   /* hero 入场 stagger / 长 zoom */

  --ease:      cubic-bezier(0.32, 0.72, 0, 1);   /* 状态切换 */
  --ease-soft: cubic-bezier(0.22, 1, 0.36, 1);   /* reveal / 图缩 */
}
```

- 任何 `transition` 必须用上面五个 token 之一组合
- 唯一例外：hero 的 4.5s drift（Ken Burns），写在 hero 专属 keyframes 里，必须加注释说明"intentionally outside the standard duration ladder"
- 微动 `@keyframes`（dot 脉冲等）必须把时长写在常量级（如 `1.6s`）

---

## 5. 间距 / 节奏

```css
:root {
  --pad-x:      clamp(1.25rem, 4.5vw, 3rem);
  --section-py: clamp(7rem, 14vw, 13rem);
  --grid-gap:   clamp(1.25rem, 2.4vw, 2.25rem);
}
```

**每个 `<section>` 起手必须**：
```css
padding: var(--section-py) var(--pad-x);
border-top: 1px solid var(--c-line);
```

这条 1px 米黄色发线是整个站的"翻页"。

**禁止引入 `max-width: 1240px` 之类的 container** —— 全宽 + 内边距，从不收中央。

---

## 6. 网格（故意打破对齐）

主索引网格示例 — 12 栏 + 错落 margin-top：

```css
.index__grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: clamp(2rem, 4vw, 4rem) clamp(1.5rem, 2.5vw, 2.4rem);
}
.index__item--feature  { grid-column: 1 / 8; }
.index__item--offset   { grid-column: 8 / 13; margin-top: clamp(4rem, 14vw, 12rem); }
.index__item:nth-child(3) { grid-column: 1 / 6; margin-top: clamp(2rem, 6vw, 4rem); }
.index__item--quiet    { grid-column: 7 / 12; margin-top: clamp(0rem, 4vw, 3rem); }
```

`.atelier__strip` 同理：`1.3fr / 1fr / 0.85fr` + `translateY(-3rem / +2.5rem)` 上下错开。

**禁止**：
- `grid-template-columns: repeat(N, 1fr)` 做"等分卡片墙"
- 任何超过 2 件 item 的内容 grid 不允许等分排列
- 高度不允许通过 `min-height` 强制对齐

这是编辑感的命脉。

---

## 7. 图片处理（统一压色）

所有内容图（非 hero）走同一公式：

```css
.media img {
  aspect-ratio: 4/5;          /* 也可以是 5/6 / 5/7，按 item 变体 */
  object-fit: cover;
  filter: saturate(0.86) contrast(0.96);   /* ← 必须，且静态 */
  transform: scale(1.02) translateZ(0);    /* ← 必须 translateZ */
  transition: transform var(--dur-base) var(--ease-soft);
}
.item:hover .media img { transform: scale(1.06) translateZ(0); }
```

**两条硬规**：
1. **filter 永远静态**，绝不进 `transition`——动画 filter 会强制全帧重绘
2. 必须 `translateZ(0)` 提升合成层，否则 hover 卡

每张图必须配：
- `loading="lazy" decoding="async" fetchpriority="low"`（首屏除外）
- `alt` 写完整一句话场景描述，不是关键字
- `onerror="this.onerror=null;this.src='./img/placeholder.svg';"` 兜底

---

## 8. 编辑骨架（每节必须复用四件套）

```html
<header class="section-head">
  <div class="section-head__row reveal-block">
    <span class="num">003</span>                          <!-- mono 编号 -->
    <span class="num__label">A piece, alone</span>        <!-- sans 0.32em + 短横线前缀 -->
  </div>
  <h2 class="section-head__title reveal-block">           <!-- Fraunces, max-width 14ch -->
    Title with <em>italic accent</em>
  </h2>
  <p class="section-head__caption reveal-text">           <!-- Fraunces light, ink-soft, max-width 38ch -->
    Caption sits here.
  </p>
</header>
```

`.num__label::before` 必须带 1.4rem 横线：

```css
.num__label::before {
  content: "";
  position: absolute;
  left: 0; top: 50%;
  width: 1.4rem; height: 1px;
  background: var(--c-line);
}
```

新增 section 必须先放好这四件套再填业务内容。

---

## 9. 两个交互族（只允许这两种）

### A. `.cta` Pill 按钮（带旋转箭头环）

```css
.cta {
  display: inline-flex; align-items: center; gap: 0.85rem;
  padding: 11px 18px 11px 22px;
  border: 1px solid var(--c-ink);
  border-radius: 999px;
  font-family: var(--f-sans);
  font-size: 11.5px;
  letter-spacing: var(--tr-pill);
  text-transform: uppercase;
  transition:
    background var(--dur-base) var(--ease),
    color var(--dur-base) var(--ease),
    border-color var(--dur-base) var(--ease);
}
.cta__arrow {
  width: 24px; height: 24px;
  border-radius: 999px;
  border: 1px solid currentColor;
  transition: transform var(--dur-base) var(--ease);
}
.cta:hover { background: var(--c-ink); color: var(--c-bg); }
.cta:hover .cta__arrow { transform: rotate(45deg); }
```

### B. `.ghost-link` 鬼线（拖尾 56→96px）

```css
.ghost-link {
  display: inline-flex; align-items: baseline; gap: 0.85rem;
  font-family: var(--f-sans);
  font-size: 11px;
  letter-spacing: var(--tr-ghost);
  text-transform: uppercase;
}
.ghost-link__line {
  display: inline-block;
  width: 56px; height: 1px;
  background: currentColor;
  opacity: 0.7;
  transition: width var(--dur-base) var(--ease), opacity var(--dur-base) var(--ease);
}
.ghost-link:hover .ghost-link__line { width: 96px; opacity: 1; }
```

**禁止**：阴影方块按钮、渐变按钮、SVG icon-only 按钮、第三种交互形态。

---

## 10. Nav（默认透明 → 滚动后 morph 成 pill）

```css
.nav {
  position: fixed;
  top: 50px; left: var(--pad-x); right: var(--pad-x);
  z-index: 80;
  display: grid;
  grid-template-columns: auto 1fr auto;
  border: 1px solid transparent;      /* ← 默认无边 */
  /* 默认无圆角、无背景、无 padding */
  transition:
    background var(--dur-base) var(--ease),
    border-color var(--dur-base) var(--ease),
    padding var(--dur-base) var(--ease),
    top var(--dur-base) var(--ease);
}
/* 滚出 hero 后由 JS 添加 .is-nav-solid */
body.is-nav-solid .nav {
  background: rgba(230, 227, 220, 0.94);   /* ← opaque cream,不用 blur */
  border-radius: 999px;
  padding: 10px 18px 10px 22px;
  top: 18px;
  border-color: var(--c-line-fine);
  box-shadow: 0 6px 20px -8px rgba(20, 16, 13, 0.18);
}
```

**禁止 `backdrop-filter: blur`**（任何元素）：大窗口 GPU 成本随面积线性涨 4×。用不透明 0.94 cream + 弱 box-shadow 代替。

Nav 默认在 hero 上是白字、透明背景；滚动后才"地形 morph"成 pill——这是站点核心交互。

---

## 11. 揭示动画（只有两种）

```css
/* 块淡入 — heading / eyebrow / caption / signature / CTA */
.reveal-block {
  opacity: 0;
  transform: translate3d(0, 14px, 0);
  transition:
    opacity var(--dur-base) var(--ease-soft),
    transform var(--dur-base) var(--ease-soft);
}
.reveal-block.is-visible { opacity: 1; transform: translate3d(0, 0, 0); }

/* 逐行淡入 — 段落经 pretext 拆成 <span class="line"> 后,每行 stagger 60ms */
.reveal-text .line {
  display: block;
  opacity: 0;
  transform: translate3d(0, 10px, 0);
  transition:
    opacity var(--dur-base) var(--ease-soft) calc(var(--i, 0) * 60ms),
    transform var(--dur-base) var(--ease-soft) calc(var(--i, 0) * 60ms);
}
.reveal-text.is-visible .line { opacity: 1; transform: translate3d(0, 0, 0); }
```

**禁止**：
- `filter: blur` 入场（GPU 重）
- 主动给 `.reveal-block` / `.reveal-text` 加 `will-change`（40+ off-screen 目标会占满 GPU 内存；浏览器会自动提升合成层）
- 用 `--dur-slow` 做内容 reveal——只用 `--dur-base`

由 JS 通过 IntersectionObserver 加 `.is-visible`，**unobserve 后不可再触发**。

---

## 12. 装饰元素（站点指纹，缺一不可）

### A. 顶部 Marquee Ribbon（60s 横向无限循环）

```css
.ribbon {
  position: absolute; top: 0; left: 0; right: 0;
  z-index: 70;
  border-bottom: 1px solid var(--c-line);
  background: var(--c-bg);
  overflow: hidden;
}
.ribbon__track {
  display: flex; gap: 1.5rem;
  white-space: nowrap;
  font-family: var(--f-sans);
  font-size: 11px;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--c-ink-soft);
  padding: 11px 0;
  animation: ribbon 60s linear infinite;
  transform: translateZ(0);
}
.ribbon.is-paused .ribbon__track { animation-play-state: paused; }
@keyframes ribbon {
  from { transform: translate3d(0, 0, 0); }
  to   { transform: translate3d(-50%, 0, 0); }
}
```

内容必须**复制两份**（保证循环平滑），中间用 `.ribbon__dot` 中点分隔。Hero 滚出后 JS 加 `.is-paused` 停帧。

### B. Plate 小标签（图片角落产品编码）

```css
.object__plate {
  position: absolute;
  bottom: 1.2rem; left: 1.2rem;
  background: rgba(230, 227, 220, 0.96);
  border: 1px solid var(--c-line);
  padding: 0.7rem 1rem;
  font-family: var(--f-mono);
  font-size: 10.5px;
  letter-spacing: 0.08em;
}
```

### C. Footer 巨型 Wordmark + 暗底

```css
.footer { background: var(--c-bg-deep-2); color: var(--c-bg); }
.footer__type {
  margin: clamp(3rem, 7vw, 6rem) 0;
  text-align: center;
  font-family: var(--f-display);
  font-variation-settings: var(--fr-display);
  font-size: clamp(4.5rem, 24vw, 24rem);   /* ← 巨型,几乎触底 */
  line-height: 0.86;
  letter-spacing: -0.042em;
  color: var(--c-bg);
  white-space: nowrap;
  overflow: hidden;
}
```

Footer **必须**是暗底（不是 cream / paper），品牌名 wordmark **必须**压到底部。

### D. Hero Veil（多层 gradient 叠在静态层）

```css
.hero__veil {
  position: absolute; inset: 0;
  pointer-events: none;
  transform: translateZ(0);
  background:
    /* 边缘羽化到 cream 底 */
    radial-gradient(ellipse 72% 78% at 50% 50%,
      transparent 0%, transparent 38%,
      rgba(230,227,220,0.55) 78%, #E6E3DC 100%),
    /* 中心暗角(给标题加对比) */
    radial-gradient(ellipse 60% 50% at 50% 55%, rgba(15,12,10,0.32), transparent 75%),
    /* 上下暗角(给 chrome + cue 加可读性) */
    linear-gradient(180deg, rgba(15,12,10,0.22) 0%, transparent 22%, transparent 78%, rgba(15,12,10,0.30) 100%);
}
```

**禁止 `mask-image: radial-gradient` over video** —— alpha-mask 慢路径,每帧重渲。

---

## 13. 性能纪律（铁律，不可触碰）

| 禁止 | 替代方案 / 原因 |
|---|---|
| `backdrop-filter: blur` | 不透明色 + box-shadow；blur 大窗口 GPU 成本 4× |
| `transition: filter` | 静态 filter + 只动 transform |
| `content-visibility: auto` | 直接绘制；前者首次滚入触发 60ms+ 同步 paint |
| 全局 `scroll-behavior: smooth` | JS `window.scrollTo({behavior:'smooth'})` 控锚点 |
| 大面积 `will-change` | 只给当前 `.is-active` 元素临时加 |
| `mask-image` over video | 在 hero veil 用普通 gradient 叠层 |

提升合成层标准动作：`transform: translateZ(0); backface-visibility: hidden;`

Hero `<section>` 必须 `contain: paint`（**不要** `contain: layout`——配 absolute 子元素会引发布局抖动）。

---

## 14. 响应式断点（只有两档）

```css
@media (max-width: 1100px) {
  /* tablet：12 栏塌成 2 列、hero 数字隐藏、object 单列 */
}
@media (max-width: 760px) {
  :root { --pad-x: 1.25rem; }
  /* mobile：nav 收成 brand + 圆形箭头按钮、ribbon 字号收、网格全单列 */
}
```

**禁止**新增第三个断点（720 / 600 / 960 等）。视口之间的过渡靠 `clamp()` 平滑。

---

## 15. 可访问性 = 视觉的一部分

```css
@media (prefers-reduced-motion: reduce) {
  .reveal-block,
  .reveal-text .line,
  .reveal-text:not(:has(.line)) {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
  .hero__line, .hero__eyebrow, .hero__caption {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .hero__video { animation: none !important; display: none !important; }
  .ribbon__track { animation: none !important; }
}
```

新增任何动画元素必须**默认**加进这个媒体查询。

装饰元素一律 `aria-hidden="true"`（ribbon track、SVG 箭头、hero veil、装饰图）；装饰图 `alt=""`；可交互按钮配 `aria-label` / `aria-pressed`。

---

## 16. 编辑感的"语法"（结构层面）

每节 HTML 骨架：

```html
<section class="<name>" id="<anchor>">
  <header class="section-head">
    <div class="section-head__row reveal-block">
      <span class="num">00X</span>
      <span class="num__label">A position</span>
    </div>
    <h2 class="section-head__title reveal-block">
      Title with <em>italic accent in olive</em>
    </h2>
    <p class="section-head__caption reveal-text">Caption.</p>
  </header>
  <!-- 内容：12 栏故意错位 grid -->
</section>
```

- BEM 命名（`block__element--modifier`）
- JS 钩子用 `data-*`，不复用 CSS 类
- 大节用横线分隔注释：`<!-- ───────── 00X — NAME ───────── -->`
- 行内注释只写 **WHY**，不写 WHAT

---

## 自检清单（提交前过一遍）

- [ ] 没有任何裸 hex / rgb / ms / cubic-bezier / px 字距
- [ ] accent 颜色只出现在 `<em>` 标签内
- [ ] 没有 `backdrop-filter: blur`
- [ ] 没有 `transition: filter` 或 `filter` 出现在任何 `:hover`
- [ ] 没有等分 grid（`repeat(N, 1fr)` 且 N≥2 的内容卡片墙）
- [ ] `.reveal-*` 没有主动加 `will-change`
- [ ] 每个 section 顶部有 `border-top: 1px solid var(--c-line)`
- [ ] 没有 `max-width: container` 包裹（全宽 + `--pad-x`）
- [ ] 响应式只有 1100 / 760 两档
- [ ] Ribbon 是 60s marquee 动画（不是静态 flex）
- [ ] Nav 默认透明，滚动后 morph 成 pill
- [ ] Footer 是暗底 + 巨型 wordmark
- [ ] 有 `.cta` pill + `.ghost-link` 两个交互族（如有交互）
- [ ] 编辑骨架四件套（num + num__label + title + caption）每节都有
- [ ] `prefers-reduced-motion` 全套禁用动画
- [ ] 所有装饰元素 `aria-hidden="true"`，所有图片 `alt` 是完整描述

---

**生成 HTML 时**：如果一个值不知道写什么，回去查 token；如果 token 里没有，那就是**不该新增**的东西。

---

## 首次落地记录

**2026-05-12**：在 Phase 01.1 dogfood checkpoint，用户拒绝 KD-13 styling 的 visual review HTML，注入完整 Living 规范作为替代。Claude 在 `/gsd-execute-phase 01.1 wave 6` orchestrator 上下文中执行：

1. 备份原 KD-13 模板到 `$HOME/.claude/get-shit-done/templates/visual-review.html.kd13.bak`（252 行）
2. 按 Living 规范重写 `visual-review.html`（552 行）
3. 中文化所有可见文本（HTML 是给用户看的）
4. 顺手修复 F1 bug — 禁用 bucket 文档不再含 `<section data-bucket=` 字面量
5. 通过 `gsd-sdk query verify.render-review-html` 重新渲染
6. 用 `open` 在用户默认浏览器打开（不走 playwright 截图）
7. 用户审查通过

参考：`.planning/notes/dev-feedback-loop-audit-202605.md` Finding F2、`.planning/phases/01.1-dev-feedback-loop-infrastructure/01.1-09-SUMMARY.md` 第二轮记录。
