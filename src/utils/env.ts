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
	SPOTIFY_CLIENT_ID: z.string().min(1),
	SPOTIFY_CLIENT_SECRET: z.string().min(1),
	SPOTIFY_REDIRECT_URI: z.url(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
	console.error("Invalid environment variables:", z.flattenError(parsed.error).fieldErrors);
	process.exit(1);
}

export const env = parsed.data;
