import AsyncStorage from '@react-native-async-storage/async-storage';

function storageKey(userId: string): string {
  return `@last_expense_project:${userId}`;
}

/** Dernier projet utilisé à la création d'une note (null = « Quotidien »). */
export async function getLastExpenseProjectId(userId: string): Promise<string | null | undefined> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (raw === null) return undefined;
    return raw === '' ? null : raw;
  } catch {
    return undefined;
  }
}

export async function setLastExpenseProjectId(
  userId: string,
  projectId: string | null
): Promise<void> {
  try {
    await AsyncStorage.setItem(storageKey(userId), projectId ?? '');
  } catch {
    /* ignore */
  }
}
