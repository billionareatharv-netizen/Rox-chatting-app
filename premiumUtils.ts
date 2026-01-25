
import { User, PlanType, UserRole } from './types';

export const PLANS = {
  STARTER: { id: 'starter', name: 'Starter', price: 99, durationDays: 30, color: 'text-blue-500', border: 'border-blue-500' },
  MIDDLE: { id: 'middle', name: 'Middle', price: 199, durationDays: 90, color: 'text-green-500', border: 'border-green-500' },
  VIP: { id: 'vip', name: 'VIP', price: 399, durationDays: 180, color: 'text-purple-500', border: 'border-purple-500' },
  VVIP: { id: 'vvip', name: 'ROXX VIP', price: 499, durationDays: 365, color: 'text-amber-500', border: 'border-amber-500' },
};

// --- NEW ROLE STYLES ---
export const ROLE_STYLES: Record<UserRole, any> = {
  owner: {
    label: 'OWNER VVIP',
    badge: 'bg-gradient-to-r from-red-600 via-red-500 to-rose-600 text-yellow-100 shadow-[0_0_15px_rgba(220,38,38,0.6)] border border-yellow-400',
    text: 'text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 font-serif italic tracking-wider',
    border: 'border-red-500 ring-2 ring-yellow-400 ring-offset-2 ring-offset-black',
    glow: 'shadow-[0_0_30px_rgba(220,38,38,0.8)]',
    icon: '👑'
  },
  co_admin: {
    label: 'CO-ADMIN',
    badge: 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.6)] animate-shimmer',
    text: 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 font-bold',
    border: 'border-cyan-400 ring-2 ring-white/50',
    glow: 'shadow-[0_0_20px_rgba(34,211,238,0.6)]',
    icon: '💎'
  },
  admin: {
    label: 'ADMIN',
    badge: 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-lg',
    text: 'text-amber-500 font-bold',
    border: 'border-amber-400',
    glow: 'shadow-[0_0_15px_rgba(251,191,36,0.5)]',
    icon: '🛡️'
  },
  user: {
    label: '',
    badge: '',
    text: 'text-slate-900 dark:text-white',
    border: 'border-slate-200 dark:border-slate-700',
    glow: '',
    icon: ''
  }
};

export const ADMIN_STYLE = ROLE_STYLES.admin; // Backward compatibility

export const FEATURE_LEVELS: Record<string, PlanType[]> = {
  'decoration': ['starter', 'middle', 'vip', 'vvip'],
  'chat_effects': ['middle', 'vip', 'vvip'],
  'call_effects': ['vip', 'vvip'],
  'group_power': ['vip', 'vvip'],
  'stealth_mode': ['vvip'],
  'status_duration_boost': ['vip', 'vvip'], 
  'group_limit_boost': ['middle', 'vip', 'vvip'],
  'custom_wallpaper': ['starter', 'middle', 'vip', 'vvip'],
};

// --- THE CORE GATING LOGIC ---
export const hasPremiumAccess = (user: User | null, featureKey: string): boolean => {
  if (!user) return false;

  // 1. ROLE BYPASS (Owners and Co-Admins get everything)
  if (user.role === 'owner' || user.role === 'co_admin' || user.role === 'admin' || user.isAdmin) return true;

  // 2. Check Subscription Existence
  if (!user.subscription || !user.subscription.isActive) return false;

  // 3. Check Expiry
  if (user.subscription.expiryDate < Date.now()) return false;

  // 4. Check Plan Level
  const allowedPlans = FEATURE_LEVELS[featureKey] || [];
  return allowedPlans.includes(user.subscription.plan);
};

export const getPlanDetails = (planId: string) => {
  return Object.values(PLANS).find(p => p.id === planId);
};

export const calculateExpiry = (durationDays: number): number => {
  const d = new Date();
  d.setDate(d.getDate() + durationDays);
  return d.getTime();
};

export const getBadgeIcon = (plan: PlanType, role?: UserRole) => {
  if (role && role !== 'user') return ROLE_STYLES[role].icon;
  switch (plan) {
    case 'starter': return '⭐';
    case 'middle': return '🌟';
    case 'vip': return '💎';
    case 'vvip': return '👑';
    default: return '';
  }
};

export const getPlanTagStyle = (plan: PlanType) => {
    switch (plan) {
        case 'vip': return 'bg-purple-500 text-white shining-tag';
        case 'vvip': return 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shining-tag shadow-lg shadow-orange-500/30';
        default: return 'bg-slate-200 dark:bg-slate-700 text-slate-500';
    }
};
