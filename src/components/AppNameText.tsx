import React from 'react';
import { Text, type TextProps } from 'react-native';
import { Font } from '../config/fonts';

type Props = TextProps & {
  className?: string;
};

/**
 * Nom d’app (DABAR's) : Space Grotesk Bold (700), aligné sur le logo.
 */
export const AppNameText: React.FC<Props> = ({ className, style, children, ...rest }) => (
  <Text className={className} style={[{ fontFamily: Font.wordmark }, style]} {...rest}>
    {children}
  </Text>
);
