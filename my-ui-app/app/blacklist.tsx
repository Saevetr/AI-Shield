import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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

import styles from "./styles";

const API_BASE = "http://localhost:3000";

const filterTabs = ["全部", "電話", "LINE ID"] as const;

type FilterTab = (typeof filterTabs)[number];
type BlacklistType = Exclude<FilterTab, "全部">;

type BlacklistItem = {
  id: number;
  note: string;
  type: BlacklistType;
  value: string;
  created_at?: string;
};

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

const formatDate = (createdAt?: string) => {
  if (!createdAt) {
    return "加入時間：未知";
  }

  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "加入時間：未知";
  }

  return `加入時間：${date.toLocaleString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

export default function BlacklistScreen() {
  const [activeTab, setActiveTab] = useState<FilterTab>("全部");
  const [isEditing, setIsEditing] = useState(false);
  const [items, setItems] = useState<BlacklistItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [newType, setNewType] = useState<BlacklistType>("電話");
  const [newValue, setNewValue] = useState("");
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  const loadBlacklist = useCallback(async () => {
    try {
      setLoading(true);

      const url =
        activeTab === "全部"
          ? `${API_BASE}/api/blacklist`
          : `${API_BASE}/api/blacklist?type=${encodeURIComponent(activeTab)}`;

      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      const nextItems: BlacklistItem[] = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.data)
        ? data.data
        : [];

      setItems(nextItems);
    } catch (error) {
      console.log("讀取黑名單失敗：", error);
      Alert.alert("讀取失敗", "無法讀取黑名單，請確認後端已啟動。");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadBlacklist();
  }, [loadBlacklist]);

  const visibleItems = useMemo(() => {
    if (activeTab === "全部") {
      return items;
    }

    return items.filter((item) => item.type === activeTab);
  }, [items, activeTab]);

  const openAddModal = () => {
    setNewType("電話");
    setNewValue("");
    setNewNote("");
    setModalVisible(true);
  };

  const handleAdd = async () => {
    const value = newValue.trim();
    const note = newNote.trim();

    if (!value) {
      Alert.alert("新增失敗", "請輸入電話或 LINE ID。");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(`${API_BASE}/api/blacklist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: newType,
          value,
          note: note || "使用者自行加入",
        }),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.message || `HTTP ${res.status}`);
      }

      setModalVisible(false);
      await loadBlacklist();

      Alert.alert("新增成功", `${value} 已加入黑名單。`);
    } catch (error: any) {
      console.log("新增黑名單失敗：", error);
      Alert.alert("新增失敗", error?.message || "無法新增黑名單。");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (item: BlacklistItem) => {
    try {
      const res = await fetch(`${API_BASE}/api/blacklist/${item.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.message || `HTTP ${res.status}`);
      }

      await loadBlacklist();
      Alert.alert("刪除成功", `${item.value} 已從黑名單移除。`);
    } catch (error: any) {
      console.log("刪除黑名單失敗：", error);
      Alert.alert("刪除失敗", error?.message || "無法刪除黑名單。");
    }
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
          {loading ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator size="large" color="#397bf2" />
              <Text style={styles.emptyTitle}>讀取黑名單中</Text>
              <Text style={styles.emptyText}>正在從資料庫取得資料。</Text>
            </View>
          ) : visibleItems.length > 0 ? (
            visibleItems.map((item) => {
              const typeStyle = typeStyleMap[item.type];

              return (
                <View key={item.id} style={styles.blacklistCard}>
                  <View
                    style={[
                      styles.itemIcon,
                      { backgroundColor: typeStyle.backgroundColor },
                    ]}
                  >
                    {item.type === "LINE ID" ? (
                      <Image
                        source={require("@/assets/images/line.png")}
                        style={styles.lineIcon}
                        resizeMode="contain"
                      />
                    ) : (
                      <Ionicons
                        name={typeStyle.icon}
                        size={24}
                        color={typeStyle.iconColor}
                      />
                    )}
                  </View>

                  <View style={styles.itemInfo}>
                    <Text style={styles.itemValue}>{item.value}</Text>
                    <Text style={styles.itemNote}>{formatDate(item.created_at)}</Text>
                    <Text style={styles.itemType}>類型：{item.type}</Text>
                    {item.note ? (
                      <Text style={styles.itemNoteText}>備註：{item.note}</Text>
                    ) : null}
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
              <Text style={styles.emptyText}>
                切換分類或新增黑名單後會顯示在這裡。
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={openAddModal}
            activeOpacity={0.84}
          >
            <Text style={styles.addButtonText}>新增黑名單</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalCard}>
                  <Text style={styles.modalTitle}>新增黑名單</Text>
                  <Text style={styles.modalSubtitle}>
                    選擇類型後輸入電話或 LINE ID，資料會寫入 MySQL。
                  </Text>

                  <View style={styles.typeSwitch}>
                    {(["電話", "LINE ID"] as BlacklistType[]).map((type) => {
                      const isActive = newType === type;

                      return (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.typeButton,
                            isActive && styles.typeButtonActive,
                          ]}
                          onPress={() => setNewType(type)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.typeButtonText,
                              isActive && styles.typeButtonTextActive,
                            ]}
                          >
                            {type}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <TextInput
                    value={newValue}
                    onChangeText={setNewValue}
                    placeholder={newType === "電話" ? "例如：0912345678" : "例如：@fake-invest"}
                    placeholderTextColor="#9aacc8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.modalInput}
                  />

                  <TextInput
                    value={newNote}
                    onChangeText={setNewNote}
                    placeholder="備註，可留空"
                    placeholderTextColor="#9aacc8"
                    style={[styles.modalInput, styles.noteInput]}
                    multiline
                  />

                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => setModalVisible(false)}
                      disabled={saving}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.cancelButtonText}>取消</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                      onPress={handleAdd}
                      disabled={saving}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.saveButtonText}>
                        {saving ? "新增中..." : "新增"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

