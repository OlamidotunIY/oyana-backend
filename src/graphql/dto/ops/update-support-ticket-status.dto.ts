import { Field, InputType } from '@nestjs/graphql';
import { SupportTicketStatus } from '../../enums';

@InputType()
export class UpdateSupportTicketStatusDto {
  @Field()
  ticketId: string;

  @Field(() => SupportTicketStatus)
  status: SupportTicketStatus;
}
