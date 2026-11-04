import type { Taste } from "../types.js";

// Mock data used when Deezer credentials are missing or MOCK_PROVIDERS=1.
export const deezerFixture: Taste = {
	provider: "deezer",
	artists: ["Metallica", "Adele", "The Beatles", "Radiohead"],
	genres: ["Rock", "Pop", "Metal", "Rock"],
	tracks: [
		{ title: "Someone Like You", artist: "Adele" },
		{ title: "Let It Be", artist: "The Beatles" },
		{ title: "Nothing Else Matters", artist: "Metallica" },
		{ title: "Creep", artist: "Radiohead" },
	],
	playlists: ["Favourite tracks", "Road trip"],
};
