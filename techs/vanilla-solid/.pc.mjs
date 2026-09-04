// Compare the tag skeleton + attributes of a Solid lane against a React reference lane.
const [,, techA, techB] = process.argv;
const A = await import(`./techs/${techA}/dist/microbench/entry.mjs`);
const B = await import(`./techs/${techB}/dist/microbench/entry.mjs`);
const CASES = process.env.CASES?.split(",") ?? ["btn-variant","button-variants","button-variants-nested","compose-1","compose-3","compose-6","dyn-fair","dyn-inline","dyn-translate","multifile-composition","multifile-shop","product-grid","realistic-button","tabs"];
function parse(html) {
  const els = [];
  const tagRe = /<([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  for (let m = tagRe.exec(html); m; m = tagRe.exec(html)) {
    const attrs = [];
    const aRe = /([:a-zA-Z_][\w:.-]*)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/g;
    for (let a = aRe.exec(m[2]); a; a = aRe.exec(m[2])) attrs.push(a[1]);
    els.push({ tag: m[1].toLowerCase(), attrs });
  }
  return els;
}
const strip = (html) => html.replace(/<!--[\s\S]*?-->/g, "");
for (const c of CASES) {
  let a, b;
  try { a = A.renderCase(c, 3); } catch (e) { console.log(`${c}: A missing (${e.message.split("\n")[0]})`); continue; }
  try { b = B.renderCase(c, 3); } catch (e) { console.log(`${c}: B missing`); continue; }
  const ea = parse(a.html), eb = parse(b.html);
  const ska = ea.map(e=>e.tag).join(">"), skb = eb.map(e=>e.tag).join(">");
  const attrsA = [...new Set(ea.flatMap(e=>e.attrs.map(x=>e.tag+"["+x+"]")))].sort();
  const attrsB = [...new Set(eb.flatMap(e=>e.attrs.map(x=>e.tag+"["+x+"]")))].sort();
  const onlyA = attrsA.filter(x=>!attrsB.includes(x));
  const onlyB = attrsB.filter(x=>!attrsA.includes(x));
  const ok = ska === skb;
  console.log(`${ok ? "✓" : "✗"} ${c}: ${ea.length} vs ${eb.length} els${ok?"":" SKELETON DIFFERS"}${onlyA.length?` | only-${techA}: ${onlyA.join(",")}`:""}${onlyB.length?` | only-${techB}: ${onlyB.join(",")}`:""}`);
  if (!ok) {
    console.log("   A:", strip(a.html).slice(0, 300));
    console.log("   B:", strip(b.html).slice(0, 300));
  }
}
