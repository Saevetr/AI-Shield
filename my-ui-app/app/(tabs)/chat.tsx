import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput } from "@/components/app-text";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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

// 動態安全載入語音辨識模組（若在 Expo Go 缺少原生連線時不導致閃退）
let NativeSpeechModule: any = null;
try {
  const speechModule = require("expo-speech-recognition");
  if (speechModule && speechModule.ExpoSpeechRecognitionModule) {
    NativeSpeechModule = speechModule.ExpoSpeechRecognitionModule;
  }
} catch {
  NativeSpeechModule = null;
}

// 常用可疑通話語音範例（提供點選快速辨識，免受語音檔案無法解析之苦）
const VOICE_PRESETS = [
  {
    title: "假檢警：帳戶洗錢配合監管",
    text: "我是台北地檢署陳檢察官，你的帳戶涉及重大洗錢案已被凍結，請立刻至最近的 ATM 配合操作進行資金監管，不可告訴任何人！",
  },
  {
    title: "解除分期付款：電商重複扣款",
    text: "您好，這裡是博客來客服，因系統失誤將您的訂單設為 12 期重複扣款，稍後銀行專員會致電協助您至網銀解除設定。",
  },
  {
    title: "AI 聲音複製：親友求急借錢",
    text: "爸，是我！我跟朋友出車禍了，對方要我馬上賠五萬塊私下和解不然要報警，我把帳號傳給你，趕快匯過來救我！",
  },
];

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
  text: "你好！我是 AI 防詐多模態專家。你可以傳送可疑文字、聊天截圖或按住麥克風進行「即時語音轉文字辨識」，我會為你即時辨識潛在詐騙與合成語音（Deepfake）特徵。",
};

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "https://ai-shield-m68d.onrender.com";
const BACKEND_URL = `${API_URL}/api/analyze-scam`;

