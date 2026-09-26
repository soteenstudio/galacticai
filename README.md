# galacticai

Requires Node.js 24 or newer and npm.

## Development

1. Run `npm ci`.
2. Copy `.env.example` to `.env` and set `OPENROUTER_API_KEY` there.
3. Run `npm run dev:server` for the API on port 3001.
4. In a second terminal, run `npm run dev` and open the Vite URL.

Vite proxies `/api` to the Node server. Keep the API port at 3001 during
development so it matches `vite.config.ts`.

## Production

Run `npm run build`, then `npm start`. The Node server serves `dist/` and
`POST /api/chat` from the same origin (port 3001 by default; override with `PORT`).
Deploy both the server and built assets to a Node host, with HTTPS provided by
your hosting platform or reverse proxy. Static-only hosting and `vite preview`
do not provide the chat endpoint. The endpoint is unauthenticated; restrict access
at your hosting layer if the app is private.

Set `OPENROUTER_API_KEY` in the server environment or the ignored `.env` file.
Never prefix it with `VITE_` or expose it through Vite's `define` configuration.
If a key was included in an earlier browser build, revoke it and replace it.

Chat requests include completed conversation turns in order. New Chat clears
that context; failed requests are excluded. Requests are limited to 128 KiB and
100 prior messages. Menu, attachment, and voice controls are hidden until those
features are implemented.

Run `npm test` for request and conversation tests, and `npm run build` for Vue
and TypeScript checks and the production build.
