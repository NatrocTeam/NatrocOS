import type { LucideIcon } from "lucide-react";

export type Language = "id" | "en";
export type Theme = "light" | "dark";
export type View = "dashboard" | "apps" | "store" | "settings";
export type AppStatus = "running" | "stopped" | "updating" | "error";
export type MetricKey = "cpu" | "memory" | "storage" | "network";
export type AppInstanceId =
  | "vaultwarden"
  | "immich"
  | "paperless"
  | "syncthing";
export type StoreAppId = "jellyfin" | "actual" | "mealie" | "minio";

export type SystemMetric = {
  key: MetricKey;
  value: string;
  icon: LucideIcon;
  series: number[];
};

export type AppInstance = {
  id: AppInstanceId;
  name: string;
  status: AppStatus;
  image: string;
  ports: string[];
  cpu: number;
  memory: string;
};

export type StoreApp = {
  id: StoreAppId;
  name: string;
  image: string;
  tags: string[];
  recommended: boolean;
};

export type NavItem = {
  view: View;
  icon: LucideIcon;
};
