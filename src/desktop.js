// Native file saving when the game runs as the Tauri desktop app.
// In a browser this module is never loaded.

export const isDesktop = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const FILTERS = {
  json: { name: 'Dungeon Forge map', extensions: ['json'] },
  png: { name: 'PNG picture', extensions: ['png'] },
};

// Ask where to save, then write the file. Returns the chosen path, or null if the player cancelled.
export async function saveWithDialog(name, blob) {
  const [{ save }, { writeFile }] = await Promise.all([import('@tauri-apps/plugin-dialog'), import('@tauri-apps/plugin-fs')]);
  const ext = name.split('.').pop().toLowerCase();
  const path = await save({ defaultPath: name, filters: FILTERS[ext] ? [FILTERS[ext]] : [] });
  if (!path) return null;
  await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
  return path;
}
