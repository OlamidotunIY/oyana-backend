import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { RegistrationIntent } from '../../enums';

@InputType()
export class SignInWithGoogleInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @Field(() => RegistrationIntent, { nullable: true })
  @IsOptional()
  @IsEnum(RegistrationIntent)
  registrationIntent?: RegistrationIntent;
}
