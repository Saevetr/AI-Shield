import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const weekDays = ["SAN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export default function ProfileDetailScreen() {
  const [isEditing, setIsEditing] = useState(false);
  const [birthday, setBirthday] = useState("");
  const [avatarUri, setAvatarUri] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date(2021, 8, 1));

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstWeekDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return [
      ...Array.from({ length: firstWeekDay }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
    ];
  }, [calendarMonth]);

  const profileRows = [
    { label: "姓名", value: "麥片AI Shield" },
    { label: "電話", value: "0912 345 678" },
    { label: "電子信箱", value: "maipian.aishield@gmail.com" },
    { label: "生日", value: birthday, editable: true },
    { label: "性別", value: "" },
    { label: "地區", value: "" },
  ];

  const accountRows = [
    { label: "修改密碼" },
    { label: "綁定方式" },
    { label: "刪除帳號", danger: true },
  ];

  const changeMonth = (step: number) => {
    setCalendarMonth(
      (currentMonth) =>
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + step, 1)
    );
  };

  const selectDay = (day: number) => {
    const year = calendarMonth.getFullYear();
    const month = String(calendarMonth.getMonth() + 1).padStart(2, "0");
    const date = String(day).padStart(2, "0");

    setBirthday(`${year}/${month}/${date}`);
    setShowCalendar(false);
  };

  const pickAvatar = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert("需要權限", "請允許相簿權限後再選擇頭像");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.75}
          >
            <Ionicons name="chevron-back" size={36} color="#0d0d0d" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>個人資料</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing((current) => !current)}
            activeOpacity={0.75}
          >
            <Text style={styles.editText}>{isEditing ? "完成" : "編輯"}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.avatar} onPress={pickAvatar} activeOpacity={0.82}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <>
              <View style={styles.avatarHead} />
              <View style={styles.avatarBody} />
            </>
          )}
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={13} color="#ffffff" />
          </View>
        </TouchableOpacity>

        <View style={styles.infoCard}>
          {profileRows.map((row, index) => (
            <TouchableOpacity
              key={row.label}
              style={[
                styles.detailRow,
                index === profileRows.length - 1 && styles.lastDetailRow,
              ]}
              activeOpacity={row.editable && isEditing ? 0.75 : 1}
              onPress={() => row.editable && isEditing && setShowCalendar(true)}
            >
              <Text style={styles.detailLabel}>{row.label}</Text>
              {!!row.value && <Text style={styles.detailValue}>{row.value}</Text>}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.accountCard}>
          {accountRows.map((row, index) => (
            <TouchableOpacity
              key={row.label}
              style={[
                styles.detailRow,
                index === accountRows.length - 1 && styles.lastDetailRow,
              ]}
              activeOpacity={0.75}
            >
              <Text style={[styles.detailLabel, row.danger && styles.dangerText]}>
                {row.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Modal visible={showCalendar} transparent animationType="fade">
          <TouchableOpacity
            style={styles.calendarOverlay}
            activeOpacity={1}
            onPress={() => setShowCalendar(false)}
          >
            <TouchableOpacity activeOpacity={1} style={styles.calendarCard}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={() => changeMonth(-1)}>
                  <Ionicons name="chevron-back" size={18} color="#c2cad7" />
                </TouchableOpacity>
                <Text style={styles.calendarTitle}>
                  {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                </Text>
                <TouchableOpacity onPress={() => changeMonth(1)}>
                  <Ionicons name="chevron-forward" size={18} color="#c2cad7" />
                </TouchableOpacity>
              </View>

              <View style={styles.weekRow}>
                {weekDays.map((day) => (
                  <Text key={day} style={styles.weekText}>
                    {day}
                  </Text>
                ))}
              </View>

              <View style={styles.daysGrid}>
                {calendarDays.map((day, index) => {
                  const isSelected =
                    day === Number(birthday.slice(-2)) &&
                    birthday.startsWith(
                      `${calendarMonth.getFullYear()}/${String(
                        calendarMonth.getMonth() + 1
                      ).padStart(2, "0")}`
                    );

                  return (
                    <TouchableOpacity
                      key={`${day ?? "blank"}-${index}`}
                      style={styles.dayCell}
                      disabled={!day}
                      onPress={() => day && selectDay(day)}
                    >
                      {!!day && (
                        <View style={[styles.dayCircle, isSelected && styles.selectedDay]}>
                          <Text
                            style={[
                              styles.dayText,
                              isSelected && styles.selectedDayText,
                            ]}
                          >
                            {day}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
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
    backgroundColor: "#f8fbff",
  },
  header: {
    height: 74,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 9,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "500",
  },
  editButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  editText: {
    color: "#397bf2",
    fontSize: 13,
    fontWeight: "600",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#d9e0ee",
    overflow: "hidden",
    alignSelf: "center",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 24,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  cameraBadge: {
    position: "absolute",
    right: 2,
    bottom: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#397bf2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#f8fbff",
  },
  avatarHead: {
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: "#8193b1",
    marginTop: 11,
  },
  avatarBody: {
    width: 76,
    height: 42,
    borderRadius: 38,
    backgroundColor: "#8193b1",
    marginTop: 7,
  },
  infoCard: {
    marginHorizontal: 7,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    paddingHorizontal: 13,
    marginBottom: 18,
  },
  accountCard: {
    marginHorizontal: 7,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    paddingHorizontal: 13,
  },
  detailRow: {
    minHeight: 41,
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#cfd6e2",
  },
  lastDetailRow: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "500",
  },
  detailValue: {
    color: "#8aa4c5",
    fontSize: 11,
    marginTop: 4,
  },
  dangerText: {
    color: "#ff4d6d",
  },
  calendarOverlay: {
    flex: 1,
    paddingTop: 236,
    paddingHorizontal: 53,
  },
  calendarCard: {
    borderRadius: 6,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  calendarHeader: {
    height: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  calendarTitle: {
    color: "#647083",
    fontSize: 11,
    fontWeight: "800",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  weekText: {
    flex: 1,
    color: "#c2cad7",
    fontSize: 8,
    fontWeight: "800",
    textAlign: "center",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 29,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedDay: {
    backgroundColor: "#ef553f",
  },
  dayText: {
    color: "#4b5563",
    fontSize: 12,
    fontWeight: "600",
  },
  selectedDayText: {
    color: "#ffffff",
    fontWeight: "900",
  },
});
