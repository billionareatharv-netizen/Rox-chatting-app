
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

export const AuthView: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, signup, googleSignIn } = useAuth();

  // Clear error when user starts typing again or switches modes
  useEffect(() => {
    if (error) setError(null);
  }, [email, password, name, isLogin]);

  const getFriendlyErrorMessage = (errCode: string) => {
    if (!errCode) return "An unexpected error occurred.";
    
    // Check for raw error codes or messages containing codes
    const code = errCode.toLowerCase();
    
    if (code.includes('wrong-password') || code.includes('incorrect-password')) {
      return "Incorrect password. Please double-check your credentials.";
    }
    if (code.includes('user-not-found')) {
      return "No account found with this email. Please sign up or check for typos.";
    }
    if (code.includes('email-already-in-use')) {
      return "This email is already registered. Try signing in instead.";
    }
    if (code.includes('invalid-email')) {
      return "Please enter a valid email address.";
    }
    if (code.includes('weak-password')) {
      return "Password should be at least 6 characters.";
    }
    if (code.includes('suspended') || code.includes('blocked')) {
      return "This account has been suspended by an administrator.";
    }

    // Default cleanup for other error strings
    return errCode.replace('Firebase: ', '').replace('auth/', '').split('-').join(' ');
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await login('demo@example.com', 'password123');
    } catch (err: any) {
      setError("The demo account is currently undergoing maintenance. Please try signing up.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (name.trim().length < 2) throw new Error("Please enter your full name.");
        
        try {
          await signup(email, password, name);
        } catch (err: any) {
          // If signup fails because email exists, try logging in
          if (err.message.includes('email-already-in-use')) {
            setIsLogin(true);
            try {
              await login(email, password);
            } catch (loginErr: any) {
              throw new Error("This email is already registered, but the password you provided doesn't match our records.");
            }
          } else {
            throw err;
          }
        }
      }
    } catch (err: any) {
      // We only log to console if it's NOT a standard auth error to keep the console clean
      const isAuthError = err.message.includes('auth/') || 
                          err.message.includes('password') || 
                          err.message.includes('user-not-found');
      
      if (!isAuthError) {
        console.error("Auth Exception:", err);
      }
      
      const message = getFriendlyErrorMessage(err.message);
      setError(message.charAt(0).toUpperCase() + message.slice(1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await googleSignIn();
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err.message));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-4">
      <div className="glass w-full max-w-md p-8 rounded-3xl shadow-2xl transition-all duration-500 hover:shadow-indigo-500/20">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">ROXX CHATS</h1>
          <p className="text-white/70">Secure, Real-time messaging</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-100 text-[13px] leading-relaxed flex items-start gap-3 animate-in slide-in-from-top-2">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="flex-1">{error}</span>
          </div>
        )}

        <form id="auth-form" onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-white/80 text-[11px] font-black uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                disabled={isLoading}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all disabled:opacity-50"
              />
            </div>
          )}
          <div>
            <label className="block text-white/80 text-[11px] font-black uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={isLoading}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-white/80 text-[11px] font-black uppercase tracking-widest mb-1.5 ml-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all disabled:opacity-50"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-white text-indigo-600 font-bold py-4 rounded-xl hover:bg-slate-50 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-3">
          <button 
            onClick={handleDemoLogin}
            disabled={isLoading}
            className="w-full bg-indigo-500/20 border border-white/20 py-3 rounded-xl text-white text-sm font-bold hover:bg-indigo-500/40 transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? 'Processing...' : '🚀 Use Demo Account'}
          </button>

          <div className="flex items-center justify-center gap-4 py-2">
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="text-white/30 text-[9px] font-black uppercase tracking-[0.2em]">Social Connect</span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>

          <button 
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full bg-white/10 border border-white/20 py-3 rounded-xl text-white text-sm font-medium hover:bg-white/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-inner"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <button 
          onClick={() => {
            setIsLogin(!isLogin);
            setError(null);
          }}
          disabled={isLoading}
          className="w-full mt-8 text-white/50 hover:text-white text-sm font-bold transition-colors"
        >
          {isLogin ? "Need an account? Sign Up" : "Already registered? Sign In"}
        </button>
      </div>
    </div>
  );
};
