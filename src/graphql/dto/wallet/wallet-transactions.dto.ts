import { Field, InputType, Int } from '@nestjs/graphql';
import {
  TransactionDirection,
  TransactionStatus,
  TransactionType,
} from '../../enums';

@InputType()
export class WalletTransactionsInput {
  @Field({ nullable: true })
  cursor?: string;

  @Field(() => Int, { nullable: true })
  take?: number;

  @Field(() => TransactionDirection, { nullable: true })
  direction?: TransactionDirection;

  @Field(() => TransactionStatus, { nullable: true })
  status?: TransactionStatus;

  @Field(() => TransactionType, { nullable: true })
  transactionType?: TransactionType;
}
