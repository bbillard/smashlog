export const palette = {
  bg: "#0D0D0F",
  bgOuter: "#080809",
  surface: "#16161A",
  surface2: "#1E1E24",
  border: "rgba(255,255,255,0.07)",
  accent: "#CEFF00",
  accent2: "#FF4D6D",
  accent3: "#00E5FF",
  text: "#F0F0F2",
  textMuted: "#6B6B7A",
  textDim: "#9999AA",
  white: "#FFFFFF",
  black: "#000000",
  danger: "#FF4D6D",
};

export const lightTheme = {
  background: palette.bg,
  backgroundAlt: palette.bgOuter,
  surface: palette.surface,
  surfaceAlt: palette.surface2,
  text: palette.text,
  secondaryText: palette.textMuted,
  tertiaryText: palette.textDim,
  primary: palette.accent,
  primaryMuted: "rgba(206,255,0,0.06)",
  accent: palette.accent,
  accent2: palette.accent2,
  accent3: palette.accent3,
  border: palette.border,
  danger: palette.danger,
  shadow: "rgba(0, 0, 0, 0.3)",
  headerText: palette.text,
  tabInactive: palette.textMuted,
  buttonTextOnPrimary: palette.black,
  buttonTextOnSecondary: palette.text,
};

export const darkTheme = {
  ...lightTheme,
};
