import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Package, FileText, Calculator, Search, Plus, Building2, Download, Edit3, Trash2, ImagePlus, Save, X, Lock, Database, Upload } from "lucide-react";
import "./style.css";
import { getCloudItems, upsertCloudItem, deleteItemCloud, uploadItemImages, deleteProductImages } from "./itemService.js";

const STORAGE_KEY = "gouka_erp_v2_items";
const LOGIN_KEY = "gouka_erp_login";
const CASHFLOW_KEY = "gouka_erp_cashflow_v431";
const DICTIONARY_KEY = "gouka_erp_v5_dictionaries";
const SUPPLIER_KEY = "gouka_erp_v51_suppliers";
const DELETE_LOG_KEY = "gouka_erp_v663_delete_logs";
const CUSTOMS_BATCH_KEY = "gouka_erp_v7_customs_batches";
const USERS = {
  gouka: { password: "931205", role: "owner", name: "老板账号" }
};
const TAX_RATE = 0.10;
const CURRENCY_OPTIONS = ["CNY", "USD", "HKD", "EUR", "JPY"];
const DEFAULT_JPY_RATES = { CNY: 21.8, USD: 157, HKD: 20.1, EUR: 170, JPY: 1 };
const WORKFLOW_STATUSES = ["采购中", "运输中", "已入库", "待出品", "已出品", "已售出", "已发货", "报关准备", "保留", "退货"];
const LISTING_PLATFORMS = ["Mercari", "Yahoo", "楽天", "店铺", "NBAA", "OBA", "ECO Ring", "JBA", "AUCNET", "Star Buyers", "其他"];

function defaultRateFor(currency) {
  return DEFAULT_JPY_RATES[currency] || 1;
}

function amountToJpy(amount, currency, rate) {
  if (currency === "JPY") return Number(amount || 0);
  return Number(amount || 0) * Number(rate || defaultRateFor(currency));
}

function smartAmountToJpy(amount, currency, rate, saleJpy = 0) {
  const raw = Number(amount || 0);
  const fx = Number(rate || defaultRateFor(currency));
  const converted = amountToJpy(raw, currency, fx);

  // 防止误把“日元金额”录成 CNY/USD/HKD/EUR 后把消费税拉爆。
  // 例：1000000 实际是JPY，但币种选了CNY，系统会算成 21,800,000。
  // 如果换算后金额远高于售价，而原始金额本身接近售价，则按JPY保护计算。
  if (
    currency !== "JPY" &&
    raw >= 100000 &&
    Number(saleJpy || 0) > 0 &&
    converted > Number(saleJpy || 0) * 3 &&
    raw <= Number(saleJpy || 0) * 2
  ) {
    return {
      value: raw,
      warning: `疑似币种误选：${raw.toLocaleString()} ${currency} 按汇率会变成 ${Math.round(converted).toLocaleString()} JPY，已按JPY保护计算。请检查币种。`
    };
  }

  return { value: converted, warning: "" };
}

const BRAND_OPTIONS = [
  "CHANEL", "HERMES", "Louis Vuitton", "GUCCI", "Dior", "Prada", "Fendi", "Celine",
  "Bottega Veneta", "Balenciaga", "Saint Laurent", "LOEWE", "Cartier", "BVLGARI",
  "Tiffany", "Van Cleef & Arpels", "Chopard", "Rolex", "OMEGA", "其他"
];

const ITEM_OPTIONS_BY_BRAND = {
  "CHANEL": [
    "Classic Flap Bag", "Mini Flap Bag", "Double Flap", "Boy Chanel", "Chanel 19", "Chanel 22",
    "Coco Handle", "Gabrielle", "Wallet on Chain", "WOC", "Vanity Bag", "Business Affinity",
    "Deauville", "Cambon", "GST", "PST", "Camera Bag", "Shopping Tote", "Backpack",
    "Wallet", "Long Wallet", "Card Holder", "Key Case", "Brooch", "Earrings", "Necklace", "Bracelet", "其他"
  ],
  "HERMES": [
    "Birkin", "Kelly", "Kelly Sellier", "Kelly Retourne", "Constance", "Picotin", "Garden Party",
    "Evelyne", "Lindy", "Bolide", "Herbag", "Jypsiere", "Roulis", "Halzan", "24/24", "Verrou",
    "Bearn Wallet", "Kelly Wallet", "Constance Wallet", "Silk Scarf", "Twilly", "Belt", "其他"
  ],
  "Louis Vuitton": [
    "Neverfull", "Speedy", "Alma", "OnTheGo", "Keepall", "Pochette", "Pochette Accessoires", "Noe",
    "Dauphine", "Capucines", "Twist", "Multi Pochette", "Felicie", "Metis", "Pochette Metis",
    "Palm Springs", "Cluny", "Cannes", "Loop", "Boulogne", "Carryall", "Graceful", "Artsky", "Delightful",
    "Montsouris", "Saumur", "Papillon", "Eva", "Favorite", "Turenne", "Trevi", "Montaigne", "Lockit",
    "Wallet", "Zippy Wallet", "Victorine Wallet", "Sarah Wallet", "Card Holder", "Key Case", "Agenda", "其他"
  ],
  "GUCCI": [
    "Dionysus", "Marmont", "GG Marmont", "Jackie", "Jackie 1961", "Bamboo", "Ophidia", "Horsebit",
    "Soho", "Sylvie", "Padlock", "1955 Horsebit", "Belt Bag", "Tote Bag", "Wallet", "Card Holder", "其他"
  ],
  "Dior": [
    "Lady Dior", "Book Tote", "Saddle Bag", "Dior Caro", "30 Montaigne", "Diorama", "Diorissimo",
    "Bobby", "Camp", "Trotter", "Oblique", "Wallet", "Card Holder", "其他"
  ],
  "Prada": [
    "Galleria", "Re-Edition", "Cleo", "Nylon Bag", "Tessuto", "Saffiano Tote", "Canapa", "Hobo Bag",
    "Backpack", "Wallet", "Card Holder", "其他"
  ],
  "Fendi": [
    "Peekaboo", "Baguette", "By The Way", "Sunshine Shopper", "Kan I", "Mama Baguette", "Spy Bag",
    "Wallet", "Card Holder", "其他"
  ],
  "Celine": [
    "Luggage", "Belt Bag", "Triomphe", "Box", "Cabas", "Phantom", "Classic Box", "Ava", "16 Bag",
    "Trapeze", "Micro Luggage", "Nano Luggage", "Wallet", "Card Holder", "其他"
  ],
  "Bottega Veneta": [
    "Cassette", "Jodie", "Pouch", "Arco", "Veneta", "Cabat", "Loop", "Intrecciato Wallet", "Card Holder", "其他"
  ],
  "Balenciaga": [
    "City", "Hourglass", "Le Cagole", "Neo Classic", "Everyday", "Navy Cabas", "Wallet", "Card Holder", "其他"
  ],
  "Saint Laurent": [
    "Niki", "Loulou", "Kate", "Sac de Jour", "Sunset", "College", "Cassandra", "Envelope", "Toy LouLou",
    "Wallet", "Card Holder", "其他"
  ],
  "LOEWE": [
    "Puzzle", "Hammock", "Gate", "Amazona", "Flamenco", "Barcelona", "Basket", "Wallet", "Card Holder", "其他"
  ],
  "Cartier": [
    "LOVE Ring", "LOVE Bracelet", "Juste un Clou", "Trinity", "Tank Watch", "Santos", "Ballon Bleu",
    "Panthere", "Pasha", "Must de Cartier", "Ring", "Necklace", "Bracelet", "Earrings", "其他"
  ],
  "BVLGARI": [
    "Serpenti", "B.zero1", "Divas' Dream", "Bvlgari Bvlgari", "Save the Children", "Ring", "Necklace", "Bracelet", "Earrings", "Watch", "其他"
  ],
  "Tiffany": [
    "T Smile", "T Wire", "Victoria", "Keys", "HardWear", "Atlas", "1837", "Open Heart", "Bean", "Ring", "Necklace", "Bracelet", "Earrings", "其他"
  ],
  "Van Cleef & Arpels": [
    "Alhambra", "Vintage Alhambra", "Sweet Alhambra", "Magic Alhambra", "Frivole", "Perlee", "Lucky Alhambra", "Necklace", "Bracelet", "Ring", "Earrings", "其他"
  ],
  "Chopard": [
    "Happy Diamonds", "Ice Cube", "Happy Hearts", "Mille Miglia", "Ring", "Necklace", "Bracelet", "Earrings", "Watch", "其他"
  ],
  "Rolex": [
    "Submariner", "Datejust", "Daytona", "GMT-Master", "GMT-Master II", "Oyster Perpetual", "Explorer", "Explorer II",
    "Sea-Dweller", "Yacht-Master", "Day-Date", "Air-King", "Milgauss", "其他"
  ],
  "OMEGA": [
    "Speedmaster", "Seamaster", "Constellation", "De Ville", "Aqua Terra", "Planet Ocean", "Railmaster", "其他"
  ]
};

const MATERIAL_OPTIONS = [
  "Caviar Leather", "Lambskin Leather", "Calfskin Leather", "Grained Calfskin", "Smooth Calfskin",
  "Patent Leather", "Goatskin", "Sheepskin", "Taurillon Leather", "Vachetta Leather", "Nomade Leather",
  "Togo Leather", "Epsom Leather", "Swift Leather", "Clemence Leather", "Box Leather", "Barenia Leather",
  "Fjord Leather", "Chevre Leather", "Evercolor Leather", "Evergrain Leather",
  "Exotic Leather", "Crocodile", "Alligator", "Lizard", "Ostrich", "Python",
  "Coated Canvas", "Canvas", "Monogram Canvas", "Damier Canvas", "Damier Ebene", "Damier Azur",
  "Epi Leather", "Taiga Leather", "GG Canvas", "Oblique Canvas", "Triomphe Canvas",
  "Nylon", "Tessuto Nylon", "Denim", "Tweed", "Suede", "Velvet", "Satin", "Silk", "Wool", "Cashmere",
  "Gold", "Yellow Gold", "Pink Gold", "Rose Gold", "White Gold", "Silver", "Sterling Silver",
  "Platinum", "Diamond", "Pearl", "Ruby", "Sapphire", "Emerald", "Onyx", "Mother of Pearl",
  "Ceramic", "Steel", "Stainless Steel", "Titanium", "Carbon", "PVC", "Plastic", "Resin", "其他"
];

const COLOR_OPTIONS = [
  "Black", "Brown", "Dark Brown", "Light Brown", "White", "Beige", "Ivory", "Cream", "Grey", "Etoupe", "Etain", "Taupe",
  "Blue", "Navy", "Light Blue", "Red", "Bordeaux", "Wine", "Pink", "Rose", "Green", "Olive", "Yellow", "Orange",
  "Purple", "Gold", "Silver", "Champagne", "Bronze", "Monogram", "Damier", "Multicolor", "Clear", "其他"
];

const ORIGIN_OPTIONS = [
  "France", "Italy", "Spain", "Germany", "Switzerland", "Japan", "USA", "UK", "China", "Korea", "其他"
];

const SOURCE_OPTIONS = [
  "中国供应商", "中国个人", "日本个人", "ECO Ring", "JBA", "AUCNET", "Star Buyers",
  "NBAA", "MONO", "Mercari", "Yahoo", "店头收购", "其他"
];

