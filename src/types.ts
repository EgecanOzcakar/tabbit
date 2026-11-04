export type Provider = "spotify" | "deezer";

export type SpotifyTokens = {
	accessToken: string;
	refreshToken: string;
	expiresAt: number; // epoch ms
};

export type DeezerTokens = { accessToken: string };

export type Track = { title: string; artist: string };

/** One provider's view of the user's taste, already normalized. Lists are ranked best-first. */
export type Taste = {
	provider: Provider;
	artists: string[];
	genres: string[]; // raw mentions; repeats count as weight
	tracks: Track[];
	playlists: string[];
};

declare module "express-session" {
	interface SessionData {
		spotify: SpotifyTokens;
		deezer: DeezerTokens;
		oauthState: string;
	}
}
