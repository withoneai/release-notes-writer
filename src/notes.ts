import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { CLAUDE_MODEL, DEMO, loadFixture, loadVoiceBrief } from "./config.js";
import type { LinearIssue, ReleaseDraft } from "./types.js";

const client = new Anthropic();

const ThemeSchema = z.object({
  heading: z.string(),
  summary: z.string(),
  issueIdentifiers: z.array(z.string()),
});

const DraftSchema = z.object({
  intro: z.string(),
  themes: z.array(ThemeSchema),
});

/**
 * Groups this week's customer-facing issues into themes and writes the
 * customer-readable paragraph for each, grounded in config/voice-brief.md.
 * Which issues even reach this function is a code decision one level up
 * (src/filter.ts: internal-labeled issues never arrive). How to group what's
 * left, and how to phrase it for someone who has never seen a ticket, is
 * judgment, and that's what this function asks the model for. Every
 * identifier it claims gets checked against the real batch in src/gate.ts;
 * nothing here is trusted outright.
 */
export async function draftReleaseNotes(issues: LinearIssue[]): Promise<ReleaseDraft> {
  if (DEMO) {
    return loadFixture("notes.json") as ReleaseDraft;
  }

  const issueList = issues
    .map((i) => `${i.identifier}: ${i.title}${i.description ? `\n  ${i.description}` : ""}`)
    .join("\n\n");

  const prompt = `You write customer-facing release notes for a software company. Below is this week's batch of completed, customer-facing Linear issues (internal-only ones have already been removed before you saw this list). Group them into themes and write the copy, following the voice brief as the source of truth for tone, grouping, and format.

## Voice brief

${loadVoiceBrief()}

## This week's completed issues

${issueList}

## Instructions

- intro: one or two sentences introducing the week's release notes, no fluff, no "we're excited to announce".
- themes: three to six themes for a typical week, fewer if there genuinely isn't enough to say. Each theme needs a customer-recognizable heading, a short paragraph following the voice brief's format rules, and issueIdentifiers listing every identifier (exactly as given above, e.g. "ENG-123") that theme is actually about.
- Every identifier you cite in issueIdentifiers must be one from the list above, copied exactly. Do not invent one, and do not cite an identifier in more than one theme.
- Leave small, forgettable issues out of every theme rather than inventing a theme for them; they'll be listed separately.
- No em dashes or en dashes anywhere. Use a comma, period, colon, or parentheses instead.`;

  const response = await client.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
    output_config: { format: zodOutputFormat(DraftSchema) },
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined to draft release notes for this batch.");
  }
  if (!response.parsed_output) {
    throw new Error("Claude returned output that did not match the schema.");
  }
  return response.parsed_output;
}
