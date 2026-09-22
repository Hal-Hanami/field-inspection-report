import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname } from 'node:path';

/**
 * Helpers for the gates that read the repository itself. They exist because the rules
 * they check ("no private context in a public repo", "no section nobody enforces")
 * cannot be held by remembering them.
 */

const BINARY_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2']);

export function trackedFiles(): string[] {
  return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter((path) => path.length > 0 && !BINARY_EXTENSIONS.has(extname(path)))
    // A file deleted in the working tree is still in the index until the change is
    // staged; the gate is about content, so it reads what is actually there.
    .filter((path) => existsSync(path));
}

export function read(path: string): string {
  return readFileSync(path, 'utf8');
}

/** Han, Hiragana and Katakana — the alphabets that carry private context here. */
export const CJK_PATTERN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

export function filesContaining(pattern: RegExp, paths: string[]): string[] {
  return paths.filter((path) => pattern.test(read(path)));
}

/**
 * Source and test files come from the working tree, not from git: a rule about how the
 * code is layered has to hold for the file being written, before it is ever staged.
 * The leak gate is the opposite case and stays on `git ls-files`, because what leaks is
 * what gets published.
 */
function walk(directory: string): string[] {
  return readdirSync(directory, { recursive: true, encoding: 'utf8' })
    .map((entry) => `${directory}/${entry}`.replaceAll('\\', '/'))
    .filter((path) => statSync(path).isFile());
}

export function testFiles(): string[] {
  return walk('src').filter((path) => /\.test\.tsx?$/.test(path));
}

export function sourceFiles(): string[] {
  return walk('src').filter(
    (path) => /\.tsx?$/.test(path) && !/\.test\.tsx?$/.test(path) && !path.startsWith('src/test/'),
  );
}

/** The `§N` and `§N.M` ids DESIGN.md defines as headings or numbered invariants. */
export function designSections(designPath = 'docs/DESIGN.md'): string[] {
  const text = read(designPath);
  const ids = new Set<string>();
  for (const line of text.split('\n')) {
    const heading = /^#{2,4}\s+§(\d+(?:\.\d+)?)\s/.exec(line);
    if (heading?.[1]) ids.add(heading[1]);
    const invariant = /^-\s+\*\*§(\d+(?:\.\d+)?)\*\*/.exec(line);
    if (invariant?.[1]) ids.add(invariant[1]);
  }
  return [...ids].sort();
}

/** Every `§N.M` cited anywhere in the test suite. */
export function citedSections(): Set<string> {
  const cited = new Set<string>();
  for (const path of testFiles()) {
    for (const match of read(path).matchAll(/§(\d+(?:\.\d+)?)/g)) {
      const id = match[1];
      if (!id) continue;
      cited.add(id);
      // A citation of §4.3 is a citation of §4 (public rule: a subsection counts).
      const parent = id.split('.')[0];
      if (parent) cited.add(parent);
    }
  }
  return cited;
}

export function importsOf(path: string): string[] {
  const source = read(path);
  return [...source.matchAll(/from\s+'([^']+)'/g)]
    .map((match) => match[1])
    .filter((specifier): specifier is string => Boolean(specifier));
}
