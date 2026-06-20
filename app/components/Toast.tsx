"use client";

import { useCart } from "../lib/cart";

export default function Toast() {
  const { toast } = useCart();
  return <div className={"toast" + (toast ? " show" : "")}>{toast}</div>;
}
