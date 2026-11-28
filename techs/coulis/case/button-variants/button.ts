// The base button as a style value: merged with the overrides at the use site.
export const buttonStyles = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  border: "1px solid transparent",
  borderRadius: 6,
  padding: "8px 16px",
  fontSize: 14,
  fontWeight: 600,
  lineHeight: "20px",
  cursor: "pointer",
  backgroundColor: "#2563eb",
  color: "#fff",
} as const;
