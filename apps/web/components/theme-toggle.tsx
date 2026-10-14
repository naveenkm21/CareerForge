'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@careerforge/ui';

const ORDER = ['system', 'light', 'dark'] as const;
const ICONS = { system: Monitor, light: Sun, dark: Moon };

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current = (
    mounted && ORDER.includes(theme as (typeof ORDER)[number]) ? theme : 'system'
  ) as (typeof ORDER)[number];
  const Icon = ICONS[current];
  const nextTheme = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]!;
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Theme: ${current}. Switch to ${nextTheme}.`}
      title={`Theme: ${current}`}
      onClick={() => setTheme(nextTheme)}
    >
      <Icon size={16} />
    </Button>
  );
}
