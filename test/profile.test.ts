import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregate } from "../src/profile.ts";
import type { Taste } from "../src/types.ts";

const spotify: Taste = {
	provider: "spotify",
	artists: ["Radiohead", "Metallica", "Adele"],
	genres: ["rock", "metal", "rock"],
	tracks: [{ title: "Creep", artist: "Radiohead" }, { title: "One", artist: "Metallica" }],
	playlists: ["A"],
};
const deezer: Taste = {
	provider: "deezer",
	artists: ["metallica", "Bjork"],
	genres: ["Metal", "Pop"],
	tracks: [{ title: "creep", artist: "radiohead" }, { title: "Joga", artist: "Bjork" }],
	playlists: ["B"],
};

test("merges providers: rank-weighted artists, counted genres, de-duplicated tracks", () => {
	const p = aggregate([spotify, deezer]);
	assert.deepEqual(p.providers, ["spotify", "deezer"]);
	// Metallica: 2 (spotify rank 2 of 3) + 2 (deezer rank 1 of 2) = 4 beats Radiohead's 3.
	assert.deepEqual(p.topArtists, ["Metallica", "Radiohead", "Adele", "Bjork"]);
	assert.deepEqual(p.topGenres.slice(0, 2), ["rock", "metal"]);
	assert.deepEqual(p.sampleTracks.map((t) => t.title), ["Creep", "One", "Joga"]);
	assert.deepEqual(p.playlists, [{ provider: "spotify", name: "A" }, { provider: "deezer", name: "B" }]);
});

test("empty input gives an empty profile", () => {
	assert.deepEqual(aggregate([]), { providers: [], topArtists: [], topGenres: [], sampleTracks: [], playlists: [] });
});
