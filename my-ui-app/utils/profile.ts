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

export const isThirdPartyUser = (user: any): boolean => {
  if (!user) return false;
  const cid = String(user.customerId || user.customer_id || "").toUpperCase();
  const pass = String(user.password_hash || "").toUpperCase();
  const email = String(user.email || "").toLowerCase();

  return (
    cid.startsWith("GOOGLE") ||
    cid.startsWith("LINE") ||
    pass.startsWith("GOOGLE:") ||
    pass.startsWith("LINE:") ||
    email.endsWith("@line.local")
  );
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
      const isThirdParty = isThirdPartyUser(dbUser) || isThirdPartyUser(currentUser);

      const syncedProfile: SavedProfile = {
        ...currentSaved,
        userId: dbUser.user_id,
        name: dbUser.username || currentSaved.name || "使用者",
        // 🔒 偵測到是 Google 或 LINE 登入時，Gmail 設定為空白
        email: isThirdParty ? "" : (dbUser.email || currentSaved.email),
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
  const isThirdParty = isThirdPartyUser(currentUser);

  const baseProfile: SavedProfile = {
    ...DEFAULT_PROFILE,
    name: currentUser?.username || currentUser?.displayName || currentUser?.name || DEFAULT_PROFILE.name,
    // 🔒 偵測到是 Google 或 LINE 登入時，Gmail 設定為空白
    email: isThirdParty ? "" : (currentUser?.email || DEFAULT_PROFILE.email),
    phone: currentUser?.phone || DEFAULT_PROFILE.phone,
    membershipLevel: currentUser?.membership_level || DEFAULT_PROFILE.membershipLevel,
    userId: currentUser?.user_id || currentUser?.userId,
    customerId: currentUser?.customer_id || currentUser?.customerId,
  };

  if (!savedProfileJson) {
    return {
      ...baseProfile,
      avatarUri: legacyAvatarUri,
    };
  }

  try {
    const savedProfile = JSON.parse(savedProfileJson) as Partial<SavedProfile>;
    const savedIsThirdParty = isThirdParty || isThirdPartyUser(savedProfile);

    return {
      ...baseProfile,
      ...savedProfile,
      name: savedProfile.name && savedProfile.name !== "麥片AI Shield" && savedProfile.name !== "使用者"
        ? savedProfile.name
        : baseProfile.name,
      // 🔒 偵測到是 Google 或 LINE 登入時，Gmail 設定為空白
      email: savedIsThirdParty
        ? ""
        : (savedProfile.email && savedProfile.email !== "maipian.aishield@gmail.com"
            ? savedProfile.email
            : baseProfile.email),
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


