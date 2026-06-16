export type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  available: boolean;
  created_at: string;
};

export type Order = {
  id: string;
  total: number;
  status: "paid" | "unpaid";
  payment_method: "cash" | "upi" | "card";
  note: string | null;
  tendered: number; // cash handed over
  tax: number;
  created_at: string;
};

export type ShopProfile = {
  owner_id: string;
  shop_name: string;
  address: string | null;
  phone: string | null;
  gstin: string | null;
  gst_enabled: boolean;
  gst_rate: number;
  receipt_footer: string | null;
};

export type StockPurchase = {
  id: string;
  inventory_item_id: string;
  qty: number;
  unit_price: number;
  amount: number;
  bought_on: string;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name: string;
  price: number;
  qty: number;
  cost: number; // food cost per plate, snapshot at sale time
};

export type InventoryItem = {
  id: string;
  name: string;
  qty: number;
  unit: string;
  low_threshold: number;
  unit_cost: number; // ₹ per unit you pay
  created_at: string;
};

export type RecipeItem = {
  id: string;
  menu_item_id: string;
  inventory_item_id: string;
  qty_per_plate: number;
};

export type Expense = {
  id: string;
  category: string;
  amount: number;
  note: string | null;
  spent_on: string; // YYYY-MM-DD
  created_at: string;
};

export const money = (n: number) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
