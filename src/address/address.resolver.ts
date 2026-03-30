import { UseGuards } from '@nestjs/common';
import { Args, Float, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CreateUserAddressDto, UserAddress } from '../graphql';
import { State } from '../graphql/enums';
import { AddressService } from './address.service';
import { SearchAddressInput } from './dto/search-address.input';
import { AddressSuggestion } from './types/address-suggestion.type';
import { ResolvedAddress } from './types/resolved-address.type';
import type { AuthUser } from '../auth/auth.types';

@Resolver()
export class AddressResolver {
  constructor(private readonly addressService: AddressService) {}

  @Query(() => [UserAddress])
  @UseGuards(GqlAuthGuard)
  async myUserAddresses(@CurrentUser() user: AuthUser): Promise<UserAddress[]> {
    return this.addressService.getMyUserAddresses(user.id);
  }

  @Mutation(() => UserAddress)
  @UseGuards(GqlAuthGuard)
  async createUserAddress(
    @CurrentUser() user: AuthUser,
    @Args('input') input: CreateUserAddressDto,
  ): Promise<UserAddress> {
    return this.addressService.createUserAddress(user.id, input);
  }

  @Mutation(() => UserAddress)
  @UseGuards(GqlAuthGuard)
  async setActiveUserAddress(
    @CurrentUser() user: AuthUser,
    @Args('addressId') addressId: string,
  ): Promise<UserAddress> {
    return this.addressService.setActiveUserAddress(user.id, addressId);
  }

  @Query(() => [State])
  @UseGuards(GqlAuthGuard)
  async availableStates(): Promise<State[]> {
    return this.addressService.getAvailableStates();
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
