// Hook type definitions for @intcloudsysops/components

export interface AuthContextType {
  user: { id: string; email: string } | null;
  loading: boolean;
  error: string | null;
}

export interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export interface APIContextType {
  baseUrl: string;
  headers: Record<string, string>;
}
