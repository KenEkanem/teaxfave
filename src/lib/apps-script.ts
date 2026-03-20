const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

export interface Guest {
  name: string;
  email: string;
}

export interface UploadedPhoto {
  id: string;
  src: string;
  contributor: string;
  section: string;
  ownerEmail?: string;
  uploaded: true;
}

interface UploadProgressState {
  currentFile: number;
  totalFiles: number;
  progress: number;
}

interface AppsScriptResponse<T> {
  ok: boolean;
  error?: string;
  data?: T;
}

export function hasAppsScriptBackend() {
  return Boolean(APPS_SCRIPT_URL);
}

export async function registerGuest(guest: Guest) {
  if (!APPS_SCRIPT_URL) {
    return guest;
  }

  const response = await postToAppsScript<Guest>({
    action: "registerGuest",
    name: guest.name,
    email: guest.email,
  });

  return response.data ?? guest;
}

export async function restoreGuestByEmail(email: string) {
  if (!APPS_SCRIPT_URL) {
    throw new Error("Returning guest lookup needs Apps Script enabled.");
  }

  const response = await postToAppsScript<Guest>({
    action: "findGuestByEmail",
    email,
  });

  return response.data;
}

export async function uploadGuestPhotos(args: {
  guest: Guest;
  section: string;
  files: File[];
  onProgress?: (state: UploadProgressState) => void;
}) {
  if (!APPS_SCRIPT_URL) {
    return null;
  }

  const uploadedPhotos: UploadedPhoto[] = [];
  const totalFiles = args.files.length;

  for (const [index, file] of args.files.entries()) {
    const currentFile = index + 1;

    args.onProgress?.({
      currentFile,
      totalFiles,
      progress: Math.round((index / totalFiles) * 100),
    });

    const contentBase64 = await fileToBase64(file, (fileProgress) => {
      const overallProgress = ((index + fileProgress * 0.8) / totalFiles) * 100;

      args.onProgress?.({
        currentFile,
        totalFiles,
        progress: Math.max(1, Math.min(99, Math.round(overallProgress))),
      });
    });

    args.onProgress?.({
      currentFile,
      totalFiles,
      progress: Math.max(1, Math.min(99, Math.round(((index + 0.9) / totalFiles) * 100))),
    });

    const response = await postToAppsScript<{ photos: UploadedPhoto[] }>({
      action: "uploadPhotos",
      name: args.guest.name,
      email: args.guest.email,
      section: args.section,
      files: [
        {
          name: file.name,
          type: file.type || "application/octet-stream",
          contentBase64,
        },
      ],
    });

    uploadedPhotos.push(...(response.data?.photos ?? []));

    args.onProgress?.({
      currentFile,
      totalFiles,
      progress: Math.round((currentFile / totalFiles) * 100),
    });
  }

  return uploadedPhotos;
}

export async function deleteGuestPhoto(args: {
  guest: Guest;
  photoId: string;
}) {
  if (!APPS_SCRIPT_URL) {
    return;
  }

  await postToAppsScript({
    action: "deletePhoto",
    name: args.guest.name,
    email: args.guest.email,
    photoId: args.photoId,
  });
}

export async function listGalleryPhotos() {
  if (!APPS_SCRIPT_URL) {
    return null;
  }

  const response = await postToAppsScript<{ photos: UploadedPhoto[] }>({
    action: "listPhotos",
  });

  return response.data?.photos ?? [];
}

async function postToAppsScript<T = unknown>(payload: Record<string, unknown>) {
  const response = await fetch(APPS_SCRIPT_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => null)) as AppsScriptResponse<T> | null;

  if (!response.ok || !body?.ok) {
    throw new Error(body?.error || "Apps Script request failed.");
  }

  return body;
}

function fileToBase64(file: File, onProgress?: (progress: number) => void) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) {
        return;
      }

      onProgress(event.loaded / event.total);
    };

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Unable to read file."));
        return;
      }

      const [, base64 = ""] = reader.result.split(",");
      resolve(base64);
    };

    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}
