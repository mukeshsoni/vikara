import { z } from "zod";

export const exportFormSchema = z.object({
  exportLocation: z.object({
    folderPath: z.string().min(1),
  }),
  fileSettings: z.object({
    imageFormat: z.enum([
      "jpeg",
      "jpeg_xl",
      "avif",
      "psd",
      "tiff",
      "png",
      "dng",
      "original",
    ]),
    quality: z.number().min(0).max(100),
  }),
  imageSizing: z.object({
    resizeEnabled: z.boolean(),
    resizeToFit: z.enum([
      "width_and_height",
      "dimensions",
      "long_edge",
      "short_edge",
      "megapixels",
      "pixels",
    ]),
    enlarge: z.boolean(),
    resizeWidth: z.number().min(1),
    resizeHeight: z.number().min(1),
    resizeSize: z.number().min(1),
    resizeSizeMegapixels: z.number().min(1),
    resizeIn: z.enum(["pixels", "inches", "cms"]),
    resizeResolution: z.number().min(1),
    resizeResolutionIn: z.enum(["pixels_per_inch", "pixels_per_cm"]),
  }),
});

export type ExportSettings = z.infer<typeof exportFormSchema>;
