import * as notion from "@withone/sdk/notion";
import { connections, notionParentPageId, oneClient } from "./config.js";

const notionConn = () => oneClient().connection(connections.notion());

/**
 * The batch page-create action has no typed module in @withone/sdk yet, so
 * this one call goes through One's raw passthrough (`runRaw`): same auth,
 * same connection, same retries as every typed call, just without
 * generated request and response types. The action id is One's own Notion
 * action in the catalog (`one --agent actions find notion "create a page"`).
 */
const CREATE_PAGES = {
  id: "conn_mod_def::GHmt2usus_k::6Dk4f-RQSqq6WmD5WOkdJQ",
  path: "/v1/notion/create-multiple-pages",
};

interface CreatePagesResult {
  results?: { index?: number; created?: boolean; page?: { id?: string; url?: string }; failure?: { error?: string } }[];
  created?: number;
  failed?: number;
}

/**
 * Creates one new page under NOTION_PARENT_PAGE_ID. This is the only write
 * in the whole pipeline, and it's a draft, not a publish: the page lands in
 * the team's own workspace for a human to read, edit, and decide whether
 * (and where) it goes out from there. Nothing here reaches a customer.
 */
export async function createDraftPage(title: string, markdown: string): Promise<{ id: string; url: string }> {
  const res = await notionConn().runRaw({
    systemId: CREATE_PAGES.id,
    method: "POST",
    path: CREATE_PAGES.path,
    body: {
      parent: { type: "page_id", page_id: notionParentPageId() },
      pages: [
        {
          properties: { title: [{ text: { content: title } }] },
          icon: { type: "emoji", emoji: "📝" },
          markdown,
        },
      ],
    },
  });
  const data = res.data as CreatePagesResult;
  const result = data?.results?.[0];
  if (!result?.created || !result.page?.id) {
    throw new Error(`Notion did not create the page: ${result?.failure?.error ?? "unknown error"}`);
  }
  return { id: result.page.id, url: result.page.url ?? "" };
}

/** A cheap liveness probe for `npm run check`: does the parent page actually exist and answer. */
export async function probeNotion(): Promise<void> {
  const res = await notionConn().run(notion.retrievePage({ path: { pageId: notionParentPageId() } }));
  const data = res.data as { object?: string };
  if (data?.object !== "page") {
    throw new Error("NOTION_PARENT_PAGE_ID did not resolve to a page.");
  }
}
