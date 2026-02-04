import { Test, TestingModule } from '@nestjs/testing';
import { MarketPlaceResolver } from './market-place.resolver';

describe('MarketPlaceResolver', () => {
  let resolver: MarketPlaceResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MarketPlaceResolver],
    }).compile();

    resolver = module.get<MarketPlaceResolver>(MarketPlaceResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
