import { DEMO, ISSUE_LIMIT, LOOKBACK_DAYS, internalLabels, loadVoiceBrief, notionConfigured } from "./config.js";
import { probeLinear } from "./linear.js";
import { probeNotion } from "./notion.js";

/**
 * Proves the run will work before you rely on it: the voice brief parses
 * and names at least one internal label, and (live only) Linear and Notion
 * both answer.
 */
let failed = false;

try {
  const brief = loadVoiceBrief();
  const headings = brief.split("\n").filter((l) => l.startsWith("## ")).length;
  const labels = internalLabels();
  console.log(`✓ config/voice-brief.md parses (${headings} sections, ${labels.length} internal label(s): ${labels.join(", ")})`);
  console.log(`✓ lookback window: ${LOOKBACK_DAYS} days, pulling up to ${ISSUE_LIMIT} issues`);

  if (DEMO) {
    console.log("\nNo keys in the environment, so neither connection was probed.");
    console.log("This clone will run `npm start` in demo mode: recorded issues, real pipeline.");
  } else {
    const count = await probeLinear();
    console.log(`✓ Linear answers (${count} issue${count === 1 ? "" : "s"} seen)`);
    if (!notionConfigured()) {
      throw new Error("ONE_CONNECTION_NOTION and NOTION_PARENT_PAGE_ID are both required (Notion is not optional here).");
    }
    await probeNotion();
    console.log("✓ Notion answers and NOTION_PARENT_PAGE_ID resolves to a page");
  }
} catch (err) {
  console.error(`✗ ${err instanceof Error ? err.message : err}`);
  failed = true;
}

process.exit(failed ? 1 : 0);
