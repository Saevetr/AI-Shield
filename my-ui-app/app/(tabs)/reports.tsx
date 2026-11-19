import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/app-text";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { getCurrentUser } from "@/utils/auth";

const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || "https://ai-shield-m68d.onrender.com";

const filters = ["全部", "審核中", "已確認", "已退回"] as const;

type Filter = (typeof filters)[number];
type ReportStatus = Exclude<Filter, "全部">;
type ReportRisk = "high" | "medium" | "low";

type ReportItem = {
  id: string;
  target: string;
  type: "電話" | "LINE ID";
  reason: string;
  status: ReportStatus;
  risk: ReportRisk | null;
  date: string;
};

const formatReportTarget = (report: ReportItem) => {
  if (report.type !== "電話") {
    return report.target;
  }

  const compactTarget = report.target.replace(/[\s()-]/g, "");

  if (compactTarget.startsWith("+8869")) {
    return `0${compactTarget.slice(4)}`.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3");
  }

  if (compactTarget.startsWith("8869")) {
    return `0${compactTarget.slice(3)}`.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3");
  }

  return report.target;
};

const defaultReports: ReportItem[] = [];

const statusStyleMap: Record<
  ReportStatus,
  {
    backgroundColor: string;
    color: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  審核中: {
    backgroundColor: "#fff4d8",
    color: "#f6a21a",
    icon: "time-outline",
  },
  已確認: {
    backgroundColor: "#e6f7ee",
    color: "#12a83b",
    icon: "checkmark-circle-outline",
  },
  已退回: {
    backgroundColor: "#f1f4f8",
    color: "#7b8794",
    icon: "return-down-back-outline",
  },
};

const riskStyleMap: Record<ReportRisk, { color: string; label: string }> = {
  high: {
    color: "#dc2f38",
    label: "高風險",
  },
  medium: {
    color: "#f6a21a",
    label: "中風險",
  },
  low: {
    color: "#12a83b",
    label: "低風險",
  },
};

