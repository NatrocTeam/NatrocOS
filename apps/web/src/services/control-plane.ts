import type {
  AppAction,
  AppInstance,
  AppInstanceId,
  CreateOwnerRequestDto,
  CreateUserRequestDto,
  CurrentUserDto,
  LoginRequestDto,
  RefreshSessionResponseDto,
  SetupStatusDto,
  StoreApp,
  StoreAppId,
  StoreInstallDeployRequestDto,
  StoreInstallDeployResponseDto,
  StoreInstallJobDto,
  StoreInstallQueueProcessResponseDto,
  StoreInstallResponseDto,
  SystemSummaryDto,
  UserAccountDto,
  UserSessionDto,
} from "@/types/natrocos";

export type RunAppActionInput = {
  action: AppAction;
  appId: AppInstanceId;
  apps: AppInstance[];
};

export type ControlPlaneClient = {
  createOwner(request: CreateOwnerRequestDto): Promise<UserSessionDto>;
  createUser(request: CreateUserRequestDto): Promise<UserAccountDto>;
  currentUser(): Promise<CurrentUserDto>;
  getSetupStatus(): Promise<SetupStatusDto>;
  getSystemSummary(): Promise<SystemSummaryDto>;
  listStoreQueue(): Promise<StoreInstallJobDto[]>;
  listUsers(): Promise<UserAccountDto[]>;
  listStoreApps(): Promise<StoreApp[]>;
  login(request: LoginRequestDto): Promise<UserSessionDto>;
  logout(): Promise<void>;
  refreshSession(): Promise<RefreshSessionResponseDto>;
  refreshAppTelemetry(apps: AppInstance[]): Promise<AppInstance[]>;
  runAppAction(input: RunAppActionInput): Promise<AppInstance[]>;
  enqueueStoreInstall(appId: StoreAppId): Promise<StoreInstallResponseDto>;
  processStoreQueue(): Promise<StoreInstallQueueProcessResponseDto>;
  deployStoreQueueJob(
    jobId: string,
    request: StoreInstallDeployRequestDto,
  ): Promise<StoreInstallDeployResponseDto>;
};
