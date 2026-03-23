export const colors = {
  bg:         '#070C1A',
  surface:    'rgba(255,255,255,0.07)',
  surfaceHi:  'rgba(255,255,255,0.11)',
  surfaceAct: 'rgba(99,179,255,0.13)',
  border:     'rgba(255,255,255,0.13)',
  borderHi:   'rgba(255,255,255,0.22)',
  borderBlue: 'rgba(99,179,255,0.50)',
  blue:       '#4FA3FF',
  blueDim:    'rgba(79,163,255,0.18)',
  blueGlow:   'rgba(79,163,255,0.35)',
  t1:  '#EFF6FF',
  t2:  'rgba(239,246,255,0.78)',
  t3:  'rgba(239,246,255,0.48)',
  t4:  'rgba(239,246,255,0.30)',
  green:  '#34D399',
  red:    '#F87171',
  yellow: '#FCD34D',
  plateBg:     '#FFF9C4',
  plateBorder: '#CDBA00',
  // legacy aliases
  primary:    '#070C1A',
  accent:     '#4FA3FF',
  background: '#070C1A',
  surface_:   '#ffffff',
  text: {
    primary:  '#EFF6FF',
    secondary:'rgba(239,246,255,0.78)',
    inverse:  '#EFF6FF',
    muted:    'rgba(239,246,255,0.48)',
  },
  country: {
    GB: '#012169',
    US: '#B22234',
    JP: '#1a1a1a',
  },
};

export const spacing = {
  xs: 4,  sm: 8,  md: 16,
  lg: 24, xl: 32, xxl: 48,
};

export const radius = {
  sm: 6, md: 12, lg: 18, xl: 24, full: 9999,
};

export const font = {
  sizes: {
    xs: 11, sm: 13, md: 15,
    lg: 17, xl: 20, xxl: 26, xxxl: 34,
  },
  weights: {
    regular:   '400' as const,
    medium:    '500' as const,
    semibold:  '600' as const,
    bold:      '700' as const,
    extrabold: '800' as const,
  },
};
