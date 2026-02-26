import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class KycUploadUrl {
  @Field()
  mediaId: string;

  @Field()
  storageBucket: string;

  @Field()
  storagePath: string;

  @Field()
  uploadUrl: string;

  @Field()
  expiresAt: Date;
}
