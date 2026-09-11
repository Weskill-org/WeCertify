import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";

export const CANONICAL_VERIFY_DOMAIN = "certify.weskill.org";
export const CANONICAL_VERIFY_BASE_URL = "https://certify.weskill.org";

const ID_PATTERN = /\b[A-Z]{2,5}-\d{4}-\d{4,8}\b/i;

/**
 * Builds the canonical verification URL for a certificate.
 * Strictly resolves to https://certify.weskill.org/?id=<certificate_number>
 * by default so printed credentials, emails, and QR codes work universally.
 */
export function buildVerificationUrl(certificateNumber: string, baseOrigin?: string): string {
  const normalized = certificateNumber.trim().toUpperCase();
  const origin =
    baseOrigin &&
    !baseOrigin.includes("localhost") &&
    !baseOrigin.includes("127.0.0.1") &&
    !baseOrigin.includes("lovable")
      ? baseOrigin.replace(/\/+$/, "")
      : CANONICAL_VERIFY_BASE_URL;

  return `${origin}/?id=${encodeURIComponent(normalized)}`;
}

/**
 * Generates an SVG string representation of a QR code.
 */
export function generateQrCodeSvg(url: string, size = 120): string {
  return renderToStaticMarkup(
    React.createElement(QRCodeSVG, {
      value: url,
      size,
      level: "M",
      marginSize: 1,
      bgColor: "#FFFFFF",
      fgColor: "#000000",
    }),
  );
}

/**
 * Generates an SVG Data URI representation of a QR code suitable for <img> src.
 */
export function generateQrCodeDataUrl(url: string, size = 120): string {
  const svg = generateQrCodeSvg(url, size);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Generates the QR code data URI for a given certificate number pointing to certify.weskill.org.
 */
export function getCertificateQrCodeDataUrl(
  certificateNumber: string,
  size = 120,
  baseOrigin?: string,
): string {
  const verifyUrl = buildVerificationUrl(certificateNumber, baseOrigin);
  return generateQrCodeDataUrl(verifyUrl, size);
}

/**
 * QR payloads may be a bare certificate number, a verification URL
 * (?id= / ?cert= / ?certificate=), or a JSON blob. Pull the ID out of any of them.
 */
export function extractCertificateId(payload: string): string | null {
  const raw = payload.trim();
  if (!raw) return null;

  // Try URL query params first.
  try {
    const url = new URL(raw);
    for (const key of ["id", "cert", "certificate", "certificate_number", "number", "c"]) {
      const value = url.searchParams.get(key);
      if (value) return value.trim().toUpperCase();
    }
    const lastSegment = url.pathname.split("/").filter(Boolean).pop();
    if (lastSegment && ID_PATTERN.test(lastSegment)) return lastSegment.toUpperCase();
  } catch {
    // not a URL — keep going
  }

  // Try JSON payloads.
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      for (const key of ["id", "certificateNumber", "certificate_number", "cert", "number"]) {
        const value = parsed[key];
        if (typeof value === "string" && value.trim()) return value.trim().toUpperCase();
      }
    } catch {
      // fall through
    }
  }

  const match = raw.match(ID_PATTERN);
  if (match) return match[0].toUpperCase();

  if (/^[A-Za-z0-9-_/]{4,64}$/.test(raw)) return raw.toUpperCase();
  return null;
}
