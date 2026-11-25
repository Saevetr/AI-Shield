import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/app-text";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { getCurrentUser } from "@/utils/auth";
import { getSavedProfile, saveProfile } from "@/utils/profile";

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || "https://ai-shield-m68d.onrender.com";

const previewItems = [
  {
    icon: "analytics-outline",
    title: "無限次 AI 語音多模態分析",
    text: "無限制使用 Google Gemini 深度辨識合成語音與詐騙截圖。",
  },
  {
    icon: "notifications-outline",
    title: "即時雲端高風險防詐預警",
    text: "可疑號碼與高風險資訊將提供第一時間專屬警示與推播。",
  },
  {
    icon: "shield-checkmark-outline",
    title: "全時專屬黑名單與社群防護",
    text: "享有個人黑名單極速雲端比對與防詐資料庫優先通道。",
  },
] as const;

export default function PremiumUnlockScreen() {
  const [isVip, setIsVip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<number | string>("");

  useEffect(() => {
    const loadStatus = async () => {
      const user = await getCurrentUser();
      const profile = await getSavedProfile();
      if (user?.user_id) setUserId(user.user_id);
      if (profile.membershipLevel === "VIP" || user?.membership_level === "VIP") {
        setIsVip(true);
      }
    };
    loadStatus();
  }, []);

  const handleUpgrade = async () => {
    if (isVip) {
      Alert.alert("已是 VIP 會員", "您目前已享有 VIP 全時守護功能！");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/auth/upgrade-vip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "開通失敗");
      }

      const currentProfile = await getSavedProfile();
      await saveProfile({ ...currentProfile, membershipLevel: "VIP" });
      setIsVip(true);

      Alert.alert("🎉 開通成功", "恭喜！您已成功升級為 VIP 守護會員，全站高階防詐功能已全面啟用！");
    } catch (err: any) {
      Alert.alert("開通失敗", err.message || "暫時無法開通 VIP，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <Ionicons name="chevron-back" size={34} color="#0d0d0d" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>VIP 防詐守護</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.container}>
        <View style={styles.heroCard}>
          <View style={[styles.heroIcon, isVip && { backgroundColor: "#fef3c7" }]}>
            <Ionicons
              name={isVip ? "ribbon" : "sparkles"}
              size={42}
              color={isVip ? "#d97706" : "#397bf2"}
            />
          </View>
          <Text style={styles.title}>{isVip ? "尊榮 VIP 會員中" : "升級 VIP 守護方案"}</Text>
          <Text style={styles.subtitle}>
            {isVip
              ? "您已享有專屬 AI 生物語音檢測、高階雲端黑名單與即時防詐預警。"
              : "立即開通全功能進階防護，守護您與家人的每一通通話與訊息。"}
          </Text>
        </View>

        <View style={styles.previewCard}>
          <Text style={styles.sectionTitle}>VIP 專屬特權</Text>
          {previewItems.map((item, index) => (
            <View
              key={item.title}
              style={[
                styles.previewRow,
                index === previewItems.length - 1 && styles.lastPreviewRow,
              ]}
            >
              <View style={styles.previewIcon}>
                <Ionicons name={item.icon} size={22} color="#397bf2" />
              </View>
              <View style={styles.previewTextWrap}>
                <Text style={styles.previewTitle}>{item.title}</Text>
                <Text style={styles.previewText}>{item.text}</Text>
              </View>
            </View>
          ))}
        </View>

        {!isVip ? (
          <TouchableOpacity
            style={[styles.backHomeButton, loading && { opacity: 0.7 }]}
            onPress={handleUpgrade}
            disabled={loading}
            activeOpacity={0.82}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.backHomeText}>立即免費開通 30 天 VIP 試用</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.backHomeButton, { backgroundColor: "#10b981" }]}
            onPress={() => router.back()}
            activeOpacity={0.82}
          >
            <Text style={styles.backHomeText}>✓ VIP 權益生效中・返回</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fbff",
  },
  header: {
    height: 66,
    backgroundColor: "#f8fbff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f7",
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 44,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 24,
  },
  heroCard: {
    borderRadius: 20,
    backgroundColor: "#ffffff",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 26,
    marginBottom: 14,
  },
  heroIcon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#edf4ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 8,
    letterSpacing: 1,
  },
  subtitle: {
    color: "#6c86aa",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  previewCard: {
    borderRadius: 18,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingTop: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 8,
    marginLeft: 2,
  },
  previewRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#edf1f6",
  },
  lastPreviewRow: {
    borderBottomWidth: 0,
  },
  previewIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#edf4ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  previewTextWrap: {
    flex: 1,
  },
  previewTitle: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 4,
  },
  previewText: {
    color: "#8a97a8",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  backHomeButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#397bf2",
    alignItems: "center",
    justifyContent: "center",
  },
  backHomeText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 2,
  },
});

