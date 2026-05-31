import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Package, FileText, Calculator, Search, Plus, Building2, Download, Edit3, Trash2, ImagePlus, Save, X, Lock } from "lucide-react";
import "./style.css";

const STORAGE_KEY = "gouka_erp_v2_items";
const LOGIN_KEY = "gouka_erp_login";
const LOGIN_USER = "gouka";
const LOGIN_PASS = "777888";
const TAX_RATE = 0.10;

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
    return saved ? JSON.parse(saved) : seedItems;
  } catch {
    return seedItems;
  }
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

function calcTax(x) {
  const costJpy = Number(x.purchaseCny || 0) * Number(x.rate || 0);
  const declaredJpy = Number(x.declaredCny || 0) * Number(x.rate || 0);
  const inputTax = declaredJpy * TAX_RATE;
  const saleJpy = Number(x.soldPriceJpy || x.saleJpy || 0);
  const outputTax = saleJpy * TAX_RATE / (1 + TAX_RATE);
  const saleExTax = saleJpy - outputTax;
  const grossProfit = saleJpy - costJpy;
  const taxBalance = outputTax - inputTax;
  const profitExTax = saleExTax - costJpy;
  return { costJpy, declaredJpy, inputTax, saleJpy, outputTax, saleExTax, grossProfit, taxBalance, profitExTax };
}

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(e) {
    e.preventDefault();
    if (username === LOGIN_USER && password === LOGIN_PASS) {
      localStorage.setItem(LOGIN_KEY, "yes");
      onLogin();
    } else {
      setError("账号或密码错误");
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo"><Lock size={28} /></div>
        <h1>豪嘉ERP V2</h1>
        <p>豪嘉株式会社内部管理系统</p>

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
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem(LOGIN_KEY) === "yes");
  const [tab, setTab] = useState("dashboard");
  const [items, setItems] = useState(loadItems);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewScale, setPreviewScale] = useState(1);

  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  if (!isLoggedIn) {
    return <LoginPage onLogin={() => setIsLoggedIn(true)} />;
  }

  function logout() {
    localStorage.removeItem(LOGIN_KEY);
    setIsLoggedIn(false);
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
        a.profit += t.grossProfit;
        a.inputTax += t.inputTax;
        a.outputTax += t.outputTax;
        a.taxBalance += t.taxBalance;
        a.profitExTax += t.profitExTax;
        if (x.status === "已售出") {
          a.soldCount += Number(x.qty || 0);
          a.soldAmount += Number(x.soldPriceJpy || x.saleJpy || 0);
          a.soldProfit += t.grossProfit;
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
            ? {
                ...x,
                ...form,
                qty: Number(form.qty || 1),
                purchaseCny: Number(form.purchaseCny || 0),
                declaredCny: Number(form.declaredCny || form.purchaseCny || 0),
                rate: Number(form.rate || 0),
                saleJpy: Number(form.saleJpy || 0),
                images: form.images || [],
                soldDate: form.soldDate || "",
                soldPlatform: form.soldPlatform || "",
                soldPriceJpy: Number(form.soldPriceJpy || 0),
                soldMemo: form.soldMemo || ""
              }
            : x
        )
      );
      alert("商品已更新");
    } else {
      const next = {
        ...form,
        id: `GOUKA-${new Date().getFullYear()}-${String(items.length + 1).padStart(4, "0")}`,
        qty: Number(form.qty || 1),
        purchaseCny: Number(form.purchaseCny || 0),
        declaredCny: Number(form.declaredCny || form.purchaseCny || 0),
        rate: Number(form.rate || 0),
        saleJpy: Number(form.saleJpy || 0),
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
    if (window.confirm(`确定删除商品 ${id} 吗？`)) {
      setItems(items.filter((x) => x.id !== id));
    }
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
    ["sales", "销售记录"]
  ];

  return (
    <div className="app">
      <aside>
        <div className="brand">
          <Building2 size={24} />
          <div>
            <b>豪嘉株式会社</b>
            <span>GOUKA Luxury ERP V2</span>
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
            <h1>二手奢侈品管理系统 V2</h1>
            <p>编辑・删除・自动保存・图片上传・状态筛选・古物台账・EMS报关・利润计算・消费税参考</p>
          </div>
          <span className="pill">Auto Save</span>
        </header>

        {tab === "dashboard" && <Dashboard totals={totals} items={items} />}
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
            setPreviewImage={setPreviewImage}
            setPreviewScale={setPreviewScale}
          />
        )}
        {tab === "ledger" && <Ledger items={filtered} downloadCSV={downloadCSV} />}
        {tab === "customs" && <Customs items={filtered} downloadCSV={downloadCSV} />}
        {tab === "profit" && <Profit items={filtered} />}
        {tab === "tax" && <TaxReport items={filtered} totals={totals} downloadCSV={downloadCSV} />}
        {tab === "sales" && <SalesReport items={items} downloadCSV={downloadCSV} />}

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

