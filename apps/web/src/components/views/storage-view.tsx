import type { ReactNode } from "react";
import { motion } from "motion/react";
import {
  Database,
  HardDrive,
  RefreshCw,
  Server,
  Usb,
  type LucideIcon,
} from "lucide-react";

import {
  ActionButton,
  Meta,
  Surface,
  ViewHeader,
} from "@/components/natrocos-primitives";
import { itemVariants, listVariants } from "@/components/natrocos-motion";
import { dictionary } from "@/i18n/dictionary";
import type {
  Language,
  StorageDiskDto,
  StorageMountDto,
  StoragePoolDto,
} from "@/types/natrocos";

export function StorageView({
  disks,
  isRefreshing,
  language,
  mounts,
  pools,
  onRefresh,
}: {
  disks: StorageDiskDto[];
  isRefreshing: boolean;
  language: Language;
  mounts: StorageMountDto[];
  pools: StoragePoolDto[];
  onRefresh: () => void;
}) {
  const t = dictionary[language];
  const primaryPool = pools[0];
  const mountedDisks = disks.filter((disk) => disk.mountpoints.length > 0);

  return (
    <div className="space-y-8">
      <ViewHeader
        action={
          <ActionButton
            disabled={isRefreshing}
            icon={RefreshCw}
            isBusy={isRefreshing}
            label={isRefreshing ? t.common.refreshing : t.storage.refresh}
            onClick={onRefresh}
          />
        }
        copy={t.storage.copy}
        eyebrow={t.storage.eyebrow}
        title={t.navigation.storage}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <InventoryStat
          icon={HardDrive}
          label={t.storage.disks}
          value={String(disks.length)}
        />
        <InventoryStat
          icon={Server}
          label={t.storage.mounted}
          value={String(mountedDisks.length)}
        />
        <InventoryStat
          icon={Database}
          label={primaryPool?.mountPath ?? t.common.notConfigured}
          value={
            primaryPool
              ? `${primaryPool.used} / ${primaryPool.total}`
              : t.common.notConfigured
          }
        />
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <InventorySection
          emptyCopy={t.storage.emptyDisks}
          isEmpty={disks.length === 0}
          title={t.storage.diskInventory}
        >
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="grid gap-3"
          >
            {disks.map((disk) => (
              <motion.div key={disk.id} layout variants={itemVariants}>
                <DiskRow disk={disk} language={language} />
              </motion.div>
            ))}
          </motion.div>
        </InventorySection>

        <InventorySection
          emptyCopy={t.storage.emptyMounts}
          isEmpty={mounts.length === 0}
          title={t.storage.mounts}
        >
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="grid gap-3"
          >
            {mounts.map((mount) => (
              <motion.div key={mount.id} layout variants={itemVariants}>
                <MountRow language={language} mount={mount} />
              </motion.div>
            ))}
          </motion.div>
        </InventorySection>
      </section>
    </div>
  );
}

function InventoryStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <Surface>
      <div className="flex min-h-32 items-start justify-between rounded-[7px] bg-[#fbfcf8] p-4 dark:bg-[#1b1f18]">
        <div className="min-w-0">
          <p className="truncate text-sm text-[#6d7368] dark:text-[#aeb5a6]">
            {label}
          </p>
          <p className="mt-4 break-words font-mono text-2xl tracking-tight">
            {value}
          </p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#eef0e9] ring-1 ring-[#20241f]/8 dark:bg-white/5 dark:ring-white/10">
          <Icon size={18} strokeWidth={1.5} />
        </span>
      </div>
    </Surface>
  );
}

function InventorySection({
  children,
  emptyCopy,
  isEmpty,
  title,
}: {
  children: ReactNode;
  emptyCopy: string;
  isEmpty: boolean;
  title: string;
}) {
  return (
    <Surface>
      <div className="rounded-[7px] bg-[#fbfcf8] p-4 dark:bg-[#1b1f18] sm:p-5">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <div className="mt-5">
          {isEmpty ? (
            <div className="rounded-lg bg-[#eef0e9] p-4 text-sm text-[#62685e] ring-1 ring-[#20241f]/6 dark:bg-white/5 dark:text-[#aeb5a6] dark:ring-white/10">
              {emptyCopy}
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </Surface>
  );
}

function DiskRow({
  disk,
  language,
}: {
  disk: StorageDiskDto;
  language: Language;
}) {
  const t = dictionary[language];
  const icon = disk.removable ? Usb : HardDrive;
  const mountpoints =
    disk.mountpoints.length > 0
      ? disk.mountpoints.join(", ")
      : t.common.notConfigured;

  return (
    <div className="rounded-lg bg-[#eef0e9] p-4 ring-1 ring-[#20241f]/6 dark:bg-white/5 dark:ring-white/10">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#20241f]/6 px-2.5 py-1 text-xs font-medium ring-1 ring-[#20241f]/8 dark:bg-white/5 dark:ring-white/10">
              {icon === Usb ? (
                <Usb size={13} strokeWidth={1.5} />
              ) : (
                <HardDrive size={13} strokeWidth={1.5} />
              )}
              {disk.type || t.common.notConfigured}
            </span>
            {disk.filesystem && (
              <span className="rounded-full bg-[#2f7d59]/10 px-2.5 py-1 text-xs font-medium text-[#2f7d59] ring-1 ring-[#2f7d59]/15">
                {disk.filesystem}
              </span>
            )}
          </div>
          <h3 className="mt-3 truncate text-lg font-semibold tracking-tight">
            {disk.name || disk.path}
          </h3>
          <p className="mt-1 truncate font-mono text-xs text-[#6d7368] dark:text-[#aeb5a6]">
            {disk.path}
          </p>
        </div>
        <p className="shrink-0 font-mono text-sm text-[#20241f] dark:text-[#f2f4ec]">
          {formatBytes(disk.size)}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
        <Meta label={t.storage.mountpoints} value={mountpoints} />
        <Meta
          label={t.storage.model}
          value={disk.model || disk.label || t.common.notConfigured}
        />
      </div>
    </div>
  );
}

function MountRow({
  language,
  mount,
}: {
  language: Language;
  mount: StorageMountDto;
}) {
  const t = dictionary[language];

  return (
    <div className="rounded-lg bg-[#eef0e9] p-4 ring-1 ring-[#20241f]/6 dark:bg-white/5 dark:ring-white/10">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#20241f]/6 px-2.5 py-1 text-xs font-medium ring-1 ring-[#20241f]/8 dark:bg-white/5 dark:ring-white/10">
          {mount.filesystem || t.common.notConfigured}
        </span>
        {mount.used && mount.total && (
          <span className="rounded-full bg-[#315f79]/10 px-2.5 py-1 text-xs font-medium text-[#315f79] ring-1 ring-[#315f79]/18 dark:text-[#9ed0ec]">
            {mount.used} / {mount.total}
          </span>
        )}
      </div>
      <h3 className="mt-3 truncate text-lg font-semibold tracking-tight">
        {mount.target}
      </h3>
      <p className="mt-1 truncate font-mono text-xs text-[#6d7368] dark:text-[#aeb5a6]">
        {mount.source}
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
        <Meta
          label={t.storage.options}
          value={mount.options.slice(0, 4).join(", ") || t.common.notConfigured}
        />
        <Meta label={t.storage.mountId} value={mount.id} />
      </div>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}
