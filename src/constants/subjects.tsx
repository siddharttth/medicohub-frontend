import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useThemeStore, getTheme } from '../store/themeStore';
import { Subject } from '../types';

// ── Canonical subject list ────────────────────────────────────────────────────
export const SUBJECTS: Subject[] = [
  'Anatomy', 'Physiology', 'Biochemistry', 'Pathology',
  'Pharmacology', 'Microbiology', 'Surgery', 'Medicine',
];

// Each subject carries 5 tokens:
//   bg          — very light tint for read-only badge backgrounds (cards)
//   activeBg    — slightly stronger tint for selected/active pill backgrounds
//   text        — the subject accent colour for text & icon use
//   border      — subtle border for read-only badges
//   activeBorder— more visible border for selected/active pills
//   fill        — pure accent hex (kept for gradient/progress-bar use only)

const SUBJECT_COLORS_DARK: Record<string, {
  bg: string; activeBg: string; text: string; border: string; activeBorder: string; fill: string;
}> = {
  Anatomy:      { bg: 'rgba(207,188,255,0.10)', activeBg: 'rgba(207,188,255,0.18)', text: '#cfbcff', border: 'rgba(207,188,255,0.16)', activeBorder: 'rgba(207,188,255,0.45)', fill: '#cfbcff' },
  Physiology:   { bg: 'rgba(74,222,128,0.10)',  activeBg: 'rgba(74,222,128,0.18)',  text: '#4ade80', border: 'rgba(74,222,128,0.16)',  activeBorder: 'rgba(74,222,128,0.45)',  fill: '#4ade80' },
  Biochemistry: { bg: 'rgba(96,165,250,0.10)',  activeBg: 'rgba(96,165,250,0.18)',  text: '#60a5fa', border: 'rgba(96,165,250,0.16)',  activeBorder: 'rgba(96,165,250,0.45)',  fill: '#60a5fa' },
  Pathology:    { bg: 'rgba(251,146,60,0.10)',  activeBg: 'rgba(251,146,60,0.18)',  text: '#fb923c', border: 'rgba(251,146,60,0.16)',  activeBorder: 'rgba(251,146,60,0.45)',  fill: '#fb923c' },
  Pharmacology: { bg: 'rgba(244,114,182,0.10)', activeBg: 'rgba(244,114,182,0.18)', text: '#f472b6', border: 'rgba(244,114,182,0.16)', activeBorder: 'rgba(244,114,182,0.45)', fill: '#f472b6' },
  Microbiology: { bg: 'rgba(34,211,238,0.10)',  activeBg: 'rgba(34,211,238,0.18)',  text: '#22d3ee', border: 'rgba(34,211,238,0.16)',  activeBorder: 'rgba(34,211,238,0.45)',  fill: '#22d3ee' },
  Surgery:      { bg: 'rgba(251,191,36,0.10)',  activeBg: 'rgba(251,191,36,0.18)',  text: '#fbbf24', border: 'rgba(251,191,36,0.16)',  activeBorder: 'rgba(251,191,36,0.45)',  fill: '#fbbf24' },
  Medicine:     { bg: 'rgba(167,139,250,0.10)', activeBg: 'rgba(167,139,250,0.18)', text: '#a78bfa', border: 'rgba(167,139,250,0.16)', activeBorder: 'rgba(167,139,250,0.45)', fill: '#a78bfa' },
};

