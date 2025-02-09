import { layerType } from "@/db/schema/schema";

// eslint-disable-next-line antfu/top-level-function
export const getLayerType = (layer: string): typeof layerType.enumValues[number] => {
  if (!layerType.enumValues.includes(layer as any)) {
    throw new Error(`Invalid layer type: ${layer}`);
  }
  return layer as typeof layerType.enumValues[number];
};
