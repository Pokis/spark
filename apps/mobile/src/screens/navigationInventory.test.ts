import fs from 'node:fs';
import path from 'node:path';

const appDirectory = path.resolve(__dirname, '../../app');

function routeFiles(directory = appDirectory): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? routeFiles(absolute) : [absolute];
  });
}

function sourceFiles(): Array<{ file: string; source: string }> {
  return routeFiles()
    .filter((file) => file.endsWith('.tsx'))
    .map((file) => ({ file, source: fs.readFileSync(file, 'utf8') }));
}

function routeExists(route: string): boolean {
  const clean = route.split('?')[0]!.replace(/^\//, '');
  if (!clean) return fs.existsSync(path.join(appDirectory, 'index.tsx'));
  return (
    fs.existsSync(path.join(appDirectory, `${clean}.tsx`)) ||
    fs.existsSync(path.join(appDirectory, clean, 'index.tsx')) ||
    fs.existsSync(path.join(appDirectory, clean, '_layout.tsx'))
  );
}

describe('navigation inventory', () => {
  it('registers every root-stack screen and the tab navigator', () => {
    const layout = fs.readFileSync(path.join(appDirectory, '_layout.tsx'), 'utf8');
    const expected = routeFiles()
      .filter((file) => file.endsWith('.tsx'))
      .map((file) => path.relative(appDirectory, file).replaceAll('\\', '/'))
      .filter((file) => file !== '_layout.tsx' && !file.startsWith('(tabs)/'))
      .map((file) => file.replace(/\.tsx$/, ''));

    expect(layout).toContain('<Stack.Screen name="(tabs)"');
    for (const route of expected) {
      expect(layout).toContain(`<Stack.Screen name="${route}"`);
    }
  });

  it('keeps all literal push, replace, and redirect destinations backed by a route', () => {
    const destinations = sourceFiles().flatMap(({ source }) => {
      const calls = [
        ...source.matchAll(/router\.(?:push|replace)\(\s*['"]([^'"]+)['"]/g),
        ...source.matchAll(/<Redirect\s+href=['"]([^'"]+)['"]/g)
      ];
      return calls.map((match) => match[1]!);
    });

    expect(destinations.length).toBeGreaterThan(20);
    for (const destination of destinations) {
      expect(routeExists(destination)).toBe(true);
    }
  });

  it('does not use history-only back navigation in app screens', () => {
    const offenders = sourceFiles()
      .filter(({ source }) => source.includes('router.back()'))
      .map(({ file }) => path.relative(appDirectory, file));
    expect(offenders).toEqual([]);
  });
});
