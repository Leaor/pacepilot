# PacePilot

PacePilot's production target is a native iOS app built with Xcode, Swift, SwiftUI, iOS 17+, MapKit, CoreLocation, Swift Charts, UserNotifications, HealthKit-ready services, Supabase-backed data storage architecture, and RevenueCat subscription architecture.

This repository also contains an Expo/React Native preview surface under `app/` and `src/` for product iteration and TypeScript business-logic verification. Treat that client as public code: only `EXPO_PUBLIC_*` values belong in its environment.

## Open in Xcode

1. Open `pacepilot.xcodeproj`.
2. Select the `PacePilot` scheme.
3. Choose an iOS 17+ simulator.
4. Run with `Cmd+R`.

Command-line build:

```bash
xcodebuild -project pacepilot.xcodeproj -scheme PacePilot -configuration Debug -destination 'generic/platform=iOS Simulator' build
```

XCTest files are included in `Tests/` and the `PacePilotTests` target is present. In this hand-built project, Xcode’s CLI test action currently needs a scheme-wiring pass if it reports `unable to resolve module dependency: 'PacePilot'` after package resolution.

## Native App Structure

The app source lives in `PacePilot/` with MVVM-friendly separation:

- `App/` for app state, routing, and environment flags.
- `DesignSystem/` for PacePilot navy, orange, cream, cards, buttons, badges, and progress rings.
- `Models/` for profile, plans, workouts, activities, events, shoes, subscriptions, race, AI, and privacy data.
- `Services/` for Supabase, auth, plan, activity, location recording, RevenueCat, OpenAI proxy, Strava, Garmin, calendar export, notifications, and HealthKit.
- `Features/` for Auth, Onboarding, Today, Plan, Activities, Workout Recording, Events, Race, Coach, Progress, Gear, Paywall, Profile, Privacy Center, and Support.
- `TrainingEngine/`, `RaceEngine/`, and `AI/` for deterministic business logic and privacy firewalls.
- `Tests/` for engine and AI policy XCTest coverage.

## Supabase

Apply migrations:

```bash
supabase db push
```

The native schema migration is:

```text
supabase/migrations/202606240001_pacepilot_native_schema.sql
```

Optional local demo seed:

```bash
supabase db reset
# then run supabase/seed/202606240001_demo_seed.sql in local development only
```

## Local Environment Files

Use separate files for client-safe values and server-only secrets:

- Copy `.env.example` for Expo/public client development only. Every variable in that file must start with `EXPO_PUBLIC_`.
- Copy `supabase/.env.edge.example` to an ignored file such as `supabase/.env.edge.local` when serving Supabase Edge Functions locally.
- Do not place `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, Strava/Garmin client secrets, webhook secrets, token encryption keys, or OAuth signing secrets in any root `.env*` file. Expo and Metro inspect root project files during web/native development.

Client-safe Expo values:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_MOCK_SUBSCRIPTIONS=true
```

Set `EXPO_PUBLIC_APP_ENV=production` and `EXPO_PUBLIC_MOCK_SUBSCRIPTIONS=false` for production Expo builds so preview entitlements fail closed.

## Edge Function Secrets

