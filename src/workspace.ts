import { invoke } from '@tauri-apps/api/core';

export interface WorkspaceInfo {
  root: string;
  projectFile: string;
  created: boolean;
}

export interface AssetValidation {
  total: number;
  valid: number;
  missing: string[];
}

export async function createWorkspace(root: string): Promise<WorkspaceInfo> {
  return invoke('create_workspace_cmd', { root });
}

export async function openWorkspace(root: string): Promise<WorkspaceInfo> {
  return invoke('open_workspace_cmd', { root });
}

export async function cacheRemoteImage(
  workspaceRoot: string,
  urls: string[],
): Promise<string> {
  return invoke('cache_remote_image_cmd', { workspaceRoot, urls });
}

export async function validateProjectAssets(
  workspaceRoot: string,
  assetPaths: string[],
): Promise<AssetValidation> {
  return invoke('validate_project_assets_cmd', { workspaceRoot, assetPaths });
}

export async function importLocalAsset(
  workspaceRoot: string,
  sourcePath: string,
  category: string,
): Promise<string> {
  return invoke('import_local_asset_cmd', { workspaceRoot, sourcePath, category });
}

export async function resolveAssetPath(
  workspaceRoot: string,
  assetPath: string,
): Promise<string> {
  return invoke('resolve_asset_path_cmd', { workspaceRoot, assetPath });
}
