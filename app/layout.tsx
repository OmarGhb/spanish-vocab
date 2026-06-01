import type { Metadata, Viewport } from "next"
import { Inter, Lora } from "next/font/google"
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
      className={`${inter.variable} ${lora.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col overflow-x-clip" suppressHydrationWarning>{children}</body>
    </html>
  )
}
