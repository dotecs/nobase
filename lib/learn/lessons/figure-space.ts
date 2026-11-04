import type { TargetBox } from './chalk';
import { labelBox } from './point-labels';

export function containedImageBox(element: { left: number; top: number; width: number; height: number }, naturalWidth: number, naturalHeight: number): TargetBox | null {
  if (naturalWidth <= 0 || naturalHeight <= 0 || element.width <= 0 || element.height <= 0) return null;
  const scale = Math.min(element.width / naturalWidth, element.height / naturalHeight);
  const width = naturalWidth * scale, height = naturalHeight * scale;
  return labelBox(element.left + (element.width - width) / 2, element.top + (element.height - height) / 2, width, height);
}

export function figureSpace(box: TargetBox) {
  return { sx: (x: number) => box.left + x * (box.right - box.left), sy: (y: number) => box.top + y * (box.bottom - box.top) };
}