export default function ReportsScreen() {
  const [activeFilter, setActiveFilter] = useState<Filter>("全部");
  const [reports, setReports] = useState<ReportItem[]>(defaultReports);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const requestId = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);

  const loadReports = useCallback(async () => {
    const id = ++requestId.current;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    setLoading(true);
    setError("");
    setNeedsLogin(false);
    setReports([]);

    try {
      const user = await getCurrentUser();
      const userId = user?.user_id || user?.userId || "";
      if (id !== requestId.current) return;
      if (!userId) {
        setNeedsLogin(true);
        throw new Error("登入資料已失效，請重新登入後查看通報紀錄。");
      }

      const res = await fetch(
        `${API_BASE}/api/check/reports?userId=${encodeURIComponent(userId)}`,
        { signal: controller.signal }
      );
      const data = await res.json().catch(() => null);
      if (id !== requestId.current) return;
      if (res.status === 401) setNeedsLogin(true);
      if (!res.ok || data?.success !== true || !Array.isArray(data.data)) {
        throw new Error(data?.message || `無法讀取通報紀錄（HTTP ${res.status}），請稍後重試。`);
      }

      const fetchedReports: ReportItem[] = data.data.map((r: any) => ({
        id: String(r.id),
        target: String(r.target || ""),
        type: String(r.type).toUpperCase() === "PHONE" ? "電話" : "LINE ID",
        reason: String(r.reason || "使用者通報").replace(/^REPORT: /, ""),
        status: ["審核中", "已確認", "已退回"].includes(r.status) ? r.status : "審核中",
        risk: ["high", "medium", "low"].includes(r.risk) ? r.risk : null,
        date: r.created_at ? new Date(r.created_at).toLocaleDateString("zh-TW") : "近期",
      }));
      setReports(fetchedReports);
    } catch (loadError: any) {
      if (id === requestId.current) {
        setError(loadError?.name === "AbortError"
          ? "讀取逾時，請確認網路後重試。"
          : String(loadError?.message || "通報紀錄讀取失敗，請稍後重試。"));
      }
    } finally {
      clearTimeout(timeoutId);
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadReports();
    return () => {
      requestId.current += 1;
      activeRequest.current?.abort();
    };
  }, [loadReports]));

  const visibleReports = useMemo(() => {
    if (activeFilter === "全部") {
      return reports;
    }

    return reports.filter((report) => report.status === activeFilter);
  }, [activeFilter, reports]);

  const confirmedCount = reports.filter((report) => report.status === "已確認").length;
  const pendingCount = reports.filter((report) => report.status === "審核中").length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>通報紀錄</Text>
          <Text style={styles.headerSubtitle}>查看你送出的可疑號碼與帳號回報</Text>
        </View>
        <TouchableOpacity
          style={styles.headerAction}
          onPress={() => Alert.alert("新增通報", "可以從電話查詢或 LINE 查詢結果頁送出通報。")}
          activeOpacity={0.78}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadReports} />}
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{reports.length}</Text>
            <Text style={styles.summaryLabel}>總通報</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{confirmedCount}</Text>
            <Text style={styles.summaryLabel}>已確認</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>{pendingCount}</Text>
            <Text style={styles.summaryLabel}>審核中</Text>
          </View>
        </View>

        <View style={styles.noticeCard}>
          <Ionicons name="shield-checkmark-outline" size={24} color="#397bf2" />
          <View style={styles.noticeTextGroup}>
            <Text style={styles.noticeTitle}>通報會協助更新風險資料</Text>
            <Text style={styles.noticeText}>越完整的截圖、對話與轉帳資訊，越能協助判斷風險等級。</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {filters.map((filter) => {
            const isActive = activeFilter === filter;

            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterButton, isActive && styles.filterButtonActive]}
                onPress={() => setActiveFilter(filter)}
                activeOpacity={0.78}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>最近通報</Text>
          <Text style={styles.sectionHint}>{visibleReports.length} 筆</Text>
        </View>

        {loading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator size="large" color="#397bf2" />
            <Text style={styles.emptyTitle}>正在讀取通報紀錄</Text>
          </View>
        ) : error ? (
          <View style={styles.emptyCard}>
            <Ionicons name="alert-circle-outline" size={38} color="#b84b55" />
            <Text style={styles.emptyTitle}>暫時無法顯示紀錄</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.filterButton, styles.filterButtonActive]}
              onPress={() => needsLogin ? router.push("/login") : void loadReports()}
            >
              <Text style={[styles.filterText, styles.filterTextActive]}>
                {needsLogin ? "重新登入" : "重新讀取"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : visibleReports.length > 0 ? (
          <View style={styles.reportList}>
            {visibleReports.map((report) => {
              const statusStyle = statusStyleMap[report.status];
              const riskStyle = report.risk ? riskStyleMap[report.risk] : null;
              const typeIcon = report.type === "電話" ? "call-outline" : "chatbubble-ellipses-outline";

              return (
                <TouchableOpacity key={report.id} style={styles.reportCard} activeOpacity={0.82}>
                  <View style={styles.reportTopRow}>
                    <View style={styles.typeIconBox}>
                      <Ionicons name={typeIcon} size={22} color="#397bf2" />
                    </View>
                    <View style={styles.reportMain}>
                      <Text style={styles.reportTarget}>{formatReportTarget(report)}</Text>
                      <Text style={styles.reportDate}>{report.date}</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: statusStyle.backgroundColor }]}>
                      <Ionicons name={statusStyle.icon} size={13} color={statusStyle.color} />
                      <Text style={[styles.statusText, { color: statusStyle.color }]}>
                        {report.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.reportReason}>{report.reason}</Text>

                  <View style={styles.reportFooter}>
                    <View style={styles.footerTag}>
                      <Text style={styles.footerTagText}>類型：{report.type}</Text>
                    </View>
                    {riskStyle && <View style={[styles.riskTag, { borderColor: riskStyle.color }]}>
                      <View style={[styles.riskDot, { backgroundColor: riskStyle.color }]} />
                      <Text style={[styles.riskText, { color: riskStyle.color }]}>
                        {riskStyle.label}
                      </Text>
                    </View>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={38} color="#b8c5d8" />
            <Text style={styles.emptyTitle}>{activeFilter === "全部" ? "尚無個人通報紀錄" : `尚無${activeFilter}的通報`}</Text>
            <Text style={styles.emptyText}>{activeFilter === "全部" ? "尚未送出個人通報。" : "目前沒有符合此狀態的紀錄。"}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fbff",
  },
  header: {
    minHeight: 82,
    backgroundColor: "#f8fbff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f7",
  },
  headerTitle: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 4,
  },
  headerSubtitle: {
    color: "#8aa4c5",
    fontSize: 12,
    fontWeight: "700",
  },
  headerAction: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#397bf2",
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#f8fbff",
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 84,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    height: 76,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryNumber: {
    color: "#111827",
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 4,
  },
  summaryLabel: {
    color: "#8a97a8",
    fontSize: 11,
    fontWeight: "800",
  },
  noticeCard: {
    borderRadius: 18,
    backgroundColor: "#eaf2ff",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    marginBottom: 14,
  },
  noticeTextGroup: {
    flex: 1,
  },
  noticeTitle: {
    color: "#1c4fba",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 4,
  },
  noticeText: {
    color: "#607697",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  filterRow: {
    gap: 8,
    paddingBottom: 6,
  },
  filterButton: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 14,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonActive: {
    backgroundColor: "#397bf2",
  },
  filterText: {
    color: "#607697",
    fontSize: 13,
    fontWeight: "800",
  },
  filterTextActive: {
    color: "#ffffff",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
  },
  sectionHint: {
    color: "#8aa4c5",
    fontSize: 12,
    fontWeight: "800",
  },
  reportList: {
    gap: 12,
  },
  reportCard: {
    borderRadius: 20,
    backgroundColor: "#ffffff",
    padding: 14,
  },
  reportTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  typeIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#edf4ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  reportMain: {
    flex: 1,
  },
  reportTarget: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 4,
  },
  reportDate: {
    color: "#9aacc8",
    fontSize: 11,
    fontWeight: "700",
  },
  statusPill: {
    minHeight: 26,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "900",
  },
  reportReason: {
    color: "#607697",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginBottom: 12,
  },
  reportFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerTag: {
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f5f8fc",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  footerTagText: {
    color: "#607697",
    fontSize: 11,
    fontWeight: "800",
  },
  riskTag: {
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 6,
  },
  riskDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  riskText: {
    fontSize: 11,
    fontWeight: "900",
  },
  emptyCard: {
    minHeight: 190,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: "#5e7190",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 10,
  },
  emptyText: {
    color: "#9aacc8",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 5,
    lineHeight: 18,
  },
});

