import AsyncStorage from "@react-native-async-storage/async-storage";

const PROFILE_AVATAR_URI_KEY = "profile_avatar_uri";
const PROFILE_DATA_KEY = "profile_data";

export type SavedProfile = {
  avatarUri: string;
  birthday: string;
  email: string;
  gender: string;
  name: string;
  phone: string;
};

export const DEFAULT_PROFILE: SavedProfile = {
  avatarUri: "",
  birthday: "",
  email: "maipian.aishield@gmail.com",
  gender: "",
  name: "麥片AI Shield",
  phone: "0912 345 678",
};

export const getSavedProfile = async (): Promise<SavedProfile> => {
  const savedProfileJson = await AsyncStorage.getItem(PROFILE_DATA_KEY);
  const legacyAvatarUri = (await AsyncStorage.getItem(PROFILE_AVATAR_URI_KEY)) ?? "";

  if (!savedProfileJson) {
    return {
      ...DEFAULT_PROFILE,
      avatarUri: legacyAvatarUri,
    };
  }

  try {
    const savedProfile = JSON.parse(savedProfileJson) as Partial<SavedProfile>;

    return {
      ...DEFAULT_PROFILE,
      ...savedProfile,
      avatarUri: savedProfile.avatarUri ?? legacyAvatarUri,
    };
  } catch {
    return {
      ...DEFAULT_PROFILE,
      avatarUri: legacyAvatarUri,
    };
  }
};

export const saveProfile = async (profile: SavedProfile) => {
  const nextProfile = {
    ...profile,
    avatarUri: profile.avatarUri.trim(),
  };

  await AsyncStorage.setItem(PROFILE_DATA_KEY, JSON.stringify(nextProfile));

  if (nextProfile.avatarUri) {
    await AsyncStorage.setItem(PROFILE_AVATAR_URI_KEY, nextProfile.avatarUri);
    return;
  }

  await AsyncStorage.removeItem(PROFILE_AVATAR_URI_KEY);
};

export const getSavedProfileAvatar = async () => {
  return (await getSavedProfile()).avatarUri;
};

export const saveProfileAvatar = async (avatarUri: string) => {
  const savedProfile = await getSavedProfile();
  await saveProfile({ ...savedProfile, avatarUri });
};
