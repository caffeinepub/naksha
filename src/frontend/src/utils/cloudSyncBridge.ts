/**
 * Module-level bridge so useAutoSave can trigger cloud push
 * without creating a hook dependency cycle.
 */
let _pushFn: (() => void) | null = null;

export function registerCloudPush(fn: () => void): void {
  _pushFn = fn;
}

export function unregisterCloudPush(): void {
  _pushFn = null;
}

export function triggerCloudPush(): void {
  _pushFn?.();
}
