import React from 'react';
import { Image, View } from 'react-native';

import { theme } from '../config/theme';

const LOGO = require('../../assets/logo.png');

type Props = {
  /** Taille du carré d’affichage (px). */
  size?: number;
};

/**
 * Logo marque (icône d’app / écrans auth).
 */
export const BrandLogo: React.FC<Props> = ({ size = 96 }) => (
  <View
    className="rounded-[22px] overflow-hidden bg-white border border-gray-100"
    style={{
      width: size,
      height: size,
      shadowColor: theme.brandPrimary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 14,
      elevation: 6,
    }}
  >
    <Image source={LOGO} style={{ width: size, height: size }} resizeMode="contain" />
  </View>
);
