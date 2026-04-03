# Naksha — Capacitor/PWA Native Android Build

## Current State

- Service worker (`public/sw.js`) is custom-written at v5 with manual cache-and-network fetch, background timer notifications, and Pause/Stop action buttons. It caches only `['/', '/index.html', '/manifest.json']`.
- Notifications use `self.registration.showNotification` inside the SW (already correct). However, direct `new Notification(...)` calls are made in SettingsScreen as a fallback when the SW controller is not ready.
- File persistence uses File System Access API (`showDirectoryPicker`) in `monarchStorage.ts`, which is not available on Android. `exportData()` already uses a Blob+anchor download approach.
- `storage.ts` and `monarchStorage.ts` use `localStorage` directly. There is no Capacitor Preferences shim.
- `manifest.json` is minimal (no `scope`, no `id`, no `screenshots`, no `categories`, missing recommended fields for Android TWA/Capacitor).
- No Permission Manager screen exists. Permissions are handled inline in SettingsScreen.
- No Workbox integration — cache list is static and does not include built JS/CSS chunks.

## Requested Changes (Diff)

### Add
- `PermissionManagerScreen.tsx` — a dedicated screen that checks and requests Notification + Storage permissions on startup (shown once on first launch, accessible from Settings).
- `utils/preferences.ts` — a thin `Preferences` shim that wraps `localStorage` using the same async API as `@capacitor/preferences`, storing the Master Folder path and critical settings keys so they survive app restarts. This avoids a hard Capacitor dependency while being drop-in replaceable later.
- Workbox-compatible service worker: upgrade `sw.js` to cache all app shell assets (JS, CSS, HTML, fonts) using a cache-first strategy for static assets and network-first for navigation. Include the existing timer/notification logic unchanged.
- `utils/fileDownload.ts` — Android-compatible save helper: given a JSON snapshot, triggers a system download via `Blob + <a download>` (no File System Access API). This replaces the `showDirectoryPicker` path.

### Modify
- `public/sw.js` — upgrade cache list to include all compiled JS/CSS/font chunks (via a precache manifest pattern), add Workbox-style routing for navigation and static assets. Keep all timer notification logic intact.
- `public/manifest.json` — add `id`, `scope`, `categories`, `display_override`, `prefer_related_applications: false`, and proper `shortcuts` for full Android PWA/Capacitor compliance.
- `utils/monarchStorage.ts` — replace `showDirectoryPicker` calls with the Blob download fallback on Android (detect via `!('showDirectoryPicker' in window)`). Persist folder name/path via the `Preferences` shim instead of only in-memory + IndexedDB.
- `utils/storage.ts` — persist the most critical keys (`nk_username`, `nk_theme`, `nk_settings`) through the Preferences shim on every write so they are never lost on Android WebView restart.
- `SettingsScreen.tsx` — remove inline `new Notification(...)` fallback; route all notification firing through SW `postMessage`. Add link to Permission Manager screen.
- `App.tsx` — show PermissionManagerScreen on first launch (after onboarding), persist that it has been shown using Preferences shim.

### Remove
- The `new Notification(...)` direct fallback in SettingsScreen (replaced by SW-based notification exclusively).
- Any `showSaveFilePicker` / `showDirectoryPicker` logic that runs without capability detection (replace with capability check + Blob download fallback).

## Implementation Plan

1. Create `src/frontend/src/utils/preferences.ts` — async Preferences shim over localStorage.
2. Create `src/frontend/src/utils/fileDownload.ts` — Blob download helper for Android.
3. Update `src/frontend/src/utils/monarchStorage.ts` — use capability detection; fall back to fileDownload on Android; persist folder name via Preferences shim.
4. Update `src/frontend/src/utils/storage.ts` — dual-write critical keys to Preferences shim.
5. Create `src/frontend/src/screens/PermissionManagerScreen.tsx` — permission check UI for Notifications + Storage with requestPermissions() calls.
6. Update `src/frontend/src/screens/SettingsScreen.tsx` — remove direct `new Notification()` fallback, add Permission Manager entry.
7. Update `src/frontend/src/App.tsx` — integrate PermissionManagerScreen into startup flow.
8. Update `src/frontend/public/sw.js` — Workbox-compatible cache strategy, precache shell assets including JS/CSS chunks, keep timer logic.
9. Update `src/frontend/public/manifest.json` — add required Android PWA fields.
