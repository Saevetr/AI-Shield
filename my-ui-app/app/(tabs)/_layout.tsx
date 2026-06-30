import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

import { HapticTab } from "@/components/haptic-tab";

import { tabLayoutStyles as styles } from "./tabs.styles";

const tabConfig = {
  reports: { label: "通報紀錄", icon: "newspaper-outline" },
  explore: { label: "防詐情報站", icon: "book-outline" },
  index: { label: "首頁", icon: "home-outline" },
  chat: { label: "AI聊天室", icon: "chatbubbles-outline" },
  profile: { label: "我的資料", icon: "person-outline" },
} as const;

function TabIcon({
  name,
  focused,
}: {
  name: keyof typeof tabConfig;
  focused: boolean;
}) {
  const item = tabConfig[name];

  return (
    <View style={styles.tabIconWrap}>
      <View style={[styles.iconBox, focused && styles.iconBoxActive]}>
        <Ionicons
          name={item.icon as keyof typeof Ionicons.glyphMap}
          size={29}
          color={focused ? "#111827" : "#111827"}
        />
      </View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
        {item.label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="reports"
        options={{
          title: tabConfig.reports.label,
          tabBarIcon: ({ focused }) => <TabIcon name="reports" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: tabConfig.explore.label,
          tabBarIcon: ({ focused }) => <TabIcon name="explore" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: tabConfig.index.label,
          tabBarIcon: ({ focused }) => <TabIcon name="index" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: tabConfig.chat.label,
          tabBarIcon: ({ focused }) => <TabIcon name="chat" focused={focused} />,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: tabConfig.profile.label,
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

