import React, { useState } from "react";
import { Package, FileText, Download } from "lucide-react";

// Shared calculations and components remain owned by the existing ERP.
export default function JapaneseAuctionPage({ items, downloadCSV, setPreviewImage, setPreviewScale, exportItemPdf, shared }) {
  const { inferredAuctionForItem, sortGoukaItems, jpy, moneyCell, productNameCell, ProductThumb, StatusBadge, Table, NbaaProductRecordDetail } = shared;
  const [auctionQuery, setAuctionQuery] = useState("");
  const [auctionHouseFilter, setAuctionHouseFilter] = useState("全部");
  const [auctionDateFilter, setAuctionDateFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("全部");
  const [auctionQualityFilter, setAuctionQualityFilter] = useState("全部");
  const [detailItem, setDetailItem] = useState(null);
  const [brandFilter, setBrandFilter] = useState("全部");
  const [boxQuery, setBoxQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  React.useEffect(() => { setPage(1); }, [auctionQuery, auctionHouseFilter, auctionDateFilter, paymentFilter, auctionQualityFilter, brandFilter, boxQuery]);
  const keyword = auctionQuery.trim().toLowerCase();

  function structuredAuction(item) {
    const raw = item?.auction && typeof item.auction === "object" ? item.auction : null;
    const normalized = inferredAuctionForItem(item);
    if (!normalized) return null;
    return { ...normalized, ...raw, ...normalized };
  }

  const baseAuctionRecords = sortGoukaItems(items || [])
    .map((item) => ({ item, auction: structuredAuction(item) }))
    .filter((x) => x.auction);

  const auctionHouses = ["全部", ...Array.from(new Set(baseAuctionRecords.map(({ auction }) => auction.platform || auction.auctionHouse).filter(Boolean))).sort()];

  const auctionDates = Array.from(new Set(baseAuctionRecords
    .filter(({ auction }) => auctionHouseFilter === "全部" || (auction.platform || auction.auctionHouse) === auctionHouseFilter)
    .map(({ item, auction }) => auction.auctionDate || item.purchaseDate).filter(Boolean))).sort().reverse();
  const brands = ["全部", ...Array.from(new Set(baseAuctionRecords.map(({ item }) => item.brand).filter(Boolean))).sort()];

  const fullAuctionQualitySummary = baseAuctionRecords.reduce((a, { auction }) => {
    if (auction.inferred) a.inferred += 1;
    else a.complete += 1;
    return a;
  }, { complete: 0, inferred: 0 });

  const auctionRecords = baseAuctionRecords.filter(({ item, auction }) => {
    const house = auction.platform || auction.auctionHouse || "";
    const date = auction.auctionDate || item.purchaseDate || "";
    const paid = Boolean(auction.paymentDate || auction.paymentMethod || Number(auction.invoiceTotal || 0) > 0);
    if (auctionHouseFilter !== "全部" && house !== auctionHouseFilter) return false;
    if (auctionDateFilter && date !== auctionDateFilter) return false;
    if (paymentFilter === "已付款" && !paid) return false;
    if (paymentFilter === "未付款" && paid) return false;
    if (auctionQualityFilter === "完整资料" && auction.inferred) return false;
    if (auctionQualityFilter === "需补充" && !auction.inferred) return false;
    if (brandFilter !== "全部" && item.brand !== brandFilter) return false;
    const boxText = [auction.boxNo, auction.branchNo, auction.lotNo].filter(Boolean).join("-");
    if (boxQuery.trim() && !boxText.toLowerCase().includes(boxQuery.trim().toLowerCase())) return false;
    if (!keyword) return true;
    return [
      item.id, item.brand, item.item, item.category, item.status,
      auction.platform, auction.auctionHouse, auction.auctionCode, auction.lotNo,
      auction.boxNo, auction.branchNo, auction.invoiceNo, auction.itemNameJp
    ].filter(Boolean).join(" ").toLowerCase().includes(keyword);
  });

  const summary = auctionRecords.reduce((a, { auction }) => {
    a.count += 1;
    a.paid += Number(auction.invoiceTotal || 0);
    a.cost += Number(auction.inventoryCost || 0);
    a.tax += Number(auction.taxCredit || 0);
    if (auction.paymentDate || auction.paymentMethod) a.paidCount += 1;
    if (auction.inferred) a.inferredCount += 1;
    else a.completeCount += 1;
    return a;
  }, { count: 0, paid: 0, cost: 0, tax: 0, paidCount: 0, completeCount: 0, inferredCount: 0 });

  const headers = ["图片", "商品编号", "品牌", "商品名", "拍卖公司", "落札コード", "Lot", "箱番", "枝番", "拍卖日", "付款总额", "库存成本", "消费税控除", "资料状态", "状态", "操作"];
  const csvRows = [headers.filter((h) => h !== "图片" && h !== "操作")];

  auctionRecords.forEach(({ item, auction }) => {
    csvRows.push([
      item.id, item.brand || "", item.item || "", auction.platform || auction.auctionHouse || "", auction.auctionCode || "",
      auction.lotNo || "", auction.boxNo || "", auction.branchNo || "", auction.auctionDate || item.purchaseDate || "",
      Math.round(Number(auction.invoiceTotal || 0)), Math.round(Number(auction.inventoryCost || 0)), Math.round(Number(auction.taxCredit || 0)), auction.inferred ? "需补充" : "完整资料", item.status || ""
    ]);
  });

  const rows = auctionRecords.map(({ item, auction }) => [
    <ProductThumb item={item} onPreview={(src) => { setPreviewScale?.(1); setPreviewImage?.(src); }} />,
    item.id,
    item.brand || "—",
    productNameCell(item.item),
    auction.platform || auction.auctionHouse || "—",
    auction.auctionCode || "—",
    auction.lotNo || "—",
    auction.boxNo || "—",
    auction.branchNo || "—",
    auction.auctionDate || item.purchaseDate || "—",
    moneyCell(auction.invoiceTotal),
    moneyCell(auction.inventoryCost),
    moneyCell(auction.taxCredit),
    auction.inferred ? <span className="inventory-pending">需补充</span> : <span className="status-badge status-已入库">完整</span>,
    <StatusBadge status={item.status} />,
    <div className="table-actions">
      <button className="ghost" onClick={() => setDetailItem(item)}>拍卖详情</button>
    </div>
  ]);

  const totalPages = Math.max(1, Math.ceil(auctionRecords.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRecords = auctionRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const clearFilters = () => {
    setAuctionQuery(""); setAuctionHouseFilter("全部"); setAuctionDateFilter("");
    setPaymentFilter("全部"); setAuctionQualityFilter("全部"); setBrandFilter("全部"); setBoxQuery("");
  };
  const pager = <div className="erp-auction-pager">
    <span>共 {auctionRecords.length} 件</span>
    {totalPages > 1 && <><button className="ghost" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>上一页</button><span>第 {currentPage} / {totalPages} 页</span><button className="ghost" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>下一页</button></>}
  </div>;

  return (
    <div className="panel erp-auction">
      <div className="toolbar">
        <h2><Package size={20} /> 日本拍卖</h2>
        <button className="ghost" onClick={() => downloadCSV(csvRows, "gouka_auction_records.csv")}><Download size={16} /> CSV导出</button>
      </div>
      <div className="erp-auction-session">
        <label>拍卖公司<select aria-label="拍卖公司" value={auctionHouseFilter} onChange={(e) => { setAuctionHouseFilter(e.target.value); setAuctionDateFilter(""); }}>
          {auctionHouses.map((x) => <option key={x} value={x}>{x === "全部" ? "全部拍卖公司" : x}</option>)}
        </select></label>
        <label>场次日期<select aria-label="场次日期" value={auctionDateFilter} onChange={(e) => setAuctionDateFilter(e.target.value)}>
          <option value="">全部场次</option>{auctionDates.map((x) => <option key={x} value={x}>{x}</option>)}
        </select></label>
      </div>
      <dl className="erp-auction-totals">
        <div><dt>当前商品</dt><dd>{summary.count} 件</dd></div>
        <div><dt>精算合计</dt><dd>{jpy(summary.paid)}</dd></div>
        <div><dt>库存成本合计</dt><dd>{jpy(summary.cost)}</dd></div>
      </dl>
      <div className="erp-auction-filters">
        <label>品牌<select aria-label="品牌" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>{brands.map((x) => <option key={x} value={x}>{x === "全部" ? "全部品牌" : x}</option>)}</select></label>
        <label>商品查询<input placeholder="商品编号 / 商品名 / 落札代码" value={auctionQuery} onChange={(e) => setAuctionQuery(e.target.value)} /></label>
        <label>箱番 / 枝番 / Lot<input placeholder="例如 7-8" value={boxQuery} onChange={(e) => setBoxQuery(e.target.value)} /></label>
        <button className="ghost" onClick={clearFilters}>清除筛选</button>
      </div>
      <details className="erp-fold"><summary>付款与资料筛选</summary>
        <div className="filter-row">
          <label>付款状态<select aria-label="付款状态" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>{["全部", "已付款", "未付款"].map((x) => <option key={x} value={x}>{x === "全部" ? "全部付款状态" : x}</option>)}</select></label>
          <label>资料状态<select aria-label="资料状态" value={auctionQualityFilter} onChange={(e) => setAuctionQualityFilter(e.target.value)}>{["全部", "完整资料", "需补充"].map((x) => <option key={x} value={x}>{x === "全部" ? "全部资料状态" : x}</option>)}</select></label>
          <span>完整 {summary.completeCount} 件 / 需补充 {summary.inferredCount} 件</span>
        </div>
      </details>
      {(paymentFilter !== "全部" || auctionQualityFilter !== "全部") && <div className="gouka-active-filter">付款：{paymentFilter} · 资料：{auctionQualityFilter}</div>}
      {pager}
      <div className="erp-auction-records">
        {pageRecords.map(({ item, auction }, i) => {
          const house = auction.platform || auction.auctionHouse || "—";
          const date = auction.auctionDate || item.purchaseDate || "—";
          return <article className="erp-auction-record" key={item.id || i}>
            <div className="erp-auction-photo">
              {item.images?.[0] ? <ProductThumb item={item} size={180} onPreview={(src) => { setPreviewScale?.(1); setPreviewImage?.(src); }} /> : <span>暂无图片</span>}
            </div>
            <div className="erp-auction-main">
              <div className="erp-auction-record-head">
                <div><small>{item.id}</small><h3>{item.brand || "—"} · {auction.itemNameJp || item.item || "未填写商品名"}</h3></div>
                <StatusBadge status={item.status} />
              </div>
              <div className="erp-auction-meta"><span>{house} / {date}</span><span>箱番 {auction.boxNo || "—"} - {auction.branchNo || "—"}</span><span>Lot {auction.lotNo || "—"}</span><span>落札代码 {auction.auctionCode || "—"}</span></div>
              <dl className="erp-auction-money">
                <div><dt>落札价（未税）</dt><dd>{auction.inferred ? "待补充" : jpy(auction.hammerPrice || 0)}</dd></div>
                <div><dt>手续费（未税）</dt><dd>{auction.inferred ? "待补充" : jpy(auction.buyerFee || 0)}</dd></div>
                <div><dt>库存成本</dt><dd>{jpy(auction.inventoryCost || 0)}</dd></div>
              </dl>
              <div className="erp-auction-actions">
                <span className={auction.inferred ? "inventory-pending" : "status-badge status-已入库"}>{auction.inferred ? "资料需补充" : "资料完整"}</span>
                <button className="ghost" onClick={() => setDetailItem(item)}><FileText size={14} /> 商品详情</button>
                {exportItemPdf && <button className="ghost" onClick={() => exportItemPdf(item)}><Download size={14} /> PDF</button>}
              </div>
              <details className="erp-fold erp-auction-settlement"><summary>结算明细</summary>
                <dl className="erp-auction-settlement-fields">
                  <div><dt>落札消费税</dt><dd>{auction.inferred ? "待补充" : jpy(auction.hammerTax || 0)}</dd></div>
                  <div><dt>手续费消费税</dt><dd>{auction.inferred ? "待补充" : jpy(auction.buyerFeeTax || 0)}</dd></div>
                  <div><dt>日本国内运费</dt><dd>{auction.inferred ? "待补充" : jpy(auction.domesticShipping || 0)}</dd></div>
                  <div><dt>精算金额</dt><dd>{jpy(auction.invoiceTotal || 0)}</dd></div>
                  <div><dt>消费税控除</dt><dd>{jpy(auction.taxCredit || 0)}</dd></div>
                  <div><dt>精算单号</dt><dd>{auction.invoiceNo || "—"}</dd></div>
                  <div><dt>付款日期</dt><dd>{auction.paymentDate || "—"}</dd></div>
                  <div><dt>付款方式</dt><dd>{auction.paymentMethod || "—"}</dd></div>
                </dl>
              </details>
            </div>
          </article>;
        })}
        {!auctionRecords.length && <div className="erp-empty-state">暂无符合条件的拍卖商品</div>}
      </div>
      {totalPages > 1 && pager}
      <details className="erp-fold auction-original-table"><summary>完整明细横表</summary><Table headers={headers} rows={rows} /></details>
      <details className="erp-fold"><summary>税额与资料汇总</summary>
        <dl className="erp-auction-totals">
          <div><dt>当前消费税控除</dt><dd>{jpy(summary.tax)}</dd></div>
          <div><dt>当前付款记录</dt><dd>{summary.paidCount} 件</dd></div>
          <div><dt>全部资料完整 / 需补充</dt><dd>{fullAuctionQualitySummary.complete} / {fullAuctionQualitySummary.inferred}</dd></div>
        </dl>
      </details>
      {detailItem && <div className="image-modal" onClick={() => setDetailItem(null)}>
        <div className="panel" style={{ width: "1180px", maxWidth: "94vw", maxHeight: "88vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
          <NbaaProductRecordDetail item={detailItem} onClose={() => setDetailItem(null)} exportItemPdf={exportItemPdf} />
        </div>
      </div>}
    </div>
  );
}
