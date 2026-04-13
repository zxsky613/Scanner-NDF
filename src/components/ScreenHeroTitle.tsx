import React from 'react';
import { Platform, Text, type TextProps, type TextStyle } from 'react-native';
import { Font } from '../config/fonts';
import { theme } from '../config/theme';

type Props = TextProps & {
  className?: string;
  /** `hero` = onglets principaux ; `stack` = écrans empilés (nouvelle note, détail). */
  variant?: 'hero' | 'stack';
};

/** Titres héros web : une seule échelle typographique (Notes / Admin / Notifications / Réglages). */
const WEB_HERO_TITLE_STYLE: TextStyle = {
  fontFamily: Font.bold,
  fontSize: 24,
  lineHeight: 30,
  letterSpacing: -0.6,
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
        ? ''
        : 'text-3xl';

  const webHero = isWeb && variant === 'hero';

  const layoutClass = [sizeClass, webHero ? '' : 'font-bold leading-tight', className]
    .filter(Boolean)
    .join(' ');

  return (
    <Text
      className={layoutClass}
      style={[
        { color: theme.brandInk, letterSpacing: variant === 'stack' ? -0.4 : -0.6 },
        webHero ? WEB_HERO_TITLE_STYLE : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
};
