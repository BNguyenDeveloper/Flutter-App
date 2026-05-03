# Lottery AI Architecture Map & Migration Plan

## Current architecture map
- Node routes: `/api/provinces`, `/api/results/latest`, `/api/results/history`, `/api/results/import`, `/api/analysis/*`, `/api/predictions/today`, `/api/predictions/regenerate` (renamed from generate), `/api/stats/*`.
- Prediction services: `prediction.service.js` contains frequency, cascade, gap-cycle, Markov repeat, pattern transition scoring, topK ranking, persistence to Mongo.
- Training logic: `mlTraining.service.js` builds full temporal feature rows and trains logistic regression through `mlModel.service.js`.
- Model loading/saving: `mlModel.service.js` saves/loads active models in `ml_models` collection.
- FastAPI logic: `prediction-engine/main.py` and `prediction-engine/models/*` keep existing Python inference stack (frequency+gap+markov ensemble) for offline engine compatibility.

## Migration plan
1. Keep all existing algorithms unchanged in Node and Python modules.
2. Shift runtime behavior to batch-first:
   - `npm run etl:daily`
   - `npm run train:weekly`
   - `npm run prediction:job`
3. Persist model registry metadata (`modelType`, `modelVersion`, `metrics`, `active`, `artifactPath`) in Mongo `ml_models`.
4. Persist prediction snapshots (`date`, `area`, `province`, `code`, `topK`, `scores`, `explanation`, `modelVersion`, `generatedAt`) in Mongo `predictions`.
5. Flutter uses read-only prediction endpoints; no direct inference calls.
6. Node acts as API gateway and DB reader, with optional manual regenerate endpoint for admins.
