"use client";

import { signOut } from "next-auth/react";

/**
 * Federated Logout:
 * 1. Destroys the local Next.js session (cookie)
 * 2. Redirects to the Authentik invalidation flow (platform-provider-logout),
 *    which destroys the SSO session and redirects back to /
 *
 * Note: we call the flow URL directly rather than the OIDC end-session endpoint
 * to avoid id_token_hint issuer validation issues when the token was issued
 * with an internal Docker hostname in the `iss` claim.
 */
export async function fullLogout() {
    localStorage.removeItem("user_provisioned");
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
