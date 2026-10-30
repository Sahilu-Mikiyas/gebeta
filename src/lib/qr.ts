import QRCode from "qrcode";

export function menuUrl(appUrl: string, slug: string): string {
  return `${appUrl.replace(/\/$/, "")}/m/${slug}?src=qr`;
}

export function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 2, color: { dark: "#0b0a0a", light: "#ffffff" } });
}

export function qrPng(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, { type: "png", errorCorrectionLevel: "M", margin: 2, width: 1200 });
}

export function appUrlFrom(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const u = new URL(req.url);
  const proto = req.headers.get("x-forwarded-proto") ?? u.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? u.host;
  return `${proto}://${host}`;
}
