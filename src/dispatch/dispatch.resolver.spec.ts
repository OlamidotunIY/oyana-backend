import { Test, TestingModule } from '@nestjs/testing';
import { DispatchResolver } from './dispatch.resolver';
import { DispatchService } from './dispatch.service';

describe('DispatchResolver', () => {
  let resolver: DispatchResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispatchResolver,
        {
          provide: DispatchService,
          useValue: {},
        },
      ],
    }).compile();

    resolver = module.get<DispatchResolver>(DispatchResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
