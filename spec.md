# Naksha

## Current State
The `BackupIcon` in `App.tsx` (top-right corner) is a static, non-interactive display element. It:
- Returns null when no file is linked (`status === "no-file"`) — invisible before a file is connected
- Only shows a HardDrive icon with color states (green/amber/red)
- Has no click handler
- The import/link file functionality lives only in Settings → Data Management

## Requested Changes (Diff)

### Add
- A clickable top-corner button that is **always visible** (even before a file is linked)
- When no file is linked: button shows a plug/link icon with label "Connect File" (subtle unlinked state)
- When a file is linked: button shows "Connected" with green glow indicator
- Click behavior:
  - If no file linked → call `linkFile()` to open the file picker
  - If file is linked → immediately save progress to the same file (call `triggerFullSync()`)
- Visual feedback: brief "Saved ✓" confirmation after saving

### Modify
- `BackupIcon` component in `App.tsx`: transform from static icon to a fully interactive pill button
- Expose `triggerFullSync` and `linkFile` via `BackupContext` to the top-corner button
- The button needs `fileLinked` state awareness — add a `linkFileAndConnect` method to BackupContext or handle in the component by calling `linkFile()` + `triggerSync()` directly

### Remove
- The `if (status === "no-file") return null` early exit (button must always be visible)

## Implementation Plan
1. Update `BackupContext` to expose `fileLinked` state and a `linkFileAndSync` action
2. Rewrite `BackupIcon` in `App.tsx` as an interactive pill button with two states: unlinked and linked
3. Clicking when unlinked → calls `linkFileAndSync` (opens picker, then syncs)
4. Clicking when linked → calls `triggerFullSync` (saves immediately, shows confirmation)
5. Keep the existing HardDrive icon pulse animation for save confirmation
