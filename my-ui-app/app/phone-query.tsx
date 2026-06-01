import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type RiskLevel = "low" | "medium" | "high";

type QueryResult = {
  phone: string;
  carrier: string;
  level: RiskLevel;
  score: number;
  message: string;
  isScam: boolean;
};

const styleMap: Record<
  RiskLevel,
  {
    title: string;
    color: string;
    bg: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  low: {
    title: "低風險",
    color: "#16a34a",
    bg: "#dcfce7",
    icon: "shield-checkmark-outline",
  },
  medium: {
    title: "中風險",
    color: "#f59e0b",
    bg: "#fef3c7",
    icon: "warning-outline",
  },
  high: {
    title: "高風險",
    color: "#dc2626",
    bg: "#fee2e2",
    icon: "alert-circle-outline",
  },
};

export default function PhoneQueryScreen() {
  const [phone, setPhone] = useState("");
  const [records, setRecords] = useState<QueryResult[]>([]);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);

  const queryPhone = async (targetPhone: string) => {
    const normalizedPhone = targetPhone.replace(/\D/g, "");

    if (normalizedPhone.length < 6) {
      Alert.alert("查詢失敗", "請輸入有效電話號碼");
      return;
    }

    try {
      setLoading(true);

      const backendUrl = `http://localhost:3000/api/check-phone?phone=${normalizedPhone}`;
      const res = await fetch(backendUrl);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      const isScam =
        data.isScam === true ||
        data.is_scam === true ||
        data.status === "scam" ||
        data.data?.isScam === true ||
        data.detail?.isScam === true;

      const level: RiskLevel = isScam ? "high" : "low";

      const result: QueryResult = {
        carrier:
          data.detail?.carrier ||
          data.data?.carrier ||
          data.carrier ||
          "未知電信",
        level,
        phone: normalizedPhone,
        score:
          data.detail?.score ||
          data.data?.score ||
          data.score ||
          (isScam ? 88 : 15),
        message:
          data.detail?.message ||
          data.data?.message ||
          data.message ||
          (isScam
            ? "注意！此號碼有疑似詐騙紀錄。"
            : "安全！目前資料庫中無此號碼紀錄。"),
        isScam,
      };

      setQueryResult(result);

      setRecords((prev) => {
        const filtered = prev.filter((item) => item.phone !== normalizedPhone);
        return [result, ...filtered].slice(0, 5);
      });
    } catch (error) {
      console.log("電話查詢錯誤：", error);
      Alert.alert("連線錯誤", "無法連接到伺服器，請確認後端已啟動。");
    } finally {
      setLoading(false);
    }
  };

  const handleQuery = () => {
    queryPhone(phone);
  };

  const handleHistoryPress = (savedPhone: string) => {
    setPhone(savedPhone);
    queryPhone(savedPhone);
  };

  const currentStyle = queryResult ? styleMap[queryResult.level] : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </TouchableOpacity>

          <View>
            <Text style={styles.headerTitle}>電話查詢</Text>
            <Text style={styles.headerSubtitle}>查詢來電號碼是否具有風險</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>請輸入電話號碼</Text>

          <View style={styles.inputWrapper}>
            <Ionicons name="call-outline" size={22} color="#6b7280" />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="例如：0912345678"
              keyboardType="phone-pad"
              style={styles.input}
              placeholderTextColor="#9ca3af"
            />
          </View>

          <TouchableOpacity
            style={[styles.queryButton, loading && styles.queryButtonDisabled]}
            onPress={handleQuery}
            disabled={loading}
          >
            <Text style={styles.queryButtonText}>
              {loading ? "查詢中..." : "開始查詢"}
            </Text>
          </TouchableOpacity>
        </View>

        {queryResult && currentStyle && (
          <View style={[styles.resultCard, { backgroundColor: currentStyle.bg }]}>
            <View style={styles.resultHeader}>
              <Ionicons
                name={currentStyle.icon}
                size={34}
                color={currentStyle.color}
              />

              <View style={styles.resultTitleBox}>
                <Text style={[styles.resultTitle, { color: currentStyle.color }]}>
                  {currentStyle.title}
                </Text>
                <Text style={styles.resultPhone}>{queryResult.phone}</Text>
              </View>
            </View>

            <View style={styles.resultInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>電信業者</Text>
                <Text style={styles.infoValue}>{queryResult.carrier}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>風險分數</Text>
                <Text style={styles.infoValue}>{queryResult.score}</Text>
              </View>

              <View style={styles.messageBox}>
                <Text style={styles.messageText}>{queryResult.message}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.historyCard}>
          <Text style={styles.sectionTitle}>查詢紀錄</Text>

          {records.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="time-outline" size={28} color="#9ca3af" />
              <Text style={styles.emptyText}>尚無查詢紀錄</Text>
            </View>
          ) : (
            records.map((item) => {
              const itemStyle = styleMap[item.level];

              return (
                <TouchableOpacity
                  key={item.phone}
                  style={styles.historyItem}
                  onPress={() => handleHistoryPress(item.phone)}
                >
                  <View style={styles.historyLeft}>
                    <Ionicons
                      name={itemStyle.icon}
                      size={22}
                      color={itemStyle.color}
                    />
                    <View>
                      <Text style={styles.historyPhone}>{item.phone}</Text>
                      <Text style={styles.historyCarrier}>{item.carrier}</Text>
                    </View>
                  </View>

                  <Text style={[styles.historyLevel, { color: itemStyle.color }]}>
                    {itemStyle.title}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#6b7280",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "#f9fafb",
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    fontSize: 16,
    color: "#111827",
    outlineStyle: "none" as any,
  },
  queryButton: {
    marginTop: 14,
    backgroundColor: "#2563eb",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  queryButtonDisabled: {
    opacity: 0.6,
  },
  queryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  resultCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  resultTitleBox: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: "900",
  },
  resultPhone: {
    marginTop: 4,
    fontSize: 15,
    color: "#374151",
  },
  resultInfo: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 14,
    padding: 14,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  messageBox: {
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.08)",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#374151",
  },
  historyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 14,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 28,
  },
  emptyText: {
    marginTop: 8,
    color: "#9ca3af",
    fontSize: 14,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  historyLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  historyPhone: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  historyCarrier: {
    marginTop: 2,
    fontSize: 12,
    color: "#6b7280",
  },
  historyLevel: {
    fontSize: 13,
    fontWeight: "800",
  },
});