import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type ProfileRow = {
  badge?: string;
  icon: string;
  label: string;
  route?: string;
};

const profileSections: { rows: ProfileRow[]; title: string }[] = [
  {
    title: "個人",
    rows: [
      { label: "個人檔案", icon: "person-outline", route: "/profile-detail" },
      { label: "優惠券", icon: "ticket-outline" },
    ],
  },
  {
    title: "服務總覽",
    rows: [{ label: "通報紀錄", icon: "alarm-outline" }],
  },
  {
    title: "購買功能",
    rows: [{ label: "購買進階功能", icon: "card-outline", badge: "VIP" }],
  },
];

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" size={36} color="#0d0d0d" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>我的</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <View style={styles.avatarHead} />
            <View style={styles.avatarBody} />
          </View>
          <View>
            <Text style={styles.name}>麥片AI Shield</Text>
            <Text style={styles.phone}>0912 345 678</Text>
          </View>
        </View>

        {profileSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.rows.map((row, index) => (
                <TouchableOpacity
                  key={row.label}
                  style={[
                    styles.menuRow,
                    index === section.rows.length - 1 && styles.lastMenuRow,
                  ]}
                  activeOpacity={0.75}
                  onPress={() => row.route && router.push(row.route as never)}
                >
                  {row.badge ? (
                    <View style={styles.vipBadge}>
                      <Text style={styles.vipBadgeText}>{row.badge}</Text>
                    </View>
                  ) : (
                    <Ionicons
                      name={row.icon as keyof typeof Ionicons.glyphMap}
                      size={25}
                      color="#111827"
                    />
                  )}
                  <Text style={styles.menuText}>{row.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.emailSection}>
          <Text style={styles.sectionTitle}>客服E-mail</Text>
          <View style={styles.emailBox}>
            <Text style={styles.emailText}>maipian.aishield@gmail.com</Text>
          </View>
        </View>
      </View>
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
  header: {
    height: 74,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 9,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "500",
  },
  headerSpacer: {
    width: 48,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 32,
    marginTop: 14,
    marginBottom: 18,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: "#d9e0ee",
    overflow: "hidden",
    alignItems: "center",
    marginRight: 18,
  },
  avatarHead: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: "#8193b1",
    marginTop: 10,
  },
  avatarBody: {
    width: 62,
    height: 34,
    borderRadius: 31,
    backgroundColor: "#8193b1",
    marginTop: 6,
  },
  name: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  phone: {
    color: "#8aa4c5",
    fontSize: 12,
  },
  section: {
    marginHorizontal: 9,
    marginBottom: 10,
  },
  sectionTitle: {
    color: "#9aa4b2",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 2,
    marginBottom: 5,
  },
  sectionCard: {
    borderRadius: 10,
    backgroundColor: "#e5e5e5",
    paddingHorizontal: 14,
  },
  menuRow: {
    height: 39,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#c4ccd8",
  },
  lastMenuRow: {
    borderBottomWidth: 0,
  },
  menuText: {
    flex: 1,
    color: "#111827",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 10,
  },
  vipBadge: {
    width: 28,
    height: 18,
    borderRadius: 3,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  vipBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
  },
  emailSection: {
    marginHorizontal: 9,
  },
  emailBox: {
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: "#e5e5e5",
    justifyContent: "center",
    paddingHorizontal: 13,
  },
  emailText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "500",
  },
});
