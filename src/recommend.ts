import type { Track } from "./types.js";

export const INSTRUMENTS = ["guitar", "bass", "ukulele", "piano", "drums", "vocals"] as const;
export type Instrument = (typeof INSTRUMENTS)[number];

/**
 * Licensed sites we deep-link to (search pages only: no scraping, no hosted content),
 * and which sites serve which instrument.
 */
export const LINKS = {
	sites: {
		songsterr: {
			label: "Songsterr",
			url: "https://www.songsterr.com/",
			queryParam: "pattern",
			params: {} as Record<string, string>,
			affiliateParams: {} as Record<string, string>, // TODO: fill in once an affiliate deal exists
		},
		ultimateGuitar: {
			label: "Ultimate Guitar",
			url: "https://www.ultimate-guitar.com/search.php",
			queryParam: "value",
			params: { search_type: "title" } as Record<string, string>,
			affiliateParams: {} as Record<string, string>,
		},
		musicnotes: {
			label: "Musicnotes",
			url: "https://www.musicnotes.com/search/go",
			queryParam: "w",
			params: {} as Record<string, string>,
			affiliateParams: {} as Record<string, string>,
		},
	},
	instruments: {
		guitar: ["songsterr", "ultimateGuitar"],
		bass: ["songsterr", "ultimateGuitar"],
		ukulele: ["ultimateGuitar", "songsterr"],
		drums: ["songsterr", "ultimateGuitar"],
		piano: ["musicnotes"],
		vocals: ["musicnotes"],
	},
} as const;

export type Link = { site: string; url: string };

export function buildLinks(track: Track, instrument: Instrument): Link[] {
	const q = `${track.artist} ${track.title}`.trim();
	return LINKS.instruments[instrument].map((id) => {
		const site = LINKS.sites[id];
		const url = new URL(site.url);
		for (const [k, v] of Object.entries({ ...site.params, [site.queryParam]: q, ...site.affiliateParams })) {
			url.searchParams.set(k, v);
		}
		return { site: site.label, url: url.href };
	});
}

export function recommend(tracks: Track[], instrument: Instrument) {
	return tracks.map((track) => ({ ...track, links: buildLinks(track, instrument) }));
}
