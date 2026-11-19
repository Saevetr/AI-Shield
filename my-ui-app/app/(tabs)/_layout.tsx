import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Text } from "@/components/app-text";
import { useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { getFontScale, useFontSize } from "@/utils/fontSize";

import { tabLayoutStyles as styles } from "../../styles/tabs.styles";

export const unstable_settings = {
  anchor: "index",
};

const tabConfig = {
  index: { label: "首頁", icon: "home-outline" },
  chat: { label: "AI 聊天室", icon: "chatbubbles-outline" },
  explore: { label: "防詐情報站", icon: "book-outline" },
  reports: { label: "通報紀錄", icon: "document-text-outline" },
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
    <View
      style={[styles.iconBox, focused && styles.iconBoxActive]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Ionicons
        name={item.icon as keyof typeof Ionicons.glyphMap}
        size={24}
        color={focused ? "#397bf2" : "#4b5563"}
      />
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const { fontSize } = useFontSize();
  const labelHeight = Math.ceil(
    Math.round(styles.tabLabel.lineHeight * getFontScale(fontSize)) * Math.max(1, fontScale)
  );
  const bottomPadding = Math.min(insets.bottom, 12);
  const contentHeight = styles.iconBox.height + styles.tabLabel.marginTop + labelHeight;

  return (
    <Tabs
      backBehavior="initialRoute"
      screenOptions={{
        headerShown: false,
        tabBarButton: (props) => <HapticTab {...props} style={[props.style, styles.tabButton]} />,
        tabBarShowLabel: true,
        tabBarLabelPosition: "below-icon",
        tabBarLabel: ({ focused, children }) => (
          <Text numberOfLines={1} style={[styles.tabLabel, focused && styles.tabLabelActive]}>
            {children}
          </Text>
        ),
        tabBarIconStyle: styles.tabIcon,
        tabBarStyle: [styles.tabBar, {
          height: contentHeight + styles.tabBar.paddingTop + bottomPadding,
          paddingBottom: bottomPadding,
        }],
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: tabConfig.chat.label,
          tabBarAccessibilityLabel: tabConfig.chat.label,
          tabBarIcon: ({ focused }) => <TabIcon name="chat" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: tabConfig.index.label,
          tabBarAccessibilityLabel: tabConfig.index.label,
          tabBarIcon: ({ focused }) => <TabIcon name="index" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: tabConfig.explore.label,
          tabBarIcon: ({ focused }) => <TabIcon name="explore" focused={focused} />,
          tabBarItemStyle: styles.hiddenTabItem,
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: tabConfig.reports.label,
          tabBarIcon: ({ focused }) => <TabIcon name="reports" focused={focused} />,
          tabBarItemStyle: styles.hiddenTabItem,
          tabBarButton: () => null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: tabConfig.profile.label,
          tabBarAccessibilityLabel: tabConfig.profile.label,
          tabBarIcon: ({ focused }) => <TabIcon name="profile" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

