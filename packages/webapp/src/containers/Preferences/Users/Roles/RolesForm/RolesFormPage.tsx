// @ts-nocheck
import React from 'react';
import { useParams } from 'react-router-dom';
import { RolesFormProvider } from './RolesFormProvider';
import { RolesForm } from './RolesForm';

/**
 * Roles Form page.
 */
export function RolesFormPage() {
  const { id } = useParams();
  const idInteger = id ? parseInt(id, 10) : undefined;

  return (
    <RolesFormProvider roleId={idInteger}>
      <RolesForm />
    </RolesFormProvider>
  );
}
