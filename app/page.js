'use client';

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, ArrowRightLeft, Package, ClipboardList, Menu, Check, Utensils, Loader2, AlertTriangle, Trash2
} from 'lucide-react';

// --- IMPORT COMPONENTS ---
import ConfirmModal from './components/ConfirmModal';
import TabDashboard from './components/TabDashboard';
import TabStock from './components/TabStock';
import TabTransaction from './components/TabTransaction';
import TabStatus from './components/TabStatus';
import TabMenu from './components/TabMenu';

// --- IMPORT SERVICE ---
import { submitTransactionService } from '@/app/services/transactionService';

// --- FIREBASE IMPORTS ---
import { db, auth } from '@/lib/firebase';
import { 
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc,
  serverTimestamp, query, orderBy, where, writeBatch
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from "firebase/auth";

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

  // --- AUTH & REGISTER STATE ---
  const [user, setUser] = useState(null); 
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [loginError, setLoginError] = useState('');
  
  // Register State
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [registerError, setRegisterError] = useState('');

  // Admin: Pending Users
  const [pendingUsers, setPendingUsers] = useState([]);

  // --- CHECK AUTH STATUS ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.status !== 'approved') {
            await signOut(auth);
            setUser(null);
            showConfirm('รอการอนุมัติ', 'บัญชีของคุณสมัครเรียบร้อยแล้ว กรุณารอแอดมินอนุมัติก่อนเข้าใช้งาน', () => {}, 'info');
          } else {
            setUser({
              uid: currentUser.uid,
              email: currentUser.email,
              name: userData.name || currentUser.email.split('@')[0],
              role: userData.role || 'staff'
            });
          }
        } else {
          setUser({ uid: currentUser.uid, email: currentUser.email, name: 'เฮียจิน (Owner)', role: 'admin' });
          await setDoc(userRef, { name: 'เฮียจิน (Owner)', email: currentUser.email, role: 'admin', status: 'approved', createdAt: serverTimestamp() });
        }
      } else {
        setUser(null);
      }
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // --- FIREBASE LISTENERS ---
  useEffect(() => {
    if (!user) return;
    
    const qProd = query(collection(db, 'products'), orderBy('name'));
    const unsubProd = onSnapshot(qProd, (snapshot) => setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const qCat = query(collection(db, 'categories'), orderBy('name'));
    const unsubCat = onSnapshot(qCat, (snapshot) => setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    const qTx = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'));
    const unsubTx = onSnapshot(qTx, (snapshot) => setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));

    let unsubPending = () => {};
    if (user.role === 'admin') {
      const qPending = query(collection(db, 'users'), where('status', '==', 'pending'));
      unsubPending = onSnapshot(qPending, (snapshot) => {
        setPendingUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }

    return () => { unsubProd(); unsubCat(); unsubTx(); unsubPending(); };
  }, [user]);

  // --- HELPER FUNCTIONS ---
  const showConfirm = (title, message, onConfirm, type = 'danger') => {
    setModalConfig({ isOpen: true, title, message, type, onConfirm: () => { onConfirm(); setModalConfig(prev => ({ ...prev, isOpen: false })); }});
  };

  const showNotification = (msg) => { setToastMsg(msg); setShowToast(true); setTimeout(() => setShowToast(false), 2000); };
  const toggleCollapse = (catName) => setCollapsedCats(prev => ({ ...prev, [catName]: !prev[catName] }));
  const copyToClipboard = (text) => navigator.clipboard.writeText(text).then(() => showNotification('คัดลอกแล้ว!')).catch(() => showNotification('คัดลอกไม่สำเร็จ'));

  const generateSummaryText = (tx) => {
    if (!tx) return '';
    const isPending = tx.status === 'pending';
    const isCancelled = tx.status === 'cancelled';
    const header = tx.type === 'IN' ? '📥 รับสินค้าเข้า (STOCK IN)' : '📤 เบิกสินค้าออก (STOCK OUT)';
    const statusText = isPending ? '(รอตรวจสอบ)' : isCancelled ? '(ยกเลิกรายการ)' : '(สำเร็จ)';
    const items = tx.items || [];
    const itemsList = items.map((item, idx) => {
      const qtyShow = (tx.actualItems && tx.actualItems[item.id] !== undefined) ? tx.actualItems[item.id] : item.qty;
      const qtyLabel = isPending ? item.qty : `${item.qty} → ${qtyShow}`; 
      return `${idx + 1}. ${item.name} : ${qtyLabel} ${item.unit}`;
    }).join('\n');
    return `ร้านจิน ข้าวมันไก่\n${header} ${statusText}\n📅 ${tx.date}\n------------------\n${itemsList}\n------------------\n📝 Note: ${tx.note || '-'}\nผู้บันทึก: ${tx.recorder || 'Staff'}`;
  };

  // --- LOGIC: Void/Edit/Reorder ---
  const revertStock = async (tx) => {
    const reversePromises = (tx.items || []).map(async (item) => {
       const qtyUsed = (tx.actualItems && tx.actualItems[item.id] !== undefined) ? tx.actualItems[item.id] : 0;
       if (qtyUsed > 0) {
         const productRef = doc(db, 'products', item.id);
         const productSnap = await getDoc(productRef);
         if (productSnap.exists()) {
            const currentStock = productSnap.data().stock || 0;
            let revertedStock = currentStock;
            if (tx.type === 'IN') revertedStock = currentStock - qtyUsed;
            else revertedStock = currentStock + qtyUsed;
            await updateDoc(productRef, { stock: Math.max(0, revertedStock) });
         }
       }
    });
    await Promise.all(reversePromises);
  };

  const handleVoidTransaction = (tx) => {
    showConfirm('ยืนยันยกเลิกบิล?', 'ระบบจะทำการคืนค่าสต็อกสินค้า และเปลี่ยนสถานะเป็น "ยกเลิก"', async () => {
       await revertStock(tx);
       await updateDoc(doc(db, 'transactions', tx.id), {
          status: 'cancelled',
          cancelledBy: user.name,
          cancelledAt: new Date().toLocaleString('th-TH')
       });
       setVerifyingTx(null); showNotification('ยกเลิกบิลและคืนค่าสต็อกแล้ว');
    }, 'danger');
  };

  const handleEditCompletedTx = (tx) => {
    showConfirm('ต้องการแก้ไขรายการ?', 'สต็อกจะถูกคืนค่าเดิม และรายการนี้จะกลับไปสถานะ "รอตรวจสอบ"', async () => {
       await revertStock(tx);
       await updateDoc(doc(db, 'transactions', tx.id), { status: 'pending', actualItems: null, verifiedBy: null, verifiedAt: null });
       setStatusFilter('pending'); 
       const initialActual = {};
       (tx.items || []).forEach(item => { initialActual[item.id] = (tx.actualItems && tx.actualItems[item.id] !== undefined) ? tx.actualItems[item.id] : item.qty; });
       setActualQty(initialActual);
       setVerifyingTx({ ...tx, status: 'pending' });
       showNotification('รายการกลับสู่สถานะรอตรวจสอบแล้ว');
    }, 'info');
  };

  const handleReorderStock = async (reorderedItems) => {
    try {
      const batch = writeBatch(db);
      reorderedItems.forEach((item, index) => {
        const productRef = doc(db, 'products', item.id);
        batch.update(productRef, { order: index });
      });
      await batch.commit();
    } catch (error) {
      console.error("Reorder Error:", error);
      showNotification('จัดลำดับไม่สำเร็จ');
    }
  };

  // --- ACTIONS: Request Transaction (ใช้ Service แยกไฟล์) ---
  const handleRequestTransaction = async () => {
    if (cart.length === 0) return;
    
    showConfirm(
      `ยืนยันคำขอ ${transMode === 'IN' ? 'รับของ' : 'เบิกของ'}`, 
      `รายการจะถูกส่งไปที่หน้า "สถานะ" เพื่อรอการตรวจสอบและยืนยันยอดจริงอีกครั้ง`,
      async () => {
        try {
            await submitTransactionService({
                cart,
                transMode,
                note,
                user
            });

            setCart([]);
            setNote('');
            showNotification('ส่งคำขอเรียบร้อย! (แจ้งเตือนไลน์แล้ว)');
            setActiveTab('status');

        } catch (error) {
            console.error(error);
            showNotification('เกิดข้อผิดพลาด กรุณาลองใหม่');
        }
      }, 'info'
    );
  };

  const openVerifyModal = (tx) => {
    setVerifyingTx(tx);
    const initialActual = {};
    (tx.items || []).forEach(item => { initialActual[item.id] = (tx.actualItems && tx.actualItems[item.id] !== undefined) ? tx.actualItems[item.id] : item.qty; });
    setActualQty(initialActual);
  };

  const handleVerifyAndSave = async () => {
    if (!verifyingTx) return;
    showConfirm(
      'ยืนยันยอดจริงถูกต้อง?', 'สต็อกจะถูกอัปเดตตามยอดนี้ และสถานะจะเปลี่ยนเป็นสำเร็จ',
      async () => {
        const updatePromises = products.map(async (p) => {
          const isTargetItem = (verifyingTx.items || []).some(item => item.id === p.id);
          if (isTargetItem) {
             const finalQty = parseInt(actualQty[p.id]) || 0;
             if (finalQty > 0) {
               const newStock = verifyingTx.type === 'IN' ? p.stock + finalQty : p.stock - finalQty;
               const productRef = doc(db, 'products', p.id);
               await updateDoc(productRef, { stock: Math.max(0, newStock) });
             }
          }
        });
        await Promise.all(updatePromises);
        const txRef = doc(db, 'transactions', verifyingTx.id);
        await updateDoc(txRef, { status: 'completed', actualItems: actualQty, verifiedBy: user ? user.name : 'Admin', verifiedAt: new Date().toLocaleString('th-TH') });
        setVerifyingTx(null); showNotification('อัปเดตสต็อกเรียบร้อย!');
      }, 'info'
    );
  };

  // CRUD Functions
  const handleAddProduct = async () => {
    // [แก้ไข] ดักจับ: ห้ามสร้างถ้าไม่ได้เลือกหมวดหมู่
    if (!newProdData.name || !newProdData.category) {
        return showNotification('กรุณากรอกชื่อสินค้า และเลือกหมวดหมู่!');
    }

    await addDoc(collection(db, 'products'), { ...newProdData, stock: parseInt(newProdData.stock)||0, order: 9999, createdAt: serverTimestamp() });
    setNewProductMode(false); setNewProdData({ name: '', sku: '', unit: '', stock: 0, category: '' }); showNotification('เพิ่มสินค้าแล้ว');
  };

  const openEditModal = (p) => { setEditingProduct(p); setEditFormData({ ...p }); };
  const handleSaveEdit = async () => {
    if (!editFormData.name) return showNotification('ห้ามเว้นว่าง!');
    await updateDoc(doc(db, 'products', editingProduct.id), { ...editFormData, stock: parseInt(editFormData.stock) });
    setEditingProduct(null); showNotification('แก้ไขแล้ว');
  };
  const handleDeleteProduct = async () => { await deleteDoc(doc(db, 'products', editingProduct.id)); setEditingProduct(null); showNotification('ลบแล้ว'); };
  
  // Quick Delete for Ghost Products
  const handleQuickDelete = async (id) => {
    if(window.confirm('ยืนยันลบสินค้านี้?')) {
        await deleteDoc(doc(db, 'products', id));
        showNotification('ลบสินค้าเรียบร้อย');
    }
  };

  const handleSaveCategory = async () => {
    if(!newCatData.name) return showNotification('ใส่ชื่อหมวดด้วย!');
    if (editingCategory) await updateDoc(doc(db, 'categories', editingCategory.id), newCatData);
    else await addDoc(collection(db, 'categories'), newCatData);
    setNewCatData({name:'',color:'bg-green-600'}); setEditingCategory(null); showNotification('บันทึกหมวดหมู่เรียบร้อย');
  };
  const handleEditCategory = (c) => { setEditingCategory(c); setNewCatData({ name: c.name, color: c.color }); };
  const handleDeleteCategory = async (id, name) => {
    if(products.some(p => p.category === name)) return showNotification('มีของอยู่ ลบไม่ได้!');
    await deleteDoc(doc(db, 'categories', id));
    if (editingCategory?.id === id) { setEditingCategory(null); setNewCatData({name:'',color:'bg-green-600'}); }
  };

  // Cart Functions
  const handleAddToCart = (p) => setCart(prev => { const ex=prev.find(x=>x.id===p.id); return ex?prev.map(x=>x.id===p.id?{...x,qty:x.qty+1}:x):[...prev,{...p,qty:1}] });
  const handleAdjustQty = (id, d) => setCart(prev => prev.map(i=>i.id===id?{...i,qty:Math.max(1,i.qty+d)}:i).filter(i=>i.qty>0));
  const handleRemoveItem = (id) => setCart(prev => prev.filter(i=>i.id!==id));
  const handleCartQtyChange = (id, val) => { const qty = parseInt(val) || 0; if (qty <= 0) return handleRemoveItem(id); setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i)); };

  // Auth Functions
  const handleLogin = async () => {
    if (!loginForm.username || !loginForm.password) { setLoginError('กรุณากรอกข้อมูลให้ครบ'); return; }
    setLoginError('');
    try { 
      await signInWithEmailAndPassword(auth, loginForm.username, loginForm.password); 
    } 
    catch (error) { console.error("Login Error:", error); setLoginError('อีเมลหรือรหัสผ่านไม่ถูกต้อง'); }
  };

  const handleRegister = async () => {
    if (!registerForm.name || !registerForm.email || !registerForm.password || !registerForm.confirmPassword) {
      setRegisterError('กรุณากรอกข้อมูลให้ครบ'); return;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      setRegisterError('รหัสผ่านไม่ตรงกัน'); return;
    }
    setRegisterError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, registerForm.email, registerForm.password);
      const user = userCredential.user;
      await setDoc(doc(db, 'users', user.uid), {
        name: registerForm.name, email: registerForm.email, role: 'staff', status: 'pending', createdAt: serverTimestamp()
      });
      await signOut(auth);
      showConfirm('สมัครสมาชิกสำเร็จ', 'กรุณาแจ้งแอดมินเพื่อทำการอนุมัติบัญชีของท่าน', () => {
        setIsRegisterMode(false);
        setRegisterForm({ name: '', email: '', password: '', confirmPassword: '' });
      }, 'success');
    } catch (error) {
      console.error("Register Error:", error);
      if (error.code === 'auth/email-already-in-use') setRegisterError('อีเมลนี้ถูกใช้งานแล้ว');
      else if (error.code === 'auth/weak-password') setRegisterError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      else setRegisterError('เกิดข้อผิดพลาดในการสมัคร');
    }
  };

  const handleLogout = async () => { try { await signOut(auth); setUser(null); setActiveTab('menu'); setLoginForm({ username: '', password: '' }); } catch (error) { console.error("Logout Error:", error); } };

  const handleApproveUser = async (uid) => {
    showConfirm('อนุมัติผู้ใช้?', 'ผู้ใช้นี้จะสามารถเข้าสู่ระบบและใช้งานได้ทันที', async () => {
       await updateDoc(doc(db, 'users', uid), { status: 'approved' });
       showNotification('อนุมัติเรียบร้อย');
    }, 'info');
  };

  const handleRejectUser = async (uid) => {
    showConfirm('ปฏิเสธผู้ใช้?', 'ผู้ใช้นี้จะถูกลบออกจากระบบ', async () => {
       await deleteDoc(doc(db, 'users', uid));
       showNotification('ปฏิเสธเรียบร้อย');
    }, 'danger');
  };

  // --- RENDER MAIN ---
  if (isLoadingAuth) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-center space-y-3"><Loader2 size={40} className="animate-spin text-green-700 mx-auto"/><p className="text-green-800 font-bold animate-pulse">กำลังตรวจสอบสิทธิ์...</p></div></div>;
  }
  if (!user && activeTab !== 'menu') setActiveTab('menu');

  return (
    <div className="bg-gray-50 min-h-screen font-sans text-gray-800 flex justify-center selection:bg-green-200">
      <div className="w-full max-w-md bg-gray-50 h-[100dvh] shadow-2xl relative overflow-hidden flex flex-col">
        {/* Navbar */}
        <div className="bg-green-900 px-6 py-4 sticky top-0 z-40 flex justify-between items-center shadow-lg border-b-4 border-yellow-500">
          <div className="flex items-center gap-3"><div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg border-2 border-green-800 text-green-900"><Utensils size={20} strokeWidth={2.5}/></div><div><h1 className="text-lg font-black text-yellow-400 tracking-wide leading-none">STOCK JIN</h1><p className="text-[10px] text-green-200 opacity-80">ข้าวมันไก่สไตล์สิงคโปร์</p></div></div>
          {user && <div className="w-8 h-8 bg-green-800 rounded-full flex items-center justify-center text-yellow-400 font-bold text-xs border border-green-700">{user.name.charAt(0)}</div>}
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto scrollbar-hide pb-24 bg-gray-50">
          {activeTab === 'dashboard' && user && <TabDashboard transactions={transactions} dateFilterType={dateFilterType} setDateFilterType={setDateFilterType} setCustomStartDate={setCustomStartDate} setCustomEndDate={setCustomEndDate} />}
          
          {activeTab === 'stock' && user && (
            <>
                {/* --- ส่วนแก้ปัญหา: แสดงสินค้าที่ไม่มีหมวดหมู่ (Ghost Products) --- */}
                {products.some(p => !p.category) && (
                  <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="text-red-500" size={20} />
                        <h3 className="text-red-700 font-bold text-sm">พบสินค้าตกหล่น (ไม่มีหมวดหมู่)</h3>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                      {products.filter(p => !p.category).map(p => (
                        <div key={p.id} className="flex justify-between items-center bg-white p-2 rounded border border-red-100 shadow-sm">
                          <span className="text-sm font-medium text-gray-700">{p.name}</span>
                          <button 
                            onClick={() => handleQuickDelete(p.id)}
                            className="flex items-center gap-1 text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200 transition-colors"
                          >
                            <Trash2 size={12} /> ลบทิ้ง
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* --- จบส่วนแก้ปัญหา --- */}

                <TabStock 
                    products={products} categories={categories}
                    isEditingStock={isEditingStock} setIsEditingStock={setIsEditingStock}
                    newProductMode={newProductMode} setNewProductMode={setNewProductMode}
                    showCatManager={showCatManager} setShowCatManager={setShowCatManager}
                    newCatData={newCatData} setNewCatData={setNewCatData}
                    newProdData={newProdData} setNewProdData={setNewProdData}
                    editFormData={editFormData} setEditFormData={setEditFormData}
                    editingProduct={editingProduct} setEditingProduct={setEditingProduct}
                    editingCategory={editingCategory} setEditingCategory={setEditingCategory}
                    handleAddProduct={handleAddProduct} handleSaveEdit={handleSaveEdit} handleDeleteProduct={handleDeleteProduct}
                    handleSaveCategory={handleSaveCategory} handleEditCategory={handleEditCategory} handleDeleteCategory={handleDeleteCategory}
                    collapsedCats={collapsedCats} toggleCollapse={toggleCollapse} openEditModal={openEditModal}
                    handleReorderStock={handleReorderStock}
                />
            </>
          )} 

          {activeTab === 'transaction' && user && <TabTransaction 
              products={products} categories={categories}
              transMode={transMode} setTransMode={setTransMode}
              selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}
              cart={cart} setCart={setCart} note={note} setNote={setNote}
              handleAddToCart={handleAddToCart} handleAdjustQty={handleAdjustQty} handleRemoveItem={handleRemoveItem} handleCartQtyChange={handleCartQtyChange}
              handleRequestTransaction={handleRequestTransaction} copyToClipboard={copyToClipboard} generateSummaryText={generateSummaryText}
          />}
          {activeTab === 'status' && user && <TabStatus 
              transactions={transactions} statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              verifyingTx={verifyingTx} setVerifyingTx={setVerifyingTx}
              actualQty={actualQty} setActualQty={setActualQty}
              openVerifyModal={openVerifyModal} handleVerifyAndSave={handleVerifyAndSave}
              copyToClipboard={copyToClipboard} generateSummaryText={generateSummaryText}
              handleVoidTransaction={handleVoidTransaction}
              handleEditCompletedTx={handleEditCompletedTx}
          />}
          {activeTab === 'menu' && <TabMenu 
              user={user} loginForm={loginForm} setLoginForm={setLoginForm} handleLogin={handleLogin} handleLogout={handleLogout} loginError={loginError}
              isRegisterMode={isRegisterMode} setIsRegisterMode={setIsRegisterMode}
              registerForm={registerForm} setRegisterForm={setRegisterForm}
              handleRegister={handleRegister} registerError={registerError}
              pendingUsers={pendingUsers} handleApproveUser={handleApproveUser} handleRejectUser={handleRejectUser}
          />}
        </div>

        {/* Bottom Nav */}
        {user && (
          <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200 px-6 py-2 flex justify-between items-center z-50 pb-8 safe-area-pb shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
            <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'dashboard' ? 'text-green-700 scale-110' : 'text-gray-400'}`}><LayoutDashboard size={24} strokeWidth={activeTab==='dashboard'?2.5:2}/><span className="text-[9px] font-bold">ภาพรวม</span></button>
            <button onClick={() => setActiveTab('stock')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'stock' ? 'text-green-700 scale-110' : 'text-gray-400'}`}><Package size={24} strokeWidth={activeTab==='stock'?2.5:2}/><span className="text-[9px] font-bold">คลัง</span></button>
            <div className="relative -top-8 group"><div className={`absolute inset-0 bg-yellow-400 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity ${activeTab === 'transaction' ? 'block' : 'hidden'}`}></div><button onClick={() => setActiveTab('transaction')} className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl shadow-green-900/30 border-[6px] border-gray-50 transition-all active:scale-90 ${activeTab === 'transaction' ? 'bg-gradient-to-br from-green-600 to-green-800 text-yellow-400 scale-110' : 'bg-gray-800 text-white'}`}><ArrowRightLeft size={28} strokeWidth={2.5} /></button></div>
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