import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { StyleProp, StyleSheet, TextStyle } from "react-native";

export type AppFontSize = "small" | "medium" | "large";

const FONT_SIZE_STORAGE_KEY = "app_font_size";

const FONT_SIZE_MULTIPLIER: Record<AppFontSize, number> = {
  small: 0.95,
  medium: 1,
  large: 1.12,
};

export const FONT_SIZE_OPTIONS: { label: string; value: AppFontSize }[] = [
  { label: "小", value: "small" },
  { label: "中", value: "medium" },
  { label: "大", value: "large" },
];

const isAppFontSize = (value: string | null): value is AppFontSize => {
  return value === "small" || value === "medium" || value === "large";
};

export const getSavedFontSize = async (): Promise<AppFontSize> => {
  const savedFontSize = await AsyncStorage.getItem(FONT_SIZE_STORAGE_KEY);
  return isAppFontSize(savedFontSize) ? savedFontSize : "medium";
};

export const saveFontSize = async (fontSize: AppFontSize) => {
  await AsyncStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSize);
};

export const getFontScale = (fontSize: AppFontSize) => FONT_SIZE_MULTIPLIER[fontSize];

export const scaledTextStyle = (
  style: StyleProp<TextStyle>,
  fontSize: AppFontSize
): TextStyle | null => {
  const flattenedStyle = StyleSheet.flatten(style);

  if (!flattenedStyle?.fontSize || typeof flattenedStyle.fontSize !== "number") {
    return null;
  }

  const scale = getFontScale(fontSize);
  const nextStyle: TextStyle = {
    fontSize: Math.round(flattenedStyle.fontSize * scale),
  };

  if (typeof flattenedStyle.lineHeight === "number") {
    nextStyle.lineHeight = Math.round(flattenedStyle.lineHeight * scale);
  }

  return nextStyle;
};

type FontSizeContextValue = {
  fontSize: AppFontSize;
  setFontSize: (fontSize: AppFontSize) => Promise<void>;
};

const FontSizeContext = createContext<FontSizeContextValue>({
  fontSize: "medium",
  setFontSize: async () => {},
});

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSizeState] = useState<AppFontSize>("medium");

  useEffect(() => {
    const loadFontSize = async () => {
      setFontSizeState(await getSavedFontSize());
    };

    void loadFontSize();
  }, []);

  const value = useMemo<FontSizeContextValue>(
    () => ({
      fontSize,
      setFontSize: async (nextFontSize: AppFontSize) => {
        setFontSizeState(nextFontSize);
        await saveFontSize(nextFontSize);
      },
    }),
    [fontSize]
  );

  return <FontSizeContext.Provider value={value}>{children}</FontSizeContext.Provider>;
}

export const useFontSize = () => useContext(FontSizeContext);
