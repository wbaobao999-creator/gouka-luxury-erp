import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Archive, BarChart3, BookOpen, Building2, Calculator, Download, Eye, FileText, LayoutDashboard, Package, Search, Ship, X } from 'lucide-react';
import './styles.css';
import { LEGACY_KEYS, PAGE_SIZE } from './core/schema.js';
import { jpy } from './core/money.js';
import { normalizeAuctionRecord, normalizeProductRecord, normalizeProductRecords } from './core/legacyCompat.js';
import { calcAuctionPayment, calcAuctionInventoryCost, calcAuctionTaxCredit } from './core/auctionCalculations.js';
import { calcInventoryAgeDays, calcInventoryCost } from './core/inventoryCalculations.js';
import { calcProfit } from './core/salesCalculations.js';
import { calcTaxSummary } from './core/taxCalculations.js';
import { buildBusinessSummary } from './core/businessSummary.js';
import { buildProductTimeline } from './core/timeline.js';

const STORE_KEY = 'gouka_erp_e4_products';
const CUSTOMS_KEY = 'gouka_erp_e4_customs';
const MENU = ['Dashboard','商品中心','采购中心','日本拍卖','库存','出品','销售','精算中心','EMS','古物台账','利润分析','消费税','PDF中心','供应商','系统'];
const icons = { Dashboard: LayoutDashboard, 商品中心: Archive, 采购中心: Building2, 日本拍卖: Calculator, 库存: Package, 出品: FileText, 销售: BarChart3, 精算中心: Calculator, EMS: Ship, 古物台账: BookOpen, 利润分析: BarChart3, 消费税: Calculator, PDF中心: FileText, 供应商: Building2, 系统: Archive };

const productRecordPolishCss = `
.record { display: grid; gap: 14px; }
.recordActions { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.recordSheet { background:#eef4ed; border:1px solid #b7cbb4; border-radius:10px; padding:16px; }
.recordTop { display:grid; grid-template-columns:minmax(0,1fr) 260px; gap:18px; align-items:start; }
.recordTitle { margin:0 0 12px; color:#17351c; font-size:22px; letter-spacing:.02em; }
.fieldGrid { display:grid; grid-template-columns:180px minmax(0,1fr); border-top:1px solid #b7cbb4; border-left:1px solid #b7cbb4; background:#fff; }
.sectionLabel { grid-column:1/-1; background:#119d38; color:#fff; font-weight:900; text-align:center; padding:10px 12px; border-right:1px solid #b7cbb4; border-bottom:1px solid #b7cbb4; letter-spacing:.04em; }
.fieldLabel { background:#18a83d; color:#fff; font-weight:800; padding:9px 12px; border-right:1px solid #b7cbb4; border-bottom:1px solid #b7cbb4; min-height:38px; display:flex; align-items:center; justify-content:center; }
.fieldValue { background:#fff; color:#172033; padding:9px 12px; border-right:1px solid #b7cbb4; border-bottom:1px solid #b7cbb4; min-height:38px; word-break:break-word; display:flex; align-items:center; }
.recordSide { display:grid; gap:12px; position:sticky; top:18px; }
.recordImage { background:#fff; border:1px solid #cfd8cf; border-radius:8px; padding:10px; min-height:230px; display:grid; place-items:center; }
.recordImage img { width:220px; height:220px; object-fit:contain; border-radius:4px; cursor:zoom-in; }
.recordNoImage { width:220px; height:220px; display:grid; place-items:center; background:#f8faf8; color:#78907a; border:1px solid #d7e2d6; border-radius:4px; }
.gallery { display:flex; gap:8px; flex-wrap:wrap; }
.gallery img { width:72px; height:72px; object-fit:cover; border-radius:6px; border:2px solid #d7e2d6; cursor:pointer; background:#fff; }
.gallery img.active { border-color:#119d38; box-shadow:0 0 0 2px rgba(17,157,56,.18); }
.businessCard { background:#fff; border:1px solid #b7cbb4; border-radius:8px; overflow:hidden; }
.businessCard h3 { margin:0; padding:10px 12px; background:#119d38; color:#fff; font-size:15px; text-align:center; }
.bizRow { display:flex; justify-content:space-between; gap:8px; padding:10px 12px; border-top:1px solid #d8e5d6; font-size:13px; }
.bizRow strong { font-size:15px; color:#172033; white-space:nowrap; }
.bizRow.good strong { color:#067647; }
.bizRow.bad strong { color:#b42318; }
.timeline { display:flex; flex-wrap:wrap; gap:8px; margin-top:0; background:#fff; border:1px solid #b7cbb4; border-top:0; padding:12px; }
.step { min-width:118px; border:1px solid #d1d5db; border-radius:999px; padding:8px 12px; background:#f8fafc; color:#667085; font-weight:700; text-align:center; line-height:1.35; }
.step.done { background:#ecfdf3; border-color:#16a34a; color:#14532d; }
.step.active { background:#fff7ed; border-color:#f59e0b; color:#92400e; }
.stepDate { font-size:11px; opacity:.76; font-weight:600; }
@media(max-width:900px){ .recordTop{grid-template-columns:1fr}.recordSide{position:static}.fieldGrid{grid-template-columns:130px minmax(0,1fr)} .recordImage img,.recordNoImage{width:180px;height:180px} }
`;
if (typeof document !== 'undefined' && !document.getElementById('product-record-polish-css')) {
  const style = document.createElement('style');
  style.id = 'product-record-polish-css';
  style.textContent = productRecordPolishCss;
  document.head.appendChild(style);
}


