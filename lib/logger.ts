/* eslint-disable @typescript-eslint/no-explicit-any */
export const log = (...args: any[]) => {
  if (__DEV__) console.log('[LOG]', ...args);
};
