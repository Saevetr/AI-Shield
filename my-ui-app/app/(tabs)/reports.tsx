import { SafeAreaView, StyleSheet, Text, View } from "react-native";

export default function ReportsScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>通報紀錄</Text>
        <View style={styles.panel}>
          <Text style={styles.panelText}>目前尚無通報紀錄</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fbff",
  },
  container: {
    flex: 1,
    padding: 18,
    backgroundColor: "#f8fbff",
  },
  title: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 12,
    marginBottom: 14,
  },
  panel: {
    minHeight: 120,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  panelText: {
    color: "#7b8794",
    fontSize: 14,
  },
});
