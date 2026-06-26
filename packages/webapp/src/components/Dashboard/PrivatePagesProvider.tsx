// @ts-nocheck
import React from 'react';
import { useApplicationBoot, BrandingThemeProvider } from '@/components';
import { useAuthMetadata } from '@/hooks/query/authentication';

/**
 * Private pages provider.
 */
export function PrivatePagesProvider({
  // #ownProps
  children,
}) {
  const { isLoading: isAppBootLoading } = useApplicationBoot();
  const { isLoading: isAuthMetaLoading } = useAuthMetadata();

  const isLoading = isAppBootLoading || isAuthMetaLoading;

  return (
    <React.Fragment>
      {!isLoading ? (
        <React.Fragment>
          <BrandingThemeProvider />
          {children}
        </React.Fragment>
      ) : null}
    </React.Fragment>
  );
}
