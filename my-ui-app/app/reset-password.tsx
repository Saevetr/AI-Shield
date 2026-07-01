import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";

import { auth } from "@/app/config/firebase";

import { resetPasswordStyles as styles } from "./styles";

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{
    oobCode?: string;
    mode?: string;
  }>();

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const oobCode = Array.isArray(params.oobCode)
    ? params.oobCode[0]
    : params.oobCode;

  useEffect(() => {
    const checkResetCode = async () => {
      if (!oobCode) {
        setErrorMessage("重設連結缺少驗證碼，請重新寄送密碼重設信。");
        setIsChecking(false);
        return;
      }

      try {
        const verifiedEmail = await verifyPasswordResetCode(auth, oobCode);
        setEmail(verifiedEmail);
      } catch {
        setErrorMessage("重設連結已失效或已被使用，請重新寄送密碼重設信。");
      } finally {
        setIsChecking(false);
      }
    };

    checkResetCode();
  }, [oobCode]);

  const handleResetPassword = async () => {
    if (!oobCode) return;

    if (newPassword.length < 8) {
      Alert.alert("重設失敗", "新密碼至少需要 8 位數");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("重設失敗", "兩次輸入的新密碼不一致");
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. 先讓 Firebase 雲端更新密碼
      await confirmPasswordReset(auth, oobCode, newPassword);

      // 2. ⭐️ 同步通知你的 Render 後端更新 MySQL 資料庫中的密碼
      const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://ai-shield-m68d.onrender.com";
      const syncRes = await fetch(`${API_URL}/api/auth/sync-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,       // 透過 Firebase 驗證拿到的真實 Email
          newPassword: newPassword, // 使用者設定的新密碼
        }),
      });

      let syncResult: any;
      try {
        const rawText = await syncRes.text();
        syncResult = JSON.parse(rawText);
      } catch {
        throw new Error("後端資料庫密碼同步失敗，回傳格式錯誤");
      }

      if (!syncRes.ok || syncResult.success !== true) {
        throw new Error(syncResult.message || "資料庫密碼同步失敗");
      }

      // 3. 雙邊（Firebase + MySQL）都更新成功，顯示成功畫面
      setIsDone(true);
    } catch (error) {
      console.log("重設密碼出錯:", error);
      const errorText = error instanceof Error ? error.message : "重設連結已失效，請重新寄送密碼重設信";
      Alert.alert("重設失敗", errorText);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBackToApp = async () => {
    const appUrl = "myuiapp://login";
    const canOpenApp = await Linking.canOpenURL(appUrl);

    if (canOpenApp) {
      await Linking.openURL(appUrl);
      return;
    }

    router.replace("/login");
  };

  return (
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

        <View style={styles.card}>
          <Text style={styles.title}>重設密碼</Text>

          {isChecking && (
            <View style={styles.stateBox}>
              <ActivityIndicator color="#397bf2" />
              <Text style={styles.stateText}>正在確認重設連結</Text>
            </View>
          )}

          {!isChecking && !!errorMessage && (
            <>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity style={styles.secondaryButton} onPress={goBackToApp}>
                <Text style={styles.secondaryText}>回到登入頁</Text>
              </TouchableOpacity>
            </>
          )}

          {!isChecking && !errorMessage && !isDone && (
            <>
              <Text style={styles.subtitle}>正在為此帳號設定新密碼</Text>
              <View style={styles.emailBox}>
                <Text style={styles.emailText}>{email}</Text>
              </View>

              <View style={styles.inputBox}>
                <Image
                  source={require("@/assets/images/lock.png")}
                  style={styles.icon}
                />
                  <TextInput
                    style={styles.input}
                    placeholder="新密碼"
                    placeholderTextColor="#999"
                    secureTextEntry={!showNewPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                  <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                    <Image
                      source={
                        showNewPassword
                          ? require("@/assets/images/eye-off.png")
                          : require("@/assets/images/eye.png")
                      }
                      style={styles.eyeImage}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputBox}>
                <Image
                  source={require("@/assets/images/lock.png")}
                  style={styles.icon}
                />
                  <TextInput
                    style={styles.input}
                    placeholder="確認新密碼"
                    placeholderTextColor="#999"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Image
                      source={
                        showConfirmPassword
                          ? require("@/assets/images/eye-off.png")
                          : require("@/assets/images/eye.png")
                      }
                      style={styles.eyeImage}
                    />
                  </TouchableOpacity>
                </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleResetPassword}
                disabled={isSubmitting}
              >
                <Text style={styles.primaryText}>
                  {isSubmitting ? "重設中" : "確認重設"}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {isDone && (
            <View style={styles.successBox}>
              <View style={styles.successIconCircle}>
                <Text style={styles.successIcon}>✓</Text>
              </View>
              <Text style={styles.successText}>重設密碼成功</Text>
              <Text style={styles.successDescription}>
                您的密碼已更新完成，請回到 App 使用新密碼登入。
              </Text>
            </View>
          )}
        </View>
    </View>
  );
}

