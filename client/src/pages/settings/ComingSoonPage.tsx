import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

export function ComingSoonPage({ title, desc, icon: Icon }: { title: string; desc?: string; icon: LucideIcon }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {desc && <p className="text-muted-foreground text-sm">{desc}</p>}
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="bg-muted flex size-12 items-center justify-center rounded-full">
            <Icon className="text-muted-foreground size-5" />
          </div>
          <div>
            <p className="text-sm font-medium">{t('settings.comingSoonTitle')}</p>
            <p className="text-muted-foreground mt-1 max-w-xs text-xs">{t('settings.comingSoonBody')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
