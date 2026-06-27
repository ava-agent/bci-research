# BCI Research Triage - 2026-06-27

## Repository

- GitHub: `ava-agent/bci-research`
- Public demo: `https://bci.rxcloud.group`
- Category: research corpus plus interactive Next.js BCI Agent demo

## Actions Taken

- Fast-forwarded local `main` from the pre-migration domain switch commit to the
  remote Ark migration commit `5f21e91`.
- Added `web` `test` and `type-check` scripts using TypeScript no-emit checks.
- Added `.superpowers/` to `.gitignore` so local brainstorm HTML previews,
  server logs, and PID files do not reintroduce stale provider text into scans.
- Added and updated the March MVP plan to use Volcengine Ark / ChatOpenAI
  examples instead of old non-Ark LLM setup instructions.

## Validation

- Passed: `node --check cloud/bci-agent/index.js`
- Passed: `cd app && uv run --extra dev pytest` (12 tests)
- Passed: `cd web && npm run test`
- Passed with one existing hook cleanup warning: `cd web && npm run lint`
- Passed: `cd web && npm run build`
- Passed: `git diff --check`
- Passed: `scan_project.sh .` with no old provider markers, no public-client
  key risk, and no Ark-looking secrets.
- Passed: local CloudBase Node handler real Ark smoke test returned
  `statusCode: 200`, `hasResponse: true`, and `hasError: false` without
  printing the secret.

## Follow-Up

- Runtime, CloudBase, Vercel env, and production LLM verification were completed
  in the earlier Ark migration record for this repository.
