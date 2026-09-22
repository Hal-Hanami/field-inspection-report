import { describe, expect, it } from 'vitest';
import { importsOf, sourceFiles, testFiles } from '../test/repoScan';

/**
 * The dependency rule of DESIGN §3, checked against the files themselves. An import is
 * added in a second, and a layering rule that only lives in a document is gone by the
 * time anyone reads it again.
 */

const FRAMEWORKS = ['react', 'react-dom', 'react-router-dom', 'react-hook-form'];

describe('dependency rule (DESIGN §3)', () => {
  const files = sourceFiles();

  it('§3.1: the domain imports no framework and no outer layer', () => {
    const domainFiles = files.filter((path) => path.startsWith('src/domain/'));
    expect(domainFiles.length).toBeGreaterThan(0);

    const offenders = domainFiles.flatMap((path) =>
      importsOf(path)
        .filter(
          (specifier) =>
            FRAMEWORKS.includes(specifier) ||
            specifier.includes('features/') ||
            specifier.includes('/app/') ||
            specifier.includes('/data/') ||
            specifier.includes('i18n'),
        )
        .map((specifier) => `${path} -> ${specifier}`),
    );
    expect(offenders).toEqual([]);
  });

  it('§3.3: components take data from a screen, never from an adapter', () => {
    const componentFiles = files.filter((path) => /^src\/features\/[^/]+\/components\//.test(path));
    expect(componentFiles.length).toBeGreaterThan(0);

    const offenders = componentFiles.flatMap((path) =>
      importsOf(path)
        .filter((specifier) => specifier.includes('/data/'))
        .map((specifier) => `${path} -> ${specifier}`),
    );
    expect(offenders).toEqual([]);
  });

  it('§6.2: screens ask for a key through t(), rather than reaching into the locale file', () => {
    const screenFiles = files.filter(
      (path) => path.startsWith('src/features/') || path.startsWith('src/app/'),
    );
    const offenders = screenFiles.flatMap((path) =>
      importsOf(path)
        .filter((specifier) => specifier.includes('locales/'))
        .map((specifier) => `${path} -> ${specifier}`),
    );
    expect(offenders).toEqual([]);
  });

  it('§3: these rules are held by a suite that ships with the repository', () => {
    expect(testFiles().length).toBeGreaterThan(5);
  });
});
