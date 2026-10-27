export type FieldErrors = Record<string, string>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim())
}

export function validatePassword(password: string): string | undefined {
  if (password.length < 8) {
    return 'Use at least 8 characters.'
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Include at least one letter and one number.'
  }
  return undefined
}

export function validateLogin(values: { email: string; password: string }): FieldErrors {
  const errors: FieldErrors = {}
  if (!values.email.trim()) {
    errors.email = 'Enter your email.'
  } else if (!isValidEmail(values.email)) {
    errors.email = 'Enter a valid email address.'
  }
  if (!values.password) {
    errors.password = 'Enter your password.'
  }
  return errors
}

export function validateSignup(values: {
  name: string
  email: string
  password: string
  confirmPassword: string
}): FieldErrors {
  const errors: FieldErrors = {}
  if (!values.name.trim()) {
    errors.name = 'Enter your name.'
  }
  if (!values.email.trim()) {
    errors.email = 'Enter your email.'
  } else if (!isValidEmail(values.email)) {
    errors.email = 'Enter a valid email address.'
  }
  const passwordError = validatePassword(values.password)
  if (passwordError) {
    errors.password = passwordError
  }
  if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Passwords do not match.'
  }
  return errors
}
