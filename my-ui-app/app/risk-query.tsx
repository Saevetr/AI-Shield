import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput } from "@/components/app-text";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  SafeAreaView,
  ScrollView,
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

const getRiskLevel = (data: any, isScam: boolean): RiskLevel => {
  const level = data.detail?.level || data.data?.level || data.level;
  return level === "low" || level === "medium" || level === "high"
    ? level
    : isScam
      ? "high"
      : "low";
};

export default function RiskQueryScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const initialMode: QueryMode = params.type === "line" ? "line" : "phone";
  const [mode, setMode] = useState<QueryMode>(initialMode);
  const [phone, setPhone] = useState("");
  const [lineId, setLineId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [records, setRecords] = useState<QueryResult[]>([]);

  const value = mode === "phone" ? phone : lineId;
  const setValue = mode === "phone" ? setPhone : setLineId;
  const visibleRecords = useMemo(
    () => records.filter((record) => record.kind === mode),
    [mode, records]
  );

  const changeMode = (nextMode: QueryMode) => {
    Keyboard.dismiss();
    setMode(nextMode);
    setResult(null);
  };

  const runQuery = async () => {
    const normalizedValue =
      mode === "phone" ? phone.replace(/\D/g, "") : lineId.trim();

    if (mode === "phone" && normalizedValue.length < 6) {
      Alert.alert("查詢失敗", "請輸入至少 6 碼的有效電話號碼。");
      return;
    }

    if (mode === "line" && !/^[A-Za-z0-9._@-]{3,}$/.test(normalizedValue)) {
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
      const endpoint = mode === "phone" ? "check-phone" : "check-line";
      const body = mode === "phone" ? { phone: normalizedValue } : { lineId: normalizedValue };
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
      const level = getRiskLevel(data, isScam);
      const returnedValue =
        mode === "phone"
          ? data.detail?.phone || data.data?.phone || data.phone || normalizedValue
          : data.detail?.lineId || data.data?.lineId || data.lineId || data.line_id || normalizedValue;
      const score = Number(
        data.detail?.score || data.data?.score || data.score || (isScam ? 88 : 15)
      );
      const nextResult: QueryResult = {
        id: `${mode}-${returnedValue}`,
        kind: mode,
        value: returnedValue,
        level,
        score: Math.min(100, Math.max(0, score)),
        message:
          data.detail?.message ||
          data.data?.message ||
          data.message ||
          (isScam ? "資料庫中找到疑似詐騙紀錄。" : "目前資料庫中沒有相關風險紀錄。"),
        detail:
          mode === "phone"
            ? data.detail?.carrier || data.data?.carrier || data.carrier || "未知電信"
            : data.detail?.reason || data.data?.reason || data.reason || (isScam ? "已有風險紀錄" : "尚無通報紀錄"),
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

  const reportLineId = async () => {
    if (!result || result.kind !== "line") return;

    try {
      const currentUser = await getCurrentUser();
      const currentUserId = currentUser?.user_id || currentUser?.userId || null;

      const response = await fetch(`${API_BASE}/api/check/report-line`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineId: result.value,
          reason: result.message,
          userId: currentUserId,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "無法送出通報");
      }

      Alert.alert("通報成功", "感謝你的回報，我們會持續更新風險資料。");
    } catch (error: any) {
      Alert.alert("通報失敗", String(error?.message || error));
    }
  };

  const palette = result ? riskStyles[result.level] : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <Pressable style={styles.flex} onPress={Keyboard.dismiss}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color="#182235" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>風險查詢</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
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

          <View style={styles.queryPanel}>
            <View style={styles.queryHeadingRow}>
              <View style={styles.queryIcon}>
                <Ionicons
                  name={mode === "phone" ? "call-outline" : "chatbubble-ellipses-outline"}
                  size={27}
                  color="#397bf2"
                />
              </View>
              <View style={styles.queryHeadingText}>
                <Text style={styles.queryTitle}>
                  {mode === "phone" ? "查詢電話號碼" : "查詢 LINE ID"}
                </Text>
                <Text style={styles.queryDescription}>
                  {mode === "phone"
                    ? "市話、手機與國際格式皆可輸入"
                    : "輸入對方的 LINE ID 檢查風險"}
                </Text>
              </View>
            </View>

            <View style={styles.inputWrap}>
              <Ionicons
                name={mode === "phone" ? "keypad-outline" : "at-outline"}
                size={23}
                color="#7186a4"
              />
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={setValue}
                placeholder={mode === "phone" ? "請輸入電話號碼" : "請輸入完整 LINE ID"}
                placeholderTextColor="#97a7bd"
                keyboardType={mode === "phone" ? "phone-pad" : "default"}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={runQuery}
              />
              {value.length > 0 ? (
                <TouchableOpacity onPress={() => setValue("")}>
                  <Ionicons name="close-circle" size={22} color="#afbed1" />
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity
              style={[styles.queryButton, loading && styles.queryButtonDisabled]}
              onPress={runQuery}
              disabled={loading}
              activeOpacity={0.84}
            >
              {loading ? <ActivityIndicator color="#ffffff" /> : <Ionicons name="search" size={22} color="#ffffff" />}
              <Text style={styles.queryButtonText}>
                {loading ? "查詢中" : "立即查詢"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tipCard}>
            <Ionicons name="information-circle" size={24} color="#397bf2" />
            <Text style={styles.tipText}>
              {mode === "phone"
                ? "查不到紀錄不代表完全安全，陌生來電仍不要提供個資或驗證碼。"
                : "陌生帳號要求匯款、加入投資群或購買點數時，請先確認身分。"}
            </Text>
          </View>

          {result && palette ? (
            <View style={styles.resultSection}>
              <Text style={styles.sectionTitle}>查詢結果</Text>
              <View style={[styles.riskBanner, { backgroundColor: palette.background }]}>
                <View style={[styles.riskIcon, { backgroundColor: `${palette.color}18` }]}>
                  <Ionicons name={palette.icon} size={32} color={palette.color} />
                </View>
                <View style={styles.riskText}>
                  <Text style={[styles.riskLabel, { color: palette.color }]}>
                    {palette.label}
                  </Text>
                  <Text style={styles.resultValue}>{result.value}</Text>
                </View>
                <Text style={[styles.score, { color: palette.color }]}>
                  {result.score}
                </Text>
              </View>

              <View style={styles.resultDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {result.kind === "phone" ? "電信資訊" : "資料庫狀態"}
                  </Text>
                  <Text style={styles.detailValue}>{result.detail}</Text>
                </View>
                <View style={styles.resultDivider} />
                <Text style={styles.resultMessage}>{result.message}</Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.secondaryButton} onPress={addToBlacklist}>
                  <Ionicons name="ban-outline" size={20} color="#2d5fa9" />
                  <Text style={styles.secondaryButtonText}>
                    加入黑名單
                  </Text>
                </TouchableOpacity>
                {result.kind === "line" ? (
                  <TouchableOpacity style={styles.reportButton} onPress={reportLineId}>
                    <Ionicons name="flag-outline" size={20} color="#ffffff" />
                    <Text style={styles.reportButtonText}>我要通報</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : null}

          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>
              {mode === "phone" ? "電話查詢紀錄" : "LINE ID 查詢紀錄"}
            </Text>
            {visibleRecords.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={31} color="#a3b1c3" />
                <Text style={styles.emptyTitle}>尚無查詢紀錄</Text>
                <Text style={styles.emptyText}>完成查詢後會顯示在這裡</Text>
              </View>
            ) : (
              visibleRecords.map((record) => {
                const recordPalette = riskStyles[record.level];
                return (
                  <TouchableOpacity
                    key={record.id}
                    style={styles.historyRow}
                    onPress={() => setResult(record)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.historyIcon, { backgroundColor: recordPalette.background }]}>
                      <Ionicons name={recordPalette.icon} size={21} color={recordPalette.color} />
                    </View>
                    <Text style={styles.historyValue}>{record.value}</Text>
                    <Text style={[styles.historyRisk, { color: recordPalette.color }]}>
                      {recordPalette.label}
                    </Text>
                    <Ionicons name="chevron-forward" size={19} color="#9caabd" />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>
      </Pressable>
    </SafeAreaView>
  );
}