function loadJson(key, fallback) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
function loadFirst(keys, fallback) { for (const key of keys) { const value = loadJson(key, null); if (Array.isArray(value) ? value.length : value) return value; } return fallback; }
function useStoredProducts() {
  const initial = useMemo(() => normalizeProductRecords(loadFirst(LEGACY_KEYS.products, seedProducts())), []);
  const [products, setProducts] = useState(initial);
  React.useEffect(() => { localStorage.setItem(STORE_KEY, JSON.stringify(products)); }, [products]);
  return [products, setProducts];
}
function seedProducts() {
  return [
    { id: 'G202606-0001', brand: 'CHANEL', item: 'Matelasse Chain Shoulder', category: '包袋', material: 'Lambskin', color: 'Black', origin: 'France', purchaseDate: new Date().toISOString().slice(0,10), purchaseType: '日本拍卖', source: 'NBAA', status: '已入库', listingStatus: '未出品', expectedSaleJpy: 380000, memo: '企业版样例档案', images: [], auction: { enabled: true, auctionHouse: 'NBAA', auctionCode: 'N26-001', auctionDate: new Date().toISOString().slice(0,10), invoiceNo: 'INV-NBAA-001', lotNo: '128', boxNo: 'B12', branchNo: '03', itemNameJp: 'シャネル チェーンショルダー', hammerPrice: 220000, hammerTax: 22000, buyerFee: 18000, buyerFeeTax: 1800, domesticShipping: 1200, otherAuctionCost: 0, paymentDate: new Date().toISOString().slice(0,10), paymentMethod: 'Bank Transfer' } },
    { id: 'G202606-0002', brand: 'Louis Vuitton', item: 'Speedy 25', category: '包袋', material: 'Canvas', color: 'Brown', origin: 'France', purchaseDate: new Date().toISOString().slice(0,10), purchaseType: '中国采购', source: '中国供应商', purchaseCurrency: 'CNY', purchaseAmount: 4200, purchaseRateToJpy: 21.8, expectedSaleJpy: 138000, status: '待出品', listingStatus: '未出品', idCheck: 'Supplier invoice' }
  ];
}
function useCustomsBatches() { const [batches, setBatches] = useState(() => loadFirst(LEGACY_KEYS.customsBatches, [])); React.useEffect(() => { localStorage.setItem(CUSTOMS_KEY, JSON.stringify(batches)); }, [batches]); return [batches, setBatches]; }
function productImage(product) { const img = product.images?.[0]; return img ? (img.src || img) : ''; }
function value(v) { return v === 0 ? '0' : (v || '-'); }
function csv(name, headers, rows) {
  const esc = (v) => '"' + String(v ?? '').replaceAll('\"','\"\"') + '"';
  const text = [headers, ...rows].map((r) => r.map(esc).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + text], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function App() {
  const [tab, setTab] = useState('Dashboard');
  const [products, setProducts] = useStoredProducts();
  const [customsBatches] = useCustomsBatches();
  const [record, setRecord] = useState(null);
  const normalized = useMemo(() => products.map(normalizeProductRecord), [products]);
  const openRecord = (product) => { setRecord(normalizeProductRecord(product)); setTab('商品中心'); };
  if (record) return <Shell tab="商品中心" setTab={(next) => { setRecord(null); setTab(next); }}><ProductRecordDetail product={record} onBack={() => setRecord(null)} /></Shell>;
  return <Shell tab={tab} setTab={setTab}>
    {tab === 'Dashboard' && <Dashboard products={normalized} batches={customsBatches} />}
    {tab === '商品中心' && <ProductCenter products={normalized} onOpen={openRecord} />}
    {tab === '日本拍卖' && <AuctionPage products={normalized} onOpen={openRecord} />}
    {tab === '库存' && <InventoryPage products={normalized} onOpen={openRecord} />}
    {tab === '古物台账' && <LedgerPage products={normalized} onOpen={openRecord} />}
    {tab === 'PDF中心' && <PdfCenter products={normalized} batches={customsBatches} onOpen={openRecord} />}
    {tab === '消费税' && <TaxPage products={normalized} batches={customsBatches} />}
    {!['Dashboard','商品中心','日本拍卖','库存','古物台账','PDF中心','消费税'].includes(tab) && <Placeholder title={tab} />}
  </Shell>;
}
function Shell({ tab, setTab, children }) {
  return <div className="app"><aside className="side"><div className="brand"><strong>GOUKA ERP</strong><span>Enterprise 4.0 Luxury Trading</span></div><nav className="nav">{MENU.map((name) => { const Icon = icons[name] || Archive; return <button key={name} className={tab === name ? 'active' : ''} onClick={() => setTab(name)}><Icon size={16} />{name}</button>; })}</nav></aside><main className="main"><header className="top"><div><h1>{tab}</h1><p>一件商品 = 一份永久档案</p></div></header>{children}</main></div>;
}
function Panel({ title, right, children }) { return <section className="panel"><div className="panelHead"><h2>{title}</h2>{right}</div>{children}</section>; }
function Table({ headers, rows }) { return <div className="tableWrap"><table><thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, i) => <tr key={i}>{row.map((cell, n) => <td key={n}>{cell}</td>)}</tr>) : <tr><td colSpan={headers.length}>没有数据</td></tr>}</tbody></table></div>; }
function Metric({ label, value: metricValue, tone }) { return <div className={'metric ' + (tone || '')}><span>{label}</span><strong>{metricValue}</strong></div>; }
function Pager({ total }) { return <div className="pager">默认分页 50 件 · 当前显示 {Math.min(total, PAGE_SIZE)} / {total}</div>; }

