import { Test, TestingModule } from '@nestjs/testing';
import { DispatchResolver } from './dispatch.resolver';

describe('DispatchResolver', () => {
  let resolver: DispatchResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DispatchResolver],
    }).compile();

    resolver = module.get<DispatchResolver>(DispatchResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
