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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { chatStyles as styles } from "./tabs.styles";

// 修正後的資料結構：增加 sender 欄位區分使用者與 AI
type ChatMessage = {
  id: string;
  sender: "user" | "ai";
  type: "text" | "image";
  text?: string;
  uri?: string;
};

// ⭐️ 請根據你後端運行的真實 IP 進行修改 (Node.js 本地測試通常是 http://你的電腦IP:3000)
// 注意：如果是在實機上測試，不能用 localhost，要用跟你手機同一個 Wi-Fi 的電腦 IP 喔！
const BACKEND_URL = "http://192.168.1.100:3000/api/analyze-scam"; 

export default function ChatScreen() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "ai",
      type: "text",
      text: "你好！我是你的 AI 防詐騙專家。你可以傳送可疑的簡訊文字、對話截圖，我會為你進行多模態深度分析。",
    },
  ]);
  
  // 暫存當前選取的圖片，發送後才清空
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  // 載入中狀態 (打 API 時顯示轉圈圈)
  const [isLoading, setIsLoading] = useState(false);

  // 點擊相簿只把圖片存到暫存狀態，不直接送出
  const handleAttachImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert("需要權限", "請允許相簿權限後再上傳圖片");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleVoiceInput = () => {
    Alert.alert("語音功能提示", "你可以使用手機內建的輸入法語音轉文字功能輸入。若需上傳即時錄音檔，可配合專案錄音套件將音檔夾帶至後端。");
  };

  // 核心：發送文字與圖片至後端 API
  const handleSend = async () => {
    const trimmedMessage = message.trim();

    // 如果沒打字也沒選圖片，就不發送
    if (!trimmedMessage && !selectedImage) return;

    const timestamp = Date.now().toString();
    const newMessages: ChatMessage[] = [];

    // 1. 如果有選圖片，先把圖片塞進前端聊天畫面 (顯示使用者發送)
    if (selectedImage) {
      newMessages.push({
        id: `user-img-${timestamp}`,
        sender: "user",
        type: "image",
        uri: selectedImage,
      });
    }

    // 2. 如果有輸入文字，把文字塞進前端聊天畫面 (顯示使用者發送)
    if (trimmedMessage) {
      newMessages.push({
        id: `user-txt-${timestamp}`,
        sender: "user",
        type: "text",
        text: trimmedMessage,
      });
    }

    // 更新畫面顯示使用者剛剛送出的內容
    setMessages((current) => [...current, ...newMessages]);
    
    // 清空當前輸入狀態，並開啟 Loading 鎖定
    const imageToSend = selectedImage; // 複製一份拿來打 API
    setMessage("");
    setSelectedImage(null);
    setIsLoading(true);

    try {
      // 3. 建立後端 Multer 認得的 FormData 格式
      const formData = new FormData();
      
      if (trimmedMessage) {
        formData.append("text", trimmedMessage);
      }

      if (imageToSend) {
        const uriParts = imageToSend.split(".");
        const fileType = uriParts[uriParts.length - 1]; // 取得副檔名 (jpg/png)

        // @ts-ignore (打包 React Native 檔案格式至 FormData)
        formData.append("scamImage", {
          uri: Platform.OS === "android" ? imageToSend : imageToSend.replace("file://", ""),
          name: `scam_capture.${fileType}`,
          type: `image/${fileType === "png" ? "png" : "jpeg"}`,
        });
      }

      // 4. 發送請求給 Node.js 後端
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const result = await response.json();

      if (result.success && result.data?.analysisReport) {
        // 5. 成功拿到 AI 回覆，塞進聊天畫面中
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
    } catch (error: any) {
      console.error("API Error:", error);
      Alert.alert("連線失敗", "無法連接至防詐伺服器，請檢查網路或後端設定。");
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
        {/* Header */}
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

        {/* 聊天訊息區 (已清除畫面紅線與重複標籤) */}
        <ScrollView
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          ref={(ref) => ref?.scrollToEnd({ animated: true })} // 自動捲動到底部
        >
          {messages.map((item) => (
            <View
              key={item.id}
              style={[
                styles.messageRow,
                item.sender === "user" ? styles.rowUser : styles.rowAI,
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

          {/* AI 正在思考的轉圈圈提示 */}
          {isLoading && (
            <View style={styles.rowAI}>
              <View style={[styles.aiBubble, styles.loadingBubble]}>
                <ActivityIndicator size="small" color="#0d0d0d" style={{ marginRight: 8 }} />
                <Text style={styles.aiBubbleText}>AI 專家正在分析中...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* 圖片預覽區：如果在相簿選了圖，在輸入框上方跳出小預覽與刪除鈕 */}
        {selectedImage && (
          <View style={styles.previewContainer}>
            <Image source={{ uri: selectedImage }} style={styles.previewImage} />
            <TouchableOpacity style={styles.closePreview} onPress={() => setSelectedImage(null)}>
              <Ionicons name="close-circle" size={20} color="#ff4d4f" />
            </TouchableOpacity>
          </View>
        )}

        {/* 輸入欄 */}
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
              placeholder={selectedImage ? "選取了圖片，可在此補充文字描述..." : "輸入文字、或上傳圖片..."}
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

