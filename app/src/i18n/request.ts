import { getRequestConfig } from "next-intl/server";

// v0.1 ships English only. Locale negotiation gets added when we add
// the second locale — see PRD §12.
export const DEFAULT_LOCALE = "en" as const;

export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE;
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
