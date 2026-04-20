# Medrelief Production Build Strategy

**Status:** Approved 20 April 2026. Binding for the production build starting on Mac Studio (USA).
**Supersedes:** nothing. Companion to `CLAUDE-PRODUCTION.md`, `PRD-SATURDAY-DECISIONS.md`, `EVAL-STRATEGY.md`.

## Context

You're moving from prototype (v0.6.0, shipped and live) to production. New repo, new codebase, same product (AI-first LIMS per PRD v3.2). Solo-dev-plus-Claude setup. You're in India, physical Mac Studio is in USA, you want to use Claude Code heavily and route between Opus/Sonnet/Haiku by task type.

This plan covers **what to do before writing any code**, **how to structure GitHub**, **how to run dev across the India–USA split**, **which Neon region**, and **how to orchestrate Claude models** (referencing Anthropic's blogs on Opus 4.7 best practices and multi-agent coordination).

This is a strategy doc, not a code plan. Execution plans per feature live in `docs/prod-plan/NN-*.req.md` + `.eval.md` per the eval-driven methodology already decided.

---

## 1. Sequencing Decision — Parallel, not sequential

Don't block development on all prerequisites. Split into three lanes that run in parallel:

| Lane | Items | Blocks code? | Start |
|------|-------|:---:|-------|
| **A. Critical upfront** | GitHub repo, Neon dev DB, Anthropic API key, Mac Studio + Claude Code, domain reserved | ✅ Yes | Day 0 — before any code |
| **B. Parallel with dev** | Razorpay live account, WhatsApp BSP + template approval (~2 weeks lead time), MSG91 DLT registration (~1 week), S3 storage, Sentry, legal docs | ❌ No — test/dev keys cover it | Day 0, runs in background |
| **C. Pre-launch only** | Razorpay PG rotation to live, WhatsApp templates approved, Domain DNS pointed, SSL certs, load testing | ❌ No | Week before go-live |

**Rationale:** WhatsApp template approval takes 1–3 weeks through Meta. MSG91 DLT registration takes days. If you start these on Day 0 as background tasks, they're ready by the time your code needs them (Week 3–4). No idle waiting.

---

## 2. Day 0 Prerequisites (before first commit)

### 2.1 Accounts + keys
- **GitHub:** create new repo `Noshtek-lab/medlabok` (private) in the existing `noshtek-lab` org. Do NOT fork prototype. Fresh repo.
- **Neon:** create project in **`ap-south-1` (Mumbai)** — see section 5 for rationale. Two branches: `dev`, `staging`. Prod DB created later.
- **Anthropic Console:** create API key. Separate keys per env (`dev`, `staging`, `prod`) — makes cost attribution clean.
- **Domain:** register `medrelief.app` or similar (even if you don't point DNS yet).
- **Sentry:** project + DSN. Free tier is fine for dev.

### 2.2 Remote dev machine (already set up by Khalid)
- ✅ Mac Studio in USA is online, Tailscale configured, Claude Code chat active from the Mac.
- No further setup required on this front.
- If ever rebuilding: install Xcode CLI tools, Homebrew, Node.js 22 LTS, pnpm, Docker Desktop, Git, Postgres CLI, tmux, mosh; install Claude Code; key-based SSH via Tailscale; tmux for session persistence.

### 2.3 Auth to clone the private prototype from Mac Studio
The prototype repo (`khalidnoshtek/medrelief`) is private. To clone it on the Mac Studio, pick one:

**Option A — GitHub CLI (recommended, simplest):**
```bash
# On Mac Studio
brew install gh
gh auth login   # pick GitHub.com > HTTPS > authenticate in browser
gh repo clone khalidnoshtek/medrelief reference
```

**Option B — Personal Access Token (HTTPS):**
```bash
# Create a fine-grained PAT at github.com/settings/tokens (read-only, private repo scope)
# Then:
git clone https://<PAT>@github.com/khalidnoshtek/medrelief.git reference
```

**Option C — SSH key:**
```bash
ssh-keygen -t ed25519 -C "mac-studio-dev"
cat ~/.ssh/id_ed25519.pub   # paste into github.com/settings/keys
git clone git@github.com:khalidnoshtek/medrelief.git reference
```

Use the same auth method for the new `Noshtek-lab/medlabok` repo. gh CLI scales cleanly to both.

---

## 3. GitHub Strategy

### 3.1 Repo structure
**Monorepo** using pnpm workspaces. Same pattern as prototype worked well, scale it up:

```
medlabok/
├── packages/
│   ├── backend/               Express + TS + Prisma (one deployable)
│   ├── frontend-staff/        Staff kiosk PWA
│   ├── frontend-patient/      Patient portal (Phase 1)
│   ├── frontend-b2b/          Doctor + corporate portal (Phase 1)
│   ├── shared/                Shared types, zod schemas, utils
│   └── ai-providers/          LLM/Vision/STT abstraction layer
├── docs/                      Requirements, evals, ADRs
│   ├── prod-plan/             Paired req+eval files (copy from prototype docs)
│   ├── adr/                   Architecture Decision Records
│   └── runbooks/              Ops runbooks for prod
├── .github/
│   ├── workflows/             CI per package + eval runner + deploy
│   └── CODEOWNERS             You own everything for now
├── CLAUDE.md                  From docs/CLAUDE-PRODUCTION.md in prototype
└── README.md
```

**Why monorepo:** shared types + single PR for a feature that touches backend + frontend. Splitting later is easy; merging later is hard.

### 3.2 Branch strategy

```
main          → deploys to production (protected)
  ↑
staging       → deploys to staging (protected, auto-merge from main-compatible)
  ↑
feat/NN-*     → feature branches, matches prod-plan numbering
fix/<slug>    → bug fixes
chore/<slug>  → non-feature work (deps, config, docs)
```

- **main** protection: no direct push, PRs only, 1 required review (yourself via Claude checker role — see section 7), CI must pass (lint + types + unit tests + eval runner).
- **Squash merges** on PR close. Keep linear history.
- **Feature branch naming:** `feat/01-scan-registration` matches `docs/prod-plan/01-scan-registration.req.md`. One PR = one feature.
- **Worktree strategy:** for parallel work, use `git worktree add ../medrelief-feat-02 feat/02-bill-creation` so you can have Claude work on feature 02 in one terminal while you review feature 01 in another. No branch-switching friction.

### 3.3 CI/CD (GitHub Actions)

Minimum workflows on Day 0:

1. **`ci.yml`** — runs on every PR:
   - Install (pnpm)
   - Lint (ESLint)
   - Type-check (tsc --noEmit across packages)
   - Unit tests (Vitest)
   - Eval runner (per section 7.4)
   - Build (all packages)

2. **`deploy-staging.yml`** — on merge to main:
   - Build
   - Run Prisma migrations against staging DB
   - Deploy backend to Render staging
   - Deploy frontends to Cloudflare Pages staging

3. **`deploy-prod.yml`** — manual trigger:
   - Same as staging but against prod resources
   - Requires GitHub Environment approval (click to confirm)

### 3.4 Secrets management
- GitHub Secrets for CI: `NEON_DEV_URL`, `ANTHROPIC_API_KEY_DEV`, `RAZORPAY_TEST_KEY`, etc.
- **Never** commit `.env` files. Use `.env.example` as a template.
- For local dev: `.env` on Mac Studio, gitignored. Pulled from a password manager (1Password / Bitwarden) by a script.

---

## 4. Deploy targets (locked)

- **Backend:** Render. Singapore region for closest to Indian users (lower latency than Oregon). Paid tier ($7/mo) to avoid cold starts — worth it for production.
- **Frontends:** Cloudflare Pages. Three separate projects: `medrelief-staff`, `medrelief-patient`, `medrelief-b2b`. All auto-deploy from their respective paths in the monorepo via GitHub Actions.
- **DNS:** Cloudflare DNS (free, fastest resolvers). Domain NS pointed to Cloudflare.
- **Object storage:** **Backblaze B2** (10× cheaper than S3 for report PDFs, S3-compatible API). Or **Cloudflare R2** if you want to keep everything on Cloudflare — R2 has zero egress fees.
- **Monitoring:** Sentry (errors) + Axiom or BetterStack (logs). Free tiers cover Phase 1.
- **Uptime:** UptimeRobot or BetterStack, 5-min pings on `/health`.

---

## 5. Neon Region — `ap-south-1` (Mumbai)

**Chosen because:**
1. **DPDP Act 2023 compliance** — patient data should be stored in India. Cross-border transfer requires explicit consent + paperwork.
2. **Production users** (Indian lab staff, Indian patients) hit Mumbai with ~20-50ms latency.
3. **You're in India** — dev queries from your laptop are fast.

**Accepting:**
- Mac Studio (USA) → Neon Mumbai: 250-300ms per query. Dev workflows feel slower. This is fine; production users never see this.
- Mitigation: use `pgbouncer` connection pool + batch migrations, don't chain interactive queries.

**Alternative considered:** `us-east-1` (Virginia). Faster for Mac Studio dev. Rejected because production traffic from India would be slow AND you'd need DPDP paperwork for cross-border data. Not worth the dev-time savings.

**Three Neon branches to set up Day 0:**
- `main` — prod (don't touch yet)
- `staging` — staging deploy target
- `dev` — your dev branch, can be reset freely

---

## 6. Claude Model Routing (per Anthropic Opus 4.7 + Multi-Agent blogs)

### 6.1 Model-to-task mapping

| Task type | Model | Reasoning |
|-----------|-------|-----------|
| Architecture design, requirements review, debugging complex multi-file issues | **Opus 4.7 (xhigh)** | Blog: "best for coding, enterprise workflows, long-running agentic tasks, and complex multi-file changes" |
| Feature implementation from a frozen requirement, writing evals, routine CRUD | **Sonnet 4** | Balanced capability, cheap enough to run often, good enough for defined work |
| Research (package lookups, docs, API exploration), simple sanity checks, format/lint fixes, CI runs | **Haiku 4.5** | Fast, cheap, enough for bounded lookups |
| Code review / checker role in maker-checker | **Opus 4.7 (xhigh)** | Needs deep reasoning to catch gaps; blog: "verifier told only to check...will rubber-stamp" — so checker must be stronger than maker |

### 6.2 Effort level discipline
Per Opus blog:
- **`xhigh` (default for most coding tasks)** — use this as the baseline. Don't override.
- **`max` — only for truly hard problems.** Blog says "diminishing returns." Reserve for genuinely stuck debugging or hairy architecture decisions.
- **`high` — for concurrent sessions** (maker and checker running in parallel).
- **`medium/low` — for tightly scoped, cost-sensitive work** (Haiku-like tasks on Sonnet).

### 6.3 Prompt discipline
Per Opus blog:
- **Front-load everything in turn 1:** intent, constraints, acceptance criteria, file paths.
- **Batch questions.** Don't dribble turns.
- **Be explicit about output shape:** length, voice, tool use.
- **Auto mode (Shift+Tab)** when full context is upfront.

---

## 7. Multi-Agent Coordination (Anthropic's patterns applied)

### 7.1 Default pattern: Orchestrator-Subagent
Per the multi-agent blog: **"Start with orchestrator-subagent as the default."**

**Your setup:**
- **Orchestrator** = you + your main Claude Code session (Opus 4.7). Holds the plan, decides what's next, delegates to subagents.
- **Subagents** = spawned via Claude's Agent tool for bounded tasks. Use Haiku for lookups, Sonnet for bounded coding, Opus for reviews.

### 7.2 Pattern-to-situation matrix (from the blog)

| Situation in your build | Pattern | Why |
|-------------------------|---------|-----|
| Writing a feature from frozen req | Orchestrator-Subagent | Clear task decomposition |
| Code review (maker-checker) | **Generator-Verifier** | Quality-critical, explicit criteria from evals |
| Parallel feature work (you have worktrees, Claude works on 2 features at once) | Agent Teams | Independent parallel subtasks |
| Cross-cutting refactor (e.g., rename `branch_id` → `center_id` everywhere) | Agent Teams | Each agent handles one module |
| Requirements synthesis from multiple sources (PRD + feedback + prototype) | Shared State | Collaborative research, build on each other |

### 7.3 Maker-Checker (Generator-Verifier) — concrete workflow

Per the blog: **a verifier needs explicit evaluation criteria, or it rubber-stamps.**

Your setup uses your `.eval.md` files as the criteria. Workflow:

```
1. Sonnet (maker) reads req + eval → writes code
2. Maker runs the eval suite locally; iterates until pass
3. Open PR
4. Opus (checker) reads: req + eval + diff + changed files
   Prompt to checker (explicit):
     - "Does every eval case in `<eval.md>` have coverage in the diff?"
     - "For each eval, does the code actually implement it, or just pass shallowly?"
     - "List gaps, missing edge cases, non-obvious regressions"
5. Checker writes review as GitHub PR comments
6. Maker addresses comments
7. Human (you) final read + merge
```

**Key rule from the blog:** don't give checker only "is this good?" — give it the exact evals + diff + specific questions. Otherwise you get rubber-stamping.

### 7.4 Eval runner in CI
Per Mithlesh's methodology (eval-driven dev) + multi-agent verifier pattern:

- `scripts/eval-run.sh` — for each `docs/prod-plan/*.eval.md`, runs the test suite derived from that eval (unit + integration + E2E).
- `scripts/eval-trace.py` — verifies every req line has an eval + every eval references a real req line.
- Both run on every PR. No merge without green evals.

---

## 8. Remote Server Bootstrap — Reference + Production Isolation

The prototype repo (`khalidnoshtek/medrelief`) is **live in production**. Real users can hit it. Under no circumstances should the remote dev setup accidentally push to it, edit it, or redeploy it. This section defines hard isolation.

### 8.1 Folder layout on Mac Studio

```
~/code/medrelief/
├── reference/              CLONE of live prototype — READ-ONLY, NEVER EDITED
│   └── [khalidnoshtek/medrelief files, stripped of git remote]
│
├── docs-seed/              Extracted planning docs used to seed new repo
│   ├── CLAUDE-PRODUCTION.md
│   ├── PRD-SATURDAY-DECISIONS.md
│   ├── PRODUCTION-BUILD-STRATEGY.md
│   ├── EVAL-STRATEGY.md
│   ├── Medrelief_ERP_PRD_v3.2-Phase-1.docx
│   ├── Medrelief-Prototype-Flow.docx
│   ├── TimeFlow-Auth-Flow.docx
│   └── prod-plan/
│
└── medlabok/         NEW production repo — where all development happens
    └── [Noshtek-lab/medlabok, fresh greenfield]
```

### 8.2 Hard isolation rules (non-negotiable)

These prevent any accidental touch of the live prototype:

1. **Remove git remote from the reference clone.** Even if Claude or a shell typo tries to push, there's nowhere to push to.
2. **Revoke write permissions at the filesystem level.** The OS refuses writes before they happen.
3. **Put an explicit banner in `reference/README.md`.** If anyone opens the folder, the first thing they see is "read-only, do not edit."
4. **Never `git pull` inside reference/.** If the prototype ever needs a refresh, nuke the folder and re-clone. No git operations in reference/ besides the initial clone.
5. **Never mount reference/ as a working directory in Claude Code or any editor.** Open it only with read-only tools (`less`, `cat`, `grep`, `bat`). Tell Claude explicitly to treat it read-only.

### 8.3 Setup commands (Day 1)

Run these on the Mac Studio via SSH + tmux. Each step is idempotent and safe.

```bash
# Land in the parent folder
mkdir -p ~/code/medrelief && cd ~/code/medrelief

# -----------------------------------------------------------------
# Step 1 — Clone prototype as READ-ONLY REFERENCE (never edited)
# -----------------------------------------------------------------
git clone https://github.com/khalidnoshtek/medrelief.git reference
cd reference

# Remove the remote — safety net against accidental push
git remote remove origin

# Optional: switch to a detached HEAD so commits are impossible
git checkout --detach

# Drop a banner so anyone (including Claude) sees it's read-only
cat > READ-ONLY.md <<'EOF'
# READ-ONLY REFERENCE

This folder is a clone of the LIVE prototype (khalidnoshtek/medrelief).
It is kept as a reference for patterns and flows ONLY.

RULES:
- Do NOT edit any file in this folder.
- Do NOT run `git push` from here.
- Do NOT run `git pull` from here.
- Do NOT use this folder as a working directory in Claude Code.
- If you need to refresh the reference: `rm -rf reference && git clone ...`.
EOF

cd ..

# -----------------------------------------------------------------
# Step 2 — Revoke filesystem write perms (belt + suspenders)
# -----------------------------------------------------------------
chmod -R u-w reference
# Verify: `touch reference/test` should fail with "Permission denied"

# To temporarily re-enable (for a deliberate refresh):
#   chmod -R u+w reference && rm -rf reference && git clone ...

# -----------------------------------------------------------------
# Step 3 — Build docs-seed/ from reference/ (copies, not symlinks)
# -----------------------------------------------------------------
mkdir -p docs-seed/prod-plan

# Planning + process MDs
cp reference/docs/CLAUDE-PRODUCTION.md docs-seed/
cp reference/docs/PRD-SATURDAY-DECISIONS.md docs-seed/
cp reference/docs/PRODUCTION-BUILD-STRATEGY.md docs-seed/
cp reference/docs/EVAL-STRATEGY.md docs-seed/
cp reference/docs/GUIDELINES.md docs-seed/
cp reference/docs/ARCHITECTURE.md docs-seed/
cp reference/docs/LIMS-FLOWS.md docs-seed/
cp reference/docs/PROTOTYPE-FEEDBACK-ADDITIONS.md docs-seed/

# Status + backlog (will reset, but keep as starting point)
cp reference/docs/PROJECT-STATUS.md docs-seed/
cp reference/docs/BACKLOG.md docs-seed/
cp reference/docs/CHANGELOG.md docs-seed/

# Style + writing guides — MUST travel with the repo so Claude follows them
cp "reference/docs/ANTI AI WRITING STYLE.md" docs-seed/
cp "reference/docs/CLAUDE PROMPTING COOKBOOK.md" docs-seed/
cp "reference/docs/COPYWRITING.md" docs-seed/
cp "reference/docs/MARKETING GENIUS.md" docs-seed/

# PRD + supporting docx artifacts
cp reference/docs/Medrelief_ERP_PRD_v3.2-Phase-1.docx docs-seed/
cp reference/docs/Medrelief-Prototype-Flow.docx docs-seed/
cp reference/docs/TimeFlow-Auth-Flow.docx docs-seed/
cp reference/docs/Medrelief-Phase1-Requirements.docx docs-seed/
cp reference/docs/Medrelief-Prototype-2.0-Stakeholder-Brief.docx docs-seed/
cp reference/docs/Medrelief-Stakeholder-Testing-Guide.docx docs-seed/
cp reference/docs/Medrelief-Flow-Document.pdf docs-seed/ 2>/dev/null || true

# Prod-plan folder (req+eval templates, README)
cp -r reference/docs/prod-plan/* docs-seed/prod-plan/

# Screenshot folders (reference images for the UX target)
mkdir -p docs-seed/flow-screenshots docs-seed/timeflow-screenshots
cp reference/docs/flow-screenshots/*.png docs-seed/flow-screenshots/ 2>/dev/null || true
cp reference/docs/timeflow-screenshots/*.png docs-seed/timeflow-screenshots/ 2>/dev/null || true

# docs-seed is editable — it's YOUR working copy. reference/ stayed untouched.

# -----------------------------------------------------------------
# Step 4 — Create the new production repo and seed it
# -----------------------------------------------------------------
gh repo create Noshtek-lab/medlabok --private --confirm
git clone https://github.com/Noshtek-lab/medlabok.git
cd medrelief-prod

mkdir -p docs
cp ../docs-seed/CLAUDE-PRODUCTION.md CLAUDE.md   # seeds repo-level CLAUDE.md
cp ../docs-seed/PRD-SATURDAY-DECISIONS.md docs/
cp ../docs-seed/PRODUCTION-BUILD-STRATEGY.md docs/
cp ../docs-seed/EVAL-STRATEGY.md docs/
cp ../docs-seed/*.docx docs/
cp -r ../docs-seed/prod-plan docs/

# Continue with pnpm init, packages/ folders, .gitignore, etc.
# per the Day 1 checklist in Section 9 below.
```

### 8.4 CLAUDE.md in the new repo — reference pointer

The new repo's `CLAUDE.md` needs a preamble that tells Claude about the reference folder and its read-only discipline. Add this at the top:

```markdown
# Reference repo (READ-ONLY)

The working prototype is at `../reference/`. Treat it as a reference library.

Allowed:
- Read files to understand prototype patterns.
- Grep for how a problem was solved.
- Quote small snippets (with attribution) in commit messages or ADRs.

Forbidden:
- Editing any file in `../reference/`.
- Copy-pasting code from `../reference/` into this repo. Always write fresh.
- Running `git` commands in `../reference/` (the remote is removed anyway).
- Referring to `../reference/` as "the codebase" — THIS repo is the codebase.

Useful lookups in the reference:
- `../reference/packages/frontend-v2/src/pages/` — prototype UX patterns per screen.
- `../reference/packages/backend/src/modules/` — prototype service/controller patterns.
- `../reference/prisma/schema.prisma` — prototype DB schema (production schema will differ per DECISION-06).
- `../reference/docs/LIMS-FLOWS.md` — canonical clinical flow definitions.

[... rest of CLAUDE-PRODUCTION.md content ...]
```

### 8.5 Why this doesn't hinder live production

- **No network path from reference to prototype remote.** Remote was removed in Step 1.
- **No filesystem write on reference.** `chmod -R u-w` makes it impossible.
- **No deploy pipeline in reference.** The Render deploy (live backend) is triggered by pushes to `khalidnoshtek/medrelief` on GitHub — not by anything local. Your local reference folder has no connection to that.
- **No shared DB.** The prototype uses its own Neon project. Production will get a separate Neon project in Mumbai. Credentials don't overlap.
- **No shared secrets.** Production uses new Anthropic / Razorpay keys.

The only way live production can break from the remote dev setup is if someone force-pushes to `khalidnoshtek/medrelief` main from somewhere. That someone would not be the Mac Studio, because its `reference/` clone has no remote to push to.

### 8.6 Pulling reference updates later (rare)

If the prototype gets a hot-fix and you want to see it in reference:

```bash
cd ~/code/medrelief
chmod -R u+w reference
rm -rf reference
git clone https://github.com/khalidnoshtek/medrelief.git reference
cd reference
git remote remove origin
git checkout --detach
cd ..
chmod -R u-w reference
```

Don't `git pull` — just nuke and re-clone. Keeps the "no git ops" rule clean.

---

## 9. Day 1 Execution Checklist

Exactly what to do first when you sit down to start:

1. [ ] SSH into Mac Studio via Tailscale, start `tmux`, launch `claude` CLI.
2. [ ] **Set up reference + docs-seed + new repo per Section 8.3.**
3. [ ] Create `Noshtek-lab/medlabok` GitHub repo (private) — done in Section 8.3 Step 4.
4. [ ] `pnpm init -w` monorepo inside `medlabok/`. Create the `packages/` folders.
5. [ ] Update seeded `CLAUDE.md` with the reference-repo preamble from Section 8.4.
6. [ ] Provision Neon project + `dev`/`staging` branches in `ap-south-1`. Set `DATABASE_URL_DEV` in GitHub Secrets.
7. [ ] Set up Anthropic API key (separate dev key). Add to secrets.
8. [ ] Create Razorpay account, grab test keys. Add to secrets.
9. [ ] **Start WhatsApp BSP signup + template drafting** — long lead time, begin Day 1, comes online Week 3.
10. [ ] **Start MSG91 DLT registration** — 1-week lead time.
11. [ ] Commit the initial monorepo skeleton to `main`. Set up branch protection.
12. [ ] Write first ADR in `docs/adr/0001-stack-choices.md` capturing the decisions in this plan.
13. [ ] Draft first feature req+eval pair: `docs/prod-plan/01-scan-registration.req.md` + `.eval.md`. Start with Sonnet, review with Opus.
14. [ ] When pair is FROZEN, cut `feat/01-scan-registration` branch. Begin code.

---

## 10. Critical files to reference (from prototype docs)

- `docs/CLAUDE-PRODUCTION.md` — Claude instructions template for new repo.
- `docs/PRD-SATURDAY-DECISIONS.md` — decisions 06–13.
- `docs/EVAL-STRATEGY.md` — multi-model maker-checker workflow.
- `docs/prod-plan/README.md` — build order, 26 features + 7 infrastructure items.
- `docs/prod-plan/00-template.req.md` + `00-template.eval.md` — copy for each new feature.
- `docs/Medrelief_ERP_PRD_v3.2-Phase-1.docx` — canonical PRD (23 sections, 17 decisions).

---

## 11. Verification (how you know the strategy is working)

- [ ] Day 1: empty monorepo pushed to `main`, CI passing on an empty build, branch protection enforced.
- [ ] Week 1: first feature pair (`01-scan-registration`) FROZEN, feature branch open, Claude building against frozen evals.
- [ ] Week 2: WhatsApp BSP signup + MSG91 DLT submissions in flight (shouldn't be blocking).
- [ ] Week 3: first feature merged via maker-checker review cycle (Sonnet made, Opus checked, you merged).
- [ ] Week 4: 3–4 features merged, eval CI green on every PR.

If any of these slip, the bottleneck is usually (a) too many open feature branches at once, (b) WhatsApp template approval dragging, (c) you doing manual work Claude could do.

---

## 12. Locked decisions (answered)

- **Remote connection:** Tailscale from India laptop → Mac Studio. Location-agnostic. `tmux` + `mosh` optional enhancement.
- **Backend deploy:** Render (same as prototype). Known stack, no new learning curve.
- **Frontend deploy:** Cloudflare Pages. Global CDN, free for multiple projects (staff + patient + B2B portals each get their own Pages project).
- **GitHub org:** `noshtek-lab` (existing org, already Claude-integrated). New repo: `Noshtek-lab/medlabok`.
- **Repo layout:** Monorepo with pnpm workspaces (default recommendation, no objection raised).

---

## 13. Out of scope for this strategy doc

- Detailed per-feature code plans — those live in `docs/prod-plan/NN-*.req.md`.
- Business copy / patient-facing messaging.
- Post-launch operations runbook — separate doc.
- Hiring / team scaling — solo dev for Phase 1.
- 3-day sprint compression (raised and parked in previous turn) — this plan assumes realistic 8–10 week Phase 1 per PRD v3.2 Section 23.6.
