# Naksha — Capacitor Android Build (Version 12)

## Current State
- React + TypeScript + Tailwind PWA running on ICP
- Storage: File System Access API (monarchStorage.ts) + localStorage + IndexedDB
- Notifications: Browser Notification API via Service Worker (sw.js)
- Preferences shim (preferences.ts) mirrors @capacitor/preferences API but uses localStorage
- `pb-safe` utility exists for bottom nav; no top safe-area CSS exists
- No capacitor.config.json; package.json has no Capacitor dependencies

## Requested Changes (Diff)

### Add
- `capacitor.config.json` with appId=com.suryansh.naksha and webDir=www
- Capacitor dependencies to `src/frontend/package.json`: @capacitor/core, @capacitor/cli, @capacitor/android, @capacitor/filesystem, @capacitor/local-notifications
- `src/frontend/src/utils/capacitorStorage.ts` — new file wrapping @capacitor/filesystem for saving to Android Documents folder
- `src/frontend/src/utils/capacitorNotifications.ts` — new file wrapping @capacitor/local-notifications for scheduling a notification exactly at timer end
- `android/app/src/main/AndroidManifest.xml` — reference XML with POST_NOTIFICATIONS, READ_EXTERNAL_STORAGE, WRITE_EXTERNAL_STORAGE permissions
- `.pt-safe` CSS class in index.css for top safe area (notch/status bar)

### Modify
- `src/frontend/src/utils/monarchStorage.ts` — wire capacitorStorage for syncToFolder; fall back to current File System Access API on web
- `src/frontend/src/hooks/useTimer.ts` — on TIMER_COMPLETE, call capacitor local-notifications scheduleAsync instead of (or alongside) SW postMessage
- `src/frontend/src/utils/preferences.ts` — try to import from @capacitor/preferences first; fall back to localStorage shim
- `src/frontend/index.html` — ensure viewport meta has viewport-fit=cover (already present)
- `src/frontend/src/index.css` — add `.pt-safe` and `.header-safe` utilities

### Remove
- Nothing removed; all web/PWA code stays as fallback

## Implementation Plan
1. Write `capacitor.config.json` at workspace root
2. Add Capacitor packages to `src/frontend/package.json` dependencies
3. Create `src/frontend/src/utils/capacitorStorage.ts` — isCapacitor() check, writeFile to Documents, readFile, helper to export/import via Capacitor Filesystem
4. Create `src/frontend/src/utils/capacitorNotifications.ts` — scheduleTimerCompleteNotification(), cancelTimerNotification(), requestPermissions()
5. Update `monarchStorage.ts` syncToFolder/syncToFile to branch on isCapacitor() and use capacitorStorage
6. Update `useTimer.ts` onComplete path to call scheduleTimerCompleteNotification
7. Update `preferences.ts` to attempt @capacitor/preferences import with localStorage fallback
8. Add `.pt-safe`, `.header-safe` CSS utilities to index.css
9. Create `android/app/src/main/AndroidManifest.xml` reference file
