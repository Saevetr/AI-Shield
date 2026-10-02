import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/app-text";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { logout } from "@/utils/auth";
import { FONT_SIZE_OPTIONS, useFontSize } from "@/utils/fontSize";
import { DEFAULT_PROFILE, getSavedProfile, syncProfileWithBackend } from "@/utils/profile";

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
  const API_URL =
    process.env.EXPO_PUBLIC_API_URL || "https://ai-shield-m68d.onrender.com";

  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [blacklistCount, setBlacklistCount] = useState<number | string>("--");
  const [showCouponModal, setShowCouponModal] = useState(false);
  const { fontSize, setFontSize } = useFontSize();

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const loadUserProfile = async () => {
        // 1. 先讀取本地已保存的個人資料
        const localData = await getSavedProfile();
        if (isMounted) setProfile(localData);

        // 2. 🛡️ 主動連接後端資料庫取得最新真實個人資料
        const dbData = await syncProfileWithBackend();
        if (isMounted) setProfile(dbData);

        // 3. 取得該使用者個人的真實黑名單筆數
        try {
          const uid = dbData?.userId || localData?.userId || "";
          const fetchUrl = uid
            ? `${API_URL}/api/check/blacklist?userId=${encodeURIComponent(uid)}`
            : `${API_URL}/api/check/blacklist`;
          const res = await fetch(fetchUrl);
          const data = await res.json();
          if (isMounted && data.success && Array.isArray(data.items)) {
            setBlacklistCount(data.items.length);
          }
        } catch {
          // ignore
        }
      };

      void loadUserProfile();

      return () => {
        isMounted = false;
      };
    }, [API_URL])
  );

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const menuRows: MenuRow[] = [
    {
      description: "姓名、生日、性別與綁定方式",
      icon: "person-outline",
      label: "個人檔案",
      onPress: () => router.push("/profile-detail" as never),
    },
    {
      description: "查看可用防詐體驗券與活動",
      icon: "ticket-outline",
      label: "優惠券",
      onPress: () => setShowCouponModal(true),
    },
    {
      description: "封鎖可疑號碼與帳號",
      icon: "ban-outline",
      label: "我的黑名單",
      onPress: () => router.push("/blacklist" as never),
    },    {
      description: "查看曾經提交的通報內容",
      icon: "newspaper-outline",
      label: "通報紀錄",
      onPress: () => router.push("/(tabs)/reports" as never),
    },
    {
      badge: "VIP",
      description: "解鎖更多防詐工具",
      icon: "card-outline",
      label: "購買進階功能",
      onPress: () => router.push("/premium-unlock" as never),
    },
    {
      description: "maipian.aishield@gmail.com",
      icon: "mail-outline",
      label: "客服 E-mail",
      onPress: () =>
        void Linking.openURL("mailto:maipian.aishield@gmail.com?subject=AI%20Shield%20客服諮詢"),
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
          onPress={() => router.replace("/(tabs)")}
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
            {profile.avatarUri ? (
              <Image source={{ uri: profile.avatarUri }} style={styles.avatarImage} />
            ) : (
              <>
                <View style={styles.avatarHead} />
                <View style={styles.avatarBody} />
              </>
            )}
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.name}>{profile.name || "使用者"}</Text>
            <Text style={styles.phone}>
              {String(profile.customerId || "").toUpperCase().startsWith("LINE") ||
              String(profile.email || "").toLowerCase().endsWith("@line.local")
                ? "LINE 帳號登入"
                : String(profile.customerId || "").toUpperCase().startsWith("GOOGLE")
                ? "Google 帳號登入"
                : profile.phone ||
                  (profile.email && !profile.email.endsWith("@line.local")
                    ? profile.email
                    : "尚未設定聯絡資訊")}
            </Text>
            <View style={styles.statusPill}>
              <Ionicons name="shield-checkmark" size={14} color="#397bf2" />
              <Text style={styles.statusText}>帳號保護中</Text>
            </View>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <TouchableOpacity
            style={styles.summaryItem}
            activeOpacity={0.78}
            onPress={() => router.push("/blacklist" as never)}
          >
            <Text style={styles.summaryNumber}>{blacklistCount}</Text>
            <Text style={styles.summaryLabel}>黑名單</Text>
          </TouchableOpacity>
          <View style={styles.summaryDivider} />
          <TouchableOpacity
            style={styles.summaryItem}
            activeOpacity={0.78}
            onPress={() => setShowCouponModal(true)}
          >
            <Text style={styles.summaryNumber}>2</Text>
            <Text style={styles.summaryLabel}>優惠券</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.fontSizeCard}>
          <View style={styles.fontSizeInfo}>
            <View style={styles.fontSizeIcon}>
              <Ionicons name="text-outline" size={19} color="#397bf2" />
            </View>
            <View style={styles.fontSizeTextWrap}>
              <Text style={styles.fontSizeTitle}>字體大小</Text>
              <Text style={styles.fontSizeHint}>依照閱讀習慣調整文字</Text>
            </View>
          </View>

          <View style={styles.fontSizeOptions}>
            {FONT_SIZE_OPTIONS.map((option) => {
              const isActive = option.value === fontSize;

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.fontSizeOption, isActive && styles.fontSizeOptionActive]}
                  onPress={() => void setFontSize(option.value)}
                  activeOpacity={0.78}
                >
                  <Text
                    style={[
                      styles.fontSizeOptionText,
                      isActive && styles.fontSizeOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
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

        {/* 🎟️ 優惠券互動彈窗 */}
        <Modal visible={showCouponModal} transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowCouponModal(false)}
          >
            <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>我的優惠券</Text>
                  <Text style={styles.modalSubtitle}>可用券 2 張・防詐守護福利</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setShowCouponModal(false)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="close" size={20} color="#8a97a8" />
                </TouchableOpacity>
              </View>

              <View style={styles.couponCard}>
                <View style={styles.couponBadgeWrap}>
                  <Text style={styles.couponBadgeText}>體驗券</Text>
                </View>
                <View style={styles.couponBody}>
                  <Text style={styles.couponTitle}>AI 語音防詐即時檢測券</Text>
                  <Text style={styles.couponDesc}>免費享有多模態深度通話分析體驗</Text>
                  <Text style={styles.couponExpiry}>有效期限：永久有效</Text>
                </View>
                <TouchableOpacity
                  style={styles.couponUseBtn}
                  activeOpacity={0.82}
                  onPress={() => {
                    setShowCouponModal(false);
                    router.push("/(tabs)/chat" as never);
                  }}
                >
                  <Text style={styles.couponUseBtnText}>去使用</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.couponCard, { borderColor: "#fde68a" }]}>
                <View style={[styles.couponBadgeWrap, { backgroundColor: "#fef3c7" }]}>
                  <Text style={[styles.couponBadgeText, { color: "#d97706" }]}>折扣券</Text>
                </View>
                <View style={styles.couponBody}>
                  <Text style={styles.couponTitle}>VIP 全時防護方案 8 折折抵券</Text>
                  <Text style={styles.couponDesc}>升級防詐方案現折 20%</Text>
                  <Text style={styles.couponExpiry}>有效期限：本月內有效</Text>
                </View>
                <TouchableOpacity
                  style={[styles.couponUseBtn, { backgroundColor: "#f59e0b" }]}
                  activeOpacity={0.82}
                  onPress={() => {
                    setShowCouponModal(false);
                    router.push("/premium-unlock" as never);
                  }}
                >
                  <Text style={styles.couponUseBtnText}>查看</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
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
  avatarImage: {
    width: "100%",
    height: "100%",
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
  fontSizeCard: {
    minHeight: 78,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  fontSizeInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 12,
  },
  fontSizeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#edf4ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  fontSizeTextWrap: {
    flex: 1,
  },
  fontSizeTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 4,
  },
  fontSizeHint: {
    color: "#8a97a8",
    fontSize: 11,
    lineHeight: 15,
  },
  fontSizeOptions: {
    width: 118,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eef2f7",
    flexDirection: "row",
    padding: 3,
  },
  fontSizeOption: {
    flex: 1,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  fontSizeOptionActive: {
    backgroundColor: "#397bf2",
  },
  fontSizeOptionText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "900",
  },
  fontSizeOptionTextActive: {
    color: "#ffffff",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: "#ffffff",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#8a97a8",
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  couponCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#f8fbff",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  couponBadgeWrap: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#dbeafe",
    marginRight: 10,
  },
  couponBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#2563eb",
  },
  couponBody: {
    flex: 1,
  },
  couponTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
  },
  couponDesc: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 2,
  },
  couponExpiry: {
    fontSize: 10,
    color: "#94a3b8",
  },
  couponUseBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#397bf2",
    marginLeft: 8,
  },
  couponUseBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "800",
  },
});

