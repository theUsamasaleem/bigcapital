// @ts-nocheck
import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import { isAuthenticated } from '@/store/authentication/authentication.reducer';
import {
  setAuthToken,
  setAuthUserId,
  setEmailConfirmed,
  setLogin,
  setOrganizationId,
  setLocale,
} from '@/store/authentication/authentication.actions';
import { useQueryClient } from '@tanstack/react-query';
import { removeCookie, getCookie } from '@/utils';

/**
 * Best-effort call to record the logout in the audit trail before the session
 * is cleared. Fire-and-forget; never blocks or fails the logout.
 */
function recordSignout() {
  try {
    const token = getCookie('token', null);
    if (!token) return;
    fetch('/api/auth/signout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'organization-id': getCookie('organization_id', '') || '',
      },
      keepalive: true,
    }).catch(() => {});
  } catch (e) {
    /* ignore — logout must always proceed */
  }
}

/**
 * Removes the authentication cookies.
 */
function removeAuthenticationCookies() {
  removeCookie('token');
  removeCookie('organization_id');
  removeCookie('tenant_id');
  removeCookie('authenticated_user_id');
  removeCookie('locale');
}

export const useAuthActions = () => {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();

  return {
    setLogin: useCallback((login) => dispatch(setLogin(login)), [dispatch]),
    setLogout: useCallback(() => {
      // Record the logout for the audit trail while the token is still present.
      recordSignout();

      // Remove all cached queries.
      queryClient.removeQueries();

      removeAuthenticationCookies();

      window.location.reload();
    }, [queryClient]),
  };
};

/**
 * Retrieve whether the user is authenticated.
 */
export const useIsAuthenticated = () => {
  return useSelector(isAuthenticated);
};

/**
 * Retrieve the authentication token.
 */
export const useAuthToken = () => {
  return useSelector((state) => state.authentication.token);
};

/**
 * Retrieve the authentication user.
 */
export const useAuthUser = () => {
  return useSelector((state) => ({}));
};

/**
 * Retrieve the authenticated organization id.
 */
export const useAuthOrganizationId = () => {
  return useSelector((state) => state.authentication.organizationId);
};

/**
 * Retrieves the user's email verification status.
 */
export const useAuthUserVerified = () => {
  return useSelector((state) => state.authentication.verified);
};

/**
 * Retrieves the user's email address.
 * @returns {string}
 */
export const useAuthUserVerifyEmail = () => {
  return useSelector((state) => state.authentication.verifyEmail);
};

/**
 * Sets the user's email verification status.
 */
export const useSetAuthEmailConfirmed = () => {
  const dispatch = useDispatch();

  return useCallback(
    (verified?: boolean = true, email: string) =>
      dispatch(setEmailConfirmed(verified, email)),
    [dispatch],
  );
};

export const useSetOrganizationId = () => {
  const dispatch = useDispatch();

  return useCallback(
    (organizationId: string) => dispatch(setOrganizationId(organizationId)),
    [dispatch],
  );
};

export const useSetAuthToken = () => {
  const dispatch = useDispatch();

  return useCallback(
    (authToken: string) => dispatch(setAuthToken(authToken)),
    [dispatch],
  );
};

export const useSetAuthUserId = () => {
  const dispatch = useDispatch();

  return useCallback(
    (userId: string) => dispatch(setAuthUserId(userId)),
    [dispatch],
  );
};

export const useSetLocale = () => {
  const dispatch = useDispatch();

  return useCallback(
    (locale: string) => dispatch(setLocale(locale)),
    [dispatch],
  );
};
