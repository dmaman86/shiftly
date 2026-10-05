import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorkDayStatus } from "@shiftly/domain";
import {
  GUEST_DRAFT_TTL_MS,
  guestDraftStorage,
  parseGuestDraft,
  type GuestDraft,
} from "@/services/guestDraft";

const DRAFT_KEY = "shiftly:guest-draft";
const PENDING_IMPORT_KEY = "shiftly:guest-draft:pending-import";
const savedAt = "2026-09-29T10:00:00.000Z";
const savedAtMs = Date.parse(savedAt);

const buildDraft = (overrides: Partial<GuestDraft> = {}): GuestDraft => ({
  version: 1,
  savedAt,
  year: 2026,
  month: 9,
  config: { standardHours: 6.67, baseRate: 45.5 },
  days: [{ date: "2026-09-10", status: WorkDayStatus.vacation }],
  shifts: [
    {
      id: "shift-1",
      date: "2026-09-01",
      start_time: "2026-09-01T05:00:00.000Z",
      end_time: "2026-09-01T14:00:00.000Z",
      is_duty: false,
    },
  ],
  ...overrides,
});

describe("parseGuestDraft", () => {
  it("accepts a valid draft", () => {
    const draft = buildDraft();

    expect(parseGuestDraft(draft)).toEqual(draft);
  });

  it.each([
    ["a non-object", "draft"],
    ["an unknown version", { ...buildDraft(), version: 2 }],
    ["an invalid savedAt", buildDraft({ savedAt: "not-a-date" })],
    ["a year before the system start", buildDraft({ year: 2014 })],
    ["a month out of range", buildDraft({ month: 13 })],
    [
      "a negative base rate",
      buildDraft({ config: { standardHours: 6.67, baseRate: -1 } }),
    ],
    [
      "a day outside the month",
      buildDraft({
        days: [{ date: "2026-10-01", status: WorkDayStatus.sick }],
      }),
    ],
    [
      "a persisted normal status",
      buildDraft({
        days: [{ date: "2026-09-10", status: WorkDayStatus.normal }],
      }),
    ],
    [
      "a shift outside the month",
      buildDraft({
        shifts: [{ ...buildDraft().shifts[0], date: "2026-10-01" }],
      }),
    ],
    [
      "a shift ending before it starts",
      buildDraft({
        shifts: [
          { ...buildDraft().shifts[0], end_time: "2026-09-01T04:00:00.000Z" },
        ],
      }),
    ],
    [
      "too many shifts",
      buildDraft({
        shifts: Array.from({ length: 201 }, () => buildDraft().shifts[0]),
      }),
    ],
  ])("rejects %s", (_case, value) => {
    expect(parseGuestDraft(value)).toBeNull();
  });
});

describe("guestDraftStorage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("restores the draft only after an explicit sign-in attempt", () => {
    const draft = buildDraft();
    guestDraftStorage.save(draft);
    guestDraftStorage.markPendingImport();

    expect(guestDraftStorage.readPending(savedAtMs)).toEqual(draft);
  });

  it("discards the draft on a plain reload without a pending import", () => {
    guestDraftStorage.save(buildDraft());

    expect(guestDraftStorage.readPending(savedAtMs)).toBeNull();
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it("keeps a pending draft until the sign-in outcome discards it", () => {
    const draft = buildDraft();
    guestDraftStorage.save(draft);
    guestDraftStorage.markPendingImport();

    expect(guestDraftStorage.readPending(savedAtMs)).toEqual(draft);
    expect(guestDraftStorage.readPending(savedAtMs)).toEqual(draft);

    guestDraftStorage.discard();

    expect(guestDraftStorage.readPending(savedAtMs)).toBeNull();
  });

  it("clears only the pending flag so a later reload starts empty", () => {
    guestDraftStorage.save(buildDraft());
    guestDraftStorage.markPendingImport();
    guestDraftStorage.clearPendingImport();

    expect(sessionStorage.getItem(PENDING_IMPORT_KEY)).toBeNull();
    expect(guestDraftStorage.readPending(savedAtMs)).toBeNull();
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it("ignores an expired draft", () => {
    guestDraftStorage.save(buildDraft());
    guestDraftStorage.markPendingImport();

    expect(
      guestDraftStorage.readPending(savedAtMs + GUEST_DRAFT_TTL_MS + 1),
    ).toBeNull();
  });

  it("ignores tampered or corrupted storage", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    sessionStorage.setItem(DRAFT_KEY, "{not json");
    guestDraftStorage.markPendingImport();

    expect(guestDraftStorage.readPending(savedAtMs)).toBeNull();
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      "Guest draft storage is unavailable",
      expect.any(SyntaxError),
    );
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(sessionStorage.getItem(PENDING_IMPORT_KEY)).toBeNull();
  });

  it("does not keep an empty draft", () => {
    guestDraftStorage.save(buildDraft());
    guestDraftStorage.save(buildDraft({ days: [], shifts: [] }));

    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it("degrades to no draft when storage is unavailable", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(guestDraftStorage.readPending(savedAtMs)).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  });
});
