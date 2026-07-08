import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Score",
  description:
    "SCORE helps small businesses manage inventory, sales, suppliers, and reports — simple, fast, and built to grow with you.",
  icons: {
    icon: "/favicon.png",
  },
};

const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (stored === "dark" || (stored !== "light" && prefersDark)) {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.className} min-h-full flex flex-col antialiased`}>
        {children}
      </body>
    </html>
  );
}
