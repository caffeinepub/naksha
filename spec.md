# Naksha - Cloud Sync, Internet Identity & Sharing

## Current State

- Frontend-only React app (no real backend logic), all data stored in localStorage / IndexedDB / Capacitor Filesystem
- `useInternetIdentity.ts` hook exists but is unused — no login flow in the UI
- `backend.d.ts` only exposes `getAppName()` — no real cloud data operations
- `storage.ts` handles all local reads/writes (sessions, todos, subjects, chapters, topics, tasks, notes, timer, appearance)
- `SettingsScreen.tsx` has Profile, Theme, Notifications, Data Management, Browser Storage, Appearance, About sections — no login section, no sharing section
- App works fully offline with local data only
- No way for a friend to use the app or share data

## Requested Changes (Diff)

### Add
- **Internet Identity login** in Settings: Login/Logout button, shows principal/username when logged in
- **Motoko backend** with per-user cloud storage: store all app data (sessions, todos, subjects, chapters, topics, tasks, notes, appearance, theme) keyed by user principal
- **Cloud sync logic**: 
  - On login: pull data from cloud → merge with local → save locally
  - On every auto-save: if logged in + online, push to cloud
  - On app start offline or not logged in: use local data as-is
  - Offline queue: changes made offline are queued and flushed when connection resumes
- **Sync status indicator** in Settings: shows cloud sync state (synced, syncing, offline, not logged in)
- **Sharing options section** in Settings:
  - Share App URL button: copies/shares the app's web URL so friends can open it
  - Share as PWA instructions: explains how friend can "Add to Home Screen" for app-like experience
  - Share via native Android share sheet (Web Share API) when available
  - QR code display of the app URL for easy phone-to-phone sharing
  - Deep link / invite message text the user can copy and send

### Modify
- `SettingsScreen.tsx`: add "Cloud Sync & Account" section (login, sync status, logout) and "Share Naksha" section
- `App.tsx`: wrap with `InternetIdentityProvider`, initialize cloud sync on mount
- `useAutoSave.ts`: after local save, also push to cloud if logged in + online
- `storage.ts`: no structural changes, cloud layer sits on top

### Remove
- Nothing removed — all existing local storage logic stays intact as offline fallback

## Implementation Plan

1. **Motoko backend** — actor with `saveUserData(data: Text)` and `getUserData()` returning `?Text` keyed by caller principal. One blob of JSON per user for simplicity and offline-merge friendliness.
2. **Select `authorization` component** — wires Internet Identity into the project
3. **`useCloudSync.ts` hook** — encapsulates: login state from `useInternetIdentity`, push/pull to backend actor, online detection, offline queue in localStorage, merge strategy (cloud wins on first pull, local wins for subsequent pushes)
4. **Update `SettingsScreen.tsx`** — add two new sections:
   - "Cloud Sync & Account": login button (II), sync status pill, logout button, last-synced timestamp
   - "Share Naksha": copy URL button, Web Share API button, QR code (generated via qrcode.js or inline SVG data URL), share message text
5. **Update `App.tsx`** — wrap with `InternetIdentityProvider`, call cloud pull on mount if already authenticated
6. **Update `useAutoSave.ts`** — after debounced local save, also push to cloud
