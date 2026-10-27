// app/components/TabDocuments.js
'use client';
import React, { useState, useEffect } from 'react';
import {
  FolderOpen, Plus, Search, ExternalLink, Trash2, FileText,
  Image, File, Link2, X, ChevronDown, Download, Copy, Star, Eye
} from 'lucide-react';
import { db } from '@/lib/firebase';
import {
  collection, addDoc, onSnapshot, deleteDoc, doc,
  query, orderBy, serverTimestamp, updateDoc
} from 'firebase/firestore';

const DOC_CATEGORIES = [
  { value: 'all', label: 'ทั้งหมด', icon: '📁' },
  { value: 'order', label: 'ใบรับเข้า / สั่งของ', icon: '📥' },
  { value: 'receipt', label: 'ใบเบิก / ใบเสร็จ', icon: '📤' },
  { value: 'leave', label: 'ใบลา / คำขอ', icon: '📋' },
  { value: 'contract', label: 'สัญญา', icon: '📝' },
  { value: 'image', label: 'รูปภาพ', icon: '🖼️' },
  { value: 'other', label: 'อื่นๆ', icon: '📄' },
];

const getFileIcon = (url = '', type, name = '') => {
  if (type === 'order' || name?.includes('ใบรับสินค้า') || name?.includes('GRN')) return <FileText size={20} className="text-success-600" />;
  if (type === 'receipt' || name?.includes('ใบเบิก') || name?.includes('GIS')) return <FileText size={20} className="text-rose-600" />;
  if (type === 'leave' || name?.includes('ใบขอลา') || name?.includes('ใบลา')) return <FileText size={20} className="text-purple-600" />;
  if (type === 'image') return <Image size={20} className="text-blue-500" />;
  if (url.includes('drive.google')) return <File size={20} className="text-yellow-600" />;
  if (url.includes('line') || url.includes('chat')) return <Link2 size={20} className="text-success-600" />;
  return <FileText size={20} className="text-gray-500" />;
};

// Official documents carry a number like GRN-20261012-VFES; that is what people search and scan for
const docNumberOf = (name = '') => (name.match(/(?:GRN|GIS)-[A-Z0-9-]+/i) || [])[0] || '';

const formatDate = (ts) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' });
};

