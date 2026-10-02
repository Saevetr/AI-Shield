import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCurrentUser, setCurrentUser } from "./auth";

const PROFILE_AVATAR_URI_KEY = "profile_avatar_uri";
const PROFILE_DATA_KEY = "profile_data";

export type SavedProfile = {
  avatarUri: string;
  birthday: string;
  email: string;
  gender: string;
  name: string;
  phone: string;
  membershipLevel?: string;
  userId?: number | string;
  customerId?: string;
};

export const DEFAULT_PROFILE: SavedProfile = {
  avatarUri: "",
  birthday: "",
  email: "",
  gender: "",
  name: "使用者",
  phone: "",
  membershipLevel: "FREE",
};

/**
 * 從後端資料庫同步最新的個人資料
 */
export const syncProfileWithBackend = async (): Promise<SavedProfile> => {
  const API_URL =
    process.env.EXPO_PUBLIC_API_URL || "https://ai-shield-m68d.onrender.com";

  try {
    const currentUser = await getCurrentUser();
    const identifier = currentUser?.user_id || currentUser?.userId || currentUser?.email;

    if (!identifier) {
      return await getSavedProfile();
    }

    const queryKey = currentUser?.user_id || currentUser?.userId ? "userId" : "email";
    const res = await fetch(
      `${API_URL}/api/auth/profile?${queryKey}=${encodeURIComponent(identifier)}`
    );
    const result = await res.json();

    if (res.ok && result.success && result.data) {
      const dbUser = result.data;
      const currentSaved = await getSavedProfile();

      const syncedProfile: SavedProfile = {
        ...currentSaved,
        userId: dbUser.user_id,
        name: dbUser.username || currentSaved.name || "使用者",
        email: dbUser.email || currentSaved.email,
        phone: dbUser.phone || currentSaved.phone,
        membershipLevel: dbUser.membership_level || "FREE",
        customerId: dbUser.customer_id,
      };

      await saveProfile(syncedProfile);
      await setCurrentUser({ ...currentUser, ...dbUser });

      return syncedProfile;
    }
  } catch (error) {
    console.warn("無法連接後端資料庫同步個人資料:", error);
  }

  return await getSavedProfile();
};

export const getSavedProfile = async (): Promise<SavedProfile> => {
  const savedProfileJson = await AsyncStorage.getItem(PROFILE_DATA_KEY);
  const legacyAvatarUri = (await AsyncStorage.getItem(PROFILE_AVATAR_URI_KEY)) ?? "";
  const currentUser = await getCurrentUser();

  const baseProfile: SavedProfile = {
    ...DEFAULT_PROFILE,
    name: currentUser?.username || currentUser?.displayName || currentUser?.name || DEFAULT_PROFILE.name,
    email: currentUser?.email || DEFAULT_PROFILE.email,
    phone: currentUser?.phone || DEFAULT_PROFILE.phone,
    membershipLevel: currentUser?.membership_level || DEFAULT_PROFILE.membershipLevel,
    userId: currentUser?.user_id || currentUser?.userId,
  };

  if (!savedProfileJson) {
    return {
      ...baseProfile,
      avatarUri: legacyAvatarUri,
    };
  }

  try {
    const savedProfile = JSON.parse(savedProfileJson) as Partial<SavedProfile>;

    return {
      ...baseProfile,
      ...savedProfile,
      // 若已有登入資訊且本地名稱為預設時，優先使用登入者的真實名稱與信箱
      name: savedProfile.name && savedProfile.name !== "麥片AI Shield" && savedProfile.name !== "使用者"
        ? savedProfile.name
        : baseProfile.name,
      email: savedProfile.email && savedProfile.email !== "maipian.aishield@gmail.com"
        ? savedProfile.email
        : baseProfile.email,
      phone: savedProfile.phone && savedProfile.phone !== "0912 345 678"
        ? savedProfile.phone
        : baseProfile.phone,
      membershipLevel: savedProfile.membershipLevel || baseProfile.membershipLevel,
      avatarUri: savedProfile.avatarUri ?? legacyAvatarUri,
    };
  } catch {
    return {
      ...baseProfile,
      avatarUri: legacyAvatarUri,
    };
  }
};

export const saveProfile = async (profile: SavedProfile) => {
  const nextProfile = {
    ...profile,
    avatarUri: (profile.avatarUri || "").trim(),
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


