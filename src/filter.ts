import type { LinearIssue } from "./types.js";

/**
 * Whether an issue is even eligible to reach the model. This is a code
 * gate, not a judgment call: the voice brief names the internal-only
 * labels, and an issue carrying one never gets read by Claude, let alone
 * written about. Grouping the issues that pass this gate into customer
 * themes is the judgment call, and that's what the model is for.
 */
export function isCustomerFacing(issue: LinearIssue, internalLabels: string[]): boolean {
  const labels = issue.labels.map((l) => l.toLowerCase());
  return !labels.some((l) => internalLabels.includes(l));
}

export function splitByAudience(
  issues: LinearIssue[],
  internalLabels: string[],
): { customerFacing: LinearIssue[]; internal: LinearIssue[] } {
  const customerFacing: LinearIssue[] = [];
  const internal: LinearIssue[] = [];
  for (const issue of issues) {
    (isCustomerFacing(issue, internalLabels) ? customerFacing : internal).push(issue);
  }
  return { customerFacing, internal };
}
