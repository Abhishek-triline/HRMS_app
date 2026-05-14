# Build Architecture & Recursion Trap

This document explains how builds are wired in this monorepo and **why
prebuild scripts must never invoke `pnpm` to build other workspace
packages**. Read this before touching any `build` / `prebuild` /
`pretypecheck` script in the repo.

---

## TL;DR

- **Root `package.json`** orchestrates: `pnpm -r run build` walks every
  workspace package in topological order.
- **App-level `prebuild` / `pretypecheck`** scripts compile
  `@nexora/contracts` **directly with `tsc`** — *not* through `pnpm
  --filter` and *especially not* through `pnpm -w`. Direct `tsc`
  invocation cannot recurse because `tsc` does not read
  `package.json#scripts`.
- The dev server hang we hit (May 2026) was caused by
  `pnpm -w -F @nexora/contracts run build` in app prebuild scripts.
  See "The recursion trap" below for the post-mortem.

---

## Current wiring

### Root [package.json](../package.json)

```json
{
  "scripts": {
    "build":     "pnpm -r run build",
    "typecheck": "pnpm -r run typecheck"
  }
}
```

`-r` (recursive) walks packages in topological dependency order. The
contracts package builds first because both apps declare it as a
workspace dependency. **This recursion is the only one we want.**

### [packages/contracts/package.json](../packages/contracts/package.json)

```json
{
  "scripts": {
    "build":     "tsc",
    "typecheck": "tsc --noEmit"
  }
}
```

Pure tsc. No prebuild. No cross-package invocations. The contracts
package has no workspace dependencies, so there is nothing for it to
pre-build.

### [apps/api/package.json](../apps/api/package.json) and [apps/web/package.json](../apps/web/package.json)

```json
{
  "scripts": {
    "prebuild":     "tsc -p ../../packages/contracts",
    "build":        "<app-specific build command>",
    "pretypecheck": "tsc -p ../../packages/contracts",
    "typecheck":    "<app-specific typecheck command>",
    "postinstall":  "prisma generate"   // api only
  }
}
```

The `prebuild` and `pretypecheck` hooks compile the contracts package
**directly with `tsc -p`**, not through `pnpm`. This is intentional and
load-bearing. See the next section for why.

---

## The recursion trap (post-mortem)

### What used to be in the scripts

```json
"prebuild": "pnpm -w -F @nexora/contracts run build"
```

This was added to fix a deploy-server bug: `packages/contracts/dist/`
was gitignored and never rebuilt before the api was built, so the api
build read stale `.d.ts` files from a previous deploy. The prebuild
hook seemed like a clean way to guarantee a fresh contracts build
before the api / web build.

### What actually happened

In pnpm 9+, the flags interact like this:

- `-w` / `--workspace-root` means **"run the command as if invoked
  from the workspace root package."**
- `-F` / `--filter` selects packages — *but only when run from a
  package-level context.*
- When `-w` is present, pnpm pivots to the root package **first**,
  then tries to run `run build` *from the root*. The root's `build`
  script is `pnpm -r run build` — which recursively walks every
  package and runs each one's `build` script.
- Every app `build` triggers its own `prebuild`, which calls
  `pnpm -w -F …` again, which pivots to the root again, which calls
  `pnpm -r run build` again, ad infinitum.

```
apps/api: pnpm build
  → prebuild: pnpm -w -F @nexora/contracts run build
     → pivots to ROOT package
       → runs ROOT's `build` = `pnpm -r run build`
         → runs every app's build (including apps/api again)
           → apps/api: pnpm build (recursion!)
```

Process count grows exponentially. The dev box ran out of file
descriptors and every project on the machine froze. The reporter from
that incident:

> this is causing the server to get hanged all the projects in that
> server stops working can you make sure this issue does not occur again

### Why `tsc -p` is the structural fix

```json
"prebuild": "tsc -p ../../packages/contracts"
```

`tsc` is a TypeScript compiler binary. It reads a `tsconfig.json` and
emits compiled output. It **does not** read `package.json#scripts`,
does not know what pnpm is, and cannot accidentally invoke another
build script. The recursion path simply does not exist.

The relative path `../../packages/contracts` resolves the same way from
both `apps/api` and `apps/web` (each `cd`s into its own package
directory when pnpm runs the script). The `outDir` in
`packages/contracts/tsconfig.json` is relative to that tsconfig, so
emitted `.d.ts` and `.js` files land in
`packages/contracts/dist/` exactly as if the contracts package had
built itself.

---

## Rules going forward

1. **Never use `pnpm -w` in any workspace package's `build` /
   `prebuild` / `pretypecheck` script.** If you think you need it, you
   probably want `pnpm --filter <name>` (with no `-w`) or `tsc -p
   <path>`.
2. **App-level prebuild may only call `tsc -p` against
   `packages/contracts`.** Not pnpm. Not `pnpm --filter`. Not anything
   that reads `package.json#scripts` of another workspace package.
3. **Only the root `build` / `typecheck` may use `pnpm -r`.** That
   recursion is bounded by the workspace topology and cannot loop.
4. **No prebuild on `packages/contracts`.** Contracts has no workspace
   deps; nothing to prebuild. Adding a prebuild that calls back into
   apps would re-create the loop.
5. **Verify any build-script change against all three modes**:
   ```bash
   cd apps/api && pnpm build      # standalone, should finish ≤ 30 s
   cd apps/web && pnpm build      # standalone, should finish ≤ 60 s
   pnpm build                     # root recursive, should finish ≤ 90 s
   ```
   If any of them hangs for more than a minute past the timing
   estimates above, you have re-introduced the recursion trap. Kill
   the process tree (`pkill -f 'pnpm run build'`) and revert.

---

## Why `prebuild` exists at all

Two reasons we keep the prebuild step instead of relying purely on the
root build:

- **Deploy environments often build a single app.** Render / Railway /
  Vercel and most CI configurations let you specify a build command
  per service. The cleanest config is `cd apps/api && pnpm build`. If
  there is no prebuild, contracts ships with whatever stale `dist/`
  the previous deploy left behind — exactly the bug that motivated the
  prebuild in the first place.
- **Local "I just want to build the api" should work.** Without
  prebuild, a developer who has never built contracts locally hits
  cryptic type errors. With prebuild, every `pnpm build` is
  self-bootstrapping.

The root `pnpm build` is still the canonical command for "build
everything for production." The prebuild is a safety net for the
single-app and fresh-clone cases.

---

## Adding a new workspace package

If you add a new package (say `packages/sdk`) that another workspace
package depends on, follow the same pattern:

```json
// apps/api/package.json
{
  "scripts": {
    "prebuild": "tsc -p ../../packages/contracts && tsc -p ../../packages/sdk"
  }
}
```

Chain them with `&&`. Order matters if the new package itself depends
on contracts. Resist any temptation to "simplify" this back to
`pnpm -r` — see the trap above.

Alternatively, set up TypeScript project references and replace the
chain with `tsc --build`. That works and is still recursion-safe
because `tsc --build` uses its own dependency graph, not pnpm scripts.
