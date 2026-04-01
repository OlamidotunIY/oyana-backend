import { Field, InputType } from '@nestjs/graphql';
import { SupportTicketPriority } from '../../enums';

@InputType()
export class CreateSupportTicketDto {
  @Field()
  subject: string;

  @Field()
  category: string;

  @Field(() => SupportTicketPriority, { nullable: true })
  priority?: SupportTicketPriority;

  @Field()
  description: string;

  @Field(() => String, { nullable: true })
  referenceId?: string;
}
