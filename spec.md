# Naksha — Version 10: Notification Permissions, Master Folder Storage, and Sync Dashboard

## Current State
- Service Worker v4 registered on startup for background timer and push notifications.
- Notification permission uses an in-app banner (NotificationBanner.tsx) and a basic Settings section with a 'Grant Permission' button for `default` state only.
- Wrapped app context (Android WebView/WebApk) can block background notifications because there is no explicit OS-level permission trigger.
- Monarch Storage: file-linked using `showSaveFilePicker`, requires user to pick a single file (`naksha_data.json`). Handle is in-memory only (lost on reload). No folder-based persistence, no directory handle, no Test Connection button.
- BackupIcon in top-right shows Connected/Connect File states with HardDrive icon.
- No bell icon in main UI showing notification status.
- Timer-done notification has no `vibrate` or sound configuration; uses generic tag `naksha-timer`.
- No data-mirroring failure detection when folder becomes unreachable.

## Requested Changes (Diff)

### Add
- **Bell Icon in main UI** (top-left or alongside BackupIcon): 3 states — grey (default/not-asked), red-slash (denied), glowing-green (granted + verified).
- **'Enable Timer Notifications' button** in Settings Notifications section: always visible, runs `Notification.requestPermission()` on click.
- **Custom Modal** shown when permission is denied/blocked: explains how to manually enable in Phone Settings > Apps > Naksha > Notifications.
- **'Test Notification' button** in Settings: triggers a 5-second countdown then fires a test notification to verify it works.
- **Vibrate and tag on timer-done**: service worker timer completion notification must include `vibrate: [200, 100, 200]` and `tag: 'timer-done'` (override, not stack).
- **Master Folder Anchor**: use `showDirectoryPicker()` to select a folder. Save `naksha_master_data.json` (and `variant_bank.json`) inside it. Store the directory handle in IndexedDB (via `IDBFileHandle` persistence). Re-link automatically on next load by verifying stored handle.
- **'Sync Status' Dashboard badge** in top-right (replaces current BackupIcon): 3 states — Red 'No Folder Linked', Green glowing 'Linked: [FolderName]', Rotating-sync 'Syncing' (appears 1s on every auto-save).
- **'Test Connection' button** in Settings > Data Management: writes a tiny test file to folder, deletes it, shows toast 'Storage Verified: All systems synced to [FolderName]'.
- **Shadow Copy in IndexedDB**: already implemented (saveSnapshotIDB). Add detection: on startup, if directory handle is stored but folder is unreachable, alert user 'Warning: Master Folder moved. Using Internal Backup.' and prompt to re-link.
- **UI Polish**: 'Select Folder' button glows when active (folder linked). High-contrast folder path display.

### Modify
- **SettingsScreen.tsx**: Update Notifications section to always show 'Enable Timer Notifications' button, add Test Notification button. Update Data Management section with Master Folder UI, Test Connection button, folder path display.
- **monarchStorage.ts**: Replace file-based (`showSaveFilePicker`) with folder-based (`showDirectoryPicker`). Persist directory handle in IndexedDB. Add `testConnection()`, `selectFolder()`, `getFolderName()`, `relinkFolder()` functions.
- **BackupIcon / StorageStatusBadge in App.tsx**: Replace current HardDrive/Link2 pill with new Sync Status dashboard badge: red/green/rotating states.
- **sw.js**: Add `vibrate: [200, 100, 200]` and `tag: 'timer-done'` to timer-done notification. Ensure TIMER_COMPLETE message fires completion notification with correct params.
- **indexedDB.ts**: Add `saveDirHandle()` and `getDirHandle()` functions for persisting directory handles via IndexedDB (note: only IDBFileHandle is possible via separate DB since File System Access handles can only be stored in IDB in some browsers).

### Remove
- Old 'Link File (naksha_data.json)' / 'Re-link File' button (replaced by 'Select Folder' flow).
- Legacy `showSaveFilePicker` code path in monarchStorage.ts.

## Implementation Plan
1. **indexedDB.ts** — Add `saveDirHandle()` / `getDirHandle()` using a `dirHandles` object store (IDB supports storing FileSystemDirectoryHandle natively).
2. **monarchStorage.ts** — Refactor to folder-based approach: `selectFolder()` opens `showDirectoryPicker`, saves handle to IDB and memory, writes to `naksha_master_data.json` in that folder. `tryRelinkFolder()` loads handle from IDB on startup, calls `queryPermission('readwrite')` to verify, returns true/false. `testConnection()` writes + deletes a test file. `getFolderName()` returns stored folder name.
3. **sw.js** — Add a `TIMER_COMPLETE` message handler that fires a completion notification with `vibrate: [200, 100, 200]`, `tag: 'timer-done'`, `renotify: true`, `requireInteraction: true`. Add 5-second test notification handler `TEST_NOTIFICATION`.
4. **App.tsx** — On startup call `tryRelinkFolder()`. If folder unreachable, show alert. Replace BackupIcon with `StorageStatusBadge` (new component). Add `BellStatusIcon` component.
5. **SettingsScreen.tsx** — Notifications section: add 'Enable Timer Notifications' button (always visible), 'Test Notification' button. Blocked-permission modal. Data Management: add 'Select Folder' / 'Change Folder' button, folder path display, 'Test Connection' button.
6. **BellPermissionModal.tsx** — New modal explaining manual phone settings path when permission is denied.
