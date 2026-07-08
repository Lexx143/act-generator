import type { Metadata } from "next";
import { Manrope, Carlito } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
});

// Carlito метрически совместим с Calibri — шрифтом оригинального бланка.
const carlito = Carlito({
  variable: "--font-letterhead",
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Акты технической экспертизы — IT Support Group",
  description: "Генератор актов технической экспертизы",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${manrope.variable} ${carlito.variable} h-full antialiased`}
    >
      <body className="app-gradient flex min-h-full flex-col">
        {children}
        <footer className="no-print text-muted-foreground mt-auto py-4 text-center text-xs">
          Разработка: Lexx ·{" "}
          <a
            href="mailto:deuslevolt013@gmail.com"
            className="hover:text-foreground underline-offset-2 hover:underline"
          >
            deuslevolt013@gmail.com
          </a>{" "}
          ·{" "}
          <a
            href="https://github.com/Lexx143/act-generator"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground underline-offset-2 hover:underline"
          >
            GitHub
          </a>
        </footer>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