function ProductRecordDetail({ product, onBack }) {
  const p = normalizeProductRecord(product);
  const auction = normalizeAuctionRecord(p);
  const profit = calcProfit(p);
  const timeline = buildProductTimeline(p);
  const imageList = p.images || [];
  const initialImage = productImage(p);
  const [selectedImage, setSelectedImage] = useState(initialImage);

  const paymentTotal = auction.enabled ? calcAuctionPayment(auction) : Number(p.purchaseAmount || 0);
  const auctionCost = auction.enabled ? calcAuctionInventoryCost(auction) : 0;
  const taxCredit = auction.enabled ? calcAuctionTaxCredit(auction) : 0;
  const inventoryCost = calcInventoryCost(p);
  const expectedSale = Number(p.expectedSaleJpy || p.listingPriceJpy || 0);
  const expectedProfit = expectedSale ? expectedSale - inventoryCost : profit.expectedProfit;
  const inventoryAge = calcInventoryAgeDays(p);

  const rows = [];
  const section = (label) => rows.push({ section: label });
  const add = (label, data) => rows.push({ label, data: value(data) });

  section('基本资料');
  add('商品编号', p.id);
  add('取得日', p.purchaseDate);
  add('品牌', p.brand);
  add('商品', p.item);
  add('分类', p.category);
  add('颜色', p.color);
  add('材质', p.material);
  add('产地', p.origin);

  section('采购');
  add('采购来源', p.purchaseType || p.source);
  add('供应商', p.source);
  add('采购金额', p.purchaseAmount);
  add('采购币种', p.purchaseCurrency);
  add('采购汇率', p.purchaseRateToJpy);

  if (auction.enabled) {
    section('日本拍卖');
    add('拍卖会', auction.auctionHouse);
    add('落札编号', auction.auctionCode);
    add('Lot', auction.lotNo);
    add('箱番', auction.boxNo);
    add('枝番', auction.branchNo);
    add('Invoice', auction.invoiceNo);
    add('拍卖日', auction.auctionDate);
    add('付款方式', auction.paymentMethod);
    add('付款日期', auction.paymentDate);
    add('落札金额', jpy(auction.hammerPrice));
    add('落札消费税', jpy(auction.hammerTax));
    add('手续费', jpy(auction.buyerFee));
    add('手续费消费税', jpy(auction.buyerFeeTax));
    add('国内运费', jpy(auction.domesticShipping));
    add('其他费用', jpy(auction.otherAuctionCost));
    add('付款总额', jpy(paymentTotal));
    add('库存成本', jpy(auctionCost));
    add('消费税控除', jpy(taxCredit));
  }

  section('成本分析');
  add('实际支付', jpy(paymentTotal));
  add('库存成本', jpy(inventoryCost));
  add('消费税控除', jpy(taxCredit));
  add('关税', jpy(p.dutyJpy));
  add('进口消费税', jpy(p.importConsumptionTaxJpy));
  add('预计售价', jpy(expectedSale));
  add('预计利润', jpy(expectedProfit));
  add('实际利润', jpy(profit.actualProfit));

  section('库存');
  add('状态', p.status);
  add('库位', p.location);
  add('库存天数', inventoryAge + ' 天');

  section('销售');
  add('平台', p.soldPlatform);
  add('售价', jpy(p.soldPriceJpy));
  add('销售日期', p.soldDate);
  add('平台手续费', jpy(p.platformFeeJpy));
  add('退款', jpy(p.refundJpy));
  add('调整', jpy(p.adjustmentJpy));
  add('到账金额', jpy(p.finalDepositJpy));
  add('利润', jpy(profit.actualProfit));

  section('EMS');
  add('EMS批次', p.customsBatchId);
  add('申报金额', [p.declaredAmount, p.declaredCurrency].filter(Boolean).join(' '));
  add('关税', jpy(p.dutyJpy));
  add('进口消费税', jpy(p.importConsumptionTaxJpy));

  section('备注');
  add('自社システムコード', p.id);
  add('自社備考欄', p.memo);

  const activeIndex = timeline.findIndex((s) => !s.done);

  return <div className="record">
    <div className="recordActions">
      <button onClick={onBack}><X size={16}/>返回</button>
      <button onClick={() => exportProductPdf(p)}><Download size={16}/>商品详情 PDF</button>
      {auction.enabled && <button onClick={() => exportAuctionPdf(p)}><Download size={16}/>日本拍卖详情 PDF</button>}
    </div>

    <section className="recordSheet">
      <div className="recordTop">
        <div>
          <h2 className="recordTitle">商品档案 · {p.id}</h2>
          <div className="fieldGrid">
            {rows.map((r, i) => r.section ? <div className="sectionLabel" key={i}>{r.section}</div> : <React.Fragment key={i}>
              <div className="fieldLabel">{r.label}</div>
              <div className="fieldValue">{r.data}</div>
            </React.Fragment>)}
          </div>
        </div>

        <aside className="recordSide">
          <div className="recordImage" onClick={() => selectedImage && window.open(selectedImage, '_blank')}>
            {selectedImage ? <img src={selectedImage} alt="商品画像" /> : <div className="recordNoImage">No Image</div>}
          </div>
          {!!imageList.length && <div className="gallery">
            {imageList.map((img, i) => {
              const src = img.src || img;
              return <img key={i} className={src === selectedImage ? 'active' : ''} src={src} alt="商品画像" onClick={() => setSelectedImage(src)} />;
            })}
          </div>}
          <div className="businessCard">
            <h3>Business Summary</h3>
            <div className="bizRow"><span>实际支付</span><strong>{jpy(paymentTotal)}</strong></div>
            <div className="bizRow"><span>库存成本</span><strong>{jpy(inventoryCost)}</strong></div>
            <div className="bizRow"><span>消费税控除</span><strong>{jpy(taxCredit)}</strong></div>
            <div className="bizRow"><span>预计售价</span><strong>{jpy(expectedSale)}</strong></div>
            <div className={'bizRow ' + (expectedProfit >= 0 ? 'good' : 'bad')}><span>预计利润</span><strong>{jpy(expectedProfit)}</strong></div>
            <div className="bizRow"><span>库存天数</span><strong>{inventoryAge} 天</strong></div>
          </div>
        </aside>
      </div>

      <div className="sectionLabel" style={{marginTop:12}}>生命周期</div>
      <div className="timeline">
        {timeline.map((s, index) => <div key={s.key} className={'step ' + (s.done ? 'done' : index === activeIndex ? 'active' : '')}>
          {s.label}{s.date ? <><br /><span className="stepDate">{s.date}</span></> : null}
        </div>)}
      </div>
    </section>
  </div>;
}

