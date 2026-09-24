# Multi-Device and Connection Testing

This guide outlines best practices for testing peer-to-peer (WebRTC) games across multiple devices (phones, tablets, and computers).

---

## Why Testing on `localhost` or `next dev` Fails Across Devices

When testing on two mobile phones or across separate machines, using `next dev` or plain `http://localhost:3000` causes false connection bugs:

1. **`localhost` resolves to the guest phone:**
   When the host runs on `http://localhost:3000`, the generated invite link and QR code encode `http://localhost:3000/...`. When scanned on a guest phone, `localhost` resolves to the phone itself rather than the host machine.
2. **Insecure Context (Plain HTTP on LAN IP):**
   Accessing `http://192.168.x.x:3000` on mobile runs in an insecure context (HTTP). Modern mobile browsers restrict or degrade WebRTC crypto, clipboard access (`navigator.clipboard`), and Web Share APIs (`navigator.share`) outside of Secure Contexts (`https://` or `http://localhost`).
3. **React Strict Mode Double-Mounting:**
   In development mode (`next dev`), React Strict Mode immediately mounts, unmounts, and re-mounts components. This destroys the initial `Peer` instance and creates a second one within milliseconds, causing race conditions with the public signaling server and confounding connection debugging.

---

## Recommended Workflow: Vercel Preview Deployments

The cleanest and most reliable way to test multi-device connections:

1. Push your branch or open a pull request.
2. Open the **Vercel preview deployment URL** on your primary device (host).
3. The preview deployment provides:
   - **HTTPS by default** (Secure Context enabled on all devices).
   - **Production build** (Strict Mode double-mount disabled).
   - **Publicly routable domain** so QR codes and invite links work on cellular or separate Wi-Fi networks.
4. Scan the QR code or share the invite URL / short room code to your guest device.

---

## Alternative: Local Multi-Device Testing via Cloudflare Tunnel

If you want to test local changes without pushing or deploying:

1. **Build and start the production server:**
   ```bash
   npm run build
   npm start
   ```
2. **Expose the local server over a secure public tunnel:**
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   *(Free, no Cloudflare account or login required.)*
3. Cloudflare will output an `https://<random-id>.trycloudflare.com` URL.
4. Open this `https://` URL on the host device. All generated invite links, QR codes, and room codes will now work on any guest phone.
