# For the coding agent

This repo is a vault reader (`app/`) and a starter vault (`starter-vault/`). The owner's real vault is a separate
folder, set with `VAULT_PATH`. Notes are markdown files with frontmatter; `README.md` says which `type:` shows where.

Two skills live in `app/skills/`. Read the whole SKILL.md before doing either job.

- **"sort"**, or the vault's `inbox.md` has lines: follow `app/skills/sort-inbox/SKILL.md`. File each capture, log it
  in `sorted.md`, then tell the owner in one line per capture where it went.
- **"make it a canvas", "write it up", or an answer with a clear shape** (a change, a choice, a flow, numbers, a plan):
  follow `app/skills/writing-canvas/SKILL.md` and its `reference.md`. Pages go in `<vault>/pages/`. Run the checker
  before calling a page done.
  Pages are things to use: reach for a `live` piece pretty often, and read `<vault>/pages/_state/` when the owner
  says what they picked.

Rules that matter most:

- Edit notes in place and change only the lines you mean to. Never rewrite a note's frontmatter beyond what a skill says.
- Run the reader with `cd app && npm install && VAULT_PATH=<vault> npm run dev`; it opens at http://localhost:4700.
- The vault is its own git repo. Commit to it after a change; never add a remote the owner didn't set up.
