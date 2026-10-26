// Presentation-only preparation. Git/filesystem reads remain in the core.
let worker: Worker | undefined;
let sequence = 0;
const pending = new Map<
  number,
  { resolve: (paths: string[]) => void; reject: (error: Error) => void }
>();
export function prepareTree(paths: string[]): Promise<string[]> {
  if (!worker) {
    worker = new Worker(new URL("../workers/tree-order.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = ({
      data,
    }: MessageEvent<{ id: number; paths: string[]; error?: string }>) => {
      const task = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) task?.reject(new Error(data.error));
      else task?.resolve(data.paths);
    };
    worker.onerror = () => {
      worker?.terminate();
      worker = undefined;
      for (const task of pending.values()) task.reject(new Error("Tree preparation failed"));
      pending.clear();
    };
  }
  const target = worker;
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    target.postMessage({ id, paths });
  });
}
