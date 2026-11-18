import type { Metadata } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/archivo/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "OnSite | Construction project workspace",
  description: "Connect project plans, teams, site operations and financial records.",
  applicationName: "OnSite",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/onsite-icon.svg",
    apple: "/onsite-icon-180.png"
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OnSite"
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#171717"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
