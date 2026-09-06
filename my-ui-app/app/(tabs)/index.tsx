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

import { scaledTextStyle, useFontSize } from "@/utils/fontSize";
import { getSavedProfile } from "@/utils/profile";

import { homeStyles as styles } from "../../styles/tabs.styles";

const quickActions = [
  {
    title: "電話查詢",
    subtitle: "檢查來電風險",
    icon: "call",
    color: "#3b82f6",
    route: "/phone-query",
  },
  {
    title: "LINE ID 查詢",
    subtitle: "檢查帳號安全性",
    image: require("@/assets/images/line.png"),
    color: "#22c55e",
    route: "/line-query",
  },
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
  const { fontSize } = useFontSize();
  const [policeAntiFraudImage, setPoliceAntiFraudImage] = useState(() =>
    getRandomAntiFraudImage()
  );
  const [avatarUri, setAvatarUri] = useState("");
  const font = (style: any) => scaledTextStyle(style, fontSize);

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
              source={require("@/assets/images/auth-logo.png")}
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
            <Text style={[styles.heroTitle, font(styles.heroTitle)]}>AI 智能防詐，守護你的每一通訊息</Text>
            <Text style={[styles.heroSubtitle, font(styles.heroSubtitle)]}>即時偵測、風險提示，遇到可疑內容先查證。</Text>
          </View>
          <View style={styles.heroIconCircle}>
            <Ionicons name="shield-checkmark" size={30} color="#2f7df6" />
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, font(styles.sectionTitle)]}>快速檢測</Text>
          <Text style={[styles.sectionHint, font(styles.sectionHint)]}>一鍵進入常用工具</Text>
        </View>

        <View style={styles.quickGrid}>
          {quickActions.map((item) => (
            <TouchableOpacity
              key={item.title}
              style={styles.quickCard}
              onPress={() => item.route && router.push(item.route as never)}
              activeOpacity={0.84}
            >
              <View style={[styles.quickIconCircle, { backgroundColor: `${item.color}17` }]}>
                {item.image ? (
                  <Image source={item.image} style={styles.quickImageIcon} resizeMode="contain" />
                ) : (
                  <Ionicons name={item.icon as any} size={34} color={item.color} />
                )}
              </View>

              <Text style={[styles.quickTitle, font(styles.quickTitle)]}>{item.title}</Text>
              <Text style={[styles.quickSubtitle, font(styles.quickSubtitle)]}>{item.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoGrid}>
          <TouchableOpacity
            style={styles.infoCard}
            onPress={() => router.push("/phone-query" as never)}
            activeOpacity={0.82}
          >
            <View style={styles.infoCardHeader}>
              <Text style={[styles.infoTitle, font(styles.infoTitle)]}>近期高風險號碼</Text>
              <Ionicons name="alert-circle-outline" size={20} color="#7d8da6" />
            </View>
            <View style={styles.infoEmptyState}>
              <Text style={[styles.infoEmptyText, font(styles.infoEmptyText)]}>暫無新增資料</Text>
              <Text style={[styles.infoHint, font(styles.infoHint)]}>可先輸入電話查詢</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.infoCard, styles.knowledgeCard]}
            onPress={() => router.push("/(tabs)/explore" as never)}
            activeOpacity={0.82}
          >
            <View style={styles.infoCardHeader}>
              <Text style={[styles.infoTitle, font(styles.infoTitle)]}>防詐小知識</Text>
              <Ionicons name="book-outline" size={20} color="#397bf2" />
            </View>
            <View style={styles.knowledgeBody}>
              <Text style={[styles.knowledgeText, font(styles.knowledgeText)]}>假客服、投資群組、釣魚連結都能先學會辨識。</Text>
              <View style={styles.knowledgeButton}>
                <Text style={[styles.knowledgeButtonText, font(styles.knowledgeButtonText)]}>立即查看</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.advocacySection}>
          <View style={styles.advocacyHeader}>
            <View>
              <Text style={[styles.advocacyTitle, font(styles.advocacyTitle)]}>防詐宣導</Text>
              <Text style={[styles.advocacySubtitle, font(styles.advocacySubtitle)]}>165 公開宣導圖，每次進入自動更換</Text>
            </View>

            <View style={styles.sourceBadge}>
              <Text style={[styles.sourceBadgeText, font(styles.sourceBadgeText)]}>165</Text>
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

