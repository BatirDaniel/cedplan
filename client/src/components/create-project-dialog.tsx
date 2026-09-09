import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { toast } from 'sonner';

import { projectsApi } from '@/api/projects';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const COLORS = ['#2563eb', '#0891b2', '#4f46e5', '#0ea5e9', '#6366f1', '#0d9488', '#7c3aed', '#2dd4bf'];

type FormValues = { name: string; identifier: string; description?: string; color: string };

export function CreateProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const schema = z.object({
    name: z.string().min(1, t('project.nameRequired')).max(80),
    identifier: z
      .string()
      .min(1, t('project.identifierRequired'))
      .regex(/^[a-z0-9-]+$/, t('project.identifierInvalid')),
    description: z.string().max(500).optional(),
    color: z.string(),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', identifier: '', description: '', color: COLORS[0] },
  });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) =>
      projectsApi.create({
        name: values.name,
        identifier: values.identifier,
        description: values.description,
        color: values.color,
      }),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(t('project.createdToast', { name: project.name }));
      onOpenChange(false);
      form.reset();
      navigate(`/projects/${project.id}`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? t('project.createFailed'));
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) form.reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('project.newProject')}</DialogTitle>
          <DialogDescription>{t('project.newProjectDesc')}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="create-project-form"
            onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('project.name')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('project.namePlaceholder')}
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        if (!form.formState.dirtyFields.identifier) {
                          form.setValue(
                            'identifier',
                            e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                          );
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('project.identifier')}</FormLabel>
                  <FormControl>
                    <Input placeholder="website-redesign" {...field} />
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
                  <FormLabel>{t('project.descriptionOptional')}</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('project.color')}</FormLabel>
                  <div className="flex gap-2">
                    {COLORS.map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => field.onChange(c)}
                        className="size-6 rounded-full transition-transform data-[active=true]:scale-110 data-[active=true]:ring-2 data-[active=true]:ring-offset-2 data-[active=true]:ring-foreground"
                        data-active={field.value === c}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="create-project-form" disabled={createMutation.isPending}>
            {createMutation.isPending ? t('common.creating') : t('project.createProject')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
