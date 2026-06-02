import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Package, FileText, Calculator, Search, Plus, Building2, Download, Edit3, Trash2, ImagePlus, Save, X, Lock, Database, Upload } from "lucide-react";
import "./style.css";

const STORAGE_KEY = "gouka_erp_v2_items";
const LOGIN_KEY = "gouka_erp_login";
const USERS = {
  gouka: { password: "777888", role: "owner", name: "老板账号" }
};
const TAX_RATE = 0.10;

const STANDARD_OPTIONS = {
  brands: [
    "CHANEL", "HERMES", "Louis Vuitton", "GUCCI", "Dior", "Cartier", "BVLGARI",
    "Tiffany", "Van Cleef & Arpels", "Rolex", "OMEGA", "Chopard", "PRADA",
    "CELINE", "FENDI", "BOTTEGA VENETA", "LOEWE", "BALENCIAGA", "SAINT LAURENT",
    "MIU MIU", "BURBERRY", "GOYARD", "其他"
  ],
  materials: [
    "Caviar Leather", "Lambskin Leather", "Calfskin Leather", "Coated Canvas", "Canvas",
    "Monogram Canvas", "Damier Canvas", "Epi Leather", "Taiga Leather", "Togo Leather",
    "Epsom Leather", "Swift Leather", "Clemence Leather", "Box Calf", "Ostrich",
    "Crocodile", "Lizard", "Gold", "White Gold", "Rose Gold", "Silver", "Platinum",
    "Diamond", "Pearl", "Ceramic", "Stainless Steel", "其他"
  ],
  colors: [
    "Black", "Brown", "Monogram", "Damier Ebene", "Damier Azur", "White", "Ivory", "Grey",
    "Beige", "Camel", "Blue", "Navy", "Red", "Bordeaux", "Pink", "Purple", "Green",
    "Yellow", "Orange", "Gold", "Silver", "Rose Gold", "Multi Color", "其他"
  ],
  origins: [
    "France", "Italy", "Spain", "Germany", "Switzerland", "Japan", "USA", "UK",
    "Romania", "Portugal", "China", "Korea", "Thailand", "Vietnam", "其他"
  ],
  sources: [
    "中国供应商", "中国个人", "日本个人", "日本法人", "ECO Ring", "JBA", "AUCNET",
    "Star Buyers", "NBAA", "MONO AUCTION", "KOMEHYO Auction", "Mercari", "Yahoo",
    "Rakuten", "店头收购", "委托销售", "库存转入", "其他"
  ],
  platforms: [
    "EMS", "DHL", "FedEx", "UPS", "佐川急便", "ヤマト運輸", "日本郵便",
    "顺丰国际", "手提携带", "ECO Ring", "JBA", "AUCNET", "Mercari", "Yahoo",
    "Rakuten", "自社EC", "店铺", "Instagram", "其他"
  ],
  idChecks: [
    "Supplier invoice", "Supplier invoice / customs documents", "Passport", "Residence Card",
    "Driver License", "My Number Card", "Corporate documents", "Auction statement",
    "Bank transfer record", "其他"
  ],
  statuses: ["采购中", "运输中", "报关准备", "已入库", "出品中", "已售出", "保留", "退货"]
};

