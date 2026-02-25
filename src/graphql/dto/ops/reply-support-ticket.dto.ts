import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ReplySupportTicketDto {
  @Field()
  ticketId: string;

  @Field()
  message: string;
}
