import {
  ApolloServerPluginLandingPageLocalDefault,
  ApolloServerPluginLandingPageProductionDefault,
} from '@apollo/server/plugin/landingPage/default';
import type { ApolloServerPlugin } from '@apollo/server';
import { ApolloServerPluginUsageReporting } from '@apollo/server/plugin/usageReporting';
import { ApolloServerPluginSchemaReporting } from '@apollo/server/plugin/schemaReporting';
import { ApolloServerPluginInlineTrace } from '@apollo/server/plugin/inlineTrace';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { HttpException, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { randomUUID } from 'crypto';
import { join } from 'path';
import type { Context } from 'graphql-ws';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from 'src/auth/auth.module';

type WsExtra = {
  userId?: string;
  connectionId?: string;
  user?: unknown;
  headers?: Record<string, string>;
};

type WsContext = Context<Record<string, unknown> | undefined, WsExtra>;

type ParsedGraphQLError = {
  message: string;
  details?: string[];
  statusCode?: number;
};

function mapStatusCodeToGraphQLCode(statusCode?: number): string {
  if (!statusCode) {
    return 'INTERNAL_SERVER_ERROR';
  }

  if (statusCode === 400) return 'BAD_USER_INPUT';
  if (statusCode === 401) return 'UNAUTHENTICATED';
  if (statusCode === 403) return 'FORBIDDEN';
  if (statusCode === 404) return 'NOT_FOUND';
  if (statusCode === 409) return 'CONFLICT';
  if (statusCode === 429) return 'TOO_MANY_REQUESTS';
  if (statusCode >= 500) return 'INTERNAL_SERVER_ERROR';

  return 'BAD_USER_INPUT';
}

function extractRequestIdFromHeaders(
  headers?: Record<string, unknown>,
): string {
  if (!headers) {
    return randomUUID();
  }

  const headerValue =
    headers['x-request-id'] ??
    headers['X-Request-Id'] ??
    headers['x-requestid'];

  if (Array.isArray(headerValue)) {
    const value = headerValue.find(
      (item): item is string =>
        typeof item === 'string' && item.trim().length > 0,
    );
    return value?.trim() ?? randomUUID();
  }

  if (typeof headerValue === 'string' && headerValue.trim().length > 0) {
    return headerValue.trim();
  }

  return randomUUID();
}

function parseGraphQLError(error: unknown): ParsedGraphQLError {
  if (error instanceof HttpException) {
    const statusCode = error.getStatus();
    const response = error.getResponse();

    if (typeof response === 'string') {
      return {
        message: response,
        statusCode,
      };
    }

    if (response && typeof response === 'object') {
      const responseObject = response as Record<string, unknown>;
      const responseMessage = responseObject.message;

      if (Array.isArray(responseMessage)) {
        const details = responseMessage
          .map((value) =>
            typeof value === 'string'
              ? value
              : value && typeof value === 'object'
                ? JSON.stringify(value)
                : String(value),
          )
          .filter((value) => value.trim().length > 0);

        if (details.length) {
          return {
            message: details[0],
            details,
            statusCode,
          };
        }
      }

      if (
        typeof responseMessage === 'string' &&
        responseMessage.trim().length > 0
      ) {
        return {
          message: responseMessage,
          statusCode,
        };
      }

      const responseError = responseObject.error;
      if (
        typeof responseError === 'string' &&
        responseError.trim().length > 0
      ) {
        return {
          message: responseError,
          statusCode,
        };
      }
    }

    return {
      message: error.message,
      statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  if (typeof error === 'string') {
    return {
      message: error,
    };
  }

  return {
    message: 'Internal server error',
  };
}

export const GqlConfig = GraphQLModule.forRootAsync<ApolloDriverConfig>({
  imports: [ConfigModule, AuthModule],
  inject: [ConfigService, JwtService],
  driver: ApolloDriver,
  useFactory: async (configService: ConfigService, jwtService: JwtService) => {
    const isProduction = configService.get('NODE_ENV') === 'production';
    const logger = new Logger('GraphQL');
    const graphQLErrorLoggingPlugin: ApolloServerPlugin<any> = {
      async requestDidStart() {
        return {
          async didEncounterErrors(requestContext: any): Promise<void> {
            const contextValue = requestContext.contextValue as
              | {
                  requestId?: string;
                  req?: { user?: { id?: string }; url?: string };
                  user?: { id?: string };
                }
              | undefined;
            const requestId = contextValue?.requestId ?? randomUUID();
            const operationName =
              requestContext.operationName ??
              requestContext.request?.operationName ??
              'anonymous';
            const operationType =
              requestContext.operation?.operation ?? 'unknown';
            const userId =
              contextValue?.req?.user?.id ??
              contextValue?.user?.id ??
              'anonymous';

            for (const graphQLError of requestContext.errors ?? []) {
              const parsedError = parseGraphQLError(
                graphQLError.originalError ?? graphQLError,
              );
              const errorPath = Array.isArray(graphQLError.path)
                ? graphQLError.path.join('.')
                : 'unknown';
              const rawCode =
                (graphQLError.extensions?.code as string | undefined) ??
                'INTERNAL_SERVER_ERROR';
              const code = parsedError.statusCode
                ? mapStatusCodeToGraphQLCode(parsedError.statusCode)
                : rawCode;
              const message = `[${requestId}] GraphQL ${operationType} ${operationName} failed at ${errorPath}: ${parsedError.message} (code=${code}, status=${parsedError.statusCode ?? 'n/a'}, user=${userId})`;
              const stack = !isProduction
                ? ((graphQLError.originalError as Error | undefined)?.stack ??
                  (graphQLError as Error).stack)
                : undefined;

              if (stack) {
                logger.error(message, stack);
              } else {
                logger.error(message);
              }

              if (parsedError.details?.length) {
                logger.warn(
                  `[${requestId}] GraphQL validation details: ${parsedError.details.join(' | ')}`,
                );
              }

              if (
                graphQLError.extensions &&
                !Object.prototype.hasOwnProperty.call(
                  graphQLError.extensions,
                  'requestId',
                )
              ) {
                (graphQLError.extensions as Record<string, unknown>).requestId =
                  requestId;
              }
            }
          },
        };
      },
    };

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
        graphQLErrorLoggingPlugin,
      ],
      autoSchemaFile: isProduction
        ? true
        : join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      context: (ctx) => {
        if ('req' in ctx && ctx.req) {
          const requestId = extractRequestIdFromHeaders(
            (ctx.req.headers ?? {}) as Record<string, unknown>,
          );

          return {
            ...ctx,
            requestId,
          };
        }

        const wsContext = ctx as WsContext;
        const headers = wsContext.extra?.headers ?? {};
        const requestId = extractRequestIdFromHeaders(headers);
        const req = {
          headers,
          user: wsContext.extra?.user,
        };

        return {
          req,
          user: wsContext.extra?.user,
          connectionParams: wsContext.connectionParams,
          extra: wsContext.extra,
          requestId,
        };
      },
      formatError: (formattedError, error) => {
        const graphQLError =
          error && typeof error === 'object'
            ? (error as {
                originalError?: unknown;
                extensions?: Record<string, unknown>;
              })
            : undefined;
        const parsedError = parseGraphQLError(
          graphQLError?.originalError ?? error,
        );
        const requestId =
          (graphQLError?.extensions?.requestId as string | undefined) ??
          (formattedError.extensions?.requestId as string | undefined) ??
          randomUUID();
        const rawCode = formattedError.extensions?.code as string | undefined;
        const code = parsedError.statusCode
          ? mapStatusCodeToGraphQLCode(parsedError.statusCode)
          : (rawCode ?? mapStatusCodeToGraphQLCode(undefined));
        const extensions: Record<string, unknown> = {
          ...(formattedError.extensions ?? {}),
          code,
          requestId,
        };

        if (parsedError.statusCode) {
          extensions.statusCode = parsedError.statusCode;
        }

        if (parsedError.details?.length) {
          extensions.details = parsedError.details;
        }

        return {
          ...formattedError,
          message: parsedError.message || formattedError.message,
          extensions,
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

            // Verify JWT token from connectionParams
            const token = authorization?.startsWith('Bearer ')
              ? authorization.slice(7)
              : authorization;
            if (!token) {
              throw new UnauthorizedException('Unauthorized');
            }
            let user: { id: string; email: string | null };
            try {
              const payload = jwtService.verify<{
                sub: string;
                email?: string | null;
              }>(token, {
                secret: configService.getOrThrow('JWT_SECRET'),
              });
              user = { id: payload.sub, email: payload.email ?? null };
            } catch {
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