const ITEM_OPTIONS_BY_BRAND = {
  CHANEL: [
    "Classic Flap Bag", "Chain Flap Bag", "Boy Chanel", "Chanel 19", "Chanel 22",
    "Coco Handle", "Gabrielle", "Deauville", "Wallet on Chain", "Vanity Case",
    "Card Case", "Wallet", "Necklace", "Earrings", "Brooch", "Watch", "其他"
  ],
  HERMES: [
    "Birkin", "Kelly", "Constance", "Picotin", "Garden Party", "Evelyne", "Lindy",
    "Bolide", "Herbag", "Jypsiere", "Roulis", "Dogon Wallet", "Bearn Wallet",
    "Bracelet", "Scarf", "Twilly", "其他"
  ],
  "Louis Vuitton": [
    "Neverfull", "Speedy", "Alma", "OnTheGo", "Keepall", "Noe", "Pochette",
    "Pochette Accessoires", "Multi Pochette", "Capucines", "Diane", "Palm Springs",
    "Felicie", "Zippy Wallet", "Card Case", "Wallet", "其他"
  ],
  GUCCI: ["Dionysus", "Marmont", "Jackie", "Ophidia", "Horsebit", "Soho", "Bamboo", "Wallet", "Card Case", "其他"],
  Dior: ["Lady Dior", "Saddle", "Book Tote", "Diorama", "Caro", "30 Montaigne", "Wallet", "Card Case", "其他"],
  Cartier: ["LOVE Ring", "LOVE Bracelet", "Juste un Clou", "Trinity", "Ballon Bleu", "Tank", "Santos", "Panthere", "Ring", "Bracelet", "Necklace", "Watch", "其他"],
  BVLGARI: ["B.zero1", "Serpenti", "Divas Dream", "Bvlgari Bvlgari", "Save the Children", "Ring", "Necklace", "Bracelet", "Watch", "其他"],
  Tiffany: ["T Smile", "T Wire", "Victoria", "Key", "HardWear", "Open Heart", "Atlas", "Ring", "Necklace", "Bracelet", "其他"],
  "Van Cleef & Arpels": ["Vintage Alhambra", "Sweet Alhambra", "Magic Alhambra", "Frivole", "Perlee", "Ring", "Necklace", "Bracelet", "其他"],
  Rolex: ["Submariner", "Daytona", "Datejust", "GMT-Master", "Explorer", "Yacht-Master", "Oyster Perpetual", "其他"],
  OMEGA: ["Speedmaster", "Seamaster", "Constellation", "De Ville", "其他"],
  Chopard: ["Happy Diamonds", "Happy Sport", "Ice Cube", "Ring", "Necklace", "Watch", "其他"],
  PRADA: ["Galleria", "Re-Edition", "Cahier", "Canapa", "Wallet", "其他"],
  CELINE: ["Luggage", "Belt Bag", "Triomphe", "Box", "Ava", "Wallet", "其他"],
  FENDI: ["Peekaboo", "Baguette", "By The Way", "Wallet", "其他"],
  "BOTTEGA VENETA": ["Cassette", "Jodie", "Arco", "Pouch", "Wallet", "其他"],
  LOEWE: ["Puzzle", "Hammock", "Gate", "Amazona", "Wallet", "其他"],
  BALENCIAGA: ["City", "Hourglass", "Le Cagole", "Wallet", "其他"],
  "SAINT LAURENT": ["LouLou", "Kate", "Niki", "Sac de Jour", "Wallet", "其他"],
  GOYARD: ["Saint Louis", "Anjou", "Artois", "Saigon", "Wallet", "其他"]
};

