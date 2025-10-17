import type { RequestHandler } from "express";
import type { CrimeCase, CreateCaseInput, UpdateCaseInput, CaseMedia } from "@shared/api";
import multer from "multer";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { useSupabase, supabase, ensureBuckets } from "../lib/supabase";

const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || "";
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, "_");
    cb(null, `${base}-${unique}${ext}`);
  },
});

// Allowed MIME types per field
const IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);
const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime", // .mov
  "video/x-msvideo", // .avi
  "video/3gpp",
]);

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const field = file.fieldname;
    const mimetype = (file.mimetype || "").toLowerCase();
    const reqAny = req as any;
    reqAny.rejectedUploads = reqAny.rejectedUploads || [];

    if (field === "images") {
      if (IMAGE_MIME_TYPES.has(mimetype)) return cb(null, true);
      reqAny.rejectedUploads.push({ field, originalname: file.originalname, mimetype, reason: "invalid_mime" });
      return cb(null, false);
    }
    if (field === "videos") {
      if (VIDEO_MIME_TYPES.has(mimetype)) return cb(null, true);
      reqAny.rejectedUploads.push({ field, originalname: file.originalname, mimetype, reason: "invalid_mime" });
      return cb(null, false);
    }
    // Unexpected field: reject
    reqAny.rejectedUploads.push({ field, originalname: file.originalname, mimetype, reason: "unexpected_field" });
    return cb(null, false);
  },
});

// Simple short-lived idempotency cache to prevent duplicate uploads on quick refresh
// Key: `${caseId}:${originalname}:${size}`
const recentUploadKeys = new Map<string, number>();
const IDEMPOTENCY_TTL_MS = 2 * 60 * 1000; // 2 minutes
function makeUploadKey(caseId: string, originalname: string, size: number) {
  return `${caseId}:${originalname}:${size}`;
}
function sweepIdempotencyCache() {
  const now = Date.now();
  for (const [k, ts] of recentUploadKeys.entries()) {
    if (now - ts > IDEMPOTENCY_TTL_MS) recentUploadKeys.delete(k);
  }
}

// In-memory DB fallback
const cases = new Map<string, CrimeCase>();

function nowISO() {
  return new Date().toISOString();
}

function normalizeRow(row: any) {
  if (!row) return row;
  const base = process.env.SUPABASE_URL?.replace(/\/$/, "") ?? '';
  const mapped: any = {
    id: row.id,
    code: row.code,
    title: row.title,
    place: row.place ?? row.place,
    description: row.description ?? row.description,
    crimeType: row.crime_type ?? row.crimeType,
    date: row.date,
    hour: row.hour,
    status: row.status,
    latitude: row.latitude !== undefined ? Number(row.latitude) : row.latitude,
    longitude: row.longitude !== undefined ? Number(row.longitude) : row.longitude,
    suspect: row.suspect ?? row.suspect,
    victim: row.victim ?? row.victim,
    cuadrante: row.cuadrante !== undefined ? Number(row.cuadrante) : row.cuadrante,
    sector: row.sector !== undefined ? Number(row.sector) : row.sector,
    escapeRoute: row.escape_route ?? row.escapeRoute,
    suspectDescription: row.suspect_description ?? row.suspectDescription,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
    // media normalization later
  };
  if (Array.isArray(row.media)) {
    mapped.media = row.media.map((m: any) => ({
      ...m,
      url: m.url && m.url.startsWith("/") ? `${base}${m.url}` : m.url,
    }));
  } else {
    mapped.media = [];
  }
  return mapped;
}

async function dbListCases() {
  if (!useSupabase) return Array.from(cases.values());
  const { data } = await supabase.from("cases").select(`*, media(*)`).order("created_at", { ascending: false });
  return (data as any[]).map(normalizeRow);
}

async function dbGetCase(id: string) {
  if (!useSupabase) return cases.get(id) || null;
  const { data } = await supabase.from("cases").select(`*, media(*)`).eq("id", id).limit(1).single();
  if (!data) return null;
  return normalizeRow(data) || null;
}

