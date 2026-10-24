import type { Metadata } from "next";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to sync your Sentia paper account.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <SignInForm />;
}
