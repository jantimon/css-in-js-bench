The css prop takes styles written in place. From the next-yak docs: "Its value has to be styles written in place: a `css` template or an `atoms()` call and logical combinations of them" ([Features, CSS Prop](https://yak.js.org/docs/features)). The compiler folds those fragments onto the element where they are written and collapses them into one class on one host tag.

This case asks each module to export a component that extends the one below: `GhostPrimaryButton` wraps `GhostButton` wraps `Button`. A fragment cannot travel to another component through a prop, and one component cannot extend another, so the css prop has nothing to compose against. The `styled` API does that with `styled(Button)`, which is the `next-yak` lane's cell. Merging class names at runtime would be a workaround rather than the primitive.

The same three declarations as style values are in `button-variants`, where this API composes the ladder onto one element.
