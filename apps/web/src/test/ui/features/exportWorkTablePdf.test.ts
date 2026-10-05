import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const jspdf = vi.hoisted(() => ({
  moduleLoads: 0,
  instances: [] as Array<{ options: unknown; save: ReturnType<typeof vi.fn> }>,
}));

// The factory runs only when "jspdf" is actually imported, which makes it a
// direct probe for whether the library is loaded eagerly or on demand.
vi.mock("jspdf", () => {
  jspdf.moduleLoads += 1;

  class FakeJsPdf {
    options: unknown;
    internal = {
      pageSize: { getWidth: () => 297, getHeight: () => 210 },
    };
    save = vi.fn();
    addFileToVFS = vi.fn();
    addFont = vi.fn();
    addPage = vi.fn();
    setFont = vi.fn();
    setFontSize = vi.fn();
    setR2L = vi.fn();
    setTextColor = vi.fn();
    setDrawColor = vi.fn();
    setFillColor = vi.fn();
    setLineWidth = vi.fn();
    rect = vi.fn();
    line = vi.fn();
    text = vi.fn();
    getTextWidth = (text: string) => text.length;
    splitTextToSize = (text: string) => [text];

    constructor(options: unknown) {
      this.options = options;
      jspdf.instances.push(this);
    }
  }

  return { jsPDF: FakeJsPdf };
});

import { exportWorkTablePdf } from "@/features/work-table/helpers/exportWorkTablePdf";

const buildWorkTable = () => {
  const element = document.createElement("div");
  element.innerHTML = `
    <h1>September 2026</h1>
    <div>Base rate 40</div>
    <table>
      <thead><tr><th>Day</th><th>Hours</th></tr></thead>
      <tbody>
        <tr data-week-end="true"><td>15</td><td>8</td></tr>
      </tbody>
      <tfoot><tr><td>Total</td><td>8</td></tr></tfoot>
    </table>`;
  return element;
};

describe("exportWorkTablePdf", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Uint8Array([1, 2, 3]))),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not load jsPDF until a user exports", async () => {
    expect(jspdf.moduleLoads).toBe(0);

    await expect(
      exportWorkTablePdf({
        element: document.createElement("div"),
        fileName: "missing-table.pdf",
      }),
    ).rejects.toThrow("Could not find the work table for PDF export");
    expect(jspdf.moduleLoads).toBe(0);
  });

  it("loads jsPDF on export and saves a landscape A4 document", async () => {
    await exportWorkTablePdf({
      element: buildWorkTable(),
      fileName: "shiftly-2026-09.pdf",
      metadata: { header: "Shiftly", footer: "Generated", direction: "ltr" },
    });

    expect(jspdf.moduleLoads).toBe(1);
    const pdf = jspdf.instances[jspdf.instances.length - 1];
    expect(pdf?.options).toEqual({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });
    expect(pdf?.save).toHaveBeenCalledWith("shiftly-2026-09.pdf");
  });
});
