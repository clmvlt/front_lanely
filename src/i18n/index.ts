import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import en from "./locales/en.json"
import fr from "./locales/fr.json"

export const supportedLanguages = ["en", "fr"] as const
export type Language = (typeof supportedLanguages)[number]
export const defaultLanguage: Language = "en"

export const LANGUAGE_COOKIE = "lanely.lang"

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    fallbackLng: defaultLanguage,
    supportedLngs: supportedLanguages,
    load: "languageOnly",
    detection: {
      order: ["cookie"],
      caches: ["cookie"],
      lookupCookie: LANGUAGE_COOKIE,
      cookieMinutes: 60 * 24 * 365,
      cookieOptions: { path: "/", sameSite: "lax" },
    },
    interpolation: { escapeValue: false },
  })

export default i18n
