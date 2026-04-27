import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Счастливый час",
  description: "Планировщик встреч для команды",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
