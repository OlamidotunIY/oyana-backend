import { Test, TestingModule } from '@nestjs/testing';
import { ShipmentsResolver } from './shipments.resolver';

describe('ShipmentsResolver', () => {
  let resolver: ShipmentsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShipmentsResolver],
    }).compile();

    resolver = module.get<ShipmentsResolver>(ShipmentsResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
