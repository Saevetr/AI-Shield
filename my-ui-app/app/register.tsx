import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";

import { router } from "expo-router";
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { auth, db } from "@/app/config/firebase";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegister = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const gmailPattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

    if (!username.trim()) {
      Alert.alert("註冊失敗", "請輸入使用者名稱");
      return;
    }

    if (!trimmedEmail) {
      Alert.alert("註冊失敗", "請輸入電子郵件");
      return;
    }

    if (!gmailPattern.test(trimmedEmail)) {
      Alert.alert("註冊失敗", "請輸入正確的 Gmail，例如：example@gmail.com");
      return;
    }

    if (!phone.trim()) {
      Alert.alert("註冊失敗", "請輸入電話號碼");
      return;
    }

    if (!/^09\d{8}$/.test(phone.trim())) {
      Alert.alert("註冊失敗", "請輸入正確的手機號碼，例如：0912345678");
      return;
    }

    if (password.length < 8) {
      Alert.alert("註冊失敗", "密碼至少需要 8 位數");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("註冊失敗", "兩次輸入的密碼不一致");
      return;
    }

    try {
      setIsRegistering(true);
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        trimmedEmail,
        password
      );

      await updateProfile(userCredential.user, {
        displayName: username.trim(),
      });

      try {
        await setDoc(doc(db, "registeredEmails", encodeURIComponent(trimmedEmail)), {
          createdAt: serverTimestamp(),
          email: trimmedEmail,
          phone: phone.trim(),
          uid: userCredential.user.uid,
          username: username.trim(),
        });
      } catch (indexError: any) {
        console.log(
          "Register index write error:",
          indexError?.code,
          indexError?.message
        );
      }

      Alert.alert("註冊成功", "請回到登入頁登入您的帳號", [
        {
          text: "確定",
          onPress: () => router.replace("/login"),
        },
      ]);
    } catch (error: any) {
      const errorCode = error?.code;
      console.log("Register error:", errorCode, error?.message);

      if (errorCode === "auth/email-already-in-use") {
        Alert.alert("註冊失敗", "此電子郵件已經註冊過");
        return;
      }

      if (errorCode === "auth/invalid-email") {
        Alert.alert("註冊失敗", "電子郵件格式不正確");
        return;
      }

      if (errorCode === "auth/weak-password") {
        Alert.alert("註冊失敗", "密碼強度不足，請至少輸入 8 位數");
        return;
      }

      if (errorCode === "auth/operation-not-allowed") {
        Alert.alert(
          "註冊失敗",
          "Firebase 尚未啟用 Email/Password 登入方式"
        );
        return;
      }

      if (errorCode === "auth/network-request-failed") {
        Alert.alert("註冊失敗", "網路連線失敗，請確認網路後再試");
        return;
      }

      if (errorCode === "auth/too-many-requests") {
        Alert.alert("註冊失敗", "嘗試次數過多，請稍後再試");
        return;
      }

      Alert.alert(
        "註冊失敗",
        `目前無法完成註冊，錯誤代碼：${errorCode ?? "unknown"}`
      );
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <View style={styles.container}>
      <Image
        source={require("@/assets/images/hexagon.png")}
        style={styles.hexagonBg}
        resizeMode="contain"
      />

      <View style={styles.logoContainer}>
        <Image
          source={require("@/assets/images/logo_bg.png")}
          style={styles.logoBg}
          resizeMode="contain"
        />

        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <Text style={styles.welcome}>建立帳號</Text>
        <View style={styles.line} />
      </View>

      <Text style={styles.subtitle}>請填寫以下資料完成註冊</Text>

      <View style={styles.inputBox}>
        <Image
          source={require("@/assets/images/user.png")}
          style={styles.icon}
        />
        <TextInput
          style={styles.input}
          placeholder="使用者名稱"
          placeholderTextColor="#999"
          value={username}
          onChangeText={setUsername}
        />
      </View>

      <View style={styles.inputBox}>
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
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <View style={styles.inputBox}>
        <Image
          source={require("@/assets/images/user.png")}
          style={styles.icon}
        />
        <TextInput
          style={styles.input}
          placeholder="電話號碼"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
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

      <View style={styles.inputBox}>
        <Image
          source={require("@/assets/images/lock.png")}
          style={styles.icon}
        />
        <TextInput
          style={styles.input}
          placeholder="確認密碼"
          placeholderTextColor="#999"
          secureTextEntry={!showConfirmPassword}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />
        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
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
        style={styles.registerButton}
        onPress={handleRegister}
        disabled={isRegistering}
      >
        <Text style={styles.registerText}>
          {isRegistering ? "註冊中" : "註冊"}
        </Text>
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <Text style={styles.orText}>已經有帳號？</Text>
        <View style={styles.line} />
      </View>

      <TouchableOpacity style={styles.loginButton} onPress={() => router.back()}>
        <Text style={styles.loginText}>返回登入</Text>
      </TouchableOpacity>
    </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 38,
    backgroundColor: "#f8fbff",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  logoBg: {
    position: "absolute",
    width: 230,
    height: 140,
    opacity: 0.26,
    zIndex: 1,
  },
  logo: {
    width: 230,
    height: 185,
    zIndex: 2,
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#d7e5f8",
  },
  welcome: {
    marginHorizontal: 14,
    fontSize: 17,
    color: "#2f62b9",
    fontWeight: "800",
    letterSpacing: 2,
  },
  subtitle: {
    textAlign: "center",
    color: "#6c86aa",
    marginBottom: 18,
    fontSize: 13,
  },
  inputBox: {
    height: 48,
    borderWidth: 1,
    borderColor: "#dbe8f7",
    borderRadius: 11,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  icon: {
    width: 22,
    height: 22,
    marginRight: 10,
    resizeMode: "contain",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1f2937",
  },
  eyeImage: {
    width: 22,
    height: 22,
    tintColor: "#6c86aa",
  },
  registerButton: {
    height: 50,
    backgroundColor: "#397bf2",
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 16,
  },
  registerText: {
    color: "#fff",
    fontSize: 21,
    fontWeight: "bold",
    letterSpacing: 4,
  },
  orText: {
    marginHorizontal: 14,
    color: "#8a97a8",
    fontSize: 13,
  },
  loginButton: {
    height: 50,
    borderWidth: 1,
    borderColor: "#c9dcf5",
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#edf4ff",
    marginTop: 4,
  },
  loginText: {
    fontSize: 18,
    color: "#2f62b9",
    fontWeight: "800",
  },
});
