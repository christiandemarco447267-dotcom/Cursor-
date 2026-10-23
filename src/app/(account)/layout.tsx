import { AuthProvider } from "@/lib/auth";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
