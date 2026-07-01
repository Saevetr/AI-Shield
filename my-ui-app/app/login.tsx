import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  Alert,
} from "react-native";

import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as LinkingAPI from "expo-linking";

import {
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/app/config/firebase";
import { setLogin } from "@/utils/auth";

import { loginStyles as styles } from "./styles";

WebBrowser.maybeCompleteAuthSession();

// 從環境變數讀取後端網址，如果讀不到就預設走 localhost
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);

  // 監聽外部跳轉
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      console.log("App 接收到跳轉訊號 (Deep Link URL):", event.url);
      
      const parsedData = LinkingAPI.parse(event.url);
      if (parsedData.queryParams?.success === "true" || parsedData.queryParams?.token) {
        await setLogin(true);
        router.replace("/(tabs)");
      }
    };

    const subscription = LinkingAPI.addEventListener("url", handleDeepLink);

    LinkingAPI.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // 一般帳密登入
  const handleLogin = async () => {
    const account = email.trim();
    const inputPassword = password.trim();

    if (!account || !inputPassword) {
      Alert.alert("登入失敗", "請輸入帳號 / 電子郵件與密碼");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account,
          password: inputPassword,
        }),
      });

      const result = await res.json();

      if (!res.ok || result.success !== true) {
        throw new Error(result.message || "帳號或密碼錯誤");
      }

      await setLogin(true);
      router.replace("/(tabs)");
    } catch (error) {
      console.log("登入錯誤：", error);
      const message = error instanceof Error ? error.message : "無法連接到伺服器";
      Alert.alert("登入失敗", message);
    }
  };

  // Google 登入
  const handleGoogleLogin = async () => {
    try {
      const redirectUri = LinkingAPI.createURL("login"); 
      const authUrl = `${API_BASE_URL}/api/google-login?redirect_uri=${encodeURIComponent(redirectUri)}`;
      
      console.log("正在開啟 Google 驗證網頁：", authUrl);
      await WebBrowser.openBrowserAsync(authUrl);
    } catch (error) {
      console.log("Google 登入失敗：", error);
      Alert.alert("登入失敗", "無法啟動 Google 登入");
    }
  };

  // LINE 登入
  const handleLineLogin = async () => {
    try {
      const redirectUri = LinkingAPI.createURL("login");
      const authUrl = `${API_BASE_URL}/api/line-login?redirect_uri=${encodeURIComponent(redirectUri)}`;
      
      console.log("正在開啟 LINE 驗證網頁：", authUrl);
      await WebBrowser.openBrowserAsync(authUrl);
    } catch (error) {
      console.log("LINE 登入失敗：", error);
      Alert.alert("登入失敗", "無法啟動 LINE 登入");
    }
  };

  const openForgotPassword = () => {
    setResetEmail(email);
    setShowForgotModal(true);
  };

  const handleForgotPassword = async () => {
    const targetEmail = resetEmail.trim().toLowerCase();

    if (!targetEmail) {
      Alert.alert("重設失敗", "請先輸入您的電子郵件");
      return;
    }

    try {
      setIsResetLoading(true);
      try {
        const registeredEmailDoc = await getDoc(
          doc(db, "registeredEmails", encodeURIComponent(targetEmail))
        );
        if (!registeredEmailDoc.exists()) {
          console.log("Reset email index not found:", targetEmail);
        }
      } catch (indexError: any) {
        console.log("Reset email index read error:", indexError?.message);
      }

      await sendPasswordResetEmail(auth, targetEmail);
      setShowForgotModal(false);
      Alert.alert("已寄出重設信", "請到信箱查看密碼重設連結");
    } catch (error: any) {
      Alert.alert("重設失敗", "目前無法寄出重設信，請稍後再試");
    } finally {
      setIsResetLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        <Image
          source={require("@/assets/images/hexagon.png")}
          style={styles.hexagonBg}
          resizeMode="contain"
        />

        <View style={styles.logoContainer}>
          <Image
            source={require("@/assets/images/auth-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.line} />
          <Text style={styles.welcome}>歡迎回來！</Text>
          <View style={styles.line} />
        </View>

        <Text style={styles.subtitle}>請輸入您的帳號密碼登入</Text>

        <View style={styles.inputBox}>
          <Image
            source={require("@/assets/images/user.png")}
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            placeholder="帳號 / 電子郵件"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputBox}>
          <Image
            source={require("@/assets/images/lock.png")}
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            placeholder="密碼"
            placeholderTextColor="#999"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Image
              source={
                showPassword
                  ? require("@/assets/images/eye-off.png")
                  : require("@/assets/images/eye.png")
              }
              style={styles.eyeImage}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.optionRow}>
          <TouchableOpacity onPress={() => setRememberMe(!rememberMe)}>
            <Text style={styles.remember}>
              {rememberMe ? "⬤ 記住我" : "◯ 記住我"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={openForgotPassword}>
            <Text style={styles.forgot}>忘記密碼？</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginText}>登入</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.line} />
          <Text style={styles.orText}>或使用以下方式登入</Text>
          <View style={styles.line} />
        </View>

        <View style={styles.socialRow}>
          <TouchableOpacity style={styles.socialButton} onPress={handleGoogleLogin}>
            <Image
              source={require("@/assets/images/google.png")}
              style={styles.socialIcon}
            />
            <Text style={styles.socialText}>Google</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialButton} onPress={handleLineLogin}>
            <Image
              source={require("@/assets/images/line.png")}
              style={styles.socialIcon}
            />
            <Text style={styles.socialText}>LINE</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.line} />
          <Text style={styles.orText}>還沒有帳號？</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => router.push("/register")}
        >
          <View style={styles.registerContent}>
            <Image
              source={require("@/assets/images/register.png")}
              style={styles.registerIcon}
            />
            <Text style={styles.registerText}>立即註冊</Text>
          </View>
        </TouchableOpacity>

        <Modal
          visible={showForgotModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowForgotModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>忘記密碼</Text>
              <Text style={styles.modalSubtitle}>
                請輸入註冊時使用的電子郵件
              </Text>

              <View style={styles.modalInputBox}>
                <Image
                  source={require("@/assets/images/user.png")}
                  style={styles.icon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="電子郵件"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                />
              </View>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleForgotPassword}
                disabled={isResetLoading}
              >
                <Text style={styles.modalConfirmText}>
                  {isResetLoading ? "處理中" : "寄出重設信"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowForgotModal(false)}
              >
                <Text style={styles.modalCancelText}>取消</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
}

