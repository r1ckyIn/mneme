# echo360-video

> **能力域**：Tauri webview 嵌入中 pane + USYD SSO 首次登录 + Keychain 持久化 cookie + 后续视频秒开。**USyd 特化的关键差异化** — 没有 video，app 退化成"local notes + Claude chat"，丢掉 lecture-anchored 学习循环。

---

## 现状（What it is now）

**阶段**：v1.x（post-MVP）
**Phase**：Phase 5 spike → Phase 6 实现
**实现状态**：**GATED BY SPIKE** — `/gsd-spike echo360-webview-auth` 必须先通过

**覆盖的 PROJECT.md 编号锚点**：
- **REQ-04** — Echo360 lecture video via embedded webview + USYD SSO
- **KD-04** — Echo360 via Tauri webview + persistent USYD SSO cookie
- **KD-11** — Phase entry gate — Echo360 spike must pass before Phase 6 implementation

**核心论点**：Echo360 OAuth client credentials 是 institutional admin 权限学生没有；LTI 1.3 token 绑定 launch session 第三方拿不到。**webview-with-persistent-cookie 是唯一可行**学生端 auth 路径。

---

## 评估过的备选（What we considered）

| 候选 | 主要属性 | 决定 |
|------|---------|------|
| **当前方案：Tauri webview + USYD SSO + Keychain cookie 持久** | 首次走 SSO，后续秒开；Echo360 视频在 webview 内播放 | ✅ 已采用（KD-04 locked，**but spike-gated**） |
| **OAuth 2.0 client credentials** | Echo360 公共 REST API + Swagger 文档 | ❌ 学生没权限 — 需 institutional admin |
| **LTI 1.3 token 直接拿** | Echo360 支持 LTI 1.3 + Canvas | ❌ Token 绑定 launch session，第三方 app 拿不到 |
| **外部浏览器 + deep link 回 app** | 浏览器登录后传 cookie 回 Tauri | 📝 **fallback 路径**（如 spike 失败）— UX 退化但功能可行 |
| **HLS 抓流（爬 m3u8）** | 绕过认证直接下载视频 | ⛔ 违反 Echo360 ToS + 不稳定 |
| **学校 IT 申请 API 接入** | 走正式渠道 | ❌ 周期长 + 单用户场景不适合 |
| **每次手动用浏览器看，mneme 只管笔记** | 砍 video 能力 | ❌ 否决 — 失去 lecture-anchored 核心循环（Core Value Dim 4 "one product feel"）|

---

## 否决理由（Why we said no）

- **OAuth / LTI**：学生身份拿不到，跟现实不兼容
- **HLS 抓流**：ToS 违规 + 不稳
- **砍 video**：Core Value Dim 4 受损，KP-09 美学家族也无法体现（mneme 不再是"学习环境"）

---

## ⚠ Phase 5 Spike Gate（KD-11 locked）

**`/gsd-spike echo360-webview-auth` 必须验证 3 件事才能 Phase 6 实现：**

1. **SSO 流完成在 Tauri webview 内** — USYD SSO（重定向到 Microsoft / Okta 等）能在 webview 内正常走通，不被 client-side check 打断
2. **cookie 跨 app 重启持久** — 关闭 app 重开，不需要重新登录
3. **Echo360 video player 在 webview 不被 same-origin / 3rd-party-cookie 检查打断**

**已知风险**：
- macOS WKWebView ITP（Intelligent Tracking Prevention）默认阻 3rd-party cookies
- `tauri-apps/wry#848` issue — Tauri 2 webview cookie 持久行为待验证
- USYD SSO 通过 Echo360 LTI 1.3 IS 一个 3rd-party cookie 场景

**spike 失败 → 设计完全重写**：
- 切到 fallback 路径：外部浏览器 + deep link
- 或：每域名独立 webview 实例
- REQ-04 / REQ-05 acceptance 重写

---

## 实施约束（Constraints when implementing — 假设 spike 通过）

### 1. Webview 容器

