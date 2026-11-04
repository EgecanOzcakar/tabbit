# Replace-the-mocks checklist

Each provider falls back to fixtures in `src/fixtures/` until its credentials are set. Work through this list before launch.

## Spotify

- [ ] Create an app at https://developer.spotify.com/dashboard
- [ ] Register the redirect URI: `$BASE_URL/auth/spotify/callback` (Spotify requires HTTPS or a loopback address such as `http://127.0.0.1:3000`)
- [ ] Set `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`; set `SPOTIFY_REDIRECT_URI` if it differs from the default
- [ ] Scopes used: `user-top-read`, `user-read-recently-played`, `playlist-read-private`, `playlist-read-collaborative`
- [ ] A development-mode app works only for allowlisted users. Apply for extended quota before public launch
- [ ] Development-mode apps may get empty artist `genres`. The app tolerates this; see "Follow-ups"
- [ ] **Legal review of the Spotify Developer Terms and Developer Policy**, especially the rules on combining Spotify data with other services, commercial use and monetization, attribution and branding, and data retention

## Deezer

- [ ] Create an app at https://developers.deezer.com/myapps. **Deezer has not been accepting new app registrations**, so until an app can be registered, Deezer stays in mock mode
- [ ] Register the redirect URI: `$BASE_URL/auth/deezer/callback`
- [ ] Set `DEEZER_APP_ID` and `DEEZER_SECRET`; set `DEEZER_REDIRECT_URI` if it differs from the default
- [ ] Permissions used: `basic_access`, `offline_access`
- [ ] Check that Deezer echoes the OAuth `state` parameter back to the callback. The callback rejects a login without it. Test this end to end once an app exists
- [ ] Review the Deezer API terms

## Infrastructure

- [ ] Provision Redis and set `REDIS_URL`. Production refuses to start without it
- [ ] `NODE_ENV=production`, a random `SESSION_SECRET` of at least 32 characters, and HTTPS behind a proxy (`trust proxy` is set to 1)
- [ ] Set `BASE_URL` to the public URL; set `APP_URL` if the UI is hosted elsewhere
- [ ] Unset `MOCK_PROVIDERS`

## Tab and sheet music sites

- [ ] Check the search URL formats in `LINKS` (`src/recommend.ts`) against each live site
- [ ] Fill in `affiliateParams` per site once affiliate deals exist (Musicnotes, Ultimate Guitar and Songsterr programs)
- [ ] Review each site's terms on deep linking and use of its name or logo

## Follow-ups

- Genre enrichment from MusicBrainz or Last.fm tags, where providers return empty genres
- Smarter ranking: filter by difficulty and instrument, and check tab availability through official partner APIs
- License choice; trademark check of the name "tabbit"
