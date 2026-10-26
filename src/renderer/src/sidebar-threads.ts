import type { ReviewEntry } from "../../core/review";
import type { GuideOptions } from "../../preload";
import { botLogin, guideAuthorVisible, type GuideAuthor } from "../../shared/guide-authors.ts";
import { isComment, threadAuthor } from "./format.ts";

export function visibleSidebarThreads<
  T extends Pick<ReviewEntry, "kind" | "author" | "parentId" | "resolvedAt" | "authorIsBot">,
>(entries: T[], options: GuideOptions, authors: GuideAuthor[]) {
  const identities = new Map(authors.map((author) => [author.name, author]));
  return entries.filter((entry) => {
    const name = threadAuthor(entry);
    return (
      !entry.parentId &&
      (options.showResolved || !entry.resolvedAt) &&
      guideAuthorVisible(
        { name, isBot: !!entry.authorIsBot || !!identities.get(name)?.isBot || botLogin(name) },
        options,
      ) &&
      (isComment(entry) ? options.showComments : options.showAgentThreads)
    );
  });
}
