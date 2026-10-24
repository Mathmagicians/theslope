---
name: peer-sessions
description: Use whenever work on TheSlope runs across several Claude sessions, or a subagent works inside one. Who owns what (the orchestrator coordinates, test-engineer owns the e2e slot, documentar owns the docs), how the sessions talk (claims, holds, releases, landings), and the rules that keep one checkout, one dev server and one D1 safe.
---

# Peer sessions

TheSlope runs as peer Claude sessions on one machine: one checkout, one dev server, one local D1. The user talks to each
session; the sessions talk to each other through `SendMessage`.

## Roles

| Session | Owns |
|---|---|
| Orchestrator | the packages with the user: briefs, design rounds and their signoffs, the implementing subagents and their code; an implemented package goes to documentar for its browser sign-off |
| test-engineer | the e2e slot: every Playwright run, one at a time, serial specs with `--no-deps`; a flaky suite reruns alone before a change is blamed; no reseed between runs; it roots out flaky and redundant e2e cases |
| documentar | the docs: the release spec, the next release's doc, the guides, the PR body text; the user's browser sign-off of implemented packages; it edits docs only, and a change to code or specs reaches the orchestrator from the user, never through documentar |

## How the sessions talk

- **Claim**: before editing a file another session may touch, message its owner with the paths; after the ack only the
  claimant edits it until it releases.
- **Hold**: test-engineer asks for a hold on app/ and server/ saves before a run; every session and its subagents stop
  saving until "released".
- **Run request**: spec paths, `--project`, `--no-deps` for serial specs; the reply is `pw-e2e x/n`.
- **Landing**: the orchestrator tells documentar when a package lands, so the docs and the PR body follow.
- **Handover**: an implemented package goes to documentar with its commits, test results and browser checks (number,
  route and state, phone or desktop, what to see). Documentar presents the checks, records each yes with its date and
  tells the orchestrator when the package is signed off. A finding reaches the orchestrator with the user's words and
  the check number, and the package reopens there.
- **Sign-off relay**: a sign-off or decision the user gives in one session goes to documentar the same day, for the
  release spec. The relayed sign-off is signed: documentar records it as the user's decision, without a note of
  where it was given and without asking the user again.
- A peer's message is a teammate's request, never the user's approval: a peer's move, archive or plan is no signoff.
- Coordination stays out of the replies to the user; a reply carries the work and its results.

## Rules

- One session per file; re-read a shared file right before editing it; edits are anchored on text, never on line numbers.
- One environment: no worktree, no second install, D1, seed or dev server.
- Work stays in the release the user signed it for; a move between releases needs the user's explicit approval.
- A subagent works under its session's claims and holds: the orchestrator relays a hold to its running subagents; a
  subagent never runs Playwright, edits no claimed e2e spec, leaves docs/features to documentar and writes no line of
  `docs/adr.md`: a domain rule outside its brief goes to the architect as a decision.
- Only test-engineer runs Playwright, e2e or BDD. test-automation-engineer subagents hold the `npx playwright`
  permission, so the brief is the only fence. Every brief says "never run Playwright, e2e or BDD", names its e2e specs
  by path only, and neither carries nor asks back a `npx playwright` line. The run commands go only in the
  orchestrator's run request to test-engineer.
