# Naksha — Performance & Immersive UI Refactor (V20)

## Current State
- manifest.json uses `display: "standalone"` — Android nav buttons remain visible
- HeaderBar renders the "Naksha 🧭" wordmark AND the Internet Identity login/logout button on every tab
- SplashScreen loads a 512px PNG icon and waits a fixed 1400ms before starting fade; app waits for full data init before dismissing splash
- Tab sliding animations have no GPU acceleration hints
- TopicsScreen renders all topic cards regardless of visibility (no virtualization)
- Master folder handle stored in IndexedDB (good) but localStorage key still checked first for folder name on boot
- index.html has `display: "standalone"` via manifest — no fullscreen
- CSS animations lack `will-change` and `backface-visibility`

## Requested Changes (Diff)

### Add
- `display: "fullscreen"` and `"fullscreen"` at top of `display_override` array in manifest.json
- `orientation: "portrait"` to manifest.json (already present but verify)
- SVG inline logo for SplashScreen (replaces PNG img tag) — no network request, loads in <5ms
- Progressive loading: SplashScreen calls `onDone` as soon as core UI shell signals readiness (via a `onShellReady` prop/callback), not after a fixed timer
- GPU acceleration CSS: `will-change: transform`, `backface-visibility: hidden`, `transform: translateZ(0)` on `.page-enter`, `.splash-screen`, `.slide-*`, and BottomNav items
- Virtual/windowed rendering for TopicsScreen: only render topic cards currently in the visible scroll window (simple intersection-observer or index-based slicing with scroll handler)
- `NakshaWordmark` component — a centered, minimalist wordmark shown only on Home and Topics tabs inside their respective screen bodies
- Login/Logout buttons + principal display moved fully into SettingsScreen under a new "Account" section at the top
- IndexedDB-first boot for folder handle: `getDirHandle()` called before any localStorage reads for folder name; cache folder name in IDB metadata key

### Modify
- `HeaderBar` in App.tsx: remove "Naksha 🧭" name, remove Internet Identity login/logout pill and principal display entirely. Keep only the `RefreshCw` sync icon (visible only when saving).
- `SplashScreen.tsx`: replace `<img src="/icon-512.png">` with an inline SVG that represents the compass/orbit icon; trigger fade as soon as `onDone` is called by parent (parent calls it on shell-ready signal, not after 2s fixed timeout)
- `App.tsx` AppInner: call `setSplashDone(true)` immediately once the React tree has mounted (useEffect with no dependencies, or when `dataReady` flips — do NOT wait for DB sync). Splash fades, data loading continues in background behind the live UI.
- `index.css`: add global GPU acceleration rules for all animated elements; add `will-change: transform; backface-visibility: hidden` to `.page-enter`, `.splash-screen.hiding`, `.slide-*` keyframes
- `HomeScreen.tsx`: add `NakshaWordmark` centered at top of screen content (above the clock)
- `TopicsScreen.tsx`: add simple virtual list — maintain a visible window of N+buffer items based on scroll position; unmount cards outside window
- SettingsScreen: add "Account" section at the very top (above Profile) containing the full II login/logout UI (currently duplicated in HeaderBar)

### Remove
- Internet Identity login/logout button from `HeaderBar` in App.tsx
- "Naksha 🧭" name text from `HeaderBar` in App.tsx  
- Fixed 2-second splash timer as the sole dismiss trigger (replace with shell-ready event)
- PNG `<img>` from SplashScreen (replace with inline SVG)

## Implementation Plan

1. **manifest.json** — change `display` to `"fullscreen"`, put `"fullscreen"` first in `display_override`
2. **SplashScreen.tsx** — replace PNG img with inline SVG compass icon; accept `onDone` from parent which is now called on shell-ready, not after a fixed timer. Keep the glow ring and fade-out animation.
3. **App.tsx (AppInner)** — call `setSplashDone(true)` via `useEffect(()=>{setSplashDone(true)}, [])` so splash dismisses as soon as React mounts (the data-loading overlay behind the UI handles the rest). Remove II login from HeaderBar. Slim HeaderBar to sync-icon only.
4. **App.tsx (HeaderBar)** — remove Naksha wordmark text, remove II login/logout buttons entirely.
5. **HomeScreen.tsx** — add a centered `NakshaWordmark` div (text: "Naksha", elegant minimal styling) near the top of the content column, above the clock.
6. **TopicsScreen.tsx** — add scroll-position-aware virtual rendering: track `scrollTop` on the scroll container, compute visible index range, only mount cards within range + 3 card overscan buffer. Use a spacer div for off-screen items to maintain scroll height.
7. **SettingsScreen.tsx** — add an "Account" section at the top with full II login/logout UI (principal display, login button, logout, cloud sync status). This is a relocation, not new code.
8. **index.css** — add: `.page-enter { will-change: transform; backface-visibility: hidden; transform: translateZ(0); }` and apply same to splash, slide animations, bottom nav transitions.
9. **indexedDB.ts** — add `saveFolderName(name: string)` and `getFolderName(): Promise<string|null>` helpers using the existing `dirHandles` store (add `name` field alongside handle); boot sequence reads folder name from IDB first.
