# CSS-in-JS Bench

Renders the same React and Solid components with each styling library and measures
what each one costs at SSR, in the browser and in bytes.

[![CSS-in-JS Bench](report/social-card.jpg)](https://jantimon.github.io/css-in-js-bench/)

**Live report: <https://jantimon.github.io/css-in-js-bench/>**

## What is measured

| Measurement | What it means | Tool |
| --- | --- | --- |
| SSR render throughput | component renders per second in Node, rendering only | tinybench |
| SSR throughput under load | HTTP requests per second, each rendering the full page | autocannon |
| Where the SSR time goes | render CPU split into framework, styling library and components | WPD, Node profile |
| Hydration, interaction, cold mount | browser time to hydrate, update every instance, mount from empty | Playwright, Chrome profile via WPD |
| Browser render work | style recalcs, layout and paint on cold mount | WPD, Chrome and Firefox |
| Page bytes | JS + CSS + HTML, gzipped | gzip |
| Scaling | SSR render time at 100 to 4,000 instances | Node |
| Build time | cold and warm client build per lane | Vite |

Every lane renders the same DOM and the same pixels for a case. `pnpm verify` checks this
before a report is built.

## Lanes

React: @yak/react (styled API and css prop, with and without static folding),
styled-components, Emotion, Goober, StyleX, Panda (css fn, style props, recipe), Bamboo,
Plumeria, Tailwind through `cn` and tailwind-merge, and hand-written CSS as the baseline.
Solid 2: @yak/solid, StyleX, Plumeria, `cn` and hand-written CSS.

## More

- [local-development.md](local-development.md): setup, commands, and how results and CI work
- [Add a lane or a case](local-development.md#add-a-lane): a lane is one folder under `techs/`
- [Live report](https://jantimon.github.io/css-in-js-bench/), also as
  [BENCHMARK.md](https://jantimon.github.io/css-in-js-bench/BENCHMARK.md) and
  [BENCHMARK.json](https://jantimon.github.io/css-in-js-bench/BENCHMARK.json)
