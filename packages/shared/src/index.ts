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
  users: "/api/users",
  currentUser: "/api/users/me",
  storageDisks: "/api/storage/disks",
  storageMounts: "/api/storage/mounts",
  storagePools: "/api/storage/pools",
  appManagementInstallQueue: "/api/app-management/install-queue",
  appManagementProcessQueue: "/api/app-management/install-queue/process",
  appManagementDeployJob: "/api/app-management/install-queue/:id/deploy",
} as const;

export const APP_INSTALL_QUEUE_RELATIVE_PATH =
  "app-management/install-queue" as const;

export const STORE_INSTALL_JOB_STATUS = {
  queued: "queued",
  ready: "ready",
  failed: "failed",
  deployed: "deployed",
} as const;

export type Language = "id" | "en";
export type AppStatus = "running" | "stopped" | "updating" | "error";
export type MetricKey = "cpu" | "memory" | "storage" | "network";
export type AppInstanceId = string;
export type StoreAppId = string;
export type AppAction = "open" | "restart" | "start" | "stop";
export type UserRole = "owner" | "user";

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
  jobId: string;
  queuedAt: string;
  status: "queued";
};

export type StoreInstallJobStatus =
  (typeof STORE_INSTALL_JOB_STATUS)[keyof typeof STORE_INSTALL_JOB_STATUS];

export type StoreInstallPlanDto = {
  dataPath: string;
  composePath: string;
  image: string;
  serviceName: string;
  tags: string[];
};

export type StoreInstallJobDto = {
  jobId: string;
  app: StoreAppDto;
  status: StoreInstallJobStatus;
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  plan: StoreInstallPlanDto;
};

export type StoreInstallQueueProcessResponseDto = {
  processed: number;
  ready: number;
  failed: number;
  jobs: StoreInstallJobDto[];
};

export type StoreInstallDeployRequestDto = {
  dryRun: boolean;
  pull: boolean;
  confirm: boolean;
};

export type StoreInstallDeployResponseDto = {
  job: StoreInstallJobDto;
  dryRun: boolean;
  command: string[];
  output?: string;
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

export type CreateUserRequestDto = {
  username: string;
  password: string;
  displayName: string;
};

export type LoginRequestDto = {
  username: string;
  password: string;
};

export type UserAccountDto = {
  userId: string;
  username: string;
  displayName: string;
  role: UserRole;
  createdAt?: string;
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
