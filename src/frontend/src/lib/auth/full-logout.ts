"use client";

import { signOut } from "next-auth/react";

/**
 * Federated Logout:
 * 1. Уничтожает локальную сессию Next.js (cookie)
 * 2. Редиректит на кастомный invalidation flow Authentik,
 *    который уничтожает сессию IdP и перенаправляет обратно на /
 */
export async function fullLogout() {
    await signOut({ redirect: false });

    const logoutFlowUrl = process.env.NEXT_PUBLIC_AUTHENTIK_LOGOUT_URL;

    if (logoutFlowUrl) {
        const url = new URL(logoutFlowUrl);
        url.searchParams.set("post_logout_redirect_uri", `${window.location.origin}/`);
        window.location.href = url.toString();
    } else {
        window.location.href = "/";
    }
}
