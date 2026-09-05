import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const tabConfig = {
  reports: { label: "通報紀錄", icon: "newspaper-outline" },
  explore: { label: "防詐情報站", icon: "book-outline" },
  index: { label: "首頁", icon: "home-outline" },
  chat: { label: "AI聊天室", icon: "chatbubbles-outline" },
  profile: { label: "我的", icon: "person-outline" },
} as const;

const menuOrder: (keyof typeof tabConfig)[] = [
  "index",
  "reports",
  "explore",
  "chat",
  "profile",
];

function HamburgerMenu({ state, navigation }: BottomTabBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentRouteName = state.routes[state.index]?.name as keyof typeof tabConfig;
  const currentItem = tabConfig[currentRouteName] ?? tabConfig.index;

  const navigateTo = (name: keyof typeof tabConfig) => {
    const route = state.routes.find((item) => item.name === name);
    if (!route) return;

    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });

    if (event.defaultPrevented) return;

    setIsOpen(false);
    navigation.navigate(route.name);
  };

  return (
    <View pointerEvents="box-none" style={styles.menuLayer}>
      {isOpen && (
        <>
          <Pressable style={styles.scrim} onPress={() => setIsOpen(false)} />
          <View style={styles.menuPanel}>
            <View style={styles.menuHeader}>
              <View>
                <Text style={styles.menuTitle}>功能選單</Text>
                <Text style={styles.menuSubtitle}>選擇要前往的頁面</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsOpen(false)}
                activeOpacity={0.78}
              >
                <Ionicons name="close" size={22} color="#627086" />
              </TouchableOpacity>
            </View>

            <View style={styles.menuList}>
              {menuOrder.map((name) => {
                const item = tabConfig[name];
                const isActive = name === currentRouteName;

                return (
                  <TouchableOpacity
                    key={name}
                    style={[styles.menuItem, isActive && styles.menuItemActive]}
                    onPress={() => navigateTo(name)}
                    activeOpacity={0.82}
                  >
                    <View style={[styles.menuIconBox, isActive && styles.menuIconBoxActive]}>
                      <Ionicons
                        name={item.icon as keyof typeof Ionicons.glyphMap}
                        size={23}
                        color={isActive ? "#ffffff" : "#397bf2"}
                      />
                    </View>
                    <Text style={[styles.menuItemText, isActive && styles.menuItemTextActive]}>
                      {item.label}
                    </Text>
                    {isActive && <Ionicons name="checkmark" size={19} color="#397bf2" />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </>
      )}

      <TouchableOpacity
        style={styles.floatingMenuButton}
        onPress={() => setIsOpen((open) => !open)}
        activeOpacity={0.84}
      >
        <Ionicons name={isOpen ? "close" : "menu"} size={28} color="#ffffff" />
        <Text style={styles.floatingMenuLabel}>{currentItem.label}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="index"
      tabBar={(props) => <HamburgerMenu {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="reports" options={{ title: tabConfig.reports.label }} />
      <Tabs.Screen name="explore" options={{ title: tabConfig.explore.label }} />
      <Tabs.Screen name="index" options={{ title: tabConfig.index.label }} />
      <Tabs.Screen name="chat" options={{ title: tabConfig.chat.label }} />
      <Tabs.Screen name="profile" options={{ title: tabConfig.profile.label }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  menuLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    pointerEvents: "box-none",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.26)",
  },
  menuPanel: {
    marginHorizontal: 14,
    marginBottom: 86,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    shadowColor: "#64748b",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 10,
  },
  menuHeader: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  menuTitle: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "900",
  },
  menuSubtitle: {
    color: "#8a97a8",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  menuList: {
    gap: 8,
  },
  menuItem: {
    minHeight: 58,
    borderRadius: 16,
    backgroundColor: "#f8fbff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  menuItemActive: {
    backgroundColor: "#e8f1ff",
    borderWidth: 1,
    borderColor: "#cfe0ff",
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#edf4ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuIconBoxActive: {
    backgroundColor: "#397bf2",
  },
  menuItemText: {
    flex: 1,
    color: "#223047",
    fontSize: 15,
    fontWeight: "800",
  },
  menuItemTextActive: {
    color: "#397bf2",
    fontWeight: "900",
  },
  floatingMenuButton: {
    position: "absolute",
    right: 16,
    bottom: 22,
    height: 54,
    minWidth: 116,
    borderRadius: 27,
    backgroundColor: "#397bf2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
  },
  floatingMenuLabel: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
    marginLeft: 7,
  },
});
