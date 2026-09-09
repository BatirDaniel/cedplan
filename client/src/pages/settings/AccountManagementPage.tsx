import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { usersApi } from '@/api/users';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function AccountManagementPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  const [deactivateOpen, setDeactivateOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState('');

  const deactivateMutation = useMutation({
    mutationFn: () => usersApi.deactivate(),
    onSuccess: () => {
      toast.success(t('account.deactivated'));
      logout();
      navigate('/login');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => usersApi.deleteAccount(),
    onSuccess: () => {
      toast.success(t('account.deleted'));
      logout();
      navigate('/login');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? t('account.deleteFailed'), { duration: 8000 });
      setDeleteOpen(false);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t('account.title')}</h2>
        <p className="text-muted-foreground text-sm">{t('account.desc')}</p>
      </div>

      <Card className="border-amber-500/40">
        <CardContent className="pt-6">
          <h3 className="text-sm font-semibold mb-1">{t('account.deactivateTitle')}</h3>
          <p className="text-muted-foreground text-sm mb-4">{t('account.deactivateDesc')}</p>
          <Button variant="outline" onClick={() => setDeactivateOpen(true)}>
            {t('account.deactivateButton')}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardContent className="pt-6">
          <h3 className="text-sm font-semibold mb-1">{t('account.deleteTitle')}</h3>
          <p className="text-muted-foreground text-sm mb-4">{t('account.deleteDesc')}</p>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            {t('account.deleteButton')}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('account.deactivateConfirmTitle')}</DialogTitle>
            <DialogDescription>{t('account.deactivateConfirmBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" disabled={deactivateMutation.isPending} onClick={() => deactivateMutation.mutate()}>
              {t('account.deactivateButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o);
          if (!o) setConfirmText('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('account.deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>{t('account.deleteConfirmBody')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="confirmDelete">{t('account.deleteConfirmInput')}</Label>
            <Input id="confirmDelete" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== 'DELETE' || deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {t('account.deleteButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
