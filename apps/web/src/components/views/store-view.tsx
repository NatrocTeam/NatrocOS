import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2,
  CircleDot,
  Cloud,
  ListChecks,
  Package,
  RefreshCw,
  Search,
  Terminal,
  TriangleAlert,
} from "lucide-react";

import {
  ActionButton,
  Surface,
  ViewHeader,
} from "@/components/natrocos-primitives";
import { itemVariants, listVariants } from "@/components/natrocos-motion";
import { dictionary } from "@/i18n/dictionary";
import type {
  Language,
  StoreApp,
  StoreAppId,
  StoreInstallJobDto,
  StoreInstallJobStatus,
} from "@/types/natrocos";

export function StoreView({
  apps,
  deployingJobId,
  installingAppId,
  isProcessingQueue,
  isQueueRefreshing,
  language,
  query,
  queue,
  setQuery,
  onDeployDryRun,
  onInstallApp,
  onProcessQueue,
  onRefreshQueue,
}: {
  apps: StoreApp[];
  deployingJobId: string | null;
  installingAppId: StoreAppId | null;
  isProcessingQueue: boolean;
  isQueueRefreshing: boolean;
  language: Language;
  query: string;
  queue: StoreInstallJobDto[];
  setQuery: (query: string) => void;
  onDeployDryRun: (jobId: string) => void;
  onInstallApp: (id: StoreAppId) => void;
  onProcessQueue: () => void;
  onRefreshQueue: () => void;
}) {
  const t = dictionary[language];

  return (
    <div className="space-y-8">
      <ViewHeader
        copy={t.store.catalogCopy}
        eyebrow={t.store.catalogEyebrow}
        title={t.navigation.store}
      />
      <Surface>
        <div className="rounded-[7px] bg-[#fbfcf8] p-3 dark:bg-[#1b1f18]">
          <label className="flex items-center gap-3 rounded-lg bg-[#eef0e9] px-4 py-3 text-sm ring-1 ring-[#20241f]/6 dark:bg-white/5 dark:ring-white/10">
            <Search size={17} strokeWidth={1.5} />
            <span className="sr-only">{t.store.search}</span>
            <input
              className="w-full bg-transparent text-[#20241f] outline-none placeholder:text-[#7c8277] dark:text-[#f2f4ec]"
              placeholder={t.store.search}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
      </Surface>

      <QueuePanel
        deployingJobId={deployingJobId}
        isProcessingQueue={isProcessingQueue}
        isQueueRefreshing={isQueueRefreshing}
        language={language}
        queue={queue}
        onDeployDryRun={onDeployDryRun}
        onProcessQueue={onProcessQueue}
        onRefreshQueue={onRefreshQueue}
      />

      <AnimatePresence mode="popLayout">
        {apps.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <EmptyState language={language} />
          </motion.div>
        ) : (
          <motion.div
            key="store-grid"
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-4 xl:grid-cols-[1.12fr_0.88fr]"
          >
            {apps.map((app, index) => (
              <motion.div
                key={app.id}
                layout
                variants={itemVariants}
                className={index === 0 ? "xl:row-span-2" : ""}
              >
                <StoreCard
                  app={app}
                  installingAppId={installingAppId}
                  language={language}
                  onInstallApp={onInstallApp}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function QueuePanel({
  deployingJobId,
  isProcessingQueue,
  isQueueRefreshing,
  language,
  queue,
  onDeployDryRun,
  onProcessQueue,
  onRefreshQueue,
}: {
  deployingJobId: string | null;
  isProcessingQueue: boolean;
  isQueueRefreshing: boolean;
  language: Language;
  queue: StoreInstallJobDto[];
  onDeployDryRun: (jobId: string) => void;
  onProcessQueue: () => void;
  onRefreshQueue: () => void;
}) {
  const t = dictionary[language];
  const queuedCount = queue.filter((job) => job.status === "queued").length;

  return (
    <Surface>
      <div className="rounded-[7px] bg-[#fbfcf8] p-4 dark:bg-[#1b1f18] sm:p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#eef0e9] ring-1 ring-[#20241f]/8 dark:bg-white/5 dark:ring-white/10">
              <ListChecks size={18} strokeWidth={1.5} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold tracking-tight">
                {t.store.queue.title}
              </p>
              <p className="mt-1 max-w-[58ch] text-sm leading-relaxed text-[#62685e] dark:text-[#aeb5a6]">
                {t.store.queue.copy}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <ActionButton
              disabled={isQueueRefreshing || isProcessingQueue}
              icon={RefreshCw}
              isBusy={isQueueRefreshing}
              label={
                isQueueRefreshing ? t.common.refreshing : t.store.queue.refresh
              }
              variant="quiet"
              onClick={onRefreshQueue}
            />
            <ActionButton
              disabled={
                queuedCount === 0 || isProcessingQueue || isQueueRefreshing
              }
              icon={CircleDot}
              isBusy={isProcessingQueue}
              label={
                isProcessingQueue
                  ? t.store.queue.processing
                  : t.store.queue.process
              }
              onClick={onProcessQueue}
            />
          </div>
        </div>

        {queue.length === 0 ? (
          <div className="mt-5 rounded-lg bg-[#eef0e9] p-4 text-sm text-[#62685e] ring-1 ring-[#20241f]/6 dark:bg-white/5 dark:text-[#aeb5a6] dark:ring-white/10">
            {t.store.queue.empty}
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {queue.map((job) => (
              <QueueJobRow
                key={job.jobId}
                deployingJobId={deployingJobId}
                job={job}
                language={language}
                onDeployDryRun={onDeployDryRun}
              />
            ))}
          </div>
        )}
      </div>
    </Surface>
  );
}

function QueueJobRow({
  deployingJobId,
  job,
  language,
  onDeployDryRun,
}: {
  deployingJobId: string | null;
  job: StoreInstallJobDto;
  language: Language;
  onDeployDryRun: (jobId: string) => void;
}) {
  const t = dictionary[language];
  const isDeploying = deployingJobId === job.jobId;
  const deployDisabled = Boolean(deployingJobId) || job.status === "failed";

  return (
    <div className="grid gap-4 rounded-lg bg-[#eef0e9] p-4 ring-1 ring-[#20241f]/6 dark:bg-white/5 dark:ring-white/10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <QueueStatusPill language={language} status={job.status} />
          <span className="truncate font-mono text-xs text-[#6d7368] dark:text-[#aeb5a6]">
            {job.jobId}
          </span>
        </div>
        <h3 className="mt-3 text-lg font-semibold tracking-tight">
          {job.app.name || job.app.id}
        </h3>
        <div className="mt-3 grid gap-2 text-xs text-[#62685e] dark:text-[#aeb5a6] md:grid-cols-2">
          <p className="min-w-0 truncate font-mono">
            {job.plan.image || job.app.image}
          </p>
          <p className="min-w-0 truncate font-mono">
            {job.plan.composePath || t.common.notConfigured}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#737a70] dark:text-[#aeb5a6]">
          <span>{formatJobTime(job.queuedAt, language)}</span>
          <span>{job.plan.dataPath}</span>
        </div>
        {job.error && (
          <p className="mt-3 flex items-start gap-2 text-sm text-[#9a4d48] dark:text-[#f2b6b0]">
            <TriangleAlert
              className="mt-0.5 shrink-0"
              size={15}
              strokeWidth={1.5}
            />
            <span>{job.error}</span>
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2 lg:justify-end">
        <ActionButton
          disabled={deployDisabled}
          icon={Terminal}
          isBusy={isDeploying}
          label={
            isDeploying
              ? t.store.queue.deployingDryRun
              : t.store.queue.deployDryRun
          }
          variant="quiet"
          onClick={() => onDeployDryRun(job.jobId)}
        />
      </div>
    </div>
  );
}

function QueueStatusPill({
  language,
  status,
}: {
  language: Language;
  status: StoreInstallJobStatus;
}) {
  const t = dictionary[language];
  const statusClass = {
    queued:
      "bg-[#7a6a2a]/10 text-[#77621f] ring-[#7a6a2a]/18 dark:text-[#ecd98e]",
    ready:
      "bg-[#2f7d59]/10 text-[#2f7d59] ring-[#2f7d59]/18 dark:text-[#96ddb8]",
    failed:
      "bg-[#a9544f]/10 text-[#8f4540] ring-[#a9544f]/18 dark:text-[#f2b6b0]",
    deployed:
      "bg-[#315f79]/10 text-[#315f79] ring-[#315f79]/18 dark:text-[#9ed0ec]",
  } satisfies Record<StoreInstallJobStatus, string>;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusClass[status]}`}
    >
      {status === "ready" || status === "deployed" ? (
        <CheckCircle2 size={13} strokeWidth={1.5} />
      ) : status === "failed" ? (
        <TriangleAlert size={13} strokeWidth={1.5} />
      ) : (
        <CircleDot size={13} strokeWidth={1.5} />
      )}
      {t.store.queue.status[status]}
    </span>
  );
}

function formatJobTime(value: string, language: Language) {
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(time);
}

function StoreCard({
  app,
  installingAppId,
  language,
  onInstallApp,
}: {
  app: StoreApp;
  installingAppId: StoreAppId | null;
  language: Language;
  onInstallApp: (id: StoreAppId) => void;
}) {
  const t = dictionary[language];
  const isInstalling = installingAppId === app.id;

  return (
    <Surface>
      <div className="flex h-full flex-col rounded-[7px] bg-[#fbfcf8] p-5 dark:bg-[#1b1f18] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#2f7d59]/10 px-2.5 py-1 text-xs font-medium text-[#2f7d59] ring-1 ring-[#2f7d59]/15">
                {app.category || t.common.notConfigured}
              </span>
              {app.recommended && (
                <span className="rounded-full bg-[#20241f]/5 px-2.5 py-1 text-xs font-medium ring-1 ring-[#20241f]/8 dark:bg-white/5 dark:ring-white/10">
                  {t.common.recommended}
                </span>
              )}
            </div>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight">
              {app.name}
            </h2>
            <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-[#62685e] dark:text-[#aeb5a6]">
              {app.description}
            </p>
          </div>
          <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-[#eef0e9] ring-1 ring-[#20241f]/8 dark:bg-white/5 dark:ring-white/10">
            <Cloud size={20} strokeWidth={1.5} />
          </span>
        </div>

        <div className="mt-8 rounded-lg bg-[#eef0e9] p-4 ring-1 ring-[#20241f]/6 dark:bg-white/5 dark:ring-white/10">
          <p className="font-mono text-xs text-[#6d7368] dark:text-[#aeb5a6]">
            {app.image}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {app.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-white px-2 py-1 text-[11px] text-[#586052] ring-1 ring-[#20241f]/8 dark:bg-[#151813] dark:text-[#aeb5a6] dark:ring-white/10"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-1 items-end">
          <ActionButton
            disabled={Boolean(installingAppId)}
            icon={Package}
            isBusy={isInstalling}
            label={isInstalling ? t.store.installing : t.common.install}
            onClick={() => onInstallApp(app.id)}
          />
        </div>
      </div>
    </Surface>
  );
}

function EmptyState({ language }: { language: Language }) {
  const t = dictionary[language];

  return (
    <Surface>
      <div className="grid min-h-[280px] place-items-center rounded-[7px] bg-[#fbfcf8] p-8 text-center dark:bg-[#1b1f18]">
        <div>
          <span className="mx-auto grid size-12 place-items-center rounded-lg bg-[#eef0e9] ring-1 ring-[#20241f]/8 dark:bg-white/5 dark:ring-white/10">
            <Search size={20} strokeWidth={1.5} />
          </span>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight">
            {t.store.emptyTitle}
          </h2>
          <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-[#62685e] dark:text-[#aeb5a6]">
            {t.store.emptyCopy}
          </p>
        </div>
      </div>
    </Surface>
  );
}
