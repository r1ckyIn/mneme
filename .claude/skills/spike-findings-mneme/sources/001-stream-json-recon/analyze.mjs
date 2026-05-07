#!/usr/bin/env node
// Read all .jsonl captures and summarize event types, fields, sequences.

import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, "captures");
const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl")).sort();

const summary = {};

for (const file of files) {
  const path = join(dir, file);
  const lines = readFileSync(path, "utf8").split("\n").filter(Boolean);
  const events = [];
  for (const line of lines) {
    try {
      events.push(JSON.parse(line));
    } catch {
      events.push({ __parseError: true, raw: line.slice(0, 120) });
    }
  }
  summary[file] = {
    totalLines: lines.length,
    parseErrors: events.filter((e) => e.__parseError).length,
    types: aggregate(events),
    sequence: events.map((e) => `${e.type ?? "?"}${e.subtype ? "/" + e.subtype : ""}`),
  };
}

function aggregate(events) {
  const buckets = {};
  for (const e of events) {
    if (e.__parseError) continue;
    const key = e.type ?? "unknown";
    if (!buckets[key]) buckets[key] = { count: 0, sampleFields: new Set(), subtypes: new Set() };
    buckets[key].count += 1;
    Object.keys(e).forEach((k) => buckets[key].sampleFields.add(k));
    if (e.subtype) buckets[key].subtypes.add(e.subtype);
  }
  return Object.fromEntries(
    Object.entries(buckets).map(([k, v]) => [
      k,
      {
        count: v.count,
        fields: [...v.sampleFields].sort(),
        subtypes: [...v.subtypes].sort(),
      },
    ])
  );
}

console.log("# Stream-JSON Recon Summary\n");
for (const [file, info] of Object.entries(summary)) {
  console.log(`## ${file}`);
  console.log(`- lines: ${info.totalLines}, parseErrors: ${info.parseErrors}\n`);
  console.log("### Event types observed");
  for (const [t, v] of Object.entries(info.types)) {
    console.log(`- **${t}** (${v.count}x) — fields: ${v.fields.join(", ")}${v.subtypes.length ? "; subtypes: " + v.subtypes.join(", ") : ""}`);
  }
  console.log("\n### Sequence (first 30)");
  console.log("```");
  console.log(info.sequence.slice(0, 30).join(" → "));
  console.log("```\n");
}

console.log("\n# Combined unique event types across all captures\n");
const allTypes = new Set();
for (const info of Object.values(summary)) {
  Object.keys(info.types).forEach((t) => allTypes.add(t));
}
console.log([...allTypes].sort().map((t) => `- ${t}`).join("\n"));
