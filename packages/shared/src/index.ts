export const NATROCOS_DATA_ROOT = "/NatrocOS" as const;

export const API_ROUTES = {
  systemSummary: "/api/system/summary",
  apps: "/api/apps",
  appAction: "/api/apps/:id/:action",
  store: "/api/store",
  storeInstall: "/api/store/:id/install",
  setupStatus: "/api/setup/status",
  setupOwner: "/api/setup/owner",
  authLogin: "/api/auth/login",
  authRefresh: "/api/auth/refresh",
  authLogout: "/api/auth/logout",
  currentUser: "/api/users/me",
  storageDisks: "/api/storage/disks",
  storageMounts: "/api/storage/mounts",
  storagePools: "/api/storage/pools",
} as const;

export type Language = "id" | "en";
export type AppStatus = "running" | "stopped" | "updating" | "error";
export type MetricKey = "cpu" | "memory" | "storage" | "network";
export type AppInstanceId = string;
export type StoreAppId = string;
export type AppAction = "open" | "restart" | "start" | "stop";
export type UserRole = "owner" | "admin" | "user";

export type ApiRouteName = keyof typeof API_ROUTES;

export type SystemMetricDto = {
  key: MetricKey;
  value: string;
  series: number[];
};

export type AppInstanceDto = {
  id: AppInstanceId;
  name: string;
  status: AppStatus;
  image: string;
  ports: string[];
  cpu: number;
  memory: string;
  updatedAt: string;
};

export type StoreAppDto = {
  id: StoreAppId;
  name: string;
  category: string;
  description: string;
  image: string;
  tags: string[];
  recommended: boolean;
};

export type StoragePoolDto = {
  id: string;
  label: string;
  mountPath: string;
  used: string;
  total: string;
};

export type SystemSummaryDto = {
  nodeName: string;
  uptime: string;
  dataRoot: string;
  metrics: SystemMetricDto[];
  apps: AppInstanceDto[];
  storagePools: StoragePoolDto[];
};

export type AppActionRequestDto = {
  action: AppAction;
};

export type AppActionResponseDto = {
  app: AppInstanceDto;
  apps: AppInstanceDto[];
};

export type StoreInstallRequestDto = {
  appId: StoreAppId;
};

export type StoreInstallResponseDto = {
  appId: StoreAppId;
  status: "queued";
};

export type SetupStatusDto = {
  hasOwner: boolean;
  requiresSetup: boolean;
};

export type CreateOwnerRequestDto = {
  username: string;
  password: string;
  displayName: string;
};

export type LoginRequestDto = {
  username: string;
  password: string;
};

export type UserSessionDto = {
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
  accessToken: string;
  expiresAt: string;
};

export type RefreshSessionResponseDto = {
  accessToken: string;
  expiresAt: string;
};

export type CurrentUserDto = {
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
};
