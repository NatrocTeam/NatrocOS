import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronRight,
  Languages,
  Moon,
  Sun,
  TriangleAlert,
} from "lucide-react";

import {
  AppBackdrop,
  BrandMark,
  Field,
  IconButton,
  MagneticButton,
  Surface,
} from "@/components/natrocos-primitives";
import { spring } from "@/components/natrocos-motion";
import { loginHighlights } from "@/data/ui";
import { dictionary } from "@/i18n/dictionary";
import type { Language, LoginRequestDto, Theme } from "@/types/natrocos";

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
  onLogin: (credentials: LoginRequestDto) => Promise<void>;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const t = dictionary[language];

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedUsername = username.trim();
    if (normalizedUsername.length === 0 || password.length < 8) {
      setError(t.login.errors.invalidCredentials);
      return;
    }

    setIsSubmitting(true);
    try {
      await onLogin({ username: normalizedUsername, password });
    } catch {
      setError(t.login.errors.authFailed);
    } finally {
      setIsSubmitting(false);
    }
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
            {loginHighlights.map((highlight, index) => (
              <motion.div
                key={highlight.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.08 * index }}
                className="rounded-lg bg-white/68 p-3 ring-1 ring-[#20241f]/8 dark:bg-white/5 dark:ring-white/10"
              >
                <highlight.icon size={16} strokeWidth={1.5} />
                <p className="mt-4 font-mono text-sm text-[#20241f] dark:text-[#f2f4ec]">
                  {highlight.value}
                </p>
                <p className="mt-1 text-[11px] text-[#6d7368] dark:text-[#aeb5a6]">
                  {t.login.highlights[highlight.id]}
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
