# Task 1 review package

Ruling 1 applies: nothing is committed, so this bundle is file contents + git status, not a commit-range diff.

## git status --short (whole repo)
```
 M .gitignore
M  infra/deploy.sh
A  infra/setup/backend.tf
M  infra/setup/main.tf
?? CSS-First-Plus-Lazy-Motion-vs-Motion-Framer-Motion.md
?? app/
?? docs/superpowers/plans/2026-09-27-ui-reference-corpus.md
?? docs/superpowers/specs/2026-09-27-ui-reference-corpus-design.md
?? infra/docs/
?? package.json
```

NOTE FOR REVIEWER: the staged infra/ entries and the two stray untracked paths
(CSS-First-Plus-Lazy-Motion-vs-Motion-Framer-Motion.md, infra/docs/) are a THIRD PARTY's
concurrent work in this same tree. They are NOT part of Task 1 and must not be reviewed
or flagged as defects. Task 1 owns exactly two paths: package.json and .gitignore.

## package.json (new file, full contents)
```json
{
  "name": "mccor-labs",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "description": "Infrastructure and tooling for mccor-labs. Node surface exists only to run scripts/.",
  "engines": {
    "node": ">=24",
    "pnpm": ">=10"
  },
  "packageManager": "pnpm@12.6.0",
  "scripts": {
    "recon": "node scripts/recon-reference-sites.mjs",
    "capture": "node scripts/capture-reference-site.mjs"
  },
  "//": "@playwright/test is pinned EXACTLY, not caret-ranged: 1.61.0 is the last version whose bundled browser revision matches the chromium-1228 already in ~/Library/Caches/ms-playwright. A caret range floats to a version that wants a newer revision and triggers a ~500MB download onto a volume at 89% capacity. Re-pin only alongside a deliberate `playwright install`.",
  "devDependencies": {
    "@playwright/test": "1.61.0"
  }
}
```

## .gitignore diff vs HEAD
```diff
diff --git a/.gitignore b/.gitignore
index d85fc77..d231c6d 100644
--- a/.gitignore
+++ b/.gitignore
@@ -10,3 +10,8 @@ settings.auto.tfvars
 
 # Lambda zip built by Terraform
 .build/
+
+# Node tooling for scripts/
+node_modules/
+pnpm-lock.yaml
+package-lock.json
```

## Verification evidence gathered by the controller (not the implementer)
```
$ node -e "...chromium.launch() + recordVideo probe..."   # dangerouslyDisableSandbox: true
LAUNCH OK: 149.0.7827.55
VIDEO FILES: page@c6f5af84093c7833994bf4835059777a.webm (6013 bytes)
$ pnpm ls @playwright/test --depth 0
└── @playwright/test@1.61.0
```
