import type { Language } from "@/types/natrocos";

import enUS from "./locales/en_US.json";
import idID from "./locales/id_ID.json";

export type LocaleDictionary = typeof idID;

export const dictionary = {
  id: idID,
  en: enUS,
} satisfies Record<Language, LocaleDictionary>;
