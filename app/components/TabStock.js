// app/components/TabStock.js
import React, { useState } from 'react';
import { Layers, Edit2, Plus, ChevronDown, Trash2, Palette, X, Minus, Save, GripVertical, AlertTriangle, Clipboard, Share2, Search, Check, ArrowUpDown } from 'lucide-react';
import { GlassCard, Button, Badge } from './ui';
import { hasPermission } from '../utils/permissions';

// --- DND-KIT Imports ---
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const AVAILABLE_COLORS = [
    'bg-green-600', 'bg-green-800', 'bg-yellow-500', 'bg-yellow-600', 
    'bg-red-600', 'bg-orange-600', 'bg-gray-500', 'bg-gray-700',
    'bg-blue-600', 'bg-blue-800', 'bg-indigo-600', 'bg-purple-700',
];

// Stock level for colouring: out (≤0, including negative), low (≤ minStock), ok
const getStockLevel = (product) => {
  const stock = Number(product.stock) || 0;
  const minStock = product.minStock || 5;
  if (stock <= 0) return 'out';
  if (stock <= minStock) return 'low';
  return 'ok';
};

const LEVEL_STYLES = {
  out: { bar: 'bg-danger-500', number: 'text-danger-600', badge: 'danger', label: 'หมด' },
  low: { bar: 'bg-warning-500', number: 'text-warning-700', badge: 'warning', label: 'ใกล้หมด' },
  ok: { bar: '', number: 'text-ink', badge: null, label: '' },
};

