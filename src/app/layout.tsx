import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Gamepad2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'P2P Web Games Platform',
  description: 'Zero-install, browser-based peer-to-peer multiplayer games.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col selection:bg-indigo-500 selection:text-white">
        <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg hover:text-indigo-400 transition-colors">
              <Gamepad2 className="w-6 h-6 text-indigo-400" />
              <span>P2P Games</span>
            </Link>
            <div className="flex items-center gap-4 text-sm">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
                P2P Ready
              </span>
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 flex flex-col">
          {children}
        </main>
        <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
          Zero-install, peer-to-peer web gaming. No servers, no accounts.
        </footer>
      </body>
    </html>
  )
}
