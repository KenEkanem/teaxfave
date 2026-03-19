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
}) {
  if (!APPS_SCRIPT_URL) {
    return null;
  }

  const files = await Promise.all(
    args.files.map(async (file) => ({
      name: file.name,
      type: file.type || "application/octet-stream",
      contentBase64: await fileToBase64(file),
    })),
  );

  const response = await postToAppsScript<{ photos: UploadedPhoto[] }>({
    action: "uploadPhotos",
    name: args.guest.name,
    email: args.guest.email,
    section: args.section,
    files,
  });

  return response.data?.photos ?? [];
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

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

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
