---
name: code-comments
description: Use when writing, editing, or reviewing code comments. Enforces concise, factual comments that explain non-obvious WHY — never restating the code, narrating project history/old bugs, or stating the obvious.
---

# Code Comments

Write a comment only when it adds information the code cannot convey itself.

## Write a comment when

- The WHY is non-obvious: a hidden constraint, a subtle invariant, a
  deliberate trade-off, behaviour that would surprise a careful reader.
- An external contract demands it: an upstream API quirk, a protocol rule,
  a spec the code must honour.

## Never write a comment that

- Restates the code (`// increment counter` over `counter++`).
- Narrates history: old bugs, regressions, "this used to…", "previously…",
  "fixed the case where…". History belongs in the commit message / PR.
- References the current task, ticket, author, or diff ("added for X flow",
  "see #123", "per Y's request").
- Labels code hack/workaround/temporary without a concrete, checkable
  removal condition.
- Explains what is obvious to anyone fluent in the language/framework.

## Style

- One line where one line suffices — no multi-paragraph blocks.
- Present tense, factual: state what is true now, not what changed.
- Describe the code as it stands; a reader with zero history must follow it.

## Self-test before keeping a comment

Ask: *would this still read correctly to someone who never saw the old
code, the bug, or the PR?* If not — rewrite it as a present-tense fact,
or delete it.
