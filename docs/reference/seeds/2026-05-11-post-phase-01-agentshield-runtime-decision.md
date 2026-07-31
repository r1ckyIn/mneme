---
created: 2026-05-11T12:55:00.000Z
updated: 2026-05-11T12:55:00.000Z
title: Decide whether to enable AgentShield runtime monitor after phase-01 ships
area: infrastructure / workflow-upgrade
status: pending — requires phase-01 ship + first OpenSpec lifecycle dry-run
files: []
---

## Context

During the 2026-05-11 workflow upgrade (GSD + OpenSpec + ECC three-layer install), AgentShield CLI was installed (`ecc-agentshield@1.5.0`) but its **runtime monitor was deliberately NOT enabled**. The runtime monitor registers a PreToolUse hook that intercepts every Claude Code tool call for security/policy enforcement.

**Reason for deferring**: GSD already has multiple PreToolUse-related hooks in `~/.claude/hooks/` (e.g. `gsd-prompt-guard.js`, `gsd-read-guard.js`, `gsd-workflow-guard.js`, `gsd-validate-commit.sh`). Adding another PreToolUse hook from a different project = unknown combined behavior. Filename-lexicographic ordering applies, but actual semantic interaction (does AgentShield's hook short-circuit GSD's, or vice versa? do they both run and double-tax every tool call?) is untested as of install date.

## Decision Required (after phase-01 ship)

Choose one of three paths:

1. **Enable AgentShield runtime** — gain real-time tool-call security filtering, accept GSD hook coexistence risk
2. **Stay CLI-only** — keep the current AgentShield scan baseline (`~/.claude/ecc/agentshield-baseline.json`); manually re-scan with `agentshield scan --path ~/.claude` periodically (e.g., before each phase plan-phase)
3. **Hybrid** — enable runtime but use `ECC_HOOK_PROFILE=minimal` or `ECC_DISABLED_HOOKS=...` env vars to gate which AgentShield hooks fire

**Recommended default**: option 2 unless phase-01 dogfooding surfaced a specific incident where AgentShield runtime would have helped (e.g., a leaked secret, a wildcard permission gone wrong, a malicious skill).

## Test Plan (if choosing option 1 or 3)

⚠ Test in a throwaway environment first, do NOT directly run on production `~/.claude/`:

```bash
# 1. Snapshot current hook state
cp -r ~/.claude/hooks "~/.claude/hooks.pre-agentshield.$(date +%Y%m%d-%H%M%S)"

# 2. Install runtime
agentshield runtime install
ls ~/.claude/hooks/ | sort  # confirm both gsd-* and agentshield-* hooks present
cat ~/.claude/hooks/hooks.json  # check if AgentShield merged into ECC's hooks.json

# 3. Smoke-test in Mneme: open Claude Code, run a few tool calls
cd ~/claude/r1ckyIn_GitHub/Mneme
# - /gsd-progress (uses Bash, Read)
# - /gsd-quick (uses Edit)
# - /opsx:propose "test" (uses Write)
# Watch for: hook errors, slow tool calls, double-logging, GSD command refusals
```

## Rollback (if AgentShield runtime breaks GSD)

```bash
# Try official uninstaller first
agentshield runtime uninstall 2>/dev/null

# Manual fallback: remove agentshield hook files
find ~/.claude/hooks -name 'agentshield-*' -delete
# Also check if ECC's hooks.json was modified — restore from backup if so

# Verify GSD hooks intact
ls ~/.claude/hooks/gsd-*
```

## Decision Inputs to Gather Before Choosing

- [ ] Did phase-01 dogfood surface any security-relevant incidents? (leaked secret, malicious skill, etc.)
- [ ] Has AgentShield repo updated between 2026-05-11 and decision date? Check changelog for hook ordering improvements.
- [ ] Does `agentshield runtime --help` show new dry-run / safe-install options?
- [ ] Has anyone in the ECC community documented GSD + AgentShield runtime coexistence?

## Related Artifacts

- AgentShield baseline scan: `~/.claude/ecc/agentshield-baseline.json` (Grade D full / Grade A critical-only, 2026-05-11)
- Workflow upgrade install reference: see Claude memory `reference_workflow_stack_install.md`
- ECC was installed via `./install.sh --profile full` from `affaan-m/everything-claude-code` clone

## Triggering this todo

After phase-01 ships:
- `/gsd-capture --list` should surface pending todos in this directory
- Or grep manually: `find .planning/todos/pending -name '*agentshield*'`

When decided, move to `.planning/todos/completed/` with a closing status note in the frontmatter.
