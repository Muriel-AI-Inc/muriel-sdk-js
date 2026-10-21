# Releasing @muriel-ai/sdk

Releases publish to npm from GitHub Actions (`.github/workflows/publish.yml`)
when a GitHub Release is published. No npm token is stored anywhere: the
workflow authenticates with npm Trusted Publishing.

## Every release

1. Bump the version in **three** places, all the same:
   - `package.json` → `"version"`
   - `package-lock.json` → top-level `"version"` (run `npm install` to refresh it)
   - `src/version.ts` → `VERSION` (a test checks it matches `package.json`)
2. Check locally: `npm run typecheck && npm test`
3. Commit and push to `main`.
4. On GitHub → muriel-sdk-js → Releases → **Draft a new release**:
   - tag `vX.Y.Z` (must equal the package.json version, with a `v`), target `main`
   - title `vX.Y.Z`, notes as you like → **Publish release**
5. Watch Actions → **publish**. Then confirm:
   `npm view @muriel-ai/sdk version`
   (the registry can take a few minutes to show a new version).

## What the workflow does

- **test**: typecheck and tests on Node 18, 20 and 22.
- **publish** (environment `npm`, Node 24, `id-token: write`):
  - fails if the package.json version doesn't match the tag;
  - skips the upload if that version is already on npm (so a hand-published
    version doesn't fail the run);
  - upgrades npm to the latest (trusted publishing needs npm 11.5.1+);
  - `npm ci`, then `npm publish` (provenance is added automatically).

## One-time setup (done)

npmjs.com → `@muriel-ai/sdk` → Settings → Trusted Publisher → GitHub Actions:

| Field | Value |
|---|---|
| Organization or user | `Muriel-AI-Inc` |
| Repository | `muriel-sdk-js` |
| Workflow filename | `publish.yml` |
| Environment | `npm` |
| Allowed actions | **allow `npm publish`** (direct publishing) |

If "allow npm publish" is left unchecked, npm only accepts `npm stage publish`
from the workflow and the release fails; either check it, or change the last
step to `npm stage publish` and approve each version on npmjs.com.

Optional: GitHub → Settings → Environments → `npm` → required reviewers, to
make the publish job wait for an approval.

## Publishing by hand (fallback)

Needs an npm account that owns the `@muriel-ai` org. Run one command per line;
**don't paste trailing `# comments`** — zsh passes them to the command as
arguments (`git stash  # ...` fails with "subcommand wasn't specified").

```bash
cd ~/muriel-ai-consolidated-products/muriel-sdk-js
git status            # commit or stash local changes first
git checkout vX.Y.Z
npm login
npm publish --access public
git checkout main
```

`prepublishOnly` runs the typecheck and tests first. npm asks you to confirm
in the browser (2FA). The workflow will then skip that version.

## Errors seen

| Error | Cause | Fix |
|---|---|---|
| `E404 Not Found - PUT https://registry.npmjs.org/@muriel-ai%2fsdk` | Trusted publisher not configured (or doesn't match repo/workflow/environment), so the publish was unauthenticated. npm answers 404, not 401, for a scoped package. | Configure the trusted publisher as above. |
| `Unknown user config "always-auth"`, "npm tokens that bypass 2FA are being restricted" | Warnings from setup-node / npm. | Ignore. |
| `npm view` still shows the old version right after publishing | Registry propagation. | Wait a few minutes. |
| `package.json version X != tag vY` | Tag and version differ. | Delete the release and tag, fix the version, release again. |

## History

- **0.2.0**: first version under `@muriel-ai/sdk` (`muriel` on npm belongs to an
  unrelated project).
- **0.2.5** (2026-10-21): the release workflow failed with E404 because the
  trusted publisher wasn't set up. Published by hand from tag `v0.2.5`; the
  trusted publisher was then configured and the workflow now upgrades npm
  before publishing.
