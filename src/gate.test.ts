import { test } from "node:test";
import assert from "node:assert/strict";
import { isCustomerFacing, splitByAudience } from "./filter.js";
import { gate } from "./gate.js";
import type { LinearIssue, ReleaseDraft } from "./types.js";

function issue(partial: Partial<LinearIssue>): LinearIssue {
  return {
    id: "id",
    identifier: "ENG-1",
    title: "Something",
    description: "",
    url: "https://linear.app/x/issue/ENG-1",
    stateName: "Done",
    assignee: null,
    labels: [],
    completedAt: new Date().toISOString(),
    ...partial,
  };
}

test("an issue labeled chore is not customer-facing", () => {
  assert.equal(isCustomerFacing(issue({ labels: ["chore"] }), ["chore", "internal"]), false);
});

test("an issue with no internal label is customer-facing", () => {
  assert.equal(isCustomerFacing(issue({ labels: ["bug"] }), ["chore", "internal"]), true);
});

test("splitByAudience partitions without reordering either side", () => {
  const a = issue({ identifier: "ENG-1", labels: ["bug"] });
  const b = issue({ identifier: "ENG-2", labels: ["chore"] });
  const c = issue({ identifier: "ENG-3", labels: [] });
  const { customerFacing, internal } = splitByAudience([a, b, c], ["chore"]);
  assert.deepEqual(customerFacing.map((i) => i.identifier), ["ENG-1", "ENG-3"]);
  assert.deepEqual(internal.map((i) => i.identifier), ["ENG-2"]);
});

test("an identifier the model invents is dropped from its theme, not trusted", () => {
  const real = issue({ identifier: "ENG-1" });
  const draft: ReleaseDraft = {
    intro: "intro",
    themes: [{ heading: "Faster exports", summary: "...", issueIdentifiers: ["ENG-1", "ENG-999"] }],
  };
  const { themes } = gate(draft, [real]);
  assert.equal(themes.length, 1);
  assert.deepEqual(themes[0].issues.map((i) => i.identifier), ["ENG-1"]);
  assert.deepEqual(themes[0].droppedIdentifiers, ["ENG-999"]);
});

test("a theme made entirely of invented identifiers is dropped, not shipped as a paragraph about nothing", () => {
  const real = issue({ identifier: "ENG-1" });
  const draft: ReleaseDraft = {
    intro: "intro",
    themes: [{ heading: "Imaginary feature", summary: "...", issueIdentifiers: ["ENG-999"] }],
  };
  const { themes, uncovered } = gate(draft, [real]);
  assert.equal(themes.length, 0);
  assert.deepEqual(uncovered.map((i) => i.identifier), ["ENG-1"]);
});

test("an issue no theme claims comes back as uncovered, not silently dropped", () => {
  const a = issue({ identifier: "ENG-1" });
  const b = issue({ identifier: "ENG-2" });
  const draft: ReleaseDraft = {
    intro: "intro",
    themes: [{ heading: "Theme", summary: "...", issueIdentifiers: ["ENG-1"] }],
  };
  const { uncovered } = gate(draft, [a, b]);
  assert.deepEqual(uncovered.map((i) => i.identifier), ["ENG-2"]);
});
