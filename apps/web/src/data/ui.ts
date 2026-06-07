import {
  Activity,
  Archive,
  Database,
  Download,
  HardDrive,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";

import type { AppStatus, NavItem, QuickAction } from "@/types/natrocos";

export const navItems: NavItem[] = [
  { view: "dashboard", icon: Activity },
  { view: "apps", icon: Package },
  { view: "storage", icon: HardDrive },
  { view: "store", icon: ShoppingBag },
  { view: "settings", icon: Settings },
];

export const quickActions: QuickAction[] = [
  { id: "scanStorage", icon: HardDrive, tone: "success" },
  { id: "checkBackups", icon: Archive, tone: "warning" },
  { id: "exportDiagnostics", icon: Download, tone: "info" },
  { id: "openStore", icon: ShoppingBag, tone: "info" },
];

export const loginHighlights = [
  { id: "dataRoot", icon: HardDrive, value: "/NatrocOS" },
  { id: "webPort", icon: Activity, value: ":80" },
  { id: "runtime", icon: Package, value: "Docker" },
  { id: "passwordHash", icon: ShieldCheck, value: "PBKDF2" },
] as const;

export const statusStyles: Record<AppStatus, string> = {
  running: "bg-[#2f7d59]",
  stopped: "bg-[#858a7f]",
  updating: "bg-[#b88936]",
  error: "bg-[#a9544f]",
};

export const settingsPreferenceIcons = {
  backup: Database,
  node: Package,
  security: ShieldCheck,
} as const;
