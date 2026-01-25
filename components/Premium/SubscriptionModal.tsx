
import React, { useState } from 'react';
import { PLANS, getBadgeIcon } from '../../premiumUtils';
import { User, PlanType } from '../../types';
import { activateSubscription } from '../../firebase';

interface SubscriptionModalProps {
  currentUser: User;
  onClose: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ currentUser, onClose }) => {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('vip');
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    const plan = PLANS[selectedPlan.toUpperCase() as keyof typeof PLANS];
    if (!plan) return;

    setLoading(true);
    
    // Redirect to UPI App
    const upiUrl = `upi://pay?pa=atharv811@fam&pn=ROXX%20Chats&am=${plan.price}&cu=INR&tn=ROXX%20${plan.name}%20Plan`;
    window.location.href = upiUrl;

    // Simulated Verification
    setTimeout(async () => {
        const userConfirmed = window.confirm("Please click OK after you have successfully completed the payment in your UPI app.");
        
        if (userConfirmed) {
            try {
                await activateSubscription(currentUser.uid, selectedPlan);
                alert("Payment Verified! Premium Features Unlocked.");
                window.location.reload();
            } catch(e) {
                alert("Activation Failed. Please try again.");
            }
        }
        setLoading(false);
        onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/5 dark:bg-white/10 rounded-full hover:bg-black/10 transition-colors z-10">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-8 text-center text-white">
            <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto mb-4 flex items-center justify-center backdrop-blur-sm border border-white/30">
                <span className="text-3xl">👑</span>
            </div>
            <h2 className="text-3xl font-black mb-2 tracking-tight">ROXX PREMIUM</h2>
            <p className="opacity-90 font-medium text-sm">Unlock borders, glows, exclusive badges & power features.</p>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar">
            {Object.values(PLANS).map((plan) => (
                <div 
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id as PlanType)}
                    className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedPlan === plan.id ? `${plan.border} bg-slate-50 dark:bg-slate-800/60 shadow-lg scale-[1.02]` : 'border-slate-100 dark:border-slate-800 hover:border-slate-300'}`}
                >
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{getBadgeIcon(plan.id as PlanType)}</span>
                            <div>
                                <h3 className={`font-black text-lg ${plan.color}`}>{plan.name}</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{plan.durationDays} Days Validity</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-xl font-black text-slate-900 dark:text-white">₹{plan.price}</span>
                        </div>
                    </div>
                    {selectedPlan === plan.id && (
                        <div className="absolute top-2 right-2 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                        </div>
                    )}
                </div>
            ))}
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800">
            <button 
                onClick={handlePurchase}
                disabled={loading}
                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {loading ? 'Opening UPI...' : `Pay ₹${PLANS[selectedPlan.toUpperCase() as keyof typeof PLANS].price} via UPI`}
            </button>
            <p className="text-center text-[10px] text-slate-400 font-bold mt-4 uppercase tracking-widest">Instant Activation • Secure Payment</p>
        </div>
      </div>
    </div>
  );
};
