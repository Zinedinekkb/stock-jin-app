'use client';

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, ArrowRightLeft, Package, ClipboardList, Plus, Minus, Copy, Save, 
  ShoppingCart, Trash2, Menu, X, Edit2, Check, Tag, ChevronDown, ChevronRight, 
  Layers, Palette, Filter, AlertTriangle, Info, User, LogOut, Settings, Bell, 
  HelpCircle, Shield, Smartphone, Utensils, Calendar, CheckCircle2, Clock, FileText, RefreshCw, Loader2
} from 'lucide-react';
import dynamic from 'next/dynamic';

const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });

// --- FIREBASE IMPORTS ---
import { db, auth } from '@/lib/firebase'; // เพิ่ม auth เข้ามา
import { 
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, 
  serverTimestamp, query, orderBy, where 
} from 'firebase/firestore';
// เพิ่ม Import ของระบบ Login
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

const AVAILABLE_COLORS = [
  'bg-green-600', 'bg-green-800', 'bg-yellow-500', 'bg-yellow-600', 
  'bg-red-600', 'bg-orange-600', 'bg-gray-500', 'bg-gray-700',
  'bg-blue-600', 'bg-blue-800', 'bg-indigo-600', 'bg-purple-700',
];

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, type = 'danger' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 border-2 ${type === 'danger' ? 'border-red-100' : 'border-green-100'}`}>
        <div className={`p-4 flex items-center gap-3 ${type === 'danger' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'}`}>
          {type === 'danger' ? <AlertTriangle size={24} /> : <Info size={24} />}
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
        <div className="p-6">
          <p className="text-gray-700 text-sm leading-relaxed">{message}</p>
        </div>
        <div className="p-4 bg-gray-50 flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition-colors">ยกเลิก</button>
          <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl font-bold text-white shadow-lg ${type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-700 hover:bg-green-800'}`}>
            ยืนยัน
          </button>
        </div>
      </div>
    </div>
  );
};

