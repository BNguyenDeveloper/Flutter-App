# Project Memory

## 2026-07-07 XSMB prediction pipeline

- XSMB import/prediction was stale: latest DB result was `2026-06-15`, latest prediction was `2026-05-14`.
- Root cause found: import scripts call `resultService.importResult(...)`, but `backend-api/src/services/result.service.js` did not export that function.
- Fix made: restored result service API and made `Result` schema compatible with current XSMB documents using `area`, `code`, `prizes`, and `special`.
- Verification:
  - Imported XSMB result `2026-07-06`, special prize `43497`.
  - Generated XSMB predictions for the 7-day future window `2026-07-07` through `2026-07-13` with `signalDate=2026-07-06`.
  - Prediction UX should show only 5 pairs, not long top-10/top-20 lists.
  - "7 days" means each pair may appear on any day in the future window, not only on the first prediction date.
  - Loto top 5 with strongest likely date: `52@2026-07-07`, `69@2026-07-13`, `74@2026-07-07`, `13@2026-07-09`, `00@2026-07-13`.
  - Special top 5 with strongest likely date: `58@2026-07-07`, `90@2026-07-10`, `13@2026-07-07`, `63@2026-07-09`, `68@2026-07-08`.
