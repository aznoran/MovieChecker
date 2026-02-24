import { UserManager, WebStorageStateStore, type UserManagerSettings } from "oidc-client-ts";

const AUTHENTIK_URL = process.env.NEXT_PUBLIC_AUTHENTIK_URL || "http://localhost:9000";
const CLIENT_ID = process.env.NEXT_PUBLIC_AUTHENTIK_CLIENT_ID || "moviechecker";

function getRedirectUri(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/callback`;
}

function getPostLogoutRedirectUri(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/login`;
}

export function createUserManager(): UserManager {
  const settings: UserManagerSettings = {
    authority: `${AUTHENTIK_URL}/application/o/moviechecker/`,
    client_id: CLIENT_ID,
    redirect_uri: getRedirectUri(),
    post_logout_redirect_uri: getPostLogoutRedirectUri(),
    response_type: "code",
    scope: "openid profile email",
    automaticSilentRenew: true,
    userStore: new WebStorageStateStore({ store: window.localStorage }),
  };

  return new UserManager(settings);
}

let _userManager: UserManager | null = null;

export function getUserManager(): UserManager {
  if (!_userManager) {
    _userManager = createUserManager();
  }
  return _userManager;
}
