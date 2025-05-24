import { z } from "zod";
import { exportFormSchema } from "./export_form_schema";

export const resizeResolutionInOptions = [
  {
    label: "pixels per inch",
    value: "pixels_per_inch",
  },
  {
    label: "pixels per cm",
    value: "pixels_per_cm",
  },
];
export const resizeInOptions = [
  {
    label: "pixels",
    value: "pixels",
  },
  {
    label: "in",
    value: "inches",
  },
  {
    label: "cm",
    value: "cms",
  },
];
export const resizeToFitOptions = [
  {
    label: "Width and Height",
    value: "width_and_height",
  },
  {
    label: "Long edge",
    value: "long_edge",
  },
  {
    label: "Short edge",
    value: "short_edge",
  },
  {
    label: "Megapixels",
    value: "megapixels",
  },
];
export const imageFormatOptions = [
  {
    label: "JPEG",
    value: "jpeg",
  },
  {
    label: "PNG",
    value: "png",
  },
  {
    label: "Original",
    value: "original",
  },
];

export const INITIAL_VALUES = {
  exportLocation: {
    folderPath: "",
  },
  fileSettings: {
    imageFormat: "jpeg",
    quality: 70,
  },
  imageSizing: {
    resizeEnabled: false,
    resizeToFit: "width_and_height",
    enlarge: false,
    resizeWidth: 1000,
    resizeHeight: 1000,
    resizeSize: 1000,
    resizeSizeMegapixels: 5.0,
    resizeIn: "pixels",
    resizeResolution: 240,
    resizeResolutionIn: "pixels_per_inch",
  },
} as z.infer<typeof exportFormSchema>;