export default function StockJinApp() {
  const [activeTab, setActiveTab] = useState('transaction'); 
  
  // --- FIREBASE STATE DATA ---
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  // UI STATE
  const [showCatManager, setShowCatManager] = useState(false); 
  const [newCatData, setNewCatData] = useState({ name: '', color: 'bg-green-600' }); 
  const [editingCategory, setEditingCategory] = useState(null); 

  const [transMode, setTransMode] = useState('OUT');
  const [cart, setCart] = useState([]);
  const [note, setNote] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด'); 
  const [isEditingStock, setIsEditingStock] = useState(false); 
  const [newProductMode, setNewProductMode] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); 
  const [editFormData, setEditFormData] = useState(null); 
  const [newProdData, setNewProdData] = useState({ name: '', sku: '', unit: '', stock: 0, category: '' });
  const [collapsedCats, setCollapsedCats] = useState({});
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: null });
  
  // STATUS & VERIFY STATE
  const [statusFilter, setStatusFilter] = useState('pending');
  const [verifyingTx, setVerifyingTx] = useState(null);
  const [actualQty, setActualQty] = useState({});

  const [dateFilterType, setDateFilterType] = useState('7days'); 
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // --- AUTH STATE (UPDATED) ---
  const [user, setUser] = useState(null); 
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // เพิ่มสถานะโหลด
  const [loginError, setLoginError] = useState(''); // เพิ่มสถานะ Error

  // --- CHECK AUTH STATUS (Realtime) ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // จัดการ Role หรือชื่อ (ตอนนี้เอาจาก email ไปก่อน)
        const name = currentUser.email.split('@')[0];
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          name: name.charAt(0).toUpperCase() + name.slice(1), // ทำชื่อให้สวยๆ
          role: 'Admin' // เดี๋ยวค่อยทำระบบ Role จริงจัง
        });
      } else {
        setUser(null);
      }
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // --- FIREBASE REALTIME LISTENERS ---
  useEffect(() => {
    if (!user) return; // ถ้ายังไม่ล็อกอิน ไม่ต้องดึงข้อมูล

    const qProd = query(collection(db, 'products'), orderBy('name'));
    const unsubProd = onSnapshot(qProd, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qCat = query(collection(db, 'categories'), orderBy('name'));
    const unsubCat = onSnapshot(qCat, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qTx = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'));
    const unsubTx = onSnapshot(qTx, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubProd();
      unsubCat();
      unsubTx();
    };
  }, [user]);

  // --- HELPER FUNCTIONS ---
  const showConfirm = (title, message, onConfirm, type = 'danger') => {
    setModalConfig({ isOpen: true, title, message, type, onConfirm: () => { onConfirm(); setModalConfig(prev => ({ ...prev, isOpen: false })); }});
  };

  const showNotification = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const toggleCollapse = (catName) => {
    setCollapsedCats(prev => ({ ...prev, [catName]: !prev[catName] }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => showNotification('คัดลอกแล้ว!')).catch(() => showNotification('คัดลอกไม่สำเร็จ'));
  };

  const generateSummaryText = (tx) => {
    if (!tx) return '';
    const isPending = tx.status === 'pending';
    const header = tx.type === 'IN' ? '📥 รับสินค้าเข้า (STOCK IN)' : '📤 เบิกสินค้าออก (STOCK OUT)';
    const statusText = isPending ? '(รอตรวจสอบ)' : '(สำเร็จ)';
    const items = tx.items || [];
    const itemsList = items.map((item, idx) => {
      const qtyShow = (tx.actualItems && tx.actualItems[item.id] !== undefined) ? tx.actualItems[item.id] : item.qty;
      const qtyLabel = isPending ? item.qty : `${item.qty} → ${qtyShow}`; 
      return `${idx + 1}. ${item.name} : ${qtyLabel} ${item.unit}`;
    }).join('\n');
    
    return `ร้านจิน ข้าวมันไก่\n${header} ${statusText}\n📅 ${tx.date}\n------------------\n${itemsList}\n------------------\n📝 Note: ${tx.note || '-'}\nผู้บันทึก: ${tx.recorder || 'Staff'}`;
  };

  // --- FIREBASE ACTIONS ---
  const handleRequestTransaction = async () => {
    if (cart.length === 0) return;
    
    showConfirm(
      `ยืนยันคำขอ ${transMode === 'IN' ? 'รับของ' : 'เบิกของ'}`, 
      `รายการจะถูกส่งไปที่หน้า "สถานะ" เพื่อรอการตรวจสอบและยืนยันยอดจริงอีกครั้ง`,
      async () => {
        const now = new Date();
        const newTx = {
          type: transMode,
          date: now.toLocaleString('th-TH'),
          timestamp: now.getTime(),
          items: cart,
          note: note,
          recorder: user ? user.name : 'Staff',
          recorderEmail: user ? user.email : 'Unknown', // เก็บ email คนทำรายการ
          status: 'pending',
          actualItems: null
        };
        await addDoc(collection(db, 'transactions'), newTx);
        setCart([]);
        setNote('');
        showNotification('ส่งคำขอเรียบร้อย! ไปดูหน้าสถานะเลย');
        setActiveTab('status');
      }, 'info'
    );
  };

  const openVerifyModal = (tx) => {
    setVerifyingTx(tx);
    const initialActual = {};
    (tx.items || []).forEach(item => {
      initialActual[item.id] = (tx.actualItems && tx.actualItems[item.id] !== undefined) ? tx.actualItems[item.id] : item.qty;
    });
    setActualQty(initialActual);
  };

  const handleVerifyAndSave = async () => {
    if (!verifyingTx) return;

    showConfirm(
      'ยืนยันยอดจริงถูกต้อง?', 
      'สต็อกจะถูกอัปเดตตามยอดนี้ และสถานะจะเปลี่ยนเป็นสำเร็จ',
      async () => {
        const updatePromises = products.map(async (p) => {
          const isTargetItem = (verifyingTx.items || []).some(item => item.id === p.id);
          if (isTargetItem) {
             const finalQty = parseInt(actualQty[p.id]) || 0;
             if (finalQty > 0) {
               const newStock = verifyingTx.type === 'IN' 
                  ? p.stock + finalQty 
                  : p.stock - finalQty;
               
               const productRef = doc(db, 'products', p.id);
               await updateDoc(productRef, { stock: Math.max(0, newStock) });
             }
          }
        });

        await Promise.all(updatePromises);

        const txRef = doc(db, 'transactions', verifyingTx.id);
        await updateDoc(txRef, {
          status: 'completed',
          actualItems: actualQty,
          verifiedBy: user ? user.name : 'Admin',
          verifiedAt: new Date().toLocaleString('th-TH')
        });

        setVerifyingTx(null);
        showNotification('อัปเดตสต็อกเรียบร้อย!');
      }, 'info'
    );
  };

  const handleAddProduct = async () => {
    if (!newProdData.name) return showNotification('ข้อมูลไม่ครบ!');
    const newItem = { 
        ...newProdData, 
        stock: parseInt(newProdData.stock)||0,
        createdAt: serverTimestamp() 
    };
    await addDoc(collection(db, 'products'), newItem);
    setNewProductMode(false); 
    setNewProdData({ name: '', sku: '', unit: '', stock: 0, category: '' });
    showNotification('เพิ่มสินค้าแล้ว');
  };
  
  const openEditModal = (product) => {
    setEditingProduct(product);
    setEditFormData({ ...product });
  };

  const handleSaveEdit = async () => {
    if (!editFormData.name || !editFormData.sku) return showNotification('ห้ามเว้นว่าง!');
    const productRef = doc(db, 'products', editingProduct.id);
    await updateDoc(productRef, {
        ...editFormData,
        stock: parseInt(editFormData.stock)
    });
    setEditingProduct(null); 
    showNotification('แก้ไขแล้ว');
  };

  const handleDeleteProduct = async () => {
    const productRef = doc(db, 'products', editingProduct.id);
    await deleteDoc(productRef);
    setEditingProduct(null); 
    showNotification('ลบแล้ว');
  };
  
  const handleSaveCategory = async () => {
    if(!newCatData.name) return showNotification('ใส่ชื่อหมวดด้วย!');
    if (editingCategory) {
      const catRef = doc(db, 'categories', editingCategory.id);
      await updateDoc(catRef, newCatData);
      setEditingCategory(null);
      showNotification('แก้ไขหมวดหมู่เรียบร้อย');
    } else {
      await addDoc(collection(db, 'categories'), newCatData);
      showNotification('เพิ่มหมวดหมู่เรียบร้อย');
    }
    setNewCatData({name:'',color:'bg-green-600'});
  };

  const handleEditCategory = (cat) => {
    setEditingCategory(cat);
    setNewCatData({ name: cat.name, color: cat.color });
  };

  const handleDeleteCategory = async (id, name) => {
    const has = products.some(p => p.category === name); 
    if(has) return showNotification('มีของอยู่ ลบไม่ได้!');
    const catRef = doc(db, 'categories', id);
    await deleteDoc(catRef);
    if (editingCategory?.id === id) {
      setEditingCategory(null);
      setNewCatData({name:'',color:'bg-green-600'});
    }
  };

  const handleAddToCart = (p) => setCart(prev => { const ex=prev.find(x=>x.id===p.id); return ex?prev.map(x=>x.id===p.id?{...x,qty:x.qty+1}:x):[...prev,{...p,qty:1}] });
  const handleAdjustQty = (id, d) => setCart(prev => prev.map(i=>i.id===id?{...i,qty:Math.max(1,i.qty+d)}:i).filter(i=>i.qty>0));
  const handleRemoveItem = (id) => setCart(prev => prev.filter(i=>i.id!==id));
  const handleCartQtyChange = (id, val) => {
    const qty = parseInt(val) || 0;
    if (qty <= 0) return handleRemoveItem(id);
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
  };

  // --- AUTH FUNCTIONS (REAL) ---
  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) {
      setLoginError('กรุณากรอกข้อมูลให้ครบ');
      return;
    }
    setLoginError('');
    try {
      // ใช้ email/password ล็อกอินกับ Firebase
      await signInWithEmailAndPassword(auth, loginForm.username, loginForm.password);
      showNotification('ยินดีต้อนรับครับ!');
      // ไม่ต้องทำอะไรต่อ เพราะ useEffect จะทำงานเอง
    } catch (error) {
      console.error("Login Error:", error);
      setLoginError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null); 
      setActiveTab('menu'); 
      setLoginForm({ username: '', password: '' });
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  // --- RENDERERS ---
  const renderDashboard = () => {
    const completedTx = transactions.filter(t => t.status === 'completed');
    const now = new Date(); let start = new Date(); let end = new Date();
    
    if (dateFilterType === 'today') {
      start.setHours(0,0,0,0); end.setHours(23,59,59,999);
    } else if (dateFilterType === '7days') { 
      start.setDate(now.getDate()-6); start.setHours(0,0,0,0); end.setHours(23,59,59); 
    } else if (dateFilterType === '30days') {
      start.setDate(now.getDate()-29); start.setHours(0,0,0,0); end.setHours(23,59,59);
    } else if (dateFilterType === 'custom') { 
      start=new Date(customStartDate||0); end=new Date(customEndDate||new Date()); end.setHours(23,59,59); 
    }
    
    const filtered = completedTx.filter(tx => tx.timestamp >= start.getTime() && tx.timestamp <= end.getTime());
    const chartMap = {};
    filtered.forEach(tx => {
      const d = new Date(tx.timestamp); const l = `${d.getDate()}/${d.getMonth()+1}`;
      if(!chartMap[l]) chartMap[l]={name:l,in:0,out:0};
      const items = tx.items || [];
      const total = items.reduce((s,i) => s + (tx.actualItems ? (parseInt(tx.actualItems[i.id])||0) : i.qty), 0);
      if(tx.type==='IN') chartMap[l].in+=total; else chartMap[l].out+=total;
    });
    const chartData = Object.values(chartMap);
    const totalIn = filtered.filter(t => t.type === 'IN').reduce((sum, t) => sum + (t.items || []).reduce((s, i) => s + (t.actualItems ? (parseInt(t.actualItems[i.id])||0) : i.qty), 0), 0);
    const totalOut = filtered.filter(t => t.type === 'OUT').reduce((sum, t) => sum + (t.items || []).reduce((s, i) => s + (t.actualItems ? (parseInt(t.actualItems[i.id])||0) : i.qty), 0), 0);

    return (
      <div className="space-y-4 pb-20 animate-fade-in-slide">
        <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-green-900">ภาพรวมสต็อก</h2><div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold">{filtered.length} รายการ (สำเร็จ)</div></div>
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-200 space-y-3">
          <div className="flex items-center gap-2"><Filter size={16} className="text-gray-500"/> <span className="text-xs font-bold text-gray-500">ช่วงเวลา</span></div>
          <div className="flex bg-gray-100 p-1 rounded-xl overflow-x-auto no-scrollbar gap-1">
            {['today', '7days', '30days', 'custom'].map(t => (
              <button key={t} onClick={()=>setDateFilterType(t)} className={`flex-1 min-w-[60px] py-2 text-xs font-bold rounded-lg ${dateFilterType===t?'bg-white shadow text-green-700':'text-gray-500'}`}>
                {t==='today'?'วันนี้':t==='7days'?'7 วัน':t==='30days'?'30 วัน':'กำหนด'}
              </button>
            ))}
          </div>
          {dateFilterType === 'custom' && <div className="flex gap-2"><input type="date" className="border p-1 rounded text-xs" onChange={e=>setCustomStartDate(e.target.value)}/><input type="date" className="border p-1 rounded text-xs" onChange={e=>setCustomEndDate(e.target.value)}/></div>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-4 rounded-2xl shadow-sm border border-green-100"><p className="text-xs text-green-700 font-bold mb-1 opacity-80">ยอดรับเข้า</p><p className="text-3xl font-black text-green-800 tracking-tight">+{totalIn}</p></div>
          <div className="bg-red-50 p-4 rounded-2xl shadow-sm border border-red-100"><p className="text-xs text-red-700 font-bold mb-1 opacity-80">ยอดเบิกออก</p><p className="text-3xl font-black text-red-800 tracking-tight">-{totalOut}</p></div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="in" fill="#15803d" radius={[4, 4, 0, 0]} name="รับเข้า" />
              <Bar dataKey="out" fill="#dc2626" radius={[4, 4, 0, 0]} name="เบิกออก" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderStatus = () => {
    const filteredTx = transactions.filter(tx => statusFilter === 'pending' ? tx.status === 'pending' : tx.status === 'completed');
    return (
      <div className="space-y-4 pb-20 animate-fade-in-slide relative">
        <h2 className="text-2xl font-bold text-green-900 sticky top-0 bg-gray-50 z-10 py-2">สถานะคำสั่ง</h2>
        <div className="flex bg-gray-200 p-1 rounded-xl sticky top-12 z-10">
          <button onClick={() => setStatusFilter('pending')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${statusFilter === 'pending' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}><Clock size={16}/> รอตรวจสอบ ({transactions.filter(t=>t.status==='pending').length})</button>
          <button onClick={() => setStatusFilter('completed')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${statusFilter === 'completed' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}><CheckCircle2 size={16}/> สำเร็จแล้ว</button>
        </div>
        
        <div className="space-y-3 mt-2">
          {filteredTx.length === 0 ? <div className="text-center text-gray-400 py-10">ไม่มีรายการ</div> : filteredTx.map(tx => (
            <div 
              key={tx.id} 
              onClick={() => openVerifyModal(tx)}
              className={`bg-white p-4 rounded-2xl shadow-sm border-l-4 cursor-pointer active:scale-95 transition-transform flex justify-between items-center ${tx.type === 'IN' ? 'border-green-500' : 'border-red-500'}`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tx.type==='IN'?'bg-green-100 text-green-800':'bg-red-100 text-red-800'}`}>{tx.type === 'IN' ? 'รับเข้า' : 'เบิกออก'}</span><span className="text-xs text-gray-400">{tx.date}</span></div>
                <p className="text-sm font-bold text-gray-700">{(tx.items||[]).length} รายการ <span className="font-normal text-gray-400">| โดย {tx.recorder}</span></p>
                {tx.note && <p className="text-[10px] text-gray-400 mt-1">Note: {tx.note}</p>}
              </div>
              <div className="flex items-center gap-2">
                 {statusFilter === 'pending' && <span className="text-xs font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded">ตรวจรับ</span>}
                 {statusFilter === 'completed' && <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded">ดูข้อมูล</span>}
                 <ChevronRight size={20} className="text-gray-300"/>
              </div>
            </div>
          ))}
        </div>

        {verifyingTx && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className={`bg-white rounded-3xl shadow-2xl w-full max-w-sm m-auto overflow-hidden flex flex-col max-h-[80vh] animate-scale-in relative border-4 ${verifyingTx.status === 'pending' ? 'border-orange-100' : 'border-green-100'}`}>
              <div className={`p-4 border-b flex justify-between items-center ${verifyingTx.status === 'pending' ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100'}`}>
                <div>
                  <h3 className={`font-bold flex items-center gap-2 ${verifyingTx.status === 'pending' ? 'text-orange-800' : 'text-green-800'}`}>
                    {verifyingTx.status === 'pending' ? <ClipboardList size={20}/> : <FileText size={20}/>} 
                    {verifyingTx.status === 'pending' ? 'ตรวจสอบยอดจริง' : 'รายละเอียด'}
                  </h3>
                  {verifyingTx.status === 'pending' && <p className="text-[10px] text-orange-600">โปรดระบุจำนวนที่รับ/เบิกจริง</p>}
                </div>
                <button onClick={() => setVerifyingTx(null)} className="bg-white p-1 rounded-full text-gray-400"><X size={20}/></button>
              </div>

              <div className="p-4 overflow-y-auto flex-1 bg-white space-y-4">
                {(verifyingTx.items || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 text-sm">{item.name}</p>
                      {verifyingTx.status === 'completed' ? (
                        <p className="text-xs text-gray-500">ขอ: {item.qty} → <span className="font-bold text-green-600">จริง: {actualQty[item.id]}</span> {item.unit}</p>
                      ) : (
                        <p className="text-xs text-gray-400">ยอดขอเบิก: {item.qty} {item.unit}</p>
                      )}
                    </div>
                    {verifyingTx.status === 'pending' ? (
                      <div className="flex items-center gap-3">
                        <button onClick={() => setActualQty(prev => ({...prev, [item.id]: Math.max(0, (prev[item.id]||0) - 1)}))} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"><Minus size={14}/></button>
                        <div className="text-center w-12">
                          <input 
                            type="number" 
                            className="w-full text-center font-bold text-lg text-orange-600 outline-none border-b border-gray-200 focus:border-orange-500"
                            value={actualQty[item.id]}
                            onChange={(e) => setActualQty(prev => ({...prev, [item.id]: parseInt(e.target.value)||0}))}
                          />
                        </div>
                        <button onClick={() => setActualQty(prev => ({...prev, [item.id]: (prev[item.id]||0) + 1}))} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"><Plus size={14}/></button>
                      </div>
                    ) : (
                      <div className="bg-gray-100 px-3 py-1 rounded-lg">
                        <span className="font-black text-gray-700">{actualQty[item.id]}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-4 bg-gray-50 border-t border-gray-100">
                {verifyingTx.status === 'pending' ? (
                  <button onClick={handleVerifyAndSave} className="w-full py-3.5 rounded-xl bg-orange-500 text-white font-bold shadow-lg shadow-orange-200 active:scale-95 transition-transform flex items-center justify-center gap-2">
                    <CheckCircle2 size={20}/> ยืนยันยอดและอัปเดตสต็อก
                  </button>
                ) : (
                  <button onClick={() => copyToClipboard(generateSummaryText(verifyingTx))} className="w-full py-3.5 rounded-xl bg-gray-800 text-white font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
                    <Copy size={20}/> คัดลอกประวัติ
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTransaction = () => {
    const isModeIn = transMode === 'IN';
    const filteredProducts = selectedCategory === 'ทั้งหมด' ? products : products.filter(p => p.category === selectedCategory);
    return (
      <div className="pb-24 animate-fade-in-slide min-h-full flex flex-col relative">
        <div className="sticky top-0 z-30 bg-gray-50/95 backdrop-blur-md pb-2 -mx-4 px-4 pt-1 shadow-sm">
            <div className={`flex justify-between items-center p-1.5 rounded-2xl mb-3 border shadow-sm ${isModeIn ? 'border-green-200 bg-green-100/50' : 'border-red-200 bg-red-100/50'}`}>
              <button onClick={() => {setTransMode('IN'); setCart([]);}} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${isModeIn ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500'}`}>รับเข้า (IN)</button>
              <button onClick={() => {setTransMode('OUT'); setCart([]);}} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${!isModeIn ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500'}`}>เบิกออก (OUT)</button>
            </div>
            <div className="flex overflow-x-auto pb-1 gap-2 no-scrollbar">
              <button onClick={() => setSelectedCategory('ทั้งหมด')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shadow-sm ${selectedCategory === 'ทั้งหมด' ? 'bg-green-900 text-yellow-400 border-green-900' : 'bg-white text-gray-600 border-gray-200'}`}>ทั้งหมด</button>
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.name)} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shadow-sm flex items-center gap-1.5 ${selectedCategory === cat.name ? 'bg-green-900 text-yellow-400 border-green-900' : 'bg-white text-gray-600 border-gray-200'}`}><span className={`w-2 h-2 rounded-full inline-block ${cat.color}`}></span>{cat.name}</button>
              ))}
            </div>
        </div>
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
  };

  const renderStock = () => {
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
  };

  const renderMenu = () => {
    return (
      <div className="space-y-4 pb-20 animate-fade-in-slide p-2">
        <h2 className="text-2xl font-bold text-green-900 px-2 pt-2">บัญชีผู้ใช้</h2>
        {user ? (
          <div className="bg-gradient-to-r from-green-800 to-green-600 p-5 rounded-3xl shadow-xl text-white flex items-center gap-4 border border-green-500">
            <div className="w-16 h-16 rounded-full bg-yellow-400 border-4 border-green-900 shadow-inner overflow-hidden flex items-center justify-center text-green-900 font-bold text-2xl">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-xl text-yellow-300">{user.name}</h3>
              <p className="text-xs text-green-100 opacity-80">{user.email}</p>
              <div className="mt-2 text-[10px] bg-green-900/50 inline-block px-2 py-0.5 rounded text-green-200">
                สถานะ: ออนไลน์
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-green-800 to-gray-900 p-6 rounded-3xl shadow-xl text-white animate-scale-in border-t-4 border-yellow-500">
            <div className="flex items-center gap-3 mb-4"><div className="bg-white/10 p-3 rounded-2xl"><User size={28} className="text-yellow-400"/></div><div><h3 className="font-bold text-xl text-yellow-400">STOCK JIN</h3><p className="text-xs text-green-200">ระบบจัดการสต็อกร้านข้าวมันไก่</p></div></div>
            <div className="space-y-3 bg-black/20 p-4 rounded-2xl backdrop-blur-sm border border-white/5">
              <input placeholder="อีเมล (เช่น admin@stockjin.com)" className="w-full bg-white/10 border-0 rounded-xl px-4 py-3 text-sm text-white placeholder-green-200/50 focus:bg-white/20 outline-none transition-all" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
              <input type="password" placeholder="รหัสผ่าน" className="w-full bg-white/10 border-0 rounded-xl px-4 py-3 text-sm text-white placeholder-green-200/50 focus:bg-white/20 outline-none transition-all" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
              
              {loginError && <p className="text-red-400 text-xs text-center font-bold bg-red-900/30 py-1 rounded">{loginError}</p>}
              
              <button onClick={handleLogin} className="w-full bg-yellow-500 text-green-900 py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-transform hover:bg-yellow-400">เข้าสู่ระบบ</button>
            </div>
          </div>
        )}
        <div className="space-y-3 mt-4">
          <p className="text-xs font-bold text-gray-400 px-2 uppercase tracking-wider">เมนูหลัก</p>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 active:bg-gray-50 cursor-pointer"><div className="flex items-center gap-3"><Settings size={20} className="text-green-600"/><span className="text-sm font-medium text-gray-700">ตั้งค่าร้านค้า</span></div><ChevronRight size={16} className="text-gray-300"/></div>
            <div className="flex items-center justify-between p-4 active:bg-gray-50 cursor-pointer"><div className="flex items-center gap-3"><Smartphone size={20} className="text-green-600"/><span className="text-sm font-medium text-gray-700">เกี่ยวกับแอป</span></div><span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">v2.1 Auth</span></div>
          </div>
        </div>
        {user && <button onClick={handleLogout} className="w-full bg-red-50 text-red-600 py-3.5 rounded-2xl font-bold flex justify-center items-center gap-2 mt-6 active:scale-95 transition-transform border border-red-100"><LogOut size={20} /> ออกจากระบบ</button>}
      </div>
    );
  };

  // --- MAIN RENDER ---
  // ถ้ากำลังเช็คสถานะล็อกอิน ให้หมุนติ้วๆ ไปก่อน
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
           <Loader2 size={40} className="animate-spin text-green-700 mx-auto"/>
           <p className="text-green-800 font-bold animate-pulse">กำลังโหลด Stock Jin...</p>
        </div>
      </div>
    );
  }

  // ถ้ายังไม่ล็อกอิน ให้โชว์หน้าเมนู (ที่มีช่องล็อกอิน) บังคับเลย
  if (!user && activeTab !== 'menu') {
     // บังคับให้เด้งไปหน้า Login ถ้ายังไม่ได้เข้า
     setActiveTab('menu');
  }

  return (
    <div className="bg-gray-50 min-h-screen font-sans text-gray-800 flex justify-center selection:bg-green-200">
      <div className="w-full max-w-md bg-gray-50 h-[100dvh] shadow-2xl relative overflow-hidden flex flex-col">
        {/* Navbar */}
        <div className="bg-green-900 px-6 py-4 sticky top-0 z-40 flex justify-between items-center shadow-lg border-b-4 border-yellow-500">
          <div className="flex items-center gap-3"><div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg border-2 border-green-800 text-green-900"><Utensils size={20} strokeWidth={2.5}/></div><div><h1 className="text-lg font-black text-yellow-400 tracking-wide leading-none">STOCK JIN</h1><p className="text-[10px] text-green-200 opacity-80">ข้าวมันไก่สไตล์สิงคโปร์</p></div></div>
          {user && <div className="w-8 h-8 bg-green-800 rounded-full flex items-center justify-center text-yellow-400 font-bold text-xs border border-green-700">{user.name.charAt(0)}</div>}
        </div>

        <div className="p-4 flex-1 overflow-y-auto scrollbar-hide pb-24 bg-gray-50">
          {activeTab === 'dashboard' && user && renderDashboard()}
          {activeTab === 'stock' && user && renderStock()} 
          {activeTab === 'transaction' && user && renderTransaction()}
          {activeTab === 'status' && user && renderStatus()}
          {activeTab === 'menu' && renderMenu()}
        </div>

        {/* Navigation Bar (Show only when logged in) */}
        {user && (
          <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200 px-6 py-2 flex justify-between items-center z-50 pb-8 safe-area-pb shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
            <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'dashboard' ? 'text-green-700 scale-110' : 'text-gray-400'}`}><LayoutDashboard size={24} strokeWidth={activeTab==='dashboard'?2.5:2}/><span className="text-[9px] font-bold">ภาพรวม</span></button>
            <button onClick={() => setActiveTab('stock')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'stock' ? 'text-green-700 scale-110' : 'text-gray-400'}`}><Package size={24} strokeWidth={activeTab==='stock'?2.5:2}/><span className="text-[9px] font-bold">คลัง</span></button>
            <div className="relative -top-8 group">
              <div className={`absolute inset-0 bg-yellow-400 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity ${activeTab === 'transaction' ? 'block' : 'hidden'}`}></div>
              <button onClick={() => setActiveTab('transaction')} className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl shadow-green-900/30 border-[6px] border-gray-50 transition-all active:scale-90 ${activeTab === 'transaction' ? 'bg-gradient-to-br from-green-600 to-green-800 text-yellow-400 scale-110' : 'bg-gray-800 text-white'}`}><ArrowRightLeft size={28} strokeWidth={2.5} /></button>
            </div>
            <button onClick={() => setActiveTab('status')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'status' ? 'text-green-700 scale-110' : 'text-gray-400'}`}><ClipboardList size={24} strokeWidth={activeTab==='status'?2.5:2}/><span className="text-[9px] font-bold">สถานะ</span></button>
            <button onClick={() => setActiveTab('menu')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'menu' ? 'text-green-700 scale-110' : 'text-gray-400'}`}><Menu size={24} strokeWidth={activeTab==='menu'?2.5:2}/><span className="text-[9px] font-bold">เมนู</span></button>
          </div>
        )}
        
        <ConfirmModal isOpen={modalConfig.isOpen} title={modalConfig.title} message={modalConfig.message} type={modalConfig.type} onConfirm={modalConfig.onConfirm} onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))} />
        {showToast && <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-green-800/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl z-[70] flex items-center gap-3 animate-bounce-in whitespace-nowrap border border-white/10"><div className="bg-yellow-500 rounded-full p-0.5 text-green-900"><Check size={14} strokeWidth={3}/></div> {toastMsg}</div>}
      </div>
    </div>
  );
}