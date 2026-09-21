import fs from "fs";
import path from "path";

/**
 * Salva imagem de avatar se vier codificada em Base64 Data URL.
 * Retorna a URL pública `/api/assets/thumbnails/...` ou null se for vazio/removido.
 */
export async function processAvatar(
  avatar: string | null | undefined,
  userIdHint: string
): Promise<string | null> {
  if (!avatar || typeof avatar !== "string" || !avatar.trim()) {
    return null;
  }

  const trimmed = avatar.trim();
  if (trimmed.startsWith("data:image/")) {
    const match = trimmed.match(/^data:image\/(\w+);base64,(.+)$/);
    if (match) {
      const ext = match[1] === "jpeg" ? "jpg" : match[1];
      const buffer = Buffer.from(match[2], "base64");
      const storageDataPath = process.env.STORAGE_DATA_PATH || "./data";
      const thumbsDir = path.resolve(path.join(storageDataPath, "thumbnails"));
      await fs.promises.mkdir(thumbsDir, { recursive: true });

      const fileName = `avatar_${userIdHint}_${Date.now()}.${ext}`;
      const targetPath = path.join(thumbsDir, fileName);
      await fs.promises.writeFile(targetPath, buffer);
      return `/api/assets/thumbnails/${fileName}`;
    }
  }

  return trimmed;
}
