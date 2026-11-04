import { randomBytes, timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import type { SpotifyTokens } from "../types.js";
import { env } from "./env.js";

/** Upstream Spotify failure, mapped to the status we return to our client. */
export class SpotifyError extends Error {
	constructor(
		message: string,
		public status: number,
		public retryAfter?: string,
		public reauth = false,
	) {
		super(message);
	}
}

function toSpotifyError(res: Response, what: string): SpotifyError {
	const msg = `${what} failed: Spotify responded ${res.status}`;
	// 400 on the token endpoint = invalid_grant (revoked/expired refresh token).
	if (res.status === 401 || (what === "Token refresh" && res.status === 400)) {
		return new SpotifyError(msg, 401, undefined, true);
	}
	if (res.status === 429) return new SpotifyError(msg, 429, res.headers.get("retry-after") ?? undefined);
	if (res.status >= 500) return new SpotifyError(msg, 502);
	return new SpotifyError(msg, res.status);
}

/** fetch that turns network failures and non-2xx responses into SpotifyError. */
async function spotifyFetch(url: string, init: RequestInit, what: string): Promise<Response> {
	let res: Response;
	try {
		res = await fetch(url, init);
	} catch (err) {
		throw new SpotifyError(`${what} failed: could not reach Spotify (${(err as Error).message})`, 502);
	}
	if (!res.ok) throw toSpotifyError(res, what);
	return res;
}

export function newOAuthState(): string {
	return randomBytes(16).toString("base64url");
}

export function isValidState(expected: unknown, received: unknown): boolean {
	if (typeof expected !== "string" || typeof received !== "string" || !expected) return false;
	const a = Buffer.from(expected);
	const b = Buffer.from(received);
	return a.length === b.length && timingSafeEqual(a, b);
}

export async function refreshSpotifyToken(refreshToken: string): Promise<SpotifyTokens> {
	const res = await spotifyFetch(
		"https://accounts.spotify.com/api/token",
		{
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				grant_type: "refresh_token",
				refresh_token: refreshToken,
				client_id: env.SPOTIFY_CLIENT_ID,
				client_secret: env.SPOTIFY_CLIENT_SECRET,
			}),
		},
		"Token refresh",
	);
	const data = (await res.json()) as { access_token: string; expires_in: number; refresh_token?: string };
	return {
		accessToken: data.access_token,
		// Spotify may rotate the refresh token; keep the new one if sent.
		refreshToken: data.refresh_token ?? refreshToken,
		expiresAt: Date.now() + data.expires_in * 1000 - 30_000,
	};
}

// ponytail: per-process dedupe; with several instances, concurrent refreshes across them can still race.
const inflight = new Map<string, Promise<SpotifyTokens>>();

/** Returns a valid access token for the session, refreshing (once per session at a time) if expired. */
export async function ensureAccessToken(req: Request): Promise<string> {
	const tokens = req.session.spotify;
	if (!tokens) throw new SpotifyError("Not authenticated with Spotify", 401, undefined, true);
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
		if (err instanceof SpotifyError && err.reauth) delete req.session.spotify;
		throw err;
	}
}

export async function fetchSpotify<T>(path: string, accessToken: string, init?: RequestInit): Promise<T> {
	const res = await spotifyFetch(
		`https://api.spotify.com/v1${path}`,
		{ ...init, headers: { Authorization: `Bearer ${accessToken}`, ...init?.headers } },
		"Spotify API request",
	);
	return (await res.json()) as T;
}
