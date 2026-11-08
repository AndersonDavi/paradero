# Paradero: stack and features

Goal: an open-source mobile app for the people who ride TransMilenio and SITP every day, built on the Croma data that transmi.usecroma.com already uses. The feature list comes from the 112 replies on the two X posts (~/hackathons/x-comments/comments.md).

## 1. Stack

| Layer | Choice | Why |
| --- | --- | --- |
| App | Expo SDK 58, Expo Router, TypeScript | Latest SDK; same family as platano (57) and Kebo (55) |
| Navigation | `NativeTabs` (liquid glass on iOS, Material on Android) | Platano pattern, looks native for free |
| Native UI | `expo-symbols`, system colors via `Color` from expo-router, native search bar and large titles | Platano look, written from scratch (platano's license forbids redistribution) |
| Maps | `@maplibre/maplibre-react-native` + CARTO basemaps | Same renderer and style as the web map, handles 8,000 moving points, no Google Maps key |
| Motion | Reanimated, haptics | Small and native |
| Data fetching | TanStack Query (polling 15 to 20 s, paused in background) | Used in both references |
| Local data | `expo-sqlite` (favorites, recent searches, settings) | Local-first, no account needed |
| Auth | None in v1 | Platano model: zero friction, nothing to reject in App Review |
| Backend | Expo API Routes in the same repo (`src/app/api`), deployed to EAS Hosting | One repo anyone can run. Shared caches per instance, Zod validation, the Croma key never ships in the app |
| Language | Spanish only in v1, copy kept in components | i18n when a second language is needed |
| Analytics and errors | None in v1; Sentry later, never location analytics | Privacy promise |
| Release | EAS Build, Submit, Update; Maestro E2E | Kebo and platano workflows |
| Platforms | Android and iOS from day one | Most riders in Bogotá are on Android; test there first |

Repo: one Expo app. `src/transit` holds the domain logic shared by the app and its server routes. The web map stays in its own repo.

Finding while building: the "missing routes" riders reported all exist. The feed joins paired SITP routes under one code (`HK635` = K635 + H635), and the web map's search only matched the joined code. `src/transit/codes.ts` splits them.

## 2. Features

### v1: the weekend build

1. **Mi paradero**: pick a station or zonal stop and see the next buses, minutes away, and how early or late each one runs. Most asked: @gabrielforero17, @LEOC1R8, @disruptedpoet_.
2. **Every bus coming to this stop, on the map**: route A, B and C together, so you see which one is closest (@disruptedpoet_).
3. **Favorites**: save stops and routes; home screen opens on them.
4. **Route search**: any code (troncal, zonal, alimentador, TransMiCable) with its path, stops and live buses. Search has to find the routes people said were missing (K635-H635, G545-H545, A334, B903, A538, SITP "A" routes).
5. **Nearby**: closest stations and stops from your location.
6. **Feed health, said plainly**: "En vivo, hace 12 s" or "Sin datos en vivo, mostrando el horario programado". The feed went down for a day after the first post and people noticed (@imallrightwing, @GabGCifuentes).
7. **Mobile-first route view**: the web map is hard to use on a phone (@Gonzaakx, @LauraReinaB, @mellamojuliana_), so this is a list first, map second.

### v2

- Push notifications for a favorite route at a chosen time ("tu B10 llega en 5 min").
- iOS Live Activity and home screen widget for the next bus at a favorite stop.
- Service alerts (closures, protests, detours) from the TransMilenio alerts feed (@oskrac81, @IJustDavi).
- Trip planner with transfers, on OpenTripPlanner over the GTFS (@ElDuviss).
- Other cities: Medellín Metro (asked several times), Transmetro, Transcaribe, MIO, if open feeds exist.

### v3: needs research

- Crowd-sourced reports, Waze style: how full a station or bus is, broken-down buses, incidents (@JuankPiza, @camilonietoofi, @easy_jus).
- TuLlave card balance over NFC and a countdown for the free transfer window (@disruptedpoet_). Check the card's technical and legal limits first.
- "Ghost bus" signal: buses that report on the feed but never show up (@molartep).

## 3. Open questions

- ~~Missing routes~~: resolved, see above.
- Feed refresh: TransMilenio publishes every 20 s; the official app looks like every 3 min. Confirm what Croma serves and cache it.
- Who joins: offers came from designers (@grishkalifa, @anonimo_rayo), mobile devs (@not_om_, @JosephDarkSouL, @dagon_dev) and security (@WalterAnd1984).
- Name and license (MIT, like transmilenio-live).

## 4. Agent mode: "Pregúntale a Paradero" (next milestone)

Riders ask in their own words and get an answer built from live data, shown with the same cards the app already uses.

Examples the agent must handle:
- "¿Cómo llego de Suba Gaitana a la Universidad Nacional?"
- "¿Ya pasó el último K635 de hoy?"
- "¿Qué bus me deja cerca del Movistar Arena?"
- "Avísame cuando el B10 esté a 5 minutos de Calle 72"

### How it fits

| Piece | Choice |
| --- | --- |
| Entry | A sparkles button next to "Ruta, estación o paradero" on Cerca, opening a full-height chat sheet |
| Input | Liquid Glass text field pinned above the keyboard (the platano pattern, written from scratch), plus voice dictation for riders who can't type on a moving bus |
| Server | `src/app/api/agent+api.ts` streaming with the AI SDK through Vercel AI Gateway |
| Tools | The functions in `src/server/transit.ts` as they are: `nearby`, `search`, `stopDetail`, `routeDetail`, plus `planTrip` once OpenTripPlanner runs on the GTFS |
| Answers | Generative UI: tool results render as `NextBus`, `ArrivalRow`, `RouteRow` and a map card, never as a wall of text |
| Honesty | Every answer says whether the times are live or from the timetable, and the agent says "no sé" instead of guessing a route |
| Privacy | No chat history on the server, location only when the rider shares it in that question |

The domain logic already lives in pure, typed functions shared by the app and its API, so they become agent tools without a rewrite.
