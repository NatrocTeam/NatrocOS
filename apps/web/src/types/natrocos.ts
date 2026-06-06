import type { LucideIcon } from "lucide-react";
import type {
  AppAction,
  AppInstanceDto,
  AppInstanceId,
  StoreAppDto,
  SystemMetricDto,
} from "@natrocos/shared";

export type {
  AppAction,
  AppActionRequestDto,
  AppActionResponseDto,
  AppInstanceDto,
  AppInstanceId,
  AppStatus,
  CurrentUserDto,
  CreateOwnerRequestDto,
  Language,
  LoginRequestDto,
  MetricKey,
  RefreshSessionResponseDto,
  SetupStatusDto,
  StoragePoolDto,
  StoreAppDto,
  StoreAppId,
  StoreInstallRequestDto,
  StoreInstallResponseDto,
  SystemMetricDto,
  SystemSummaryDto,
  UserRole,
  UserSessionDto,
} from "@natrocos/shared";

export type Theme = "light" | "dark";
export type View = "dashboard" | "apps" | "store" | "settings";
export type DashboardAction =
  | "scanStorage"
  | "checkBackups"
  | "exportDiagnostics"
  | "openStore";
export type ToastTone = "info" | "success" | "warning";

export type PendingAppAction = {
  appId: AppInstanceId;
  action: AppAction;
};

export type ToastMessage = {
  id: string;
  tone: ToastTone;
  title: string;
  detail: string;
};

export type SystemMetric = SystemMetricDto & {
  icon: LucideIcon;
};

export type AppInstance = AppInstanceDto;

export type StoreApp = StoreAppDto;

export type NavItem = {
  view: View;
  icon: LucideIcon;
};

export type QuickAction = {
  id: DashboardAction;
  icon: LucideIcon;
  tone: ToastTone;
};
