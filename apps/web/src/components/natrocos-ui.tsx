import { useState, type FormEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  Bell,
  ChevronRight,
  Cloud,
  ExternalLink,
  HardDrive,
  Languages,
  Lock,
  LogOut,
  Menu,
  Moon,
  Package,
  Play,
  Power,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  Square,
  Sun,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";

import { metrics, navItems, statusStyles } from "@/data/mock";
import { dictionary } from "@/i18n/dictionary";
import type {
  AppInstance,
  AppStatus,
  Language,
  StoreApp,
  Theme,
  View,
} from "@/types/natrocos";

const spring = { type: "spring" as const, stiffness: 110, damping: 22 };

const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.055, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: spring },
};

export function LoginScreen({
  language,
  setLanguage,
  theme,
  setTheme,
  onLogin,
}: {
  language: Language;
  setLanguage: (language: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  onLogin: () => void;
}) {
  const [username, setUsername] = useState("owner");
  const [password, setPassword] = useState("natroc-local");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const t = dictionary[language];

  function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (username.trim().length === 0 || password.length < 6) {
      setError(t.login.errors.invalidCredentials);
      return;
    }

    setIsSubmitting(true);
    window.setTimeout(() => {
      setIsSubmitting(false);
      onLogin();
    }, 620);
  }

  return (
    <div className="min-h-[100dvh] overflow-hidden bg-[#f7f8f4] text-[#20241f] selection:bg-[#2f7d59]/20 dark:bg-[#151813] dark:text-[#f2f4ec]">
      <AppBackdrop />
      <div className="mx-auto grid min-h-[100dvh] w-full max-w-[1400px] grid-cols-1 items-center gap-10 px-4 py-8 md:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:py-12">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="order-2 lg:order-1"
        >
          <div className="mb-8 flex items-center gap-3">
            <BrandMark />
            <div>
              <p className="text-sm font-semibold tracking-tight">
                {t.common.product}
              </p>
              <p className="text-xs text-[#6d7368] dark:text-[#aeb5a6]">
                {t.common.platformSupport}
              </p>
            </div>
          </div>

          <p className="mb-4 inline-flex rounded-full bg-[#20241f]/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[#4e574a] ring-1 ring-[#20241f]/8 dark:bg-white/5 dark:text-[#cbd1c3] dark:ring-white/10">
            {t.common.eyebrow}
          </p>
          <h1 className="max-w-[760px] text-4xl font-semibold leading-[0.96] tracking-tight text-[#20241f] dark:text-[#f2f4ec] md:text-6xl">
            {t.login.loginTitle}
          </h1>
          <p className="mt-6 max-w-[58ch] text-base leading-relaxed text-[#62685e] dark:text-[#aeb5a6]">
            {t.login.loginCopy}
          </p>

          <div className="mt-10 grid max-w-[620px] grid-cols-2 gap-3 sm:grid-cols-4">
            {metrics.map((metric, index) => (
              <motion.div
                key={metric.key}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.08 * index }}
                className="rounded-lg bg-white/68 p-3 ring-1 ring-[#20241f]/8 dark:bg-white/5 dark:ring-white/10"
              >
                <metric.icon size={16} strokeWidth={1.5} />
                <p className="mt-4 font-mono text-sm text-[#20241f] dark:text-[#f2f4ec]">
                  {metric.value}
                </p>
                <p className="mt-1 text-[11px] text-[#6d7368] dark:text-[#aeb5a6]">
                  {t.dashboard.metrics[metric.key].label}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 26, rotate: 1.2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ ...spring, delay: 0.08 }}
          className="order-1 lg:order-2"
        >
          <Surface className="mx-auto max-w-[560px]">
            <form
              onSubmit={submitLogin}
              className="space-y-6 rounded-[7px] bg-[#fbfcf8] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:bg-[#1c2019] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-7"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold tracking-tight">
                    {t.login.localOwner}
                  </p>
                  <p className="mt-1 text-sm text-[#6d7368] dark:text-[#aeb5a6]">
                    {t.login.nodeAddress}
                  </p>
                </div>
                <div className="flex gap-2">
                  <IconButton
                    label={t.common.language}
                    onClick={() => setLanguage(language === "id" ? "en" : "id")}
                    type="button"
                  >
                    <Languages size={17} strokeWidth={1.5} />
                  </IconButton>
                  <IconButton
                    label={t.common.theme}
                    onClick={() =>
                      setTheme(theme === "light" ? "dark" : "light")
                    }
                    type="button"
                  >
                    {theme === "light" ? (
                      <Moon size={17} strokeWidth={1.5} />
                    ) : (
                      <Sun size={17} strokeWidth={1.5} />
                    )}
                  </IconButton>
                </div>
              </div>

              <div className="grid gap-4">
                <Field
                  help={t.login.usernameHelp}
                  label={t.login.username}
                  value={username}
                  onChange={setUsername}
                />
                <Field
                  help={t.login.passwordHelp}
                  label={t.login.password}
                  type="password"
                  value={password}
                  onChange={setPassword}
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-start gap-2 rounded-lg bg-[#a9544f]/10 p-3 text-sm text-[#873f3a] ring-1 ring-[#a9544f]/20 dark:text-[#f2b6b0]"
                  >
                    <TriangleAlert
                      className="mt-0.5 shrink-0"
                      size={16}
                      strokeWidth={1.5}
                    />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <MagneticButton disabled={isSubmitting} type="submit">
                <span>{isSubmitting ? t.login.signingIn : t.login.signIn}</span>
                <span className="grid size-8 place-items-center rounded-full bg-white/18 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-[1px]">
                  <ChevronRight size={16} strokeWidth={1.5} />
                </span>
              </MagneticButton>

              <p className="text-xs leading-relaxed text-[#737a70] dark:text-[#aeb5a6]">
                {t.common.backendNotice}
              </p>
            </form>
          </Surface>
        </motion.section>
      </div>
    </div>
  );
}

