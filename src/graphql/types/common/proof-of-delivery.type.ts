import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class ProofOfDelivery {
  @Field(() => ID)
  id: string;

  @Field()
  jobId: string;

  @Field()
  recipientName: string;

  @Field({ nullable: true })
  recipientSignatureUrl?: string;

  @Field({ nullable: true })
  photoUrl?: string;

  @Field({ nullable: true })
  notes?: string;

  @Field()
  latitude: number;

  @Field()
  longitude: number;

  @Field()
  capturedAt: Date;

  @Field()
  uploadedByProfileId: string;

  @Field()
  createdAt: Date;
}
