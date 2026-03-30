import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';

@InputType()
export class SignInWithGoogleInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
