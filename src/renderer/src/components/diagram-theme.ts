import type { MermaidConfig } from "mermaid";
import { match } from "ts-pattern";

// Preserve the saved Mermaid source; render decisions as dashed rounded boxes, as in the reference.
export function diagramPresentation(code: string, diagram: { type: string; db: unknown }): string {
  return match(diagram.type)
    .with("flowchart", "flowchart-v2", () => {
      const db = diagram.db as { getVertices?: () => Map<string, { type?: string }> };
      const decisions = [...(db.getVertices?.() ?? [])]
        .filter(([id, node]) => node.type === "diamond" && /^[\p{L}\p{N}_-]+$/u.test(id))
        .map(([id]) => `${id}@{ shape: rounded }\nclass ${id} coxswain-decision`);
      // ponytail: nonstandard node IDs keep their shape; extend the presentation serializer for escaped IDs if needed.
      return decisions.length ? `${code}\n${decisions.join("\n")}` : code;
    })
    .otherwise(() => code);
}

// The same settings render saved diagrams and validate new ones before the core accepts them.
export function diagramConfig(dark: boolean, softDark = false): MermaidConfig {
  const surface = match({ dark, softDark })
    .with({ softDark: true }, () => "#28292c")
    .with({ dark: true }, () => "#171717")
    .otherwise(() => "#ffffff");
  const darkVariant = (regular: string, soft: string) => (softDark ? soft : regular);
  const text = dark ? darkVariant("#e5e5e5", "#e5e6e9") : "#262626";
  const muted = dark ? "#a3a3a3" : "#737373";
  const border = dark ? darkVariant("#333333", "#36373b") : "#d4d4d4";
  const accent = dark ? "#a5b4fc" : "#4f46e5";
  const node = surface;
  const pill = match({ dark, softDark })
    .with({ softDark: true }, () => "#1f2023")
    .with({ dark: true }, () => "#111111")
    .otherwise(() => "#f5f5f5");
  const palette = [
    "#6366f1",
    "#0f766e",
    "#b45309",
    "#be185d",
    "#0369a1",
    "#7c3aed",
    "#4d7c0f",
    "#c2410c",
  ];
  return {
    startOnLoad: false,
    securityLevel: "strict",
    // PRs can carry init/frontmatter themes. Keep app contrast and styling authoritative.
    secure: [
      "secure",
      "securityLevel",
      "startOnLoad",
      "maxTextSize",
      "suppressErrorRendering",
      "maxEdges",
      "theme",
      "themeVariables",
      "themeCSS",
      "fontFamily",
      "look",
    ],
    theme: "base",
    look: "classic",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    themeVariables: {
      darkMode: dark,
      background: surface,
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      fontSize: "15px",
      radius: 16,
      strokeWidth: 1,
      useGradient: false,
      dropShadow: "none",
      primaryColor: node,
      primaryBorderColor: border,
      primaryTextColor: text,
      secondaryColor: dark ? darkVariant("#1e1e1e", "#303236") : "#fafafa",
      secondaryBorderColor: border,
      secondaryTextColor: text,
      tertiaryColor: dark ? darkVariant("#242424", "#313338") : "#f5f5f5",
      tertiaryBorderColor: border,
      tertiaryTextColor: text,
      lineColor: muted,
      textColor: text,
      titleColor: text,
      edgeLabelBackground: pill,
      clusterBkg: dark ? darkVariant("#1e1e1e", "#303236") : "#fafafa",
      clusterBorder: border,
      actorBkg: node,
      actorBorder: border,
      actorTextColor: text,
      actorLineColor: border,
      signalColor: muted,
      signalTextColor: text,
      labelBoxBkgColor: surface,
      labelBoxBorderColor: border,
      labelTextColor: text,
      loopTextColor: text,
      noteBkgColor: dark ? darkVariant("#1e1e1e", "#303236") : "#fafafa",
      noteBorderColor: border,
      noteTextColor: text,
      activationBkgColor: node,
      activationBorderColor: accent,
      ...Object.fromEntries(palette.map((color, i) => [`pie${i + 1}`, color])),
      pieOpacity: "1",
      pieStrokeColor: surface,
      pieStrokeWidth: "3px",
      pieOuterStrokeWidth: "0px",
      pieSectionTextColor: "#ffffff",
      pieTitleTextColor: text,
      pieLegendTextColor: text,
      pieTitleTextSize: "16px",
      pieSectionTextSize: "14px",
      pieLegendTextSize: "13px",
      xyChart: {
        plotColorPalette: palette.join(","),
        backgroundColor: surface,
        titleColor: text,
        xAxisLabelColor: muted,
        xAxisTitleColor: text,
        xAxisTickColor: border,
        xAxisLineColor: border,
        yAxisLabelColor: muted,
        yAxisTitleColor: text,
        yAxisTickColor: border,
        yAxisLineColor: border,
      },
    },
    flowchart: {
      nodeSpacing: 48,
      rankSpacing: 56,
      padding: 24,
      diagramPadding: 24,
      curve: "rounded",
    },
    sequence: {
      actorMargin: 60,
      height: 48,
      messageMargin: 36,
      diagramMarginX: 24,
      diagramMarginY: 24,
      mirrorActors: false,
      actorFontSize: 14,
      messageFontSize: 14,
      noteFontSize: 13,
    },
    themeCSS: `
      .node { filter: none; }
      .node rect, rect.actor { rx: 16px; ry: 16px; }
      .nodeLabel { font-weight: 600; }
      .coxswain-decision rect { fill: ${pill}; stroke-dasharray: 3 3; }
      .cluster rect { rx: 12px; ry: 12px; }
      .edgeLabel { background: transparent; font-weight: 600; }
      .edgeLabel span, .edgeLabel .labelBkg { background: transparent !important; }
      .edgeLabel rect { rx: 999px; ry: 999px; opacity: 1; }
      .edgeLabel p { background: ${pill}; border: 1px solid ${border}; border-radius: 999px; padding: 4px 12px; }
      .messageText { font-weight: 450; }
      .titleText, .pieTitleText { font-weight: 600; }
    `,
  };
}
