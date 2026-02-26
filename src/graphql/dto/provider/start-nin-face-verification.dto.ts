import { Field, InputType } from '@nestjs/graphql';
import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

@InputType()
export class StartNinFaceVerificationDto {
  @Field({ nullable: true })
  @IsOptional()
  @IsUUID()
  providerId?: string;

  @Field()
  @IsUUID()
  faceMediaId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{11}$/)
  numberNin: string;

  @Field()
  @IsDateString()
  dateOfBirth: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  lastName?: string;
}
