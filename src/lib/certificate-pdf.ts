import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import QRCode from "qrcode";
import { buildVerificationUrl } from "./qr";

export interface CertificatePdfData {
  certificateNumber: string;
  holderName: string;
  certificationTitle: string;
  issueDate: string;
  expiryDate?: string | null;
  grade?: string | null;
  issuingAuthority?: string | null;
  status?: string | null;
  templateName?: string | null;
  templateData?: Record<string, string | null | undefined> | null;
  baseOrigin?: string;
}

/**
 * Sanitizes text to standard printable ASCII / Latin-1 so pdf-lib's standard
 * WinAnsi fonts never throw encoding errors on Unicode dashes, bullets, or stars.
 */
export function cleanText(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2022\u2219\u00B7]/g, "|")
    .replace(/[★☆✦✧◆◇]/g, "*")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generates an executive, high-resolution A4 Landscape certificate PDF (841.89 x 595.28 pt)
 * that dynamically adheres to the certificate's assigned template style and branding.
 */
export async function generateCertificatePdf(data: CertificatePdfData): Promise<Buffer> {
  const doc = await PDFDocument.create();

  // Standard A4 Landscape in PostScript points: 841.89 x 595.28
  const width = 841.89;
  const height = 595.28;
  const page = doc.addPage([width, height]);

  // Embed Fonts
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const timesRoman = await doc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const timesRomanItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);

  const tpl = data.templateData ?? {};
  const tplName = (data.templateName || "").toLowerCase();
  const certTitleLower = (data.certificationTitle || "").toLowerCase();

  const isInternship =
    tplName.includes("internship") ||
    certTitleLower.includes("intern") ||
    Boolean(tpl["intern_role"] || tpl["internship_period"] || tpl["mentor_name"]);

  const isEmerald =
    tplName.includes("emerald") ||
    tplName.includes("minimalist") ||
    Boolean(tpl["duration_hours"] || tpl["instructor_name"]);

  const isCrimson =
    tplName.includes("crimson") ||
    tplName.includes("executive") ||
    Boolean(tpl["board_chair"] || tpl["distinction_notes"]);

  const isRoyalBlue =
    tplName.includes("royal") ||
    tplName.includes("distinction") ||
    Boolean(tpl["chancellor_name"] || tpl["academic_honors"]);

  const isCyber =
    tplName.includes("cyber") ||
    tplName.includes("tech") ||
    Boolean(tpl["track_specialization"] || tpl["skills_verified"]);

  // Helper for safe text drawing
  const safeDrawText = (
    text: string,
    options: {
      x: number;
      y: number;
      size: number;
      font: typeof helvetica;
      color: ReturnType<typeof rgb>;
    },
  ) => {
    page.drawText(cleanText(text), options);
  };

  // Helper for centered text
  const drawCenteredText = (
    text: string,
    y: number,
    font: typeof helvetica,
    size: number,
    color: ReturnType<typeof rgb>,
  ) => {
    const sanitized = cleanText(text);
    const textWidth = font.widthOfTextAtSize(sanitized, size);
    page.drawText(sanitized, {
      x: (width - textWidth) / 2,
      y,
      size,
      font,
      color,
    });
  };

  const drawCornerDiamond = (
    cx: number,
    cy: number,
    size: number,
    color: ReturnType<typeof rgb>,
  ) => {
    page.drawRectangle({
      x: cx - size / 2,
      y: cy - size / 2,
      width: size,
      height: size,
      color,
      rotate: degrees(45),
    });
  };

  // Generate QR Code image buffer
  const verifyUrl = buildVerificationUrl(data.certificateNumber, data.baseOrigin);
  const qrPngBuffer = await QRCode.toBuffer(verifyUrl, {
    width: 256,
    margin: 1,
    color: {
      dark: isCyber ? "#0284c7" : isEmerald ? "#047857" : isInternship ? "#312e81" : "#0b1b33",
      light: "#ffffff",
    },
  });
  const qrImage = await doc.embedPng(qrPngBuffer);
  const authority = cleanText(
    data.issuingAuthority || "Weskill Certification Authority",
  ).toUpperCase();

  // =========================================================================
  // TEMPLATE 1: PRESTIGIOUS INTERNSHIP COMPLETION
  // =========================================================================
  if (isInternship) {
    const primaryIndigo = rgb(67 / 255, 56 / 255, 202 / 255); // #4338ca
    const accentPurple = rgb(99 / 255, 102 / 255, 241 / 255); // #6366f1
    const deepSlate = rgb(30 / 255, 27 / 255, 75 / 255); // #1e1b4b
    const textBody = rgb(51 / 255, 65 / 255, 85 / 255); // #334155
    const textMuted = rgb(100 / 255, 116 / 255, 139 / 255); // #64748b
    const bgParchment = rgb(255 / 255, 255 / 255, 255 / 255);
    const borderOuter = rgb(67 / 255, 56 / 255, 202 / 255);
    const borderInner = rgb(199 / 255, 210 / 255, 254 / 255); // #c7d2fe
    const badgeBg = rgb(238 / 255, 242 / 255, 255 / 255); // #eef2ff

    // Background
    page.drawRectangle({ x: 0, y: 0, width, height, color: bgParchment });

    // Outer & Inner Borders
    page.drawRectangle({
      x: 20,
      y: 20,
      width: width - 40,
      height: height - 40,
      borderColor: borderOuter,
      borderWidth: 3,
    });
    page.drawRectangle({
      x: 28,
      y: 28,
      width: width - 56,
      height: height - 56,
      borderColor: borderInner,
      borderWidth: 1.5,
    });

    // Top Header
    drawCornerDiamond(58, height - 53, 6, primaryIndigo);
    safeDrawText("INDUSTRY PRACTICUM & TALENT ACCELERATOR", {
      x: 68,
      y: height - 56,
      size: 9.5,
      font: helveticaBold,
      color: primaryIndigo,
    });
    safeDrawText(authority, {
      x: 50,
      y: height - 74,
      size: 14,
      font: helveticaBold,
      color: deepSlate,
    });

    // Verified Tenure Chip on Top Right
    const chipText = "VERIFIED INTERNSHIP TENURE";
    const chipWidth = helveticaBold.widthOfTextAtSize(chipText, 9) + 20;
    page.drawRectangle({
      x: width - 50 - chipWidth,
      y: height - 70,
      width: chipWidth,
      height: 22,
      color: badgeBg,
      borderColor: borderInner,
      borderWidth: 1,
    });
    safeDrawText(chipText, {
      x: width - 50 - chipWidth + 10,
      y: height - 64,
      size: 9,
      font: helveticaBold,
      color: primaryIndigo,
    });

    // Divider
    page.drawLine({
      start: { x: 50, y: height - 88 },
      end: { x: width - 50, y: height - 88 },
      thickness: 1,
      color: borderInner,
    });

    // Main Title
    drawCenteredText(
      "CREDENTIAL OF PROFESSIONAL COMPLETION",
      height - 120,
      helveticaBold,
      9.5,
      accentPurple,
    );
    drawCenteredText(
      "Certificate of Internship Completion",
      height - 148,
      timesRomanBold,
      27,
      deepSlate,
    );
    drawCenteredText("This proudly certifies that", height - 172, timesRomanItalic, 13, textMuted);

    // Recipient Name
    const rName = data.holderName || "Valued Intern";
    drawCenteredText(rName, height - 208, helveticaBold, 26, deepSlate);

    // Underline
    const nameW = helveticaBold.widthOfTextAtSize(rName, 26);
    page.drawLine({
      start: { x: (width - nameW) / 2 - 15, y: height - 215 },
      end: { x: (width + nameW) / 2 + 15, y: height - 215 },
      thickness: 2,
      color: accentPurple,
    });

    // Statement of conclusion
    drawCenteredText(
      "has successfully concluded an intensive professional internship in",
      height - 240,
      helvetica,
      12,
      textBody,
    );
    drawCenteredText(data.certificationTitle, height - 264, helveticaBold, 16, primaryIndigo);

    let descDivision = "";
    if (tpl["department"] && tpl["intern_role"]) {
      descDivision = `within the ${tpl["department"]} division as ${tpl["intern_role"]}.`;
    } else if (tpl["department"]) {
      descDivision = `within the ${tpl["department"]} division.`;
    } else if (tpl["intern_role"]) {
      descDivision = `serving as ${tpl["intern_role"]}.`;
    }
    if (descDivision) {
      drawCenteredText(descDivision, height - 286, helvetica, 11, textBody);
    }

    // Badges Row (Tenure, Capstone, Rating)
    const badges: string[] = [];
    if (tpl["internship_period"]) badges.push(`Tenure: ${tpl["internship_period"]}`);
    if (tpl["project_name"]) badges.push(`Capstone: ${tpl["project_name"]}`);
    if (data.grade) badges.push(`Rating: ${data.grade}`);

    const badgeY = height - 322;
    if (badges.length > 0) {
      const badgeText = badges.join("     |     ");
      const bWidth = helveticaBold.widthOfTextAtSize(badgeText, 10) + 32;
      page.drawRectangle({
        x: (width - bWidth) / 2,
        y: badgeY - 5,
        width: bWidth,
        height: 24,
        color: rgb(248 / 255, 250 / 255, 255 / 255),
        borderColor: borderInner,
        borderWidth: 1,
      });
      safeDrawText(badgeText, {
        x: (width - bWidth) / 2 + 16,
        y: badgeY + 3,
        size: 10,
        font: helveticaBold,
        color: deepSlate,
      });
    }

    // Bottom Divider
    page.drawLine({
      start: { x: 50, y: 155 },
      end: { x: width - 50, y: 155 },
      thickness: 1,
      color: borderInner,
    });

    // Left Signature: Mentor
    const mentorName = tpl["mentor_name"] || "Dr. Vikram Malhotra";
    page.drawLine({
      start: { x: 50, y: 95 },
      end: { x: 250, y: 95 },
      thickness: 1,
      color: borderInner,
    });
    safeDrawText(mentorName, {
      x: 50,
      y: 102,
      size: 11,
      font: helveticaBold,
      color: deepSlate,
    });
    safeDrawText("Engineering Mentor / Supervisor", {
      x: 50,
      y: 82,
      size: 9.5,
      font: helvetica,
      color: accentPurple,
    });

    // Center: QR Code & Registry Record
    const qrSize = 56;
    const qrX = (width - qrSize) / 2;
    const qrY = 70;
    page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
    drawCenteredText("certify.weskill.org", 58, helveticaBold, 8, accentPurple);
    drawCenteredText(data.certificateNumber, 48, helveticaBold, 10, deepSlate);
    drawCenteredText(`Issued: ${data.issueDate}`, 38, helvetica, 8, textMuted);

    // Right Signature: HR Director
    const hrDirector = tpl["hr_director"] || "Elena Vance";
    page.drawLine({
      start: { x: width - 250, y: 95 },
      end: { x: width - 50, y: 95 },
      thickness: 1,
      color: borderInner,
    });
    safeDrawText(hrDirector, {
      x: width - 250,
      y: 102,
      size: 11,
      font: helveticaBold,
      color: deepSlate,
    });
    safeDrawText("Director of People & Talent", {
      x: width - 250,
      y: 82,
      size: 9.5,
      font: helvetica,
      color: accentPurple,
    });

    const pdfBytes = await doc.save();
    return Buffer.from(pdfBytes);
  }

  // =========================================================================
  // TEMPLATE 2: MODERN MINIMALIST EMERALD
  // =========================================================================
  if (isEmerald) {
    const emeraldPrimary = rgb(5 / 255, 150 / 255, 105 / 255); // #059669
    const emeraldDark = rgb(4 / 255, 120 / 255, 87 / 255); // #047857
    const darkSlate = rgb(15 / 255, 23 / 255, 42 / 255); // #0f172a
    const borderInner = rgb(167 / 255, 243 / 255, 208 / 255); // #a7f3d0

    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
    page.drawRectangle({
      x: 22,
      y: 22,
      width: width - 44,
      height: height - 44,
      borderColor: emeraldPrimary,
      borderWidth: 3,
    });
    page.drawRectangle({
      x: 30,
      y: 30,
      width: width - 60,
      height: height - 60,
      borderColor: rgb(240 / 255, 253 / 255, 244 / 255),
      borderWidth: 6,
    });

    // Header
    safeDrawText("OFFICIAL ACCREDITATION", {
      x: 55,
      y: height - 58,
      size: 9.5,
      font: helveticaBold,
      color: emeraldPrimary,
    });
    safeDrawText(authority, {
      x: 55,
      y: height - 76,
      size: 14,
      font: helveticaBold,
      color: darkSlate,
    });

    // Authenticated chip
    page.drawRectangle({
      x: width - 170,
      y: height - 72,
      width: 115,
      height: 22,
      color: rgb(236 / 255, 253 / 255, 245 / 255),
      borderColor: borderInner,
      borderWidth: 1,
    });
    safeDrawText("AUTHENTICATED", {
      x: width - 158,
      y: height - 65,
      size: 9,
      font: helveticaBold,
      color: emeraldDark,
    });

    page.drawLine({
      start: { x: 55, y: height - 90 },
      end: { x: width - 55, y: height - 90 },
      thickness: 1,
      color: rgb(226 / 255, 232 / 255, 240 / 255),
    });

    drawCenteredText("Certificate of Achievement", height - 145, helveticaBold, 28, darkSlate);
    drawCenteredText(
      "This credential is officially conferred upon",
      height - 175,
      helvetica,
      13,
      rgb(100 / 255, 116 / 255, 139 / 255),
    );
    drawCenteredText(data.holderName || "Candidate", height - 215, helveticaBold, 27, emeraldDark);
    drawCenteredText(
      "for successfully demonstrating mastery and competence in",
      height - 250,
      helvetica,
      12,
      darkSlate,
    );
    drawCenteredText(data.certificationTitle, height - 276, helveticaBold, 17, darkSlate);

    // Badges (Hours, Grade)
    const emBadges: string[] = [];
    if (tpl["duration_hours"]) emBadges.push(`Scope: ${tpl["duration_hours"]}`);
    if (data.grade) emBadges.push(`Standing: ${data.grade}`);
    if (emBadges.length > 0) {
      drawCenteredText(emBadges.join("    |    "), height - 315, helveticaBold, 11, emeraldDark);
    }

    // Bottom
    page.drawLine({
      start: { x: 55, y: 140 },
      end: { x: width - 55, y: 140 },
      thickness: 1,
      color: rgb(226 / 255, 232 / 255, 240 / 255),
    });

    const instructor = tpl["instructor_name"] || "Lead Faculty Assessor";
    safeDrawText(instructor, { x: 55, y: 96, size: 11, font: helveticaBold, color: darkSlate });
    safeDrawText("Lead Faculty Assessor", {
      x: 55,
      y: 82,
      size: 9.5,
      font: helvetica,
      color: emeraldPrimary,
    });

    const qrSize = 56;
    page.drawImage(qrImage, {
      x: (width - qrSize) / 2,
      y: 65,
      width: qrSize,
      height: qrSize,
    });
    drawCenteredText(`REGISTRY: ${data.certificateNumber}`, 52, helveticaBold, 9.5, darkSlate);

    safeDrawText(`Issue Date: ${data.issueDate}`, {
      x: width - 180,
      y: 96,
      size: 10,
      font: helveticaBold,
      color: darkSlate,
    });
    safeDrawText(data.expiryDate ? `Valid: ${data.expiryDate}` : "Permanent Validity", {
      x: width - 180,
      y: 82,
      size: 9,
      font: helvetica,
      color: emeraldDark,
    });

    const pdfBytes = await doc.save();
    return Buffer.from(pdfBytes);
  }

  // =========================================================================
  // TEMPLATE 3: EXECUTIVE CRIMSON & IVORY
  // =========================================================================
  if (isCrimson) {
    const crimson = rgb(136 / 255, 19 / 255, 55 / 255); // #881337
    const goldAccent = rgb(180 / 255, 83 / 255, 9 / 255); // #b45309

    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(255 / 255, 251 / 255, 235 / 255),
    });
    page.drawRectangle({
      x: 22,
      y: 22,
      width: width - 44,
      height: height - 44,
      borderColor: crimson,
      borderWidth: 3.5,
    });
    page.drawRectangle({
      x: 30,
      y: 30,
      width: width - 60,
      height: height - 60,
      borderColor: goldAccent,
      borderWidth: 1,
    });

    drawCenteredText(
      "EXECUTIVE LEADERSHIP & GOVERNANCE",
      height - 60,
      helveticaBold,
      9,
      goldAccent,
    );
    drawCenteredText(authority, height - 78, helveticaBold, 15, crimson);
    drawCenteredText(
      "Executive Certificate of Excellence",
      height - 145,
      timesRomanBold,
      27,
      crimson,
    );
    drawCenteredText(
      "This officially recognizes the executive leadership of",
      height - 175,
      timesRomanItalic,
      13,
      rgb(100 / 255, 116 / 255, 139 / 255),
    );
    drawCenteredText(data.holderName || "Executive", height - 215, timesRomanBold, 28, crimson);
    drawCenteredText(
      "for exceptional performance and completion of",
      height - 250,
      helvetica,
      12,
      crimson,
    );
    drawCenteredText(data.certificationTitle, height - 276, helveticaBold, 17, goldAccent);

    if (tpl["distinction_notes"]) {
      drawCenteredText(tpl["distinction_notes"], height - 310, helveticaBold, 11, crimson);
    }

    const qrSize = 56;
    page.drawImage(qrImage, {
      x: (width - qrSize) / 2,
      y: 65,
      width: qrSize,
      height: qrSize,
    });
    drawCenteredText(data.certificateNumber, 52, helveticaBold, 9.5, crimson);

    const chair = tpl["board_chair"] || "Marcus Vance, MBA";
    safeDrawText(chair, { x: 55, y: 96, size: 11, font: helveticaBold, color: crimson });
    safeDrawText("Executive Director & Board Chair", {
      x: 55,
      y: 82,
      size: 9,
      font: helvetica,
      color: goldAccent,
    });

    safeDrawText(`Conferred: ${data.issueDate}`, {
      x: width - 180,
      y: 96,
      size: 10,
      font: helveticaBold,
      color: crimson,
    });

    const pdfBytes = await doc.save();
    return Buffer.from(pdfBytes);
  }

  // =========================================================================
  // TEMPLATE 4: ACADEMIC DISTINCTION / ROYAL BLUE
  // =========================================================================
  if (isRoyalBlue) {
    const royalBlue = rgb(30 / 255, 58 / 255, 138 / 255); // #1e3a8a
    const goldColor = rgb(217 / 255, 119 / 255, 6 / 255); // #d97706

    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
    page.drawRectangle({
      x: 22,
      y: 22,
      width: width - 44,
      height: height - 44,
      borderColor: royalBlue,
      borderWidth: 3,
    });
    page.drawRectangle({
      x: 30,
      y: 30,
      width: width - 60,
      height: height - 60,
      borderColor: goldColor,
      borderWidth: 1,
    });

    drawCenteredText("INSTITUTIONAL ACADEMIC SENATE", height - 60, helveticaBold, 9, goldColor);
    drawCenteredText(authority, height - 78, helveticaBold, 15, royalBlue);
    drawCenteredText(
      "Diploma of Academic Distinction",
      height - 145,
      timesRomanBold,
      27,
      royalBlue,
    );
    drawCenteredText(
      "Be it known to all that this diploma is awarded to",
      height - 175,
      timesRomanItalic,
      13,
      rgb(100 / 255, 116 / 255, 139 / 255),
    );
    drawCenteredText(data.holderName || "Scholar", height - 215, timesRomanBold, 28, royalBlue);
    drawCenteredText(
      "upon the recommendation of the Faculty for completing",
      height - 250,
      helvetica,
      12,
      royalBlue,
    );
    drawCenteredText(data.certificationTitle, height - 276, helveticaBold, 17, goldColor);

    if (tpl["academic_honors"]) {
      drawCenteredText(
        `Honors: ${tpl["academic_honors"]}`,
        height - 310,
        helveticaBold,
        11,
        goldColor,
      );
    }

    const qrSize = 56;
    page.drawImage(qrImage, {
      x: (width - qrSize) / 2,
      y: 65,
      width: qrSize,
      height: qrSize,
    });
    drawCenteredText(data.certificateNumber, 52, helveticaBold, 9.5, royalBlue);

    const chancellor = tpl["chancellor_name"] || "Prof. Arthur Pendelton";
    safeDrawText(chancellor, { x: 55, y: 96, size: 11, font: helveticaBold, color: royalBlue });
    safeDrawText("Dean & Chancellor", {
      x: 55,
      y: 82,
      size: 9,
      font: helvetica,
      color: goldColor,
    });

    safeDrawText(`Date: ${data.issueDate}`, {
      x: width - 180,
      y: 96,
      size: 10,
      font: helveticaBold,
      color: royalBlue,
    });

    const pdfBytes = await doc.save();
    return Buffer.from(pdfBytes);
  }

  // =========================================================================
  // TEMPLATE 5: CYBER TECH & ENGINEERING
  // =========================================================================
  if (isCyber) {
    const cyberNavy = rgb(15 / 255, 23 / 255, 42 / 255); // #0f172a
    const cyanAccent = rgb(2 / 255, 132 / 255, 199 / 255); // #0284c7

    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(248 / 255, 250 / 255, 252 / 255),
    });
    page.drawRectangle({
      x: 22,
      y: 22,
      width: width - 44,
      height: height - 44,
      borderColor: cyberNavy,
      borderWidth: 3,
    });
    page.drawRectangle({
      x: 30,
      y: 30,
      width: width - 60,
      height: height - 60,
      borderColor: cyanAccent,
      borderWidth: 1.5,
    });

    drawCenteredText(
      "ENGINEERING ACCREDITATION REGISTRY",
      height - 60,
      helveticaBold,
      9,
      cyanAccent,
    );
    drawCenteredText(authority, height - 78, helveticaBold, 15, cyberNavy);
    drawCenteredText(
      "Certificate of Technical Proficiency",
      height - 145,
      helveticaBold,
      27,
      cyberNavy,
    );
    drawCenteredText(
      "Verified technical competence conferred upon",
      height - 175,
      helvetica,
      13,
      rgb(100 / 255, 116 / 255, 139 / 255),
    );
    drawCenteredText(data.holderName || "Engineer", height - 215, helveticaBold, 28, cyanAccent);
    drawCenteredText(
      "for mastering comprehensive engineering criteria in",
      height - 250,
      helvetica,
      12,
      cyberNavy,
    );
    drawCenteredText(data.certificationTitle, height - 276, helveticaBold, 17, cyberNavy);

    const cyberMeta: string[] = [];
    if (tpl["track_specialization"]) cyberMeta.push(`Track: ${tpl["track_specialization"]}`);
    if (tpl["skills_verified"]) cyberMeta.push(`Verified Skills: ${tpl["skills_verified"]}`);
    if (cyberMeta.length > 0) {
      drawCenteredText(cyberMeta.join("   |   "), height - 310, helveticaBold, 10.5, cyanAccent);
    }

    const qrSize = 56;
    page.drawImage(qrImage, {
      x: (width - qrSize) / 2,
      y: 65,
      width: qrSize,
      height: qrSize,
    });
    drawCenteredText(data.certificateNumber, 52, helveticaBold, 9.5, cyberNavy);

    safeDrawText("Technical Evaluation Board", {
      x: 55,
      y: 96,
      size: 11,
      font: helveticaBold,
      color: cyberNavy,
    });
    safeDrawText("Verified Engineering Assessor", {
      x: 55,
      y: 82,
      size: 9,
      font: helvetica,
      color: cyanAccent,
    });

    safeDrawText(`Evaluated: ${data.issueDate}`, {
      x: width - 180,
      y: 96,
      size: 10,
      font: helveticaBold,
      color: cyberNavy,
    });

    const pdfBytes = await doc.save();
    return Buffer.from(pdfBytes);
  }

  // =========================================================================
  // TEMPLATE 6: CLASSIC NAVY & GOLD (DEFAULT FALLBACK)
  // =========================================================================
  const gold = rgb(201 / 255, 162 / 255, 39 / 255); // #c9a227
  const goldLight = rgb(235 / 255, 210 / 255, 130 / 255);
  const goldDark = rgb(161 / 255, 126 / 255, 20 / 255);
  const navy = rgb(11 / 255, 27 / 255, 51 / 255);
  const darkNavy = rgb(15 / 255, 23 / 255, 42 / 255);
  const slate = rgb(71 / 255, 85 / 255, 105 / 255);
  const emerald = rgb(5 / 255, 150 / 255, 105 / 255);

  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(253 / 255, 252 / 255, 248 / 255),
  });
  page.drawRectangle({
    x: 22,
    y: 22,
    width: width - 44,
    height: height - 44,
    borderColor: gold,
    borderWidth: 3,
  });
  page.drawRectangle({
    x: 30,
    y: 30,
    width: width - 60,
    height: height - 60,
    borderColor: goldLight,
    borderWidth: 1,
  });

  drawCornerDiamond(30, 30, 6, gold);
  drawCornerDiamond(width - 30, 30, 6, gold);
  drawCornerDiamond(30, height - 30, 6, gold);
  drawCornerDiamond(width - 30, height - 30, 6, gold);

  drawCenteredText(
    "OFFICIAL ACCREDITED CREDENTIAL  |  WESKILL VERIFICATION REGISTRY",
    height - 54,
    helveticaBold,
    8.5,
    goldDark,
  );
  drawCenteredText(authority, height - 74, helveticaBold, 15, darkNavy);

  const divY = height - 88;
  page.drawLine({
    start: { x: width / 2 - 140, y: divY },
    end: { x: width / 2 - 15, y: divY },
    thickness: 1,
    color: gold,
  });
  drawCornerDiamond(width / 2, divY, 5, gold);
  page.drawLine({
    start: { x: width / 2 + 15, y: divY },
    end: { x: width / 2 + 140, y: divY },
    thickness: 1,
    color: gold,
  });

  drawCenteredText("Certificate of Achievement", height - 128, timesRomanBold, 26, navy);
  drawCenteredText("This is to officially certify that", height - 152, timesRomanItalic, 13, slate);

  const recipientName = data.holderName || "Valued Recipient";
  drawCenteredText(recipientName, height - 192, timesRomanBold, 28, darkNavy);

  const nameWidth = timesRomanBold.widthOfTextAtSize(cleanText(recipientName), 28);
  page.drawLine({
    start: { x: (width - nameWidth) / 2 - 20, y: height - 198 },
    end: { x: (width + nameWidth) / 2 + 20, y: height - 198 },
    thickness: 1.5,
    color: gold,
  });

  drawCenteredText(
    "has successfully concluded all required coursework and demonstrated proven competence in",
    height - 226,
    helvetica,
    11.5,
    slate,
  );
  drawCenteredText(data.certificationTitle, height - 252, helveticaBold, 17, navy);

  if (data.grade && data.grade.trim().length > 0) {
    const gradeText = `Academic Standing: ${data.grade.trim()}`;
    const badgeWidth = helveticaBold.widthOfTextAtSize(cleanText(gradeText), 10.5) + 28;
    const badgeX = (width - badgeWidth) / 2;
    const badgeY = height - 286;
    page.drawRectangle({
      x: badgeX,
      y: badgeY,
      width: badgeWidth,
      height: 22,
      color: rgb(240 / 255, 253 / 255, 244 / 255),
      borderColor: emerald,
      borderWidth: 1,
    });
    safeDrawText(gradeText, {
      x: badgeX + 14,
      y: badgeY + 6,
      size: 10.5,
      font: helveticaBold,
      color: emerald,
    });
  }

  // Bottom 3 columns
  const bottomCardY = 56;
  safeDrawText("OFFICIAL REGISTRY RECORD", {
    x: 54,
    y: bottomCardY + 76,
    size: 8.5,
    font: helveticaBold,
    color: goldDark,
  });
  safeDrawText(data.certificateNumber, {
    x: 54,
    y: bottomCardY + 58,
    size: 13,
    font: helveticaBold,
    color: darkNavy,
  });
  safeDrawText(`Issue Date: ${data.issueDate}`, {
    x: 54,
    y: bottomCardY + 40,
    size: 10,
    font: helvetica,
    color: slate,
  });
  safeDrawText(
    data.expiryDate && data.expiryDate.trim().length > 0
      ? `Valid Until: ${data.expiryDate}`
      : "Validity: Permanent / Non-Expiring",
    {
      x: 54,
      y: bottomCardY + 24,
      size: 9.5,
      font: helvetica,
      color: slate,
    },
  );

  const qrSize = 64;
  page.drawImage(qrImage, {
    x: (width - qrSize) / 2,
    y: bottomCardY + 16,
    width: qrSize,
    height: qrSize,
  });
  drawCenteredText("SCAN TO VERIFY CREDENTIAL", bottomCardY + 2, helveticaBold, 7.5, goldDark);
  drawCenteredText("certify.weskill.org", bottomCardY - 8, helvetica, 7.5, slate);

  page.drawLine({
    start: { x: width - 230, y: bottomCardY + 44 },
    end: { x: width - 55, y: bottomCardY + 44 },
    thickness: 1,
    color: goldLight,
  });
  safeDrawText("Registrar & Academic Council", {
    x: width - 230,
    y: bottomCardY + 50,
    size: 10.5,
    font: helveticaBold,
    color: darkNavy,
  });
  safeDrawText(authority, {
    x: width - 230,
    y: bottomCardY + 30,
    size: 8.5,
    font: helveticaBold,
    color: goldDark,
  });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

export async function generateCertificatePdfBase64(data: CertificatePdfData): Promise<string> {
  const buf = await generateCertificatePdf(data);
  return buf.toString("base64");
}
