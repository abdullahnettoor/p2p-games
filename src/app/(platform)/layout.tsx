import Link from 'next/link'
import { Gamepad2 } from 'lucide-react'

export default function PlatformLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="platformShell">
      <header className="platformMasthead">
        <div className="platformMastheadInner">
          <Link href="/" className="platformBrand" aria-label="P2P Games catalog">
            <Gamepad2 aria-hidden="true" />
            <span>P2P Games</span>
          </Link>
          <span className="platformMastheadNote">Play together. Directly.</span>
        </div>
      </header>
      <main className="platformMain">{children}</main>
      <footer className="platformFooter">Zero-install, peer-to-peer web gaming.</footer>
    </div>
  )
}
