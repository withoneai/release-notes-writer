import { DEMO, DEMO_REASON, LOOKBACK_DAYS, internalLabels, notionConfigured } from "./config.js";
import { splitByAudience } from "./filter.js";
import { gate } from "./gate.js";
import { listCompletedIssues } from "./linear.js";
import { draftReleaseNotes } from "./notes.js";
import { createDraftPage } from "./notion.js";
import type { LinearIssue, VerifiedTheme } from "./types.js";

interface Options {
  dryRun: boolean;
}

function parseArgs(argv: string[]): Options {
  const args = argv.slice(2);
  if (args.includes("--help")) {
    console.log(
      [
        "Usage:",
        "  npm start                  draft this week's release notes from Linear, create the Notion draft page",
        "  npm start -- --demo        replay the recorded batch, no keys, no network",
        "  npm start -- --dry-run     print the draft, create nothing in Notion",
        "",
        "Lookback window defaults to 7 days; override with LOOKBACK_DAYS in .env.",
        "Internal-only labels are read from config/voice-brief.md, not .env.",
      ].join("\n"),
    );
    process.exit(0);
  }
  return { dryRun: args.includes("--dry-run") };
}

function renderMarkdown(intro: string, themes: VerifiedTheme[], uncovered: LinearIssue[], rangeLabel: string): string {
  const lines: string[] = [`# Release notes: ${rangeLabel}`, "", intro, ""];
  for (const theme of themes) {
    lines.push(`## ${theme.heading}`, "", theme.summary, "", `_Shipped: ${theme.issues.map((i) => i.identifier).join(", ")}_`, "");
  }
  if (uncovered.length > 0) {
    lines.push("## Also shipped", "");
    for (const issue of uncovered) {
      lines.push(`- ${issue.title} (${issue.identifier})`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

const opts = parseArgs(process.argv);

const demoNote = DEMO ? ` (demo: ${DEMO_REASON}, replaying the recorded batch)` : "";
console.log(`── release notes writer${demoNote}\n`);
if (DEMO && DEMO_REASON !== "--demo") {
  console.log("   No keys found, so this replays a recorded week of completed Linear issues:");
  console.log("   a fictional team's shipped tickets, real pipeline. Copy .env.example to .env to read yours.\n");
}

const { issues, capturedAt } = await listCompletedIssues();
const labels = internalLabels();
const { customerFacing, internal } = splitByAudience(issues, labels);

console.log(
  `${issues.length} issue(s) completed in the last ${LOOKBACK_DAYS} days, ${internal.length} internal-only (skipped before the model ever saw them), ${customerFacing.length} customer-facing${opts.dryRun ? " (dry run)" : ""}\n`,
);

if (customerFacing.length === 0) {
  console.log("Nothing customer-facing shipped this window. No page to draft.");
  process.exit(0);
}

const draft = await draftReleaseNotes(customerFacing);
const { themes, uncovered } = gate(draft, customerFacing);

for (const theme of themes) {
  console.log(`── ${theme.heading}`);
  console.log(`   ${theme.summary}`);
  console.log(`   shipped: ${theme.issues.map((i) => i.identifier).join(", ")}`);
  if (theme.droppedIdentifiers.length > 0) {
    console.log(`   dropped from this theme (not in the real batch): ${theme.droppedIdentifiers.join(", ")}`);
  }
  console.log();
}

if (uncovered.length > 0) {
  console.log(`${uncovered.length} issue(s) no theme covered, listed in the catch-all: ${uncovered.map((i) => i.identifier).join(", ")}\n`);
}

const rangeEnd = capturedAt.toISOString().slice(0, 10);
const rangeStart = new Date(capturedAt.getTime() - LOOKBACK_DAYS * 86_400_000).toISOString().slice(0, 10);
const rangeLabel = `${rangeStart} to ${rangeEnd}`;
const markdown = renderMarkdown(draft.intro, themes, uncovered, rangeLabel);
const title = `Release notes draft: ${rangeLabel}`;

console.log(
  `${themes.length} theme(s) covering ${themes.reduce((n, t) => n + t.issues.length, 0)} issue(s), ${uncovered.length} in the catch-all, out of ${customerFacing.length} customer-facing issue(s) reviewed`,
);

if (opts.dryRun) {
  console.log(`\n── would create Notion page "${title}":\n${markdown}`);
} else if (DEMO) {
  console.log(`\n── would create Notion page "${title}" (no Notion key in demo mode)`);
  console.log("demo mode: nothing was created in Notion");
} else if (!notionConfigured()) {
  console.log(`\nNOTION_PARENT_PAGE_ID not configured; printing the draft instead:\n\n${markdown}`);
} else {
  const page = await createDraftPage(title, markdown);
  console.log(`\ncreated draft page "${title}": ${page.url}`);
}