async function dbCreateCase(body: CreateCaseInput) {
  if (!useSupabase) {
    const id = randomUUID();
    const createdAt = nowISO();
    const item: CrimeCase = {
      id,
      code: Number(body.code),
      title: body.title,
      place: body.place ?? "",
      description: body.description ?? "",
      crimeType: body.crimeType,
      date: body.date,
      hour: body.hour,
      status: body.status,
      latitude: Number(body.latitude),
      longitude: Number(body.longitude),
      suspect: body.suspect ?? undefined,
      victim: body.victim ?? undefined,
      cuadrante: body.cuadrante !== undefined ? Number(body.cuadrante) : undefined,
      sector: body.sector !== undefined ? Number(body.sector) : undefined,
      escapeRoute: body.escapeRoute ?? undefined,
      suspectDescription: body.suspectDescription ?? undefined,
      createdAt,
      updatedAt: createdAt,
      media: [],
    };
    cases.set(id, item);
    return item;
  }

  const payload: any = {
    code: Number(body.code),
    title: body.title,
    place: body.place ?? null,
    description: body.description ?? null,
    crime_type: body.crimeType,
    date: body.date,
    hour: body.hour,
    status: body.status,
    latitude: body.latitude !== undefined ? Number(body.latitude) : null,
    longitude: body.longitude !== undefined ? Number(body.longitude) : null,
    suspect: body.suspect ?? null,
    victim: body.victim ?? null,
    cuadrante: body.cuadrante !== undefined ? Number(body.cuadrante) : null,
    sector: body.sector !== undefined ? Number(body.sector) : null,
    escape_route: body.escapeRoute ?? null,
    suspect_description: body.suspectDescription ?? null,
  };

  const { data, error } = await supabase.from("cases").insert([payload]).select().limit(1).single();
  if (error) throw error;
  // fetch media separately
  const caseRow = { ...data, media: [] };
  return caseRow as any;
}

async function dbUpdateCase(id: string, body: UpdateCaseInput) {
  if (!useSupabase) {
    const existing = cases.get(id);
    if (!existing) return null;
    const updated: CrimeCase = {
      ...existing,
      ...body,
      code: body.code !== undefined ? Number(body.code) : existing.code,
      date: body.date ?? existing.date,
      hour: body.hour ?? existing.hour,
      latitude: body.latitude !== undefined ? Number(body.latitude) : existing.latitude,
      longitude: body.longitude !== undefined ? Number(body.longitude) : existing.longitude,
      cuadrante: body.cuadrante !== undefined ? Number(body.cuadrante) : existing.cuadrante,
      sector: body.sector !== undefined ? Number(body.sector) : existing.sector,
      updatedAt: nowISO(),
    };
    cases.set(id, updated);
    return updated;
  }

  const payload: any = {};
  for (const k of Object.keys(body)) payload[k] = (body as any)[k];
  // map client keys to DB columns
  if (payload.crimeType) payload.crime_type = payload.crimeType, delete payload.crimeType;
  if (payload.escapeRoute) payload.escape_route = payload.escapeRoute, delete payload.escapeRoute;
  if (payload.suspectDescription) payload.suspect_description = payload.suspectDescription, delete payload.suspectDescription;

  const { data, error } = await supabase.from("cases").update(payload).eq("id", id).select().limit(1).single();
  if (error) throw error;
  return { ...data, media: [] } as any;
}

