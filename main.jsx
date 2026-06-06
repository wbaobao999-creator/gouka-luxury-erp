import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Package, FileText, Calculator, Search, Plus, Building2, Download, Edit3, Trash2, ImagePlus, Save, X, Lock, Database, Upload } from "lucide-react";
import "./style.css";

const STORAGE_KEY = "gouka_erp_v2_items";
const LOGIN_KEY = "gouka_erp_login";
const CASHFLOW_KEY = "gouka_erp_cashflow_v431";
const DICTIONARY_KEY = "gouka_erp_v5_dictionaries";
const SUPPLIER_KEY = "gouka_erp_v51_suppliers";
const USERS = {
  gouka: { password: "777888", role: "owner", name: "老板账号" }
};
const TAX_RATE = 0.10;
const CURRENCY_OPTIONS = ["CNY", "USD", "HKD", "EUR", "JPY"];
const DEFAULT_JPY_RATES = { CNY: 21.8, USD: 157, HKD: 20.1, EUR: 170, JPY: 1 };

function defaultRateFor(currency) {
  return DEFAULT_JPY_RATES[currency] || 1;
}

function amountToJpy(amount, currency, rate) {
  if (currency === "JPY") return Number(amount || 0);
  return Number(amount || 0) * Number(rate || defaultRateFor(currency));
}

const BRAND_OPTIONS = [
  "CHANEL", "HERMES", "Louis Vuitton", "GUCCI", "Dior", "Prada", "Fendi", "Celine",
  "Bottega Veneta", "Balenciaga", "Saint Laurent", "LOEWE", "Cartier", "BVLGARI",
  "Tiffany", "Van Cleef & Arpels", "Chopard", "Rolex", "OMEGA", "其他"
];

const ITEM_OPTIONS_BY_BRAND = {
  "CHANEL": ["Classic Flap Bag", "Boy Chanel", "Chanel 19", "Chanel 22", "Coco Handle", "Gabrielle", "Wallet on Chain", "Vanity Bag", "Wallet", "其他"],
  "HERMES": ["Birkin", "Kelly", "Constance", "Picotin", "Garden Party", "Evelyne", "Lindy", "Bolide", "Bearn Wallet", "其他"],
  "Louis Vuitton": ["Neverfull", "Speedy", "Alma", "OnTheGo", "Keepall", "Pochette", "Noe", "Dauphine", "Wallet", "其他"],
  "GUCCI": ["Dionysus", "Marmont", "Jackie", "Bamboo", "Ophidia", "Horsebit", "Wallet", "其他"],
  "Dior": ["Lady Dior", "Book Tote", "Saddle Bag", "Dior Caro", "30 Montaigne", "Wallet", "其他"],
  "Prada": ["Galleria", "Re-Edition", "Cleo", "Nylon Bag", "Wallet", "其他"],
  "Fendi": ["Peekaboo", "Baguette", "By The Way", "Sunshine Shopper", "Wallet", "其他"],
  "Celine": ["Luggage", "Belt Bag", "Triomphe", "Box", "Cab 平", "Wallet", "其他"],
  "Bottega Veneta": ["Cassette", "Jodie", "Pouch", "Arco", "Wallet", "其他"],
  "Balenciaga": ["City", "Hourglass", "Le Cagole", "Wallet", "其他"],
  "Saint Laurent": ["Niki", "Loulou", "Kate", "Sac de Jour", "Wallet", "其他"],
  "Cartier": ["LOVE Ring", "LOVE Bracelet", "Juste un Clou", "Trinity", "Tank Watch", "Santos", "其他"],
  "BVLGARI": ["Serpenti", "B.zero1", "Divas' Dream", "Bvlgari Bvlgari", "其他"],
  "Tiffany": ["T Smile", "T Wire", "Victoria", "Keys", "HardWear", "其他"],
  "Van Cleef & Arpels": ["Alhambra", "Frivole", "Perlee", "其他"],
  "Chopard": ["Happy Diamonds", "Ice Cube", "Happy Hearts", "其他"],
  "Rolex": ["Submariner", "Datejust", "Daytona", "GMT-Master", "Oyster Perpetual", "其他"],
  "OMEGA": ["Speedmaster", "Seamaster", "Constellation", "De Ville", "其他"]
};

const MATERIAL_OPTIONS = [
  "Caviar Leather", "Lambskin Leather", "Calfskin Leather", "Coated Canvas", "Canvas",
  "Togo Leather", "Epsom Leather", "Swift Leather", "Clemence Leather", "Box Leather",
  "Monogram Canvas", "Damier Canvas", "Nylon", "Gold", "Pink Gold", "White Gold",
  "Silver", "Platinum", "Diamond", "Ceramic", "其他"
];

const COLOR_OPTIONS = [
  "Black", "Brown", "White", "Beige", "Grey", "Blue", "Navy", "Red", "Pink",
  "Green", "Yellow", "Orange", "Purple", "Gold", "Silver", "Multicolor", "其他"
];

const ORIGIN_OPTIONS = [
  "France", "Italy", "Spain", "Germany", "Switzerland", "Japan", "USA", "UK", "China", "Korea", "其他"
];

const SOURCE_OPTIONS = [
  "中国供应商", "中国个人", "日本个人", "ECO Ring", "JBA", "AUCNET", "Star Buyers",
  "NBAA", "MONO", "Mercari", "Yahoo", "店头收购", "其他"
];

const PLATFORM_OPTIONS = [
  "EMS", "DHL", "FedEx", "UPS", "SF Express", "Yamato", "佐川急便", "日本郵便",
  "手提搬入", "船运", "空运", "其他"
];

const IDCHECK_OPTIONS = [
  "Supplier invoice", "Supplier invoice / customs documents", "Passport", "Residence Card",
  "Driver License", "My Number Card", "Auction invoice", "Receipt", "其他"
];

const DEFAULT_DICTIONARIES = {
  brands: BRAND_OPTIONS,
  itemsByBrand: ITEM_OPTIONS_BY_BRAND,
  materials: MATERIAL_OPTIONS,
  colors: COLOR_OPTIONS,
  origins: ORIGIN_OPTIONS,
  sources: SOURCE_OPTIONS,
  platforms: PLATFORM_OPTIONS,
  idChecks: IDCHECK_OPTIONS
};

const DEFAULT_SUPPLIERS = [
  { id: "SUP-001", name: "中国供应商A", type: "中国供应商", country: "China", address: "China", contact: "", phone: "", email: "", memo: "默认供应商" },
  { id: "SUP-002", name: "中国供应商B", type: "中国供应商", country: "China", address: "China", contact: "", phone: "", email: "", memo: "默认供应商" },
  { id: "SUP-003", name: "ECO Ring", type: "日本拍卖", country: "Japan", address: "Japan", contact: "", phone: "", email: "", memo: "日本拍卖/仕入先" },
  { id: "SUP-004", name: "JBA", type: "日本拍卖", country: "Japan", address: "Japan", contact: "", phone: "", email: "", memo: "日本拍卖/仕入先" }
];

function loadSuppliers() {
  try {
    const saved = localStorage.getItem(SUPPLIER_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_SUPPLIERS;
  } catch {
    return DEFAULT_SUPPLIERS;
  }
}

function makeSupplierId(suppliers) {
  const nums = suppliers
    .map((x) => String(x.id || ""))
    .filter((id) => id.startsWith("SUP-"))
    .map((id) => Number(id.replace("SUP-", "")))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `SUP-${String(next).padStart(3, "0")}`;
}

function loadDictionaries() {
  try {
    const saved = localStorage.getItem(DICTIONARY_KEY);
    if (!saved) return DEFAULT_DICTIONARIES;
    const parsed = JSON.parse(saved);
    return {
      brands: Array.isArray(parsed.brands) ? parsed.brands : DEFAULT_DICTIONARIES.brands,
      itemsByBrand: parsed.itemsByBrand && typeof parsed.itemsByBrand === "object" ? parsed.itemsByBrand : DEFAULT_DICTIONARIES.itemsByBrand,
      materials: Array.isArray(parsed.materials) ? parsed.materials : DEFAULT_DICTIONARIES.materials,
      colors: Array.isArray(parsed.colors) ? parsed.colors : DEFAULT_DICTIONARIES.colors,
      origins: Array.isArray(parsed.origins) ? parsed.origins : DEFAULT_DICTIONARIES.origins,
      sources: Array.isArray(parsed.sources) ? parsed.sources : DEFAULT_DICTIONARIES.sources,
      platforms: Array.isArray(parsed.platforms) ? parsed.platforms : DEFAULT_DICTIONARIES.platforms,
      idChecks: Array.isArray(parsed.idChecks) ? parsed.idChecks : DEFAULT_DICTIONARIES.idChecks
    };
  } catch {
    return DEFAULT_DICTIONARIES;
  }
}

function makeAutoTitle(form) {
  return [form.brand, form.item, form.material, form.color, form.origin, form.category]
    .filter(Boolean)
    .join(" ");
}

function makePlatformTitle(form, platform) {
  const base = makeAutoTitle(form);
  if (platform === "mercari") return `${base} 中古 正規品 送料無料`;
  if (platform === "yahoo") return `${base} USED ブランド品 豪嘉株式会社`;
  if (platform === "rakuten") return `${base} 中古ブランド品 GOUKA Luxury`;
  return base;
}

function copyText(text) {
  navigator.clipboard?.writeText(text);
  alert("已复制标题");
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function sumExtraCosts(x) {
  return Number(x.shippingJpy || 0) + Number(x.dutyJpy || 0) + Number(x.customsFeeJpy || 0) + Number(x.platformFeeJpy || 0) + Number(x.otherCostJpy || 0);
}



const emptyForm = {
  purchaseDate: "",
  category: "バッグ類",
  brand: "",
  item: "",
  productTitle: "",
  material: "",
  color: "",
  origin: "France",
  qty: 1,
  purchaseCurrency: "CNY",
  purchaseCny: "",
  purchaseRateToJpy: 21.8,
  declaredCurrency: "CNY",
  declaredCny: "",
  declaredRateToJpy: 21.8,
  rate: 21.8,
  saleJpy: "",
  shippingJpy: "",
  dutyJpy: "",
  customsFeeJpy: "",
  platformFeeJpy: "",
  otherCostJpy: "",
  source: "",
  address: "",
  idCheck: "Supplier invoice",
  status: "已入库",
  platform: "EMS",
  memo: "",
  images: [],
  soldDate: "",
  soldPlatform: "",
  soldPriceJpy: "",
  soldMemo: ""
};

const seedItems = [
  {
    id: "GOUKA-202605-001",
    purchaseDate: "2026-05-30",
    category: "バッグ類",
    brand: "CHANEL",
    item: "Chain Flap Bag",
    material: "Lambskin Leather",
    color: "Black",
    origin: "Italy",
    qty: 1,
    purchaseCurrency: "CNY",
    purchaseCny: 11500,
    purchaseRateToJpy: 21.8,
    declaredCurrency: "CNY",
    declaredCny: 11500,
    declaredRateToJpy: 21.8,
    rate: 21.8,
    saleJpy: 285000,
    shippingJpy: 0,
    dutyJpy: 0,
    customsFeeJpy: 0,
    platformFeeJpy: 0,
    otherCostJpy: 0,
    source: "China Supplier A",
    address: "China",
    idCheck: "Supplier invoice / customs documents",
    status: "已入库",
    platform: "EMS",
    memo: "中古ブランドバッグ / Non-CITES material",
    images: [],
    soldDate: "",
    soldPlatform: "",
    soldPriceJpy: "",
    soldMemo: ""
  },
  {
    id: "GOUKA-202605-002",
    purchaseDate: "2026-05-30",
    category: "バッグ類",
    brand: "Louis Vuitton",
    item: "OnTheGo MM Handbag",
    material: "Coated Canvas & Cowhide Leather",
    color: "Brown",
    origin: "France",
    qty: 2,
    purchaseCurrency: "CNY",
    purchaseCny: 19500,
    purchaseRateToJpy: 21.8,
    declaredCurrency: "CNY",
    declaredCny: 19500,
    declaredRateToJpy: 21.8,
    rate: 21.8,
    saleJpy: 430000,
    shippingJpy: 0,
    dutyJpy: 0,
    customsFeeJpy: 0,
    platformFeeJpy: 0,
    otherCostJpy: 0,
    source: "China Supplier B",
    address: "China",
    idCheck: "Supplier invoice / customs documents",
    status: "报关准备",
    platform: "EMS",
    memo: "商业报关准备",
    images: [],
    soldDate: "",
    soldPlatform: "",
    soldPriceJpy: "",
    soldMemo: ""
  }
];

function loadItems() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved ? JSON.parse(saved) : seedItems).map(normalizeItem);
  } catch {
    return seedItems;
  }
}

