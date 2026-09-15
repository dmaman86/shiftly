import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export const exportWorkTablePdf = async ({
  element,
  fileName,
}: {
  element: HTMLElement;
  fileName: string;
}) => {
  const canvas = await html2canvas(element, {
    backgroundColor: "#ffffff",
    logging: false,
    scale: 2,
    useCORS: true,
  });
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const margin = 8;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = (canvas.height * contentWidth) / canvas.width;
  const pageContentHeight = pageHeight - margin * 2;
  const image = canvas.toDataURL("image/png");
  const pageCount = Math.max(1, Math.ceil(contentHeight / pageContentHeight));

  for (let page = 0; page < pageCount; page += 1) {
    if (page > 0) pdf.addPage();
    pdf.addImage(
      image,
      "PNG",
      margin,
      margin - page * pageContentHeight,
      contentWidth,
      contentHeight,
    );
  }

  pdf.save(fileName);
};
