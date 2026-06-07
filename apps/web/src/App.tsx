import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { AppBackdrop } from "@/components/natrocos-primitives";
import { FloatingNav, SideRail } from "@/components/shell/navigation";
import { ToastStack } from "@/components/toast-stack";
import { AppsView } from "@/components/views/apps-view";
import { DashboardView } from "@/components/views/dashboard-view";
import { LoginScreen } from "@/components/views/login-screen";
import { SettingsView } from "@/components/views/settings-view";
import { StoreView } from "@/components/views/store-view";
import { quickActions } from "@/data/ui";
import { dictionary } from "@/i18n/dictionary";
import { createHttpControlPlaneClient } from "@/services/http-control-plane";
import type {
  AppAction,
  AppInstance,
  AppInstanceId,
  DashboardAction,
  Language,
  CreateUserRequestDto,
  LoginRequestDto,
  PendingAppAction,
  StoragePoolDto,
  StoreApp,
  StoreAppId,
  StoreInstallJobDto,
  SystemMetricDto,
  Theme,
  ToastMessage,
  ToastTone,
  UserAccountDto,
  UserSessionDto,
  View,
} from "@/types/natrocos";

const spring = { type: "spring" as const, stiffness: 110, damping: 22 };
const apiBaseURL = import.meta.env.VITE_NATROCOS_API_URL ?? "";
const sessionStorageKey = "natrocos-session";

function readStoredSession() {
  const storedValue = localStorage.getItem(sessionStorageKey);
  if (!storedValue || storedValue === "owner") return null;

  try {
    const parsedSession = JSON.parse(storedValue) as UserSessionDto;
    const expiresAt = new Date(parsedSession.expiresAt).getTime();
    if (!parsedSession.accessToken || Number.isNaN(expiresAt)) {
      return null;
    }
    if (expiresAt <= Date.now()) {
      localStorage.removeItem(sessionStorageKey);
      return null;
    }
    return parsedSession;
  } catch {
    localStorage.removeItem(sessionStorageKey);
    return null;
  }
}

function storeSession(session: UserSessionDto) {
  localStorage.setItem(sessionStorageKey, JSON.stringify(session));
}

function upsertStoreQueueJob(
  jobs: StoreInstallJobDto[],
  nextJob: StoreInstallJobDto,
) {
  const existingIndex = jobs.findIndex((job) => job.jobId === nextJob.jobId);
  if (existingIndex === -1) {
    return [nextJob, ...jobs];
  }

  return jobs.map((job, index) => (index === existingIndex ? nextJob : job));
}

function compactCommand(command: string) {
  return command.length > 96 ? `${command.slice(0, 93)}...` : command;
}

