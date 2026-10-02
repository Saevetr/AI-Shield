import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput } from "@/components/app-text";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { getCurrentUser } from "@/utils/auth";

import { riskQueryStyles as styles } from "../styles/app.styles";

type QueryMode = "phone" | "line";
type RiskLevel = "low" | "medium" | "high";

type QueryResult = {
  id: string;
  kind: QueryMode;
  value: string;
  level: RiskLevel;
  score: number;
  message: string;
  detail: string;
  isScam: boolean;
};

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || "https://ai-shield-m68d.onrender.com";

const riskStyles: Record<
  RiskLevel,
  {
    label: string;
    color: string;
    background: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  low: {
    label: "低風險",
    color: "#218c55",
    background: "#e8f6ee",
    icon: "shield-checkmark",
  },
  medium: {
    label: "中風險",
    color: "#ad7416",
    background: "#fff5dd",
    icon: "warning",
  },
  high: {
    label: "高風險",
    color: "#b84b55",
    background: "#fbecee",
    icon: "alert-circle",
  },
};

const getRiskLevel = (score: number, isScam: boolean): RiskLevel => {
  if (score >= 60 || isScam) return "high";
  if (score >= 30) return "medium";
  return "low";
};

function ScoringRulesCard() {
  return (
    <View style={localStyles.rulesCard}>
      <View style={localStyles.rulesHeader}>
        <Ionicons name="shield-checkmark" size={19} color="#397bf2" />
        <Text style={localStyles.rulesTitle}>AI Shield 詐騙風險評分標準</Text>
      </View>
      <View style={localStyles.ruleItem}>
        <View style={[localStyles.ruleBadge, { backgroundColor: "#fee2e2" }]}>
          <Text style={[localStyles.ruleBadgeText, { color: "#dc2626" }]}>85 - 100 高危</Text>
        </View>
        <Text style={localStyles.ruleDesc}>
          列入 165 反詐專線或大量民眾通報，具明確詐騙特徵，請立即封鎖！
        </Text>
      </View>
      <View style={localStyles.ruleItem}>
        <View style={[localStyles.ruleBadge, { backgroundColor: "#ffedd5" }]}>
          <Text style={[localStyles.ruleBadgeText, { color: "#ea580c" }]}>60 - 84 中危</Text>
        </View>
        <Text style={localStyles.ruleDesc}>
          多次被通報推銷、借貸或高壓引導，存在高度疑似詐騙風險。
        </Text>
      </View>
      <View style={localStyles.ruleItem}>
        <View style={[localStyles.ruleBadge, { backgroundColor: "#fef9c3" }]}>
          <Text style={[localStyles.ruleBadgeText, { color: "#ca8a04" }]}>30 - 59 注意</Text>
        </View>
        <Text style={localStyles.ruleDesc}>
          有零星通報或未知號碼，切勿輕易提供個人隱私資料或匯款。
        </Text>
      </View>
      <View style={localStyles.ruleItem}>
        <View style={[localStyles.ruleBadge, { backgroundColor: "#dcfce7" }]}>
          <Text style={[localStyles.ruleBadgeText, { color: "#16a34a" }]}>0 - 29 安全</Text>
        </View>
        <Text style={localStyles.ruleDesc}>
          資料庫查無不良通報紀錄，為正常通訊聯絡人，通訊安全無虞。
        </Text>
      </View>
    </View>
  );
}

