/**
 * Starts ONE server version (new or previous) in its own process for the end-to-end rollback test.
 *   node --import tsx test/rollback/serve-version.ts <path-to-server-core.ts>
 * Prints "LISTENING <port>" when ready. Uses the data file in APP_DB_PATH (synthetic sandbox only).
 *
 * Google's tokeninfo endpoint is stubbed IN THIS PROCESS ONLY: a credential "signed:<base64url JSON>"
 * is answered with that JSON as Google would answer for a genuinely signed token. This lets the test
 * reproduce what each version does with a real, Google-verified token — no network, no real accounts.
 */
import http from "node:http";

const serverPath = process.argv[2];
if (!serverPath) {
  console.error("usage: serve-version.ts <server-core.ts>");
  process.exit(2);
}

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: any, init?: any) => {
  const url = typeof input === "string" ? input : input?.url || String(input);
  if (url.startsWith("https://oauth2.googleapis.com/tokeninfo")) {
    const tok = new URL(url).searchParams.get("id_token") || "";
    if (!tok.startsWith("signed:")) return new Response(JSON.stringify({ error: "invalid_token" }), { status: 400 });
    return new Response(Buffer.from(tok.slice(7), "base64url").toString("utf8"), { status: 200, headers: { "content-type": "application/json" } });
  }
  return realFetch(input, init);
}) as any;

const core: any = await import(serverPath);
if (typeof core.reloadDbFromDisk === "function") core.reloadDbFromDisk();
const server = http.createServer(core.default);
server.listen(0, "127.0.0.1", () => {
  process.stdout.write(`\nLISTENING ${(server.address() as any).port}\n`);
});
const stop = () => server.close(() => process.exit(0));
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
