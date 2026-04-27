import { describe, expect, it } from "vitest";

import {
  MAX_CANDIDATE_UPLOAD_BYTES,
  prepareCandidateResumeUpload
} from "@/lib/agents/candidate-intake/storage";

describe("candidate intake storage helper", () => {
  it("builds deterministic employer/job-scoped storage paths", () => {
    const input = {
      actingUserId: "a0d34ac9-9478-4f5c-86dc-cf0b8080fc20",
      employerUserId: "a0d34ac9-9478-4f5c-86dc-cf0b8080fc20",
      employerJobId: "f4f94b2a-8f97-4f6f-82bf-4f410ed6ebd4",
      candidateFullName: "Jamie Rivera",
      fileName: "Jamie_Rivera_Resume.PDF",
      mimeType: "application/pdf",
      fileSizeBytes: 217381
    };

    const first = prepareCandidateResumeUpload(input);
    const second = prepareCandidateResumeUpload(input);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);

    if (!first.ok || !second.ok) {
      throw new Error("Expected valid upload preparation result.");
    }

    expect(first.data.storagePath).toEqual(second.data.storagePath);
    expect(first.data.storagePath).toMatch(
      /^employers\/a0d34ac9-9478-4f5c-86dc-cf0b8080fc20\/jobs\/f4f94b2a-8f97-4f6f-82bf-4f410ed6ebd4\/candidates\/jamie-rivera-[a-f0-9]{10}\.pdf$/
    );
    expect(first.data.normalizedFileName).toBe("Jamie_Rivera_Resume.PDF");
  });

  it("rejects invalid metadata deterministically", () => {
    const result = prepareCandidateResumeUpload({
      actingUserId: "u-1",
      employerUserId: "u-1",
      employerJobId: "job-1",
      candidateFullName: "",
      fileName: "resume.exe",
      mimeType: "application/x-msdownload",
      fileSizeBytes: MAX_CANDIDATE_UPLOAD_BYTES + 1
    });

    expect(result).toEqual({
      ok: false,
      data: null,
      errors: [
        "candidateFullName is required.",
        "mimeType is not allowed for candidate uploads.",
        `fileSizeBytes must be less than or equal to ${MAX_CANDIDATE_UPLOAD_BYTES}.`
      ]
    });
  });

  it("blocks unauthorized write attempts", () => {
    const result = prepareCandidateResumeUpload({
      actingUserId: "user-a",
      employerUserId: "user-b",
      employerJobId: "job-1",
      candidateFullName: "Taylor Shaw",
      fileName: "resume.pdf",
      mimeType: "application/pdf",
      fileSizeBytes: 1000
    });

    expect(result).toEqual({
      ok: false,
      data: null,
      errors: ["Unauthorized candidate upload write attempt."]
    });
  });
});
