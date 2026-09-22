import ja from '../locales/ja.json';
import type { CheckItem, CheckResult, EquipmentType } from '../domain';

/**
 * Every string a user reads comes from `ja.json` (DESIGN §6.1). `MessageKey` is derived
 * from that file, so a key that does not exist fails the type check rather than
 * rendering `undefined` in front of someone (DESIGN §6.2).
 */
export type MessageKey = keyof typeof ja;

const messages: Record<MessageKey, string> = ja;

export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const template = messages[key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function isMessageKey(value: string): value is MessageKey {
  return Object.prototype.hasOwnProperty.call(messages, value);
}

/**
 * Validation carries keys, not sentences (DESIGN §6.1). An unknown value is shown as-is
 * rather than swallowed: a visible oddity is easier to fix than a silent blank.
 */
export function tMessage(value: string): string {
  return isMessageKey(value) ? t(value) : value;
}

export const equipmentTypeKey = (type: EquipmentType): MessageKey => `equipmentType.${type}`;
export const checkItemKey = (item: CheckItem): MessageKey => `checkItem.${item}`;
export const checkResultKey = (result: CheckResult): MessageKey => `checkResult.${result}`;
