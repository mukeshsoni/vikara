// use base64::{engine::general_purpose, Engine as _};
use fast_image_resize::{
    DifferentTypesOfPixelsError, Image as FirImage, ImageBufferError, MulDivImageError,
    MulDivImagesError, PixelType, ResizeAlg, Resizer,
};
use image::{DynamicImage, ImageBuffer, ImageFormat, Rgba};
use libheif_rs::{ColorSpace as HeifColorSpace, HeifContext, LibHeif, RgbChroma};
use log::{info, warn};
use serde::{Deserialize, Serialize};
use std::fmt;
use std::ops::Deref;
use std::{cmp::max, num::NonZeroU32, path::Path};

#[derive(Debug, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ExistingFileAction {
    AskWhatToDo,
    ChooseNewName,
    OverwriteWithoutWarning,
    Skip,
}

/// We do not really care about the underlying error, so wrap all fast_image_resize errors to a single type
#[derive(Debug)]
pub enum ResizeImageError {
    Error,
}
impl From<ImageBufferError> for ResizeImageError {
    fn from(_: ImageBufferError) -> Self {
        ResizeImageError::Error
    }
}

impl From<MulDivImageError> for ResizeImageError {
    fn from(_: MulDivImageError) -> Self {
        ResizeImageError::Error
    }
}

impl From<MulDivImagesError> for ResizeImageError {
    fn from(_: MulDivImagesError) -> Self {
        ResizeImageError::Error
    }
}

