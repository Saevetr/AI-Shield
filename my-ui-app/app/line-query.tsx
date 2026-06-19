import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type RiskLevel = "high" | "medium" | "low";

type QueryResult = {
  lineId: string;
  level: RiskLevel;
  score: number;
  message: string;
  status: string;
  reason: string;
  isScam: boolean;
};

type QueryRecord = {
  lineId: string;
  result: string;
  time: string;
  data: QueryResult;
};

const riskStyleMap = {
  high: {
    accent: "#dc2f38",
    background: "#ffe4e7",
    label: "高風險帳號",
    message: "多位用戶回報，請勿匯款或加入群組",
    scoreText: "高風險",
  },
  medium: {
    accent: "#f6a21a",
    background: "#fff4d8",
    label: "中風險帳號",
    message: "帳號有可疑互動紀錄，建議先查證",
    scoreText: "中風險",
  },
  low: {
    accent: "#12c735",
    background: "#e6f7ee",
    label: "低風險帳號",
    message: "尚無警示，注意聊天內容與交易安全",
    scoreText: "低風險",
  },
} satisfies Record<
  RiskLevel,
  {
    accent: string;
    background: string;
    label: string;
    message: string;
    scoreText: string;
  }
>;

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || "http://192.168.18.12:3000";

export default function LineQueryScreen() {
  const [lineId, setLineId] = useState("");
  const [records, setRecords] = useState<QueryRecord[]>([]);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);

  const queryLineId = async (targetLineId: string) => {
    const normalizedLineId = targetLineId.trim();

    if (!/^[A-Za-z0-9._@-]{3,}$/.test(normalizedLineId)) {
      Alert.alert(
        "查詢失敗",
        "請輸入完整 LINE ID，至少 3 個字元，可包含英文、數字、底線、句點、@ 或連字號。"
      );
      return;
    }

    try {
      setLoading(true);

      const backendUrl = `${API_BASE}/api/check-line?lineId=${encodeURIComponent(
        normalizedLineId
      )}`;

      const res = await fetch(backendUrl);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      const isScam =
        data.isScam === true ||
        data.is_scam === true ||
        data.status === "危險帳號" ||
        data.source === "database_found" ||
        data.data?.isScam === true ||
        data.detail?.isScam === true;

      let level: RiskLevel = "low";

      const apiLevel =
        data.detail?.level ||
        data.data?.level ||
        data.level;

      if (apiLevel === "high" || apiLevel === "medium" || apiLevel === "low") {
        level = apiLevel;
      } else {
        level = isScam ? "high" : "low";
      }

      const scoreValue =
        data.detail?.score ||
        data.data?.score ||
        data.score ||
        (isScam ? 88 : 15);

      const result: QueryResult = {
        lineId:
          data.detail?.lineId ||
          data.data?.lineId ||
          data.lineId ||
          data.line_id ||
          normalizedLineId,
        level,
        score: Number(scoreValue),
        message:
          data.detail?.message ||
          data.data?.message ||
          data.message ||
          (isScam
            ? "注意！此 LINE ID 有疑似詐騙紀錄。"
            : "安全！目前資料庫中無此 LINE ID 紀錄。"),
        status:
          data.detail?.status ||
          data.data?.status ||
          data.status ||
          (isScam ? "危險帳號" : "safe"),
        reason:
          data.detail?.reason ||
          data.data?.reason ||
          data.reason ||
          "",
        isScam,
      };

      const riskStyle = riskStyleMap[result.level];

      const nextRecord: QueryRecord = {
        lineId: result.lineId,
        result: riskStyle.label,
        time: new Date().toLocaleTimeString("zh-TW", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        data: result,
      };

      setRecords((currentRecords) => {
        const filtered = currentRecords.filter(
          (record) => record.lineId !== result.lineId
        );

        return [nextRecord, ...filtered].slice(0, 3);
      });

      setQueryResult(result);
    } catch (error) {
      console.log("LINE ID 查詢錯誤：", error);
      Alert.alert("連線錯誤", "無法連接到伺服器，請確認後端已啟動。");
    } finally {
      setLoading(false);
    }
  };

  const handleQuery = () => {
    queryLineId(lineId);
  };

  const handleBack = () => {
  
  if (queryResult) {
      setQueryResult(null);
      return;
    }

    router.back();
  };
  const showMessage = (title: string, message: string) => {
    const globalObject = globalThis as any;

    if (typeof globalObject.alert === "function") {
      globalObject.alert(`${title}\n${message}`);
      return;
    }

    Alert.alert(title, message);
  };

  const handleAddToBlacklist = async () => {
    console.log("ADD BLACKLIST BUTTON CLICKED");

    if (!queryResult) {
      showMessage("加入失敗", "目前沒有 LINE 查詢結果。");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/blacklist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lineId: queryResult.lineId,
          reason: queryResult.reason || "使用者手動加入黑名單",
        }),
      });

      const rawText = await res.text();

      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        data = {};
      }

      console.log("ADD BLACKLIST RESULT:", data || rawText);

      if (!res.ok || data.success === false) {
        throw new Error(data.message || `HTTP ${res.status}`);
      }

      showMessage("已加入黑名單", `${queryResult.lineId} 已加入黑名單。`);
    } catch (error: any) {
      console.log("加入黑名單失敗：", error);
      showMessage("加入失敗", error?.message || "無法加入黑名單。");
    }
  };

  const handleReportLine = async () => {
    console.log("REPORT LINE BUTTON CLICKED");

    if (!queryResult) {
      showMessage("通報失敗", "目前沒有 LINE 查詢結果。");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/report-line`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lineId: queryResult.lineId,
          reason: queryResult.reason || "使用者通報 LINE ID",
          userId: 5,
        }),
      });

      const rawText = await res.text();

      let data: any = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        data = {};
      }

      console.log("REPORT LINE RESULT:", data || rawText);

      if (!res.ok || data.success === false) {
        throw new Error(data.message || `HTTP ${res.status}`);
      }

      showMessage("已送出通報", "感謝你的回報，我們會持續更新風險資料。");
    } catch (error: any) {
      console.log("通報失敗：", error);
      showMessage("通報失敗", error?.message || "無法送出通報。");
    }
  };



  if (queryResult) {
    const riskStyle = riskStyleMap[queryResult.level];
    const safeScore = Math.min(100, Math.max(0, queryResult.score));

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.resultScreen}>
          <View style={styles.resultHeader}>
            <TouchableOpacity
              style={styles.resultBackButton}
              onPress={handleBack}
              activeOpacity={0.75}
            >
              <Ionicons name="chevron-back" size={36} color="#0d0d0d" />
            </TouchableOpacity>

            <Text style={styles.resultHeaderTitle}>查詢結果</Text>
            <View style={styles.resultHeaderSpacer} />
          </View>

          <ScrollView
            contentContainerStyle={styles.resultContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.riskBanner, { backgroundColor: riskStyle.background }]}>
              <Ionicons name="warning" size={52} color={riskStyle.accent} />

              <View style={styles.riskBannerText}>
                <Text style={[styles.riskTitle, { color: riskStyle.accent }]}>
                  {riskStyle.label}
                </Text>
                <Text style={styles.riskSubtitle}>
                  {queryResult.message || riskStyle.message}
                </Text>
              </View>
            </View>

            <View style={styles.lineIdentity}>
              <View style={styles.avatar}>
                <View style={styles.avatarHead} />
                <View style={styles.avatarBody} />
              </View>

              <View style={styles.lineInfo}>
                <Text style={styles.resultValue}>{queryResult.lineId}</Text>
                <Text style={styles.resultMeta}>LINE ID</Text>
              </View>
            </View>

            <View style={[styles.resultCard, styles.scoreCard]}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.resultCardTitle}>風險評分</Text>
                <Text style={[styles.scoreText, { color: riskStyle.accent }]}>
                  {safeScore}/100
                </Text>
              </View>

              <View style={styles.scoreTrack}>
                <View
                  style={[
                    styles.scoreFill,
                    {
                      backgroundColor: riskStyle.accent,
                      width: `${safeScore}%`,
                    },
                  ]}
                />
              </View>

              <Text style={styles.scoreDescription}>
                判斷結果：{riskStyle.scoreText}
              </Text>
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultCardTitle}>風險資訊</Text>
              <Text style={styles.resultCardText}>
                {queryResult.message || riskStyle.message}
              </Text>
              <Text style={styles.resultCardText}>
                狀態：{queryResult.status}
              </Text>
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultCardTitle}>資料庫紀錄</Text>
              <Text style={styles.resultCardText}>
                {queryResult.reason
                  ? queryResult.reason
                  : queryResult.isScam
                  ? "資料庫中有此 LINE ID 的風險紀錄。"
                  : "目前資料庫中沒有此 LINE ID 的風險紀錄。"}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.actionBar}>
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={handleAddToBlacklist}
              activeOpacity={0.82}
            >
              <Text style={styles.secondaryActionText}>加入黑名單</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reportAction}
              onPress={handleReportLine}
              activeOpacity={0.82}
            >
              <Text style={styles.reportActionText}>我要通報</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.75}>
          <Ionicons name="chevron-back" size={36} color="#0d0d0d" />
        </TouchableOpacity>

        <View style={styles.queryCard}>
          <View style={styles.iconCircle}>
            <Image
              source={require("@/assets/images/line.png")}
              style={styles.lineIcon}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>輸入 LINE ID</Text>
          <Text style={styles.subtitle}>查詢帳號是否可能涉及詐騙風險</Text>

          <View style={styles.inputWrap}>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#7b91b3" />
            <TextInput
              style={styles.input}
              placeholder="請輸入完整 LINE ID"
              placeholderTextColor="#9aacc8"
              autoCapitalize="none"
              autoCorrect={false}
              value={lineId}
              onChangeText={setLineId}
            />

            {lineId.length > 0 ? (
              <TouchableOpacity onPress={() => setLineId("")} activeOpacity={0.75}>
                <Ionicons name="close-circle" size={20} color="#b8c5d8" />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.queryButton, loading && styles.queryButtonDisabled]}
            onPress={handleQuery}
            activeOpacity={0.84}
            disabled={loading}
          >
            <Text style={styles.queryButtonText}>
              {loading ? "查詢中..." : "立即查詢"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tipCard}>
          <Ionicons name="alert-circle-outline" size={24} color="#397bf2" />

          <View style={styles.tipTextGroup}>
            <Text style={styles.tipTitle}>查詢提醒</Text>
            <Text style={styles.tipText}>
              陌生帳號要求加入投資群、購買點數或私下匯款時，請先確認身分。
            </Text>
          </View>
        </View>

        <View style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>查詢紀錄</Text>
            <Text style={styles.historyMore}>查看全部 &gt;</Text>
          </View>

          {records.length > 0 ? (
            records.map((record) => (
              <TouchableOpacity
                key={`${record.lineId}-${record.time}`}
                style={styles.recordRow}
                onPress={() => setQueryResult(record.data)}
                activeOpacity={0.78}
              >
                <View style={styles.recordIcon}>
                  <Image
                    source={require("@/assets/images/line.png")}
                    style={styles.recordLineIcon}
                    resizeMode="contain"
                  />
                </View>

                <View style={styles.recordContent}>
                  <Text style={styles.recordValue}>{record.lineId}</Text>
                  <Text style={styles.recordResult}>{record.result}</Text>
                </View>

                <Text style={styles.recordTime}>{record.time}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={32} color="#b8c5d8" />
              <Text style={styles.emptyTitle}>尚無查詢紀錄</Text>
              <Text style={styles.emptyText}>查詢後會在這裡保留最近 3 筆紀錄。</Text>
            </View>
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
  scrollContent: {
    flexGrow: 1,
    backgroundColor: "#f8fbff",
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    marginLeft: -8,
  },
  queryCard: {
    borderRadius: 24,
    backgroundColor: "#ffffff",
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 18,
    alignItems: "center",
    shadowColor: "#9bb6d9",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 4,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#edfdf3",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  lineIcon: {
    width: 44,
    height: 44,
  },
  title: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 5,
  },
  subtitle: {
    color: "#7b91b3",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 18,
  },
  inputWrap: {
    width: "100%",
    height: 54,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8e4f4",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 9,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
  },
  queryButton: {
    width: "100%",
    height: 52,
    borderRadius: 15,
    backgroundColor: "#397bf2",
    alignItems: "center",
    justifyContent: "center",
  },
  queryButtonDisabled: {
    opacity: 0.6,
  },
  queryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    backgroundColor: "#eaf2ff",
    padding: 14,
    marginTop: 14,
  },
  tipTextGroup: {
    flex: 1,
  },
  tipTitle: {
    color: "#1c4fba",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 3,
  },
  tipText: {
    color: "#607697",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  historyCard: {
    minHeight: 230,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 16,
    marginTop: 16,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  historyTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "800",
  },
  historyMore: {
    color: "#5e7190",
    fontSize: 12,
    fontWeight: "800",
  },
  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#eef2f7",
    paddingVertical: 13,
  },
  recordIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#eefaf1",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  recordLineIcon: {
    width: 18,
    height: 18,
  },
  recordContent: {
    flex: 1,
  },
  recordValue: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "800",
  },
  recordResult: {
    color: "#7b91b3",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  recordTime: {
    color: "#9aacc8",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyState: {
    flex: 1,
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "#eef2f7",
  },
  emptyTitle: {
    color: "#5e7190",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 8,
  },
  emptyText: {
    color: "#9aacc8",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  resultScreen: {
    flex: 1,
    backgroundColor: "#f8fbff",
  },
  resultHeader: {
    height: 66,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  resultBackButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  resultHeaderTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
  },
  resultHeaderSpacer: {
    width: 48,
  },
  resultContent: {
    paddingHorizontal: 8,
    paddingBottom: 112,
  },
  riskBanner: {
    minHeight: 72,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  riskBannerText: {
    flex: 1,
    marginLeft: 14,
  },
  riskTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 5,
  },
  riskSubtitle: {
    color: "#8a97a8",
    fontSize: 11,
    fontWeight: "700",
  },
  lineIdentity: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#d9e0ee",
    overflow: "hidden",
    alignItems: "center",
    marginRight: 16,
  },
  avatarHead: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#8193b1",
    marginTop: 9,
  },
  avatarBody: {
    width: 62,
    height: 34,
    borderRadius: 31,
    backgroundColor: "#8193b1",
    marginTop: 6,
  },
  lineInfo: {
    minWidth: 90,
  },
  resultValue: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  resultMeta: {
    color: "#8aa4c5",
    fontSize: 12,
    fontWeight: "700",
  },
  resultCard: {
    minHeight: 112,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    marginBottom: 12,
  },
  scoreCard: {
    borderWidth: 1.5,
    borderColor: "#8fa5c5",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  resultCardTitle: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "900",
  },
  scoreText: {
    fontSize: 13,
    fontWeight: "900",
  },
  scoreTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#edf1f6",
    overflow: "hidden",
    marginBottom: 10,
  },
  scoreFill: {
    height: "100%",
    borderRadius: 4,
  },
  scoreDescription: {
    color: "#7b8794",
    fontSize: 12,
    fontWeight: "700",
  },
  resultCardText: {
    color: "#607697",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 19,
    marginTop: 14,
  },
  actionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 18,
    backgroundColor: "#f8fbff",
  },
  secondaryAction: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#d8d8d8",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "800",
  },
  reportAction: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#dc2f38",
    alignItems: "center",
    justifyContent: "center",
  },
  reportActionText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
});




