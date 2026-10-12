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

Captures (⌘I, or the box on Today) land in `inbox.md`. `app/skills/sort-inbox/SKILL.md` tells Claude how to file them. Say "sort" in a Claude Code session in the vault, or start the reader with `VAULT_SORTER=1` to let it sort on its own (needs the `claude` CLI).

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