impl From<DifferentTypesOfPixelsError> for ResizeImageError {
    fn from(_: DifferentTypesOfPixelsError) -> Self {
        ResizeImageError::Error
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportLocation {
    pub folder_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FileRenameToOption {
    OriginalName,
    FilenameSequence,
    DateFilename,
    CustomName,
    CustomNameSequence,
}

#[derive(Debug, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum FileRenameExtensionCase {
    Lower,
    Upper,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileRenaming {
    pub enable_renaming: bool,
    pub rename_to: FileRenameToOption,
    pub custom_name: String,
    pub start_number: Option<u32>,
    pub file_extensions_case: FileRenameExtensionCase,
}

#[derive(Debug, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ExportImageFormat {
    Jpeg,
    Png,
    // JpegXl,
    // Avif,
    // Psd,
    // Tiff,
    // Dng,
    // Webp,
    // Heic,
    // Heif,
}
impl fmt::Display for ExportImageFormat {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            ExportImageFormat::Jpeg => write!(f, "JPEG"),
            ExportImageFormat::Png => write!(f, "PNG"),
            // ExportImageFormat::JpegXl => write!(f, "JPEG XL"),
            // ExportImageFormat::Avif => write!(f, "AVIF"),
            // ExportImageFormat::Psd => write!(f, "PSD"),
            // ExportImageFormat::Tiff => write!(f, "TIFF"),
            // ExportImageFormat::Dng => write!(f, "DNG"),
            // ExportImageFormat::Webp => write!(f, "WebP"),
            // ExportImageFormat::Heic => write!(f, "HEIC"),
            // ExportImageFormat::Heif => write!(f, "HEIF"),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ColorSpace {
    Srgb,
    DisplayP3,
    AdobeRgb,
    ProphotoRgb,
    Rec2020,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileSettings {
    pub image_format: ExportImageFormat,
    pub quality: u8,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ResizeToFitOption {
    WidthAndHeight,
    Dimensions,
    LongEdge,
    ShortEdge,
    Megapixels,
    Pixels,
}

#[derive(Debug, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ResizeIn {
    Pixels,
    Inches,
    Cms,
}

#[derive(Debug, Serialize, Deserialize, Eq, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ResizeInOption {
    PixelsPerInch,
    PixelsPerCm,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageSizing {
    pub resize_enabled: bool,
    pub resize_to_fit: ResizeToFitOption,
    pub enlarge: bool,
    pub resize_width: f32,
    pub resize_height: f32,
    pub resize_size: f32,
    pub resize_size_megapixels: f32,
    pub resize_in: ResizeIn,
    pub resize_resolution: f32,
    pub resize_resolution_in: ResizeInOption,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportSettings {
    pub export_location: ExportLocation,
    pub file_settings: FileSettings,
    pub image_sizing: ImageSizing,
}

fn is_heif_image(image_path: &Path) -> bool {
    image_path
        .extension()
        .and_then(|ext| ext.to_str())
        .is_some_and(|ext| ext.eq_ignore_ascii_case("heif") || ext.eq_ignore_ascii_case("heic"))
}
pub fn is_raw_image(path: &Path) -> bool {
    let raw_image_extensions = [
        "raf", "cr2", "mrw", "arw", "srf", "sr2", "mef", "orf", "srw", "erf", "kdc", "dcs", "rw2",
        "dcr", "dng", "pef", "crw", "raw", "iiq", "3rf", "nrw", "nef", "mos", "ari",
    ];
    if let Some(extension) = path.extension() {
        let extension = extension.to_ascii_lowercase();
        let extension = extension.to_string_lossy();
        raw_image_extensions.contains(&extension.as_ref())
    } else {
        false
    }
}
pub fn load_heif_image(
    path: &Path,
) -> Result<DynamicImage, Box<dyn std::error::Error + Send + Sync>> {
    let path_str_res = path.to_str();
    if path_str_res.is_none() {
        return Err("Error converting path to string".into());
    }
    let path_str = path_str_res.unwrap();
    let read_ctx = HeifContext::read_from_file(path_str)?;
    let handle = read_ctx.primary_image_handle()?;

    let lib_heif = LibHeif::new();
    let image = lib_heif.decode(&handle, HeifColorSpace::Rgb(RgbChroma::Rgb), None)?;
    let planes = image.planes();
    let interleaved_plane_res = planes.interleaved;

    match interleaved_plane_res {
        Some(interleaved_plane) => {
            let width = interleaved_plane.width as usize;
            let height = interleaved_plane.height as usize;
            let stride = interleaved_plane.stride;
            let buffer: &[u8] = interleaved_plane.data;
            // If the stride > width * pixel_size (3 for rgb), we have to copy image rows one by one
            let rgb_image_res = if stride > width * 3 {
                // Need to handle stride - copy row by row
                let mut rgb_data = Vec::with_capacity(width * height * 3);
                for y in 0..height {
                    let row_start = y * stride;
                    let row_end = row_start + width * 3;
                    rgb_data.extend_from_slice(&buffer[row_start..row_end]);
                }
                image::RgbImage::from_raw(width as u32, height as u32, rgb_data)
            } else {
                // No stride handling needed
                image::RgbImage::from_raw(width as u32, height as u32, buffer.to_vec())
            };
            match rgb_image_res {
                Some(rgb_image) => {
                    let dyn_image = image::DynamicImage::ImageRgb8(rgb_image);
                    Ok(dyn_image)
                }
                None => Err("Error converting raw data to RgbImage".into()),
            }
        }
        None => Err("Error converting planes to interleaved planes during heif read".into()),
    }
}
/// Load raw image using libraw
pub fn load_raw_image_libraw(
    path: &Path,
) -> Result<DynamicImage, Box<dyn std::error::Error + Send + Sync>> {
    let buf = std::fs::read(path)?;

    let processor = libraw::Processor::new();
    let processed = processor.process_8bit(&buf)?;

    let width = processed.width() as u32;
    let height = processed.height() as u32;
    let buf = processed.deref().to_vec();

    let img_buffer_res: Option<image::ImageBuffer<image::Rgb<u8>, Vec<u8>>> =
        image::ImageBuffer::from_vec(width, height, buf);

    if let Some(img_buffer) = img_buffer_res {
        let dyn_img = image::DynamicImage::ImageRgb8(img_buffer);
        return Ok(dyn_img);
    }

    Err("Failed to create image buffer".into())
}
/// Get the actual size from the current size and the max size
/// If either width nor height is smaller or equal to max_width and max_height, the new size is
/// reduced to the larger of the two. If one of the max values is set to 0, the size in that dimension
/// is not restricted
pub fn restrict_size(
    (width, height): (u32, u32),
    (max_width, max_height): (u32, u32),
) -> (u32, u32) {
    if (width > max_width || height > max_height) && (max_width != 0 || max_height != 0) {
        let wratio = if max_width > 0 {
            max_width as f32 / width as f32
        } else {
            f32::MAX
        };
        let hratio = if max_height > 0 {
            max_height as f32 / height as f32
        } else {
            f32::MAX
        };

        let ratio = f32::min(wratio, hratio);

        let new_width = max((width as f32 * ratio).round() as u32, 1);
        let new_height = max((height as f32 * ratio).round() as u32, 1);
        (new_width, new_height)
    } else {
        (width, height)
    }
}
/// Resize an image buffer with the nearest neighbor method
/// Resize an image buffer with the nearest neighbor method
pub fn resize_image(
    dyn_image: DynamicImage,
    new_width: u32,
    new_height: u32,
) -> Result<DynamicImage, ResizeImageError> {
    // TODO: Can we handle both rgb8 (jpeg) and rgba8 (png) images here?
    // or rgba8 works for both already?
    let src_image = dyn_image.into_rgba8();
    let width = src_image.width();
    let height = src_image.height();
    let src_image_data = FirImage::from_vec_u8(
        NonZeroU32::new(width).unwrap(),
        NonZeroU32::new(height).unwrap(),
        src_image.into_raw(),
        PixelType::U8x4,
    )?;
    // let src_image_data = src_image_data_res.jk
    let mut dst_image = FirImage::new(
        NonZeroU32::new(new_width).unwrap(),
        NonZeroU32::new(new_height).unwrap(),
        src_image_data.pixel_type(),
    );
    let mut dst_view = dst_image.view_mut();

    let mut fast_resizer = Resizer::new(ResizeAlg::Nearest);

    fast_resizer.resize(&src_image_data.view(), &mut dst_view)?;
    // mul_div.divide_alpha_inplace(&mut dst_view)?;
    let image_buffer: ImageBuffer<Rgba<u8>, Vec<u8>> =
        ImageBuffer::from_raw(new_width, new_height, dst_image.buffer().to_vec()).unwrap();

    Ok(image_buffer.into())
}
pub fn resize_and_rotate(
    image: DynamicImage,
    rotate: i32,
    max_width: u32,
    max_height: u32,
) -> Result<DynamicImage, ResizeImageError> {
    let (new_width, new_height) =
        restrict_size((image.width(), image.height()), (max_width, max_height));
    match resize_image(image, new_width, new_height) {
        Ok(image) => Ok(match rotate {
            90 => image.rotate90(),
            180 => image.rotate180(),
            270 => image.rotate270(),
            _ => image,
        }),
        Err(e) => {
            warn!("Error resizing image: {:?}", e);
            Err(e)
        }
    }
}
fn resize_image_with_export_settings(
    image: DynamicImage,
    image_sizing: &ImageSizing,
) -> Result<DynamicImage, String> {
    let width = image.width();
    let height = image.height();
    let max_width: u32;
    let max_height: u32;

    let pixels_per_inch = if image_sizing.resize_resolution_in == ResizeInOption::PixelsPerInch {
        image_sizing.resize_resolution
    } else {
        image_sizing.resize_resolution * 2.54
    };
    let pixels_per_cm = if image_sizing.resize_resolution_in == ResizeInOption::PixelsPerCm {
        image_sizing.resize_resolution
    } else {
        image_sizing.resize_resolution / 2.54
    };

    match image_sizing.resize_to_fit {
        ResizeToFitOption::WidthAndHeight => {
            if image_sizing.resize_in == ResizeIn::Pixels {
                max_width = image_sizing.resize_width as u32;
                max_height = image_sizing.resize_height as u32;
            } else if image_sizing.resize_in == ResizeIn::Inches {
                max_width = (image_sizing.resize_width * pixels_per_inch) as u32;
                max_height = (image_sizing.resize_height * pixels_per_inch) as u32;
            } else {
                max_width = (image_sizing.resize_width * pixels_per_cm) as u32;
                max_height = (image_sizing.resize_height * pixels_per_cm) as u32;
            }
        }
        ResizeToFitOption::Dimensions => {
            // TODO - We don't support dimensions for now. It needs to consider the orientation somehow.
            if image_sizing.resize_in == ResizeIn::Pixels {
                max_width = image_sizing.resize_width as u32;
                max_height = image_sizing.resize_height as u32;
            } else if image_sizing.resize_in == ResizeIn::Inches {
                max_width = (image_sizing.resize_width * pixels_per_inch) as u32;
                max_height = (image_sizing.resize_height * pixels_per_inch) as u32;
            } else {
                max_width = (image_sizing.resize_width * pixels_per_cm) as u32;
                max_height = (image_sizing.resize_height * pixels_per_cm) as u32;
            }
        }
        ResizeToFitOption::LongEdge => {
            let size;
            if image_sizing.resize_in == ResizeIn::Pixels {
                size = image_sizing.resize_size as u32;
            } else if image_sizing.resize_in == ResizeIn::Inches {
                size = (image_sizing.resize_size * pixels_per_inch) as u32;
            } else {
                size = (image_sizing.resize_size * pixels_per_cm) as u32;
            }

            if width > height {
                max_height = 0;
                max_width = size;
            } else {
                max_width = 0;
                max_height = size;
            }
        }
        ResizeToFitOption::ShortEdge => {
            let size;
            if image_sizing.resize_in == ResizeIn::Pixels {
                size = image_sizing.resize_size as u32;
            } else if image_sizing.resize_in == ResizeIn::Inches {
                size = (image_sizing.resize_size * pixels_per_inch) as u32;
            } else {
                size = (image_sizing.resize_size * pixels_per_cm) as u32;
            }

            if width < height {
                max_height = 0;
                max_width = size;
            } else {
                max_width = 0;
                max_height = size;
            }
        }
        ResizeToFitOption::Megapixels => {
            let megapixels = image_sizing.resize_size_megapixels;
            let ratio = (megapixels * 1_000_000.0 / (width * height) as f32).sqrt();
            max_width = (width as f32 * ratio) as u32;
            max_height = (height as f32 * ratio) as u32;
        }
        ResizeToFitOption::Pixels => {
            max_width = image_sizing.resize_width as u32;
            max_height = image_sizing.resize_height as u32;
        }
    }

    let resized_image = resize_and_rotate(image, 0, max_width, max_height);
    match resized_image {
        Ok(resized_image) => Ok(resized_image),
        Err(e) => Err(format!("Error resizing image {e:?}")),
    }
}
fn convert_image_for_format(image: DynamicImage, image_format: &ExportImageFormat) -> DynamicImage {
    match image_format {
        ExportImageFormat::Jpeg => {
            // When we resize the file, we are converting it to rgba8. We use fast_image_resize
            // library to do that and it somehow works even for jpeg images. They shouldn't since
            // jpeg files don't have the alpha channel. But it does.
            // So we need to convert it back to rgb8 before saving it as jpeg.
            let image_buffer = image.to_rgb8();
            image::DynamicImage::ImageRgb8(image_buffer)
        }
        ExportImageFormat::Png => {
            let image_buffer = image.to_rgba8();
            image::DynamicImage::ImageRgba8(image_buffer)
        }
    }
}

fn save_image_to_disk(
    image_file: DynamicImage,
    export_file_path: &Path,
    export_settings: &ExportSettings,
) -> Result<(), String> {
    let parent_folder_path = export_file_path.parent().unwrap();
    if std::fs::create_dir_all(parent_folder_path).is_err() {
        return Err(format!("Error creating folder {export_file_path:?}"));
    }

    let image_format = &export_settings.file_settings.image_format;
    info!("Saving exported image to {export_file_path:?}");

    match image_format {
        ExportImageFormat::Jpeg => {
            let quality = export_settings.file_settings.quality;
            let mut buffer = Vec::new();
            let mut encoder =
                image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buffer, quality);
            encoder.encode_image(&image_file).unwrap();
            let save_result = std::fs::write(export_file_path, buffer);

            match save_result {
                Ok(_) => {
                    info!("Image successfully saved to {export_file_path:?}");
                    Ok(())
                }
                Err(e) => Err(format!("Error saving image - {e}")),
            }
        }
        ExportImageFormat::Png => {
            let save_result = image_file.save_with_format(export_file_path, ImageFormat::Png);
            match save_result {
                Ok(_) => Ok(()),
                Err(e) => Err(format!("Error saving image - {e}")),
            }
        }
    }
}
pub(crate) fn export_image(
    image_path: &str,
    export_settings: &ExportSettings,
) -> Result<(), String> {
    let image_file;
    let image_path = Path::new(image_path);
    let mut export_folder = Path::new(&export_settings.export_location.folder_path);
    let image_name_without_extension = image_path.file_stem().unwrap().to_string_lossy();
    if export_settings.export_location.folder_path.is_empty() {
        export_folder = image_path.parent().unwrap();
    }
    let export_file_path = export_folder.join(
        image_name_without_extension.to_string()
            + "_exported."
            + &export_settings.file_settings.image_format.to_string(),
    );

    if is_raw_image(image_path) {
        image_file = load_raw_image_libraw(image_path);
    } else if is_heif_image(image_path) {
        image_file = load_heif_image(image_path);
    } else {
        let image_open_result = image::open(image_path);
        if let Ok(image) = image_open_result {
            image_file = Ok(image);
        } else {
            image_file = Err(format!("Error loading image {:?}", image_open_result.err()).into());
        }
    }

    match image_file {
        Ok(mut image_file) => {
            // The order of applying the settings is important
            // Because converting image to a format and applying quality might need
            // to be done along with saving the image, which means quality and output
            // format should be applied at the end
            // We should start with resizing the image
            // We should return a vector of results since exporting some images might
            // fail due to some reason
            // resize_and_rotate takes the width and height arguments to mean the max width and
            // max height of the resized image. It finds the ratios of max width / original width
            // and max height / original height and uses the smaller of the two ratios to resize
            // If we send any one (max width or max height) as 0, it will resize the image based on
            // ratio calculated as per the other option
            // If we want to use the short edge and long edge options, we can first find the short
            // or long edge, and send the other max value as 0
            if export_settings.image_sizing.resize_enabled {
                let resized_image =
                    resize_image_with_export_settings(image_file, &export_settings.image_sizing);

                if let Ok(resized_image) = resized_image {
                    image_file = resized_image;
                } else {
                    return Err(format!("Error resizing image {image_path:?}"));
                }
            }

            let image_format = &export_settings.file_settings.image_format;
            image_file = convert_image_for_format(image_file, image_format);
            save_image_to_disk(image_file, &export_file_path, export_settings)
        }
        Err(e) => Err(format!("Error opening image {image_path:?} {e:?}")),
    }
}
