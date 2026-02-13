import { Test, TestingModule } from '@nestjs/testing';
import { ShipmentsResolver } from './shipments.resolver';
import { ShipmentsService } from './shipments.service';

describe('ShipmentsResolver', () => {
  let resolver: ShipmentsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShipmentsResolver,
        {
          provide: ShipmentsService,
          useValue: {
            getShipments: jest.fn(),
            getShipmentById: jest.fn(),
            createShipment: jest.fn(),
            updateShipment: jest.fn(),
          },
        },
      ],
    }).compile();

    resolver = module.get<ShipmentsResolver>(ShipmentsResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