export function DashboardView({
  apps,
  isRefreshing,
  language,
  onRefresh,
}: {
  apps: AppInstance[];
  isRefreshing: boolean;
  language: Language;
  onRefresh: () => void;
}) {
  const t = dictionary[language];
  const runningApps = apps.filter((app) => app.status === "running");
  const hasWarnings = apps.some((app) => app.status === "updating");

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
                </div>
                <div className="rounded-lg bg-[#20241f] p-3 text-[#eff2e8] shadow-[0_20px_45px_-28px_rgba(32,36,31,0.9)] dark:bg-[#eff2e8] dark:text-[#20241f]">
                  <Server size={22} strokeWidth={1.5} />
                  <p className="mt-8 font-mono text-2xl">18d 7h</p>
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
                    {metrics.map((metric) => (
                      <motion.div
                        key={metric.key}
                        layout
                        variants={itemVariants}
                        className="rounded-lg bg-[#f0f2eb] p-4 ring-1 ring-[#20241f]/6 dark:bg-white/5 dark:ring-white/8"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <metric.icon size={18} strokeWidth={1.5} />
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
                    ))}
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
                    2.73 TB
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
                  className="h-full w-[62%] rounded-full bg-[#77a984]"
                />
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <PoolStat label="/DATA" value="1.63 TB" />
                <PoolStat label="/backup" value="812 GB" />
              </div>
            </div>
          </Surface>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.72fr_1.28fr]">
        <LiveStreamPanel language={language} />
        <AppsPanel apps={apps.slice(0, 3)} language={language} />
      </div>
    </div>
  );
}

