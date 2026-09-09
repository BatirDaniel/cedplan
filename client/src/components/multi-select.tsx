import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronsUpDown, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface MultiSelectOption {
  value: string;
  label: string;
  indicator?: React.ReactNode;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
  className,
}: {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  const selectedOptions = options.filter((o) => selected.includes(o.value));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className={cn('h-8 justify-between gap-1.5 border-dashed', className)}
        >
          <span className="text-muted-foreground">{placeholder ?? t('common.filter')}</span>
          {selectedOptions.length > 0 && (
            <>
              <span className="bg-border mx-0.5 h-4 w-px" />
              <span className="flex gap-1">
                {selectedOptions.length <= 2 ? (
                  selectedOptions.map((o) => (
                    <Badge variant="secondary" key={o.value} className="rounded-sm px-1.5 font-normal">
                      {o.label}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="secondary" className="rounded-sm px-1.5 font-normal">
                    {t('common.selectedCount', { count: selectedOptions.length })}
                  </Badge>
                )}
              </span>
            </>
          )}
          <ChevronsUpDown className="size-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder={t('common.search') + '...'} className="h-8" />
          <CommandList>
            <CommandEmpty>{t('common.noResults')}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <CommandItem key={option.value} onSelect={() => toggle(option.value)}>
                    <div
                      className={cn(
                        'flex size-3.5 items-center justify-center rounded-sm border',
                        isSelected ? 'bg-primary border-primary text-primary-foreground' : 'opacity-50'
                      )}
                    >
                      {isSelected && <Check className="size-3" />}
                    </div>
                    {option.indicator}
                    <span>{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selected.length > 0 && (
              <>
                <div className="border-t" />
                <CommandGroup>
                  <CommandItem onSelect={() => onChange([])} className="justify-center text-center text-muted-foreground">
                    <X className="size-3.5" />
                    {t('common.clearFilters')}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
