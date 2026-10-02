/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-apps/
 */

import { Colors } from '@/constants/theme';
import { useColorapp } from '@/hooks/use-color-app';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorapp() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

