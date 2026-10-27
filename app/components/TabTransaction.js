// app/components/TabTransaction.js
'use client';
import React, { useState } from 'react';
import { Package, ShoppingCart, Minus, Plus, Trash2, Send, Search, X, ArrowDownToLine, ArrowUpFromLine, ChevronUp } from 'lucide-react';
import { Button } from './ui';

const colorDot = (color) => {
  const isHex = color?.startsWith('#');
  return (
    <span
      className={`w-2.5 h-2.5 rounded-full inline-block shrink-0 ${!isHex ? color || 'bg-gray-300' : ''}`}
      style={isHex ? { backgroundColor: color } : {}}
    />
  );
};

export default function TabTransaction({
  products = [],
  categories = [],
  transMode,
  setTransMode,
  selectedCategory,
  setSelectedCategory,
  cart = [],
  setCart,
  note,
  setNote,
  handleAddToCart,
  handleAdjustQty,
  handleRemoveItem,
  handleCartQtyChange,
  handleRequestTransaction,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCartSheet, setShowCartSheet] = useState(false);
  const [pendingMode, setPendingMode] = useState(null);

  const isModeIn = transMode === 'IN';
  const totalQty = cart.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const cartQtyById = Object.fromEntries(cart.map(item => [item.id, item.qty]));

  // Switching IN/OUT empties the cart, so ask first instead of silently losing it
  const requestModeChange = (mode) => {
    if (mode === transMode) return;
    if (cart.length > 0) { setPendingMode(mode); return; }
    setTransMode(mode);
  };
  const confirmModeChange = () => {
    setTransMode(pendingMode); setCart([]); setPendingMode(null);
  };

  const query = searchTerm.trim().toLowerCase();
  const filteredProducts = products.filter(p => {
    const matchCat = selectedCategory === 'ทั้งหมด' ? true : p.category === selectedCategory;
    const matchSearch = !query || p.name?.toLowerCase().includes(query) || p.sku?.toLowerCase().includes(query);
    return matchCat && matchSearch;
  });

  const chipClass = (active) => `h-9 px-3.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${active ? 'bg-brand-500 text-white' : 'bg-white/70 text-ink-muted hover:bg-white'}`;

  const submit = () => { setShowCartSheet(false); handleRequestTransaction(); };

  const cartPanel = (
    <>
      <div className="flex justify-between items-center mb-3">
        <span className="font-black text-ink flex gap-2 items-center">
          <ShoppingCart size={19} className="text-brand-500"/>
          รายการ{isModeIn ? 'รับเข้า' : 'เบิกออก'} ({cart.length})
        </span>
        {cart.length > 0 && (
          <Button size="sm" variant="danger-ghost" onClick={() => setCart([])}>ล้างทั้งหมด</Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1 max-h-[45vh] lg:max-h-80">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center rounded-control border-2 border-dashed border-brand-100">
            <Package size={26} className="text-brand-300 mb-1.5"/>
            <p className="text-sm font-bold text-ink-muted">ยังไม่ได้เลือกสินค้า</p>
            <p className="text-xs text-ink-subtle mt-0.5">แตะสินค้าทางซ้ายเพื่อเพิ่ม</p>
          </div>
        ) : (
          cart.map(item => (
            <div key={item.id} className="flex items-center gap-2 bg-white/70 p-2 pl-3 rounded-control">
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-bold text-ink">{item.name}</div>
                <div className="text-xs text-ink-subtle truncate">คงเหลือ {item.stock} {item.unit}</div>
              </div>
              <div className="flex items-center bg-white rounded-control shadow-sm">
                <button onClick={() => handleAdjustQty(item.id, -1)} className="w-10 h-10 rounded-control flex items-center justify-center text-ink-muted hover:bg-brand-50" aria-label={`ลด ${item.name}`}>
                  <Minus size={16}/>
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  aria-label={`จำนวน ${item.name}`}
                  className="w-10 text-center text-base font-black text-brand-600 outline-none bg-transparent tabular-nums"
                  value={item.qty}
                  onChange={(e) => handleCartQtyChange(item.id, e.target.value)}
                />
                <button onClick={() => handleAddToCart(item)} className="w-10 h-10 rounded-control flex items-center justify-center text-brand-600 hover:bg-brand-50" aria-label={`เพิ่ม ${item.name}`}>
                  <Plus size={16}/>
                </button>
              </div>
              <button onClick={() => handleRemoveItem(item.id)} className="w-9 h-9 rounded-control flex items-center justify-center text-ink-subtle hover:text-danger-600 hover:bg-danger-50" aria-label={`ลบ ${item.name}`}>
                <Trash2 size={16}/>
              </button>
            </div>
          ))
        )}
      </div>

      <label className="block text-xs font-bold text-ink-muted mb-1" htmlFor="tx-note">หมายเหตุ</label>
      <input
        id="tx-note"
        type="text"
        placeholder="เช่น ใช้สำหรับงานเลี้ยงวันศุกร์"
        className="w-full h-11 bg-white/70 border border-white rounded-control px-3 text-sm mb-3 focus:bg-white focus:ring-2 focus:ring-brand-200 outline-none text-ink"
        value={note}
        onChange={e => setNote(e.target.value)}
      />

      <Button block size="lg" icon={Send} variant={isModeIn ? 'primary' : 'danger'} disabled={cart.length === 0} onClick={submit}>
        ส่งคำขอ{isModeIn ? 'รับเข้า' : 'เบิกออก'}
      </Button>
      <p className="text-xs text-ink-subtle text-center mt-2">สต็อกจะเปลี่ยนเมื่อมีผู้ตรวจสอบและยืนยันแล้ว</p>
    </>
  );

  return (
    <div className="pb-6 animate-fade-in-slide flex flex-col lg:flex-row lg:gap-6 relative w-full min-w-0">
      {/* ===== LEFT: choose products ===== */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="sticky top-0 z-20 pb-2 pt-1 space-y-2.5 bg-[#f4f5fa]/95 backdrop-blur-md rounded-b-card">
          {/* IN / OUT segmented control */}
          <div className="glass grid grid-cols-2 p-1 rounded-2xl" role="tablist" aria-label="ประเภทรายการ">
            <button
              role="tab" aria-selected={isModeIn}
              onClick={() => requestModeChange('IN')}
              className={`h-12 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 ${isModeIn ? 'bg-success-700 text-white shadow-sm' : 'text-ink-muted hover:text-ink'}`}
            >
              <ArrowDownToLine size={18}/> รับเข้า
            </button>
            <button
              role="tab" aria-selected={!isModeIn}
              onClick={() => requestModeChange('OUT')}
              className={`h-12 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 ${!isModeIn ? 'bg-danger-600 text-white shadow-sm' : 'text-ink-muted hover:text-ink'}`}
            >
              <ArrowUpFromLine size={18}/> เบิกออก
            </button>
          </div>

          <label className="relative block">
            <span className="sr-only">ค้นหาสินค้า</span>
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none" />
            <input
              type="search"
              placeholder="ค้นหาชื่อสินค้าหรือ SKU"
              className="glass w-full h-11 pl-9 pr-10 rounded-control text-sm text-ink focus:ring-2 focus:ring-brand-200 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-ink-subtle hover:bg-white" aria-label="ล้างคำค้น">
                <X size={15} />
              </button>
            )}
          </label>

          <div className="flex overflow-x-auto gap-2 scrollbar-hide">
            <button onClick={() => setSelectedCategory('ทั้งหมด')} className={chipClass(selectedCategory === 'ทั้งหมด')}>ทั้งหมด</button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.name)} className={chipClass(selectedCategory === cat.name)}>
                {colorDot(cat.color)} {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2">
          {filteredProducts.length === 0 ? (
            <div className="glass rounded-card flex flex-col items-center justify-center py-12 text-center">
              <Search size={26} className="text-brand-300" />
              <p className="mt-2 text-sm font-bold text-ink-muted">ไม่พบสินค้า</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5">
              {filteredProducts.map(p => {
                const catObj = categories.find(c => c.name === p.category) || {};
                const inCart = cartQtyById[p.id];
                const isOut = (Number(p.stock) || 0) <= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleAddToCart(p)}
                    className={`glass text-left p-3 rounded-card min-h-[96px] flex flex-col justify-between relative transition-colors select-none hover:bg-white/80 active:bg-white ${inCart ? 'ring-2 ring-brand-400' : ''}`}
                    aria-label={`เพิ่ม ${p.name}`}
                  >
                    {inCart && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[26px] h-[26px] px-1.5 rounded-full bg-brand-500 text-white text-xs font-black flex items-center justify-center ring-2 ring-white">
                        {inCart}
                      </span>
                    )}
                    <p className="text-sm font-bold text-ink line-clamp-2 leading-snug pr-2">{p.name}</p>
                    <div className="flex items-end justify-between gap-2 mt-2">
                      <span className="flex items-center gap-1.5 text-xs text-ink-subtle min-w-0">
                        {colorDot(catObj.color)} <span className="truncate">{p.category || 'ทั่วไป'}</span>
                      </span>
                      <span className={`text-sm font-black tabular-nums shrink-0 ${isOut ? 'text-danger-600' : 'text-ink-muted'}`}>
                        {p.stock}<span className="text-xs font-semibold"> {p.unit}</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ===== RIGHT (desktop): cart panel ===== */}
      <aside className="hidden lg:flex glass-strong lg:w-80 xl:w-96 rounded-card p-5 flex-col sticky top-4 self-start">
        {cartPanel}
      </aside>

      {/* ===== Mobile: sticky summary bar opens the cart sheet ===== */}
      {cart.length > 0 && (
        <div className="lg:hidden sticky bottom-[88px] z-30 mt-3">
          <button
            onClick={() => setShowCartSheet(true)}
            className={`w-full h-14 rounded-card px-4 flex items-center justify-between text-white shadow-glass-lg ${isModeIn ? 'bg-success-700' : 'bg-danger-600'}`}
          >
            <span className="flex items-center gap-2 font-bold"><ShoppingCart size={19}/> {cart.length} รายการ · {totalQty} ชิ้น</span>
            <span className="flex items-center gap-1 font-bold text-sm">ตรวจและส่ง <ChevronUp size={18}/></span>
          </button>
        </div>
      )}

      {showCartSheet && (
        <div className="lg:hidden fixed inset-0 z-[60] flex items-end bg-ink/40 backdrop-blur-sm animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) setShowCartSheet(false); }}>
          <div className="glass-strong w-full max-w-md mx-auto rounded-t-[28px] p-5 pb-8 flex flex-col animate-slide-up">
            <div className="w-10 h-1.5 rounded-full bg-brand-200 mx-auto mb-4" />
            {cartPanel}
          </div>
        </div>
      )}

      {/* Confirm before a mode switch empties the cart */}
      {pendingMode && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-fade-in">
          <div className="glass-strong w-full max-w-sm rounded-card p-5">
            <h3 className="font-bold text-ink text-lg">เปลี่ยนเป็น{pendingMode === 'IN' ? 'รับเข้า' : 'เบิกออก'}?</h3>
            <p className="text-sm text-ink-muted mt-1">สินค้า {cart.length} รายการที่เลือกไว้จะถูกล้าง</p>
            <div className="flex gap-2 mt-5">
              <Button variant="secondary" className="flex-1" onClick={() => setPendingMode(null)}>ยกเลิก</Button>
              <Button className="flex-1" onClick={confirmModeChange}>เปลี่ยนและล้าง</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
