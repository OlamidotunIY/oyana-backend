import { UserType } from '../../graphql/enums';

export class UserSignedUpEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly userType: UserType,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly state: string,
    public readonly referralCode?: string,
    public readonly phoneNumber?: string,
    public readonly businessName?: string,
    public readonly businessAddress?: string,
  ) {}
}
