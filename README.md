# Vault kit

A vault: your notes as a folder of markdown files, and a calm web page to read them, add to them and see what's next. This is the tool only. The starter vault is a few example notes.

## Run it

```sh
cd app && npm install
VAULT_PATH=../starter-vault npm run dev
```

Open http://localhost:4700. On localhost it opens without signing in.

Point `VAULT_PATH` at your own folder once you're done with the examples. Copying `starter-vault` somewhere and making it its own git repo works well.

## How the vault is shaped

Every note is a `.md` file with a short frontmatter block. Its `type:` decides where it shows:

| type | shows under |
|---|---|
| `project` | Projects (`status: active` ones show on Today) |
| `idea` | Ideas, grouped by folder (a `type: category` note names the folder) |
| `thought` | Thinking. `category:` is `loose`, `craft`, `career`, `personal` or `weeks` |
| `resource` | Resources (`### [Name](url)` entries) |
| `client` | Clients |
| `user`, `feedback` | About |
| `todo` | To do (`todo.md`, plain `- [ ]` lines) |

Captures (⌘I, or the box on Today) land in `inbox.md`. `app/skills/sort-inbox/SKILL.md` tells an agent how to file them. Say "sort" to any coding agent pointed at this repo (see `AGENTS.md`), or start the reader with `VAULT_SORTER=1` to let it sort on its own (that one needs the `claude` CLI).

## Writing canvas

A page of shapes instead of paragraphs: before and after, a flow, a decision, a chart. The agent writes the page as JSON in `<vault>/pages/<slug>.html`; the renderer in `app/canvas/` draws it at `/pages/<slug>.html`. The rules are in `app/skills/writing-canvas/SKILL.md`, every shape's fields in `reference.md` next to it, and `starter-vault/pages/writing-canvas.html` is the system written in itself.

Pages are meant to be used, not only read. A `live` block puts a working piece (a slider, a picker, a toy) in the page, written as plain HTML in a `<template>`; a bigger tool is a folder, `<vault>/pages/<slug>/index.html` with its own scripts and data, served at `/pages/<slug>/`. What you pick on a page is kept with `vault.state` in `<vault>/pages/_state/`, so it's there next time and an agent can read it.

Check a page before calling it done (with the reader running):

```sh
cd app && VAULT_PATH=<vault> node canvas/check.mjs <vault>/pages/<slug>.html
```

Screenshots (`canvas/shot.mjs`) and the layout check use Google Chrome: the app in `/Applications` on a Mac, `google-chrome` on the PATH elsewhere, or set `CHROME` to its path.

## Putting it on the web (optional)

The page is private by default because it only listens on your machine. To reach it from elsewhere, put it behind sign-in with [Clerk](https://clerk.com) and set:

```
CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
CLERK_FRONTEND_API=https://clerk.example.com
VAULT_ORIGIN=https://vault.example.com
VAULT_ALLOWED_EMAILS=you@example.com
```

Follow your organisation's rules on where its information may be stored before you put any of it online.

## Make it yours

The design tokens are at the top of `app/style.js`. Pages are built in `app/server.js`. Add a source (mail, calendar, docs) by writing notes into the vault folder. The page shows whatever is there.
