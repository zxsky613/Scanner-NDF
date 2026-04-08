import { StyleSheet, Text, TextInput } from 'react-native';
import { Font } from '../config/fonts';

let applied = false;

type WithDefaultProps = {
  defaultProps?: { style?: unknown };
};

/** Police par défaut pour tout <Text /> et <TextInput /> (surchargée par les classes NativeWind). */
export function applyPoppinsAsDefaultText(): void {
  if (applied) return;
  applied = true;

  const base = { fontFamily: Font.regular };

  const T = Text as unknown as WithDefaultProps;
  const textPrev = T.defaultProps?.style;
  T.defaultProps = {
    ...T.defaultProps,
    style: StyleSheet.flatten([base, textPrev]),
  };

  const TI = TextInput as unknown as WithDefaultProps;
  const inputPrev = TI.defaultProps?.style;
  TI.defaultProps = {
    ...TI.defaultProps,
    style: StyleSheet.flatten([base, inputPrev]),
  };
}
