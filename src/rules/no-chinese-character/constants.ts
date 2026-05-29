import { createMessageIds } from "../../libs";

export const messages = {
  noChinese: "no-chinese-character",
  vuePropertyNameFormat: "vue-property-name-format",
  inValidDefaultMessage: "invalid default message",
  unableToFindValue: "Unable to find the value corresponding to the key",
  addHookBeforeIt: "add locale hook before it",
  addImportBeforeIt: "add locale import before it",
  addI18nProperty: "add i18n property to the component",
};
export const messageIds = createMessageIds(messages);

export const vueDefHandlerFuncNameSet = new Set([
  "defineProps",
  "withDefaults",
]);
