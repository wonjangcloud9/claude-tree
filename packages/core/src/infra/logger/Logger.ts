import debug from 'debug';

const NAMESPACE = 'claudetree';

export interface Logger {
  info: debug.Debugger;
  error: debug.Debugger;
  debug: debug.Debugger;
}

export function createLogger(module: string): Logger {
  const base = `${NAMESPACE}:${module}`;

  return {
    info: debug(`${base}:info`),
    error: debug(`${base}:error`),
    debug: debug(`${base}:debug`),
  };
}