function normalizeItem(x) {
  return {
    ledgerStatus: x.ledgerStatus || "有效",
    ledgerVoidReason: x.ledgerVoidReason || "",
    ledgerUpdatedAt: x.ledgerUpdatedAt || "",
    ledgerHistory: Array.isArray(x.ledgerHistory) ? x.ledgerHistory : [
      { date: new Date().toISOString(), user: "system", action: "创建/导入" }
    ],
    purchaseCurrency: x.purchaseCurrency || "CNY",
    purchaseRateToJpy: x.purchaseRateToJpy || x.rate || defaultRateFor(x.purchaseCurrency || "CNY"),
    declaredCurrency: x.declaredCurrency || "CNY",
    declaredRateToJpy: x.declaredRateToJpy || x.rate || defaultRateFor(x.declaredCurrency || "CNY"),
    shippingJpy: x.shippingJpy || 0,
    dutyJpy: x.dutyJpy || 0,
    customsFeeJpy: x.customsFeeJpy || 0,
    platformFeeJpy: x.platformFeeJpy || 0,
    otherCostJpy: x.otherCostJpy || 0,
    productTitle: x.productTitle || makeAutoTitle(x),
    ...x
  };
}

function addHistory(item, user, action) {
  return {
    ...item,
    ledgerUpdatedAt: new Date().toISOString(),
    ledgerHistory: [
      ...(Array.isArray(item.ledgerHistory) ? item.ledgerHistory : []),
      { date: new Date().toISOString(), user: user || "system", action }
    ]
  };
}

function money(n) {
  return Number(n || 0).toLocaleString();
}

function jpy(n) {
  return "¥" + money(Math.round(Number(n || 0)));
}

function cny(n) {
  return "CNY " + money(Number(n || 0));
}

function makeNextId(items) {
  const d = new Date();
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `GOUKA-${ym}-`;
  const nums = items
    .map((x) => String(x.id || ""))
    .filter((id) => id.startsWith(prefix))
    .map((id) => Number(id.replace(prefix, "")))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

function calcTax(x) {
  const baseCostJpy = amountToJpy(x.purchaseCny, x.purchaseCurrency || "CNY", x.purchaseRateToJpy || x.rate || defaultRateFor(x.purchaseCurrency || "CNY"));
  const extraCostJpy = sumExtraCosts(x);
  const costJpy = baseCostJpy + extraCostJpy;
  const declaredJpy = amountToJpy(x.declaredCny, x.declaredCurrency || "CNY", x.declaredRateToJpy || x.rate || defaultRateFor(x.declaredCurrency || "CNY"));
  const inputTax = declaredJpy * TAX_RATE;
  const saleJpy = Number(x.soldPriceJpy || x.saleJpy || 0);
  const outputTax = saleJpy * TAX_RATE / (1 + TAX_RATE);
  const saleExTax = saleJpy - outputTax;
  const grossProfit = saleJpy - costJpy;
  const taxBalance = outputTax - inputTax;
  const profitExTax = saleExTax - costJpy;
  const margin = saleJpy ? grossProfit / saleJpy * 100 : 0;
  return { baseCostJpy, extraCostJpy, costJpy, declaredJpy, inputTax, saleJpy, outputTax, saleExTax, grossProfit, taxBalance, profitExTax, margin };
}

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(e) {
    e.preventDefault();
    const user = USERS[username];
    if (user && password === user.password) {
      localStorage.setItem(LOGIN_KEY, JSON.stringify({ username, role: user.role, name: user.name }));
      onLogin(user.role);
    } else {
      setError("账号或密码错误");
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo"><Lock size={28} /></div>
        <h1>豪嘉ERP V6.6</h1>
        <p>豪嘉株式会社内部管理系统</p>
        <p className="note">请输入公司内部账号登录。账号可向管理员确认，密码不在页面显示。</p>

        <label>
          账号
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="请输入账号" />
        </label>

        <label>
          密码
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入密码" />
        </label>

        {error && <div className="login-error">{error}</div>}

        <button className="login-btn" type="submit">登录</button>
      </form>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(() => {
    try {
      const raw = localStorage.getItem(LOGIN_KEY);
      if (raw === "yes") return { username: "gouka", role: "owner", name: "老板账号" };
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!session);
  const [tab, setTab] = useState("dashboard");
  const [items, setItems] = useState(loadItems);
  const [dictionaries, setDictionaries] = useState(loadDictionaries);
  const [suppliers, setSuppliers] = useState(loadSuppliers);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewScale, setPreviewScale] = useState(1);

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  React.useEffect(() => {
    localStorage.setItem(DICTIONARY_KEY, JSON.stringify(dictionaries));
  }, [dictionaries]);

  React.useEffect(() => {
    localStorage.setItem(SUPPLIER_KEY, JSON.stringify(suppliers));
  }, [suppliers]);

  if (!isLoggedIn) {
    return <LoginPage onLogin={(role) => { setSession({ username: "gouka", role, name: "老板账号" }); setIsLoggedIn(true); }} />;
  }

  const role = session?.role || "owner";
  const isOwner = role === "owner";

  function logout() {
    localStorage.removeItem(LOGIN_KEY);
    setSession(null);
    setIsLoggedIn(false);
  }

  function exportBackup() {
    const data = { version: "GOUKA-ERP-V6.61", exportedAt: new Date().toISOString(), items };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gouka_erp_v66_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importBackup(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const nextItems = Array.isArray(parsed) ? parsed : parsed.items;
        if (!Array.isArray(nextItems)) throw new Error("bad file");
        if (window.confirm(`确定导入 ${nextItems.length} 条商品数据吗？当前数据会被覆盖。`)) {
          setItems(nextItems.map(normalizeItem));
          if (parsed.dictionaries) setDictionaries({ ...DEFAULT_DICTIONARIES, ...parsed.dictionaries });
          if (Array.isArray(parsed.suppliers)) setSuppliers(parsed.suppliers);
          if (parsed.cashflow) localStorage.setItem(CASHFLOW_KEY, JSON.stringify(parsed.cashflow));
          alert("备份数据已恢复。若包含字典、供应商、现金流，也已同步恢复。");
        }
      } catch {
        alert("备份文件格式不正确");
      }
    };
    reader.readAsText(file);
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter((x) => {
      const matchText = Object.values(x).join(" ").toLowerCase().includes(q);
      const matchStatus = statusFilter === "全部" || x.status === statusFilter;
      return matchText && matchStatus;
    });
  }, [items, query, statusFilter]);

  const totals = useMemo(() => {
    return items.reduce(
      (a, x) => {
        const t = calcTax(x);
        a.qty += Number(x.qty || 0);
        a.declared += Number(x.declaredCny || 0);
        a.cost += t.costJpy;
        a.sale += t.saleJpy;
        a.profit += t.profitExTax;
        a.inputTax += t.inputTax;
        a.outputTax += t.outputTax;
        a.taxBalance += t.taxBalance;
        a.profitExTax += t.profitExTax;
        if (x.status === "已售出") {
          a.soldCount += Number(x.qty || 0);
          a.soldAmount += Number(x.soldPriceJpy || x.saleJpy || 0);
          a.soldProfit += t.profitExTax;
        }
        return a;
      },
      { qty: 0, declared: 0, cost: 0, sale: 0, profit: 0, inputTax: 0, outputTax: 0, taxBalance: 0, profitExTax: 0, soldCount: 0, soldAmount: 0, soldProfit: 0 }
    );
  }, [items]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function saveItem() {
    if (!form.brand || !form.item) return alert("请填写品牌和商品名");

    if (editingId) {
      setItems(
        items.map((x) =>
          x.id === editingId
            ? addHistory({
                ...x,
                ...form,
                productTitle: form.productTitle || makeAutoTitle(form),
                qty: Number(form.qty || 1),
                purchaseCurrency: form.purchaseCurrency || "CNY",
                purchaseCny: Number(form.purchaseCny || 0),
                purchaseRateToJpy: Number(form.purchaseRateToJpy || defaultRateFor(form.purchaseCurrency || "CNY")),
                declaredCurrency: form.declaredCurrency || form.purchaseCurrency || "CNY",
                declaredCny: Number(form.declaredCny || form.purchaseCny || 0),
                declaredRateToJpy: Number(form.declaredRateToJpy || defaultRateFor(form.declaredCurrency || form.purchaseCurrency || "CNY")),
                rate: Number(form.purchaseRateToJpy || form.rate || 0),
                saleJpy: Number(form.saleJpy || 0),
                shippingJpy: Number(form.shippingJpy || 0),
                dutyJpy: Number(form.dutyJpy || 0),
                customsFeeJpy: Number(form.customsFeeJpy || 0),
                platformFeeJpy: Number(form.platformFeeJpy || 0),
                otherCostJpy: Number(form.otherCostJpy || 0),
                images: draft.images || form.images || [],
                soldDate: form.soldDate || "",
                soldPlatform: form.soldPlatform || "",
                soldPriceJpy: Number(form.soldPriceJpy || 0),
                soldMemo: form.soldMemo || ""
              }, session?.username, "编辑商品信息")
            : x
        )
      );
      alert("商品已更新");
    } else {
      const next = {
        ...form,
        id: makeNextId(items),
        ledgerStatus: "有效",
        ledgerVoidReason: "",
        ledgerUpdatedAt: new Date().toISOString(),
        productTitle: form.productTitle || makeAutoTitle(form),
        ledgerHistory: [{ date: new Date().toISOString(), user: session?.username || "gouka", action: "创建商品并生成古物台账" }],
        qty: Number(form.qty || 1),
        purchaseCurrency: form.purchaseCurrency || "CNY",
        purchaseCny: Number(form.purchaseCny || 0),
        purchaseRateToJpy: Number(form.purchaseRateToJpy || defaultRateFor(form.purchaseCurrency || "CNY")),
        declaredCurrency: form.declaredCurrency || form.purchaseCurrency || "CNY",
        declaredCny: Number(form.declaredCny || form.purchaseCny || 0),
        declaredRateToJpy: Number(form.declaredRateToJpy || defaultRateFor(form.declaredCurrency || form.purchaseCurrency || "CNY")),
        rate: Number(form.purchaseRateToJpy || form.rate || 0),
        saleJpy: Number(form.saleJpy || 0),
        shippingJpy: Number(form.shippingJpy || 0),
        dutyJpy: Number(form.dutyJpy || 0),
        customsFeeJpy: Number(form.customsFeeJpy || 0),
        platformFeeJpy: Number(form.platformFeeJpy || 0),
        otherCostJpy: Number(form.otherCostJpy || 0),
        images: form.images || [],
        soldDate: form.soldDate || "",
        soldPlatform: form.soldPlatform || "",
        soldPriceJpy: Number(form.soldPriceJpy || 0),
        soldMemo: form.soldMemo || ""
      };
      setItems([next, ...items]);
      alert("商品已添加");
    }

    resetForm();
    setTab("inventory");
  }

  function editItem(item) {
    setForm({
      ...emptyForm,
      ...item,
      images: item.images || []
    });
    setEditingId(item.id);
    setTab("add");
  }

  function deleteItem(id) {
    if (!isOwner) return alert("员工账号无删除权限");
    const reason = window.prompt(`库存记录 ${id} 将移入回收/作废，不会从古物台账物理删除。请输入原因：`, "录入错误/取消采购");
    if (!reason) return;
    setItems(items.map((x) => x.id === id ? addHistory({
      ...x,
      status: "退货",
      ledgerStatus: "作废",
      ledgerVoidReason: reason
    }, session?.username, `作废库存/台账：${reason}`) : x));
    alert("已作废。记录仍保留在系统中，可在古物台账导出留档。");
  }

  function handleImages(files) {
    const selected = Array.from(files).slice(0, 3);
    if (!selected.length) return;

    Promise.all(
      selected.map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
          })
      )
    ).then((imgs) => {
      setForm({ ...form, images: [...(form.images || []), ...imgs].slice(0, 3) });
    });
  }

  function removeImage(index) {
    setForm({ ...form, images: (form.images || []).filter((_, i) => i !== index) });
  }

  function downloadCSV(rows, filename) {
    const csv = rows
      .map((r) => r.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }


  function applyAiDraft(draft) {
    const nextForm = {
      ...emptyForm,
      ...form,
      purchaseDate: draft.purchaseDate || new Date().toISOString().slice(0, 10),
      category: draft.category || "バッグ類",
      brand: draft.brand || "",
      item: draft.item || "",
      productTitle: draft.productTitle || makeAutoTitle(draft),
      material: draft.material || "",
      color: draft.color || "",
      origin: draft.origin || "France",
      qty: Number(draft.qty || 1),
      purchaseCurrency: draft.purchaseCurrency || "CNY",
      purchaseCny: draft.purchaseAmount || "",
      purchaseRateToJpy: draft.purchaseRateToJpy || defaultRateFor(draft.purchaseCurrency || "CNY"),
      declaredCurrency: draft.declaredCurrency || draft.purchaseCurrency || "CNY",
      declaredCny: draft.declaredAmount || draft.purchaseAmount || "",
      declaredRateToJpy: draft.declaredRateToJpy || defaultRateFor(draft.declaredCurrency || draft.purchaseCurrency || "CNY"),
      saleJpy: draft.saleJpy || "",
      source: draft.source || "",
      address: draft.address || "",
      idCheck: draft.idCheck || "Supplier invoice / customs documents",
      platform: draft.platform || "EMS",
      status: draft.status || "已入库",
      memo: draft.memo || "AI识别草稿，已人工确认",
      images: form.images || []
    };
    setForm(nextForm);
    setEditingId(null);
    setTab("add");
    alert("AI草稿已填入商品录入页，请确认后点击添加到库存。");
  }


  const menu = [
    ["dashboard", "控制台"],
    ["add", editingId ? "编辑商品" : "商品录入"],
    ["ai", "AI录入助手"],
    ["aiChat", "豪嘉AI助理"],
    ["inventory", "库存管理"],
    ["ledger", "古物台账"],
    ["customs", "EMS报关"],
    ["profit", "利润分析"],
    ["tax", "消费税参考"],
    ["sales", "销售记录"],
    ["suppliers", "供应商管理"],
    ["dictionary", "字典管理"],
    ["backup", "备份恢复"]
  ];

  return (
    <div className="app">
      <aside>
        <div className="brand">
          <Building2 size={24} />
          <div>
            <b>豪嘉株式会社</b>
            <span>GOUKA Luxury ERP V6.6</span>
          </div>
        </div>

        {menu.map(([k, v]) => (
          <button key={k} className={tab === k ? "active" : ""} onClick={() => setTab(k)}>
            {v}
          </button>
        ))}

        <button className="logout-btn" onClick={logout}>退出登录</button>
      </aside>

      <main>
        <header>
          <div>
            <h1>二手奢侈品管理系统 V6.6</h1>
            <p>自动保存・图片上传・状态筛选・古物台账锁定・EMS报关・利润计算・备份恢复</p>
          </div>
          <span className="pill">Auto Save · {isOwner ? "老板" : "员工"}</span>
        </header>

        {tab === "dashboard" && <Dashboard totals={totals} items={items} setTab={setTab} exportBackup={exportBackup} />}
        {tab === "ai" && <AiAssistant onApplyDraft={applyAiDraft} dictionaries={dictionaries} suppliers={suppliers} />}
        {tab === "aiChat" && <AiChatAssistant items={items} suppliers={suppliers} dictionaries={dictionaries} setTab={setTab} />}
        {tab === "add" && (
          <AddForm
            form={form}
            setForm={setForm}
            saveItem={saveItem}
            resetForm={resetForm}
            editingId={editingId}
            handleImages={handleImages}
            removeImage={removeImage}
            dictionaries={dictionaries}
            suppliers={suppliers}
          />
        )}
        {tab === "inventory" && (
          <Inventory
            items={filtered}
            query={query}
            setQuery={setQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            downloadCSV={downloadCSV}
            editItem={editItem}
            deleteItem={deleteItem}
            isOwner={isOwner}
            setPreviewImage={setPreviewImage}
            setPreviewScale={setPreviewScale}
          />
        )}
        {tab === "ledger" && <Ledger items={filtered} setItems={setItems} isOwner={isOwner} downloadCSV={downloadCSV} />}
        {tab === "customs" && <Customs items={filtered} downloadCSV={downloadCSV} />}
        {tab === "profit" && <Profit items={filtered} />}
        {tab === "tax" && <TaxReport items={filtered} totals={totals} downloadCSV={downloadCSV} />}
        {tab === "sales" && <SalesReport items={items} downloadCSV={downloadCSV} />}
        {tab === "suppliers" && <SupplierPanel suppliers={suppliers} setSuppliers={setSuppliers} downloadCSV={downloadCSV} />}
        {tab === "dictionary" && <DictionaryPanel dictionaries={dictionaries} setDictionaries={setDictionaries} />}
        {tab === "backup" && <BackupPanel items={items} exportBackup={exportBackup} importBackup={importBackup} />}

        {previewImage && (
          <div className="image-modal" onClick={() => setPreviewImage(null)}>
            <div className="image-modal-tools" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setPreviewScale(Math.max(0.5, previewScale - 0.25))}>－</button>
              <span>{Math.round(previewScale * 100)}%</span>
              <button onClick={() => setPreviewScale(Math.min(3, previewScale + 0.25))}>＋</button>
              <button onClick={() => setPreviewScale(1)}>原图</button>
              <button onClick={() => setPreviewImage(null)}>关闭</button>
            </div>
            <img src={previewImage} alt="preview" style={{transform:`scale(${previewScale})`}} />
          </div>
        )}
      </main>
    </div>
  );
}

