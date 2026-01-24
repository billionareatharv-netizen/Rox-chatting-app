
import { User, PlanType } from './types';

export const PLANS = {
  STARTER: { id: 'starter', name: 'Starter', price: 99, durationDays: 30, color: 'text-blue-500', border: 'border-blue-500' },
  MIDDLE: { id: 'middle', name: 'Middle', price: 199, durationDays: 90, color: 'text-green-500', border: 'border-green-500' },
  VIP: { id: 'vip', name: 'VIP', price: 399, durationDays: 180, color: 'text-purple-500', border: 'border-purple-500' },
  VVIP: { id: 'vvip', name: 'ROXX VIP', price: 499, durationDays: 365, color: 'text-amber-500', border: 'border-amber-500' },
};

// Admin Exclusive Styles
export const ADMIN_STYLE = {
  border: 'border-yellow-400',
  glow: 'shadow-[0_0_25px_rgba(250,204,21,0.6)]',
  text: 'gold-gradient-text',
  badgeBg: 'bg-gradient-to-r from-yellow-600 via-amber-500 to-yellow-600',
  icon: '👑'
};

export const FEATURE_LEVELS: Record<string, PlanType[]> = {
  'decoration': ['starter', 'middle', 'vip', 'vvip'],
  'chat_effects': ['middle', 'vip', 'vvip'],
  'call_effects': ['vip', 'vvip'],
  'group_power': ['vip', 'vvip'],
  'stealth_mode': ['vvip'],
  
  // New Feature Levels
  'status_duration_boost': ['vip', 'vvip'], // Allows 48h/72h or longer videos
  'group_limit_boost': ['middle', 'vip', 'vvip'], // Increases member cap
  'custom_wallpaper': ['starter', 'middle', 'vip', 'vvip'],
};

// --- THE CORE GATING LOGIC ---
export const hasPremiumAccess = (user: User | null, featureKey: string): boolean => {
  if (!user) return false;

  // 1. ADMIN BYPASS (Highest Priority)
  if (user.isAdmin) return true;

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

export const getBadgeIcon = (plan: PlanType, isAdmin?: boolean) => {
  if (isAdmin) return ADMIN_STYLE.icon;
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
