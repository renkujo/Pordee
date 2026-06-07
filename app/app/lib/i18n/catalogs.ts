import type { Messages } from "@lingui/core";
import { messages as enCatalog } from "../../../locales/en/messages";
import { messages as thCatalog } from "../../../locales/th/messages";
import {
  messages as manualMessages,
  type PordeeLocale,
} from "~/lib/i18n/messages";

export const catalogs: Record<PordeeLocale, Messages> = {
  en: {
    ...manualMessages.en,
    ...enCatalog,
  },
  th: {
    ...manualMessages.th,
    ...thCatalog,
  },
};