const SUBJECT_COLORS_LIGHT: Record<string, {
  bg: string; activeBg: string; text: string; border: string; activeBorder: string; fill: string;
}> = {
  Anatomy:      { bg: 'rgba(94,53,177,0.07)',  activeBg: 'rgba(94,53,177,0.12)',  text: '#5E35B1', border: 'rgba(94,53,177,0.15)',  activeBorder: 'rgba(94,53,177,0.40)',  fill: '#5E35B1' },
  Physiology:   { bg: 'rgba(22,163,74,0.07)',  activeBg: 'rgba(22,163,74,0.12)',  text: '#16A34A', border: 'rgba(22,163,74,0.15)',  activeBorder: 'rgba(22,163,74,0.40)',  fill: '#16A34A' },
  Biochemistry: { bg: 'rgba(37,99,235,0.07)',  activeBg: 'rgba(37,99,235,0.12)',  text: '#2563EB', border: 'rgba(37,99,235,0.15)',  activeBorder: 'rgba(37,99,235,0.40)',  fill: '#2563EB' },
  Pathology:    { bg: 'rgba(194,65,12,0.07)',  activeBg: 'rgba(194,65,12,0.12)',  text: '#C2410C', border: 'rgba(194,65,12,0.15)',  activeBorder: 'rgba(194,65,12,0.40)',  fill: '#C2410C' },
  Pharmacology: { bg: 'rgba(190,24,93,0.07)',  activeBg: 'rgba(190,24,93,0.12)',  text: '#BE185D', border: 'rgba(190,24,93,0.15)',  activeBorder: 'rgba(190,24,93,0.40)',  fill: '#BE185D' },
  Microbiology: { bg: 'rgba(8,145,178,0.07)',  activeBg: 'rgba(8,145,178,0.12)',  text: '#0891B2', border: 'rgba(8,145,178,0.15)',  activeBorder: 'rgba(8,145,178,0.40)',  fill: '#0891B2' },
  Surgery:      { bg: 'rgba(180,83,9,0.07)',   activeBg: 'rgba(180,83,9,0.12)',   text: '#B45309', border: 'rgba(180,83,9,0.15)',   activeBorder: 'rgba(180,83,9,0.40)',   fill: '#B45309' },
  Medicine:     { bg: 'rgba(109,40,217,0.07)', activeBg: 'rgba(109,40,217,0.12)', text: '#6D28D9', border: 'rgba(109,40,217,0.15)', activeBorder: 'rgba(109,40,217,0.40)', fill: '#6D28D9' },
};

const FALLBACK_DARK = { bg: 'rgba(207,188,255,0.10)', activeBg: 'rgba(207,188,255,0.18)', text: '#cfbcff', border: 'rgba(207,188,255,0.16)', activeBorder: 'rgba(207,188,255,0.45)', fill: '#cfbcff' };
const FALLBACK_LIGHT = { bg: 'rgba(94,53,177,0.07)',  activeBg: 'rgba(94,53,177,0.12)',  text: '#5E35B1', border: 'rgba(94,53,177,0.15)',  activeBorder: 'rgba(94,53,177,0.40)',  fill: '#5E35B1' };

export function getSubjectColor(subject: string, isDark: boolean) {
  const map = isDark ? SUBJECT_COLORS_DARK : SUBJECT_COLORS_LIGHT;
  return map[subject] ?? (isDark ? FALLBACK_DARK : FALLBACK_LIGHT);
}

export function getSubjectFill(subject: string, isDark: boolean): string {
  return getSubjectColor(subject, isDark).fill;
}

// ── SubjectPill ───────────────────────────────────────────────────────────────
//
// Active state  → translucent tinted bg (activeBg) + subject-coloured text
//                 + stronger subject-coloured border (activeBorder)
//                 No heavy solid fill — always feels light and modern.
//
// Inactive state → neutral card bg + muted text + hairline border
//
// variant='pill'  — interactive selector row (Notes filters, Exam, Drops)  borderRadius 999
// variant='badge' — read-only label inside a card                          borderRadius 8
//
export function SubjectPill({
  subject,
  active,
  onPress,
  variant = 'pill',
}: {
  subject: string;
  active: boolean;
  onPress?: () => void;
  variant?: 'pill' | 'badge';
}) {
  const isDark = useThemeStore((s) => s.isDark);
  const t = getTheme(isDark);
  const sc = getSubjectColor(subject, isDark);
  const radius = variant === 'badge' ? 8 : 999;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.72 : 1}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: radius,
        marginRight: 8,
        backgroundColor: active ? sc.activeBg : t.card,
        borderWidth: active ? 1.5 : 1,
        borderColor: active ? sc.activeBorder : t.cardBorder,
      }}
    >
      <Text style={{
        fontFamily: active ? 'Inter_700Bold' : 'Inter_500Medium',
        fontSize: 10,
        letterSpacing: 1.1,
        textTransform: 'uppercase',
        color: active ? sc.text : t.onSurfaceVariant,
      }}>
        {subject}
      </Text>
    </TouchableOpacity>
  );
}
