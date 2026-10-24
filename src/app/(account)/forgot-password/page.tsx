import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Reset your Sentia password.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ForgotPasswordForm />;
}
