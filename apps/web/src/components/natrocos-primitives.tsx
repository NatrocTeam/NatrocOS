import type { ReactNode } from "react";
import { motion } from "motion/react";
import { LoaderCircle, Lock, Server, type LucideIcon } from "lucide-react";

import { statusStyles } from "@/data/ui";
import { dictionary } from "@/i18n/dictionary";
import type { AppStatus, Language } from "@/types/natrocos";

export function ViewHeader({
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

export function Surface({
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

export function MagneticButton({
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

export function IconButton({
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

export function Field({
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

export function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`relative grid ${small ? "size-8" : "size-11"} place-items-center rounded-lg bg-[#20241f] text-[#f7f8f4] shadow-[0_18px_35px_-24px_rgba(32,36,31,0.8)] dark:bg-[#f2f4ec] dark:text-[#20241f]`}
    >
      <span className="absolute inset-1 rounded-[5px] ring-1 ring-white/12 dark:ring-[#20241f]/12" />
      <Server size={small ? 16 : 20} strokeWidth={1.5} />
    </span>
  );
}

export function StatusPill({
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

export function ActionButton({
  disabled,
  icon: Icon,
  isBusy,
  label,
  onClick,
  variant = "solid",
}: {
  disabled?: boolean;
  icon: LucideIcon;
  isBusy?: boolean;
  label: string;
  onClick?: () => void;
  variant?: "quiet" | "solid";
}) {
  return (
    <button
      className={`group inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-58 ${
        variant === "solid"
          ? "bg-[#20241f] text-[#f7f8f4] dark:bg-[#f2f4ec] dark:text-[#20241f]"
          : "bg-[#20241f]/6 text-[#20241f] ring-1 ring-[#20241f]/8 dark:bg-white/5 dark:text-[#f2f4ec] dark:ring-white/10"
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {isBusy ? (
        <LoaderCircle className="animate-spin" size={15} strokeWidth={1.5} />
      ) : (
        <Icon size={15} strokeWidth={1.5} />
      )}
      {label}
    </button>
  );
}

export function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#737a70] dark:text-[#aeb5a6]">{label}</p>
      <p className="mt-1 truncate font-mono text-sm">{value}</p>
    </div>
  );
}

export function PoolStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/8 p-3 ring-1 ring-white/10 dark:bg-[#20241f]/5 dark:ring-[#20241f]/10">
      <p className="text-xs opacity-64">{label}</p>
      <p className="mt-2 font-mono text-lg">{value}</p>
    </div>
  );
}

export function SkeletonMetrics() {
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

export function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return (
      <svg
        aria-hidden="true"
        className="h-8 w-24 text-[#2f7d59]"
        viewBox="0 0 80 28"
      >
        <line
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2"
          x1="0"
          x2="80"
          y1="14"
          y2="14"
        />
      </svg>
    );
  }

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

export function AppBackdrop() {
  return (
    <>
      <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(to_right,rgba(32,36,31,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(32,36,31,0.045)_1px,transparent_1px)] bg-[size:64px_64px] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)]" />
      <div className="natroc-noise fixed inset-0 pointer-events-none opacity-[0.035]" />
    </>
  );
}
