import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "randomize.sh by justinelijahtaylor",
  description:
    "Randomize your Pokemon ROMs entirely in the browser. Your ROM never leaves your device.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Nav />
        <div className="flex-1">{children}</div>
        <footer className="mx-auto w-full max-w-5xl px-4 sm:px-8 py-4 flex justify-end">
          <a
            href="https://github.com/justinelijahtaylor"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="justinelijahtaylor on GitHub"
            className="text-[10px] text-foreground/40 hover:text-primary transition-colors select-none"
          >
            justinelijahtaylor
          </a>
        </footer>
      </body>
    </html>
  );
}
