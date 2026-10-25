import assert from "node:assert/strict";
import { test } from "node:test";
import mermaid from "mermaid";
import { diagramConfig } from "./diagram-theme.ts";

test("PR Mermaid directives and frontmatter cannot override the app palette", async () => {
  for (const [dark, soft] of [
    [false, false],
    [true, false],
    [true, true],
  ]) {
    for (const source of [
      "%%{init: {'theme': 'neutral', 'themeVariables': {'background': '#fff'}, 'themeCSS': '.node {fill:white}'}}%%\nflowchart TD",
      "---\nconfig:\n  theme: forest\n  themeVariables:\n    background: '#fff'\n---\nflowchart TD",
    ]) {
      const theme = diagramConfig(dark, soft);
      mermaid.initialize(theme);
      await mermaid.mermaidAPI.getDiagramFromText(source);
      const config = mermaid.mermaidAPI.getConfig();
      assert.equal(config.theme, "base");
      assert.equal(config.themeVariables?.background, theme.themeVariables?.background);
      assert.equal(config.themeCSS, theme.themeCSS);
      assert.equal(config.securityLevel, "strict");
    }
  }
});
