import { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/app-text";
import { router, useFocusEffect } from "expo-router";
import {
  Image,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";

import { getSavedProfile } from "@/utils/profile";

import { homeStyles as styles } from "../../styles/tabs.styles";

const secondaryActions = [
  {
    title: "訊息分析",
    subtitle: "分析可疑訊息",
    icon: "chatbubble-ellipses",
    color: "#6366f1",
    route: "/message-query",
  },
  {
    title: "圖片辨識",
    subtitle: "上傳圖片分析",
    icon: "camera",
    color: "#0ea5e9",
    route: "/(tabs)/chat",
  },
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
          <View style={styles.logoWrap}>
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push("/(tabs)/profile")}
            activeOpacity={0.78}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.profileAvatarImage} />
            ) : (
              <Ionicons name="person-outline" size={27} color="#1d2738" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroTitle}>AI 智能防詐，守護你的每一通訊息</Text>
            <Text style={styles.heroSubtitle}>即時偵測、風險提示，遇到可疑內容先查證。</Text>
          </View>
          <View style={styles.heroIconCircle}>
            <Ionicons name="shield-checkmark" size={30} color="#2f7df6" />
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>立即查詢</Text>
          <Text style={styles.sectionHint}>先查證，再行動</Text>
        </View>

        <TouchableOpacity
          style={styles.primaryQueryCard}
          onPress={() => router.push("/risk-query" as never)}
          activeOpacity={0.84}
        >
          <View style={styles.primaryIconGroup}>
            <View style={[styles.primaryIconCircle, styles.phoneIconCircle]}>
              <Ionicons name="call" size={30} color="#2f73df" />
            </View>
            <View style={[styles.primaryIconCircle, styles.lineIconCircle]}>
              <Image
                source={require("@/assets/images/line.png")}
                style={styles.primaryLineIcon}
                resizeMode="contain"
              />
            </View>
          </View>

          <View style={styles.primaryQueryText}>
            <Text style={styles.primaryQueryTitle}>
              電話與 LINE ID 查詢
            </Text>
            <Text style={styles.primaryQuerySubtitle}>
              查詢陌生來電或可疑帳號的風險
            </Text>
          </View>

          <View style={styles.primaryQueryArrow}>
            <Ionicons name="chevron-forward" size={24} color="#397bf2" />
          </View>
        </TouchableOpacity>

        <View style={[styles.sectionHeaderRow, styles.secondarySectionHeader]}>
          <Text style={styles.sectionTitle}>AI 輔助分析</Text>
          <Text style={styles.sectionHint}>訊息與圖片都能檢查</Text>
        </View>

        <View style={styles.quickGrid}>
          {secondaryActions.map((item) => (
            <TouchableOpacity
              key={item.title}
              style={styles.quickCard}
              onPress={() => item.route && router.push(item.route as never)}
              activeOpacity={0.84}
            >
              <View style={[styles.quickIconCircle, { backgroundColor: `${item.color}17` }]}>
                <Ionicons name={item.icon as any} size={34} color={item.color} />
              </View>

              <Text style={styles.quickTitle}>{item.title}</Text>
              <Text style={styles.quickSubtitle}>{item.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.knowledgeCard}
          onPress={() => router.push("/(tabs)/explore" as never)}
          activeOpacity={0.82}
        >
          <View style={styles.knowledgeIconCircle}>
            <Ionicons name="book-outline" size={26} color="#397bf2" />
          </View>
          <View style={styles.knowledgeBody}>
            <Text style={styles.knowledgeTitle}>防詐情報站</Text>
            <Text style={styles.knowledgeText}>
              認識最新消息、詐騙手法、防範技巧與法規
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={23} color="#7d91ad" />
        </TouchableOpacity>

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

