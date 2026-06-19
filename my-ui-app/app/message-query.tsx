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

type RiskLevel = "high" | "medium" | "low";

type AnalysisResult = {
  level: RiskLevel;
  score: number;
  message: string;
  status: string;
  reason: string;
  matchedKeywords: any[];
  isScam: boolean;
};


const formatMatchedKeywords = (keywords: any[]) => {
  if (!Array.isArray(keywords)) {
    return "";
  }

  return keywords
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      return item?.keyword || item?.reason || "";
    })
    .filter(Boolean)
    .join("、");
};
const riskStyleMap: Record<
  RiskLevel,
  {
    title: string;
    color: string;
    background: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  high: {
    title: "高風險訊息",
    color: "#dc2626",
    background: "#fee2e2",
    icon: "warning",
  },
  medium: {
    title: "中風險訊息",
    color: "#f59e0b",
    background: "#fef3c7",
    icon: "alert-circle",
  },
  low: {
    title: "低風險訊息",
    color: "#16a34a",
    background: "#dcfce7",
    icon: "shield-checkmark",
  },
};

export default function MessageQueryScreen() {
  const [messageText, setMessageText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<AnalysisResult[]>([]);

  const handleAnalyze = async () => {
    const text = messageText.trim();

    if (text.length < 2) {
      Alert.alert("分析失敗", "請輸入要分析的訊息內容。");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("http://127.0.0.1:3000/api/analyze-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      const apiLevel =
        data.detail?.level ||
        data.data?.level ||
        data.level ||
        "low";

      const level: RiskLevel =
        apiLevel === "high" || apiLevel === "medium" || apiLevel === "low"
          ? apiLevel
          : "low";

      const nextResult: AnalysisResult = {
        level,
        score:
          Number(data.detail?.score || data.data?.score || data.score || 15),
        message:
          data.detail?.message ||
          data.data?.message ||
          data.message ||
          "分析完成。",
        status:
          data.detail?.status ||
          data.data?.status ||
          data.status ||
          "safe",
        reason:
          data.detail?.reason ||
          data.data?.reason ||
          data.reason ||
          "",
        matchedKeywords:
          data.detail?.matchedKeywords ||
          data.data?.matchedKeywords ||
          data.matchedKeywords ||
          [],
        isScam:
          data.isScam === true ||
          data.is_scam === true ||
          data.source === "database_found",
      };

      setResult(nextResult);
      setRecords((current) => [nextResult, ...current].slice(0, 3));
    } catch (error) {
      console.log("訊息分析錯誤：", error);
      Alert.alert("連線錯誤", "無法連接到伺服器，請確認後端已啟動。");
    } finally {
      setLoading(false);
    }
  };

  const currentStyle = result ? riskStyleMap[result.level] : null;
  const safeScore = result ? Math.min(100, Math.max(0, result.score)) : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={30} color="#111827" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>訊息分析</Text>

          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>請貼上可疑訊息</Text>

          <TextInput
            value={messageText}
            onChangeText={setMessageText}
            placeholder="例如：加入投資群組，保證獲利，穩賺不賠..."
            placeholderTextColor="#9ca3af"
            multiline
            style={styles.textArea}
          />

          <TouchableOpacity
            style={[styles.analyzeButton, loading && styles.analyzeButtonDisabled]}
            onPress={handleAnalyze}
            disabled={loading}
          >
            <Text style={styles.analyzeButtonText}>
              {loading ? "分析中..." : "開始分析"}
            </Text>
          </TouchableOpacity>
        </View>

        {result && currentStyle && (
          <View style={[styles.resultCard, { backgroundColor: currentStyle.background }]}>
            <View style={styles.resultHeader}>
              <Ionicons name={currentStyle.icon} size={40} color={currentStyle.color} />

              <View style={styles.resultTitleGroup}>
                <Text style={[styles.resultTitle, { color: currentStyle.color }]}>
                  {currentStyle.title}
                </Text>
                <Text style={styles.resultStatus}>狀態：{result.status}</Text>
              </View>
            </View>

            <View style={styles.scoreBox}>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>風險分數</Text>
                <Text style={[styles.scoreValue, { color: currentStyle.color }]}>
                  {safeScore}/100
                </Text>
              </View>

              <View style={styles.scoreTrack}>
                <View
                  style={[
                    styles.scoreFill,
                    {
                      width: `${safeScore}%`,
                      backgroundColor: currentStyle.color,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>分析結果</Text>
              <Text style={styles.infoText}>{result.message}</Text>

              {result.matchedKeywords.length > 0 && (
                <>
                  <Text style={styles.infoTitle}>命中關鍵字</Text>
                  <Text style={styles.infoText}>
                    {formatMatchedKeywords(result.matchedKeywords)}
                  </Text>
                </>
              )}

              <Text style={styles.infoTitle}>資料庫紀錄</Text>
              <Text style={styles.infoText}>
                {result.reason || "目前沒有命中資料庫中的高風險關鍵字。"}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>近期分析紀錄</Text>

          {records.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="document-text-outline" size={32} color="#9ca3af" />
              <Text style={styles.emptyText}>尚無分析紀錄</Text>
            </View>
          ) : (
            records.map((item, index) => {
              const itemStyle = riskStyleMap[item.level];

              return (
                <TouchableOpacity
                  key={`${item.status}-${index}`}
                  style={styles.recordRow}
                  onPress={() => setResult(item)}
                >
                  <Ionicons name={itemStyle.icon} size={22} color={itemStyle.color} />

                  <View style={styles.recordContent}>
                    <Text style={styles.recordTitle}>{itemStyle.title}</Text>
                    <Text style={styles.recordText} numberOfLines={1}>
                      {item.message}
                    </Text>
                  </View>

                  <Text style={[styles.recordScore, { color: itemStyle.color }]}>
                    {item.score}
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
    backgroundColor: "#f8fbff",
  },
  container: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  header: {
    height: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
  },
  headerSpacer: {
    width: 46,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  textArea: {
    minHeight: 150,
    borderWidth: 1,
    borderColor: "#d8e4f4",
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    color: "#111827",
    textAlignVertical: "top",
    backgroundColor: "#ffffff",
    outlineStyle: "none" as any,
  },
  analyzeButton: {
    height: 54,
    borderRadius: 15,
    backgroundColor: "#397bf2",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  analyzeButtonDisabled: {
    opacity: 0.6,
  },
  analyzeButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  resultCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  resultTitleGroup: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: "900",
  },
  resultStatus: {
    marginTop: 4,
    color: "#4b5563",
    fontSize: 13,
    fontWeight: "700",
  },
  scoreBox: {
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  scoreLabel: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "800",
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: "900",
  },
  scoreTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
  },
  scoreFill: {
    height: "100%",
    borderRadius: 4,
  },
  infoBox: {
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 14,
    padding: 14,
  },
  infoTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 8,
    marginBottom: 6,
  },
  infoText: {
    color: "#4b5563",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 20,
  },
  historyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
  },
  historyTitle: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 12,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 28,
  },
  emptyText: {
    color: "#9ca3af",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#eef2f7",
    gap: 10,
  },
  recordContent: {
    flex: 1,
  },
  recordTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
  },
  recordText: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
  recordScore: {
    fontSize: 14,
    fontWeight: "900",
  },
});



