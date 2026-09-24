import { DurableObject } from 'cloudflare:workers'

export interface Env {
  SIGNALING_HUB: DurableObjectNamespace<SignalingHub>
}

interface PeerMessage {
  type: string
  payload?: unknown
  dst?: string
  src?: string
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
}

export class SignalingHub extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const peerId = url.searchParams.get('id')

    if (!peerId) {
      return new Response('Missing peer id in query parameters', { status: 400 })
    }

    const upgradeHeader = request.headers.get('Upgrade')
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    // Tag the WebSocket with peerId for instant lookup without extra memory
    this.ctx.acceptWebSocket(server, [peerId])

    // PeerJS protocol expects an OPEN signal immediately after connection
    server.send(JSON.stringify({ type: 'OPEN' }))

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    try {
      const raw = typeof message === 'string' ? message : new TextDecoder().decode(message)
      const data = JSON.parse(raw) as PeerMessage

      if (data.type === 'HEARTBEAT') {
        ws.send(JSON.stringify({ type: 'HEARTBEAT' }))
        return
      }

      if (data.dst) {
        const recipients = this.ctx.getWebSockets(data.dst)
        if (recipients.length > 0) {
          recipients[0].send(raw)
        } else {
          // Notify caller that destination peer is not connected
          ws.send(
            JSON.stringify({
              type: 'LEAVE',
              dst: data.src,
              src: data.dst,
            })
          )
        }
      }
    } catch {
      // Ignore malformed messages
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    ws.close(1000, 'Closed')
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    ws.close(1011, 'WebSocket error')
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      })
    }

    // PeerJS client ID request endpoint: GET /:path/:key/id or /id
    if (url.pathname.endsWith('/id') || url.pathname === '/id') {
      const generatedId = crypto.randomUUID()
      return new Response(generatedId, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          ...CORS_HEADERS,
        },
      })
    }

    // WebSocket signaling connection
    const upgradeHeader = request.headers.get('Upgrade')
    if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
      const hubId = env.SIGNALING_HUB.idFromName('global-lobby')
      const hubStub = env.SIGNALING_HUB.get(hubId)
      return hubStub.fetch(request)
    }

    return new Response('P2P Games Signaling Server (Cloudflare Workers)', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        ...CORS_HEADERS,
      },
    })
  },
}
