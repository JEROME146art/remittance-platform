import { useState } from 'react';
import { User as UserIcon, Mail, LogOut, Save, Palette } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { CURRENCIES, CURRENCY_CODES, AVATAR_COLORS } from '@/lib/constants';
import { cn, getInitials } from '@/lib/utils';

export function SettingsPage() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [homeCurrency, setHomeCurrency] = useState(profile?.home_currency ?? 'USD');
  const [avatarColor, setAvatarColor] = useState(profile?.avatar_color ?? 'teal');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim() || profile.display_name,
        home_currency: homeCurrency,
        avatar_color: avatarColor,
      })
      .eq('id', profile.id);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Settings saved', 'success');
      refreshProfile();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Profile card */}
      <Card>
        <CardHeader title="Profile" subtitle="Your personal information" />
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-semibold',
                AVATAR_COLORS[avatarColor] ?? 'bg-brand-500'
              )}
            >
              {getInitials(displayName || 'User')}
            </div>
            <div>
              <p className="font-medium text-slate-900">{displayName || 'Your name'}</p>
              <p className="text-sm text-slate-400">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Display name"
              name="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              prefix={<UserIcon className="w-4 h-4" />}
            />
            <Input
              label="Email"
              name="email"
              value={user?.email ?? ''}
              disabled
              prefix={<Mail className="w-4 h-4" />}
            />
            <Select
              label="Home currency"
              name="home_currency"
              value={homeCurrency}
              onChange={(e) => setHomeCurrency(e.target.value)}
            >
              {CURRENCY_CODES.map((c) => (
                <option key={c} value={c}>
                  {CURRENCIES[c].flag} {c} — {CURRENCIES[c].name}
                </option>
              ))}
            </Select>
          </div>

          {/* Avatar color picker */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2.5">
              <Palette className="w-4 h-4" />
              Avatar color
            </label>
            <div className="flex flex-wrap gap-2.5">
              {Object.entries(AVATAR_COLORS).map(([name, color]) => (
                <button
                  key={name}
                  onClick={() => setAvatarColor(name)}
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                    color,
                    avatarColor === name
                      ? 'ring-4 ring-offset-2 ring-slate-300 scale-110'
                      : 'hover:scale-105'
                  )}
                >
                  {avatarColor === name && (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave} loading={saving}>
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </Card>

      {/* Danger zone */}
      <Card className="ring-rose-200">
        <CardHeader title="Account" subtitle="Session management" />
        <div className="p-6">
          <Button
            variant="danger"
            onClick={async () => {
              await signOut();
              toast('Signed out', 'info');
            }}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </Card>
    </div>
  );
}
