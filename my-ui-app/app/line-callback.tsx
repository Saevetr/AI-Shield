import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { setLogin } from "@/utils/auth";

export default function LineCallback() {
  const params = useLocalSearchParams<{
    status?: string;
    ticket?: string;
    message?: string;
  }>();
  const [message, setMessage] = useState("LINE 登入處理中...");
  const API_URL =
    process.env.EXPO_PUBLIC_API_URL || "https://ai-shield-m68d.onrender.com";

  useEffect(() => {
    let active = true;

    const finishLineLogin = async () => {
      try {
        if (params.status !== "success" || !params.ticket) {
          throw new Error(params.message || "LINE 登入已取消或失敗");
        }

        const response = await fetch(`${API_URL}/api/auth/line-login/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticket: params.ticket }),
        });
        const data = await response.json();

        if (!response.ok || data.success !== true) {
          throw new Error(data.message || "LINE 登入驗證失敗");
        }

        await setLogin(true);
        const storage = (globalThis as any).localStorage;

        if (storage) {
          storage.setItem("user", JSON.stringify(data.data || {}));
        }

        setMessage("LINE 登入成功，正在進入系統...");

        if (Platform.OS === "web" && (globalThis as any).location) {
          (globalThis as any).location.replace("/");
          return;
        }

        router.replace("/(tabs)");
      } catch (error) {
        if (!active) return;

        setMessage(error instanceof Error ? error.message : "LINE 登入失敗");
        setTimeout(() => {
          if (active) router.replace("/login");
        }, 1500);
      }
    };

    finishLineLogin();

    return () => {
      active = false;
    };
  }, [API_URL, params.message, params.status, params.ticket]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      <Text style={styles.text}>{message}</Text>
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