function App() {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem("natrocos-language") as Language) || "en";
  });
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("natrocos-theme") as Theme) || "light";
  });
  const [session, setSession] = useState<UserSessionDto | null>(() =>
    readStoredSession(),
  );
  const [view, setView] = useState<View>("dashboard");
  const [apps, setApps] = useState<AppInstance[]>([]);
  const [storeCatalog, setStoreCatalog] = useState<StoreApp[]>([]);
  const [storeQueue, setStoreQueue] = useState<StoreInstallJobDto[]>([]);
  const [users, setUsers] = useState<UserAccountDto[]>([]);
  const [metrics, setMetrics] = useState<SystemMetricDto[]>([]);
  const [storagePools, setStoragePools] = useState<StoragePoolDto[]>([]);
  const [nodeName, setNodeName] = useState("");
  const [uptime, setUptime] = useState("");
  const [query, setQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingAppAction, setPendingAppAction] =
    useState<PendingAppAction | null>(null);
  const [installingStoreAppId, setInstallingStoreAppId] =
    useState<StoreAppId | null>(null);
  const [isStoreQueueRefreshing, setIsStoreQueueRefreshing] = useState(false);
  const [isProcessingStoreQueue, setIsProcessingStoreQueue] = useState(false);
  const [isUsersRefreshing, setIsUsersRefreshing] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [deployingStoreJobId, setDeployingStoreJobId] = useState<string | null>(
    null,
  );
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const isAuthenticated = Boolean(session);
  const controlPlaneClient = useMemo(
    () =>
      createHttpControlPlaneClient(
        apiBaseURL,
        () => session?.accessToken ?? null,
      ),
    [session?.accessToken],
  );

  useEffect(() => {
    localStorage.setItem("natrocos-language", language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("natrocos-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let isActive = true;
    void (async () => {
      try {
        const [summary, catalog] = await Promise.all([
          controlPlaneClient.getSystemSummary(),
          controlPlaneClient.listStoreApps(),
        ]);

        if (!isActive) return;
        setApps(summary.apps);
        setMetrics(summary.metrics);
        setNodeName(summary.nodeName);
        setStoragePools(summary.storagePools);
        setStoreCatalog(catalog);
        setUptime(summary.uptime);

        try {
          const queue = await controlPlaneClient.listStoreQueue();
          if (isActive) {
            setStoreQueue(queue);
          }
        } catch {
          if (isActive) {
            setStoreQueue([]);
          }
        }

        if (session?.role === "owner") {
          try {
            const accounts = await controlPlaneClient.listUsers();
            if (isActive) {
              setUsers(accounts);
            }
          } catch {
            if (isActive) {
              setUsers([]);
            }
          }
        }
      } finally {
        if (isActive) {
          setIsRefreshing(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [controlPlaneClient, isAuthenticated, session?.role]);

  const runningCount = apps.filter((app) => app.status === "running").length;

  const filteredStoreApps = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return storeCatalog;

    return storeCatalog.filter((app) => {
      const haystack = [app.name, app.category, app.description, ...app.tags]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [query, storeCatalog]);

  function removeToast(id: string) {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== id),
    );
  }

  function pushToast({
    detail,
    title,
    tone = "success",
  }: {
    detail: string;
    title: string;
    tone?: ToastTone;
  }) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    setToasts((currentToasts) => [
      ...currentToasts.slice(-2),
      { id, detail, title, tone },
    ]);

    window.setTimeout(() => removeToast(id), 4200);
  }

  function formatCopy(template: string, values: Record<string, string>) {
    return Object.entries(values).reduce((formatted, [key, value]) => {
      return formatted.replaceAll(`{${key}}`, value);
    }, template);
  }

  async function completeLogin(credentials: LoginRequestDto) {
    const setupStatus = await controlPlaneClient.getSetupStatus();
    const nextSession = setupStatus.requiresSetup
      ? await controlPlaneClient.createOwner({
          ...credentials,
          displayName: credentials.username,
        })
      : await controlPlaneClient.login(credentials);

    storeSession(nextSession);
    setSession(nextSession);
  }

  async function logout() {
    try {
      await controlPlaneClient.logout();
    } catch {
      // Logging out must clear local access even if the backend session expired.
    } finally {
      localStorage.removeItem(sessionStorageKey);
      setSession(null);
      setApps([]);
      setMetrics([]);
      setStoreCatalog([]);
      setStoreQueue([]);
      setUsers([]);
      setStoragePools([]);
      setView("dashboard");
    }
  }

  async function refreshStoreQueue({ showToast = false } = {}) {
    if (isStoreQueueRefreshing) return;

    setIsStoreQueueRefreshing(true);

    try {
      const queue = await controlPlaneClient.listStoreQueue();
      setStoreQueue(queue);

      if (showToast) {
        pushToast({
          title: dictionary[language].store.toasts.queueRefreshed.title,
          detail: dictionary[language].store.toasts.queueRefreshed.detail,
          tone: "info",
        });
      }
    } catch {
      pushToast({
        title: dictionary[language].store.errors.queueFailed,
        detail: dictionary[language].common.tryAgain,
        tone: "warning",
      });
    } finally {
      setIsStoreQueueRefreshing(false);
    }
  }

  async function refreshBackendData({ showToast = true } = {}) {
    if (isRefreshing) return;

    setIsRefreshing(true);

    try {
      const [summary, catalog, queue, accounts] = await Promise.all([
        controlPlaneClient.getSystemSummary(),
        controlPlaneClient.listStoreApps(),
        controlPlaneClient.listStoreQueue().catch(() => null),
        session?.role === "owner"
          ? controlPlaneClient.listUsers().catch(() => null)
          : Promise.resolve(null),
      ]);

      setApps(summary.apps);
      setMetrics(summary.metrics);
      setNodeName(summary.nodeName);
      setStoragePools(summary.storagePools);
      setStoreCatalog(catalog);
      setUptime(summary.uptime);
      if (queue) {
        setStoreQueue(queue);
      }
      if (accounts) {
        setUsers(accounts);
      }

      if (showToast) {
        pushToast({
          title: dictionary[language].dashboard.toasts.refreshed.title,
          detail: dictionary[language].dashboard.toasts.refreshed.detail,
        });
      }
    } catch {
      pushToast({
        title: dictionary[language].dashboard.errors.refreshFailed,
        detail: dictionary[language].common.tryAgain,
        tone: "warning",
      });
    } finally {
      setIsRefreshing(false);
    }
  }

  async function refreshUsers({ showToast = false } = {}) {
    if (isUsersRefreshing || session?.role !== "owner") return;

    setIsUsersRefreshing(true);

    try {
      const accounts = await controlPlaneClient.listUsers();
      setUsers(accounts);

      if (showToast) {
        pushToast({
          title: dictionary[language].settings.toasts.usersRefreshed.title,
          detail: dictionary[language].settings.toasts.usersRefreshed.detail,
          tone: "info",
        });
      }
    } catch {
      pushToast({
        title: dictionary[language].settings.errors.usersFailed,
        detail: dictionary[language].common.tryAgain,
        tone: "warning",
      });
    } finally {
      setIsUsersRefreshing(false);
    }
  }

  async function createLocalUser(request: CreateUserRequestDto) {
    if (isCreatingUser || session?.role !== "owner") return;

    setIsCreatingUser(true);

    try {
      const account = await controlPlaneClient.createUser(request);
      setUsers((currentUsers) => [...currentUsers, account]);
      try {
        setUsers(await controlPlaneClient.listUsers());
      } catch {
        setUsers((currentUsers) => currentUsers);
      }

      pushToast({
        title: formatCopy(
          dictionary[language].settings.toasts.userCreated.title,
          {
            user: account.username,
          },
        ),
        detail: dictionary[language].settings.toasts.userCreated.detail,
      });
    } catch {
      pushToast({
        title: dictionary[language].settings.errors.createUserFailed,
        detail: dictionary[language].common.tryAgain,
        tone: "warning",
      });
    } finally {
      setIsCreatingUser(false);
    }
  }

  async function runBackendAppAction(appId: AppInstanceId, action: AppAction) {
    if (pendingAppAction) return;

    const app = apps.find((currentApp) => currentApp.id === appId);
    if (!app) return;

    setPendingAppAction({ appId, action });

    try {
      const nextApps = await controlPlaneClient.runAppAction({
        action,
        appId,
        apps,
      });
      const toastCopy = dictionary[language].apps.toasts[action];

      setApps(nextApps);
      pushToast({
        title: formatCopy(toastCopy.title, { app: app.name }),
        detail: formatCopy(toastCopy.detail, { app: app.name }),
        tone: action === "open" ? "info" : "success",
      });
    } catch {
      pushToast({
        title: dictionary[language].apps.errors.actionFailed,
        detail: dictionary[language].common.tryAgain,
        tone: "warning",
      });
    } finally {
      setPendingAppAction(null);
    }
  }

  async function installStoreApp(appId: StoreAppId) {
    if (installingStoreAppId) return;

    const app = storeCatalog.find((storeApp) => storeApp.id === appId);
    if (!app) return;

    setInstallingStoreAppId(appId);

    try {
      const installJob = await controlPlaneClient.enqueueStoreInstall(appId);
      try {
        setStoreQueue(await controlPlaneClient.listStoreQueue());
      } catch {
        setStoreQueue((currentQueue) => currentQueue);
      }
      pushToast({
        title: formatCopy(dictionary[language].store.toasts.queued.title, {
          app: app.name,
        }),
        detail: formatCopy(dictionary[language].store.toasts.queued.detail, {
          app: app.name,
          job: installJob.jobId,
        }),
      });
    } catch {
      pushToast({
        title: dictionary[language].store.errors.installFailed,
        detail: dictionary[language].common.tryAgain,
        tone: "warning",
      });
    } finally {
      setInstallingStoreAppId(null);
    }
  }

  async function processStoreQueue() {
    if (isProcessingStoreQueue) return;

    setIsProcessingStoreQueue(true);

    try {
      const response = await controlPlaneClient.processStoreQueue();
      try {
        setStoreQueue(await controlPlaneClient.listStoreQueue());
      } catch {
        setStoreQueue(response.jobs);
      }

      pushToast({
        title: dictionary[language].store.toasts.queueProcessed.title,
        detail: formatCopy(
          dictionary[language].store.toasts.queueProcessed.detail,
          {
            failed: String(response.failed),
            processed: String(response.processed),
            ready: String(response.ready),
          },
        ),
      });
    } catch {
      pushToast({
        title: dictionary[language].store.errors.processFailed,
        detail: dictionary[language].common.tryAgain,
        tone: "warning",
      });
    } finally {
      setIsProcessingStoreQueue(false);
    }
  }

  async function deployStoreQueueDryRun(jobId: string) {
    if (deployingStoreJobId) return;

    setDeployingStoreJobId(jobId);

    try {
      const response = await controlPlaneClient.deployStoreQueueJob(jobId, {
        confirm: false,
        dryRun: true,
        pull: false,
      });
      setStoreQueue((currentQueue) =>
        upsertStoreQueueJob(currentQueue, response.job),
      );
      try {
        setStoreQueue(await controlPlaneClient.listStoreQueue());
      } catch {
        setStoreQueue((currentQueue) => currentQueue);
      }

      pushToast({
        title: dictionary[language].store.toasts.deployDryRun.title,
        detail: formatCopy(
          dictionary[language].store.toasts.deployDryRun.detail,
          {
            command: compactCommand(response.command.join(" ")),
            job: response.job.jobId,
          },
        ),
        tone: "info",
      });
    } catch {
      pushToast({
        title: dictionary[language].store.errors.deployFailed,
        detail: dictionary[language].common.tryAgain,
        tone: "warning",
      });
    } finally {
      setDeployingStoreJobId(null);
    }
  }

  function showAlertSummary() {
    pushToast({
      title: dictionary[language].common.alerts,
      detail: dictionary[language].common.noAlerts,
      tone: "info",
    });
  }

  function runDashboardAction(action: DashboardAction) {
    const toastCopy =
      dictionary[language].dashboard.quickActions.toasts[action];
    const actionMeta = quickActions.find((item) => item.id === action);

    if (action === "openStore") {
      setView("store");
    }

    pushToast({
      title: toastCopy.title,
      detail: toastCopy.detail,
      tone: actionMeta?.tone ?? "info",
    });
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen
        language={language}
        setLanguage={setLanguage}
        theme={theme}
        setTheme={setTheme}
        onLogin={completeLogin}
      />
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#f7f8f4] text-[#20241f] selection:bg-[#2f7d59]/20 dark:bg-[#151813] dark:text-[#f2f4ec]">
      <AppBackdrop />
      <FloatingNav
        currentView={view}
        language={language}
        setLanguage={setLanguage}
        setView={setView}
        theme={theme}
        setTheme={setTheme}
        onLogout={logout}
        onShowAlerts={showAlertSummary}
      />

      <main className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-6 px-4 pb-16 pt-28 md:px-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8 lg:pt-32">
        <aside className="hidden lg:block">
          <motion.div
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={spring}
            className="sticky top-32"
          >
            <SideRail
              currentView={view}
              language={language}
              nodeName={nodeName}
              setView={setView}
              runningCount={runningCount}
              totalApps={apps.length}
            />
          </motion.div>
        </aside>

        <section className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={spring}
            >
              {view === "dashboard" && (
                <DashboardView
                  apps={apps}
                  isRefreshing={isRefreshing}
                  language={language}
                  metrics={metrics}
                  nodeName={nodeName}
                  onDashboardAction={runDashboardAction}
                  onRefresh={() => refreshBackendData()}
                  storagePools={storagePools}
                  uptime={uptime}
                />
              )}
              {view === "apps" && (
                <AppsView
                  apps={apps}
                  pendingAction={pendingAppAction}
                  language={language}
                  onAppAction={runBackendAppAction}
                />
              )}
              {view === "store" && (
                <StoreView
                  apps={filteredStoreApps}
                  deployingJobId={deployingStoreJobId}
                  installingAppId={installingStoreAppId}
                  isProcessingQueue={isProcessingStoreQueue}
                  isQueueRefreshing={isStoreQueueRefreshing}
                  language={language}
                  query={query}
                  queue={storeQueue}
                  setQuery={setQuery}
                  onDeployDryRun={deployStoreQueueDryRun}
                  onInstallApp={installStoreApp}
                  onProcessQueue={processStoreQueue}
                  onRefreshQueue={() => refreshStoreQueue({ showToast: true })}
                />
              )}
              {view === "settings" && (
                <SettingsView
                  isCreatingUser={isCreatingUser}
                  isUsersRefreshing={isUsersRefreshing}
                  language={language}
                  nodeName={nodeName}
                  session={session}
                  setLanguage={setLanguage}
                  theme={theme}
                  users={users}
                  setTheme={setTheme}
                  onCreateUser={createLocalUser}
                  onRefreshUsers={() => refreshUsers({ showToast: true })}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>
      <ToastStack language={language} toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

export default App;
