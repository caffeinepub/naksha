# Naksha — Final Native & UI Overhaul (Version 13)

## Current State

- App uses `@capacitor/filesystem`, `@capacitor/local-notifications`, `@capacitor/preferences` via dynamic imports with web fallbacks
- `capacitorStorage.ts` handles file I/O; `capacitorNotifications.ts` handles timer alerts
- `preferences.ts` is a shim that delegates to Capacitor Preferences on native or localStorage on web
- `monarchStorage.ts` manages the master folder/file sync (Documents dir on native, File System Access API on web)
- `App.tsx` has `BellStatusIcon` floating fixed top-left and `StorageStatusBadge` fixed top-right — both always visible
- `SettingsScreen.tsx` has notification buttons, folder controls, and refresh logic
- `PermissionManagerScreen.tsx` checks/requests both notification and storage permissions on startup
- `capacitor.config.json` already has `webDir: "www"`; this is correct
- `BackupContext.tsx` tracks sync status and exposes `triggerSync`, `triggerFullSync`, `linkFolderAndSync`
- No automatic `Documents/NakshaData` directory creation on startup
- Floating bell icon is always visible top-left; notification toggle is a floating button
- Sync icon is large and always visible even when not saving

## Requested Changes (Diff)

### Add
- Auto-create `Documents/NakshaData` directory on app launch using `Filesystem.mkdir` (via `capacitorStorage.ts`)
- `ensureNakshaDataDir()` function that calls `Filesystem.mkdir({ path: 'NakshaData', directory: Directory.Documents, recursive: true })` on native startup
- "Change Directory" button in Settings → Data Management that opens folder picker but defaults to NakshaData
- Call `LocalNotifications.requestPermissions()` on first meaningful interaction (first timer start or first task creation)
- All app state persistence routed through `@capacitor/preferences` (timer state, subjects, sessions, theme, username, etc.)
- Sync icon in the top-right header (18px), only visible and pulsing when actively saving — hidden otherwise
- Status bar at the bottom (above BottomNav) showing notification toggle and sync status, replacing the floating bell

### Modify
- `capacitorStorage.ts`: Add `ensureNakshaDataDir()` that creates `Documents/NakshaData` if missing; update `saveToDocuments` to write under `NakshaData/` subfolder on native
- `App.tsx`: 
  - Remove `BellStatusIcon` floating fixed element from top-left
  - Move sync indicator into header area as a small 18px icon that only appears/pulses during save
  - Remove `StorageStatusBadge` as a persistent always-on overlay
  - Add compact `StatusBar` component at the bottom (above BottomNav) showing notification status + sync state
  - Call `ensureNakshaDataDir()` on mount
- `monarchStorage.ts`: Update native path to use `NakshaData/naksha_master_data.json` instead of flat `naksha_master_data.json`
- `preferences.ts`: Ensure ALL app state keys (subjects, sessions, timer, theme, username, todos, chapters, topics, appearance) are written to Preferences on every save, not just username/theme
- `capacitorNotifications.ts`: Ensure `LocalNotifications.requestPermissions()` is called lazily on first interaction, not just on permission manager screen
- `SettingsScreen.tsx`: Move notification bell UI into a section (not floating), add "Change Directory" button next to "Select Folder", remove floating notification toggle reference
- `BottomNav.tsx`: Ensure it renders above the new StatusBar or that z-index is correct
- `capacitor.config.json`: Confirm `webDir: "www"` is set (already correct; add TS variant `capacitor.config.ts`)

### Remove
- Floating `BellStatusIcon` fixed position top-left element in `App.tsx`
- `StorageStatusBadge` as always-on overlay — replaced by subtle header icon
- Floating notification toggle button from left side of screen
- Any UI elements that hover/overlay main action buttons (z-index audit)

## Implementation Plan

1. **`capacitorStorage.ts`**: Add `ensureNakshaDataDir()` that on native calls `Filesystem.mkdir({ path: 'NakshaData', directory: Directory.Documents, recursive: true })`. Update `saveToDocuments` to prefix path with `NakshaData/` on native.

2. **`monarchStorage.ts`**: Update the native `syncToFolder` path to write to `NakshaData/naksha_master_data.json`.

3. **`preferences.ts`**: Add a `syncAllStateToPreferences()` helper that writes all critical state keys (subjects, sessions, timerState, todos, themes, chapters, topics, projects) to Capacitor Preferences as serialized JSON. Called from `syncToLocalAndIDB`.

4. **`capacitorNotifications.ts`**: Export `ensureNotificationPermission()` that calls `LocalNotifications.requestPermissions()` lazily and caches the result. Add `firstInteractionPermissionRequest()` to call this once on first timer start/task creation.

5. **`App.tsx`**:
   - Remove `BellStatusIcon` and `StorageStatusBadge` floating elements
   - Add `HeaderSyncIndicator` — a tiny 18px `RefreshCw` icon that appears only when `status === 'saving'`, positioned inline in a thin top header bar; hidden at all other times
   - Add `AppStatusBar` component at bottom above BottomNav: left side shows Bell icon (grey/red/green) with tap to enable notifications; right side shows current folder name or "Linked" text in muted small font
   - Call `ensureNakshaDataDir()` on mount
   - Audit and remove any `position: fixed` overlays that block action buttons

6. **`SettingsScreen.tsx`**:
   - Move notification enable/test buttons into a dedicated `Notifications` section card (already a section, confirm no floating elements)
   - Add "Change Directory" button in Data Management section
   - Remove any reference to a floating notification toggle

7. **`capacitor.config.json`**: Already correct. Also create `capacitor.config.ts` as TypeScript variant for projects that prefer it.

8. **CSS/z-index audit**: Ensure BottomNav and StatusBar z-indexes don't clash; no fixed elements with z > 100 except modals/toasts.