async function dbDeleteCase(id: string) {
  if (!useSupabase) {
    const existing = cases.get(id);
    if (!existing) return false;
    for (const m of existing.media) {
      const filePath = path.join(uploadsDir, path.basename(m.url));
      try {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {}
    }
    cases.delete(id);
    return true;
  }

  // delete media storage objects
  const { data: medias } = await supabase.from("media").select("*").eq("case_id", id);
  if (medias) {
    for (const m of medias) {
      try {
        await supabase.storage.from("uploads").remove([m.url.replace(/^\//, "")]);
      } catch (e) {}
    }
  }
  const { error } = await supabase.from("cases").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export const listCases: RequestHandler = async (_req, res) => {
  try {
    const data = await dbListCases();
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message || String(e) });
  }
};

export const getCase: RequestHandler = async (req, res) => {
  try {
    const item = await dbGetCase(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (e: any) {
    res.status(500).json({ error: e.message || String(e) });
  }
};

export const createCase: RequestHandler = async (req, res) => {
  try {
    const body = req.body as CreateCaseInput;
    if (!body || !body.title || body.code === undefined || !body.crimeType || !body.date || !body.hour || body.latitude === undefined || body.longitude === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (useSupabase) await ensureBuckets();
    const item = await dbCreateCase(body);
    res.status(201).json(item);
  } catch (e: any) {
    console.error('createCase error', e);
    res.status(500).json({ error: e.message || String(e) });
  }
};

export const updateCase: RequestHandler = async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await dbGetCase(id);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const body = req.body as UpdateCaseInput;
    const updated = await dbUpdateCase(id, body);
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message || String(e) });
  }
};

export const deleteCase: RequestHandler = async (req, res) => {
  try {
    const id = req.params.id;
    const ok = await dbDeleteCase(id);
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || String(e) });
  }
};

