// +page.ts — Phase 2 Plan 02-08 onboarding dynamic-route prerender config.
//
// SvelteKit `adapter-static` requires every dynamic route to be enumerable
// at build time so it knows which static HTML files to emit. We pre-list
// steps 1-6 (Pitfall 6 from 02-RESEARCH.md — without `entries()`, the
// build would fail with "Cannot prerender pages with dynamic route
// parameters unless `prerender.entries` is set").
//
// `ssr = false` + `prerender = true` matches the project-level Phase 1
// convention from /+layout.ts — Tauri serves static SPA shells, no SSR
// runtime in the desktop binary.
//
// Maps to: 02-CONTEXT.md D-01 (full-screen route), 02-RESEARCH.md Pitfall 6.

import type { EntryGenerator, PageLoad } from "./$types";

export const prerender = true;
export const ssr = false;

export const entries: EntryGenerator = () => {
  // prettier-ignore — keep one-line for acceptance grep (steps "1".."6").
  return [{ step: "1" }, { step: "2" }, { step: "3" }, { step: "4" }, { step: "5" }, { step: "6" }];
};

export const load: PageLoad = ({ params }) => {
  const parsed = parseInt(params.step, 10);
  const step = Number.isNaN(parsed) || parsed < 1 || parsed > 6 ? 1 : parsed;
  return { step };
};
