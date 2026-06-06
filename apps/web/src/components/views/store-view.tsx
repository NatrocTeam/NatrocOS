import { AnimatePresence, motion } from "motion/react";
import { Cloud, Package, Search } from "lucide-react";

import {
  ActionButton,
  Surface,
  ViewHeader,
} from "@/components/natrocos-primitives";
import { itemVariants, listVariants } from "@/components/natrocos-motion";
import { dictionary } from "@/i18n/dictionary";
import type { Language, StoreApp, StoreAppId } from "@/types/natrocos";

export function StoreView({
  apps,
  installingAppId,
  language,
  query,
  setQuery,
  onInstallApp,
}: {
  apps: StoreApp[];
  installingAppId: StoreAppId | null;
  language: Language;
  query: string;
  setQuery: (query: string) => void;
  onInstallApp: (id: StoreAppId) => void;
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
