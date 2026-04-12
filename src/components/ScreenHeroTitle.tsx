import React from 'react';
import { Platform, Text, type TextProps } from 'react-native';
import { theme } from '../config/theme';

type Props = TextProps & {
  className?: string;
  /** `hero` = onglets principaux ; `stack` = écrans empilés (nouvelle note, détail). */
  variant?: 'hero' | 'stack';
};

/**
 * Titre d’écran — bleu marine marque #242949 (contraste net sur fond clair).
 */
export const ScreenHeroTitle: React.FC<Props> = ({
  children,
  className = '',
  variant = 'hero',
  style,
  ...rest
}) => {
  const isWeb = Platform.OS === 'web';
  const sizeClass =
    variant === 'stack'
      ? isWeb
        ? 'text-xl'
        : 'text-2xl'
      : isWeb
        ? 'text-2xl'
        : 'text-3xl';
  return (
    <Text
      className={`${sizeClass} font-bold leading-tight ${className}`}
      style={[
        { color: theme.brandInk, letterSpacing: variant === 'stack' ? -0.4 : -0.6 },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
};
