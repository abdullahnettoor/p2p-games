#!/usr/bin/env node
import { PeerServer } from 'peer'

const port = Number(process.env.PEER_PORT ?? process.env.PORT ?? 9000)
const path = process.env.PEER_PATH ?? '/'
const allowDiscovery = process.env.PEER_ALLOW_DISCOVERY === 'true'

const server = PeerServer({
  port,
  path,
  allow_discovery: allowDiscovery,
})

server.on('connection', (client) => {
  console.log(`[PeerServer] Peer connected: ${client.getId()}`)
})

server.on('disconnect', (client) => {
  console.log(`[PeerServer] Peer disconnected: ${client.getId()}`)
})

server.on('error', (err) => {
  console.error('[PeerServer] Error:', err)
})

console.log(`\n✓ PeerServer is running on port ${port} (path: ${path})`)
console.log(`\nTo point your local web app to this server, add to .env.local:`)
console.log(`  NEXT_PUBLIC_PEER_HOST=localhost`)
console.log(`  NEXT_PUBLIC_PEER_PORT=${port}`)
console.log(`  NEXT_PUBLIC_PEER_PATH=${path}`)
console.log(`  NEXT_PUBLIC_PEER_SECURE=false\n`)

const shutdown = () => {
  console.log('\nStopping PeerServer...')
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
