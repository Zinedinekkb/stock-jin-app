// app/components/PushToggle.js
// การ์ดตั้งค่า "การแจ้งเตือนบนมือถือ" (เปิด/ปิด Web Push ของอุปกรณ์นี้)
'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { GlassCard, Button, Badge } from './ui';
import { useIntegrations } from './useIntegrations';
import { getPushStatus, enablePush, disablePush } from '@/lib/pushClient';

const STATUS_VIEW = {
  enabled: {
    label: 'เปิดอยู่',
    tone: 'success',
    hint: 'อุปกรณ์นี้จะรับการแจ้งเตือนเมื่อมีรายการหรืองานที่เกี่ยวข้องกับคุณ',
  },
  disabled: {
    label: 'ปิดอยู่',
    tone: 'neutral',
    hint: 'เปิดเพื่อรับการแจ้งเตือนเมื่อมีรายการ งาน หรือใบลาที่ต้องดำเนินการ',
  },
  unsupported: {
    label: 'ไม่รองรับ',
    tone: 'neutral',
    hint: 'เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน ลองเปิดด้วย Chrome (Android) หรือ Safari (iPhone)',
  },
  blocked: {
    label: 'ถูกบล็อก',
    tone: 'danger',
    hint: 'การแจ้งเตือนของเว็บนี้ถูกบล็อกไว้ ไปที่การตั้งค่าของเบราว์เซอร์ > การแจ้งเตือน แล้วอนุญาตสำหรับเว็บนี้ จากนั้นรีเฟรชหน้า',
  },
  'ios-not-installed': {
    label: 'ยังไม่ได้ติดตั้ง',
    tone: 'warning',
    hint: 'บน iPhone ให้กดปุ่มแชร์ แล้วเลือก "เพิ่มไปยังหน้าจอโฮม" จากนั้นเปิดแอปจากไอคอนบนหน้าจอ แล้วกลับมาเปิดการแจ้งเตือนที่นี่',
  },
};

export default function PushToggle({ user }) {
  const integrations = useIntegrations();
  const [status, setStatus] = useState('disabled');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    try {
      setStatus(await getPushStatus());
    } catch {
      setStatus('unsupported');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, user?.uid]);

  const handleToggle = async () => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      if (status === 'enabled') {
        const res = await disablePush(user);
        setMessage(res.ok ? 'ปิดการแจ้งเตือนบนอุปกรณ์นี้แล้ว' : res.message);
      } else {
        const res = await enablePush(user);
        setMessage(res.ok ? 'เปิดการแจ้งเตือนบนอุปกรณ์นี้แล้ว' : res.message);
      }
    } finally {
      await refresh();
      setBusy(false);
    }
  };

  if (!integrations?.push) return null; // push ไม่ได้ตั้งค่า (หรือยังโหลดไม่เสร็จ) → ซ่อนการ์ด

  const view = STATUS_VIEW[status] || STATUS_VIEW.disabled;
  const canToggle = status === 'enabled' || status === 'disabled';
  const isOn = status === 'enabled';

  return (
    <GlassCard className="p-5">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
          {isOn ? <Bell size={20} /> : <BellOff size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-black text-base text-ink">การแจ้งเตือนบนมือถือ</h3>
            <Badge tone={view.tone}>{view.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-muted">{view.hint}</p>
          {message && <p className="mt-2 text-sm font-semibold text-brand-700">{message}</p>}
        </div>
      </div>
      {canToggle && (
        <Button
          variant={isOn ? 'secondary' : 'primary'}
          icon={isOn ? BellOff : Bell}
          block
          className="mt-4"
          loading={busy}
          onClick={handleToggle}
        >
          {isOn ? 'ปิดการแจ้งเตือนบนอุปกรณ์นี้' : 'เปิดการแจ้งเตือนบนอุปกรณ์นี้'}
        </Button>
      )}
    </GlassCard>
  );
}
