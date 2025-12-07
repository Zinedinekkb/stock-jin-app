// app/components/TabTransaction.js
import React, { useState } from 'react'; // <--- เพิ่ม useState
import { Package, ShoppingCart, Utensils, Minus, Plus, Trash2, Copy, Save, Search, X } from 'lucide-react'; // <--- เพิ่ม Search, X

export default function TabTransaction({
  products, categories,
  transMode, setTransMode,
  selectedCategory, setSelectedCategory,
  cart, setCart,
  note, setNote,
  handleAddToCart, handleAdjustQty, handleRemoveItem, handleCartQtyChange,
  handleRequestTransaction, copyToClipboard, generateSummaryText
}) {
    const [searchTerm, setSearchTerm] = useState(''); // <--- State สำหรับค้นหา

    const isModeIn = transMode === 'IN';
    
    // Logic กรองสินค้า (เพิ่มส่วน matchSearch)
    const filteredProducts = products.filter(p => {
        const matchCat = selectedCategory === 'ทั้งหมด' ? true : p.category === selectedCategory;
        const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchCat && matchSearch;
    });

  return (
      <div className="pb-24 animate-fade-in-slide min-h-full flex flex-col relative">
        <div className="sticky top-0 z-30 bg-gray-50/95 backdrop-blur-md pb-2 -mx-4 px-4 pt-1 shadow-sm">
            {/* ปุ่มเลือกโหมด IN / OUT */}
            <div className={`flex justify-between items-center p-1.5 rounded-2xl mb-3 border shadow-sm ${isModeIn ? 'border-green-200 bg-green-100/50' : 'border-red-200 bg-red-100/50'}`}>
              <button onClick={() => {setTransMode('IN'); setCart([]);}} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${isModeIn ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500'}`}>รับเข้า (IN)</button>
              <button onClick={() => {setTransMode('OUT'); setCart([]);}} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${!isModeIn ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500'}`}>เบิกออก (OUT)</button>
            </div>

            {/* --- [เพิ่มใหม่] ช่องค้นหาสินค้า --- */}
            <div className="relative mb-3">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Search size={18} />
                </div>
                <input 
                    type="text" 
                    placeholder="ค้นหาสินค้า / SKU..." 
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 bg-white shadow-sm text-sm focus:ring-2 focus:ring-green-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 bg-gray-100 rounded-full p-0.5">
                        <X size={14} />
                    </button>
                )}
            </div>
            {/* ---------------------------------- */}

            {/* หมวดหมู่ */}
            <div className="flex overflow-x-auto pb-1 gap-2 no-scrollbar">
              <button onClick={() => setSelectedCategory('ทั้งหมด')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shadow-sm ${selectedCategory === 'ทั้งหมด' ? 'bg-green-900 text-yellow-400 border-green-900' : 'bg-white text-gray-600 border-gray-200'}`}>ทั้งหมด</button>
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.name)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shadow-sm flex items-center gap-1.5 ${selectedCategory === cat.name ? 'bg-green-900 text-yellow-400 border-green-900' : 'bg-white text-gray-600 border-gray-200'}`}><span className={`w-2 h-2 rounded-full inline-block ${cat.color}`}></span>{cat.name}</button>
              ))}
            </div>
        </div>

        {/* Grid แสดงสินค้า (ใช้ filteredProducts ตัวใหม่) */}
        <div className="grid grid-rows-2 grid-flow-col gap-3 pb-4 mb-4 pt-2 overflow-x-auto auto-cols-[140px] no-scrollbar snap-x snap-mandatory">
          {filteredProducts.length === 0 ? <div className="col-span-full w-full flex items-center justify-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-2xl min-h-[120px]">ไม่พบสินค้า</div> : 
            filteredProducts.map(p => {
               const catObj = categories.find(c => c.name === p.category) || {};
               const catColorText = catObj.color ? catObj.color.replace('bg-', 'text-') : 'text-gray-400';
               return (
                <div key={p.id} onClick={() => handleAddToCart(p)} className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm active:scale-95 transition-all cursor-pointer flex flex-col justify-between hover:shadow-md h-28 relative overflow-hidden group snap-center">
                  <div className={`absolute top-0 right-0 w-10 h-10 opacity-10 rounded-bl-3xl ${catObj.color}`}></div>
                  <div><div className="flex justify-between items-start mb-2"><div className="bg-gray-50 p-1.5 rounded-lg"><Package size={16} className="text-gray-400"/></div><span className={`text-xs font-black ${p.stock===0 ? 'text-red-500':'text-green-700'}`}>{p.stock}</span></div><p className="text-xs font-bold text-gray-800 line-clamp-2 leading-tight h-8">{p.name}</p></div>
                  <p className={`text-[9px] mt-1 truncate font-bold uppercase tracking-wide opacity-80 ${catColorText}`}>{p.category}</p>
                </div>
               );
            })
          }
        </div>

        {/* ส่วนตะกร้า (เหมือนเดิม) */}
        <div className="flex-1 bg-white rounded-t-3xl shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] border-t border-gray-200 p-5 flex flex-col z-20">
          <div className="flex justify-between items-center mb-4"><span className="font-bold text-green-900 flex gap-2 items-center text-lg"><ShoppingCart size={22} className="text-yellow-500"/> ตะกร้า ({cart.length})</span>{cart.length > 0 && <button onClick={() => setCart([])} className="text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded-lg hover:bg-red-100">ลบหมด</button>}</div>
          <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
             {cart.length === 0 ? <div className="flex flex-col items-center justify-center h-32 text-gray-300 border-2 border-dashed border-gray-100 rounded-2xl"><Utensils size={32} className="opacity-20 mb-2"/><p className="text-xs font-medium">เลือกรายการด้านบนเลย</p></div> : 
               cart.map(item => (
                 <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl border border-gray-100 group">
                   <div className="flex-1 overflow-hidden mr-2"><div className="truncate text-sm font-bold text-gray-800">{item.name}</div><div className="text-[10px] text-gray-400 font-medium">{item.category}</div></div>
                   <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-xl shadow-sm border border-gray-100">
                      <button onClick={() => handleAdjustQty(item.id, -1)} className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-gray-100 text-gray-500"><Minus size={14}/></button>
                      <input 
                        type="number" 
                        className="w-8 text-center text-sm font-black text-green-800 outline-none border-b border-transparent focus:border-green-500" 
                        value={item.qty}
                        onChange={(e) => handleCartQtyChange(item.id, e.target.value)}
                      />
                      <button onClick={() => handleAddToCart(item)} className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-green-50 text-green-600"><Plus size={14}/></button>
                   </div>
                   <button onClick={() => handleRemoveItem(item.id)} className="text-gray-300 ml-2 hover:text-red-500"><Trash2 size={16}/></button>
                 </div>
               ))
             }
          </div>
          <input type="text" placeholder="📝 หมายเหตุ..." className="w-full bg-gray-50 border-0 rounded-2xl px-4 py-3 text-sm mb-4 focus:ring-2 focus:ring-yellow-100 outline-none text-gray-700" value={note} onChange={e => setNote(e.target.value)} />
          <div className="grid grid-cols-4 gap-3">
             <button onClick={() => copyToClipboard(generateSummaryText(null))} disabled={cart.length === 0} className="col-span-1 bg-gray-800 text-white rounded-2xl py-4 flex flex-col items-center justify-center gap-1 active:scale-95 disabled:opacity-50 shadow-lg"><Copy size={20} /> <span className="text-[10px] font-bold">COPY</span></button>
             <button onClick={handleRequestTransaction} disabled={cart.length === 0} className={`col-span-3 text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-2 shadow-xl active:scale-95 disabled:opacity-50 transition-all ${isModeIn ? 'bg-green-600' : 'bg-red-600'}`}><Save size={20} /> ส่งคำขอ (ยังไม่ตัดสต็อก)</button>
          </div>
        </div>
      </div>
  );
}