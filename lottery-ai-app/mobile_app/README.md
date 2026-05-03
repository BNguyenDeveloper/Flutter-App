# Flutter lib refactor

Copy the `lib/` folder into your Flutter project to replace the current single-file `main.dart` layout.

Main fixes included:

- Removed duplicated `generatePrediction` method.
- Replaced invalid `baseUrl` usage with `apiBase`.
- Split API, state, models, widgets, utils, and pages into separate files.
- Home page now loads latest result and quick prediction separately with separate loading states.
- Station change notifies pages via `appState.addListener`, so suggestions refresh when region/province/station changes.

Run:

```bash
flutter clean
flutter pub get
flutter run
```
