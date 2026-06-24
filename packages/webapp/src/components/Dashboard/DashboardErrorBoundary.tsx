// @ts-nocheck
import React from 'react';
import { FormattedMessage as T } from '@/components';
import { FinqoraLogo } from '@/components/Icons/FinqoraLogo';

export default function DashboardErrorBoundary({}) {
  return (
    <div class="dashboard__error-boundary">
      <h1>
        <T id={'sorry_about_that_something_went_wrong'} />
      </h1>
      <p>
        <T id={'if_the_problem_stuck_please_contact_us_as_soon_as_possible'} />
      </p>
      <FinqoraLogo height={30} width={160} />
    </div>
  );
}