export default function RiskQueryScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const initialMode: QueryMode = params.type === "line" ? "line" : "phone";
  const [mode, setMode] = useState<QueryMode>(initialMode);
  const [phone, setPhone] = useState("");
  const [lineId, setLineId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [records, setRecords] = useState<QueryResult[]>([]);

  const changeMode = (nextMode: QueryMode) => {
    Keyboard.dismiss();
    setMode(nextMode);
    setResult(null);
  };

  const runQuery = async (targetMode: QueryMode = mode) => {
    const rawVal = targetMode === "phone" ? phone : lineId;
    const normalizedValue =
      targetMode === "phone" ? rawVal.replace(/\D/g, "") : rawVal.trim();

    if (targetMode === "phone" && normalizedValue.length < 6) {
      Alert.alert("查詢失敗", "請輸入至少 6 碼的有效電話號碼。");
      return;
    }

    if (targetMode === "line" && !/^[A-Za-z0-9._@-]{3,}$/.test(normalizedValue)) {
      Alert.alert(
        "查詢失敗",
        "LINE ID 至少需要 3 個字元，可使用英文、數字、底線、句點、@ 或連字號。"
      );
      return;
    }

    Keyboard.dismiss();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      setLoading(true);
      const endpoint = targetMode === "phone" ? "check-phone" : "check-line";
      const body =
        targetMode === "phone"
          ? { phone: normalizedValue }
          : { lineId: normalizedValue };
      const response = await fetch(`${API_BASE}/api/check/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const rawText = await response.text();
      let data: any = {};

      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error("後端回傳格式不正確");
      }

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "查詢失敗，請稍後再試");
      }

      const isScam =
        data.isScam === true ||
        data.is_scam === true ||
        data.isFraud === true ||
        data.exists === true ||
        data.status === "scam" ||
        data.status === "危險帳號" ||
        data.source === "database_found" ||
        data.data?.isScam === true ||
        data.detail?.isScam === true;

      const returnedValue =
        targetMode === "phone"
          ? data.detail?.phone || data.data?.phone || data.phone || normalizedValue
          : data.detail?.lineId ||
            data.data?.lineId ||
            data.lineId ||
            data.line_id ||
            normalizedValue;

      const score = Number(
        data.detail?.score || data.data?.score || data.score || (isScam ? 88 : 15)
      );
      const clampedScore = Math.min(100, Math.max(0, score));
      const level = getRiskLevel(clampedScore, isScam);

      const nextResult: QueryResult = {
        id: `${targetMode}-${returnedValue}`,
        kind: targetMode,
        value: returnedValue,
        level,
        score: clampedScore,
        message:
          data.detail?.message ||
          data.data?.message ||
          data.message ||
          (isScam
            ? "資料庫中找到疑似詐騙紀錄。"
            : "目前資料庫中沒有相關風險紀錄。"),
        detail:
          targetMode === "phone"
            ? data.detail?.carrier ||
              data.data?.carrier ||
              data.carrier ||
              "未知電信"
            : data.detail?.reason ||
              data.data?.reason ||
              data.reason ||
              (isScam ? "已有風險紀錄" : "尚無通報紀錄"),
        isScam,
      };

      setResult(nextResult);
      setRecords((current) => [
        nextResult,
        ...current.filter((record) => record.id !== nextResult.id),
      ].slice(0, 8));
    } catch (error: any) {
      Alert.alert(
        error?.name === "AbortError" ? "查詢逾時" : "查詢失敗",
        error?.name === "AbortError"
          ? "伺服器回應時間過長，請稍後再試。"
          : String(error?.message || error)
      );
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const addToBlacklist = async () => {
    if (!result) return;

    try {
      const currentUser = await getCurrentUser();
      const currentUserId = currentUser?.user_id || currentUser?.userId || null;

      const response = await fetch(`${API_BASE}/api/check/blacklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          type: result.kind === "phone" ? "電話" : "LINE ID",
          value: result.value,
          note: "使用者從查詢結果加入黑名單",
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "無法加入黑名單");
      }

      Alert.alert("已加入黑名單", `${result.value} 已加入你的黑名單。`);
    } catch (error: any) {
      Alert.alert("加入失敗", String(error?.message || error));
    }
  };

  const submitReport = async () => {
    if (!result) return;

    try {
      const currentUser = await getCurrentUser();
      const currentUserId = currentUser?.user_id || currentUser?.userId || null;

      const response = await fetch(`${API_BASE}/api/check/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: result.kind === "line" ? "LINE" : "PHONE",
          value: result.value,
          reason: result.message,
          userId: currentUserId,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "無法送出通報");
      }

      Alert.alert(
        "通報成功",
        "已成功加入個人通報紀錄！感謝你的回報，我們會持續更新風險資料。"
      );
    } catch (error: any) {
      Alert.alert("通報失敗", String(error?.message || error));
    }
  };

  // 渲染分頁內容（支援橫向滑動與各自分離的輸入狀態）
  const renderQueryContent = (targetMode: QueryMode) => {
    const isPhone = targetMode === "phone";
    const currentValue = isPhone ? phone : lineId;
    const setCurrentValue = isPhone ? setPhone : setLineId;
    const isCurrentActive = mode === targetMode;
    const activeResult = isCurrentActive ? result : null;
    const currentPalette = activeResult ? riskStyles[activeResult.level] : null;
    const targetRecords = records.filter((r) => r.kind === targetMode);

    return (
      <ScrollView
        key={targetMode}
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.queryPanel}>
          <View style={styles.queryHeadingRow}>
            <View style={styles.queryIcon}>
              <Ionicons
                name={isPhone ? "call-outline" : "chatbubble-ellipses-outline"}
                size={27}
                color="#397bf2"
              />
            </View>
            <View style={styles.queryHeadingText}>
              <Text style={styles.queryTitle}>
                {isPhone ? "查詢電話號碼" : "查詢 LINE ID"}
              </Text>
              <Text style={styles.queryDescription}>
                {isPhone
                  ? "市話、手機與國際格式皆可輸入"
                  : "輸入對方的 LINE ID 檢查風險"}
              </Text>
            </View>
          </View>

          <View style={styles.inputWrap}>
            <Ionicons
              name={isPhone ? "keypad-outline" : "at-outline"}
              size={23}
              color="#7186a4"
            />
            <TextInput
              style={styles.input}
              value={currentValue}
              onChangeText={setCurrentValue}
              placeholder={isPhone ? "請輸入電話號碼" : "請輸入完整 LINE ID"}
              placeholderTextColor="#97a7bd"
              keyboardType={isPhone ? "phone-pad" : "default"}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => runQuery(targetMode)}
            />
            {currentValue.length > 0 ? (
              <TouchableOpacity onPress={() => setCurrentValue("")}>
                <Ionicons name="close-circle" size={22} color="#afbed1" />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.queryButton, loading && styles.queryButtonDisabled]}
            onPress={() => runQuery(targetMode)}
            disabled={loading}
            activeOpacity={0.84}
          >
            {loading && isCurrentActive ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Ionicons name="search" size={22} color="#ffffff" />
            )}
            <Text style={styles.queryButtonText}>
              {loading && isCurrentActive ? "查詢中" : "立即查詢"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tipCard}>
          <Ionicons name="information-circle" size={24} color="#397bf2" />
          <Text style={styles.tipText}>
            {isPhone
              ? "查不到紀錄不代表完全安全，陌生來電仍不要提供個資或驗證碼。"
              : "陌生帳號要求匯款、加入投資群或購買點數時，請先確認身分。"}
          </Text>
        </View>

        {/* 📊 明確的 AI-Shield 詐騙評分標準 */}
        <ScoringRulesCard />

        {/* 查詢結果卡片 */}
        {activeResult && currentPalette ? (
          <View style={styles.resultSection}>
            <Text style={styles.sectionTitle}>查詢結果</Text>
            <View
              style={[
                styles.riskBanner,
                { backgroundColor: currentPalette.background },
              ]}
            >
              <View
                style={[
                  styles.riskIcon,
                  { backgroundColor: `${currentPalette.color}18` },
                ]}
              >
                <Ionicons
                  name={currentPalette.icon}
                  size={32}
                  color={currentPalette.color}
                />
              </View>
              <View style={styles.riskText}>
                <Text
                  style={[styles.riskLabel, { color: currentPalette.color }]}
                >
                  {currentPalette.label}
                </Text>
                <Text style={styles.resultValue}>{activeResult.value}</Text>
              </View>
              <Text style={[styles.score, { color: currentPalette.color }]}>
                {activeResult.score}
              </Text>
            </View>

            <View style={styles.resultDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  {activeResult.kind === "phone" ? "電信資訊" : "資料庫狀態"}
                </Text>
                <Text style={styles.detailValue}>{activeResult.detail}</Text>
              </View>
              <View style={styles.resultDivider} />
              <Text style={styles.resultMessage}>{activeResult.message}</Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={addToBlacklist}
              >
                <Ionicons name="ban-outline" size={20} color="#2d5fa9" />
                <Text style={styles.secondaryButtonText}>加入黑名單</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.reportButton}
                onPress={submitReport}
              >
                <Ionicons name="flag-outline" size={20} color="#ffffff" />
                <Text style={styles.reportButtonText}>我要通報</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* 歷史查詢紀錄 */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>
            {isPhone ? "電話查詢紀錄" : "LINE ID 查詢紀錄"}
          </Text>
          {targetRecords.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={31} color="#a3b1c3" />
              <Text style={styles.emptyTitle}>尚無查詢紀錄</Text>
              <Text style={styles.emptyText}>完成查詢後會顯示在這裡</Text>
            </View>
          ) : (
            targetRecords.map((record) => {
              const recordPalette = riskStyles[record.level];
              return (
                <TouchableOpacity
                  key={record.id}
                  style={styles.historyRow}
                  onPress={() => setResult(record)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.historyIcon,
                      { backgroundColor: recordPalette.background },
                    ]}
                  >
                    <Ionicons
                      name={recordPalette.icon}
                      size={21}
                      color={recordPalette.color}
                    />
                  </View>
                  <Text style={styles.historyValue}>{record.value}</Text>
                  <Text
                    style={[
                      styles.historyRisk,
                      { color: recordPalette.color },
                    ]}
                  >
                    {recordPalette.label}
                  </Text>
                  <Ionicons name="chevron-forward" size={19} color="#9caabd" />
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={28} color="#182235" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>風險查詢</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {/* 頂部切換頁籤 */}
        <View style={localStyles.segmentContainer}>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segment, mode === "phone" && styles.segmentActive]}
              onPress={() => changeMode("phone")}
              activeOpacity={0.82}
            >
              <Ionicons
                name="call"
                size={22}
                color={mode === "phone" ? "#ffffff" : "#63748c"}
              />
              <Text
                style={[
                  styles.segmentText,
                  mode === "phone" && styles.segmentTextActive,
                ]}
              >
                電話號碼
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segment, mode === "line" && styles.segmentActive]}
              onPress={() => changeMode("line")}
              activeOpacity={0.82}
            >
              <Ionicons
                name="chatbubble-ellipses"
                size={22}
                color={mode === "line" ? "#ffffff" : "#63748c"}
              />
              <Text
                style={[
                  styles.segmentText,
                  mode === "line" && styles.segmentTextActive,
                ]}
              >
                LINE ID
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {renderQueryContent(mode)}
      </View>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  segmentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  rulesCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  rulesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  rulesTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginLeft: 6,
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  ruleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 10,
    minWidth: 84,
    alignItems: "center",
  },
  ruleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  ruleDesc: {
    fontSize: 12,
    color: "#475569",
    flex: 1,
    lineHeight: 16,
  },
});
