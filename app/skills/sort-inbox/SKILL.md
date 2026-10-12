---
name: sort-inbox
description: Sort the owner's Intake captures (vault/inbox.md) into the to-do list, projects, ideas, Thinking or Resources, and log each one in the receipt. Use when the owner says "sort", at the start of a session if the inbox has lines, or when a scheduled run asks for it.
---

# Sort the inbox

The vault is the owner's brain in digital form. Intake (⌘I) is where they drop things without deciding what they are. This skill decides, files, and leaves a receipt. They should never have to look at the raw inbox.

Vault: the folder in `VAULT_PATH`. Captures are `- **YYYY-MM-DD HH:MM** text` lines in `inbox.md`.

## For each capture, pick one home

| It is… | Goes to | Also |
|---|---|---|
| A job to do ("print something at the office") | `todo.md`, as a `- [ ] ` line, written as an action | Keep their words; tighten only if it's messy |
| About a project in motion ("tree shadow on the portfolio") | That project's note, in the body where it belongs | Update `next:` if it changes what's next. Set `nudged:` in frontmatter to the current local time (`YYYY-MM-DDTHH:MM:SS`) so the index shows a dot |
| A new idea ("what if we build…") | A new note in the right `ideas/<category>/` folder (`type: idea`) | Match the category heads: toys, tools, instruments, pursuits |
| Their own thinking or learning | `thoughts/`, `type: thought` | Short; their words first. Set `category:` to one of `loose` (shelf "Loose thoughts": a passing thought, a few sentences, not worked out — the default for a quick `thought:`), `craft` (design, motion, interaction, process, the vault, once it's worked out at some length), `career` (shelf "Where I'm headed": direction, goals, reputation), `personal` (family, life outside work), `weeks` (weekly reviews only) |
| Something someone else made or taught | `reference/` — inspiration, tools, learnings, classes or books, as a `### [Name](url)` entry | Personal learnings are Thinking, not Resources |
| Client work | `work/clients/<client>.md` or the right `work/` note | |

**Editing rules — these matter more than the filing:**
- Use Edit on existing notes, never Write. Change only the lines you mean to change.
- In frontmatter, touch only `next:` and `nudged:`. Never rewrite other fields.
- YAML values use straight ASCII quotes `"…"`. Curly quotes “ ” only ever appear *inside* a value, never around it.
- In `sorted.md`, copy the capture text exactly as they typed it, typos and all. Never paraphrase.
- Put a project capture in the paragraph it's about, not tacked onto whichever paragraph is nearest.

Duplicates: merge into one, and log the second as `merged`. Unclear ones: make the best call and log it; the receipt is where they catch a wrong one. Only ask if it truly can't be placed.

## Then

1. Remove the sorted lines from `inbox.md` (keep its frontmatter).
2. Append one line per capture to `sorted.md`: `- **YYYY-MM-DD** <capture text> → [[note-name|Label]]` (add `, merged` for a duplicate). This is the ⌘⇧I receipt; it shows rough time only.
3. If the vault is a git repo, commit it with a message like `Sort inbox: 2 to-dos, 1 idea`.
4. Tell the owner in one line per capture where it went. Nothing else.

Principle to keep in mind while building on this: **when to abstract information and when to be explicit.** The receipt says "today", not 21:54. A project gets a dot, not a changelog.
