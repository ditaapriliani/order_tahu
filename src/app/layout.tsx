import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sistem Pemesanan Pabrik Tahu",
  description: "Sistem Informasi Pemesanan Cabang Lapak Pabrik Tahu",
  icons: {
    icon: "/logo.jpg",
    shortcut: "/logo.jpg",
    apple: "/logo.jpg",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${poppins.variable} ${poppins.className} h-full antialiased`}
    >
      <body className={`${poppins.className} min-h-full flex flex-col bg-slate-50 text-slate-900`}>{children}</body>
    </html>
  );
}
