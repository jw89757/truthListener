// utils.js
import fs from 'fs/promises';

export async function loadJson(filepath, defaultValue) {
  try {
    const raw = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return defaultValue;
  }
}

export async function saveJson(filepath, data) {
  const contents = JSON.stringify(data, null, 2);
  await fs.writeFile(filepath, contents, 'utf-8');
}
