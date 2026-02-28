import { UserType, State } from '../../graphql/enums';

export class UserSignedUpEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly roles: UserType[],
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly state: State,
    public readonly referralCode?: string,
    public readonly phoneNumber?: string,
    public readonly businessName?: string,
    public readonly businessAddress?: string,
  ) {}
}
