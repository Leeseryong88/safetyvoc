import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "STORE VOC",
  description: "스토어 의견청취",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
