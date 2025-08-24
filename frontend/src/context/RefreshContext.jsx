import React, { createContext, useContext, useState, useCallback } from 'react';

const RefreshContext = createContext({ refresh: () => {}, refreshKey: 0 });

export function useRefresh() {
  return useContext(RefreshContext);
}

export function RefreshProvider({ children }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);
  return (
    <RefreshContext.Provider value={{ refresh, refreshKey }}>
      {children}
    </RefreshContext.Provider>
  );
}
