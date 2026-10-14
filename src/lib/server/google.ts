import { createHash, randomBytes } from 'node:crypto';
import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';
import type { GoogleProfile } from './auth';

const STATE_COOKIE = 'oauth_state';
const VERIFIER_COOKIE = 'oauth_verifier';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

export function googleRedirectUri(origin: string) {
	return `${origin}/login/google/callback`;
}

export function googleConfigured() {
	return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && allowedEmails().size);
}

export function allowedEmails() {
	return new Set(
		(env.ALLOWED_EMAILS ?? '')
			.split(/[\s,]+/)
			.map((email) => email.trim().toLowerCase())
			.filter(Boolean)
	);
}

export function isAllowedEmail(email: string) {
	return allowedEmails().has(email.toLowerCase());
}

function oauthCookie(secure: boolean) {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax' as const,
		secure,
		maxAge: 10 * 60
	};
}

export function beginGoogleAuth(cookies: Cookies, origin: string, secure: boolean) {
	const clientId = env.GOOGLE_CLIENT_ID;
	if (!clientId || !env.GOOGLE_CLIENT_SECRET) return null;

	const state = randomBytes(32).toString('base64url');
	const verifier = randomBytes(32).toString('base64url');
	const challenge = createHash('sha256').update(verifier).digest('base64url');
	const opts = oauthCookie(secure);
	cookies.set(STATE_COOKIE, state, opts);
	cookies.set(VERIFIER_COOKIE, verifier, opts);

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: googleRedirectUri(origin),
		response_type: 'code',
		scope: 'openid email profile',
		state,
		code_challenge: challenge,
		code_challenge_method: 'S256',
		prompt: 'select_account'
	});
	return `${AUTH_URL}?${params}`;
}

export function takeOAuthCookies(cookies: Cookies) {
	const state = cookies.get(STATE_COOKIE);
	const verifier = cookies.get(VERIFIER_COOKIE);
	cookies.delete(STATE_COOKIE, { path: '/' });
	cookies.delete(VERIFIER_COOKIE, { path: '/' });
	return { state, verifier };
}

export async function fetchGoogleProfile(
	code: string,
	verifier: string,
	origin: string
): Promise<GoogleProfile | null> {
	const clientId = env.GOOGLE_CLIENT_ID;
	const clientSecret = env.GOOGLE_CLIENT_SECRET;
	if (!clientId || !clientSecret) return null;

	const tokenRes = await fetch(TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			code,
			client_id: clientId,
			client_secret: clientSecret,
			redirect_uri: googleRedirectUri(origin),
			grant_type: 'authorization_code',
			code_verifier: verifier
		})
	});
	if (!tokenRes.ok) return null;
	const token = (await tokenRes.json()) as { access_token?: string };
	if (!token.access_token) return null;

	const infoRes = await fetch(USERINFO_URL, {
		headers: { Authorization: `Bearer ${token.access_token}` }
	});
	if (!infoRes.ok) return null;
	const info = (await infoRes.json()) as {
		sub?: string;
		email?: string;
		email_verified?: boolean;
		name?: string;
		given_name?: string;
	};
	if (!info.sub || !info.email || info.email_verified !== true) return null;
	return {
		sub: info.sub,
		email: info.email.toLowerCase(),
		name: (info.given_name || info.name || 'Athlete').trim()
	};
}
