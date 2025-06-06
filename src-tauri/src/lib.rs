use serde::{Deserialize, Serialize};
use std::process::Command;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
mod image_helpers;

#[cfg(not(target_os = "linux"))]
#[tauri::command]
fn show_item_in_folder(path: String) -> Result<(), String> {
    use std::path::PathBuf;

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .args(["/select,", &path]) // The comma after select is not a typo
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        let path_buf = PathBuf::from(&path);
        if path_buf.is_dir() {
            Command::new("open")
                .args([&path])
                .spawn()
                .map_err(|e| e.to_string())?;
        } else {
            Command::new("open")
                .args(["-R", &path])
                .spawn()
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ConvertError {
    image_id: u32,
    error_message: String,
}

#[tauri::command]
async fn convert_images(
    image_paths: Vec<String>,
    export_settings: image_helpers::ExportSettings,
) -> Result<Vec<ConvertError>, String> {
    let mut export_errors = vec![];

    // For each image path, read the image, make changes as per the export_settings and save the image to
    // export_settings.export_location.folder_path + export_settings.export_location.subfolder
    for image_path in image_paths.iter() {
        let export_result = image_helpers::export_image(image_path, &export_settings);

        if let Err(error_message) = export_result {
            let export_error = ConvertError {
                image_id: 0,
                error_message,
            };
            export_errors.push(export_error);
        }
    }
    Ok(export_errors)
}

#[tauri::command]
// Returns the base64 encoding of image on the file system
async fn load_image(image_path: String) -> Result<String, String> {
    let handle =
        tauri::async_runtime::spawn(
            async move { image_helpers::load_image_as_base64(&image_path) },
        );

    let handle_result = handle.await;

    match handle_result {
        Ok(res) => match res {
            Ok(base64_image) => Ok(base64_image),
            Err(e) => Err(format!("Error getting image {:?}", e)),
        },
        Err(e) => Err(format!("Error getting image {:?}", e)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            convert_images,
            show_item_in_folder,
            load_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
