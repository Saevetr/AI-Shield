import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

type EditableField = "email" | "name" | "phone";

export default function ProfileDetailScreen() {
  const [name, setName] = useState("麥片AI Shield");
  const [phone, setPhone] = useState("0912 345 678");
  const [email, setEmail] = useState("maipian.aishield@gmail.com");
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState("");
  const [avatarUri, setAvatarUri] = useState("");
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [pendingField, setPendingField] = useState<EditableField | null>(null);
  const [pendingValue, setPendingValue] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showEditFieldModal, setShowEditFieldModal] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showBindingPicker, setShowBindingPicker] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date(2021, 8, 1));

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: currentYear - 1930 + 1 }, (_, index) => currentYear - index);
  }, []);

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

  const basicRows = [
    { action: "name", label: "姓名", value: name },
    { action: "phone", label: "電話", value: phone },
    { action: "email", label: "Gmail", value: email },
    { action: "birthday", label: "生日", value: birthday || "尚未設定" },
    { action: "gender", label: "性別", value: gender || "尚未設定" },
  ];

  const securityRows = [
    { action: "password", icon: "key-outline", label: "修改密碼", value: "建議定期更新" },
    { action: "binding", icon: "link-outline", label: "綁定方式", value: "Email 登入" },
    { danger: true, icon: "trash-outline", label: "刪除帳號", value: "永久移除帳號資料" },
  ];

  const changeMonth = (step: number) => {
    setCalendarMonth(
      (currentMonth) =>
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + step, 1)
    );
  };

  const changeYear = (step: number) => {
    setCalendarMonth(
      (currentMonth) =>
        new Date(currentMonth.getFullYear() + step, currentMonth.getMonth(), 1)
    );
  };

  const selectYear = (year: number) => {
    setCalendarMonth((currentMonth) => new Date(year, currentMonth.getMonth(), 1));
    setShowYearPicker(false);
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

  const openEditField = (field: EditableField) => {
    setEditingField(field);

    if (field === "name") {
      setEditingValue(name);
    }

    if (field === "phone") {
      setEditingValue(phone.replace(/\s/g, ""));
    }

    if (field === "email") {
      setEditingValue(email);
    }

    setShowEditFieldModal(true);
  };

  const handleSaveEditableField = () => {
    const nextValue = editingValue.trim();

    if (!editingField || !nextValue) {
      Alert.alert("修改失敗", "請輸入新的資料");
      return;
    }

    if (editingField === "name") {
      setName(nextValue);
      setShowEditFieldModal(false);
      return;
    }

    if (editingField === "phone" && !/^09\d{8}$/.test(nextValue)) {
      Alert.alert("修改失敗", "電話需為 10 碼，且開頭為 09");
      return;
    }

    if (editingField === "email" && !/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(nextValue)) {
      Alert.alert("修改失敗", "請輸入正確的 Gmail，例如：example@gmail.com");
      return;
    }

    setPendingField(editingField);
    setPendingValue(nextValue);
    setVerificationCode("");
    setShowEditFieldModal(false);
    setShowVerificationModal(true);
    Alert.alert("驗證碼已送出", editingField === "phone" ? "請查看手機簡訊" : "請查看 Gmail 信箱");
  };

  const handleVerifyEditableField = () => {
    if (verificationCode.trim().length !== 6) {
      Alert.alert("驗證失敗", "請輸入 6 位數驗證碼");
      return;
    }

    if (pendingField === "phone") {
      setPhone(pendingValue.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3"));
    }

    if (pendingField === "email") {
      setEmail(pendingValue);
    }

    setPendingField(null);
    setPendingValue("");
    setVerificationCode("");
    setShowVerificationModal(false);
    Alert.alert("修改成功", "資料已完成驗證並更新");
  };

  const handleChangePassword = () => {
    if (!currentPassword) {
      Alert.alert("修改失敗", "請輸入目前密碼");
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert("修改失敗", "新密碼至少需要 8 位數");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("修改失敗", "兩次輸入的新密碼不一致");
      return;
    }

    setShowPasswordModal(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    Alert.alert("已送出", "密碼修改功能畫面已完成，接下來可以串接 Firebase 更新密碼");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <Ionicons name="chevron-back" size={34} color="#0d0d0d" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>個人檔案</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
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

          <Text style={styles.name}>麥片AI Shield</Text>
          <Text style={styles.email}>maipian.aishield@gmail.com</Text>
          <View style={styles.editHint}>
            <Ionicons name="information-circle-outline" size={14} color="#397bf2" />
            <Text style={styles.editHintText}>點選欄位即可修改個人資料</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>基本資料</Text>
        <View style={styles.card}>
          {basicRows.map((row, index) => (
            <TouchableOpacity
              key={row.label}
              style={[styles.infoRow, index === basicRows.length - 1 && styles.lastInfoRow]}
              activeOpacity={row.action ? 0.75 : 1}
              onPress={() => {
                if (row.action === "name" || row.action === "phone" || row.action === "email") {
                  openEditField(row.action);
                  return;
                }

                if (row.action === "gender") {
                  setShowGenderPicker(true);
                  return;
                }

                if (row.action === "birthday") {
                  setShowCalendar(true);
                  setShowYearPicker(false);
                }
              }}
            >
              <View>
                <Text style={styles.rowLabel}>{row.label}</Text>
                <Text style={styles.rowValue}>{row.value}</Text>
              </View>
              {(row.action === "name" || row.action === "phone" || row.action === "email") && (
                <Ionicons name="chevron-forward" size={18} color="#b5c0cf" />
              )}
              {row.action === "gender" && (
                <Ionicons name="chevron-forward" size={18} color="#397bf2" />
              )}
              {row.action === "birthday" && (
                <Ionicons name="calendar-outline" size={20} color="#397bf2" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>帳號安全</Text>
        <View style={styles.card}>
          {securityRows.map((row, index) => (
            <TouchableOpacity
              key={row.label}
              style={[
                styles.securityRow,
                index === securityRows.length - 1 && styles.lastInfoRow,
              ]}
              activeOpacity={0.75}
              onPress={() => {
                if (row.action === "binding") {
                  setShowBindingPicker(true);
                  return;
                }

                if (row.action === "password") {
                  setShowPasswordModal(true);
                }
              }}
            >
              <View style={[styles.securityIcon, row.danger && styles.securityIconDanger]}>
                <Ionicons
                  name={row.icon as keyof typeof Ionicons.glyphMap}
                  size={21}
                  color={row.danger ? "#ff4d6d" : "#397bf2"}
                />
              </View>
              <View style={styles.securityContent}>
                <Text style={[styles.rowLabel, row.danger && styles.dangerText]}>
                  {row.label}
                </Text>
                <Text style={styles.rowValue}>{row.value}</Text>
              </View>
              {!row.danger && <Ionicons name="chevron-forward" size={18} color="#b5c0cf" />}
            </TouchableOpacity>
          ))}
        </View>

        <Modal visible={showCalendar} transparent animationType="fade">
          <TouchableOpacity
            style={styles.calendarOverlay}
            activeOpacity={1}
            onPress={() => {
              setShowCalendar(false);
              setShowYearPicker(false);
            }}
          >
            <TouchableOpacity activeOpacity={1} style={styles.calendarCard}>
              <View style={styles.yearPicker}>
                <TouchableOpacity style={styles.yearButton} onPress={() => changeYear(-1)}>
                  <Ionicons name="chevron-back" size={16} color="#397bf2" />
                  <Text style={styles.yearButtonText}>上一年</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.yearTextButton}
                  onPress={() => setShowYearPicker((current) => !current)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.yearText}>{calendarMonth.getFullYear()}</Text>
                  <Ionicons
                    name={showYearPicker ? "chevron-up" : "chevron-down"}
                    size={14}
                    color="#397bf2"
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.yearButton} onPress={() => changeYear(1)}>
                  <Text style={styles.yearButtonText}>下一年</Text>
                  <Ionicons name="chevron-forward" size={16} color="#397bf2" />
                </TouchableOpacity>
              </View>

              {showYearPicker ? (
                <ScrollView
                  style={styles.yearList}
                  contentContainerStyle={styles.yearListContent}
                  showsVerticalScrollIndicator={false}
                >
                  {yearOptions.map((year) => {
                    const isSelected = year === calendarMonth.getFullYear();

                    return (
                      <TouchableOpacity
                        key={year}
                        style={[styles.yearOption, isSelected && styles.yearOptionActive]}
                        onPress={() => selectYear(year)}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.yearOptionText,
                            isSelected && styles.yearOptionTextActive,
                          ]}
                        >
                          {year}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              ) : (
                <>
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
                </>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showGenderPicker} transparent animationType="fade">
          <TouchableOpacity
            style={styles.optionOverlay}
            activeOpacity={1}
            onPress={() => setShowGenderPicker(false)}
          >
            <TouchableOpacity activeOpacity={1} style={styles.optionCard}>
              <Text style={styles.optionTitle}>選擇性別</Text>
              {["女", "男", "其他"].map((item) => (
                <TouchableOpacity
                  key={item}
                  style={styles.optionRow}
                  activeOpacity={0.75}
                  onPress={() => {
                    setGender(item);
                    setShowGenderPicker(false);
                  }}
                >
                  <Text style={styles.optionText}>{item}</Text>
                  {gender === item && (
                    <Ionicons name="checkmark-circle" size={20} color="#397bf2" />
                  )}
                </TouchableOpacity>
              ))}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showEditFieldModal} transparent animationType="fade">
          <TouchableOpacity
            style={styles.optionOverlay}
            activeOpacity={1}
            onPress={() => setShowEditFieldModal(false)}
          >
            <TouchableOpacity activeOpacity={1} style={styles.passwordCard}>
              <View style={styles.bindingHeader}>
                <View>
                  <Text style={styles.bindingTitle}>
                    修改{editingField === "name" ? "姓名" : editingField === "phone" ? "電話" : "Gmail"}
                  </Text>
                  <Text style={styles.bindingSubtitle}>
                    {editingField === "name" ? "姓名可直接更新" : "修改後需完成驗證"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowEditFieldModal(false)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="close" size={20} color="#8a97a8" />
                </TouchableOpacity>
              </View>

              <View style={styles.passwordInputBox}>
                <Ionicons
                  name={
                    editingField === "name"
                      ? "person-outline"
                      : editingField === "phone"
                        ? "call-outline"
                        : "mail-outline"
                  }
                  size={20}
                  color="#6c86aa"
                />
                <TextInput
                  style={styles.passwordInput}
                  placeholder={
                    editingField === "name"
                      ? "輸入姓名"
                      : editingField === "phone"
                        ? "輸入電話號碼"
                        : "輸入 Gmail"
                  }
                  placeholderTextColor="#9aa4b2"
                  keyboardType={editingField === "phone" ? "phone-pad" : "default"}
                  autoCapitalize="none"
                  value={editingValue}
                  onChangeText={setEditingValue}
                />
              </View>

              <TouchableOpacity
                style={styles.passwordSubmitButton}
                onPress={handleSaveEditableField}
                activeOpacity={0.8}
              >
                <Text style={styles.passwordSubmitText}>
                  {editingField === "name" ? "確認修改" : "下一步驗證"}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showVerificationModal} transparent animationType="fade">
          <TouchableOpacity
            style={styles.optionOverlay}
            activeOpacity={1}
            onPress={() => setShowVerificationModal(false)}
          >
            <TouchableOpacity activeOpacity={1} style={styles.passwordCard}>
              <View style={styles.bindingHeader}>
                <View>
                  <Text style={styles.bindingTitle}>輸入驗證碼</Text>
                  <Text style={styles.bindingSubtitle}>
                    {pendingField === "phone" ? "已傳送至新電話號碼" : "已傳送至新 Gmail"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowVerificationModal(false)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="close" size={20} color="#8a97a8" />
                </TouchableOpacity>
              </View>

              <View style={styles.verifyTargetBox}>
                <Text style={styles.verifyTargetLabel}>待驗證資料</Text>
                <Text style={styles.verifyTargetText}>{pendingValue}</Text>
              </View>

              <View style={styles.passwordInputBox}>
                <Ionicons name="keypad-outline" size={20} color="#6c86aa" />
                <TextInput
                  style={styles.passwordInput}
                  placeholder="6 位數驗證碼"
                  placeholderTextColor="#9aa4b2"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                />
              </View>

              <TouchableOpacity
                style={styles.passwordSubmitButton}
                onPress={handleVerifyEditableField}
                activeOpacity={0.8}
              >
                <Text style={styles.passwordSubmitText}>完成驗證</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showBindingPicker} transparent animationType="fade">
          <TouchableOpacity
            style={styles.optionOverlay}
            activeOpacity={1}
            onPress={() => setShowBindingPicker(false)}
          >
            <TouchableOpacity activeOpacity={1} style={styles.bindingCard}>
              <View style={styles.bindingHeader}>
                <View>
                  <Text style={styles.bindingTitle}>綁定方式</Text>
                  <Text style={styles.bindingSubtitle}>連結常用帳號，登入會更方便</Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowBindingPicker(false)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="close" size={20} color="#8a97a8" />
                </TouchableOpacity>
              </View>

              <View style={styles.bindingItem}>
                <View style={styles.bindingIconGoogle}>
                  <Image
                    source={require("@/assets/images/google.png")}
                    style={styles.googleIcon}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.bindingContent}>
                  <Text style={styles.bindingName}>Google</Text>
                  <Text style={styles.bindingMeta}>尚未綁定</Text>
                </View>
                <TouchableOpacity style={styles.bindButton} activeOpacity={0.78}>
                  <Text style={styles.bindButtonText}>綁定</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.bindingItem}>
                <View style={styles.bindingIconLine}>
                  <Text style={styles.lineText}>LINE</Text>
                </View>
                <View style={styles.bindingContent}>
                  <Text style={styles.bindingName}>LINE</Text>
                  <Text style={styles.bindingMeta}>尚未綁定</Text>
                </View>
                <TouchableOpacity style={styles.bindButton} activeOpacity={0.78}>
                  <Text style={styles.bindButtonText}>綁定</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.bindingHint}>
                <Ionicons name="shield-checkmark-outline" size={17} color="#397bf2" />
                <Text style={styles.bindingHintText}>
                  綁定後仍可使用 Email 登入，帳號資料不會被公開。
                </Text>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showPasswordModal} transparent animationType="fade">
          <TouchableOpacity
            style={styles.optionOverlay}
            activeOpacity={1}
            onPress={() => setShowPasswordModal(false)}
          >
            <TouchableOpacity activeOpacity={1} style={styles.passwordCard}>
              <View style={styles.bindingHeader}>
                <View>
                  <Text style={styles.bindingTitle}>修改密碼</Text>
                  <Text style={styles.bindingSubtitle}>請設定至少 8 位數的新密碼</Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowPasswordModal(false)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="close" size={20} color="#8a97a8" />
                </TouchableOpacity>
              </View>

              <View style={styles.passwordInputBox}>
                <Ionicons name="lock-closed-outline" size={20} color="#6c86aa" />
                <TextInput
                  style={styles.passwordInput}
                  placeholder="目前密碼"
                  placeholderTextColor="#9aa4b2"
                  secureTextEntry={!showCurrentPassword}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />
                <TouchableOpacity onPress={() => setShowCurrentPassword((value) => !value)}>
                  <Ionicons
                    name={showCurrentPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#6c86aa"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.passwordInputBox}>
                <Ionicons name="key-outline" size={20} color="#6c86aa" />
                <TextInput
                  style={styles.passwordInput}
                  placeholder="新密碼"
                  placeholderTextColor="#9aa4b2"
                  secureTextEntry={!showNewPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TouchableOpacity onPress={() => setShowNewPassword((value) => !value)}>
                  <Ionicons
                    name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#6c86aa"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.passwordInputBox}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#6c86aa" />
                <TextInput
                  style={styles.passwordInput}
                  placeholder="確認新密碼"
                  placeholderTextColor="#9aa4b2"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword((value) => !value)}>
                  <Ionicons
                    name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#6c86aa"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.passwordSubmitButton}
                onPress={handleChangePassword}
                activeOpacity={0.8}
              >
                <Text style={styles.passwordSubmitText}>確認修改</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </ScrollView>
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
  content: {
    paddingHorizontal: 14,
    paddingBottom: 30,
    paddingTop: 4,
  },
  header: {
    height: 66,
    backgroundColor: "#f8fbff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f7",
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 44,
  },
  profileCard: {
    borderRadius: 18,
    backgroundColor: "#ffffff",
    alignItems: "center",
    paddingTop: 18,
    paddingBottom: 16,
    marginBottom: 16,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#d9e0ee",
    overflow: "hidden",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  cameraBadge: {
    position: "absolute",
    right: 3,
    bottom: 3,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#397bf2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  avatarHead: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#8193b1",
    marginTop: 12,
  },
  avatarBody: {
    width: 84,
    height: 46,
    borderRadius: 42,
    backgroundColor: "#8193b1",
    marginTop: 8,
  },
  name: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 5,
  },
  email: {
    color: "#8aa4c5",
    fontSize: 12,
    marginBottom: 12,
  },
  editHint: {
    minHeight: 28,
    borderRadius: 14,
    backgroundColor: "#edf4ff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 5,
  },
  editHintText: {
    color: "#397bf2",
    fontSize: 11,
    fontWeight: "800",
  },
  sectionTitle: {
    color: "#8a97a8",
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 4,
    marginBottom: 7,
  },
  card: {
    borderRadius: 18,
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  infoRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#edf1f6",
  },
  lastInfoRow: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 4,
  },
  rowValue: {
    color: "#8a97a8",
    fontSize: 11,
    fontWeight: "600",
  },
  securityRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#edf1f6",
  },
  securityIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#edf4ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  securityIconDanger: {
    backgroundColor: "#fff0f3",
  },
  securityContent: {
    flex: 1,
  },
  dangerText: {
    color: "#ff4d6d",
  },
  calendarOverlay: {
    flex: 1,
    paddingTop: 244,
    paddingHorizontal: 52,
    backgroundColor: "rgba(248, 251, 255, 0.38)",
  },
  calendarCard: {
    borderRadius: 8,
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
  yearPicker: {
    height: 34,
    borderRadius: 17,
    backgroundColor: "#edf4ff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    marginBottom: 13,
  },
  yearButton: {
    height: 28,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  yearButtonText: {
    color: "#397bf2",
    fontSize: 10,
    fontWeight: "800",
  },
  yearTextButton: {
    minWidth: 78,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  yearText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
  },
  yearList: {
    maxHeight: 228,
  },
  yearListContent: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 2,
  },
  yearOption: {
    width: "30.5%",
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f5f8fc",
    alignItems: "center",
    justifyContent: "center",
  },
  yearOptionActive: {
    backgroundColor: "#397bf2",
  },
  yearOptionText: {
    color: "#647083",
    fontSize: 13,
    fontWeight: "800",
  },
  yearOptionTextActive: {
    color: "#ffffff",
    fontWeight: "900",
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
  optionOverlay: {
    flex: 1,
    backgroundColor: "rgba(31, 41, 55, 0.28)",
    justifyContent: "center",
    paddingHorizontal: 38,
  },
  optionCard: {
    borderRadius: 18,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  optionTitle: {
    color: "#111827",
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 12,
  },
  optionRow: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#edf1f6",
  },
  optionText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "800",
  },
  bindingCard: {
    borderRadius: 20,
    backgroundColor: "#ffffff",
    padding: 16,
  },
  bindingHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  bindingTitle: {
    color: "#111827",
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 4,
  },
  bindingSubtitle: {
    color: "#8a97a8",
    fontSize: 12,
    fontWeight: "600",
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#f1f4f8",
    alignItems: "center",
    justifyContent: "center",
  },
  bindingItem: {
    minHeight: 68,
    borderRadius: 16,
    backgroundColor: "#f8fbff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  bindingIconGoogle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  googleIcon: {
    width: 24,
    height: 24,
  },
  bindingIconLine: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  lineText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
  },
  bindingContent: {
    flex: 1,
  },
  bindingName: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 3,
  },
  bindingMeta: {
    color: "#8a97a8",
    fontSize: 11,
    fontWeight: "600",
  },
  bindButton: {
    minWidth: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#397bf2",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  bindButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
  },
  bindingHint: {
    borderRadius: 14,
    backgroundColor: "#edf4ff",
    flexDirection: "row",
    alignItems: "center",
    padding: 11,
    marginTop: 3,
    gap: 7,
  },
  bindingHintText: {
    flex: 1,
    color: "#6c86aa",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
  },
  passwordCard: {
    borderRadius: 20,
    backgroundColor: "#ffffff",
    padding: 16,
  },
  passwordInputBox: {
    height: 48,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#dbe8f7",
    backgroundColor: "#f8fbff",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 10,
    gap: 9,
  },
  passwordInput: {
    flex: 1,
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },
  passwordSubmitButton: {
    height: 48,
    borderRadius: 14,
    backgroundColor: "#397bf2",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  passwordSubmitText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  verifyTargetBox: {
    borderRadius: 14,
    backgroundColor: "#edf4ff",
    padding: 12,
    marginBottom: 10,
  },
  verifyTargetLabel: {
    color: "#6c86aa",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 5,
  },
  verifyTargetText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
  },
});
