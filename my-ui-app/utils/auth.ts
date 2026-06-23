import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "isLoggedIn";
const LEGACY_WEB_KEY = "isLogin";

const getWebStorage = () => {
  try {
    return (globalThis as any).localStorage || null;
  } catch {
    return null;
  }
};

const parseLoginValue = (value: string | null) => {
  if (!value) return false;

  try {
    return JSON.parse(value) === true;
  } catch {
    return value === "true";
  }
};

export const setLogin = async (value: boolean) => {
  const serializedValue = JSON.stringify(value);
  const storage = getWebStorage();

  if (storage) {
    storage.setItem(KEY, serializedValue);
    storage.setItem(LEGACY_WEB_KEY, serializedValue);
  }

  await AsyncStorage.setItem(KEY, serializedValue);
};

export const getLogin = async () => {
  const storage = getWebStorage();
  const webValue = storage?.getItem(KEY) ?? storage?.getItem(LEGACY_WEB_KEY);

  if (webValue !== null && webValue !== undefined) {
    return parseLoginValue(webValue);
  }

  const value = await AsyncStorage.getItem(KEY);
  return parseLoginValue(value);
};

export const logout = async () => {
  const storage = getWebStorage();

  if (storage) {
    storage.removeItem(KEY);
    storage.removeItem(LEGACY_WEB_KEY);
    storage.removeItem("user");
  }

  await AsyncStorage.removeItem(KEY);
};
