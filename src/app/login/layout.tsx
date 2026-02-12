import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login - JDub Dashboard",
  description: "Sign in to JDub Dashboard",
};

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
