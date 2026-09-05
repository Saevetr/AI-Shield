import { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import {
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { getSavedProfile } from "@/utils/profile";

import { homeStyles as styles } from "../../styles/tabs.styles";

const quickActions = [
  {
    title: "電話查詢",
    subtitle: "檢查來電風險",
    icon: "call",
    color: "#4f8df7",
    route: "/phone-query",
  },
  {
    title: "訊息分析",
    subtitle: "分析可疑訊息",
    icon: "chatbubble-ellipses",
    color: "#6b7cff",
    route: "/message-query",
  },
  {
    title: "LINE ID 查詢",
    subtitle: "檢查帳號安全性",
    image: require("@/assets/images/line.png"),
    color: "#20c866",
    route: "/line-query",
  },
  {
    title: "圖片辨識",
    subtitle: "上傳圖片分析",
    icon: "camera",
    color: "#3fb7e8",
    route: "/(tabs)/chat",
  },
];

const scams = [
  { rank: 1, title: "網路購物詐騙", count: 128, icon: "cart", color: "#f25f68" },
  { rank: 2, title: "假投資詐騙", count: 34, icon: "trending-up", color: "#f5a524" },
  { rank: 3, title: "假交友投資詐騙", count: 24, icon: "heart", color: "#f7c948" },
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
            source={require("@/assets/images/auth-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push("/(tabs)/profile")}
            activeOpacity={0.78}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.profileAvatarImage} />
            ) : (
              <Ionicons name="person-outline" size={28} color="#1d2738" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroEyebrow}>AI Shield</Text>
            <Text style={styles.heroTitle}>遇到可疑訊息，先查再決定</Text>
            <Text style={styles.heroSubtitle}>電話、LINE、訊息與圖片都能快速檢測風險。</Text>
          </View>
          <View style={styles.heroIconCircle}>
            <Ionicons name="shield-checkmark" size={32} color="#2f7df6" />
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>快速檢測</Text>
          <Text style={styles.sectionHint}>選擇你遇到的可疑來源</Text>
        </View>

        <View style={styles.quickGrid}>
          {quickActions.map((item) => (
            <TouchableOpacity
              key={item.title}
              style={styles.quickCard}
              onPress={() => item.route && router.push(item.route as never)}
              activeOpacity={0.84}
            >
              <View style={[styles.quickIconCircle, { backgroundColor: `${item.color}18` }]}>
                {item.image ? (
                  <Image source={item.image} style={styles.quickImageIcon} resizeMode="contain" />
                ) : (
                  <Ionicons name={item.icon as any} size={25} color={item.color} />
                )}
              </View>

              <Text style={styles.quickTitle}>{item.title}</Text>
              <Text style={styles.quickSubtitle}>{item.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.topCard}>
          <View style={styles.topHeader}>
            <View>
              <Text style={styles.topTitle}>常見詐騙 TOP 3</Text>
              <Text style={styles.topSubtitle}>近期高風險類型整理</Text>
            </View>
            <Text style={styles.topUnit}>受理數</Text>
          </View>

          {scams.map((item) => (
            <View key={item.rank} style={styles.scamRow}>
              <View style={[styles.rankBadge, { backgroundColor: item.color }]}>
                <Text style={styles.rankText}>{item.rank}</Text>
              </View>

              <View style={[styles.scamIconCircle, { backgroundColor: `${item.color}1f` }]}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
              </View>

              <Text style={styles.scamName}>{item.title}</Text>
              <Text style={styles.scamCount}>{item.count}</Text>
            </View>
          ))}
        </View>

        <View style={styles.riskCard}>
          <View style={styles.riskHeader}>
            <View>
              <Text style={styles.riskTitle}>近期高風險號碼</Text>
              <Text style={styles.riskHint}>查詢紀錄與資料庫同步後顯示</Text>
            </View>
            <Ionicons name="alert-circle-outline" size={22} color="#8aa4c5" />
          </View>

          <View style={styles.emptyRiskState}>
            <Ionicons name="shield-checkmark-outline" size={30} color="#8aa4c5" />
            <Text style={styles.emptyRiskText}>目前尚無高風險號碼</Text>
          </View>
        </View>

        <View style={styles.advocacySection}>
          <View style={styles.advocacyHeader}>
            <View>
              <Text style={styles.advocacyTitle}>防詐宣導</Text>
              <Text style={styles.advocacySubtitle}>165 公開宣導圖，每次進入自動更換</Text>
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

