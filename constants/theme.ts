import { Platform } from 'react-native';

export const AppColors = {
  primary: '#1D9E75',
  background: '#FFFFFF',
  text: '#1A1A1A',
  secondaryText: '#555555',
  border: '#E8E8E8',
  cardBg: '#F7F9F8',
  category: {
    wildlife: '#BA7517',
    plant: '#639922',
    marine: '#378ADD',
    invasive: '#E24B4A',
  },
};

export const Colors = {
  light: {
    text: '#1A1A1A',
    background: '#FFFFFF',
    tint: '#1D9E75',
    icon: '#555555',
    tabIconDefault: '#555555',
    tabIconSelected: '#1D9E75',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#1D9E75',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#1D9E75',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
