import { createTheme } from '@vanilla-extract/css';
import { color } from 'folds';
import { forgeDark, forgeLight } from './app/features/forge-theme/palette';

export const forgeLightTheme = createTheme(color, forgeLight);

export const forgeDarkTheme = createTheme(color, forgeDark);
