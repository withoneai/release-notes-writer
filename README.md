<h3 align="center">Release Notes Writer</h3>
<p align="center">An AI pipeline that turns the week's completed Linear issues into release notes a customer can actually read: internal-only work filtered out in code, the rest grouped into themes by Claude, and every cited ticket checked against the real batch before it ships.<br />Built on <a href="https://withone.ai">One</a>. Nothing is ever published automatically; the result lands as a draft page in Notion, and a human decides whether it's right and where it goes from there.</p>

<p align="center">
  <a href="https://withone.ai"><strong>Website</strong></a>
  &nbsp;·&nbsp;
  <a href="https://withone.ai/docs"><strong>Docs</strong></a>
  &nbsp;·&nbsp;
  <a href="https://app.withone.ai"><strong>Dashboard</strong></a>
</p>

---

## What it does

Writing release notes is a chore nobody owns, so it slips, and the backlog of "I'll write that up later" tickets never gets shorter. The usual shortcut, pasting ticket titles into a doc, reads like a changelog for engineers, not something a customer would want to read. Run this and for the last week it:

1. **Pulls every issue completed in the lookback window** (7 days by default) straight from Linear.
2. **Filters out internal-only work in code**, against the labels named in `config/voice-brief.md` (chore, internal, test, ci, infra, refactor, docs-internal by default). This is a mechanical check, not a judgment call: an issue carrying one of these labels never reaches the model at all.
3. **Groups what's left into customer-recognizable themes with Claude**, following the voice brief for tone, grouping, and format. The model writes the heading and the paragraph, and says which issues each theme covers.
4. **Checks every cited issue against the real batch.** An identifier the model invents, or copies wrong, is dropped from its theme rather than trusted; a theme that loses every identifier this way is dropped entirely, because a paragraph about a ticket that doesn't exist is worse than no paragraph. Issues no theme ends up covering are not discarded either: they land in a catch-all list at the bottom of the page, so nothing shipped this week goes unmentioned.
5. **Creates one draft page in Notion**, under a page you configure, titled with the date range. Nothing is sent to a customer, posted to a changelog, or shared outside your own workspace; a human reads the draft and decides what happens to it next.

Sample output (fictional company, shipped as the demo fixture):

```
$ npm start

11 issue(s) completed in the last 7 days, 4 internal-only (skipped before the model ever saw them), 7 customer-facing

── CSV exports no longer time out
   Exporting a large date range of jobs used to fail outright once it passed roughly 90 days. The export now streams the file instead of building it all at once, so there is no longer a range size where it just stops working.
   shipped: ENG-401

── Reassign routes to another driver in one step
   You can now select several stops on the dispatch board at once and move them all to a different driver in a single action, instead of reassigning one stop at a time.
   shipped: ENG-404

── A smoother, darker dispatch board
   The board's route map no longer redraws on every keystroke while you search for a stop, so it stays responsive even with dozens of stops on screen. A new dark mode, toggleable from the board's settings menu, makes it easier on the eyes for teams running it on a wall monitor overnight.
   shipped: ENG-407, ENG-412

── More reliable delivery tracking and proof of delivery
   The customer tracking page now recalculates the ETA as soon as a dispatcher edits a route, instead of showing the original estimate. On the driver side, proof-of-delivery photos are resized on the device before upload, which fixes crashes that happened when a newer phone's camera produced a photo larger than the app could handle.
   shipped: ENG-410, ENG-415

1 issue(s) no theme covered, listed in the catch-all: ENG-399

4 theme(s) covering 6 issue(s), 1 in the catch-all, out of 7 customer-facing issue(s) reviewed
demo mode: nothing was created in Notion
```

## Why the identifier check has to be code, not a prompt

Telling a model not to invent a ticket number does not stop it from doing so under pressure to fill out a theme. So the check does not rely on the model behaving: `src/gate.ts` takes the exact list of identifiers Claude cited for each theme and checks every one against the batch that was actually sent. One that isn't there is removed from the theme; if that empties the theme, the whole paragraph is dropped. The same file tracks which real issues never got cited by anything, so a ticket that genuinely shipped this week can't vanish just because the model didn't group it anywhere; it surfaces in the catch-all instead. Trusting the model's own claim about what it covered is exactly the failure mode this exists to catch.

## How it's built

About 500 lines of TypeScript. Linear's GraphQL endpoint goes through the [One SDK](https://www.npmjs.com/package/@withone/sdk)'s raw passthrough (there is no typed Linear query builder for arbitrary filters yet), and Notion page creation uses the typed `@withone/sdk/notion` module. Claude groups and writes with a schema-validated response, and the identifier-verification gate has its own tests (`npm test`).

The voice brief is one markdown file: the audience, the tone, which labels mean "never show this to a customer," how to group issues into themes, and the paragraph format. Changing any of that means editing the file, not the code.

## Run it

```bash
git clone https://github.com/withoneai/release-notes-writer
cd release-notes-writer && npm install
npm start
```

That works with no keys and no accounts. With nothing configured it falls through to a recorded week of completed Linear issues for a fictional logistics company and replays the themes Claude actually returned for that batch, so you can read the whole decision before pointing it at your own team's tickets. When you're ready, `cp .env.example .env`, add your keys, the Linear connection key, your Notion connection key, and the Notion page id the draft should land under, and `npm run check` proves both connections answer before you run it for real.

## What you need

- A free [One account](https://app.withone.ai) with Linear and Notion connected
- An [Anthropic API key](https://platform.claude.com)
- A Notion page to create the draft under (any page you can edit; copy its id out of the URL)
- Node 20+

One Linear call per run (the completed-issues query, paginated once per `ISSUE_LIMIT` issues), one Claude call per run (every customer-facing issue goes in a single grouping call), and one Notion call to create the page. A typical week of 10 to 20 completed issues is one of each.

## What it does not do

It does not publish anywhere customers would see it; the Notion page it creates is a draft in your own workspace. It does not touch Linear; issues are only read, never commented on, labeled, or closed. It does not decide what counts as customer-facing beyond the labels you name in the voice brief; add a label there and that work stops reaching the model. And it does not guarantee the grouping is the one you'd have chosen: it's a first draft with its sourcing checked, built so that editing it is faster than starting from a blank page.
