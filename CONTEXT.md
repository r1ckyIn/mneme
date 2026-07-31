# Mneme

本地桌面学习 app：Tauri 2 壳包裹用户自己的 Claude Code CLI，local-first markdown vault 为数据底座。本文件是 ubiquitous language 词汇表——只放术语定义，不放实现细节。

## Language

### 生态

**Mneme**:
学习端 app——vault、AI 对话、概念复习发生的地方。不与 Canvas/Ed 等平台 API 对话。

**UniBoard**:
互补的姊妹项目，负责校方平台（Canvas/Ed）侧的数据获取。Mneme 从它导入，不重复它的职责。

**UniBoard 桥（UniBoard Bridge）**:
课程资料从 UniBoard 流入 Mneme vault 的导入通道。（2026-07-31 确认：与手动上传并列为仅有的两条导入路径。）

**Import（导入）**:
资料进入 vault 的唯一机制：用户手动上传（拖拽 / 文件选择），或经 UniBoard 桥。
_Avoid_: "Canvas/Ed 同步"、"sync"（Mneme 不做平台 API 拉取——那是 UniBoard 的领地）

### 核心

**Vault**:
用户机器上的 markdown 文件树，一切数据的 source of truth。结构见 `docs/specs/vault-storage.md`。

**Command Palette（命令面板）**:
Cmd+P/O/Shift+P 键盘入口（2026-07-31 复活；2026-05-11 的"鼠标优先、仅 Cmd+Q"规则同日作废——`docs/reference/notes/interaction-paradigm-2026-05.md` 中该规则已过时）。