export default function TabDocuments({ user }) {
  const [docs, setDocs] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', url: '', category: 'other', note: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState('');
  const [starredOnly, setStarredOnly] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);

  const showNote = (msg) => { setNotification(msg); setTimeout(() => setNotification(''), 2500); };

  useEffect(() => {
    const q = collection(db, 'documents');
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return tb - ta;
        });
      setDocs(list);
    }, (error) => {
      console.error("Documents listener error:", error);
    });
    return () => unsub();
  }, []);

  const handleAdd = async () => {
    if (!formData.name.trim()) return showNote('กรุณาระบุชื่อเอกสาร');
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'documents'), {
        ...formData,
        createdBy: user?.name || 'Unknown',
        createdAt: serverTimestamp(),
        starred: false,
      });
      setFormData({ name: '', url: '', category: 'other', note: '' });
      setShowAddForm(false);
      showNote('✅ เพิ่มเอกสารแล้ว!');
    } catch (e) { showNote('เกิดข้อผิดพลาด'); }
    setIsSubmitting(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('ลบเอกสารนี้?')) return;
    try {
      await deleteDoc(doc(db, 'documents', id));
      showNote('ลบแล้ว');
    } catch (e) { showNote('ลบไม่สำเร็จ'); }
  };

  const handleToggleStar = async (item) => {
    try {
      await updateDoc(doc(db, 'documents', item.id), { starred: !item.starred });
    } catch (e) {}
  };

  const handleCopyLink = (url) => {
    if (!url) return showNote('ไม่มีลิงก์');
    navigator.clipboard.writeText(url).then(() => showNote('คัดลอกลิงก์แล้ว!')).catch(() => showNote('คัดลอกไม่ได้'));
  };

  const handleDownloadDoc = (item) => {
    if (!item?.url) return showNote('ไม่มีไฟล์เอกสาร');
    try {
      const isDataUri = item.url.startsWith('data:');
      const isBlob = item.url.startsWith('blob:');
      
      const link = document.createElement('a');
      link.href = item.url;
      link.download = item.name || 'document.pdf';
      if (!isDataUri && !isBlob) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showNote('กำลังดาวน์โหลดเอกสาร...');
    } catch (err) {
      console.error('Download error:', err);
      window.open(item.url, '_blank');
    }
  };

  const handleOpenDoc = (item) => {
    if (!item?.url) return showNote('ไม่มีลิงก์หรือไฟล์เอกสาร');
    // If it's a PDF data URI or storage URL, open with in-app viewer modal
    if (item.url.startsWith('data:application/pdf') || item.url.endsWith('.pdf') || item.name?.toLowerCase().endsWith('.pdf') || item.url.includes('documents/')) {
      setViewingDoc(item);
    } else {
      window.open(item.url, '_blank');
    }
  };

  // Filter
  let filtered = docs;
  if (activeCategory !== 'all') filtered = filtered.filter(d => d.category === activeCategory);
  if (starredOnly) filtered = filtered.filter(d => d.starred);
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(d => 
      d.name?.toLowerCase().includes(q) || 
      d.note?.toLowerCase().includes(q) ||
      d.docNumber?.toLowerCase().includes(q) ||
      d.createdBy?.toLowerCase().includes(q)
    );
  }

  const catInfo = (val) => DOC_CATEGORIES.find(c => c.value === val) || DOC_CATEGORIES[DOC_CATEGORIES.length - 1];

  return (
    <div className="docs-tab">
      {notification && <div className="hr-toast">{notification}</div>}

      {/* Header */}
      <div className="docs-header">
        <div className="docs-search-row">
          <div className="docs-search-box">
            <Search size={15} className="docs-search-icon" />
            <input
              type="text"
              placeholder="ค้นหาเอกสาร (ชื่อ, เลขที่, หมายเหตุ)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="docs-search-input"
            />
          </div>
          <button
            className={`docs-star-filter ${starredOnly ? 'active' : ''}`}
            onClick={() => setStarredOnly(!starredOnly)}
            title="เฉพาะที่ปักหมุด"
          >
            <Star size={16} fill={starredOnly ? '#f59e0b' : 'none'} color={starredOnly ? '#f59e0b' : '#9ca3af'} />
          </button>
          <button className="docs-add-btn" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? <X size={16} /> : <Plus size={16} />}
            {showAddForm ? '' : 'เพิ่ม'}
          </button>
        </div>

        {/* Category tabs */}
        <div className="docs-categories">
          {DOC_CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`docs-cat-btn ${activeCategory === cat.value ? 'active' : ''}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="docs-add-form">
          <h3 className="docs-form-title"><Plus size={16} /> เพิ่มเอกสารใหม่</h3>
          <div className="hr-form-group">
            <label>ชื่อเอกสาร *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
              className="hr-input"
              placeholder="เช่น ใบสั่งซื้อ มิถุนายน 2567"
            />
          </div>
          <div className="hr-form-group">
            <label>ลิงก์เอกสาร (Google Drive, LINE, URL)</label>
            <input
              type="url"
              value={formData.url}
              onChange={e => setFormData(f => ({ ...f, url: e.target.value }))}
              className="hr-input"
              placeholder="https://drive.google.com/..."
            />
          </div>
          <div className="hr-form-group">
            <label>หมวดหมู่</label>
            <select
              value={formData.category}
              onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}
              className="hr-input"
            >
              {DOC_CATEGORIES.filter(c => c.value !== 'all').map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="hr-form-group">
            <label>หมายเหตุ</label>
            <input
              type="text"
              value={formData.note}
              onChange={e => setFormData(f => ({ ...f, note: e.target.value }))}
              className="hr-input"
              placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
            />
          </div>
          <button className="hr-submit-leave-btn" onClick={handleAdd} disabled={isSubmitting}>
            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกเอกสาร'}
          </button>
        </div>
      )}

      {/* Count */}
      <div className="docs-count">
        {filtered.length} เอกสาร {activeCategory !== 'all' && `· ${catInfo(activeCategory).label}`}
      </div>

      {/* Documents Grid */}
      {filtered.length === 0 ? (
        <div className="docs-empty">
          <FolderOpen size={40} className="text-gray-300" />
          <p>ยังไม่มีเอกสาร</p>
          <span>เมื่อมีการรับเข้าหรือเบิกออก เอกสาร PDF ทางการจะถูกเก็บลงที่นี่ให้อัตโนมัติ</span>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const cat = catInfo(item.category);
            const iconBtn = 'w-9 h-9 rounded-control flex items-center justify-center text-ink-subtle hover:bg-white/80 transition-colors';
            return (
              <div
                key={item.id}
                className="glass rounded-card pl-3 pr-1.5 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-white/80 transition-colors"
                onClick={() => handleOpenDoc(item)}
              >
                <div className="w-10 h-10 rounded-control bg-white/80 flex items-center justify-center shrink-0">{getFileIcon(item.url, item.category, item.name)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-ink truncate">{docNumberOf(item.name) || (item.name || '').replace(/\.pdf$/i, '').replace(/_/g, ' ')}</p>
                  <p className="text-xs text-ink-subtle truncate mt-0.5">{docNumberOf(item.name) ? `${cat.label} · ` : ''}{item.createdBy} · {formatDate(item.createdAt)}</p>
                </div>
                <div className="flex items-center shrink-0" onClick={e => e.stopPropagation()}>
                  <button className={iconBtn} onClick={() => handleToggleStar(item)} aria-label={item.starred ? 'เลิกปักหมุด' : 'ปักหมุด'} aria-pressed={!!item.starred}>
                    <Star size={17} fill={item.starred ? '#f59e0b' : 'none'} color={item.starred ? '#f59e0b' : 'currentColor'} />
                  </button>
                  {item.url && (
                    <button className={`${iconBtn} hover:text-brand-600`} onClick={() => handleDownloadDoc(item)} aria-label="ดาวน์โหลด">
                      <Download size={17} />
                    </button>
                  )}
                  {item.url && (
                    <button className={`hidden sm:flex ${iconBtn} hover:text-ink`} onClick={() => handleCopyLink(item.url)} aria-label="คัดลอกลิงก์">
                      <Copy size={17} />
                    </button>
                  )}
                  {user?.role === 'admin' && (
                    <button className={`${iconBtn} hover:text-danger-600 hover:bg-danger-50`} onClick={() => handleDelete(item.id)} aria-label="ลบเอกสาร">
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* In-App PDF / Document Viewer Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-ink/40 backdrop-blur-sm animate-fade-in">
          <div className="glass-strong rounded-card w-full max-w-4xl h-[92vh] flex flex-col overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/90">
              <div className="flex items-center gap-2.5 min-w-0 pr-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-brand-500 flex items-center justify-center shrink-0">
                  <FileText size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-gray-800 truncate">{viewingDoc.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{viewingDoc.note || 'เอกสารทางการคลังพัสดุ'}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownloadDoc(viewingDoc)}
                  className="px-3.5 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Download size={14} /> <span>ดาวน์โหลด</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingDoc(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Document Embed / Iframe */}
            <div className="flex-1 bg-gray-100 p-2 sm:p-3 relative overflow-hidden flex flex-col">
              <iframe
                src={viewingDoc.url}
                className="w-full h-full rounded-2xl border border-gray-300/80 bg-white shadow-inner"
                title={viewingDoc.name}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
