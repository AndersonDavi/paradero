import { getLocales } from "expo-localization";
import Storage from "@/lib/storage";
import { useSyncExternalStore } from "react";

import { de } from "./de";
import { en } from "./en";
import { es, type Messages } from "./es";
import { fr } from "./fr";
import { ja } from "./ja";
import { pt } from "./pt";
import { zh } from "./zh";

export type { Messages } from "./es";

/** Every language Paradero speaks, each named in itself so anyone can find their own. */
export const LANGUAGES = {
  es: { name: "Español", tag: "es-CO", messages: es },
  en: { name: "English", tag: "en-US", messages: en },
  pt: { name: "Português", tag: "pt-BR", messages: pt },
  fr: { name: "Français", tag: "fr-FR", messages: fr },
  de: { name: "Deutsch", tag: "de-DE", messages: de },
  zh: { name: "简体中文", tag: "zh-Hans", messages: zh },
  ja: { name: "日本語", tag: "ja-JP", messages: ja },
} as const satisfies Record<string, { name: string; tag: string; messages: Messages }>;

export type Language = keyof typeof LANGUAGES;
export type LanguageChoice = Language | "system";

const KEY = "language.v1";
const listeners = new Set<() => void>();

function isLanguage(value: string | null | undefined): value is Language {
  return value != null && value in LANGUAGES;
}

/** The phone's first language Paradero speaks. Spanish when it speaks none of them. */
function fromPhone(): Language {
  for (const locale of getLocales()) {
    if (isLanguage(locale.languageCode)) return locale.languageCode;
  }
  return "es";
}

const stored = Storage.getItemSync(KEY);
let choice: LanguageChoice = isLanguage(stored) ? stored : "system";
let language: Language = choice === "system" ? fromPhone() : choice;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setLanguage(value: LanguageChoice) {
  choice = value;
  language = value === "system" ? fromPhone() : value;
  Storage.setItemSync(KEY, value);
  listeners.forEach((l) => l());
}

/** What the rider picked in Paradero, or "system" to follow the phone. */
export function useLanguageChoice(): LanguageChoice {
  return useSyncExternalStore(subscribe, () => choice);
}

/** The language on screen right now. */
export function useLanguage(): Language {
  return useSyncExternalStore(subscribe, () => language);
}

/** The words for the language on screen. Screens re-render when it changes. */
export function useT(): Messages {
  return LANGUAGES[useLanguage()].messages;
}

/** The same words outside React, for formatting helpers called during render. */
export function t(): Messages {
  return LANGUAGES[language].messages;
}

/** The BCP 47 tag for Intl formatting and for telling VoiceOver which voice to use. */
export function tag(): string {
  return LANGUAGES[language].tag;
}
