import { createContext, useContext, useState, type ComponentProps } from "react";
import { useQuery } from "@tanstack/react-query";
import { core } from "../queries";
import { markdownImageSource } from "./markdown-images";
import { match, P } from "ts-pattern";

export type MarkdownImageRepository = { workspaceId: number; head: string; url: string };
export const MarkdownImageContext = createContext<MarkdownImageRepository | undefined>(undefined);

export function MarkdownImage({ src, alt, ...props }: ComponentProps<"img">) {
  const repository = useContext(MarkdownImageContext);
  const original = typeof src === "string" ? src : "";
  const source = markdownImageSource(original);
  const path = source.kind === "repository" ? source.path : "";
  const file = useQuery({
    ...core("readFileAt", repository?.workspaceId ?? 0, repository?.head ?? "", path),
    enabled: !!repository && !!path,
  });
  const resolved = match({ source, repository })
    .with({ source: { kind: "remote" } }, ({ source }) => source.src)
    .with({ repository: P.nonNullable }, () =>
      file.data?.status === "ok" ? file.data.image : undefined,
    )
    .otherwise(() => original);
  const [failed, setFailed] = useState<string | undefined>();
  const unavailable =
    (source.kind === "remote" && !source.src) ||
    (failed !== undefined && failed === resolved) ||
    (!!repository && !!path && (file.isError || (!!file.data && !resolved)));
  const href = match({ source, repository })
    .with(
      { source: { kind: "repository" }, repository: P.nonNullable },
      ({ repository }) =>
        `${repository.url}/blob/${repository.head}/${path.split("/").map(encodeURIComponent).join("/")}`,
    )
    .with({ source: { kind: "remote", src: "" } }, () => undefined)
    .otherwise(() => original);
  if (unavailable || !original)
    return (
      <span className="markdown-image-unavailable text-xs text-neutral-500" title={href}>
        {alt ? `${alt} · Image unavailable` : "Image unavailable"}
      </span>
    );
  if (!resolved) return <span className="text-xs text-neutral-500">Loading image…</span>;
  return (
    <img
      {...props}
      src={resolved}
      alt={alt ?? ""}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(resolved)}
    />
  );
}
