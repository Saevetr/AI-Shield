import { Redirect } from "expo-router";

export default function PhoneQueryRedirect() {
  return <Redirect href="/risk-query?type=phone" />;
}
