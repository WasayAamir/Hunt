import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hunt — AI Job Hunt Command Center",
  description: "Track applications, tailor resumes, and draft outreach with AI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
