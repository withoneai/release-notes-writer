import type { LinearIssue, ReleaseDraft, VerifiedTheme } from "./types.js";

/**
 * The model proposes themes and claims which issues each one covers; this
 * file decides what is allowed to stand. Every identifier a theme claims
 * must exist in the real completed batch handed to the model. One that
 * doesn't is dropped from the theme rather than trusted, because a release
 * note that cites a ticket that doesn't exist is worse than one that cites
 * nothing. A theme that loses every identifier this way is dropped
 * entirely: a paragraph about nothing real doesn't ship.
 *
 * Issues no theme ends up covering are not discarded either. They come
 * back from `gate()` as `uncovered`, for the catch-all list at the bottom
 * of the page, so nothing completed this week goes unmentioned.
 */
export function gate(
  draft: ReleaseDraft,
  issues: LinearIssue[],
): { themes: VerifiedTheme[]; uncovered: LinearIssue[] } {
  const byIdentifier = new Map(issues.map((i) => [i.identifier, i]));
  const covered = new Set<string>();

  const themes: VerifiedTheme[] = [];
  for (const theme of draft.themes) {
    const found: LinearIssue[] = [];
    const dropped: string[] = [];
    for (const id of theme.issueIdentifiers) {
      const issue = byIdentifier.get(id);
      if (issue) {
        found.push(issue);
        covered.add(id);
      } else {
        dropped.push(id);
      }
    }
    if (found.length === 0) continue; // nothing in this theme was real; drop the paragraph
    themes.push({ heading: theme.heading, summary: theme.summary, issues: found, droppedIdentifiers: dropped });
  }

  const uncovered = issues.filter((i) => !covered.has(i.identifier));
  return { themes, uncovered };
}
