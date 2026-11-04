# tabbit

Backend that reads your music taste (playlists, artists, genres) from streaming services and will recommend guitar tabs / sheet music for the instruments you play by deep-linking to licensed sites (Songsterr, Ultimate Guitar, Musicnotes). tabbit does not host tab content.

Status: Spotify OAuth and basic Spotify reads. Deezer and recommendations are not built yet.

## Requirements

- Node.js 22+
- Redis (required when `NODE_ENV=production`; optional in development)
- A Spotify app from the [Spotify developer dashboard](https://developer.spotify.com/dashboard) with the redirect URI below registered

## Environment

Put these in `.env` (loaded via dotenv) or the process environment.

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `SESSION_SECRET` | yes | | At least 32 characters, e.g. `openssl rand -base64 48` |
| `SPOTIFY_CLIENT_ID` | yes | | |
| `SPOTIFY_CLIENT_SECRET` | yes | | |
| `SPOTIFY_REDIRECT_URI` | yes | | e.g. `http://127.0.0.1:3000/auth/spotify/callback` |
| `REDIS_URL` | in production | | e.g. `redis://localhost:6379`. Without it, dev uses an in-memory store and production refuses to start |
| `NODE_ENV` | no | `development` | `production` turns on secure cookies and `trust proxy` |
| `PORT` | no | `3000` | |
| `BASE_URL` | no | `http://localhost:3000` | Public URL, shown in the startup log |
| `APP_URL` | no | `/` | Where the browser goes after a successful login |

Sessions are server-side; the cookie (`sid`) carries only the session id. Spotify tokens never reach the browser.

## Run

```sh
npm ci
npm run dev        # tsx watch
npm test           # node:test via tsx
npm run build      # tsc -> dist/
npm start          # node dist/index.js
```

## Routes

- `GET /` returns `{ ok, spotify }`, where `spotify` says whether this session is logged in
- `GET /health`
- `GET /auth/spotify/login` then `GET /auth/spotify/callback` (OAuth with `state`)
- `POST /auth/logout` destroys the session
- `GET /spotify/me/playlists`, `GET /spotify/me/recently-played`

When a Spotify call fails, the API returns `401` with `reauth: true` if the user must log in again, passes `429` through with `Retry-After`, and returns `502` for Spotify outages.
