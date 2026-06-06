import { motion } from "motion/react";
import {
  Cloud,
  Languages,
  Moon,
  Server,
  ShieldCheck,
  Sun,
  type LucideIcon,
} from "lucide-react";

import { Surface, ViewHeader } from "@/components/natrocos-primitives";
import { spring } from "@/components/natrocos-motion";
import { dictionary } from "@/i18n/dictionary";
import type { Language, Theme, UserSessionDto } from "@/types/natrocos";

export function SettingsView({
  language,
  nodeName,
  session,
  setLanguage,
  theme,
  setTheme,
}: {
  language: Language;
  nodeName: string;
  session: UserSessionDto | null;
  setLanguage: (language: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
}) {
  const t = dictionary[language];
  const displayName =
    session?.displayName || session?.username || t.common.owner;
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

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
                {initials || "NO"}
              </div>
              <div>
                <p className="text-xl font-semibold tracking-tight">
                  {displayName}
                </p>
                <p className="text-sm text-[#6d7368] dark:text-[#aeb5a6]">
                  {session?.role ?? t.common.owner}
                </p>
              </div>
            </div>
            <div className="mt-8 space-y-3">
              <Preference
                icon={ShieldCheck}
                label={t.settings.security}
                value={t.settings.passwordHash}
              />
              <Preference
                icon={Cloud}
                label={t.common.backup}
                value={t.common.notConfigured}
              />
              <Preference
                icon={Server}
                label={t.common.node}
                value={nodeName || t.common.notConfigured}
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
