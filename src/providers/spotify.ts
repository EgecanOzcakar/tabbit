import type { Request } from "express";
import type { SpotifyTokens, Taste } from "../types.js";
import { creds, redirectUri } from "../utils/env.js";
import { ProviderError, errorFor, rotateSession, safeFetch } from "../utils/auth.js";
import { spotifyFixture } from "../fixtures/spotify.js";

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const SCOPES = ["user-read-recently-played", "user-top-read", "playlist-read-private", "playlist-read-collaborative"];

function need() {
	if (!creds.spotify) throw new ProviderError("Spotify is in mock mode", 500);
	return creds.spotify;
}

async function tokenRequest(params: Record<string, string>, what: string) {
	const c = need();
	const res = await safeFetch(
		TOKEN_URL,
		{
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({ ...params, client_id: c.id, client_secret: c.secret }),
		},
		what,
	);
	// 400 on the token endpoint = invalid_grant (bad code / revoked refresh token).
	if (!res.ok) throw errorFor(res.status, what, res.headers.get("retry-after"), res.status === 400 || res.status === 401);
	return (await res.json()) as { access_token: string; expires_in: number; refresh_token?: string };
}

export function authorizeUrl(state: string): string {
	const params = new URLSearchParams({
		client_id: need().id,
		response_type: "code",
		redirect_uri: redirectUri("spotify"),
		state,
		scope: SCOPES.join(" "),
	});
	return `https://accounts.spotify.com/authorize?${params}`;
}

export async function connect(req: Request, code: string): Promise<void> {
	const t = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirectUri("spotify") }, "Spotify login");
	await rotateSession(req);
	req.session.spotify = { accessToken: t.access_token, refreshToken: t.refresh_token ?? "", expiresAt: Date.now() + t.expires_in * 1000 - 30_000 };
}

export function connectMock(req: Request): void {
	req.session.spotify = { accessToken: "mock", refreshToken: "mock", expiresAt: Number.MAX_SAFE_INTEGER };
}

export async function refreshSpotifyToken(refreshToken: string): Promise<SpotifyTokens> {
	const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken }, "Token refresh");
	return {
		accessToken: t.access_token,
		// Spotify may rotate the refresh token; keep the new one if sent.
		refreshToken: t.refresh_token ?? refreshToken,
		expiresAt: Date.now() + t.expires_in * 1000 - 30_000,
	};
}

// ponytail: per-process dedupe; with several instances, concurrent refreshes across them can still race.
const inflight = new Map<string, Promise<SpotifyTokens>>();

/** Returns a valid access token for the session, refreshing (once per session at a time) if expired. */
export async function ensureAccessToken(req: Request): Promise<string> {
	const tokens = req.session.spotify;
	if (!tokens) throw new ProviderError("Not connected to Spotify", 401, undefined, true);
	if (Date.now() < tokens.expiresAt) return tokens.accessToken;

	let pending = inflight.get(req.sessionID);
	if (!pending) {
		pending = refreshSpotifyToken(tokens.refreshToken).finally(() => inflight.delete(req.sessionID));
		inflight.set(req.sessionID, pending);
	}
	try {
		const refreshed = await pending;
		req.session.spotify = refreshed;
		return refreshed.accessToken;
	} catch (err) {
		if (err instanceof ProviderError && err.reauth) delete req.session.spotify;
		throw err;
	}
}

export async function fetchSpotify<T>(path: string, accessToken: string): Promise<T> {
	const what = "Spotify API request";
	const res = await safeFetch(`https://api.spotify.com/v1${path}`, { headers: { Authorization: `Bearer ${accessToken}` } }, what);
	if (!res.ok) throw errorFor(res.status, what, res.headers.get("retry-after"));
	return (await res.json()) as T;
}

type Artist = { name: string; genres?: string[] };

export async function getTaste(req: Request): Promise<Taste> {
	if (!creds.spotify) return spotifyFixture;
	const token = await ensureAccessToken(req);
	const [artists, tracks, playlists] = await Promise.all([
		fetchSpotify<{ items: Artist[] }>("/me/top/artists?limit=20&time_range=medium_term", token),
		fetchSpotify<{ items: { name: string; artists: Artist[] }[] }>("/me/top/tracks?limit=20&time_range=medium_term", token),
		fetchSpotify<{ items: ({ name: string } | null)[] }>("/me/playlists?limit=50", token),
	]);
	return {
		provider: "spotify",
		artists: artists.items.map((a) => a.name),
		// Spotify may return empty genres for development-mode apps; that's fine.
		genres: artists.items.flatMap((a) => a.genres ?? []),
		tracks: tracks.items.map((t) => ({ title: t.name, artist: t.artists[0]?.name ?? "" })),
		playlists: playlists.items.flatMap((p) => (p ? [p.name] : [])),
	};
}
