import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { setLogin } from "@/utils/auth";
import styles from "./styles";

export default function LineCallback() {
  const params = useLocalSearchParams();

  useEffect(() => {
    const finishLineLogin = async () => {
      if (params.status === "success") {
        await setLogin(true);
        router.replace("/(tabs)");
        return;
      }

      router.replace("/login");
    };

    finishLineLogin();
  }, [params.status]);

  return (
    <View style={styles.lineCallbackContainer}>
      <ActivityIndicator size="large" />
      <Text style={styles.lineCallbackText}>LINE 登入處理中...</Text>
    </View>
  );
}