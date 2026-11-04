import "dotenv/config";
import { z } from "zod";

export const EnvSchema = z.object({
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
	PORT: z.coerce.number().int().positive().default(3000),
	BASE_URL: z.url().default("http://localhost:3000"),
	// Where to send the browser after login; defaults to this server's `/`.
	APP_URL: z.url().optional(),
	SESSION_SECRET: z.string().min(32),
	REDIS_URL: z.url().optional(),
	// Force every provider onto fixture data, even when credentials are set.
	MOCK_PROVIDERS: z.stringbool().default(false),
	SPOTIFY_CLIENT_ID: z.string().min(1).optional(),
	SPOTIFY_CLIENT_SECRET: z.string().min(1).optional(),
	SPOTIFY_REDIRECT_URI: z.url().optional(),
	DEEZER_APP_ID: z.string().min(1).optional(),
	DEEZER_SECRET: z.string().min(1).optional(),
	DEEZER_REDIRECT_URI: z.url().optional(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
	console.error("Invalid environment variables:", z.flattenError(parsed.error).fieldErrors);
	process.exit(1);
}

export const env = parsed.data;

const pair = (id?: string, secret?: string) => (!env.MOCK_PROVIDERS && id && secret ? { id, secret } : null);

/** Real credentials per provider; null means that provider runs on fixture data. */
export const creds = {
	spotify: pair(env.SPOTIFY_CLIENT_ID, env.SPOTIFY_CLIENT_SECRET),
	deezer: pair(env.DEEZER_APP_ID, env.DEEZER_SECRET),
};

export const redirectUri = (provider: keyof typeof creds) =>
	(provider === "spotify" ? env.SPOTIFY_REDIRECT_URI : env.DEEZER_REDIRECT_URI) ??
	new URL(`/auth/${provider}/callback`, env.BASE_URL).href;
