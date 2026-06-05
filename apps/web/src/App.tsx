import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import {
  AppBackdrop,
  AppsView,
  DashboardView,
  FloatingNav,
  LoginScreen,
  SettingsView,
  SideRail,
  StoreView,
} from "@/components/natrocos-ui";
import { initialApps, storeApps } from "@/data/mock";
import { dictionary } from "@/i18n/dictionary";
import type { AppStatus, Language, Theme, View } from "@/types/natrocos";

const spring = { type: "spring" as const, stiffness: 110, damping: 22 };

function App() {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem("natrocos-language") as Language) || "en";
  });
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("natrocos-theme") as Theme) || "light";
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [apps, setApps] = useState(initialApps);
  const [query, setQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    localStorage.setItem("natrocos-language", language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("natrocos-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const runningCount = apps.filter((app) => app.status === "running").length;

  const filteredStoreApps = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return storeApps;

    return storeApps.filter((app) => {
      const appCopy = dictionary[language].store.apps[app.id];
      const haystack = [
        app.name,
        appCopy.category,
        appCopy.description,
        ...app.tags,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [language, query]);

  function refreshMockData() {
    setIsRefreshing(true);
    window.setTimeout(() => {
      setApps((currentApps) =>
        currentApps.map((app, index) => ({
          ...app,
          cpu: Number((app.cpu + (index % 2 === 0 ? 1.7 : -0.9)).toFixed(1)),
        })),
      );
      setIsRefreshing(false);
    }, 850);
  }

  function toggleAppStatus(id: string) {
    setApps((currentApps) =>
      currentApps.map((app) => {
        if (app.id !== id) return app;
        const nextStatus: AppStatus =
          app.status === "running" ? "stopped" : "running";
        return { ...app, status: nextStatus };
      }),
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen
        language={language}
        setLanguage={setLanguage}
        theme={theme}
        setTheme={setTheme}
        onLogin={() => setIsAuthenticated(true)}
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
        onLogout={() => setIsAuthenticated(false)}
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
              setView={setView}
              runningCount={runningCount}
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
                  onRefresh={refreshMockData}
                />
              )}
              {view === "apps" && (
                <AppsView
                  apps={apps}
                  language={language}
                  onToggleStatus={toggleAppStatus}
                />
              )}
              {view === "store" && (
                <StoreView
                  apps={filteredStoreApps}
                  language={language}
                  query={query}
                  setQuery={setQuery}
                />
              )}
              {view === "settings" && (
                <SettingsView
                  language={language}
                  setLanguage={setLanguage}
                  theme={theme}
                  setTheme={setTheme}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}

export default App;
