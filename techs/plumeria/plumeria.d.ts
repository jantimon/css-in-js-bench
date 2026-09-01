// Plumeria's `classStyle` JSX prop. The compiler rewrites it to a literal `className`
// at build time, so it never reaches React — this declaration only teaches TypeScript
// (and the reader) that the attribute is legal in a lane source file.
import "@plumeria/core";

declare module "react" {
  interface HTMLAttributes<T> {
    classStyle?: string | (string | false | null | undefined)[];
  }
  interface SVGAttributes<T> {
    classStyle?: string | (string | false | null | undefined)[];
  }
}
