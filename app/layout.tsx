import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "JobTrack — Job Application Tracker",
  description: "Log, track, and analyze your job applications with one keystroke. AI-powered, free Chrome extension.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
