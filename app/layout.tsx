import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Evolab - Next.js on GitHub Pages",
  description: "A Next.js application deployed to GitHub Pages",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
