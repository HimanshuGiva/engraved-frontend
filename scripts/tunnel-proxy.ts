/**
 * Routes a single public URL (ngrok) to backend API and frontend dev server.
 * /healthz and /v1/* -> backend (8080), everything else -> frontend (3001).
 */
import http from "node:http";

const BACKEND = process.env.TUNNEL_BACKEND_URL ?? "http://127.0.0.1:8080";
const FRONTEND = process.env.TUNNEL_FRONTEND_URL ?? "http://127.0.0.1:3001";
const PORT = Number(process.env.TUNNEL_PROXY_PORT ?? 4000);
const HOST = process.env.TUNNEL_PROXY_HOST ?? "0.0.0.0";

function isBackendRoute(pathname: string): boolean {
  return pathname === "/healthz" || pathname.startsWith("/v1/");
}

function targetOrigin(pathname: string): string {
  return isBackendRoute(pathname) ? BACKEND : FRONTEND;
}

const server = http.createServer((clientReq, clientRes) => {
  const url = new URL(clientReq.url ?? "/", "http://localhost");
  const origin = targetOrigin(url.pathname);
  const target = new URL(url.pathname + url.search, origin);

  const proxyReq = http.request(
    target,
    {
      method: clientReq.method,
      headers: {
        ...clientReq.headers,
        host: target.host,
      },
    },
    (proxyRes) => {
      clientRes.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
      proxyRes.pipe(clientRes);
    },
  );

  proxyReq.on("error", (err) => {
    console.error(`Proxy error (${origin}${url.pathname}):`, err.message);
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { "Content-Type": "text/plain" });
    }
    clientRes.end("Bad gateway — is the backend (8080) and frontend (3001) running?");
  });

  clientReq.pipe(proxyReq);
});

server.listen(PORT, HOST, () => {
  console.log(`Tunnel proxy listening on http://${HOST}:${PORT}`);
  console.log(`  API      -> ${BACKEND}`);
  console.log(`  Frontend -> ${FRONTEND}`);
  console.log(`Point ngrok at port ${PORT}, e.g. ngrok http ${PORT}`);
});
