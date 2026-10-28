import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Multimodal Attendance & Engagement Agent | Privacy-Preserving Classroom Intelligence",
  description: "Offline-first, privacy-preserving multimodal attendance tracking and explainable engagement analytics for modern educational institutions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-full flex flex-col antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
