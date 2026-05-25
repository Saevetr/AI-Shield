import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { logout } from "@/utils/auth";

type MenuRow = {
  badge?: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  tone?: "danger" | "normal";
};

const showComingSoon = (title: string) => {
  Alert.alert(title, "功能準備中");
};

export default function ProfileScreen() {
  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const menuRows: MenuRow[] = [
    {
      description: "姓名、生日、性別與地區",
      icon: "person-outline",
      label: "個人檔案",
      onPress: () => router.push("/profile-detail" as never),
    },
    {
      description: "查看可用折扣與活動",
      icon: "ticket-outline",
      label: "優惠券",
      onPress: () => showComingSoon("優惠券"),
    },
    {
      description: "封鎖可疑號碼與帳號",
      icon: "ban-outline",
      label: "我的黑名單",
      onPress: () => router.push("/blacklist" as never),
    },
    {
      badge: "VIP",
      description: "解鎖更多防詐工具",
      icon: "card-outline",
      label: "購買進階功能",
      onPress: () => showComingSoon("購買進階功能"),
    },
    {
      description: "maipian.aishield@gmail.com",
      icon: "mail-outline",
      label: "客服 E-mail",
      onPress: () => showComingSoon("客服 E-mail"),
    },
    {
      description: "離開目前帳號",
      icon: "log-out-outline",
      label: "登出",
      onPress: handleLogout,
      tone: "danger",
    },
  ];

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
        <Text style={styles.headerTitle}>我的資料</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <View style={styles.avatarHead} />
            <View style={styles.avatarBody} />
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.name}>麥片AI Shield</Text>
            <Text style={styles.phone}>0912 345 678</Text>
            <View style={styles.statusPill}>
              <Ionicons name="shield-checkmark" size={14} color="#397bf2" />
              <Text style={styles.statusText}>帳號保護中</Text>
            </View>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>5</Text>
            <Text style={styles.summaryLabel}>黑名單</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>--</Text>
            <Text style={styles.summaryLabel}>優惠券</Text>
          </View>
        </View>

        <View style={styles.noticeCard}>
          <View style={styles.noticeIcon}>
            <Ionicons name="sparkles-outline" size={19} color="#397bf2" />
          </View>
          <View style={styles.noticeTextWrap}>
            <Text style={styles.noticeTitle}>防詐守護方案</Text>
            <Text style={styles.noticeText}>完成個人資料後，可獲得更精準的提醒與服務。</Text>
          </View>
        </View>

        <View style={styles.menuCard}>
          {menuRows.map((row, index) => (
            <TouchableOpacity
              key={row.label}
              style={[styles.menuRow, index === menuRows.length - 1 && styles.lastMenuRow]}
              onPress={row.onPress}
              activeOpacity={0.76}
            >
              <View
                style={[
                  styles.menuIconBox,
                  row.tone === "danger" && styles.menuIconBoxDanger,
                ]}
              >
                <Ionicons
                  name={row.icon}
                  size={22}
                  color={row.tone === "danger" ? "#ff4d6d" : "#397bf2"}
                />
              </View>

              <View style={styles.menuContent}>
                <View style={styles.menuTitleRow}>
                  <Text
                    style={[
                      styles.menuTitle,
                      row.tone === "danger" && styles.menuTitleDanger,
                    ]}
                  >
                    {row.label}
                  </Text>
                  {!!row.badge && (
                    <View
                      style={[
                        styles.badge,
                        row.badge === "VIP" && styles.vipBadge,
                      ]}
                    >
                      <Text style={styles.badgeText}>{row.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.menuDescription}>{row.description}</Text>
              </View>

              {row.tone !== "danger" && (
                <Ionicons name="chevron-forward" size={18} color="#b5c0cf" />
              )}
            </TouchableOpacity>
          ))}
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
    flex: 1,
    backgroundColor: "#f8fbff",
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 62,
    paddingTop: 4,
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
  profileCard: {
    minHeight: 112,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#d9e0ee",
    overflow: "hidden",
    alignItems: "center",
    marginRight: 16,
  },
  avatarHead: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: "#8193b1",
    marginTop: 11,
  },
  avatarBody: {
    width: 68,
    height: 38,
    borderRadius: 34,
    backgroundColor: "#8193b1",
    marginTop: 6,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 5,
  },
  phone: {
    color: "#8aa4c5",
    fontSize: 12,
    marginBottom: 9,
  },
  statusPill: {
    alignSelf: "flex-start",
    minHeight: 26,
    borderRadius: 13,
    backgroundColor: "#edf4ff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    gap: 5,
  },
  statusText: {
    color: "#397bf2",
    fontSize: 11,
    fontWeight: "800",
  },
  summaryRow: {
    height: 72,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryNumber: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 4,
  },
  summaryLabel: {
    color: "#8a97a8",
    fontSize: 11,
    fontWeight: "700",
  },
  summaryDivider: {
    width: 1,
    height: 34,
    backgroundColor: "#e2e8f0",
  },
  noticeCard: {
    minHeight: 72,
    borderRadius: 16,
    backgroundColor: "#dceafe",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  noticeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  noticeTextWrap: {
    flex: 1,
  },
  noticeTitle: {
    color: "#2f62b9",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 4,
  },
  noticeText: {
    color: "#6c86aa",
    fontSize: 11,
    lineHeight: 16,
  },
  menuCard: {
    borderRadius: 18,
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
  },
  menuRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#edf1f6",
  },
  lastMenuRow: {
    borderBottomWidth: 0,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#edf4ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  menuIconBoxDanger: {
    backgroundColor: "#fff0f3",
  },
  menuContent: {
    flex: 1,
  },
  menuTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  menuTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "800",
  },
  menuTitleDanger: {
    color: "#ff4d6d",
  },
  menuDescription: {
    color: "#8a97a8",
    fontSize: 11,
    lineHeight: 15,
  },
  badge: {
    minWidth: 22,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#397bf2",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  vipBadge: {
    backgroundColor: "#111827",
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "900",
  },
});
