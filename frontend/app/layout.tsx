import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CSAIL Complete · Floor 7",
  description: "A living graph of CSAIL.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
