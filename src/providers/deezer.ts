import type { Request } from "express";
import type { Taste } from "../types.js";
import { creds, redirectUri } from "../utils/env.js";
import { ProviderError, errorFor, rotateSession, safeFetch } from "../utils/auth.js";
import { deezerFixture } from "../fixtures/deezer.js";

// Docs: https://developers.deezer.com/api/oauth
function need() {
	if (!creds.deezer) throw new ProviderError("Deezer is in mock mode", 500);
	return creds.deezer;
}

export function authorizeUrl(state: string): string {
	const params = new URLSearchParams({
		app_id: need().id,
		redirect_uri: redirectUri("deezer"),
		perms: "basic_access,offline_access",
		state,
	});
	return `https://connect.deezer.com/oauth/auth.php?${params}`;
}

export async function connect(req: Request, code: string): Promise<void> {
	const c = need();
	const params = new URLSearchParams({ app_id: c.id, secret: c.secret, code, output: "json" });
	const res = await safeFetch(`https://connect.deezer.com/oauth/access_token.php?${params}`, {}, "Deezer login");
	if (!res.ok) throw errorFor(res.status, "Deezer login");
	// On a bad code Deezer answers 200 with plain text ("wrong code"), not JSON.
	const data = (await res.json().catch(() => null)) as { access_token?: string } | null;
	if (!data?.access_token) throw new ProviderError("Deezer login failed: code rejected", 401, undefined, true);
	await rotateSession(req);
	req.session.deezer = { accessToken: data.access_token };
}

export function connectMock(req: Request): void {
	req.session.deezer = { accessToken: "mock" };
}

type DeezerError = { error?: { type?: string; message?: string; code?: number } };

/** Deezer reports errors as HTTP 200 with an `error` object. */
export async function fetchDeezer<T>(path: string, accessToken: string): Promise<T> {
	const what = "Deezer API request";
	const sep = path.includes("?") ? "&" : "?";
	const res = await safeFetch(`https://api.deezer.com${path}${sep}access_token=${encodeURIComponent(accessToken)}`, {}, what);
	if (!res.ok) throw errorFor(res.status, what, res.headers.get("retry-after"));
	const body = (await res.json()) as T & DeezerError;
	if (body.error) {
		if (body.error.type === "OAuthException") throw errorFor(401, what);
		if (body.error.code === 4) throw errorFor(429, what); // quota exceeded
		throw new ProviderError(`${what} failed: ${body.error.message ?? "unknown error"}`, 502);
	}
	return body;
}

type List<T> = { data: T[] };

export async function getTaste(req: Request): Promise<Taste> {
	if (!creds.deezer) return deezerFixture;
	const token = req.session.deezer?.accessToken;
	if (!token) throw new ProviderError("Not connected to Deezer", 401, undefined, true);
	const [playlists, artists, tracks, albums, genres] = await Promise.all([
		fetchDeezer<List<{ title: string }>>("/user/me/playlists?limit=50", token),
		fetchDeezer<List<{ name: string }>>("/user/me/artists?limit=50", token),
		fetchDeezer<List<{ title: string; artist: { name: string } }>>("/user/me/tracks?limit=50", token),
		fetchDeezer<List<{ genre_id?: number }>>("/user/me/albums?limit=50", token),
		fetchDeezer<List<{ id: number; name: string }>>("/genre", token),
	]);
	// Deezer artists carry no genres; use the genres of the user's favourite albums.
	const genreName = new Map(genres.data.map((g) => [g.id, g.name]));
	return {
		provider: "deezer",
		artists: artists.data.map((a) => a.name),
		genres: albums.data.flatMap((a) => genreName.get(a.genre_id ?? -1) ?? []),
		tracks: tracks.data.map((t) => ({ title: t.title, artist: t.artist.name })),
		playlists: playlists.data.map((p) => p.title),
	};
}
