// @ts-nocheck
import React from 'react';
import intl from 'react-intl-universal';
import { Formik } from 'formik';
import { Intent } from '@blueprintjs/core';
import { pick, snakeCase } from 'lodash';
import { AppToaster } from '@/components';

import { withDialogActions } from '@/containers/Dialog/withDialogActions';

import { InviteUserFormSchema } from './InviteUserDialog.schema';
import { InviteUserFormContent } from './InviteUserFormContent';
import { useInviteUserFormContext } from './InviteUserFormProvider';

import { transformApiErrors } from './utils';

import { compose, objectKeysTransform } from '@/utils';

const initialValues = {
  email: '',
  role_id: '',
};

function InviteUserFormInner({
  // #withDialogActions
  closeDialog,
}) {
  const { dialogName, isEditMode, inviteUserMutate, userId } =
    useInviteUserFormContext();

  const initialFormValues = {
    ...initialValues,
    status: 1,
    ...(isEditMode &&
      pick(
        objectKeysTransform(userId, snakeCase),
        Object.keys(InviteUserFormSchema.fields),
      )),
  };

  const handleSubmit = (values, { setSubmitting, setErrors }) => {
    const form = { ...values };

    // Handle close the dialog after success response.
    const afterSubmit = () => {
      closeDialog(dialogName);
    };
    const onSuccess = (response) => {
      AppToaster.show({
        message: intl.get('teammate_invited_to_organization_account'),
        intent: Intent.SUCCESS,
      });
      afterSubmit(response);
    };

    // Handle the response error. Read errors defensively (SDK client puts them
    // under `error.data`, axios under `error.response.data`) so this never
    // throws on an unexpected error shape.
    const onError = (error) => {
      const errors =
        error?.data?.errors ?? error?.response?.data?.errors ?? [];

      const errorsTransformed = transformApiErrors(errors);

      setErrors({ ...errorsTransformed });
      setSubmitting(false);
    };
    inviteUserMutate(form).then(onSuccess).catch(onError);
  };

  return (
    <Formik
      validationSchema={InviteUserFormSchema}
      initialValues={initialFormValues}
      onSubmit={handleSubmit}
    >
      <InviteUserFormContent />
    </Formik>
  );
}
export const InviteUserForm = compose(withDialogActions)(InviteUserFormInner);
