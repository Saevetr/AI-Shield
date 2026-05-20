import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { router } from "expo-router";

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);

  return (
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
          secureTextEntry={!showPassword}
        />
      </View>

      <TouchableOpacity style={styles.registerButton}>
        <Text style={styles.registerText}>註冊</Text>
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <Text style={styles.orText}>已經有帳號？</Text>
        <View style={styles.line} />
      </View>

      <TouchableOpacity
        style={styles.loginButton}
        onPress={() => router.back()}
      >
        <Text style={styles.loginText}>返回登入</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 38,
    backgroundColor: "#f7f7f7",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  logoBg: {
    position: "absolute",
    width: 250,
    height: 150,
    opacity: 0.4,
    zIndex: 1,
  },
  logo: {
    width: 250,
    height: 200,
    zIndex: 2,
  },
  hexagonBg: {
    position: "absolute",
    left: 0,
    bottom: -50,
    width: 300,
    height: 300,
    opacity: 0.6,
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
    backgroundColor: "#cfcfcf",
  },
  welcome: {
    marginHorizontal: 14,
    fontSize: 17,
    color: "#666",
    letterSpacing: 2,
  },
  subtitle: {
    textAlign: "center",
    color: "#777",
    marginBottom: 18,
    fontSize: 13,
  },
  inputBox: {
    height: 48,
    borderWidth: 1,
    borderColor: "#d7d7d7",
    borderRadius: 11,
    backgroundColor: "#fff",
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
    color: "#333",
  },
  eyeImage: {
    width: 22,
    height: 22,
    tintColor: "#555",
  },
  registerButton: {
    height: 50,
    backgroundColor: "#5f6062",
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
    color: "#777",
    fontSize: 13,
  },
  loginButton: {
    height: 50,
    borderWidth: 1,
    borderColor: "#c9c9c9",
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fafafa",
    marginTop: 4,
  },
  loginText: {
    fontSize: 18,
    color: "#333",
    fontWeight: "600",
  },
});