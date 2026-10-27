import * as linear from "@withone/sdk/linear";
import { DEMO, ISSUE_LIMIT, LOOKBACK_DAYS, TEAM_KEY, connections, loadFixture, oneClient } from "./config.js";
import type { LinearIssue } from "./types.js";

const linearConn = () => oneClient().connection(connections.linear());

const LIST_QUERY = `
  query CompletedIssues($first: Int, $filter: IssueFilter) {
    issues(first: $first, filter: $filter) {
      nodes {
        id
        identifier
        title
        description
        url
        completedAt
        state { name }
        assignee { name }
        labels { nodes { name } }
      }
    }
  }
`;

interface RawIssueNode {
  id?: string;
  identifier?: string;
  title?: string;
  description?: string | null;
  url?: string;
  completedAt?: string | null;
  state?: { name?: string };
  assignee?: { name?: string } | null;
  labels?: { nodes?: { name?: string }[] };
}

function toIssue(raw: RawIssueNode): LinearIssue {
  return {
    id: raw.id ?? "",
    identifier: raw.identifier ?? "?",
    title: raw.title ?? "(untitled)",
    description: raw.description ?? "",
    url: raw.url ?? "",
    stateName: raw.state?.name ?? "Done",
    assignee: raw.assignee?.name ?? null,
    labels: (raw.labels?.nodes ?? []).map((l) => l.name ?? "").filter(Boolean),
    completedAt: raw.completedAt ?? new Date().toISOString(),
  };
}

/**
 * Pulls every issue completed in the lookback window (7 days by default),
 * oldest-completed first, up to ISSUE_LIMIT. In demo mode this reads the
 * recorded fixture instead: same shape, no network.
 */
export async function listCompletedIssues(): Promise<{ issues: LinearIssue[]; capturedAt: Date }> {
  if (DEMO) {
    const meta = loadFixture("linear/meta.json") as { captured_at: string };
    const raw = loadFixture("linear/issues.json") as {
      id: string;
      identifier: string;
      title: string;
      description: string;
      url: string;
      completed_at: string;
      state_name: string;
      assignee: string | null;
      labels: string[];
    }[];
    const issues = raw.map((r) => ({
      id: r.id,
      identifier: r.identifier,
      title: r.title,
      description: r.description,
      url: r.url,
      stateName: r.state_name,
      assignee: r.assignee,
      labels: r.labels,
      completedAt: r.completed_at,
    }));
    issues.sort((a, b) => a.completedAt.localeCompare(b.completedAt));
    return { issues, capturedAt: new Date(meta.captured_at) };
  }

  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString();
  const filter: Record<string, unknown> = { completedAt: { gte: since } };
  if (TEAM_KEY) filter.team = { key: { eq: TEAM_KEY } };

  const res = await linearConn().run(
    linear.listIssues({
      body: {
        query: LIST_QUERY,
        variables: { first: ISSUE_LIMIT, filter },
      },
    }),
  );
  const nodes = ((res.data as { issues?: { nodes?: RawIssueNode[] } })?.issues?.nodes ?? []).filter(
    (n) => n.id,
  );
  const issues = nodes.map(toIssue);
  issues.sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  return { issues, capturedAt: new Date() };
}

/** A cheap liveness probe for `npm run check`: does the issues endpoint answer at all. */
export async function probeLinear(): Promise<number> {
  const res = await linearConn().run(
    linear.listIssues({
      body: { query: LIST_QUERY, variables: { first: 1, filter: {} } },
    }),
  );
  const nodes = (res.data as { issues?: { nodes?: unknown[] } })?.issues?.nodes;
  if (!Array.isArray(nodes)) {
    throw new Error("Linear answered, but not with an issue list.");
  }
  return nodes.length;
}
