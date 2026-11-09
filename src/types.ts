import { LucideIcon } from "lucide-react";

export interface Category {
  id: number;
  name: string;
  image_url: string;
}

export interface Subcategory {
  id: number;
  category_id: number;
  name: string;
  image_url: string;
}

export interface SubSubCategory {
  id: number;
  subcategory_id: number;
  name: string;
  image_url: string;
}

export interface Product {
  id: number;
  subcategory_id: number;
  sub_sub_category_id?: number;
  name: string;
  price: number;
  description: string;
  image_url: string;
  requires_input: boolean;
  store_type: string;
  min_quantity?: number;
  price_per_unit?: number;
  external_id?: string;
  inventory_group_id?: number | null;
  image_urls?: string[] | string | null;
}

export interface InventoryGroup {
  id: number;
  name: string;
  category?: string;
  item_type: string;
  description?: string;
  low_stock_threshold: number;
  total_count?: number;
  available_count?: number;
  delivered_count?: number;
  created_at?: string;
}

export interface InventoryUnit {
  id: number;
  group_id: number;
  content: string;
  status: "available" | "reserved" | "delivered";
  order_id?: number | null;
  delivered_user_id?: number | null;
  delivered_at?: string | null;
  created_at?: string;
}

export interface UserData {
  id: number;
  name: string;
  email: string;
  balance: number;
  role: string;
  personal_number: string;
  avatar_url?: string;
  phone?: string;
  telegram_chat_id?: number | null;
  is_vip: boolean;
  is_banned: boolean;
  is_blocked?: boolean;
  blocked_until?: string;
  referred_by_id?: number | string | null;
  created_at?: string;
  unread_support_count?: number;
  stats?: {
    total_recharge_sum: number;

    referral_count: number;
    total_orders_count: number;
    login_days_count: number;
    profile_badge?: string;
    user_title?: string;
    frame?: string;
    profile_emoji?: string;
    has_priority_orders?: boolean;
    has_special_support?: boolean;
    custom_theme_color?: string;
  };
}

export interface OrderItemProduct {
  name?: string;
  image_url?: string;
  store_type?: string;
}

export interface OrderItem {
  id?: number;
  order_id?: number;
  product_id?: number;
  price_at_purchase?: number;
  quantity?: number;
  extra_data?: string;
  products?: OrderItemProduct;
}

export interface Order {
  id: number;
  product_name: string;
  total_amount: number;
  status: string;
  created_at: string;
  meta: string;
  admin_response?: string;
  user_name?: string;
  category_name?: string;
  subcategory_name?: string;
  order_items?: OrderItem[];
  response_time_seconds?: number | null;
}

export interface Transaction {
  id: number;
  amount: number;
  method_name: string;
  status: string;
  created_at: string;
  receipt_image_url: string;
  note: string;
  user_name?: string;
  custom_fields_data?: string | null;
  original_amount?: number | null;
  bonus_type?: 'commission' | 'bonus' | null;
  bonus_percent?: number | null;
}

export interface PaymentMethod {
  id: number;
  name: string;
  wallet_address: string;
  qr_enabled?: boolean;
  qr_always_open?: boolean;
  instructions: string;
  description?: string;
  image_url: string;
  min_amount: number;
  method_type?: 'manual' | 'syriatel' | 'shamcash' | 'binance' | 'crypto_usdt_trc20' | 'crypto_usdt_bep20';
  api_account?: string;
  payment_currency?: 'USD' | 'SYP';
  currency_id?: number | null;
  currency?: Currency | null;
  custom_fields?: string | null;
  bonus_type?: 'none' | 'commission' | 'bonus' | null;
  bonus_percent?: number | null;
}

export interface Currency {
  id: number;
  name: string;
  symbol: string;
  exchange_rate: number;
  is_active: boolean;
  is_default: boolean;
  created_at?: string;
}

export interface Banner {
  id: number;
  image_url: string;
  link_url?: string;
}

export interface Offer {
  id: number;
  title: string;
  description: string;
  image_url: string;
  link_url?: string;
}

export interface StoreAppearance {
  id?: number;
  logo_url: string;
  theme_mode: "light" | "dark" | "system";
  primary_color: string;
  cat_columns_desktop: 2 | 3 | 4;
  cat_columns_mobile: 2 | 3 | 4;
  cat_image_ratio: string;
  sub_columns_desktop: 2 | 3 | 4;
  sub_columns_mobile: 2 | 3 | 4;
  sub_image_ratio: string;
  subsub_columns_desktop: 2 | 3 | 4;
  subsub_columns_mobile: 2 | 3 | 4;
  subsub_image_ratio: string;
  prod_columns_desktop: number;
  prod_columns_mobile: 1 | 2 | 3;
  prod_image_ratio: string;
  pay_columns_desktop: 3 | 4 | 5;
  pay_columns_mobile: 2 | 3 | 4;
  pay_image_ratio: string;
  default_home_mode: "strip" | "categories" | "most_purchased" | "favorites";
  font_scale: number;
  font_size_cat: number | null;
  font_size_sub: number | null;
  font_size_subsub: number | null;
  font_size_prod: number | null;
  font_size_pay: number | null;
}

export interface VoucherRedeemViewProps {
  voucherCode: string;
  setVoucherCode: (val: string) => void;
  handleRedeemVoucher: () => void;
  setView: (val: any) => void;
}

export interface AdminLoginViewProps {
  setIsAdmin: (val: boolean) => void;
  setAdminAuth: (val: boolean) => void;
  setView: (val: any) => void;
}

export interface AdminPanelProps {
  user: UserData | null;
  fetchUser: (id: number) => Promise<void>;
  categories: Category[];
  subcategories: Subcategory[];
  subSubCategories: SubSubCategory[];
  fetchCategories: () => Promise<void>;
  fetchSubcategories: () => Promise<void>;
  fetchSubSubCategories: (subId?: number) => Promise<SubSubCategory[]>;
  paymentMethods: PaymentMethod[];
  fetchPaymentMethods: () => Promise<void>;
  banners: Banner[];
  fetchBanners: () => Promise<void>;
  offers: Offer[];
  fetchOffers: () => Promise<void>;
  setIsAdmin: (val: boolean) => void;
  theme: any;
  adminTab: string;
  setAdminTab: (val: string) => void;
  selectedChatUser: any;
  setSelectedChatUser: (user: any) => void;
  setSiteSettings: (data: any[]) => void;
}

export interface AdminChatViewProps {
  selectedChatUser: any;
  setSelectedChatUser: (user: any) => void;
}

export interface PrivacyPolicyViewProps {
  setView: (val: any) => void;
}

export interface SettingsViewProps {
  setView: (val: any) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}

export interface SuccessViewProps {
  setView: (val: any) => void;
  setActiveTab: (val: string) => void;
  viewData: any;
}
