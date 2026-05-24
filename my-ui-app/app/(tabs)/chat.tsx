import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type ChatMessage =
  | { id: string; text: string; type: "text" }
  | { id: string; type: "image"; uri: string };

export default function ChatScreen() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const handleAttachImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert("需要權限", "請允許相簿權限後再上傳圖片");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      mediaTypes: ["images"],
      quality: 0.85,
    });

    if (!result.canceled) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `${Date.now()}-${result.assets[0].uri}`,
          type: "image",
          uri: result.assets[0].uri,
        },
      ]);
    }
  };

  const handleVoiceInput = () => {
    Alert.alert("語音輸入暫停", "Expo Go 暫時不支援這個語音辨識套件");
  };

  const handleSend = () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) return;

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `${Date.now()}-${trimmedMessage}`,
        text: trimmedMessage,
        type: "text",
      },
    ]);

    setMessage("");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" size={36} color="#0d0d0d" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>AI防詐聊天室</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((item) => (
            <View key={item.id} style={styles.messageRow}>
              {item.type === "text" ? (
                <View style={styles.userBubble}>
                  <Text style={styles.userBubbleText}>{item.text}</Text>
                </View>
              ) : (
                <View style={styles.imageBubble}>
                  <Image source={{ uri: item.uri }} style={styles.chatImage} />
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputBar}>
          <TouchableOpacity
            style={styles.toolButton}
            onPress={handleAttachImage}
            activeOpacity={0.75}
          >
            <Ionicons name="image-outline" size={27} color="#0d0d0d" />
          </TouchableOpacity>

          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              placeholder="輸入文字、或上傳圖片..."
              placeholderTextColor="#9aa4b2"
              value={message}
              onChangeText={setMessage}
              multiline
            />
          </View>

          <TouchableOpacity
            style={styles.toolButton}
            onPress={handleVoiceInput}
            activeOpacity={0.75}
          >
            <Ionicons name="mic-outline" size={26} color="#9aa4b2" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolButton}
            onPress={handleSend}
            activeOpacity={0.75}
          >
            <Ionicons name="paper-plane-outline" size={26} color="#0d0d0d" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fbff" },
  screen: { flex: 1, backgroundColor: "#f8fbff" },
  header: {
    height: 74,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 9,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "500",
  },
  headerSpacer: { width: 48 },
  chatArea: { flex: 1, backgroundColor: "#f8fbff" },
  chatContent: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 18,
  },
  messageRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 10,
  },
  userBubble: {
    maxWidth: "78%",
    borderRadius: 16,
    borderBottomRightRadius: 4,
    backgroundColor: "#397bf2",
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  userBubbleText: {
    color: "#ffffff",
    fontSize: 14,
    lineHeight: 20,
  },
  imageBubble: {
    width: 190,
    height: 190,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    backgroundColor: "#e9eef6",
    overflow: "hidden",
  },
  chatImage: { width: "100%", height: "100%" },
  inputBar: {
    minHeight: 56,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 6,
    paddingTop: 7,
    paddingBottom: 7,
    gap: 4,
  },
  toolButton: {
    width: 30,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  inputBox: {
    flex: 1,
    minHeight: 38,
    maxHeight: 92,
    borderRadius: 8,
    backgroundColor: "#f1f4f8",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  input: {
    color: "#111827",
    fontSize: 12,
    lineHeight: 18,
    paddingVertical: Platform.OS === "ios" ? 9 : 6,
    textAlignVertical: "center",
  },
});