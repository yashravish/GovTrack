# GovTrack

GovTrack is a monorepo for a mobile app (Expo), an admin portal (React + Vite), and a Go API service, with shared TypeScript types.

## Prerequisites

- Node.js >= 20.11
- pnpm >= 9
- Go 1.23.x (CI uses Go 1.23)
- Docker Desktop

## Setup

```bash
pnpm install
```

## Local infrastructure

```bash
docker compose up
```

## Phase status

- [x] Phase 1: monorepo scaffolding, formatting, git hooks, CI stubs

## Mobile E2E (Detox)

Detox E2E is **not** run in CI (too expensive). Run it locally.

### Android (Windows/Linux)

- **Start backend in test mode**: set `APP_ENV=test` and run the API (seeded DB).
- **Build + run**:

```bash
pnpm --filter mobile install
pnpm --filter mobile e2e:build:android
pnpm --filter mobile e2e:android
```

Notes:

- The Android emulator must be running and match the AVD in `apps/mobile/.detoxrc.js` (default: `Pixel_6_API_34`).
- The Detox artifacts (logs/screenshots/videos) are written to `apps/mobile/artifacts/`.

### iOS (macOS)

Install AppleSimUtils once:

```bash
brew tap wix/brew && brew install applesimutils
```

Then:

```bash
pnpm --filter mobile e2e:build:ios
pnpm --filter mobile e2e:ios
```
