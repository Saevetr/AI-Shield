import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
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

const initialBlacklistItems: BlacklistItem[] = [
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
  const [blacklistItems, setBlacklistItems] = useState<BlacklistItem[]>(initialBlacklistItems);
  const [newItemNote, setNewItemNote] = useState("");
  const [newItemType, setNewItemType] = useState<BlacklistType>("電話");
  const [newItemValue, setNewItemValue] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const visibleItems = useMemo(() => {
    if (activeTab === "全部") {
      return blacklistItems;
    }

    return blacklistItems.filter((item) => item.type === activeTab);
  }, [activeTab, blacklistItems]);

  const closeAddModal = () => {
    setShowAddModal(false);
    setNewItemType("電話");
    setNewItemValue("");
    setNewItemNote("");
  };

  const formatToday = () => {
    const now = new Date();
    return `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
  };

  const handleAdd = () => {
    setShowAddModal(true);
  };

  const handleSubmitAdd = () => {
    const trimmedValue = newItemValue.trim();
    const trimmedNote = newItemNote.trim();

    if (!trimmedValue) {
      Alert.alert("新增失敗", newItemType === "電話" ? "請輸入電話號碼" : "請輸入 LINE ID");
      return;
    }

    if (newItemType === "電話") {
      const phoneValue = trimmedValue.replace(/[\s()-]/g, "");

      if (!/^\+?\d{6,15}$/.test(phoneValue)) {
        Alert.alert("新增失敗", "請輸入完整電話號碼，例如：0912345678 或 +886912345678");
        return;
      }
    }

    if (newItemType === "LINE ID" && !/^@?[a-zA-Z0-9._-]{3,}$/.test(trimmedValue)) {
      Alert.alert("新增失敗", "LINE ID 至少需要 3 個字元，可包含英文、數字、底線、句點、@ 或連字號");
      return;
    }

    const isDuplicate = blacklistItems.some(
      (item) =>
        item.type === newItemType &&
        item.value.trim().toLowerCase() === trimmedValue.toLowerCase()
    );

    if (isDuplicate) {
      Alert.alert("新增失敗", "這筆資料已經在黑名單中");
      return;
    }

    setBlacklistItems((currentItems) => [
      {
        id: `${newItemType}-${Date.now()}`,
        note: trimmedNote || `加入時間：${formatToday()}`,
        type: newItemType,
        value: trimmedValue,
      },
      ...currentItems,
    ]);
    setActiveTab(newItemType);
    closeAddModal();
    Alert.alert("新增成功", "已加入我的黑名單");
  };

  const handleRemove = (item: BlacklistItem) => {
    Alert.alert("移除黑名單", `是否要移除 ${item.value}？`, [
      { text: "取消", style: "cancel" },
      {
        text: "移除",
        style: "destructive",
        onPress: () => {
          setBlacklistItems((currentItems) =>
            currentItems.filter((currentItem) => currentItem.id !== item.id)
          );
        },
      },
    ]);
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

        <Modal
          visible={showAddModal}
          transparent
          animationType="fade"
          onRequestClose={closeAddModal}
        >
          <TouchableWithoutFeedback onPress={closeAddModal}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <View style={styles.modalCard}>
                  <View style={styles.modalHeader}>
                    <View>
                      <Text style={styles.modalTitle}>新增黑名單</Text>
                      <Text style={styles.modalSubtitle}>加入可疑電話或 LINE ID</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={closeAddModal}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="close" size={22} color="#6c86aa" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.typeSelector}>
                    {(["電話", "LINE ID"] as const).map((type) => {
                      const isActive = type === newItemType;

                      return (
                        <TouchableOpacity
                          key={type}
                          style={[styles.typeButton, isActive && styles.typeButtonActive]}
                          onPress={() => setNewItemType(type)}
                          activeOpacity={0.78}
                        >
                          <Ionicons
                            name={type === "電話" ? "call-outline" : "chatbubble-ellipses-outline"}
                            size={18}
                            color={isActive ? "#397bf2" : "#8a97a8"}
                          />
                          <Text style={[styles.typeButtonText, isActive && styles.typeButtonTextActive]}>
                            {type}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.inputLabel}>
                    {newItemType === "電話" ? "電話號碼" : "LINE ID"}
                  </Text>
                  <View style={styles.inputBox}>
                    <Ionicons
                      name={newItemType === "電話" ? "call-outline" : "chatbubble-ellipses-outline"}
                      size={21}
                      color="#8aa4c5"
                    />
                    <TextInput
                      style={styles.input}
                      placeholder={newItemType === "電話" ? "例如：0912345678" : "例如：@example"}
                      placeholderTextColor="#a8b4c6"
                      value={newItemValue}
                      onChangeText={setNewItemValue}
                      autoCapitalize="none"
                      keyboardType={newItemType === "電話" ? "phone-pad" : "default"}
                    />
                  </View>

                  <Text style={styles.inputLabel}>備註</Text>
                  <View style={[styles.inputBox, styles.noteInputBox]}>
                    <Ionicons name="document-text-outline" size={21} color="#8aa4c5" />
                    <TextInput
                      style={[styles.input, styles.noteInput]}
                      placeholder="例如：可疑來電、假客服帳號"
                      placeholderTextColor="#a8b4c6"
                      value={newItemNote}
                      onChangeText={setNewItemNote}
                      multiline
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.modalAddButton}
                    onPress={handleSubmitAdd}
                    activeOpacity={0.84}
                  >
                    <Text style={styles.modalAddText}>完成新增</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(31, 41, 55, 0.34)",
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  modalCard: {
    borderRadius: 22,
    backgroundColor: "#ffffff",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 4,
  },
  modalSubtitle: {
    color: "#8a97a8",
    fontSize: 12,
    fontWeight: "700",
  },
  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#f1f4f8",
    alignItems: "center",
    justifyContent: "center",
  },
  typeSelector: {
    height: 48,
    borderRadius: 16,
    backgroundColor: "#f3f7fd",
    flexDirection: "row",
    padding: 5,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  typeButtonActive: {
    backgroundColor: "#ffffff",
  },
  typeButtonText: {
    color: "#8a97a8",
    fontSize: 14,
    fontWeight: "800",
  },
  typeButtonTextActive: {
    color: "#397bf2",
    fontWeight: "900",
  },
  inputLabel: {
    color: "#5e7190",
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 2,
    marginBottom: 7,
  },
  inputBox: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dbe8f7",
    backgroundColor: "#f8fbff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    marginBottom: 13,
    gap: 9,
  },
  input: {
    flex: 1,
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
    paddingVertical: 0,
  },
  noteInputBox: {
    minHeight: 78,
    alignItems: "flex-start",
    paddingTop: 13,
  },
  noteInput: {
    minHeight: 52,
    lineHeight: 20,
    textAlignVertical: "top",
  },
  modalAddButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: "#397bf2",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  modalAddText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 2,
  },
});
