export function markdownImageSource(src: string) {
  if (/^(https?:|data:|blob:)/i.test(src)) {
    const raw = src.replace(
      /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\//,
      "https://raw.githubusercontent.com/$1/$2/",
    );
    return { kind: "remote" as const, src: raw };
  }
  // A protocol-relative URL is remote too; never treat it as a repository file.
  if (src.startsWith("//")) return { kind: "remote" as const, src: `https:${src}` };
  if (/^[a-z][a-z\d+.-]*:/i.test(src)) return { kind: "remote" as const, src: "" };
  let decoded: string;
  try {
    decoded = decodeURIComponent(src.split(/[?#]/)[0]);
  } catch {
    decoded = src.split(/[?#]/)[0];
  }
  const parts: string[] = [];
  for (const part of decoded.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return { kind: "repository" as const, path: parts.join("/") };
}
