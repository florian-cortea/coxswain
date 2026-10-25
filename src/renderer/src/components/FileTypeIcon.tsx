import { createFileTreeIconResolver, getBuiltInSpriteSheet } from "@pierre/trees";

const icons = createFileTreeIconResolver();
const sprite = getBuiltInSpriteSheet("complete");

// Pierre's trusted bundled SVG symbols, shared once by the Guide's file rows.
export function FileTypeIcons() {
  return <span hidden aria-hidden="true" dangerouslySetInnerHTML={{ __html: sprite }} />;
}
export function FileTypeIcon({ path }: { path: string }) {
  const icon = icons.resolveIcon("file-tree-icon-file", path);
  return (
    <svg aria-hidden="true" className="size-3.5 shrink-0" viewBox={icon.viewBox ?? "0 0 16 16"}>
      <use href={`#${icon.name}`} />
    </svg>
  );
}
