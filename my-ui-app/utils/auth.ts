import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "isLoggedIn";

export const setLogin = async (value: boolean) => {
  await AsyncStorage.setItem(KEY, JSON.stringify(value));
};

export const getLogin = async () => {
  const value = await AsyncStorage.getItem(KEY);
  return value ? JSON.parse(value) : false;
};

export const logout = async () => {
  await AsyncStorage.removeItem(KEY);
};