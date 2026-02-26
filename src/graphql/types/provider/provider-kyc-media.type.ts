import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLBigInt } from '../../scalars';

@ObjectType()
export class ProviderKycMedia {
  @Field(() => ID)
  id: string;

  @Field()
  providerId: string;

  @Field({ nullable: true })
  checkId?: string;

  @Field()
  storageBucket: string;

  @Field()
  storagePath: string;

  @Field({ nullable: true })
  mimeType?: string;

  @Field(() => GraphQLBigInt, { nullable: true })
  sizeBytes?: bigint;

  @Field()
  uploadState: string;

  @Field({ nullable: true })
  uploadedByProfileId?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
