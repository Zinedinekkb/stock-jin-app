// app/components/TabDocuments.js
'use client';
import React, { useState, useEffect } from 'react';
import {
  FolderOpen, Plus, Search, ExternalLink, Trash2, FileText,
  Image, File, Link2, X, ChevronDown, Download, Copy, Star
} from 'lucide-react';
import { db } from '@/lib/firebase';
import {
  collection, addDoc, onSnapshot, deleteDoc, doc,
  query, orderBy, serverTimestamp, updateDoc
} from 'firebase/firestore';

const DOC_CATEGORIES = [
  { value: 'all', label: 'ทั้งหมด', icon: '📁' },
  { value: 'order', label: 'ใบสั่งของ', icon: '🧾' },
  { value: 'receipt', label: 'ใบเสร็จ', icon: '💰' },
  { value: 'contract', label: 'สัญญา', icon: '📝' },
  { value: 'image', label: 'รูปภาพ', icon: '🖼️' },
  { value: 'other', label: 'อื่นๆ', icon: '📄' },
];

const getFileIcon = (url = '', type) => {
  if (type === 'image') return <Image size={20} className="text-blue-500" />;
  if (url.includes('drive.google')) return <File size={20} className="text-yellow-600" />;
  if (url.includes('line') || url.includes('chat')) return <Link2 size={20} className="text-green-600" />;
  return <FileText size={20} className="text-gray-500" />;
};

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

  const showNote = (msg) => { setNotification(msg); setTimeout(() => setNotification(''), 2500); };

  useEffect(() => {
    const q = collection(db, 'documents');
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
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

  // Filter
  let filtered = docs;
  if (activeCategory !== 'all') filtered = filtered.filter(d => d.category === activeCategory);
  if (starredOnly) filtered = filtered.filter(d => d.starred);
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(d => d.name?.toLowerCase().includes(q) || d.note?.toLowerCase().includes(q));
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
              placeholder="ค้นหาเอกสาร..."
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
              <span>{cat.icon}</span> {cat.label}
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
                <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
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
            {isSubmitting ? 'กำลังบันทึก...' : '💾 บันทึกเอกสาร'}
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
          <span>กด &quot;+ เพิ่ม&quot; เพื่อเพิ่มเอกสารใหม่</span>
        </div>
      ) : (
        <div className="docs-grid">
          {filtered.map(item => {
            const cat = catInfo(item.category);
            return (
              <div key={item.id} className="docs-card">
                <div className="docs-card-top">
                  <div className="docs-file-icon">{getFileIcon(item.url, item.category)}</div>
                  <div className="docs-card-actions">
                    <button
                      className={`docs-action-btn ${item.starred ? 'starred' : ''}`}
                      onClick={() => handleToggleStar(item)}
                      title="ปักหมุด"
                    >
                      <Star size={14} fill={item.starred ? '#f59e0b' : 'none'} color={item.starred ? '#f59e0b' : '#d1d5db'} />
                    </button>
                    {item.url && (
                      <button className="docs-action-btn" onClick={() => handleCopyLink(item.url)} title="คัดลอกลิงก์">
                        <Copy size={14} />
                      </button>
                    )}
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="docs-action-btn" title="เปิดเอกสาร">
                        <ExternalLink size={14} />
                      </a>
                    )}
                    {user?.role === 'admin' && (
                      <button className="docs-action-btn docs-delete-btn" onClick={() => handleDelete(item.id)} title="ลบ">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="docs-card-body">
                  <p className="docs-card-name">{item.name}</p>
                  {item.note && <p className="docs-card-note">{item.note}</p>}
                </div>

                <div className="docs-card-footer">
                  <span className="docs-cat-tag">{cat.icon} {cat.label}</span>
                  <span className="docs-card-meta">{item.createdBy} · {formatDate(item.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
