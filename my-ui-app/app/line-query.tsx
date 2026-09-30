import { Redirect } from "expo-router";

export default function LineQueryRedirect() {
  return <Redirect href="/risk-query?type=line" />;
}
