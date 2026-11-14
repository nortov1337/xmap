"use client";

import type { Layer, MapFeature } from "@/lib/types";
import { FeatureForm } from "./inspector/FeatureForm";
import { LayerForm } from "./inspector/LayerForm";
import { MultiSelection } from "./inspector/MultiSelection";

type Props = {
  feature: MapFeature | null;
  layer: Layer | null;
  layers: Layer[];
  featureCount: number;
  selectionCount: number;
  open: boolean;
  onUpdateFeature: (id: string, patch: Partial<MapFeature>) => void;
  onUpdateLayer: (id: string, patch: Partial<Layer>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onClose: () => void;
  onRemoveLayer: (id: string) => void;
};

export function Inspector(props: Props) {
  const { feature, layer, layers, featureCount, selectionCount, open } = props;

  if (selectionCount > 1) {
    return (
      <MultiSelection
        count={selectionCount}
        open={open}
        onDelete={props.onDelete}
        onDuplicate={props.onDuplicate}
        onClose={props.onClose}
      />
    );
  }

  if (feature) {
    return (
      <FeatureForm
        feature={feature}
        layers={layers}
        open={open}
        onUpdate={props.onUpdateFeature}
        onDelete={props.onDelete}
        onDuplicate={props.onDuplicate}
        onClose={props.onClose}
      />
    );
  }

  if (!layer) return null;

  return (
    <LayerForm
      layer={layer}
      layerCount={layers.length}
      featureCount={featureCount}
      open={open}
      onUpdate={props.onUpdateLayer}
      onRemove={props.onRemoveLayer}
      onClose={props.onClose}
    />
  );
}
