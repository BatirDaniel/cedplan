import { useTranslation } from 'react-i18next';
import { UserCog } from 'lucide-react';

import { ComingSoonPage } from '@/pages/settings/ComingSoonPage';

export function AvailabilityPage() {
  const { t } = useTranslation();
  return <ComingSoonPage title={t('settings.navAvailability')} icon={UserCog} />;
}
