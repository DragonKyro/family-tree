# family-tree-api (Cloudflare Worker)

Tiny HTTP service that sits between the GitHub Pages SPA and the repo that holds family data.

- **Reads** (`GET /api/family`, `GET /photos/<name>`) fetch files from the `main` branch via the GitHub API. They're what the deployed site shows.
- **Writes** (`PUT /api/people/:id`, `POST /api/photos`) commit to an `edits` branch. The repo owner reviews + merges to `main` manually. GitHub Pages only rebuilds when `main` changes, so the edits branch doesn't thrash the deploy.
- **Every request** checks a shared family password (`X-Family-Password` header, or `?p=` query param for `<img>` requests).

## Before you deploy

You need:
- A GitHub **fine-grained personal access token** with `Contents: Read and write` on just this repo.
- A Cloudflare Workers account (free tier is enough).
- `wrangler` CLI logged in (`npx wrangler login`).

### One-time setup

1. **Edit [wrangler.toml](./wrangler.toml)** — set `GITHUB_REPO` to `<owner>/<repo>` and `ALLOWED_ORIGIN` to your GitHub Pages origin (e.g. `https://yourname.github.io`).

2. **Store secrets:**
   ```sh
   cd worker
   npx wrangler secret put GITHUB_TOKEN       # paste the PAT
   npx wrangler secret put FAMILY_PASSWORD    # paste "shum" (or whatever)
   ```

3. **Deploy:**
   ```sh
   npx wrangler deploy
   ```
   Note the deployed URL (looks like `https://family-tree-api.<account>.workers.dev`). You'll plug it into the SPA next.

4. **Wire the SPA to the Worker.** In the SPA repo's GitHub settings, add a repository *variable* (not secret) called `VITE_API_BASE` set to the Worker URL. The GitHub Pages build will bake it into the static bundle.

5. **Create the `edits` branch.** The Worker will auto-create it on first write, but you can do it manually too:
   ```sh
   git checkout -b edits main
   git push origin edits
   ```

## Review workflow

When a relative saves an edit, the Worker commits to `edits` with a message like `Edit kyle-lui (phone, email)` and appends a line to `data/edit-log.jsonl`. To review:

```sh
git fetch origin edits
git log main..origin/edits            # see pending edits
git diff main..origin/edits -- data/family.json
cat data/edit-log.jsonl | tail        # audit trail
```

Approve by merging (or cherry-picking) into `main`:

```sh
git checkout main
git merge origin/edits        # or: git cherry-pick <sha> [...]
git push origin main
```

GitHub Pages rebuilds on the push to `main`, and the updated tree goes live.

## Important: private repo caveat

If the repo is **public**, the password gate in the SPA is social-access only — anyone can hit `https://raw.githubusercontent.com/<owner>/<repo>/main/data/family.json` and read the whole tree, password or not. For the password to be meaningful you need to make the repo private.

Private repos on GitHub Pages require a paid plan (GitHub Pro, ~$4/mo). The free alternative is to host the SPA on Cloudflare Pages (free tier supports private GitHub repos) while keeping the same Worker backend.

## Local worker development

```sh
cd worker
echo 'GITHUB_TOKEN = "ghp_..."'        >  .dev.vars
echo 'FAMILY_PASSWORD = "shum"'        >> .dev.vars
npx wrangler dev
```

This runs the Worker on `http://localhost:8787`. Set `VITE_API_BASE=http://localhost:8787` in a `.env.local` in the SPA and run `npm run dev` to test the full prod flow locally.