function Dashboard({ totals, items }) {
  const margin = totals.sale ? (totals.profit / totals.sale) * 100 : 0;
  const withImages = items.filter((x) => x.images && x.images.length).length;
  const activeStock = items.filter((x) => x.status !== "已售出" && x.status !== "退货").length;
  const soldItems = items.filter((x) => x.status === "已售出").length;

  return (
    <section>
      <div className="grid4">
        <Card icon={<Package />} title="当前库存件数" value={`${activeStock} 件`} />
        <Card icon={<FileText />} title="库存总采购成本" value={jpy(totals.cost)} />
        <Card icon={<Calculator />} title="预计销售总额" value={jpy(totals.sale)} />
        <Card icon={<Calculator />} title="预计毛利" value={jpy(totals.profit)} />

        <Card icon={<Calculator />} title="已售数量" value={`${soldItems} 件`} />
        <Card icon={<Calculator />} title="已售金额" value={jpy(totals.soldAmount)} />
        <Card icon={<Calculator />} title="已售毛利" value={jpy(totals.soldProfit)} />
        <Card icon={<ImagePlus />} title="有图片商品" value={`${withImages} 件`} />

        <Card icon={<Calculator />} title="销售消费税参考" value={jpy(totals.outputTax)} />
        <Card icon={<Calculator />} title="进项消费税参考" value={jpy(totals.inputTax)} />
        <Card icon={<Calculator />} title="消费税差额参考" value={jpy(totals.taxBalance)} />
        <Card icon={<Calculator />} title="预计利润率" value={`${margin.toFixed(1)}%`} />
      </div>

      <div className="panel wide" style={{marginTop:"16px"}}>
        <h2>经营概览</h2>
        <p>库存、销售、利润、消费税参考已整合。销售额与消费税为经营参考，正式申告请交由税理士确认。</p>
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

  return (
    <div className="panel">
      <h2>
        <Plus size={20} /> {editingId ? `编辑商品：${editingId}` : "新增商品"}
      </h2>

      <div className="formgrid">
        <Input label="仕入日" type="date" value={form.purchaseDate} onChange={(v) => set("purchaseDate", v)} />
        <Select label="品类" value={form.category} onChange={(v) => set("category", v)} options={["バッグ類", "財布・小物類", "時計類", "宝飾品類", "アクセサリー類", "その他"]} />
        <Input label="品牌 Brand" value={form.brand} onChange={(v) => set("brand", v)} placeholder="CHANEL / Hermès / LV" />
        <Input label="商品名 Item" value={form.item} onChange={(v) => set("item", v)} placeholder="Chain Flap Bag" />
        <Input label="材质 Material" value={form.material} onChange={(v) => set("material", v)} placeholder="Calfskin Leather" />
        <Input label="颜色 Color" value={form.color} onChange={(v) => set("color", v)} placeholder="Black" />
        <Input label="产地 Origin" value={form.origin} onChange={(v) => set("origin", v)} placeholder="France" />
        <Input label="数量 Qty" type="number" value={form.qty} onChange={(v) => set("qty", v)} />
        <Input label="采购金额 CNY" type="number" value={form.purchaseCny} onChange={(v) => set("purchaseCny", v)} />
        <Input label="申报金额 CNY" type="number" value={form.declaredCny} onChange={(v) => set("declaredCny", v)} />
        <Input label="汇率 CNY→JPY" type="number" value={form.rate} onChange={(v) => set("rate", v)} />
        <Input label="预计销售额 JPY（税込）" type="number" value={form.saleJpy} onChange={(v) => set("saleJpy", v)} />
        <Input label="仕入先 / 来源" value={form.source} onChange={(v) => set("source", v)} placeholder="China Supplier / Auction" />
        <Input label="供应商地址" value={form.address} onChange={(v) => set("address", v)} placeholder="China / Japan address" />
        <Input label="本人确认方式" value={form.idCheck} onChange={(v) => set("idCheck", v)} placeholder="Invoice / Passport / Residence Card" />
        <Select label="状态" value={form.status} onChange={(v) => set("status", v)} options={["采购中", "运输中", "已入库", "报关准备", "出品中", "已售出", "保留", "退货"]} />
        <Input label="平台" value={form.platform} onChange={(v) => set("platform", v)} placeholder="EMS / EcoRing / JBA" />

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

        <label className="full">
          商品图片（最多3张，本地保存）
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

function Inventory({ items, query, setQuery, statusFilter, setStatusFilter, downloadCSV, editItem, deleteItem, setPreviewImage, setPreviewScale }) {
  const headers = ["图片", "商品编号", "入库日期", "品类", "品牌", "商品名", "材质", "颜色", "产地", "数量", "采购CNY", "申报CNY", "采购JPY", "进项税参考", "预计销售JPY（税込）", "状态", "操作"];
  const csvHeaders = ["商品编号", "入库日期", "品类", "品牌", "商品名", "材质", "颜色", "产地", "数量", "采购CNY", "申报CNY", "采购JPY", "进项消费税参考", "预计销售JPY税込", "状态"];
  const csvRows = [csvHeaders];

  items.forEach((x) => {
    const t = calcTax(x);
    csvRows.push([x.id, x.purchaseDate, x.category, x.brand, x.item, x.material, x.color, x.origin, x.qty, x.purchaseCny, x.declaredCny, Math.round(t.costJpy), Math.round(t.inputTax), x.saleJpy, x.status]);
  });

  const rows = items.map((x) => {
    const t = calcTax(x);
    return [
      x.images && x.images.length ? <img className="thumb" src={x.images[0]} alt={x.item} onClick={() => { setPreviewScale(1); setPreviewImage(x.images[0]); }} /> : "—",
      x.id,
      x.purchaseDate,
      x.category,
      x.brand,
      x.item,
      x.material,
      x.color,
      x.origin,
      x.qty,
      x.purchaseCny,
      x.declaredCny,
      Math.round(t.costJpy),
      Math.round(t.inputTax),
      x.saleJpy,
      <StatusBadge status={x.status} />,
      <div className="table-actions">
        <button className="edit" onClick={() => editItem(x)}>
          <Edit3 size={14} /> 编辑
        </button>
        <button className="danger" onClick={() => deleteItem(x.id)}>
          <Trash2 size={14} /> 删除
        </button>
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
      <Table headers={headers} rows={rows} />
    </div>
  );
}

function Ledger({ items, downloadCSV }) {
  const [ledgerQuery, setLedgerQuery] = useState("");
  const [ledgerDate, setLedgerDate] = useState("");

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
    "備考"
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
    x.memo
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
        当前显示 {filteredItems.length} 件 / 全部 {items.length} 件
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
  const headers = ["商品编号", "品牌", "商品名", "采购成本JPY", "销售JPY（税込）", "销售不含税", "销售消费税", "预计毛利", "不含税利润参考", "利润率"];
  const rows = items.map((x) => {
    const t = calcTax(x);
    const margin = t.saleJpy ? ((t.grossProfit / t.saleJpy) * 100).toFixed(1) + "%" : "";
    return [x.id, x.brand, x.item, Math.round(t.costJpy), x.saleJpy, Math.round(t.saleExTax), Math.round(t.outputTax), Math.round(t.grossProfit), Math.round(t.profitExTax), margin];
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

createRoot(document.getElementById("root")).render(<App />);
