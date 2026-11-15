/**
 * The Orbit mark, as SVG, for the places that cannot render a React icon:
 * the favicon and the Apple touch icon, which are drawn by next/og.
 *
 * The geometry is lucide's own "orbit" icon, the same one Navbar and Footer
 * render, copied here because next/og draws images, not components. Keep the
 * two in step: if the mark in the header changes, change this too.
 * Source: node_modules/lucide-react/dist/esm/icons/orbit.js (ISC licence).
 */
export function orbitMarkSvg(stroke = "#ffffff", strokeWidth = 2): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"`,
    ` stroke="${stroke}" stroke-width="${strokeWidth}"`,
    ` stroke-linecap="round" stroke-linejoin="round">`,
    `<circle cx="12" cy="12" r="3"/>`,
    `<circle cx="19" cy="5" r="2"/>`,
    `<circle cx="5" cy="19" r="2"/>`,
    `<path d="M10.4 21.9a10 10 0 0 0 9.941-15.416"/>`,
    `<path d="M13.5 2.1a10 10 0 0 0-9.841 15.416"/>`,
    `</svg>`,
  ].join("");
}

/**
 * next/og renders through Satori, which does not draw raw <svg> children --
 * it draws an <img>. So the mark goes in as a data URI, base64 rather than
 * percent-encoded so the quotes and the # in the colour need no escaping.
 */
export function orbitMarkDataUri(stroke = "#ffffff", strokeWidth = 2): string {
  const svg = orbitMarkSvg(stroke, strokeWidth);
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
