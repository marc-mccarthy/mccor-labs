## Task 13: README, and full phase verification

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: every prior task.
- Produces: the documentation success criterion 6 requires, and a verified phase-1 exit.

- [ ] **Step 1: Add the website sections to the README**

Append to `README.md`, after the *Your real frontend* section, matching the file's existing voice (fenced bash blocks, prose before or after each):

```markdown
## The website

The marketing site lives in `app/web`. It is a Next.js app that builds to plain
static files, deployed to the same S3 bucket and CloudFront distribution as
everything else here.

Requirements: Node 24 (see `.node-version`), pnpm 12, and the 1Password CLI (`op`), signed in.

### Running it locally

```bash
pnpm install
pnpm approve-builds lefthook
pnpm dev                      # via `op run`; needs the 1Password CLI, signed in
```

`pnpm install` also installs the git hooks. pnpm blocks dependency build scripts
by default, so `pnpm approve-builds lefthook` is required — without it the hooks
never install and every check silently passes. Confirm with:

```bash
test -f .git/hooks/pre-commit && echo "hooks installed"
```

- The 1Password CLI must be installed and signed in for `pnpm dev` and `pnpm build` — both go through `op run`.
- Values live in 1Password, in the `Development` vault under the `mccor-labs` item.
- A locked 1Password means the pre-push hook's `build` step fails with an `op` error, not a code error — check that first before debugging the build.

The site runs at http://localhost:3000.

### Editing content

All copy lives in `app/web/src/content/`. Services, team members, process stages
and navigation are typed, so a missing field is a build error rather than a blank
space on the page. No copy lives in components.

### Checks

`git commit` formats and lints the files in that commit, taking a couple of
seconds. `git push` runs the full gate: type-check, lint, format check, unit
tests, a production build and smoke tests. To run it by hand:

```bash
pnpm verify
```

To bypass the hooks — for a work-in-progress commit on a branch, never on main:

```bash
LEFTHOOK=0 git commit -m "wip"
```

### Building and deploying

```bash
pnpm build
```

That writes `app/web/out/`. To deploy it:

```bash
aws s3 sync app/web/out/ "s3://$(cd infra && terraform output -raw site_bucket)/" --delete
aws cloudfront create-invalidation \
  --distribution-id "$(cd infra && terraform output -raw cloudfront_distribution_id)" \
  --paths '/*'
```

CloudFront invalidation is not instant; allow a few minutes.

**Routes other than `/` do not work in production yet.** The CloudFront
distribution needs a URI-rewrite function and real 404 error responses before
`/services/` resolves to anything other than the home page. See the *CloudFront
handoff* section of
`docs/superpowers/specs/2026-09-27-mccorlabs-website-design.md`. Everything
builds and passes locally regardless, because a local static server resolves
directory indexes and CloudFront does not.
```

- [ ] **Step 2: Run the whole verification gate**

Run: `pnpm verify`
Expected: type-check, lint, format check, unit tests and build all pass in sequence.

- [ ] **Step 3: Confirm the export shape one final time**

```bash
for p in index services/index work/index about/index process/index \
         contact/index careers/index privacy/index terms/index 404; do
  test -f "app/web/out/$p.html" || echo "MISSING $p.html"
done
test -f app/web/out/sitemap.xml || echo "MISSING sitemap.xml"
test -f app/web/out/robots.txt || echo "MISSING robots.txt"
echo "export check done"
```

Expected: only `export check done`. Any `MISSING` line fails the phase.

- [ ] **Step 4: Confirm the hooks block a bad push**

```bash
printf 'export const broken: number = "not a number"\n' > app/web/src/__typeprobe.ts
git add app/web/src/__typeprobe.ts
git commit -m "test: type probe" --no-verify
git push --dry-run 2>&1 | tail -20
```

Expected: the push is refused, with `fail_text` reading "Type errors. Fix before pushing."

- [ ] **Step 5: Remove the probe**

```bash
git reset --hard HEAD~1
test -f app/web/src/__typeprobe.ts && echo "PROBE STILL PRESENT" || echo "clean"
```

Expected: `clean`.

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs(web): local development and deployment"
```

- [ ] **Step 7: Report phase 1 status**

Report to the owner, using exactly this framing — the qualification matters, because route resolution and 404 status genuinely cannot be proven locally:

> Phase 1 complete. The site builds and all checks pass locally: `pnpm verify`
> green, ten routes plus `404.html` exported with distinct content, accessibility
> suite clean, hooks verified to block a bad push. Nothing is deployed. Route
> resolution and 404 status in production remain unverified and depend on the
> CloudFront handoff in phase 4.

Then list for the owner: the `TODO(owner)` markers in `src/content/site.ts`
(none remaining in site.ts), and that phase 2 is
blocked until the reference corpus at `docs/ui-references/` has tier-1
captures.

---

## Notes for phases 2 and 3

**Scope is fixed.** The spec's revision gate permits changing provisional visual
values — type scale, spacing, durations, easings, and which signature effect
lands on which page — from measured corpus data. It is not licence to drop a
feature. All four effect techniques, the intro overlay, the audio system, the ten
routes and the media pipeline remain in scope regardless of what the corpus
shows. An agent that cannot deliver one of them reports that, rather than
quietly narrowing the plan.

**What phase 1 deliberately left as a stub**, so phase 2 knows where to build:

| Stub | Where | Phase 2 replaces it with |
|---|---|---|
| Home hero is a heading and a CTA | `src/app/page.tsx` | Full hero composition; phase 3 adds the shader behind it. |
| Eight routes are a `PageHeader` only | `src/app/*/page.tsx` | Real sections composed from typed content. |
| No mobile menu | `src/components/layout/Header.tsx` | Designed nav treatment; links stay in the footer meanwhile. |
| `services.ts`, `team.ts`, `process.ts` do not exist | `src/content/` | Populated content files; types already defined in `types.ts`. |
| Tagline is final; other copy is not | `src/content/site.ts` | Services, team and process content files, written in phase 2. |
| No media at all | — | `media-planner` then `sourcing-media`, then the sharp pipeline. |
| No motion primitives | `src/components/motion/` | `Reveal`, `Stagger`, `Parallax`, `Magnetic`. |
| No performance budget test | `tests/e2e/` | `budgets.spec.ts` per the spec's measurement method. |
| Typography is Tailwind's default scale, not a designed one | `src/app/**`, `src/components/**` | Measured type scale and self-hosted fonts from the revision gate. Phase 1 sets no font tokens deliberately. |
