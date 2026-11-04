import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

Object.assign(process.env, { SESSION_SECRET: "x".repeat(32), MOCK_PROVIDERS: "1" });
const { createApp } = await import("../src/app.ts");

let server: Server;
let base: string;
before(async () => {
	server = createApp().listen(0);
	await new Promise((r) => server.once("listening", r));
	base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

/** Tiny cookie-keeping client. */
function client() {
	let cookie = "";
	return async (path: string, init: RequestInit = {}) => {
		const res = await fetch(base + path, { ...init, redirect: "manual", headers: { cookie } });
		const set = res.headers.get("set-cookie");
		if (set) cookie = set.split(";")[0]!;
		return res;
	};
}

test("mock flow: login both providers, profile, recommendations, logout", async () => {
	const get = client();
	assert.equal((await get("/me/profile")).status, 401);

	assert.equal((await get("/auth/spotify/login")).status, 302);
	assert.equal((await get("/auth/deezer/login")).status, 302);
	const me = await (await get("/me")).json();
	assert.deepEqual(me, { connected: { spotify: true, deezer: true }, mock: { spotify: true, deezer: true } });

	const profile = await (await get("/me/profile")).json();
	assert.deepEqual(profile.providers, ["spotify", "deezer"]);
	assert.equal(profile.topArtists[0], "Metallica");

	const recs = await (await get("/recommendations?instrument=bass")).json();
	assert.equal(recs.instrument, "bass");
	assert.ok(recs.items.length > 0);
	assert.ok(recs.items[0].links.some((l: { url: string }) => l.url.startsWith("https://www.songsterr.com/")));

	assert.equal((await get("/recommendations?instrument=kazoo")).status, 400);

	assert.equal((await get("/auth/logout", { method: "POST" })).status, 204);
	assert.equal((await get("/me/profile")).status, 401);
});

test("callback rejects a missing or wrong OAuth state", async () => {
	const res = await client()("/auth/spotify/callback?code=x&state=nope");
	assert.equal(res.status, 400);
});

test("serves the static UI and health", async () => {
	const get = client();
	assert.match(await (await get("/")).text(), /<title>tabbit<\/title>/);
	assert.deepEqual(await (await get("/health")).json(), { ok: true });
});
