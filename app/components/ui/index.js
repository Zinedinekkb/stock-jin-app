// app/components/ui/index.js
// Shared Glass Lavender building blocks. Styles come from tailwind.config.js tokens and the .glass classes in globals.css.
import React from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';

const cx = (...classes) => classes.filter(Boolean).join(' ');

export function GlassCard({ as: Tag = 'div', strong = false, className = '', children, ...props }) {
  return (
    <Tag className={cx(strong ? 'glass-strong' : 'glass', 'rounded-card', className)} {...props}>
      {children}
    </Tag>
  );
}

const BUTTON_VARIANTS = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 shadow-[0_6px_18px_rgba(99,85,216,0.28)]',
  secondary: 'bg-white/70 text-brand-700 border border-brand-100 hover:bg-white',
  ghost: 'bg-transparent text-brand-600 hover:bg-brand-50',
  danger: 'bg-danger-600 text-white hover:bg-danger-700',
  'danger-ghost': 'bg-transparent text-danger-600 hover:bg-danger-50',
  success: 'bg-success-700 text-white hover:bg-success-700/90',
};

const BUTTON_SIZES = {
  sm: 'h-9 px-3 text-xs gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
};

export function Button({ variant = 'primary', size = 'md', loading = false, block = false, icon: Icon, className = '', children, disabled, ...props }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center rounded-control font-bold transition-colors duration-150 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed',
        BUTTON_VARIANTS[variant], BUTTON_SIZES[size], block && 'w-full', className
      )}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : Icon ? <Icon size={size === 'sm' ? 14 : 18} /> : null}
      {children}
    </button>
  );
}

const BADGE_TONES = {
  brand: 'bg-brand-50 text-brand-700 border-brand-100',
  success: 'bg-success-50 text-success-700 border-success-100',
  warning: 'bg-warning-50 text-warning-700 border-warning-100',
  danger: 'bg-danger-50 text-danger-700 border-danger-100',
  neutral: 'bg-white/70 text-ink-muted border-white',
};

export function Badge({ tone = 'brand', icon: Icon, className = '', children }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold whitespace-nowrap', BADGE_TONES[tone], className)}>
      {Icon && <Icon size={12} />}
      {children}
    </span>
  );
}

export function PageHeader({ title, description, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div className="min-w-0">
        <h1 className="text-xl md:text-2xl font-black text-ink tracking-tight">{title}</h1>
        {description && <p className="text-sm text-ink-muted mt-1">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function SectionHeader({ title, action, className = '' }) {
  return (
    <div className={cx('flex items-center justify-between gap-3 px-1 mb-2', className)}>
      <h2 className="text-xs font-bold uppercase tracking-wide text-ink-subtle">{title}</h2>
      {action}
    </div>
  );
}

// One tappable row: icon + label (+ description) + trailing value or chevron
export function ListRow({ icon: Icon, iconClassName = 'text-brand-500 bg-brand-50', label, description, trailing, onClick, danger = false, className = '' }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cx(
        'w-full flex items-center gap-3 px-4 py-3 min-h-[56px] text-left transition-colors',
        onClick && 'hover:bg-white/60 active:bg-white/80',
        className
      )}
    >
      {Icon && (
        <span className={cx('w-9 h-9 rounded-control flex items-center justify-center shrink-0', danger ? 'text-danger-600 bg-danger-50' : iconClassName)}>
          <Icon size={18} />
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span className={cx('block text-sm font-semibold truncate', danger ? 'text-danger-600' : 'text-ink')}>{label}</span>
        {description && <span className="block text-xs text-ink-muted truncate mt-0.5">{description}</span>}
      </span>
      {trailing !== undefined ? trailing : onClick ? <ChevronRight size={16} className="text-ink-subtle shrink-0" /> : null}
    </Tag>
  );
}
