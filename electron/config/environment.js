import path from 'path';

export function createEnvironment(baseDir) {
  const isDev = process.env.NODE_ENV === 'development';
  const resourcesRoot = isDev ? baseDir : process.resourcesPath;
  const e2eDbPath = process.env.E2E_DB_PATH;

  const resolveFromResources = (relativePath) => path.join(resourcesRoot, relativePath);

  return {
    isDev,
    paths: {
      db: e2eDbPath
        ? path.resolve(e2eDbPath)
        : isDev
        ? path.join(baseDir, '..', 'database.db')
        : resolveFromResources('database.db'),
      packageJson: isDev
        ? path.join(baseDir, '..', 'package.json')
        : resolveFromResources('package.json'),
      machineIdExecutable: isDev
        ? path.join(baseDir, '..', 'get_machine_id.exe')
        : resolveFromResources('get_machine_id.exe'),
      preload: path.join(baseDir, 'preload.js'),
      icon: path.join(baseDir, 'favicon.ico'),
      distIndex: path.join(baseDir, '../dist/index.html')
    },
    getStartUrl() {
      return isDev ? 'http://localhost:5173' : `file://${path.join(baseDir, '../dist/index.html')}`;
    }
  };
}


