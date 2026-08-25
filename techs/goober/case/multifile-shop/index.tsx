// bench-strategy: same-as-product-grid-multifile
// goober — multifile-shop. The SAME tile as product-grid (same DOM, same CSS,
// same product data), laid out the way a design system ships it: shared fragments
// in tokens.ts, a base button in button.tsx, and the primitives split by role over
// layout / controls / text. Nothing here folds — Goober resolves the chain at render either way.
import React, { type FunctionComponent } from "react";
import { Card, ImageWrap, ImagePlaceholder } from "./layout";
import { Wishlist, AddToCart } from "./controls";
import { Badge, Title, Rating, RatingFill, PriceRow, OldPrice, NowPrice, SrOnly } from "./text";

interface Product {
  i: number;
  title: string;
  price: number;
  discount: number;
  rating: number;
  inStock: boolean;
  wishlisted: boolean;
}

const Tile: FunctionComponent<{ p: Product }> = ({ p }) => (
  <Card>
    <ImageWrap>
      <ImagePlaceholder aria-hidden="true" />
      {p.discount > 0 && (
        <Badge $high={p.discount >= 30}>
          <SrOnly>Reduced by </SrOnly>-{p.discount}%
        </Badge>
      )}
      <Wishlist
        $on={p.wishlisted}
        type="button"
        aria-pressed={p.wishlisted}
        aria-label={p.wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <span aria-hidden="true">♥</span>
      </Wishlist>
    </ImageWrap>
    <Title>{p.title}</Title>
    <Rating role="img" aria-label={`Rated ${p.rating} out of 5`}>
      <RatingFill aria-hidden="true" $pct={(p.rating / 5) * 100} />
    </Rating>
    <PriceRow>
      {p.discount > 0 && (
        <OldPrice>
          <SrOnly>Was </SrOnly>${(p.price * (1 + p.discount / 100)).toFixed(2)}
        </OldPrice>
      )}
      <NowPrice>
        {p.discount > 0 && <SrOnly>Now </SrOnly>}${p.price.toFixed(2)}
      </NowPrice>
    </PriceRow>
    <AddToCart
      $disabled={!p.inStock}
      disabled={!p.inStock}
      aria-label={p.inStock ? `Add ${p.title} to cart` : `${p.title} is sold out`}
    >
      {p.inStock ? "Add to cart" : "Sold out"}
    </AddToCart>
  </Card>
);

export default (i: number) => {
  const item: Product = {
    i,
    title: "Product " + i,
    price: (i % 50) + 9.99,
    discount: i % 4 === 0 ? (i % 3 === 0 ? 40 : 20) : 0,
    rating: (i % 5) + 1,
    inStock: i % 7 !== 0,
    wishlisted: i % 6 === 0,
  };
  return <Tile p={item} />;
};
