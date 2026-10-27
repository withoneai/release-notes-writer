# Release notes voice brief

## Audience

Customers who use the product, not engineers. They don't know our issue
identifiers, our internal codenames, or which team shipped what. They care
about what changed for them.

## Tone

Plain and confident. Short sentences. Say what changed, then why it matters,
in that order. No marketing superlatives ("game-changing", "revolutionary").
No apologizing for bugs that are now fixed; just say they're fixed.

## What counts as customer-facing

An issue is customer-facing if a customer using the product would notice the
change, directly or in what they're able to do. Internal refactors, test
coverage, CI changes, and infra moves are not, even if they took real work.

Internal-only labels: chore, internal, test, ci, infra, refactor, docs-internal

## Grouping

Group related issues into a small number of themes (three to six for a
typical week), each with a heading a customer would recognize as one thing,
not an engineering category. "Faster CSV exports" is a theme. "Backend"
is not.

## Format

One short paragraph per theme: what changed, then the concrete effect ("now
loads in under a second" beats "improved performance"). No em dashes or en
dashes anywhere; use a comma, period, colon, or parentheses instead.

## What never gets a theme of its own

A single-issue theme is fine when the issue is big enough to matter on its
own (a new capability, a fix for something customers were actively blocked
by). Small cleanups and minor fixes that don't deserve their own paragraph
belong in the catch-all list at the end of the page, not stretched into a
theme.