export function AppsView({
  apps,
  language,
  onToggleStatus,
}: {
  apps: AppInstance[];
  language: Language;
  onToggleStatus: (id: string) => void;
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
        {apps.map((app) => (
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
                      value={t.apps.instances[app.id].updatedAt}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 md:justify-end">
                  <ActionButton
                    icon={ExternalLink}
                    label={t.common.open}
                    variant="quiet"
                  />
                  <ActionButton
                    icon={RefreshCw}
                    label={t.common.restart}
                    variant="quiet"
                  />
                  <ActionButton
                    icon={app.status === "running" ? Square : Play}
                    label={
                      app.status === "running" ? t.common.stop : t.common.start
                    }
                    onClick={() => onToggleStatus(app.id)}
                  />
                </div>
              </div>
            </Surface>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

export function StoreView({
  apps,
  language,
  query,
  setQuery,
}: {
  apps: StoreApp[];
  language: Language;
  query: string;
  setQuery: (query: string) => void;
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
                <StoreCard app={app} language={language} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SettingsView({
  language,
  setLanguage,
  theme,
  setTheme,
}: {
  language: Language;
  setLanguage: (language: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}) {
  const t = dictionary[language];

  return (
    <div className="space-y-8">
      <ViewHeader
        copy={t.settings.profileCopy}
        eyebrow={t.settings.profileEyebrow}
        title={t.navigation.settings}
      />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <Surface>
          <div className="rounded-[7px] bg-[#fbfcf8] p-5 dark:bg-[#1b1f18] sm:p-6">
            <div className="flex items-center gap-4">
              <div className="grid size-14 place-items-center rounded-lg bg-[#2f7d59] text-lg font-semibold text-white">
                NS
              </div>
              <div>
                <p className="text-xl font-semibold tracking-tight">
                  Nara Setyadi
                </p>
                <p className="text-sm text-[#6d7368] dark:text-[#aeb5a6]">
                  {t.common.owner}
                </p>
              </div>
            </div>
            <div className="mt-8 space-y-3">
              <Preference
                icon={ShieldCheck}
                label={t.settings.security}
                value={t.settings.argonPlanned}
              />
              <Preference
                icon={Cloud}
                label={t.common.backup}
                value={t.common.notConfigured}
              />
              <Preference
                icon={Server}
                label={t.common.node}
                value="helios.local"
              />
            </div>
          </div>
        </Surface>

        <Surface>
          <div className="rounded-[7px] bg-[#fbfcf8] p-5 dark:bg-[#1b1f18] sm:p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <SettingToggle
                activeLabel={t.common.indonesia}
                icon={Languages}
                inactiveLabel={t.common.english}
                label={t.common.language}
                value={language === "id"}
                onToggle={() => setLanguage(language === "id" ? "en" : "id")}
              />
              <SettingToggle
                activeLabel={t.common.light}
                icon={theme === "light" ? Sun : Moon}
                inactiveLabel={t.common.dark}
                label={t.common.theme}
                value={theme === "light"}
                onToggle={() => setTheme(theme === "light" ? "dark" : "light")}
              />
            </div>
            <div className="mt-6 rounded-lg bg-[#eef0e9] p-4 text-sm leading-relaxed text-[#586052] ring-1 ring-[#20241f]/6 dark:bg-white/5 dark:text-[#aeb5a6] dark:ring-white/10">
              {t.common.backendNotice}
            </div>
          </div>
        </Surface>
      </div>
    </div>
  );
}

export function FloatingNav({
  currentView,
  language,
  setLanguage,
  setView,
  theme,
  setTheme,
  onLogout,
}: {
  currentView: View;
  language: Language;
  setLanguage: (language: Language) => void;
  setView: (view: View) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  onLogout: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const t = dictionary[language];

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="fixed inset-x-0 top-0 z-30 px-4 pt-5"
      >
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 rounded-full bg-[#fbfcf8]/82 px-3 py-2 shadow-[0_18px_45px_-30px_rgba(32,36,31,0.55)] ring-1 ring-[#20241f]/10 backdrop-blur-xl dark:bg-[#1b1f18]/82 dark:ring-white/10">
          <button
            className="flex items-center gap-3 rounded-full py-1 pl-1 pr-3 text-left transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
            onClick={() => setView("dashboard")}
            type="button"
          >
            <BrandMark small />
            <span className="hidden text-sm font-semibold tracking-tight sm:block">
              {t.common.product}
            </span>
          </button>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => (
              <button
                key={item.view}
                className="relative rounded-full px-4 py-2 text-sm font-medium text-[#596154] transition-colors duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-[#20241f] dark:text-[#aeb5a6] dark:hover:text-[#f2f4ec]"
                onClick={() => setView(item.view)}
                type="button"
              >
                {currentView === item.view && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-full bg-[#20241f]/7 dark:bg-white/8"
                    transition={spring}
                  />
                )}
                <span className="relative">{t.navigation[item.view]}</span>
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <IconButton
              label={t.common.language}
              onClick={() => setLanguage(language === "id" ? "en" : "id")}
              type="button"
            >
              <Languages size={17} strokeWidth={1.5} />
            </IconButton>
            <IconButton
              label={t.common.theme}
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              type="button"
            >
              {theme === "light" ? (
                <Moon size={17} strokeWidth={1.5} />
              ) : (
                <Sun size={17} strokeWidth={1.5} />
              )}
            </IconButton>
            <IconButton label={t.common.alerts} type="button">
              <Bell size={17} strokeWidth={1.5} />
            </IconButton>
            <IconButton
              className="lg:hidden"
              label={t.common.menu}
              onClick={() => setIsOpen(true)}
              type="button"
            >
              <Menu size={17} strokeWidth={1.5} />
            </IconButton>
            <IconButton
              className="hidden lg:grid"
              label={t.common.logout}
              onClick={onLogout}
              type="button"
            >
              <LogOut size={17} strokeWidth={1.5} />
            </IconButton>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-[#f7f8f4]/92 px-4 py-5 backdrop-blur-2xl dark:bg-[#151813]/92 lg:hidden"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BrandMark small />
                <span className="font-semibold">{t.common.product}</span>
              </div>
              <IconButton
                label={t.common.close}
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X size={17} strokeWidth={1.5} />
              </IconButton>
            </div>

            <motion.div
              variants={listVariants}
              initial="hidden"
              animate="show"
              className="mt-14 grid gap-3"
            >
              {navItems.map((item) => (
                <motion.button
                  key={item.view}
                  variants={itemVariants}
                  className="flex items-center justify-between rounded-lg bg-white/68 px-4 py-4 text-left text-xl font-semibold tracking-tight ring-1 ring-[#20241f]/8 dark:bg-white/5 dark:ring-white/10"
                  onClick={() => {
                    setView(item.view);
                    setIsOpen(false);
                  }}
                  type="button"
                >
                  <span>{t.navigation[item.view]}</span>
                  <item.icon size={20} strokeWidth={1.5} />
                </motion.button>
              ))}
              <motion.button
                variants={itemVariants}
                className="flex items-center justify-between rounded-lg bg-[#20241f] px-4 py-4 text-left text-xl font-semibold tracking-tight text-[#f7f8f4] dark:bg-[#f2f4ec] dark:text-[#20241f]"
                onClick={onLogout}
                type="button"
              >
                <span>{t.common.logout}</span>
                <LogOut size={20} strokeWidth={1.5} />
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function SideRail({
  currentView,
  language,
  runningCount,
  setView,
}: {
  currentView: View;
  language: Language;
  runningCount: number;
  setView: (view: View) => void;
}) {
  const t = dictionary[language];

  return (
    <Surface>
      <div className="rounded-[7px] bg-[#fbfcf8] p-3 dark:bg-[#1b1f18]">
        <div className="mb-5 rounded-lg bg-[#eef0e9] p-4 ring-1 ring-[#20241f]/6 dark:bg-white/5 dark:ring-white/10">
          <p className="text-xs uppercase tracking-[0.18em] text-[#6d7368] dark:text-[#aeb5a6]">
            Helios
          </p>
          <p className="mt-2 font-mono text-2xl">{runningCount}/4</p>
          <p className="mt-1 text-xs text-[#6d7368] dark:text-[#aeb5a6]">
            {t.common.runningApps}
          </p>
        </div>
        <div className="grid gap-1">
          {navItems.map((item) => (
            <button
              key={item.view}
              className="group relative flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-[#596154] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-[#20241f] active:scale-[0.98] dark:text-[#aeb5a6] dark:hover:text-[#f2f4ec]"
              onClick={() => setView(item.view)}
              type="button"
            >
              {currentView === item.view && (
                <motion.span
                  layoutId="rail-active"
                  className="absolute inset-0 rounded-lg bg-[#20241f]/7 dark:bg-white/8"
                  transition={spring}
                />
              )}
              <item.icon className="relative" size={18} strokeWidth={1.5} />
              <span className="relative">{t.navigation[item.view]}</span>
            </button>
          ))}
        </div>
      </div>
    </Surface>
  );
}

export function AppBackdrop() {
  return (
    <>
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(to_right,rgba(32,36,31,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(32,36,31,0.045)_1px,transparent_1px)] bg-[size:64px_64px] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)]" />
      <div className="natroc-noise fixed inset-0 pointer-events-none opacity-[0.035]" />
    </>
  );
}

function ViewHeader({
  action,
  copy,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  copy: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <p className="mb-4 inline-flex rounded-full bg-[#20241f]/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-[#4e574a] ring-1 ring-[#20241f]/8 dark:bg-white/5 dark:text-[#cbd1c3] dark:ring-white/10">
          {eyebrow}
        </p>
        <h1 className="text-4xl font-semibold leading-none tracking-tight md:text-6xl">
          {title}
        </h1>
        <p className="mt-5 max-w-[65ch] text-base leading-relaxed text-[#62685e] dark:text-[#aeb5a6]">
          {copy}
        </p>
      </div>
      {action}
    </div>
  );
}

function Surface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg bg-[#20241f]/5 p-1 ring-1 ring-[#20241f]/8 shadow-[0_24px_58px_-38px_rgba(32,36,31,0.42)] dark:bg-white/5 dark:ring-white/10 ${className}`}
    >
      {children}
    </div>
  );
}

function MagneticButton({
  children,
  disabled,
  type,
}: {
  children: ReactNode;
  disabled?: boolean;
  type: "button" | "submit";
}) {
  return (
    <button
      className="group inline-flex w-full items-center justify-between rounded-full bg-[#2f7d59] px-3 py-3 pl-5 text-sm font-semibold text-white shadow-[0_18px_38px_-24px_rgba(47,125,89,0.9)] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-70"
      disabled={disabled}
      type={type}
    >
      {children}
    </button>
  );
}

function IconButton({
  children,
  className = "",
  label,
  onClick,
  type,
}: {
  children: ReactNode;
  className?: string;
  label: string;
  onClick?: () => void;
  type: "button";
}) {
  return (
    <button
      aria-label={label}
      className={`grid size-9 place-items-center rounded-full bg-[#20241f]/6 text-[#20241f] ring-1 ring-[#20241f]/8 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-[#20241f]/10 active:scale-[0.98] dark:bg-white/8 dark:text-[#f2f4ec] dark:ring-white/10 dark:hover:bg-white/12 ${className}`}
      onClick={onClick}
      title={label}
      type={type}
    >
      {children}
    </button>
  );
}

function Field({
  help,
  label,
  onChange,
  type = "text",
  value,
}: {
  help: string;
  label: string;
  onChange: (value: string) => void;
  type?: "password" | "text";
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <span className="relative">
        <Lock
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#747b70]"
          size={16}
          strokeWidth={1.5}
        />
        <input
          className="h-12 w-full rounded-lg bg-[#eef0e9] pl-10 pr-3 text-sm text-[#20241f] outline-none ring-1 ring-[#20241f]/8 transition-shadow duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] placeholder:text-[#7c8277] focus:ring-2 focus:ring-[#2f7d59]/35 dark:bg-white/5 dark:text-[#f2f4ec] dark:ring-white/10"
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
      <span className="text-xs text-[#737a70] dark:text-[#aeb5a6]">{help}</span>
    </label>
  );
}

function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`relative grid ${small ? "size-8" : "size-11"} place-items-center rounded-lg bg-[#20241f] text-[#f7f8f4] shadow-[0_18px_35px_-24px_rgba(32,36,31,0.8)] dark:bg-[#f2f4ec] dark:text-[#20241f]`}
    >
      <span className="absolute inset-1 rounded-[5px] ring-1 ring-white/12 dark:ring-[#20241f]/12" />
      <Server size={small ? 16 : 20} strokeWidth={1.5} />
    </span>
  );
}

function StatusPill({
  language,
  status,
}: {
  language: Language;
  status: AppStatus;
}) {
  const t = dictionary[language];

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[#20241f]/5 px-2.5 py-1 text-xs font-medium ring-1 ring-[#20241f]/8 dark:bg-white/5 dark:ring-white/10">
      <motion.span
        animate={{ scale: status === "running" ? [1, 1.35, 1] : 1 }}
        transition={{ duration: 2.4, repeat: Infinity }}
        className={`size-2 rounded-full ${statusStyles[status]}`}
      />
      {t.apps.status[status]}
    </span>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  variant = "solid",
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  variant?: "quiet" | "solid";
}) {
  return (
    <button
      className={`group inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 active:scale-[0.98] ${
        variant === "solid"
          ? "bg-[#20241f] text-[#f7f8f4] dark:bg-[#f2f4ec] dark:text-[#20241f]"
          : "bg-[#20241f]/6 text-[#20241f] ring-1 ring-[#20241f]/8 dark:bg-white/5 dark:text-[#f2f4ec] dark:ring-white/10"
      }`}
      onClick={onClick}
      type="button"
    >
      <Icon size={15} strokeWidth={1.5} />
      {label}
    </button>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#737a70] dark:text-[#aeb5a6]">{label}</p>
      <p className="mt-1 truncate font-mono text-sm">{value}</p>
    </div>
  );
}

function PoolStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/8 p-3 ring-1 ring-white/10 dark:bg-[#20241f]/5 dark:ring-[#20241f]/10">
      <p className="text-xs opacity-64">{label}</p>
      <p className="mt-2 font-mono text-lg">{value}</p>
    </div>
  );
}

function SkeletonMetrics() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-40 overflow-hidden rounded-lg bg-[#eef0e9] ring-1 ring-[#20241f]/6 dark:bg-white/5 dark:ring-white/8"
        >
          <div className="h-full w-full animate-[natroc-shimmer_1.4s_infinite] bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.72),transparent)] dark:bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.08),transparent)]" />
        </div>
      ))}
    </motion.div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 80;
      const y = 24 - ((value - min) / Math.max(max - min, 1)) * 22;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      aria-hidden="true"
      className="h-8 w-24 text-[#2f7d59]"
      viewBox="0 0 80 28"
    >
      <motion.polyline
        animate={{ pathLength: [0.35, 1, 0.35] }}
        transition={{ duration: 6, repeat: Infinity, repeatType: "mirror" }}
        fill="none"
        points={points}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function LiveStreamPanel({ language }: { language: Language }) {
  const t = dictionary[language];
  const events = [
    {
      icon: ShieldCheck,
      title: t.dashboard.authMockReady,
      detail: t.dashboard.authMockDetail,
    },
    {
      icon: HardDrive,
      title: t.dashboard.storageScanned,
      detail: t.dashboard.storageScannedDetail,
    },
    {
      icon: Power,
      title: t.dashboard.containerCheck,
      detail: t.dashboard.containerCheckDetail,
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
          {apps.map((app) => (
            <div
              key={app.id}
              className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <StatusPill language={language} status={app.status} />
                  <span className="truncate font-mono text-xs text-[#737a70] dark:text-[#aeb5a6]">
                    {app.ports[0]}
                  </span>
                </div>
                <p className="mt-2 font-semibold tracking-tight">{app.name}</p>
              </div>
              <p className="font-mono text-sm">{app.memory}</p>
            </div>
          ))}
        </div>
      </div>
    </Surface>
  );
}

function StoreCard({ app, language }: { app: StoreApp; language: Language }) {
  const t = dictionary[language];
  const appCopy = t.store.apps[app.id];

  return (
    <Surface>
      <div className="flex h-full flex-col rounded-[7px] bg-[#fbfcf8] p-5 dark:bg-[#1b1f18] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#2f7d59]/10 px-2.5 py-1 text-xs font-medium text-[#2f7d59] ring-1 ring-[#2f7d59]/15">
                {appCopy.category}
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
              {appCopy.description}
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
          <ActionButton icon={Package} label={t.common.install} />
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

function Preference({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-[#eef0e9] p-3 ring-1 ring-[#20241f]/6 dark:bg-white/5 dark:ring-white/8">
      <div className="flex items-center gap-3">
        <Icon size={17} strokeWidth={1.5} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-right font-mono text-xs text-[#6d7368] dark:text-[#aeb5a6]">
        {value}
      </span>
    </div>
  );
}

function SettingToggle({
  activeLabel,
  icon: Icon,
  inactiveLabel,
  label,
  onToggle,
  value,
}: {
  activeLabel: string;
  icon: LucideIcon;
  inactiveLabel: string;
  label: string;
  onToggle: () => void;
  value: boolean;
}) {
  return (
    <button
      className="group rounded-lg bg-[#eef0e9] p-4 text-left ring-1 ring-[#20241f]/6 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 active:scale-[0.98] dark:bg-white/5 dark:ring-white/8"
      onClick={onToggle}
      type="button"
    >
      <div className="flex items-center justify-between gap-4">
        <Icon size={18} strokeWidth={1.5} />
        <span className="relative h-6 w-11 rounded-full bg-[#20241f]/12 p-0.5 dark:bg-white/12">
          <motion.span
            animate={{ x: value ? 20 : 0 }}
            transition={spring}
            className="block size-5 rounded-full bg-[#2f7d59]"
          />
        </span>
      </div>
      <p className="mt-5 text-sm font-medium">{label}</p>
      <p className="mt-1 font-mono text-xs text-[#6d7368] dark:text-[#aeb5a6]">
        {value ? activeLabel : inactiveLabel}
      </p>
    </button>
  );
}
