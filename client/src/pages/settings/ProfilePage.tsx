import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { usersApi } from '@/api/users';
import { useAuthStore } from '@/store/auth';
import { initials } from '@/lib/ui';
import type { UserStatus } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const AVATAR_COLORS = ['#2563eb', '#0891b2', '#4f46e5', '#0ea5e9', '#6366f1', '#0d9488', '#7c3aed', '#2dd4bf', '#dc2626', '#ea580c'];

const STATUS_DOT: Record<UserStatus, string> = {
  0: 'bg-emerald-500',
  1: 'bg-amber-500',
  2: 'bg-red-500',
  3: 'bg-purple-500',
  4: 'bg-slate-400',
};

export function ProfilePage() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = React.useState(user?.fullName ?? '');
  const [firstName, setFirstName] = React.useState(user?.firstName ?? '');
  const [lastName, setLastName] = React.useState(user?.lastName ?? '');
  const [displayName, setDisplayName] = React.useState(user?.displayName ?? '');
  const [phone, setPhone] = React.useState(user?.phone ?? '');
  const [jobTitle, setJobTitle] = React.useState(user?.jobTitle ?? '');
  const [department, setDepartment] = React.useState(user?.department ?? '');
  const [location, setLocation] = React.useState(user?.location ?? '');
  const [bio, setBio] = React.useState(user?.bio ?? '');
  const [avatarColor, setAvatarColor] = React.useState(user?.avatarColor ?? AVATAR_COLORS[0]);
  const [status, setStatus] = React.useState<UserStatus>(user?.status ?? 0);
  const [statusMessage, setStatusMessage] = React.useState(user?.statusMessage ?? '');

  const saveMutation = useMutation({
    mutationFn: () =>
      usersApi.updateProfile({
        fullName,
        firstName: firstName || null,
        lastName: lastName || null,
        displayName: displayName || null,
        phone: phone || null,
        jobTitle: jobTitle || null,
        department: department || null,
        location: location || null,
        bio: bio || null,
        avatarColor,
        status,
        statusMessage: statusMessage || null,
      }),
    onSuccess: (updated) => {
      updateUser(updated);
      queryClient.invalidateQueries();
      toast.success(t('settings.savedToast'));
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? t('settings.saveFailed')),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveMutation.mutate();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t('profile.title')}</h2>
        <p className="text-muted-foreground text-sm">{t('profile.desc')}</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="size-16">
                <AvatarFallback style={{ backgroundColor: avatarColor }} className="text-xl">
                  {user ? initials(fullName || user.fullName) : ''}
                </AvatarFallback>
              </Avatar>
              <span
                className={`absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-background ${STATUS_DOT[status]}`}
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-1.5">{t('profile.changePhoto')}</p>
              <div className="flex gap-1.5 flex-wrap">
                {AVATAR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAvatarColor(c)}
                    className="size-5 rounded-full transition-transform data-[active=true]:scale-110 data-[active=true]:ring-2 data-[active=true]:ring-offset-2 data-[active=true]:ring-foreground"
                    data-active={avatarColor === c}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="status">{t('profile.status')}</Label>
              <Select value={String(status)} onValueChange={(v) => setStatus(Number(v) as UserStatus)}>
                <SelectTrigger id="status" className="w-full">
                  <SelectValue>
                    <span className="inline-flex items-center gap-2">
                      <span className={`size-2 rounded-full ${STATUS_DOT[status]}`} />
                      {t(`profile.status${status}`)}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4].map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      <span className="inline-flex items-center gap-2">
                        <span className={`size-2 rounded-full ${STATUS_DOT[s as UserStatus]}`} />
                        {t(`profile.status${s}`)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="statusMessage">{t('profile.statusMessage')}</Label>
              <Input
                id="statusMessage"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                placeholder={t('profile.statusMessagePlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">{t('profile.firstName')}</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">{t('profile.lastName')}</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fullName">{t('auth.fullName')}</Label>
            <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="displayName">{t('profile.displayName')}</Label>
            <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            <p className="text-muted-foreground text-xs">{t('profile.displayNameHint')}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">{t('profile.email')}</Label>
            <Input id="email" value={user?.email ?? ''} disabled />
            <p className="text-muted-foreground text-xs">{t('profile.emailReadonly')}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">{t('profile.phone')}</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="jobTitle">{t('profile.jobTitle')}</Label>
              <Input id="jobTitle" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="department">{t('profile.department')}</Label>
              <Input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">{t('profile.location')}</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bio">{t('profile.bio')}</Label>
            <Textarea id="bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder={t('profile.bioPlaceholder')} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? t('common.saving') : t('settings.saveChanges')}
        </Button>
      </div>
    </form>
  );
}
