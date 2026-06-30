import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { logout } from "@/utils/auth";
import { DEFAULT_PROFILE, getSavedProfile } from "@/utils/profile";

import { profileStyles as styles } from "./tabs.styles";

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
  const [profile, setProfile] = useState(DEFAULT_PROFILE);

  useFocusEffect(
    useCallback(() => {
      const loadSavedAvatar = async () => {
        setProfile(await getSavedProfile());
      };

      void loadSavedAvatar();
    }, [])
  );

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
      onPress: () => router.push("/premium-unlock" as never),
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
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.phone}>{profile.phone}</Text>
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
