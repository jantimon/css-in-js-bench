// bench-strategy: compose-depth
// @yak/solid — compose-1, the depth-sweep control: ONE styled component carrying only
// the compose-3 base-level styles, no styled(styled) chain to flatten.
import { styled } from "@yak/solid";

const ComposedButton = styled.button`display:inline-flex;align-items:center;border-radius:6px;padding:8px 16px;background:#2563eb;color:#fff;`;

export default (i: () => number) => <ComposedButton>{i()}</ComposedButton>;
