import * as Haptics from "expo-haptics";
import { Pressable } from "react-native";

export function HapticTab(props: any) {
  const { onPressIn, ...pressableProps } = props;

  return (
    <Pressable
      {...pressableProps}
      onPressIn={(event) => {
        if (process.env.EXPO_OS === "ios") {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPressIn?.(event);
      }}
    />
  );
}
