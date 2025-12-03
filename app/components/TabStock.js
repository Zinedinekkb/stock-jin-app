// app/components/TabStock.js
import React from 'react';
import { Layers, Edit2, Plus, ChevronRight, ChevronDown, Trash2, Palette, X, Minus, Save } from 'lucide-react';

const AVAILABLE_COLORS = [
    'bg-green-600', 'bg-green-800', 'bg-yellow-500', 'bg-yellow-600', 
    'bg-red-600', 'bg-orange-600', 'bg-gray-500', 'bg-gray-700',
    'bg-blue-600', 'bg-blue-800', 'bg-indigo-600', 'bg-purple-700',
  ];

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
  handleSaveCategory, handleEditCategory, handleDeleteCategory
}) {
  return (
      <div className="space-y-4 pb-20 animate-fade-in-slide relative">
        <div className="flex justify-between items-center sticky top-0 bg-gray-50/95 py-2 z-10 backdrop-blur-md transition-all">
          <h2 className="text-2xl font-bold text-green-900">คลังสินค้า</h2>
          <div className="flex gap-2">
             <button onClick={() => { setShowCatManager(true); setNewProductMode(false); setIsEditingStock(false); }} className="p-2.5 rounded-full shadow-sm bg-white text-gray-600 active:scale-95 border border-gray-200"><Layers size={20} /></button>
             <button onClick={() => { setIsEditingStock(!isEditingStock); setNewProductMode(false); setShowCatManager(false); }} className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-sm transition-all border ${isEditingStock ? 'bg-yellow-100 text-yellow-800 border-yellow-300' : 'bg-white text-gray-600 border-gray-200'}`}><Edit2 size={18} />{isEditingStock && <span className="text-xs font-bold">แก้ไข</span>}</button>
            {!isEditingStock && <button onClick={() => { setNewProductMode(true); setShowCatManager(false); }} className="bg-green-700 text-yellow-100 p-2.5 rounded-full shadow-lg active:scale-95 transition-transform hover:bg-green-800 border border-green-600"><Plus size={20} /></button>}
          </div>
        </div>
        
        {showCatManager && (
          <div className="bg-white p-5 rounded-2xl shadow-xl border border-gray-200 mb-4 animate-scale-in">
             <div className="flex justify-between items-center mb-4 pb-2 border-b">
               <h3 className="font-bold text-green-800 flex items-center gap-2"><Layers size={18} /> จัดการหมวดหมู่</h3>
               <button onClick={() => { setShowCatManager(false); setEditingCategory(null); setNewCatData({name:'',color:'bg-green-600'}); }}><X size={20} className="text-gray-400"/></button>
             </div>
             <div className="space-y-2 mb-4 max-h-48 overflow-y-auto pr-1">
               {categories.map(cat => (
                 <div 
                   key={cat.id} 
                   className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer ${editingCategory?.id === cat.id ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-100'}`}
                   onClick={() => handleEditCategory(cat)}
                 >
                   <div className="flex items-center gap-3">
                     <div className={`w-6 h-6 rounded-full ${cat.color} border-2 border-white shadow-sm`}></div>
                     <span className="text-sm font-semibold text-gray-700">{cat.name}</span>
                   </div>
                   <button onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id, cat.name); }} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                 </div>
               ))}
             </div>
             <div className="flex gap-2 items-center border-t pt-4">
                <div className="group relative">
                   <div className={`w-9 h-9 rounded-full ${newCatData.color} cursor-pointer border-2 border-white shadow-md flex items-center justify-center`}><Palette size={16} className="text-white opacity-90"/></div>
                   <div className="absolute bottom-12 left-0 z-50 bg-white shadow-xl p-3 rounded-2xl grid grid-cols-6 gap-2 w-56 hidden group-hover:grid border animate-fade-in">
                     {AVAILABLE_COLORS.map(c => <div key={c} onClick={() => setNewCatData({ ...newCatData, color: c })} className={`w-5 h-5 rounded-full ${c} cursor-pointer hover:scale-125 transition-transform shadow-sm`}></div>)}
                   </div>
                 </div>
                <input placeholder="ชื่อหมวดใหม่..." className="flex-1 border p-2.5 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-green-200 outline-none" value={newCatData.name} onChange={e => setNewCatData({...newCatData, name: e.target.value})} />
                <button onClick={handleSaveCategory} className="bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg w-20">
                  {editingCategory ? 'แก้ไข' : 'เพิ่ม'}
                </button>
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
               <button onClick={handleAddProduct} className="w-full bg-green-700 text-white py-3.5 rounded-xl font-bold mt-2 shadow-lg">บันทึกสินค้า</button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {categories.map(cat => {
            const catProducts = products.filter(p => (p.category || 'ไม่ระบุ') === cat.name);
            const isCollapsed = collapsedCats[cat.name];
            const colorClass = cat.color;
            return (
              <div key={cat.id} className="space-y-2">
                <div onClick={() => toggleCollapse(cat.name)} className="flex items-center gap-2 cursor-pointer select-none py-2 px-1 active:scale-[0.99] transition-transform group">
                  <div className={`p-1 rounded-full bg-white border border-gray-200 shadow-sm`}>{isCollapsed ? <ChevronRight size={18} className="text-gray-500"/> : <ChevronDown size={18} className="text-gray-600"/>}</div>
                  <div className={`w-3 h-3 rounded-full ${colorClass} shadow-sm border border-white`}></div>
                  <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2">{cat.name} <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold">{catProducts.length}</span></h3>
                </div>
                {!isCollapsed && (
                  <div className="space-y-3 pl-2 border-l-2 border-dashed border-gray-300 ml-3.5 animate-fade-in-slide">
                    {catProducts.length === 0 ? <div className="text-xs text-gray-400 italic pl-3 py-2">ว่างเปล่า...</div> : catProducts.map(p => (
                        <div key={p.id} onClick={() => isEditingStock && openEditModal(p)} className={`bg-white p-3.5 rounded-2xl shadow-sm border flex justify-between items-center relative overflow-hidden transition-all duration-300 ${isEditingStock ? 'border-yellow-400 ring-2 ring-yellow-100 cursor-pointer active:scale-95' : 'border-gray-200 hover:border-green-300'}`}>
                          <div className={`absolute left-0 top-0 bottom-0 w-[5px] ${colorClass}`}></div>
                          <div className="pl-3 flex-1"><h3 className="font-bold text-gray-800 text-sm">{p.name}</h3><p className="text-[10px] text-gray-500 bg-gray-50 inline-block px-1.5 rounded mt-1 font-mono">#{p.sku}</p></div>
                          <div className="flex items-center gap-3"><div className="text-right"><p className={`text-lg font-black ${p.stock < 5 ? 'text-red-600' : 'text-green-800'}`}>{p.stock}</p><p className="text-[10px] text-gray-500 font-medium">{p.unit}</p></div>{isEditingStock && <div className="bg-yellow-100 p-2 rounded-full text-yellow-700"><Edit2 size={14} /></div>}</div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {editingProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 transform transition-all animate-scale-in border-4 border-yellow-100">
              <div className="flex justify-between items-center mb-6 border-b pb-3"><h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Edit2 size={24} className="text-yellow-500"/> แก้ไขสินค้า</h3><button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button></div>
              <div className="space-y-4">
                <input className="w-full border border-gray-200 bg-gray-50 rounded-xl p-3 focus:ring-2 focus:ring-yellow-200 outline-none" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})}/>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 ml-1">หมวดหมู่</label>
                  <select 
                    className="w-full border border-gray-200 bg-gray-50 rounded-xl p-3 focus:bg-white outline-none" 
                    value={editFormData.category} 
                    onChange={(e) => setEditFormData({...editFormData, category: e.target.value})}
                  >
                    <option value="">-- เลือกหมวด --</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-3"><input className="w-full border border-gray-200 bg-gray-50 rounded-xl p-3" value={editFormData.sku} onChange={e => setEditFormData({...editFormData, sku: e.target.value})}/><input className="w-full border border-gray-200 bg-gray-50 rounded-xl p-3" value={editFormData.unit} onChange={e => setEditFormData({...editFormData, unit: e.target.value})}/></div>
                <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100">
                  <label className="text-xs font-bold text-yellow-800 uppercase tracking-wider">Stock</label>
                  <div className="flex items-center gap-4 mt-2">
                    <button onClick={() => setEditFormData({...editFormData, stock: Math.max(0, parseInt(editFormData.stock) - 1)})} className="w-10 h-10 bg-white border border-yellow-200 rounded-xl flex items-center justify-center shadow-sm text-yellow-600"><Minus size={20}/></button>
                    <input 
                      type="number" 
                      className="flex-1 text-center bg-transparent font-black text-3xl text-gray-800 outline-none" 
                      value={editFormData.stock} 
                      onChange={e => setEditFormData({...editFormData, stock: e.target.value})}
                    />
                    <button onClick={() => setEditFormData({...editFormData, stock: parseInt(editFormData.stock) + 1})} className="w-10 h-10 bg-white border border-yellow-200 rounded-xl flex items-center justify-center shadow-sm text-yellow-600"><Plus size={20}/></button>
                  </div>
                </div>
                <div className="flex gap-3 pt-4"><button onClick={handleDeleteProduct} className="flex-1 bg-red-50 text-red-600 py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-red-100"><Trash2 size={20} /> ลบ</button><button onClick={handleSaveEdit} className="flex-[2] bg-green-700 text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-green-800 flex justify-center items-center gap-2"><Save size={20} /> บันทึก</button></div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}