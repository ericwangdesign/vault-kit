---
name: sort-inbox
description: Sort the owner's Intake captures (vault/inbox.md) into the to-do list, projects, ideas, Thinking, Resources or Personal, and log each one in the receipt. Use when the owner says "sort", at the start of a session if the inbox has lines, or when a scheduled run asks for it.
---

# Sort the inbox

The vault is the owner's brain in digital form. Intake (⌘I) is where they drop things without deciding what they are. This skill decides, polishes, files, and leaves a receipt. They should never have to look at the raw inbox.

Vault: the folder in `VAULT_PATH`. Captures are `- **YYYY-MM-DD HH:MM** text` lines in `inbox.md`.

## For each capture, pick one home

| It is… | Goes to | Also |
|---|---|---|
| A job to do ("print something at the office") | `todo.md`, as a `- [ ] ` line at the very end of the file (under `## New`), written as an action | Polished: a short title (under 7 words, ends at the first full stop), then the details as short sentences. The To do page shows the title big and the details small under it. Never move lines between `## Today`, `## If there's time` and `## Later`: that's their call |
| About a project in motion ("tree shadow on the portfolio") | That project's note, in the body where it belongs | Update `next:` if it changes what's next. Set `nudged:` in frontmatter to the current local time (`YYYY-MM-DDTHH:MM:SS`) so the index shows a dot |
| A new idea ("what if we build…") | A new note in the right `ideas/<category>/` folder (`type: idea`) | Match the category heads: toys, tools, instruments, pursuits |
| Their own thinking or learning | `thinking/`, `type: thought` | Short; their polished words first, no quote marks around them. Set `category:` to one of `loose` (shelf "Loose thoughts": a passing thought, a few sentences, not worked out — the default for a quick `thought:`), `craft` (design, motion, interaction, process, the vault, once it's worked out at some length), `career` (shelf "Where I'm headed": direction, goals, reputation), `weeks` (weekly reviews only) |
| Life outside work: a trip, family, people, how they work | `personal/`. A trip is its own note, `type: trip` (`status:`, `page:` like a project); anything else `type: personal`. Who they are and how they work stays in `about-me` | The Personal shelf. Never Thinking, never Projects |
| Something someone else made or taught | `resources/` — inspiration, tools, learnings, classes or books, as a `### [Name](url)` entry | Personal learnings are Thinking, not Resources |
| Client work | `work/clients/<client>.md` or the right `work/` note | |

## Polish every capture before filing it

Do this for every capture, every time. It's the step that makes the vault worth reading.

1. **Fix the mechanics.** Spelling, grammar, capitals, punctuation. "zooom" → "zoom", "2c app" → "consumer app", "i" → "I".
2. **Short sentences. Always.** Aim for under 12 words each. One fact per sentence. Split anything with "and", ";" or a dash holding two thoughts together. A to-do is a short title, then details: `Pay the electric bill, $54.53. Due Nov 12. Check autopay first`. Never put a full stop inside the title (write "incl" as "with"). Cut filler ("and stuff", "....").
3. **Keep their voice.** First person, casual, plain words, short sentences (see `about-me`). Keep "would be cool", "I want to", swearing, their names for things. Never make it sound smarter, more philosophical, or more corporate than they do.
4. **Add nothing.** No new ideas, reasons, details, or claims they didn't say. Polish is about clarity, not content. If they wrote one line, the polished version is one or two lines, not a paragraph.
5. **Ambiguous? Pick the likeliest reading** and write that. The raw line in the receipt is the backup if you guessed wrong.
6. **Names, numbers, links, codes stay exact.** Never "fix" a product name, a person's name, a confirmation code or a URL.
7. **Polish the frontmatter you write too.** A new note's `title` and `description` are polished, never pasted raw.

Before → after:

| They typed | Filed as |
|---|---|
| would be cool to make a lamp that dims when ur phone is face down lol | It'd be cool to make a lamp that dims when my phone is face down. |
| 3d onboarding for 2c app have lots of opportunity for wow factor | 3D onboarding in consumer apps has a lot of room for a wow factor. |
| pay electric bill 54.53 due nov 12 check autopay first i think its on | `- [ ] Pay the electric bill, $54.53. Due Nov 12. Check autopay first` |
| book hotels for tokyo and osaka today, as well as plan the vegas trip | Two lines: `Book hotels for Tokyo and Osaka`, `Plan the Vegas trip` |

A capture that holds several jobs gets split, one line per job, each polished. A capture that's already clean gets left alone.

**Editing rules — these matter more than the filing:**
- Use Edit on existing notes, never Write. Change only the lines you mean to change.
- In frontmatter, touch only `next:` and `nudged:`. Never rewrite other fields.
- YAML values use straight ASCII quotes `"…"`. Curly quotes “ ” only ever appear *inside* a value, never around it.
- In `sorted.md`, copy the capture text exactly as they typed it, typos and all. Never paraphrase. Never polish it. This is the one place the raw words live.
- Put a project capture in the paragraph it's about, not tacked onto whichever paragraph is nearest.

Duplicates: merge into one, and log the second as `merged`. Unclear ones: make the best call and log it; the receipt is where they catch a wrong one. Only ask if it truly can't be placed.

## Then

1. Remove the sorted lines from `inbox.md` (keep its frontmatter).
2. Append one line per capture to `sorted.md`: `- **YYYY-MM-DD** <capture text> → [[note-name|Label]]` (add `, merged` for a duplicate). This is the ⌘⇧I receipt; it shows rough time only.
3. If the vault folder has its own `.git` (not just a repo somewhere above it), commit it with a message like `Sort inbox: 2 to-dos, 1 idea`.
4. Tell the owner in one line per capture where it went. Nothing else.

Principle to keep in mind while building on this: **when to abstract information and when to be explicit.** The receipt says "today", not 21:54. A project gets a dot, not a changelog.
