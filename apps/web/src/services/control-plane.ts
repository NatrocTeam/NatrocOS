import type {
  AppAction,
  AppInstance,
  AppInstanceId,
  CreateOwnerRequestDto,
  CurrentUserDto,
  LoginRequestDto,
  RefreshSessionResponseDto,
  SetupStatusDto,
  StoreApp,
  StoreAppId,
  SystemSummaryDto,
  UserSessionDto,
} from "@/types/natrocos";

export type RunAppActionInput = {
  action: AppAction;
  appId: AppInstanceId;
  apps: AppInstance[];
};

export type ControlPlaneClient = {
  createOwner(request: CreateOwnerRequestDto): Promise<UserSessionDto>;
  currentUser(): Promise<CurrentUserDto>;
  getSetupStatus(): Promise<SetupStatusDto>;
  getSystemSummary(): Promise<SystemSummaryDto>;
  listStoreApps(): Promise<StoreApp[]>;
  login(request: LoginRequestDto): Promise<UserSessionDto>;
  logout(): Promise<void>;
  refreshSession(): Promise<RefreshSessionResponseDto>;
  refreshAppTelemetry(apps: AppInstance[]): Promise<AppInstance[]>;
  runAppAction(input: RunAppActionInput): Promise<AppInstance[]>;
  enqueueStoreInstall(appId: StoreAppId): Promise<StoreAppId>;
};
