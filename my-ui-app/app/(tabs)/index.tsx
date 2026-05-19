import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>

      <Text style={styles.title}>Welcome 👋</Text>
      <Text style={styles.subtitle}>請登入你的帳號</Text>

      <TextInput
        placeholder="Email"
        style={styles.input}
        placeholderTextColor="#999"
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        placeholderTextColor="#999"
      />

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>登入</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>還沒有帳號？註冊</Text>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f5f7fb",
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 30,
  },
  input: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  button: {
    backgroundColor: "#4f46e5",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  footer: {
    marginTop: 20,
    textAlign: "center",
    color: "#666",
  },
});