import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "S.C.O.R.E. Onboarding & Support Chatbot",
  description:
    "A prototype chatbot that helps first-time small business owners learn S.C.O.R.E.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
