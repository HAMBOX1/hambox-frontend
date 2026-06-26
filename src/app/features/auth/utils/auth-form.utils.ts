import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

import { ApiError } from '../../../core/models/api-error.model';

const SERVER_FIELD_MAP: Record<string, string> = {
  Email: 'email',
  Password: 'password',
  FirstName: 'firstName',
  LastName: 'lastName',
  NewPassword: 'newPassword',
  ConfirmPassword: 'confirmPassword',
};

export function applyServerValidationErrors(form: FormGroup, error: ApiError): void {
  if (!error.validationErrors) {
    return;
  }

  for (const [serverKey, messages] of Object.entries(error.validationErrors)) {
    const controlName =
      SERVER_FIELD_MAP[serverKey] ??
      serverKey.charAt(0).toLowerCase() + serverKey.slice(1);
    const control = form.get(controlName);

    if (control && messages[0]) {
      control.setErrors({ server: messages[0] });
      control.markAsTouched();
    }
  }
}

export function getControlErrorMessage(
  controlName: string,
  form: FormGroup,
  labels: Record<string, string>,
): string | null {
  const control = form.get(controlName);
  if (!control || !control.touched || !control.errors) {
    return null;
  }

  const errors = control.errors;
  if (errors['server']) {
    return String(errors['server']);
  }
  if (errors['required']) {
    return `${labels[controlName] ?? controlName} is required.`;
  }
  if (errors['email']) {
    return 'Enter a valid email address.';
  }
  if (errors['minlength']) {
    return `${labels[controlName] ?? controlName} must be at least ${errors['minlength'].requiredLength} characters.`;
  }
  if (errors['passwordMismatch']) {
    return 'Passwords do not match.';
  }

  return 'Invalid value.';
}

export const passwordsMatchValidator: ValidatorFn = (control: AbstractControl) => {
  const group = control as FormGroup;
  const password = group.get('password')?.value ?? group.get('newPassword')?.value;
  const confirm =
    group.get('confirmPassword')?.value ?? group.get('confirmNewPassword')?.value;

  if (password !== confirm) {
    group.get('confirmPassword')?.setErrors({ passwordMismatch: true });
    group.get('confirmNewPassword')?.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true } satisfies ValidationErrors;
  }

  return null;
};