function CategoryBar({ cat, level }) {
  if (level !== 'ok') return <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${LEVEL_STYLES[level].bar}`}></div>;
  const isHex = cat?.color?.startsWith('#');
  return (
    <div
      className={`absolute left-0 top-0 bottom-0 w-1.5 ${!isHex ? cat?.color || 'bg-brand-300' : ''}`}
      style={isHex ? { backgroundColor: cat.color } : {}}
    ></div>
  );
}

// One product: name + SKU on the left, the stock number large on the right
function ProductCard({ product, cat, onClick, trailing, dragHandle, className = '', style, innerRef }) {
  const level = getStockLevel(product);
  const s = LEVEL_STYLES[level];
  const minStock = product.minStock || 5;
  return (
    <div
      ref={innerRef}
      style={style}
      onClick={onClick}
      className={`glass rounded-card pl-4 pr-3 py-3 flex items-center gap-3 relative overflow-hidden min-h-[68px] ${onClick ? 'cursor-pointer hover:bg-white/80' : ''} ${className}`}
    >
      <CategoryBar cat={cat} level={level} />
      {dragHandle}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <h3 className="font-bold text-sm text-ink truncate">{product.name}</h3>
          {s.badge && <Badge tone={s.badge}>{s.label}</Badge>}
        </div>
        {product.sku && <p className="text-xs text-ink-subtle mt-0.5 font-mono truncate">#{product.sku}</p>}
      </div>
      {trailing ?? (
        <div className="text-right shrink-0">
          <p className={`text-2xl font-black leading-none tabular-nums ${s.number}`}>{product.stock}</p>
          <p className="text-xs text-ink-muted mt-1">{level === 'ok' ? product.unit : `ขั้นต่ำ ${minStock}`}</p>
        </div>
      )}
    </div>
  );
}

// ====================================================
//  SortableItem — แต่ละรายการสินค้าที่ลากได้ (โหมดแก้ไข)
// ====================================================
function SortableProductItem({ product, cat, openEditModal }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id });

  return (
    <ProductCard
      innerRef={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 50 : 'auto' }}
      product={product}
      cat={cat}
      className="ring-1 ring-brand-200"
      dragHandle={
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none w-9 h-9 -ml-1 rounded-control text-ink-subtle hover:text-brand-600 hover:bg-white/70 flex items-center justify-center shrink-0"
          aria-label="ลากเพื่อเรียงลำดับ"
        >
          <GripVertical size={18} />
        </div>
      }
      trailing={
        <button onClick={() => openEditModal(product)} className="w-10 h-10 rounded-control bg-brand-50 text-brand-600 hover:bg-brand-100 flex items-center justify-center shrink-0" aria-label={`แก้ไข ${product.name}`}>
          <Edit2 size={16} />
        </button>
      }
    />
  );
}

// ====================================================
//  DragOverlayItem — ตัวที่ลอยตอนลาก
// ====================================================
function DragOverlayItem({ product, cat }) {
  if (!product) return null;
  return (
    <ProductCard
      product={product}
      cat={cat}
      className="glass-strong shadow-glass-lg ring-2 ring-brand-300"
      dragHandle={<div className="w-9 h-9 -ml-1 flex items-center justify-center text-brand-500 shrink-0"><GripVertical size={18} /></div>}
      trailing={<span className="w-10 h-10" />}
    />
  );
}

// ====================================================
//  Main TabStock Component
// ====================================================
export default function TabStock({ 
  products, categories, 
  isEditingStock, setIsEditingStock, 
  newProductMode, setNewProductMode, 
  showCatManager, setShowCatManager,
  newCatData, setNewCatData,
  newProdData, setNewProdData,
  editFormData, setEditFormData,
  editingProduct, setEditingProduct,
  editingCategory, setEditingCategory,
  collapsedCats, toggleCollapse,
  openEditModal,
  // Actions
  handleAddProduct, handleSaveEdit, handleDeleteProduct,
  handleSaveCategory, handleEditCategory, handleDeleteCategory,
  handleReorderStock,
  copyToClipboard,
  handleSendStockToLine,
  user,
  // Search is shared with the desktop header; falls back to local state
  searchQuery: externalQuery, setSearchQuery: setExternalQuery
}) {
  const canEdit = hasPermission(user, 'STOCK_EDIT');
  const canSendLine = hasPermission(user, 'SEND_LINE_REPORT');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [localQuery, setLocalQuery] = useState('');
  const searchQuery = externalQuery ?? localQuery;
  const setSearchQuery = setExternalQuery ?? setLocalQuery;
  const [levelFilter, setLevelFilter] = useState('all'); // 'all' | 'low' | 'out'
  const [catFilter, setCatFilter] = useState('all');
  
  // --- State สำหรับ Modal เลือกหมวดหมู่ ---
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportCats, setSelectedReportCats] = useState([]);
  const [includeNoCat, setIncludeNoCat] = useState(true);
  
  // --- DND State ---
  const [activeId, setActiveId] = useState(null);

  // DND Sensors — PointerSensor (desktop) + TouchSensor (mobile)
  // activationConstraint ป้องกันการ drag โดยไม่ตั้งใจ
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 }
    })
  );

  const [prevReportModalState, setPrevReportModalState] = useState(false);
  if (showReportModal !== prevReportModalState) {
    setPrevReportModalState(showReportModal);
    if (showReportModal) {
      setSelectedReportCats(categories.map(c => c.name));
      setIncludeNoCat(true);
    }
  }

  const toggleReportCat = (catName) => {
    if (selectedReportCats.includes(catName)) {
        setSelectedReportCats(prev => prev.filter(c => c !== catName));
    } else {
        setSelectedReportCats(prev => [...prev, catName]);
    }
  };

  const handleConfirmSendReport = () => {
    const targetCats = categories.filter(c => selectedReportCats.includes(c.name));
    const targetProducts = products.filter(p => {
        if (!p.category) return includeNoCat;
        return selectedReportCats.includes(p.category);
    });

    if (targetCats.length === 0 && (!includeNoCat || products.filter(p=>!p.category).length === 0)) {
        return alert("กรุณาเลือกอย่างน้อย 1 หมวดหมู่");
    }
    
    handleSendStockToLine(targetCats, targetProducts);
    setShowReportModal(false);
  };

  const renderColorCircle = (colorCode, sizeClass = "w-6 h-6") => {
    const safeColor = colorCode || 'bg-gray-200';
    const isHex = safeColor.startsWith('#');
    return (
      <div 
        className={`${sizeClass} rounded-full border border-gray-200 shadow-sm ${!isHex ? safeColor : ''}`} 
        style={isHex ? { backgroundColor: safeColor } : {}}
      ></div>
    );
  };

  // --- DND Handlers ---
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event, catProducts) => {
    const { active, over } = event;
    const currentActiveId = active?.id;
    setActiveId(null);

    if (!over || !currentActiveId || currentActiveId === over.id) return;
    if (!handleReorderStock) return;

    const oldIndex = catProducts.findIndex(p => p.id === currentActiveId);
    const newIndex = catProducts.findIndex(p => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(catProducts, oldIndex, newIndex);
    handleReorderStock(reordered);
  };

  const handleCopyStockReport = () => {
    const now = new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
    let report = `📦 สต็อกคงเหลือ (อัปเดต ${now})\n--------------------------------\n`;
    categories.forEach(cat => {
        const catProducts = products.filter(p => p.category === cat.name).sort((a, b) => (a.order || 0) - (b.order || 0));
        if (catProducts.length > 0) {
            report += `\n🔹 ${cat.name}\n`;
            catProducts.forEach(p => { report += `- ${p.name} : ${p.stock === 0 ? '❌ หมด' : p.stock + ' ' + p.unit}\n`; });
        }
    });
    const noCatProducts = products.filter(p => !p.category);
    if (noCatProducts.length > 0) {
        report += `\n⚠️ อื่นๆ (ไม่ระบุหมวด)\n`;
        noCatProducts.forEach(p => { report += `- ${p.name} : ${p.stock} ${p.unit}\n`; });
    }
    report += `\n--------------------------------\nเช็คยอดโดย: Stock Jin App`;
    copyToClipboard(report);
  };

  // หา product ที่กำลัง drag อยู่
  const getActiveProduct = () => {
    if (!activeId) return null;
    return products.find(p => p.id === activeId);
  };

  const getActiveCat = () => {
    const p = getActiveProduct();
    if (!p) return null;
    return categories.find(c => c.name === p.category) || { name: 'ไม่ระบุ', color: 'bg-gray-300' };
  };

  // --- Search & filters ---
  const query = searchQuery.trim().toLowerCase();
  const levelCounts = products.reduce((acc, p) => { acc[getStockLevel(p)] += 1; return acc; }, { ok: 0, low: 0, out: 0 });
  const matchesFilters = (p) =>
    (!query || p.name?.toLowerCase().includes(query) || p.sku?.toLowerCase().includes(query)) &&
    (levelFilter === 'all' || getStockLevel(p) === levelFilter) &&
    (catFilter === 'all' || p.category === catFilter);
  const isFiltering = Boolean(query) || levelFilter !== 'all' || catFilter !== 'all';
  const visibleCount = products.filter(matchesFilters).length;
  const uncategorized = products.filter(p => !p.category);

  const inputClass = 'w-full h-11 px-3 rounded-control border border-white bg-white/70 text-sm text-ink focus:bg-white focus:ring-2 focus:ring-brand-200 outline-none';
  const labelClass = 'block text-xs font-bold text-ink-muted mb-1';
  const chipClass = (active) => `h-9 px-3.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${active ? 'bg-brand-500 text-white' : 'bg-white/70 text-ink-muted hover:bg-white'}`;

  return (
      <div className="space-y-4 pb-24 animate-fade-in-slide relative">
        {/* Toolbar: search + actions, sticky so it is reachable while scrolling */}
        <div className="sticky top-0 z-20 -mx-1 px-1 pt-1 pb-2 space-y-2.5 bg-[#f4f5fa]/95 backdrop-blur-md rounded-b-card">
          <div className="flex gap-2">
            <label className="relative flex-1">
              <span className="sr-only">ค้นหาสินค้า</span>
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหาชื่อสินค้าหรือ SKU"
                className={`${inputClass} pl-9 glass`}
              />
            </label>
            {canEdit && !isEditingStock && (
              <Button icon={Plus} onClick={() => { setNewProductMode(true); setShowCatManager(false); }} aria-label="เพิ่มสินค้า">
                <span className="hidden lg:inline">เพิ่มสินค้า</span>
              </Button>
            )}
          </div>

          {/* Stock level filter doubles as a summary */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            <button className={chipClass(levelFilter === 'all')} onClick={() => setLevelFilter('all')}>ทั้งหมด <span className="opacity-70">{products.length}</span></button>
            <button className={chipClass(levelFilter === 'low')} onClick={() => setLevelFilter(levelFilter === 'low' ? 'all' : 'low')}>
              <span className="w-2 h-2 rounded-full bg-warning-500" /> ใกล้หมด <span className="opacity-70">{levelCounts.low}</span>
            </button>
            <button className={chipClass(levelFilter === 'out')} onClick={() => setLevelFilter(levelFilter === 'out' ? 'all' : 'out')}>
              <span className="w-2 h-2 rounded-full bg-danger-500" /> หมด <span className="opacity-70">{levelCounts.out}</span>
            </button>
            <span className="w-px bg-brand-100 my-1.5 shrink-0" />
            <button className={chipClass(catFilter === 'all')} onClick={() => setCatFilter('all')}>ทุกหมวด</button>
            {categories.map(cat => (
              <button key={cat.id} className={chipClass(catFilter === cat.name)} onClick={() => setCatFilter(catFilter === cat.name ? 'all' : cat.name)}>
                {renderColorCircle(cat.color, 'w-2.5 h-2.5')} {cat.name}
              </button>
            ))}
          </div>

        </div>

        {/* Secondary actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button size="sm" variant="ghost" icon={Clipboard} onClick={handleCopyStockReport}>คัดลอกรายงาน</Button>
          {canSendLine && <Button size="sm" variant="ghost" icon={Share2} onClick={() => setShowReportModal(true)}>ส่งเข้า LINE</Button>}
          {canEdit && (
            <>
              <Button size="sm" variant="ghost" icon={Layers} onClick={() => { setShowCatManager(true); setNewProductMode(false); setIsEditingStock(false); }}>หมวดหมู่</Button>
              <Button size="sm" variant={isEditingStock ? 'primary' : 'ghost'} icon={isEditingStock ? Check : ArrowUpDown} onClick={() => { setIsEditingStock(!isEditingStock); setNewProductMode(false); setShowCatManager(false); }}>
                {isEditingStock ? 'เสร็จสิ้น' : 'จัดเรียง / แก้ไข'}
              </Button>
            </>
          )}
        </div>

        {isEditingStock && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-control bg-brand-50 text-brand-700 text-sm font-semibold">
            <GripVertical size={16} /> ลากที่ไอคอนเพื่อเรียงลำดับ หรือแตะปุ่มดินสอเพื่อแก้ไข
          </div>
        )}

        {isFiltering && (
          <div className="flex items-center justify-between px-1 text-sm text-ink-muted">
            <span>พบ {visibleCount} รายการ</span>
            <button className="font-bold text-brand-600 hover:underline" onClick={() => { setSearchQuery(''); setLevelFilter('all'); setCatFilter('all'); }}>ล้างตัวกรอง</button>
          </div>
        )}

        {/* --- Modal เลือกหมวดหมู่เพื่อส่งไลน์ --- */}
        {showReportModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fade-in">
                <div className="glass-strong w-full max-w-sm rounded-card overflow-hidden flex flex-col max-h-[80vh] animate-scale-in">
                    <div className="p-4 border-b border-brand-100 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-ink flex items-center gap-2"><Share2 size={20} className="text-brand-500"/> เลือกหมวดที่จะส่ง</h3>
                        <button onClick={() => setShowReportModal(false)} className="w-9 h-9 rounded-control flex items-center justify-center text-ink-subtle hover:bg-white/70" aria-label="ปิด"><X size={20}/></button>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1 space-y-2">
                        <div className="flex justify-end gap-2 mb-1">
                            <Button size="sm" variant="ghost" onClick={() => { setSelectedReportCats(categories.map(c=>c.name)); setIncludeNoCat(true); }}>เลือกทั้งหมด</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setSelectedReportCats([]); setIncludeNoCat(false); }}>ล้าง</Button>
                        </div>

                        {categories.map(cat => (
                            <label key={cat.id} className="flex items-center gap-3 px-3 min-h-[48px] rounded-control bg-white/60 hover:bg-white cursor-pointer">
                                <input type="checkbox" className="w-5 h-5 accent-brand-500 rounded" checked={selectedReportCats.includes(cat.name)} onChange={() => toggleReportCat(cat.name)} />
                                {renderColorCircle(cat.color, "w-3 h-3")}
                                <span className="text-sm font-bold text-ink flex-1">{cat.name}</span>
                                <span className="text-xs text-ink-subtle">{products.filter(p => p.category === cat.name).length}</span>
                            </label>
                        ))}

                        {uncategorized.length > 0 && (
                            <label className="flex items-center gap-3 px-3 min-h-[48px] rounded-control bg-white/60 hover:bg-white cursor-pointer">
                                <input type="checkbox" className="w-5 h-5 accent-brand-500 rounded" checked={includeNoCat} onChange={() => setIncludeNoCat(!includeNoCat)} />
                                <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                                <span className="text-sm font-bold text-ink flex-1">อื่นๆ (ไม่มีหมวด)</span>
                                <span className="text-xs text-ink-subtle">{uncategorized.length}</span>
                            </label>
                        )}
                    </div>
                    <div className="p-4 border-t border-brand-100">
                        <Button block onClick={handleConfirmSendReport}>
                            ส่งเข้า LINE ({selectedReportCats.length + (includeNoCat && uncategorized.length > 0 ? 1 : 0)} หมวด)
                        </Button>
                    </div>
                </div>
            </div>
        )}

        {showCatManager && (
          <GlassCard strong className="p-5 animate-scale-in">
             <div className="flex justify-between items-center mb-4 pb-3 border-b border-brand-100">
               <h3 className="font-bold text-ink flex items-center gap-2"><Layers size={18} className="text-brand-500" /> จัดการหมวดหมู่</h3>
               <button onClick={() => { setShowCatManager(false); setEditingCategory(null); setNewCatData({name:'',color:'bg-green-600'}); }} className="w-9 h-9 rounded-control flex items-center justify-center text-ink-subtle hover:bg-white/70" aria-label="ปิด"><X size={20}/></button>
             </div>

             <div className="space-y-1.5 mb-4 max-h-56 overflow-y-auto pr-1">
               {categories.map(cat => (
                 <div key={cat.id} className={`flex items-center justify-between pl-3 pr-1 min-h-[44px] rounded-control cursor-pointer ${editingCategory?.id === cat.id ? 'bg-brand-50 ring-1 ring-brand-200' : 'bg-white/60 hover:bg-white'}`} onClick={() => handleEditCategory(cat)}>
                   <div className="flex items-center gap-3">{renderColorCircle(cat.color, "w-5 h-5")}<span className="text-sm font-semibold text-ink">{cat.name}</span></div>
                   <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id, cat.name); }} className="w-9 h-9 rounded-control flex items-center justify-center text-ink-subtle hover:text-danger-600 hover:bg-danger-50" aria-label={`ลบหมวด ${cat.name}`}><Trash2 size={15} /></button>
                 </div>
               ))}
             </div>

             <div className="flex gap-2 items-center pt-4 border-t border-brand-100 relative">
                <div className="relative">
                   <button onClick={() => setShowColorPicker(!showColorPicker)} className="w-11 h-11 rounded-full border-2 border-white shadow-md flex items-center justify-center overflow-hidden relative" aria-label="เลือกสีหมวด">
                     <div className={`w-full h-full ${!newCatData.color.startsWith('#') ? newCatData.color : ''}`} style={newCatData.color.startsWith('#') ? {backgroundColor: newCatData.color} : {}}></div>
                     <Palette size={16} className="text-white absolute drop-shadow-md z-10"/>
                   </button>
                   {showColorPicker && (
                     <div className="absolute bottom-14 left-0 z-50 glass-strong p-3 rounded-card animate-fade-in w-64">
                       <div className="grid grid-cols-6 gap-2">
                          {AVAILABLE_COLORS.map(c => <button key={c} onClick={() => { setNewCatData({ ...newCatData, color: c }); setShowColorPicker(false); }} className={`w-7 h-7 rounded-full ${c} hover:scale-110 transition-transform shadow-sm border border-white`} aria-label={c}></button>)}
                          <label className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 cursor-pointer hover:scale-110 transition-transform shadow-sm border border-white flex items-center justify-center relative overflow-hidden"><input type="color" className="opacity-0 w-[200%] h-[200%] absolute cursor-pointer" onChange={(e) => { setNewCatData({ ...newCatData, color: e.target.value }); setShowColorPicker(false); }}/><Plus size={14} className="text-white pointer-events-none"/></label>
                       </div>
                     </div>
                   )}
                 </div>
                <input placeholder="ชื่อหมวดใหม่" aria-label="ชื่อหมวด" className={`${inputClass} flex-1`} value={newCatData.name} onChange={e => setNewCatData({...newCatData, name: e.target.value})} />
                <Button onClick={handleSaveCategory}>{editingCategory ? 'บันทึก' : 'เพิ่ม'}</Button>
             </div>
          </GlassCard>
        )}

        {newProductMode && !isEditingStock && (
          <GlassCard strong className="p-5 animate-scale-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-ink text-lg">เพิ่มสินค้าใหม่</h3>
              <button onClick={() => setNewProductMode(false)} className="w-9 h-9 rounded-control flex items-center justify-center text-ink-subtle hover:bg-white/70" aria-label="ปิด"><X size={20}/></button>
            </div>
            <div className="space-y-3">
              <div><label className={labelClass}>ชื่อสินค้า *</label><input className={inputClass} placeholder="เช่น หมูสับ" value={newProdData.name} onChange={e => setNewProdData({...newProdData, name: e.target.value})} /></div>
              <div><label className={labelClass}>หมวดหมู่ *</label><select className={inputClass} value={newProdData.category} onChange={(e) => setNewProdData({...newProdData, category: e.target.value})}><option value="">เลือกหมวด</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelClass}>SKU</label><input className={inputClass} placeholder="เช่น MEAT-01" value={newProdData.sku} onChange={e => setNewProdData({...newProdData, sku: e.target.value})} /></div>
                <div><label className={labelClass}>หน่วย</label><input className={inputClass} placeholder="เช่น กก." value={newProdData.unit} onChange={e => setNewProdData({...newProdData, unit: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelClass}>จำนวนเริ่มต้น</label><input type="number" inputMode="numeric" className={`${inputClass} font-bold`} value={newProdData.stock} onChange={e => setNewProdData({...newProdData, stock: e.target.value})} /></div>
                <div><label className={labelClass}>แจ้งเตือนเมื่อเหลือ ≤</label><input type="number" inputMode="numeric" className={`${inputClass} font-bold`} placeholder="5" value={newProdData.minStock} onChange={e => setNewProdData({...newProdData, minStock: e.target.value})} /></div>
              </div>
              <Button block icon={Save} onClick={handleAddProduct} className="mt-1">บันทึกสินค้า</Button>
            </div>
          </GlassCard>
        )}

        {/* ============ PRODUCT LIST (with DND per category) ============ */}
        <div className="space-y-5">
          {categories.map(cat => {
            const catProducts = products
              .filter(p => (p.category || 'ไม่ระบุ') === cat.name)
              .filter(p => isEditingStock || matchesFilters(p))
              .sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));
            if (isFiltering && !isEditingStock && catProducts.length === 0) return null;
            const isCollapsed = collapsedCats[cat.name] && !isFiltering;
            return (
              <section key={cat.id} className="space-y-2.5">
                <button onClick={() => toggleCollapse(cat.name)} className="w-full flex items-center gap-2 px-1 min-h-[36px] text-left" aria-expanded={!isCollapsed}>
                  {renderColorCircle(cat.color, "w-3 h-3")}
                  <h3 className="font-bold text-ink text-sm">{cat.name}</h3>
                  <Badge tone="neutral">{catProducts.length}</Badge>
                  <ChevronDown size={16} className={`ml-auto text-ink-subtle transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                </button>
                {!isCollapsed && (
                  catProducts.length === 0 ? (
                    <p className="text-sm text-ink-subtle px-1 py-2">ยังไม่มีสินค้าในหมวดนี้</p>
                  ) : isEditingStock ? (
                    /* === EDIT MODE: Drag & Drop === */
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleDragStart}
                      onDragEnd={(event) => handleDragEnd(event, catProducts)}
                    >
                      <SortableContext items={catProducts.map(p => p.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                          {catProducts.map((p) => (
                            <SortableProductItem key={p.id} product={p} cat={cat} openEditModal={openEditModal} />
                          ))}
                        </div>
                      </SortableContext>
                      <DragOverlay dropAnimation={null}>
                        {activeId ? <DragOverlayItem product={getActiveProduct()} cat={getActiveCat()} /> : null}
                      </DragOverlay>
                    </DndContext>
                  ) : (
                    /* === VIEW MODE: มือถือ 1 คอลัมน์, จอใหญ่ 2-3 คอลัมน์ === */
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2.5">
                      {catProducts.map((p) => (
                        <ProductCard key={p.id} product={p} cat={cat} onClick={canEdit ? () => openEditModal(p) : undefined} />
                      ))}
                    </div>
                  )
                )}
              </section>
            );
          })}
        </div>

        {isFiltering && visibleCount === 0 && (
          <GlassCard className="p-8 text-center">
            <Search size={28} className="mx-auto text-brand-300" />
            <p className="mt-2 text-sm font-bold text-ink">ไม่พบสินค้าที่ตรงกับตัวกรอง</p>
          </GlassCard>
        )}

        {uncategorized.length > 0 && (
          <section className="space-y-2.5">
            <div className="flex items-center gap-3 p-3 rounded-card bg-warning-50 border border-warning-100">
               <AlertTriangle size={20} className="text-warning-600 shrink-0" />
               <div><h3 className="font-bold text-warning-700 text-sm">สินค้าไม่มีหมวดหมู่ ({uncategorized.length})</h3><p className="text-xs text-warning-700/80">แตะเพื่อระบุหมวดหมู่</p></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2.5">
               {uncategorized.map((p) => (
                  <ProductCard key={p.id} product={p} cat={null} onClick={() => openEditModal(p)} />
               ))}
            </div>
          </section>
        )}

        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fade-in">
            <div className="glass-strong w-full max-w-sm rounded-card p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-5 pb-3 border-b border-brand-100">
                <h3 className="text-lg font-bold text-ink flex items-center gap-2"><Edit2 size={20} className="text-brand-500"/> แก้ไขสินค้า</h3>
                <button onClick={() => setEditingProduct(null)} className="w-9 h-9 rounded-control flex items-center justify-center text-ink-subtle hover:bg-white/70" aria-label="ปิด"><X size={20}/></button>
              </div>
              <div className="space-y-3">
                <div><label className={labelClass}>ชื่อสินค้า</label><input className={inputClass} value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})}/></div>
                <div>
                  <label className={labelClass}>หมวดหมู่</label>
                  <select className={inputClass} value={editFormData.category} onChange={(e) => setEditFormData({...editFormData, category: e.target.value})}>
                    <option value="">เลือกหมวด</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelClass}>SKU</label><input className={inputClass} value={editFormData.sku} onChange={e => setEditFormData({...editFormData, sku: e.target.value})}/></div>
                  <div><label className={labelClass}>หน่วย</label><input className={inputClass} value={editFormData.unit} onChange={e => setEditFormData({...editFormData, unit: e.target.value})}/></div>
                </div>
                <div className="bg-brand-50/70 p-4 rounded-control">
                  <label className="block text-xs font-bold text-brand-700 text-center">จำนวนคงเหลือ</label>
                  <div className="flex items-center justify-center gap-4 mt-2">
                    <button onClick={() => setEditFormData({...editFormData, stock: Math.max(0, (parseInt(editFormData.stock) || 0) - 1)})} className="w-11 h-11 bg-white rounded-control flex items-center justify-center shadow-sm text-brand-600" aria-label="ลดจำนวน"><Minus size={20}/></button>
                    <input type="number" inputMode="numeric" aria-label="จำนวนคงเหลือ" className="w-24 text-center bg-transparent font-black text-3xl text-ink outline-none tabular-nums" value={editFormData.stock} onChange={e => setEditFormData({...editFormData, stock: e.target.value})}/>
                    <button onClick={() => setEditFormData({...editFormData, stock: (parseInt(editFormData.stock) || 0) + 1})} className="w-11 h-11 bg-white rounded-control flex items-center justify-center shadow-sm text-brand-600" aria-label="เพิ่มจำนวน"><Plus size={20}/></button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 px-1">
                  <label className="text-sm font-bold text-ink-muted flex items-center gap-1.5"><AlertTriangle size={15} className="text-warning-500" /> แจ้งเตือนเมื่อเหลือ ≤</label>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setEditFormData({...editFormData, minStock: Math.max(0, parseInt(editFormData.minStock||5) - 1)})} className="w-9 h-9 bg-white/80 rounded-control flex items-center justify-center text-ink-muted" aria-label="ลดค่าขั้นต่ำ"><Minus size={16}/></button>
                    <input type="number" inputMode="numeric" aria-label="ค่าขั้นต่ำ" className="w-14 h-9 text-center bg-white/80 rounded-control font-bold text-ink outline-none" value={editFormData.minStock || 5} onChange={e => setEditFormData({...editFormData, minStock: e.target.value})}/>
                    <button onClick={() => setEditFormData({...editFormData, minStock: parseInt(editFormData.minStock||5) + 1})} className="w-9 h-9 bg-white/80 rounded-control flex items-center justify-center text-ink-muted" aria-label="เพิ่มค่าขั้นต่ำ"><Plus size={16}/></button>
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <Button variant="danger-ghost" icon={Trash2} className="flex-1" onClick={handleDeleteProduct}>ลบ</Button>
                  <Button icon={Save} className="flex-[2]" onClick={handleSaveEdit}>บันทึก</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
