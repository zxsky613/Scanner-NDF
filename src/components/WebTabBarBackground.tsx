import React from 'react';
import { View, StyleSheet } from 'react-native';

/** Fond du menu latéral web — blanc cassé proche de la surface app. */
export function WebTabBarBackground() {
  return <View style={styles.root} pointerEvents="none" />;
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FAFBFD',
  },
});
