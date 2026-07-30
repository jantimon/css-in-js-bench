# wpd 1.3.0 — consumer feedback

Written as a first-time user who installed the npm package, read the README, ran
`--help`, and measured a real workload. Concrete: command, what I saw, what I expected.

## Learnability cold

- **Install → first successful recording: ~10 minutes, first try, zero failed happy-path
  attempts.** `pnpm add -D @jantimon/web-performance-debugger@1.3.0`, then a node-lane
  `record` on a bundled SSR entry worked on the first invocation and printed a
  per-package CPU rollup I could act on immediately.
- **The README is the best part of the tool.** The lane/capture model ("choose where
  your code runs, then what you want to know"), the `Σ slices + idle = wall` framing,
  the trust-tier table, and the honest "`self ms` is not pure JS in a browser" caveat
  meant I never had to guess what a number meant. The "what wpd leaves to the caller"
  boundary set expectations correctly: it finds and attributes, it does not rank.
- **Per-package attribution just worked** through the bundle's sourcemap: react-dom,
  styled-components, stylis, @emotion/hash each landed in its own bucket from a single
  bundled+minified entry, with no configuration.

## What was confusing, wrong, or missing

### 1. AGENTS.md is not in the npm package (the one doc an agent is told to read)

The README links "Driving wpd from an agent" to `AGENTS.md` in the source repo, and the
package's own `files` list is `["dist","README.md","LICENSE"]` — so an agent that
installs from npm and is told to read AGENTS.md finds nothing locally, and reaching it
means leaving the package for the source repo. What saved me is that the README already
carries strong inline agent guidance ("consume `--format json|toon`, read `query spans`
then drill, never parse the multi-MB recording") — that was enough. But the dedicated
agent document did not reach me. **Ship AGENTS.md (and the `docs/` it references) in the
tarball, or state in the README that the agent guide lives only in the repo.**

### 2. `pnpm exec wpd` is blocked by the ignored puppeteer build

```
$ pnpm exec wpd --version
[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: puppeteer@25.4.0
pnpm: Command failed with exit code 1: pnpm install
```

In a pnpm-11 workspace, `pnpm exec` runs an install preflight that exits 1 because
puppeteer's browser-download build is not approved — so the documented `wpd ...`
invocation fails before wpd runs, even for `--version` and even for the node lane that
needs no browser. I fell back to calling the bin directly
(`node node_modules/.../dist/cli.js`). The README covers approving the puppeteer build
to get Chrome, but not that `pnpm exec` itself is gated. **Add a one-line pnpm note with
the direct-bin fallback.** (Partly pnpm's behavior, but it is the first wall a pnpm user
hits.)

### 3. `--out` basename is ignored when `--group` is set

```
$ wpd record probe.mjs --members breakdown,deep --group perf --out .wpd-runs/group/stylex.json
# wrote: .wpd-runs/group/perf.group.json  and  perf.deep.json
$ wpd query span .wpd-runs/group/stylex.group.json run
ENOENT: no such file or directory ... stylex.group.json
```

I passed `--out .../stylex.json` and expected the manifest at `stylex.group.json`.
Instead the group name drives every filename (`perf.group.json`, `perf.deep.json`), so
`--out`'s basename is partly discarded. `latest` resolved it fine, but an explicit path
guessed from `--out` was wrong. **Either honor `--out`'s basename for the manifest, or
document that `--group <name>` names all group files.**

### 4. `(unmapped: runtime)` has no "why", so a 35%-unmapped lane is not actionable

On the next-yak 9.6 node lane, up to 35% of self-time landed in `(unmapped: runtime)` /
`(unmapped: internals)`:

```
next-yak  592 ms  react-dom 241 · (unmapped: runtime) 206 · next-yak 114 · ...
```

This is honest — wpd refused to blame it on `app`, which is exactly right — and the
bucket names are more useful than a bare origin. But as a consumer I could not tell
*why* those frames were unmapped (a bundle chunk with no sourcemap? eval'd runtime code?)
or which package they belong to. The README's sourcemap-failure table is excellent for
remote `--url` scripts; for a **locally bundled node module** no equivalent reason
surfaced in the default report. **Surface a one-line reason for a local unmapped bucket,
the way the remote table does.**

### 5. A giant `(native)` share reads like an anomaly without context

My first (naive) probe called `renderCase` (render + CSS extraction) for every lane.
tailwind-merge and cnfast then showed ~170,000 ms of `(native)` "engine work, unsplit"
across 250 iterations — the Tailwind JIT/regex CSS compiler running per iteration —
dwarfing every JS number. wpd was correct: it is real non-JS engine time and it belongs
in `(native)`. But a first-time reader can mistake a 99%-`(native)` bar for a wpd glitch
rather than "you are timing a compiler." This was my harness's fault (I should have used
`renderHtml`), and the label "engine work, unsplit" is honest. Still, **a hint that a
dominant `(native)` share is regex/compiler/engine work, not JS**, would shorten the
"is this real?" moment.

## Did any output leave me unsure how far to trust a number?

Rarely, and the tool usually pre-empted it:

- **CPU headline:** "summed over the whole window across 250 iterations (divide by 250
  for a per-iteration figure) · of 304.3 ms non-idle sampled" — no ambiguity about the
  divisor or the JS-only scope.
- **Allocation:** wpd states up front "absolute byte total is directional (~10-20%),
  per-package shares trustworthy (~5%)," so I reported shares only. Clear.
- **Browser style ms:** wall-tier ~1%, and because the **exact flush counts were
  identical (10) across lanes**, I could trust that StyleX's 2x style-recalc ms was real
  matching cost, not noise. The count/ms pairing is what made the directional number
  trustworthy.
- The **only** genuine wobble was `(native)` at 170 s (item 5) — real, but the label
  didn't tell me it was the CSS compiler.

## Did AGENTS.md help me as an agent?

No — I could not read it (not shipped in the package; reaching it means the source repo).
The agent guidance that *did* reach me, inside the README, was genuinely good and
sufficient: consume `--format json|toon`, read `query spans` then drill with `query span`
/ `query cpu`, and never parse the recording file. `query cpu --format json` → `byPackage`
is exactly the extract a script wants, and the README flagging that field names "are not
the obvious ones" (`fn` not `name`, `selfMs`, `jsSelfMs`) saved real time.

## What is excellent (keep it)

- **Every refusal is honest and exits non-zero.** `assert --max-forced` on a breakdown
  recording is a loud `n/a` FAIL, not a silent pass; `cpu-diff` across capture modes
  refuses; `diff --fail-on-regression` across different workloads warns, prints a
  directional diff, and refuses to gate — all exit 1, so a gate that cannot be evaluated
  goes red, never green. This is the single most valuable property for CI.
- **The comparability model is real and correct.** Two browser probes with different
  module paths were caught as a workload mismatch; the node probes sharing one
  env-switched module path were not (and the README names `--variant` for exactly that).
  Same tool, predictable behavior once you know the rule.
- **Run-group stitching** (`--members breakdown,deep`) is a clean answer to "I want the
  bar and the blame": bar+CPU from breakdown, exact counts + forced blame from deep,
  walls kept per member and never averaged.
- **`(node)` / `(native)` / `(unmapped)` / origin buckets never misblame your code.**
  The refusal to fabricate is consistent everywhere.

## Ranked top-5 improvements

1. **Ship AGENTS.md and the referenced `docs/` in the npm tarball** (or fold the
   essentials into the README) — the agent doc an agent is pointed to is unreachable from
   an npm install.
2. **Make group file naming predictable** — honor `--out`'s basename for the manifest, or
   document that `--group <name>` names every group file.
3. **Give a local `(unmapped: runtime)` bucket a one-line reason** (no map for this chunk,
   eval'd code, ...), the way the remote sourcemap-failure table already does, so a
   heavily-unmapped lane is actionable.
4. **Add a pnpm note**: `pnpm exec wpd` can be blocked by the ignored puppeteer build;
   give the direct-bin fallback and the workspace `allowBuilds` fix together.
5. **Hint when `(native)` dominates** that it is non-JS engine/compiler work, so a large
   native share is read as a signal, not a wpd artifact.
