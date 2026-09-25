'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  LayoutDashboard, ArrowRightLeft, Package, ClipboardList, Menu, Check, Loader2, Bell, ShieldAlert, Users
} from 'lucide-react';

// --- IMPORT COMPONENTS ---
import ConfirmModal from './components/ConfirmModal';
import TabDashboard from './components/TabDashboard';
import TabStock from './components/TabStock';
import TabTransaction from './components/TabTransaction';
import TabStatus from './components/TabStatus';
import TabMenu from './components/TabMenu';
import TabHR from './components/TabHR';
import TabDocuments from './components/TabDocuments';
import TabNotifications from './components/TabNotifications';
import TabUserDirectory from './components/TabUserDirectory';
import MoreDrawer from './components/MoreDrawer';
import DesktopSidebar from './components/DesktopSidebar';
import TopHeader from './components/TopHeader';
import SmartDashboardView from './components/SmartDashboardView';
import SmartRightPanel from './components/SmartRightPanel';
import ModernAuthView from './components/ModernAuthView';
import ModernPendingApproval from './components/ModernPendingApproval';
import { hasPermission, isAdmin } from './utils/permissions';
import * as Sentry from '@sentry/nextjs';

// --- IMPORT SERVICES ---
import { submitTransactionService, sendStockReportService, sendDailyReportService } from '@/app/services/transactionService';

