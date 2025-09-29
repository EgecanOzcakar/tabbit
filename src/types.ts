export type SpotifyTokens = {
	accessToken: string;
	refreshToken: string;
	expiresAt: number; // epoch ms
};

declare global {
	namespace Express {
		interface SessionData {
			spotify?: SpotifyTokens;
		}
	}
}

export {};


