import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClientLike, SupabaseUser } from './supabase.types';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClientLike;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined',
      );
    }

    this.supabase = createClient(
      supabaseUrl,
      supabaseKey,
    ) as unknown as SupabaseClientLike;
  }

  getClient(): SupabaseClientLike {
    return this.supabase;
  }

  /**
   * Verify user session from authorization header
   * @param authHeader Authorization header (Bearer token)
   * @returns User object if valid, null otherwise
   */
  async verifySession(authHeader: string | undefined): Promise<SupabaseUser | null> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      const {
        data: { user },
        error,
      } = await this.supabase.auth.getUser(token);

      if (error || !user) {
        return null;
      }

      return user;
    } catch (err) {
      return null;
    }
  }
}
