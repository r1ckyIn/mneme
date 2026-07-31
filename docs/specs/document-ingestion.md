# document-ingestion

> **能力域**：手动 / UniBoard 导入的 PDF / Office 文档转 markdown 落入 vault `_source/`。**双管 ingestion** — MinerU 处理 PDF（含数学公式），markitdown 处理 Office (docx/xlsx/pptx/html)。

---

## 现状（What it is now）

**阶段**：v1（MVP 必备）
**Phase**：Phase 4
**实现状态**：**hypothesis**

**覆盖的 PROJECT.md 编号锚点**：
- **REQ-18** — Document → markdown ingestion (Marker for PDF + markitdown for Office) — 注：PDF 主选 2026-05-11 由 user 改为 **MinerU**
- **KP-02** — Open-source-driven (50% rule)；不自建 parser

**核心论点**：lecture slides PDF（数学重）+ tutorials Word/PPT。双管 必须都做。KP-02 honored：subprocess 调外部 OSS，不自建 parser。

---

## 评估过的备选（What we considered）

| 候选 | License | 主要属性 | 决定 |
|------|---------|---------|------|
| **PDF → MinerU 本地** | AGPL-3.0（subprocess 调用不污染）| user 2026-05-11 实测在自己课件上更准确 | ✅ 主选（user 翻转 STACK.md 原推荐）|
| **PDF → Marker (datalab-to/marker)** | GPL-3.0 + 自定义 AI Pubs（模型权重个人/研究免费） | 数学公式领先（`--use_llm` + Chandra vision 模型）；STACK.md 原主选 | 📝 **保留为 fallback**（如 MinerU 在某些 PDF 类型失效） |
| **PyMuPDF4LLM** | AGPL-3.0 / 商用 | 快、无 ML、轻量；但数学公式弱 | ❌ 否决 — 数学弱（lecture slides 主用例不行）+ AGPL 比 MinerU 更严格 |
| **Docling (IBM)** | MIT | 生产 RAG 导向，结构化 DoclingDocument | ❌ 否决 — 输出结构过重，markdown 不干净 |
| **Nougat (Meta)** | MIT | 学术论文专用 | ❌ 否决 — abandoned（2023 last release） |
| **LlamaParse** | 云 SaaS | 高准确 | ⛔ 违反 KP-01（cloud-only） |
| **Office → markitdown (Microsoft)** | MIT | 多格式 breadth winner — Word / Excel / PPT / HTML / image OCR | ✅ 已采用 |
| **Office → LibreOffice CLI + 自实现 md 转换** | LGPL | 也可行 | ❌ 否决 — 重复造 markitdown 已做的事 |
| **统一一个工具处理全部格式** | n/a | 单点复杂度 | ❌ 否决 — 没有现成的 "PDF+Office 兼数学" 强工具 |

---

## 否决理由（Why we said no）

- **PyMuPDF4LLM**：数学弱（PROJECT.md REQ-18 + KP-02 明确要求数学公式准确）
- **Docling**：DoclingDocument schema 过重，下游编辑 / agentic search 不友好
- **Nougat**：abandoned（KP-08 OSS 健康监控 trigger）
- **LlamaParse**：cloud-only 违反 KP-01
- **自建 parser**：违反 KP-02 + KP-06
- **统一一个工具**：不存在 — 现实就是 PDF 和 Office 各有专精

---

## 实施约束（Constraints when implementing）

### 1. dispatcher 逻辑（locked by REQ-18）

```
import 触发（external-import 入口）：
  按 extension dispatch:
    .pdf       → MinerU subprocess
    .docx      ↘
    .xlsx       │
    .pptx       ├→ markitdown subprocess
    .html       │
    .htm       ↗
    .md        → 直通（直接复制到 _source/）
    .txt       → 直通
    其他       → 标记 "unsupported"，UI 显示但不转换
```

### 2. MinerU 调用（PDF）

- subprocess 调用，进程隔离（AGPL-3.0 不污染主项目）
- 输入：原 PDF 文件
- 输出：`<原名>.md` + 可能的 `<原名>.assets/`（图片资源）落到 `_source/<相对路径>.md`
- **Intel Mac CPU 推理速度待 Phase 4 实测**（PDF 大小 → 时间预估表）
- 错误处理：fail → 标记 `<原名>.failed.txt`（含 MinerU stderr），UI 显示并提示 fallback Marker

