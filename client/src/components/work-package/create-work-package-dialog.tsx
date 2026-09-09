import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Check } from 'lucide-react';
import { toast } from 'sonner';

import { workPackagesApi } from '@/api/workPackages';
import { projectsApi } from '@/api/projects';
import { initials, ticketKey } from '@/lib/ui';
import { WorkPackageStatusOrder } from '@/types';
import type { WorkPackageStatus } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type FormValues = {
  subject: string;
  description?: string;
  type: number;
  status: number;
  priority: number;
  assigneeIds: string[];
  parentId: string | null;
};

export function CreateWorkPackageDialog({
  projectId,
  projectIdentifier,
  open,
  onOpenChange,
  defaultStatus,
  defaultParentId,
}: {
  projectId: string;
  projectIdentifier?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultStatus?: WorkPackageStatus;
  defaultParentId?: string | null;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [assigneesOpen, setAssigneesOpen] = React.useState(false);
  const [parentOpen, setParentOpen] = React.useState(false);

  const { data: members } = useQuery({
    queryKey: ['members', projectId],
    queryFn: () => projectsApi.members(projectId),
    enabled: open,
  });

  const { data: allTasks } = useQuery({
    queryKey: ['work-packages', projectId],
    queryFn: () => workPackagesApi.list(projectId),
    enabled: open,
  });

  const schema = z.object({
    subject: z.string().min(1, t('workPackage.titleRequired')).max(200),
    description: z.string().max(4000).optional(),
    type: z.coerce.number(),
    status: z.coerce.number(),
    priority: z.coerce.number(),
    assigneeIds: z.array(z.string()),
    parentId: z.string().nullable(),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      subject: '',
      description: '',
      type: 0,
      status: defaultStatus ?? 0,
      priority: 1,
      assigneeIds: [],
      parentId: defaultParentId ?? null,
    },
  });

  React.useEffect(() => {
    if (open)
      form.reset({
        subject: '',
        description: '',
        type: 0,
        status: defaultStatus ?? 0,
        priority: 1,
        assigneeIds: [],
        parentId: defaultParentId ?? null,
      });
  }, [open, defaultStatus, defaultParentId]);

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      workPackagesApi.create(projectId, {
        subject: values.subject,
        description: values.description,
        type: values.type as any,
        status: values.status as any,
        priority: values.priority as any,
        assigneeIds: values.assigneeIds,
        parentId: values.parentId,
      }),
    onSuccess: (wp) => {
      queryClient.invalidateQueries({ queryKey: ['work-packages', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(t('workPackage.createdToast', { subject: wp.subject }));
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? t('workPackage.createFailed')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('workPackage.createDialogTitle')}</DialogTitle>
          <DialogDescription>{t('workPackage.createDialogDesc')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="create-wp-form"
            onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('workPackage.titleLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('workPackage.titlePlaceholder')} autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('workPackage.descriptionLabel')}</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder={t('workPackage.descriptionPlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => {
                const parent = allTasks?.find((w) => w.id === field.value);
                return (
                  <FormItem>
                    <FormLabel>{t('workPackage.parentTaskLabel')}</FormLabel>
                    <Popover open={parentOpen} onOpenChange={setParentOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button type="button" variant="outline" role="combobox" className="w-full justify-start font-normal">
                            {parent ? (
                              <span className="truncate">
                                <span className="font-mono-key text-muted-foreground mr-1.5 text-xs">
                                  {ticketKey(projectIdentifier ?? '', parent.sequence)}
                                </span>
                                {parent.subject}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{t('workPackage.noParentTask')}</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0" align="start">
                        <Command>
                          <CommandInput placeholder={t('workPackage.searchTasks')} />
                          <CommandList>
                            <CommandEmpty>{t('workPackage.noTasksFound')}</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="__none__"
                                onSelect={() => {
                                  field.onChange(null);
                                  setParentOpen(false);
                                }}
                              >
                                <span className="text-muted-foreground">{t('workPackage.noParentTask')}</span>
                                {!field.value && <Check className="size-4" />}
                              </CommandItem>
                              {allTasks?.map((w) => (
                                <CommandItem
                                  key={w.id}
                                  value={`${ticketKey(projectIdentifier ?? '', w.sequence)} ${w.subject}`}
                                  onSelect={() => {
                                    field.onChange(w.id);
                                    setParentOpen(false);
                                  }}
                                >
                                  <span className="font-mono-key text-muted-foreground mr-1 text-xs">
                                    {ticketKey(projectIdentifier ?? '', w.sequence)}
                                  </span>
                                  <span className="flex-1 truncate">{w.subject}</span>
                                  {field.value === w.id && <Check className="size-4" />}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                );
              }}
            />
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('workPackage.columns.type')}</FormLabel>
                    <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[0, 1, 2, 3, 4].map((k) => (
                          <SelectItem key={k} value={String(k)}>
                            {t(`workPackage.type.${k}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('workPackage.columns.status')}</FormLabel>
                    <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {WorkPackageStatusOrder.map((s) => (
                          <SelectItem key={s} value={String(s)}>
                            {t(`workPackage.status.${s}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('workPackage.columns.priority')}</FormLabel>
                    <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[0, 1, 2, 3].map((k) => (
                          <SelectItem key={k} value={String(k)}>
                            {t(`workPackage.priority.${k}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="assigneeIds"
              render={({ field }) => {
                const selected = members?.filter((m) => field.value.includes(m.userId)) ?? [];
                return (
                  <FormItem>
                    <FormLabel>{t('workPackage.assigneeLabel')}</FormLabel>
                    <Popover open={assigneesOpen} onOpenChange={setAssigneesOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button type="button" variant="outline" role="combobox" className="w-full justify-start font-normal">
                            {selected.length === 0 ? (
                              <span className="text-muted-foreground">{t('common.unassigned')}</span>
                            ) : (
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                <div className="flex -space-x-1.5 shrink-0">
                                  {selected.slice(0, 3).map((m) => (
                                    <Avatar key={m.userId} className="border-background size-5 border-2">
                                      <AvatarFallback style={{ backgroundColor: m.avatarColor }}>
                                        {initials(m.fullName)}
                                      </AvatarFallback>
                                    </Avatar>
                                  ))}
                                </div>
                                <span className="truncate text-xs">{selected.map((m) => m.fullName).join(', ')}</span>
                              </div>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-0" align="start">
                        <Command>
                          <CommandInput placeholder={t('workPackage.searchMembers')} />
                          <CommandList>
                            <CommandEmpty>{t('members.noUsersFound')}</CommandEmpty>
                            <CommandGroup>
                              {members?.map((m) => {
                                const checked = field.value.includes(m.userId);
                                return (
                                  <CommandItem
                                    key={m.userId}
                                    value={m.fullName}
                                    onSelect={() =>
                                      field.onChange(
                                        checked
                                          ? field.value.filter((id) => id !== m.userId)
                                          : [...field.value, m.userId]
                                      )
                                    }
                                  >
                                    <Avatar className="size-6">
                                      <AvatarFallback style={{ backgroundColor: m.avatarColor }}>
                                        {initials(m.fullName)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="flex-1 truncate">{m.fullName}</span>
                                    {checked && <Check className="size-4" />}
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                );
              }}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="create-wp-form" disabled={createMutation.isPending}>
            {createMutation.isPending ? t('common.creating') : t('workPackage.createTask')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
