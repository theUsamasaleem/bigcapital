// @ts-nocheck
import React from 'react';
import classNames from 'classnames';
import { FinqoraLogo } from '@/components/Icons/FinqoraLogo';

import '@/style/components/BigcapitalLoading.scss';
import { useIsDarkMode } from '@/hooks/useDarkMode';

/**
 * Bigcapital logo loading.
 */
export default function BigcapitalLoading({ className }) {
  const isDarkmode = useIsDarkMode();

  return (
    <div className={classNames('bigcapital-loading', className)}>
      <div class="center">
        {isDarkmode ? (
          <FinqoraLogo
            height={37}
            width={228}
            color="#fff"
            className="bigcapital-logo"
          />
        ) : (
          <FinqoraLogo height={37} width={228} />
        )}
      </div>
    </div>
  );
}
