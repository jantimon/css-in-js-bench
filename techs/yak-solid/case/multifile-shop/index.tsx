import { Card, Grid, ImagePlaceholder, ImageWrap } from "./layout";
import { AddToCart, Wishlist } from "./controls";
import { Badge, NowPrice, OldPrice, PriceRow, Rating, RatingFill, SrOnly, Title } from "./text";

// The SAME 400-tile shop page as product-grid — same DOM, same CSS, same product
// data — but laid out the way a design system ships it: shared fragments in
// tokens.ts, a base button in button.tsx, and the primitives split by role over
// layout/controls/text. Every JSX use site sits here, and the fold only rewrites
// usages declared in the SAME module, so nothing below folds: each <Card>, <Badge>,
// <Title> stays a runtime Yak wrapper, and the two controls extend an imported base
// through a dynamic styled(Component) the fold never crosses. Runtime libraries
// render this exactly as they render product-grid.

interface Product {
  i: number;
  title: string;
  price: number;
  discount: number;
  rating: number;
  inStock: boolean;
  wishlisted: boolean;
}

const Tile = (props: { p: () => Product }) => (
  <Card>
    <ImageWrap>
      <ImagePlaceholder aria-hidden="true" />
      {props.p().discount > 0 && (
        <Badge $high={props.p().discount >= 30}>
          <SrOnly>Reduced by </SrOnly>-{props.p().discount}%
        </Badge>
      )}
      <Wishlist
        $on={props.p().wishlisted}
        type="button"
        aria-pressed={props.p().wishlisted ? "true" : "false"}
        aria-label={props.p().wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <span aria-hidden="true">♥</span>
      </Wishlist>
    </ImageWrap>
    <Title>{props.p().title}</Title>
    <Rating role="img" aria-label={`Rated ${props.p().rating} out of 5`}>
      <RatingFill aria-hidden="true" $pct={(props.p().rating / 5) * 100} />
    </Rating>
    <PriceRow>
      {props.p().discount > 0 && (
        <OldPrice>
          <SrOnly>Was </SrOnly>${(props.p().price * (1 + props.p().discount / 100)).toFixed(2)}
        </OldPrice>
      )}
      <NowPrice>
        {props.p().discount > 0 && <SrOnly>Now </SrOnly>}${props.p().price.toFixed(2)}
      </NowPrice>
    </PriceRow>
    <AddToCart
      $disabled={!props.p().inStock}
      disabled={!props.p().inStock}
      aria-label={props.p().inStock ? `Add ${props.p().title} to cart` : `${props.p().title} is sold out`}
    >
      {props.p().inStock ? "Add to cart" : "Sold out"}
    </AddToCart>
  </Card>
);

export default (i: () => number) => {
  // Cached on the index: `Tile` reads the product many times per render and a dynamic JSX
  // prop compiles to a getter, so the accessor is forwarded as a plain prop and the object
  // is built once per distinct index instead of once per read.
  let last = NaN;
  let cached!: Product;
  const p = (): Product => {
    const n = i();
    if (n !== last) {
      last = n;
      cached = {
        i: n,
        title: "Product " + n,
        price: (n % 50) + 9.99,
        discount: n % 4 === 0 ? (n % 3 === 0 ? 40 : 20) : 0,
        rating: (n % 5) + 1,
        inStock: n % 7 !== 0,
        wishlisted: n % 6 === 0,
      };
    }
    return cached;
  };
  return <Tile p={p} />;
};
