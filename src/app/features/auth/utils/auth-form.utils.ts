import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

import { TranslateService } from '@ngx-translate/core';

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
  translate: TranslateService,
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
    return translate.instant('VALIDATION.FIELD_REQUIRED');
  }
  if (errors['email']) {
    return translate.instant('VALIDATION.EMAIL');
  }
  if (errors['minlength']) {
    return translate.instant('VALIDATION.FIELD_MIN_LENGTH', { min: errors['minlength'].requiredLength });
  }
  if (errors['passwordMismatch']) {
    return translate.instant('VALIDATION.PASSWORD_MISMATCH');
  }

  return translate.instant('VALIDATION.INVALID');
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
