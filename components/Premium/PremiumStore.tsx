
import React, { useState, useEffect } from 'react';
import { PLANS, getBadgeIcon, hasPremiumAccess, getPlanTagStyle } from '../../premiumUtils';
import { User, PlanType, PremiumCustomization, StoreItem } from '../../types';
import { activateSubscription, updatePremiumCustomization, admin_getStoreItems } from '../../firebase';

interface PremiumStoreProps {
  currentUser: User;
  onClose: () => void;
}

// Mock Data for Demo - In production, this comes from admin_getStoreItems
const DEFAULT_ITEMS: StoreItem[] = [
    { id: 'anim_1', type: 'animation', name: 'Lightning Aura', price: 150, category: 'Effects', previewUrl: '⚡', value: 'shadow-[0_0_20px_#fbbf24]' },
    { id: 'anim_2', type: 'animation', name: 'Ghost Fire', price: 200, category: 'Effects', previewUrl: '🔥', value: 'shadow-[0_0_20px_#ef4444]' },
    { id: 'deco_1', type: 'decoration', name: 'Neon Frame', price: 99, category: 'Decorations', previewUrl: '🌈', value: 'border-2 border-indigo-500' },
    { id: 'badge_1', type: 'badge', name: 'Verified', price: 500, category: 'Badges', previewUrl: '✅', value: 'verified' },
];

