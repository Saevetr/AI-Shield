import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const categories = ["最新文章", "詐騙手法", "防詐技巧", "法規資訊"] as const;

type Category = (typeof categories)[number];

type Article = {
  title: string;
  description: string;
  tag: string;
  readTime: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
};

const articleMap: Record<Category, Article[]> = {
  最新文章: [
    {
      title: "假投資廣告變多，看到高報酬先停三秒",
      description: "常見話術會用限時名額、保證獲利、老師帶單引導匯款。",
      tag: "熱門提醒",
      readTime: "3 分鐘",
      icon: "trending-up-outline",
      accent: "#ff9f43",
    },
    {
      title: "陌生電話要求操作 ATM，不要照做",
      description: "銀行與客服不會要求你用 ATM 解除分期付款或驗證身分。",
      tag: "電話詐騙",
      readTime: "2 分鐘",
      icon: "call-outline",
      accent: "#5c92f5",
    },
    {
      title: "LINE 好友借錢前，先換通道確認",
      description: "遇到急用錢、手機壞掉、不能通話等理由，要先打電話確認本人。",
      tag: "社群帳號",
      readTime: "2 分鐘",
      icon: "chatbubbles-outline",
      accent: "#24c45a",
    },
  ],
  詐騙手法: [
    {
      title: "假網拍賣家：低價商品加私訊付款",
      description: "要求離開平台交易、轉帳到個人帳戶，就是高風險訊號。",
      tag: "網購詐騙",
      readTime: "3 分鐘",
      icon: "cart-outline",
      accent: "#ff6b6b",
    },
    {
      title: "假客服：誤設分期付款要你解除",
      description: "對方會製造緊張感，要求你立刻依指示操作銀行 App 或 ATM。",
      tag: "客服詐騙",
      readTime: "4 分鐘",
      icon: "headset-outline",
      accent: "#5c92f5",
    },
    {
      title: "假中獎通知：先繳稅金才可領獎",
      description: "任何要求先付款、先提供驗證碼的領獎通知都要提高警覺。",
      tag: "中獎詐騙",
      readTime: "2 分鐘",
      icon: "gift-outline",
      accent: "#f7c948",
    },
  ],
  防詐技巧: [
    {
      title: "一聽、二掛、三查證",
      description: "遇到可疑電話先掛斷，再使用官方電話或 165 查證。",
      tag: "快速口訣",
      readTime: "1 分鐘",
      icon: "shield-checkmark-outline",
      accent: "#397bf2",
    },
    {
      title: "不要提供簡訊驗證碼",
      description: "驗證碼等同帳戶鑰匙，任何人要求提供都可能是詐騙。",
      tag: "帳號安全",
      readTime: "2 分鐘",
      icon: "key-outline",
      accent: "#12b886",
    },
    {
      title: "轉帳前先問一個信任的人",
      description: "多一個人幫忙確認，可以有效降低被話術帶著走的風險。",
      tag: "匯款前",
      readTime: "2 分鐘",
      icon: "people-outline",
      accent: "#845ef7",
    },
  ],
  法規資訊: [
    {
      title: "保留對話與匯款證明",
      description: "遭遇疑似詐騙時，先截圖、保存帳號與交易紀錄，方便報案。",
      tag: "報案準備",
      readTime: "3 分鐘",
      icon: "document-text-outline",
      accent: "#5c92f5",
    },
    {
      title: "撥打 165 取得防詐協助",
      description: "165 反詐騙專線可協助確認常見詐騙情境與處理方式。",
      tag: "官方資源",
      readTime: "2 分鐘",
      icon: "call-outline",
      accent: "#397bf2",
    },
    {
      title: "疑似帳戶外流時先更改密碼",
      description: "優先變更密碼、登出其他裝置，並開啟雙重驗證保護帳號。",
      tag: "帳戶保護",
      readTime: "2 分鐘",
      icon: "lock-closed-outline",
      accent: "#ff9f43",
    },
  ],
};

