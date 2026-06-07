import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import {
  CircleCheck,
  Cloud,
  Languages,
  Moon,
  RefreshCw,
  Server,
  ShieldCheck,
  Sun,
  TriangleAlert,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  ActionButton,
  Field,
  Surface,
  ViewHeader,
} from "@/components/natrocos-primitives";
import { spring } from "@/components/natrocos-motion";
import { dictionary } from "@/i18n/dictionary";
import type {
  CreateUserRequestDto,
  Language,
  ServiceStatusDto,
  Theme,
  UserAccountDto,
  UserSessionDto,
} from "@/types/natrocos";

export function SettingsView({
  isCreatingUser,
  isUsersRefreshing,
  language,
  nodeName,
  serviceStatuses,
  session,
  setLanguage,
  theme,
  setTheme,
  users,
  onCreateUser,
  onRefreshUsers,
}: {
  isCreatingUser: boolean;
  isUsersRefreshing: boolean;
  language: Language;
  nodeName: string;
  serviceStatuses: ServiceStatusDto[];
  session: UserSessionDto | null;
  setLanguage: (language: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  users: UserAccountDto[];
  onCreateUser: (request: CreateUserRequestDto) => Promise<void>;
  onRefreshUsers: () => void;
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
      <ServiceHealthPanel language={language} services={serviceStatuses} />
      {session?.role === "owner" && (
        <UserManagementPanel
          isCreatingUser={isCreatingUser}
          isUsersRefreshing={isUsersRefreshing}
          language={language}
          users={users}
          onCreateUser={onCreateUser}
          onRefreshUsers={onRefreshUsers}
        />
      )}
    </div>
  );
}

function ServiceHealthPanel({
  language,
  services,
}: {
  language: Language;
  services: ServiceStatusDto[];
}) {
  const t = dictionary[language];
  const statusLabels: Record<string, string> = t.settings.services.status;

  return (
    <Surface>
      <div className="rounded-[7px] bg-[#fbfcf8] p-5 dark:bg-[#1b1f18] sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-tight">
              {t.settings.services.title}
            </p>
            <p className="mt-1 max-w-[64ch] text-sm leading-relaxed text-[#62685e] dark:text-[#aeb5a6]">
              {t.settings.services.copy}
            </p>
          </div>
          <Server className="shrink-0" size={18} strokeWidth={1.5} />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {services.length === 0 ? (
            <div className="rounded-lg bg-[#eef0e9] p-4 text-sm text-[#62685e] ring-1 ring-[#20241f]/6 dark:bg-white/5 dark:text-[#aeb5a6] dark:ring-white/10">
              {t.settings.services.empty}
            </div>
          ) : (
            services.map((service) => {
              const isOk = service.status === "ok";
              const Icon = isOk ? CircleCheck : TriangleAlert;

              return (
                <div
                  key={service.name}
                  className="min-w-0 rounded-lg bg-[#eef0e9] p-4 ring-1 ring-[#20241f]/6 dark:bg-white/5 dark:ring-white/10"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-semibold tracking-tight">
                      {service.name}
                    </p>
                    <Icon
                      className={
                        isOk
                          ? "text-[#2f7d59]"
                          : "text-[#a4643b] dark:text-[#e6a069]"
                      }
                      size={18}
                      strokeWidth={1.5}
                    />
                  </div>
                  <p
                    className={`mt-5 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${serviceStatusTone(service.status)}`}
                  >
                    {statusLabels[service.status] ?? service.status}
                  </p>
                  {service.detail && (
                    <p className="mt-3 truncate font-mono text-xs text-[#6d7368] dark:text-[#aeb5a6]">
                      {service.detail}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Surface>
  );
}

function UserManagementPanel({
  isCreatingUser,
  isUsersRefreshing,
  language,
  users,
  onCreateUser,
  onRefreshUsers,
}: {
  isCreatingUser: boolean;
  isUsersRefreshing: boolean;
  language: Language;
  users: UserAccountDto[];
  onCreateUser: (request: CreateUserRequestDto) => Promise<void>;
  onRefreshUsers: () => void;
}) {
  const t = dictionary[language];
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedUsername = username.trim();
    const normalizedDisplayName = displayName.trim();
    if (normalizedUsername.length < 3 || password.length < 8) {
      setError(t.settings.users.errors.invalidInput);
      return;
    }

    await onCreateUser({
      displayName: normalizedDisplayName || normalizedUsername,
      password,
      username: normalizedUsername,
    });
    setUsername("");
    setDisplayName("");
    setPassword("");
  }

  return (
    <Surface>
      <div className="rounded-[7px] bg-[#fbfcf8] p-5 dark:bg-[#1b1f18] sm:p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#eef0e9] ring-1 ring-[#20241f]/8 dark:bg-white/5 dark:ring-white/10">
              <Users size={18} strokeWidth={1.5} />
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight">
                {t.settings.users.title}
              </p>
              <p className="mt-1 max-w-[58ch] text-sm leading-relaxed text-[#62685e] dark:text-[#aeb5a6]">
                {t.settings.users.copy}
              </p>
            </div>
          </div>
          <ActionButton
            disabled={isUsersRefreshing || isCreatingUser}
            icon={RefreshCw}
            isBusy={isUsersRefreshing}
            label={
              isUsersRefreshing ? t.common.refreshing : t.settings.users.refresh
            }
            variant="quiet"
            onClick={onRefreshUsers}
          />
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[0.98fr_1.02fr]">
          <div className="grid gap-3">
            {users.length === 0 ? (
              <div className="rounded-lg bg-[#eef0e9] p-4 text-sm text-[#62685e] ring-1 ring-[#20241f]/6 dark:bg-white/5 dark:text-[#aeb5a6] dark:ring-white/10">
                {t.settings.users.empty}
              </div>
            ) : (
              users.map((user) => (
                <div
                  key={user.userId}
                  className="flex items-center justify-between gap-3 rounded-lg bg-[#eef0e9] p-3 ring-1 ring-[#20241f]/6 dark:bg-white/5 dark:ring-white/10"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {user.displayName || user.username}
                    </p>
                    <p className="mt-1 truncate font-mono text-xs text-[#6d7368] dark:text-[#aeb5a6]">
                      {user.username}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#20241f]/6 px-2.5 py-1 text-xs font-medium ring-1 ring-[#20241f]/8 dark:bg-white/5 dark:ring-white/10">
                    {user.role}
                  </span>
                </div>
              ))
            )}
          </div>

          <form
            className="grid gap-4 rounded-lg bg-[#eef0e9] p-4 ring-1 ring-[#20241f]/6 dark:bg-white/5 dark:ring-white/10"
            onSubmit={submitUser}
          >
            <div>
              <p className="text-sm font-semibold tracking-tight">
                {t.settings.users.addTitle}
              </p>
              <p className="mt-1 text-sm text-[#62685e] dark:text-[#aeb5a6]">
                {t.settings.users.addCopy}
              </p>
            </div>
            <Field
              help={t.settings.users.usernameHelp}
              label={t.login.username}
              value={username}
              onChange={setUsername}
            />
            <Field
              help={t.settings.users.displayNameHelp}
              label={t.settings.users.displayName}
              value={displayName}
              onChange={setDisplayName}
            />
            <Field
              help={t.login.passwordHelp}
              label={t.login.password}
              type="password"
              value={password}
              onChange={setPassword}
            />
            {error && (
              <p className="rounded-lg bg-[#a9544f]/10 p-3 text-sm text-[#873f3a] ring-1 ring-[#a9544f]/20 dark:text-[#f2b6b0]">
                {error}
              </p>
            )}
            <button
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#20241f] px-4 py-2.5 text-sm font-medium text-[#f7f8f4] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-58 dark:bg-[#f2f4ec] dark:text-[#20241f]"
              disabled={isCreatingUser}
              type="submit"
            >
              <UserPlus size={15} strokeWidth={1.5} />
              {isCreatingUser ? t.common.working : t.settings.users.add}
            </button>
          </form>
        </div>
      </div>
    </Surface>
  );
}

function serviceStatusTone(status: string) {
  if (status === "ok") {
    return "bg-[#2f7d59]/10 text-[#2f7d59] ring-[#2f7d59]/20";
  }
  if (status === "misconfigured") {
    return "bg-[#b88936]/12 text-[#8a6428] ring-[#b88936]/25 dark:text-[#e7c071]";
  }
  return "bg-[#a9544f]/10 text-[#873f3a] ring-[#a9544f]/20 dark:text-[#f2b6b0]";
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