export const uploadMedia = [
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "videos", maxCount: 5 },
  ]),
  (async (req, res) => {
    const id = req.params.id;
    const existing = await dbGetCase(id);
    if (!existing) return res.status(404).json({ error: "Not found" });

    const files = (req as any).files as Record<string, any[]> | undefined;
    const rejected = (req as any).rejectedUploads || [];
    const added: CaseMedia[] = [];
    if (files) {
      if (useSupabase) {
        try {
          await ensureBuckets();
        } catch (e) {
          console.warn('ensureBuckets failed', e);
        }
      }

      for (const [field, arr] of Object.entries(files)) {
        for (const f of arr) {
          const type = field === "videos" ? "video" : "image";
          const filename = f.filename;
          const originalname = f.originalname || filename;
          let size = 0;
          try {
            const filePath = path.join(uploadsDir, filename);
            size = fs.statSync(filePath).size;
          } catch {}

          // Idempotency: skip recent duplicates (name+size) for same case
          sweepIdempotencyCache();
          const key = makeUploadKey(id, originalname, size);
          if (recentUploadKeys.has(key)) {
            try {
              const filePath = path.join(uploadsDir, filename);
              if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            } catch {}
            rejected.push({ field, originalname, mimetype: f.mimetype, reason: "duplicate_recent" });
            continue;
          }
          recentUploadKeys.set(key, Date.now());
          let url = `/uploads/${filename}`;
          let storageResult: any = null;
          let insertResult: any = null;

          // Prefer Google Drive if enabled and credentials provided
          if (process.env.GOOGLE_DRIVE_ENABLED === 'true' && process.env.GOOGLE_SERVICE_ACCOUNT && process.env.GOOGLE_DRIVE_FOLDER_ID) {
            try {
              const filePath = path.join(uploadsDir, filename);
              const buffer = fs.readFileSync(filePath);
              const driveRes = await import('../lib/googleDrive').then(m => m.uploadFileToDrive(filename, buffer, f.mimetype, process.env.GOOGLE_DRIVE_FOLDER_ID, process.env.GOOGLE_SERVICE_ACCOUNT as string));
              // prefer thumbnail for preview if available, otherwise use embeddable link
              url = driveRes.thumbnailLink || driveRes.embeddable || driveRes.webContentLink || driveRes.webViewLink || `https://drive.google.com/uc?export=view&id=${driveRes.id}`;
              console.info(`Uploaded ${filename} to Google Drive: ${url}`);
              try { fs.unlinkSync(filePath); } catch (e) { console.warn('unlink failed', e); }
            } catch (e) {
              console.warn('Upload to Google Drive failed', e);
              // fallback to supabase if available
              if (useSupabase) {
                try {
                  const filePath = path.join(uploadsDir, filename);
                  const buffer = fs.readFileSync(filePath);
                  const uploadRes = await supabase.storage.from("uploads").upload(filename, buffer, { contentType: f.mimetype, upsert: false });
                  storageResult = uploadRes;
                  if (uploadRes.error) {
                    console.warn("Supabase upload error", uploadRes.error);
                  } else {
                    const base = process.env.SUPABASE_URL?.replace(/\/$/, "") ?? '';
                    // Supabase doesn't provide thumbnailLink by default; store public URL for the full object
                    url = `${base}/storage/v1/object/public/uploads/${encodeURIComponent(filename)}`;
                  }
                  try { fs.unlinkSync(filePath); } catch (e) { console.warn('unlink failed', e); }
                } catch (se) {
                  console.warn("Fallback upload to supabase failed", se);
                }
              }
            }
          } else if (useSupabase) {
            // Upload to Supabase storage
            try {
              const filePath = path.join(uploadsDir, filename);
              const buffer = fs.readFileSync(filePath);
              const uploadRes = await supabase.storage.from("uploads").upload(filename, buffer, { contentType: f.mimetype, upsert: false });
              storageResult = uploadRes;
              if (uploadRes.error) {
                console.warn("Supabase upload error", uploadRes.error);
              } else {
                const base = process.env.SUPABASE_URL?.replace(/\/$/, "") ?? '';
                url = `${base}/storage/v1/object/public/uploads/${encodeURIComponent(filename)}`;
              }
              try { fs.unlinkSync(filePath); } catch (e) { console.warn('unlink failed', e); }
            } catch (e) {
              console.warn("Upload to supabase failed", e);
            }
          }

          const media: CaseMedia = {
            id: randomUUID(),
            type,
            url,
            filename,
            createdAt: nowISO(),
          };

          // ensure url is absolute
          if (useSupabase && url && url.startsWith("/")) {
            const base = process.env.SUPABASE_URL?.replace(/\/$/, "") ?? '';
            url = `${base}${url}`;
          }

          // persist media metadata
          if (useSupabase) {
            try {
              const { data: inserted, error: insertErr } = await supabase.from("media").insert([{ case_id: id, type, url, filename }]).select().limit(1).single();
              insertResult = { data: inserted, error: insertErr };
              if (insertErr) {
                console.warn('Insert media metadata failed', insertErr);
              } else {
                // push returned record to added
                added.push(inserted as any);
              }
            } catch (e) {
              console.warn("Insert media metadata exception", e);
            }
          } else {
            existing.media.push(media);
            added.push(media);
          }

          // attach debug info for response if something failed
          if (useSupabase && ((storageResult && storageResult.error) || (insertResult && insertResult.error))) {
            // include debug warnings in the response body under "warnings"
            (res as any).locals = (res as any).locals || {};
            (res as any).locals.uploadWarnings = (res as any).locals.uploadWarnings || [];
            (res as any).locals.uploadWarnings.push({ filename, storageResult, insertResult });
          }
        }
      }
    }

    // If there were rejected uploads, include them in response warnings
    const warnings = (res as any).locals?.uploadWarnings ?? [];
    if (rejected.length > 0) {
      warnings.push({ type: "rejected_uploads", items: rejected });
    }

    // update case updatedAt
    if (!useSupabase) {
      existing.updatedAt = nowISO();
      cases.set(id, existing);
      res.json({ added, case: existing, warnings });
    } else {
      const fresh = await dbGetCase(id);
      res.json({ added, case: fresh, warnings });
    }
  }) as RequestHandler,
];

export const deleteMedia: RequestHandler = async (req, res) => {
  try {
    const { id, mediaId } = req.params as { id: string; mediaId: string };
    const existing = await dbGetCase(id);
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (!useSupabase) {
      const idx = existing.media.findIndex((m) => m.id === mediaId);
      if (idx === -1) return res.status(404).json({ error: "Media not found" });
      const [removed] = existing.media.splice(idx, 1);
      try {
        const filePath = path.join(uploadsDir, path.basename(removed.url));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch {}
      existing.updatedAt = nowISO();
      res.json({ success: true, case: existing });
    } else {
      // delete metadata + object
      const { data: meta } = await supabase.from("media").select("*").eq("id", mediaId).limit(1).single();
      if (!meta) return res.status(404).json({ error: "Media not found" });
      try {
        await supabase.storage.from("uploads").remove([meta.filename]);
      } catch (e) {}
      await supabase.from("media").delete().eq("id", mediaId);
      const fresh = await dbGetCase(id);
      res.json({ success: true, case: fresh });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message || String(e) });
  }
};

export const casesUploadMiddleware = upload; // exported in case needed
