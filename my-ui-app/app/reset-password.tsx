import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";

import { auth } from "@/app/config/firebase";

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
      await confirmPasswordReset(auth, oobCode, newPassword);
      setIsDone(true);
    } catch {
      Alert.alert("重設失敗", "重設連結已失效，請重新寄送密碼重設信");
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 42,
    backgroundColor: "#eef5ff",
    justifyContent: "flex-start",
    overflow: "hidden",
    ...(Platform.OS === "web"
      ? ({
          minHeight: "100dvh",
          overflowY: "auto",
          touchAction: "pan-y",
        } as any)
      : {}),
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    marginBottom: 18,
  },
  logo: {
    width: 250,
    height: 160,
  },
  card: {
    borderRadius: 18,
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingVertical: 22,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    zIndex: 2,
    marginTop: 0,
  },
  title: {
    color: "#1f2937",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 2,
  },
  subtitle: {
    color: "#6c86aa",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 16,
  },
  stateBox: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 18,
  },
  stateText: {
    color: "#6c86aa",
    fontSize: 14,
  },
  errorText: {
    color: "#d14343",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginVertical: 14,
  },
  successText: {
    color: "#1f2937",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  successBox: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 12,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  successIcon: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "800",
    lineHeight: 46,
  },
  successDescription: {
    color: "#6c86aa",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  emailBox: {
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: "#edf4ff",
    justifyContent: "center",
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  emailText: {
    color: "#2f62b9",
    fontSize: 14,
    textAlign: "center",
  },
  inputBox: {
    height: 48,
    borderWidth: 1,
    borderColor: "#dbe8f7",
    borderRadius: 11,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 12,
    ...(Platform.OS === "web"
      ? ({
          touchAction: "manipulation",
        } as any)
      : {}),
  },
  icon: {
    width: 22,
    height: 22,
    marginRight: 10,
    resizeMode: "contain",
  },
  input: {
    flex: 1,
    color: "#1f2937",
    fontSize: 15,
    ...(Platform.OS === "web"
      ? ({
          touchAction: "manipulation",
        } as any)
      : {}),
  },
  eyeImage: {
    width: 22,
    height: 22,
    tintColor: "#6c86aa",
  },
  primaryButton: {
    height: 50,
    borderRadius: 11,
    backgroundColor: "#397bf2",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 2,
  },
  secondaryButton: {
    height: 48,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#c9dcf5",
    backgroundColor: "#edf4ff",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    color: "#2f62b9",
    fontSize: 16,
    fontWeight: "700",
  },
  hexagonBg: {
    position: "absolute",
    left: 0,
    bottom: -50,
    width: 300,
    height: 300,
    opacity: 0.32,
    zIndex: 0,
  },
});
