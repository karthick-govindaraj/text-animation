use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

// ─── Workspace structure ───

const WORKSPACE_DIRS: &[&str] = &[
    "assets/images",
    "assets/videos",
    "assets/audio",
    "assets/graphics",
    "assets/fonts",
    "cache/remote-images",
    "cache/thumbnails",
    "exports",
    "temp",
];

/// Result of creating / opening a workspace.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceInfo {
    pub root: String,
    pub project_file: String,
    pub created: bool,
}

/// Asset validation result.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetValidation {
    pub total: usize,
    pub valid: usize,
    pub missing: Vec<String>,
}

/// Create workspace directory structure at the given root. Returns info.
pub fn create_workspace(root: &Path) -> Result<WorkspaceInfo, String> {
    for dir in WORKSPACE_DIRS {
        let full = root.join(dir);
        fs::create_dir_all(&full)
            .map_err(|e| format!("Failed to create {}: {}", full.display(), e))?;
    }
    let project_file = root.join("project.json");
    let created = !project_file.exists();
    if created {
        fs::write(&project_file, "{}")
            .map_err(|e| format!("Failed to write project.json: {}", e))?;
    }
    Ok(WorkspaceInfo {
        root: root.to_string_lossy().into_owned(),
        project_file: project_file.to_string_lossy().into_owned(),
        created,
    })
}

/// Open an existing workspace (validates structure, creates missing dirs).
pub fn open_workspace(root: &Path) -> Result<WorkspaceInfo, String> {
    if !root.exists() {
        return Err(format!("Workspace root does not exist: {}", root.display()));
    }
    create_workspace(root)
}

// ─── Asset operations ───

/// Copy a local file into the workspace assets directory.
/// Returns the workspace-relative path.
pub fn import_local_asset(
    workspace_root: &Path,
    source_path: &Path,
    category: &str,
) -> Result<String, String> {
    let valid_categories = ["images", "videos", "audio", "graphics", "fonts"];
    if !valid_categories.contains(&category) {
        return Err(format!("Invalid asset category: {}", category));
    }
    if !source_path.exists() {
        return Err(format!("Source file not found: {}", source_path.display()));
    }

    let file_name = source_path
        .file_name()
        .ok_or("Source has no filename")?
        .to_string_lossy()
        .into_owned();

    // Sanitize filename
    let safe_name: String = file_name
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '.' || c == '-' || c == '_' { c } else { '_' })
        .collect();

    let dest_dir = workspace_root.join("assets").join(category);
    fs::create_dir_all(&dest_dir)
        .map_err(|e| format!("Failed to create asset dir: {}", e))?;
    let dest = dest_dir.join(&safe_name);
    fs::copy(source_path, &dest)
        .map_err(|e| format!("Failed to copy asset: {}", e))?;

    let relative = format!("assets/{}/{}", category, safe_name);
    Ok(relative)
}

/// Download and cache a remote image URL. Returns the local cache path.
/// Supports fallback URLs: tries each in order.
pub fn cache_remote_image(
    workspace_root: &Path,
    urls: &[String],
) -> Result<String, String> {
    if urls.is_empty() {
        return Err("No URLs provided".to_string());
    }

    let cache_dir = workspace_root.join("cache/remote-images");
    fs::create_dir_all(&cache_dir)
        .map_err(|e| format!("Failed to create cache dir: {}", e))?;

    // Generate a stable filename from the first URL
    let hash = simple_hash(urls[0].as_bytes());
    let ext = url_extension(&urls[0]).unwrap_or_else(|| "png".to_string());
    let cache_name = format!("{:016x}.{}", hash, ext);
    let cache_path = cache_dir.join(&cache_name);

    // If already cached, return immediately
    if cache_path.exists() && fs::metadata(&cache_path).map(|m| m.len() > 0).unwrap_or(false) {
        return Ok(cache_path.to_string_lossy().into_owned());
    }

    // Try each URL in order
    let mut last_err = String::new();
    for url in urls {
        match download_url(url, &cache_path) {
            Ok(()) => return Ok(cache_path.to_string_lossy().into_owned()),
            Err(e) => {
                last_err = format!("URL {} failed: {}", url, e);
                log::warn!("{}", last_err);
            }
        }
    }

    Err(format!("All URLs failed. Last error: {}", last_err))
}

fn download_url(url: &str, dest: &Path) -> Result<(), String> {
    let resp = ureq::get(url)
        .call()
        .map_err(|e| format!("HTTP error: {}", e))?;

    let mut bytes = Vec::new();
    resp.into_reader()
        .read_to_end(&mut bytes)
        .map_err(|e| format!("Read error: {}", e))?;

    if bytes.is_empty() {
        return Err("Empty response".to_string());
    }

    let mut file = fs::File::create(dest)
        .map_err(|e| format!("File create error: {}", e))?;
    file.write_all(&bytes)
        .map_err(|e| format!("Write error: {}", e))?;

    Ok(())
}

/// Validate all asset paths in a project. Returns validation result.
pub fn validate_project_assets(
    workspace_root: &Path,
    asset_paths: &[String],
) -> AssetValidation {
    let mut missing = Vec::new();
    for path in asset_paths {
        let full = resolve_asset_path(workspace_root, path);
        if !full.exists() {
            missing.push(path.clone());
        }
    }
    AssetValidation {
        total: asset_paths.len(),
        valid: asset_paths.len() - missing.len(),
        missing,
    }
}

