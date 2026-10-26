# Light sidebar status colors

Researched 2026-10-26. The aim is recognizable green/blue/red file status with less glare in dense Guide and Changes navigation. Linear is the visual reference for this iteration.

## Direction from Linear

Linear's March 2026 refresh makes supporting navigation less prominent so the main work area takes precedence. Its sidebar comparison explicitly calls out muted inactive text. The team also describes moving its default palette toward warmer, less saturated gray while avoiding a muddy result. These are principles for visual hierarchy, not published semantic color tokens. [A calmer interface for a product in motion](https://linear.app/now/behind-the-latest-design-refresh).

Linear's March 2024 redesign similarly reduces visual noise in sidebars, tabs and panels. The team describes reducing blue chroma in its theme calculations while improving text contrast. Its theme system separates base color, accent and contrast, showing that restrained color need not mean faint text. [How we redesigned the Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui).

The official articles include before/after sidebar imagery and light/dark theme comparisons. Use these for hierarchy and restraint; screenshots do not establish stable, authoritative hex values. [2026 sidebar comparison](https://linear.app/now/behind-the-latest-design-refresh), [2024 light/dark comparison](https://linear.app/now/how-we-redesigned-the-linear-ui).

## Coxswain palette for this iteration

These are our own Linear-inspired colors, **not Linear's official tokens**:

| Status             | Color     |
| ------------------ | --------- |
| Added              | `#4f7b5b` |
| Modified / renamed | `#356fba` |
| Deleted            | `#a4595f` |

Our inference: reducing saturation while keeping the hues recognizable should let filenames retain status meaning without competing with the code. Apply the green/red consistently to labels, icons and +/- counts; preserve the existing dark-mode palette.

Actual readability depends on coxswain's default, selected and hovered row backgrounds, text size and weight. Check the exact combinations in the app. The cited design principles do not establish a WCAG contrast guarantee for these custom values.

## Supplied Linear screenshot

The user supplied a direct reference after the article-based palette. Sampling the most frequent solid text pixels in the +2218 and −272 count regions gives green `#168c28` and red `#cf3a42`. These screenshot values replace the inferred green/red above. Blue `#356fba` remains a companion choice because the reference contains no modified-file blue. Screenshot color management may differ from Linear’s underlying CSS tokens; these are visual samples, not claims about their source code.
