import { useState } from 'react';
import { Send, ArrowRight, Lock, Mail, User as UserIcon, Shield, TrendingUp, Globe } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('demo@remitlet.com');
  const [password, setPassword] = useState('demo1234');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (mode === 'signin') {
      const { error } = await signIn(email, password);
      setLoading(false);
      if (error) {
        setError(error);
      } else {
        toast('Welcome back!', 'success');
      }
    } else {
      if (displayName.trim().length < 2) {
        setError('Please enter your name');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, displayName.trim());
      setLoading(false);
      if (error) {
        setError(error);
      } else {
        toast('Account created! You are signed in.', 'success');
      }
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand / marketing */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-700 via-brand-600 to-teal-800 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-white/15 backdrop-blur rounded-xl flex items-center justify-center ring-1 ring-white/20">
              <Send className="w-5 h-5" />
            </div>
            <span className="text-xl font-semibold tracking-tight">RemitLet</span>
          </div>

          <div className="max-w-md">
            <h1 className="text-4xl font-bold leading-tight tracking-tight">
              Send money across borders with confidence.
            </h1>
            <p className="mt-4 text-lg text-brand-100 leading-relaxed">
              Track every transfer in real time, lock in live exchange rates, and stay
              informed with instant status notifications.
            </p>
            <div className="mt-10 space-y-5">
              {[
                { icon: TrendingUp, title: 'Live exchange rates', desc: 'See real-time FX rates before you send.' },
                { icon: Globe, title: '15+ destination countries', desc: 'Reach recipients across the globe.' },
                { icon: Shield, title: 'Bank-grade security', desc: 'Every transfer is encrypted and tracked end-to-end.' },
              ].map((f) => (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center ring-1 ring-white/15 flex-shrink-0">
                    <f.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">{f.title}</p>
                    <p className="text-sm text-brand-100">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-brand-200">
            Trusted by thousands of senders worldwide.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center">
              <Send className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold tracking-tight text-slate-900">RemitLet</span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-200 p-8 animate-slide-up">
            <h2 className="text-2xl font-bold text-slate-900">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-sm text-slate-500 mt-1.5">
              {mode === 'signin'
                ? 'Sign in to track your transfers and manage recipients.'
                : 'Start sending and tracking international transfers today.'}
            </p>

            {mode === 'signin' && (
              <div className="mt-5 rounded-xl bg-brand-50 border border-brand-200 px-4 py-3 text-sm text-brand-800">
                <span className="font-medium">Demo account ready:</span> email
                <span className="font-mono mx-1">demo@remitlet.com</span> / password
                <span className="font-mono mx-1">demo1234</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === 'signup' && (
                <Input
                  label="Full name"
                  name="displayName"
                  type="text"
                  placeholder="Alex Morgan"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  prefix={<UserIcon className="w-4 h-4" />}
                  required
                />
              )}
              <Input
                label="Email address"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                prefix={<Mail className="w-4 h-4" />}
                required
              />
              <Input
                label="Password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                prefix={<Lock className="w-4 h-4" />}
                required
              />

              {error && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" loading={loading} className="w-full">
                {mode === 'signin' ? 'Sign in' : 'Create account'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setError(null);
                }}
                className="font-medium text-brand-600 hover:text-brand-700 transition-colors"
              >
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
