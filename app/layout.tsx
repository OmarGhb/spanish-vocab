import type { Metadata, Viewport } from "next"
import { Inter, Lora, Fraunces } from "next/font/google"
import "./globals.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ['400', '700'],
})

// Fraunces — the "expression layer", italic 700 only. Deliberately exposed ONLY as a
// raw CSS variable on <html> and NOT registered in globals.css @theme, so no `font-fraunces`
// Tailwind utility is ever generated. The single allowed path to apply it is <Display> in
// app/(app)/Display.tsx (the literal allowlist: ¡Listo! / ¡Casi! / big review counts).
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ['700'],
  style: ['italic'],
})

export const metadata: Metadata = {
  title: "Paco",
  description: "Apprenez l'espagnol avec la répétition espacée.",
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

// No maximumScale / userScalable: those lock the scale (and iOS traps you zoomed-in,
// unable to pinch out). They were added to stop iOS input-focus zoom, but the real
// guard is ≥16px inputs (all inputs now comply), so the lock is redundant + harmful.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${lora.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>{children}</body>
    </html>
  )
}
