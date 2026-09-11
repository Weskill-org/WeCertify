import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/**
 * Converts a DOM element (such as a rendered certificate template) into a high-resolution
 * A4 Landscape PDF and returns it as a base64 encoded string.
 */
export async function renderElementToPdfBase64(element: HTMLElement): Promise<string> {
  // Ensure images within element are loaded
  const images = Array.from(element.getElementsByTagName("img"));
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    }),
  );

  const canvas = await html2canvas(element, {
    scale: 2.2, // 2.2x scale produces razor-sharp ~300 DPI text, borders, and QR codes
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    allowTaint: true,
  });

  const imgData = canvas.toDataURL("image/png");

  // A4 Landscape is 297mm wide x 210mm high
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pdfWidth = 297;
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  const yOffset = pdfHeight < 210 ? (210 - pdfHeight) / 2 : 0;

  pdf.addImage(imgData, "PNG", 0, yOffset, pdfWidth, Math.min(pdfHeight, 210));

  const dataUri = pdf.output("datauristring");
  return dataUri.split(",")[1] ?? "";
}

/**
 * Downloads a generated PDF directly in the user's browser.
 */
export function downloadPdfFromBase64(base64Data: string, filename: string): void {
  const link = document.createElement("a");
  link.href = `data:application/pdf;base64,${base64Data}`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
