// app/components/TabStock.js
import React, { useState, useEffect } from 'react';
import { Layers, Edit2, Plus, ChevronRight, ChevronDown, Trash2, Palette, X, Minus, Save, GripVertical, AlertTriangle, Clipboard, Share2, CheckSquare, Square, Lock } from 'lucide-react';
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

// ====================================================
//  SortableItem — แต่ละรายการสินค้าที่ลากได้
// ====================================================
function SortableProductItem({ product, cat, isEditingStock, openEditModal }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const minStock = product.minStock || 5;
  const isLowStock = product.stock > 0 && product.stock <= minStock;
  const isOutOfStock = product.stock === 0;

  const renderColorBar = () => {
    if (isOutOfStock || isLowStock) {
      return <div className="absolute left-0 top-0 bottom-0 w-[5px] bg-red-500"></div>;
    }
    const isHex = cat.color?.startsWith('#');
    return (
      <div
        className={`absolute left-0 top-0 bottom-0 w-[5px] ${!isHex ? cat.color : ''}`}
        style={isHex ? { backgroundColor: cat.color } : {}}
      ></div>
    );
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-3.5 rounded-2xl shadow-sm border flex justify-between items-center relative overflow-hidden transition-all duration-200 ${
        isOutOfStock
          ? 'bg-red-50 border-red-300 ring-1 ring-red-200'
          : isLowStock
          ? 'bg-gradient-to-r from-red-50 to-white border-red-200'
          : isEditingStock
          ? 'bg-white border-yellow-400 ring-2 ring-yellow-100'
          : 'bg-white border-gray-200 hover:border-green-300'
      } ${isDragging ? 'shadow-xl scale-[1.02]' : ''}`}
    >
      {renderColorBar()}
      
      {/* Drag handle — แสดงเฉพาะตอน edit mode */}
      {isEditingStock && (
        <div
          {...attributes}
          {...listeners}
          className="drag-handle mr-1 ml-1 cursor-grab active:cursor-grabbing touch-none p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="จิ้มค้างเพื่อลาก"
        >
          <GripVertical size={18} />
        </div>
      )}

      <div className={`${isEditingStock ? '' : 'pl-3'} flex-1`} onClick={() => isEditingStock && openEditModal(product)}>
        <div className="flex items-center gap-1.5">
          <h3 className={`font-bold text-sm ${isOutOfStock ? 'text-red-700' : 'text-gray-800'}`}>{product.name}</h3>
          {isOutOfStock && <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold animate-pulse">หมด!</span>}
          {isLowStock && !isOutOfStock && <span className="text-[9px] bg-yellow-500 text-white px-1.5 py-0.5 rounded font-bold">ใกล้หมด</span>}
        </div>
        <p className="text-[10px] text-gray-500 bg-gray-50 inline-block px-1.5 rounded mt-1 font-mono">#{product.sku}</p>
      </div>

      <div className="flex items-center gap-3">
        {!isEditingStock && (
          <div className="text-right">
            <p className={`text-lg font-black ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-600' : 'text-green-800'}`}>{product.stock}</p>
            <p className={`text-[10px] font-medium ${isLowStock || isOutOfStock ? 'text-red-400' : 'text-gray-500'}`}>
              {isLowStock || isOutOfStock ? `ขั้นต่ำ: ${minStock}` : product.unit}
            </p>
          </div>
        )}
        {isEditingStock && (
          <div onClick={() => openEditModal(product)} className="bg-yellow-100 p-2 rounded-full text-yellow-700 cursor-pointer active:scale-90">
            <Edit2 size={14} />
          </div>
        )}
      </div>
    </div>
  );
}

