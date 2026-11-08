This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed: do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt: an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add: resolves SDK-compatible versions
npx expo start              # start the dev server
npm run check               # typecheck + lint + design tokens: run before every PR
npm run deploy:api          # check, export, scan for leaked secrets, deploy the API to EAS Hosting
npm run release:ios         # build for TestFlight; the GitHub release notes for this version become "What to Test"
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run `npm run check` before declaring any task done. CI runs the same command.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/`: every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`): no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand: configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Paradero conventions

- Paradero is a public digital good by Croma for Bogotá riders. Every screen is in plain Spanish, written the way a neighbour would say it.
- Data honesty is a feature: every time shown says whether it is live or from the published timetable (`Feed.live`, `Arrival.basis`). Never draw stale bus positions as current.
- Accessibility is not optional: every pressable has `accessibilityRole` and a full spoken `accessibilityLabel`; no fixed text heights.
- Privacy: no accounts, no analytics on location, coordinates are rounded to 3 decimals before leaving the phone (`src/lib/api.ts`).
- Layout: `src/app` routes and `+api.ts` server routes, `src/server` talks to Croma (key only there), `src/transit` pure domain logic shared by both, `src/components` UI, `src/lib` client state.
- Route codes: the feed joins paired SITP routes (`HK635` = K635 + H635). Use `describeRoute` in `src/transit/codes.ts`; `feedCode` is for API calls, `code`/`aliases` for anything a rider sees.
- No code from paid templates (e.g. Code with Beto's platano): this repo is MIT and must stay redistributable.
- Design system: read `docs/DESIGN.md` before touching UI. No raw numbers or colors in `src/app` or `src/components`; `npm run check` fails on them.
