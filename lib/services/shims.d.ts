/** Minimal process typing for env helpers without requiring @types/node in this package. */
declare const process: {
  env: Record<string, string | undefined>;
};
