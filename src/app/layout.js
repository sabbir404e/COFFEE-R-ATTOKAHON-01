import { Playfair_Display, Outfit } from "next/font/google";
import { AppProvider } from "@/context/AppContext";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "600"],
  style: ["normal", "italic"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata = {
  title: "Coffee-r Attokahon — Artisan Coffee & Cuisine",
  description:
    "Handcrafted coffees, seasonal flavors, and food made with intention — served in a space designed for moments that matter.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try {
                  var t = localStorage.getItem('ca_theme') || 'dark';
                  document.documentElement.setAttribute('data-theme', t);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${playfair.variable} ${outfit.variable}`}>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
