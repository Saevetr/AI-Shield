import { useState } from "react";
import {
View,
Text,
TextInput,
Pressable,
TouchableOpacity,
StyleSheet,
Image,
Alert,
ScrollView,
} from "react-native";

import { router } from "expo-router";

export default function Register() {
const [username, setUsername] = useState("");
const [email, setEmail] = useState("");
const [phone, setPhone] = useState("");
const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");

const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);
const [isRegistering, setIsRegistering] = useState(false);
const [message, setMessage] = useState("");

const showError = (text: string) => {
setMessage(text);
Alert.alert("註冊失敗", text);
};

const handleRegister = async () => {
console.log("註冊按鈕被按了");
setMessage("");

const trimmedUsername = username.trim();
const trimmedEmail = email.trim().toLowerCase();
const trimmedPhone = phone.trim();

if (!trimmedUsername) {
  showError("請輸入使用者名稱");
  return;
}

if (!trimmedEmail) {
  showError("請輸入電子郵件");
  return;
}

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
  showError("請輸入正確的電子郵件格式");
  return;
}

if (!trimmedPhone) {
  showError("請輸入電話號碼");
  return;
}

if (!/^09\d{8}$/.test(trimmedPhone)) {
  showError("請輸入正確的手機號碼，例如：0912345678");
  return;
}

if (password.length < 6) {
  showError("密碼至少需要 6 位數");
  return;
}

if (password !== confirmPassword) {
  showError("兩次輸入的密碼不一致");
  return;
}

try {
  setIsRegistering(true);

  const res = await fetch("http://localhost:3000/api/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: trimmedUsername,
      email: trimmedEmail,
      phone: trimmedPhone,
      password,
    }),
  });

  const result = await res.json();

  if (!res.ok || result.success !== true) {
    throw new Error(result.message || "註冊失敗");
  }

  setMessage("註冊成功，請回到登入頁登入您的帳號");

  Alert.alert("註冊成功", "請回到登入頁登入您的帳號", [
    {
      text: "確定",
      onPress: () => router.replace("/login"),
    },
  ]);
} catch (error) {
  console.log("Register error:", error);

  const errorText =
    error instanceof Error ? error.message : "無法連接到伺服器";

  showError(errorText);
} finally {
  setIsRegistering(false);
}

};

return ( <ScrollView contentContainerStyle={styles.scrollContent}> <View style={styles.container}>
<Image
source={require("@/assets/images/hexagon.png")}
style={styles.hexagonBg}
resizeMode="contain"
/>

```
    <View style={styles.logoContainer}>
      <Image
        source={require("@/assets/images/auth-logo.png")}
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

    {message ? <Text style={styles.messageText}>{message}</Text> : null}

    <Pressable
      style={[styles.registerButton, isRegistering && styles.disabledButton]}
      onPress={handleRegister}
      disabled={isRegistering}
    >
      <Text style={styles.registerText}>
        {isRegistering ? "註冊中" : "註冊"}
      </Text>
    </Pressable>

    <View style={styles.dividerRow}>
      <View style={styles.line} />
      <Text style={styles.orText}>已經有帳號？</Text>
      <View style={styles.line} />
    </View>

    <Pressable
      style={styles.loginButton}
      onPress={() => router.replace("/login")}
    >
      <Text style={styles.loginText}>返回登入</Text>
    </Pressable>
  </View>
</ScrollView>

);
}

const styles = StyleSheet.create({
scrollContent: {
flexGrow: 1,
backgroundColor: "#eef5ff",
},
container: {
flex: 1,
paddingHorizontal: 28,
paddingTop: 48,
paddingBottom: 40,
backgroundColor: "#eef5ff",
},
logoContainer: {
alignItems: "center",
justifyContent: "center",
marginTop: 18,
marginBottom: 10,
},
logo: {
width: 250,
height: 160,
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
zIndex: 1,
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
messageText: {
color: "#dc2626",
fontSize: 14,
fontWeight: "700",
textAlign: "center",
marginBottom: 10,
},
registerButton: {
height: 50,
backgroundColor: "#397bf2",
borderRadius: 11,
justifyContent: "center",
alignItems: "center",
marginTop: 6,
marginBottom: 16,
zIndex: 2,
},
disabledButton: {
opacity: 0.6,
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
zIndex: 2,
},
loginText: {
fontSize: 18,
color: "#2f62b9",
fontWeight: "800",
},
});
