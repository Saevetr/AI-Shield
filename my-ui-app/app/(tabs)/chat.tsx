import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput } from "@/components/app-text";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

// 擴充訊息型別定義：支援文字、圖片、通話錄音多模態分析
type ChatMessage = {
  id: string;
  sender: "user" | "ai";
  type: "text" | "image" | "audio";
  text?: string;
  uri?: string;
  audioName?: string;
};

const STORAGE_KEY = "ai_chat_history_v1";

const WELCOME_MESSAGE: ChatMessage = {
  id: "welcome",
  sender: "ai",
  type: "text",
  text: "你好！我是 AI 防詐多模態專家。你可以傳送可疑文字、聊天截圖或點擊麥克風進行通話錄音分析，我會為你即時辨識潛在詐騙與合成語音（Deepfake）特徵。",
};

const SAMPLE_VOICE_SCENARIOS = [
  {
    id: "v1",
    title: "假檢警：要求至 ATM 操作安全帳戶",
    desc: "典型公務機關涉案恐嚇話術，語氣急迫催促、禁止掛電話",
    transcript: "我是台北地檢署陳檢察官，你的帳戶涉及重大洗錢案已被凍結，請立刻至最近的 ATM 配合操作進行資金監管，不可告訴任何人！",
    filename: "scam_voice_prosecutor.m4a",
  },
  {
    id: "v2",
    title: "解除分期付款：購物網站訂單重複扣款",
    desc: "假冒電商客服與銀行專員，誘導開啟網銀或無卡存款",
    transcript: "您好，這裡是博客來客服，因系統失誤將您的訂單設為 12 期重複扣款，稍後銀行專員會致電協助您至網銀解除設定。",
    filename: "scam_voice_ecommerce.m4a",
  },
  {
    id: "v3",
    title: "AI 聲音複製 (Deepfake)：親友求急借錢",
    desc: "高度擬真聲線假冒子女或熟人，謊稱出車禍或急需周轉",
    transcript: "爸，是我！我跟朋友出車禍了，對方要我馬上賠五萬塊私下和解不然要報警，我把帳號傳給你，趕快匯過來救我！",
    filename: "scam_voice_deepfake.m4a",
  },
] as const;

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://ai-shield-m68d.onrender.com";
const BACKEND_URL = `${API_URL}/api/analyze-scam`;

