// Plumeria's `classStyle` JSX prop. The compiler rewrites it to a literal `className`
// at build time, so it never reaches React — this reference pulls in the library's own
// React augmentation, which teaches TypeScript (and the reader) that the attribute is
// legal in a lane source file.
/// <reference types="@plumeria/core/class-style" />
