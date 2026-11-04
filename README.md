# tabbit

tabbit reads your music taste (playlists, top artists, genres) from Spotify and Deezer, then recommends tabs and sheet music for the instrument you play. It does this by deep-linking to search pages on licensed sites (Songsterr, Ultimate Guitar, Musicnotes). tabbit does not host or scrape tab content.

Without credentials, every provider runs on fixture data (`src/fixtures/`), so the whole flow works locally. [SETUP.md](SETUP.md) lists what to replace before going live.

## Quick start

```sh
npm ci
echo "SESSION_SECRET=$(openssl rand -base64 48)" > .env
npm run dev          # open http://localhost:3000, click Connect (mock)
```

## Scripts

```sh
npm run dev        # tsx watch
npm test           # node:test via tsx
npm run build      # tsc -> dist/
npm start          # node dist/index.js
```

Requires Node.js 22+.

## Environment

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `SESSION_SECRET` | yes | | At least 32 characters |
| `REDIS_URL` | in production | | e.g. `redis://localhost:6379`. Without it, dev uses an in-memory store and production refuses to start |
| `NODE_ENV` | no | `development` | `production` turns on secure cookies and `trust proxy` |
| `PORT` | no | `3000` | |
| `BASE_URL` | no | `http://localhost:3000` | Public URL, used for default redirect URIs |
| `APP_URL` | no | `/` | Where the browser goes after login |
| `MOCK_PROVIDERS` | no | `false` | `1` forces fixture data for every provider |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` | no | | If either is missing, Spotify uses mock data |
| `SPOTIFY_REDIRECT_URI` | no | `$BASE_URL/auth/spotify/callback` | |
| `DEEZER_APP_ID`, `DEEZER_SECRET` | no | | If either is missing, Deezer uses mock data |
| `DEEZER_REDIRECT_URI` | no | `$BASE_URL/auth/deezer/callback` | |

Sessions are server-side. The `sid` cookie carries only the session id, and provider tokens never reach the browser.

## Routes

- `GET /` serves the UI from `public/`
- `GET /health`
- `GET /auth/{spotify,deezer}/login`, then `GET /auth/{spotify,deezer}/callback` (OAuth with `state`; in mock mode, login connects immediately)
- `POST /auth/logout` destroys the session
- `GET /me` returns connected providers and which ones are mocked
- `GET /me/profile` returns the merged taste profile: `topArtists`, `topGenres`, `sampleTracks`, `playlists`
- `GET /recommendations?instrument=guitar|bass|ukulele|piano|drums|vocals` returns profile tracks with search links

The site-per-instrument mapping and the affiliate parameter placeholders live in `LINKS` in `src/recommend.ts`.

When a provider fails, the API returns `401` with `reauth: true` if the user must log in again, passes `429` through with `Retry-After`, and returns `502` for upstream outages.
