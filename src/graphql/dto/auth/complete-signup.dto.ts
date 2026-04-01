import { Field, InputType } from '@nestjs/graphql';
import { IsString, MinLength, IsOptional, Matches } from 'class-validator';

@InputType()
export class CompleteSignupInput {
  @Field()
  @IsString()
  @MinLength(6)
  password: string;

  @Field()
  @IsString()
  @MinLength(2)
  fullName: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Phone number must be in E.164 format',
  })
  phoneE164?: string;
}
