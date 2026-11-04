import { test } from "node:test";
import assert from "node:assert/strict";

const base = {
	SESSION_SECRET: "x".repeat(32),
	SPOTIFY_CLIENT_ID: "id",
	SPOTIFY_CLIENT_SECRET: "secret",
	SPOTIFY_REDIRECT_URI: "http://localhost:3000/auth/spotify/callback",
};
Object.assign(process.env, base);
const { EnvSchema } = await import("../src/utils/env.ts");

test("PORT defaults to the number 3000", () => {
	assert.equal(EnvSchema.parse(base).PORT, 3000);
});

test("PORT string is coerced to a number", () => {
	assert.equal(EnvSchema.parse({ ...base, PORT: "8080" }).PORT, 8080);
});

test("invalid PORT is rejected", () => {
	assert.equal(EnvSchema.safeParse({ ...base, PORT: "abc" }).success, false);
});

test("SESSION_SECRET shorter than 32 chars is rejected", () => {
	assert.equal(EnvSchema.safeParse({ ...base, SESSION_SECRET: "short" }).success, false);
});
