import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "isLoggedIn";
const LEGACY_WEB_KEY = "isLogin";
const USER_KEY = "current_user_data";
const LEGACY_USER_KEY = "user";

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

export const setCurrentUser = async (user: any) => {
  if (!user) return;
  const userJson = JSON.stringify(user);
  const storage = getWebStorage();

  if (storage) {
    storage.setItem(USER_KEY, userJson);
    storage.setItem(LEGACY_USER_KEY, userJson);
  }

  await AsyncStorage.setItem(USER_KEY, userJson);
};

export const getCurrentUser = async (): Promise<any | null> => {
  const storage = getWebStorage();
  const webUserJson = storage?.getItem(USER_KEY) ?? storage?.getItem(LEGACY_USER_KEY);

  if (webUserJson) {
    try {
      return JSON.parse(webUserJson);
    } catch {
      // ignore
    }
  }

  const asyncUserJson = await AsyncStorage.getItem(USER_KEY);
  if (asyncUserJson) {
    try {
      return JSON.parse(asyncUserJson);
    } catch {
      // ignore
    }
  }

  return null;
};

export const setLogin = async (value: boolean, user?: any) => {
  const serializedValue = JSON.stringify(value);
  const storage = getWebStorage();

  if (storage) {
    storage.setItem(KEY, serializedValue);
    storage.setItem(LEGACY_WEB_KEY, serializedValue);
    if (user) {
      const userJson = JSON.stringify(user);
      storage.setItem(USER_KEY, userJson);
      storage.setItem(LEGACY_USER_KEY, userJson);
    }
  }

  await AsyncStorage.setItem(KEY, serializedValue);
  if (user) {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  }
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
    storage.removeItem(LEGACY_USER_KEY);
    storage.removeItem(USER_KEY);
  }

  await AsyncStorage.removeItem(KEY);
  await AsyncStorage.removeItem(USER_KEY);
  await AsyncStorage.removeItem("profile_data");
};