/// Resolve a potentially relative asset path against the workspace root.
pub fn resolve_asset_path(workspace_root: &Path, asset_path: &str) -> PathBuf {
    let p = Path::new(asset_path);
    if p.is_absolute() {
        p.to_path_buf()
    } else {
        workspace_root.join(p)
    }
}

// ─── Helpers ───

fn simple_hash(data: &[u8]) -> u64 {
    let mut h: u64 = 0xcbf29ce484222325;
    for &b in data {
        h ^= b as u64;
        h = h.wrapping_mul(0x100000001b3);
    }
    h
}

fn url_extension(url: &str) -> Option<String> {
    let path = url.split('?').next()?;
    let last_segment = path.rsplit('/').next()?;
    let ext = last_segment.rsplit('.').next()?;
    let ext_lower = ext.to_lowercase();
    if ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].contains(&ext_lower.as_str()) {
        Some(ext_lower)
    } else {
        None
    }
}

// ─── Tauri commands ───

#[tauri::command]
pub fn create_workspace_cmd(root: String) -> Result<WorkspaceInfo, String> {
    create_workspace(Path::new(&root))
}

#[tauri::command]
pub fn open_workspace_cmd(root: String) -> Result<WorkspaceInfo, String> {
    open_workspace(Path::new(&root))
}

#[tauri::command]
pub fn cache_remote_image_cmd(
    workspace_root: String,
    urls: Vec<String>,
) -> Result<String, String> {
    cache_remote_image(Path::new(&workspace_root), &urls)
}

#[tauri::command]
pub fn validate_project_assets_cmd(
    workspace_root: String,
    asset_paths: Vec<String>,
) -> Result<AssetValidation, String> {
    Ok(validate_project_assets(
        Path::new(&workspace_root),
        &asset_paths,
    ))
}

#[tauri::command]
pub fn import_local_asset_cmd(
    workspace_root: String,
    source_path: String,
    category: String,
) -> Result<String, String> {
    import_local_asset(
        Path::new(&workspace_root),
        Path::new(&source_path),
        &category,
    )
}

#[tauri::command]
pub fn resolve_asset_path_cmd(
    workspace_root: String,
    asset_path: String,
) -> String {
    resolve_asset_path(Path::new(&workspace_root), &asset_path)
        .to_string_lossy()
        .into_owned()
}

// ─── Tests ───

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_create_workspace() {
        let tmp = std::env::temp_dir().join("test_workspace_create");
        let _ = fs::remove_dir_all(&tmp);
        let info = create_workspace(&tmp).unwrap();
        assert!(info.created);
        assert!(tmp.join("assets/images").is_dir());
        assert!(tmp.join("cache/remote-images").is_dir());
        assert!(tmp.join("exports").is_dir());
        assert!(tmp.join("project.json").exists());
        let _ = fs::remove_dir_all(&tmp);
    }

    #[test]
    fn test_open_workspace_nonexistent() {
        let result = open_workspace(Path::new("/nonexistent/path/xyz"));
        assert!(result.is_err());
    }

    #[test]
    fn test_resolve_relative_path() {
        let root = Path::new("/workspace/myproject");
        let resolved = resolve_asset_path(root, "assets/images/foo.png");
        assert_eq!(
            resolved,
            PathBuf::from("/workspace/myproject/assets/images/foo.png")
        );
    }

    #[test]
    fn test_resolve_absolute_path() {
        let root = Path::new("/workspace/myproject");
        let resolved = resolve_asset_path(root, "/absolute/path/foo.png");
        assert_eq!(resolved, PathBuf::from("/absolute/path/foo.png"));
    }

    #[test]
    fn test_validate_assets() {
        let tmp = std::env::temp_dir().join("test_workspace_validate");
        let _ = fs::remove_dir_all(&tmp);
        create_workspace(&tmp).unwrap();

        // Create a test asset
        let img_dir = tmp.join("assets/images");
        fs::write(img_dir.join("exists.png"), b"fake").unwrap();

        let result = validate_project_assets(
            &tmp,
            &[
                "assets/images/exists.png".to_string(),
                "assets/images/missing.png".to_string(),
            ],
        );
        assert_eq!(result.total, 2);
        assert_eq!(result.valid, 1);
        assert_eq!(result.missing, vec!["assets/images/missing.png"]);

        let _ = fs::remove_dir_all(&tmp);
    }

    #[test]
    fn test_import_invalid_category() {
        let tmp = std::env::temp_dir().join("test_workspace_import");
        let result = import_local_asset(&tmp, Path::new("/some/file.txt"), "invalid");
        assert!(result.is_err());
    }

    #[test]
    fn test_simple_hash_deterministic() {
        let h1 = simple_hash(b"hello");
        let h2 = simple_hash(b"hello");
        assert_eq!(h1, h2);
        assert_ne!(h1, simple_hash(b"world"));
    }

    #[test]
    fn test_url_extension() {
        assert_eq!(url_extension("https://example.com/img.jpg"), Some("jpg".to_string()));
        assert_eq!(url_extension("https://example.com/img.PNG?w=100"), Some("png".to_string()));
        assert_eq!(url_extension("https://example.com/noext"), None);
    }

    #[test]
    fn test_cache_remote_image_no_urls() {
        let tmp = std::env::temp_dir().join("test_workspace_cache_empty");
        let result = cache_remote_image(&tmp, &[]);
        assert!(result.is_err());
    }
}
