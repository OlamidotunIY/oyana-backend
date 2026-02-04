import { InputType, Field } from '@nestjs/graphql';

@InputType()
export class CreateProofOfDeliveryDto {
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
  uploadedByProfileId: string;
}
