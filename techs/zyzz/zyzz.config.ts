// Lane config: one class per style instead of one per declaration, the output mode
// zyzz's own benchmarks use. Cases import style and variants from here.
import { defineConfig } from "zyzz";

export const { style, variants } = defineConfig({ cssOutput: "grouped" });