Set server-only secrets in Supabase, not in committed code and not in the iOS app:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
supabase secrets set APP_ENV=production
supabase secrets set OPENAI_API_KEY=...
supabase secrets set OPENAI_MODEL=gpt-5.5
supabase secrets set TOKEN_ENCRYPTION_KEY=...
supabase secrets set OAUTH_STATE_SECRET=...
supabase secrets set STRAVA_CLIENT_ID=...
supabase secrets set STRAVA_CLIENT_SECRET=...
supabase secrets set STRAVA_REDIRECT_URI=...
supabase secrets set STRAVA_OAUTH_SCOPE=read,activity:read,activity:write
supabase secrets set STRAVA_WEBHOOK_VERIFY_TOKEN=...
supabase secrets set STRAVA_WEBHOOK_SUBSCRIPTION_ID=...
supabase secrets set GARMIN_CLIENT_ID=...
supabase secrets set GARMIN_CLIENT_SECRET=...
supabase secrets set GARMIN_REDIRECT_URI=...
supabase secrets set GARMIN_WEBHOOK_SECRET=...
supabase secrets set WEATHER_API_KEY=...
supabase secrets set CORS_ALLOWED_ORIGINS=https://your-production-origin.example
```

OpenAI, Strava, and Garmin calls go through Supabase Edge Functions only. No service-role key, OpenAI key, Strava secret, or Garmin secret belongs in the iOS target.

## RevenueCat

`RevenueCatService.swift` uses the iOS SDK for offerings, purchase, restore, and entitlement refresh. Configure the iOS key as `REVENUECAT_IOS_API_KEY` in the native app environment, then create App Store Connect products and RevenueCat offerings for:

- Free: basic plan, manual logging, basic events, basic insights.
- Pro: adaptive training, advanced zones, event-to-plan, shoes, progress, calendar export.
- Elite: AI Coach, race strategy, race readiness, race checklist, audio coach, priority support.

RevenueCat package, offering, product, or active entitlement identifiers should include `pro` or `elite`. The app also recognizes feature-level entitlement identifiers such as `adaptive_training`, `progress_dashboard`, `shoe_tracker`, `ai_coach`, `race_strategy`, and `audio_coach`.

## Privacy Notes

- Supabase Auth and RLS protect user-owned rows.
- Personal user data is intended for Supabase storage, with local storage limited to temporary UI cache, unsynced drafts, non-sensitive preferences, and offline temporary state.
- Strava API/cache data is display-only and excluded from AI coaching, plan generation, and advanced analytics.
- AI may use only consented PacePilot-native data, user-provided imports, permitted Garmin/Apple Health data, and chat text.
- `ai_data_access_logs` records used and excluded sources.
- Deleted or opted-out data must not be sent to OpenAI.

## Production Readiness Checklist

- Add real Supabase project URL and anon key to iOS configuration.
- Supabase Swift and RevenueCat iOS packages are referenced through Swift Package Manager; native auth uses Supabase when `SUPABASE_URL` and `SUPABASE_ANON_KEY` are configured.
- Verify RevenueCat sandbox purchase and restore flows against the configured App Store Connect products before App Store release.
- Finalize legal documents with qualified legal review.
- Complete Strava webhook verification, cache expiry, token refresh, revocation, and export flows.
- Enable Garmin only after partner approval and terms review.
- Add production app icons, launch screen polish, screenshots, privacy nutrition labels, and subscription metadata.
- Website or admin dashboard remains out of scope for this native app pass.

## App Store Checklist

- Apple Developer account and bundle ID.
- App Store Connect subscription product IDs mapped to RevenueCat entitlements.
- Privacy nutrition labels for location, health, account, purchase, and training data.
- Health disclaimer and data deletion policy reviewed by counsel.
- Location permission copy verified.
- HealthKit permission copy verified.
- TestFlight build on physical devices.
- RevenueCat sandbox purchase tests.
- Supabase RLS audit and Edge Function secret audit.

## API keys and accounts needed before production

- Supabase project URL: native iOS config as `SUPABASE_URL`; Expo client config as `EXPO_PUBLIC_SUPABASE_URL`.
- Supabase anon key: native iOS config as `SUPABASE_ANON_KEY`; Expo client config as `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Supabase service role key: Supabase Edge Function secret only.
- OpenAI API key: Supabase Edge Function secret only.
- `OPENAI_MODEL=gpt-5.5`: Supabase Edge Function secret.
- RevenueCat iOS key: iOS app config and RevenueCat dashboard.
- Apple Developer account: App Store Connect, signing, bundle ID, subscriptions.
- Strava developer client ID/secret: Edge Function secrets.
- Strava webhook verify token and subscription ID: Edge Function secrets.
- Garmin developer credentials if approved: Edge Function secrets.
- Mapbox/maps key if used: iOS app config as `MAPBOX_TOKEN`.
- Weather API key if weather training is enabled: Edge Function secret.
- App Store subscription product IDs: App Store Connect and RevenueCat dashboard.

Never paste real production secrets into committed code.
