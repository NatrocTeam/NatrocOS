import {
  Activity,
  Cpu,
  Database,
  HardDrive,
  Package,
  Settings,
  ShoppingBag,
  Wifi,
} from "lucide-react";

import type {
  AppInstance,
  AppStatus,
  NavItem,
  StoreApp,
  SystemMetric,
} from "@/types/natrocos";

export const navItems: NavItem[] = [
  { view: "dashboard", icon: Activity },
  { view: "apps", icon: Package },
  { view: "store", icon: ShoppingBag },
  { view: "settings", icon: Settings },
];

export const metrics: SystemMetric[] = [
  {
    key: "cpu",
    value: "47.2%",
    icon: Cpu,
    series: [18, 31, 26, 44, 38, 47, 41, 52, 47],
  },
  {
    key: "memory",
    value: "6.8 GB",
    icon: Database,
    series: [38, 35, 42, 51, 48, 44, 50, 46, 49],
  },
  {
    key: "storage",
    value: "2.73 TB",
    icon: HardDrive,
    series: [28, 29, 31, 32, 35, 34, 36, 37, 39],
  },
  {
    key: "network",
    value: "84.6 MB/s",
    icon: Wifi,
    series: [20, 44, 28, 59, 35, 70, 42, 63, 51],
  },
];

export const initialApps: AppInstance[] = [
  {
    id: "vaultwarden",
    name: "Vaultwarden",
    status: "running",
    image: "vaultwarden/server:1.32",
    ports: ["8080:80"],
    cpu: 4.7,
    memory: "318 MB",
  },
  {
    id: "immich",
    name: "Immich",
    status: "updating",
    image: "ghcr.io/immich-app/server:v1.128",
    ports: ["2283:3001"],
    cpu: 18.4,
    memory: "1.42 GB",
  },
  {
    id: "paperless",
    name: "Paperless",
    status: "running",
    image: "ghcr.io/paperless-ngx/paperless-ngx:2.13",
    ports: ["8010:8000"],
    cpu: 7.9,
    memory: "742 MB",
  },
  {
    id: "syncthing",
    name: "Syncthing",
    status: "stopped",
    image: "syncthing/syncthing:1.29",
    ports: ["8384:8384"],
    cpu: 0.3,
    memory: "96 MB",
  },
];

export const storeApps: StoreApp[] = [
  {
    id: "jellyfin",
    name: "Jellyfin",
    image: "jellyfin/jellyfin:10.10",
    tags: ["media", "streaming", "local"],
    recommended: true,
  },
  {
    id: "actual",
    name: "Actual Budget",
    image: "actualbudget/actual-server:25.5",
    tags: ["finance", "sqlite", "private"],
    recommended: false,
  },
  {
    id: "mealie",
    name: "Mealie",
    image: "ghcr.io/mealie-recipes/mealie:v2.8",
    tags: ["recipes", "planning"],
    recommended: false,
  },
  {
    id: "minio",
    name: "MinIO",
    image: "quay.io/minio/minio:RELEASE.2025",
    tags: ["storage", "s3", "backup"],
    recommended: true,
  },
];

export const statusStyles: Record<AppStatus, string> = {
  running: "bg-[#2f7d59]",
  stopped: "bg-[#858a7f]",
  updating: "bg-[#b88936]",
  error: "bg-[#a9544f]",
};
