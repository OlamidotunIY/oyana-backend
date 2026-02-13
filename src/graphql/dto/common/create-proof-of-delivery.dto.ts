import { InputType, Field } from '@nestjs/graphql';
import { PodUploadType } from '../../enums';

@InputType()
export class CreateProofOfDeliveryDto {
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
}
