# Mandar Cut

Personal Android app for the 12-week cut + muscle plan. Local-first: all data lives in SQLite on the phone. No account, no backend.

## What's inside

| Tab / screen | What it does |
| --- | --- |
| **Today** | Status (On track / Audit / Review / Recomp…), 7-day average with trend chart, milestone progress, steps, calories, protein, sleep, consistency grid, today's workout, mess-night tip, Day 1 checklist |
| **Log weight** | Big weigh-in input (±0.1 / ±1.0, or tap to type), note, recent weigh-ins |
| **Food** | Week strip, mess-aware quick add (chicken only Wed/Sun, eggs only Fri — editable), portions ×½/×2, custom items, per-meal lists, suggested dinner |
| **Train** | Full Body A/B (alternates automatically), progression suggestions, live session with animated form guide for every lift, set logging (kg / reps / RIR), rest timer, pain flag, squat ↔ leg press swap |
| **Exercise history** | Weight / volume / est. 1RM charts, session list, form guide |
| **Progress** | Weight trend with expected-pace band, waist trend, strength gains, milestones |
| **Steps** | Ring, 7-day bars, step ramp by week, manual override, sleep |
| **Health Connect** | Connect Android Health Connect to read real steps + sleep |
| **Measurements & photos** | Weekly waist, optional measurements, front/side/back photos stored privately, first vs latest comparison |
| **Weekly review** | Verdict from the status engine, week stats, one thing to watch, decision rules, audit checklist |
| **Plan** | 12-week strip, this week's A/B schedule, targets, mess protein nights, rules |
| **Settings** | Profile, targets, reminders (weigh-in, workout, evening step nudge only if below target, meals, weekly review), mess nights, portion presets, CSV export, JSON backup / restore |

Logic lives in `src/lib/` (`logic.ts` = rolling average, status engine, progression; `summary.ts` = dashboard data; `repo.ts` = database).

## Build the APK (no Android Studio needed)

You need **Node.js 20+** and a free **Expo account** (https://expo.dev/signup).

```bash
cd MandarCut
npm install
npx eas-cli@latest login
npx eas-cli@latest init          # links the project to your Expo account (first time only)
npx eas-cli@latest build -p android --profile preview
```

The build runs on Expo's servers (~10–20 min). When it finishes you get a link / QR code — open it on your phone, download the `.apk`, and install it (allow "Install unknown apps" for your browser when Android asks).

Shortcut: `npm run build:apk` runs the build command.

### Build locally instead (optional)

If you have Android Studio + JDK 17 installed:

```bash
npx expo prebuild -p android
cd android && ./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

## Steps from Health Connect

1. Make sure **Health Connect** is on your phone (built into Android 14+, otherwise install it from the Play Store).
2. In the app that counts your steps (Google Fit, Fitbit, Samsung Health…), turn on syncing to Health Connect.
3. In Mandar Cut: Steps → tap "Health Connect" → **Connect** → allow Steps (and Sleep).

Steps then sync whenever you open the app or pull down on Today. A number you type in by hand is never overwritten.

Health Connect doesn't work in Expo Go, so use the APK build above.

## Develop

```bash
npm install
npx expo start          # needs a development build because of Health Connect:
npx eas-cli@latest build -p android --profile development   # once
npm run typecheck
```

## Updating the app later

Bump `version` and `android.versionCode` in `app.json`, rebuild, and install the new APK over the old one — your data stays.
Back up first from Settings → JSON backup, just in case.