export default function KnowledgeScreen() {
  const [activeCategory, setActiveCategory] = useState<Category>("最新文章");

  const activeArticles = useMemo(() => articleMap[activeCategory], [activeCategory]);
  const featuredArticle = activeArticles[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <Ionicons name="chevron-back" size={36} color="#0d0d0d" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>防詐知識</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
        >
          {categories.map((category) => {
            const isActive = category === activeCategory;

            return (
              <TouchableOpacity
                key={category}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveCategory(category)}
                activeOpacity={0.78}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.featuredCard}>
          <View style={styles.featuredTopRow}>
            <View style={[styles.featuredIcon, { backgroundColor: `${featuredArticle.accent}1f` }]}>
              <Ionicons name={featuredArticle.icon} size={28} color={featuredArticle.accent} />
            </View>
            <View style={styles.featuredMeta}>
              <Text style={styles.featuredTag}>{featuredArticle.tag}</Text>
              <Text style={styles.featuredTime}>{featuredArticle.readTime}</Text>
            </View>
          </View>

          <Text style={styles.featuredTitle}>{featuredArticle.title}</Text>
          <Text style={styles.featuredDescription}>{featuredArticle.description}</Text>

          <View style={styles.featuredFooter}>
            <Text style={styles.featuredFooterText}>今日推薦</Text>
            <Ionicons name="arrow-forward" size={18} color="#397bf2" />
          </View>
        </View>

        <View style={styles.quickCheckCard}>
          <View style={styles.quickCheckHeader}>
            <Ionicons name="warning-outline" size={20} color="#ff9f43" />
            <Text style={styles.quickCheckTitle}>看到這些話術要小心</Text>
          </View>
          <View style={styles.checkList}>
            {["保證獲利、穩賺不賠", "要求提供驗證碼", "叫你離開官方平台交易"].map((text) => (
              <View key={text} style={styles.checkItem}>
                <View style={styles.checkDot} />
                <Text style={styles.checkText}>{text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{activeCategory}</Text>
          <Text style={styles.sectionHint}>{activeArticles.length} 篇</Text>
        </View>

        <View style={styles.articleList}>
          {activeArticles.map((article) => (
            <TouchableOpacity key={article.title} style={styles.articleRow} activeOpacity={0.82}>
              <View style={[styles.articleIcon, { backgroundColor: `${article.accent}1f` }]}>
                <Ionicons name={article.icon} size={22} color={article.accent} />
              </View>
              <View style={styles.articleTextGroup}>
                <View style={styles.articleMetaRow}>
                  <Text style={styles.articleTag}>{article.tag}</Text>
                  <Text style={styles.articleTime}>{article.readTime}</Text>
                </View>
                <Text style={styles.articleTitle}>{article.title}</Text>
                <Text style={styles.articleDescription}>{article.description}</Text>
              </View>
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
  header: {
    height: 70,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 48,
  },
  content: {
    flex: 1,
    backgroundColor: "#f8fbff",
  },
  scrollContent: {
    paddingBottom: 84,
  },
  tabRow: {
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
  },
  tabButton: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f4f7fb",
  },
  tabButtonActive: {
    backgroundColor: "#e8f1ff",
  },
  tabText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#397bf2",
  },
  featuredCard: {
    borderRadius: 24,
    backgroundColor: "#ffffff",
    marginHorizontal: 14,
    marginTop: 14,
    padding: 18,
    shadowColor: "#9bb6d9",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 4,
  },
  featuredTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  featuredIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  featuredMeta: {
    alignItems: "flex-end",
  },
  featuredTag: {
    color: "#397bf2",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 3,
  },
  featuredTime: {
    color: "#8da0bb",
    fontSize: 12,
    fontWeight: "700",
  },
  featuredTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 28,
  },
  featuredDescription: {
    color: "#607697",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 20,
    marginTop: 8,
  },
  featuredFooter: {
    height: 38,
    borderRadius: 13,
    backgroundColor: "#f2f7ff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 13,
    marginTop: 16,
  },
  featuredFooterText: {
    color: "#397bf2",
    fontSize: 13,
    fontWeight: "800",
  },
  quickCheckCard: {
    borderRadius: 20,
    backgroundColor: "#fff7e8",
    marginHorizontal: 14,
    marginTop: 14,
    padding: 15,
  },
  quickCheckHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  quickCheckTitle: {
    color: "#5f4a1b",
    fontSize: 14,
    fontWeight: "900",
  },
  checkList: {
    gap: 8,
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  checkDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#ff9f43",
  },
  checkText: {
    flex: 1,
    color: "#6b5b3d",
    fontSize: 13,
    fontWeight: "700",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "900",
  },
  sectionHint: {
    color: "#8da0bb",
    fontSize: 12,
    fontWeight: "800",
  },
  articleList: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    marginHorizontal: 14,
    overflow: "hidden",
  },
  articleRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#edf2f7",
  },
  articleIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  articleTextGroup: {
    flex: 1,
  },
  articleMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  articleTag: {
    color: "#397bf2",
    fontSize: 11,
    fontWeight: "900",
  },
  articleTime: {
    color: "#9aacc8",
    fontSize: 11,
    fontWeight: "800",
  },
  articleTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20,
  },
  articleDescription: {
    color: "#607697",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 4,
  },
});
