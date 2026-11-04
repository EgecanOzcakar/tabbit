import type { Provider, Taste, Track } from "./types.js";

export type Profile = {
	providers: Provider[];
	topArtists: string[];
	topGenres: string[];
	sampleTracks: Track[];
	playlists: { provider: Provider; name: string }[];
};

function top(scores: Map<string, { name: string; score: number }>, n: number): string[] {
	return [...scores.values()].sort((a, b) => b.score - a.score).slice(0, n).map((s) => s.name);
}

function bump(scores: Map<string, { name: string; score: number }>, name: string, by: number) {
	const key = name.trim().toLowerCase();
	if (!key) return;
	const cur = scores.get(key);
	if (cur) cur.score += by;
	else scores.set(key, { name: name.trim(), score: by });
}

/** Merges per-provider tastes: artists weighted by rank, genres by frequency, tracks de-duplicated. */
export function aggregate(tastes: Taste[], limit = 10, trackLimit = 20): Profile {
	const artists = new Map<string, { name: string; score: number }>();
	const genres = new Map<string, { name: string; score: number }>();
	const seen = new Set<string>();
	const sampleTracks: Track[] = [];

	for (const t of tastes) {
		t.artists.forEach((a, i) => bump(artists, a, t.artists.length - i));
		for (const g of t.genres) bump(genres, g, 1);
		for (const track of t.tracks) {
			const key = `${track.artist}|${track.title}`.toLowerCase();
			if (seen.has(key)) continue;
			seen.add(key);
			sampleTracks.push(track);
		}
	}

	return {
		providers: tastes.map((t) => t.provider),
		topArtists: top(artists, limit),
		topGenres: top(genres, limit),
		sampleTracks: sampleTracks.slice(0, trackLimit),
		playlists: tastes.flatMap((t) => t.playlists.map((name) => ({ provider: t.provider, name }))),
	};
}
