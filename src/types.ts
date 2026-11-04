export type SpotifyTokens = {
	accessToken: string;
	refreshToken: string;
	expiresAt: number; // epoch ms
};

declare module "express-session" {
	interface SessionData {
		spotify: SpotifyTokens;
		oauthState: string;
	}
}
