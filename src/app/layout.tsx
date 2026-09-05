import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'P2P Games',
  description: 'Zero-install, browser-based peer-to-peer multiplayer games.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
