import express from "express";
import multer from "multer";
import crypto from "crypto";

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const {
  PORT = 4545,
  MEDIA_GATEWAY_TOKEN,
  NEXTCLOUD_URL,
  NEXTCLOUD_USERNAME,
  NEXTCLOUD_PASSWORD,
  NEXTCLOUD_BASE_FOLDER = "/Pindeck",
} = process.env;

if (!MEDIA_GATEWAY_TOKEN) {
  console.warn("MEDIA_GATEWAY_TOKEN is not set");
}
if (!NEXTCLOUD_URL || !NEXTCLOUD_USERNAME || !NEXTCLOUD_PASSWORD) {
  console.warn("Nextcloud credentials are not fully set");
}

app.use(express.json({ limit: "2mb" }));

const authHeader = (req) => {
  const header = req.headers["authorization"] || "";
  if (header.startsWith("Bearer ")) return header.slice(7);
  return req.headers["x-media-gateway-token"] || "";
};

const requireAuth = (req, res, next) => {
  const token = authHeader(req);
  if (!MEDIA_GATEWAY_TOKEN || token !== MEDIA_GATEWAY_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

const toWebdavUrl = (path) => {
  const base = NEXTCLOUD_URL?.replace(/\/$/, "") || "";
  return `${base}/remote.php/dav/files/${encodeURIComponent(NEXTCLOUD_USERNAME)}/${path.replace(/^\//, "")}`;
};

const toOcsUrl = () => {
  const base = NEXTCLOUD_URL?.replace(/\/$/, "") || "";
  return `${base}/ocs/v2.php/apps/files_sharing/api/v1/shares`;
};

const authHeaders = () => ({
  Authorization: "Basic " + Buffer.from(`${NEXTCLOUD_USERNAME}:${NEXTCLOUD_PASSWORD}`).toString("base64"),
});

const ensureFolder = async (folderPath) => {
  const parts = folderPath.replace(/^\//, "").split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current += `${part}/`;
    const url = toWebdavUrl(current);
    const res = await fetch(url, {
      method: "MKCOL",
      headers: authHeaders(),
    });
    if (![201, 405, 301, 403].includes(res.status)) {
      // 405 means already exists
      const text = await res.text().catch(() => "");
      console.warn("MKCOL failed", res.status, text);
    }
  }
};

const shareFile = async (path) => {
  const res = await fetch(toOcsUrl(), {
    method: "POST",
    headers: {
      ...authHeaders(),
      "OCS-APIRequest": "true",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      path: `/${path.replace(/^\//, "")}`,
      shareType: "3",
      permissions: "1",
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`OCS share failed: ${res.status} ${text}`);
  }

  // Parse the URL from XML response
  const urlMatch = text.match(/<url>([^<]+)<\/url>/);
  const idMatch = text.match(/<id>([^<]+)<\/id>/);
  const shareUrl = urlMatch ? urlMatch[1] : null;
  const shareId = idMatch ? idMatch[1] : null;
  return {
    shareUrl,
    shareId,
    publicUrl: shareUrl ? `${shareUrl.replace(/\/$/, "")}/download` : null,
  };
};

const safeFilename = (name, fallbackExt = "png") => {
  const base = name?.replace(/[^a-zA-Z0-9._-]/g, "_") || "file";
  if (base.includes(".")) return base;
  return `${base}.${fallbackExt}`;
};

app.post("/upload", requireAuth, upload.single("file"), async (req, res) => {
  try {
    const { userId, folder } = req.body || {};
    if (!userId) return res.status(400).json({ error: "userId required" });
    if (!req.file) return res.status(400).json({ error: "file required" });

    const now = new Date();
    const yyyyMm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const baseFolder = folder || `${NEXTCLOUD_BASE_FOLDER}/${userId}/${yyyyMm}`;
    const filename = safeFilename(req.file.originalname, req.file.mimetype.split("/")[1] || "png");
    const path = `${baseFolder}/${Date.now()}-${filename}`.replace(/^\//, "");

    await ensureFolder(baseFolder);

    const uploadRes = await fetch(toWebdavUrl(path), {
      method: "PUT",
      headers: {
        ...authHeaders(),
        "Content-Type": req.file.mimetype,
      },
      body: req.file.buffer,
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text().catch(() => "");
      return res.status(500).json({ error: `Upload failed: ${uploadRes.status} ${text}` });
    }

    const share = await shareFile(path);
    return res.json({
      publicUrl: share.publicUrl,
      shareId: share.shareId,
      path,
      mime: req.file.mimetype,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Upload failed" });
  }
});

app.post("/import", requireAuth, async (req, res) => {
  try {
    const { sourceUrl, userId, filename, folder } = req.body || {};
    if (!userId) return res.status(400).json({ error: "userId required" });
    if (!sourceUrl) return res.status(400).json({ error: "sourceUrl required" });

    const response = await fetch(sourceUrl);
    if (!response.ok) {
      return res.status(400).json({ error: `Failed to fetch sourceUrl: ${response.status}` });
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const buffer = Buffer.from(await response.arrayBuffer());

    const now = new Date();
    const yyyyMm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const baseFolder = folder || `${NEXTCLOUD_BASE_FOLDER}/${userId}/${yyyyMm}`;

    const ext = contentType.split("/")[1] || "png";
    const derivedName = filename || `import-${crypto.randomBytes(6).toString("hex")}.${ext}`;
    const safeName = safeFilename(derivedName, ext);
    const path = `${baseFolder}/${Date.now()}-${safeName}`.replace(/^\//, "");

    await ensureFolder(baseFolder);

    const uploadRes = await fetch(toWebdavUrl(path), {
      method: "PUT",
      headers: {
        ...authHeaders(),
        "Content-Type": contentType,
      },
      body: buffer,
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text().catch(() => "");
      return res.status(500).json({ error: `Import upload failed: ${uploadRes.status} ${text}` });
    }

    const share = await shareFile(path);
    return res.json({
      publicUrl: share.publicUrl,
      shareId: share.shareId,
      path,
      mime: contentType,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Import failed" });
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`media-gateway listening on ${PORT}`);
});
