import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { TabBar } from "@/components/TabBar";
import { AuthGate } from "@/components/AuthGate";

const BP = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "Quadrante — Personal Life OS",
  description:
    "Plan, track, and improve across your four life areas: Spiritual, Wealth, Health, Relationship.",
  manifest: `${BP}/manifest.webmanifest`,
  icons: {
    icon: `${BP}/icons/icon-192.png`,
    apple: `${BP}/icons/apple-touch-icon.png`,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Quadrante",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F2F2F7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

// Set theme before paint to avoid a flash of the wrong color scheme.
const themeScript = `
(function(){try{var s=localStorage.getItem('quadrante.theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">
        <Providers>
          <AuthGate>
            <main className="mx-auto max-w-2xl px-4 pb-28 pt-safe">
              {children}
            </main>
            <TabBar />
          </AuthGate>
        </Providers>
      </body>
    </html>
  );
}