- 使用 Tauri 2 native WebviewWindow（embed in layout-shell middle pane）
- 不用 `<iframe>`（cookie 受限更严）
- webview 配置：
  - 持久 cookie storage path
  - 允许 JavaScript（Echo360 player 必需）
  - User-Agent 模拟标准浏览器

### 2. Cookie 持久化

- macOS Keychain via `tauri-plugin-store` 或 native API
- 首次 SSO 完成后 dump 当前 cookies → Keychain 加密存
- App 启动时从 Keychain 取出 → 注入 webview
- 过期检测：定期检查 cookie expiry；过期 → 自动跳 SSO 流（不暴力 force re-auth）

### 3. URL 发现

- Canvas API 探测 Echo360 LTI launch URL（每课程模块）
- 缓存 LTI URL 列表到 `vault/_system/echo360/urls.json`
- 用户点击具体 lecture → webview load 对应 URL

### 4. Caption 抓取（caption-bilingual 协作）

- webview devtools 监听 network → 识别 Echo360 VTT endpoint pattern
- 用持久 cookie 通过 Tauri HTTP client（不走 webview）拉 VTT
- VTT 内容传给 caption-bilingual spec 处理（翻译 + 双语）
- Echo360 VTT 端点格式：spike 阶段确定

### 5. Layout-shell 集成

- 默认占 layout-shell 中 pane（Phase 1 D-01 中 pane 是 "Lecture video / file preview" placeholder）
- 自适应折叠：无 video 时 pane 折叠（todo `2026-05-09-auto-collapse-pdf-and-video-panes...` 已 capture）
- 视频和 PDF 共享中 pane — 切换显示

### 6. 横切约束遵守

- **visual-design-system**（thread）— webview 边框 / 控件遵守 KD-13；视频播放器 native 体验但 UI 包装遵守
- **interaction-paradigm**（thread）— 视频播放控件鼠标交互；不绑 keyboard shortcut（如 space/play）— 例外要看 spike 实测用户体验
- **KP-04** — 不抓 token、不 bypass auth；走标准 SSO 流

---

## 重新评估的触发条件（When to revisit）

| 触发 | 重评范围 |
|------|----------|
| **Phase 5 spike 失败** | KD-04 方案推翻；切 fallback 外部浏览器 + deep link |
| Echo360 全面禁第三方 cookie | 改架构 — 每域名 webview / native browser flow |
| USYD 切换视频平台（Echo360 → Panopto / Zoom 等） | 整个 spec 重写适配新平台 |
| Tauri 2 webview cookie bug 修了 + 出更好 API | 简化实现 |
| Anthropic 出原生 lecture video summarization | 评估是否仍需自己内嵌（vs 调 API）|

---

## 相关 phase 与文档

**当前实施 phase**：
- Phase 5 — Echo360 Spike Resolution（spike 跑 + decide）
- Phase 6 — Echo360 Video + Bilingual Captions（实施 — gated by Phase 5）

**关键文档**：
- PROJECT.md REQ-04 + KD-04 + KD-11
- STACK.md §8 Echo360 lecture video integration
- `.planning/research/PITFALLS.md` Pitfall 7（Echo360 cookie/iframe + USYD SSO 失败）

**关联 OSS 依赖**：
- 无第三方 Echo360 库（无现成 OSS） — 自实现 webview 集成

**关联横切 spec**：
- **visual-design-system**（thread）
- **interaction-paradigm**（thread）

**关联其他 spec**：
- **caption-bilingual**（note，已降级）— 接 VTT 流
- **vault-storage** — `_system/echo360/urls.json` 缓存
- **layout-shell** — 中 pane 容器
- **settings-ui** — Echo360 登录状态 / cookie 清空 / 重新认证入口（Privacy category）

**后续 phase 关联**：
- Phase 6 — 实施（spike 通过后）
- Phase 7+ — memory-engine 把字幕内容 feed 进 KG（lecture → concept 关联）

---

*抽出于 2026-05-14 · OpenSpec 阶段 2 · 批次 4 · 2/2 完成*
