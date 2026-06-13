import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { setLogin } from "@/utils/auth";

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
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      <Text style={styles.text}>LINE 登入處理中...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eef5ff",
  },
  text: {
    marginTop: 16,
    color: "#2f62b9",
    fontSize: 16,
    fontWeight: "700",
  },
});
