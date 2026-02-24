import { UseGuards } from '@nestjs/common';
import { Args, Float, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import type { SupabaseUser } from '../auth/supabase/supabase.types';
import { CreateUserAddressDto, UserAddress } from '../graphql';
import { AddressService } from './address.service';
import { SearchAddressInput } from './dto/search-address.input';
import { AddressSuggestion } from './types/address-suggestion.type';
import { ResolvedAddress } from './types/resolved-address.type';

@Resolver()
export class AddressResolver {
  constructor(private readonly addressService: AddressService) {}

  @Query(() => [UserAddress])
  @UseGuards(GqlAuthGuard)
  async myUserAddresses(@CurrentUser() user: SupabaseUser): Promise<UserAddress[]> {
    return this.addressService.getMyUserAddresses(user.id);
  }

  @Mutation(() => UserAddress)
  @UseGuards(GqlAuthGuard)
  async createUserAddress(
    @CurrentUser() user: SupabaseUser,
    @Args('input') input: CreateUserAddressDto,
  ): Promise<UserAddress> {
    return this.addressService.createUserAddress(user.id, input);
  }

  @Query(() => [AddressSuggestion])
  @UseGuards(GqlAuthGuard)
  async searchAddresses(
    @Args('input') input: SearchAddressInput,
  ): Promise<AddressSuggestion[]> {
    return this.addressService.searchAddresses(input);
  }

  @Query(() => ResolvedAddress, { nullable: true })
  @UseGuards(GqlAuthGuard)
  async currentAddress(
    @Args('lat', { type: () => Float }) lat: number,
    @Args('lng', { type: () => Float }) lng: number,
  ): Promise<ResolvedAddress | null> {
    return this.addressService.resolveCurrentAddress(lat, lng);
  }
}
