import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { reportsStyles as styles } from "./tabs.styles";

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
  risk: ReportRisk;
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

const reports: ReportItem[] = [
  {
    id: "r1",
    target: "+886 987 654 321",
    type: "電話",
    reason: "疑似假客服要求操作 ATM",
    status: "已確認",
    risk: "high",
    date: "今天 11:24",
  },
  {
    id: "r2",
    target: "@1234",
    type: "LINE ID",
    reason: "投資群組邀請與可疑匯款要求",
    status: "審核中",
    risk: "medium",
    date: "昨天 18:06",
  },
  {
    id: "r3",
    target: "0223456789",
    type: "電話",
    reason: "陌生來電推銷貸款",
    status: "已退回",
    risk: "low",
    date: "5/25 09:41",
  },
];

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

  const visibleReports = useMemo(() => {
    if (activeFilter === "全部") {
      return reports;
    }

    return reports.filter((report) => report.status === activeFilter);
  }, [activeFilter]);

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

        {visibleReports.length > 0 ? (
          <View style={styles.reportList}>
            {visibleReports.map((report) => {
              const statusStyle = statusStyleMap[report.status];
              const riskStyle = riskStyleMap[report.risk];
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
                    <View style={[styles.riskTag, { borderColor: riskStyle.color }]}>
                      <View style={[styles.riskDot, { backgroundColor: riskStyle.color }]} />
                      <Text style={[styles.riskText, { color: riskStyle.color }]}>
                        {riskStyle.label}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={38} color="#b8c5d8" />
            <Text style={styles.emptyTitle}>沒有符合的通報紀錄</Text>
            <Text style={styles.emptyText}>切換其他分類，或從查詢結果頁送出新的通報。</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}


  