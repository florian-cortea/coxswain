export type GuideAuthor = { name: string; isBot: boolean };
export function guideAuthorVisible(
  author: GuideAuthor,
  options: { hiddenAuthors: string[]; shownAuthors?: string[] },
): boolean {
  return (
    !options.hiddenAuthors.includes(author.name) &&
    (!author.isBot || !!options.shownAuthors?.includes(author.name))
  );
}
export const botLogin = (name: string) => /\[bot\]$|(?:^|[-_])bot$/i.test(name);
