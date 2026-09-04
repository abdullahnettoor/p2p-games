import Link from 'next/link'
import { Sparkles, Users, Zap, ShieldCheck } from 'lucide-react'

const GAMES = [
  {
    id: 'bingo',
    title: 'BINGO 1v1',
    description: 'Classic 5x5 number battle. Strategically complete 5 lines to score B-I-N-G-O before your opponent.',
    players: '2 Players',
    badge: 'Live',
    color: 'from-amber-500/20 to-indigo-500/20 border-amber-500/30 text-amber-300',
    btnColor: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    href: '/bingo',
  },
  {
    id: 'hangman',
    title: 'Hangman Duels',
    description: 'Word guessing duel with symmetric secret word picking and real-time turn strikes.',
    players: '2 Players',
    badge: 'Coming Soon',
    color: 'from-slate-800/40 to-slate-800/20 border-slate-800 text-slate-400',
    btnColor: 'bg-slate-800 text-slate-500 cursor-not-allowed',
    href: '#',
  },
  {
    id: 'tictactoe',
    title: 'Super Tic-Tac-Toe',
    description: 'Strategic nested grid Tic-Tac-Toe where your moves dictate the board your rival plays next.',
    players: '2 Players',
    badge: 'Coming Soon',
    color: 'from-slate-800/40 to-slate-800/20 border-slate-800 text-slate-400',
    btnColor: 'bg-slate-800 text-slate-500 cursor-not-allowed',
    href: '#',
  },
]

export default function CatalogPage() {
  return (
    <div className="space-y-10 py-6 max-w-5xl mx-auto w-full">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Zero-Install WebRTC Gaming Platform</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white">
          Play 1-on-1 Games <br className="hidden md:inline" />
          <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-amber-300 bg-clip-text text-transparent">
            Directly With Friends
          </span>
        </h1>
        <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto">
          No signups, no app downloads, no ads. Create a match, share the link, and connect peer-to-peer in seconds.
        </p>
      </div>

      {/* Game Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {GAMES.map((game) => (
          <div
            key={game.id}
            className={`p-6 rounded-3xl border bg-gradient-to-b ${game.color} backdrop-blur-sm flex flex-col justify-between space-y-6 shadow-xl transition-all duration-300 hover:scale-[1.02]`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-slate-300 flex items-center gap-1.5">
                  <Users className="w-3 h-3" />
                  {game.players}
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                    game.badge === 'Live'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : 'bg-slate-900 text-slate-500 border-slate-800'
                  }`}
                >
                  {game.badge}
                </span>
              </div>
              <h3 className="text-2xl font-black text-white">{game.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{game.description}</p>
            </div>

            {game.href !== '#' ? (
              <Link
                href={game.href}
                className={`w-full py-3 px-4 rounded-xl font-bold text-center block transition-all active:scale-95 shadow-lg ${game.btnColor}`}
              >
                Play Now
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className={`w-full py-3 px-4 rounded-xl font-bold text-center block ${game.btnColor}`}
              >
                Coming Soon
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Platform Features Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-slate-900">
        <div className="flex items-center gap-3 p-4 bg-slate-900/40 rounded-2xl border border-slate-800/60">
          <Zap className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-slate-200 block">Zero Latency P2P</span>
            <span className="text-slate-400">Direct WebRTC DataChannels between players</span>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-slate-900/40 rounded-2xl border border-slate-800/60">
          <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-slate-200 block">Deterministic Engine</span>
            <span className="text-slate-400">Verified state transitions on both client devices</span>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-slate-900/40 rounded-2xl border border-slate-800/60">
          <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-slate-200 block">Instant Rematches</span>
            <span className="text-slate-400">Continuous play without generating new invite links</span>
          </div>
        </div>
      </div>
    </div>
  )
}
