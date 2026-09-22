import { describe, expect, it } from 'vitest';
import ja from '../locales/ja.json';
import { CJK_PATTERN, filesContaining, read, sourceFiles, trackedFiles } from '../test/repoScan';

/**
 * DESIGN §6. The gate names no forbidden word: it requires that Japanese exists in one
 * place only. That keeps the gate itself safe to publish, and it catches context that a
 * word list would miss.
 */

const LOCALE_DIRECTORY = 'src/locales/';

describe('language and leak guard (DESIGN §6)', () => {
  it('§6.1: Japanese lives in src/locales and nowhere else', () => {
    const outside = trackedFiles().filter((path) => !path.startsWith(LOCALE_DIRECTORY));
    expect(filesContaining(CJK_PATTERN, outside)).toEqual([]);
  });

  it('§6.1: the locale files are where the Japanese actually is', () => {
    const locales = trackedFiles().filter((path) => path.startsWith(LOCALE_DIRECTORY));
    expect(filesContaining(CJK_PATTERN, locales).sort()).toEqual([
      'src/locales/ja.json',
      'src/locales/seed.ja.json',
    ]);
  });

  it('§6.2: every message key the code asks for exists in the locale file', () => {
    const known = new Set(Object.keys(ja));
    const used = new Set<string>();
    for (const path of sourceFiles()) {
      for (const match of read(path).matchAll(/'((?:errors|app|list|form|equipmentType|checkItem|checkResult)\.[a-zA-Z.]+)'/g)) {
        if (match[1]) used.add(match[1]);
      }
    }
    // Keys built from a value (`equipmentType.${type}`) are covered by the type system;
    // what this catches is a literal key that no longer exists in ja.json.
    const missing = [...used].filter((key) => !known.has(key));
    expect(missing).toEqual([]);
    expect(used.size).toBeGreaterThan(10);
  });

  it('§6.2: no locale entry is empty', () => {
    const blank = Object.entries(ja).filter(([, value]) => value.trim().length === 0);
    expect(blank).toEqual([]);
  });
});
