import type { Metadata } from "next";
import { DM_Mono, Lora } from "next/font/google";
import "./globals.css";

const lora = Lora({
  variable: "--font-serif",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "inro — AI Interview Prep",
  description: "End-to-end job search prep with Gemini-powered role analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${lora.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
