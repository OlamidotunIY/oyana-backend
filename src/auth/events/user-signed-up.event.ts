import { UserRole } from '../../graphql/enums';

export class UserSignedUpEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly role: UserRole | null,
  ) {}
}
