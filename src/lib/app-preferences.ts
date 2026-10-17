"use client";

import { createContext, createElement, useContext } from "react";

const AppPreferencesContext = createContext({ userKey: "local" });

export function AppPreferencesProvider({ userKey, children }: { userKey: string; children: React.ReactNode }) {
  return createElement(AppPreferencesContext.Provider, { value: { userKey } }, children);
}

export function useAppPreferences() {
  return useContext(AppPreferencesContext);
}
