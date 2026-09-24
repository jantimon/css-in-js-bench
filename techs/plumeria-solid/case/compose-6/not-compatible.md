Same limit as `compose-3`, six levels deep. Each level adds a style and passes the accumulated styles to the next component, and Plumeria stops a received `classStyle` from travelling further than one component boundary: the receiver has to apply it to an element, not forward it, because composition is resolved where the styles are written.

Concatenating class strings at runtime would bypass Plumeria's conflict resolution and make the result order-dependent, so there is no cell. Source: [the lane author's note on the pull request](https://github.com/jantimon/css-in-js-bench/pull/14).
