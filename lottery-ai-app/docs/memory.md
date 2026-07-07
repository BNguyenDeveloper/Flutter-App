# Project Memory

## 2026-07-07 XSMB prediction pipeline

- XSMB import/prediction was stale: latest DB result was `2026-06-15`, latest prediction was `2026-05-14`.
- Root cause found: import scripts call `resultService.importResult(...)`, but `backend-api/src/services/result.service.js` did not export that function.
- Fix made: restored result service API and made `Result` schema compatible with current XSMB documents using `area`, `code`, `prizes`, and `special`.
- Verification:
  - Imported XSMB result `2026-07-06`, special prize `43497`.
  - Generated XSMB predictions for `2026-07-07` with `signalDate=2026-07-06`.
  - Loto top 10: `52, 69, 74, 13, 00, 38, 48, 45, 76, 58`.
  - Special top 10: `58, 90, 13, 68, 63, 54, 85, 26, 96, 44`.