function Dashboard({ totals, items, setTab, exportBackup }) {
  const withImages = items.filter((x) => x.images && x.images.length).length;
  const activeItems = items.filter((x) => x.status !== "已售出" && x.status !== "退货");
  const activeStock = activeItems.length;
  const soldItems = items.filter((x) => x.status === "已售出");
  const month = currentMonth();
  const today = new Date().toISOString().slice(0, 10);

  const todayIn = items.filter((x) => (x.purchaseDate || "") === today);
  const todaySold = items.filter((x) => (x.soldDate || "") === today || (x.status === "已售出" && !(x.soldDate)));
  const todayPurchase = todayIn.reduce((a, x) => a + calcTax(x).costJpy, 0);
  const todaySale = todaySold.reduce((a, x) => a + calcTax(x).saleJpy, 0);
  const todayProfit = todaySold.reduce((a, x) => a + calcTax(x).profitExTax, 0);

  const monthIn = items.filter((x) => (x.purchaseDate || "").startsWith(month));
  const monthSold = items.filter((x) => (x.soldDate || "").startsWith(month) || (x.status === "已售出" && !(x.soldDate)));
  const monthSale = monthSold.reduce((a, x) => a + calcTax(x).saleJpy, 0);
  const monthProfit = monthSold.reduce((a, x) => a + calcTax(x).profitExTax, 0);
  const recent = items.slice(0, 5);

  const expectedNetProfit = totals.profit;
  const expectedMargin = totals.sale ? (expectedNetProfit / totals.sale) * 100 : 0;

  const todoCustoms = items.filter((x) => x.status === "报关准备").length;
  const todoListing = items.filter((x) => x.status === "已入库").length;
  const todoShipping = items.filter((x) => x.status === "已售出" && !String(x.soldMemo || "").includes("発送済")).length;
  const now = new Date();

  function stockAgeDays(x) {
    if (!x.purchaseDate) return 0;
    const d = new Date(x.purchaseDate);
    if (Number.isNaN(d.getTime())) return 0;
    return Math.floor((now - d) / (1000 * 60 * 60 * 24));
  }

  const over30 = activeItems.filter((x) => stockAgeDays(x) >= 30).length;
  const over60 = activeItems.filter((x) => stockAgeDays(x) >= 60).length;
  const over90 = activeItems.filter((x) => stockAgeDays(x) >= 90).length;

  const brandMap = items.reduce((a, x) => {
    const k = x.brand || "未填写";
    if (!a[k]) a[k] = { count: 0, value: 0, profit: 0 };
    a[k].count += Number(x.qty || 1);
    a[k].value += calcTax(x).costJpy;
    a[k].profit += calcTax(x).profitExTax;
    return a;
  }, {});
  const brandRows = Object.entries(brandMap).sort((a,b)=>b[1].value-a[1].value).slice(0,6);
  const totalBrandValue = brandRows.reduce((a, [,v]) => a + v.value, 0) || 1;
  const maxBrandValue = Math.max(1, ...brandRows.map(([,v])=>v.value));
  const brandProfitRows = Object.entries(brandMap).sort((a,b)=>b[1].profit-a[1].profit).slice(0,5);

  const supplierMap = items.reduce((a, x) => {
    const k = x.source || "未填写";
    if (!a[k]) a[k] = { count: 0, cost: 0, profit: 0 };
    a[k].count += Number(x.qty || 1);
    a[k].cost += calcTax(x).costJpy;
    a[k].profit += calcTax(x).profitExTax;
    return a;
  }, {});
  const supplierRows = Object.entries(supplierMap).sort((a,b)=>b[1].profit-a[1].profit).slice(0,5);

  const defaultCashflow = { rentIncome: 1320000, loanPayment: 450000, companyReserve: 30000000, memo: "房租现金流作为长期定投与公司安全垫参考" };
  const [cashflow, setCashflow] = useState(() => {
    try {
      const saved = localStorage.getItem(CASHFLOW_KEY);
      return saved ? { ...defaultCashflow, ...JSON.parse(saved) } : defaultCashflow;
    } catch {
      return defaultCashflow;
    }
  });
  const [cashflowEdit, setCashflowEdit] = useState(false);
  const [cashflowDraft, setCashflowDraft] = useState(cashflow);
  const rentIncome = Number(cashflow.rentIncome || 0);
  const loanPayment = Number(cashflow.loanPayment || 0);
  const rentCashflow = rentIncome - loanPayment;
  const companyReserve = Number(cashflow.companyReserve || 0);

  function saveCashflow() {
    const next = {
      rentIncome: Number(cashflowDraft.rentIncome || 0),
      loanPayment: Number(cashflowDraft.loanPayment || 0),
      companyReserve: Number(cashflowDraft.companyReserve || 0),
      memo: cashflowDraft.memo || ""
    };
    localStorage.setItem(CASHFLOW_KEY, JSON.stringify(next));
    setCashflow(next);
    setCashflowEdit(false);
  }

  return (
    <section className="v3-dashboard">
      <div className="v3-hero">
        <div>
          <span className="v3-kicker">GOUKA ERP V6.6</span>
          <h1>经营驾驶舱</h1>
          <p>今日经营、库存预警、品牌利润、供应商利润集中显示。老板打开第一页就知道该赚钱、该出品、该清库存。</p>
          <div className="v3-hero-actions">
            <button onClick={() => setTab("add")}>新增商品</button>
            <button onClick={() => setTab("inventory")}>查看库存</button>
            <button onClick={exportBackup}>立即备份</button>
          </div>
        </div>
        <div className="v3-hero-right">
          <p>预计净利润</p>
          <h2>{jpy(expectedNetProfit)}</h2>
          <span>利润率 {expectedMargin.toFixed(1)}% · 当前库存 {activeStock} 件 · 有图 {withImages} 件</span>
        </div>
      </div>

      <div className="v3-kpi-grid">
        <div className="v3-kpi blue"><span>💰</span><p>库存总成本</p><h2>{jpy(totals.cost)}</h2><small>采购成本 + 运费关税手续费</small></div>
        <div className="v3-kpi green"><span>🏷️</span><p>预计销售总额</p><h2>{jpy(totals.sale)}</h2><small>库存预计含税销售额</small></div>
        <div className="v3-kpi orange"><span>📈</span><p>预计净利润</p><h2>{jpy(expectedNetProfit)}</h2><small>已扣附加成本</small></div>
        <div className="v3-kpi purple"><span>📊</span><p>预计利润率</p><h2>{expectedMargin.toFixed(1)}%</h2><small>老板判断用</small></div>
      </div>

      <div className="v3-money-grid">
        <div className="v3-money-card"><p>今日采购额</p><h2>{jpy(todayPurchase)}</h2><small>今日新增 {todayIn.length} 件</small></div>
        <div className="v3-money-card"><p>今日销售额</p><h2>{jpy(todaySale)}</h2><small>今日售出 {todaySold.length} 件</small></div>
        <div className="v3-money-card"><p>今日净利润</p><h2>{jpy(todayProfit)}</h2><small>已扣真实成本</small></div>
        <div className="v3-money-card highlight"><p>消费税差额参考</p><h2>{jpy(totals.taxBalance)}</h2><small>正式申告交由税理士确认</small></div>
      </div>

      <div className="v3-money-grid">
        <div className="v3-money-card"><p>本月入库</p><h2>{monthIn.length} 件</h2><small>{month}</small></div>
        <div className="v3-money-card"><p>本月销售额</p><h2>{jpy(monthSale)}</h2><small>按销售日期统计</small></div>
        <div className="v3-money-card"><p>本月净利润</p><h2>{jpy(monthProfit)}</h2><small>已扣真实成本</small></div>
        <div className="v3-money-card highlight"><p>库存预警</p><h2>{over90} 件</h2><small>90天以上库存</small></div>
      </div>

      <div className="v3-layout">
        <div className="v3-panel">
          <div className="v3-panel-title">
            <div>
              <h2>经营现金流参考</h2>
              <p>{cashflow.memo || "房租现金流作为长期定投与公司安全垫参考"}</p>
            </div>
            <button onClick={() => { setCashflowDraft(cashflow); setCashflowEdit(true); }}>编辑现金流</button>
          </div>
          {cashflowEdit ? (
            <div className="formgrid" style={{gridTemplateColumns:"repeat(2,1fr)"}}>
              <Input label="月房租收入 JPY" type="number" value={cashflowDraft.rentIncome} onChange={(v) => setCashflowDraft({ ...cashflowDraft, rentIncome: v })} />
              <Input label="贷款支出 JPY" type="number" value={cashflowDraft.loanPayment} onChange={(v) => setCashflowDraft({ ...cashflowDraft, loanPayment: v })} />
              <Input label="公司备用金 JPY" type="number" value={cashflowDraft.companyReserve} onChange={(v) => setCashflowDraft({ ...cashflowDraft, companyReserve: v })} />
              <Input label="备注" value={cashflowDraft.memo || ""} onChange={(v) => setCashflowDraft({ ...cashflowDraft, memo: v })} />
              <div className="action-row full">
                <button className="primary" onClick={saveCashflow}>保存现金流</button>
                <button className="ghost" onClick={() => setCashflowEdit(false)}>取消</button>
              </div>
            </div>
          ) : (
            <>
              <div className="v3-mini-stats" style={{gridTemplateColumns:"repeat(4,1fr)"}}>
                <div><b>{jpy(rentIncome)}</b><span>月房租收入</span></div>
                <div><b>{jpy(loanPayment)}</b><span>贷款支出参考</span></div>
                <div><b>{jpy(rentCashflow)}</b><span>租金净现金流</span></div>
                <div><b>{jpy(companyReserve)}</b><span>公司备用金</span></div>
              </div>
              <p className="note">这些数字已可编辑，并保存在当前浏览器。</p>
            </>
          )}
        </div>
        <div className="v3-panel">
          <div className="v3-panel-title"><div><h2>待办中心</h2><p>每天打开系统先看这里</p></div></div>
          <div className="v3-tax-list">
            <div><span>待报关</span><b>{todoCustoms} 件</b></div>
            <div><span>待出品</span><b>{todoListing} 件</b></div>
            <div><span>待发货确认</span><b>{todoShipping} 件</b></div>
            <div><span>库存超30天</span><b>{over30} 件</b></div>
            <div><span>库存超60天</span><b>{over60} 件</b></div>
            <div><span>库存超90天</span><b>{over90} 件</b></div>
          </div>
        </div>
      </div>

      <div className="v3-layout">
        <div className="v3-panel">
          <div className="v3-panel-title"><div><h2>品牌利润排行</h2><p>按净利润排序</p></div></div>
          <div className="v3-tax-list">
            {brandProfitRows.map(([brand, data]) => (
              <div key={brand}><span>{brand}</span><b>{jpy(data.profit)}</b></div>
            ))}
          </div>
        </div>
        <div className="v3-panel">
          <div className="v3-panel-title"><div><h2>供应商利润排行</h2><p>知道哪个来源最赚钱</p></div></div>
          <div className="v3-tax-list">
            {supplierRows.map(([supplier, data]) => (
              <div key={supplier}><span>{supplier}</span><b>{jpy(data.profit)}</b></div>
            ))}
          </div>
        </div>
      </div>

      <div className="v3-layout">
        <div className="v3-panel">
          <div className="v3-panel-title"><div><h2>最近入库商品</h2><p>最新录入的前5件商品</p></div><button onClick={()=>setTab("inventory")}>库存管理</button></div>
          <div className="v3-recent-list">
            {recent.length ? recent.map((x) => (
              <div className="v3-recent-item" key={x.id}>
                <div className="v3-recent-img">{x.images?.[0] ? <img src={x.images[0]} alt={x.item} /> : "📦"}</div>
                <div><b>{x.brand} {x.item}</b><p>{x.category} / {x.color || "未填颜色"}</p><small>{x.id}</small></div>
                <StatusBadge status={x.status} />
                <span className="v3-recent-date">{x.purchaseDate || "未填日期"}</span>
              </div>
            )) : <p className="note">暂无商品，先录入第一件商品。</p>}
          </div>
        </div>
        <div className="v3-panel">
          <div className="v3-panel-title"><div><h2>品牌价值占比</h2><p>按库存成本金额统计，不再只看件数</p></div></div>
          <div className="v3-bars">
            {brandRows.map(([brand, data]) => {
              const percent = data.value / totalBrandValue * 100;
              return (
                <div key={brand}>
                  <div className="v3-bar-label"><b>{brand}</b><span>{percent.toFixed(1)}% / {jpy(data.value)}</span></div>
                  <div className="v3-bar-track"><div style={{width:`${Math.max(8, data.value / maxBrandValue * 100)}%`}} /></div>
                </div>
              );
            })}
          </div>
          <div className="v3-mini-stats">
            <div><b>{items.length}</b><span>总记录</span></div>
            <div><b>{soldItems.length}</b><span>已售</span></div>
            <div><b>{withImages}</b><span>有图</span></div>
          </div>
        </div>
      </div>
      <div className="panel wide">
        <h2>经营提醒</h2>
        <p>V6.6新增今日经营、库存预警、品牌利润排行、供应商利润排行。下一阶段可接Supabase，实现多电脑同步和图片云存储。</p>
      </div>
    </section>
  );
}


