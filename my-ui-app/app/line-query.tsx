import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { lineQueryStyles as styles } from "./styles";

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

      const backendUrl = `http://localhost:3000/api/check-line?lineId=${encodeURIComponent(
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
              onPress={() =>
                Alert.alert("已加入黑名單", "此 LINE ID 已加入黑名單示意清單。")
              }
              activeOpacity={0.82}
            >
              <Text style={styles.secondaryActionText}>加入黑名單</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reportAction}
              onPress={() =>
                Alert.alert("已送出通報", "感謝你的回報，我們會持續更新風險資料。")
              }
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

