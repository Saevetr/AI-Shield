import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
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

// 擴充訊息型別定義：支援區分 user / ai，並能同時容納文字與圖片
type ChatMessage = {
  id: string;
  sender: "user" | "ai";
  type: "text" | "image";
  text?: string;
  uri?: string;
};

// ⭐️ 記得將此 IP 修改為你 Node.js 後端伺服器運行的真實區域網路 IP (實機與模擬器不能寫 localhost)
const BACKEND_URL = "http://192.168.1.100:3000/api/analyze-scam";

export default function ChatScreen() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "ai",
      type: "text",
      text: "你好！我是 AI 防詐專家。你可以傳送可疑的對話文字、聊天截圖給我，我會為你進行多模態防詐分析。",
    },
  ]);

  // 暫存使用者挑選但尚未發送的圖片
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  // 控制 AI 分析時的轉圈圈狀態
  const [isLoading, setIsLoading] = useState(false);

  // 串接相簿選取圖片
  const handleAttachImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

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
      // 暫存圖片，等按傳送鈕時再與文字一併打包發送
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleVoiceInput = () => {
    Alert.alert("語音輸入提示", "您可以點擊鍵盤自帶的語音輸入鍵。若要夾帶錄音檔，可封裝音檔至 FormData 的 scamAudio 欄位。");
  };

  // 🚀 核心：打包 FormData 並請求後端的 scam-ai-core 分析
  const handleSend = async () => {
    const trimmedMessage = message.trim();

    // 防呆：如果沒打字也沒選圖片，就不發送
    if (!trimmedMessage && !selectedImage) return;

    const timestamp = Date.now().toString();
    const newMessages: ChatMessage[] = [];

    // 1. 如果有選取圖片，先將圖片塞入本地對話紀錄（靠右顯示）
    if (selectedImage) {
      newMessages.push({
        id: `user-img-${timestamp}`,
        sender: "user",
        type: "image",
        uri: selectedImage,
      });
    }

    // 2. 如果有輸入文字，將文字塞入本地對話紀錄（靠右顯示）
    if (trimmedMessage) {
      newMessages.push({
        id: `user-txt-${timestamp}`,
        sender: "user",
        type: "text",
        text: trimmedMessage,
      });
    }

    // 更新畫面顯示使用者的訊息
    setMessages((current) => [...current, ...newMessages]);

    // 備份即將發送的圖片，並清空輸入欄與暫存狀態，進入 Loading
    const imageToSend = selectedImage;
    setMessage("");
    setSelectedImage(null);
    setIsLoading(true);

    try {
      // 3. 建立符合後端 Multer 要求的 multipart/form-data
      const formData = new FormData();

      if (trimmedMessage) {
        formData.append("text", trimmedMessage); // 對應 req.body.text
      }

      if (imageToSend) {
        const uriParts = imageToSend.split(".");
        const fileType = uriParts[uriParts.length - 1]; // 取得檔名後綴

        // 包裝成 Multer 接收的檔案流格式
        // @ts-ignore
        formData.append("scamImage", {
          uri: Platform.OS === "android" ? imageToSend : imageToSend.replace("file://", ""),
          name: `scam_picker.${fileType}`,
          type: `image/${fileType === "png" ? "png" : "jpeg"}`,
        });
      }

      // 4. 發送請求至後端 index.js -> scam-ai-core.js
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const result = await response.json();

      // 5. 成功收到 Gemini 回傳的分析報告，塞入對話紀錄（靠左顯示）
      if (result.success && result.data?.analysisReport) {
        setMessages((current) => [
          ...current,
          {
            id: `ai-${Date.now()}`,
            sender: "ai",
            type: "text",
            text: result.data.analysisReport,
          },
        ]);
      } else {
        throw new Error(result.message || "分析失敗");
      }
    } catch (error) {
      console.error("Scam Core API Error:", error);
      Alert.alert("分析失敗", "無法連線防詐分析伺服器，請確認網路與後端服務狀態。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header 頂欄 */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/(tabs)")}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" size={36} color="#0d0d0d" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>AI防詐聊天室</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* 聊天對話紀錄滾動區 */}
        <ScrollView
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          ref={(ref) => ref?.scrollToEnd({ animated: true })} // 當有新訊息時，自動滾動到底部
        >
          {messages.map((item) => (
            <View
              key={item.id}
              style={[
                styles.messageRow,
                item.sender === "user" ? styles.rowUser : styles.rowAI, // 修正截圖中的重疊錯亂問題，這裡動態決定左右
              ]}
            >
              {item.type === "text" ? (
                <View style={item.sender === "user" ? styles.userBubble : styles.aiBubble}>
                  <Text style={item.sender === "user" ? styles.userBubbleText : styles.aiBubbleText}>
                    {item.text}
                  </Text>
                </View>
              ) : (
                <View style={styles.imageBubble}>
                  <Image source={{ uri: item.uri }} style={styles.chatImage} />
                </View>
              )}
            </View>
          ))}

          {/* AI 正在思考分析的等待提示 */}
          {isLoading && (
            <View style={styles.rowAI}>
              <View style={[styles.aiBubble, styles.loadingBubble]}>
                <ActivityIndicator size="small" color="#397bf2" style={{ marginRight: 8 }} />
                <Text style={styles.aiBubbleText}>AI 防詐專家正在深度分析中...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* 挑選圖片後的預覽小框（位於輸入欄上方，可隨時取消） */}
        {selectedImage && (
          <View style={styles.previewContainer}>
            <Image source={{ uri: selectedImage }} style={styles.previewImage} />
            <TouchableOpacity style={styles.closePreview} onPress={() => setSelectedImage(null)}>
              <Ionicons name="close-circle" size={22} color="#ff4d4f" />
            </TouchableOpacity>
          </View>
        )}

        {/* 下方輸入控制工具列 */}
        <View style={styles.inputBar}>
          <TouchableOpacity
            style={styles.toolButton}
            onPress={handleAttachImage}
            activeOpacity={0.75}
            disabled={isLoading}
          >
            <Ionicons name="image-outline" size={27} color="#0d0d0d" />
          </TouchableOpacity>

          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              placeholder={selectedImage ? "已附加圖片，可在此補充對話細節..." : "輸入文字、或上傳圖片..."}
              placeholderTextColor="#9aa4b2"
              value={message}
              onChangeText={setMessage}
              multiline
              editable={!isLoading}
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
            disabled={isLoading}
          >
            <Ionicons
              name="paper-plane-outline"
              size={26}
              color={message.trim() || selectedImage ? "#397bf2" : "#0d0d0d"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#ffffff" },
  screen: { flex: 1, backgroundColor: "#ffffff" },
  header: {
    height: 74,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  backButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#111827", fontSize: 18, fontWeight: "500" },
  headerSpacer: { width: 48 },
  chatArea: { flex: 1, backgroundColor: "#f8fbff" },
  chatContent: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 18 },
  
  // 訊息列基本與動態左右靠齊樣式
  messageRow: { flexDirection: "row", marginBottom: 12 },
  rowUser: { justifyContent: "flex-end" },
  rowAI: { justifyContent: "flex-start" },

  // 使用者對話泡泡（藍底白字）
  userBubble: {
    maxWidth: "78%",
    borderRadius: 16,
    borderBottomRightRadius: 4,
    backgroundColor: "#397bf2",
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  userBubbleText: { color: "#ffffff", fontSize: 14, lineHeight: 20 },

  // AI 專家對話泡泡（白底黑字，帶細灰色邊框）
  aiBubble: {
    maxWidth: "78%",
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    backgroundColor: "#ffffff",
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  aiBubbleText: { color: "#1f2937", fontSize: 14, lineHeight: 22 },
  loadingBubble: { flexDirection: "row", alignItems: "center", backgroundColor: "#f3f4f6" },

  // 圖片對話泡泡容器與樣式
  imageBubble: {
    width: 190,
    height: 190,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    backgroundColor: "#e9eef6",
    overflow: "hidden",
  },
  chatImage: { width: "100%", height: "100%" },
  
  // 圖片挑選暫存預覽區樣式
  previewContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#f1f4f8",
    alignItems: "center",
  },
  previewImage: { width: 55, height: 55, borderRadius: 6 },
  closePreview: { position: "absolute", top: 2, left: 58 },

  // 下方輸入列樣式
  inputBar: {
    minHeight: 56,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 6,
    paddingTop: 7,
    paddingBottom: 7,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  toolButton: { width: 30, height: 40, alignItems: "center", justifyContent: "center" },
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
    fontSize: 14,
    lineHeight: 18,
    paddingVertical: Platform.OS === "ios" ? 9 : 6,
    textAlignVertical: "center",
  },
});