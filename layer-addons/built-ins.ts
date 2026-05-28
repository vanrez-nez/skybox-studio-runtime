import type { WebGpuLayerAdapter } from "./types";

export function createBuiltInWebGpuLayerAdapters<
  const TAdapters extends readonly WebGpuLayerAdapter[],
>(adapters: TAdapters) {
  return adapters;
}
