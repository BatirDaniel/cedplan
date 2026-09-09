import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

import { usersApi } from '@/api/users';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function ExportDataPage() {
  const { t } = useTranslation();
  const [ready, setReady] = React.useState(false);

  const exportMutation = useMutation({
    mutationFn: () => usersApi.exportData(),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cedplan-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setReady(true);
    },
    onError: () => toast.error(t('settings.saveFailed')),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t('settings.navExportData')}</h2>
        <p className="text-muted-foreground text-sm">{t('privacy.exportDesc')}</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Button onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
            <Download />
            {exportMutation.isPending ? t('common.loading') : t('settings.navExportData')}
          </Button>
          {ready && <p className="text-muted-foreground text-xs mt-2">{t('settings.savedToast')}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
