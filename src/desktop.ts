import { isTauri } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';

const JSON_FILTER = {
  name: 'JSON Project',
  extensions: ['json']
};

const MP4_FILTER = {
  name: 'MP4 Video',
  extensions: ['mp4']
};

export function isDesktopApp() {
  try {
    return isTauri();
  } catch {
    return false;
  }
}

export async function openProjectJsonFromDesktop() {
  const selected = await open({
    multiple: false,
    directory: false,
    filters: [JSON_FILTER]
  });

  if (!selected || Array.isArray(selected)) {
    return null;
  }

  return {
    path: selected,
    contents: await readTextFile(selected)
  };
}

export async function saveProjectJsonToDesktop(defaultFilename: string, contents: string) {
  const selected = await save({
    defaultPath: defaultFilename,
    filters: [JSON_FILTER]
  });

  if (!selected) {
    return null;
  }

  await writeTextFile(selected, contents);
  return selected;
}

export async function selectMp4OutputPath(defaultFilename: string) {
  return save({
    defaultPath: defaultFilename,
    filters: [MP4_FILTER]
  });
}
