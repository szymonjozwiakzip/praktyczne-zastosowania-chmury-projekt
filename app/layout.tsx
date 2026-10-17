import type { Metadata } from "next";
import { Figtree, Newsreader } from "next/font/google";
import "./globals.css";

const sans = Figtree({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
});

const serif = Newsreader({
  subsets: ["latin", "latin-ext"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Zapisy na wydarzenie",
  description: "Zapisz się na wydarzenie.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className={`${sans.variable} ${serif.variable}`}>{children}</body>
    </html>
  );
}
