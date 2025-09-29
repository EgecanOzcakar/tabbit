import type { SpotifyTokens } from "../types";
export declare function refreshSpotifyToken(refreshToken: string): Promise<SpotifyTokens>;
export declare function fetchSpotify<T>(path: string, accessToken: string, init?: RequestInit): Promise<T>;
//# sourceMappingURL=auth.d.ts.map