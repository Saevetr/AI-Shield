import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
  Alert,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";

import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";

// import * as AuthSession from "expo-auth-session";
// import { signInWithCustomToken } from "firebase/auth";

import {
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithCredential,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/app/config/firebase";
import { setLogin } from "@/utils/auth";

WebBrowser.maybeCompleteAuthSession();

export default function Login() {

  const WEB_CLIENT_ID =
  "99083038415-3d03lo8fpqm6u60852il9np30sgde8r9.apps.googleusercontent.com";
const [request, response, promptAsync] =
    Google.useAuthRequest({
      clientId: WEB_CLIENT_ID,
      //redirectUri: "https://auth.expo.io/@你的Expo帳號/my-ui-app",
      redirectUri: "https://auth.expo.io/@fishball0.0/my-ui-app",

      scopes: ["profile", "email"],
      extraParams: {
      prompt: "select_account",
    },
    });

  useEffect(() => {
  const loginWithGoogle = async () => {
    if (response?.type === "success") {

      const { id_token } = response.params;

      console.log(
        response.authentication?.accessToken
      );


      const credential =
        GoogleAuthProvider.credential(id_token);

      await signInWithCredential(auth, credential);

      await setLogin(true);

      router.replace("/(tabs)");
    }
  };

  loginWithGoogle();
}, [response]);

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);

  const handleLogin = async () => {
    await setLogin(true);
    router.replace("/(tabs)");
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
        console.log(
          "Reset email index read error:",
          indexError?.code,
          indexError?.message
        );
      }

      await sendPasswordResetEmail(auth, targetEmail);
      setShowForgotModal(false);
      Alert.alert("已寄出重設信", "請到信箱查看密碼重設連結");
    } catch (error: any) {
      const errorCode = error?.code;

      if (errorCode === "auth/invalid-email") {
        Alert.alert("重設失敗", "電子郵件格式不正確");
        return;
      }

      if (errorCode === "auth/user-not-found") {
        Alert.alert("重設失敗", "找不到此電子郵件的帳號");
        return;
      }

      Alert.alert("重設失敗", "目前無法寄出重設信，請稍後再試");
    } finally {
      setIsResetLoading(false);
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

        {/* 中間襯托圖 */}
        <Image
          source={require("@/assets/images/logo_bg.png")}
          style={styles.logoBg}
          resizeMode="contain"
        />

        {/* Logo */}
        <Image
          source={require("@/assets/images/logo.png")}
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
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
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
        </TouchableOpacity>
      </View>

      <View style={styles.optionRow}>
        <TouchableOpacity
          onPress={() => setRememberMe(!rememberMe)}
        >
          <Text style={styles.remember}>
            {rememberMe ? "⬤" : "◯"} 記住我
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
        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => promptAsync({ useProxy: true } as any)}
            disabled={!request}
        >
          <Image
            source={require("@/assets/images/google.png")}
            style={styles.socialIcon}
          />
          <Text style={styles.socialText}>Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.socialButton}
          onPress={() =>
            Linking.openURL("https://access.line.me/oauth2/v2.1/login")
          }
        >
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
                {isResetLoading && "處理中"}
                {!isResetLoading && "寄出重設信"}
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
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  content: {
    zIndex: 1,
  },
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
  inputIcon: {
    fontSize: 19,
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1f2937",
  },
  eyeIcon: {
    fontSize: 18,
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  remember: {
    color: "#6c86aa",
    fontSize: 13,
  },
  forgot: {
    color: "#397bf2",
    fontSize: 13,
    fontWeight: "700",
  },
  loginButton: {
    height: 50,
    backgroundColor: "#397bf2",
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  loginText: {
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
  socialRow: {
    flexDirection: "row",
    gap: 14,
    marginVertical: 14,
  },
  socialButton: {
    flex: 1,
    height: 50,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e3edf9",
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  google: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111",
    marginRight: 8,
  },
  lineIcon: {
    backgroundColor: "#20c060",
    color: "#fff",
    fontWeight: "bold",
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 13,
    marginRight: 8,
    fontSize: 10,
  },
  socialText: {
    fontSize: 15,
    color: "#1f2937",
    fontWeight: "700",
  },
  registerButton: {
    height: 50,
    borderWidth: 1,
    borderColor: "#c9dcf5",
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#edf4ff",
    opacity: 1,
    marginTop: 4,
  },
  registerText: {
    fontSize: 18,
    color: "#2f62b9",
    fontWeight: "800",
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
patternText: {
  color: "#8aa4c5",
  fontSize: 30,
  letterSpacing: 8,
},
  icon: {
  width: 22,
  height: 22,
  marginRight: 10,
  resizeMode: "contain",
},

eyeImage: {
  width: 22,
  height: 22,
  tintColor: "#6c86aa",
},

socialIcon: {
  width: 24,
  height: 24,
  marginRight: 8,
  resizeMode: "contain",
},

registerContent: {
  flexDirection: "row",
  alignItems: "center",
},

registerIcon: {
  width: 22,
  height: 22,
  marginRight: 10,
  resizeMode: "contain",
},
modalOverlay: {
  flex: 1,
  backgroundColor: "rgba(31, 41, 55, 0.32)",
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 28,
},
modalCard: {
  width: "100%",
  borderRadius: 16,
  backgroundColor: "#f8fbff",
  paddingHorizontal: 20,
  paddingTop: 22,
  paddingBottom: 18,
},
modalTitle: {
  color: "#1f2937",
  fontSize: 20,
  fontWeight: "700",
  textAlign: "center",
  marginBottom: 8,
},
modalSubtitle: {
  color: "#6c86aa",
  fontSize: 13,
  textAlign: "center",
  marginBottom: 18,
},
modalInputBox: {
  height: 48,
  borderWidth: 1,
  borderColor: "#dbe8f7",
  borderRadius: 11,
  backgroundColor: "#fff",
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 14,
  marginBottom: 14,
},
modalConfirmButton: {
  height: 48,
  borderRadius: 11,
  backgroundColor: "#397bf2",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 10,
},
modalConfirmText: {
  color: "#fff",
  fontSize: 17,
  fontWeight: "700",
  letterSpacing: 2,
},
modalBackButton: {
  height: 42,
  borderRadius: 11,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 10,
},
modalBackText: {
  color: "#6c86aa",
  fontSize: 15,
  fontWeight: "600",
},
modalCancelButton: {
  height: 42,
  borderRadius: 11,
  borderWidth: 1,
  borderColor: "#c9dcf5",
  backgroundColor: "#ffffff",
  alignItems: "center",
  justifyContent: "center",
},
modalCancelText: {
  color: "#2f62b9",
  fontSize: 15,
  fontWeight: "700",
},
});
