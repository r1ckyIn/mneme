// src/lib/spawn-args.node.ts — Node-only SCRATCH_DIR resolver (Cycle-2 HIGH-1 split).
//
// This module is consumed EXCLUSIVELY by scripts/gen-capabilities.ts (Node CLI
// context). Vite/SvelteKit must NEVER bundle this — it would error in the WebView.
// The audit script greps SvelteKit page imports to enforce that .node is never
// browser-imported.
//
// Why a separate file? Codex Cycle-1 review HIGH-1: bundling `os.homedir()`
// into the WebView via SvelteKit fails. Split puts `homedir()` here — a Node
// script context — and lets the .shared SSOT stay browser-safe.

import { homedir } from "node:os";

export const SCRATCH_DIR = `${homedir()}/.mneme/scratch`;
