import { createHash } from "node:crypto";

export const ALLOWED_CANDIDATE_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain"
] as const;
const ALLOWED_CANDIDATE_UPLOAD_MIME_TYPE_SET = new Set<string>(
  ALLOWED_CANDIDATE_UPLOAD_MIME_TYPES
);

export const MAX_CANDIDATE_UPLOAD_BYTES = 5 * 1024 * 1024;

type CandidateResumeUploadInput = {
  actingUserId: string;
  employerUserId: string;
  employerJobId: string;
  candidateFullName: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
};

type CandidateResumeUploadPlan = {
  storagePath: string;
  normalizedFileName: string;
  mimeType: string;
  fileSizeBytes: number;
};

type CandidateResumeUploadResult =
  | {
      ok: true;
      data: CandidateResumeUploadPlan;
      errors: [];
    }
  | {
      ok: false;
      data: null;
      errors: string[];
    };

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function safeExtension(fileName: string): string {
  const parts = fileName.split(".");
  const ext = parts.length > 1 ? parts.at(-1) ?? "" : "";
  const cleaned = ext.toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleaned.length > 0 ? cleaned : "bin";
}

function buildDeterministicHash(input: CandidateResumeUploadInput): string {
  const payload = [
    input.employerUserId,
    input.employerJobId,
    input.candidateFullName.trim().toLowerCase(),
    input.fileName.trim().toLowerCase()
  ].join("|");

  return createHash("sha256").update(payload).digest("hex").slice(0, 10);
}

function buildStoragePath(input: CandidateResumeUploadInput): string {
  const candidateSlug = normalizeSlug(input.candidateFullName) || "candidate";
  const extension = safeExtension(input.fileName);
  const hash = buildDeterministicHash(input);

  return `employers/${input.employerUserId}/jobs/${input.employerJobId}/candidates/${candidateSlug}-${hash}.${extension}`;
}

export function prepareCandidateResumeUpload(
  input: CandidateResumeUploadInput
): CandidateResumeUploadResult {
  if (input.actingUserId !== input.employerUserId) {
    return {
      ok: false,
      data: null,
      errors: ["Unauthorized candidate upload write attempt."]
    };
  }

  const errors: string[] = [];

  if (!hasText(input.candidateFullName)) {
    errors.push("candidateFullName is required.");
  }

  if (!hasText(input.mimeType) || !ALLOWED_CANDIDATE_UPLOAD_MIME_TYPE_SET.has(input.mimeType)) {
    errors.push("mimeType is not allowed for candidate uploads.");
  }

  if (!Number.isFinite(input.fileSizeBytes) || input.fileSizeBytes <= 0) {
    errors.push("fileSizeBytes must be greater than 0.");
  } else if (input.fileSizeBytes > MAX_CANDIDATE_UPLOAD_BYTES) {
    errors.push(`fileSizeBytes must be less than or equal to ${MAX_CANDIDATE_UPLOAD_BYTES}.`);
  }

  if (!hasText(input.actingUserId)) {
    errors.push("actingUserId is required.");
  }

  if (!hasText(input.employerUserId)) {
    errors.push("employerUserId is required.");
  }

  if (!hasText(input.employerJobId)) {
    errors.push("employerJobId is required.");
  }

  if (!hasText(input.fileName)) {
    errors.push("fileName is required.");
  }

  if (errors.length > 0) {
    return {
      ok: false,
      data: null,
      errors
    };
  }

  return {
    ok: true,
    data: {
      storagePath: buildStoragePath(input),
      normalizedFileName: input.fileName,
      mimeType: input.mimeType,
      fileSizeBytes: input.fileSizeBytes
    },
    errors: []
  };
}