### 3. Marker fallback（locked decision）

- MinerU 失败 → 自动尝试 Marker（如果安装了）
- Marker 命令：`marker_single <file> --use_llm`（`--use_llm` 调本机 claude 处理 inline math）
- 用户可在 settings-ui 中关 fallback（默认开）

### 4. markitdown 调用（Office）

- subprocess 调用，MIT 干净
- 输入：原 docx/xlsx/pptx/html 文件
- 输出：`<原名>.md` 落 `_source/`
- PPT 嵌入图片质量：等 Phase 4 实测；如不可用→ 用户提示

### 5. 输出落点（与 vault-storage 协作）

- 输出 markdown 落到 `courses/<COURSE>/_source/<相对路径>.md`
- 原文件**并行保留**在 `_source/`（不删除）— 用户可对照原版
- frontmatter 自动填入：
  ```yaml
  ---
  type: source-mirror
  source_file: lectures/lecture-06.pdf
  source_format: pdf
  ingested_at: 2026-05-14T...
  ingestion_tool: mineru | markitdown | passthrough
  ingestion_version: <tool version>
  ---
  ```
- 落点遵守 vault-storage `_source/` 写保护（document-ingestion 是其中一个允许 writer）

### 6. 错误回流（与 external-import 协作）

- 转换失败 surface 到 UI（external-import 进度面板）— 不静默
- 错误分类：
  - `tool_missing`（MinerU / markitdown 没装）→ 引导安装命令
  - `format_unsupported`（如旧 .doc）→ 提示转 .docx
  - `tool_crash`（subprocess crash）→ stderr 显示 + fallback 提示
  - `content_error`（如加密 PDF）→ 用户提示

### 7. 性能预算（待 Phase 4 实测）

- 单 PDF 100 页：目标 ≤ 60s（Intel Mac CPU）
- 单 PPT 50 slide：目标 ≤ 30s
- 批量 import：可后台跑（external-import 进度条 + 取消按钮）

### 8. 与其他 spec 的契约边界

- **external-import** — 触发 ingestion；进度回流给 external-import UI
- **vault-storage** — 是 `_source/` 允许 writer 之一；遵守 frontmatter 规范
- **agentic-search** — 输出的 markdown 会被 agentic search 索引到
- **caption-bilingual**（note，已降级）— 跟字幕处理走不同路径（VTT 不走本 spec）
- **settings-ui** — Marker fallback toggle / 工具路径配置

---

## 重新评估的触发条件（When to revisit）

| 触发 | 重评范围 |
|------|----------|
| MinerU 在实际课件准确率 < 90% | 回退 Marker 主选 / 重新评估 PDF 工具 |
| markitdown 停更（KP-08 监控） | 评估 LibreOffice 路径 / pandoc / etc. |
| Anthropic 发布原生文档摄取 API | 评估直接调用替代 subprocess |
| 用户 PPT 嵌入图片转换质量差 | 加 pypandoc / unoconv fallback |
| Intel Mac CPU 推理时长 > 5 分钟/PDF | 启动 GPU 路径（如 user 升级硬件） / 切回 Marker |
| 新格式需求（Markdown 没覆盖如 LaTeX 源码 / EPUB） | 加 dispatcher 分支 |

---

## 相关 phase 与文档

**当前实施 phase**：
- Phase 4 — Document Ingestion (PDF + Office → markdown)

**关键文档**：
- PROJECT.md REQ-18
- STACK.md §1 PDF → markdown（原主选 Marker，已被 user 翻转）
- `.planning/research/PITFALLS.md`（如有，关于 Marker `--use_llm` 成本）

**关联 OSS 依赖**：
- `.planning/dependencies.md` Group 4（subprocess CLIs）— MinerU + Marker + markitdown

**关联横切 spec**：
- 无（这是数据处理契约，无 UI）

**关联其他 spec**：
- **external-import** — 上游触发
- **vault-storage** — 下游落点
- **agentic-search** — 转换后被 search 索引
- **settings-ui** — fallback 配置入口

**后续 phase 关联**：
- Phase 7+ — memory-engine 读 `_source/` 输出做 fact extraction
- Phase 10 — fsrs-review 在 `_source/` 转换出的 markdown 上提取 concept 建库

---

*抽出于 2026-05-14 · OpenSpec 阶段 2 · 批次 4 · 1/2*