function Card({ icon, title, value }) {
  return (
    <div className="card">
      <div>{icon}</div>
      <p>{title}</p>
      <h2>{value}</h2>
    </div>
  );
}

function AddForm({ form, setForm, saveItem, resetForm, editingId, handleImages, removeImage, dictionaries, suppliers }) {
  const set = (k, v) => setForm({ ...form, [k]: v });
  function setPurchaseCurrency(v) {
    setForm({ ...form, purchaseCurrency: v, purchaseRateToJpy: defaultRateFor(v) });
  }
  function setDeclaredCurrency(v) {
    setForm({ ...form, declaredCurrency: v, declaredRateToJpy: defaultRateFor(v) });
  }
  const preview = calcTax(form);
  const brandItems = dictionaries.itemsByBrand?.[form.brand] || ["其他"];
  const supplierNames = suppliers.map((s) => s.name).filter(Boolean);
  const sourceOptions = Array.from(new Set([...(supplierNames || []), ...(dictionaries.sources || [])]));

  function setSourceFromSupplier(v) {
    const supplier = suppliers.find((s) => s.name === v);
    if (supplier) {
      setForm({
        ...form,
        source: v,
        address: supplier.address || form.address || "",
        memo: form.memo || supplier.memo || ""
      });
    } else {
      set("source", v);
    }
  }

  function setBrand(v) {
    const nextItems = dictionaries.itemsByBrand?.[v] || ["其他"];
    setForm({
      ...form,
      brand: v,
      item: nextItems.includes(form.item) ? form.item : ""
    });
  }

  function onDropImages(e) {
    e.preventDefault();
    handleImages(e.dataTransfer.files);
  }

  return (
    <div className="panel">
      <h2>
        <Plus size={20} /> {editingId ? `编辑商品：${editingId}` : "新增商品"}
      </h2>

      <div className="formgrid">
        <Input label="仕入日" type="date" value={form.purchaseDate} onChange={(v) => set("purchaseDate", v)} />

        <Select label="品类" value={form.category} onChange={(v) => set("category", v)} options={["バッグ類", "財布・小物類", "時計類", "宝飾品類", "アクセサリー類", "時計", "アパレル", "その他"]} />

        <SelectWithOther label="品牌 Brand" value={form.brand} onChange={setBrand} options={dictionaries.brands} placeholder="选择或输入品牌" />

        <SelectWithOther label="商品名 Item" value={form.item} onChange={(v) => set("item", v)} options={brandItems} placeholder="先选品牌，再选择商品名" />

        <Input label="自动商品标题" value={form.productTitle || makeAutoTitle(form)} onChange={(v) => set("productTitle", v)} placeholder="系统自动生成，也可手动修改" />

        <SelectWithOther label="材质 Material" value={form.material} onChange={(v) => set("material", v)} options={dictionaries.materials} placeholder="选择或输入材质" />

        <SelectWithOther label="颜色 Color" value={form.color} onChange={(v) => set("color", v)} options={dictionaries.colors} placeholder="选择或输入颜色" />

        <SelectWithOther label="产地 Origin" value={form.origin} onChange={(v) => set("origin", v)} options={dictionaries.origins} placeholder="选择或输入产地" />

        <Input label="数量 Qty" type="number" value={form.qty} onChange={(v) => set("qty", v)} />

        <Select label="采购币种" value={form.purchaseCurrency || "CNY"} onChange={setPurchaseCurrency} options={CURRENCY_OPTIONS} />
        <Input label={`采购金额 ${form.purchaseCurrency || "CNY"}`} type="number" value={form.purchaseCny} onChange={(v) => set("purchaseCny", v)} />
        <Input label={`${form.purchaseCurrency || "CNY"}→JPY 汇率`} type="number" value={form.purchaseRateToJpy || defaultRateFor(form.purchaseCurrency || "CNY")} onChange={(v) => set("purchaseRateToJpy", v)} />

        <Select label="申报币种" value={form.declaredCurrency || form.purchaseCurrency || "CNY"} onChange={setDeclaredCurrency} options={CURRENCY_OPTIONS} />
        <Input label={`申报金额 ${form.declaredCurrency || "CNY"}`} type="number" value={form.declaredCny} onChange={(v) => set("declaredCny", v)} />
        <Input label={`${form.declaredCurrency || "CNY"}→JPY 汇率`} type="number" value={form.declaredRateToJpy || defaultRateFor(form.declaredCurrency || "CNY")} onChange={(v) => set("declaredRateToJpy", v)} />

        <Input label="预计销售额 JPY（税込）" type="number" value={form.saleJpy} onChange={(v) => set("saleJpy", v)} />

        <Input label="EMS/国际运费 JPY" type="number" value={form.shippingJpy || ""} onChange={(v) => set("shippingJpy", v)} />
        <Input label="关税 JPY" type="number" value={form.dutyJpy || ""} onChange={(v) => set("dutyJpy", v)} />
        <Input label="报关代行费 JPY" type="number" value={form.customsFeeJpy || ""} onChange={(v) => set("customsFeeJpy", v)} />
        <Input label="拍卖/平台手续费 JPY" type="number" value={form.platformFeeJpy || ""} onChange={(v) => set("platformFeeJpy", v)} />
        <Input label="其他费用 JPY" type="number" value={form.otherCostJpy || ""} onChange={(v) => set("otherCostJpy", v)} />

        <SelectWithOther label="仕入先 / 来源" value={form.source} onChange={setSourceFromSupplier} options={sourceOptions} placeholder="选择供应商或输入来源" />

        <Input label="供应商地址" value={form.address} onChange={(v) => set("address", v)} placeholder="China / Japan address" />

        <SelectWithOther label="本人确认方式" value={form.idCheck} onChange={(v) => set("idCheck", v)} options={dictionaries.idChecks} placeholder="选择或输入确认方式" />

        <Select label="状态" value={form.status} onChange={(v) => set("status", v)} options={["采购中", "运输中", "已入库", "报关准备", "出品中", "已售出", "保留", "退货"]} />

        <SelectWithOther label="平台 / 运输方式" value={form.platform} onChange={(v) => set("platform", v)} options={dictionaries.platforms} placeholder="选择或输入平台" />

        <div className="full panel" style={{ background: "#f8fafc", padding: "16px" }}>
          <h3 style={{ marginTop: 0 }}>实时利润预览</h3>
          <div className="grid4">
            <Card icon={<Calculator />} title="基础采购成本" value={jpy(preview.baseCostJpy)} />
            <Card icon={<Calculator />} title="附加成本合计" value={jpy(preview.extraCostJpy)} />
            <Card icon={<Calculator />} title="真实总成本" value={jpy(preview.costJpy)} />
            <Card icon={<Calculator />} title="预计毛利" value={jpy(preview.grossProfit)} />
          </div>
          <p className="note">
            采购换算：{jpy(preview.baseCostJpy)}　申报换算：{jpy(preview.declaredJpy)}　利润率：{(preview.margin || 0).toFixed(1)}%　销售消费税参考：{jpy(preview.outputTax)}　进项消费税参考：{jpy(preview.inputTax)}
          </p>
          <div className="action-row">
            <button className="ghost" type="button" onClick={() => copyText(makePlatformTitle(form, "mercari"))}>复制Mercari标题</button>
            <button className="ghost" type="button" onClick={() => copyText(makePlatformTitle(form, "yahoo"))}>复制Yahoo标题</button>
            <button className="ghost" type="button" onClick={() => copyText(makePlatformTitle(form, "rakuten"))}>复制乐天标题</button>
          </div>
        </div>

        {form.status === "已售出" && (
          <>
            <Input label="销售日期" type="date" value={form.soldDate || ""} onChange={(v) => set("soldDate", v)} />
            <Input label="销售平台" value={form.soldPlatform || ""} onChange={(v) => set("soldPlatform", v)} placeholder="EcoRing / Mercari / 店铺 / 其他" />
            <Input label="实际销售额 JPY（税込）" type="number" value={form.soldPriceJpy || ""} onChange={(v) => set("soldPriceJpy", v)} />
            <label className="full">
              销售备注
              <textarea value={form.soldMemo || ""} onChange={(e) => set("soldMemo", e.target.value)} placeholder="拍卖成交 / 线下销售 / 买家备注" />
            </label>
          </>
        )}

        <label
          className="full"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDropImages}
          style={{ border: "1px dashed #94a3b8", borderRadius: "14px", padding: "14px", background: "#f8fafc" }}
        >
          商品图片（最多3张，本地保存，可拖拽图片到这里）
          <input type="file" accept="image/*" multiple onChange={(e) => handleImages(e.target.files)} />
        </label>

        <div className="image-row full">
          {(form.images || []).map((src, i) => (
            <div className="image-box" key={i}>
              <img src={src} alt={`商品图片${i + 1}`} />
              <button type="button" onClick={() => removeImage(i)}>
                <X size={14} /> 移除
              </button>
            </div>
          ))}
        </div>

        <label className="full">
          备注
          <textarea value={form.memo} onChange={(e) => set("memo", e.target.value)} />
        </label>
      </div>

      <div className="action-row">
        <button className="primary" onClick={saveItem}>
          <Save size={16} /> {editingId ? "保存修改" : "添加到库存"}
        </button>
        {editingId && (
          <button className="ghost" onClick={resetForm}>
            取消编辑
          </button>
        )}
      </div>
    </div>
  );
}


