import { io, Socket } from "socket.io-client";

// Derive the WebSocket base URL from the API URL by extracting the origin.
// e.g. "http://localhost:3000/api/v1" → "http://localhost:3000"
// This avoids needing a separate NEXT_PUBLIC_WS_URL env var.
const _apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";
const WS_BASE = (() => {
  try {
    return new URL(_apiUrl).origin;
  } catch {
    return "http://localhost:3000";
  }
})();

let socket: Socket | null = null;

export function getSocket(token: string): Socket {
  if (!socket || !socket.connected) {
    socket?.disconnect();
    socket = io(WS_BASE, {
      auth: { token },
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
