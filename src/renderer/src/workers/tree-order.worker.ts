import { orderTreePaths } from "../components/tree-order";

self.onmessage = ({ data }: MessageEvent<{ id: number; paths: string[] }>) => {
  try {
    self.postMessage({ id: data.id, paths: orderTreePaths(data.paths) });
  } catch (error) {
    self.postMessage({ id: data.id, error: (error as Error).message });
  }
};
