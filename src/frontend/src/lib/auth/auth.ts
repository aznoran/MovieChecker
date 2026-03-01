import NextAuth, { type DefaultSession } from "next-auth";
import Authentik from "next-auth/providers/authentik";

// ---------- Type augmentation ----------

declare module "next-auth" {
    interface Session {
        accessToken?: string;
        idToken?: string;
        error?: "RefreshTokenError";
        user: {
            id?: string;
            username?: string;
            groups?: string[];
        } & DefaultSession["user"];
    }
}

declare module "@auth/core/jwt" {
    interface JWT {
        accessToken?: string;
        idToken?: string;
        refreshToken?: string;
        expiresAt?: number;
        groups?: string[];
        username?: string;
        error?: "RefreshTokenError";
    }
}

// ---------- Configuration ----------

// AUTH_AUTHENTIK_ISSUER must match the JWT `iss` claim that Authentik generates.
// Authentik sets `iss` from the incoming request's Host header — since the token exchange
// happens server-side (container → authentik-server:9000), `iss` = http://authentik-server:9000/...
const issuer = (process.env.AUTH_AUTHENTIK_ISSUER ?? "").replace(/\/$/, "");
// Base URL for all server-side fetches (token, userinfo, JWKS, refresh, revoke)
const internalBase = issuer.replace(/\/application\/o\/.*$/, "");
// Browser-facing origin for the authorization redirect — must be reachable by the user's browser
const browserOrigin = (process.env.AUTH_AUTHENTIK_BROWSER_ORIGIN ?? "").replace(/\/$/, "") || internalBase;
// App slug (e.g. "moviechecker") extracted from the issuer URL
const appSlug = issuer.match(/\/application\/o\/([^/]+)/)?.[1] ?? "moviechecker";

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Authentik({
            clientId: process.env.AUTH_AUTHENTIK_ID,
            clientSecret: process.env.AUTH_AUTHENTIK_SECRET,
            issuer: process.env.AUTH_AUTHENTIK_ISSUER,
            // Explicit discovery URL (avoids double-slash from trailing slash in issuer)
            wellKnown: `${issuer}/.well-known/openid-configuration`,
            // Authorization redirect must use the browser-accessible origin
            authorization: {
                url: `${browserOrigin}/application/o/authorize/`,
                params: { scope: "openid profile email offline_access" },
            },
            // All server-side endpoints use the internal base URL
            token: `${internalBase}/application/o/token/`,
            userinfo: `${internalBase}/application/o/userinfo/`,
            jwks_endpoint: `${internalBase}/application/o/${appSlug}/jwks/`,
        }),
    ],

    trustHost: true,
    session: { strategy: "jwt" },

    callbacks: {
        async jwt({ token, account, profile }) {
            // Первый логин — сохраняем все токены и провизионируем пользователя
            if (account) {
                token.accessToken = account.access_token;
                token.idToken = account.id_token;
                token.refreshToken = account.refresh_token;
                token.expiresAt = account.expires_at;

                if (profile) {
                    const p = profile as Record<string, unknown>;
                    token.groups = p.groups as string[] | undefined;
                    token.username = p.preferred_username as string | undefined;
                }

                // Провизионируем пользователя в БД (создаём запись + личную группу если новый)
                const apiUrl =
                    process.env.API_URL ||
                    process.env.NEXT_PUBLIC_API_URL ||
                    "http://localhost:5000";
                try {
                    await fetch(`${apiUrl}/api/auth/provision`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${account.access_token}` },
                    });
                } catch {
                    // Non-fatal: provisioning failure will surface as 401 on first API call
                }

                return token;
            }

            // Токен ещё актуален — возвращаем как есть
            if (token.expiresAt && Date.now() < token.expiresAt * 1000) {
                return token;
            }

            // Токен истёк — пробуем обновить
            if (token.refreshToken) {
                return await refreshAccessToken(token);
            }

            return token;
        },

        async session({ session, token }) {
            session.accessToken = token.accessToken;
            session.idToken = token.idToken;
            session.error = token.error;

            if (token.sub) {
                session.user.id = token.sub;
            }

            session.user.username = token.username;
            session.user.groups = token.groups;

            return session;
        },
    },

    events: {
        async signOut(message) {
            // JWT strategy — отзываем refresh token на стороне Authentik (defense in depth)
            if ("token" in message && message.token?.refreshToken) {
                await revokeToken(message.token.refreshToken as string);
            }
        },
    },

    pages: {
        signIn: "/login",
    },
});

// ---------- Token refresh ----------

interface RefreshableToken {
    refreshToken?: string;
    accessToken?: string;
    idToken?: string;
    expiresAt?: number;
    groups?: string[];
    username?: string;
    error?: "RefreshTokenError";
    [key: string]: unknown;
}

async function refreshAccessToken(
    token: RefreshableToken,
): Promise<RefreshableToken> {
    try {
        const baseUrl = (process.env.AUTH_AUTHENTIK_ISSUER ?? "").replace(/\/application\/o\/.*$/, "");
        const tokenUrl = `${baseUrl}/application/o/token/`;

        const response = await fetch(tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                client_id: process.env.AUTH_AUTHENTIK_ID ?? "",
                client_secret: process.env.AUTH_AUTHENTIK_SECRET ?? "",
                refresh_token: token.refreshToken ?? "",
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error ?? "Token refresh failed");
        }

        return {
            ...token,
            accessToken: data.access_token,
            idToken: data.id_token ?? token.idToken,
            refreshToken: data.refresh_token ?? token.refreshToken,
            expiresAt: Math.floor(Date.now() / 1000) + (data.expires_in as number),
            error: undefined,
        };
    } catch {
        return {
            ...token,
            error: "RefreshTokenError",
        };
    }
}

// ---------- Token revocation ----------

async function revokeToken(token: string): Promise<void> {
    try {
        const baseUrl = (process.env.AUTH_AUTHENTIK_ISSUER ?? "").replace(/\/application\/o\/.*$/, "");
        const revokeUrl = `${baseUrl}/application/o/revoke/`;

        await fetch(revokeUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: process.env.AUTH_AUTHENTIK_ID ?? "",
                client_secret: process.env.AUTH_AUTHENTIK_SECRET ?? "",
                token,
                token_type_hint: "refresh_token",
            }),
        });
    } catch {
        // Отзыв токена — best-effort; не блокируем logout при ошибке
    }
}
