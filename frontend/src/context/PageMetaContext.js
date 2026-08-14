import React, { createContext, useState } from 'react';

export const PageMetaContext = createContext({ visitorName: null, setVisitorName: () => {} });

export const PageMetaProvider = ({ children }) => {
  const [visitorName, setVisitorName] = useState(null);

  return (
    <PageMetaContext.Provider value={{ visitorName, setVisitorName }}>
      {children}
    </PageMetaContext.Provider>
  );
};
