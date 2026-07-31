---
created: 2026-05-11T00:00:00.000Z
title: Husky v10 compatibility — remove deprecated hook shim from .husky/pre-commit
area: tooling
files:
  - .husky/pre-commit
---

## Problem

Husky v9 仍然兼容旧式 hook shim，但 v10 会直接拒绝。当前 `.husky/pre-commit` 顶部还有：

```sh
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
```

每次 commit 都会打印 deprecation warning:

```
husky - DEPRECATED

Please remove the following two lines from .husky/pre-commit:

#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

They WILL FAIL in v10.0.0
```

现在不阻塞，但下次升级 husky 到 v10 时 pre-commit gate 会 fail —— 然后就连不上 audit + scoped vitest 这两道 SSOT 守门（plan 01-07 Task 1 装的）。

## Solution

1. 删 `.husky/pre-commit` 顶部那两行（shebang + `_/husky.sh` source）
2. v9 不需要 shim，hook 文件本身就是可执行 shell 脚本，直接保留 `[audit]` + vitest 命令即可
3. 如果其它 `.husky/*` hook 文件也有同样两行，一并处理（grep `.husky/` 全目录）
4. commit 后跑一次空 commit (`git commit --allow-empty -m "test"` 后撤销) 验证 hook 仍然触发 + 无 deprecation warning

## 涉及 Phase

跨 phase tooling 维护（不绑 Phase 01 ship）。可在 Phase 1 收尾或 Phase 2 启动前顺手处理，不阻塞当前 paused-for-exploration 流程。

## Background

- 装这个 hook 的 plan: 01-07 Task 1 (Husky pre-commit + lifecycle harness)
- Husky 文档关于 v9→v10 迁移: https://typicode.github.io/husky/migrate-from-v4.html
- 触发 reminder 的 commit: c96ada6 (chore(openspec): add config.yaml ...)
