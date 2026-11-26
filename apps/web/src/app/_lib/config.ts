// Where the website and the API live. Set in .env (see .env.example).
// Server-side only: the browser always calls this site's own /api/... (next.config.ts rewrites it to the API).

const trim = (url: string) => url.replace(/\/$/, "");

/** The API (apps/api), as reached from this website's server. */
export const apiUrl = trim(process.env.API_URL ?? "http://localhost:3000");

/** This website's public address (canonical links, link previews). */
export const webUrl = trim(process.env.WEB_URL ?? "http://localhost:3001");
