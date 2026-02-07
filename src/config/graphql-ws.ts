import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from '@apollo/server/plugin/landingPage/default';
import { ApolloServerPluginUsageReporting } from '@apollo/server/plugin/usageReporting';
import { ApolloServerPluginSchemaReporting } from '@apollo/server/plugin/schemaReporting';
import { ApolloServerPluginInlineTrace } from '@apollo/server/plugin/inlineTrace';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';
import type { Context } from 'graphql-ws';
import { SupabaseModule } from 'src/auth/supabase/supabase.module';
import { SupabaseService } from 'src/auth/supabase/supabase.service';

type WsExtra = {
  userId?: string;
  connectionId?: string;
  user?: unknown;
  headers?: Record<string, string>;
};

type WsContext = Context<Record<string, unknown> | undefined, WsExtra>;

export const GqlConfig = GraphQLModule.forRootAsync<ApolloDriverConfig>({
  imports: [ConfigModule, SupabaseModule],
  inject: [ConfigService, SupabaseService],
  driver: ApolloDriver,
  useFactory: async (
    configService: ConfigService,
    supabaseService: SupabaseService,
  ) => {
    const isProduction = configService.get('NODE_ENV') === 'production';
    return {
      playground: false, // Disabled in favor of Apollo Sandbox
      plugins: [
        isProduction
          ? ApolloServerPluginLandingPageProductionDefault({
              graphRef: configService.get('APOLLO_GRAPH_REF')!,
              embed: true,
              includeCookies: true, // Enable cookie support for authentication
            })
          : ApolloServerPluginLandingPageLocalDefault(),
        // Enable Apollo Studio reporting in production
        ...(isProduction && configService.get('APOLLO_KEY')
          ? [
              ApolloServerPluginUsageReporting(),
              ApolloServerPluginSchemaReporting(),
              ApolloServerPluginInlineTrace(),
            ]
          : []),
      ],
      autoSchemaFile: isProduction
        ? true
        : join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      context: (ctx) => {
        if ('req' in ctx && ctx.req) {
          return ctx;
        }

        const wsContext = ctx as WsContext;
        const req = {
          headers: wsContext.extra?.headers ?? {},
          user: wsContext.extra?.user,
        };

        return {
          req,
          user: wsContext.extra?.user,
          connectionParams: wsContext.connectionParams,
          extra: wsContext.extra,
        };
      },
      subscriptions: {
        'graphql-ws': {
          connectionInitWaitTimeout: 15000,
          onConnect: async (ctx: WsContext) => {
            console.log('WS onConnect called', {
              hasConnectionParams: !!ctx.connectionParams,
              keys: ctx.connectionParams
                ? Object.keys(ctx.connectionParams)
                : [],
            });

            // Extract authorization header from connectionParams
            const authorization =
              (ctx.connectionParams?.Authorization as string | undefined) ??
              (ctx.connectionParams?.authorization as string | undefined);

            ctx.extra.headers = {
              ...(authorization ? { authorization } : {}),
            };

            // Verify session with Supabase
            const user = await supabaseService.verifySession(authorization);

            if (!user?.id) {
              throw new UnauthorizedException('Unauthorized');
            }

            // Persist into ctx.extra for disconnect handler
            ctx.extra.userId = user.id;
            ctx.extra.user = user;

            // This becomes available in subscription resolvers context if needed
            return {
              req: {
                user,
              },
              user,
            };
          },
          onDisconnect: async (ctx: WsContext) => {
            const userId = ctx.extra?.userId as string | undefined;

            if (!userId) return;

            // Add any cleanup logic here if needed
          },
          onClose: (ctx: WsContext, code?: number, reason?: string) => {
            console.log('WS onClose', {
              code,
              reason,
              userId: ctx.extra?.userId,
            });
          },
        },
      },
      // Apollo Studio configuration for schema reporting
      apollo:
        isProduction && configService.get('APOLLO_KEY')
          ? {
              key: configService.get('APOLLO_KEY'),
              graphRef: configService.get('APOLLO_GRAPH_REF'),
            }
          : undefined,
      introspection: true, // Enable in all environments for Apollo Sandbox
    };
  },
});
