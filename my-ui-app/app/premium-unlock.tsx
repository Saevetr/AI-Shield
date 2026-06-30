import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { premiumunlock as styles } from './styles';

const previewItems = [
  {
    icon: "analytics-outline",
    title: "進階風險分析",
    text: "未來將提供更完整的詐騙風險判讀與報告。",
  },
  {
    icon: "notifications-outline",
    title: "即時防詐提醒",
    text: "可疑訊息與高風險查詢結果將提供更即時的提醒。",
  },
  {
    icon: "shield-checkmark-outline",
    title: "強化保護工具",
    text: "更多黑名單、通報與防詐資料功能會陸續開放。",
  },
] as const;

export default function PremiumUnlockScreen() {
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
        <Text style={styles.headerTitle}>付費解鎖</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.container}>
        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="construct-outline" size={42} color="#397bf2" />
          </View>
          <Text style={styles.title}>功能開發中</Text>
          <Text style={styles.subtitle}>
            進階方案正在整理中，完成後會提供更完整的防詐分析與保護工具。
          </Text>
        </View>

        <View style={styles.previewCard}>
          <Text style={styles.sectionTitle}>預計開放</Text>
          {previewItems.map((item, index) => (
            <View
              key={item.title}
              style={[
                styles.previewRow,
                index === previewItems.length - 1 && styles.lastPreviewRow,
              ]}
            >
              <View style={styles.previewIcon}>
                <Ionicons name={item.icon} size={22} color="#397bf2" />
              </View>
              <View style={styles.previewTextWrap}>
                <Text style={styles.previewTitle}>{item.title}</Text>
                <Text style={styles.previewText}>{item.text}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.backHomeButton}
          onPress={() => router.back()}
          activeOpacity={0.82}
        >
          <Text style={styles.backHomeText}>返回</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