const emptyForm = {
  purchaseDate: "",
  category: "バッグ類",
  brand: "",
  item: "",
  material: "",
  color: "",
  origin: "France",
  qty: 1,
  purchaseCny: "",
  declaredCny: "",
  rate: 21.8,
  saleJpy: "",
  shippingJpy: "",
  dutyJpy: "",
  customsFeeJpy: "",
  auctionFeeJpy: "",
  otherFeeJpy: "",
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
    purchaseCny: 11500,
    declaredCny: 11500,
    rate: 21.8,
    saleJpy: 285000,
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
    purchaseCny: 19500,
    declaredCny: 19500,
    rate: 21.8,
    saleJpy: 430000,
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
    shippingJpy: Number(x.shippingJpy || 0),
    dutyJpy: Number(x.dutyJpy || 0),
    customsFeeJpy: Number(x.customsFeeJpy || 0),
    auctionFeeJpy: Number(x.auctionFeeJpy || 0),
    otherFeeJpy: Number(x.otherFeeJpy || 0),
    ledgerStatus: x.ledgerStatus || "有效",
    ledgerVoidReason: x.ledgerVoidReason || "",
    ledgerUpdatedAt: x.ledgerUpdatedAt || "",
    ledgerHistory: Array.isArray(x.ledgerHistory) ? x.ledgerHistory : [
      { date: new Date().toISOString(), user: "system", action: "创建/导入" }
    ],
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
  const purchaseCostJpy = Number(x.purchaseCny || 0) * Number(x.rate || 0);
  const declaredJpy = Number(x.declaredCny || 0) * Number(x.rate || 0);
  const shippingJpy = Number(x.shippingJpy || 0);
  const dutyJpy = Number(x.dutyJpy || 0);
  const customsFeeJpy = Number(x.customsFeeJpy || 0);
  const auctionFeeJpy = Number(x.auctionFeeJpy || 0);
  const otherFeeJpy = Number(x.otherFeeJpy || 0);
  const extraCostJpy = shippingJpy + dutyJpy + customsFeeJpy + auctionFeeJpy + otherFeeJpy;
  const totalCostJpy = purchaseCostJpy + extraCostJpy;
  const costJpy = purchaseCostJpy;
  const inputTax = declaredJpy * TAX_RATE;
  const saleJpy = Number(x.soldPriceJpy || x.saleJpy || 0);
  const outputTax = saleJpy * TAX_RATE / (1 + TAX_RATE);
  const saleExTax = saleJpy - outputTax;
  const grossProfit = saleJpy - purchaseCostJpy;
  const netProfit = saleJpy - totalCostJpy;
  const taxBalance = outputTax - inputTax;
  const profitExTax = saleExTax - totalCostJpy;
  return { purchaseCostJpy, costJpy, declaredJpy, inputTax, saleJpy, outputTax, saleExTax, grossProfit, shippingJpy, dutyJpy, customsFeeJpy, auctionFeeJpy, otherFeeJpy, extraCostJpy, totalCostJpy, netProfit, taxBalance, profitExTax };
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
      onLogin({ username, role: user.role, name: user.name });
    } else {
      setError("账号或密码错误");
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo"><Lock size={28} /></div>
        <h1>豪嘉ERP V4.2</h1>
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
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [detailItem, setDetailItem] = useState(null);

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  if (!isLoggedIn) {
    return <LoginPage onLogin={(newSession) => { setSession(newSession); setIsLoggedIn(true); }} />;
  }

  const role = session?.role || "owner";
  const isOwner = true;

  function logout() {
    localStorage.removeItem(LOGIN_KEY);
    setSession(null);
    setIsLoggedIn(false);
  }

  function exportBackup() {
    const data = { version: "GOUKA-ERP-V4.2", exportedAt: new Date().toISOString(), items };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gouka_erp_backup_${new Date().toISOString().slice(0,10)}.json`;
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
          alert("备份数据已恢复");
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
        a.cost += t.totalCostJpy;
        a.sale += t.saleJpy;
        a.profit += t.netProfit;
        a.inputTax += t.inputTax;
        a.outputTax += t.outputTax;
        a.taxBalance += t.taxBalance;
        a.profitExTax += t.profitExTax;
        if (x.status === "已售出") {
          a.soldCount += Number(x.qty || 0);
          a.soldAmount += Number(x.soldPriceJpy || x.saleJpy || 0);
          a.soldProfit += t.netProfit;
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
                qty: Number(form.qty || 1),
                purchaseCny: Number(form.purchaseCny || 0),
                declaredCny: Number(form.declaredCny || form.purchaseCny || 0),
                rate: Number(form.rate || 0),
                saleJpy: Number(form.saleJpy || 0),
                shippingJpy: Number(form.shippingJpy || 0),
                dutyJpy: Number(form.dutyJpy || 0),
                customsFeeJpy: Number(form.customsFeeJpy || 0),
                auctionFeeJpy: Number(form.auctionFeeJpy || 0),
                otherFeeJpy: Number(form.otherFeeJpy || 0),
                images: form.images || [],
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
        ledgerHistory: [{ date: new Date().toISOString(), user: session?.username || "gouka", action: "创建商品并生成古物台账" }],
        qty: Number(form.qty || 1),
        purchaseCny: Number(form.purchaseCny || 0),
        declaredCny: Number(form.declaredCny || form.purchaseCny || 0),
        rate: Number(form.rate || 0),
        saleJpy: Number(form.saleJpy || 0),
        shippingJpy: Number(form.shippingJpy || 0),
        dutyJpy: Number(form.dutyJpy || 0),
        customsFeeJpy: Number(form.customsFeeJpy || 0),
        auctionFeeJpy: Number(form.auctionFeeJpy || 0),
        otherFeeJpy: Number(form.otherFeeJpy || 0),
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

  const menu = [
    ["dashboard", "控制台"],
    ["add", editingId ? "编辑商品" : "商品录入"],
    ["inventory", "库存管理"],
    ["ledger", "古物台账"],
    ["customs", "EMS报关"],
    ["profit", "利润分析"],
    ["tax", "消费税参考"],
    ["sales", "销售记录"],
    ["backup", "备份恢复"]
  ];

  return (
    <div className="app">
      <aside>
        <div className="brand">
          <Building2 size={24} />
          <div>
            <b>豪嘉株式会社</b>
            <span>GOUKA Luxury ERP V4.2</span>
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
            <h1>二手奢侈品管理系统 V4.2</h1>
            <p>自动保存・图片上传・状态筛选・古物台账锁定・EMS报关・利润计算・备份恢复</p>
          </div>
          <span className="pill">Auto Save · {isOwner ? "老板" : "员工"}</span>
        </header>

        {tab === "dashboard" && <Dashboard totals={totals} items={items} setTab={setTab} exportBackup={exportBackup} />}
        {tab === "add" && (
          <AddForm
            form={form}
            setForm={setForm}
            saveItem={saveItem}
            resetForm={resetForm}
            editingId={editingId}
            handleImages={handleImages}
            removeImage={removeImage}
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
            setDetailItem={setDetailItem}
            setPreviewImage={setPreviewImage}
            setPreviewScale={setPreviewScale}
          />
        )}
        {tab === "ledger" && <Ledger items={filtered} setItems={setItems} isOwner={isOwner} downloadCSV={downloadCSV} />}
        {tab === "customs" && <Customs items={filtered} downloadCSV={downloadCSV} />}
        {tab === "profit" && <Profit items={filtered} />}
        {tab === "tax" && <TaxReport items={filtered} totals={totals} downloadCSV={downloadCSV} />}
        {tab === "sales" && <SalesReport items={items} downloadCSV={downloadCSV} />}
        {tab === "backup" && <BackupPanel items={items} exportBackup={exportBackup} importBackup={importBackup} />}

        {detailItem && <DetailModal item={detailItem} onClose={() => setDetailItem(null)} />}

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
  const margin = totals.sale ? (totals.profit / totals.sale) * 100 : 0;
  const withImages = items.filter((x) => x.images && x.images.length).length;
  const activeStock = items.filter((x) => x.status !== "已售出" && x.status !== "退货").length;
  const soldItems = items.filter((x) => x.status === "已售出");
  const recent = items.slice(0, 5);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthInItems = items.filter((x) => (x.purchaseDate || "").startsWith(currentMonth));
  const monthSoldItems = items.filter((x) => x.status === "已售出" && (x.soldDate || "").startsWith(currentMonth));
  const monthSale = monthSoldItems.reduce((a, x) => a + calcTax(x).saleJpy, 0);
  const monthProfit = monthSoldItems.reduce((a, x) => a + calcTax(x).netProfit, 0);

  const brandMap = items.reduce((a, x) => {
    const k = x.brand || "未填写";
    a[k] = (a[k] || 0) + 1;
    return a;
  }, {});
  const brandRows = Object.entries(brandMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxBrand = Math.max(1, ...brandRows.map(([,v])=>v));

  return (
    <section className="v3-dashboard">
      <div className="v3-hero">
        <div>
          <span className="v3-kicker">GOUKA ERP V4.2</span>
          <h1>老板驾驶舱</h1>
          <p>库存、销售、真实成本、净利润、消费税、古物台账、EMS报关集中管理。</p>
          <div className="v3-hero-actions">
            <button onClick={() => setTab("add")}>新增商品</button>
            <button onClick={() => setTab("inventory")}>查看库存</button>
            <button onClick={exportBackup}>立即备份</button>
          </div>
        </div>
        <div className="v3-hero-right">
          <p>预计净利润</p>
          <h2>{jpy(totals.profit)}</h2>
          <span>预计利润率 {margin.toFixed(1)}% · 当前库存 {activeStock} 件</span>
        </div>
      </div>

      <div className="v3-kpi-grid">
        <div className="v3-kpi blue"><span>📦</span><p>本月入库</p><h2>{monthInItems.length} 件</h2><small>{currentMonth}</small></div>
        <div className="v3-kpi green"><span>💴</span><p>本月销售额</p><h2>{jpy(monthSale)}</h2><small>本月售出 {monthSoldItems.length} 件</small></div>
        <div className="v3-kpi orange"><span>📈</span><p>本月净利润</p><h2>{jpy(monthProfit)}</h2><small>扣除运费/关税/手续费</small></div>
        <div className="v3-kpi purple"><span>🧾</span><p>消费税差额参考</p><h2>{jpy(totals.taxBalance)}</h2><small>正式申告交由税理士确认</small></div>
      </div>

      <div className="v3-money-grid">
        <div className="v3-money-card"><p>当前库存</p><h2>{activeStock} 件</h2><small>不含已售出与退货</small></div>
        <div className="v3-money-card"><p>真实成本合计</p><h2>{jpy(totals.cost)}</h2><small>采购+运费+关税+手续费</small></div>
        <div className="v3-money-card"><p>预计销售总额</p><h2>{jpy(totals.sale)}</h2><small>含税销售额</small></div>
        <div className="v3-money-card highlight"><p>有图片商品</p><h2>{withImages} 件</h2><small>方便出品与台账留档</small></div>
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
          <div className="v3-panel-title"><div><h2>品牌占比</h2><p>按库存件数统计</p></div></div>
          <div className="v3-bars">
            {brandRows.map(([brand, count]) => (
              <div key={brand}>
                <div className="v3-bar-label"><b>{brand}</b><span>{count} 件</span></div>
                <div className="v3-bar-track"><div style={{width:`${Math.max(8, count / maxBrand * 100)}%`}} /></div>
              </div>
            ))}
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
        <p>V4.2 已强化品牌字典、商品名联动、产地/来源/平台标准化与实时利润预览。重要数据请每周导出JSON备份。</p>
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

function AddForm({ form, setForm, saveItem, resetForm, editingId, handleImages, removeImage }) {
  const set = (k, v) => setForm({ ...form, [k]: v });
  const itemOptions = ITEM_OPTIONS_BY_BRAND[form.brand] || ["Bag", "Wallet", "Watch", "Ring", "Necklace", "Bracelet", "Accessory", "Scarf", "Card Case", "其他"];
  const formPreview = calcTax(form);

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
        <Select label="品类" value={form.category} onChange={(v) => set("category", v)} options={["バッグ類", "財布・小物類", "時計類", "宝飾品類", "アクセサリー類", "その他"]} />
        <SmartInput label="品牌 Brand" value={form.brand} onChange={(v) => setForm({ ...form, brand: v, item: ITEM_OPTIONS_BY_BRAND[v]?.includes(form.item) ? form.item : "" })} options={STANDARD_OPTIONS.brands} placeholder="选择或输入品牌" />
        <SmartInput label="商品名 Item" value={form.item} onChange={(v) => set("item", v)} options={itemOptions} placeholder="先选品牌，再选择/输入商品名" />
        <SmartInput label="材质 Material" value={form.material} onChange={(v) => set("material", v)} options={STANDARD_OPTIONS.materials} placeholder="选择或输入材质" />
        <SmartInput label="颜色 Color" value={form.color} onChange={(v) => set("color", v)} options={STANDARD_OPTIONS.colors} placeholder="选择或输入颜色" />
        <SmartInput label="产地 Origin" value={form.origin} onChange={(v) => set("origin", v)} options={STANDARD_OPTIONS.origins} placeholder="选择或输入产地" />
        <Input label="数量 Qty" type="number" value={form.qty} onChange={(v) => set("qty", v)} />
        <Input label="采购金额 CNY" type="number" value={form.purchaseCny} onChange={(v) => set("purchaseCny", v)} />
        <Input label="申报金额 CNY" type="number" value={form.declaredCny} onChange={(v) => set("declaredCny", v)} />
        <Input label="汇率 CNY→JPY" type="number" value={form.rate} onChange={(v) => set("rate", v)} />
        <Input label="预计销售额 JPY（税込）" type="number" value={form.saleJpy} onChange={(v) => set("saleJpy", v)} />

        <Input label="EMS/国际运费 JPY" type="number" value={form.shippingJpy} onChange={(v) => set("shippingJpy", v)} />
        <Input label="关税 JPY" type="number" value={form.dutyJpy} onChange={(v) => set("dutyJpy", v)} />
        <Input label="报关/代行费 JPY" type="number" value={form.customsFeeJpy} onChange={(v) => set("customsFeeJpy", v)} />
        <Input label="拍卖/平台手续费 JPY" type="number" value={form.auctionFeeJpy} onChange={(v) => set("auctionFeeJpy", v)} />
        <Input label="其他费用 JPY" type="number" value={form.otherFeeJpy} onChange={(v) => set("otherFeeJpy", v)} />

        <SmartInput label="仕入先 / 来源" value={form.source} onChange={(v) => set("source", v)} options={STANDARD_OPTIONS.sources} placeholder="选择或输入来源" />
        <Input label="供应商地址" value={form.address} onChange={(v) => set("address", v)} placeholder="China / Japan address" />
        <SmartInput label="本人确认方式" value={form.idCheck} onChange={(v) => set("idCheck", v)} options={STANDARD_OPTIONS.idChecks} placeholder="选择或输入本人确认方式" />
        <Select label="状态" value={form.status} onChange={(v) => set("status", v)} options={STANDARD_OPTIONS.statuses} />
        <SmartInput label="平台" value={form.platform} onChange={(v) => set("platform", v)} options={STANDARD_OPTIONS.platforms} placeholder="选择或输入平台" />

        {form.status === "已售出" && (
          <>
            <Input label="销售日期" type="date" value={form.soldDate || ""} onChange={(v) => set("soldDate", v)} />
            <SmartInput label="销售平台" value={form.soldPlatform || ""} onChange={(v) => set("soldPlatform", v)} options={STANDARD_OPTIONS.platforms} placeholder="选择或输入销售平台" />
            <Input label="实际销售额 JPY（税込）" type="number" value={form.soldPriceJpy || ""} onChange={(v) => set("soldPriceJpy", v)} />
            <label className="full">
              销售备注
              <textarea value={form.soldMemo || ""} onChange={(e) => set("soldMemo", e.target.value)} placeholder="拍卖成交 / 线下销售 / 买家备注" />
            </label>
          </>
        )}

        <label className="full" onDragOver={(e) => e.preventDefault()} onDrop={onDropImages}>
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

      <div className="panel" style={{ marginTop: "18px", background: "#f8fafc" }}>
        <h3>实时利润预览</h3>
        <div className="grid4">
          <Card icon={<Calculator />} title="采购成本JPY" value={jpy(formPreview.purchaseCostJpy)} />
          <Card icon={<Calculator />} title="费用合计JPY" value={jpy(formPreview.extraCostJpy)} />
          <Card icon={<Calculator />} title="真实总成本" value={jpy(formPreview.totalCostJpy)} />
          <Card icon={<Calculator />} title="预计净利润" value={jpy(formPreview.netProfit)} />
        </div>
        <p className="note">费用合计 = EMS/国际运费 + 关税 + 报关/代行费 + 拍卖/平台手续费 + 其他费用。录入时实时更新，方便判断是否值得出品。</p>
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

function Inventory({ items, query, setQuery, statusFilter, setStatusFilter, downloadCSV, editItem, deleteItem, isOwner, setDetailItem, setPreviewImage, setPreviewScale }) {
  const headers = ["图片", "商品编号", "入库日期", "品牌", "商品名", "状态", "真实成本JPY", "预计销售JPY（税込）", "预计净利润", "操作"];
  const csvHeaders = ["商品编号", "入库日期", "品类", "品牌", "商品名", "材质", "颜色", "产地", "数量", "采购CNY", "申报CNY", "采购JPY", "运费JPY", "关税JPY", "报关费JPY", "拍卖手续费JPY", "其他费用JPY", "真实成本JPY", "进项消费税参考", "预计销售JPY税込", "预计净利润", "状态"];
  const csvRows = [csvHeaders];

  items.forEach((x) => {
    const t = calcTax(x);
    csvRows.push([x.id, x.purchaseDate, x.category, x.brand, x.item, x.material, x.color, x.origin, x.qty, x.purchaseCny, x.declaredCny, Math.round(t.purchaseCostJpy), Math.round(t.shippingJpy), Math.round(t.dutyJpy), Math.round(t.customsFeeJpy), Math.round(t.auctionFeeJpy), Math.round(t.otherFeeJpy), Math.round(t.totalCostJpy), Math.round(t.inputTax), x.saleJpy, Math.round(t.netProfit), x.status]);
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
      Math.round(t.totalCostJpy),
      x.saleJpy,
      Math.round(t.netProfit),
      <div className="table-actions">
        <button className="ghost" onClick={() => setDetailItem(x)}>详情</button>
        <button className="edit" onClick={() => editItem(x)}><Edit3 size={14} /> 编辑</button>
        {isOwner && <button className="danger" onClick={() => deleteItem(x.id)}><Trash2 size={14} /> 作废</button>}
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
        onDownload={() => downloadCSV(csvRows, "gouka_inventory_v41.csv")}
      />
      <Table headers={headers} rows={rows} />
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

  function markCorrected(id) {
    const memo = window.prompt("请输入更正说明：", "已根据原始资料更正录入内容");
    if (!memo) return;
    setItems((prev) => prev.map((x) => x.id === id ? addHistory({
      ...x,
      ledgerStatus: "更正"
    }, "gouka", `古物台账更正：${memo}`) : x));
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
    "CNY",
    x.source,
    x.address,
    x.idCheck,
    "",
    x.memo,
    x.ledgerStatus || "有效",
    (x.ledgerHistory || []).slice(-3).map((h) => `${(h.date || "").slice(0,10)} ${h.action}`).join(" / "),
    <div className="table-actions">
      {(x.ledgerStatus || "有效") === "作废" ? (
        isOwner ? <button className="edit" onClick={() => restoreLedger(x.id)}>恢复</button> : "作废"
      ) : (
        <>
          <button className="edit" onClick={() => markCorrected(x.id)}>更正</button>
          {isOwner && <button className="danger" onClick={() => voidLedger(x.id)}>作废</button>}
        </>
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
  const headers = ["No.", "Brand", "Item", "Material", "Color", "Specification", "Qty", "Country of Origin", "Declared Value (CNY)", "Declared Value (JPY)", "Import Tax 10% Ref", "Remarks"];
  const rows = items.map((x, i) => {
    const t = calcTax(x);
    return [i + 1, x.brand, x.item, x.material, x.color, x.category, x.qty, x.origin, x.declaredCny, Math.round(t.declaredJpy), Math.round(t.inputTax), "Used luxury goods / Non-CITES material"];
  });
  const totalQty = items.reduce((a, x) => a + Number(x.qty || 0), 0);
  const totalValue = items.reduce((a, x) => a + Number(x.declaredCny || 0), 0);

  return (
    <div className="panel">
      <Toolbar title="EMS Commercial Customs Declaration" onDownload={() => downloadCSV([headers, ...rows, [], ["Total Quantity", totalQty], ["Total Declared Value CNY", totalValue]], "gouka_ems_customs_tax.csv")} />
      <p>
        <b>Importer:</b> 豪嘉株式会社 (GOUKA INC.)
      </p>
      <Table headers={headers} rows={rows} />
      <p className="note">Total Quantity: {totalQty} pieces / Total Declared Value: {cny(totalValue)}</p>
    </div>
  );
}

function Profit({ items }) {
  const headers = ["商品编号", "品牌", "商品名", "采购成本JPY", "运费", "关税", "报关费", "手续费", "其他", "真实成本", "销售JPY（税込）", "销售消费税", "预计净利润", "不含税利润参考", "利润率"];
  const rows = items.map((x) => {
    const t = calcTax(x);
    const margin = t.saleJpy ? ((t.netProfit / t.saleJpy) * 100).toFixed(1) + "%" : "";
    return [x.id, x.brand, x.item, Math.round(t.purchaseCostJpy), Math.round(t.shippingJpy), Math.round(t.dutyJpy), Math.round(t.customsFeeJpy), Math.round(t.auctionFeeJpy), Math.round(t.otherFeeJpy), Math.round(t.totalCostJpy), Math.round(t.saleJpy), Math.round(t.outputTax), Math.round(t.netProfit), Math.round(t.profitExTax), margin];
  });

  return (
    <div className="panel">
      <h2><Calculator size={20} /> 利润分析</h2>
      <p className="note">V4.2：预计净利润已扣除采购成本、EMS运费、关税、报关费、拍卖/平台手续费和其他费用。</p>
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
      Math.round(t.totalCostJpy),
      Math.round(t.outputTax),
      Math.round(t.netProfit),
      Math.round(t.profitExTax),
      x.soldMemo || ""
    ];
  });

  const totalSale = filteredSold.reduce((a, x) => a + Number(x.soldPriceJpy || x.saleJpy || 0), 0);
  const totalCost = filteredSold.reduce((a, x) => a + calcTax(x).totalCostJpy, 0);
  const totalProfit = filteredSold.reduce((a, x) => a + calcTax(x).netProfit, 0);
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
      <p className="note">当前系统数据保存在本机浏览器。换电脑、清理浏览器、重装系统前，一定要先导出备份。</p>

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

function SmartInput({ label, value, onChange, options = [], placeholder = "" }) {
  const listId = "list-" + label.replace(/[^a-zA-Z0-9]/g, "-");
  return (
    <label>
      {label}
      <input list={listId} value={value || ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      <datalist id={listId}>
        {options.map((o) => <option key={o} value={o} />)}
      </datalist>
    </label>
  );
}

function DetailModal({ item, onClose }) {
  const t = calcTax(item);
  const rows = [
    ["商品编号", item.id], ["入库日期", item.purchaseDate], ["品类", item.category], ["品牌", item.brand], ["商品名", item.item],
    ["材质", item.material], ["颜色", item.color], ["产地", item.origin], ["数量", item.qty], ["来源", item.source], ["供应商地址", item.address],
    ["采购CNY", item.purchaseCny], ["申报CNY", item.declaredCny], ["采购成本JPY", jpy(t.purchaseCostJpy)], ["运费JPY", jpy(t.shippingJpy)],
    ["关税JPY", jpy(t.dutyJpy)], ["报关费JPY", jpy(t.customsFeeJpy)], ["手续费JPY", jpy(t.auctionFeeJpy)], ["其他费用JPY", jpy(t.otherFeeJpy)],
    ["真实成本JPY", jpy(t.totalCostJpy)], ["预计销售JPY", jpy(t.saleJpy)], ["预计净利润", jpy(t.netProfit)], ["状态", item.status], ["台账状态", item.ledgerStatus || "有效"], ["备注", item.memo]
  ];
  return (
    <div className="image-modal" onClick={onClose}>
      <div className="panel" style={{width:"86vw", maxHeight:"86vh", overflow:"auto"}} onClick={(e) => e.stopPropagation()}>
        <div className="toolbar"><h2>商品详情</h2><button onClick={onClose}>关闭</button></div>
        <div className="image-row" style={{marginBottom:"16px"}}>
          {(item.images || []).map((src, i) => <div className="image-box" key={i}><img src={src} alt={item.item} /></div>)}
        </div>
        <Table headers={["项目", "内容"]} rows={rows} />
      </div>
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

createRoot(document.getElementById("root")).render(<App />);
