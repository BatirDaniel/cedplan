import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { usersApi } from '@/api/users';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SecurityPasswordPage() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');

  const strength = React.useMemo(() => {
    let score = 0;
    if (newPassword.length >= 6) score++;
    if (newPassword.length >= 10) score++;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score++;
    if (/\d/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    return score;
  }, [newPassword]);

  const strengthLabel = ['', 'Weak', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['bg-muted', 'bg-destructive', 'bg-destructive', 'bg-amber-500', 'bg-primary', 'bg-emerald-500'][strength];

  const changeMutation = useMutation({
    mutationFn: () => usersApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success(t('security.passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? t('security.passwordChangeFailed')),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error(t('security.passwordTooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('security.passwordMismatch'));
      return;
    }
    changeMutation.mutate();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t('security.passwordTitle')}</h2>
        <p className="text-muted-foreground text-sm">{t('security.passwordDesc')}</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">{t('security.currentPassword')}</Label>
              <Input id="currentPassword" type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">{t('security.newPassword')}</Label>
              <Input id="newPassword" type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              {newPassword && (
                <div className="space-y-1">
                  <div className="bg-muted flex h-1 gap-1 overflow-hidden rounded-full">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className={`h-full flex-1 rounded-full ${i <= strength ? strengthColor : 'bg-muted'}`} />
                    ))}
                  </div>
                  <p className="text-muted-foreground text-xs">{strengthLabel}</p>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">{t('security.confirmPassword')}</Label>
              <Input id="confirmPassword" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={changeMutation.isPending}>
                {changeMutation.isPending ? t('security.changingPassword') : t('security.changePassword')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-sm font-semibold mb-1">{t('security.mfaTitle')}</h3>
          <p className="text-muted-foreground text-sm mb-3">{t('security.mfaDesc')}</p>
          <Button variant="outline" disabled>
            {t('settings.comingSoonTitle')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
