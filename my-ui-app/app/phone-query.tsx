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

type QueryRecord = {
  phone: string;
  result: string;
  time: string;
};

type QueryResult = {
  carrier: string;
  level: RiskLevel;
  phone: string;
  score: number;
};

const riskStyleMap = {
  high: {
    accent: "#dc2f38",
    background: "#ffe4e7",
    label: "高風險號碼",
    message: "多位用戶回報，請勿回撥或提供個資",
    scoreText: "高風險",
  },
  medium: {
    accent: "#f6a21a",
    background: "#fff4d8",
    label: "中風險號碼",
    message: "有可疑紀錄，建議先確認來源",
    scoreText: "中風險",
  },
  low: {
    accent: "#12c735",
    background: "#e6f7ee",
    label: "低風險號碼",
    message: "尚無警示，仍請留意對方要求",
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

const normalizePhone = (value: string) => {
  const compactValue = value.replace(/[\s()-]/g, "");

  if (compactValue.startsWith("+")) {
    return `+${compactValue.slice(1).replace(/\D/g, "")}`;
  }

  return compactValue.replace(/\D/g, "");
};

const getPhoneRisk = (phone: string): QueryResult => {
  const digitsOnly = phone.replace(/\D/g, "");
  const lastTwoDigits = Number(digitsOnly.slice(-2));

  if (lastTwoDigits >= 80) {
    return {
      carrier: "台灣 大哥大",
      level: "high",
      phone,
      score: 86,
    };
  }

  if (lastTwoDigits >= 45) {
    return {
      carrier: "台灣 大哥大",
      level: "medium",
      phone,
      score: 58,
    };
  }

  return {
    carrier: "台灣 大哥大",
    level: "low",
    phone,
    score: 18,
  };
};

const formatPhone = (phone: string) => {
  if (phone.startsWith("+886") && phone.length >= 12) {
    return `+886 ${phone.slice(4, 7)} ${phone.slice(7, 10)} ${phone.slice(10)}`;
  }

  if (phone.startsWith("886") && phone.length >= 11) {
    return `+886 ${phone.slice(3, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`;
  }

  if (phone.length === 10) {
    return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
  }

  return phone.replace(/(.{4})/g, "$1 ").trim();
};

export default function PhoneQueryScreen() {
  const [phone, setPhone] = useState("");
  const [records, setRecords] = useState<QueryRecord[]>([]);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);

  const handleQuery = () => {
    const normalizedPhone = normalizePhone(phone);

    if (!/^\+?\d{6,15}$/.test(normalizedPhone)) {
      Alert.alert("查詢失敗", "請輸入完整電話號碼，例如：0912345678、0223456789 或 +886912345678");
      return;
    }

    const result = getPhoneRisk(normalizedPhone);
    const riskStyle = riskStyleMap[result.level];
    const nextRecord = {
      phone: normalizedPhone,
      result: riskStyle.label,
      time: new Date().toLocaleTimeString("zh-TW", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setRecords((currentRecords) => [nextRecord, ...currentRecords].slice(0, 3));
    setQueryResult(result);
  };

  const handleBack = () => {
    if (queryResult) {
      setQueryResult(null);
      return;
    }

    router.back();
  };

  if (queryResult) {
    const riskStyle = riskStyleMap[queryResult.level];

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.resultScreen}>
          <View style={styles.resultHeader}>
            <TouchableOpacity style={styles.resultBackButton} onPress={handleBack} activeOpacity={0.75}>
              <Ionicons name="chevron-back" size={36} color="#0d0d0d" />
            </TouchableOpacity>
            <Text style={styles.resultHeaderTitle}>查詢結果</Text>
            <View style={styles.resultHeaderSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.resultContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.riskBanner, { backgroundColor: riskStyle.background }]}>
              <Ionicons name="warning" size={52} color={riskStyle.accent} />
              <View style={styles.riskBannerText}>
                <Text style={[styles.riskTitle, { color: riskStyle.accent }]}>{riskStyle.label}</Text>
                <Text style={styles.riskSubtitle}>{riskStyle.message}</Text>
              </View>
            </View>

            <View style={styles.identityBlock}>
              <Text style={styles.resultValue}>{formatPhone(queryResult.phone)}</Text>
              <Text style={styles.resultMeta}>{queryResult.carrier}</Text>
            </View>

            <View style={[styles.resultCard, styles.scoreCard]}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.resultCardTitle}>風險評分</Text>
                <Text style={[styles.scoreText, { color: riskStyle.accent }]}>
                  {queryResult.score}/100
                </Text>
              </View>
              <View style={styles.scoreTrack}>
                <View
                  style={[
                    styles.scoreFill,
                    { backgroundColor: riskStyle.accent, width: `${queryResult.score}%` },
                  ]}
                />
              </View>
              <Text style={styles.scoreDescription}>判斷結果：{riskStyle.scoreText}</Text>
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultCardTitle}>風險資訊</Text>
              <Text style={styles.resultCardText}>
                系統會依照用戶回報、可疑互動頻率與近期查詢紀錄進行初步判斷。若對方要求匯款、驗證碼或遠端操作，請立即停止。
              </Text>
            </View>

            <View style={styles.resultCard}>
              <Text style={styles.resultCardTitle}>用戶回報</Text>
              <Text style={styles.resultCardText}>
                目前尚無完整公開留言。你可以協助通報，讓其他使用者更快避開可疑號碼。
              </Text>
            </View>
          </ScrollView>

          <View style={styles.actionBar}>
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={() => Alert.alert("已加入黑名單", "此號碼已加入黑名單示意清單。")}
              activeOpacity={0.82}
            >
              <Text style={styles.secondaryActionText}>加入黑名單</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.reportAction}
              onPress={() => Alert.alert("已送出通報", "感謝你的回報，我們會持續更新風險資料。")}
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
            <Ionicons name="call" size={44} color="#5c92f5" />
          </View>

          <Text style={styles.title}>輸入電話號碼</Text>
          <Text style={styles.subtitle}>查詢電話是否可能涉及詐騙風險</Text>

          <View style={styles.inputWrap}>
            <Ionicons name="phone-portrait-outline" size={22} color="#7b91b3" />
            <TextInput
              style={styles.input}
              placeholder="請輸入電話號碼"
              placeholderTextColor="#9aacc8"
              keyboardType="phone-pad"
              value={phone}
              maxLength={16}
              onChangeText={setPhone}
            />
            {phone.length > 0 ? (
              <TouchableOpacity onPress={() => setPhone("")} activeOpacity={0.75}>
                <Ionicons name="close-circle" size={20} color="#b8c5d8" />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity style={styles.queryButton} onPress={handleQuery} activeOpacity={0.84}>
            <Text style={styles.queryButtonText}>立即查詢</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tipCard}>
          <Ionicons name="shield-checkmark-outline" size={24} color="#397bf2" />
          <View style={styles.tipTextGroup}>
            <Text style={styles.tipTitle}>查詢提醒</Text>
            <Text style={styles.tipText}>陌生電話要求轉帳、提供驗證碼或遠端操作時，請先暫停並查證。</Text>
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
                key={`${record.phone}-${record.time}`}
                style={styles.recordRow}
                onPress={() => setQueryResult(getPhoneRisk(record.phone))}
                activeOpacity={0.78}
              >
                <View style={styles.recordIcon}>
                  <Ionicons name="call-outline" size={18} color="#397bf2" />
                </View>
                <View style={styles.recordContent}>
                  <Text style={styles.recordValue}>{record.phone}</Text>
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
    backgroundColor: "#edf4ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
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
    backgroundColor: "#eef5ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
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
    marginBottom: 16,
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
  identityBlock: {
    alignItems: "center",
    marginBottom: 18,
  },
  resultValue: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  resultMeta: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "600",
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
