import type { NavigationProp, ParamListBase } from '@react-navigation/native';

/** Ouvre l’onglet Réglages (suppression de compte, langue, etc.) depuis une stack sous le tab principal. */
export function openSettingsTabFromNestedStack(navigation: NavigationProp<ParamListBase>): void {
  navigation.getParent()?.navigate('SettingsTab' as never);
}
