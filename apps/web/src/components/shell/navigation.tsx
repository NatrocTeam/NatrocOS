import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, Languages, LogOut, Menu, Moon, Sun, X } from "lucide-react";

import {
  BrandMark,
  IconButton,
  Surface,
} from "@/components/natrocos-primitives";
import {
  itemVariants,
  listVariants,
  spring,
} from "@/components/natrocos-motion";
import { navItems } from "@/data/ui";
import { dictionary } from "@/i18n/dictionary";
import type { Language, Theme, View } from "@/types/natrocos";

export function FloatingNav({
  currentView,
  language,
  setLanguage,
  setView,
  theme,
  setTheme,
  onLogout,
  onShowAlerts,
}: {
  currentView: View;
  language: Language;
  setLanguage: (language: Language) => void;
  setView: (view: View) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  onLogout: () => void;
  onShowAlerts: () => void;
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
            <IconButton
              label={t.common.alerts}
              onClick={onShowAlerts}
              type="button"
            >
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
  nodeName,
  runningCount,
  setView,
  totalApps,
}: {
  currentView: View;
  language: Language;
  nodeName: string;
  runningCount: number;
  setView: (view: View) => void;
  totalApps: number;
}) {
  const t = dictionary[language];

  return (
    <Surface>
      <div className="rounded-[7px] bg-[#fbfcf8] p-3 dark:bg-[#1b1f18]">
        <div className="mb-5 rounded-lg bg-[#eef0e9] p-4 ring-1 ring-[#20241f]/6 dark:bg-white/5 dark:ring-white/10">
          <p className="text-xs uppercase tracking-[0.18em] text-[#6d7368] dark:text-[#aeb5a6]">
            {nodeName || t.common.node}
          </p>
          <p className="mt-2 font-mono text-2xl">
            {runningCount}/{totalApps}
          </p>
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
