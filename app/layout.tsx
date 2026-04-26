import type { Metadata } from "next"
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
  title: "Vocabulario",
  description: "Apprenez le vocabulaire espagnol avec la répétition espacée.",
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
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
