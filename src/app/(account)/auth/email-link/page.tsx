import type { Metadata } from "next";
import { EmailLinkComplete } from "@/components/auth/email-link-complete";

export const metadata: Metadata = {
  title: "Signing in",
  description: "Completing email link sign-in.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <EmailLinkComplete />;
}