function StatusBadge({ status }) {
  return <span className={`status-badge status-${status}`}>{status}</span>;
}

function Inventory({ items, query, setQuery, statusFilter, setStatusFilter, downloadCSV, editItem, deleteItem, isOwner, setPreviewImage, setPreviewScale }) {
  const [detailItem, setDetailItem] = useState(null);
  const headers = ["图片", "商品编号", "入库日期", "品牌", "商品名", "状态", "真实成本JPY", "预计售价JPY（税込）", "销售消费税", "税抜售价", "净利润", "利润率", "操作"];
  const csvHeaders = ["商品编号", "入库日期", "品类", "品牌", "商品名", "材质", "颜色", "产地", "数量", "采购币种", "采购金额", "采购汇率", "申报币种", "申报金额", "申报汇率", "采购JPY", "附加成本JPY", "真实成本JPY", "进项消费税参考", "预计销售JPY税込", "销售消费税", "税抜售价", "净利润", "状态"];
  const csvRows = [csvHeaders];

  items.forEach((x) => {
    const t = calcTax(x);
    csvRows.push([x.id, x.purchaseDate, x.category, x.brand, x.item, x.material, x.color, x.origin, x.qty, x.purchaseCurrency || "CNY", x.purchaseCny, x.purchaseRateToJpy || x.rate, x.declaredCurrency || "CNY", x.declaredCny, x.declaredRateToJpy || x.rate, Math.round(t.baseCostJpy), Math.round(t.extraCostJpy), Math.round(t.costJpy), Math.round(t.inputTax), x.saleJpy, Math.round(t.outputTax), Math.round(t.saleExTax), Math.round(t.profitExTax), x.status]);
  });

  const rows = items.map((x) => {
    const t = calcTax(x);
    return [
      x.images && x.images.length ? <img className="thumb" src={x.images[0]} alt={x.item} onClick={() => { setPreviewScale(1); setPreviewImage(x.images[0]); }} /> : "—",
      x.id,
      x.purchaseDate,
      x.brand,
      x.item,
      <StatusBadge status={x.status} />,
      Math.round(t.costJpy),
      x.saleJpy,
      Math.round(t.outputTax),
      Math.round(t.saleExTax),
      Math.round(t.profitExTax),
      `${(t.saleExTax ? (t.profitExTax / t.saleExTax * 100) : 0).toFixed(1)}%`,
      <div className="table-actions">
        <button className="ghost" onClick={() => setDetailItem(x)}>详情</button>
        <button className="edit" onClick={() => editItem(x)}>
          <Edit3 size={14} /> 编辑
        </button>
        {isOwner && (
          <button className="danger" onClick={() => deleteItem(x.id)}>
            <Trash2 size={14} /> 作废
          </button>
        )}
      </div>
    ];
  });

  return (
    <div className="panel">
      <Toolbar
        title="库存管理"
        query={query}
        setQuery={setQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onDownload={() => downloadCSV(csvRows, "gouka_inventory_tax.csv")}
      />
      <p className="note">表格已精简。详细字段请点「详情」查看，避免页面过宽。</p>
      <Table headers={headers} rows={rows} />

      {detailItem && (
        <div className="image-modal" onClick={() => setDetailItem(null)}>
          <div className="panel" style={{ width: "860px", maxWidth: "92vw", maxHeight: "88vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="toolbar">
              <h2>{detailItem.brand} {detailItem.item}</h2>
              <button onClick={() => setDetailItem(null)}>关闭</button>
            </div>
            <div className="image-row">
              {(detailItem.images || []).map((src, i) => <img key={i} className="thumb" style={{ width: 120, height: 120 }} src={src} alt="detail" />)}
            </div>
            <div className="grid4" style={{ marginTop: 16 }}>
              <Card icon={<Package />} title="商品编号" value={detailItem.id} />
              <Card icon={<FileText />} title="品类" value={detailItem.category} />
              <Card icon={<Calculator />} title="真实成本" value={jpy(calcTax(detailItem).costJpy)} />
              <Card icon={<Calculator />} title="销售消费税" value={jpy(calcTax(detailItem).outputTax)} />
              <Card icon={<Calculator />} title="税抜售价" value={jpy(calcTax(detailItem).saleExTax)} />
              <Card icon={<Calculator />} title="净利润" value={jpy(calcTax(detailItem).profitExTax)} />
            </div>
            <p><b>材质：</b>{detailItem.material}</p>
            <p><b>颜色：</b>{detailItem.color}</p>
            <p><b>产地：</b>{detailItem.origin}</p>
            <p><b>来源：</b>{detailItem.source}</p>
            <p><b>供应商地址：</b>{detailItem.address}</p>
            <p><b>平台/运输：</b>{detailItem.platform}</p>
            <p><b>费用：</b>运费 {jpy(detailItem.shippingJpy)} / 关税 {jpy(detailItem.dutyJpy)} / 报关 {jpy(detailItem.customsFeeJpy)} / 手续费 {jpy(detailItem.platformFeeJpy)} / 其他 {jpy(detailItem.otherCostJpy)}</p>
            <p><b>备注：</b>{detailItem.memo}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Ledger({ items, setItems, isOwner, downloadCSV }) {
  const [ledgerQuery, setLedgerQuery] = useState("");
  const [ledgerDate, setLedgerDate] = useState("");

  function voidLedger(id) {
    if (!isOwner) return alert("员工账号不能作废台账");
    const reason = window.prompt("请输入作废原因。系统不会删除原始记录，只会标记为作废：", "录入错误，已重新登记");
    if (!reason) return;
    setItems((prev) => prev.map((x) => x.id === id ? addHistory({
      ...x,
      ledgerStatus: "作废",
      ledgerVoidReason: reason
    }, "gouka", `古物台账作废：${reason}`) : x));
  }

  function restoreLedger(id) {
    if (!isOwner) return alert("员工账号不能恢复台账");
    if (!window.confirm("确认恢复这条古物台账为有效状态吗？")) return;
    setItems((prev) => prev.map((x) => x.id === id ? addHistory({
      ...x,
      ledgerStatus: "有效",
      ledgerVoidReason: ""
    }, "gouka", "古物台账恢复有效") : x));
  }

  function correctLedger(id) {
    if (!isOwner) return alert("员工账号不能更正台账");
    const note = window.prompt("请输入更正内容或原因（例：更正商品颜色 / 更正材质 / 更正供应商）：", "更正商品信息");
    if (!note) return;
    setItems((prev) => prev.map((x) => x.id === id ? addHistory({
      ...x,
      ledgerStatus: "更正",
      ledgerVoidReason: ""
    }, "gouka", `古物台账更正：${note}`) : x));
    alert("已记录更正履历。需要修改具体商品内容时，请到库存管理点「编辑」。");
  }

  function showLedgerHistory(item) {
    const history = (item.ledgerHistory || []).map((h, i) => `${i + 1}. ${(h.date || "").slice(0, 19)} / ${h.user || "system"} / ${h.action || ""}`).join("\n");
    alert(`商品编号：${item.id}\n台账状态：${item.ledgerStatus || "有效"}\n作废原因：${item.ledgerVoidReason || "无"}\n\n更正履历：\n${history || "暂无履历"}`);
  }

  const filteredItems = items.filter((x) => {
    const q = ledgerQuery.toLowerCase();
    const text = [
      x.id,
      x.purchaseDate,
      x.category,
      x.brand,
      x.item,
      x.material,
      x.color,
      x.origin,
      x.source,
      x.address,
      x.idCheck,
      x.memo
    ].join(" ").toLowerCase();

    const matchText = !q || text.includes(q);
    const matchDate = !ledgerDate || x.purchaseDate === ledgerDate;

    return matchText && matchDate;
  });

  const headers = [
    "No",
    "取引日",
    "商品番号",
    "区分",
    "ブランド",
    "商品名",
    "特徴",
    "数量",
    "取引区分",
    "金額",
    "通貨",
    "相手方",
    "住所",
    "本人確認",
    "売却先",
    "備考",
    "台账状态",
    "更正履历",
    "操作"
  ];

  const rows = filteredItems.map((x, i) => [
    i + 1,
    x.purchaseDate,
    x.id,
    x.category,
    x.brand,
    x.item,
    `${x.material} / ${x.color} / ${x.origin}`,
    x.qty,
    "仕入",
    x.purchaseCny,
    x.purchaseCurrency || "CNY",
    x.source,
    x.address,
    x.idCheck,
    "",
    x.memo,
    x.ledgerStatus || "有效",
    (x.ledgerHistory || []).slice(-3).map((h) => `${(h.date || "").slice(0,10)} ${h.action}`).join(" / "),
    <div className="table-actions">
      <button className="ghost" onClick={() => showLedgerHistory(x)}>履历</button>
      {isOwner && <button className="edit" onClick={() => correctLedger(x.id)}>更正</button>}
      {(x.ledgerStatus || "有效") === "作废" ? (
        isOwner ? <button className="edit" onClick={() => restoreLedger(x.id)}>恢复</button> : "作废"
      ) : (
        isOwner ? <button className="danger" onClick={() => voidLedger(x.id)}>作废</button> : "锁定"
      )}
    </div>
  ]);

  return (
    <div className="panel">
      <div className="toolbar">
        <h2>古物台账</h2>

        <div className="toolbar-right">
          <div className="search">
            <Search size={16} />
            <input
              placeholder="搜索编号 / 品牌 / 商品 / 供应商"
              value={ledgerQuery}
              onChange={(e) => setLedgerQuery(e.target.value)}
            />
          </div>

          <input
            type="date"
            value={ledgerDate}
            onChange={(e) => setLedgerDate(e.target.value)}
          />

          <button onClick={() => {
            setLedgerQuery("");
            setLedgerDate("");
          }}>
            清除筛选
          </button>

          <button onClick={() => downloadCSV([headers, ...rows], "gouka_kobutsu_ledger.csv")}>
            <Download size={16} /> CSV导出
          </button>
        </div>
      </div>

      <p className="note">
        当前显示 {filteredItems.length} 件 / 全部 {items.length} 件。古物台账不支持物理删除，只能作废或更正。
      </p>

      <Table headers={headers} rows={rows} />
    </div>
  );
}


function Customs({ items, downloadCSV }) {
  const headers = ["No.", "Brand", "Item", "Material", "Color", "Specification", "Qty", "Country of Origin", "Declared Currency", "Declared Value", "Declared Value (JPY)", "Import Tax 10% Ref", "Remarks"];
  const rows = items.map((x, i) => {
    const t = calcTax(x);
    return [i + 1, x.brand, x.item, x.material, x.color, x.category, x.qty, x.origin, x.declaredCurrency || "CNY", x.declaredCny, Math.round(t.declaredJpy), Math.round(t.inputTax), "Used luxury goods / Non-CITES material"];
  });
  const totalQty = items.reduce((a, x) => a + Number(x.qty || 0), 0);
  const totalValue = items.reduce((a, x) => a + calcTax(x).declaredJpy, 0);

  return (
    <div className="panel">
      <Toolbar title="EMS Commercial Customs Declaration" onDownload={() => downloadCSV([headers, ...rows, [], ["Total Quantity", totalQty], ["Total Declared Value JPY", Math.round(totalValue)]], "gouka_ems_customs_tax.csv")} />
      <p>
        <b>Importer:</b> 豪嘉株式会社 (GOUKA INC.)
      </p>
      <Table headers={headers} rows={rows} />
      <p className="note">Total Quantity: {totalQty} pieces / Total Declared Value JPY: {jpy(totalValue)}</p>
    </div>
  );
}

function Profit({ items }) {
  const headers = ["商品编号", "品牌", "商品名", "基础成本JPY", "附加成本JPY", "真实成本JPY", "销售JPY（税込）", "销售不含税", "销售消费税", "预计毛利", "不含税利润参考", "利润率"];
  const rows = items.map((x) => {
    const t = calcTax(x);
    const margin = t.saleExTax ? ((t.profitExTax / t.saleExTax) * 100).toFixed(1) + "%" : "";
    return [x.id, x.brand, x.item, Math.round(t.baseCostJpy), Math.round(t.extraCostJpy), Math.round(t.costJpy), x.saleJpy, Math.round(t.saleExTax), Math.round(t.outputTax), Math.round(t.grossProfit), Math.round(t.profitExTax), margin];
  });

  return (
    <div className="panel">
      <h2>
        <Calculator size={20} /> 利润分析
      </h2>
      <Table headers={headers} rows={rows} />
    </div>
  );
}

function TaxReport({ items, totals, downloadCSV }) {
  const headers = ["商品编号", "品牌", "商品名", "申报JPY", "进项消费税参考", "销售JPY（税込）", "销售不含税", "销售消费税", "消费税差额参考"];
  const rows = items.map((x) => {
    const t = calcTax(x);
    return [x.id, x.brand, x.item, Math.round(t.declaredJpy), Math.round(t.inputTax), Math.round(t.saleJpy), Math.round(t.saleExTax), Math.round(t.outputTax), Math.round(t.taxBalance)];
  });

  const csv = [headers, ...rows, [], ["合计", "", "", "", Math.round(totals.inputTax), Math.round(totals.sale), "", Math.round(totals.outputTax), Math.round(totals.taxBalance)]];

  return (
    <div className="panel">
      <Toolbar title="消费税参考表" onDownload={() => downloadCSV(csv, "gouka_consumption_tax_reference.csv")} />
      <p className="note">课税事业者参考：销售消费税按含税销售额倒算 10/110，进项消费税按申报JPY × 10% 参考。实际申告请交由税理士确认。</p>
      <Table headers={headers} rows={rows} />
      <h3>合计</h3>
      <p>销售消费税参考：{jpy(totals.outputTax)}</p>
      <p>进项消费税参考：{jpy(totals.inputTax)}</p>
      <p>消费税差额参考：{jpy(totals.taxBalance)}</p>
    </div>
  );
}


function SalesReport({ items, downloadCSV }) {
  const [salesQuery, setSalesQuery] = useState("");
  const [salesMonth, setSalesMonth] = useState("");

  const soldItems = items.filter((x) => x.status === "已售出");

  const filteredSold = soldItems.filter((x) => {
    const q = salesQuery.toLowerCase();
    const matchText = !q || Object.values(x).join(" ").toLowerCase().includes(q);
    const matchMonth = !salesMonth || (x.soldDate || "").startsWith(salesMonth);
    return matchText && matchMonth;
  });

  const headers = ["商品编号", "品牌", "商品名", "销售日期", "销售平台", "销售额JPY（税込）", "采购成本JPY", "销售消费税", "预计毛利", "不含税利润参考", "备注"];
  const rows = filteredSold.map((x) => {
    const t = calcTax(x);
    return [
      x.id,
      x.brand,
      x.item,
      x.soldDate || "",
      x.soldPlatform || "",
      Math.round(t.saleJpy),
      Math.round(t.costJpy),
      Math.round(t.outputTax),
      Math.round(t.grossProfit),
      Math.round(t.profitExTax),
      x.soldMemo || ""
    ];
  });

  const totalSale = filteredSold.reduce((a, x) => a + Number(x.soldPriceJpy || x.saleJpy || 0), 0);
  const totalCost = filteredSold.reduce((a, x) => a + calcTax(x).costJpy, 0);
  const totalProfit = filteredSold.reduce((a, x) => a + calcTax(x).grossProfit, 0);
  const totalOutputTax = filteredSold.reduce((a, x) => a + calcTax(x).outputTax, 0);

  return (
    <div className="panel">
      <Toolbar title="销售记录" onDownload={() => downloadCSV([headers, ...rows], "gouka_sales_report.csv")} />

      <div className="filter-row">
        <input
          placeholder="搜索品牌 / 商品 / 平台 / 备注"
          value={salesQuery}
          onChange={(e) => setSalesQuery(e.target.value)}
        />
        <input
          type="month"
          value={salesMonth}
          onChange={(e) => setSalesMonth(e.target.value)}
        />
        <button onClick={() => { setSalesQuery(""); setSalesMonth(""); }}>清除筛选</button>
      </div>

      <p className="note">状态改为「已售出」后，会自动进入这里。可按品牌、商品名、销售平台、月份筛选。</p>

      <div className="grid4" style={{marginBottom:"16px"}}>
        <Card icon={<Calculator />} title="筛选已售件数" value={`${filteredSold.length} 件`} />
        <Card icon={<Calculator />} title="筛选销售额" value={jpy(totalSale)} />
        <Card icon={<Calculator />} title="筛选成本" value={jpy(totalCost)} />
        <Card icon={<Calculator />} title="筛选毛利" value={jpy(totalProfit)} />
      </div>

      <p>销售消费税参考：{jpy(totalOutputTax)}</p>
      <Table headers={headers} rows={rows} />
    </div>
  );
}

function BackupPanel({ items, exportBackup, importBackup }) {
  return (
    <div className="panel">
      <h2><Database size={20} /> 数据备份 / 恢复</h2>
      <p className="note">当前系统数据保存在本机浏览器。V6.6备份会包含商品、字典、供应商、现金流。换电脑、清理浏览器、重装系统前，一定要先导出备份。</p>

      <div className="grid4" style={{marginTop:"16px"}}>
        <Card icon={<Package />} title="当前商品记录" value={`${items.length} 件`} />
        <Card icon={<ImagePlus />} title="有图片商品" value={`${items.filter(x => x.images?.length).length} 件`} />
        <Card icon={<Calculator />} title="已售商品" value={`${items.filter(x => x.status === "已售出").length} 件`} />
        <Card icon={<Database />} title="备份格式" value="JSON" />
      </div>

      <div className="action-row" style={{marginTop:"20px"}}>
        <button className="primary" onClick={exportBackup}><Download size={16} /> 导出备份JSON</button>
        <label className="ghost" style={{display:"inline-flex", alignItems:"center", gap:"8px", cursor:"pointer"}}>
          <Upload size={16} /> 导入备份JSON
          <input type="file" accept="application/json" style={{display:"none"}} onChange={(e)=>importBackup(e.target.files?.[0])} />
        </label>
      </div>

      <p className="note">建议：每周导出一次，文件名保留日期；重要月份结账后再导出一次。</p>
    </div>
  );
}


function findFirstOption(text, options) {
  const lower = String(text || "").toLowerCase();
  return (options || []).find((x) => lower.includes(String(x).toLowerCase())) || "";
}

function extractNumberAfter(text, keywords) {
  for (const kw of keywords) {
    const reg = new RegExp(`${kw}[^0-9０-９]*([0-9０-９,\\.]+)`, "i");
    const m = String(text || "").match(reg);
    if (m) {
      const num = String(m[1]).replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0)-65248)).replace(/,/g, "");
      return Number(num);
    }
  }
  return "";
}

function guessCurrency(text) {
  const upper = String(text || "").toUpperCase();
  if (upper.includes("USD") || upper.includes("$")) return "USD";
  if (upper.includes("HKD") || upper.includes("香港")) return "HKD";
  if (upper.includes("EUR") || upper.includes("€")) return "EUR";
  if (upper.includes("JPY") || upper.includes("円") || upper.includes("日元")) return "JPY";
  return "CNY";
}

function parseAiText(raw, dictionaries, suppliers) {
  const text = raw || "";
  const brand = findFirstOption(text, dictionaries.brands);
  const itemOptions = dictionaries.itemsByBrand?.[brand] || [];
  const item = findFirstOption(text, itemOptions) || "";
  const material = findFirstOption(text, dictionaries.materials);
  const color = findFirstOption(text, dictionaries.colors);
  const origin = findFirstOption(text, dictionaries.origins) || "France";
  const source = findFirstOption(text, suppliers.map(s => s.name)) || findFirstOption(text, dictionaries.sources);
  const platform = findFirstOption(text, dictionaries.platforms) || "EMS";
  const currency = guessCurrency(text);
  const purchaseAmount = extractNumberAfter(text, ["采购金额", "采购", "仕入金額", "仕入", "purchase", "cost", "金额"]) || "";
  const declaredAmount = extractNumberAfter(text, ["申报金额", "申报", "declared", "invoice", "报关"]) || purchaseAmount || "";
  const saleJpy = extractNumberAfter(text, ["销售额", "售价", "売上", "落札", "sale", "sold"]) || "";
  const qty = extractNumberAfter(text, ["数量", "qty", "個数"]) || 1;
  const today = new Date().toISOString().slice(0, 10);
  const dateMatch = text.match(/20\d{2}[-\/.]\d{1,2}[-\/.]\d{1,2}/);
  const purchaseDate = dateMatch ? dateMatch[0].replace(/[\/.]/g, "-") : today;

  const draft = {
    purchaseDate,
    category: "バッグ類",
    brand,
    item,
    material,
    color,
    origin,
    qty,
    purchaseCurrency: currency,
    purchaseAmount,
    purchaseRateToJpy: defaultRateFor(currency),
    declaredCurrency: currency,
    declaredAmount,
    declaredRateToJpy: defaultRateFor(currency),
    saleJpy,
    source,
    address: suppliers.find(s => s.name === source)?.address || "",
    idCheck: "Supplier invoice / customs documents",
    status: "已入库",
    platform,
    memo: "AI识别草稿，请人工确认后入库"
  };
  draft.productTitle = makeAutoTitle(draft);
  return draft;
}


function buildAiBusinessStats(items, suppliers) {
  const today = new Date().toISOString().slice(0, 10);
  const month = currentMonth();
  const active = items.filter((x) => x.status !== "已售出" && x.status !== "退货");
  const sold = items.filter((x) => x.status === "已售出");
  const todayIn = items.filter((x) => (x.purchaseDate || "") === today);
  const todaySold = items.filter((x) => (x.soldDate || "") === today || (x.status === "已售出" && !x.soldDate));
  const monthIn = items.filter((x) => (x.purchaseDate || "").startsWith(month));
  const monthSold = items.filter((x) => (x.soldDate || "").startsWith(month) || (x.status === "已售出" && !x.soldDate));
  const totalCost = items.reduce((a, x) => a + calcTax(x).costJpy, 0);
  const totalSale = items.reduce((a, x) => a + calcTax(x).saleJpy, 0);
  const totalProfit = items.reduce((a, x) => a + calcTax(x).profitExTax, 0);
  const todaySale = todaySold.reduce((a, x) => a + calcTax(x).saleJpy, 0);
  const todayProfit = todaySold.reduce((a, x) => a + calcTax(x).profitExTax, 0);
  const monthSale = monthSold.reduce((a, x) => a + calcTax(x).saleJpy, 0);
  const monthProfit = monthSold.reduce((a, x) => a + calcTax(x).profitExTax, 0);
  const now = new Date();
  function ageDays(x) {
    if (!x.purchaseDate) return 0;
    const d = new Date(x.purchaseDate);
    if (Number.isNaN(d.getTime())) return 0;
    return Math.floor((now - d) / (1000 * 60 * 60 * 24));
  }
  const over30 = active.filter((x) => ageDays(x) >= 30);
  const over60 = active.filter((x) => ageDays(x) >= 60);
  const over90 = active.filter((x) => ageDays(x) >= 90);
  const brandMap = items.reduce((a, x) => {
    const k = x.brand || "未填写";
    if (!a[k]) a[k] = { count: 0, cost: 0, sale: 0, profit: 0 };
    a[k].count += Number(x.qty || 1);
    a[k].cost += calcTax(x).costJpy;
    a[k].sale += calcTax(x).saleJpy;
    a[k].profit += calcTax(x).profitExTax;
    return a;
  }, {});
  const supplierMap = items.reduce((a, x) => {
    const k = x.source || "未填写";
    if (!a[k]) a[k] = { count: 0, cost: 0, profit: 0 };
    a[k].count += Number(x.qty || 1);
    a[k].cost += calcTax(x).costJpy;
    a[k].profit += calcTax(x).profitExTax;
    return a;
  }, {});
  return {
    today, month, active, sold, todayIn, todaySold, monthIn, monthSold,
    totalCost, totalSale, totalProfit, todaySale, todayProfit, monthSale, monthProfit,
    over30, over60, over90,
    brandProfit: Object.entries(brandMap).sort((a,b)=>b[1].profit-a[1].profit).slice(0,5),
    supplierProfit: Object.entries(supplierMap).sort((a,b)=>b[1].profit-a[1].profit).slice(0,5),
    todoCustoms: items.filter((x) => x.status === "报关准备"),
    todoListing: items.filter((x) => x.status === "已入库"),
    todoShipping: items.filter((x) => x.status === "已售出" && !String(x.soldMemo || "").includes("発送済"))
  };
}

function answerAiQuestion(question, items, suppliers, dictionaries) {
  const q = String(question || "").toLowerCase();
  const s = buildAiBusinessStats(items, suppliers);
  if (!question.trim()) return "你可以问：今天赚了多少钱、库存总成本、哪些货超过90天、哪个品牌最赚钱、哪个供应商最赚钱。";
  if (q.includes("今天") || q.includes("今日")) return [`今日经营：`,`今日新增入库：${s.todayIn.length} 件`,`今日销售额：${jpy(s.todaySale)}`,`今日净利润参考：${jpy(s.todayProfit)}`,`今日售出：${s.todaySold.length} 件`].join("\n");
  if (q.includes("本月") || q.includes("这个月")) return [`本月经营（${s.month}）：`,`本月入库：${s.monthIn.length} 件`,`本月销售额：${jpy(s.monthSale)}`,`本月净利润参考：${jpy(s.monthProfit)}`,`本月售出：${s.monthSold.length} 件`].join("\n");
  if (q.includes("库存") || q.includes("成本") || q.includes("总成本")) return [`库存概况：`,`当前库存：${s.active.length} 件`,`已售商品：${s.sold.length} 件`,`库存总成本参考：${jpy(s.totalCost)}`,`预计销售总额：${jpy(s.totalSale)}`,`预计净利润参考：${jpy(s.totalProfit)}`].join("\n");
  if (q.includes("90") || q.includes("60") || q.includes("30") || q.includes("压货") || q.includes("超龄")) {
    const list = s.over90.slice(0, 8).map((x) => `- ${x.id} ${x.brand} ${x.item} / ${x.purchaseDate}`).join("\n");
    return [`库存预警：`,`超过30天：${s.over30.length} 件`,`超过60天：${s.over60.length} 件`,`超过90天：${s.over90.length} 件`, s.over90.length ? `\n90天以上前几件：\n${list}` : `目前没有90天以上库存。`].join("\n");
  }
  if (q.includes("品牌") || q.includes("哪个牌") || q.includes("最赚钱")) return `品牌利润排行：\n${s.brandProfit.map(([b,d],i)=>`${i+1}. ${b}：利润 ${jpy(d.profit)} / ${d.count} 件`).join("\n") || "暂无数据"}`;
  if (q.includes("供应商") || q.includes("来源") || q.includes("哪里进货")) return `供应商利润排行：\n${s.supplierProfit.map(([n,d],i)=>`${i+1}. ${n}：利润 ${jpy(d.profit)} / ${d.count} 件`).join("\n") || "暂无数据"}`;
  if (q.includes("待办") || q.includes("该做什么") || q.includes("下一步")) return [`今日待办建议：`,`待报关：${s.todoCustoms.length} 件`,`待出品：${s.todoListing.length} 件`,`待发货确认：${s.todoShipping.length} 件`,`库存90天以上：${s.over90.length} 件`, s.todoListing.length ? `建议优先处理：把已入库商品尽快出品。` : `当前出品压力不大。`].join("\n");
  if (q.includes("标题") || q.includes("mercari") || q.includes("yahoo") || q.includes("乐天")) {
    const sample = items[0] || {};
    return [`示例标题：`,`Mercari：${makePlatformTitle(sample, "mercari")}`,`Yahoo：${makePlatformTitle(sample, "yahoo")}`,`乐天：${makePlatformTitle(sample, "rakuten")}`].join("\n");
  }
  const brandHit = (dictionaries.brands || []).find((b) => q.includes(String(b).toLowerCase()));
  if (brandHit) {
    const arr = items.filter((x) => x.brand === brandHit);
    const cost = arr.reduce((a,x)=>a+calcTax(x).costJpy,0);
    const sale = arr.reduce((a,x)=>a+calcTax(x).saleJpy,0);
    const profit = arr.reduce((a,x)=>a+calcTax(x).profitExTax,0);
    return [`${brandHit} 概况：`,`记录数量：${arr.length} 件`,`成本参考：${jpy(cost)}`,`预计销售：${jpy(sale)}`,`预计利润：${jpy(profit)}`].join("\n");
  }
  return [`我现在能回答ERP经营数据问题。你可以这样问：`,`今天赚了多少钱？`,`本月销售额多少？`,`哪些货超过90天？`,`哪个品牌最赚钱？`,`哪个供应商利润最高？`,`现在库存总成本多少？`].join("\n");
}

function AiChatAssistant({ items, suppliers, dictionaries, setTab }) {
  const [messages, setMessages] = useState([{ role: "assistant", text: "我是豪嘉AI助理。你可以问我：今天赚了多少钱、库存总成本、哪个品牌最赚钱、哪些货超过90天。" }]);
  const [input, setInput] = useState("");
  function ask(text) {
    const q = text.trim();
    if (!q) return;
    const answer = answerAiQuestion(q, items, suppliers, dictionaries);
    setMessages((prev) => [...prev, { role: "user", text: q }, { role: "assistant", text: answer }]);
    setInput("");
  }
  const quick = ["今天赚了多少钱？", "本月销售额多少？", "库存总成本多少？", "哪些货超过90天？", "哪个品牌最赚钱？", "哪个供应商利润最高？", "今天该做什么？"];
  return (
    <div className="panel">
      <h2>🤖 豪嘉AI助理 V6.6</h2>
      <p className="note">本地AI经营助理：读取ERP本地数据，不上传外部服务器。可回答库存、利润、待办、品牌、供应商、超龄库存等问题。</p>
      <div className="grid4" style={{marginBottom:"16px"}}>
        <Card icon={<Package />} title="当前库存" value={`${items.filter(x => x.status !== "已售出" && x.status !== "退货").length} 件`} />
        <Card icon={<Calculator />} title="记录总数" value={`${items.length} 件`} />
        <Card icon={<Building2 />} title="供应商" value={`${suppliers.length} 个`} />
        <Card icon={<Database />} title="模式" value="本地AI" />
      </div>
      <div className="action-row" style={{flexWrap:"wrap"}}>{quick.map((q)=><button key={q} className="ghost" onClick={()=>ask(q)}>{q}</button>)}</div>
      <div className="panel" style={{background:"#f8fafc", marginTop:"16px", maxHeight:"460px", overflow:"auto"}}>
        {messages.map((m,i)=><div key={i} style={{margin:"10px 0", padding:"12px 14px", borderRadius:"14px", background:m.role==="user" ? "#dbeafe" : "#fff", border:"1px solid #e5e7eb", whiteSpace:"pre-wrap"}}><b>{m.role==="user" ? "你" : "豪嘉AI"}：</b><div style={{marginTop:"6px"}}>{m.text}</div></div>)}
      </div>
      <div className="action-row" style={{marginTop:"14px"}}>
        <input style={{flex:1}} value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>{ if(e.key==="Enter") ask(input); }} placeholder="问我：今天赚了多少钱？哪个品牌最赚钱？" />
        <button className="primary" onClick={()=>ask(input)}>发送</button>
        <button className="ghost" onClick={()=>setMessages([{ role:"assistant", text:"对话已清空。继续问我ERP经营数据吧。" }])}>清空</button>
      </div>
      <div className="action-row" style={{marginTop:"10px"}}>
        <button className="ghost" onClick={()=>setTab("ai")}>去AI录入助手</button>
        <button className="ghost" onClick={()=>setTab("dashboard")}>回控制台</button>
      </div>
    </div>
  );
}


function AiAssistant({ onApplyDraft, dictionaries, suppliers }) {
  const [mode, setMode] = useState("purchase");
  const [rawText, setRawText] = useState("");
  const [draft, setDraft] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [fileNotes, setFileNotes] = useState("");

  function readImages(files) {
    const selected = Array.from(files || []).filter((f) => f.type.startsWith("image/")).slice(0, 3);
    if (!selected.length) return;

    Promise.all(
      selected.map((file) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: file.name, src: reader.result });
        reader.readAsDataURL(file);
      }))
    ).then((imgs) => {
      setUploadedImages([...(uploadedImages || []), ...imgs].slice(0, 3));
    });
  }

  function removeUploadedImage(index) {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  }

  function analyze() {
    if (!rawText.trim() && !uploadedImages.length) {
      return alert("请先粘贴文字，或上传图片后补充识别文字。");
    }

    const imageHint = uploadedImages.length
      ? `\n图片文件：${uploadedImages.map((x) => x.name).join(" / ")}`
      : "";

    const next = parseAiText(`${rawText}\n${fileNotes}${imageHint}`, dictionaries, suppliers);

    if (mode === "sale") {
      next.status = "已售出";
      next.soldDate = new Date().toISOString().slice(0, 10);
      next.soldPlatform = next.platform;
      next.soldPriceJpy = next.saleJpy;
      next.memo = "AI识别销售草稿，请人工确认";
    }

    next.images = uploadedImages.map((x) => x.src);
    next.memo = next.memo || "AI识别草稿，请人工确认后入库";

    setDraft(next);
  }

  function setDraftValue(k, v) {
    setDraft({ ...draft, [k]: v });
  }

  function applyDraft() {
    if (!draft) return;
    onApplyDraft({
      ...draft,
      images: uploadedImages.map((x) => x.src)
    });
  }

  return (
    <div className="panel">
      <h2>🤖 AI录入助手 V6.6</h2>
      <p className="note">
        V6.6新增图片上传通道。可以上传商品图、发票图、拍卖截图并预览；识别文字仍需粘贴或人工补充。
        确认后图片会一起带入商品录入页。
      </p>

      <div className="action-row">
        <button className={mode === "purchase" ? "primary" : "ghost"} onClick={() => setMode("purchase")}>识别进货</button>
        <button className={mode === "sale" ? "primary" : "ghost"} onClick={() => setMode("sale")}>识别销售</button>
      </div>

      <label
        className="full"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); readImages(e.dataTransfer.files); }}
        style={{ display:"block", marginTop:"16px", border:"1px dashed #94a3b8", borderRadius:"14px", padding:"16px", background:"#f8fafc" }}
      >
        上传图片（最多3张，可拖拽商品图/发票图/拍卖截图到这里）
        <input type="file" accept="image/*" multiple onChange={(e) => readImages(e.target.files)} />
      </label>

      {!!uploadedImages.length && (
        <div className="image-row" style={{ marginTop:"12px" }}>
          {uploadedImages.map((img, i) => (
            <div className="image-box" key={i}>
              <img src={img.src} alt={img.name} />
              <button type="button" onClick={() => removeUploadedImage(i)}>
                <X size={14} /> 移除
              </button>
              <small>{img.name}</small>
            </div>
          ))}
        </div>
      )}

      <label className="full" style={{display:"block", marginTop:"16px"}}>
        图片/文件备注
        <textarea
          rows={3}
          value={fileNotes}
          onChange={(e) => setFileNotes(e.target.value)}
          placeholder="例如：这张图是CHANEL发票，采购金额11500 CNY，供应商中国供应商A"
        />
      </label>

      <label className="full" style={{display:"block", marginTop:"16px"}}>
        粘贴识别文字 / 发票文字 / 拍卖成交内容
        <textarea
          rows={10}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={"例：CHANEL Classic Flap Bag Lambskin Black France 采购金额 11500 CNY 来源 中国供应商A EMS 预计售价 350000 JPY"}
        />
      </label>

      <div className="action-row">
        <button className="primary" onClick={analyze}>AI识别生成草稿</button>
        <button className="ghost" onClick={() => { setRawText(""); setDraft(null); setUploadedImages([]); setFileNotes(""); }}>清空</button>
      </div>

      {draft && (
        <div className="panel" style={{marginTop:"20px", background:"#f8fafc"}}>
          <h3>识别草稿，请人工确认</h3>

          {!!uploadedImages.length && (
            <div className="image-row" style={{ marginBottom:"14px" }}>
              {uploadedImages.map((img, i) => (
                <img key={i} className="thumb" style={{ width: 88, height: 88 }} src={img.src} alt={img.name} />
              ))}
            </div>
          )}

          <div className="formgrid">
            <Input label="日期" type="date" value={draft.purchaseDate || ""} onChange={(v)=>setDraftValue("purchaseDate", v)} />
            <SelectWithOther label="品牌" value={draft.brand || ""} onChange={(v)=>setDraftValue("brand", v)} options={dictionaries.brands} />
            <Input label="商品名" value={draft.item || ""} onChange={(v)=>setDraftValue("item", v)} />
            <SelectWithOther label="材质" value={draft.material || ""} onChange={(v)=>setDraftValue("material", v)} options={dictionaries.materials} />
            <SelectWithOther label="颜色" value={draft.color || ""} onChange={(v)=>setDraftValue("color", v)} options={dictionaries.colors} />
            <SelectWithOther label="产地" value={draft.origin || ""} onChange={(v)=>setDraftValue("origin", v)} options={dictionaries.origins} />
            <Select label="采购币种" value={draft.purchaseCurrency || "CNY"} onChange={(v)=>setDraft({ ...draft, purchaseCurrency:v, purchaseRateToJpy:defaultRateFor(v) })} options={CURRENCY_OPTIONS} />
            <Input label="采购金额" type="number" value={draft.purchaseAmount || ""} onChange={(v)=>setDraftValue("purchaseAmount", v)} />
            <Input label="采购汇率→JPY" type="number" value={draft.purchaseRateToJpy || ""} onChange={(v)=>setDraftValue("purchaseRateToJpy", v)} />
            <Input label="预计销售JPY" type="number" value={draft.saleJpy || ""} onChange={(v)=>setDraftValue("saleJpy", v)} />
            <SelectWithOther label="来源/供应商" value={draft.source || ""} onChange={(v)=>setDraftValue("source", v)} options={[...suppliers.map(s=>s.name), ...dictionaries.sources]} />
            <SelectWithOther label="平台/运输" value={draft.platform || "EMS"} onChange={(v)=>setDraftValue("platform", v)} options={dictionaries.platforms} />
            <Input label="自动标题" value={draft.productTitle || makeAutoTitle(draft)} onChange={(v)=>setDraftValue("productTitle", v)} />
          </div>

          <div className="grid4" style={{marginTop:"16px"}}>
            <Card icon={<Calculator />} title="采购换算JPY" value={jpy(amountToJpy(draft.purchaseAmount, draft.purchaseCurrency, draft.purchaseRateToJpy))} />
            <Card icon={<Calculator />} title="预计售价JPY" value={jpy(draft.saleJpy)} />
            <Card icon={<Calculator />} title="预计利润" value={jpy(Number(draft.saleJpy || 0) - amountToJpy(draft.purchaseAmount, draft.purchaseCurrency, draft.purchaseRateToJpy))} />
            <Card icon={<FileText />} title="图片数量" value={`${uploadedImages.length} 张`} />
          </div>

          <div className="action-row">
            <button className="primary" onClick={applyDraft}>确认，填入商品录入页</button>
            <button className="ghost" onClick={() => copyText(JSON.stringify(draft, null, 2))}>复制草稿JSON</button>
          </div>
        </div>
      )}

      <div className="panel" style={{ marginTop:"18px", background:"#fff7ed" }}>
        <h3>说明</h3>
        <p className="note">
          当前版本已支持上传和带图入库；真正“自动读图识别文字/识别包款”需要下一步接 OpenAI Vision 或 OCR 服务。
        </p>
      </div>
    </div>
  );
}


