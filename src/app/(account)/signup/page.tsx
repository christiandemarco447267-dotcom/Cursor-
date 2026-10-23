import type { Metadata } from "next";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a Sentia account to save your paper portfolio across devices.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <SignUpForm />;
}