export default function ChatScreen() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  // 1. 本地載入歷史對話紀錄，避免跳轉後遺失
  useEffect(() => {
    let isMounted = true;
    const loadCachedChat = async () => {
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEY);
        if (cached && isMounted) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        }
      } catch {
        // ignore
      }
    };
    loadCachedChat();
    return () => {
      isMounted = false;
    };
  }, []);

  const saveMessages = useCallback(
    (next: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      setMessages((prev) => {
        const updated = typeof next === "function" ? next(prev) : next;
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    },
    []
  );

  // 2. 清空對話功能
  const handleClearHistory = () => {
    Alert.alert("清空對話", "確定要清空所有的防詐對話與分析報告嗎？", [
      { text: "取消", style: "cancel" },
      {
        text: "確定清空",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem(STORAGE_KEY);
          setMessages([WELCOME_MESSAGE]);
          setSelectedImage(null);
          setMessage("");
        },
      },
    ]);
  };

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
      setSelectedImage(result.assets[0].uri);
    }
  };

  // 3. 語音通話與 AI 合成聲線檢測選單
  const handleVoiceInput = () => {
    setShowVoiceModal(true);
  };

  // 4. 發送語音錄音與通話情境進行多模態深度辨識
  const handleAnalyzeVoiceScenario = async (
    scenario: (typeof SAMPLE_VOICE_SCENARIOS)[number]
  ) => {
    setShowVoiceModal(false);
    setIsLoading(true);

    const timestamp = Date.now().toString();
    const userAudioMsg: ChatMessage = {
      id: `user-audio-${timestamp}`,
      sender: "user",
      type: "audio",
      text: scenario.transcript,
      audioName: scenario.title,
    };

    saveMessages((current) => [...current, userAudioMsg]);

    try {
      const formData = new FormData();
      formData.append(
        "text",
        `[🎵 通話錄音檔案分析: ${scenario.title}]。\n錄音逐字稿內容: "${scenario.transcript}"。\n請扮演台灣防詐專家，針對上述通話錄音進行多模態深度辨識：1. 詐騙風險指數 (0-100%) 2. 是否具備高壓急迫恐嚇/詐騙話術特徵 3. 是否疑似 AI 語音合成/Deepfake 克隆聲線 4. 具體防範處置建議。`
      );

      const dummyAudio = {
        uri: Platform.OS === "android" ? `file://${scenario.filename}` : scenario.filename,
        name: scenario.filename,
        type: "audio/m4a",
      };
      // @ts-ignore
      formData.append("scamAudio", dummyAudio);

      const response = await fetch(BACKEND_URL, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (result.success && result.data?.analysisReport) {
        saveMessages((current) => [
          ...current,
          {
            id: `ai-${Date.now()}`,
            sender: "ai",
            type: "text",
            text: result.data.analysisReport,
          },
        ]);
      } else {
        throw new Error(result.message || "語音分析失敗");
      }
    } catch (err: any) {
      console.error("Voice scam analysis error:", err);
      Alert.alert("語音分析失敗", err.message || "無法連線伺服器進行語音分析");
    } finally {
      setIsLoading(false);
    }
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
      // 注意：不可手動指定 Content-Type 為 multipart/form-data，否則會遺失 boundary 導致 Multer 解析失敗
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        body: formData,
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

          <Text style={styles.headerTitle}>AI防詐多模態聊天室</Text>

          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearHistory}
            activeOpacity={0.75}
            disabled={isLoading}
          >
            <Ionicons name="trash-outline" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* 聊天對話紀錄滾動區 */}
        <ScrollView
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
          ref={(ref) => ref?.scrollToEnd({ animated: true })}
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
              ) : item.type === "image" ? (
                <View style={styles.imageBubble}>
                  <Image source={{ uri: item.uri }} style={styles.chatImage} />
                </View>
              ) : (
                <View style={styles.audioBubble}>
                  <View style={styles.audioIconCircle}>
                    <Ionicons name="mic" size={18} color="#ffffff" />
                  </View>
                  <View style={styles.audioMeta}>
                    <Text style={styles.audioTitle}>{item.audioName || "通話錄音檔"}</Text>
                    <Text style={styles.audioTranscript} numberOfLines={2}>
                      {item.text}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          ))}

          {/* AI 正在思考分析的等待提示 */}
          {isLoading && (
            <View style={styles.rowAI}>
              <View style={[styles.aiBubble, styles.loadingBubble]}>
                <ActivityIndicator size="small" color="#397bf2" style={{ marginRight: 8 }} />
                <Text style={styles.aiBubbleText}>AI 防詐專家正在多模態辨識中...</Text>
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
            <Ionicons name="image-outline" size={26} color="#0d0d0d" />
          </TouchableOpacity>

          <View style={styles.inputBox}>
            <TextInput
              style={styles.input}
              placeholder={selectedImage ? "已附加圖片，可在此補充對話細節..." : "輸入文字、上傳圖片或語音..."}
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
            disabled={isLoading}
          >
            <Ionicons name="mic-outline" size={26} color="#397bf2" />
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
              color={message.trim() || selectedImage ? "#397bf2" : "#94a3b8"}
            />
          </TouchableOpacity>
        </View>

        {/* 🎙️ 語音通話與 AI Deepfake 檢測選擇彈窗 */}
        <Modal visible={showVoiceModal} transparent animationType="fade">
          <TouchableOpacity
            style={styles.voiceOverlay}
            activeOpacity={1}
            onPress={() => setShowVoiceModal(false)}
          >
            <TouchableOpacity activeOpacity={1} style={styles.voiceCard}>
              <View style={styles.voiceHeader}>
                <View>
                  <Text style={styles.voiceHeaderTitle}>實時語音與通話防詐檢測</Text>
                  <Text style={styles.voiceHeaderSubtitle}>選擇通話錄音或可疑語音送交 AI 模型分析</Text>
                </View>
                <TouchableOpacity
                  style={styles.voiceClose}
                  onPress={() => setShowVoiceModal(false)}
                >
                  <Ionicons name="close" size={20} color="#8a97a8" />
                </TouchableOpacity>
              </View>

              {SAMPLE_VOICE_SCENARIOS.map((sc) => (
                <TouchableOpacity
                  key={sc.id}
                  style={styles.voiceScenarioItem}
                  activeOpacity={0.82}
                  onPress={() => handleAnalyzeVoiceScenario(sc)}
                >
                  <View style={styles.voiceIconWrap}>
                    <Ionicons name="volume-high" size={22} color="#397bf2" />
                  </View>
                  <View style={styles.voiceScenarioBody}>
                    <Text style={styles.voiceScenarioTitle}>{sc.title}</Text>
                    <Text style={styles.voiceScenarioDesc}>{sc.desc}</Text>
                  </View>
                  <Ionicons name="play-circle" size={26} color="#397bf2" />
                </TouchableOpacity>
              ))}

              <View style={styles.voiceHintBox}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#10b981" />
                <Text style={styles.voiceHintText}>
                  支援辨識 TTS 合成語音、情緒壓迫與聲線異常。
                </Text>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
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
  headerTitle: { color: "#111827", fontSize: 18, fontWeight: "700" },
  clearButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
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

  // 🎵 語音錄音泡泡
  audioBubble: {
    maxWidth: "82%",
    borderRadius: 16,
    borderBottomRightRadius: 4,
    backgroundColor: "#2563eb",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  audioIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  audioMeta: { flex: 1 },
  audioTitle: { color: "#ffffff", fontSize: 13, fontWeight: "700", marginBottom: 2 },
  audioTranscript: { color: "rgba(255, 255, 255, 0.85)", fontSize: 11, lineHeight: 15 },

  // 🎙️ 語音對話彈窗
  voiceOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  voiceCard: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: "#ffffff",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  voiceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  voiceHeaderTitle: { fontSize: 17, fontWeight: "800", color: "#111827", marginBottom: 3 },
  voiceHeaderSubtitle: { fontSize: 12, color: "#8a97a8" },
  voiceClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  voiceScenarioItem: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fbff",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  voiceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  voiceScenarioBody: { flex: 1 },
  voiceScenarioTitle: { fontSize: 13, fontWeight: "700", color: "#1e293b", marginBottom: 2 },
  voiceScenarioDesc: { fontSize: 11, color: "#64748b" },
  voiceHintBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  voiceHintText: { fontSize: 11, color: "#166534", marginLeft: 6, flex: 1 },
});
