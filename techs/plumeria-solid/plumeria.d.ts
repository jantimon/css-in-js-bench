// Plumeria's `classStyle` JSX prop. The compiler rewrites it to a literal class
// attribute at build time, so it never reaches Solid — this augmentation teaches
// TypeScript (and the reader) that the attribute is legal in a lane source file.
// The React lane pulls in the library's own React augmentation instead; Solid's JSX
// lives in its own module, and HTMLAttributes and SVGAttributes are siblings there,
// so both need the declaration.
import '@solidjs/web';
import type { Style } from '@plumeria/core';

declare module '@solidjs/web' {
  namespace JSX {
    interface HTMLAttributes<T> {
      classStyle?: Style;
    }
    interface SVGAttributes<T> {
      classStyle?: Style;
    }
  }
}
