import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type CalendarMode = 'month' | 'week' | 'day';

interface CalendarToolbarProps {
  mode: CalendarMode;
  onModeChange: (mode: CalendarMode) => void;
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  rightSlot?: React.ReactNode;
}

export function CalendarToolbar({ mode, onModeChange, label, onPrev, onNext, onToday, rightSlot }: CalendarToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="size-8" onClick={onPrev}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-40 text-center text-sm font-medium capitalize">{label}</span>
        <Button variant="outline" size="icon" className="size-8" onClick={onNext}>
          <ChevronRight className="size-4" />
        </Button>
        <Button variant="ghost" size="sm" className="ml-1 text-xs" onClick={onToday}>
          {t('time.today')}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Tabs value={mode} onValueChange={(v) => onModeChange(v as CalendarMode)}>
          <TabsList>
            <TabsTrigger value="month">{t('calendar.month')}</TabsTrigger>
            <TabsTrigger value="week">{t('calendar.week')}</TabsTrigger>
            <TabsTrigger value="day">{t('calendar.day')}</TabsTrigger>
          </TabsList>
        </Tabs>
        {rightSlot}
      </div>
    </div>
  );
}