// ====================================================
//  DragOverlayItem — ตัวที่ลอยตอนลาก
// ====================================================
function DragOverlayItem({ product, cat }) {
  const isHex = cat?.color?.startsWith('#');
  return (
    <div className="bg-white p-3.5 rounded-2xl shadow-2xl border-2 border-yellow-400 ring-4 ring-yellow-200 flex justify-between items-center relative overflow-hidden scale-[1.04]">
      <div
        className={`absolute left-0 top-0 bottom-0 w-[5px] ${!isHex ? cat?.color : ''}`}
        style={isHex ? { backgroundColor: cat?.color } : {}}
      ></div>
      <div className="drag-handle mr-1 ml-1 p-1.5 text-yellow-600">
        <GripVertical size={18} />
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-gray-800 text-sm">{product?.name}</h3>
        <p className="text-[10px] text-gray-500 bg-gray-50 inline-block px-1.5 rounded mt-1 font-mono">#{product?.sku}</p>
      </div>
      <div className="bg-yellow-100 p-2 rounded-full text-yellow-700">
        <Edit2 size={14} />
      </div>
    </div>
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
  user
}) {
  const canEdit = hasPermission(user, 'STOCK_EDIT');
  const canSendLine = hasPermission(user, 'SEND_LINE_REPORT');
  const [showColorPicker, setShowColorPicker] = useState(false);
  
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

  return (
      <div className="space-y-4 pb-20 animate-fade-in-slide relative">
        <div className="flex justify-between items-center sticky top-0 bg-gray-50/95 py-2 z-10 backdrop-blur-md transition-all">
          <h2 className="text-2xl font-bold text-green-900">คลังสินค้า</h2>
          <div className="flex gap-2">
             {/* --- โซนปุ่มรายงาน --- */}
             <div className="flex bg-white rounded-full shadow-sm border border-gray-200 p-0.5">
                 <button onClick={handleCopyStockReport} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 active:scale-90 transition-all" title="คัดลอกข้อความ">
                    <Clipboard size={18} />
                 </button>
                 {canSendLine && <><div className="w-[1px] bg-gray-200 my-1"></div>
                 <button onClick={() => setShowReportModal(true)} className="p-2 rounded-full text-green-600 hover:bg-green-50 active:scale-90 transition-all" title="เลือกส่งเข้า LINE">
                    <Share2 size={18} />
                 </button></>}
             </div>
             
             {canEdit && <>
             <button onClick={() => { setShowCatManager(true); setNewProductMode(false); setIsEditingStock(false); }} className="p-2.5 rounded-full shadow-sm bg-white text-gray-600 active:scale-95 border border-gray-200"><Layers size={20} /></button>
             <button onClick={() => { setIsEditingStock(!isEditingStock); setNewProductMode(false); setShowCatManager(false); }} className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-sm transition-all border ${isEditingStock ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-white text-gray-600 border-gray-200'}`}><Edit2 size={18} />{isEditingStock && <span className="text-xs font-bold">แก้ไข</span>}</button>
            {!isEditingStock && <button onClick={() => { setNewProductMode(true); setShowCatManager(false); }} className="bg-green-700 text-yellow-100 p-2.5 rounded-full shadow-lg active:scale-95 transition-transform hover:bg-green-800 border border-green-600"><Plus size={20} /></button>}
             </>}
          </div>
        </div>

        {/* ข้อความแนะนำ drag (แสดงเฉพาะ edit mode) */}
        {isEditingStock && (
          <div className="drag-hint">
            <GripVertical size={14} />
            <span>จิ้มค้างที่ไอคอน <strong>⠿</strong> แล้วลากเพื่อเรียงลำดับ</span>
          </div>
        )}
        
        {/* --- Modal เลือกหมวดหมู่เพื่อส่งไลน์ --- */}
        {showReportModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
                <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-scale-in">
                    <div className="p-4 bg-green-50 border-b border-green-100 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-green-800 flex items-center gap-2"><Share2 size={20}/> เลือกหมวดหมู่ที่จะส่ง</h3>
                        <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1 space-y-2">
                        <div className="flex justify-end gap-2 mb-2">
                            <button onClick={() => { setSelectedReportCats(categories.map(c=>c.name)); setIncludeNoCat(true); }} className="text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded hover:bg-green-100">เลือกทั้งหมด</button>
                            <button onClick={() => { setSelectedReportCats([]); setIncludeNoCat(false); }} className="text-xs text-gray-500 font-bold bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">ล้าง</button>
                        </div>

                        {categories.map(cat => (
                            <label key={cat.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer active:scale-[0.98] transition-all">
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 accent-green-600 rounded" 
                                    checked={selectedReportCats.includes(cat.name)}
                                    onChange={() => toggleReportCat(cat.name)}
                                />
                                {renderColorCircle(cat.color, "w-4 h-4")}
                                <span className="text-sm font-bold text-gray-700 flex-1">{cat.name}</span>
                                <span className="text-xs text-gray-400">({products.filter(p => p.category === cat.name).length})</span>
                            </label>
                        ))}

                        {products.some(p => !p.category) && (
                            <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 cursor-pointer active:scale-[0.98] transition-all">
                                <input 
                                    type="checkbox" 
                                    className="w-5 h-5 accent-gray-500 rounded" 
                                    checked={includeNoCat}
                                    onChange={() => setIncludeNoCat(!includeNoCat)}
                                />
                                <div className="w-4 h-4 rounded-full bg-gray-300"></div>
                                <span className="text-sm font-bold text-gray-700 flex-1">อื่นๆ (ไม่มีหมวด)</span>
                                <span className="text-xs text-gray-400">({products.filter(p => !p.category).length})</span>
                            </label>
                        )}
                    </div>
                    <div className="p-4 border-t bg-gray-50">
                        <button onClick={handleConfirmSendReport} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex justify-center gap-2">
                            ยืนยันส่งเข้า LINE ({selectedReportCats.length + (includeNoCat && products.some(p=>!p.category) ? 1 : 0)})
                        </button>
                    </div>
                </div>
            </div>
        )}

        {showCatManager && (
          <div className="bg-white p-5 rounded-2xl shadow-xl border border-gray-200 mb-4 animate-scale-in">
             <div className="flex justify-between items-center mb-4 pb-2 border-b">
               <h3 className="font-bold text-green-800 flex items-center gap-2"><Layers size={18} /> จัดการหมวดหมู่</h3>
               <button onClick={() => { setShowCatManager(false); setEditingCategory(null); setNewCatData({name:'',color:'bg-green-600'}); }}><X size={20} className="text-gray-400"/></button>
             </div>
             
             <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
               {categories.map(cat => (
                 <div key={cat.id} className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer ${editingCategory?.id === cat.id ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-100'}`} onClick={() => handleEditCategory(cat)}>
                   <div className="flex items-center gap-3">{renderColorCircle(cat.color, "w-6 h-6")}<span className="text-sm font-semibold text-gray-700">{cat.name}</span></div>
                   <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id, cat.name); }} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                 </div>
               ))}
             </div>

             <div className="flex gap-2 items-center border-t pt-4 relative">
                <div className="relative">
                   <button onClick={() => setShowColorPicker(!showColorPicker)} className="w-10 h-10 rounded-full cursor-pointer border-2 border-white shadow-md flex items-center justify-center transition-transform active:scale-90 overflow-hidden relative">
                     <div className={`w-full h-full ${!newCatData.color.startsWith('#') ? newCatData.color : ''}`} style={newCatData.color.startsWith('#') ? {backgroundColor: newCatData.color} : {}}></div>
                     <Palette size={16} className="text-white absolute drop-shadow-md z-10"/>
                   </button>
                   {showColorPicker && (
                     <div className="absolute bottom-12 left-0 z-50 bg-white shadow-xl p-3 rounded-2xl border animate-fade-in w-64">
                       <div className="grid grid-cols-6 gap-2">
                          {AVAILABLE_COLORS.map(c => <div key={c} onClick={() => { setNewCatData({ ...newCatData, color: c }); setShowColorPicker(false); }} className={`w-6 h-6 rounded-full ${c} cursor-pointer hover:scale-125 transition-transform shadow-sm border border-gray-100`}></div>)}
                          <label className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500 cursor-pointer hover:scale-125 transition-transform shadow-sm border border-gray-100 flex items-center justify-center relative overflow-hidden"><input type="color" className="opacity-0 w-[200%] h-[200%] absolute cursor-pointer" onChange={(e) => { setNewCatData({ ...newCatData, color: e.target.value }); setShowColorPicker(false); }}/><Plus size={14} className="text-white pointer-events-none"/></label>
                       </div>
                       <div className="absolute -bottom-2 left-3 w-4 h-4 bg-white transform rotate-45 border-b border-r border-gray-200"></div>
                     </div>
                   )}
                 </div>
                <input placeholder="ชื่อหมวดใหม่..." className="flex-1 border p-2.5 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-200 outline-none" value={newCatData.name} onChange={e => setNewCatData({...newCatData, name: e.target.value})} />
                <button onClick={handleSaveCategory} className="bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg w-20">{editingCategory ? 'แก้ไข' : 'เพิ่ม'}</button>
             </div>
          </div>
        )}

        {newProductMode && !isEditingStock && (
          <div className="bg-white p-5 rounded-2xl shadow-xl border border-green-100 mb-4 animate-scale-in">
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-green-800 text-lg">เพิ่มสินค้าใหม่</h3><button onClick={() => setNewProductMode(false)}><X size={24} className="text-gray-400"/></button></div>
            <div className="space-y-4">
              <input className="w-full border p-3 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-200 outline-none" placeholder="ชื่อสินค้า" value={newProdData.name} onChange={e => setNewProdData({...newProdData, name: e.target.value})} />
              <div className="flex gap-2"><select className="w-full border p-3 rounded-xl bg-gray-50" value={newProdData.category} onChange={(e) => setNewProdData({...newProdData, category: e.target.value})}><option value="">-- เลือกหมวด --</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
              <div className="flex gap-3"><input className="w-full border p-3 rounded-xl bg-gray-50" placeholder="SKU" value={newProdData.sku} onChange={e => setNewProdData({...newProdData, sku: e.target.value})} /><input className="w-full border p-3 rounded-xl bg-gray-50" placeholder="หน่วย" value={newProdData.unit} onChange={e => setNewProdData({...newProdData, unit: e.target.value})} /></div>
               <input type="number" className="w-full border p-3 rounded-xl bg-gray-50 font-bold text-lg text-green-900" placeholder="จำนวนเริ่มต้น" value={newProdData.stock} onChange={e => setNewProdData({...newProdData, stock: e.target.value})} />
               
               {/* ตั้งค่าขั้นต่ำแจ้งเตือน */}
               <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                 <label className="text-xs font-bold text-red-700 flex items-center gap-1.5 mb-2">
                   <AlertTriangle size={14} /> ขั้นต่ำแจ้งเตือน (สินค้าใกล้หมด)
                 </label>
                 <div className="flex items-center gap-2">
                   <input type="number" className="w-full border border-red-200 bg-white p-2.5 rounded-lg text-sm font-bold text-red-800 focus:ring-2 focus:ring-red-200 outline-none" placeholder="5" value={newProdData.minStock} onChange={e => setNewProdData({...newProdData, minStock: e.target.value})} />
                   <span className="text-xs text-red-400 whitespace-nowrap font-medium">{newProdData.unit || 'หน่วย'}</span>
                 </div>
                 <p className="text-[10px] text-red-400 mt-1">เมื่อสต็อกเหลือต่ำกว่านี้ จะแสดงการ์ดสีแดงแจ้งเตือน</p>
               </div>

               <button onClick={handleAddProduct} className="w-full bg-green-700 text-white py-3.5 rounded-xl font-bold mt-2 shadow-lg">บันทึกสินค้า</button>
            </div>
          </div>
        )}

        {/* ============ PRODUCT LIST (with DND per category) ============ */}
        <div className="space-y-4">
          {categories.map(cat => {
            const catProducts = products.filter(p => (p.category || 'ไม่ระบุ') === cat.name).sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));
            const isCollapsed = collapsedCats[cat.name];
            return (
              <div key={cat.id} className="space-y-2">
                <div onClick={() => toggleCollapse(cat.name)} className="flex items-center gap-2 cursor-pointer select-none py-2 px-1 active:scale-[0.99] transition-transform group">
                  <div className={`p-1 rounded-full bg-white border border-gray-200 shadow-sm`}>{isCollapsed ? <ChevronRight size={18} className="text-gray-500"/> : <ChevronDown size={18} className="text-gray-600"/>}</div>
                  {renderColorCircle(cat.color, "w-3 h-3")}
                  <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2">{cat.name} <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold">{catProducts.length}</span></h3>
                </div>
                {!isCollapsed && (
                  <div className="space-y-3 pl-2 border-l-2 border-dashed border-gray-300 ml-3.5 animate-fade-in-slide">
                    {catProducts.length === 0 ? (
                      <div className="text-xs text-gray-400 italic pl-3 py-2">ว่างเปล่า...</div>
                    ) : isEditingStock ? (
                      /* === EDIT MODE: Drag & Drop === */
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={(event) => handleDragEnd(event, catProducts)}
                      >
                        <SortableContext items={catProducts.map(p => p.id)} strategy={verticalListSortingStrategy}>
                          {catProducts.map((p) => (
                            <SortableProductItem
                              key={p.id}
                              product={p}
                              cat={cat}
                              isEditingStock={isEditingStock}
                              openEditModal={openEditModal}
                            />
                          ))}
                        </SortableContext>
                        <DragOverlay dropAnimation={null}>
                          {activeId ? (
                            <DragOverlayItem
                              product={getActiveProduct()}
                              cat={getActiveCat()}
                            />
                          ) : null}
                        </DragOverlay>
                      </DndContext>
                    ) : (
                      /* === VIEW MODE: ปกติ (ไม่มี drag) - มือถือ 1 คอลัมน์, จอใหญ่ 2-3 คอลัมน์ === */
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {catProducts.map((p) => {
                          const pMinStock = p.minStock || 5;
                          const pIsLowStock = p.stock > 0 && p.stock <= pMinStock;
                          const pIsOutOfStock = p.stock === 0;
                          return (
                          <div key={p.id} className={`p-3.5 rounded-2xl shadow-xs border flex justify-between items-center relative overflow-hidden transition-all duration-300 ${
                            pIsOutOfStock
                              ? 'bg-red-50 border-red-300 ring-1 ring-red-200'
                              : pIsLowStock
                              ? 'bg-gradient-to-r from-red-50 to-white border-red-200'
                              : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-xs'
                          }`}>
                            <div className={`absolute left-0 top-0 bottom-0 w-[5px] ${
                              pIsOutOfStock || pIsLowStock
                                ? 'bg-red-500'
                                : !cat.color.startsWith('#') ? cat.color : ''
                            }`} style={(!pIsOutOfStock && !pIsLowStock && cat.color.startsWith('#')) ? {backgroundColor: cat.color} : {}}></div>
                            <div className="pl-3 flex-1 min-w-0">
                               <div className="flex items-center gap-1.5 flex-wrap">
                                 <h3 className={`font-bold text-sm truncate ${pIsOutOfStock ? 'text-red-700' : 'text-gray-800'}`}>{p.name}</h3>
                                 {pIsOutOfStock && <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold animate-pulse">หมด!</span>}
                                 {pIsLowStock && !pIsOutOfStock && <span className="text-[9px] bg-yellow-500 text-white px-1.5 py-0.5 rounded font-bold">ใกล้หมด</span>}
                               </div>
                               <p className="text-[10px] text-gray-500 bg-gray-50 inline-block px-1.5 rounded mt-1 font-mono">#{p.sku}</p>
                            </div>
                            <div className="text-right pl-2 shrink-0">
                                <p className={`text-lg font-black ${pIsOutOfStock ? 'text-red-600' : pIsLowStock ? 'text-orange-600' : 'text-gray-800'}`}>{p.stock}</p>
                                <p className={`text-[10px] font-medium ${pIsLowStock || pIsOutOfStock ? 'text-red-400' : 'text-gray-500'}`}>
                                  {pIsLowStock || pIsOutOfStock ? `ขั้นต่ำ: ${pMinStock}` : p.unit}
                                </p>
                            </div>
                          </div>
                        );})}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {products.filter(p => !p.category).length > 0 && (
          <div className="mt-8 border-t-4 border-red-100 pt-4 animate-bounce-in">
            <div className="flex items-center gap-2 mb-3 bg-red-50 p-3 rounded-xl border border-red-200">
               <div className="p-2 rounded-full bg-white text-red-600 shadow-sm"><AlertTriangle size={20} /></div>
               <div><h3 className="font-bold text-red-800 text-sm">สินค้าตกหล่น (ไม่มีหมวดหมู่)</h3><p className="text-[10px] text-red-600">พบ {products.filter(p => !p.category).length} รายการ - โปรดกดแก้ไขเพื่อระบุหมวดหมู่</p></div>
            </div>
            <div className="space-y-3">
               {products.filter(p => !p.category).map((p) => (
                  <div key={p.id} className="bg-white p-3.5 rounded-2xl shadow-sm border-2 border-red-100 flex justify-between items-center relative overflow-hidden" onClick={() => openEditModal(p)}>
                     <div className="pl-2 flex-1"><h3 className="font-bold text-gray-800 text-sm">{p.name}</h3><p className="text-[10px] text-gray-400 bg-gray-100 inline-block px-1.5 rounded mt-1">STOCK: {p.stock}</p></div>
                     <button onClick={() => openEditModal(p)} className="bg-red-100 p-2 rounded-full text-red-600 cursor-pointer active:scale-90 hover:bg-red-200"><Edit2 size={16} /> แก้ไข</button>
                  </div>
               ))}
            </div>
          </div>
        )}

        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 transform transition-all animate-scale-in border-4 border-yellow-100">
              <div className="flex justify-between items-center mb-6 border-b pb-3"><h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Edit2 size={24} className="text-yellow-500"/> แก้ไขสินค้า</h3><button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div>
              <div className="space-y-4">
                <input className="w-full border border-gray-200 bg-gray-50 rounded-xl p-3 focus:ring-2 focus:ring-yellow-200 outline-none" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})}/>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 ml-1">หมวดหมู่</label>
                  <select className="w-full border border-gray-200 bg-gray-50 rounded-xl p-3 focus:bg-white outline-none" value={editFormData.category} onChange={(e) => setEditFormData({...editFormData, category: e.target.value})}>
                    <option value="">-- เลือกหมวด --</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-3"><input className="w-full border border-gray-200 bg-gray-50 rounded-xl p-3" value={editFormData.sku} onChange={e => setEditFormData({...editFormData, sku: e.target.value})}/><input className="w-full border border-gray-200 bg-gray-50 rounded-xl p-3" value={editFormData.unit} onChange={e => setEditFormData({...editFormData, unit: e.target.value})}/></div>
                <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100">
                  <label className="text-xs font-bold text-yellow-800 uppercase tracking-wider">Stock</label>
                  <div className="flex items-center justify-center gap-4 mt-2">
                    <button onClick={() => setEditFormData({...editFormData, stock: Math.max(0, parseInt(editFormData.stock) - 1)})} className="w-10 h-10 bg-white border border-yellow-200 rounded-xl flex items-center justify-center shadow-sm text-yellow-600"><Minus size={20}/></button>
                    <input type="number" className="w-24 text-center bg-transparent font-black text-3xl text-gray-800 outline-none" value={editFormData.stock} onChange={e => setEditFormData({...editFormData, stock: e.target.value})}/>
                    <button onClick={() => setEditFormData({...editFormData, stock: parseInt(editFormData.stock) + 1})} className="w-10 h-10 bg-white border border-yellow-200 rounded-xl flex items-center justify-center shadow-sm text-yellow-600"><Plus size={20}/></button>
                  </div>
                </div>
                
                {/* ตั้งค่าขั้นต่ำแจ้งเตือน */}
                <div className="bg-red-50 p-3 rounded-2xl border border-red-100">
                  <label className="text-xs font-bold text-red-700 flex items-center gap-1.5 mb-2">
                    <AlertTriangle size={14} /> ขั้นต่ำแจ้งเตือน
                  </label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setEditFormData({...editFormData, minStock: Math.max(0, parseInt(editFormData.minStock||5) - 1)})} className="w-8 h-8 bg-white border border-red-200 rounded-lg flex items-center justify-center shadow-sm text-red-600"><Minus size={16}/></button>
                    <input type="number" className="w-16 text-center bg-white border border-red-200 rounded-lg p-1.5 font-bold text-lg text-red-800 outline-none" value={editFormData.minStock || 5} onChange={e => setEditFormData({...editFormData, minStock: e.target.value})}/>
                    <button onClick={() => setEditFormData({...editFormData, minStock: parseInt(editFormData.minStock||5) + 1})} className="w-8 h-8 bg-white border border-red-200 rounded-lg flex items-center justify-center shadow-sm text-red-600"><Plus size={16}/></button>
                    <span className="text-xs text-red-400 font-medium">{editFormData.unit || 'หน่วย'}</span>
                  </div>
                  <p className="text-[10px] text-red-400 mt-1.5">เมื่อสต็อกเหลือ เท่ากับหรือต่ำกว่าค่านี้ จะแสดงการ์ดสีแดงเตือน</p>
                </div>

                <div className="flex gap-3 pt-4"><button onClick={handleDeleteProduct} className="flex-1 bg-red-50 text-red-600 py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-red-100"><Trash2 size={20} /> ลบ</button><button onClick={handleSaveEdit} className="flex-[2] bg-green-700 text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-green-800 flex justify-center items-center gap-2"><Save size={20} /> บันทึก</button></div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}