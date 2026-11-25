import { useEffect } from "react";
import { Text } from "@/components/app-text";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { setLogin } from "@/utils/auth";

export default function LineCallback() {
  const params = useLocalSearchParams();
  const API_URL =
    process.env.EXPO_PUBLIC_API_URL || "https://ai-shield-m68d.onrender.com";

  useEffect(() => {
    const finishOAuthLogin = async () => {
      if (params.status === "success") {
        if (params.ticket) {
          try {
            const res = await fetch(`${API_URL}/api/auth/line-login/complete`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ticket: String(params.ticket) }),
            });
            const data = await res.json();
            if (data.success && data.data) {
              const globalObject = globalThis as any;
              if (globalObject.localStorage) {
                globalObject.localStorage.setItem("isLogin", "true");
                globalObject.localStorage.setItem("user", JSON.stringify(data.data));
              }
            }
          } catch (e) {
            console.warn("OAuth ticket completion error:", e);
          }
        }

        await setLogin(true);
        router.replace("/(tabs)");
        return;
      }

      router.replace("/login");
    };

    finishOAuthLogin();
  }, [params.status, params.ticket]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      <Text style={styles.text}>第三方授權登入處理中...</Text>
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


