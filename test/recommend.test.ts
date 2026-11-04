import { test } from "node:test";
import assert from "node:assert/strict";
import { LINKS, buildLinks } from "../src/recommend.ts";

const track = { title: "Nothing Else Matters", artist: "Metallica & Friends" };

test("tab instruments link to Songsterr and Ultimate Guitar search", () => {
	const links = buildLinks(track, "guitar");
	assert.deepEqual(links.map((l) => l.site), ["Songsterr", "Ultimate Guitar"]);
	const ug = new URL(links[1]!.url);
	assert.equal(ug.hostname, "www.ultimate-guitar.com");
	assert.equal(ug.searchParams.get("value"), "Metallica & Friends Nothing Else Matters");
	assert.equal(ug.searchParams.get("search_type"), "title");
	assert.equal(new URL(links[0]!.url).searchParams.get("pattern"), "Metallica & Friends Nothing Else Matters");
});

test("piano and vocals link to Musicnotes only", () => {
	for (const i of ["piano", "vocals"] as const) {
		const links = buildLinks(track, i);
		assert.equal(links.length, 1);
		assert.equal(new URL(links[0]!.url).hostname, "www.musicnotes.com");
	}
});

test("affiliate params are appended when configured", () => {
	const site = LINKS.sites.musicnotes;
	site.affiliateParams.ref = "tabbit";
	try {
		assert.equal(new URL(buildLinks(track, "piano")[0]!.url).searchParams.get("ref"), "tabbit");
	} finally {
		delete site.affiliateParams.ref;
	}
});
