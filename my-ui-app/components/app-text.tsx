import { getFontScale, useFontSize } from "@/utils/fontSize";
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from "react-native";

const getScaledStyle = (
  style: TextProps["style"] | TextInputProps["style"],
  scale: number
): TextStyle | undefined => {
  const flattened = StyleSheet.flatten(style) as TextStyle | undefined;

  if (!flattened) {
    return undefined;
  }

  return {
    ...flattened,
    ...(typeof flattened.fontSize === "number"
      ? { fontSize: Math.round(flattened.fontSize * scale) }
      : null),
    ...(typeof flattened.lineHeight === "number"
      ? { lineHeight: Math.round(flattened.lineHeight * scale) }
      : null),
  };
};

export function Text({ style, ...props }: TextProps) {
  const { fontSize } = useFontSize();
  return <NativeText {...props} style={getScaledStyle(style, getFontScale(fontSize))} />;
}

export function TextInput({ style, ...props }: TextInputProps) {
  const { fontSize } = useFontSize();
  return <NativeTextInput {...props} style={getScaledStyle(style, getFontScale(fontSize))} />;
}
