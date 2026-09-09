import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const APPS = [
  { name: 'Google', color: '#4285F4', letter: 'G' },
  { name: 'Microsoft', color: '#00A4EF', letter: 'M' },
  { name: 'Slack', color: '#4A154B', letter: 'S' },
  { name: 'GitHub', color: '#181717', letter: 'H' },
];

export function ConnectedAppsPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{t('settings.navConnectedApps')}</h2>
        <p className="text-muted-foreground text-sm">{t('integrations.connectedAppsDesc')}</p>
      </div>

      <div className="space-y-3">
        {APPS.map((app) => (
          <Card key={app.name}>
            <CardContent className="flex items-center gap-3 pt-6">
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-lg font-bold text-white"
                style={{ backgroundColor: app.color }}
              >
                {app.letter}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{app.name}</p>
                <Badge variant="outline" className="text-muted-foreground mt-0.5 text-[10px]">
                  {t('settings.comingSoonTitle')}
                </Badge>
              </div>
              <Button variant="outline" size="sm" disabled>
                {t('common.add')}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
