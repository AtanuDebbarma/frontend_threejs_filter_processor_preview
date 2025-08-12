import type {FilterItem} from '../../types/filterTypes';

export const FILTERS: FilterItem[] = [
  {
    name: 'Original',
    key: 'none',
    category: 'None',
    params: {},
  },

  // Color Boost - Enhanced with professional vibrancy
  {
    name: 'Vivid Pop',
    key: 'vivid_pop',
    category: 'Color Boost',
    params: {
      brightness: 0.08,
      saturation: 1.45,
      contrast: 1.35,
      gamma: 1.1,
      colorBalance: {r: 0.05, g: 0.02, b: -0.03},
      ffmpeg:
        'colorbalance=rs=0.05:gs=0.02:bs=-0.03,eq=brightness=0.08:saturation=1.45:contrast=1.35:gamma=1.1',
      order: ['colorBalance', 'eq'],
    },
  },

  {
    name: 'Vibrance Boost',
    key: 'vibrance_boost',
    category: 'Color Boost',
    params: {
      brightness: 0.1,
      saturation: 1.5,
      contrast: 1.3,
      curves: [
        {
          channel: 'all',
          points: [
            {x: 0, y: 0},
            {x: 0.3, y: 0.4},
            {x: 0.7, y: 0.75},
            {x: 1, y: 1},
          ],
        },
      ],
      ffmpeg:
        "curves=all='0/0 0.3/0.4 0.7/0.75 1/1',eq=saturation=1.5:contrast=1.3:brightness=0.1",
      order: ['curves', 'eq'],
    },
  },

  {
    name: 'Ultra Clarity',
    key: 'ultra_clarity',
    category: 'Color Boost',
    params: {
      saturation: 1.1,
      contrast: 1.3,
      brightness: 0.08,
      unsharp: {amount: 1.2, radius: 3},
      colorBalance: {r: 0.03, g: 0.01, b: -0.02},
      ffmpeg:
        'unsharp=3:3:1.2:3:3:0.0,colorbalance=rs=0.03:gs=0.01:bs=-0.02,eq=saturation=1.1:contrast=1.3:brightness=0.08',
      order: ['unsharp', 'colorBalance', 'eq'],
    },
  },

  // Lifestyle - Instagram-inspired soft looks
  {
    name: 'Soft Vibes',
    key: 'soft_vibes',
    category: 'Lifestyle',
    params: {
      contrast: 1.12,
      saturation: 0.89,
      brightness: 0.04,
      curves: [
        {
          channel: 'all',
          points: [
            {x: 0, y: 0.01},
            {x: 0.5, y: 0.5},
            {x: 1, y: 0.98},
          ],
        },
      ],
      colorBalance: {r: 0.02, g: 0.01, b: 0.005},
      ffmpeg:
        "curves=all='0/0.01 0.5/0.5 1/0.98',colorbalance=rs=0.02:gs=0.01:bs=0.005,eq=contrast=1.12:saturation=0.89:brightness=0.04",
      order: ['curves', 'colorBalance', 'eq'],
    },
  },
  {
    name: 'Vintage Fade',
    key: 'vintage_fade',
    category: 'Lifestyle',
    params: {
      curves: [
        {
          channel: 'all',
          points: [
            {x: 0, y: 0},
            {x: 0.5, y: 0.7},
            {x: 1, y: 1},
          ],
        },
      ],
      colorBalance: {r: 0.1, g: 0.05, b: -0.1},
      ffmpeg:
        "curves=all='0/0 0.5/0.7 1/1',colorbalance=rs=0.1:gs=0.05:bs=-0.1",
      order: ['curves', 'colorBalance'],
    },
  },

  // Moody - Professional dark cinematic looks
  {
    name: 'Dark Fade',
    key: 'dark_fade',
    category: 'Moody',
    params: {
      curves: [
        {
          channel: 'all',
          points: [
            {x: 0, y: 0.05},
            {x: 0.5, y: 0.48},
            {x: 1, y: 1},
          ],
        },
      ],
      saturation: 0.8,
      contrast: 1.17,
      colorBalance: {r: 0.02, g: 0.01, b: 0.04},
      ffmpeg:
        "curves=all='0/0.05 0.5/0.48 1/1',colorbalance=rs=0.02:gs=0.01:bs=0.04,eq=saturation=0.8:contrast=1.17",
      order: ['curves', 'colorBalance', 'eq'],
    },
  },
  {
    name: 'Dusty Film',
    key: 'dusty_film',
    category: 'Moody',
    params: {
      colorBalance: {r: 0.1, b: -0.1},
      contrast: 0.95,
      saturation: 0.85,
      ffmpeg: 'colorbalance=rs=0.1:bs=-0.1,eq=contrast=0.95:saturation=0.85',
      order: ['colorBalance', 'eq'],
    },
  },

  // Portrait - Professional skin-friendly adjustments
  {
    name: 'Soft Skin',
    key: 'soft_skin',
    category: 'Portrait',
    params: {
      contrast: 1.3,
      saturation: 0.92,
      brightness: 0.1,
      ffmpeg: 'eq=contrast=1.3:saturation=0.92:brightness=0.1',
      order: ['eq'],
    },
  },

  {
    name: 'Warm Portrait',
    key: 'warm_portrait',
    category: 'Portrait',
    params: {
      brightness: 0.03,
      saturation: 1.1,
      colorBalance: {r: 0.2, g: 0.1}, // warm tint
      ffmpeg: 'colorbalance=rs=0.2:gs=0.1,eq=brightness=0.03:saturation=1.1',
      order: ['colorBalance', 'eq'],
    },
  },

  // Black & White - Professional monochrome looks
  {
    name: 'Mono Classic',
    key: 'mono_classic',
    category: 'Black & White',
    params: {
      saturation: 0,
      contrast: 1.15,
      brightness: 0.03,
      curves: [
        {
          channel: 'all',
          points: [
            {x: 0, y: 0},
            {x: 0.5, y: 0.52},
            {x: 1, y: 1},
          ],
        },
      ],
      ffmpeg:
        "curves=all='0/0 0.5/0.52 1/1',hue=s=0,eq=contrast=1.15:brightness=0.03",
      order: ['curves', 'eq'],
    },
  },

  {
    name: 'Silver Punch',
    key: 'silver_punch',
    category: 'Black & White',
    params: {
      saturation: 0,
      contrast: 1.4,
      brightness: 0.08,
      curves: [
        {
          channel: 'all',
          points: [
            {x: 0, y: 0.05},
            {x: 0.3, y: 0.25},
            {x: 0.7, y: 0.8},
            {x: 1, y: 1},
          ],
        },
      ],
      ffmpeg:
        "curves=all='0/0.05 0.3/0.25 0.7/0.8 1/1',hue=s=0,eq=contrast=1.4:brightness=0.08",
      order: ['curves', 'eq'],
    },
  },

  // Cinematic - Professional Hollywood-inspired looks
  {
    name: 'Teal & Orange',
    key: 'teal_orange',
    category: 'Cinematic',
    params: {
      saturation: 1.1,
      colorBalance: {r: 0.2, b: -0.2},
      ffmpeg: 'colorbalance=rs=0.2:bs=-0.2,eq=saturation=1.1',
      order: ['colorBalance', 'eq'],
    },
  },

  {
    name: 'Muted Shadows',
    key: 'muted_shadows',
    category: 'Cinematic',
    params: {
      saturation: 0.8,
      curves: [
        {
          channel: 'all',
          points: [
            {x: 0, y: 0},
            {x: 0.5, y: 0.55},
            {x: 1, y: 1},
          ],
        },
      ],
      ffmpeg: "curves=all='0/0 0.5/0.55 1/1',eq=saturation=0.8",
      order: ['curves', 'eq'],
    },
  },

  {
    name: 'Gold Rush',
    key: 'gold_rush',
    category: 'Cinematic',
    params: {
      contrast: 0.95,
      saturation: 1.2,
      brightness: 0.05,
      curves: [
        {
          channel: 'r',
          points: [
            {x: 0, y: 0},
            {x: 0.5, y: 0.65},
            {x: 1, y: 1},
          ],
        },
        {
          channel: 'g',
          points: [
            {x: 0, y: 0},
            {x: 0.5, y: 0.6},
            {x: 1, y: 1},
          ],
        },
      ],
      colorBalance: {r: 0.35, g: 0.15, b: -0.25},
      ffmpeg:
        "curves=red='0/0 0.5/0.65 1/1':green='0/0 0.5/0.6 1/1',colorbalance=rs=0.35:gs=0.15:bs=-0.25,eq=contrast=0.95:saturation=1.2:brightness=0.05",
      order: ['curves', 'colorBalance', 'eq'],
    },
  },

  // Nature
  {
    name: 'Green Pop',
    key: 'green_pop',
    category: 'Nature',
    params: {
      colorBalance: {r: -0.2, g: 0.2, b: -0.1},
      ffmpeg: 'colorbalance=rs=-0.2:gs=0.2:bs=-0.1',
      order: ['colorBalance'],
    },
  },

  {
    name: 'Sunny Day',
    key: 'sunny_day',
    category: 'Nature',
    params: {
      brightness: 0.07,
      saturation: 1.2,
      contrast: 1.1,
      ffmpeg: 'eq=brightness=0.07:saturation=1.2:contrast=1.1',
      order: ['eq'],
    },
  },

  // Landscape - Professional landscape enhancement
  {
    name: 'Blue Skies',
    key: 'blue_skies',
    category: 'Landscape',
    params: {
      brightness: 0.08,
      saturation: 1.3,
      contrast: 1.1,
      curves: [
        {
          channel: 'b',
          points: [
            {x: 0, y: 0},
            {x: 0.4, y: 0.5},
            {x: 0.8, y: 0.9},
            {x: 1, y: 1},
          ],
        },
      ],
      colorBalance: {r: -0.05, g: 0.02, b: 0.15},
      ffmpeg:
        "curves=blue='0.0/0.0 0.4/0.5 0.8/0.9 1.0/1.0',colorbalance=rs=-0.05:gs=0.02:bs=0.15,eq=brightness=0.08:saturation=1.3:contrast=1.1",
      order: ['curves', 'colorBalance', 'eq'],
    },
  },

  {
    name: 'Golden Hour',
    key: 'golden_hour',
    category: 'Landscape',
    params: {
      brightness: 0.05,
      saturation: 1.15,
      colorBalance: {r: 0.3, g: 0.2},
      ffmpeg: 'colorbalance=rs=0.3:gs=0.2,eq=brightness=0.05:saturation=1.15',
      order: ['colorBalance', 'eq'],
    },
  },
];
