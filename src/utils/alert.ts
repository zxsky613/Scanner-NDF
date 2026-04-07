export type AppAlertPayload = { title: string; message: string };

type Handler = (payload: AppAlertPayload) => void;

let handler: Handler | null = null;
const pending: AppAlertPayload[] = [];

/** Called once on app mount by `AppAlertModalHost`. */
export function registerAppAlertHandler(next: Handler | null): void {
  handler = next;
  if (next) {
    while (pending.length > 0) {
      const p = pending.shift()!;
      next(p);
    }
  }
}

/** Single-button alert styled by the app (replaces browser `alert` / native `Alert`). */
export function showAppAlert(title: string, message?: string): void {
  const payload: AppAlertPayload = {
    title,
    message: message?.trim() ?? '',
  };
  if (handler) {
    handler(payload);
  } else {
    pending.push(payload);
  }
}
