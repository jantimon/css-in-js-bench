# Measured Yak Solid package

Both Solid lanes install `yak-solid-85e0f2b1.tgz` through a relative `file:` dependency.
The archive is committed, so `pnpm install --frozen-lockfile` works from a checkout
without a local next-yak source tree. It contains the package build and its license.

- Source: [next-yak at 85e0f2b1](https://github.com/DigitecGalaxus/next-yak/tree/85e0f2b18b106598def143c9937b8a2ce88a53d2)
- SHA-256: `8a4ff67e6e70ec12f3fa23d22998f74421c40bcbaee86ec209125064aed0bf48`
- Package version: `@yak/solid` 0.1.0, with the runtime from that source revision.

Verify the archive with `shasum -a 256 vendor/yak-solid/yak-solid-85e0f2b1.tgz`.
The report reads the measured revision and checksum from `result/meta.json`.
A package update needs new measurements and matching run metadata.
