import { styled } from "goober";
import "./setup";

export const Button = styled("button")`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-width: 1px;
  border-style: solid;
  border-color: transparent;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  cursor: pointer;
  background: #2563eb;
  color: #fff;
`;
