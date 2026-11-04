import type { Taste } from "../types.js";

// Mock data used when Spotify credentials are missing or MOCK_PROVIDERS=1.
export const spotifyFixture: Taste = {
	provider: "spotify",
	artists: ["Radiohead", "Metallica", "Fleetwood Mac", "Daft Punk", "Nirvana"],
	genres: ["alternative rock", "art rock", "thrash metal", "metal", "soft rock", "french house", "grunge", "alternative rock"],
	tracks: [
		{ title: "Karma Police", artist: "Radiohead" },
		{ title: "Nothing Else Matters", artist: "Metallica" },
		{ title: "Dreams", artist: "Fleetwood Mac" },
		{ title: "Get Lucky", artist: "Daft Punk" },
		{ title: "Come As You Are", artist: "Nirvana" },
	],
	playlists: ["Practice queue", "Sunday mornings"],
};
