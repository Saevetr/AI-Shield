import { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { getSavedProfile } from "@/utils/profile";

const quickActions = [
  {
    title: "電話查詢",
    subtitle: "檢查來電風險",
    icon: "call",
    color: "#72a7ff",
    route: "/phone-query",
  },
  {
    title: "訊息分析",
    subtitle: "分析可疑訊息",
    icon: "chatbubble-ellipses",
    color: "#72a7ff",
    route: "/message-query",
  },
  {
    title: "LINE ID 查詢",
    subtitle: "檢查帳號安全性",
    image: require("@/assets/images/line.png"),
    color: "#22c55e",
    route: "/line-query",
  },
  {
    title: "圖片辨識",
    subtitle: "上傳圖片分析",
    icon: "camera",
    color: "#72a7ff",
    route: "/(tabs)/chat",
  },
];

const scams = [
  { rank: 1, title: "網路購物詐騙", count: 128, icon: "cart", color: "#ff6b6b" },
  { rank: 2, title: "假投資詐騙", count: 34, icon: "trending-up", color: "#ff9f43" },
  { rank: 3, title: "假交友(投資詐財)詐騙", count: 24, icon: "heart", color: "#ffc533" },
];

const policeAntiFraudImages = [
  "303447891089821696",
  "307800369688219648",
  "311070782635642880",
  "311071380659507200",
  "312760951986196480",
  "315057597004648448",
  "315058028967628800",
  "315058433713770496",
  "316133041913204736",
  "316133152084987904",
  "293207090040672256",
  "293207324460322816",
  "293207516261650432",
  "302359920471183360",
  "302360029422424064",
  "302360158967697408",
  "304544162487734272",
  "305619682554023936",
  "307800194873823232",
  "307801227138174976",
  "309867247235502080",
  "311071034113527808",
  "305620426418032640",
  "307800762451234816",
  "309867647183360000",
  "311071767189786624",
].map(
  (id) =>
    `https://165dashboard.tw/CIB_DWS_API/api/DownloadArea/GetDownlodAreaImage?id=${id}`
);

const getRandomAntiFraudImage = (currentImage?: string) => {
  const availableImages = policeAntiFraudImages.filter((image) => image !== currentImage);
  const imagePool = availableImages.length > 0 ? availableImages : policeAntiFraudImages;

  return imagePool[Math.floor(Math.random() * imagePool.length)];
};

export default function HomeScreen() {
  const [policeAntiFraudImage, setPoliceAntiFraudImage] = useState(() =>
    getRandomAntiFraudImage()
  );
  const [avatarUri, setAvatarUri] = useState("");

  useEffect(() => {
    policeAntiFraudImages.forEach((image) => {
      Image.prefetch(image);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadSavedProfile = async () => {
        const savedProfile = await getSavedProfile();
        setAvatarUri(savedProfile.avatarUri);
      };

      void loadSavedProfile();
      setPoliceAntiFraudImage((currentImage) => getRandomAntiFraudImage(currentImage));

      const imageTimer = setInterval(() => {
        setPoliceAntiFraudImage((currentImage) => getRandomAntiFraudImage(currentImage));
      }, 6000);

      return () => clearInterval(imageTimer);
    }, [])
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push("/(tabs)/profile")}
            activeOpacity={0.75}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.profileAvatarImage} />
            ) : (
              <Ionicons name="person-outline" size={34} color="#0d0d0d" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>AI 智能防詐，守護你的每一通訊息</Text>
          <Text style={styles.heroSubtitle}>即時偵測，邏輯風險，保護你我</Text>
        </View>

        <Text style={styles.sectionTitle}>快速檢測</Text>

        <View style={styles.quickGrid}>
          {quickActions.map((item) => (
            <TouchableOpacity
              key={item.title}
              style={styles.quickCard}
              onPress={() => item.route && router.push(item.route as never)}
              activeOpacity={0.82}
            >
              <View style={[styles.quickIconCircle, { backgroundColor: `${item.color}1f` }]}>
                {item.image ? (
                  <Image source={item.image} style={styles.quickImageIcon} resizeMode="contain" />
                ) : (
                  <Ionicons name={item.icon as any} size={27} color={item.color} />
                )}
              </View>

              <Text style={styles.quickTitle}>{item.title}</Text>
              <Text style={styles.quickSubtitle}>{item.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.topCard}>
          <View style={styles.topHeader}>
            <Text style={styles.topTitle}>最常見詐騙手法 TOP 3</Text>
            <Text style={styles.topTitle}>受理數(件)</Text>
          </View>

          {scams.map((item) => (
            <View key={item.rank} style={styles.scamRow}>
              <View style={[styles.rankBadge, { backgroundColor: item.color }]}>
                <Text style={styles.rankText}>{item.rank}</Text>
              </View>

              <View style={[styles.scamIconCircle, { backgroundColor: `${item.color}22` }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>

              <Text style={styles.scamName}>{item.title}</Text>
              <Text style={styles.scamCount}>{item.count}</Text>
            </View>
          ))}
        </View>

        <View style={styles.riskCard}>
          <View style={styles.riskHeader}>
            <Text style={styles.riskTitle}>近期高風險號碼</Text>
            <Text style={styles.riskHint}>165 高風險通報整理</Text>
          </View>

          <View style={styles.emptyRiskState}>
            <Ionicons name="shield-checkmark-outline" size={32} color="#8aa4c5" />
            <Text style={styles.emptyRiskText}>尚無新的高風險號碼</Text>
          </View>
        </View>

        <View style={styles.advocacySection}>
          <View style={styles.advocacyHeader}>
            <View>
              <Text style={styles.advocacyTitle}>警政署防詐宣導</Text>
              <Text style={styles.advocacySubtitle}>取自 165 打詐儀錶板下載區</Text>
            </View>

            <View style={styles.sourceBadge}>
              <Text style={styles.sourceBadgeText}>165</Text>
            </View>
          </View>

          <View style={styles.advocacyImageCard}>
            <Image
              source={{ uri: policeAntiFraudImage }}
              style={styles.advocacyImage}
              resizeMode="contain"
            />
          </View>
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
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 54,
  },
  header: {
    height: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    width: 102,
    height: 58,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileAvatarImage: {
    width: "100%",
    height: "100%",
  },
  heroCard: {
    minHeight: 70,
    borderRadius: 14,
    backgroundColor: "#dceafe",
    justifyContent: "center",
    paddingHorizontal: 14,
    marginTop: 8,
    marginBottom: 17,
  },
  heroTitle: {
    color: "#2f62b9",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  heroSubtitle: {
    color: "#6c86aa",
    fontSize: 12,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 4,
    marginBottom: 8,
  },
  quickGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
  },
  quickCard: {
    flex: 1,
    height: 78,
    borderRadius: 13,
    backgroundColor: "#ffffff",
    alignItems: "center",
    paddingTop: 9,
  },
  quickIconCircle: {
    width: 35,
    height: 35,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  quickImageIcon: {
    width: 25,
    height: 25,
  },
  quickTitle: {
    color: "#1f2937",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  quickSubtitle: {
    color: "#9aa4b2",
    fontSize: 8,
    marginTop: 2,
    textAlign: "center",
  },
  topCard: {
    borderRadius: 14,
    backgroundColor: "#ffffff",
    paddingHorizontal: 19,
    paddingTop: 17,
    paddingBottom: 18,
    marginBottom: 16,
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  topTitle: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "700",
  },
  scamRow: {
    height: 35,
    flexDirection: "row",
    alignItems: "center",
  },
  rankBadge: {
    width: 14,
    height: 14,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  rankText: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "900",
  },
  scamIconCircle: {
    width: 29,
    height: 29,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  scamName: {
    flex: 1,
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
  },
  scamCount: {
    width: 42,
    color: "#111827",
    fontSize: 16,
    textAlign: "right",
  },
  riskCard: {
    minHeight: 132,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    paddingHorizontal: 15,
    paddingTop: 14,
    paddingBottom: 16,
    marginBottom: 16,
  },
  riskHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  riskTitle: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "800",
  },
  riskHint: {
    color: "#8a97a8",
    fontSize: 10,
  },
  emptyRiskState: {
    flex: 1,
    minHeight: 82,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  emptyRiskText: {
    color: "#8a97a8",
    fontSize: 12,
    fontWeight: "600",
  },
  advocacySection: {
    borderRadius: 16,
    backgroundColor: "#ffffff",
    padding: 12,
    marginBottom: 0,
  },
  advocacyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  advocacyTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
  },
  advocacySubtitle: {
    color: "#8a97a8",
    fontSize: 10,
    marginTop: 2,
  },
  sourceBadge: {
    width: 38,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#dceafe",
    justifyContent: "center",
    alignItems: "center",
  },
  sourceBadgeText: {
    color: "#397bf2",
    fontSize: 12,
    fontWeight: "900",
  },
  advocacyImageCard: {
    height: 250,
    borderRadius: 13,
    backgroundColor: "#f3f7fd",
    overflow: "hidden",
  },
  advocacyImage: {
    width: "100%",
    height: "100%",
  },
});
