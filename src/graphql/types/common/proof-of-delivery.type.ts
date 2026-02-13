import { ObjectType, Field, ID } from '@nestjs/graphql';
import { PodUploadType } from '../../enums';

@ObjectType()
export class ProofOfDelivery {
  @Field(() => ID)
  id: string;

  @Field()
  shipmentId: string;

  @Field(() => PodUploadType)
  uploadType: PodUploadType;

  @Field()
  storageBucket: string;

  @Field()
  storagePath: string;

  @Field()
  uploadedByProfileId: string;

  @Field()
  createdAt: Date;
}
