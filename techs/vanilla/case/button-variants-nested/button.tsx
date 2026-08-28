import React from "react";

export const Button = ({ className, children }: { className?: string; children?: React.ReactNode }) => (
  <button className={className ? `btn ${className}` : "btn"}>{children}</button>
);