const PLATFORM_OPTIONS = [
  "Mercari", "Yahoo", "楽天", "店铺",
  "NBAA", "OBA", "ECO Ring", "JBA", "AUCNET", "Star Buyers",
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

function loadDeleteLogs() {
  try {
    const saved = localStorage.getItem(DELETE_LOG_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}


function loadCustomsBatches() {
  try {
    const saved = localStorage.getItem(CUSTOMS_BATCH_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function makeCustomsBatchId(batches) {
  const d = new Date();
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  const prefix = `EMS-${ym}-`;
  const nums = (batches || [])
    .map((x) => String(x.id || ""))
    .filter((id) => id.startsWith(prefix))
    .map((id) => Number(id.replace(prefix, "")))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

function getDeclaredJpyForAllocation(x) {
  const saleJpy = Number(x.soldPriceJpy || x.saleJpy || 0);
  return smartAmountToJpy(
    x.declaredCny,
    x.declaredCurrency || "CNY",
    x.declaredRateToJpy || x.rate || defaultRateFor(x.declaredCurrency || "CNY"),
    saleJpy
  ).value;
}

function applyBatchAllocations(items, batches) {
  const batchMap = Object.fromEntries((batches || []).map((b) => [b.id, b]));
  const grouped = {};
  (items || []).forEach((x) => {
    if (!x.customsBatchId || !batchMap[x.customsBatchId]) return;
    if (!grouped[x.customsBatchId]) grouped[x.customsBatchId] = [];
    grouped[x.customsBatchId].push(x);
  });

  const allocMap = {};
  Object.entries(grouped).forEach(([batchId, arr]) => {
    const batch = batchMap[batchId];
    const totalDeclared = arr.reduce((a, x) => a + getDeclaredJpyForAllocation(x), 0) || arr.length || 1;
    arr.forEach((x) => {
      const declared = getDeclaredJpyForAllocation(x);
      const ratio = totalDeclared ? declared / totalDeclared : 1 / arr.length;
      allocMap[x.id] = {
        customsBatchId: batchId,
        batchName: batch.name || batchId,
        batchAllocatedDutyJpy: Number(batch.dutyJpy || 0) * ratio,
        batchAllocatedShippingJpy: Number(batch.shippingJpy || 0) * ratio,
        batchAllocatedCustomsFeeJpy: Number(batch.customsFeeJpy || 0) * ratio,
        batchAllocatedOtherCostJpy: Number(batch.otherCostJpy || 0) * ratio,
        batchImportConsumptionTaxJpy: Number(batch.importConsumptionTaxJpy || 0),
        batchDeclaredTotalJpy: totalDeclared
      };
    });
  });

  return (items || []).map((x) => ({ ...x, ...(allocMap[x.id] || {}) }));
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

const IMAGE_MAX_WIDTH = 1200;
const IMAGE_MAX_HEIGHT = 1200;
const IMAGE_TARGET_BYTES = 180 * 1024;
const IMAGE_MIN_QUALITY = 0.42;
const IMAGE_START_QUALITY = 0.68;
const IMAGE_DB_NAME = "gouka_erp_image_db_v711";
const IMAGE_DB_STORE = "item_images";

let storageAlerted = false;

function stripImagesForStorage(items) {
  return (items || []).map((x) => ({
    ...x,
    images: [],
    imageCount: Array.isArray(x.images) ? x.images.length : Number(x.imageCount || 0)
  }));
}

function openImageDb() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error("IndexedDB not supported"));
    const req = window.indexedDB.open(IMAGE_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IMAGE_DB_STORE)) {
        db.createObjectStore(IMAGE_DB_STORE, { keyPath: "itemId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveItemImagesToDb(itemId, images) {
  if (!itemId) return false;
  try {
    const db = await openImageDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IMAGE_DB_STORE, "readwrite");
      const store = tx.objectStore(IMAGE_DB_STORE);
      store.put({ itemId, images: Array.isArray(images) ? images : [], updatedAt: new Date().toISOString() });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return true;
  } catch (err) {
    console.error("图片保存到IndexedDB失败", err);
    alert("图片保存失败：浏览器图片数据库不可用。商品文字仍可保存。请先导出备份。 ");
    return false;
  }
}

async function loadItemImagesFromDb(itemId) {
  if (!itemId) return [];
  try {
    const db = await openImageDb();
    const result = await new Promise((resolve, reject) => {
      const tx = db.transaction(IMAGE_DB_STORE, "readonly");
      const store = tx.objectStore(IMAGE_DB_STORE);
      const req = store.get(itemId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return Array.isArray(result?.images) ? result.images : [];
  } catch (err) {
    console.error("读取图片失败", err);
    return [];
  }
}

async function deleteItemImagesFromDb(itemId) {
  if (!itemId) return;
  try {
    const db = await openImageDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IMAGE_DB_STORE, "readwrite");
      tx.objectStore(IMAGE_DB_STORE).delete(itemId);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.error("删除图片失败", err);
  }
}

async function hydrateItemsWithImages(items) {
  const arr = await Promise.all((items || []).map(async (x) => {
    const images = Array.isArray(x.images) && x.images.length ? x.images : await loadItemImagesFromDb(x.id);
    return { ...x, images, imageCount: images.length || Number(x.imageCount || 0) };
  }));
  return arr;
}

function bytesOfText(text) {
  try {
    return new Blob([text || ""]).size;
  } catch {
    return String(text || "").length;
  }
}

function formatBytes(bytes) {
  const n = Number(bytes || 0);
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${Math.round(n)} B`;
}

function safeLocalSet(key, value, label = "数据") {
  try {
    const text = JSON.stringify(value);
    localStorage.setItem(key, text);
    return true;
  } catch (err) {
    console.error(`保存${label}失败`, err);
    if (!storageAlerted) {
      storageAlerted = true;
      alert(
        `⚠️ ${label}保存失败：浏览器本地容量可能已满。\n\n` +
        `请立刻导出备份JSON。V7.11已把图片转入IndexedDB，文字数据仍会尽量保存。\n` +
        `系统不会白屏，但这次修改可能没有永久保存。`
      );
    }
    return false;
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function compressImageFile(file) {
  const originalDataUrl = await readFileAsDataUrl(file);
  const originalBytes = bytesOfText(originalDataUrl);

  // 小图直接保存，避免重复压缩影响清晰度。
  if (originalBytes <= IMAGE_TARGET_BYTES) return originalDataUrl;

  const img = await loadImage(originalDataUrl);
  let width = img.width;
  let height = img.height;
  const ratio = Math.min(IMAGE_MAX_WIDTH / width, IMAGE_MAX_HEIGHT / height, 1);
  width = Math.max(1, Math.round(width * ratio));
  height = Math.max(1, Math.round(height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);

  let quality = IMAGE_START_QUALITY;
  let result = canvas.toDataURL("image/jpeg", quality);
  while (bytesOfText(result) > IMAGE_TARGET_BYTES && quality > IMAGE_MIN_QUALITY) {
    quality -= 0.07;
    result = canvas.toDataURL("image/jpeg", quality);
  }
  return result;
}

async function compressImageFiles(files, maxCount = 3) {
  const selected = Array.from(files || []).filter((f) => f.type.startsWith("image/")).slice(0, maxCount);
  const imgs = [];
  for (const file of selected) {
    try {
      imgs.push(await compressImageFile(file));
    } catch (err) {
      console.error("图片压缩失败", file?.name, err);
      alert(`图片处理失败：${file?.name || "未知图片"}\n请换成 JPG/PNG 后再上传。`);
    }
  }
  return imgs;
}

function sumExtraCosts(x) {
  return Number(x.shippingJpy || 0)
    + Number(x.dutyJpy || 0)
    + Number(x.customsFeeJpy || 0)
    + Number(x.platformFeeJpy || 0)
    + Number(x.otherCostJpy || 0)
    + Number(x.batchAllocatedDutyJpy || 0)
    + Number(x.batchAllocatedShippingJpy || 0)
    + Number(x.batchAllocatedCustomsFeeJpy || 0)
    + Number(x.batchAllocatedOtherCostJpy || 0);
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
  customsBatchId: "",
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
    return (saved ? JSON.parse(saved) : []).map(normalizeItem);
  } catch {
    return [];
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
    customsBatchId: x.customsBatchId || "",
    productTitle: x.productTitle || makeAutoTitle(x),
    imageCount: Number(x.imageCount || (Array.isArray(x.images) ? x.images.length : 0)),
    ...x,
    images: Array.isArray(x.images) ? x.images : []
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

function isSoldStatus(status) {
  return status === "已售出" || status === "已发货";
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


function parseJpyNumber(value) {
  const cleaned = String(value || "")
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 65248))
    .replace(/[,，円¥￥\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function extractAuctionTaxCreditRef(item) {
  const memo = String(item?.memo || "");
  const patterns = [
    /消費税控除参考[:：]\s*([0-9０-９,，]+)\s*円?/i,
    /消费税控除参考[:：]\s*([0-9０-９,，]+)\s*円?/i,
    /可抵扣消费税[:：]\s*([0-9０-９,，]+)\s*円?/i,
    /税控除参考[:：]\s*([0-9０-９,，]+)\s*円?/i
  ];
  for (const pattern of patterns) {
    const m = memo.match(pattern);
    if (m) return parseJpyNumber(m[1]);
  }
  const hammerTax = memo.match(/落札消費税[:：]\s*([0-9０-９,，]+)\s*円?/i);
  const feeTax = memo.match(/手数料消費税[:：]\s*([0-9０-９,，]+)\s*円?/i);
  const total = parseJpyNumber(hammerTax?.[1]) + parseJpyNumber(feeTax?.[1]);
  return total > 0 ? total : null;
}

function calcTax(x) {
  const saleJpy = Number(x.soldPriceJpy || x.saleJpy || 0);
  const baseSmart = smartAmountToJpy(
    x.purchaseCny,
    x.purchaseCurrency || "CNY",
    x.purchaseRateToJpy || x.rate || defaultRateFor(x.purchaseCurrency || "CNY"),
    saleJpy
  );
  const declaredSmart = smartAmountToJpy(
    x.declaredCny,
    x.declaredCurrency || "CNY",
    x.declaredRateToJpy || x.rate || defaultRateFor(x.declaredCurrency || "CNY"),
    saleJpy
  );

  const baseCostJpy = baseSmart.value;
  const extraCostJpy = sumExtraCosts(x);
  const costJpy = baseCostJpy + extraCostJpy;
  const declaredJpy = declaredSmart.value;
  const auctionTaxCreditRef = extractAuctionTaxCreditRef(x);
  const inputTax = auctionTaxCreditRef !== null ? auctionTaxCreditRef : declaredJpy * TAX_RATE;
  const inputTaxSource = auctionTaxCreditRef !== null ? "日本拍卖消费税控除参考" : "申报金额10%估算";
  const outputTax = saleJpy * TAX_RATE / (1 + TAX_RATE);
  const saleExTax = saleJpy - outputTax;
  const grossProfit = saleJpy - costJpy;
  const taxBalance = outputTax - inputTax;
  const profitExTax = saleExTax - costJpy;
  const margin = saleJpy ? grossProfit / saleJpy * 100 : 0;
  const warnings = [baseSmart.warning, declaredSmart.warning].filter(Boolean);
  return { baseCostJpy, extraCostJpy, costJpy, declaredJpy, inputTax, inputTaxSource, saleJpy, outputTax, saleExTax, grossProfit, taxBalance, profitExTax, margin, warnings };
}

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("gouka");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function submit(e) {
    if (e) e.preventDefault();
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
        <h1>豪嘉ERP V7.0</h1>
        <p>豪嘉株式会社内部管理系统</p>
        <p className="note">请输入公司内部账号登录。账号可向管理员确认，密码不在页面显示。</p>

        <label>
          账号
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="请输入账号" onKeyDown={(e) => { if (e.key === "Enter") submit(e); }} />
        </label>

        <label>
          密码
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入密码" autoFocus onKeyDown={(e) => { if (e.key === "Enter") submit(e); }} />
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
  const [deleteLogs, setDeleteLogs] = useState(loadDeleteLogs);
  const [customsBatches, setCustomsBatches] = useState(loadCustomsBatches);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("全部");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [syncStatusText, setSyncStatusText] = useState("云端待机");

  React.useEffect(() => {
    safeLocalSet(STORAGE_KEY, stripImagesForStorage(items), "商品文字数据");
  }, [items]);

  React.useEffect(() => {
    safeLocalSet(DICTIONARY_KEY, dictionaries, "字典数据");
  }, [dictionaries]);

  React.useEffect(() => {
    safeLocalSet(SUPPLIER_KEY, suppliers, "供应商数据");
  }, [suppliers]);

  React.useEffect(() => {
    safeLocalSet(DELETE_LOG_KEY, deleteLogs, "删除日志");
  }, [deleteLogs]);

  React.useEffect(() => {
    safeLocalSet(CUSTOMS_BATCH_KEY, customsBatches, "报关批次数据");
  }, [customsBatches]);

  React.useEffect(() => {
    let cancelled = false;
    hydrateItemsWithImages(items).then((hydrated) => {
      if (cancelled) return;
      const changed = hydrated.some((x, i) => (x.images || []).length !== (items[i]?.images || []).length);
      if (changed) setItems(hydrated);
    });
    return () => { cancelled = true; };
    // 只在登录后初次进入时补图，避免录入时反复重刷。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  React.useEffect(() => {
    if (!isLoggedIn) return;

    let cancelled = false;

    async function autoLoadCloudItems() {
      try {
        setSyncStatusText("正在读取云端…");
        const cloudItems = await getCloudItems();
        if (cancelled || !Array.isArray(cloudItems) || cloudItems.length === 0) {
          setSyncStatusText("云端待机");
          return;
        }
        const nextItems = cloudItems.map(fromCloudItem);
        setItems(nextItems);
        setSyncStatusText(`已读取云端 ${nextItems.length} 件`);
      } catch (e) {
        console.error("Auto cloud load failed", e);
        setSyncStatusText("云端读取失败");
      }
    }

    autoLoadCloudItems();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return <LoginPage onLogin={(role) => { setSession({ username: "gouka", role, name: "老板账号" }); setIsLoggedIn(true); }} />;
  }

  const role = session?.role || "owner";
  const isOwner = role === "owner";
  const computedItems = useMemo(() => applyBatchAllocations(items, customsBatches), [items, customsBatches]);

  function logout() {
    localStorage.removeItem(LOGIN_KEY);
    setSession(null);
    setIsLoggedIn(false);
  }

  function exportBackup() {
    const data = { version: "GOUKA-ERP-ENTERPRISE-1.2.4-LISTING-LIGHT", exportedAt: new Date().toISOString(), items, customsBatches, dictionaries, suppliers, deleteLogs };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gouka_erp_v711_image_db_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importBackup(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);
        const nextItems = Array.isArray(parsed) ? parsed : parsed.items;
        if (!Array.isArray(nextItems)) throw new Error("bad file");
        if (window.confirm(`确定导入 ${nextItems.length} 条商品数据吗？当前数据会被覆盖。`)) {
          const normalizedItems = nextItems.map(normalizeItem);
          await Promise.all(normalizedItems.map((item) => saveItemImagesToDb(item.id, item.images || [])));
          setItems(normalizedItems);
          if (parsed.dictionaries) setDictionaries({ ...DEFAULT_DICTIONARIES, ...parsed.dictionaries });
          if (Array.isArray(parsed.suppliers)) setSuppliers(parsed.suppliers);
          if (Array.isArray(parsed.deleteLogs)) setDeleteLogs(parsed.deleteLogs);
          if (Array.isArray(parsed.customsBatches)) setCustomsBatches(parsed.customsBatches);
          if (parsed.cashflow) localStorage.setItem(CASHFLOW_KEY, JSON.stringify(parsed.cashflow));
          alert("备份数据已恢复。若包含字典、供应商、现金流，也已同步恢复。");
        }
      } catch {
        alert("备份文件格式不正确");
      }
    };
    reader.readAsText(file);
  }



  function safeCloudImages(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value === "string" && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  function onlyCloudImages(images) {
    return (Array.isArray(images) ? images : []).filter((img) => String(img || "").startsWith("http"));
  }

  function toCloudItem(x) {
    return {
      product_no: x.id,
      purchase_date: x.purchaseDate || null,
      category: x.category || "",
      brand: x.brand || "",
      item: x.item || "",
      title: x.productTitle || "",
      material: x.material || "",
      color: x.color || "",
      origin: x.origin || "",
      qty: Number(x.qty || 1),
      purchase_currency: x.purchaseCurrency || "CNY",
      purchase_amount: Number(x.purchaseCny || 0),
      purchase_rate: Number(x.purchaseRateToJpy || 21.8),
      declared_currency: x.declaredCurrency || "CNY",
      declared_amount: Number(x.declaredCny || 0),
      declared_rate: Number(x.declaredRateToJpy || 21.8),
      expected_sale_jpy: Number(x.saleJpy || 0),
      shipping_jpy: Number(x.shippingJpy || 0),
      duty_jpy: Number(x.dutyJpy || 0),
      customs_fee_jpy: Number(x.customsFeeJpy || 0),
      platform_fee_jpy: Number(x.platformFeeJpy || 0),
      other_cost_jpy: Number(x.otherCostJpy || 0),
      source: x.source || "",
      supplier_address: x.address || "",
      id_check: x.idCheck || "",
      customs_batch_text: x.customsBatchId || "",
      platform: x.platform || "",
      status: x.status || "",
      memo: x.memo || "",
      sold_date: x.soldDate || null,
      sold_platform: x.soldPlatform || "",
      sold_price_jpy: Number(x.soldPriceJpy || 0),
      sold_memo: x.soldMemo || "",
      ledger_status: x.ledgerStatus || "VALID",
      ledger_void_reason: x.ledgerVoidReason || "",
      cloud_images: onlyCloudImages(x.images)
    };
  }

  function fromCloudItem(x) {
    return normalizeItem({
      id: x.product_no || x.id,
      purchaseDate: x.purchase_date || "",
      category: x.category || "",
      brand: x.brand || "",
      item: x.item || "",
      productTitle: x.title || "",
      material: x.material || "",
      color: x.color || "",
      origin: x.origin || "",
      qty: x.qty || 1,
      purchaseCurrency: x.purchase_currency || "CNY",
      purchaseCny: x.purchase_amount || 0,
      purchaseRateToJpy: x.purchase_rate || 21.8,
      declaredCurrency: x.declared_currency || "CNY",
      declaredCny: x.declared_amount || 0,
      declaredRateToJpy: x.declared_rate || 21.8,
      saleJpy: x.expected_sale_jpy || 0,
      shippingJpy: x.shipping_jpy || 0,
      dutyJpy: x.duty_jpy || 0,
      customsFeeJpy: x.customs_fee_jpy || 0,
      platformFeeJpy: x.platform_fee_jpy || 0,
      otherCostJpy: x.other_cost_jpy || 0,
      source: x.source || "",
      address: x.supplier_address || "",
      idCheck: x.id_check || "",
      customsBatchId: x.customs_batch_text || "",
      platform: x.platform || "",
      status: x.status || "已入库",
      memo: x.memo || "",
      soldDate: x.sold_date || "",
      soldPlatform: x.sold_platform || "",
      soldPriceJpy: x.sold_price_jpy || 0,
      soldMemo: x.sold_memo || "",
      images: safeCloudImages(x.cloud_images)
    });
  }

  async function syncToCloud() {
    try {
      if (!window.confirm(`同步 ${items.length} 件商品到云端吗？`)) return;
      setSyncStatusText("正在同步云端…");
      for (const item of items) {
        const cloudImages = await uploadItemImages(item.id, item.images || []);
        await upsertCloudItem(toCloudItem({ ...item, images: cloudImages }));
      }
      setSyncStatusText(`已同步 ${items.length} 件`);
      alert("已同步到云端。另一台电脑请点击“从云端读取”。");
    } catch (e) {
      console.error(e);
      setSyncStatusText("同步失败");
      alert("同步失败：" + (e?.message || e));
    }
  }

  async function loadFromCloud() {
    try {
      setSyncStatusText("正在读取云端…");
      const cloudItems = await getCloudItems();
      const nextItems = cloudItems.map(fromCloudItem);
      if (!window.confirm(`从云端读取 ${nextItems.length} 件商品，并覆盖当前浏览器库存吗？`)) return;
      setItems(nextItems);
      setSyncStatusText(`已读取云端 ${nextItems.length} 件`);
      alert(`已从云端读取 ${nextItems.length} 件商品。`);
    } catch (e) {
      console.error(e);
      setSyncStatusText("读取失败");
      alert("读取失败：" + (e?.message || e));
    }
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return computedItems.filter((x) => {
      const matchText = Object.values(x).join(" ").toLowerCase().includes(q);
      const matchStatus = statusFilter === "全部" || x.status === statusFilter;
      return matchText && matchStatus;
    });
  }, [computedItems, query, statusFilter]);

  const totals = useMemo(() => {
    const batchIdsWithActualTax = new Set((customsBatches || []).filter((b) => Number(b.importConsumptionTaxJpy || 0) > 0).map((b) => b.id));
    const base = computedItems.reduce(
      (a, x) => {
        const t = calcTax(x);
        a.qty += Number(x.qty || 0);
        a.declared += Number(x.declaredCny || 0);
        a.cost += t.costJpy;
        a.sale += t.saleJpy;
        a.profit += t.profitExTax;
        if (!x.customsBatchId || !batchIdsWithActualTax.has(x.customsBatchId)) a.inputTax += t.inputTax;
        a.outputTax += t.outputTax;
        a.profitExTax += t.profitExTax;
        if (isSoldStatus(x.status)) {
          a.soldCount += Number(x.qty || 0);
          a.soldAmount += Number(x.soldPriceJpy || x.saleJpy || 0);
          a.soldProfit += t.profitExTax;
        }
        return a;
      },
      { qty: 0, declared: 0, cost: 0, sale: 0, profit: 0, inputTax: 0, outputTax: 0, taxBalance: 0, profitExTax: 0, soldCount: 0, soldAmount: 0, soldProfit: 0 }
    );
    base.inputTax += (customsBatches || []).reduce((a, b) => a + Number(b.importConsumptionTaxJpy || 0), 0);
    base.taxBalance = base.outputTax - base.inputTax;
    return base;
  }, [computedItems, customsBatches]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function saveItem() {
    const safeForm = {
      ...form,
      brand: form.brand || "未识别品牌",
      item: form.item || "未识别商品",
      productTitle: form.productTitle || makeAutoTitle(form) || `${form.brand || "未识别品牌"} ${form.item || "未识别商品"}`,
      images: Array.isArray(form.images) ? form.images : []
    };

    if (editingId) {
      const cloudImages = await uploadItemImages(editingId, safeForm.images || []);
      safeForm.images = cloudImages.length ? cloudImages : safeForm.images;
      await saveItemImagesToDb(editingId, safeForm.images || []);

      let updatedItem = null;
      const updatedItems = items.map((x) => {
        if (x.id !== editingId) return x;

        updatedItem = addHistory({
          ...x,
          ...safeForm,
          id: editingId,
          productTitle: safeForm.productTitle || makeAutoTitle(safeForm),
          qty: Number(form.qty || 1),
          purchaseCurrency: safeForm.purchaseCurrency || "CNY",
          purchaseCny: Number(safeForm.purchaseCny || 0),
          purchaseRateToJpy: Number(safeForm.purchaseRateToJpy || defaultRateFor(safeForm.purchaseCurrency || "CNY")),
          declaredCurrency: safeForm.declaredCurrency || safeForm.purchaseCurrency || "CNY",
          declaredCny: Number(safeForm.declaredCny || safeForm.purchaseCny || 0),
          declaredRateToJpy: Number(safeForm.declaredRateToJpy || defaultRateFor(safeForm.declaredCurrency || safeForm.purchaseCurrency || "CNY")),
          rate: Number(safeForm.purchaseRateToJpy || safeForm.rate || 0),
          saleJpy: Number(safeForm.saleJpy || 0),
          shippingJpy: Number(form.shippingJpy || 0),
          dutyJpy: Number(form.dutyJpy || 0),
          customsFeeJpy: Number(form.customsFeeJpy || 0),
          platformFeeJpy: Number(form.platformFeeJpy || 0),
          otherCostJpy: Number(form.otherCostJpy || 0),
          images: safeForm.images || [],
          soldDate: form.soldDate || "",
          soldPlatform: form.soldPlatform || "",
          soldPriceJpy: Number(form.soldPriceJpy || 0),
          soldMemo: form.soldMemo || ""
        }, session?.username, "编辑商品信息");

        return updatedItem;
      });

      setItems(updatedItems);

      try {
        setSyncStatusText("正在同步云端…");
        if (updatedItem) await upsertCloudItem(toCloudItem(updatedItem));
        setSyncStatusText("商品已同步");
      } catch (e) {
        console.error("Cloud update failed", e);
        setSyncStatusText("商品同步失败");
      }

      alert("商品已更新，并已同步云端");
    } else {
      const next = {
        ...safeForm,
        id: makeNextId(items),
        ledgerStatus: "有效",
        ledgerVoidReason: "",
        ledgerUpdatedAt: new Date().toISOString(),
        productTitle: safeForm.productTitle || makeAutoTitle(safeForm),
        ledgerHistory: [{ date: new Date().toISOString(), user: session?.username || "gouka", action: "创建商品并生成古物台账" }],
        qty: Number(form.qty || 1),
        purchaseCurrency: safeForm.purchaseCurrency || "CNY",
        purchaseCny: Number(safeForm.purchaseCny || 0),
        purchaseRateToJpy: Number(safeForm.purchaseRateToJpy || defaultRateFor(safeForm.purchaseCurrency || "CNY")),
        declaredCurrency: safeForm.declaredCurrency || safeForm.purchaseCurrency || "CNY",
        declaredCny: Number(safeForm.declaredCny || safeForm.purchaseCny || 0),
        declaredRateToJpy: Number(safeForm.declaredRateToJpy || defaultRateFor(safeForm.declaredCurrency || safeForm.purchaseCurrency || "CNY")),
        rate: Number(safeForm.purchaseRateToJpy || safeForm.rate || 0),
        saleJpy: Number(safeForm.saleJpy || 0),
        shippingJpy: Number(safeForm.shippingJpy || 0),
        dutyJpy: Number(safeForm.dutyJpy || 0),
        customsFeeJpy: Number(safeForm.customsFeeJpy || 0),
        platformFeeJpy: Number(safeForm.platformFeeJpy || 0),
        otherCostJpy: Number(safeForm.otherCostJpy || 0),
        images: safeForm.images || [],
        soldDate: safeForm.soldDate || "",
        soldPlatform: safeForm.soldPlatform || "",
        soldPriceJpy: Number(safeForm.soldPriceJpy || 0),
        soldMemo: safeForm.soldMemo || ""
      };

      const cloudImages = await uploadItemImages(next.id, next.images || []);
      const savedNext = { ...next, images: cloudImages.length ? cloudImages : next.images };
      await saveItemImagesToDb(savedNext.id, savedNext.images || []);
      setItems([savedNext, ...items]);

      try {
        setSyncStatusText("正在同步云端…");
        await upsertCloudItem(toCloudItem(savedNext));
        setSyncStatusText("商品已同步");
      } catch (e) {
        console.error("Cloud insert failed", e);
        setSyncStatusText("商品同步失败");
      }

      alert("商品已添加，并已同步云端");
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

  async function deleteItem(id) {
    if (!isOwner) return alert("员工账号无删除权限");
    const target = items.find((x) => x.id === id);
    if (!target) return;
    if (!window.confirm(`确认完全删除这条库存记录吗？\n\n${target.id} ${target.brand || ""} ${target.item || ""}\n\n删除后不会出现在库存、利润、报关、古物台账中。`)) return;
    await deleteItemImagesFromDb(id);

    try {
      setSyncStatusText("正在同步删除…");
      await deleteProductImages(id);
      await deleteItemCloud(id);
      setSyncStatusText("删除已同步");
    } catch (e) {
      console.error("Cloud delete failed", e);
      setSyncStatusText("删除同步失败");
    }

    setItems(items.filter((x) => x.id !== id));
    alert("已完全删除该库存记录，并已同步云端。");
  }

  async function updateListingItem(id, patch, actionText = "出品管理更新") {
    const target = items.find((x) => x.id === id);
    if (!target) return;

    const nextItem = addHistory({
      ...target,
      ...patch
    }, session?.username || "gouka", actionText);

    setItems((prev) => prev.map((x) => x.id === id ? nextItem : x));

    try {
      setSyncStatusText("正在同步出品状态…");
      await upsertCloudItem(toCloudItem(nextItem));
      setSyncStatusText("出品状态已同步");
    } catch (e) {
      console.error("Listing cloud update failed", e);
      setSyncStatusText("出品同步失败");
      alert("出品状态已在本机更新，但云端同步失败：" + (e?.message || e));
    }
  }

  async function handleImages(files) {
    const remain = Math.max(0, 3 - ((form.images || []).length));
    if (remain <= 0) return alert("每件商品最多保存3张图片。请先删除旧图片。");
    const imgs = await compressImageFiles(files, remain);
    if (!imgs.length) return;
    setForm((prev) => ({ ...prev, images: [...(prev.images || []), ...imgs].slice(0, 3) }));
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


  function htmlEscape(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  const COMPANY_STAMP_DATA_URL = "data:image/png;base64,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";

  function pdfImageHtml(item, size = 130) {
    const images = Array.isArray(item?.images) ? item.images.filter(Boolean).slice(0, 3) : [];
    if (!images.length) return `<div class="no-image">No Image</div>`;
    return images.map((src) => `<img class="pdf-img" style="width:${size}px;height:${size}px" src="${htmlEscape(src)}" />`).join("");
  }

  function makeDocumentNo(prefix = "GOUKA-PDF") {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const hms = `${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}`;
    return `${prefix}-${ymd}-${hms}`;
  }

  function companyPdfHeader(title, subtitle = "Inventory Report") {
    const printedAt = new Date().toLocaleString();
    return `
      <div class="company-letterhead">
        <div class="company-left">
          <div>〒532-0011</div>
          <div>大阪府大阪市淀川区西中島4丁目2番26号</div>
          <div>天神第一ビル7F 1B</div>
          <div class="company-name">豪嘉株式会社</div>
          <div>代表取締役　許 四傑</div>
          <div class="invoice-no">適格請求書発行事業者　登録番号：T120001249367</div>
          <div>TEL：06-7176-7189</div>
        </div>
        <div class="company-right">
          <img class="company-stamp" src="${COMPANY_STAMP_DATA_URL}" />
          <div class="doc-no">Document No.<br/>${htmlEscape(makeDocumentNo())}</div>
        </div>
      </div>
      <div class="report-title">
        <h1>${htmlEscape(title)}</h1>
        <p>${htmlEscape(subtitle)}　/　Generated：${htmlEscape(printedAt)}</p>
      </div>
    `;
  }

  function openPdfWindow(title, bodyHtml) {
    const win = window.open("", "_blank");
    if (!win) {
      alert("浏览器阻止了PDF窗口。请允许弹出窗口后再试。 ");
      return;
    }

    win.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${htmlEscape(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, "Hiragino Sans", "Yu Gothic", sans-serif; color:#111827; margin:0; padding:28px; background:#fff; }
  .pdf-page { max-width: 980px; margin: 0 auto; }
  .company-letterhead { display:flex; justify-content:space-between; align-items:flex-start; gap:20px; border-bottom:3px solid #111827; padding-bottom:14px; margin-bottom:16px; }
  .company-left { font-size:13px; line-height:1.65; color:#111827; }
  .company-name { font-weight:700; font-size:18px; margin-top:8px; }
  .invoice-no { margin-top:6px; font-weight:600; }
  .company-right { text-align:center; min-width:180px; }
  .company-stamp { width:118px; height:118px; object-fit:contain; opacity:.92; }
  .doc-no { margin-top:6px; font-size:10px; color:#64748b; line-height:1.4; }
  .report-title { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:1px solid #cbd5e1; padding-bottom:12px; margin-bottom:18px; }
  .report-title h1 { margin:0; font-size:25px; letter-spacing:.02em; }
  .report-title p { margin:4px 0 0; color:#475569; font-size:12px; }
  .pdf-header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #111827; padding-bottom:14px; margin-bottom:18px; }
  .pdf-header h1 { margin:0; font-size:24px; }
  .pdf-header p { margin:4px 0 0; color:#475569; font-size:12px; }
  .company { text-align:right; font-size:12px; color:#475569; }
  .summary-grid { display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; margin:14px 0 18px; }
  .section { margin-top:18px; page-break-inside: avoid; }
  .section h2 { font-size:16px; border-left:5px solid #111827; padding-left:10px; margin:0 0 10px; }
  .grid { display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; }
  .field { border:1px solid #e5e7eb; border-radius:8px; padding:8px; min-height:54px; }
  .field small { display:block; color:#64748b; font-size:10px; margin-bottom:4px; }
  .field b { font-size:13px; word-break:break-word; }
  .image-row { display:flex; gap:10px; flex-wrap:wrap; }
  .pdf-img { object-fit:cover; border:1px solid #e5e7eb; border-radius:10px; }
  .no-image { width:130px; height:130px; border:1px dashed #94a3b8; display:flex; align-items:center; justify-content:center; border-radius:10px; color:#64748b; }
  table { width:100%; border-collapse:collapse; font-size:11px; }
  th, td { border:1px solid #e5e7eb; padding:6px; text-align:left; vertical-align:top; }
  th { background:#f1f5f9; }
  .right { text-align:right; }
  .memo { white-space:pre-wrap; border:1px solid #e5e7eb; border-radius:8px; padding:10px; min-height:60px; }
  .footer { margin-top:22px; color:#64748b; font-size:10px; border-top:1px solid #e5e7eb; padding-top:8px; }
  @media print { body { padding:12mm; } .no-print { display:none; } .pdf-page { max-width: none; } }
</style>
</head>
<body>
<button class="no-print" onclick="window.print()" style="position:fixed;right:18px;top:18px;padding:10px 14px;border-radius:10px;border:0;background:#111827;color:white;cursor:pointer;z-index:9">打印 / 另存为PDF</button>
<div class="pdf-page">${bodyHtml}</div>

</body>
</html>`);
    win.document.close();
  }

  function exportItemPdf(item) {
    if (!item) return;
    const t = calcTax(item);
    const body = `
      <div class="pdf-header">
        <div>
          <h1>商品资料 PDF</h1>
          <p>Product Sheet / GOUKA ERP Enterprise 1.2.7</p>
        </div>
        <div class="company">
          <b>豪嘉株式会社</b><br />
          GOUKA INC.<br />
          Exported: ${new Date().toLocaleString()}
        </div>
      </div>

      <div class="section">
        <h2>商品图片</h2>
        <div class="image-row">${pdfImageHtml(item, 180)}</div>
      </div>

      <div class="section">
        <h2>基本信息</h2>
        <div class="grid">
          <div class="field"><small>商品编号</small><b>${htmlEscape(item.id)}</b></div>
          <div class="field"><small>仕入日</small><b>${htmlEscape(item.purchaseDate)}</b></div>
          <div class="field"><small>状态</small><b>${htmlEscape(item.status)}</b></div>
          <div class="field"><small>品类</small><b>${htmlEscape(item.category)}</b></div>
          <div class="field"><small>品牌</small><b>${htmlEscape(item.brand)}</b></div>
          <div class="field"><small>商品名</small><b>${htmlEscape(item.item)}</b></div>
          <div class="field"><small>材质</small><b>${htmlEscape(item.material)}</b></div>
          <div class="field"><small>颜色</small><b>${htmlEscape(item.color)}</b></div>
          <div class="field"><small>产地</small><b>${htmlEscape(item.origin)}</b></div>
          <div class="field"><small>数量</small><b>${htmlEscape(item.qty)}</b></div>
          <div class="field"><small>来源</small><b>${htmlEscape(item.source)}</b></div>
          <div class="field"><small>本人确认</small><b>${htmlEscape(item.idCheck)}</b></div>
        </div>
      </div>

      <div class="section">
        <h2>金额 / 利润参考</h2>
        <div class="grid">
          <div class="field"><small>采购金额</small><b>${htmlEscape(item.purchaseCny)} ${htmlEscape(item.purchaseCurrency || "CNY")}</b></div>
          <div class="field"><small>申报金额</small><b>${htmlEscape(item.declaredCny)} ${htmlEscape(item.declaredCurrency || "CNY")}</b></div>
          <div class="field"><small>真实成本 JPY</small><b>${jpy(t.costJpy)}</b></div>
          <div class="field"><small>预计/实际售价 JPY</small><b>${jpy(t.saleJpy)}</b></div>
          <div class="field"><small>销售消费税</small><b>${jpy(t.outputTax)}</b></div>
          <div class="field"><small>税抜售价</small><b>${jpy(t.saleExTax)}</b></div>
          <div class="field"><small>不含税利润参考</small><b>${jpy(t.profitExTax)}</b></div>
          <div class="field"><small>利润率</small><b>${(t.saleExTax ? (t.profitExTax / t.saleExTax * 100) : 0).toFixed(1)}%</b></div>
        </div>
      </div>

      <div class="section">
        <h2>备注</h2>
        <div class="memo">${htmlEscape(item.memo || "")}</div>
      </div>
      <div class="footer">此PDF由 GOUKA Luxury ERP 自动生成。金额与消费税为内部参考，正式申告请交由税理士确认。</div>
    `;
    openPdfWindow(`商品资料_${item.id}`, body);
  }

  function exportInventoryPdf(targetItems = null, label = "库存报告") {
    const arr = Array.isArray(targetItems) ? targetItems : (computedItems || []);
    if (!arr.length) {
      alert("没有可导出的商品。请先选择商品或调整日期范围。 ");
      return;
    }

    const sum = arr.reduce((a, x) => {
      const t = calcTax(x);
      a.cost += Number(t.costJpy || 0);
      a.sale += Number(t.saleJpy || 0);
      a.profit += Number(t.profitExTax || 0);
      a.qty += Number(x.qty || 1);
      return a;
    }, { qty: 0, cost: 0, sale: 0, profit: 0 });

    const rows = arr.map((x) => {
      const t = calcTax(x);
      return `<tr>
        <td>${pdfImageHtml(x, 42)}</td>
        <td>${htmlEscape(x.id)}</td>
        <td>${htmlEscape(x.purchaseDate)}</td>
        <td>${htmlEscape(x.brand)}</td>
        <td>${htmlEscape(x.item)}</td>
        <td>${htmlEscape(x.status)}</td>
        <td class="right">${jpy(t.costJpy)}</td>
        <td class="right">${jpy(t.saleJpy)}</td>
        <td class="right">${jpy(t.profitExTax)}</td>
      </tr>`;
    }).join("");

    const body = `
      ${companyPdfHeader(label, "Inventory Report")}
      <div class="section"><h2>汇总</h2><div class="summary-grid">
        <div class="field"><small>商品记录</small><b>${arr.length} 件</b></div>
        <div class="field"><small>库存数量</small><b>${sum.qty} 点</b></div>
        <div class="field"><small>库存总成本</small><b>${jpy(sum.cost)}</b></div>
        <div class="field"><small>预计净利润</small><b>${jpy(sum.profit)}</b></div>
      </div></div>
      <div class="section"><h2>库存明细</h2><table><thead><tr><th>图</th><th>商品编号</th><th>入库日</th><th>品牌</th><th>商品</th><th>状态</th><th>成本</th><th>售价</th><th>利润</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="footer">GOUKA ERP Enterprise 1.2.7 / Generated by GOUKA ERP. 金额与消费税为内部参考，正式申告请交由税理士确认。</div>
    `;
    openPdfWindow(`${label}_${new Date().toISOString().slice(0,10)}`, body);
  }

  function exportLedgerPdf() {
    const arr = computedItems || [];
    const rows = arr.map((x, i) => `<tr>
      <td>${pdfImageHtml(x, 40)}</td>
      <td>${i + 1}</td>
      <td>${htmlEscape(x.purchaseDate)}</td>
      <td>${htmlEscape(x.id)}</td>
      <td>${htmlEscape(x.category)}</td>
      <td>${htmlEscape(x.brand)}</td>
      <td>${htmlEscape(x.item)}</td>
      <td>${htmlEscape((x.material || "") + " / " + (x.color || "") + " / " + (x.origin || ""))}</td>
      <td>${htmlEscape(x.qty)}</td>
      <td>${htmlEscape(x.purchaseCny)} ${htmlEscape(x.purchaseCurrency || "CNY")}</td>
      <td>${htmlEscape(x.source)}</td>
      <td>${htmlEscape(x.address)}</td>
      <td>${htmlEscape(x.idCheck)}</td>
      <td>${htmlEscape(x.ledgerStatus || "有效")}</td>
    </tr>`).join("");

    const body = `
      <div class="pdf-header"><div><h1>古物台账 PDF</h1><p>Kobutsu Ledger</p></div><div class="company"><b>豪嘉株式会社</b><br/>${new Date().toLocaleString()}</div></div>
      <div class="section"><table><thead><tr><th>图</th><th>No</th><th>取引日</th><th>商品番号</th><th>区分</th><th>品牌</th><th>商品名</th><th>特徴</th><th>数量</th><th>金额</th><th>相手方</th><th>住所</th><th>本人確認</th><th>状态</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="footer">古物台账不建议物理删除。更正/作废请保留履历。</div>
    `;
    openPdfWindow("古物台账_PDF", body);
  }

  function exportCustomsPdf() {
    const arr = filtered || computedItems || [];
    const totalQty = arr.reduce((a, x) => a + Number(x.qty || 0), 0);
    const totalValue = arr.reduce((a, x) => a + calcTax(x).declaredJpy, 0);
    const rows = arr.map((x, i) => {
      const t = calcTax(x);
      return `<tr><td>${i + 1}</td><td>${htmlEscape(x.brand)}</td><td>${htmlEscape(x.item)}</td><td>${htmlEscape(x.material)}</td><td>${htmlEscape(x.color)}</td><td>${htmlEscape(x.qty)}</td><td>${htmlEscape(x.origin)}</td><td>${htmlEscape(x.declaredCurrency || "CNY")}</td><td class="right">${htmlEscape(x.declaredCny)}</td><td class="right">${jpy(t.declaredJpy)}</td><td>Used luxury goods / Non-CITES material</td></tr>`;
    }).join("");
    const body = `
      <div class="pdf-header"><div><h1>EMS Commercial Invoice PDF</h1><p>Customs Declaration Reference</p></div><div class="company"><b>Importer: 豪嘉株式会社</b><br/>GOUKA INC.<br/>${new Date().toLocaleString()}</div></div>
      <div class="section"><table><thead><tr><th>No</th><th>Brand</th><th>Item</th><th>Material</th><th>Color</th><th>Qty</th><th>Origin</th><th>Currency</th><th>Declared</th><th>JPY</th><th>Remarks</th></tr></thead><tbody>${rows}</tbody></table></div>
      <div class="section"><h2>Total</h2><div class="grid"><div class="field"><small>Total Quantity</small><b>${totalQty} pcs</b></div><div class="field"><small>Total Declared Value</small><b>${jpy(totalValue)}</b></div></div></div>
      <div class="footer">Non-CITES material statement is based on internal entry. Please verify before official customs submission.</div>
    `;
    openPdfWindow("EMS报关_PDF", body);
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
    ["inventory", "库存管理"],
    ["listing", "出品管理"],
    ["sales", "销售记录"],
    ["ledger", "古物台账"],
    ["customsBatch", "报关批次"],
    ["customs", "EMS报关"],
    ["profit", "利润分析"],
    ["tax", "消费税参考"],
    ["pdf", "PDF导出"],
    ["suppliers", "供应商管理"],
    ["dictionary", "字典管理"],
    ["deleteLogs", "删除日志"],
    ["backup", "备份恢复"]
  ];

  return (
    <div className="app">
      <aside>
        <div className="brand">
          <Building2 size={24} />
          <div>
            <b>豪嘉株式会社</b>
            <span>GOUKA ERP Enterprise 1.2.7</span>
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
            <h1>豪嘉ERP Enterprise 1.2.7 Dashboard Fix</h1>
            <p>自动保存・云端同步・图片上传・状态筛选・古物台账锁定・EMS报关・利润计算</p>
          </div>
          <div className="action-row">
            <button className="ghost" onClick={syncToCloud}>手动同步</button>
            <button className="ghost" onClick={loadFromCloud}>手动读取</button>
            <span className="pill">{syncStatusText}</span>
            <span className="pill">Auto Save · {isOwner ? "老板" : "员工"}</span>
          </div>
        </header>

        {tab === "dashboard" && <Dashboard totals={totals} items={computedItems} setTab={setTab} exportBackup={exportBackup} />}
        {tab === "ai" && <AiAssistant onApplyDraft={applyAiDraft} dictionaries={dictionaries} suppliers={suppliers} />}
        {tab === "aiChat" && <AiChatAssistant items={computedItems} suppliers={suppliers} dictionaries={dictionaries} setTab={setTab} />}
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
            customsBatches={customsBatches}
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
            exportItemPdf={exportItemPdf}
          />
        )}
        {tab === "ledger" && <Ledger items={filtered} setItems={setItems} isOwner={isOwner} downloadCSV={downloadCSV} />}
        {tab === "customsBatch" && <CustomsBatchPanel batches={customsBatches} setBatches={setCustomsBatches} items={computedItems} downloadCSV={downloadCSV} />}
        {tab === "customs" && <Customs items={filtered} customsBatches={customsBatches} downloadCSV={downloadCSV} />}
        {tab === "profit" && <Profit items={filtered} />}
        {tab === "tax" && <TaxReport items={filtered} totals={totals} customsBatches={customsBatches} downloadCSV={downloadCSV} />}
        {tab === "listing" && <ListingManagement items={computedItems} updateListingItem={updateListingItem} editItem={editItem} setPreviewImage={setPreviewImage} setPreviewScale={setPreviewScale} />}
        {tab === "sales" && <SalesReport items={computedItems} downloadCSV={downloadCSV} />}
        {tab === "pdf" && <PdfExportPanel items={computedItems} totals={totals} exportInventoryPdf={exportInventoryPdf} exportLedgerPdf={exportLedgerPdf} exportCustomsPdf={exportCustomsPdf} exportItemPdf={exportItemPdf} />}
        {tab === "suppliers" && <SupplierPanel suppliers={suppliers} setSuppliers={setSuppliers} downloadCSV={downloadCSV} />}
        {tab === "dictionary" && <DictionaryPanel dictionaries={dictionaries} setDictionaries={setDictionaries} />}
        {tab === "deleteLogs" && <DeleteLogPanel deleteLogs={deleteLogs} downloadCSV={downloadCSV} />}
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
  const activeItems = items.filter((x) => !isSoldStatus(x.status) && x.status !== "退货");
  const activeStock = activeItems.length;
  const soldItems = items.filter((x) => isSoldStatus(x.status));
  const month = currentMonth();
  const today = new Date().toISOString().slice(0, 10);

  const todayIn = items.filter((x) => (x.purchaseDate || "") === today);
  const todayPurchase = todayIn.reduce((a, x) => a + calcTax(x).costJpy, 0);

  // Dashboard 统计规则：库存预计与实际经营分开。
  // 实际销售/利润只统计「已售出 / 已发货」且有成交金额的商品，未售库存不再把成本算成负利润。
  const actualSoldItems = items.filter((x) => isSoldStatus(x.status) && Number(x.soldPriceJpy || x.saleJpy || 0) > 0);
  const todaySold = actualSoldItems.filter((x) => (x.soldDate || "") === today);
  const todaySale = todaySold.reduce((a, x) => a + calcTax(x).saleJpy, 0);
  const todayProfit = todaySold.reduce((a, x) => a + calcTax(x).profitExTax, 0);

  const monthIn = items.filter((x) => (x.purchaseDate || "").startsWith(month));
  const monthSold = actualSoldItems.filter((x) => (x.soldDate || "").startsWith(month));
  const monthSale = monthSold.reduce((a, x) => a + calcTax(x).saleJpy, 0);
  const monthProfit = monthSold.reduce((a, x) => a + calcTax(x).profitExTax, 0);
  const recent = items.slice(0, 5);

  const stockCost = activeItems.reduce((a, x) => a + calcTax(x).costJpy, 0);
  const stockExpectedSale = activeItems.reduce((a, x) => a + Number(x.saleJpy || 0), 0);
  const stockExpectedProfit = activeItems.reduce((a, x) => {
    const t = calcTax(x);
    return a + (Number(t.saleJpy || 0) > 0 ? t.profitExTax : 0);
  }, 0);
  const stockExpectedMargin = stockExpectedSale ? (stockExpectedProfit / stockExpectedSale) * 100 : 0;
  const soldOutputTax = actualSoldItems.reduce((a, x) => a + calcTax(x).outputTax, 0);
  const inputTaxRef = items.reduce((a, x) => a + calcTax(x).inputTax, 0);
  const actualTaxBalanceRef = soldOutputTax - inputTaxRef;

  const todoCustoms = items.filter((x) => x.status === "报关准备").length;
  const todoListing = items.filter((x) => x.status === "已入库" || x.status === "待出品").length;
  const todoShipping = items.filter((x) => isSoldStatus(x.status) && !String(x.soldMemo || "").includes("発送済")).length;
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
          <span className="v3-kicker">GOUKA ERP Enterprise 1.2.7</span>
          <h1>经营驾驶舱 · Enterprise 1.2.7</h1>
          <p>今日经营、库存预警、品牌利润、供应商利润集中显示。老板打开第一页就知道该赚钱、该出品、该清库存。</p>
          <div className="v3-hero-actions">
            <button onClick={() => setTab("add")}>新增商品</button>
            <button onClick={() => setTab("inventory")}>查看库存</button>
            <button onClick={exportBackup}>立即备份</button>
          </div>
        </div>
        <div className="v3-hero-right">
          <p>库存预计利润</p>
          <h2>{jpy(stockExpectedProfit)}</h2>
          <span>预计利润率 {stockExpectedMargin.toFixed(1)}% · 当前库存 {activeStock} 件 · 有图 {withImages} 件</span>
        </div>
      </div>

      <div className="v3-kpi-grid">
        <div className="v3-kpi blue"><span>💰</span><p>库存总成本</p><h2>{jpy(stockCost)}</h2><small>只统计未售库存成本</small></div>
        <div className="v3-kpi green"><span>🏷️</span><p>库存预计销售额</p><h2>{jpy(stockExpectedSale)}</h2><small>只统计未售库存预计售价</small></div>
        <div className="v3-kpi orange"><span>📈</span><p>库存预计利润</p><h2>{jpy(stockExpectedProfit)}</h2><small>未填预计售价的商品不算预计利润</small></div>
        <div className="v3-kpi purple"><span>📊</span><p>库存预计利润率</p><h2>{stockExpectedMargin.toFixed(1)}%</h2><small>老板判断用</small></div>
      </div>

      <div className="v3-money-grid">
        <div className="v3-money-card"><p>今日采购额</p><h2>{jpy(todayPurchase)}</h2><small>今日新增 {todayIn.length} 件</small></div>
        <div className="v3-money-card"><p>今日销售额</p><h2>{jpy(todaySale)}</h2><small>今日售出 {todaySold.length} 件</small></div>
        <div className="v3-money-card"><p>今日净利润</p><h2>{jpy(todayProfit)}</h2><small>已扣真实成本</small></div>
        <div className="v3-money-card highlight"><p>消费税差额参考</p><h2>{jpy(actualTaxBalanceRef)}</h2><small>销售消费税 - 进项税参考，正式申告交由税理士确认</small></div>
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
        <p>V7.11新增今日经营、库存预警、品牌利润排行、供应商利润排行。Enterprise 1.2.7：修正Dashboard统计逻辑，把库存预计利润和实际销售利润分开；未售商品不再计入今日/本月净利润。</p>
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

function AuctionSettlementBox({ form, setForm }) {
  const [auction, setAuction] = useState({
    platform: form.platform || "NBAA",
    auctionCode: "",
    auctionDate: form.purchaseDate || new Date().toISOString().slice(0, 10),
    boxNo: "",
    branchNo: "",
    itemNameJp: "",
    hammerPrice: "",
    hammerTax: "",
    buyerFee: "",
    buyerFeeTax: "",
    domesticShipping: ""
  });

  const setAuctionValue = (k, v) => setAuction({ ...auction, [k]: v });
  const hammer = Number(auction.hammerPrice || 0);
  const hammerTax = Number(auction.hammerTax || 0);
  const buyerFee = Number(auction.buyerFee || 0);
  const buyerFeeTax = Number(auction.buyerFeeTax || 0);
  const domesticShipping = Number(auction.domesticShipping || 0);
  const invoiceTotal = hammer + hammerTax + buyerFee + buyerFeeTax + domesticShipping;
  const taxCreditRef = hammerTax + buyerFeeTax;
  const inventoryCost = hammer + buyerFee + buyerFeeTax + domesticShipping;
  const taxExcludedCost = inventoryCost;

  function calcTax10FromHammer() {
    setAuction({
      ...auction,
      hammerTax: Math.round(hammer * 0.1),
      buyerFeeTax: Math.round(buyerFee * 0.1)
    });
  }

  function applyAuctionSettlement() {
    if (!hammer) return alert("请先填写落札金额。例：44000");
    const auctionMemo = [
      form.memo || "",
      `日本拍卖结算：${auction.platform || ""}`,
      auction.auctionCode ? `落札コード：${auction.auctionCode}` : "",
      auction.auctionDate ? `落札日：${auction.auctionDate}` : "",
      auction.boxNo ? `箱番：${auction.boxNo}` : "",
      auction.branchNo ? `枝番：${auction.branchNo}` : "",
      auction.itemNameJp ? `拍卖商品名：${auction.itemNameJp}` : "",
      `落札金額：${hammer.toLocaleString()}円` ,
      `落札消費税：${hammerTax.toLocaleString()}円`,
      `落札手数料：${buyerFee.toLocaleString()}円`,
      `手数料消費税：${buyerFeeTax.toLocaleString()}円`,
      domesticShipping ? `国内送料：${domesticShipping.toLocaleString()}円` : "",
      `請求合計：${invoiceTotal.toLocaleString()}円`,
      `库存真实成本：${inventoryCost.toLocaleString()}円`,
      `消費税控除参考：${taxCreditRef.toLocaleString()}円`
    ].filter(Boolean).join("\n");

    setForm({
      ...form,
      purchaseDate: auction.auctionDate || form.purchaseDate || new Date().toISOString().slice(0, 10),
      purchaseCurrency: "JPY",
      purchaseCny: hammer,
      purchaseRateToJpy: 1,
      declaredCurrency: "JPY",
      declaredCny: hammer + buyerFee,
      declaredRateToJpy: 1,
      rate: 1,
      platform: auction.platform || form.platform || "NBAA",
      source: form.source || auction.platform || "日本拍卖",
      platformFeeJpy: buyerFee,
      otherCostJpy: buyerFeeTax + domesticShipping,
      memo: auctionMemo
    });

    alert(`已按日本拍卖结算填入。\n\n采购金额：${hammer.toLocaleString()} JPY\n拍卖手续费：${buyerFee.toLocaleString()} JPY\n库存真实成本：${inventoryCost.toLocaleString()} JPY\n实际支付合计：${invoiceTotal.toLocaleString()} JPY\n消费税控除参考：${taxCreditRef.toLocaleString()} JPY`);
  }

  return (
    <div className="full panel" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "16px" }}>
      <h3 style={{ marginTop: 0 }}>🏛 日本拍卖结算（NBAA / OBA / ECO / JBA）</h3>
      <p className="note">按结算单填写。库存真实成本 = 落札金額 + 落札手数料 + 手数料消費税 + 国内送料；消费税控除参考 = 落札消費税 + 手数料消費税。</p>
      <div className="formgrid">
        <SelectWithOther label="拍卖平台" value={auction.platform} onChange={(v) => setAuctionValue("platform", v)} options={["NBAA", "OBA", "ECO Ring", "JBA", "AUCNET", "Star Buyers", "其他"]} placeholder="选择或输入拍卖平台" />
        <Input label="落札コード" value={auction.auctionCode} onChange={(v) => setAuctionValue("auctionCode", v)} placeholder="例：390054" />
        <Input label="落札日" type="date" value={auction.auctionDate} onChange={(v) => setAuctionValue("auctionDate", v)} />
        <Input label="箱番" value={auction.boxNo} onChange={(v) => setAuctionValue("boxNo", v)} placeholder="例：19" />
        <Input label="枝番" value={auction.branchNo} onChange={(v) => setAuctionValue("branchNo", v)} placeholder="例：2" />
        <Input label="拍卖商品名" value={auction.itemNameJp} onChange={(v) => setAuctionValue("itemNameJp", v)} placeholder="例：チルドレン ハンドバッグ" />
        <Input label="落札金額 JPY" type="number" value={auction.hammerPrice} onChange={(v) => setAuctionValue("hammerPrice", v)} placeholder="例：44000" />
        <Input label="落札消費税 JPY" type="number" value={auction.hammerTax} onChange={(v) => setAuctionValue("hammerTax", v)} placeholder="例：4400" />
        <Input label="落札手数料 JPY" type="number" value={auction.buyerFee} onChange={(v) => setAuctionValue("buyerFee", v)} placeholder="例：440" />
        <Input label="手数料消費税 JPY" type="number" value={auction.buyerFeeTax} onChange={(v) => setAuctionValue("buyerFeeTax", v)} placeholder="例：44" />
        <Input label="国内送料 JPY（有就填）" type="number" value={auction.domesticShipping} onChange={(v) => setAuctionValue("domesticShipping", v)} placeholder="例：0" />
      </div>
      <div className="grid4" style={{ marginTop: "12px" }}>
        <Card icon={<Calculator />} title="請求合計" value={jpy(invoiceTotal)} />
        <Card icon={<Calculator />} title="库存真实成本" value={jpy(inventoryCost)} />
        <Card icon={<Calculator />} title="消费税控除参考" value={jpy(taxCreditRef)} />
        <Card icon={<Calculator />} title="系统采购金额" value={jpy(hammer)} />
      </div>
      <div className="action-row" style={{ marginTop: "12px", flexWrap: "wrap" }}>
        <button className="ghost" type="button" onClick={calcTax10FromHammer}>按10%自动算消费税</button>
        <button className="primary" type="button" onClick={applyAuctionSettlement}>应用到商品金额</button>
      </div>
      <p className="note">例：請求合計 48,884円；库存真实成本 44,484円；消费税控除参考 4,444円。实际税务处理以税理士为准。</p>
    </div>
  );
}


function FormSectionTitle({ title, note }) {
  return (
    <div className="full" style={{ marginTop: "8px", padding: "12px 14px", borderRadius: "14px", background: "#f8fafc", border: "1px solid #e5e7eb" }}>
      <b>{title}</b>
      {note && <p className="note" style={{ margin: "6px 0 0" }}>{note}</p>}
    </div>
  );
}

function AddForm({ form, setForm, saveItem, resetForm, editingId, handleImages, removeImage, dictionaries, suppliers, customsBatches }) {
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

      <div className="panel" style={{ background: "#f8fafc", padding: "14px", marginBottom: "16px" }}>
        <div className="action-row" style={{ flexWrap: "wrap" }}>
          <span className="pill">① 基本信息</span>
          <span className="pill">② 金额成本</span>
          <span className="pill">③ 来源状态</span>
          <span className="pill">④ 日本拍卖</span>
          <span className="pill">⑤ 图片备注</span>
        </div>
        <p className="note" style={{ marginBottom: 0 }}>按这个顺序填写即可。日本拍卖货先填基本信息，再用「日本拍卖结算」自动带入金额。</p>
      </div>

      <div className="formgrid">
        <FormSectionTitle title="① 基本信息" note="先确认商品、材质、颜色、产地和数量。" />
        <Input label="仕入日" type="date" value={form.purchaseDate} onChange={(v) => set("purchaseDate", v)} />

        <Select label="品类" value={form.category} onChange={(v) => set("category", v)} options={["バッグ類", "財布・小物類", "時計類", "宝飾品類", "アクセサリー類", "時計", "アパレル", "その他"]} />

        <SelectWithOther label="品牌 Brand" value={form.brand} onChange={setBrand} options={dictionaries.brands} placeholder="选择或输入品牌" />

        <SelectWithOther label="商品名 Item" value={form.item} onChange={(v) => set("item", v)} options={brandItems} placeholder="先选品牌，再选择商品名" />

        <Input label="自动商品标题" value={form.productTitle || makeAutoTitle(form)} onChange={(v) => set("productTitle", v)} placeholder="系统自动生成，也可手动修改" />

        <SelectWithOther label="材质 Material" value={form.material} onChange={(v) => set("material", v)} options={dictionaries.materials} placeholder="选择或输入材质" />

        <SelectWithOther label="颜色 Color" value={form.color} onChange={(v) => set("color", v)} options={dictionaries.colors} placeholder="选择或输入颜色" />

        <SelectWithOther label="产地 Origin" value={form.origin} onChange={(v) => set("origin", v)} options={dictionaries.origins} placeholder="选择或输入产地" />

        <Input label="数量 Qty" type="number" value={form.qty} onChange={(v) => set("qty", v)} />

        <FormSectionTitle title="② 金额 / 成本" note="普通采购直接填写采购金额；日本拍卖可以先空着，下面结算模块会自动填。" />

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

        <FormSectionTitle title="③ 来源 / 报关 / 状态" note="中国进口货平台建议选 EMS；日本拍卖货选 NBAA / OBA / ECO 等，不会进入 EMS 报关。" />

        <SelectWithOther label="仕入先 / 来源" value={form.source} onChange={setSourceFromSupplier} options={sourceOptions} placeholder="选择供应商或输入来源" />

        <Input label="供应商地址" value={form.address} onChange={(v) => set("address", v)} placeholder="China / Japan address" />

        <SelectWithOther label="本人确认方式" value={form.idCheck} onChange={(v) => set("idCheck", v)} options={dictionaries.idChecks} placeholder="选择或输入确认方式" />

        <Select label="状态" value={form.status} onChange={(v) => set("status", v)} options={WORKFLOW_STATUSES} />

        <SelectWithOther label="平台 / 运输方式" value={form.platform} onChange={(v) => set("platform", v)} options={dictionaries.platforms} placeholder="选择或输入平台" />

        <Select label="所属报关批次" value={form.customsBatchId || ""} onChange={(v) => set("customsBatchId", v)} options={["", ...(customsBatches || []).map((b) => b.id)]} />

        <FormSectionTitle title="④ 日本拍卖结算" note="NBAA / OBA / ECO / JBA 等日本国内拍卖，用这里录入结算单最稳。" />

        <AuctionSettlementBox form={form} setForm={setForm} />

        <FormSectionTitle title="⑤ 利润预览" note="保存前先看真实成本、预计毛利和消费税参考。" />

        <div className="full panel" style={{ background: "#f8fafc", padding: "16px" }}>
          <h3 style={{ marginTop: 0 }}>实时利润预览</h3>
          <div className="grid4">
            <Card icon={<Calculator />} title="基础采购成本" value={jpy(preview.baseCostJpy)} />
            <Card icon={<Calculator />} title="附加成本合计" value={jpy(preview.extraCostJpy)} />
            <Card icon={<Calculator />} title="真实总成本" value={jpy(preview.costJpy)} />
            <Card icon={<Calculator />} title="预计毛利" value={jpy(preview.grossProfit)} />
          </div>
          <p className="note">
            采购换算：{jpy(preview.baseCostJpy)}　申报换算：{jpy(preview.declaredJpy)}　利润率：{(preview.margin || 0).toFixed(1)}%　销售消费税参考：{jpy(preview.outputTax)}　进项消费税估算：{jpy(preview.inputTax)}　批次分摊成本：{jpy(Number(form.batchAllocatedDutyJpy || 0) + Number(form.batchAllocatedShippingJpy || 0) + Number(form.batchAllocatedCustomsFeeJpy || 0) + Number(form.batchAllocatedOtherCostJpy || 0))}
          </p>
          {!!preview.warnings?.length && (
            <div className="note" style={{ color: "#b45309", background: "#fff7ed", padding: "10px", borderRadius: "10px" }}>
              ⚠️ {preview.warnings.join(" / ")}
            </div>
          )}
          <div className="action-row">
            <button className="ghost" type="button" onClick={() => copyText(makePlatformTitle(form, "mercari"))}>复制Mercari标题</button>
            <button className="ghost" type="button" onClick={() => copyText(makePlatformTitle(form, "yahoo"))}>复制Yahoo标题</button>
            <button className="ghost" type="button" onClick={() => copyText(makePlatformTitle(form, "rakuten"))}>复制乐天标题</button>
          </div>
        </div>

        {isSoldStatus(form.status) && (
          <>
            <FormSectionTitle title="⑥ 销售信息" note="状态为已售出/已发货时填写成交价、销售平台和销售备注。" />
            <Input label="销售日期" type="date" value={form.soldDate || ""} onChange={(v) => set("soldDate", v)} />
            <Input label="销售平台" value={form.soldPlatform || ""} onChange={(v) => set("soldPlatform", v)} placeholder="EcoRing / Mercari / 店铺 / 其他" />
            <Input label="实际销售额 JPY（税込）" type="number" value={form.soldPriceJpy || ""} onChange={(v) => set("soldPriceJpy", v)} />
            <label className="full">
              销售备注
              <textarea value={form.soldMemo || ""} onChange={(e) => set("soldMemo", e.target.value)} placeholder="拍卖成交 / 线下销售 / 买家备注" />
            </label>
          </>
        )}

        <FormSectionTitle title="⑦ 图片 / 备注" note="每件商品最多3张图片，建议第一张放正面图，方便库存、出品、PDF统一显示。" />

        <label
          className="full"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDropImages}
          style={{ border: "1px dashed #94a3b8", borderRadius: "14px", padding: "14px", background: "#f8fafc" }}
        >
          商品图片（最多3张，自动压缩保存，可拖拽图片到这里）
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
        <button type="button" className="primary" onClick={saveItem}>
          <Save size={16} /> {editingId ? "保存修改" : "添加到库存"}
        </button>
        {editingId && (
          <button type="button" className="ghost" onClick={resetForm}>
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

function ProductThumb({ item, size = 72, onPreview }) {
  const src = Array.isArray(item?.images) && item.images.length ? item.images[0] : "";
  if (!src) return "—";
  return (
    <img
      className="thumb"
      src={src}
      alt={item?.item || item?.id || "product"}
      style={{ width: size, height: size }}
      onClick={() => onPreview?.(src)}
    />
  );
}

function Inventory({ items, query, setQuery, statusFilter, setStatusFilter, downloadCSV, editItem, deleteItem, isOwner, setPreviewImage, setPreviewScale, exportItemPdf }) {
  const [detailItem, setDetailItem] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil((items || []).length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = (items || []).slice((currentPage - 1) * pageSize, currentPage * pageSize);

  React.useEffect(() => {
    setPage(1);
  }, [query, statusFilter, items.length]);

  const headers = ["图片", "商品编号", "入库日期", "品牌", "商品名", "状态", "平台", "报关批次", "真实成本JPY", "预计售价JPY（税込）", "销售消费税", "税抜售价", "净利润", "利润率", "操作"];
  const csvHeaders = ["商品编号", "入库日期", "品类", "品牌", "商品名", "材质", "颜色", "产地", "数量", "采购币种", "采购金额", "采购汇率", "申报币种", "申报金额", "申报汇率", "采购JPY", "附加成本JPY", "真实成本JPY", "报关批次", "进项消费税估算", "预计销售JPY税込", "销售消费税", "税抜售价", "净利润", "状态"];
  const csvRows = [csvHeaders];

  items.forEach((x) => {
    const t = calcTax(x);
    csvRows.push([x.id, x.purchaseDate, x.category, x.brand, x.item, x.material, x.color, x.origin, x.qty, x.purchaseCurrency || "CNY", x.purchaseCny, x.purchaseRateToJpy || x.rate, x.declaredCurrency || "CNY", x.declaredCny, x.declaredRateToJpy || x.rate, Math.round(t.baseCostJpy), Math.round(t.extraCostJpy), Math.round(t.costJpy), x.customsBatchId || "", Math.round(t.inputTax), x.saleJpy, Math.round(t.outputTax), Math.round(t.saleExTax), Math.round(t.profitExTax), x.status]);
  });

  const rows = pageItems.map((x) => {
    const t = calcTax(x);
    return [
      x.images && x.images.length ? <img className="thumb" src={x.images[0]} alt={x.item} style={{ width: 72, height: 72 }} onClick={() => { setPreviewScale(1); setPreviewImage(x.images[0]); }} /> : "—",
      x.id,
      x.purchaseDate,
      x.brand,
      x.item,
      <StatusBadge status={x.status} />,
      x.platform || "—",
      x.customsBatchId || "—",
      Math.round(t.costJpy),
      x.saleJpy,
      Math.round(t.outputTax),
      Math.round(t.saleExTax),
      Math.round(t.profitExTax),
      `${(t.saleExTax ? (t.profitExTax / t.saleExTax * 100) : 0).toFixed(1)}%`,
      <div className="table-actions">
        <button className="ghost" onClick={() => setDetailItem(x)}>详情</button>
        <button className="ghost" onClick={() => exportItemPdf?.(x)}>PDF</button>
        <button className="edit" onClick={() => editItem(x)}>
          <Edit3 size={14} /> 编辑
        </button>
        {isOwner && (
          <button className="danger" onClick={() => deleteItem(x.id)}>
            <Trash2 size={14} /> 删除
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
      <p className="note">表格已精简。库存管理每页显示50件，当前第 {currentPage} / {totalPages} 页，共 {items.length} 件。详细字段请点「详情」查看，避免页面过宽。</p>
      <div className="action-row" style={{ marginBottom: "12px" }}>
        <button className="ghost" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>上一页</button>
        <span className="pill">{(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, items.length)} / {items.length}</span>
        <button className="ghost" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>下一页</button>
      </div>
      <Table headers={headers} rows={rows} />

      {detailItem && (
        <div className="image-modal" onClick={() => setDetailItem(null)}>
          <div className="panel" style={{ width: "860px", maxWidth: "92vw", maxHeight: "88vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div className="toolbar">
              <h2>{detailItem.brand} {detailItem.item}</h2>
              <button onClick={() => exportItemPdf?.(detailItem)}>导出PDF</button>
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
            <p><b>费用：</b>单件运费 {jpy(detailItem.shippingJpy)} / 单件关税 {jpy(detailItem.dutyJpy)} / 批次分摊关税 {jpy(detailItem.batchAllocatedDutyJpy)} / 批次分摊运费 {jpy(detailItem.batchAllocatedShippingJpy)} / 报关 {jpy(Number(detailItem.customsFeeJpy || 0) + Number(detailItem.batchAllocatedCustomsFeeJpy || 0))} / 手续费 {jpy(detailItem.platformFeeJpy)} / 其他 {jpy(Number(detailItem.otherCostJpy || 0) + Number(detailItem.batchAllocatedOtherCostJpy || 0))}</p>
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
    "图片",
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
    x.images && x.images.length ? <img className="thumb" src={x.images[0]} alt={x.item} style={{ width: 72, height: 72 }} /> : "—",
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



function CustomsBatchPanel({ batches, setBatches, items, downloadCSV }) {
  const emptyBatch = { id: "", name: "", importDate: new Date().toISOString().slice(0, 10), declaredTotalJpy: "", dutyJpy: "", importConsumptionTaxJpy: "", shippingJpy: "", customsFeeJpy: "", otherCostJpy: "", memo: "" };
  const [form, setForm] = useState(emptyBatch);
  const [editingId, setEditingId] = useState(null);
  const set = (k, v) => setForm({ ...form, [k]: v });

  function reset() {
    setForm(emptyBatch);
    setEditingId(null);
  }

  function saveBatch() {
    const next = {
      ...form,
      id: editingId || form.id || makeCustomsBatchId(batches),
      name: form.name || form.id || editingId || "报关批次",
      declaredTotalJpy: Number(form.declaredTotalJpy || 0),
      dutyJpy: Number(form.dutyJpy || 0),
      importConsumptionTaxJpy: Number(form.importConsumptionTaxJpy || 0),
      shippingJpy: Number(form.shippingJpy || 0),
      customsFeeJpy: Number(form.customsFeeJpy || 0),
      otherCostJpy: Number(form.otherCostJpy || 0)
    };
    if (editingId) {
      setBatches(batches.map((b) => b.id === editingId ? next : b));
      alert("报关批次已更新");
    } else {
      setBatches([next, ...batches]);
      alert("报关批次已新增");
    }
    reset();
  }

  function editBatch(b) {
    setForm(b);
    setEditingId(b.id);
  }

  function deleteBatch(id) {
    if (!window.confirm("确认删除这个报关批次吗？商品不会删除，但会失去批次分摊关系。")) return;
    setBatches(batches.filter((b) => b.id !== id));
  }

  function batchStats(batch) {
    const arr = items.filter((x) => x.customsBatchId === batch.id);
    const declared = arr.reduce((a, x) => a + calcTax(x).declaredJpy, 0);
    const allocatedCost = arr.reduce((a, x) => a + Number(x.batchAllocatedDutyJpy || 0) + Number(x.batchAllocatedShippingJpy || 0) + Number(x.batchAllocatedCustomsFeeJpy || 0) + Number(x.batchAllocatedOtherCostJpy || 0), 0);
    return { count: arr.length, declared, allocatedCost };
  }

  const headers = ["批次号", "报关日期", "商品件数", "商品申报合计", "关税合计", "进口消费税合计", "运费", "报关费", "分摊成本", "备注", "操作"];
  const rows = batches.map((b) => {
    const st = batchStats(b);
    return [
      b.id,
      b.importDate || "",
      `${st.count} 件`,
      Math.round(st.declared),
      Math.round(Number(b.dutyJpy || 0)),
      Math.round(Number(b.importConsumptionTaxJpy || 0)),
      Math.round(Number(b.shippingJpy || 0)),
      Math.round(Number(b.customsFeeJpy || 0)),
      Math.round(st.allocatedCost),
      b.memo || "",
      <div className="table-actions">
        <button className="edit" onClick={() => editBatch(b)}>编辑</button>
        <button className="danger" onClick={() => deleteBatch(b.id)}>删除</button>
      </div>
    ];
  });

  return (
    <div className="panel">
      <h2>报关批次管理</h2>
      <p className="note">适合一批货统一报关：关税、运费、报关费按商品申报金额比例分摊到单件成本；进口消费税不进单件成本，只在消费税参考中汇总抵扣。</p>
      <div className="formgrid">
        <Input label="批次号" value={form.id} onChange={(v) => set("id", v)} placeholder="空白则自动生成 EMS-年月-001" />
        <Input label="批次名称" value={form.name} onChange={(v) => set("name", v)} placeholder="例：2026年6月第1批EMS" />
        <Input label="报关日期" type="date" value={form.importDate || ""} onChange={(v) => set("importDate", v)} />
        <Input label="报关申报总额 JPY（可选）" type="number" value={form.declaredTotalJpy || ""} onChange={(v) => set("declaredTotalJpy", v)} />
        <Input label="关税合计 JPY（进成本，按比例分摊）" type="number" value={form.dutyJpy || ""} onChange={(v) => set("dutyJpy", v)} />
        <Input label="进口消费税合计 JPY（可抵扣，不进成本）" type="number" value={form.importConsumptionTaxJpy || ""} onChange={(v) => set("importConsumptionTaxJpy", v)} />
        <Input label="本批国际运费 JPY（可分摊）" type="number" value={form.shippingJpy || ""} onChange={(v) => set("shippingJpy", v)} />
        <Input label="报关代行费 JPY（可分摊）" type="number" value={form.customsFeeJpy || ""} onChange={(v) => set("customsFeeJpy", v)} />
        <Input label="其他批次费用 JPY（可分摊）" type="number" value={form.otherCostJpy || ""} onChange={(v) => set("otherCostJpy", v)} />
        <label>备注<textarea value={form.memo || ""} onChange={(e) => set("memo", e.target.value)} placeholder="例：海关合并计税，关税58万，消费税120万" /></label>
      </div>
      <div className="action-row">
        <button className="primary" onClick={saveBatch}>{editingId ? "保存批次" : "新增批次"}</button>
        {editingId && <button className="ghost" onClick={reset}>取消编辑</button>}
        <button className="ghost" onClick={() => downloadCSV([headers, ...rows], "gouka_customs_batches.csv")}>CSV导出</button>
      </div>
      <Table headers={headers} rows={rows} />
    </div>
  );
}

function Customs({ items, customsBatches, downloadCSV }) {
  const headers = ["图片", "No.", "Brand", "Item", "Material", "Color", "Specification", "Qty", "Country of Origin", "Declared Currency", "Declared Value", "Declared Value (JPY)", "Import Tax 10% Ref", "Customs Batch", "Remarks"];
  const csvHeaders = headers.filter((h) => h !== "图片");

  // EMS报关只显示需要进口报关的商品。
  // 日本国内拍卖平台（NBAA / OBA / ECO Ring / JBA / AUCNET 等）不进入EMS报关页面。
  const customsItems = (items || []).filter((x) => {
    const platform = String(x.platform || "").toUpperCase();
    const batch = String(x.customsBatchId || "").toUpperCase();
    return platform.includes("EMS") || x.status === "报关准备" || batch.startsWith("EMS-");
  });

  const rows = customsItems.map((x, i) => {
    const t = calcTax(x);
    return [<ProductThumb item={x} />, i + 1, x.brand, x.item, x.material, x.color, x.category, x.qty, x.origin, x.declaredCurrency || "CNY", x.declaredCny, Math.round(t.declaredJpy), Math.round(t.inputTax), x.customsBatchId || "", "Used luxury goods / Non-CITES material"];
  });
  const csvRows = customsItems.map((x, i) => {
    const t = calcTax(x);
    return [i + 1, x.brand, x.item, x.material, x.color, x.category, x.qty, x.origin, x.declaredCurrency || "CNY", x.declaredCny, Math.round(t.declaredJpy), Math.round(t.inputTax), x.customsBatchId || "", "Used luxury goods / Non-CITES material"];
  });
  const totalQty = customsItems.reduce((a, x) => a + Number(x.qty || 0), 0);
  const totalValue = customsItems.reduce((a, x) => a + calcTax(x).declaredJpy, 0);

  return (
    <div className="panel">
      <Toolbar title="EMS Commercial Customs Declaration" onDownload={() => downloadCSV([csvHeaders, ...csvRows, [], ["Total Quantity", totalQty], ["Total Declared Value JPY", Math.round(totalValue)]], "gouka_ems_customs_tax.csv")} />
      <p>
        <b>Importer:</b> 豪嘉株式会社 (GOUKA INC.)
      </p>
      <p className="note">EMS报关页面只显示平台/运输方式为EMS、状态为报关准备、或所属EMS报关批次的商品。日本国内拍卖货不会显示在这里。</p>
      <Table headers={headers} rows={rows} />
      <p className="note">Total Quantity: {totalQty} pieces / Total Declared Value JPY: {jpy(totalValue)}</p>
    </div>
  );
}

function Profit({ items }) {
  const headers = ["图片", "商品编号", "品牌", "商品名", "报关批次", "基础成本JPY", "附加成本JPY", "真实成本JPY", "销售JPY（税込）", "销售不含税", "销售消费税", "预计毛利", "不含税利润参考", "利润率"];
  const rows = items.map((x) => {
    const t = calcTax(x);
    const margin = t.saleExTax ? ((t.profitExTax / t.saleExTax) * 100).toFixed(1) + "%" : "";
    return [<ProductThumb item={x} />, x.id, x.brand, x.item, x.customsBatchId || "", Math.round(t.baseCostJpy), Math.round(t.extraCostJpy), Math.round(t.costJpy), x.saleJpy, Math.round(t.saleExTax), Math.round(t.outputTax), Math.round(t.grossProfit), Math.round(t.profitExTax), margin];
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

function TaxReport({ items, totals, customsBatches, downloadCSV }) {
  const headers = ["图片", "商品编号", "品牌", "商品名", "申报JPY", "进项消费税/控除参考", "销售JPY（税込）", "销售不含税", "销售消费税", "消费税差额参考", "计算来源"];
  const csvHeaders = headers.filter((h) => h !== "图片");
  const rows = items.map((x) => {
    const t = calcTax(x);
    return [<ProductThumb item={x} />, x.id, x.brand, x.item, Math.round(t.declaredJpy), Math.round(t.inputTax), Math.round(t.saleJpy), Math.round(t.saleExTax), Math.round(t.outputTax), Math.round(t.taxBalance), t.inputTaxSource || ""];
  });
  const csvRows = items.map((x) => {
    const t = calcTax(x);
    return [x.id, x.brand, x.item, Math.round(t.declaredJpy), Math.round(t.inputTax), Math.round(t.saleJpy), Math.round(t.saleExTax), Math.round(t.outputTax), Math.round(t.taxBalance), t.inputTaxSource || ""];
  });

  const csv = [csvHeaders, ...csvRows, [], ["合计", "", "", Math.round(totals.inputTax), Math.round(totals.sale), "", Math.round(totals.outputTax), Math.round(totals.taxBalance)]];

  return (
    <div className="panel">
      <Toolbar title="消费税参考表" onDownload={() => downloadCSV(csv, "gouka_consumption_tax_reference.csv")} />
      <p className="note">课税事业者参考：销售消费税按含税销售额倒算10/110；日本拍卖商品优先读取备注里的「消費税控除参考」，普通进口商品按申报JPY×10%估算。实际申告请交由税理士确认。</p>
      <Table headers={headers} rows={rows} />
      <h3>报关批次抵扣</h3>
      <Table headers={["批次号", "报关日期", "关税合计", "进口消费税合计", "备注"]} rows={(customsBatches || []).map((b) => [b.id, b.importDate || "", Math.round(Number(b.dutyJpy || 0)), Math.round(Number(b.importConsumptionTaxJpy || 0)), b.memo || ""])} />
      <h3>合计</h3>
      <p>销售消费税参考：{jpy(totals.outputTax)}</p>
      <p>进项消费税/控除参考：{jpy(totals.inputTax)}</p>
      <p>消费税差额参考：{jpy(totals.taxBalance)}</p>
    </div>
  );
}


function ListingManagement({ items, updateListingItem, editItem, setPreviewImage, setPreviewScale }) {
  const [query, setQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState("全部");
  const [editingPlatformId, setEditingPlatformId] = useState(null);
  const [platformDraft, setPlatformDraft] = useState({ platform: "", customPlatform: "", saleJpy: "", soldPriceJpy: "" });
  const [selectedIds, setSelectedIds] = useState([]);
  const [visibleCounts, setVisibleCounts] = useState({});

  const q = query.toLowerCase();
  const kanbanStatuses = ["已入库", "待出品", "已出品", "已售出", "已发货"];
  const platforms = ["全部", ...LISTING_PLATFORMS];
  const columnLimit = 30;

  const filteredItems = (items || []).filter((x) => {
    const text = [x.id, x.brand, x.item, x.material, x.color, x.platform, x.status, x.memo].join(" ").toLowerCase();
    const matchText = !q || text.includes(q);
    const matchPlatform = platformFilter === "全部" || x.platform === platformFilter;
    return matchText && matchPlatform;
  });

  function itemsByStatus(status) {
    return filteredItems.filter((x) => x.status === status);
  }

  function visibleItemsByStatus(status) {
    const limit = visibleCounts[status] || columnLimit;
    return itemsByStatus(status).slice(0, limit);
  }

  function columnStats(status) {
    const arr = itemsByStatus(status);
    return arr.reduce((a, x) => {
      const t = calcTax(x);
      a.count += 1;
      a.cost += Number(t.costJpy || 0);
      a.sale += Number(x.soldPriceJpy || x.saleJpy || 0);
      a.profit += Number(t.profitExTax || 0);
      return a;
    }, { count: 0, cost: 0, sale: 0, profit: 0 });
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  async function bulkUpdate(patch, actionText) {
    const ids = selectedIds.filter((id) => filteredItems.some((x) => x.id === id));
    if (!ids.length) return alert("请先勾选商品。");
    if (!window.confirm(`确认批量更新 ${ids.length} 件商品吗？`)) return;
    for (const id of ids) {
      await updateListingItem(id, patch, actionText);
    }
    setSelectedIds([]);
    alert(`已批量更新 ${ids.length} 件商品。`);
  }

  function openPlatformEditor(item) {
    setEditingPlatformId(item.id);
    setPlatformDraft({
      platform: LISTING_PLATFORMS.includes(item.platform) ? item.platform : (item.platform ? "其他" : ""),
      customPlatform: LISTING_PLATFORMS.includes(item.platform) ? "" : (item.platform || ""),
      saleJpy: item.saleJpy || "",
      soldPriceJpy: item.soldPriceJpy || ""
    });
  }

  async function savePlatform(item) {
    const platform = platformDraft.platform === "其他" ? platformDraft.customPlatform : platformDraft.platform;
    await updateListingItem(item.id, {
      platform: platform || item.platform || "",
      saleJpy: Number(platformDraft.saleJpy || item.saleJpy || 0),
      soldPriceJpy: Number(platformDraft.soldPriceJpy || item.soldPriceJpy || 0)
    }, "出品平台/价格更新");
    setEditingPlatformId(null);
  }

  async function quickSetPlatform(item, platform) {
    await updateListingItem(item.id, {
      platform,
      status: item.status === "已入库" ? "待出品" : item.status
    }, `快速设置出品平台：${platform}`);
  }

  async function moveStatus(item, nextStatus) {
    const patch = { status: nextStatus };
    if (nextStatus === "已售出") {
      patch.soldDate = item.soldDate || new Date().toISOString().slice(0, 10);
      patch.soldPlatform = item.soldPlatform || item.platform || "";
      patch.soldPriceJpy = Number(item.soldPriceJpy || item.saleJpy || 0);
    }
    if (nextStatus === "已发货") {
      patch.soldDate = item.soldDate || new Date().toISOString().slice(0, 10);
      patch.soldPlatform = item.soldPlatform || item.platform || "";
      patch.soldPriceJpy = Number(item.soldPriceJpy || item.saleJpy || 0);
      patch.soldMemo = String(item.soldMemo || "").includes("発送済") ? item.soldMemo : `${item.soldMemo || ""} 発送済`.trim();
    }
    await updateListingItem(item.id, patch, `出品状态变更：${item.status || "未设置"} → ${nextStatus}`);
  }

  const counts = kanbanStatuses.reduce((a, st) => ({ ...a, [st]: itemsByStatus(st).length }), {});
  const selectedCount = selectedIds.length;

  return (
    <div className="panel">
      <h2><Package size={20} /> 出品管理</h2>
      <p className="note">Enterprise 1.2.5：录入页整理 + 出品管理轻量优化。每列默认显示30件，显示件数与总成本；卡片压缩；支持勾选后批量加入 NBAA / OBA / ECO 或批量改状态。</p>

      <div className="grid4" style={{marginBottom:"16px"}}>
        <Card icon={<Package />} title="已入库" value={`${counts["已入库"] || 0} 件`} />
        <Card icon={<FileText />} title="待出品" value={`${counts["待出品"] || 0} 件`} />
        <Card icon={<Upload />} title="已出品" value={`${counts["已出品"] || 0} 件`} />
        <Card icon={<Calculator />} title="已售/已发货" value={`${(counts["已售出"] || 0) + (counts["已发货"] || 0)} 件`} />
      </div>

      <div className="toolbar" style={{marginBottom:"12px"}}>
        <h2>流程看板</h2>
        <div className="toolbar-right">
          <div className="search">
            <Search size={16} />
            <input placeholder="搜索编号 / 品牌 / 商品 / 平台" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
            {platforms.map((p) => <option key={p}>{p}</option>)}
          </select>
          <button onClick={() => { setQuery(""); setPlatformFilter("全部"); clearSelection(); }}>清除</button>
        </div>
      </div>

      <div className="panel" style={{background:"#f8fafc", padding:"12px", marginBottom:"14px"}}>
        <div className="action-row" style={{flexWrap:"wrap"}}>
          <span className="pill">已勾选 {selectedCount} 件</span>
          <button className="ghost" onClick={() => bulkUpdate({ platform: "NBAA", status: "待出品" }, "批量加入NBAA待出品")}>加入 NBAA</button>
          <button className="ghost" onClick={() => bulkUpdate({ platform: "OBA", status: "待出品" }, "批量加入OBA待出品")}>加入 OBA</button>
          <button className="ghost" onClick={() => bulkUpdate({ platform: "ECO Ring", status: "待出品" }, "批量加入ECO待出品")}>加入 ECO</button>
          <button className="ghost" onClick={() => bulkUpdate({ status: "已出品" }, "批量改为已出品")}>改为已出品</button>
          <button className="ghost" onClick={() => bulkUpdate({ status: "已售出", soldDate: new Date().toISOString().slice(0, 10) }, "批量改为已售出")}>改为已售出</button>
          <button className="ghost" onClick={clearSelection}>取消勾选</button>
        </div>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"repeat(5, minmax(220px, 1fr))", gap:"12px", alignItems:"start", overflowX:"auto", paddingBottom:"8px"}}>
        {kanbanStatuses.map((status, idx) => {
          const stats = columnStats(status);
          const allInColumn = itemsByStatus(status);
          const visible = visibleItemsByStatus(status);
          const currentLimit = visibleCounts[status] || columnLimit;
          return (
            <div key={status} style={{background:"#f8fafc", border:"1px solid #e5e7eb", borderRadius:"16px", padding:"12px", minHeight:"420px"}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px"}}>
                <b>{idx + 1}. {status}</b>
                <span className="pill">{stats.count} 件</span>
              </div>
              <div style={{fontSize:"12px", color:"#475569", lineHeight:1.6, marginBottom:"10px", borderBottom:"1px solid #e5e7eb", paddingBottom:"8px"}}>
                <div>总成本：<b>{jpy(stats.cost)}</b></div>
                <div>预计/成交：<b>{jpy(stats.sale)}</b></div>
                <div>参考利润：<b>{jpy(stats.profit)}</b></div>
              </div>
              <div style={{display:"flex", flexDirection:"column", gap:"10px"}}>
                {visible.map((item) => {
                  const t = calcTax(item);
                  const nextStatus = status === "已入库" ? "待出品" : status === "待出品" ? "已出品" : status === "已出品" ? "已售出" : status === "已售出" ? "已发货" : "";
                  const checked = selectedIds.includes(item.id);
                  return (
                    <div key={item.id} style={{background: checked ? "#eff6ff" : "#fff", border: checked ? "1px solid #60a5fa" : "1px solid #e5e7eb", borderRadius:"14px", padding:"10px", boxShadow:"0 8px 18px rgba(15,23,42,.05)"}}>
                      <div style={{display:"flex", gap:"10px", alignItems:"flex-start"}}>
                        <input type="checkbox" checked={checked} onChange={() => toggleSelect(item.id)} style={{marginTop:"4px"}} />
                        <div style={{width:"64px", height:"64px", borderRadius:"12px", background:"#eef2ff", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
                          {item.images?.[0] ? <img src={item.images[0]} alt={item.item} style={{width:"100%", height:"100%", objectFit:"cover", cursor:"pointer"}} onClick={() => { setPreviewScale(1); setPreviewImage(item.images[0]); }} /> : "📦"}
                        </div>
                        <div style={{minWidth:0, flex:1}}>
                          <b style={{display:"block", fontSize:"13px", lineHeight:1.35}}>{item.brand} {item.item}</b>
                          <small style={{color:"#64748b"}}>{item.id}</small>
                          <div style={{marginTop:"5px"}}><StatusBadge status={item.status} /></div>
                        </div>
                      </div>

                      <div style={{fontSize:"12px", color:"#475569", marginTop:"10px", lineHeight:1.65}}>
                        <div><b>平台：</b>{item.platform || "未设置"}</div>
                        <div><b>成本：</b>{jpy(t.costJpy)}</div>
                        <div><b>预计：</b>{jpy(item.saleJpy)}</div>
                        <div><b>成交：</b>{jpy(item.soldPriceJpy || 0)}</div>
                        <div><b>利润：</b>{jpy(t.profitExTax)}</div>
                      </div>

                      {editingPlatformId === item.id ? (
                        <div style={{marginTop:"10px", display:"grid", gap:"8px"}}>
                          <select value={platformDraft.platform} onChange={(e) => setPlatformDraft({ ...platformDraft, platform: e.target.value })}>
                            <option value="">选择平台</option>
                            {LISTING_PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                          </select>
                          {platformDraft.platform === "其他" && <input value={platformDraft.customPlatform} onChange={(e) => setPlatformDraft({ ...platformDraft, customPlatform: e.target.value })} placeholder="手动输入平台 / 拍卖会 / 客户" />}
                          <input type="number" value={platformDraft.saleJpy} onChange={(e) => setPlatformDraft({ ...platformDraft, saleJpy: e.target.value })} placeholder="预计出品价 JPY" />
                          <input type="number" value={platformDraft.soldPriceJpy} onChange={(e) => setPlatformDraft({ ...platformDraft, soldPriceJpy: e.target.value })} placeholder="实际成交价 JPY" />
                          <div className="action-row">
                            <button className="primary" onClick={() => savePlatform(item)}>保存</button>
                            <button className="ghost" onClick={() => setEditingPlatformId(null)}>取消</button>
                          </div>
                        </div>
                      ) : (
                        <div className="action-row" style={{marginTop:"10px", flexWrap:"wrap"}}>
                          <button className="ghost" onClick={() => quickSetPlatform(item, "NBAA")}>NBAA</button>
                          <button className="ghost" onClick={() => quickSetPlatform(item, "OBA")}>OBA</button>
                          <button className="ghost" onClick={() => quickSetPlatform(item, "ECO Ring")}>ECO</button>
                          <button className="ghost" onClick={() => openPlatformEditor(item)}>平台/价格</button>
                          {nextStatus && <button className="primary" onClick={() => moveStatus(item, nextStatus)}>移到{nextStatus}</button>}
                          <button className="edit" onClick={() => editItem(item)}>编辑</button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {!visible.length && <p className="note">暂无商品</p>}
                {allInColumn.length > currentLimit && (
                  <button className="ghost" onClick={() => setVisibleCounts((prev) => ({ ...prev, [status]: currentLimit + columnLimit }))}>
                    查看更多（还有 {allInColumn.length - currentLimit} 件）
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SalesReport({ items, downloadCSV }) {
  const [salesQuery, setSalesQuery] = useState("");
  const [salesMonth, setSalesMonth] = useState("");

  const soldItems = items.filter((x) => isSoldStatus(x.status));

  const filteredSold = soldItems.filter((x) => {
    const q = salesQuery.toLowerCase();
    const matchText = !q || Object.values(x).join(" ").toLowerCase().includes(q);
    const matchMonth = !salesMonth || (x.soldDate || "").startsWith(salesMonth);
    return matchText && matchMonth;
  });

  const headers = ["图片", "商品编号", "品牌", "商品名", "销售日期", "销售平台", "销售额JPY（税込）", "采购成本JPY", "销售消费税", "预计毛利", "不含税利润参考", "备注"];
  const csvHeaders = headers.filter((h) => h !== "图片");
  const rows = filteredSold.map((x) => {
    const t = calcTax(x);
    return [
      <ProductThumb item={x} />,
      x.id,
      x.brand,
      x.item,
      x.soldDate || "",
      x.soldPlatform || x.platform || "",
      Math.round(t.saleJpy),
      Math.round(t.costJpy),
      Math.round(t.outputTax),
      Math.round(t.grossProfit),
      Math.round(t.profitExTax),
      x.soldMemo || ""
    ];
  });
  const csvRows = filteredSold.map((x) => {
    const t = calcTax(x);
    return [
      x.id,
      x.brand,
      x.item,
      x.soldDate || "",
      x.soldPlatform || x.platform || "",
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
      <Toolbar title="销售记录" onDownload={() => downloadCSV([csvHeaders, ...csvRows], "gouka_sales_report.csv")} />

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

      <p className="note">状态改为「已售出」或「已发货」后，会自动进入这里。可按品牌、商品名、销售平台、月份筛选。</p>

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


function PdfExportPanel({ items, totals, exportInventoryPdf }) {
  const [pdfQuery, setPdfQuery] = useState("");
  const [status, setStatus] = useState("全部");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);

  const q = pdfQuery.toLowerCase();
  const statuses = ["全部", ...WORKFLOW_STATUSES];

  const filteredPdfItems = (items || []).filter((x) => {
    const matchText = !q || Object.values(x).join(" ").toLowerCase().includes(q);
    const matchStatus = status === "全部" || x.status === status;
    const d = x.purchaseDate || "";
    const matchStart = !startDate || d >= startDate;
    const matchEnd = !endDate || d <= endDate;
    return matchText && matchStatus && matchStart && matchEnd;
  });

  const selectedItems = filteredPdfItems.filter((x) => selectedIds.includes(x.id));
  const allSelected = filteredPdfItems.length > 0 && filteredPdfItems.every((x) => selectedIds.includes(x.id));

  function toggleOne(id) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredPdfItems.some((x) => x.id === id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredPdfItems.map((x) => x.id)])));
    }
  }

  function exportSelected() {
    if (!selectedItems.length) return alert("请先勾选要导出的商品。 ");
    exportInventoryPdf(selectedItems, `选中商品库存报告（${selectedItems.length}件）`);
  }

  function exportByDate() {
    if (!startDate && !endDate) return alert("请先选择开始日期或结束日期。 ");
    exportInventoryPdf(filteredPdfItems, `日期范围库存报告（${startDate || "开始"}～${endDate || "今天"}）`);
  }

  return (
    <div className="panel">
      <h2><FileText size={20} /> PDF导出中心</h2>
      <p className="note">Enterprise 1.2.4 PDF：使用公司正式抬头、电子公章、適格請求書登録番号。支持全部导出、勾选导出、按日期导出。</p>

      <div className="grid4" style={{marginTop:"16px"}}>
        <Card icon={<Package />} title="商品记录" value={`${items.length} 件`} />
        <Card icon={<ImagePlus />} title="有图商品" value={`${items.filter(x => x.images?.length).length} 件`} />
        <Card icon={<Calculator />} title="库存总成本" value={jpy(totals.cost)} />
        <Card icon={<Calculator />} title="预计净利润" value={jpy(totals.profit)} />
      </div>

      <div className="formgrid" style={{marginTop:"18px"}}>
        <Input label="搜索编号 / 品牌 / 商品" value={pdfQuery} onChange={setPdfQuery} placeholder="例如 CHANEL / GOUKA-202606" />
        <Select label="状态筛选" value={status} onChange={setStatus} options={statuses} />
        <Input label="开始日期" type="date" value={startDate} onChange={setStartDate} />
        <Input label="结束日期" type="date" value={endDate} onChange={setEndDate} />
      </div>

      <div className="action-row" style={{marginTop:"20px", flexWrap:"wrap"}}>
        <button className="primary" onClick={() => exportInventoryPdf(items, "全部库存报告")}>全部导出PDF</button>
        <button className="primary" onClick={exportSelected}>勾选导出PDF</button>
        <button className="primary" onClick={exportByDate}>按日期导出PDF</button>
        <button className="ghost" onClick={() => { setPdfQuery(""); setStatus("全部"); setStartDate(""); setEndDate(""); setSelectedIds([]); }}>清除条件</button>
      </div>

      <p className="note" style={{marginTop:"14px"}}>当前筛选：{filteredPdfItems.length} 件 / 已勾选：{selectedItems.length} 件</p>

      <Table
        headers={[
          <input type="checkbox" checked={allSelected} onChange={toggleAll} />,
          "图片", "商品编号", "入库日", "品牌", "商品名", "状态", "成本", "利润"
        ]}
        rows={filteredPdfItems.map((x) => {
          const t = calcTax(x);
          return [
            <input type="checkbox" checked={selectedIds.includes(x.id)} onChange={() => toggleOne(x.id)} />,
            x.images?.[0] ? <img className="thumb" src={x.images[0]} alt={x.item} style={{ width: 72, height: 72 }} /> : "—",
            x.id,
            x.purchaseDate,
            x.brand,
            x.item,
            <StatusBadge status={x.status} />,
            jpy(t.costJpy),
            jpy(t.profitExTax)
          ];
        })}
      />
    </div>
  );
}

function BackupPanel({ items, exportBackup, importBackup }) {
  return (
    <div className="panel">
      <h2><Database size={20} /> 数据备份 / 恢复</h2>
      <p className="note">当前系统文字数据保存在本机浏览器，图片保存在浏览器IndexedDB图片库。V7.11备份会包含商品、图片、字典、供应商、报关批次、现金流。换电脑、清理浏览器、重装系统前，一定要先导出备份。</p>

      <div className="grid4" style={{marginTop:"16px"}}>
        <Card icon={<Package />} title="当前商品记录" value={`${items.length} 件`} />
        <Card icon={<ImagePlus />} title="有图片商品" value={`${items.filter(x => x.images?.length).length} 件`} />
        <Card icon={<Calculator />} title="已售商品" value={`${items.filter(x => isSoldStatus(x.status)).length} 件`} />
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
  const active = items.filter((x) => !isSoldStatus(x.status) && x.status !== "退货");
  const sold = items.filter((x) => isSoldStatus(x.status));
  const todayIn = items.filter((x) => (x.purchaseDate || "") === today);
  const todaySold = items.filter((x) => (x.soldDate || "") === today || (isSoldStatus(x.status) && !x.soldDate));
  const monthIn = items.filter((x) => (x.purchaseDate || "").startsWith(month));
  const monthSold = items.filter((x) => (x.soldDate || "").startsWith(month) || (isSoldStatus(x.status) && !x.soldDate));
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
    todoShipping: items.filter((x) => isSoldStatus(x.status) && !String(x.soldMemo || "").includes("発送済"))
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
      <h2>🤖 豪嘉AI助理 V7.0</h2>
      <p className="note">本地AI经营助理：读取ERP本地数据，不上传外部服务器。可回答库存、利润、待办、品牌、供应商、超龄库存等问题。</p>
      <div className="grid4" style={{marginBottom:"16px"}}>
        <Card icon={<Package />} title="当前库存" value={`${items.filter(x => !isSoldStatus(x.status) && x.status !== "退货").length} 件`} />
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

  async function readImages(files) {
    const remain = Math.max(0, 3 - ((uploadedImages || []).length));
    if (remain <= 0) return alert("最多上传3张图片。请先删除旧图片。");
    const selected = Array.from(files || []).filter((f) => f.type.startsWith("image/")).slice(0, remain);
    if (!selected.length) return;
    const compressed = await compressImageFiles(selected, remain);
    const imgs = compressed.map((src, i) => ({ name: selected[i]?.name || `image-${i + 1}`, src }));
    setUploadedImages([...(uploadedImages || []), ...imgs].slice(0, 3));
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
      <h2>🤖 AI录入助手 V7.0</h2>
      <p className="note">
        V7.0新增图片上传通道。可以上传商品图、发票图、拍卖截图并预览；识别文字仍需粘贴或人工补充。
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
        上传图片（最多3张，自动压缩，可拖拽商品图/发票图/拍卖截图到这里）
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



function formatDateTime(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function DeleteLogPanel({ deleteLogs, downloadCSV }) {
  const headers = ["删除时间", "商品编号", "品牌", "商品名", "删除前状态", "删除人", "删除原因"];
  const rows = deleteLogs.map((x) => [
    formatDateTime(x.date),
    x.itemId,
    x.brand,
    x.item,
    x.status,
    x.user,
    x.reason
  ]);

  return (
    <div className="panel">
      <Toolbar title="删除日志" onDownload={() => downloadCSV([headers, ...rows], "gouka_delete_logs.csv")} />
      <p className="note">库存删除会写入这里。古物台账仍然不做物理删除，只允许更正和作废。</p>
      <Table headers={headers} rows={rows} />
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
        V7.0新增：供应商独立管理。录入商品选择供应商后，会自动带出地址与备注，减少员工重复输入。
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
        V7.0开始，品牌、商品名、材质、颜色、产地、来源、平台都可以在这里维护。
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
        <h3>V7.0说明</h3>
        <p>这一步先实现本地可维护字典。下一阶段可以接 Supabase，把字典、库存、图片全部云端化。</p>
      </div>
    </div>
  );
}


function Toolbar({ title, query, setQuery, statusFilter, setStatusFilter, onDownload }) {
  const statuses = ["全部", ...WORKFLOW_STATUSES];

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
  const safeOptions = Array.isArray(options) ? options : [];
  const [customMode, setCustomMode] = useState(false);
  const isKnown = safeOptions.includes(value);
  const selectValue = customMode ? "其他" : (isKnown ? value : (value ? "其他" : ""));
  const showCustom = customMode || (!isKnown && !!value);

  React.useEffect(() => {
    if (value && safeOptions.includes(value)) setCustomMode(false);
  }, [value, safeOptions.join("|")]);

  return (
    <label>
      {label}
      <select
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "其他") {
            setCustomMode(true);
            onChange("");
          } else {
            setCustomMode(false);
            onChange(v);
          }
        }}
      >
        <option value="">{placeholder || "请选择；找不到请选其他手动输入"}</option>
        {safeOptions.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
        {!safeOptions.includes("其他") && <option value="其他">其他</option>}
      </select>
      {showCustom && (
        <input
          style={{ marginTop: "6px" }}
          value={value === "其他" ? "" : value}
          placeholder="这里可以手动输入"
          autoFocus
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}


class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "页面发生错误" };
  }
  componentDidCatch(error, info) {
    console.error("GOUKA ERP Error", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="login-page">
          <div className="login-card" style={{ maxWidth: 560 }}>
            <div className="login-logo"><Database size={28} /></div>
            <h1>GOUKA ERP 安全模式</h1>
            <p>页面发生错误，但系统没有白屏。请先导出/检查备份，必要时清理本地图片数据。</p>
            <p className="note">错误信息：{this.state.message}</p>
            <button className="login-btn" onClick={() => window.location.reload()}>刷新页面</button>
            <button className="ghost" style={{ marginTop: 10 }} onClick={() => {
              if (window.confirm("只清除登录状态并刷新，不删除商品数据。继续吗？")) {
                localStorage.removeItem(LOGIN_KEY);
                window.location.reload();
              }
            }}>清除登录状态</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