export default function ChatScreen() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [showFallbackModal, setShowFallbackModal] = useState(false);

  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingStartRef = useRef<number>(0);
  const webRecRef = useRef<any>(null);

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

  // 2. 註冊原生語音轉文字監聽事件
  useEffect(() => {
    if (!NativeSpeechModule?.addListener) return;

    let subStart: any;
    let subResult: any;
    let subEnd: any;
    let subError: any;

    try {
      subStart = NativeSpeechModule.addListener("start", () => {
        setIsRecording(true);
      });

      subResult = NativeSpeechModule.addListener("result", (event: any) => {
        const recognized = event.results?.[0]?.transcript;
        if (recognized) {
          setLiveTranscript(recognized);
          setMessage(recognized);
        }
      });

      subEnd = NativeSpeechModule.addListener("end", () => {
        setIsRecording(false);
      });

      subError = NativeSpeechModule.addListener("error", (event: any) => {
        console.warn("Speech recognition error:", event);
        setIsRecording(false);
      });
    } catch (e) {
      console.warn("Failed to attach native speech listener:", e);
    }

    return () => {
      subStart?.remove?.();
      subResult?.remove?.();
      subEnd?.remove?.();
      subError?.remove?.();
    };
  }, []);

  // 清空對話功能
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
          setLiveTranscript("");
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

  // 🎙️ 啟動「即時語音轉文字」辨識
  const startVoiceRecognition = async () => {
    if (isLoading) return;
    setLiveTranscript("");
    setIsRecording(true);
    setRecordingSeconds(0);
    recordingStartRef.current = Date.now();

    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

    // 1. 原生語音辨識支援 (iOS / Android 原生開發版本)
    if (NativeSpeechModule) {
      try {
        const perm = await NativeSpeechModule.requestPermissionsAsync();
        if (!perm?.granted) {
          Alert.alert("需要權限", "請允許語音辨識與麥克風權限以進行即時轉文字。");
          stopVoiceRecognition();
          return;
        }
        NativeSpeechModule.start({
          lang: "zh-TW",
          interimResults: true,
          continuous: true,
          addsPunctuation: true,
        });
        return;
      } catch (err) {
        console.warn("Native speech start error:", err);
      }
    }

    // 2. 網頁端 Web Speech Recognition 支援
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const SpeechRec =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          const rec = new SpeechRec();
          rec.lang = "zh-TW";
          rec.continuous = true;
          rec.interimResults = true;
          rec.onresult = (event: any) => {
            let recognized = "";
            for (let i = 0; i < event.results.length; i++) {
              recognized += event.results[i][0].transcript;
            }
            setLiveTranscript(recognized);
            setMessage(recognized);
          };
          rec.onerror = (e: any) => {
            console.warn("Web speech error:", e);
          };
          rec.onend = () => {
            setIsRecording(false);
          };
          rec.start();
          webRecRef.current = rec;
          return;
        } catch (err) {
          console.warn("Web speech start error:", err);
        }
      }
    }

    // 3. 環境尚未掛載原生語音引擎（如純 Expo Go 環境）時的智慧對話框
    setShowFallbackModal(true);
  };

  // 🎙️ 停止語音轉文字辨識，並將文字直接送交 AI 分析
  const stopVoiceRecognition = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);

    if (NativeSpeechModule) {
      try {
        NativeSpeechModule.stop();
      } catch {}
    }

    if (webRecRef.current) {
      try {
        webRecRef.current.stop();
        webRecRef.current = null;
      } catch {}
    }

    // 檢查是否有即時辨識到的語音文字
    const textToSend = liveTranscript.trim() || message.trim();
    if (textToSend) {
      sendTranscribedText(textToSend);
    }
  };

  // 🚀 發送即時語音轉出的文字送交後端 scam-ai-core 進行深度防詐分析
  const sendTranscribedText = async (transcribedText: string) => {
    if (!transcribedText.trim()) return;

    const timestamp = Date.now().toString();
    const duration = Math.max(1, recordingSeconds || 1);
    const userAudioMsg: ChatMessage = {
      id: `user-audio-${timestamp}`,
      sender: "user",
      type: "audio",
      text: transcribedText,
      audioName: `即時語音轉文字 (${duration}s)`,
    };

    saveMessages((current) => [...current, userAudioMsg]);
    setMessage("");
    setLiveTranscript("");
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append(
        "text",
        `[🎙️ 來電/對話語音即時轉文字內容]: "${transcribedText}"\n請扮演台灣專業防詐專家，針對上述對話語音內容進行深度詐騙意圖、情緒壓迫特徵辨識，評估詐騙風險指數 (0-100%)，並給出核心警告原因與具體防範處置建議。`
      );

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
        throw new Error(result.message || "語音文字分析失敗");
      }
    } catch (err: any) {
      console.error("Voice scam analysis error:", err);
      Alert.alert("分析失敗", err.message || "無法連線伺服器進行語音分析");
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
        if (Platform.OS === "web") {
          const blobRes = await fetch(imageToSend);
          const blob = await blobRes.blob();
          formData.append("scamImage", blob, "scam_picker.jpg");
        } else {
          const uriParts = imageToSend.split(".");
          const fileType = uriParts[uriParts.length - 1] || "jpeg";

          // @ts-ignore
          formData.append("scamImage", {
            uri: imageToSend,
            name: `scam_picker.${fileType}`,
            type: fileType.toLowerCase() === "png" ? "image/png" : "image/jpeg",
          });
        }
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

          {/* 🎙️ 即時語音轉文字按鈕（按住或點擊說話） */}
          <TouchableOpacity
            style={[styles.toolButton, isRecording && styles.toolButtonRecording]}
            onPressIn={startVoiceRecognition}
            onPressOut={stopVoiceRecognition}
            activeOpacity={0.6}
            disabled={isLoading}
          >
            <Ionicons
              name={isRecording ? "mic" : "mic-outline"}
              size={26}
              color={isRecording ? "#ef4444" : "#397bf2"}
            />
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

        {/* 🎙️ 語音即時轉文字時的懸浮提示 HUD */}
        {isRecording && (
          <View style={styles.recordingOverlay}>
            <View style={styles.recordingPulse}>
              <Ionicons name="mic" size={32} color="#ffffff" />
            </View>
            <Text style={styles.recordingText}>
              正在即時語音轉文字... 00:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
            </Text>
            {liveTranscript ? (
              <View style={styles.liveTranscriptBox}>
                <Text style={styles.liveTranscriptText} numberOfLines={3}>
                  "{liveTranscript}"
                </Text>
              </View>
            ) : (
              <Text style={styles.recordingHint}>請開始說話，將即時辨識為中文文字...</Text>
            )}
            <TouchableOpacity
              style={styles.stopRecordingButton}
              onPress={stopVoiceRecognition}
              activeOpacity={0.8}
            >
              <Text style={styles.stopRecordingText}>完成並送交 AI 分析</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 🎙️ 語音轉文字輔助與範例彈窗（支援鍵盤語音聽寫與常見通話詐騙話術） */}
        {showFallbackModal && (
          <Modal visible={showFallbackModal} transparent animationType="fade">
            <TouchableOpacity
              style={styles.fallbackOverlay}
              activeOpacity={1}
              onPress={() => setShowFallbackModal(false)}
            >
              <View style={styles.fallbackCard}>
                <View style={styles.fallbackHeader}>
                  <Text style={styles.fallbackTitle}>🎙️ 語音即時轉文字</Text>
                  <TouchableOpacity onPress={() => setShowFallbackModal(false)}>
                    <Ionicons name="close" size={22} color="#64748b" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.fallbackSubtitle}>
                  可直接點擊下方輸入框並利用手機鍵盤上的「麥克風按鍵」進行即時語音聽寫，或快速選擇通話範例進行防詐分析：
                </Text>

                <TextInput
                  style={styles.fallbackInput}
                  placeholder="點此使用手機鍵盤語音輸入或貼上可疑對話..."
                  placeholderTextColor="#94a3b8"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                />

                <Text style={styles.scenarioLabel}>常用可疑通話語音情境：</Text>
                {VOICE_PRESETS.map((p) => (
                  <TouchableOpacity
                    key={p.title}
                    style={styles.presetButton}
                    onPress={() => {
                      setMessage(p.text);
                      setShowFallbackModal(false);
                      sendTranscribedText(p.text);
                    }}
                  >
                    <Ionicons name="volume-medium-outline" size={18} color="#397bf2" />
                    <Text style={styles.presetTitle}>{p.title}</Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={styles.fallbackSendButton}
                  onPress={() => {
                    setShowFallbackModal(false);
                    if (message.trim()) {
                      sendTranscribedText(message.trim());
                    }
                  }}
                >
                  <Text style={styles.fallbackSendText}>送交 AI 分析</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        )}
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

  // 🎙️ 按住錄音浮動 HUD 樣式
  toolButtonRecording: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
  },
  recordingOverlay: {
    position: "absolute",
    top: "38%",
    left: "15%",
    right: "15%",
    backgroundColor: "rgba(17, 24, 39, 0.92)",
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  recordingPulse: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  recordingText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 6,
  },
  recordingHint: {
    color: "#cbd5e1",
    fontSize: 12,
  },
  liveTranscriptBox: {
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginVertical: 10,
    width: "100%",
  },
  liveTranscriptText: {
    color: "#ffffff",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontWeight: "600",
  },
  stopRecordingButton: {
    marginTop: 10,
    backgroundColor: "#397bf2",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  stopRecordingText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },

  // 🎙️ 語音轉文字彈窗樣式
  fallbackOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  fallbackCard: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: "#ffffff",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  fallbackHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  fallbackTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
  },
  fallbackSubtitle: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 18,
    marginBottom: 14,
  },
  fallbackInput: {
    minHeight: 64,
    maxHeight: 100,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 10,
    fontSize: 14,
    color: "#0f172a",
    marginBottom: 12,
  },
  scenarioLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
  },
  presetButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f7ff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  presetTitle: {
    fontSize: 13,
    color: "#1e40af",
    marginLeft: 8,
    flex: 1,
  },
  fallbackSendButton: {
    marginTop: 6,
    backgroundColor: "#397bf2",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  fallbackSendText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