function Dashboard({ products, batches }) { const summary = buildBusinessSummary(products, batches); const cards = [['库存价值', summary.inventoryValue], ['预计利润', summary.expectedProfit, summary.expectedProfit >= 0 ? 'good' : 'bad'], ['今日采购', summary.todayPurchase], ['今日销售', summary.todaySales], ['今日利润', summary.todayProfit, summary.todayProfit >= 0 ? 'good' : 'bad'], ['本月采购', summary.monthPurchase], ['本月销售', summary.monthSales], ['本月利润', summary.monthProfit, summary.monthProfit >= 0 ? 'good' : 'bad'], ['待出品', summary.needsListingCount], ['待报关', summary.needsCustomsCount], ['待发货', summary.needsShippingCount], ['日本拍卖采购额', summary.auctionMonthPurchase], ['日本拍卖消费税', summary.auctionMonthTaxCredit]]; return <div className="stack"><div className="metrics">{cards.map(([label, v, tone]) => <Metric key={label} label={label} value={typeof v === 'number' && !['待出品','待报关','待发货'].includes(label) ? jpy(v) : v} tone={tone} />)}</div><Panel title="Business Summary"><p className="placeholder">Dashboard 只读取 BusinessSummary，采购、库存、销售、利润、消费税均来自统一业务计算模块。</p></Panel></div>; }
function ProductCenter({ products, onOpen }) { const [q, setQ] = useState(''); const filtered = products.filter((p) => [p.id,p.brand,p.item,p.category,p.source].join(' ').toLowerCase().includes(q.toLowerCase())).slice(0, PAGE_SIZE); return <Panel title="商品中心" right={<div className="toolbar"><Search size={16}/><input className="search" placeholder="搜索商品编号 / 品牌 / 商品" value={q} onChange={(e) => setQ(e.target.value)} /></div>}><ProductList products={filtered} onOpen={onOpen} /><Pager total={products.length} /></Panel>; }
function ProductList({ products, onOpen }) { return <Table headers={['图片','编号','品牌','商品','分类','状态','库存成本','预计售价','详情']} rows={products.map((p) => { const profit = calcProfit(p); return [productImage(p) ? <img className="thumb" src={productImage(p)} /> : <span className="noImg">无图</span>, p.id, p.brand, p.item, p.category, <span className="badge">{p.status}</span>, jpy(profit.costJpy), jpy(profit.expectedSaleJpy), <button onClick={() => onOpen(p)}><Eye size={15}/>详情</button>]; })} />; }
function AuctionPage({ products, onOpen }) { const rows = products.filter((p) => normalizeAuctionRecord(p).enabled).slice(0, PAGE_SIZE).map((p) => { const a = normalizeAuctionRecord(p); return [productImage(p) ? <img className="thumb" src={productImage(p)} /> : <span className="noImg">无图</span>, p.id, p.brand, p.item, a.auctionHouse, a.auctionCode, a.auctionDate, jpy(calcAuctionPayment(a)), jpy(calcAuctionInventoryCost(a)), jpy(calcAuctionTaxCredit(a)), <span className="badge">{p.status}</span>, <button onClick={() => onOpen(p)}><Eye size={15}/>详情</button>]; }); return <Panel title="日本拍卖" right={<button onClick={() => csv('gouka_auction.csv',['编号','品牌','商品','拍卖会','落札编号'], rows.map((r) => [r[1],r[2],r[3],r[4],r[5]]))}><Download size={16}/>CSV</button>}><Table headers={['图片','编号','品牌','商品','拍卖会','落札编号','拍卖日','付款金额','库存成本','消费税控除','状态','详情']} rows={rows} /><Pager total={rows.length} /></Panel>; }
function InventoryPage({ products, onOpen }) { const stock = products.filter((p) => !p.soldDate && p.status !== '已发货').slice(0, PAGE_SIZE); return <Panel title="库存"><Table headers={['图片','编号','品牌','商品','状态','库位','库存天数','库存成本','详情']} rows={stock.map((p) => [productImage(p) ? <img className="thumb" src={productImage(p)} /> : <span className="noImg">无图</span>, p.id, p.brand, p.item, <span className="badge">{p.status}</span>, p.location || '-', calcInventoryAgeDays(p) + ' 天', jpy(calcInventoryCost(p)), <button onClick={() => onOpen(p)}><Eye size={15}/>详情</button>])} /><Pager total={stock.length} /></Panel>; }
function LedgerPage({ products, onOpen }) { const [auctionDetail, setAuctionDetail] = useState(null); const rows = products.slice(0, PAGE_SIZE).map((p) => { const a = normalizeAuctionRecord(p); return [p.purchaseDate, p.id, p.category, p.item, p.qty || 1, p.source || p.purchaseType, p.supplierAddress || '-', p.idCheck, p.soldDate || '-', p.soldPlatform || '-', <span className="badge">{p.ledgerStatus || 'VALID'}</span>, a.enabled ? <button onClick={() => setAuctionDetail(p)}>拍卖详情</button> : '-', <button onClick={() => onOpen(p)}><Eye size={15}/>详情</button>]; }); return <Panel title="古物台账"><Table headers={['取得日','商品编号','分类','品名','数量','仕入先','地址','确认资料','销售日','销售平台','状态','拍卖详情','操作']} rows={rows} />{auctionDetail && <AuctionModal product={auctionDetail} onClose={() => setAuctionDetail(null)} onOpen={() => onOpen(auctionDetail)} />}</Panel>; }
function AuctionModal({ product, onClose, onOpen }) { const a = normalizeAuctionRecord(product); return <div className="modalBackdrop"><div className="modal"><div className="modalHead"><h2>日本拍卖详情 · {product.id}</h2><button onClick={onClose}><X size={16}/>关闭</button></div><Table headers={['字段','内容']} rows={Object.entries({ 拍卖会:a.auctionHouse, 落札编号:a.auctionCode, Lot:a.lotNo, 箱番:a.boxNo, 枝番:a.branchNo, Invoice:a.invoiceNo, 拍卖日:a.auctionDate, 日文商品名:a.itemNameJp, 落札金额:jpy(a.hammerPrice), 落札消费税:jpy(a.hammerTax), 手续费:jpy(a.buyerFee), 手续费消费税:jpy(a.buyerFeeTax), 国内运费:jpy(a.domesticShipping), 其他费用:jpy(a.otherAuctionCost), 付款总额:jpy(calcAuctionPayment(a)), 库存成本:jpy(calcAuctionInventoryCost(a)), 消费税控除:jpy(calcAuctionTaxCredit(a)) }).map(([k,v]) => [k,v])} /><div className="row" style={{marginTop:12}}><button className="primary" onClick={onOpen}>进入 Product Record</button></div></div></div>; }
function TaxPage({ products, batches }) { const tax = calcTaxSummary(products, batches); return <div className="stack"><div className="metrics"><Metric label="日本拍卖进项税" value={jpy(tax.auctionInputTax)} /><Metric label="进口消费税" value={jpy(tax.importConsumptionTax)} /><Metric label="销售消费税" value={jpy(tax.salesConsumptionTax)} /><Metric label="消费税差额" value={jpy(tax.taxDifference)} tone={tax.taxDifference >= 0 ? 'bad' : 'good'} /></div><Panel title="消费税参考"><p className="placeholder">此页面为经营参考，不替代税理士正式申报。</p></Panel></div>; }
function PdfCenter({ products, batches }) { return <Panel title="PDF中心" right={<div className="row"><button onClick={() => exportInventoryPdf(products)}><Download size={16}/>库存 PDF</button><button onClick={() => exportLedgerPdf(products)}><Download size={16}/>古物台账 PDF</button><button onClick={() => exportTaxPdf(products, batches)}><Download size={16}/>消费税参考 PDF</button></div>}><Table headers={['编号','品牌','商品','PDF']} rows={products.slice(0, PAGE_SIZE).map((p) => [p.id,p.brand,p.item,<div className="row"><button onClick={() => exportProductPdf(p)}>商品详情 PDF</button>{normalizeAuctionRecord(p).enabled && <button onClick={() => exportAuctionPdf(p)}>日本拍卖 PDF</button>}</div>])} /></Panel>; }
function Placeholder({ title }) { return <Panel title={title}><p className="placeholder">该模块按 Enterprise 4.0 菜单保留入口。当前第一阶段聚焦 Product Record、Dashboard、日本拍卖、古物台账与 PDF 企业页眉。</p></Panel>; }

