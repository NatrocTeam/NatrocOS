import { API_ROUTES } from "@natrocos/shared";

import type {
  AppActionRequestDto,
  AppActionResponseDto,
  AppInstance,
  CurrentUserDto,
  RefreshSessionResponseDto,
  SetupStatusDto,
  StoreApp,
  StoreInstallResponseDto,
  SystemSummaryDto,
  UserSessionDto,
} from "@/types/natrocos";
import type { ControlPlaneClient } from "@/services/control-plane";

function resolveRoute(route: string, params: Record<string, string>): string {
  return Object.entries(params).reduce((resolvedRoute, [key, value]) => {
    return resolvedRoute.replace(`:${key}`, encodeURIComponent(value));
  }, route);
}

async function readJSON<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`NatrocOS API request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export function createHttpControlPlaneClient(
  baseURL = "",
  getAccessToken: () => string | null = () => null,
): ControlPlaneClient {
  function endpoint(route: string) {
    return `${baseURL}${route}`;
  }

  function headers(extraHeaders?: HeadersInit): HeadersInit {
    const token = getAccessToken();
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    };
  }

  return {
    async createOwner(request) {
      return readJSON<UserSessionDto>(
        await fetch(endpoint(API_ROUTES.setupOwner), {
          body: JSON.stringify(request),
          headers: headers({ "Content-Type": "application/json" }),
          method: "POST",
        }),
      );
    },

    async currentUser() {
      return readJSON<CurrentUserDto>(
        await fetch(endpoint(API_ROUTES.currentUser), {
          headers: headers(),
        }),
      );
    },

    async getSetupStatus() {
      return readJSON<SetupStatusDto>(
        await fetch(endpoint(API_ROUTES.setupStatus)),
      );
    },

    async getSystemSummary() {
      return readJSON<SystemSummaryDto>(
        await fetch(endpoint(API_ROUTES.systemSummary), {
          headers: headers(),
        }),
      );
    },

    async listStoreApps() {
      return readJSON<StoreApp[]>(
        await fetch(endpoint(API_ROUTES.store), {
          headers: headers(),
        }),
      );
    },

    async login(request) {
      return readJSON<UserSessionDto>(
        await fetch(endpoint(API_ROUTES.authLogin), {
          body: JSON.stringify(request),
          headers: headers({ "Content-Type": "application/json" }),
          method: "POST",
        }),
      );
    },

    async logout() {
      const response = await fetch(endpoint(API_ROUTES.authLogout), {
        headers: headers(),
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`NatrocOS API request failed with ${response.status}`);
      }
    },

    async refreshSession() {
      return readJSON<RefreshSessionResponseDto>(
        await fetch(endpoint(API_ROUTES.authRefresh), {
          headers: headers(),
          method: "POST",
        }),
      );
    },

    async refreshAppTelemetry() {
      return readJSON<AppInstance[]>(
        await fetch(endpoint(API_ROUTES.apps), {
          headers: headers(),
        }),
      );
    },

    async runAppAction({ action, appId }) {
      const route = resolveRoute(API_ROUTES.appAction, {
        action,
        id: appId,
      });
      const body = { action } satisfies AppActionRequestDto;
      const payload = await readJSON<AppActionResponseDto>(
        await fetch(endpoint(route), {
          body: JSON.stringify(body),
          headers: headers({ "Content-Type": "application/json" }),
          method: "POST",
        }),
      );

      return payload.apps;
    },

    async enqueueStoreInstall(appId) {
      const route = resolveRoute(API_ROUTES.storeInstall, { id: appId });
      const payload = await readJSON<StoreInstallResponseDto>(
        await fetch(endpoint(route), {
          body: JSON.stringify({ appId }),
          headers: headers({ "Content-Type": "application/json" }),
          method: "POST",
        }),
      );

      return payload.appId;
    },
  };
}
