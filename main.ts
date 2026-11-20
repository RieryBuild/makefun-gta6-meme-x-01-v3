// makefun-gta6-meme-x-01-v3 — entrypoint (node22, stdlib only).
//
// The entry is the X post itself: POST.json (written after the post goes
// live) holds the post URL, and this program validates it and copies it to
// ./output/entry.json so the grader can see the entry link in a stable,
// deterministic form.
//
// Usage:
//   node main.ts                 # reads ./POST.json, writes ./output/entry.json
//   node main.ts <path>          # reads <path> instead of ./POST.json
//
// Exit codes: 0 = valid entry link written; 1 = usage error;
// 2 = POST.json missing or not valid JSON; 3 = URL fails validation.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const STATUS_HOST = "x.com";
const STATUS_PATH = /^\/[A-Za-z0-9_]+\/status\/[0-9]+$/;

export interface EntryLink {
  url: string;
}

export function parseEntryLink(raw: string): EntryLink {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("POST.json is not valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("POST.json must be a JSON object");
  }
  const record = parsed as Record<string, unknown>;
  if (typeof record.url !== "string" || record.url.length === 0) {
    throw new Error('POST.json must hold a "url" string');
  }
  let url: URL;
  try {
    url = new URL(record.url);
  } catch {
    throw new Error("POST.json url is not a valid URL");
  }
  if (url.protocol !== "https:") {
    throw new Error("POST.json url must use https");
  }
  if (url.port !== "") {
    throw new Error("POST.json url must not carry a port");
  }
  // URL parsing already lowercases the hostname; lowercasing again is a
  // cheap guard if this ever runs on a non-WHATWG parser.
  if (url.hostname.toLowerCase() !== STATUS_HOST) {
    throw new Error(`POST.json url must be on ${STATUS_HOST}`);
  }
  if (!STATUS_PATH.test(url.pathname)) {
    throw new Error("POST.json url must be an X status URL (/handle/status/id)");
  }
  return { url: record.url };
}

export function renderEntry(link: EntryLink): string {
  // Fixed key order, trailing newline: byte-identical on every run.
  return JSON.stringify({ platform: "x", url: link.url }, null, 2) + "\n";
}

export function main(argv: string[]): number {
  const input = argv[2] !== undefined && argv[2] !== "" ? resolve(argv[2]) : join(dirname(fileURLToPath(import.meta.url)), "POST.json");
  let raw: string;
  try {
    raw = readFileSync(input, "utf8");
  } catch {
    console.error(`cannot read ${input}: run after the X post is live and POST.json exists`);
    return 2;
  }
  let link: EntryLink;
  try {
    link = parseEntryLink(raw);
  } catch (error) {
    console.error((error as Error).message);
    return 3;
  }
  const outDir = join(dirname(fileURLToPath(import.meta.url)), "output");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "entry.json"), renderEntry(link), "utf8");
  console.log(`entry link OK: ${link.url}`);
  return 0;
}

const invokedPath = process.argv[1] !== undefined ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv);
}
