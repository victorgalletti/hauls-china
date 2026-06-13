import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { DM_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeToggle } from "@/components/theme-toggle";

// Nu Sans (Nubank) is proprietary and not available on Google Fonts, so we ship
// DM Sans — a close geometric-humanist match — and prefer a locally installed
// "Nu Sans" first via the font-family stack in globals.css.
const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hauls",
  description:
    "Calcule o custo final em BRL de produtos importados de agentes chineses para o Brasil.",
};

// Runs before hydration (server-rendered, so no "client script" warning) to
// apply the saved theme and avoid a flash. Defaults to dark.
const themeInitScript = `(function(){try{if(localStorage.getItem('theme')==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`dark ${dmSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-muted/30">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <header className="border-b bg-background">
          <nav className="mx-auto flex max-w-5xl items-center gap-1 px-4 py-3 sm:gap-3">
            <Link href="/" className="mr-2 flex items-center gap-2">
              <Image
                src="/pirata.png"
                alt="hauls"
                width={36}
                height={36}
                priority
                className="size-9 object-contain"
              />
              <span className="text-lg font-bold tracking-tight">Hauls</span>
            </Link>
            <Link
              href="/"
              className="rounded-md px-3 py-1.5 text-sm font-medium hover:bg-muted"
            >
              Calculadora
            </Link>
            <Link
              href="/purchases"
              className="rounded-md px-3 py-1.5 text-sm font-medium hover:bg-muted"
            >
              Compras
            </Link>
            <Link
              href="/shipping-methods"
              className="rounded-md px-3 py-1.5 text-sm font-medium hover:bg-muted"
            >
              Métodos de envio
            </Link>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
          {children}
        </main>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
