import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { OpsProvider } from "@/components/providers/ops-provider";
import { LiveProvider } from "@/components/providers/live-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Instant Mechanic | Ops Dashboard",
  description: "Live vehicle service operations dashboard for Instant Mechanic",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col font-sans">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('im-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark'}}catch(e){}})();`,
          }}
        />
        <ThemeProvider>
          <LiveProvider>
            <OpsProvider>{children}</OpsProvider>
          </LiveProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
