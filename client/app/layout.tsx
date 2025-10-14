import type { Metadata } from "next";
import { JetBrains_Mono, Josefin_Sans, Ubuntu } from "next/font/google";
import { Provider } from "@/components/ui/provider";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

const ubuntu = Ubuntu({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-ubuntu",
});

export const metadata: Metadata = {
  title: "ENAVTI Game",
  description: "QUIZ GAME",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${jetbrains.variable} ${ubuntu.variable} antialiased`}>
        <Provider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#111111",
                color: "#fafafa",
                border: "1px solid #27272a",
              },
            }}
          />
          {children}
        </Provider>
      </body>
    </html>
  );
}
