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
- **GitHub:** create new repo `noshtek-lab/medrelief-prod` (private) in the existing `noshtek-lab` org. Do NOT fork prototype. Fresh repo.
- **Neon:** create project in **`ap-south-1` (Mumbai)** — see section 5 for rationale. Two branches: `dev`, `staging`. Prod DB created later.
- **Anthropic Console:** create API key. Separate keys per env (`dev`, `staging`, `prod`) — makes cost attribution clean.
- **Domain:** register `medrelief.app` or similar (even if you don't point DNS yet).
- **Sentry:** project + DSN. Free tier is fine for dev.

### 2.2 Remote dev machine
- Mac Studio in USA (your physical machine).
- Install on the Mac: Xcode CLI tools, Homebrew, Node.js 22 LTS, pnpm, Docker Desktop, Git, Postgres CLI, tmux, mosh.
- Install **Claude Code on the Mac Studio** — this is the key move. Don't run Claude Code from your India Windows laptop and SSH into the Mac to execute bash. Run Claude natively where the code is.
- SSH setup: key-based auth from your India laptop. Use **Tailscale** (free, works great India↔USA) or **Mosh** (better than SSH over high-latency links) for stable connection.
- Session persistence: always work inside `tmux` on the Mac. SSH drops don't kill your Claude session.
- Port forward for local testing: `ssh -L 4782:localhost:4782 mac-studio` lets you hit `localhost:4782` from your India laptop's browser to test the dev server running in USA.

### 2.3 Running Claude Code across the split
- **Primary pattern:** SSH to Mac via Tailscale + `tmux` + `claude` CLI. Everything runs on the Mac. Your laptop is a thin terminal.
- **Mobile pattern:** from Mac's `claude` session, use `/remote-control` to get a URL. Open in your phone browser to continue on mobile while away from laptop.
- **Do NOT:** run Claude Code on your Windows laptop pointing at files on the Mac. Latency kills every tool call.

---

## 3. GitHub Strategy

### 3.1 Repo structure
**Monorepo** using pnpm workspaces. Same pattern as prototype worked well, scale it up:

```
medrelief-prod/
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

## 8. Day 1 Execution Checklist

Exactly what to do first when you sit down to start:

1. [ ] SSH into Mac Studio via Tailscale, start `tmux`, launch `claude` CLI.
2. [ ] Create `noshtek-lab/medrelief-prod` GitHub repo (private). Push empty README + `.gitignore`.
3. [ ] `pnpm init -w` monorepo. Create the `packages/` folders.
4. [ ] Copy from prototype repo: `docs/CLAUDE-PRODUCTION.md` → new repo `CLAUDE.md`. Adjust paths to point inside the new repo.
5. [ ] Copy `docs/prod-plan/` (with templates + README), `docs/EVAL-STRATEGY.md`, `docs/PRD-SATURDAY-DECISIONS.md`, `docs/Medrelief_ERP_PRD_v3.2-Phase-1.docx` into new repo.
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

## 9. Critical files to reference (from prototype docs)

- `docs/CLAUDE-PRODUCTION.md` — Claude instructions template for new repo.
- `docs/PRD-SATURDAY-DECISIONS.md` — decisions 06–13.
- `docs/EVAL-STRATEGY.md` — multi-model maker-checker workflow.
- `docs/prod-plan/README.md` — build order, 26 features + 7 infrastructure items.
- `docs/prod-plan/00-template.req.md` + `00-template.eval.md` — copy for each new feature.
- `docs/Medrelief_ERP_PRD_v3.2-Phase-1.docx` — canonical PRD (23 sections, 17 decisions).

---

## 10. Verification (how you know the strategy is working)

- [ ] Day 1: empty monorepo pushed to `main`, CI passing on an empty build, branch protection enforced.
- [ ] Week 1: first feature pair (`01-scan-registration`) FROZEN, feature branch open, Claude building against frozen evals.
- [ ] Week 2: WhatsApp BSP signup + MSG91 DLT submissions in flight (shouldn't be blocking).
- [ ] Week 3: first feature merged via maker-checker review cycle (Sonnet made, Opus checked, you merged).
- [ ] Week 4: 3–4 features merged, eval CI green on every PR.

If any of these slip, the bottleneck is usually (a) too many open feature branches at once, (b) WhatsApp template approval dragging, (c) you doing manual work Claude could do.

---

## 11. Locked decisions (answered)

- **Remote connection:** Tailscale from India laptop → Mac Studio. Location-agnostic. `tmux` + `mosh` optional enhancement.
- **Backend deploy:** Render (same as prototype). Known stack, no new learning curve.
- **Frontend deploy:** Cloudflare Pages. Global CDN, free for multiple projects (staff + patient + B2B portals each get their own Pages project).
- **GitHub org:** `noshtek-lab` (existing org, already Claude-integrated). New repo: `noshtek-lab/medrelief-prod`.
- **Repo layout:** Monorepo with pnpm workspaces (default recommendation, no objection raised).

---

## 12. Out of scope for this strategy doc

- Detailed per-feature code plans — those live in `docs/prod-plan/NN-*.req.md`.
- Business copy / patient-facing messaging.
- Post-launch operations runbook — separate doc.
- Hiring / team scaling — solo dev for Phase 1.
- 3-day sprint compression (raised and parked in previous turn) — this plan assumes realistic 8–10 week Phase 1 per PRD v3.2 Section 23.6.
