import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { SupabaseService } from '../auth/supabase/supabase.service';
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
        {
          provide: SupabaseService,
          useValue: {
            verifySession: jest.fn().mockResolvedValue(null),
            getClient: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    resolver = module.get<DispatchResolver>(DispatchResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
