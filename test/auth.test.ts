import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import type { Request } from "express";

Object.assign(process.env, {
	SESSION_SECRET: "x".repeat(32),
	SPOTIFY_CLIENT_ID: "id",
	SPOTIFY_CLIENT_SECRET: "secret",
	SPOTIFY_REDIRECT_URI: "http://localhost:3000/auth/spotify/callback",
});
const { isValidState, newOAuthState, refreshSpotifyToken, ensureAccessToken, SpotifyError } = await import(
	"../src/utils/auth.ts"
);

const realFetch = globalThis.fetch;
afterEach(() => {
	globalThis.fetch = realFetch;
});

function mockFetch(body: unknown, status = 200, headers: Record<string, string> = {}) {
	let calls = 0;
	globalThis.fetch = async () => {
		calls++;
		return new Response(JSON.stringify(body), { status, headers });
	};
	return () => calls;
}

test("OAuth state: matches only the exact stored value", () => {
	const s = newOAuthState();
	assert.ok(s.length >= 20);
	assert.notEqual(s, newOAuthState());
	assert.equal(isValidState(s, s), true);
	assert.equal(isValidState(s, s + "x"), false);
	assert.equal(isValidState(s, undefined), false);
	assert.equal(isValidState(undefined, undefined), false);
	assert.equal(isValidState("", ""), false);
	assert.equal(isValidState(s, [s]), false);
});

test("refresh keeps the rotated refresh_token when Spotify returns one", async () => {
	mockFetch({ access_token: "a2", expires_in: 3600, refresh_token: "r2" });
	const t = await refreshSpotifyToken("r1");
	assert.equal(t.accessToken, "a2");
	assert.equal(t.refreshToken, "r2");
});

test("refresh keeps the old refresh_token when none is returned", async () => {
	mockFetch({ access_token: "a2", expires_in: 3600 });
	assert.equal((await refreshSpotifyToken("r1")).refreshToken, "r1");
});

test("refresh maps invalid_grant to a re-auth 401 and 429 keeps Retry-After", async () => {
	mockFetch({ error: "invalid_grant" }, 400);
	await assert.rejects(refreshSpotifyToken("r1"), (e) => e instanceof SpotifyError && e.status === 401 && e.reauth);
	mockFetch({}, 429, { "Retry-After": "7" });
	await assert.rejects(refreshSpotifyToken("r1"), (e) => e instanceof SpotifyError && e.status === 429 && e.retryAfter === "7");
});

test("concurrent requests on one session share a single refresh", async () => {
	const calls = mockFetch({ access_token: "a2", expires_in: 3600, refresh_token: "r2" });
	const expired = { accessToken: "a1", refreshToken: "r1", expiresAt: 0 };
	const req = () => ({ sessionID: "s1", session: { spotify: { ...expired } } }) as unknown as Request;
	const [r1, r2] = [req(), req()];
	assert.deepEqual(await Promise.all([ensureAccessToken(r1), ensureAccessToken(r2)]), ["a2", "a2"]);
	assert.equal(calls(), 1);
	assert.equal(r2.session.spotify?.refreshToken, "r2");
});
