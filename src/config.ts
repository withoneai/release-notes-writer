import "dotenv/config";
import { readFileSync } from "node:fs";
import { One } from "@withone/sdk";

/**
 * Demo mode replays a recorded batch of completed Linear issues from
 * fixtures/. It turns on two ways: explicitly with --demo, or implicitly
 * when the required keys are absent. The implicit fallback is what makes a
 * fresh clone runnable with zero configuration: the same internal-label
 * filter, the same theming model call, the same identifier-verification
 * gate all run for real, only the Linear read and the Claude call come from
 * disk instead of the wire, and no page is ever actually created.
 */
const KEYS_PRESENT = Boolean(
  process.env.ONE_SECRET && process.env.ANTHROPIC_API_KEY && process.env.ONE_CONNECTION_LINEAR,
);

export const DEMO = process.argv.includes("--demo") || !KEYS_PRESENT;
export const DEMO_REASON = process.argv.includes("--demo")
  ? "--demo"
  : KEYS_PRESENT
    ? ""
    : "no keys in the environment";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}. Copy .env.example to .env and fill it in.`);
    console.error("Or run `npm start -- --demo` to replay the recorded batch, no keys needed.");
    process.exit(1);
  }
  return value;
}

let client: One | undefined;
export function oneClient(): One {
  client ??= new One(required("ONE_SECRET"));
  return client;
}

export const connections = {
  linear: () => required("ONE_CONNECTION_LINEAR"),
  notion: () => required("ONE_CONNECTION_NOTION"),
};

export const notionConfigured = () =>
  Boolean(process.env.ONE_CONNECTION_NOTION && process.env.NOTION_PARENT_PAGE_ID);
export const notionParentPageId = () => required("NOTION_PARENT_PAGE_ID");

export const TEAM_KEY = process.env.TEAM_KEY || undefined;

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-opus-5";

function numberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    console.error(`${name} must be a positive number, not "${raw}".`);
    process.exit(1);
  }
  return value;
}

export const LOOKBACK_DAYS = numberEnv("LOOKBACK_DAYS", 7);
export const ISSUE_LIMIT = numberEnv("ISSUE_LIMIT", 100);

export function loadFixture(relPath: string): unknown {
  const url = new URL(`../fixtures/${relPath}`, import.meta.url);
  try {
    return JSON.parse(readFileSync(url, "utf8"));
  } catch {
    throw new Error(`No fixture at fixtures/${relPath}.`);
  }
}

export function loadVoiceBrief(): string {
  return readFileSync(new URL("../config/voice-brief.md", import.meta.url), "utf8");
}

/** Labels the voice brief names as internal-only, parsed out of its own text so the file stays the single source. */
export function internalLabels(): string[] {
  const brief = loadVoiceBrief();
  const match = brief.match(/Internal-only labels:\s*(.+)/i);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((l) => l.trim().toLowerCase())
    .filter(Boolean);
}
