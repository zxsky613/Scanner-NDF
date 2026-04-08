export type AppAlertButton = {
  text: string;
  role?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

export type AppAlertPayload = {
  title: string;
  message: string;
  /** Affichage du titre (DA app). */
  variant?: 'default' | 'success' | 'error';
  /** Si défini, remplace le bouton « OK » unique. */
  buttons?: AppAlertButton[];
  /** Après fermeture (OK, fond ou Android back) — ex. navigation.goBack(). */
  afterClose?: () => void;
};

type Handler = (payload: AppAlertPayload) => void;

let handler: Handler | null = null;
const pending: AppAlertPayload[] = [];

function dispatch(payload: AppAlertPayload): void {
  if (handler) {
    handler(payload);
  } else {
    pending.push(payload);
  }
}

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

/**
 * Alerte une ou plusieurs actions, style app (pas de popup système iOS/Android).
 */
export function showAppAlert(
  title: string,
  message?: string,
  variant: AppAlertPayload['variant'] = 'default',
  afterClose?: () => void
): void {
  dispatch({
    title,
    message: message?.trim() ?? '',
    variant,
    afterClose,
  });
}

/** Deux boutons Annuler / Confirmer ; résolu une fois une option choisie. */
export function showAppConfirm(
  title: string,
  message: string,
  cancelText: string,
  confirmText: string,
  options?: { destructive?: boolean }
): Promise<boolean> {
  return new Promise(resolve => {
    dispatch({
      title,
      message: message.trim(),
      variant: options?.destructive ? 'error' : 'default',
      buttons: [
        {
          text: cancelText,
          role: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: confirmText,
          role: options?.destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
    });
  });
}
