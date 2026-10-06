const SERVER_PORT = process.env.NEXT_PUBLIC_SERVER_PORT || "3001";

// The game server runs on the same host the page was loaded from,
// so this works both on localhost and when opened from another device on the LAN.
export function getServerUrl() {
  if (typeof window === "undefined") return `http://localhost:${SERVER_PORT}`;
  return `${window.location.protocol}//${window.location.hostname}:${SERVER_PORT}`;
}
