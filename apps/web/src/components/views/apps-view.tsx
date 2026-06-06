import { motion } from "motion/react";
import { ExternalLink, Play, RefreshCw, Square } from "lucide-react";

import {
  ActionButton,
  Meta,
  StatusPill,
  Surface,
  ViewHeader,
} from "@/components/natrocos-primitives";
import { itemVariants, listVariants } from "@/components/natrocos-motion";
import { dictionary } from "@/i18n/dictionary";
import type {
  AppAction,
  AppInstance,
  AppInstanceId,
  Language,
  PendingAppAction,
} from "@/types/natrocos";

export function AppsView({
  apps,
  language,
  pendingAction,
  onAppAction,
}: {
  apps: AppInstance[];
  language: Language;
  pendingAction: PendingAppAction | null;
  onAppAction: (id: AppInstanceId, action: AppAction) => void;
}) {
  const t = dictionary[language];

  return (
    <div className="space-y-8">
      <ViewHeader
        copy={t.common.backendNotice}
        eyebrow={t.apps.runtimeEyebrow}
        title={t.navigation.apps}
      />
      <motion.div
        variants={listVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4"
      >
        {apps.map((app) => {
          const primaryAction: AppAction =
            app.status === "running" ? "stop" : "start";
          const pendingActionForApp =
            pendingAction?.appId === app.id ? pendingAction.action : null;
          const isAppPending = Boolean(pendingActionForApp);

          return (
            <motion.div key={app.id} layout variants={itemVariants}>
              <Surface>
                <div className="grid gap-5 rounded-[7px] bg-[#fbfcf8] p-4 dark:bg-[#1b1f18] md:grid-cols-[minmax(0,1fr)_auto] md:items-center sm:p-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusPill language={language} status={app.status} />
                      <span className="truncate font-mono text-xs text-[#6d7368] dark:text-[#aeb5a6]">
                        {app.image}
                      </span>
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                      {app.name}
                    </h2>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                      <Meta label="CPU" value={`${app.cpu}%`} />
                      <Meta label={t.apps.memory} value={app.memory} />
                      <Meta label={t.apps.ports} value={app.ports.join(", ")} />
                      <Meta
                        label={t.apps.updated}
                        value={app.updatedAt || t.common.notConfigured}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <ActionButton
                      disabled={isAppPending}
                      icon={ExternalLink}
                      isBusy={pendingActionForApp === "open"}
                      label={
                        pendingActionForApp === "open"
                          ? t.common.working
                          : t.common.open
                      }
                      variant="quiet"
                      onClick={() => onAppAction(app.id, "open")}
                    />
                    <ActionButton
                      disabled={isAppPending}
                      icon={RefreshCw}
                      isBusy={pendingActionForApp === "restart"}
                      label={
                        pendingActionForApp === "restart"
                          ? t.common.working
                          : t.common.restart
                      }
                      variant="quiet"
                      onClick={() => onAppAction(app.id, "restart")}
                    />
                    <ActionButton
                      disabled={isAppPending}
                      icon={primaryAction === "stop" ? Square : Play}
                      isBusy={pendingActionForApp === primaryAction}
                      label={
                        pendingActionForApp === primaryAction
                          ? t.common.working
                          : primaryAction === "stop"
                            ? t.common.stop
                            : t.common.start
                      }
                      onClick={() => onAppAction(app.id, primaryAction)}
                    />
                  </div>
                </div>
              </Surface>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
