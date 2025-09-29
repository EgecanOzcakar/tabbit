export type SpotifyTokens = {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
};
declare global {
    namespace Express {
        interface SessionData {
            spotify?: SpotifyTokens;
        }
    }
}
export {};
//# sourceMappingURL=types.d.ts.map