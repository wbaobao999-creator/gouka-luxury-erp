import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Package, FileText, Calculator, Search, Plus, Building2, Download, Edit3, Trash2, ImagePlus, Save, X, Lock } from "lucide-react";
import "./style.css";

const STORAGE_KEY = "gouka_erp_v2_items";
const LOGIN_KEY = "gouka_erp_login";
const LOGIN_USER = "admin";
const LOGIN_PASS = "GOUKA-ERP-2026!";

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
  images: []
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
    images: []
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
    images: []
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

        <div className="login-hint">
          默认账号：admin<br />
          默认密码：666888
        </div>
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
        const cost = Number(x.purchaseCny || 0) * Number(x.rate || 0);
        a.qty += Number(x.qty || 0);
        a.declared += Number(x.declaredCny || 0);
        a.cost += cost;
        a.sale += Number(x.saleJpy || 0);
        a.profit += Number(x.saleJpy || 0) - cost;
        return a;
      },
      { qty: 0, declared: 0, cost: 0, sale: 0, profit: 0 }
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
                images: form.images || []
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
        images: form.images || []
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
    ["profit", "利润分析"]
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
            <p>编辑・删除・自动保存・图片上传・状态筛选・古物台账・EMS报关・利润计算</p>
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
          />
        )}
        {tab === "ledger" && <Ledger items={filtered} downloadCSV={downloadCSV} />}
        {tab === "customs" && <Customs items={filtered} downloadCSV={downloadCSV} />}
        {tab === "profit" && <Profit items={filtered} />}
      </main>
    </div>
  );
}

function Dashboard({ totals, items }) {
  const margin = totals.sale ? (totals.profit / totals.sale) * 100 : 0;
  const withImages = items.filter((x) => x.images && x.images.length).length;

  return (
    <section className="grid4">
      <Card icon={<Package />} title="库存数量" value={`${totals.qty} 件`} />
      <Card icon={<FileText />} title="申报总额" value={cny(totals.declared)} />
      <Card icon={<Calculator />} title="预计销售额" value={jpy(totals.sale)} />
      <Card icon={<ImagePlus />} title="已上传图片商品" value={`${withImages} 件`} />

      <div className="panel wide">
        <h2>系统说明</h2>
        <p>V2 已支持：登录、编辑、删除、自动保存、本地图片上传、状态筛选、CSV导出。</p>
        <p>注意：当前登录为前端简易保护，适合内部临时使用。以后升级 Supabase 后，可支持员工独立账号。</p>
        <p>预计利润率：<b>{margin.toFixed(1)}%</b></p>
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
        <Input label="预计销售额 JPY" type="number" value={form.saleJpy} onChange={(v) => set("saleJpy", v)} />
        <Input label="仕入先 / 来源" value={form.source} onChange={(v) => set("source", v)} placeholder="China Supplier / Auction" />
        <Input label="相手方住所" value={form.address} onChange={(v) => set("address", v)} placeholder="China / Japan address" />
        <Input label="本人确认方式" value={form.idCheck} onChange={(v) => set("idCheck", v)} placeholder="Invoice / Passport / Residence Card" />
        <Select label="状态" value={form.status} onChange={(v) => set("status", v)} options={["采购中", "运输中", "已入库", "报关准备", "出品中", "已售出", "保留", "退货"]} />
        <Input label="平台" value={form.platform} onChange={(v) => set("platform", v)} placeholder="EMS / EcoRing / JBA" />

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

function Inventory({ items, query, setQuery, statusFilter, setStatusFilter, downloadCSV, editItem, deleteItem }) {
  const headers = ["图片", "商品编号", "入库日期", "品类", "品牌", "商品名", "材质", "颜色", "产地", "数量", "采购CNY", "申报CNY", "预计销售JPY", "状态", "操作"];
  const csvHeaders = ["商品编号", "入库日期", "品类", "品牌", "商品名", "材质", "颜色", "产地", "数量", "采购CNY", "申报CNY", "预计销售JPY", "状态"];
  const csvRows = [csvHeaders];

  items.forEach((x) =>
    csvRows.push([x.id, x.purchaseDate, x.category, x.brand, x.item, x.material, x.color, x.origin, x.qty, x.purchaseCny, x.declaredCny, x.saleJpy, x.status])
  );

  const rows = items.map((x) => [
    x.images && x.images.length ? <img className="thumb" src={x.images[0]} alt={x.item} /> : "—",
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
    x.saleJpy,
    x.status,
    <div className="table-actions">
      <button className="edit" onClick={() => editItem(x)}>
        <Edit3 size={14} /> 编辑
      </button>
      <button className="danger" onClick={() => deleteItem(x.id)}>
        <Trash2 size={14} /> 删除
      </button>
    </div>
  ]);

  return (
    <div className="panel">
      <Toolbar
        title="库存管理"
        query={query}
        setQuery={setQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onDownload={() => downloadCSV(csvRows, "gouka_inventory.csv")}
      />
      <Table headers={headers} rows={rows} />
    </div>
  );
}

function Ledger({ items, downloadCSV }) {
  const headers = ["No", "取引日", "商品番号", "区分", "ブランド", "商品名", "特徴", "数量", "取引区分", "金額", "通貨", "相手方", "住所", "本人確認", "売却先", "備考"];
  const rows = items.map((x, i) => [i + 1, x.purchaseDate, x.id, x.category, x.brand, x.item, `${x.material} / ${x.color} / ${x.origin}`, x.qty, "仕入", x.purchaseCny, "CNY", x.source, x.address, x.idCheck, "", x.memo]);

  return (
    <div className="panel">
      <Toolbar title="古物台账" onDownload={() => downloadCSV([headers, ...rows], "gouka_kobutsu_ledger.csv")} />
      <Table headers={headers} rows={rows} />
    </div>
  );
}

function Customs({ items, downloadCSV }) {
  const headers = ["No.", "Brand", "Item", "Material", "Color", "Specification", "Qty", "Country of Origin", "Declared Value (CNY)", "Remarks"];
  const rows = items.map((x, i) => [i + 1, x.brand, x.item, x.material, x.color, x.category, x.qty, x.origin, x.declaredCny, "Used luxury goods / Non-CITES material"]);
  const totalQty = items.reduce((a, x) => a + Number(x.qty || 0), 0);
  const totalValue = items.reduce((a, x) => a + Number(x.declaredCny || 0), 0);

  return (
    <div className="panel">
      <Toolbar title="EMS Commercial Customs Declaration" onDownload={() => downloadCSV([headers, ...rows, [], ["Total Quantity", totalQty], ["Total Declared Value", totalValue]], "gouka_ems_customs.csv")} />
      <p>
        <b>Importer:</b> 豪嘉株式会社 (GOUKA INC.)
      </p>
      <Table headers={headers} rows={rows} />
      <p className="note">Total Quantity: {totalQty} pieces / Total Declared Value: {cny(totalValue)}</p>
    </div>
  );
}

function Profit({ items }) {
  const headers = ["商品编号", "品牌", "商品名", "采购成本JPY", "预计销售JPY", "预计毛利JPY", "利润率"];
  const rows = items.map((x) => {
    const cost = Number(x.purchaseCny || 0) * Number(x.rate || 0);
    const profit = Number(x.saleJpy || 0) - cost;
    const margin = x.saleJpy ? ((profit / x.saleJpy) * 100).toFixed(1) + "%" : "";
    return [x.id, x.brand, x.item, Math.round(cost), x.saleJpy, Math.round(profit), margin];
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