// --- FIREBASE IMPORTS ---
import { db, auth, storage } from '@/lib/firebase';
import { 
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc, getDocs,
  serverTimestamp, query, orderBy, where, writeBatch
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword,
  GoogleAuthProvider, GithubAuthProvider, signInWithPopup
} from "firebase/auth";
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export default function StockJinApp() {
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [isDesktop, setIsDesktop] = useState(false);
  const [showMoreDrawer, setShowMoreDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dashboardSubTab, setDashboardSubTab] = useState('smart'); // 'smart' | 'analytics'

  // --- DESKTOP DETECTION ---
  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);
  
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
  const [newProdData, setNewProdData] = useState({ name: '', sku: '', unit: '', stock: 0, category: '', minStock: 5 });
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
  const [socialLoading, setSocialLoading] = useState(false);
  
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [registerError, setRegisterError] = useState('');
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [approvalHistory, setApprovalHistory] = useState([]);

  // --- NOTIFICATION STATE ---
  const [notifications, setNotifications] = useState([]);

  // --- CHECK AUTH STATUS ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();
            const uObj = {
              uid: currentUser.uid,
              id: currentUser.uid,
              email: currentUser.email || userData.email || '',
              name: userData.name || currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
              role: userData.role || 'staff',
              position: userData.position || (userData.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงานทั่วไป'),
              photoURL: userData.photoURL || currentUser.photoURL || null,
              status: userData.status || 'approved',
              provider: userData.provider || currentUser.providerData?.[0]?.providerId || 'password'
            };
            setUser(uObj);
            Sentry.setUser({
              id: currentUser.uid,
              email: currentUser.email,
              username: uObj.name,
              role: uObj.role,
            });
          } else {
            // New user registered via Google / GitHub or direct OAuth:
            const usersSnap = await getDocs(query(collection(db, 'users')));
            const isFirstUser = usersSnap.empty;

            const providerId = currentUser.providerData?.[0]?.providerId || 'password';
            const initialRole = isFirstUser ? 'admin' : 'staff';
            const initialStatus = isFirstUser ? 'approved' : 'pending';
            const initialPos = isFirstUser ? 'ผู้ดูแลระบบ' : 'พนักงานทั่วไป';
            const initialName = currentUser.displayName || currentUser.email?.split('@')[0] || (isFirstUser ? 'ผู้ดูแลระบบ (Owner)' : 'ผู้ใช้ใหม่');

            const newUserData = {
              name: initialName,
              email: currentUser.email || '',
              role: initialRole,
              position: initialPos,
              status: initialStatus,
              photoURL: currentUser.photoURL || null,
              provider: providerId,
              createdAt: serverTimestamp()
            };

            await setDoc(userRef, newUserData);

            const uObj = {
              uid: currentUser.uid,
              id: currentUser.uid,
              ...newUserData
            };
            setUser(uObj);
            Sentry.setUser({ id: currentUser.uid, email: currentUser.email, username: uObj.name, role: uObj.role });
          }
        } else {
          setUser(null);
          Sentry.setUser(null);
        }
      } catch (error) {
        console.error("Auth status change error:", error);
        signOut(auth).catch(e => console.error("Error signing out:", e));
        setUser(null);
        Sentry.setUser(null);
      } finally {
        setIsLoadingAuth(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- REAL-TIME STATUS LISTENER FOR PENDING USERS ---
  useEffect(() => {
    if (!user?.uid || user?.status !== 'pending') return;
    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status && data.status !== user.status) {
          setUser(prev => ({
            ...prev,
            status: data.status,
            role: data.role || prev?.role || 'staff',
            position: data.position || prev?.position || 'พนักงานทั่วไป'
          }));
          if (data.status === 'approved') {
            showNotification('บัญชีของคุณได้รับการอนุมัติเรียบร้อยแล้ว! ยินดีต้อนรับสู่ระบบ 🎉');
          }
        }
      }
    });
    return () => unsubUser();
  }, [user?.uid, user?.status]);

  const handleCheckUserStatus = async () => {
    if (!user?.uid) return;
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const data = snap.data();
        if (data.status) {
          setUser(prev => ({
            ...prev,
            status: data.status,
            role: data.role || prev?.role || 'staff',
            position: data.position || prev?.position || 'พนักงานทั่วไป'
          }));
          if (data.status === 'approved') {
            showNotification('บัญชีของคุณได้รับการอนุมัติแล้ว! 🎉');
          } else {
            showNotification('บัญชียังอยู่ระหว่างรอการอนุมัติ');
          }
        }
      }
    } catch (e) {
      console.error('Check status error:', e);
    }
  };

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
    let unsubLeaves = () => {};
    let unsubHist = () => {};

    if (user.role === 'admin') {
      const qPending = query(collection(db, 'users'), where('status', '==', 'pending'));
      unsubPending = onSnapshot(qPending, (snapshot) => {
        setPendingUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      const qLeaves = query(collection(db, 'leaves'), where('status', '==', 'pending'));
      unsubLeaves = onSnapshot(qLeaves, (snapshot) => {
        setPendingLeaves(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      const qHist = collection(db, 'approval_history');
      unsubHist = onSnapshot(qHist, (snapshot) => {
        const list = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => {
            const ta = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : (a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0);
            const tb = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : (b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0);
            return tb - ta;
          });
        setApprovalHistory(list);
      });
    }

    return () => { unsubProd(); unsubCat(); unsubTx(); unsubPending(); unsubLeaves(); unsubHist(); };
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
    return `StockPro\n${header} ${statusText}\n📅 ${tx.date}\n------------------\n${itemsList}\n------------------\n📝 Note: ${tx.note || '-'}\nผู้บันทึก: ${tx.recorder || 'Staff'}`;
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

  const handleDeleteHistory = (tx) => {
    if (user?.role !== 'admin') {
        return showNotification('เฉพาะผู้ดูแลระบบเท่านั้น!');
    }
    showConfirm(
        'ลบประวัติถาวร?', 'รายการนี้จะหายไปจากระบบทันที (ไม่มีผลกับสต็อก)', 
        async () => {
            await deleteDoc(doc(db, 'transactions', tx.id));
            setVerifyingTx(null); showNotification('ลบรายการเรียบร้อย');
        }, 'danger'
    );
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
    if (!reorderedItems || reorderedItems.length === 0) return;
    try {
      // 1. Optimistic Local State Update (Instant UI update, zero bounce/warp)
      const orderMap = {};
      reorderedItems.forEach((item, index) => {
        orderMap[item.id] = index;
      });

      setProducts(prevProducts => {
        return prevProducts.map(p => {
          if (orderMap[p.id] !== undefined) {
            return { ...p, order: orderMap[p.id] };
          }
          return p;
        });
      });

      // 2. Persist to Firestore database
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

  // --- ACTIONS: Request & Verify ---
  const handleRequestTransaction = async () => {
    if (cart.length === 0) return;
    showConfirm(
      `ยืนยันคำขอ ${transMode === 'IN' ? 'รับของ' : 'เบิกของ'}`, 
      `รายการจะถูกส่งไปที่หน้า "สถานะ" เพื่อรอการตรวจสอบและยืนยันยอดจริงอีกครั้ง`,
      async () => {
        try {
            await submitTransactionService({ cart, transMode, note, user });
            setCart([]); setNote('');
            showNotification('ส่งคำขอเรียบร้อย! (แจ้งเตือนไลน์แล้ว)');
            setActiveTab('status');
        } catch (error) {
            console.error(error); showNotification('เกิดข้อผิดพลาด กรุณาลองใหม่');
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

  const handleVerifyAndSave = async (extraItems = []) => {
    if (!verifyingTx) return;
    showConfirm(
      'ยืนยันยอดจริงถูกต้อง?', 'สต็อกจะถูกอัปเดตตามยอดนี้ และสถานะจะเปลี่ยนเป็นสำเร็จ',
      async () => {
        const finalItems = [...(verifyingTx.items || []), ...extraItems];
        const updatePromises = products.map(async (p) => {
          if (actualQty[p.id] !== undefined) {
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
        await updateDoc(txRef, { 
            status: 'completed', 
            items: finalItems,
            actualItems: actualQty, 
            verifiedBy: user ? user.name : 'Admin', 
            verifiedAt: new Date().toLocaleString('th-TH') 
        });
        setVerifyingTx(null); showNotification('อัปเดตสต็อกเรียบร้อย!');
      }, 'info'
    );
  };

  // --- [ฟังก์ชันใหม่] ส่งสต็อกเข้า LINE (รองรับการเลือกหมวดหมู่) ---
  const handleSendStockToLine = async (targetCategories = null, targetProducts = null) => {
    // ถ้าไม่มีค่าส่งมา ให้ใช้ทั้งหมด
    const catsToSend = targetCategories || categories;
    const prodsToSend = targetProducts || products;

    showNotification('กำลังส่งรายงาน... ⏳');

    try {
        await sendStockReportService({ 
            categories: catsToSend, 
            products: prodsToSend, 
            user 
        });
        showNotification('ส่งรายงานเรียบร้อย! ✅');
    } catch (error) {
        console.error(error);
        showNotification('ส่งไม่สำเร็จ ❌');
    }
  };

  // --- [ฟังก์ชันใหม่] ส่งสรุปยอดประจำวัน ---
  const handleSendDailyReport = async (reportType) => {
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
    
    const todayTx = transactions.filter(tx => 
        tx.status === 'completed' && 
        tx.timestamp >= todayStart.getTime() && 
        tx.timestamp <= todayEnd.getTime()
    );

    if (todayTx.length === 0) return showNotification('วันนี้ยังไม่มีรายการสำเร็จ');

    const aggregateItems = (type) => {
        const itemsMap = {};
        todayTx.filter(tx => tx.type === type).forEach(tx => {
            const items = tx.items || [];
            items.forEach(item => {
                const qty = (tx.actualItems && tx.actualItems[item.id] !== undefined) 
                            ? parseInt(tx.actualItems[item.id]) 
                            : item.qty;
                
                if (itemsMap[item.name]) {
                    itemsMap[item.name].totalQty += qty;
                } else {
                    itemsMap[item.name] = { ...item, totalQty: qty };
                }
            });
        });
        
        // เพิ่มการดึง Current Stock
        return Object.values(itemsMap)
            .filter(i => i.totalQty > 0)
            .map(item => {
                const realProduct = products.find(p => p.name === item.name); 
                return { 
                    ...item, 
                    currentStock: realProduct ? realProduct.stock : 0 
                };
            });
    };

    const summaryIn = aggregateItems('IN');
    const summaryOut = aggregateItems('OUT');

    showConfirm('ยืนยันส่งสรุปยอด?', `จะส่งสรุปยอดของ "วันนี้" เข้ากลุ่ม LINE`, async () => {
        try {
            await sendDailyReportService({ 
                reportType, 
                summaryIn, 
                summaryOut, 
                dateStr: new Date().toLocaleString('th-TH', { dateStyle: 'short' }), 
                user 
            });
            showNotification('ส่งสรุปเรียบร้อย! ✅');
        } catch (error) {
            showNotification('ส่งไม่สำเร็จ ❌');
        }
    }, 'info');
  };

  // CRUD Functions
  const handleAddProduct = async () => {
    if (!newProdData.name || !newProdData.category) return showNotification('กรุณากรอกชื่อและเลือกหมวดหมู่!');
    await addDoc(collection(db, 'products'), { ...newProdData, stock: parseInt(newProdData.stock)||0, minStock: parseInt(newProdData.minStock)||5, order: 9999, createdAt: serverTimestamp() });
    setNewProductMode(false); setNewProdData({ name: '', sku: '', unit: '', stock: 0, category: '', minStock: 5 }); showNotification('เพิ่มสินค้าแล้ว');
  };
  const openEditModal = (p) => { setEditingProduct(p); setEditFormData({ ...p }); };
  const handleSaveEdit = async () => {
    if (!editFormData.name) return showNotification('ห้ามเว้นว่าง!');
    await updateDoc(doc(db, 'products', editingProduct.id), { ...editFormData, stock: parseInt(editFormData.stock), minStock: parseInt(editFormData.minStock)||5 });
    setEditingProduct(null); showNotification('แก้ไขแล้ว');
  };
  const handleDeleteProduct = async () => { await deleteDoc(doc(db, 'products', editingProduct.id)); setEditingProduct(null); showNotification('ลบแล้ว'); };
  
  const handleSaveCategory = async () => {
    if(!newCatData.name) return showNotification('ใส่ชื่อหมวดด้วย!');
    if (editingCategory) {
        const batch = writeBatch(db);
        const catRef = doc(db, 'categories', editingCategory.id);
        batch.update(catRef, newCatData);
        if (editingCategory.name !== newCatData.name) {
            const q = query(collection(db, 'products'), where('category', '==', editingCategory.name));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((docSnap) => {
                const prodRef = doc(db, 'products', docSnap.id);
                batch.update(prodRef, { category: newCatData.name });
            });
        }
        await batch.commit();
    } else {
        await addDoc(collection(db, 'categories'), newCatData);
    }
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
    catch (error) { 
      console.error("Login Error:", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        setLoginError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      } else if (error.code === 'auth/too-many-requests') {
        setLoginError('ล็อกอินผิดหลายครั้ง กรุณารอสักครู่');
      } else {
        setLoginError('เกิดข้อผิดพลาด กรุณาลองใหม่');
      }
    }
  };

  // Social Auth Handlers
  const handleGoogleSignIn = async () => {
    setSocialLoading(true);
    setLoginError('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        // User closed popup
      } else if (error.code === 'auth/operation-not-allowed') {
        setLoginError('ยังไม่ได้เปิดใช้งาน Google Sign-In ใน Firebase Console (Authentication > Sign-in method)');
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        setLoginError('อีเมลนี้เคยลงทะเบียนด้วยวิธีอื่นไว้แล้ว กรุณาเข้าสู่ระบบด้วยวิธีเดิม');
      } else {
        setLoginError('เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google');
      }
    } finally {
      setSocialLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    setSocialLoading(true);
    setLoginError('');
    try {
      const provider = new GithubAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("GitHub Sign-In Error:", error);
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        // User closed popup
      } else if (error.code === 'auth/operation-not-allowed') {
        setLoginError('ยังไม่ได้เปิดใช้งาน GitHub Sign-In ใน Firebase Console (Authentication > Sign-in method)');
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        setLoginError('อีเมลนี้เคยลงทะเบียนด้วยวิธีอื่นไว้แล้ว');
      } else {
        setLoginError('เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย GitHub');
      }
    } finally {
      setSocialLoading(false);
    }
  };

  const handleRegister = async () => {
    const trimmedName = (registerForm.name || '').trim();
    if (!trimmedName || !registerForm.email || !registerForm.password || !registerForm.confirmPassword) {
      setRegisterError('กรุณากรอกข้อมูลให้ครบถ้วน'); return;
    }
    const nameParts = trimmedName.split(/\s+/);
    if (nameParts.length < 2) {
      setRegisterError('กรุณากรอกทั้งชื่อจริงและนามสกุล (เว้นวรรคระหว่างชื่อและนามสกุล เช่น สมชาย ใจดี)'); return;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      setRegisterError('รหัสผ่านไม่ตรงกัน'); return;
    }
    setRegisterError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, registerForm.email, registerForm.password);
      const newUser = userCredential.user;
      // สถานะ pending — ต้องรอ Admin อนุมัติ
      const newUserData = {
        name: trimmedName,
        email: registerForm.email,
        role: 'staff',
        position: 'พนักงานทั่วไป',
        status: 'pending',
        provider: 'password',
        createdAt: serverTimestamp()
      };
      await setDoc(doc(db, 'users', newUser.uid), newUserData);
      setUser({
        uid: newUser.uid,
        id: newUser.uid,
        ...newUserData
      });
      showNotification('สมัครสมาชิกสำเร็จ บัญชีของคุณอยู่ระหว่างรอการอนุมัติ');
    } catch (error) {
      console.error("Register Error:", error);
      if (error.code === 'auth/email-already-in-use') setRegisterError('อีเมลนี้ถูกใช้งานแล้ว');
      else if (error.code === 'auth/weak-password') setRegisterError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      else setRegisterError('เกิดข้อผิดพลาดในการสมัคร');
    }
  };

  const handleLogout = async () => { 
    try { 
      await signOut(auth); 
      setUser(null); 
      setActiveTab('dashboard'); 
      setLoginForm({ username: '', password: '' }); 
      setNotifications([]); 
    } catch (error) { 
      console.error("Logout Error:", error); 
    } 
  };

  // --- UPDATE PROFILE (ชื่อ + รูปโปรไฟล์ + ข้อมูลส่วนตัว) ---
  const handleUpdateProfile = async (newName, photoFile, shouldRemovePhoto = false, extraData = {}) => {
    if (!user || !user.uid) throw new Error('User not found');
    const userRef = doc(db, 'users', user.uid);
    const updateData = { name: newName, ...extraData };

    // อัปโหลดรูปใหม่
    if (photoFile) {
      const storageRef = ref(storage, `profile_photos/${user.uid}`);
      await uploadBytes(storageRef, photoFile);
      const downloadURL = await getDownloadURL(storageRef);
      updateData.photoURL = downloadURL;
    } else if (shouldRemovePhoto) {
      // ลบรูปเดิม
      try {
        const storageRef = ref(storage, `profile_photos/${user.uid}`);
        await deleteObject(storageRef);
      } catch (e) {
        // ไม่เป็นไรถ้าไม่มีรูปเดิม
        console.log('No existing photo to delete');
      }
      updateData.photoURL = null;
    }

    await updateDoc(userRef, updateData);

    // อัปเดต local state ทันที
    setUser(prev => ({
      ...prev,
      name: newName,
      ...extraData,
      ...(photoFile ? { photoURL: updateData.photoURL } : {}),
      ...(shouldRemovePhoto ? { photoURL: null } : {})
    }));
    showNotification('อัปเดตโปรไฟล์เรียบร้อย! ✅');
  };

  const handleApproveUser = async (targetUser, position, role = 'staff') => {
    if (!targetUser || !targetUser.id) return;
    try {
      const assignedPos = position || 'พนักงานทั่วไป';
      await updateDoc(doc(db, 'users', targetUser.id), {
        status: 'approved',
        position: assignedPos,
        role: role,
        approvedAt: serverTimestamp(),
        approvedBy: user?.name || 'Admin'
      });

      // บันทึกประวัติการอนุมัติใน Firestore collection 'approval_history'
      await addDoc(collection(db, 'approval_history'), {
        userId: targetUser.id,
        userName: targetUser.name || 'ไม่ระบุชื่อ',
        userEmail: targetUser.email || '',
        position: assignedPos,
        role: role,
        action: 'approved',
        approvedBy: user?.name || 'Admin',
        timestamp: serverTimestamp(),
      });

      showNotification(`อนุมัติคุณ ${targetUser.name} (${assignedPos}) เรียบร้อย`);
    } catch (error) {
      console.error("Approve error:", error);
      showNotification("เกิดข้อผิดพลาดในการอนุมัติ");
    }
  };

  const handleRejectUser = async (targetUser) => {
    if (!targetUser || !targetUser.id) return;
    try {
      await deleteDoc(doc(db, 'users', targetUser.id));

      // บันทึกประวัติการปฏิเสธใน Firestore collection 'approval_history'
      await addDoc(collection(db, 'approval_history'), {
        userId: targetUser.id,
        userName: targetUser.name || 'ไม่ระบุชื่อ',
        userEmail: targetUser.email || '',
        action: 'rejected',
        approvedBy: user?.name || 'Admin',
        timestamp: serverTimestamp(),
      });

      showNotification('ปฏิเสธการสมัครเรียบร้อย');
    } catch (error) {
      console.error("Reject error:", error);
      showNotification("เกิดข้อผิดพลาดในการปฏิเสธ");
    }
  };

  // --- AUTO-GENERATE NOTIFICATIONS ---
  const generateNotifications = useCallback(() => {
    if (!user || user.status === 'pending') return;
    const notifs = [];
    let notifId = 0;

    // 1. สินค้าหมด (stock = 0)
    const outOfStock = products.filter(p => p.stock === 0);
    if (outOfStock.length > 0) {
      notifs.push({
        id: `stock_out_${Date.now()}`,
        category: 'stock',
        severity: 'critical',
        title: `🔴 สินค้าหมด ${outOfStock.length} รายการ`,
        message: `มีสินค้าที่สต็อกเป็น 0 ต้องสั่งเพิ่มด่วน!`,
        items: outOfStock.map(p => p.name),
        timestamp: Date.now(),
        read: false,
        navigateTo: 'stock'
      });
    }

    // 2. สินค้าใกล้หมด (stock > 0 && stock <= minStock ของแต่ละสินค้า)
    const lowStock = products.filter(p => {
      const threshold = p.minStock || 5;
      return p.stock > 0 && p.stock <= threshold;
    });
    if (lowStock.length > 0) {
      notifs.push({
        id: `stock_low_${Date.now()}`,
        category: 'stock',
        severity: 'warning',
        title: `⚠️ สินค้าใกล้หมด ${lowStock.length} รายการ`,
        message: `สินค้าที่คงเหลือต่ำกว่าขั้นต่ำที่ตั้งไว้`,
        items: lowStock.map(p => `${p.name} (เหลือ ${p.stock}/${p.minStock || 5})`),
        timestamp: Date.now(),
        read: false,
        navigateTo: 'stock'
      });
    }

    // 3. รายการรอตรวจสอบ
    const pendingTx = transactions.filter(tx => tx.status === 'pending');
    if (pendingTx.length > 0) {
      notifs.push({
        id: `tx_pending_${Date.now()}`,
        category: 'movement',
        subType: 'OUT',
        title: `📋 รายการรอตรวจสอบ ${pendingTx.length} รายการ`,
        message: `มีรายการเบิก/รับสินค้าที่ยังไม่ได้ยืนยัน`,
        items: pendingTx.slice(0, 5).map(tx => `${tx.type === 'IN' ? 'รับ' : 'เบิก'} ${(tx.items||[]).length} รายการ โดย ${tx.recorder}`),
        timestamp: Date.now(),
        read: false,
        navigateTo: 'status'
      });
    }

    // 4. รายการสำเร็จวันนี้
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayCompleted = transactions.filter(tx => tx.status === 'completed' && tx.timestamp >= todayStart.getTime());
    if (todayCompleted.length > 0) {
      const inCount = todayCompleted.filter(t => t.type === 'IN').length;
      const outCount = todayCompleted.filter(t => t.type === 'OUT').length;
      notifs.push({
        id: `tx_today_${Date.now()}`,
        category: 'dashboard',
        title: `📊 สรุปวันนี้: ${todayCompleted.length} รายการสำเร็จ`,
        message: `รับเข้า ${inCount} รายการ | เบิกออก ${outCount} รายการ`,
        timestamp: Date.now(),
        read: false,
        navigateTo: 'dashboard'
      });
    }

    // 5. คำขอสมัครสมาชิก (เฉพาะ Admin)
    if (isAdmin(user) && pendingUsers.length > 0) {
      notifs.push({
        id: `user_pending_${Date.now()}`,
        category: 'user',
        title: `👤 คำขอสมัครสมาชิก ${pendingUsers.length} คน`,
        message: `มีผู้ใช้ใหม่รอการอนุมัติจากคุณ`,
        items: pendingUsers.map(u => `${u.name} (${u.email})`),
        timestamp: Date.now(),
        read: false,
        navigateTo: 'menu'
      });
    }

    // 6. คำขอลาหยุดงานรออนุมัติ (เฉพาะ Admin / เจ้าของร้าน)
    if (isAdmin(user) && pendingLeaves.length > 0) {
      notifs.push({
        id: `leave_pending_${Date.now()}`,
        category: 'hr',
        title: `📝 คำขอลาใหม่รออนุมัติ ${pendingLeaves.length} รายการ`,
        message: `มีพนักงานส่งคำขอลางานรอการพิจารณาอนุมัติ`,
        items: pendingLeaves.map(l => `${l.userName || 'พนักงาน'} ขอ${l.type === 'sick' ? 'ลาป่วย' : l.type === 'personal' ? 'ลากิจ' : 'ลาพักร้อน'} (${l.startDate} ถึง ${l.endDate})`),
        timestamp: Date.now(),
        read: false,
        navigateTo: 'hr'
      });
    }

    setNotifications(notifs);
  }, [products, transactions, pendingUsers, pendingLeaves, user]);

  // สร้าง notifications ทุกครั้งที่ข้อมูลเปลี่ยน
  useEffect(() => {
    generateNotifications();
  }, [generateNotifications]);

  // นับ unread
  const unreadNotifCount = useMemo(() => {
    return notifications.filter(n => {
      if (n.category === 'user' && !isAdmin(user)) return false;
      if (n.category === 'hr' && !isAdmin(user)) return false;
      return !n.read;
    }).length;
  }, [notifications, user]);

  // Mark as read
  const handleMarkAsRead = (notifId) => {
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
  };
  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };
  const handleDismissNotif = (notifId) => {
    setNotifications(prev => prev.filter(n => n.id !== notifId));
  };
  const handleNotifNavigate = (tab) => {
    setActiveTab(tab);
  };

  // --- TAB TITLES (for desktop header) ---
  const tabTitles = {
    dashboard: { title: 'ภาพรวม', desc: 'ดูสรุปยอดขาย รายรับ-รายจ่าย และสถิติต่างๆ' },
    stock: { title: 'จัดการวัตถุดิบและสินค้าคงคลัง', desc: 'ติดตามสต็อกสินค้า เพิ่ม/แก้ไข หมวดหมู่และรายการสินค้า' },
    transaction: { title: 'เบิก / รับสินค้า', desc: 'บันทึกรายการเบิกสินค้าออกหรือรับสินค้าเข้าคลัง' },
    status: { title: 'สถานะรายการ', desc: 'ตรวจสอบและยืนยันรายการที่รอดำเนินการ' },
    notifications: { title: 'ศูนย์แจ้งเตือน', desc: 'แจ้งเตือนสินค้าหมด การเคลื่อนไหว และคำขอสมัครสมาชิก' },
    hr: { title: 'เข้า-ออกงาน / ลาหยุด', desc: 'บันทึกเวลาทำงาน ยื่นใบลาหยุด และดูสถิติทีมงาน' },
    documents: { title: 'เอกสาร', desc: 'เก็บและจัดการเอกสารสำคัญต่างๆ เช่น ใบสั่งซื้อ ใบเสร็จ สัญญา' },
    menu: { title: 'ตั้งค่าและบัญชีผู้ใช้', desc: 'จัดการบัญชี สิทธิ์การเข้าถึง และการตั้งค่าระบบ' },
    users: { title: 'จัดการบัญชีผู้ใช้', desc: 'ตรวจสอบจำนวนบัญชี ดูพนักงานแต่ละหน่วยงาน และจัดการสิทธิ์' },
  };

  // --- SHARED TAB CONTENT ---
  const renderTabContent = () => (
    <>
      {activeTab === 'dashboard' && user && (
        dashboardSubTab === 'smart' ? (
          <SmartDashboardView 
            user={user}
            products={products}
            transactions={transactions}
            categories={categories}
            setActiveTab={setActiveTab}
          />
        ) : (
          <TabDashboard 
            transactions={transactions} 
            products={products}
            categories={categories}
            dateFilterType={dateFilterType} 
            setDateFilterType={setDateFilterType} 
            setCustomStartDate={setCustomStartDate} 
            setCustomEndDate={setCustomEndDate}
            handleSendDailyReport={handleSendDailyReport}
          />
        )
      )}
      {activeTab === 'stock' && user && <TabStock 
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
          copyToClipboard={copyToClipboard}
          handleSendStockToLine={handleSendStockToLine}
          user={user}
      />} 
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
          user={user}
          handleDeleteHistory={handleDeleteHistory}
          products={products}
      />}
      {activeTab === 'notifications' && user && <TabNotifications
          user={user}
          notifications={notifications}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          onDismiss={handleDismissNotif}
          onNavigate={handleNotifNavigate}
      />}
      {activeTab === 'hr' && user && <TabHR user={user} />}
      {activeTab === 'documents' && <TabDocuments user={user} />}
      {activeTab === 'menu' && <TabMenu 
          user={user} loginForm={loginForm} setLoginForm={setLoginForm} handleLogin={handleLogin} handleLogout={handleLogout} loginError={loginError}
          isRegisterMode={isRegisterMode} setIsRegisterMode={setIsRegisterMode}
          registerForm={registerForm} setRegisterForm={setRegisterForm}
          handleRegister={handleRegister} registerError={registerError}
          pendingUsers={pendingUsers} approvalHistory={approvalHistory} handleApproveUser={handleApproveUser} handleRejectUser={handleRejectUser}
          handleUpdateProfile={handleUpdateProfile}
      />}
      {activeTab === 'users' && user && isAdmin(user) && <TabUserDirectory user={user} />}
    </>
  );

  // --- RENDER MAIN ---
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f4f5fa]">
        <div className="text-center space-y-3">
          <Loader2 size={40} className="animate-spin text-[#6355d8] mx-auto"/>
          <p className="text-slate-700 font-bold animate-pulse">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  // หน้ารอการอนุมัติ (Pending Approval)
  if (user && user.status === 'pending') {
    return (
      <ModernPendingApproval 
        user={user} 
        handleLogout={handleLogout} 
        onCheckStatus={handleCheckUserStatus} 
      />
    );
  }

  // ยังไม่ได้เข้าสู่ระบบ (Modern Auth View)
  if (!user) {
    return (
      <ModernAuthView 
        loginForm={loginForm}
        setLoginForm={setLoginForm}
        handleLogin={handleLogin}
        loginError={loginError}
        isRegisterMode={isRegisterMode}
        setIsRegisterMode={setIsRegisterMode}
        registerForm={registerForm}
        setRegisterForm={setRegisterForm}
        handleRegister={handleRegister}
        registerError={registerError}
        handleGoogleSignIn={handleGoogleSignIn}
        handleGithubSignIn={handleGithubSignIn}
        socialLoading={socialLoading}
      />
    );
  }

  // ========================
  // DESKTOP LAYOUT (≥1024px)
  // ========================
  if (isDesktop && user) {
    return (
      <div className="smart-layout font-sans text-gray-800 selection:bg-purple-100">
        <DesktopSidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          user={user} 
          handleLogout={handleLogout}
          unreadNotifCount={unreadNotifCount}
        />
        <div className="smart-main-wrapper flex-1 flex flex-col min-h-screen overflow-x-hidden">
          {/* Top Header */}
          <TopHeader 
            user={user}
            unreadNotifCount={unreadNotifCount}
            setActiveTab={setActiveTab}
            handleLogout={handleLogout}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSearchSubmit={(q) => {
              if (q) setActiveTab('stock');
            }}
          />

          {/* Desktop Content Grid */}
          <main className={`smart-content-grid flex-1 ${activeTab === 'dashboard' ? 'has-right-panel' : ''}`}>
            {/* Main Area */}
            <div className="space-y-6 min-w-0 max-w-full">
              {activeTab === 'dashboard' ? (
                <>
                  {/* Mode Switcher */}
                  <div className="flex items-center justify-between px-1 -mb-2">
                    <div className="text-xs font-bold text-gray-500">
                      ภาพรวมระบบและสถานะคลัง
                    </div>
                    <div className="bg-white p-1 rounded-2xl shadow-xs border border-gray-100 flex text-xs font-bold">
                      <button 
                        onClick={() => setDashboardSubTab('smart')}
                        className={`px-4 py-1.5 rounded-xl transition-all ${dashboardSubTab === 'smart' ? 'bg-[#6355d8] text-white shadow-xs' : 'text-gray-500 hover:text-gray-800'}`}
                      >
                        🏡 หน้าจอควบคุม (Smart Controls)
                      </button>
                      <button 
                        onClick={() => setDashboardSubTab('analytics')}
                        className={`px-4 py-1.5 rounded-xl transition-all ${dashboardSubTab === 'analytics' ? 'bg-[#6355d8] text-white shadow-xs' : 'text-gray-500 hover:text-gray-800'}`}
                      >
                        📊 รายงานและสถิติ (Analytics)
                      </button>
                    </div>
                  </div>

                  {dashboardSubTab === 'smart' ? (
                    <SmartDashboardView 
                      user={user}
                      products={products}
                      transactions={transactions}
                      categories={categories}
                      setActiveTab={setActiveTab}
                    />
                  ) : (
                    <div className="smart-tab-container">
                      <TabDashboard 
                        transactions={transactions} 
                        products={products}
                        categories={categories}
                        dateFilterType={dateFilterType} 
                        setDateFilterType={setDateFilterType} 
                        setCustomStartDate={setCustomStartDate} 
                        setCustomEndDate={setCustomEndDate}
                        handleSendDailyReport={handleSendDailyReport}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="smart-tab-container">
                  <div className="mb-4 pb-3 border-b border-gray-100 flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-black text-gray-800 tracking-tight">
                        {tabTitles[activeTab]?.title || 'StockPro'}
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {tabTitles[activeTab]?.desc || ''}
                      </p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('dashboard')}
                      className="text-xs font-bold text-[#6355d8] hover:underline"
                    >
                      ← กลับหน้าหลัก
                    </button>
                  </div>
                  {renderTabContent()}
                </div>
              )}
            </div>

            {/* Right Panel (Shown ONLY on Dashboard tab) */}
            {activeTab === 'dashboard' && (
              <div className="hidden xl:block shrink-0">
                <SmartRightPanel 
                  user={user}
                  transactions={transactions}
                  products={products}
                />
              </div>
            )}
          </main>
        </div>

        <ConfirmModal isOpen={modalConfig.isOpen} title={modalConfig.title} message={modalConfig.message} type={modalConfig.type} onConfirm={modalConfig.onConfirm} onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))} />
        {showToast && <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-slate-800/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl z-[70] flex items-center gap-3 animate-bounce-in whitespace-nowrap border border-white/10"><div className="bg-[#6355d8] rounded-full p-0.5 text-white"><Check size={14} strokeWidth={3}/></div> {toastMsg}</div>}
      </div>
    );
  }

  // ========================
  // MOBILE LAYOUT (<1024px)
  // ========================
  return (
    <div className="bg-[#f4f5fa] min-h-screen font-sans text-gray-800 flex justify-center selection:bg-purple-100">
      <div className="w-full max-w-md bg-[#f4f5fa] h-[100dvh] shadow-2xl relative overflow-hidden flex flex-col">
        {/* Navbar */}
        <div className="bg-[#6355d8] px-5 py-3.5 sticky top-0 z-40 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-xs">
              <Package size={20} strokeWidth={2.5}/>
            </div>
            <div>
              <h1 className="text-base font-black text-white tracking-wide leading-none">StockPro</h1>
              <p className="text-[10px] text-white/80 mt-0.5">Inventory & Workforce Platform</p>
            </div>
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <button onClick={() => setActiveTab('notifications')} className="relative p-1.5 rounded-full hover:bg-white/10 transition-colors text-white">
                <Bell size={18} />
                {unreadNotifCount > 0 && <span className="smart-notif-dot">{unreadNotifCount > 9 ? '9+' : unreadNotifCount}</span>}
              </button>
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-xs border border-white/30 overflow-hidden">
                {user.photoURL ? <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" /> : user.name.charAt(0)}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto scrollbar-hide pb-24 space-y-4">
          {activeTab === 'dashboard' ? (
            <>
              {/* Mobile Sub-tab switch */}
              <div className="flex bg-white p-1 rounded-2xl shadow-xs border border-gray-100 text-xs font-bold">
                <button 
                  onClick={() => setDashboardSubTab('smart')}
                  className={`flex-1 py-1.5 rounded-xl transition-all ${dashboardSubTab === 'smart' ? 'bg-[#6355d8] text-white shadow-xs' : 'text-gray-500'}`}
                >
                  🏡 สมาร์ทโฮม
                </button>
                <button 
                  onClick={() => setDashboardSubTab('analytics')}
                  className={`flex-1 py-1.5 rounded-xl transition-all ${dashboardSubTab === 'analytics' ? 'bg-[#6355d8] text-white shadow-xs' : 'text-gray-500'}`}
                >
                  📊 สถิติสต็อก
                </button>
              </div>

              {dashboardSubTab === 'smart' ? (
                <>
                  <SmartDashboardView 
                    user={user}
                    products={products}
                    transactions={transactions}
                    categories={categories}
                    setActiveTab={setActiveTab}
                  />
                  <div className="mt-4">
                    <SmartRightPanel 
                      user={user}
                      transactions={transactions}
                      products={products}
                    />
                  </div>
                </>
              ) : (
                renderTabContent()
              )}
            </>
          ) : (
            renderTabContent()
          )}
        </div>

        {/* Bottom Nav */}
        {user && (
          <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200 px-6 py-2 flex justify-between items-center z-50 pb-8 safe-area-pb shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
            <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'dashboard' ? 'text-[#6355d8] scale-110' : 'text-gray-400'}`}><LayoutDashboard size={22} strokeWidth={activeTab==='dashboard'?2.5:2}/><span className="text-[9px] font-bold">ภาพรวม</span></button>
            <button onClick={() => setActiveTab('stock')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'stock' ? 'text-[#6355d8] scale-110' : 'text-gray-400'}`}><Package size={22} strokeWidth={activeTab==='stock'?2.5:2}/><span className="text-[9px] font-bold">คลัง</span></button>
            <div className="relative -top-8 group"><div className={`absolute inset-0 bg-purple-400 rounded-full blur-xl opacity-40 group-hover:opacity-60 transition-opacity ${activeTab === 'transaction' ? 'block' : 'hidden'}`}></div><button onClick={() => setActiveTab('transaction')} className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl shadow-purple-900/30 border-[6px] border-[#f4f5fa] transition-all active:scale-90 ${activeTab === 'transaction' ? 'bg-[#6355d8] text-white scale-110' : 'bg-gray-800 text-white'}`}><ArrowRightLeft size={28} strokeWidth={2.5} /></button></div>
            <button onClick={() => setActiveTab('status')} className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'status' ? 'text-[#6355d8] scale-110' : 'text-gray-400'}`}><ClipboardList size={22} strokeWidth={activeTab==='status'?2.5:2}/><span className="text-[9px] font-bold">สถานะ</span></button>
            <button
              onClick={() => setShowMoreDrawer(true)}
              className={`flex flex-col items-center gap-1 transition-all ${ ['hr','documents','menu','notifications'].includes(activeTab) ? 'text-[#6355d8] scale-110' : 'text-gray-400'}`}
            >
              <div className="relative">
                <Menu size={22} strokeWidth={['hr','documents','menu','notifications'].includes(activeTab)?2.5:2}/>
                {(['hr','documents','menu','notifications'].includes(activeTab) || unreadNotifCount > 0) && (
                  <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${unreadNotifCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-[#6355d8]'}`} />
                )}
              </div>
              <span className="text-[9px] font-bold">อื่นๆ</span>
            </button>
          </div>
        )}

        {/* More Drawer */}
        <MoreDrawer
          isOpen={showMoreDrawer}
          onClose={() => setShowMoreDrawer(false)}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={user}
        />
        
        <ConfirmModal isOpen={modalConfig.isOpen} title={modalConfig.title} message={modalConfig.message} type={modalConfig.type} onConfirm={modalConfig.onConfirm} onCancel={() => setModalConfig(prev => ({ ...prev, isOpen: false }))} />
        {showToast && <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-slate-800/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-2xl z-[70] flex items-center gap-3 animate-bounce-in whitespace-nowrap border border-white/10"><div className="bg-[#6355d8] rounded-full p-0.5 text-white"><Check size={14} strokeWidth={3}/></div> {toastMsg}</div>}
      </div>
    </div>
  );
}