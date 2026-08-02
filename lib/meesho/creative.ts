import type { MeeshoCreatorWorkflow } from "./workflow-schema.ts";

export const MEESHO_CREATIVE_WIDTH = 1080;
export const MEESHO_CREATIVE_HEIGHT = 1920;
export const MEESHO_IMAGE_HEIGHT = 1152;

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

function wrapText(value: string, max = 31) {
  const words = value.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > max && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

export function buildMeeshoCreativeSvg(
  workflow: Pick<
    MeeshoCreatorWorkflow,
    "title" | "category" | "price" | "supplierName"
  >,
  embeddedImageDataUrl: string,
) {
  const titleLines = wrapText(workflow.title);
  const title = titleLines
    .map(
      (line, index) =>
        `<tspan x="72" dy="${index === 0 ? 0 : 76}">${escapeXml(line)}</tspan>`,
    )
    .join("");
  const supplier = workflow.supplierName
    ? ` · ${escapeXml(workflow.supplierName)}`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <rect width="1080" height="1920" fill="#f7fbfa"/>
  <rect width="1080" height="1152" fill="#e7f5f2"/>
  <image href="${embeddedImageDataUrl}" x="0" y="0" width="1080" height="1152" preserveAspectRatio="xMidYMid slice"/>
  <rect y="1152" width="1080" height="768" fill="#f7fbfa"/>
  <rect x="72" y="1222" width="212" height="52" rx="26" fill="#173f3a"/>
  <text x="178" y="1257" text-anchor="middle" font-family="Arial, sans-serif" font-size="25" font-weight="700" fill="#ffffff">MEESHO FIND</text>
  <text x="72" y="1365" font-family="Arial, sans-serif" font-size="62" font-weight="700" fill="#153b37">${title}</text>
  <text x="72" y="1690" font-family="Arial, sans-serif" font-size="31" fill="#476763">${escapeXml(workflow.category)}${supplier}</text>
  <text x="72" y="1795" font-family="Arial, sans-serif" font-size="72" font-weight="800" fill="#d54278">₹${Math.round(workflow.price).toLocaleString("en-IN")}</text>
  <text x="72" y="1860" font-family="Arial, sans-serif" font-size="27" fill="#5d7672">Comment LINK for product details · Price may change</text>
  <text x="1008" y="1860" text-anchor="end" font-family="Arial, sans-serif" font-size="24" fill="#78908c">#ad</text>
</svg>`;
}

export async function fetchImageAsDataUrl(url: string) {
  const response = await fetch(url, {
    headers: { accept: "image/avif,image/webp,image/jpeg,image/png" },
  });
  if (!response.ok)
    throw new Error(`Product image fetch failed (${response.status}).`);
  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  if (!contentType.startsWith("image/")) {
    throw new Error("The verified product image URL did not return an image.");
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:${contentType};base64,${btoa(binary)}`;
}
