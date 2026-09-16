---
name: documentation
description: Use when writing or editing any prose documentation in docs/ (ops-runbook, admin/user/chef guides, README, ADR notes, the prose parts of feature proposals). Enforces compact, factual, present-tense text that states only what we do — commands, values, where things live — with no negatives, no alternatives, no futures, no loaded adjectives, no concrete mailboxes or secrets.
---

# Documentation

Documentation states what we do and how. The reader is a future admin or developer who wants to act, not to be persuaded.

## Content rules

- **Only what we do.** Procedures, commands, values, where a thing lives, what to expect. Never what we don't do, never
  what a thing does *not* affect, never rejected alternatives, never "when X ships" futures. If a step is optional or
  later, it is not in the runbook.
- **Rationale lives elsewhere.** The *why* belongs in the feature proposal (`docs/features/`) or an ADR (`docs/adr.md`);
  link to it in one line. The runbook does not argue.
- **Commands over UI.** When a `wrangler`/`npm`/`make` command exists, that is the instruction. A UI path appears only
  when no command exists.
- **Placeholders for anything personal or secret.** `<dev test mailbox>`, `<value>`. System addresses on our own domain
  (`no-reply@skraaningen.dk`), worker, queue and bucket names are written out.
- **Facts you verified.** Every command, flag, file path and default was run or read, not recalled.

## Style rules

- Compact: one sentence per fact; a table for values and their locations; a code block for a procedure, with a
  trailing `# expect: …` comment where the outcome is not obvious.
- Present tense, active voice, plain nouns as headings ("Addresses", "Secrets", "Deploy and verify").
- No loaded or evaluative words: *deliberately, simply, cheap, worth, clean, robust, safe, obvious, just, of course*.
  No emphasis for persuasion; bold only for the one value the reader must not miss.
- No narration of history ("earlier the same day", "superseded"), no meta-comments about the doc itself.
- Names as they are in code and infra: target names, env names, file paths, exact casing.

## Which document

| Content | Lives in |
|---|---|
| Admin procedures, infra setup, resources per environment, secrets handling, triage | `docs/ops-runbook.md` |
| App usage for admins / users / chefs | `docs/admin-guide.md`, `docs/user-guide.md`, `docs/chef-guide.md` |
| Design, decisions with status, packages, coverage matrix | `docs/features/<kind>-<name>.md` |
| Architecture rules and their compliance | `docs/adr.md`, `docs/adr-compliance-*.md` |
| Dev commands and database setup | `README.md`, `CLAUDE.md` |

State a fact once, in the document that owns it; other documents link.

## Before returning

- [ ] Every sentence describes something we do or a value that exists
- [ ] No sentence starts with or contains "never", "not", "no longer", "instead of", "rather than", "would", "when … ships"
- [ ] No adjectives or adverbs that judge; no history; no futures
- [ ] Commands verified; anchors resolve (`grep -n "^## \|^### "` after editing headings)
- [ ] No concrete personal mailbox, token or secret value

## Example

Before:
> Concrete mailboxes are deliberately **not written in this repo**: they live in `.env.<env>` and as Worker secrets. `wrangler deploy` does **not** create queues; deploying before step 4 fails. It is only a mail header: the mailbox needs no Cloudflare setup, verification or DNS.

After:
> Mailboxes live in `.env.<env>` (local) and as Worker secrets (`wrangler secret put`). Create the queue before the first deploy. `replyTo` is a mail header.
