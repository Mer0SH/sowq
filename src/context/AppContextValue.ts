import { createContext } from 'react';
import type { AppContextType } from './AppContext';

// Keep the context object stable when the provider component is hot replaced.
export const AppContext = createContext<AppContextType | null>(null);
