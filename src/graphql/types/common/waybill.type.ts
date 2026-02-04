import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class Waybill {
  @Field(() => ID)
  id: string;

  @Field()
  jobId: string;

  @Field()
  waybillNumber: string;

  @Field({ nullable: true })
  qrCodeUrl?: string;

  @Field({ nullable: true })
  barcodeUrl?: string;

  @Field()
  generatedAt: Date;

  @Field()
  createdAt: Date;
}
