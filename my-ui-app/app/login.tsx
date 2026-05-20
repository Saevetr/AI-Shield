import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
} from "react-native";

import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";

// import * as AuthSession from "expo-auth-session";
// import { signInWithCustomToken } from "firebase/auth";

import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "@/app/config/firebase";
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

  const handleLogin = async () => {
    await setLogin(true);
    router.replace("/(tabs)");
  };

  return (
    
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
        <Text style={styles.remember}>○ 記住我</Text>
        <TouchableOpacity>
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

    </View>
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
  inputIcon: {
    fontSize: 19,
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#333",
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
    color: "#666",
    fontSize: 13,
  },
  forgot: {
    color: "#666",
    fontSize: 13,
  },
  loginButton: {
    height: 50,
    backgroundColor: "#5f6062",
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
    color: "#777",
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
    backgroundColor: "#d7d7d75d",
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
    color: "#222",
  },
  registerButton: {
    height: 50,
    borderWidth: 1,
    borderColor: "#c9c9c9",
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fafafa",
    opacity: 1,
    marginTop: 4,
  },
  registerText: {
    fontSize: 18,
    color: "#333",
    fontWeight: "600",
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
patternText: {
  color: "#888",
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
  tintColor: "#555",
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
});