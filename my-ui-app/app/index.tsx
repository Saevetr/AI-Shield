import { useEffect } from "react";
import { router } from "expo-router";
import { getLogin } from "@/utils/auth";

export default function Index() {
  useEffect(() => {
    const check = async () => {
      const loggedIn = await getLogin();

      router.replace(loggedIn ? "/(tabs)" : "/login");
    };

    check();
  }, []);

  return null;
}