function enterpriseHeader(docNo) { return '<div style="display:flex;justify-content:space-between;border-bottom:2px solid #2f6f3a;padding-bottom:12px;margin-bottom:18px"><div><h1 style="margin:0">豪嘉株式会社</h1><div>GOUKA CO., LTD.</div><div>代表取締役 許 四傑</div><div>適格請求書発行事業者 登録番号：T120001249367</div><div>古物商許可番号：第62203R074231号</div><div>許可公安委員会：大阪府公安委員会</div><div>TEL：06-7176-7189</div></div><div style="text-align:right"><b>Document No.</b><br />' + docNo + '<div style="margin-top:18px;border:2px solid #b42318;color:#b42318;border-radius:50%;width:86px;height:86px;display:grid;place-items:center;font-weight:900">豪嘉<br/>会社印</div></div></div>'; }
function openPdfWindow(title, html) { const w = window.open('', '_blank'); if (!w) return; const docNo = 'GOUKA-' + Date.now(); w.document.write('<html><head><title>' + title + '</title><style>body{font-family:Arial,"Noto Sans JP","Microsoft YaHei",sans-serif;padding:24px;color:#172033}table{width:100%;border-collapse:collapse}th,td{border:1px solid #cfd7e3;padding:8px;text-align:left}th{background:#eef4ed}.note{color:#667085}</style></head><body>' + enterpriseHeader(docNo) + '<h2>' + title + '</h2>' + html + '</body></html>'); w.document.close(); w.print(); }
function exportProductPdf(p) { const product = normalizeProductRecord(p); const rows = [['商品编号', product.id], ['品牌', product.brand], ['商品', product.item], ['状态', product.status], ['库存成本', jpy(calcInventoryCost(product))], ['备注', product.memo || '-']]; openPdfWindow('商品详情 PDF', '<table>' + rows.map((r) => '<tr><th>' + r[0] + '</th><td>' + r[1] + '</td></tr>').join('') + '</table>'); }
function exportAuctionPdf(p) { const a = normalizeAuctionRecord(p); openPdfWindow('日本拍卖详情 PDF', '<table>' + Object.entries({ 拍卖会:a.auctionHouse, 落札编号:a.auctionCode, Lot:a.lotNo, 箱番:a.boxNo, 枝番:a.branchNo, 付款总额:jpy(calcAuctionPayment(a)), 库存成本:jpy(calcAuctionInventoryCost(a)), 消费税控除:jpy(calcAuctionTaxCredit(a)) }).map(([k,v]) => '<tr><th>' + k + '</th><td>' + v + '</td></tr>').join('') + '</table>'); }
function exportInventoryPdf(products) { openPdfWindow('库存 PDF', '<table><tr><th>编号</th><th>品牌</th><th>商品</th><th>库存成本</th></tr>' + products.map((p) => '<tr><td>' + p.id + '</td><td>' + p.brand + '</td><td>' + p.item + '</td><td>' + jpy(calcInventoryCost(p)) + '</td></tr>').join('') + '</table>'); }
function exportLedgerPdf(products) { openPdfWindow('古物台账 PDF', '<table><tr><th>取得日</th><th>商品编号</th><th>品名</th><th>仕入先</th><th>状态</th></tr>' + products.map((p) => '<tr><td>' + (p.purchaseDate || '') + '</td><td>' + p.id + '</td><td>' + p.item + '</td><td>' + (p.source || '') + '</td><td>' + (p.ledgerStatus || 'VALID') + '</td></tr>').join('') + '</table>'); }
function exportTaxPdf(products, batches) { const t = calcTaxSummary(products, batches); openPdfWindow('消费税参考 PDF', '<p class="note">此页面为经营参考，不替代税理士正式申报。</p><table>' + Object.entries({ 日本拍卖进项税:jpy(t.auctionInputTax), 进口消费税:jpy(t.importConsumptionTax), 销售消费税:jpy(t.salesConsumptionTax), 消费税差额:jpy(t.taxDifference) }).map(([k,v]) => '<tr><th>' + k + '</th><td>' + v + '</td></tr>').join('') + '</table>'); }

createRoot(document.getElementById('root')).render(<App />);
