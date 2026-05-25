import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const filterTabs = ["全部", "電話", "LINE ID"] as const;

type FilterTab = (typeof filterTabs)[number];
type BlacklistType = Exclude<FilterTab, "全部">;

type BlacklistItem = {
  id: string;
  note: string;
  type: BlacklistType;
  value: string;
};

const blacklistItems: BlacklistItem[] = [
  {
    id: "phone-1",
    note: "加入時間：今天",
    type: "電話",
    value: "+886 987 654 321",
  },
  {
    id: "line-1",
    note: "加入時間：昨天",
    type: "LINE ID",
    value: "@1234",
  },
];

const typeStyleMap: Record<
  BlacklistType,
  {
    backgroundColor: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
  }
> = {
  電話: {
    backgroundColor: "#eaf2ff",
    icon: "call",
    iconColor: "#5c92f5",
  },
  "LINE ID": {
    backgroundColor: "#edfbf2",
    icon: "chatbubble-ellipses",
    iconColor: "#24c45a",
  },
};

export default function BlacklistScreen() {
  const [activeTab, setActiveTab] = useState<FilterTab>("全部");
  const [isEditing, setIsEditing] = useState(false);

  const visibleItems = useMemo(() => {
    if (activeTab === "全部") {
      return blacklistItems;
    }

    return blacklistItems.filter((item) => item.type === activeTab);
  }, [activeTab]);

  const handleAdd = () => {
    Alert.alert("新增黑名單", "之後可以在這裡加入電話或 LINE ID。");
  };

  const handleRemove = (item: BlacklistItem) => {
    Alert.alert("移除黑名單", `是否要移除 ${item.value}？`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" size={36} color="#0d0d0d" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>我的黑名單</Text>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing((current) => !current)}
            activeOpacity={0.75}
          >
            <Text style={styles.editText}>{isEditing ? "完成" : "編輯"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabRow}>
          {filterTabs.map((tab) => {
            const isActive = tab === activeTab;

            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.78}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {visibleItems.length > 0 ? (
            visibleItems.map((item) => {
              const typeStyle = typeStyleMap[item.type];

              return (
                <View key={item.id} style={styles.blacklistCard}>
                  <View style={[styles.itemIcon, { backgroundColor: typeStyle.backgroundColor }]}>
                    {item.type === "LINE ID" ? (
                      <Image
                        source={require("@/assets/images/line.png")}
                        style={styles.lineIcon}
                        resizeMode="contain"
                      />
                    ) : (
                      <Ionicons name={typeStyle.icon} size={24} color={typeStyle.iconColor} />
                    )}
                  </View>

                  <View style={styles.itemInfo}>
                    <Text style={styles.itemValue}>{item.value}</Text>
                    <Text style={styles.itemNote}>{item.note}</Text>
                    <Text style={styles.itemType}>類型：{item.type}</Text>
                  </View>

                  {isEditing && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemove(item)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="trash-outline" size={20} color="#ff4d6d" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="shield-checkmark-outline" size={42} color="#b8c5d8" />
              <Text style={styles.emptyTitle}>這裡目前沒有資料</Text>
              <Text style={styles.emptyText}>切換分類或新增黑名單後會顯示在這裡。</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.addButton} onPress={handleAdd} activeOpacity={0.84}>
            <Text style={styles.addButtonText}>新增黑名單</Text>
          </TouchableOpacity>
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
  screen: {
    flex: 1,
    backgroundColor: "#f8fbff",
  },
  header: {
    height: 68,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
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
  editButton: {
    minWidth: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  editText: {
    color: "#397bf2",
    fontSize: 14,
    fontWeight: "800",
  },
  tabRow: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  tabButton: {
    flex: 1,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    backgroundColor: "#e8f1ff",
  },
  tabText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#397bf2",
    fontWeight: "900",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingBottom: 116,
  },
  blacklistCard: {
    minHeight: 82,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#9db0cf",
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  itemIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  lineIcon: {
    width: 26,
    height: 26,
  },
  itemInfo: {
    flex: 1,
  },
  itemValue: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 5,
  },
  itemNote: {
    color: "#8aa4c5",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 2,
  },
  itemType: {
    color: "#8aa4c5",
    fontSize: 12,
    fontWeight: "700",
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff0f3",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  emptyCard: {
    minHeight: 190,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    marginTop: 8,
  },
  emptyTitle: {
    color: "#5e7190",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 10,
  },
  emptyText: {
    color: "#9aacc8",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 5,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 9,
    paddingTop: 12,
    paddingBottom: 26,
    backgroundColor: "#f8fbff",
  },
  addButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#397bf2",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
});
