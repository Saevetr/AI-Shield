import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const previewItems = [
  {
    icon: "analytics-outline",
    title: "進階風險分析",
    text: "未來將提供更完整的詐騙風險判讀與報告。",
  },
  {
    icon: "notifications-outline",
    title: "即時防詐提醒",
    text: "可疑訊息與高風險查詢結果將提供更即時的提醒。",
  },
  {
    icon: "shield-checkmark-outline",
    title: "強化保護工具",
    text: "更多黑名單、通報與防詐資料功能會陸續開放。",
  },
] as const;

export default function PremiumUnlockScreen() {
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
        <Text style={styles.headerTitle}>付費解鎖</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.container}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="construct-outline" size={42} color="#397bf2" />
          </View>
          <Text style={styles.title}>功能開發中</Text>
          <Text style={styles.subtitle}>
            進階方案正在整理中，完成後會提供更完整的防詐分析與保護工具。
          </Text>
        </View>

        <View style={styles.previewCard}>
          <Text style={styles.sectionTitle}>預計開放</Text>
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

        <TouchableOpacity
          style={styles.backHomeButton}
          onPress={() => router.back()}
          activeOpacity={0.82}
        >
          <Text style={styles.backHomeText}>返回</Text>
        </TouchableOpacity>
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