export const PremiumStore: React.FC<PremiumStoreProps> = ({ currentUser, onClose }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'decorations' | 'effects' | 'plans'>('home');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<StoreItem[]>(DEFAULT_ITEMS);

  useEffect(() => {
      const load = async () => {
          const dbItems = await admin_getStoreItems();
          if (dbItems.length > 0) setItems(dbItems);
      };
      load();
  }, []);

  const handlePurchasePlan = async (planId: PlanType) => {
    const plan = PLANS[planId.toUpperCase() as keyof typeof PLANS];
    if (!plan) return;
    setLoading(true);
    const upiUrl = `upi://pay?pa=atharv811@fam&pn=ROXX%20Chats&am=${plan.price}&cu=INR&tn=ROXX%20${plan.name}%20Plan`;
    window.location.href = upiUrl;
    setTimeout(async () => {
        if (window.confirm("Confirm payment completion?")) {
            await activateSubscription(currentUser.uid, planId);
            alert(`🎉 ${plan.name} Unlocked!`);
            window.location.reload();
        }
        setLoading(false);
    }, 2500);
  };

  const handlePurchaseItem = async (item: StoreItem) => {
      if (confirm(`Buy ${item.name} for ₹${item.price}?`)) {
          // In real app, deduct balance. Here we just redirect to UPI or simulate
          const upiUrl = `upi://pay?pa=atharv811@fam&pn=ROXX%20Store&am=${item.price}&cu=INR&tn=${item.name}`;
          window.location.href = upiUrl;
          
          setTimeout(async () => {
              if (window.confirm("Payment done?")) {
                  // Apply item immediately
                  let update: Partial<PremiumCustomization> = {};
                  if (item.type === 'decoration') update.borderColor = item.value;
                  if (item.type === 'animation') update.glowEffect = true; 
                  await updatePremiumCustomization(currentUser.uid, { ...currentUser.premiumCustomization, ...update });
                  alert("Item Equipped!");
              }
          }, 2000);
      }
  };

  const PlanCard: React.FC<{ planKey: string }> = ({ planKey }) => {
    const plan = PLANS[planKey as keyof typeof PLANS];
    const isCurrent = currentUser.subscription?.plan === plan.id && currentUser.subscription.isActive;
    return (
      <div className={`relative p-6 rounded-3xl border transition-all hover:scale-105 ${isCurrent ? 'bg-green-900/20 border-green-500' : 'bg-slate-800 border-slate-700 hover:border-indigo-500'}`}>
        <div className="flex justify-between items-start mb-4">
            <div>
                <h3 className={`text-2xl font-black ${plan.color} flex items-center gap-2`}>
                    {getBadgeIcon(plan.id as PlanType)} {plan.name}
                </h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{plan.durationDays} Days</p>
            </div>
            <span className="text-3xl font-black text-white">₹{plan.price}</span>
        </div>
        <button 
            onClick={() => handlePurchasePlan(plan.id as PlanType)}
            disabled={loading || isCurrent}
            className={`w-full py-3 rounded-xl font-bold text-sm uppercase tracking-widest ${isCurrent ? 'bg-slate-700 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/30'}`}
        >
            {isCurrent ? 'Active' : 'Subscribe'}
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[300] bg-slate-950 text-white flex overflow-hidden animate-in fade-in">
        {/* Sidebar */}
        <div className="w-20 lg:w-64 bg-slate-900 flex flex-col border-r border-slate-800">
            <div className="p-6 flex items-center gap-3 border-b border-slate-800 h-20">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <span className="text-xl">🛍️</span>
                </div>
                <h1 className="hidden lg:block font-black text-lg tracking-tight">ROXX Store</h1>
            </div>
            <nav className="flex-1 p-4 space-y-2">
                <NavButton label="Featured" icon="🔥" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
                <NavButton label="Memberships" icon="💎" active={activeTab === 'plans'} onClick={() => setActiveTab('plans')} />
                <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden lg:block">Collections</div>
                <NavButton label="Decorations" icon="🎨" active={activeTab === 'decorations'} onClick={() => setActiveTab('decorations')} />
                <NavButton label="Effects" icon="✨" active={activeTab === 'effects'} onClick={() => setActiveTab('effects')} />
            </nav>
            <div className="p-4 border-t border-slate-800">
                <button onClick={onClose} className="w-full flex items-center justify-center lg:justify-start gap-3 p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
                    <span className="hidden lg:block font-bold">Exit Store</span>
                </button>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-slate-950 p-6 lg:p-10 no-scrollbar">
            {/* Hero Banner */}
            <div className="w-full h-64 rounded-[2.5rem] bg-gradient-to-r from-indigo-900 via-purple-900 to-slate-900 relative overflow-hidden mb-10 flex items-center px-10 shadow-2xl">
                <div className="relative z-10 max-w-lg">
                    <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 inline-block">New Arrivals</span>
                    <h2 className="text-4xl lg:text-5xl font-black mb-4 leading-tight">Level Up Your<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Digital Presence</span></h2>
                    <p className="text-slate-400 font-medium mb-6">Exclusive badges, profile effects, and nitro-speed features available now.</p>
                    <button onClick={() => setActiveTab('plans')} className="bg-white text-slate-900 px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-transform shadow-xl">Get Premium</button>
                </div>
                <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-indigo-500/20 to-transparent pointer-events-none"></div>
                <div className="absolute -right-20 -bottom-40 w-96 h-96 bg-indigo-600/30 rounded-full blur-[100px]"></div>
            </div>

            {activeTab === 'plans' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                    <h3 className="text-2xl font-bold">Membership Tiers</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        {Object.keys(PLANS).map(key => <PlanCard key={key} planKey={key} />)}
                    </div>
                </div>
            )}

            {(activeTab === 'home' || activeTab === 'decorations' || activeTab === 'effects') && (
                <div className="space-y-10 animate-in slide-in-from-bottom-4">
                    {/* Items Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {items.filter(i => activeTab === 'home' || i.category.toLowerCase().includes(activeTab)).map(item => (
                            <div key={item.id} className="group relative bg-slate-900 rounded-3xl p-4 border border-slate-800 hover:border-indigo-500/50 hover:-translate-y-1 transition-all">
                                <div className="aspect-square bg-slate-950 rounded-2xl mb-4 flex items-center justify-center text-4xl shadow-inner relative overflow-hidden">
                                    {item.type === 'decoration' && <div className={`w-full h-full border-4 ${item.value}`}></div>}
                                    <span className="relative z-10">{item.previewUrl}</span>
                                </div>
                                <h4 className="font-bold text-sm mb-1">{item.name}</h4>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-500 uppercase">{item.category}</span>
                                    <span className="text-sm font-black text-indigo-400">₹{item.price}</span>
                                </div>
                                <button 
                                    onClick={() => handlePurchaseItem(item)}
                                    className="absolute inset-x-4 bottom-4 bg-white text-slate-900 py-2 rounded-xl font-bold text-xs uppercase opacity-0 group-hover:opacity-100 transition-all shadow-lg transform translate-y-2 group-hover:translate-y-0"
                                >
                                    Purchase
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

const NavButton = ({ label, icon, active, onClick }: any) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
    >
        <span className="text-xl">{icon}</span>
        <span className="hidden lg:block font-bold text-sm">{label}</span>
    </button>
);
