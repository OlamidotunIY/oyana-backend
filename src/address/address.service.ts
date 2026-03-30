import {
  BadRequestException,
  NotFoundException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import axios, { AxiosInstance } from 'axios';
import { PrismaService } from '../database/prisma.service';
import { CreateUserAddressDto, UserAddress } from '../graphql';
import { SearchAddressInput } from './dto/search-address.input';
import { AddressSuggestion } from './types/address-suggestion.type';
import { ResolvedAddress } from './types/resolved-address.type';
import type {
  State as PrismaState,
  UserAddress as PrismaUserAddress,
} from '@prisma/client';
import type {
  GoogleAutocompleteResponse,
  GoogleGeocodeResponse,
  GoogleGeocodeResult,
  GoogleAddressComponent,
} from './types/google-api.types';

@Injectable()
export class AddressService {
  private static readonly GOOGLE_PLACES_AUTOCOMPLETE_URL =
    'https://maps.googleapis.com/maps/api/place/autocomplete/json';
  private static readonly GOOGLE_GEOCODE_URL =
    'https://maps.googleapis.com/maps/api/geocode/json';

  private readonly httpClient: AxiosInstance;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.httpClient = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getMyUserAddresses(profileId: string): Promise<UserAddress[]> {
    const [profile, addresses] = await Promise.all([
      this.prisma.profile.findUnique({
        where: { id: profileId },
        select: {
          activeAddressId: true,
        },
      }),
      this.prisma.userAddress.findMany({
        where: { profileId },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return addresses.map((address) =>
      this.toGraphqlUserAddress(address, address.id === profile?.activeAddressId),
    );
  }

  async createUserAddress(
    profileId: string,
    input: CreateUserAddressDto,
  ): Promise<UserAddress> {
    const placeId = input.placeId?.trim();
    if (!placeId) {
      throw new BadRequestException('placeId is required');
    }

    const resolvedAddress = await this.resolveAddressFromPlaceId(placeId);
    if (!resolvedAddress) {
      throw new BadRequestException('Unable to resolve address from placeId');
    }

    const state = this.mapToSupportedState(resolvedAddress.stateOrProvince);
    if (!state) {
      throw new BadRequestException(
        `Address state "${resolvedAddress.stateOrProvince ?? 'unknown'}" is not currently supported`,
      );
    }

    const addressLine =
      resolvedAddress.addressLine?.trim() ||
      resolvedAddress.formattedAddress?.trim();
    if (!addressLine) {
      throw new BadRequestException('Resolved address line is missing');
    }

    const city = resolvedAddress.city?.trim();
    if (!city) {
      throw new BadRequestException('Resolved city is missing');
    }

    const postalCode = this.resolvePostalCode(resolvedAddress);

    const countryCode =
      input.countryCode?.trim().toUpperCase() ||
      resolvedAddress.countryCode?.trim().toUpperCase() ||
      'NG';
    if (!/^[A-Z]{2}$/.test(countryCode)) {
      throw new BadRequestException('Resolved country code is invalid');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const profile = await tx.profile.findUnique({
        where: { id: profileId },
        select: {
          activeAddressId: true,
        },
      });

      if (!profile) {
        throw new NotFoundException('Profile not found');
      }

      const address = await tx.userAddress.create({
        data: {
          id: randomUUID(),
          profileId,
          address: addressLine,
          city,
          state,
          postalCode,
          label: input.label?.trim() || undefined,
          countryCode,
          lat: resolvedAddress.latitude,
          lng: resolvedAddress.longitude,
        },
      });

      const isActive = input.setAsActive === true || !profile.activeAddressId;
      if (isActive) {
        await tx.profile.update({
          where: { id: profileId },
          data: {
            activeAddressId: address.id,
          },
        });
      }

      return {
        address,
        isActive,
      };
    });

    return this.toGraphqlUserAddress(created.address, created.isActive);
  }

  async setActiveUserAddress(
    profileId: string,
    addressId: string,
  ): Promise<UserAddress> {
    const address = await this.prisma.userAddress.findFirst({
      where: {
        id: addressId,
        profileId,
      },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    await this.prisma.profile.update({
      where: { id: profileId },
      data: {
        activeAddressId: address.id,
      },
    });

    return this.toGraphqlUserAddress(address, true);
  }

  async searchAddresses(
    input: SearchAddressInput,
  ): Promise<AddressSuggestion[]> {
    const query = input.query.trim();
    if (!query) {
      return [];
    }

    const apiKey = this.getGoogleApiKey();
    const params: Record<string, string> = {
      input: query,
      key: apiKey,
      types: 'address',
    };

    const countryCode = (
      input.countryCode ??
      this.configService.get<string>('GOOGLE_PLACES_DEFAULT_COUNTRY_CODE')
    )?.trim();
    if (countryCode) {
      params.components = `country:${countryCode.toLowerCase()}`;
    }

    const sessionToken = input.sessionToken?.trim();
    if (sessionToken) {
      params.sessiontoken = sessionToken;
    }

    const limit = this.clampLimit(input.limit);

    try {
      const response = await this.httpClient.get<GoogleAutocompleteResponse>(
        AddressService.GOOGLE_PLACES_AUTOCOMPLETE_URL,
        { params },
      );

      const payload = response.data;
      if (payload.status !== 'OK' && payload.status !== 'ZERO_RESULTS') {
        throw new BadRequestException(
          payload.error_message || 'Unable to search addresses at this time',
        );
      }

      const autocompleteSuggestions = (payload.predictions ?? [])
        .slice(0, limit)
        .map((prediction) => ({
          placeId: prediction.place_id,
          description: prediction.description,
          mainText: prediction.structured_formatting?.main_text ?? undefined,
          secondaryText:
            prediction.structured_formatting?.secondary_text ?? undefined,
        }));

      const normalizedShortCodeQuery = this.normalizeShortCodeQuery(query);
      const shouldTryShortCodeLookup =
        autocompleteSuggestions.length === 0 ||
        this.looksLikeShortCode(normalizedShortCodeQuery);
      if (!shouldTryShortCodeLookup) {
        return autocompleteSuggestions;
      }

      const shortCodeSuggestions = await this.searchSuggestionsByGeocodeQuery(
        normalizedShortCodeQuery,
        apiKey,
        countryCode,
        limit,
      );

      return this.mergeAddressSuggestions(
        shortCodeSuggestions,
        autocompleteSuggestions,
        limit,
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ServiceUnavailableException('Address search is unavailable');
      }
      throw error;
    }
  }

  async resolveCurrentAddress(
    lat: number,
    lng: number,
  ): Promise<ResolvedAddress | null> {
    const apiKey = this.getGoogleApiKey();
    const params = {
      latlng: `${lat},${lng}`,
      key: apiKey,
      result_type: 'street_address|premise|route|plus_code',
    };

    try {
      const response = await this.httpClient.get<GoogleGeocodeResponse>(
        AddressService.GOOGLE_GEOCODE_URL,
        { params },
      );

      const payload = response.data;
      if (payload.status === 'ZERO_RESULTS') {
        return null;
      }

      if (payload.status !== 'OK') {
        throw new BadRequestException(
          payload.error_message || 'Unable to resolve current address',
        );
      }

      const topResult = payload.results?.[0];
      if (!topResult) {
        return null;
      }

      return this.toResolvedAddress(topResult, { lat, lng });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ServiceUnavailableException(
          'Current location lookup is unavailable',
        );
      }
      throw error;
    }
  }

  private async resolveAddressFromPlaceId(
    placeId: string,
  ): Promise<ResolvedAddress | null> {
    const apiKey = this.getGoogleApiKey();
    const params = {
      place_id: placeId,
      key: apiKey,
    };

    try {
      const response = await this.httpClient.get<GoogleGeocodeResponse>(
        AddressService.GOOGLE_GEOCODE_URL,
        { params },
      );

      const payload = response.data;
      if (payload.status === 'ZERO_RESULTS') {
        return null;
      }

      if (payload.status !== 'OK') {
        throw new BadRequestException(
          payload.error_message || 'Unable to resolve placeId',
        );
      }

      const topResult = payload.results?.[0];
      if (!topResult) {
        return null;
      }

      return this.toResolvedAddress(topResult);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new ServiceUnavailableException(
          'Address lookup by placeId is unavailable',
        );
      }
      throw error;
    }
  }

  private toResolvedAddress(
    result: GoogleGeocodeResult,
    fallbackLocation?: { lat: number; lng: number },
  ): ResolvedAddress {
    const components = result.address_components ?? [];
    const streetNumber = this.findAddressComponent(components, [
      'street_number',
    ]);
    const route = this.findAddressComponent(components, ['route']);
    const locality = this.findAddressComponent(components, [
      'locality',
      'sublocality',
      'administrative_area_level_2',
    ]);
    const stateOrProvince = this.findAddressComponent(components, [
      'administrative_area_level_1',
    ]);
    const postalCode = this.findAddressComponent(components, ['postal_code']);
    const countryCode = this.findAddressComponent(
      components,
      ['country'],
      true,
    );
    const location = result.geometry?.location;
    const latitude = location?.lat ?? fallbackLocation?.lat;
    const longitude = location?.lng ?? fallbackLocation?.lng;

    if (latitude === undefined || longitude === undefined) {
      throw new BadRequestException('Resolved coordinates are missing');
    }

    return {
      placeId: result.place_id ?? undefined,
      formattedAddress: result.formatted_address,
      addressLine:
        [streetNumber, route].filter(Boolean).join(' ').trim() || undefined,
      city: locality || undefined,
      stateOrProvince: stateOrProvince || undefined,
      postalCode: postalCode || undefined,
      countryCode: countryCode?.toUpperCase() || undefined,
      latitude,
      longitude,
    };
  }

  private mapToSupportedState(
    rawState: string | null | undefined,
  ): PrismaState | null {
    if (!rawState) {
      return null;
    }

    const normalized = rawState.toLowerCase().replace(/[^a-z]/g, '');

    if (normalized === 'lagos') {
      return 'Lagos';
    }

    if (normalized === 'oyo') {
      return 'Oyo';
    }

    if (
      normalized === 'abuja' ||
      normalized === 'federalcapitalterritory' ||
      normalized === 'fct'
    ) {
      return 'Abuja';
    }

    return null;
  }

  private resolvePostalCode(resolvedAddress: ResolvedAddress): string {
    return resolvedAddress.postalCode?.trim() || '';
  }

  private findAddressComponent(
    components: GoogleAddressComponent[],
    types: string[],
    useShortName = false,
  ): string | null {
    for (const type of types) {
      const match = components.find((component) =>
        component.types.includes(type),
      );
      if (match) {
        return useShortName ? match.short_name : match.long_name;
      }
    }

    return null;
  }

  private looksLikeShortCode(query: string): boolean {
    const normalized = query.trim().toUpperCase();
    return /^[A-Z0-9]{2,8}\+[A-Z0-9]{1,3}(?:\s+.+)?$/.test(normalized);
  }

  private normalizeShortCodeQuery(query: string): string {
    return query
      .replace(/\s*\+\s*/g, '+')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async searchSuggestionsByGeocodeQuery(
    query: string,
    apiKey: string,
    countryCode: string | undefined,
    limit: number,
  ): Promise<AddressSuggestion[]> {
    const params: Record<string, string> = {
      address: query,
      key: apiKey,
    };

    if (countryCode) {
      params.components = `country:${countryCode.toLowerCase()}`;
    }

    const response = await this.httpClient.get<GoogleGeocodeResponse>(
      AddressService.GOOGLE_GEOCODE_URL,
      { params },
    );

    const payload = response.data;
    if (payload.status === 'ZERO_RESULTS') {
      return [];
    }

    if (payload.status !== 'OK') {
      throw new BadRequestException(
        payload.error_message || 'Unable to resolve short code',
      );
    }

    return (payload.results ?? [])
      .map((result) => this.toAddressSuggestionFromGeocode(result))
      .filter((suggestion): suggestion is AddressSuggestion =>
        Boolean(suggestion),
      )
      .slice(0, limit);
  }

  private toAddressSuggestionFromGeocode(
    result: GoogleGeocodeResult,
  ): AddressSuggestion | null {
    const placeId = result.place_id?.trim();
    const description = result.formatted_address?.trim();
    if (!placeId || !description) {
      return null;
    }

    const [mainTextRaw, ...secondaryParts] = description
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

    return {
      placeId,
      description,
      mainText: mainTextRaw || undefined,
      secondaryText: secondaryParts.join(', ') || undefined,
    };
  }

  private mergeAddressSuggestions(
    primary: AddressSuggestion[],
    secondary: AddressSuggestion[],
    limit: number,
  ): AddressSuggestion[] {
    const merged: AddressSuggestion[] = [];
    const seenPlaceIds = new Set<string>();

    for (const suggestion of [...primary, ...secondary]) {
      if (seenPlaceIds.has(suggestion.placeId)) {
        continue;
      }

      seenPlaceIds.add(suggestion.placeId);
      merged.push(suggestion);

      if (merged.length >= limit) {
        break;
      }
    }

    return merged;
  }

  private clampLimit(limit: number | null | undefined): number {
    if (!limit || Number.isNaN(limit)) {
      return 8;
    }

    return Math.min(Math.max(limit, 1), 10);
  }

  private getGoogleApiKey(): string {
    const apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY');

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Address search is not configured on the server',
      );
    }

    return apiKey;
  }

  private toGraphqlUserAddress(
    address: PrismaUserAddress,
    isActive = false,
  ): UserAddress {
    return {
      ...address,
      label: address.label ?? undefined,
      lat: address.lat ?? undefined,
      lng: address.lng ?? undefined,
      isActive,
    };
  }
}
