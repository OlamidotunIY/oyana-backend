export class AuthEmailOtpRequestedEvent {
  constructor(
    public readonly email: string,
    public readonly code: string,
    public readonly mode:
      | 'signup'
      | 'signin'
      | 'email_verification'
      | 'password_reset'
      | 'phone_verification',
  ) {}
}
