// app/components/TabTransaction.js
'use client';
import React, { useState } from 'react';
import { Package, ShoppingCart, Utensils, Minus, Plus, Trash2, Save, Search, X } from 'lucide-react';

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
  copyToClipboard, 
  generateSummaryText
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const isModeIn = transMode === 'IN';
  
  // Logic กรองสินค้า
  const filteredProducts = products.filter(p => {
    const matchCat = selectedCategory === 'ทั้งหมด' ? true : p.category === selectedCategory;
    const matchSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div className="pb-24 lg:pb-6 animate-fade-in-slide min-h-full flex flex-col lg:flex-row lg:gap-6 relative w-full min-w-0">
      {/* ========================================================
          LEFT COLUMN: Product Selection (Catalog & Filters)
         ======================================================== */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Sticky Header: Mode & Search & Categories */}
        <div className="sticky top-0 z-30 bg-white/95 lg:bg-transparent backdrop-blur-md pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 pt-1">
          {/* ปุ่มเลือกโหมด IN / OUT */}
          <div className={`flex justify-between items-center p-1.5 rounded-2xl mb-3 border shadow-xs ${isModeIn ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <button 
              onClick={() => { setTransMode('IN'); setCart([]); }} 
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${isModeIn ? 'bg-[#6355d8] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
            >
              รับเข้า (IN)
            </button>
            <button 
              onClick={() => { setTransMode('OUT'); setCart([]); }} 
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${!isModeIn ? 'bg-red-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
            >
              เบิกออก (OUT)
            </button>
          </div>

          {/* ช่องค้นหาสินค้า */}
          <div className="relative mb-3">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              <Search size={18} />
            </div>
            <input 
              type="text" 
              placeholder="ค้นหาสินค้า / SKU..." 
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 bg-white shadow-xs text-sm focus:ring-2 focus:ring-[#6355d8]/20 focus:border-[#6355d8] outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 bg-gray-100 rounded-full p-0.5 hover:bg-gray-200 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* แถบหมวดหมู่ */}
          <div className="flex overflow-x-auto pb-1 gap-2 no-scrollbar">
            <button 
              onClick={() => setSelectedCategory('ทั้งหมด')} 
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shadow-xs ${selectedCategory === 'ทั้งหมด' ? 'bg-[#6355d8] text-white border-[#6355d8]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              ทั้งหมด
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => setSelectedCategory(cat.name)} 
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shadow-xs flex items-center gap-1.5 ${selectedCategory === cat.name ? 'bg-[#6355d8] text-white border-[#6355d8]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
              >
                <span className={`w-2 h-2 rounded-full inline-block ${cat.color || 'bg-gray-400'}`}></span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Grid แสดงสินค้า: 
            - มือถือ: เลื่อนแนวนอน 2 แถวแบบ carousel snap
            - จอ Desktop (lg ขึ้นไป): เรียง grid หลายคอลัมน์ wrap สวยงาม ไม่ล้นจอ
        */}
        <div className="mt-2 mb-4">
          {filteredProducts.length === 0 ? (
            <div className="w-full flex items-center justify-center py-12 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-2xl min-h-[140px]">
              ไม่พบสินค้าในหมวดหมู่นี้
            </div>
          ) : (
            <div className="grid grid-rows-2 grid-flow-col auto-cols-[135px] overflow-x-auto no-scrollbar snap-x snap-mandatory gap-3 pb-3 lg:grid-rows-none lg:grid-flow-row lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 lg:auto-cols-auto lg:overflow-y-auto lg:max-h-[580px] lg:pr-1.5">
              {filteredProducts.map(p => {
                const catObj = categories.find(c => c.name === p.category) || {};
                const catColorText = catObj.color ? catObj.color.replace('bg-', 'text-') : 'text-gray-400';
                return (
                  <div 
                    key={p.id} 
                    onClick={() => handleAddToCart(p)} 
                    className="bg-white p-3 rounded-2xl border border-gray-200/90 shadow-xs hover:shadow-md hover:border-[#6355d8]/40 active:scale-95 transition-all cursor-pointer flex flex-col justify-between h-28 relative overflow-hidden group snap-center select-none"
                  >
                    <div className={`absolute top-0 right-0 w-10 h-10 opacity-10 rounded-bl-3xl ${catObj.color || 'bg-gray-300'}`}></div>
                    <div>
                      <div className="flex justify-between items-start mb-1.5">
                        <div className="bg-gray-50 p-1.5 rounded-lg">
                          <Package size={16} className="text-gray-400 group-hover:text-[#6355d8] transition-colors"/>
                        </div>
                        <span className={`text-xs font-black px-1.5 py-0.5 rounded-md ${p.stock === 0 ? 'text-red-500 bg-red-50' : 'text-gray-700 bg-gray-50'}`}>
                          {p.stock}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-tight h-8">
                        {p.name}
                      </p>
                    </div>
                    <p className={`text-[9px] mt-1 truncate font-bold uppercase tracking-wide opacity-80 ${catColorText}`}>
                      {p.category || 'ทั่วไป'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================
          RIGHT COLUMN: Shopping Cart (Sticky on Desktop, Bottom on Mobile)
         ======================================================== */}
      <div className="w-full lg:w-80 xl:w-96 lg:rounded-3xl lg:border lg:border-gray-200/80 lg:shadow-sm lg:sticky lg:top-4 lg:self-start bg-white rounded-t-3xl shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] border-t border-gray-200 p-5 flex flex-col z-20">
        <div className="flex justify-between items-center mb-3">
          <span className="font-extrabold text-gray-800 flex gap-2 items-center text-base">
            <ShoppingCart size={20} className="text-[#6355d8]"/> 
            ตะกร้า ({cart.length})
          </span>
          {cart.length > 0 && (
            <button 
              onClick={() => setCart([])} 
              className="text-xs text-red-500 font-bold bg-red-50 px-2.5 py-1 rounded-lg hover:bg-red-100 transition-colors"
            >
              ล้างทั้งหมด
            </button>
          )}
        </div>

        {/* รายการในตะกร้า */}
        <div className="flex-1 overflow-y-auto space-y-2.5 mb-4 pr-1 max-h-56 lg:max-h-72">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-300 border-2 border-dashed border-gray-100 rounded-2xl">
              <Utensils size={28} className="opacity-30 mb-1.5"/>
              <p className="text-xs font-medium text-gray-400">ยังไม่มีสินค้าในตะกร้า</p>
              <p className="text-[10px] text-gray-400 mt-0.5">คลิกเลือกรายการสินค้าเพื่อเพิ่มลงตะกร้า</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-gray-50/80 p-2.5 rounded-2xl border border-gray-100 group">
                <div className="flex-1 overflow-hidden mr-2">
                  <div className="truncate text-xs font-bold text-gray-800">{item.name}</div>
                  <div className="text-[10px] text-gray-400 font-medium">{item.category}</div>
                </div>
                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl shadow-xs border border-gray-200/80">
                  <button 
                    onClick={() => handleAdjustQty(item.id, -1)} 
                    className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500 active:scale-90 transition-all"
                  >
                    <Minus size={12}/>
                  </button>
                  <input 
                    type="number" 
                    className="w-7 text-center text-xs font-black text-[#6355d8] outline-none" 
                    value={item.qty}
                    onChange={(e) => handleCartQtyChange(item.id, e.target.value)}
                  />
                  <button 
                    onClick={() => handleAddToCart(item)} 
                    className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-purple-50 text-[#6355d8] active:scale-90 transition-all"
                  >
                    <Plus size={12}/>
                  </button>
                </div>
                <button 
                  onClick={() => handleRemoveItem(item.id)} 
                  className="text-gray-300 ml-2 hover:text-red-500 transition-colors"
                  title="ลบรายการนี้"
                >
                  <Trash2 size={15}/>
                </button>
              </div>
            ))
          )}
        </div>

        {/* หมายเหตุ */}
        <input 
          type="text" 
          placeholder="📝 หมายเหตุ..." 
          className="w-full bg-gray-50 border border-gray-200/60 rounded-xl px-3.5 py-2.5 text-xs mb-3 focus:bg-white focus:ring-2 focus:ring-[#6355d8]/20 focus:border-[#6355d8] outline-none text-gray-700 transition-all" 
          value={note} 
          onChange={e => setNote(e.target.value)} 
        />
        
        {/* ปุ่มส่งคำขอ */}
        <div>
          <button 
            onClick={handleRequestTransaction} 
            disabled={cart.length === 0} 
            className={`w-full text-white rounded-xl py-3 font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed transition-all ${isModeIn ? 'bg-[#6355d8] hover:bg-[#5244c9]' : 'bg-red-600 hover:bg-red-700'}`}
          >
            <Save size={18} /> ส่งคำขอ (ยังไม่ตัดสต็อก)
          </button>
        </div>
      </div>
    </div>
  );
}