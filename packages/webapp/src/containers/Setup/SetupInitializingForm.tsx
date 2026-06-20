// @ts-nocheck
import React from 'react';
import { ProgressBar, Intent } from '@blueprintjs/core';
import * as R from 'ramda';
import { x } from '@xstyled/emotion';
import { css } from '@emotion/css';
import { useIsDarkMode } from '@/hooks/useDarkMode';

import { useCurrentOrganization } from '@/hooks/query';
import { FormattedMessage as T } from '@/components';

import { withOrganizationActions } from '@/containers/Organization/withOrganizationActions';
import { withCurrentOrganization } from '@/containers/Organization/withCurrentOrganization';
import { withOrganization } from '../Organization/withOrganization';

/**
 * Setup initializing step form.
 *
 * The organization database is built by a background (BullMQ) job on the server.
 * The build job id is NOT exposed on the organization payload, so we cannot poll
 * the job directly. Instead we poll the current organization and detect completion
 * via its `is_ready` flag. Once the organization is ready, the
 * `EnsureOrganizationIsNotReady` guard wrapping the setup page redirects to the
 * dashboard. If the build fails server-side, `is_build_running` flips back to
 * false (and `is_ready` stays false), so the wizard returns to the organization
 * step automatically.
 */
function SetupInitializingFormInner({
  // #withOrganization
  isOrganizationReady,
  isOrganizationBuildRunning,
}) {
  // Poll the current organization while the build is running so the redux org
  // state (`is_ready` / `is_build_running`) stays fresh. Stop once ready.
  useCurrentOrganization({
    refetchInterval: isOrganizationReady ? false : 2000,
  });

  return (
    <x.div w="95%" mx="auto" pt="16%">
      {isOrganizationReady ? (
        <SetupInitializingCompleted />
      ) : (
        <SetupInitializingRunning />
      )}
    </x.div>
  );
}

export const SetupInitializingForm = R.compose(
  withOrganizationActions,
  withCurrentOrganization(({ organizationTenantId }) => ({
    organizationId: organizationTenantId,
  })),
  withOrganization(({ isOrganizationReady, isOrganizationBuildRunning }) => ({
    isOrganizationReady,
    isOrganizationBuildRunning,
  })),
)(SetupInitializingFormInner);

/**
 * Setup initializing running state.
 */
function SetupInitializingRunning() {
  const isDarkMode = useIsDarkMode();

  const progressBarStyles = css`
    .bp4-progress-bar {
      border-radius: 40px;
      display: block;
      height: 6px;
      overflow: hidden;
      position: relative;
      width: 80%;
      margin: 0 auto;

      .bp4-progress-meter {
        background-color: #809cb3;
      }
    }
  `;

  return (
    <x.div>
      <x.div className={progressBarStyles}>
        <ProgressBar intent={Intent.NONE} value={null} />
      </x.div>

      <x.div textAlign="center" mt={35}>
        <x.h1
          fontSize={'22px'}
          fontWeight={500}
          color={isDarkMode ? 'rgba(255, 255, 255, 0.85)' : '#454c59'}
          mt={0}
          mb={'14px'}
        >
          <T id={'setup.initializing.title'} />
        </x.h1>
        <x.p
          w="70%"
          mx="auto"
          color={isDarkMode ? 'rgba(255, 255, 255, 0.7)' : '#2e4266'}
        >
          <T id={'setup.initializing.description'} />
        </x.p>
      </x.div>
    </x.div>
  );
}

/**
 * Setup initializing completed state.
 */
function SetupInitializingCompleted() {
  const isDarkMode = useIsDarkMode();

  return (
    <x.div>
      <x.div textAlign="center" mt={35}>
        <x.h1
          fontSize={'22px'}
          fontWeight={600}
          color={isDarkMode ? 'rgba(255, 255, 255, 0.85)' : '#454c59'}
          mt={0}
          mb={'14px'}
        >
          <T id={'setup.initializing.waiting_to_redirect'} />
        </x.h1>
        <x.p
          w="70%"
          mx="auto"
          color={isDarkMode ? 'rgba(255, 255, 255, 0.7)' : '#2e4266'}
        >
          <T
            id={'setup.initializing.refresh_the_page_if_redirect_not_worked'}
          />
        </x.p>
      </x.div>
    </x.div>
  );
}
