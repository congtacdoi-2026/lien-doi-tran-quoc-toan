import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Liên đội - Trường Tiểu học Trần Quốc Toản",
  description: "Quản lý công tác Đội trực tuyến"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}