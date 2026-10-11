// مشاركة وحفظ الملفات: في التطبيق (Android) عبر Capacitor، وفي المتصفّح عبر Web Share أو تحميل
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { IMAGE_FILES, journalToBlob, type ImageMap } from '../journal/docx';
import { journalFileName, journalToCfg, type AppData } from './logic';
import type { Journal } from './types';

let imgCache: ImageMap | null = null;
async function images(): Promise<ImageMap> {
  if (imgCache) return imgCache;
  const entries = await Promise.all(IMAGE_FILES.map(async (f) => {
    const r = await fetch(`${import.meta.env.BASE_URL}assets/${f}`);
    return [f, new Uint8Array(await r.arrayBuffer())] as const;
  }));
  imgCache = Object.fromEntries(entries);
  return imgCache;
}

export async function journalBlob(data: AppData, j: Journal): Promise<Blob> {
  return journalToBlob(journalToCfg(data, j), await images());
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

const native = () => Capacitor.isNativePlatform();

/** مشاركة (واتساب، Drive، ...) */
export async function shareFile(blob: Blob, name: string, mime: string): Promise<void> {
  if (native()) {
    const w = await Filesystem.writeFile({ path: name, data: await toBase64(blob), directory: Directory.Cache });
    await Share.share({ title: name, files: [w.uri], dialogTitle: 'شارك الملف' });
    return;
  }
  const file = new File([blob], name, { type: mime });
  if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: name }); return; }
  download(blob, name);
}

/** حفظ في الهاتف: Documents/جورنالي */
export async function saveFile(blob: Blob, name: string): Promise<string> {
  if (native()) {
    const data = await toBase64(blob);
    try {
      await Filesystem.writeFile({ path: `جورنالي/${name}`, data, directory: Directory.Documents, recursive: true });
      return `Documents/جورنالي/${name}`;
    } catch {
      const w = await Filesystem.writeFile({ path: `جورنالي/${name}`, data, directory: Directory.External, recursive: true });
      return w.uri.replace(/^file:\/\//, '');
    }
  }
  download(blob, name);
  return name;
}

function download(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export { journalFileName };
