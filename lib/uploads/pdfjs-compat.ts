type PromiseWithResolvers<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

type PromiseConstructorWithResolvers = PromiseConstructor & {
  withResolvers?: <T>() => PromiseWithResolvers<T>;
};

/**
 * PDF.js 6 uses Promise.withResolvers, which is missing in older Safari/iOS
 * releases. Install the small spec-compatible shim before importing PDF.js.
 * The return value tells callers whether it is safe to use a module worker.
 */
export function ensurePdfJsCompatibility(): boolean {
  const promiseConstructor = Promise as PromiseConstructorWithResolvers;
  const existing = Reflect.get(promiseConstructor, "withResolvers") as
    | (<T>() => PromiseWithResolvers<T>)
    | undefined;
  if (typeof existing === "function") return true;

  promiseConstructor.withResolvers = <T>() => {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise;
      reject = rejectPromise;
    });
    return { promise, resolve, reject };
  };

  return false;
}
