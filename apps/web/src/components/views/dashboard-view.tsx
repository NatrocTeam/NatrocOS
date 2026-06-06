import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  HardDrive,
  Package,
  Power,
  RefreshCw,
  Server,
  ShieldCheck,
} from "lucide-react";

import {
  PoolStat,
  SkeletonMetrics,
  Sparkline,
  StatusPill,
  Surface,
  ViewHeader,
} from "@/components/natrocos-primitives";
import { itemVariants, listVariants } from "@/components/natrocos-motion";
import { quickActions } from "@/data/ui";
import { dictionary } from "@/i18n/dictionary";
import type {
  AppInstance,
  DashboardAction,
  Language,
  MetricKey,
  StoragePoolDto,
  SystemMetricDto,
} from "@/types/natrocos";

const metricIcons = {
  cpu: Activity,
  memory: Server,
  network: Activity,
  storage: HardDrive,
} satisfies Record<MetricKey, typeof Activity>;

export function DashboardView({
  apps,
  isRefreshing,
  language,
  metrics,
  nodeName,
  onDashboardAction,
  onRefresh,
  storagePools,
  uptime,
}: {
  apps: AppInstance[];
  isRefreshing: boolean;
  language: Language;
  metrics: SystemMetricDto[];
  nodeName: string;
  onDashboardAction: (action: DashboardAction) => void;
  onRefresh: () => void;
  storagePools: StoragePoolDto[];
  uptime: string;
}) {
  const t = dictionary[language];
  const runningApps = apps.filter((app) => app.status === "running");
  const hasWarnings = apps.some((app) => app.status === "updating");
  const primaryPool = storagePools[0];
  const storagePercent = primaryPool
    ? calculateUsagePercent(primaryPool.used, primaryPool.total)
    : 0;

  return (
    <div className="space-y-8">
      <ViewHeader
        action={
          <button
            className="group inline-flex items-center gap-3 rounded-full bg-[#20241f] px-4 py-2.5 text-sm font-medium text-[#f7f8f4] shadow-[0_18px_35px_-24px_rgba(32,36,31,0.7)] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 active:scale-[0.98] dark:bg-[#f2f4ec] dark:text-[#20241f]"
            onClick={onRefresh}
            type="button"
          >
            <RefreshCw
              className={isRefreshing ? "animate-spin" : ""}
              size={16}
              strokeWidth={1.5}
            />
            <span>{isRefreshing ? t.common.refreshing : t.common.sync}</span>
          </button>
        }
        copy={t.dashboard.overviewCopy}
        eyebrow={t.common.eyebrow}
        title={t.dashboard.overview}
      />

      <motion.div
        variants={listVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]"
      >
        <motion.div variants={itemVariants}>
          <Surface>
            <div className="rounded-[7px] bg-[#fbfcf8] p-4 dark:bg-[#1b1f18] sm:p-6">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                <div>
                  <div className="flex items-center gap-2 text-sm text-[#586052] dark:text-[#aeb5a6]">
                    <span
                      className={`size-2 rounded-full ${hasWarnings ? "bg-[#b88936]" : "bg-[#2f7d59]"}`}
                    />
                    <span>
                      {hasWarnings
                        ? t.dashboard.warning
                        : t.dashboard.allSystems}
                    </span>
                  </div>
                  <h2 className="mt-5 max-w-[620px] text-3xl font-semibold tracking-tight md:text-5xl">
                    {runningApps.length} {t.dashboard.liveAppsOnNode}
                  </h2>
                  {nodeName && (
                    <p className="mt-3 font-mono text-sm text-[#6d7368] dark:text-[#aeb5a6]">
                      {nodeName}
                    </p>
                  )}
                </div>
                <div className="rounded-lg bg-[#20241f] p-3 text-[#eff2e8] shadow-[0_20px_45px_-28px_rgba(32,36,31,0.9)] dark:bg-[#eff2e8] dark:text-[#20241f]">
                  <Server size={22} strokeWidth={1.5} />
                  <p className="mt-8 font-mono text-2xl">
                    {uptime || t.common.notConfigured}
                  </p>
                  <p className="mt-1 text-xs opacity-70">{t.common.uptime}</p>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {isRefreshing ? (
                  <SkeletonMetrics key="skeleton" />
                ) : (
                  <motion.div
                    key="metrics"
                    variants={listVariants}
                    initial="hidden"
                    animate="show"
                    className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
                  >
                    {metrics.map((metric) => {
                      const Icon = metricIcons[metric.key];

                      return (
                        <motion.div
                          key={metric.key}
                          layout
                          variants={itemVariants}
                          className="rounded-lg bg-[#f0f2eb] p-4 ring-1 ring-[#20241f]/6 dark:bg-white/5 dark:ring-white/8"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <Icon size={18} strokeWidth={1.5} />
                            <Sparkline values={metric.series} />
                          </div>
                          <p className="mt-5 font-mono text-2xl tracking-tight">
                            {metric.value}
                          </p>
                          <p className="mt-1 text-sm font-medium">
                            {t.dashboard.metrics[metric.key].label}
                          </p>
                          <p className="mt-1 text-xs text-[#6d7368] dark:text-[#aeb5a6]">
                            {t.dashboard.metrics[metric.key].detail}
                          </p>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Surface>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Surface>
            <div className="rounded-[7px] bg-[#20241f] p-4 text-[#eff2e8] dark:bg-[#eff2e8] dark:text-[#20241f] sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-70">
                    {t.dashboard.storagePool}
                  </p>
                  <p className="mt-2 font-mono text-4xl tracking-tight">
                    {primaryPool?.used ?? t.common.notConfigured}
                  </p>
                </div>
                <HardDrive size={28} strokeWidth={1.5} />
              </div>
              <div className="mt-8 h-2 overflow-hidden rounded-full bg-white/12 dark:bg-[#20241f]/10">
                <motion.div
                  animate={{ x: ["-8%", "4%", "-8%"] }}
                  transition={{
                    duration: 5.5,
                    repeat: Infinity,
                    repeatType: "mirror",
                  }}
                  className="h-full rounded-full bg-[#77a984]"
                  style={{ width: `${storagePercent}%` }}
                />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <PoolStat
                  label={primaryPool?.mountPath ?? "/NatrocOS"}
                  value={primaryPool?.total ?? t.common.notConfigured}
                />
                <PoolStat
                  label={t.dashboard.storageUsed}
                  value={
                    storagePercent > 0
                      ? `${storagePercent.toFixed(1)}%`
                      : t.common.notConfigured
                  }
                />
              </div>
            </div>
          </Surface>
        </motion.div>
      </motion.div>

      <QuickActionsPanel
        language={language}
        onDashboardAction={onDashboardAction}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.72fr_1.28fr]">
        <LiveStreamPanel apps={apps} language={language} />
        <AppsPanel apps={apps.slice(0, 3)} language={language} />
      </div>
    </div>
  );
}

function QuickActionsPanel({
  language,
  onDashboardAction,
}: {
  language: Language;
  onDashboardAction: (action: DashboardAction) => void;
}) {
  const t = dictionary[language];

  return (
    <Surface>
      <div className="rounded-[7px] bg-[#fbfcf8] p-4 dark:bg-[#1b1f18] sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-[#6d7368] dark:text-[#aeb5a6]">
              {t.dashboard.quickActions.eyebrow}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              {t.dashboard.quickActions.title}
            </h2>
          </div>
          <Power size={20} strokeWidth={1.5} />
        </div>

        <motion.div
          variants={listVariants}
          initial="hidden"
          animate="show"
          className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4"
        >
          {quickActions.map((action) => {
            const actionCopy = t.dashboard.quickActions.items[action.id];

            return (
              <motion.button
                key={action.id}
                variants={itemVariants}
                className="group flex min-h-32 items-start gap-4 rounded-lg bg-[#eef0e9] p-4 text-left ring-1 ring-[#20241f]/6 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-[#e8ece3] active:scale-[0.98] dark:bg-white/5 dark:ring-white/8 dark:hover:bg-white/8"
                onClick={() => onDashboardAction(action.id)}
                type="button"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-[#20241f] ring-1 ring-[#20241f]/8 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-0.5 dark:bg-[#151813] dark:text-[#f2f4ec] dark:ring-white/10">
                  <action.icon size={18} strokeWidth={1.5} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold tracking-tight">
                    {actionCopy.title}
                  </span>
                  <span className="mt-2 block text-xs leading-relaxed text-[#6d7368] dark:text-[#aeb5a6]">
                    {actionCopy.detail}
                  </span>
                </span>
              </motion.button>
            );
          })}
        </motion.div>
      </div>
    </Surface>
  );
}

function LiveStreamPanel({
  apps,
  language,
}: {
  apps: AppInstance[];
  language: Language;
}) {
  const t = dictionary[language];
  const events = [
    {
      icon: ShieldCheck,
      title: t.dashboard.authReady,
      detail: t.dashboard.authDetail,
    },
    {
      icon: HardDrive,
      title: t.dashboard.storageScanned,
      detail: t.dashboard.storageScannedDetail,
    },
    {
      icon: Power,
      title: t.dashboard.containerCheck,
      detail: t.dashboard.containerCheckDetail.replace(
        "{count}",
        String(apps.length),
      ),
    },
  ];

  return (
    <Surface>
      <div className="rounded-[7px] bg-[#fbfcf8] p-5 dark:bg-[#1b1f18] sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">
            {t.dashboard.eventStream}
          </h2>
          <Activity size={18} strokeWidth={1.5} />
        </div>
        <div className="mt-6 space-y-3">
          {events.map((event, index) => (
            <motion.div
              key={event.title}
              animate={{ y: [0, index === 1 ? -2 : 2, 0] }}
              transition={{
                duration: 3.2 + index,
                repeat: Infinity,
                repeatType: "mirror",
              }}
              className="flex items-start gap-3 rounded-lg bg-[#eef0e9] p-3 ring-1 ring-[#20241f]/6 dark:bg-white/5 dark:ring-white/8"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white ring-1 ring-[#20241f]/8 dark:bg-[#151813] dark:ring-white/10">
                <event.icon size={17} strokeWidth={1.5} />
              </span>
              <div>
                <p className="text-sm font-medium">{event.title}</p>
                <p className="mt-1 text-xs text-[#6d7368] dark:text-[#aeb5a6]">
                  {event.detail}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Surface>
  );
}

function AppsPanel({
  apps,
  language,
}: {
  apps: AppInstance[];
  language: Language;
}) {
  const t = dictionary[language];

  return (
    <Surface>
      <div className="rounded-[7px] bg-[#fbfcf8] p-5 dark:bg-[#1b1f18] sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">
            {t.dashboard.runtimeFocus}
          </h2>
          <Package size={18} strokeWidth={1.5} />
        </div>
        <div className="mt-6 divide-y divide-[#20241f]/8 dark:divide-white/10">
          {apps.length === 0 ? (
            <p className="py-4 text-sm text-[#6d7368] dark:text-[#aeb5a6]">
              {t.apps.empty}
            </p>
          ) : (
            apps.map((app) => (
              <div
                key={app.id}
                className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusPill language={language} status={app.status} />
                    <span className="truncate font-mono text-xs text-[#737a70] dark:text-[#aeb5a6]">
                      {app.ports[0] ?? t.common.notConfigured}
                    </span>
                  </div>
                  <p className="mt-2 font-semibold tracking-tight">
                    {app.name}
                  </p>
                </div>
                <p className="font-mono text-sm">{app.memory}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </Surface>
  );
}

function calculateUsagePercent(used: string, total: string) {
  const usedBytes = parseStorageValue(used);
  const totalBytes = parseStorageValue(total);
  if (usedBytes <= 0 || totalBytes <= 0) return 0;
  return Math.min((usedBytes / totalBytes) * 100, 100);
}

function parseStorageValue(value: string) {
  const match = value.match(/^([\d.]+)\s*(B|KB|MB|GB|TB|PB)$/i);
  if (!match) return 0;

  const amount = Number(match[1]);
  const unit = match[2].toUpperCase();
  const multiplier =
    {
      B: 1,
      GB: 1024 ** 3,
      KB: 1024,
      MB: 1024 ** 2,
      PB: 1024 ** 5,
      TB: 1024 ** 4,
    }[unit] ?? 0;

  return amount * multiplier;
}
