import { AccountClient } from "@/components/account-client";
import { hasAuthConfiguration } from "@/lib/auth";

export default function AccountPage() {
  return <AccountClient configured={hasAuthConfiguration()} />;
}