function SupplierPanel({ suppliers, setSuppliers, downloadCSV }) {
  const emptySupplier = { id: "", name: "", type: "中国供应商", country: "China", address: "", contact: "", phone: "", email: "", memo: "" };
  const [form, setForm] = useState(emptySupplier);
  const [editingId, setEditingId] = useState(null);
  const [supplierQuery, setSupplierQuery] = useState("");

  const set = (k, v) => setForm({ ...form, [k]: v });

  const filtered = suppliers.filter((s) =>
    Object.values(s).join(" ").toLowerCase().includes(supplierQuery.toLowerCase())
  );

  function resetSupplierForm() {
    setForm(emptySupplier);
    setEditingId(null);
  }

  function saveSupplier() {
    if (!form.name) return alert("请填写供应商名称");
    if (editingId) {
      setSuppliers(suppliers.map((s) => s.id === editingId ? { ...s, ...form } : s));
      alert("供应商已更新");
    } else {
      const next = { ...form, id: makeSupplierId(suppliers) };
      setSuppliers([next, ...suppliers]);
      alert("供应商已新增");
    }
    resetSupplierForm();
  }

  function editSupplier(s) {
    setForm(s);
    setEditingId(s.id);
  }

  function deleteSupplier(id) {
    if (!window.confirm("确认删除这个供应商吗？历史商品记录不会删除，只是不再出现在供应商列表中。")) return;
    setSuppliers(suppliers.filter((s) => s.id !== id));
  }

  const headers = ["编号", "名称", "类型", "国家", "地址", "联系人", "电话", "邮箱", "备注", "操作"];
  const rows = filtered.map((s) => [
    s.id,
    s.name,
    s.type,
    s.country,
    s.address,
    s.contact,
    s.phone,
    s.email,
    s.memo,
    <div className="table-actions">
      <button className="edit" onClick={() => editSupplier(s)}>编辑</button>
      <button className="danger" onClick={() => deleteSupplier(s.id)}>删除</button>
    </div>
  ]);

  const csvRows = [["编号", "名称", "类型", "国家", "地址", "联系人", "电话", "邮箱", "备注"], ...filtered.map((s) => [s.id, s.name, s.type, s.country, s.address, s.contact, s.phone, s.email, s.memo])];

  return (
    <div className="panel">
      <h2><Building2 size={20} /> 供应商管理</h2>
      <p className="note">
        V6.6新增：供应商独立管理。录入商品选择供应商后，会自动带出地址与备注，减少员工重复输入。
      </p>

      <div className="formgrid">
        <Input label="供应商名称" value={form.name} onChange={(v) => set("name", v)} placeholder="中国供应商A / ECO Ring / JBA" />
        <Select label="类型" value={form.type} onChange={(v) => set("type", v)} options={["中国供应商", "中国个人", "日本个人", "日本拍卖", "平台采购", "店头收购", "其他"]} />
        <Input label="国家" value={form.country} onChange={(v) => set("country", v)} placeholder="China / Japan" />
        <Input label="地址" value={form.address} onChange={(v) => set("address", v)} placeholder="供应商地址" />
        <Input label="联系人" value={form.contact} onChange={(v) => set("contact", v)} />
        <Input label="电话" value={form.phone} onChange={(v) => set("phone", v)} />
        <Input label="邮箱" value={form.email} onChange={(v) => set("email", v)} />
        <label>
          备注
          <textarea value={form.memo} onChange={(e) => set("memo", e.target.value)} />
        </label>
      </div>

      <div className="action-row">
        <button className="primary" onClick={saveSupplier}>{editingId ? "保存供应商" : "新增供应商"}</button>
        {editingId && <button className="ghost" onClick={resetSupplierForm}>取消编辑</button>}
        <button className="ghost" onClick={() => downloadCSV(csvRows, "gouka_suppliers.csv")}>CSV导出</button>
      </div>

      <div className="toolbar" style={{ marginTop: "18px" }}>
        <h2>供应商列表</h2>
        <div className="toolbar-right">
          <div className="search">
            <Search size={16} />
            <input placeholder="搜索供应商/地址/联系人" value={supplierQuery} onChange={(e) => setSupplierQuery(e.target.value)} />
          </div>
        </div>
      </div>

      <Table headers={headers} rows={rows} />
    </div>
  );
}


