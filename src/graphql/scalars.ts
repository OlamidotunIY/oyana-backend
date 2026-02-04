import { Scalar, CustomScalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';

@Scalar('DateTime')
export class DateTimeScalar implements CustomScalar<string, Date> {
  description = 'DateTime custom scalar type';

  parseValue(value: string): Date {
    return new Date(value);
  }

  serialize(value: Date): string {
    return value.toISOString();
  }

  parseLiteral(ast: ValueNode): Date {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    throw new Error('Invalid date');
  }
}

@Scalar('BigInt')
export class BigIntScalar implements CustomScalar<string, bigint> {
  description = 'BigInt custom scalar type for money amounts in minor units';

  parseValue(value: string | number): bigint {
    return BigInt(value);
  }

  serialize(value: bigint): string {
    return value.toString();
  }

  parseLiteral(ast: ValueNode): bigint {
    if (ast.kind === Kind.STRING || ast.kind === Kind.INT) {
      return BigInt(ast.value);
    }
    throw new Error('Invalid bigint');
  }
}

export const GraphQLBigInt = BigIntScalar;

@Scalar('JSON')
export class JSONScalar implements CustomScalar<any, any> {
  description = 'JSON custom scalar type';

  parseValue(value: any): any {
    return value;
  }

  serialize(value: any): any {
    return value;
  }

  parseLiteral(ast: ValueNode): any {
    if (ast.kind === Kind.STRING) {
      return JSON.parse(ast.value);
    }
    if (ast.kind === Kind.OBJECT) {
      return ast;
    }
    return null;
  }
}
