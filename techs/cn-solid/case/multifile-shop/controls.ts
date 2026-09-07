// The two tap targets. Their shared border-none/cursor-pointer now come from the
// imported base button, which the page merges in ahead of these.
export const WISHLIST =
  "absolute top-1.5 right-1.5 rounded-full bg-white/80 text-lg leading-none p-1 transition-colors duration-150 motion-reduce:transition-none";

export const WISHLIST_HOVER = "[@media(hover:hover)]:hover:text-red-500";

export const ADD_TO_CART =
  "mt-auto relative rounded-md px-3 py-2 text-sm leading-[normal] font-semibold text-white bg-blue-600 transition-colors duration-150 motion-reduce:transition-none lg:py-[9px]";

export const ADD_TO_CART_HOVER = "[@media(hover:hover)]:hover:bg-blue-700";

export const ADD_TO_CART_DISABLED = "bg-gray-300 text-gray-500 cursor-not-allowed";
