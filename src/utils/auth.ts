import { randomBytes, timingSafeEqual } from "node:crypto";
import type { Request } from "express";

/** Upstream provider failure, mapped to the status we return to our client. */
export class ProviderError extends Error {
	constructor(
		message: string,
		public status: number,
		public retryAfter?: string,
		public reauth = false,
	) {
		super(message);
	}
}

/** Maps an upstream HTTP status: 401 -> re-auth, 429 -> pass through, 5xx -> 502, other 4xx as-is. */
export function errorFor(status: number, what: string, retryAfter?: string | null, reauth = status === 401) {
	const msg = `${what} failed: upstream responded ${status}`;
	if (reauth) return new ProviderError(msg, 401, undefined, true);
	if (status === 429) return new ProviderError(msg, 429, retryAfter ?? undefined);
	return new ProviderError(msg, status >= 500 ? 502 : status);
}

/** fetch that turns network failures into a 502 ProviderError. */
export async function safeFetch(url: string, init: RequestInit, what: string): Promise<Response> {
	try {
		return await fetch(url, init);
	} catch (err) {
		throw new ProviderError(`${what} failed: could not reach upstream (${(err as Error).message})`, 502);
	}
}

export function newOAuthState(): string {
	return randomBytes(16).toString("base64url");
}

export function isValidState(expected: unknown, received: unknown): boolean {
	if (typeof expected !== "string" || typeof received !== "string" || !expected) return false;
	const a = Buffer.from(expected);
	const b = Buffer.from(received);
	return a.length === b.length && timingSafeEqual(a, b);
}

/** New session id (prevents fixation) while keeping already-connected providers. */
export async function rotateSession(req: Request): Promise<void> {
	const { spotify, deezer } = req.session;
	await new Promise<void>((resolve, reject) => req.session.regenerate((err) => (err ? reject(err) : resolve())));
	if (spotify) req.session.spotify = spotify;
	if (deezer) req.session.deezer = deezer;
}