function splitLines(text) {
  return text
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

function joinLines(arr) {
  return (arr || []).join("\n");
}

function DictionaryPanel({ dictionaries, setDictionaries }) {
  const [brandText, setBrandText] = useState(joinLines(dictionaries.brands));
  const [materialText, setMaterialText] = useState(joinLines(dictionaries.materials));
  const [colorText, setColorText] = useState(joinLines(dictionaries.colors));
  const [originText, setOriginText] = useState(joinLines(dictionaries.origins));
  const [sourceText, setSourceText] = useState(joinLines(dictionaries.sources));
  const [platformText, setPlatformText] = useState(joinLines(dictionaries.platforms));
  const [selectedBrand, setSelectedBrand] = useState(dictionaries.brands?.[0] || "CHANEL");
  const [itemsText, setItemsText] = useState(joinLines(dictionaries.itemsByBrand?.[selectedBrand] || ["其他"]));

  function changeSelectedBrand(v) {
    setSelectedBrand(v);
    setItemsText(joinLines(dictionaries.itemsByBrand?.[v] || ["其他"]));
  }

  function saveDictionary() {
    const next = {
      ...dictionaries,
      brands: splitLines(brandText),
      materials: splitLines(materialText),
      colors: splitLines(colorText),
      origins: splitLines(originText),
      sources: splitLines(sourceText),
      platforms: splitLines(platformText),
      itemsByBrand: {
        ...dictionaries.itemsByBrand,
        [selectedBrand]: splitLines(itemsText)
      }
    };
    setDictionaries(next);
    alert("字典已保存。新商品录入会使用最新字典。");
  }

  function resetDictionary() {
    if (!window.confirm("确认恢复系统默认字典吗？")) return;
    setDictionaries(DEFAULT_DICTIONARIES);
    setBrandText(joinLines(DEFAULT_DICTIONARIES.brands));
    setMaterialText(joinLines(DEFAULT_DICTIONARIES.materials));
    setColorText(joinLines(DEFAULT_DICTIONARIES.colors));
    setOriginText(joinLines(DEFAULT_DICTIONARIES.origins));
    setSourceText(joinLines(DEFAULT_DICTIONARIES.sources));
    setPlatformText(joinLines(DEFAULT_DICTIONARIES.platforms));
    const b = DEFAULT_DICTIONARIES.brands[0];
    setSelectedBrand(b);
    setItemsText(joinLines(DEFAULT_DICTIONARIES.itemsByBrand[b] || ["其他"]));
  }

  return (
    <div className="panel">
      <h2><Database size={20} /> 字典管理</h2>
      <p className="note">
        V6.6开始，品牌、商品名、材质、颜色、产地、来源、平台都可以在这里维护。
        每行一个选项，保存后会自动出现在商品录入下拉菜单中。
      </p>

      <div className="formgrid">
        <label>
          品牌字典（每行一个）
          <textarea rows={10} value={brandText} onChange={(e) => setBrandText(e.target.value)} />
        </label>

        <label>
          材质字典
          <textarea rows={10} value={materialText} onChange={(e) => setMaterialText(e.target.value)} />
        </label>

        <label>
          颜色字典
          <textarea rows={10} value={colorText} onChange={(e) => setColorText(e.target.value)} />
        </label>

        <label>
          产地字典
          <textarea rows={8} value={originText} onChange={(e) => setOriginText(e.target.value)} />
        </label>

        <label>
          来源字典
          <textarea rows={8} value={sourceText} onChange={(e) => setSourceText(e.target.value)} />
        </label>

        <label>
          平台 / 运输方式字典
          <textarea rows={8} value={platformText} onChange={(e) => setPlatformText(e.target.value)} />
        </label>

        <label className="full">
          选择品牌，维护该品牌商品名
          <select value={selectedBrand} onChange={(e) => changeSelectedBrand(e.target.value)}>
            {splitLines(brandText).map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>

        <label className="full">
          {selectedBrand} 商品名字典（每行一个）
          <textarea rows={10} value={itemsText} onChange={(e) => setItemsText(e.target.value)} />
        </label>
      </div>

      <div className="action-row">
        <button className="primary" onClick={saveDictionary}>保存字典</button>
        <button className="ghost" onClick={resetDictionary}>恢复默认字典</button>
      </div>

      <div className="panel" style={{ marginTop: "18px", background: "#f8fafc" }}>
        <h3>V6.6说明</h3>
        <p>这一步先实现本地可维护字典。下一阶段可以接 Supabase，把字典、库存、图片全部云端化。</p>
      </div>
    </div>
  );
}


function Toolbar({ title, query, setQuery, statusFilter, setStatusFilter, onDownload }) {
  const statuses = ["全部", "采购中", "运输中", "已入库", "报关准备", "出品中", "已售出", "保留", "退货"];

  return (
    <div className="toolbar">
      <h2>{title}</h2>

      <div className="toolbar-right">
        {setQuery && (
          <div className="search">
            <Search size={16} />
            <input placeholder="搜索品牌/商品/材质" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        )}

        {setStatusFilter && (
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        )}

        {onDownload && (
          <button onClick={onDownload}>
            <Download size={16} /> CSV导出
          </button>
        )}
      </div>
    </div>
  );
}

function Table({ headers, rows }) {
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => <td key={j}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label>
      {label}
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}


function SelectWithOther({ label, value, onChange, options, placeholder = "" }) {
  const isKnown = options.includes(value);
  const selectValue = isKnown ? value : (value ? "其他" : "");
  const showCustom = selectValue === "其他";

  return (
    <label>
      {label}
      <select
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "其他") {
            onChange("");
          } else {
            onChange(v);
          }
        }}
      >
        <option value="">{placeholder || "请选择"}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      {showCustom && (
        <input
          style={{ marginTop: "6px" }}
          value={value === "其他" ? "" : value}
          placeholder="手动输入"
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}


createRoot(document.getElementById("root")).render(<App />);
