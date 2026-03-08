
/**
 * Client
**/

import * as runtime from './runtime/client.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model AgriKnowledge
 * 
 */
export type AgriKnowledge = $Result.DefaultSelection<Prisma.$AgriKnowledgePayload>
/**
 * Model DailyReport
 * 
 */
export type DailyReport = $Result.DefaultSelection<Prisma.$DailyReportPayload>
/**
 * Model access_logs
 * 
 */
export type access_logs = $Result.DefaultSelection<Prisma.$access_logsPayload>
/**
 * Model automation_rules
 * 
 */
export type automation_rules = $Result.DefaultSelection<Prisma.$automation_rulesPayload>
/**
 * Model banned_ips
 * 
 */
export type banned_ips = $Result.DefaultSelection<Prisma.$banned_ipsPayload>
/**
 * Model device_logs
 * 
 */
export type device_logs = $Result.DefaultSelection<Prisma.$device_logsPayload>
/**
 * Model email_verifications
 * 
 */
export type email_verifications = $Result.DefaultSelection<Prisma.$email_verificationsPayload>
/**
 * Model friend_requests
 * 
 */
export type friend_requests = $Result.DefaultSelection<Prisma.$friend_requestsPayload>
/**
 * Model friends
 * 
 */
export type friends = $Result.DefaultSelection<Prisma.$friendsPayload>
/**
 * Model group_members
 * 
 */
export type group_members = $Result.DefaultSelection<Prisma.$group_membersPayload>
/**
 * Model groups
 * 
 */
export type groups = $Result.DefaultSelection<Prisma.$groupsPayload>
/**
 * Model login_logs
 * 
 */
export type login_logs = $Result.DefaultSelection<Prisma.$login_logsPayload>
/**
 * Model login_tickets
 * 
 */
export type login_tickets = $Result.DefaultSelection<Prisma.$login_ticketsPayload>
/**
 * Model messages
 * 
 */
export type messages = $Result.DefaultSelection<Prisma.$messagesPayload>
/**
 * Model scheduled_tasks
 * 
 */
export type scheduled_tasks = $Result.DefaultSelection<Prisma.$scheduled_tasksPayload>
/**
 * Model sensor_readings
 * 
 */
export type sensor_readings = $Result.DefaultSelection<Prisma.$sensor_readingsPayload>
/**
 * Model system_settings
 * 
 */
export type system_settings = $Result.DefaultSelection<Prisma.$system_settingsPayload>
/**
 * Model users
 * 
 */
export type users = $Result.DefaultSelection<Prisma.$usersPayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more AgriKnowledges
 * const agriKnowledges = await prisma.agriKnowledge.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://pris.ly/d/client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more AgriKnowledges
   * const agriKnowledges = await prisma.agriKnowledge.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://pris.ly/d/client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://pris.ly/d/raw-queries).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/orm/prisma-client/queries/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>

  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.agriKnowledge`: Exposes CRUD operations for the **AgriKnowledge** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AgriKnowledges
    * const agriKnowledges = await prisma.agriKnowledge.findMany()
    * ```
    */
  get agriKnowledge(): Prisma.AgriKnowledgeDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.dailyReport`: Exposes CRUD operations for the **DailyReport** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more DailyReports
    * const dailyReports = await prisma.dailyReport.findMany()
    * ```
    */
  get dailyReport(): Prisma.DailyReportDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.access_logs`: Exposes CRUD operations for the **access_logs** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Access_logs
    * const access_logs = await prisma.access_logs.findMany()
    * ```
    */
  get access_logs(): Prisma.access_logsDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.automation_rules`: Exposes CRUD operations for the **automation_rules** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Automation_rules
    * const automation_rules = await prisma.automation_rules.findMany()
    * ```
    */
  get automation_rules(): Prisma.automation_rulesDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.banned_ips`: Exposes CRUD operations for the **banned_ips** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Banned_ips
    * const banned_ips = await prisma.banned_ips.findMany()
    * ```
    */
  get banned_ips(): Prisma.banned_ipsDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.device_logs`: Exposes CRUD operations for the **device_logs** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Device_logs
    * const device_logs = await prisma.device_logs.findMany()
    * ```
    */
  get device_logs(): Prisma.device_logsDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.email_verifications`: Exposes CRUD operations for the **email_verifications** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Email_verifications
    * const email_verifications = await prisma.email_verifications.findMany()
    * ```
    */
  get email_verifications(): Prisma.email_verificationsDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.friend_requests`: Exposes CRUD operations for the **friend_requests** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Friend_requests
    * const friend_requests = await prisma.friend_requests.findMany()
    * ```
    */
  get friend_requests(): Prisma.friend_requestsDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.friends`: Exposes CRUD operations for the **friends** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Friends
    * const friends = await prisma.friends.findMany()
    * ```
    */
  get friends(): Prisma.friendsDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.group_members`: Exposes CRUD operations for the **group_members** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Group_members
    * const group_members = await prisma.group_members.findMany()
    * ```
    */
  get group_members(): Prisma.group_membersDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.groups`: Exposes CRUD operations for the **groups** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Groups
    * const groups = await prisma.groups.findMany()
    * ```
    */
  get groups(): Prisma.groupsDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.login_logs`: Exposes CRUD operations for the **login_logs** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Login_logs
    * const login_logs = await prisma.login_logs.findMany()
    * ```
    */
  get login_logs(): Prisma.login_logsDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.login_tickets`: Exposes CRUD operations for the **login_tickets** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Login_tickets
    * const login_tickets = await prisma.login_tickets.findMany()
    * ```
    */
  get login_tickets(): Prisma.login_ticketsDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.messages`: Exposes CRUD operations for the **messages** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Messages
    * const messages = await prisma.messages.findMany()
    * ```
    */
  get messages(): Prisma.messagesDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.scheduled_tasks`: Exposes CRUD operations for the **scheduled_tasks** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Scheduled_tasks
    * const scheduled_tasks = await prisma.scheduled_tasks.findMany()
    * ```
    */
  get scheduled_tasks(): Prisma.scheduled_tasksDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.sensor_readings`: Exposes CRUD operations for the **sensor_readings** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Sensor_readings
    * const sensor_readings = await prisma.sensor_readings.findMany()
    * ```
    */
  get sensor_readings(): Prisma.sensor_readingsDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.system_settings`: Exposes CRUD operations for the **system_settings** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more System_settings
    * const system_settings = await prisma.system_settings.findMany()
    * ```
    */
  get system_settings(): Prisma.system_settingsDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.users`: Exposes CRUD operations for the **users** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.users.findMany()
    * ```
    */
  get users(): Prisma.usersDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 7.4.1
   * Query Engine version: 55ae170b1ced7fc6ed07a15f110549408c501bb3
   */
  export type PrismaVersion = {
    client: string
    engine: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    AgriKnowledge: 'AgriKnowledge',
    DailyReport: 'DailyReport',
    access_logs: 'access_logs',
    automation_rules: 'automation_rules',
    banned_ips: 'banned_ips',
    device_logs: 'device_logs',
    email_verifications: 'email_verifications',
    friend_requests: 'friend_requests',
    friends: 'friends',
    group_members: 'group_members',
    groups: 'groups',
    login_logs: 'login_logs',
    login_tickets: 'login_tickets',
    messages: 'messages',
    scheduled_tasks: 'scheduled_tasks',
    sensor_readings: 'sensor_readings',
    system_settings: 'system_settings',
    users: 'users'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]



  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "agriKnowledge" | "dailyReport" | "access_logs" | "automation_rules" | "banned_ips" | "device_logs" | "email_verifications" | "friend_requests" | "friends" | "group_members" | "groups" | "login_logs" | "login_tickets" | "messages" | "scheduled_tasks" | "sensor_readings" | "system_settings" | "users"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      AgriKnowledge: {
        payload: Prisma.$AgriKnowledgePayload<ExtArgs>
        fields: Prisma.AgriKnowledgeFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AgriKnowledgeFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgriKnowledgePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AgriKnowledgeFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgriKnowledgePayload>
          }
          findFirst: {
            args: Prisma.AgriKnowledgeFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgriKnowledgePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AgriKnowledgeFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgriKnowledgePayload>
          }
          findMany: {
            args: Prisma.AgriKnowledgeFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgriKnowledgePayload>[]
          }
          create: {
            args: Prisma.AgriKnowledgeCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgriKnowledgePayload>
          }
          createMany: {
            args: Prisma.AgriKnowledgeCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AgriKnowledgeCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgriKnowledgePayload>[]
          }
          delete: {
            args: Prisma.AgriKnowledgeDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgriKnowledgePayload>
          }
          update: {
            args: Prisma.AgriKnowledgeUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgriKnowledgePayload>
          }
          deleteMany: {
            args: Prisma.AgriKnowledgeDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AgriKnowledgeUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AgriKnowledgeUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgriKnowledgePayload>[]
          }
          upsert: {
            args: Prisma.AgriKnowledgeUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AgriKnowledgePayload>
          }
          aggregate: {
            args: Prisma.AgriKnowledgeAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAgriKnowledge>
          }
          groupBy: {
            args: Prisma.AgriKnowledgeGroupByArgs<ExtArgs>
            result: $Utils.Optional<AgriKnowledgeGroupByOutputType>[]
          }
          count: {
            args: Prisma.AgriKnowledgeCountArgs<ExtArgs>
            result: $Utils.Optional<AgriKnowledgeCountAggregateOutputType> | number
          }
        }
      }
      DailyReport: {
        payload: Prisma.$DailyReportPayload<ExtArgs>
        fields: Prisma.DailyReportFieldRefs
        operations: {
          findUnique: {
            args: Prisma.DailyReportFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DailyReportPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.DailyReportFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DailyReportPayload>
          }
          findFirst: {
            args: Prisma.DailyReportFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DailyReportPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.DailyReportFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DailyReportPayload>
          }
          findMany: {
            args: Prisma.DailyReportFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DailyReportPayload>[]
          }
          create: {
            args: Prisma.DailyReportCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DailyReportPayload>
          }
          createMany: {
            args: Prisma.DailyReportCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.DailyReportCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DailyReportPayload>[]
          }
          delete: {
            args: Prisma.DailyReportDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DailyReportPayload>
          }
          update: {
            args: Prisma.DailyReportUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DailyReportPayload>
          }
          deleteMany: {
            args: Prisma.DailyReportDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.DailyReportUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.DailyReportUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DailyReportPayload>[]
          }
          upsert: {
            args: Prisma.DailyReportUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DailyReportPayload>
          }
          aggregate: {
            args: Prisma.DailyReportAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateDailyReport>
          }
          groupBy: {
            args: Prisma.DailyReportGroupByArgs<ExtArgs>
            result: $Utils.Optional<DailyReportGroupByOutputType>[]
          }
          count: {
            args: Prisma.DailyReportCountArgs<ExtArgs>
            result: $Utils.Optional<DailyReportCountAggregateOutputType> | number
          }
        }
      }
      access_logs: {
        payload: Prisma.$access_logsPayload<ExtArgs>
        fields: Prisma.access_logsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.access_logsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$access_logsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.access_logsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$access_logsPayload>
          }
          findFirst: {
            args: Prisma.access_logsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$access_logsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.access_logsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$access_logsPayload>
          }
          findMany: {
            args: Prisma.access_logsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$access_logsPayload>[]
          }
          create: {
            args: Prisma.access_logsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$access_logsPayload>
          }
          createMany: {
            args: Prisma.access_logsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.access_logsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$access_logsPayload>[]
          }
          delete: {
            args: Prisma.access_logsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$access_logsPayload>
          }
          update: {
            args: Prisma.access_logsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$access_logsPayload>
          }
          deleteMany: {
            args: Prisma.access_logsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.access_logsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.access_logsUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$access_logsPayload>[]
          }
          upsert: {
            args: Prisma.access_logsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$access_logsPayload>
          }
          aggregate: {
            args: Prisma.Access_logsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAccess_logs>
          }
          groupBy: {
            args: Prisma.access_logsGroupByArgs<ExtArgs>
            result: $Utils.Optional<Access_logsGroupByOutputType>[]
          }
          count: {
            args: Prisma.access_logsCountArgs<ExtArgs>
            result: $Utils.Optional<Access_logsCountAggregateOutputType> | number
          }
        }
      }
      automation_rules: {
        payload: Prisma.$automation_rulesPayload<ExtArgs>
        fields: Prisma.automation_rulesFieldRefs
        operations: {
          findUnique: {
            args: Prisma.automation_rulesFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$automation_rulesPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.automation_rulesFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$automation_rulesPayload>
          }
          findFirst: {
            args: Prisma.automation_rulesFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$automation_rulesPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.automation_rulesFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$automation_rulesPayload>
          }
          findMany: {
            args: Prisma.automation_rulesFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$automation_rulesPayload>[]
          }
          create: {
            args: Prisma.automation_rulesCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$automation_rulesPayload>
          }
          createMany: {
            args: Prisma.automation_rulesCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.automation_rulesCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$automation_rulesPayload>[]
          }
          delete: {
            args: Prisma.automation_rulesDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$automation_rulesPayload>
          }
          update: {
            args: Prisma.automation_rulesUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$automation_rulesPayload>
          }
          deleteMany: {
            args: Prisma.automation_rulesDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.automation_rulesUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.automation_rulesUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$automation_rulesPayload>[]
          }
          upsert: {
            args: Prisma.automation_rulesUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$automation_rulesPayload>
          }
          aggregate: {
            args: Prisma.Automation_rulesAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAutomation_rules>
          }
          groupBy: {
            args: Prisma.automation_rulesGroupByArgs<ExtArgs>
            result: $Utils.Optional<Automation_rulesGroupByOutputType>[]
          }
          count: {
            args: Prisma.automation_rulesCountArgs<ExtArgs>
            result: $Utils.Optional<Automation_rulesCountAggregateOutputType> | number
          }
        }
      }
      banned_ips: {
        payload: Prisma.$banned_ipsPayload<ExtArgs>
        fields: Prisma.banned_ipsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.banned_ipsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$banned_ipsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.banned_ipsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$banned_ipsPayload>
          }
          findFirst: {
            args: Prisma.banned_ipsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$banned_ipsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.banned_ipsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$banned_ipsPayload>
          }
          findMany: {
            args: Prisma.banned_ipsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$banned_ipsPayload>[]
          }
          create: {
            args: Prisma.banned_ipsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$banned_ipsPayload>
          }
          createMany: {
            args: Prisma.banned_ipsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.banned_ipsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$banned_ipsPayload>[]
          }
          delete: {
            args: Prisma.banned_ipsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$banned_ipsPayload>
          }
          update: {
            args: Prisma.banned_ipsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$banned_ipsPayload>
          }
          deleteMany: {
            args: Prisma.banned_ipsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.banned_ipsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.banned_ipsUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$banned_ipsPayload>[]
          }
          upsert: {
            args: Prisma.banned_ipsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$banned_ipsPayload>
          }
          aggregate: {
            args: Prisma.Banned_ipsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateBanned_ips>
          }
          groupBy: {
            args: Prisma.banned_ipsGroupByArgs<ExtArgs>
            result: $Utils.Optional<Banned_ipsGroupByOutputType>[]
          }
          count: {
            args: Prisma.banned_ipsCountArgs<ExtArgs>
            result: $Utils.Optional<Banned_ipsCountAggregateOutputType> | number
          }
        }
      }
      device_logs: {
        payload: Prisma.$device_logsPayload<ExtArgs>
        fields: Prisma.device_logsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.device_logsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$device_logsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.device_logsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$device_logsPayload>
          }
          findFirst: {
            args: Prisma.device_logsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$device_logsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.device_logsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$device_logsPayload>
          }
          findMany: {
            args: Prisma.device_logsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$device_logsPayload>[]
          }
          create: {
            args: Prisma.device_logsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$device_logsPayload>
          }
          createMany: {
            args: Prisma.device_logsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.device_logsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$device_logsPayload>[]
          }
          delete: {
            args: Prisma.device_logsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$device_logsPayload>
          }
          update: {
            args: Prisma.device_logsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$device_logsPayload>
          }
          deleteMany: {
            args: Prisma.device_logsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.device_logsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.device_logsUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$device_logsPayload>[]
          }
          upsert: {
            args: Prisma.device_logsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$device_logsPayload>
          }
          aggregate: {
            args: Prisma.Device_logsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateDevice_logs>
          }
          groupBy: {
            args: Prisma.device_logsGroupByArgs<ExtArgs>
            result: $Utils.Optional<Device_logsGroupByOutputType>[]
          }
          count: {
            args: Prisma.device_logsCountArgs<ExtArgs>
            result: $Utils.Optional<Device_logsCountAggregateOutputType> | number
          }
        }
      }
      email_verifications: {
        payload: Prisma.$email_verificationsPayload<ExtArgs>
        fields: Prisma.email_verificationsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.email_verificationsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$email_verificationsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.email_verificationsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$email_verificationsPayload>
          }
          findFirst: {
            args: Prisma.email_verificationsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$email_verificationsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.email_verificationsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$email_verificationsPayload>
          }
          findMany: {
            args: Prisma.email_verificationsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$email_verificationsPayload>[]
          }
          create: {
            args: Prisma.email_verificationsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$email_verificationsPayload>
          }
          createMany: {
            args: Prisma.email_verificationsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.email_verificationsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$email_verificationsPayload>[]
          }
          delete: {
            args: Prisma.email_verificationsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$email_verificationsPayload>
          }
          update: {
            args: Prisma.email_verificationsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$email_verificationsPayload>
          }
          deleteMany: {
            args: Prisma.email_verificationsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.email_verificationsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.email_verificationsUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$email_verificationsPayload>[]
          }
          upsert: {
            args: Prisma.email_verificationsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$email_verificationsPayload>
          }
          aggregate: {
            args: Prisma.Email_verificationsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateEmail_verifications>
          }
          groupBy: {
            args: Prisma.email_verificationsGroupByArgs<ExtArgs>
            result: $Utils.Optional<Email_verificationsGroupByOutputType>[]
          }
          count: {
            args: Prisma.email_verificationsCountArgs<ExtArgs>
            result: $Utils.Optional<Email_verificationsCountAggregateOutputType> | number
          }
        }
      }
      friend_requests: {
        payload: Prisma.$friend_requestsPayload<ExtArgs>
        fields: Prisma.friend_requestsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.friend_requestsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$friend_requestsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.friend_requestsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$friend_requestsPayload>
          }
          findFirst: {
            args: Prisma.friend_requestsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$friend_requestsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.friend_requestsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$friend_requestsPayload>
          }
          findMany: {
            args: Prisma.friend_requestsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$friend_requestsPayload>[]
          }
          create: {
            args: Prisma.friend_requestsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$friend_requestsPayload>
          }
          createMany: {
            args: Prisma.friend_requestsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.friend_requestsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$friend_requestsPayload>[]
          }
          delete: {
            args: Prisma.friend_requestsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$friend_requestsPayload>
          }
          update: {
            args: Prisma.friend_requestsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$friend_requestsPayload>
          }
          deleteMany: {
            args: Prisma.friend_requestsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.friend_requestsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.friend_requestsUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$friend_requestsPayload>[]
          }
          upsert: {
            args: Prisma.friend_requestsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$friend_requestsPayload>
          }
          aggregate: {
            args: Prisma.Friend_requestsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateFriend_requests>
          }
          groupBy: {
            args: Prisma.friend_requestsGroupByArgs<ExtArgs>
            result: $Utils.Optional<Friend_requestsGroupByOutputType>[]
          }
          count: {
            args: Prisma.friend_requestsCountArgs<ExtArgs>
            result: $Utils.Optional<Friend_requestsCountAggregateOutputType> | number
          }
        }
      }
      friends: {
        payload: Prisma.$friendsPayload<ExtArgs>
        fields: Prisma.friendsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.friendsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$friendsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.friendsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$friendsPayload>
          }
          findFirst: {
            args: Prisma.friendsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$friendsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.friendsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$friendsPayload>
          }
          findMany: {
            args: Prisma.friendsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$friendsPayload>[]
          }
          create: {
            args: Prisma.friendsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$friendsPayload>
          }
          createMany: {
            args: Prisma.friendsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.friendsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$friendsPayload>[]
          }
          delete: {
            args: Prisma.friendsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$friendsPayload>
          }
          update: {
            args: Prisma.friendsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$friendsPayload>
          }
          deleteMany: {
            args: Prisma.friendsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.friendsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.friendsUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$friendsPayload>[]
          }
          upsert: {
            args: Prisma.friendsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$friendsPayload>
          }
          aggregate: {
            args: Prisma.FriendsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateFriends>
          }
          groupBy: {
            args: Prisma.friendsGroupByArgs<ExtArgs>
            result: $Utils.Optional<FriendsGroupByOutputType>[]
          }
          count: {
            args: Prisma.friendsCountArgs<ExtArgs>
            result: $Utils.Optional<FriendsCountAggregateOutputType> | number
          }
        }
      }
      group_members: {
        payload: Prisma.$group_membersPayload<ExtArgs>
        fields: Prisma.group_membersFieldRefs
        operations: {
          findUnique: {
            args: Prisma.group_membersFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$group_membersPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.group_membersFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$group_membersPayload>
          }
          findFirst: {
            args: Prisma.group_membersFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$group_membersPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.group_membersFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$group_membersPayload>
          }
          findMany: {
            args: Prisma.group_membersFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$group_membersPayload>[]
          }
          create: {
            args: Prisma.group_membersCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$group_membersPayload>
          }
          createMany: {
            args: Prisma.group_membersCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.group_membersCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$group_membersPayload>[]
          }
          delete: {
            args: Prisma.group_membersDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$group_membersPayload>
          }
          update: {
            args: Prisma.group_membersUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$group_membersPayload>
          }
          deleteMany: {
            args: Prisma.group_membersDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.group_membersUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.group_membersUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$group_membersPayload>[]
          }
          upsert: {
            args: Prisma.group_membersUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$group_membersPayload>
          }
          aggregate: {
            args: Prisma.Group_membersAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateGroup_members>
          }
          groupBy: {
            args: Prisma.group_membersGroupByArgs<ExtArgs>
            result: $Utils.Optional<Group_membersGroupByOutputType>[]
          }
          count: {
            args: Prisma.group_membersCountArgs<ExtArgs>
            result: $Utils.Optional<Group_membersCountAggregateOutputType> | number
          }
        }
      }
      groups: {
        payload: Prisma.$groupsPayload<ExtArgs>
        fields: Prisma.groupsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.groupsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$groupsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.groupsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$groupsPayload>
          }
          findFirst: {
            args: Prisma.groupsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$groupsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.groupsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$groupsPayload>
          }
          findMany: {
            args: Prisma.groupsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$groupsPayload>[]
          }
          create: {
            args: Prisma.groupsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$groupsPayload>
          }
          createMany: {
            args: Prisma.groupsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.groupsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$groupsPayload>[]
          }
          delete: {
            args: Prisma.groupsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$groupsPayload>
          }
          update: {
            args: Prisma.groupsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$groupsPayload>
          }
          deleteMany: {
            args: Prisma.groupsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.groupsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.groupsUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$groupsPayload>[]
          }
          upsert: {
            args: Prisma.groupsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$groupsPayload>
          }
          aggregate: {
            args: Prisma.GroupsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateGroups>
          }
          groupBy: {
            args: Prisma.groupsGroupByArgs<ExtArgs>
            result: $Utils.Optional<GroupsGroupByOutputType>[]
          }
          count: {
            args: Prisma.groupsCountArgs<ExtArgs>
            result: $Utils.Optional<GroupsCountAggregateOutputType> | number
          }
        }
      }
      login_logs: {
        payload: Prisma.$login_logsPayload<ExtArgs>
        fields: Prisma.login_logsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.login_logsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$login_logsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.login_logsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$login_logsPayload>
          }
          findFirst: {
            args: Prisma.login_logsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$login_logsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.login_logsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$login_logsPayload>
          }
          findMany: {
            args: Prisma.login_logsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$login_logsPayload>[]
          }
          create: {
            args: Prisma.login_logsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$login_logsPayload>
          }
          createMany: {
            args: Prisma.login_logsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.login_logsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$login_logsPayload>[]
          }
          delete: {
            args: Prisma.login_logsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$login_logsPayload>
          }
          update: {
            args: Prisma.login_logsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$login_logsPayload>
          }
          deleteMany: {
            args: Prisma.login_logsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.login_logsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.login_logsUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$login_logsPayload>[]
          }
          upsert: {
            args: Prisma.login_logsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$login_logsPayload>
          }
          aggregate: {
            args: Prisma.Login_logsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateLogin_logs>
          }
          groupBy: {
            args: Prisma.login_logsGroupByArgs<ExtArgs>
            result: $Utils.Optional<Login_logsGroupByOutputType>[]
          }
          count: {
            args: Prisma.login_logsCountArgs<ExtArgs>
            result: $Utils.Optional<Login_logsCountAggregateOutputType> | number
          }
        }
      }
      login_tickets: {
        payload: Prisma.$login_ticketsPayload<ExtArgs>
        fields: Prisma.login_ticketsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.login_ticketsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$login_ticketsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.login_ticketsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$login_ticketsPayload>
          }
          findFirst: {
            args: Prisma.login_ticketsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$login_ticketsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.login_ticketsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$login_ticketsPayload>
          }
          findMany: {
            args: Prisma.login_ticketsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$login_ticketsPayload>[]
          }
          create: {
            args: Prisma.login_ticketsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$login_ticketsPayload>
          }
          createMany: {
            args: Prisma.login_ticketsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.login_ticketsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$login_ticketsPayload>[]
          }
          delete: {
            args: Prisma.login_ticketsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$login_ticketsPayload>
          }
          update: {
            args: Prisma.login_ticketsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$login_ticketsPayload>
          }
          deleteMany: {
            args: Prisma.login_ticketsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.login_ticketsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.login_ticketsUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$login_ticketsPayload>[]
          }
          upsert: {
            args: Prisma.login_ticketsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$login_ticketsPayload>
          }
          aggregate: {
            args: Prisma.Login_ticketsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateLogin_tickets>
          }
          groupBy: {
            args: Prisma.login_ticketsGroupByArgs<ExtArgs>
            result: $Utils.Optional<Login_ticketsGroupByOutputType>[]
          }
          count: {
            args: Prisma.login_ticketsCountArgs<ExtArgs>
            result: $Utils.Optional<Login_ticketsCountAggregateOutputType> | number
          }
        }
      }
      messages: {
        payload: Prisma.$messagesPayload<ExtArgs>
        fields: Prisma.messagesFieldRefs
        operations: {
          findUnique: {
            args: Prisma.messagesFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$messagesPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.messagesFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$messagesPayload>
          }
          findFirst: {
            args: Prisma.messagesFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$messagesPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.messagesFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$messagesPayload>
          }
          findMany: {
            args: Prisma.messagesFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$messagesPayload>[]
          }
          create: {
            args: Prisma.messagesCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$messagesPayload>
          }
          createMany: {
            args: Prisma.messagesCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.messagesCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$messagesPayload>[]
          }
          delete: {
            args: Prisma.messagesDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$messagesPayload>
          }
          update: {
            args: Prisma.messagesUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$messagesPayload>
          }
          deleteMany: {
            args: Prisma.messagesDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.messagesUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.messagesUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$messagesPayload>[]
          }
          upsert: {
            args: Prisma.messagesUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$messagesPayload>
          }
          aggregate: {
            args: Prisma.MessagesAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateMessages>
          }
          groupBy: {
            args: Prisma.messagesGroupByArgs<ExtArgs>
            result: $Utils.Optional<MessagesGroupByOutputType>[]
          }
          count: {
            args: Prisma.messagesCountArgs<ExtArgs>
            result: $Utils.Optional<MessagesCountAggregateOutputType> | number
          }
        }
      }
      scheduled_tasks: {
        payload: Prisma.$scheduled_tasksPayload<ExtArgs>
        fields: Prisma.scheduled_tasksFieldRefs
        operations: {
          findUnique: {
            args: Prisma.scheduled_tasksFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$scheduled_tasksPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.scheduled_tasksFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$scheduled_tasksPayload>
          }
          findFirst: {
            args: Prisma.scheduled_tasksFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$scheduled_tasksPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.scheduled_tasksFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$scheduled_tasksPayload>
          }
          findMany: {
            args: Prisma.scheduled_tasksFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$scheduled_tasksPayload>[]
          }
          create: {
            args: Prisma.scheduled_tasksCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$scheduled_tasksPayload>
          }
          createMany: {
            args: Prisma.scheduled_tasksCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.scheduled_tasksCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$scheduled_tasksPayload>[]
          }
          delete: {
            args: Prisma.scheduled_tasksDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$scheduled_tasksPayload>
          }
          update: {
            args: Prisma.scheduled_tasksUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$scheduled_tasksPayload>
          }
          deleteMany: {
            args: Prisma.scheduled_tasksDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.scheduled_tasksUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.scheduled_tasksUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$scheduled_tasksPayload>[]
          }
          upsert: {
            args: Prisma.scheduled_tasksUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$scheduled_tasksPayload>
          }
          aggregate: {
            args: Prisma.Scheduled_tasksAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateScheduled_tasks>
          }
          groupBy: {
            args: Prisma.scheduled_tasksGroupByArgs<ExtArgs>
            result: $Utils.Optional<Scheduled_tasksGroupByOutputType>[]
          }
          count: {
            args: Prisma.scheduled_tasksCountArgs<ExtArgs>
            result: $Utils.Optional<Scheduled_tasksCountAggregateOutputType> | number
          }
        }
      }
      sensor_readings: {
        payload: Prisma.$sensor_readingsPayload<ExtArgs>
        fields: Prisma.sensor_readingsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.sensor_readingsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sensor_readingsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.sensor_readingsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sensor_readingsPayload>
          }
          findFirst: {
            args: Prisma.sensor_readingsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sensor_readingsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.sensor_readingsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sensor_readingsPayload>
          }
          findMany: {
            args: Prisma.sensor_readingsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sensor_readingsPayload>[]
          }
          create: {
            args: Prisma.sensor_readingsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sensor_readingsPayload>
          }
          createMany: {
            args: Prisma.sensor_readingsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.sensor_readingsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sensor_readingsPayload>[]
          }
          delete: {
            args: Prisma.sensor_readingsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sensor_readingsPayload>
          }
          update: {
            args: Prisma.sensor_readingsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sensor_readingsPayload>
          }
          deleteMany: {
            args: Prisma.sensor_readingsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.sensor_readingsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.sensor_readingsUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sensor_readingsPayload>[]
          }
          upsert: {
            args: Prisma.sensor_readingsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$sensor_readingsPayload>
          }
          aggregate: {
            args: Prisma.Sensor_readingsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSensor_readings>
          }
          groupBy: {
            args: Prisma.sensor_readingsGroupByArgs<ExtArgs>
            result: $Utils.Optional<Sensor_readingsGroupByOutputType>[]
          }
          count: {
            args: Prisma.sensor_readingsCountArgs<ExtArgs>
            result: $Utils.Optional<Sensor_readingsCountAggregateOutputType> | number
          }
        }
      }
      system_settings: {
        payload: Prisma.$system_settingsPayload<ExtArgs>
        fields: Prisma.system_settingsFieldRefs
        operations: {
          findUnique: {
            args: Prisma.system_settingsFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$system_settingsPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.system_settingsFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$system_settingsPayload>
          }
          findFirst: {
            args: Prisma.system_settingsFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$system_settingsPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.system_settingsFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$system_settingsPayload>
          }
          findMany: {
            args: Prisma.system_settingsFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$system_settingsPayload>[]
          }
          create: {
            args: Prisma.system_settingsCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$system_settingsPayload>
          }
          createMany: {
            args: Prisma.system_settingsCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.system_settingsCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$system_settingsPayload>[]
          }
          delete: {
            args: Prisma.system_settingsDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$system_settingsPayload>
          }
          update: {
            args: Prisma.system_settingsUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$system_settingsPayload>
          }
          deleteMany: {
            args: Prisma.system_settingsDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.system_settingsUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.system_settingsUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$system_settingsPayload>[]
          }
          upsert: {
            args: Prisma.system_settingsUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$system_settingsPayload>
          }
          aggregate: {
            args: Prisma.System_settingsAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSystem_settings>
          }
          groupBy: {
            args: Prisma.system_settingsGroupByArgs<ExtArgs>
            result: $Utils.Optional<System_settingsGroupByOutputType>[]
          }
          count: {
            args: Prisma.system_settingsCountArgs<ExtArgs>
            result: $Utils.Optional<System_settingsCountAggregateOutputType> | number
          }
        }
      }
      users: {
        payload: Prisma.$usersPayload<ExtArgs>
        fields: Prisma.usersFieldRefs
        operations: {
          findUnique: {
            args: Prisma.usersFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.usersFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload>
          }
          findFirst: {
            args: Prisma.usersFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.usersFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload>
          }
          findMany: {
            args: Prisma.usersFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload>[]
          }
          create: {
            args: Prisma.usersCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload>
          }
          createMany: {
            args: Prisma.usersCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.usersCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload>[]
          }
          delete: {
            args: Prisma.usersDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload>
          }
          update: {
            args: Prisma.usersUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload>
          }
          deleteMany: {
            args: Prisma.usersDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.usersUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.usersUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload>[]
          }
          upsert: {
            args: Prisma.usersUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$usersPayload>
          }
          aggregate: {
            args: Prisma.UsersAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUsers>
          }
          groupBy: {
            args: Prisma.usersGroupByArgs<ExtArgs>
            result: $Utils.Optional<UsersGroupByOutputType>[]
          }
          count: {
            args: Prisma.usersCountArgs<ExtArgs>
            result: $Utils.Optional<UsersCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://pris.ly/d/logging).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory
    /**
     * Prisma Accelerate URL allowing the client to connect through Accelerate instead of a direct database.
     */
    accelerateUrl?: string
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
    /**
     * SQL commenter plugins that add metadata to SQL queries as comments.
     * Comments follow the sqlcommenter format: https://google.github.io/sqlcommenter/
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   adapter,
     *   comments: [
     *     traceContext(),
     *     queryInsights(),
     *   ],
     * })
     * ```
     */
    comments?: runtime.SqlCommenterPlugin[]
  }
  export type GlobalOmitConfig = {
    agriKnowledge?: AgriKnowledgeOmit
    dailyReport?: DailyReportOmit
    access_logs?: access_logsOmit
    automation_rules?: automation_rulesOmit
    banned_ips?: banned_ipsOmit
    device_logs?: device_logsOmit
    email_verifications?: email_verificationsOmit
    friend_requests?: friend_requestsOmit
    friends?: friendsOmit
    group_members?: group_membersOmit
    groups?: groupsOmit
    login_logs?: login_logsOmit
    login_tickets?: login_ticketsOmit
    messages?: messagesOmit
    scheduled_tasks?: scheduled_tasksOmit
    sensor_readings?: sensor_readingsOmit
    system_settings?: system_settingsOmit
    users?: usersOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */



  /**
   * Models
   */

  /**
   * Model AgriKnowledge
   */

  export type AggregateAgriKnowledge = {
    _count: AgriKnowledgeCountAggregateOutputType | null
    _min: AgriKnowledgeMinAggregateOutputType | null
    _max: AgriKnowledgeMaxAggregateOutputType | null
  }

  export type AgriKnowledgeMinAggregateOutputType = {
    id: string | null
    title: string | null
    content: string | null
    category: string | null
    source: string | null
    isActive: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AgriKnowledgeMaxAggregateOutputType = {
    id: string | null
    title: string | null
    content: string | null
    category: string | null
    source: string | null
    isActive: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AgriKnowledgeCountAggregateOutputType = {
    id: number
    title: number
    content: number
    category: number
    tags: number
    source: number
    isActive: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type AgriKnowledgeMinAggregateInputType = {
    id?: true
    title?: true
    content?: true
    category?: true
    source?: true
    isActive?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AgriKnowledgeMaxAggregateInputType = {
    id?: true
    title?: true
    content?: true
    category?: true
    source?: true
    isActive?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AgriKnowledgeCountAggregateInputType = {
    id?: true
    title?: true
    content?: true
    category?: true
    tags?: true
    source?: true
    isActive?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type AgriKnowledgeAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AgriKnowledge to aggregate.
     */
    where?: AgriKnowledgeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AgriKnowledges to fetch.
     */
    orderBy?: AgriKnowledgeOrderByWithRelationInput | AgriKnowledgeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AgriKnowledgeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AgriKnowledges from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AgriKnowledges.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AgriKnowledges
    **/
    _count?: true | AgriKnowledgeCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AgriKnowledgeMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AgriKnowledgeMaxAggregateInputType
  }

  export type GetAgriKnowledgeAggregateType<T extends AgriKnowledgeAggregateArgs> = {
        [P in keyof T & keyof AggregateAgriKnowledge]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAgriKnowledge[P]>
      : GetScalarType<T[P], AggregateAgriKnowledge[P]>
  }




  export type AgriKnowledgeGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AgriKnowledgeWhereInput
    orderBy?: AgriKnowledgeOrderByWithAggregationInput | AgriKnowledgeOrderByWithAggregationInput[]
    by: AgriKnowledgeScalarFieldEnum[] | AgriKnowledgeScalarFieldEnum
    having?: AgriKnowledgeScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AgriKnowledgeCountAggregateInputType | true
    _min?: AgriKnowledgeMinAggregateInputType
    _max?: AgriKnowledgeMaxAggregateInputType
  }

  export type AgriKnowledgeGroupByOutputType = {
    id: string
    title: string
    content: string
    category: string
    tags: string[]
    source: string | null
    isActive: boolean
    createdAt: Date
    updatedAt: Date
    _count: AgriKnowledgeCountAggregateOutputType | null
    _min: AgriKnowledgeMinAggregateOutputType | null
    _max: AgriKnowledgeMaxAggregateOutputType | null
  }

  type GetAgriKnowledgeGroupByPayload<T extends AgriKnowledgeGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AgriKnowledgeGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AgriKnowledgeGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AgriKnowledgeGroupByOutputType[P]>
            : GetScalarType<T[P], AgriKnowledgeGroupByOutputType[P]>
        }
      >
    >


  export type AgriKnowledgeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    title?: boolean
    content?: boolean
    category?: boolean
    tags?: boolean
    source?: boolean
    isActive?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["agriKnowledge"]>

  export type AgriKnowledgeSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    title?: boolean
    content?: boolean
    category?: boolean
    tags?: boolean
    source?: boolean
    isActive?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["agriKnowledge"]>

  export type AgriKnowledgeSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    title?: boolean
    content?: boolean
    category?: boolean
    tags?: boolean
    source?: boolean
    isActive?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["agriKnowledge"]>

  export type AgriKnowledgeSelectScalar = {
    id?: boolean
    title?: boolean
    content?: boolean
    category?: boolean
    tags?: boolean
    source?: boolean
    isActive?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type AgriKnowledgeOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "title" | "content" | "category" | "tags" | "source" | "isActive" | "createdAt" | "updatedAt", ExtArgs["result"]["agriKnowledge"]>

  export type $AgriKnowledgePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AgriKnowledge"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      title: string
      content: string
      category: string
      tags: string[]
      source: string | null
      isActive: boolean
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["agriKnowledge"]>
    composites: {}
  }

  type AgriKnowledgeGetPayload<S extends boolean | null | undefined | AgriKnowledgeDefaultArgs> = $Result.GetResult<Prisma.$AgriKnowledgePayload, S>

  type AgriKnowledgeCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AgriKnowledgeFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AgriKnowledgeCountAggregateInputType | true
    }

  export interface AgriKnowledgeDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AgriKnowledge'], meta: { name: 'AgriKnowledge' } }
    /**
     * Find zero or one AgriKnowledge that matches the filter.
     * @param {AgriKnowledgeFindUniqueArgs} args - Arguments to find a AgriKnowledge
     * @example
     * // Get one AgriKnowledge
     * const agriKnowledge = await prisma.agriKnowledge.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AgriKnowledgeFindUniqueArgs>(args: SelectSubset<T, AgriKnowledgeFindUniqueArgs<ExtArgs>>): Prisma__AgriKnowledgeClient<$Result.GetResult<Prisma.$AgriKnowledgePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AgriKnowledge that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AgriKnowledgeFindUniqueOrThrowArgs} args - Arguments to find a AgriKnowledge
     * @example
     * // Get one AgriKnowledge
     * const agriKnowledge = await prisma.agriKnowledge.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AgriKnowledgeFindUniqueOrThrowArgs>(args: SelectSubset<T, AgriKnowledgeFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AgriKnowledgeClient<$Result.GetResult<Prisma.$AgriKnowledgePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AgriKnowledge that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AgriKnowledgeFindFirstArgs} args - Arguments to find a AgriKnowledge
     * @example
     * // Get one AgriKnowledge
     * const agriKnowledge = await prisma.agriKnowledge.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AgriKnowledgeFindFirstArgs>(args?: SelectSubset<T, AgriKnowledgeFindFirstArgs<ExtArgs>>): Prisma__AgriKnowledgeClient<$Result.GetResult<Prisma.$AgriKnowledgePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AgriKnowledge that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AgriKnowledgeFindFirstOrThrowArgs} args - Arguments to find a AgriKnowledge
     * @example
     * // Get one AgriKnowledge
     * const agriKnowledge = await prisma.agriKnowledge.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AgriKnowledgeFindFirstOrThrowArgs>(args?: SelectSubset<T, AgriKnowledgeFindFirstOrThrowArgs<ExtArgs>>): Prisma__AgriKnowledgeClient<$Result.GetResult<Prisma.$AgriKnowledgePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AgriKnowledges that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AgriKnowledgeFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AgriKnowledges
     * const agriKnowledges = await prisma.agriKnowledge.findMany()
     * 
     * // Get first 10 AgriKnowledges
     * const agriKnowledges = await prisma.agriKnowledge.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const agriKnowledgeWithIdOnly = await prisma.agriKnowledge.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AgriKnowledgeFindManyArgs>(args?: SelectSubset<T, AgriKnowledgeFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AgriKnowledgePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AgriKnowledge.
     * @param {AgriKnowledgeCreateArgs} args - Arguments to create a AgriKnowledge.
     * @example
     * // Create one AgriKnowledge
     * const AgriKnowledge = await prisma.agriKnowledge.create({
     *   data: {
     *     // ... data to create a AgriKnowledge
     *   }
     * })
     * 
     */
    create<T extends AgriKnowledgeCreateArgs>(args: SelectSubset<T, AgriKnowledgeCreateArgs<ExtArgs>>): Prisma__AgriKnowledgeClient<$Result.GetResult<Prisma.$AgriKnowledgePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AgriKnowledges.
     * @param {AgriKnowledgeCreateManyArgs} args - Arguments to create many AgriKnowledges.
     * @example
     * // Create many AgriKnowledges
     * const agriKnowledge = await prisma.agriKnowledge.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AgriKnowledgeCreateManyArgs>(args?: SelectSubset<T, AgriKnowledgeCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many AgriKnowledges and returns the data saved in the database.
     * @param {AgriKnowledgeCreateManyAndReturnArgs} args - Arguments to create many AgriKnowledges.
     * @example
     * // Create many AgriKnowledges
     * const agriKnowledge = await prisma.agriKnowledge.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many AgriKnowledges and only return the `id`
     * const agriKnowledgeWithIdOnly = await prisma.agriKnowledge.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AgriKnowledgeCreateManyAndReturnArgs>(args?: SelectSubset<T, AgriKnowledgeCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AgriKnowledgePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a AgriKnowledge.
     * @param {AgriKnowledgeDeleteArgs} args - Arguments to delete one AgriKnowledge.
     * @example
     * // Delete one AgriKnowledge
     * const AgriKnowledge = await prisma.agriKnowledge.delete({
     *   where: {
     *     // ... filter to delete one AgriKnowledge
     *   }
     * })
     * 
     */
    delete<T extends AgriKnowledgeDeleteArgs>(args: SelectSubset<T, AgriKnowledgeDeleteArgs<ExtArgs>>): Prisma__AgriKnowledgeClient<$Result.GetResult<Prisma.$AgriKnowledgePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AgriKnowledge.
     * @param {AgriKnowledgeUpdateArgs} args - Arguments to update one AgriKnowledge.
     * @example
     * // Update one AgriKnowledge
     * const agriKnowledge = await prisma.agriKnowledge.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AgriKnowledgeUpdateArgs>(args: SelectSubset<T, AgriKnowledgeUpdateArgs<ExtArgs>>): Prisma__AgriKnowledgeClient<$Result.GetResult<Prisma.$AgriKnowledgePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AgriKnowledges.
     * @param {AgriKnowledgeDeleteManyArgs} args - Arguments to filter AgriKnowledges to delete.
     * @example
     * // Delete a few AgriKnowledges
     * const { count } = await prisma.agriKnowledge.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AgriKnowledgeDeleteManyArgs>(args?: SelectSubset<T, AgriKnowledgeDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AgriKnowledges.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AgriKnowledgeUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AgriKnowledges
     * const agriKnowledge = await prisma.agriKnowledge.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AgriKnowledgeUpdateManyArgs>(args: SelectSubset<T, AgriKnowledgeUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AgriKnowledges and returns the data updated in the database.
     * @param {AgriKnowledgeUpdateManyAndReturnArgs} args - Arguments to update many AgriKnowledges.
     * @example
     * // Update many AgriKnowledges
     * const agriKnowledge = await prisma.agriKnowledge.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more AgriKnowledges and only return the `id`
     * const agriKnowledgeWithIdOnly = await prisma.agriKnowledge.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AgriKnowledgeUpdateManyAndReturnArgs>(args: SelectSubset<T, AgriKnowledgeUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AgriKnowledgePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one AgriKnowledge.
     * @param {AgriKnowledgeUpsertArgs} args - Arguments to update or create a AgriKnowledge.
     * @example
     * // Update or create a AgriKnowledge
     * const agriKnowledge = await prisma.agriKnowledge.upsert({
     *   create: {
     *     // ... data to create a AgriKnowledge
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AgriKnowledge we want to update
     *   }
     * })
     */
    upsert<T extends AgriKnowledgeUpsertArgs>(args: SelectSubset<T, AgriKnowledgeUpsertArgs<ExtArgs>>): Prisma__AgriKnowledgeClient<$Result.GetResult<Prisma.$AgriKnowledgePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AgriKnowledges.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AgriKnowledgeCountArgs} args - Arguments to filter AgriKnowledges to count.
     * @example
     * // Count the number of AgriKnowledges
     * const count = await prisma.agriKnowledge.count({
     *   where: {
     *     // ... the filter for the AgriKnowledges we want to count
     *   }
     * })
    **/
    count<T extends AgriKnowledgeCountArgs>(
      args?: Subset<T, AgriKnowledgeCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AgriKnowledgeCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AgriKnowledge.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AgriKnowledgeAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AgriKnowledgeAggregateArgs>(args: Subset<T, AgriKnowledgeAggregateArgs>): Prisma.PrismaPromise<GetAgriKnowledgeAggregateType<T>>

    /**
     * Group by AgriKnowledge.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AgriKnowledgeGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AgriKnowledgeGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AgriKnowledgeGroupByArgs['orderBy'] }
        : { orderBy?: AgriKnowledgeGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AgriKnowledgeGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAgriKnowledgeGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AgriKnowledge model
   */
  readonly fields: AgriKnowledgeFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AgriKnowledge.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AgriKnowledgeClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AgriKnowledge model
   */
  interface AgriKnowledgeFieldRefs {
    readonly id: FieldRef<"AgriKnowledge", 'String'>
    readonly title: FieldRef<"AgriKnowledge", 'String'>
    readonly content: FieldRef<"AgriKnowledge", 'String'>
    readonly category: FieldRef<"AgriKnowledge", 'String'>
    readonly tags: FieldRef<"AgriKnowledge", 'String[]'>
    readonly source: FieldRef<"AgriKnowledge", 'String'>
    readonly isActive: FieldRef<"AgriKnowledge", 'Boolean'>
    readonly createdAt: FieldRef<"AgriKnowledge", 'DateTime'>
    readonly updatedAt: FieldRef<"AgriKnowledge", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AgriKnowledge findUnique
   */
  export type AgriKnowledgeFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgriKnowledge
     */
    select?: AgriKnowledgeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgriKnowledge
     */
    omit?: AgriKnowledgeOmit<ExtArgs> | null
    /**
     * Filter, which AgriKnowledge to fetch.
     */
    where: AgriKnowledgeWhereUniqueInput
  }

  /**
   * AgriKnowledge findUniqueOrThrow
   */
  export type AgriKnowledgeFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgriKnowledge
     */
    select?: AgriKnowledgeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgriKnowledge
     */
    omit?: AgriKnowledgeOmit<ExtArgs> | null
    /**
     * Filter, which AgriKnowledge to fetch.
     */
    where: AgriKnowledgeWhereUniqueInput
  }

  /**
   * AgriKnowledge findFirst
   */
  export type AgriKnowledgeFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgriKnowledge
     */
    select?: AgriKnowledgeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgriKnowledge
     */
    omit?: AgriKnowledgeOmit<ExtArgs> | null
    /**
     * Filter, which AgriKnowledge to fetch.
     */
    where?: AgriKnowledgeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AgriKnowledges to fetch.
     */
    orderBy?: AgriKnowledgeOrderByWithRelationInput | AgriKnowledgeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AgriKnowledges.
     */
    cursor?: AgriKnowledgeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AgriKnowledges from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AgriKnowledges.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AgriKnowledges.
     */
    distinct?: AgriKnowledgeScalarFieldEnum | AgriKnowledgeScalarFieldEnum[]
  }

  /**
   * AgriKnowledge findFirstOrThrow
   */
  export type AgriKnowledgeFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgriKnowledge
     */
    select?: AgriKnowledgeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgriKnowledge
     */
    omit?: AgriKnowledgeOmit<ExtArgs> | null
    /**
     * Filter, which AgriKnowledge to fetch.
     */
    where?: AgriKnowledgeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AgriKnowledges to fetch.
     */
    orderBy?: AgriKnowledgeOrderByWithRelationInput | AgriKnowledgeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AgriKnowledges.
     */
    cursor?: AgriKnowledgeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AgriKnowledges from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AgriKnowledges.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AgriKnowledges.
     */
    distinct?: AgriKnowledgeScalarFieldEnum | AgriKnowledgeScalarFieldEnum[]
  }

  /**
   * AgriKnowledge findMany
   */
  export type AgriKnowledgeFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgriKnowledge
     */
    select?: AgriKnowledgeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgriKnowledge
     */
    omit?: AgriKnowledgeOmit<ExtArgs> | null
    /**
     * Filter, which AgriKnowledges to fetch.
     */
    where?: AgriKnowledgeWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AgriKnowledges to fetch.
     */
    orderBy?: AgriKnowledgeOrderByWithRelationInput | AgriKnowledgeOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AgriKnowledges.
     */
    cursor?: AgriKnowledgeWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AgriKnowledges from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AgriKnowledges.
     */
    skip?: number
    distinct?: AgriKnowledgeScalarFieldEnum | AgriKnowledgeScalarFieldEnum[]
  }

  /**
   * AgriKnowledge create
   */
  export type AgriKnowledgeCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgriKnowledge
     */
    select?: AgriKnowledgeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgriKnowledge
     */
    omit?: AgriKnowledgeOmit<ExtArgs> | null
    /**
     * The data needed to create a AgriKnowledge.
     */
    data: XOR<AgriKnowledgeCreateInput, AgriKnowledgeUncheckedCreateInput>
  }

  /**
   * AgriKnowledge createMany
   */
  export type AgriKnowledgeCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AgriKnowledges.
     */
    data: AgriKnowledgeCreateManyInput | AgriKnowledgeCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AgriKnowledge createManyAndReturn
   */
  export type AgriKnowledgeCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgriKnowledge
     */
    select?: AgriKnowledgeSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AgriKnowledge
     */
    omit?: AgriKnowledgeOmit<ExtArgs> | null
    /**
     * The data used to create many AgriKnowledges.
     */
    data: AgriKnowledgeCreateManyInput | AgriKnowledgeCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AgriKnowledge update
   */
  export type AgriKnowledgeUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgriKnowledge
     */
    select?: AgriKnowledgeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgriKnowledge
     */
    omit?: AgriKnowledgeOmit<ExtArgs> | null
    /**
     * The data needed to update a AgriKnowledge.
     */
    data: XOR<AgriKnowledgeUpdateInput, AgriKnowledgeUncheckedUpdateInput>
    /**
     * Choose, which AgriKnowledge to update.
     */
    where: AgriKnowledgeWhereUniqueInput
  }

  /**
   * AgriKnowledge updateMany
   */
  export type AgriKnowledgeUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AgriKnowledges.
     */
    data: XOR<AgriKnowledgeUpdateManyMutationInput, AgriKnowledgeUncheckedUpdateManyInput>
    /**
     * Filter which AgriKnowledges to update
     */
    where?: AgriKnowledgeWhereInput
    /**
     * Limit how many AgriKnowledges to update.
     */
    limit?: number
  }

  /**
   * AgriKnowledge updateManyAndReturn
   */
  export type AgriKnowledgeUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgriKnowledge
     */
    select?: AgriKnowledgeSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the AgriKnowledge
     */
    omit?: AgriKnowledgeOmit<ExtArgs> | null
    /**
     * The data used to update AgriKnowledges.
     */
    data: XOR<AgriKnowledgeUpdateManyMutationInput, AgriKnowledgeUncheckedUpdateManyInput>
    /**
     * Filter which AgriKnowledges to update
     */
    where?: AgriKnowledgeWhereInput
    /**
     * Limit how many AgriKnowledges to update.
     */
    limit?: number
  }

  /**
   * AgriKnowledge upsert
   */
  export type AgriKnowledgeUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgriKnowledge
     */
    select?: AgriKnowledgeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgriKnowledge
     */
    omit?: AgriKnowledgeOmit<ExtArgs> | null
    /**
     * The filter to search for the AgriKnowledge to update in case it exists.
     */
    where: AgriKnowledgeWhereUniqueInput
    /**
     * In case the AgriKnowledge found by the `where` argument doesn't exist, create a new AgriKnowledge with this data.
     */
    create: XOR<AgriKnowledgeCreateInput, AgriKnowledgeUncheckedCreateInput>
    /**
     * In case the AgriKnowledge was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AgriKnowledgeUpdateInput, AgriKnowledgeUncheckedUpdateInput>
  }

  /**
   * AgriKnowledge delete
   */
  export type AgriKnowledgeDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgriKnowledge
     */
    select?: AgriKnowledgeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgriKnowledge
     */
    omit?: AgriKnowledgeOmit<ExtArgs> | null
    /**
     * Filter which AgriKnowledge to delete.
     */
    where: AgriKnowledgeWhereUniqueInput
  }

  /**
   * AgriKnowledge deleteMany
   */
  export type AgriKnowledgeDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AgriKnowledges to delete
     */
    where?: AgriKnowledgeWhereInput
    /**
     * Limit how many AgriKnowledges to delete.
     */
    limit?: number
  }

  /**
   * AgriKnowledge without action
   */
  export type AgriKnowledgeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AgriKnowledge
     */
    select?: AgriKnowledgeSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AgriKnowledge
     */
    omit?: AgriKnowledgeOmit<ExtArgs> | null
  }


  /**
   * Model DailyReport
   */

  export type AggregateDailyReport = {
    _count: DailyReportCountAggregateOutputType | null
    _min: DailyReportMinAggregateOutputType | null
    _max: DailyReportMaxAggregateOutputType | null
  }

  export type DailyReportMinAggregateOutputType = {
    id: string | null
    date: Date | null
    imageUrl: string | null
    imageAnalysis: string | null
    environmentAnalysis: string | null
    suggestions: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type DailyReportMaxAggregateOutputType = {
    id: string | null
    date: Date | null
    imageUrl: string | null
    imageAnalysis: string | null
    environmentAnalysis: string | null
    suggestions: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type DailyReportCountAggregateOutputType = {
    id: number
    date: number
    imageUrl: number
    imageAnalysis: number
    sensorData: number
    environmentAnalysis: number
    weatherInfo: number
    suggestions: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type DailyReportMinAggregateInputType = {
    id?: true
    date?: true
    imageUrl?: true
    imageAnalysis?: true
    environmentAnalysis?: true
    suggestions?: true
    createdAt?: true
    updatedAt?: true
  }

  export type DailyReportMaxAggregateInputType = {
    id?: true
    date?: true
    imageUrl?: true
    imageAnalysis?: true
    environmentAnalysis?: true
    suggestions?: true
    createdAt?: true
    updatedAt?: true
  }

  export type DailyReportCountAggregateInputType = {
    id?: true
    date?: true
    imageUrl?: true
    imageAnalysis?: true
    sensorData?: true
    environmentAnalysis?: true
    weatherInfo?: true
    suggestions?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type DailyReportAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which DailyReport to aggregate.
     */
    where?: DailyReportWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DailyReports to fetch.
     */
    orderBy?: DailyReportOrderByWithRelationInput | DailyReportOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: DailyReportWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DailyReports from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DailyReports.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned DailyReports
    **/
    _count?: true | DailyReportCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: DailyReportMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: DailyReportMaxAggregateInputType
  }

  export type GetDailyReportAggregateType<T extends DailyReportAggregateArgs> = {
        [P in keyof T & keyof AggregateDailyReport]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateDailyReport[P]>
      : GetScalarType<T[P], AggregateDailyReport[P]>
  }




  export type DailyReportGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DailyReportWhereInput
    orderBy?: DailyReportOrderByWithAggregationInput | DailyReportOrderByWithAggregationInput[]
    by: DailyReportScalarFieldEnum[] | DailyReportScalarFieldEnum
    having?: DailyReportScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: DailyReportCountAggregateInputType | true
    _min?: DailyReportMinAggregateInputType
    _max?: DailyReportMaxAggregateInputType
  }

  export type DailyReportGroupByOutputType = {
    id: string
    date: Date
    imageUrl: string | null
    imageAnalysis: string | null
    sensorData: JsonValue | null
    environmentAnalysis: string | null
    weatherInfo: JsonValue | null
    suggestions: string | null
    createdAt: Date
    updatedAt: Date
    _count: DailyReportCountAggregateOutputType | null
    _min: DailyReportMinAggregateOutputType | null
    _max: DailyReportMaxAggregateOutputType | null
  }

  type GetDailyReportGroupByPayload<T extends DailyReportGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<DailyReportGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof DailyReportGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], DailyReportGroupByOutputType[P]>
            : GetScalarType<T[P], DailyReportGroupByOutputType[P]>
        }
      >
    >


  export type DailyReportSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    date?: boolean
    imageUrl?: boolean
    imageAnalysis?: boolean
    sensorData?: boolean
    environmentAnalysis?: boolean
    weatherInfo?: boolean
    suggestions?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["dailyReport"]>

  export type DailyReportSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    date?: boolean
    imageUrl?: boolean
    imageAnalysis?: boolean
    sensorData?: boolean
    environmentAnalysis?: boolean
    weatherInfo?: boolean
    suggestions?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["dailyReport"]>

  export type DailyReportSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    date?: boolean
    imageUrl?: boolean
    imageAnalysis?: boolean
    sensorData?: boolean
    environmentAnalysis?: boolean
    weatherInfo?: boolean
    suggestions?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["dailyReport"]>

  export type DailyReportSelectScalar = {
    id?: boolean
    date?: boolean
    imageUrl?: boolean
    imageAnalysis?: boolean
    sensorData?: boolean
    environmentAnalysis?: boolean
    weatherInfo?: boolean
    suggestions?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type DailyReportOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "date" | "imageUrl" | "imageAnalysis" | "sensorData" | "environmentAnalysis" | "weatherInfo" | "suggestions" | "createdAt" | "updatedAt", ExtArgs["result"]["dailyReport"]>

  export type $DailyReportPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "DailyReport"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      date: Date
      imageUrl: string | null
      imageAnalysis: string | null
      sensorData: Prisma.JsonValue | null
      environmentAnalysis: string | null
      weatherInfo: Prisma.JsonValue | null
      suggestions: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["dailyReport"]>
    composites: {}
  }

  type DailyReportGetPayload<S extends boolean | null | undefined | DailyReportDefaultArgs> = $Result.GetResult<Prisma.$DailyReportPayload, S>

  type DailyReportCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<DailyReportFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: DailyReportCountAggregateInputType | true
    }

  export interface DailyReportDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['DailyReport'], meta: { name: 'DailyReport' } }
    /**
     * Find zero or one DailyReport that matches the filter.
     * @param {DailyReportFindUniqueArgs} args - Arguments to find a DailyReport
     * @example
     * // Get one DailyReport
     * const dailyReport = await prisma.dailyReport.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends DailyReportFindUniqueArgs>(args: SelectSubset<T, DailyReportFindUniqueArgs<ExtArgs>>): Prisma__DailyReportClient<$Result.GetResult<Prisma.$DailyReportPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one DailyReport that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {DailyReportFindUniqueOrThrowArgs} args - Arguments to find a DailyReport
     * @example
     * // Get one DailyReport
     * const dailyReport = await prisma.dailyReport.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends DailyReportFindUniqueOrThrowArgs>(args: SelectSubset<T, DailyReportFindUniqueOrThrowArgs<ExtArgs>>): Prisma__DailyReportClient<$Result.GetResult<Prisma.$DailyReportPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first DailyReport that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DailyReportFindFirstArgs} args - Arguments to find a DailyReport
     * @example
     * // Get one DailyReport
     * const dailyReport = await prisma.dailyReport.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends DailyReportFindFirstArgs>(args?: SelectSubset<T, DailyReportFindFirstArgs<ExtArgs>>): Prisma__DailyReportClient<$Result.GetResult<Prisma.$DailyReportPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first DailyReport that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DailyReportFindFirstOrThrowArgs} args - Arguments to find a DailyReport
     * @example
     * // Get one DailyReport
     * const dailyReport = await prisma.dailyReport.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends DailyReportFindFirstOrThrowArgs>(args?: SelectSubset<T, DailyReportFindFirstOrThrowArgs<ExtArgs>>): Prisma__DailyReportClient<$Result.GetResult<Prisma.$DailyReportPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more DailyReports that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DailyReportFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all DailyReports
     * const dailyReports = await prisma.dailyReport.findMany()
     * 
     * // Get first 10 DailyReports
     * const dailyReports = await prisma.dailyReport.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const dailyReportWithIdOnly = await prisma.dailyReport.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends DailyReportFindManyArgs>(args?: SelectSubset<T, DailyReportFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DailyReportPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a DailyReport.
     * @param {DailyReportCreateArgs} args - Arguments to create a DailyReport.
     * @example
     * // Create one DailyReport
     * const DailyReport = await prisma.dailyReport.create({
     *   data: {
     *     // ... data to create a DailyReport
     *   }
     * })
     * 
     */
    create<T extends DailyReportCreateArgs>(args: SelectSubset<T, DailyReportCreateArgs<ExtArgs>>): Prisma__DailyReportClient<$Result.GetResult<Prisma.$DailyReportPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many DailyReports.
     * @param {DailyReportCreateManyArgs} args - Arguments to create many DailyReports.
     * @example
     * // Create many DailyReports
     * const dailyReport = await prisma.dailyReport.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends DailyReportCreateManyArgs>(args?: SelectSubset<T, DailyReportCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many DailyReports and returns the data saved in the database.
     * @param {DailyReportCreateManyAndReturnArgs} args - Arguments to create many DailyReports.
     * @example
     * // Create many DailyReports
     * const dailyReport = await prisma.dailyReport.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many DailyReports and only return the `id`
     * const dailyReportWithIdOnly = await prisma.dailyReport.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends DailyReportCreateManyAndReturnArgs>(args?: SelectSubset<T, DailyReportCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DailyReportPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a DailyReport.
     * @param {DailyReportDeleteArgs} args - Arguments to delete one DailyReport.
     * @example
     * // Delete one DailyReport
     * const DailyReport = await prisma.dailyReport.delete({
     *   where: {
     *     // ... filter to delete one DailyReport
     *   }
     * })
     * 
     */
    delete<T extends DailyReportDeleteArgs>(args: SelectSubset<T, DailyReportDeleteArgs<ExtArgs>>): Prisma__DailyReportClient<$Result.GetResult<Prisma.$DailyReportPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one DailyReport.
     * @param {DailyReportUpdateArgs} args - Arguments to update one DailyReport.
     * @example
     * // Update one DailyReport
     * const dailyReport = await prisma.dailyReport.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends DailyReportUpdateArgs>(args: SelectSubset<T, DailyReportUpdateArgs<ExtArgs>>): Prisma__DailyReportClient<$Result.GetResult<Prisma.$DailyReportPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more DailyReports.
     * @param {DailyReportDeleteManyArgs} args - Arguments to filter DailyReports to delete.
     * @example
     * // Delete a few DailyReports
     * const { count } = await prisma.dailyReport.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends DailyReportDeleteManyArgs>(args?: SelectSubset<T, DailyReportDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more DailyReports.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DailyReportUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many DailyReports
     * const dailyReport = await prisma.dailyReport.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends DailyReportUpdateManyArgs>(args: SelectSubset<T, DailyReportUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more DailyReports and returns the data updated in the database.
     * @param {DailyReportUpdateManyAndReturnArgs} args - Arguments to update many DailyReports.
     * @example
     * // Update many DailyReports
     * const dailyReport = await prisma.dailyReport.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more DailyReports and only return the `id`
     * const dailyReportWithIdOnly = await prisma.dailyReport.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends DailyReportUpdateManyAndReturnArgs>(args: SelectSubset<T, DailyReportUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DailyReportPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one DailyReport.
     * @param {DailyReportUpsertArgs} args - Arguments to update or create a DailyReport.
     * @example
     * // Update or create a DailyReport
     * const dailyReport = await prisma.dailyReport.upsert({
     *   create: {
     *     // ... data to create a DailyReport
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the DailyReport we want to update
     *   }
     * })
     */
    upsert<T extends DailyReportUpsertArgs>(args: SelectSubset<T, DailyReportUpsertArgs<ExtArgs>>): Prisma__DailyReportClient<$Result.GetResult<Prisma.$DailyReportPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of DailyReports.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DailyReportCountArgs} args - Arguments to filter DailyReports to count.
     * @example
     * // Count the number of DailyReports
     * const count = await prisma.dailyReport.count({
     *   where: {
     *     // ... the filter for the DailyReports we want to count
     *   }
     * })
    **/
    count<T extends DailyReportCountArgs>(
      args?: Subset<T, DailyReportCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], DailyReportCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a DailyReport.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DailyReportAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends DailyReportAggregateArgs>(args: Subset<T, DailyReportAggregateArgs>): Prisma.PrismaPromise<GetDailyReportAggregateType<T>>

    /**
     * Group by DailyReport.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DailyReportGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends DailyReportGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: DailyReportGroupByArgs['orderBy'] }
        : { orderBy?: DailyReportGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, DailyReportGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetDailyReportGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the DailyReport model
   */
  readonly fields: DailyReportFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for DailyReport.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__DailyReportClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the DailyReport model
   */
  interface DailyReportFieldRefs {
    readonly id: FieldRef<"DailyReport", 'String'>
    readonly date: FieldRef<"DailyReport", 'DateTime'>
    readonly imageUrl: FieldRef<"DailyReport", 'String'>
    readonly imageAnalysis: FieldRef<"DailyReport", 'String'>
    readonly sensorData: FieldRef<"DailyReport", 'Json'>
    readonly environmentAnalysis: FieldRef<"DailyReport", 'String'>
    readonly weatherInfo: FieldRef<"DailyReport", 'Json'>
    readonly suggestions: FieldRef<"DailyReport", 'String'>
    readonly createdAt: FieldRef<"DailyReport", 'DateTime'>
    readonly updatedAt: FieldRef<"DailyReport", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * DailyReport findUnique
   */
  export type DailyReportFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DailyReport
     */
    select?: DailyReportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DailyReport
     */
    omit?: DailyReportOmit<ExtArgs> | null
    /**
     * Filter, which DailyReport to fetch.
     */
    where: DailyReportWhereUniqueInput
  }

  /**
   * DailyReport findUniqueOrThrow
   */
  export type DailyReportFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DailyReport
     */
    select?: DailyReportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DailyReport
     */
    omit?: DailyReportOmit<ExtArgs> | null
    /**
     * Filter, which DailyReport to fetch.
     */
    where: DailyReportWhereUniqueInput
  }

  /**
   * DailyReport findFirst
   */
  export type DailyReportFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DailyReport
     */
    select?: DailyReportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DailyReport
     */
    omit?: DailyReportOmit<ExtArgs> | null
    /**
     * Filter, which DailyReport to fetch.
     */
    where?: DailyReportWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DailyReports to fetch.
     */
    orderBy?: DailyReportOrderByWithRelationInput | DailyReportOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for DailyReports.
     */
    cursor?: DailyReportWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DailyReports from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DailyReports.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of DailyReports.
     */
    distinct?: DailyReportScalarFieldEnum | DailyReportScalarFieldEnum[]
  }

  /**
   * DailyReport findFirstOrThrow
   */
  export type DailyReportFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DailyReport
     */
    select?: DailyReportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DailyReport
     */
    omit?: DailyReportOmit<ExtArgs> | null
    /**
     * Filter, which DailyReport to fetch.
     */
    where?: DailyReportWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DailyReports to fetch.
     */
    orderBy?: DailyReportOrderByWithRelationInput | DailyReportOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for DailyReports.
     */
    cursor?: DailyReportWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DailyReports from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DailyReports.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of DailyReports.
     */
    distinct?: DailyReportScalarFieldEnum | DailyReportScalarFieldEnum[]
  }

  /**
   * DailyReport findMany
   */
  export type DailyReportFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DailyReport
     */
    select?: DailyReportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DailyReport
     */
    omit?: DailyReportOmit<ExtArgs> | null
    /**
     * Filter, which DailyReports to fetch.
     */
    where?: DailyReportWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DailyReports to fetch.
     */
    orderBy?: DailyReportOrderByWithRelationInput | DailyReportOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing DailyReports.
     */
    cursor?: DailyReportWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DailyReports from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DailyReports.
     */
    skip?: number
    distinct?: DailyReportScalarFieldEnum | DailyReportScalarFieldEnum[]
  }

  /**
   * DailyReport create
   */
  export type DailyReportCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DailyReport
     */
    select?: DailyReportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DailyReport
     */
    omit?: DailyReportOmit<ExtArgs> | null
    /**
     * The data needed to create a DailyReport.
     */
    data: XOR<DailyReportCreateInput, DailyReportUncheckedCreateInput>
  }

  /**
   * DailyReport createMany
   */
  export type DailyReportCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many DailyReports.
     */
    data: DailyReportCreateManyInput | DailyReportCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * DailyReport createManyAndReturn
   */
  export type DailyReportCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DailyReport
     */
    select?: DailyReportSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the DailyReport
     */
    omit?: DailyReportOmit<ExtArgs> | null
    /**
     * The data used to create many DailyReports.
     */
    data: DailyReportCreateManyInput | DailyReportCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * DailyReport update
   */
  export type DailyReportUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DailyReport
     */
    select?: DailyReportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DailyReport
     */
    omit?: DailyReportOmit<ExtArgs> | null
    /**
     * The data needed to update a DailyReport.
     */
    data: XOR<DailyReportUpdateInput, DailyReportUncheckedUpdateInput>
    /**
     * Choose, which DailyReport to update.
     */
    where: DailyReportWhereUniqueInput
  }

  /**
   * DailyReport updateMany
   */
  export type DailyReportUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update DailyReports.
     */
    data: XOR<DailyReportUpdateManyMutationInput, DailyReportUncheckedUpdateManyInput>
    /**
     * Filter which DailyReports to update
     */
    where?: DailyReportWhereInput
    /**
     * Limit how many DailyReports to update.
     */
    limit?: number
  }

  /**
   * DailyReport updateManyAndReturn
   */
  export type DailyReportUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DailyReport
     */
    select?: DailyReportSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the DailyReport
     */
    omit?: DailyReportOmit<ExtArgs> | null
    /**
     * The data used to update DailyReports.
     */
    data: XOR<DailyReportUpdateManyMutationInput, DailyReportUncheckedUpdateManyInput>
    /**
     * Filter which DailyReports to update
     */
    where?: DailyReportWhereInput
    /**
     * Limit how many DailyReports to update.
     */
    limit?: number
  }

  /**
   * DailyReport upsert
   */
  export type DailyReportUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DailyReport
     */
    select?: DailyReportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DailyReport
     */
    omit?: DailyReportOmit<ExtArgs> | null
    /**
     * The filter to search for the DailyReport to update in case it exists.
     */
    where: DailyReportWhereUniqueInput
    /**
     * In case the DailyReport found by the `where` argument doesn't exist, create a new DailyReport with this data.
     */
    create: XOR<DailyReportCreateInput, DailyReportUncheckedCreateInput>
    /**
     * In case the DailyReport was found with the provided `where` argument, update it with this data.
     */
    update: XOR<DailyReportUpdateInput, DailyReportUncheckedUpdateInput>
  }

  /**
   * DailyReport delete
   */
  export type DailyReportDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DailyReport
     */
    select?: DailyReportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DailyReport
     */
    omit?: DailyReportOmit<ExtArgs> | null
    /**
     * Filter which DailyReport to delete.
     */
    where: DailyReportWhereUniqueInput
  }

  /**
   * DailyReport deleteMany
   */
  export type DailyReportDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which DailyReports to delete
     */
    where?: DailyReportWhereInput
    /**
     * Limit how many DailyReports to delete.
     */
    limit?: number
  }

  /**
   * DailyReport without action
   */
  export type DailyReportDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DailyReport
     */
    select?: DailyReportSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DailyReport
     */
    omit?: DailyReportOmit<ExtArgs> | null
  }


  /**
   * Model access_logs
   */

  export type AggregateAccess_logs = {
    _count: Access_logsCountAggregateOutputType | null
    _avg: Access_logsAvgAggregateOutputType | null
    _sum: Access_logsSumAggregateOutputType | null
    _min: Access_logsMinAggregateOutputType | null
    _max: Access_logsMaxAggregateOutputType | null
  }

  export type Access_logsAvgAggregateOutputType = {
    id: number | null
    status: number | null
    duration: number | null
    user_id: number | null
    created_at: number | null
  }

  export type Access_logsSumAggregateOutputType = {
    id: bigint | null
    status: number | null
    duration: number | null
    user_id: number | null
    created_at: bigint | null
  }

  export type Access_logsMinAggregateOutputType = {
    id: bigint | null
    ip: string | null
    method: string | null
    path: string | null
    status: number | null
    duration: number | null
    user_id: number | null
    user_agent: string | null
    created_at: bigint | null
  }

  export type Access_logsMaxAggregateOutputType = {
    id: bigint | null
    ip: string | null
    method: string | null
    path: string | null
    status: number | null
    duration: number | null
    user_id: number | null
    user_agent: string | null
    created_at: bigint | null
  }

  export type Access_logsCountAggregateOutputType = {
    id: number
    ip: number
    method: number
    path: number
    status: number
    duration: number
    user_id: number
    user_agent: number
    created_at: number
    _all: number
  }


  export type Access_logsAvgAggregateInputType = {
    id?: true
    status?: true
    duration?: true
    user_id?: true
    created_at?: true
  }

  export type Access_logsSumAggregateInputType = {
    id?: true
    status?: true
    duration?: true
    user_id?: true
    created_at?: true
  }

  export type Access_logsMinAggregateInputType = {
    id?: true
    ip?: true
    method?: true
    path?: true
    status?: true
    duration?: true
    user_id?: true
    user_agent?: true
    created_at?: true
  }

  export type Access_logsMaxAggregateInputType = {
    id?: true
    ip?: true
    method?: true
    path?: true
    status?: true
    duration?: true
    user_id?: true
    user_agent?: true
    created_at?: true
  }

  export type Access_logsCountAggregateInputType = {
    id?: true
    ip?: true
    method?: true
    path?: true
    status?: true
    duration?: true
    user_id?: true
    user_agent?: true
    created_at?: true
    _all?: true
  }

  export type Access_logsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which access_logs to aggregate.
     */
    where?: access_logsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of access_logs to fetch.
     */
    orderBy?: access_logsOrderByWithRelationInput | access_logsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: access_logsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` access_logs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` access_logs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned access_logs
    **/
    _count?: true | Access_logsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: Access_logsAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: Access_logsSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: Access_logsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: Access_logsMaxAggregateInputType
  }

  export type GetAccess_logsAggregateType<T extends Access_logsAggregateArgs> = {
        [P in keyof T & keyof AggregateAccess_logs]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAccess_logs[P]>
      : GetScalarType<T[P], AggregateAccess_logs[P]>
  }




  export type access_logsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: access_logsWhereInput
    orderBy?: access_logsOrderByWithAggregationInput | access_logsOrderByWithAggregationInput[]
    by: Access_logsScalarFieldEnum[] | Access_logsScalarFieldEnum
    having?: access_logsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: Access_logsCountAggregateInputType | true
    _avg?: Access_logsAvgAggregateInputType
    _sum?: Access_logsSumAggregateInputType
    _min?: Access_logsMinAggregateInputType
    _max?: Access_logsMaxAggregateInputType
  }

  export type Access_logsGroupByOutputType = {
    id: bigint
    ip: string
    method: string | null
    path: string | null
    status: number | null
    duration: number | null
    user_id: number | null
    user_agent: string | null
    created_at: bigint
    _count: Access_logsCountAggregateOutputType | null
    _avg: Access_logsAvgAggregateOutputType | null
    _sum: Access_logsSumAggregateOutputType | null
    _min: Access_logsMinAggregateOutputType | null
    _max: Access_logsMaxAggregateOutputType | null
  }

  type GetAccess_logsGroupByPayload<T extends access_logsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<Access_logsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof Access_logsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], Access_logsGroupByOutputType[P]>
            : GetScalarType<T[P], Access_logsGroupByOutputType[P]>
        }
      >
    >


  export type access_logsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    ip?: boolean
    method?: boolean
    path?: boolean
    status?: boolean
    duration?: boolean
    user_id?: boolean
    user_agent?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["access_logs"]>

  export type access_logsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    ip?: boolean
    method?: boolean
    path?: boolean
    status?: boolean
    duration?: boolean
    user_id?: boolean
    user_agent?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["access_logs"]>

  export type access_logsSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    ip?: boolean
    method?: boolean
    path?: boolean
    status?: boolean
    duration?: boolean
    user_id?: boolean
    user_agent?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["access_logs"]>

  export type access_logsSelectScalar = {
    id?: boolean
    ip?: boolean
    method?: boolean
    path?: boolean
    status?: boolean
    duration?: boolean
    user_id?: boolean
    user_agent?: boolean
    created_at?: boolean
  }

  export type access_logsOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "ip" | "method" | "path" | "status" | "duration" | "user_id" | "user_agent" | "created_at", ExtArgs["result"]["access_logs"]>

  export type $access_logsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "access_logs"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: bigint
      ip: string
      method: string | null
      path: string | null
      status: number | null
      duration: number | null
      user_id: number | null
      user_agent: string | null
      created_at: bigint
    }, ExtArgs["result"]["access_logs"]>
    composites: {}
  }

  type access_logsGetPayload<S extends boolean | null | undefined | access_logsDefaultArgs> = $Result.GetResult<Prisma.$access_logsPayload, S>

  type access_logsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<access_logsFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: Access_logsCountAggregateInputType | true
    }

  export interface access_logsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['access_logs'], meta: { name: 'access_logs' } }
    /**
     * Find zero or one Access_logs that matches the filter.
     * @param {access_logsFindUniqueArgs} args - Arguments to find a Access_logs
     * @example
     * // Get one Access_logs
     * const access_logs = await prisma.access_logs.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends access_logsFindUniqueArgs>(args: SelectSubset<T, access_logsFindUniqueArgs<ExtArgs>>): Prisma__access_logsClient<$Result.GetResult<Prisma.$access_logsPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Access_logs that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {access_logsFindUniqueOrThrowArgs} args - Arguments to find a Access_logs
     * @example
     * // Get one Access_logs
     * const access_logs = await prisma.access_logs.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends access_logsFindUniqueOrThrowArgs>(args: SelectSubset<T, access_logsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__access_logsClient<$Result.GetResult<Prisma.$access_logsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Access_logs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {access_logsFindFirstArgs} args - Arguments to find a Access_logs
     * @example
     * // Get one Access_logs
     * const access_logs = await prisma.access_logs.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends access_logsFindFirstArgs>(args?: SelectSubset<T, access_logsFindFirstArgs<ExtArgs>>): Prisma__access_logsClient<$Result.GetResult<Prisma.$access_logsPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Access_logs that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {access_logsFindFirstOrThrowArgs} args - Arguments to find a Access_logs
     * @example
     * // Get one Access_logs
     * const access_logs = await prisma.access_logs.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends access_logsFindFirstOrThrowArgs>(args?: SelectSubset<T, access_logsFindFirstOrThrowArgs<ExtArgs>>): Prisma__access_logsClient<$Result.GetResult<Prisma.$access_logsPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Access_logs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {access_logsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Access_logs
     * const access_logs = await prisma.access_logs.findMany()
     * 
     * // Get first 10 Access_logs
     * const access_logs = await prisma.access_logs.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const access_logsWithIdOnly = await prisma.access_logs.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends access_logsFindManyArgs>(args?: SelectSubset<T, access_logsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$access_logsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Access_logs.
     * @param {access_logsCreateArgs} args - Arguments to create a Access_logs.
     * @example
     * // Create one Access_logs
     * const Access_logs = await prisma.access_logs.create({
     *   data: {
     *     // ... data to create a Access_logs
     *   }
     * })
     * 
     */
    create<T extends access_logsCreateArgs>(args: SelectSubset<T, access_logsCreateArgs<ExtArgs>>): Prisma__access_logsClient<$Result.GetResult<Prisma.$access_logsPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Access_logs.
     * @param {access_logsCreateManyArgs} args - Arguments to create many Access_logs.
     * @example
     * // Create many Access_logs
     * const access_logs = await prisma.access_logs.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends access_logsCreateManyArgs>(args?: SelectSubset<T, access_logsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Access_logs and returns the data saved in the database.
     * @param {access_logsCreateManyAndReturnArgs} args - Arguments to create many Access_logs.
     * @example
     * // Create many Access_logs
     * const access_logs = await prisma.access_logs.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Access_logs and only return the `id`
     * const access_logsWithIdOnly = await prisma.access_logs.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends access_logsCreateManyAndReturnArgs>(args?: SelectSubset<T, access_logsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$access_logsPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Access_logs.
     * @param {access_logsDeleteArgs} args - Arguments to delete one Access_logs.
     * @example
     * // Delete one Access_logs
     * const Access_logs = await prisma.access_logs.delete({
     *   where: {
     *     // ... filter to delete one Access_logs
     *   }
     * })
     * 
     */
    delete<T extends access_logsDeleteArgs>(args: SelectSubset<T, access_logsDeleteArgs<ExtArgs>>): Prisma__access_logsClient<$Result.GetResult<Prisma.$access_logsPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Access_logs.
     * @param {access_logsUpdateArgs} args - Arguments to update one Access_logs.
     * @example
     * // Update one Access_logs
     * const access_logs = await prisma.access_logs.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends access_logsUpdateArgs>(args: SelectSubset<T, access_logsUpdateArgs<ExtArgs>>): Prisma__access_logsClient<$Result.GetResult<Prisma.$access_logsPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Access_logs.
     * @param {access_logsDeleteManyArgs} args - Arguments to filter Access_logs to delete.
     * @example
     * // Delete a few Access_logs
     * const { count } = await prisma.access_logs.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends access_logsDeleteManyArgs>(args?: SelectSubset<T, access_logsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Access_logs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {access_logsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Access_logs
     * const access_logs = await prisma.access_logs.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends access_logsUpdateManyArgs>(args: SelectSubset<T, access_logsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Access_logs and returns the data updated in the database.
     * @param {access_logsUpdateManyAndReturnArgs} args - Arguments to update many Access_logs.
     * @example
     * // Update many Access_logs
     * const access_logs = await prisma.access_logs.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Access_logs and only return the `id`
     * const access_logsWithIdOnly = await prisma.access_logs.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends access_logsUpdateManyAndReturnArgs>(args: SelectSubset<T, access_logsUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$access_logsPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Access_logs.
     * @param {access_logsUpsertArgs} args - Arguments to update or create a Access_logs.
     * @example
     * // Update or create a Access_logs
     * const access_logs = await prisma.access_logs.upsert({
     *   create: {
     *     // ... data to create a Access_logs
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Access_logs we want to update
     *   }
     * })
     */
    upsert<T extends access_logsUpsertArgs>(args: SelectSubset<T, access_logsUpsertArgs<ExtArgs>>): Prisma__access_logsClient<$Result.GetResult<Prisma.$access_logsPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Access_logs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {access_logsCountArgs} args - Arguments to filter Access_logs to count.
     * @example
     * // Count the number of Access_logs
     * const count = await prisma.access_logs.count({
     *   where: {
     *     // ... the filter for the Access_logs we want to count
     *   }
     * })
    **/
    count<T extends access_logsCountArgs>(
      args?: Subset<T, access_logsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], Access_logsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Access_logs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Access_logsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends Access_logsAggregateArgs>(args: Subset<T, Access_logsAggregateArgs>): Prisma.PrismaPromise<GetAccess_logsAggregateType<T>>

    /**
     * Group by Access_logs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {access_logsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends access_logsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: access_logsGroupByArgs['orderBy'] }
        : { orderBy?: access_logsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, access_logsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAccess_logsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the access_logs model
   */
  readonly fields: access_logsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for access_logs.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__access_logsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the access_logs model
   */
  interface access_logsFieldRefs {
    readonly id: FieldRef<"access_logs", 'BigInt'>
    readonly ip: FieldRef<"access_logs", 'String'>
    readonly method: FieldRef<"access_logs", 'String'>
    readonly path: FieldRef<"access_logs", 'String'>
    readonly status: FieldRef<"access_logs", 'Int'>
    readonly duration: FieldRef<"access_logs", 'Int'>
    readonly user_id: FieldRef<"access_logs", 'Int'>
    readonly user_agent: FieldRef<"access_logs", 'String'>
    readonly created_at: FieldRef<"access_logs", 'BigInt'>
  }
    

  // Custom InputTypes
  /**
   * access_logs findUnique
   */
  export type access_logsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the access_logs
     */
    select?: access_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the access_logs
     */
    omit?: access_logsOmit<ExtArgs> | null
    /**
     * Filter, which access_logs to fetch.
     */
    where: access_logsWhereUniqueInput
  }

  /**
   * access_logs findUniqueOrThrow
   */
  export type access_logsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the access_logs
     */
    select?: access_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the access_logs
     */
    omit?: access_logsOmit<ExtArgs> | null
    /**
     * Filter, which access_logs to fetch.
     */
    where: access_logsWhereUniqueInput
  }

  /**
   * access_logs findFirst
   */
  export type access_logsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the access_logs
     */
    select?: access_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the access_logs
     */
    omit?: access_logsOmit<ExtArgs> | null
    /**
     * Filter, which access_logs to fetch.
     */
    where?: access_logsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of access_logs to fetch.
     */
    orderBy?: access_logsOrderByWithRelationInput | access_logsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for access_logs.
     */
    cursor?: access_logsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` access_logs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` access_logs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of access_logs.
     */
    distinct?: Access_logsScalarFieldEnum | Access_logsScalarFieldEnum[]
  }

  /**
   * access_logs findFirstOrThrow
   */
  export type access_logsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the access_logs
     */
    select?: access_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the access_logs
     */
    omit?: access_logsOmit<ExtArgs> | null
    /**
     * Filter, which access_logs to fetch.
     */
    where?: access_logsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of access_logs to fetch.
     */
    orderBy?: access_logsOrderByWithRelationInput | access_logsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for access_logs.
     */
    cursor?: access_logsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` access_logs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` access_logs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of access_logs.
     */
    distinct?: Access_logsScalarFieldEnum | Access_logsScalarFieldEnum[]
  }

  /**
   * access_logs findMany
   */
  export type access_logsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the access_logs
     */
    select?: access_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the access_logs
     */
    omit?: access_logsOmit<ExtArgs> | null
    /**
     * Filter, which access_logs to fetch.
     */
    where?: access_logsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of access_logs to fetch.
     */
    orderBy?: access_logsOrderByWithRelationInput | access_logsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing access_logs.
     */
    cursor?: access_logsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` access_logs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` access_logs.
     */
    skip?: number
    distinct?: Access_logsScalarFieldEnum | Access_logsScalarFieldEnum[]
  }

  /**
   * access_logs create
   */
  export type access_logsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the access_logs
     */
    select?: access_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the access_logs
     */
    omit?: access_logsOmit<ExtArgs> | null
    /**
     * The data needed to create a access_logs.
     */
    data: XOR<access_logsCreateInput, access_logsUncheckedCreateInput>
  }

  /**
   * access_logs createMany
   */
  export type access_logsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many access_logs.
     */
    data: access_logsCreateManyInput | access_logsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * access_logs createManyAndReturn
   */
  export type access_logsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the access_logs
     */
    select?: access_logsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the access_logs
     */
    omit?: access_logsOmit<ExtArgs> | null
    /**
     * The data used to create many access_logs.
     */
    data: access_logsCreateManyInput | access_logsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * access_logs update
   */
  export type access_logsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the access_logs
     */
    select?: access_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the access_logs
     */
    omit?: access_logsOmit<ExtArgs> | null
    /**
     * The data needed to update a access_logs.
     */
    data: XOR<access_logsUpdateInput, access_logsUncheckedUpdateInput>
    /**
     * Choose, which access_logs to update.
     */
    where: access_logsWhereUniqueInput
  }

  /**
   * access_logs updateMany
   */
  export type access_logsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update access_logs.
     */
    data: XOR<access_logsUpdateManyMutationInput, access_logsUncheckedUpdateManyInput>
    /**
     * Filter which access_logs to update
     */
    where?: access_logsWhereInput
    /**
     * Limit how many access_logs to update.
     */
    limit?: number
  }

  /**
   * access_logs updateManyAndReturn
   */
  export type access_logsUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the access_logs
     */
    select?: access_logsSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the access_logs
     */
    omit?: access_logsOmit<ExtArgs> | null
    /**
     * The data used to update access_logs.
     */
    data: XOR<access_logsUpdateManyMutationInput, access_logsUncheckedUpdateManyInput>
    /**
     * Filter which access_logs to update
     */
    where?: access_logsWhereInput
    /**
     * Limit how many access_logs to update.
     */
    limit?: number
  }

  /**
   * access_logs upsert
   */
  export type access_logsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the access_logs
     */
    select?: access_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the access_logs
     */
    omit?: access_logsOmit<ExtArgs> | null
    /**
     * The filter to search for the access_logs to update in case it exists.
     */
    where: access_logsWhereUniqueInput
    /**
     * In case the access_logs found by the `where` argument doesn't exist, create a new access_logs with this data.
     */
    create: XOR<access_logsCreateInput, access_logsUncheckedCreateInput>
    /**
     * In case the access_logs was found with the provided `where` argument, update it with this data.
     */
    update: XOR<access_logsUpdateInput, access_logsUncheckedUpdateInput>
  }

  /**
   * access_logs delete
   */
  export type access_logsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the access_logs
     */
    select?: access_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the access_logs
     */
    omit?: access_logsOmit<ExtArgs> | null
    /**
     * Filter which access_logs to delete.
     */
    where: access_logsWhereUniqueInput
  }

  /**
   * access_logs deleteMany
   */
  export type access_logsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which access_logs to delete
     */
    where?: access_logsWhereInput
    /**
     * Limit how many access_logs to delete.
     */
    limit?: number
  }

  /**
   * access_logs without action
   */
  export type access_logsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the access_logs
     */
    select?: access_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the access_logs
     */
    omit?: access_logsOmit<ExtArgs> | null
  }


  /**
   * Model automation_rules
   */

  export type AggregateAutomation_rules = {
    _count: Automation_rulesCountAggregateOutputType | null
    _avg: Automation_rulesAvgAggregateOutputType | null
    _sum: Automation_rulesSumAggregateOutputType | null
    _min: Automation_rulesMinAggregateOutputType | null
    _max: Automation_rulesMaxAggregateOutputType | null
  }

  export type Automation_rulesAvgAggregateOutputType = {
    is_active: number | null
    execution_count: number | null
  }

  export type Automation_rulesSumAggregateOutputType = {
    is_active: number | null
    execution_count: number | null
  }

  export type Automation_rulesMinAggregateOutputType = {
    id: string | null
    name: string | null
    description: string | null
    is_active: number | null
    graph_data: string | null
    trigger_type: string | null
    created_at: string | null
    updated_at: string | null
    last_triggered_at: string | null
    execution_count: number | null
  }

  export type Automation_rulesMaxAggregateOutputType = {
    id: string | null
    name: string | null
    description: string | null
    is_active: number | null
    graph_data: string | null
    trigger_type: string | null
    created_at: string | null
    updated_at: string | null
    last_triggered_at: string | null
    execution_count: number | null
  }

  export type Automation_rulesCountAggregateOutputType = {
    id: number
    name: number
    description: number
    is_active: number
    graph_data: number
    trigger_type: number
    created_at: number
    updated_at: number
    last_triggered_at: number
    execution_count: number
    _all: number
  }


  export type Automation_rulesAvgAggregateInputType = {
    is_active?: true
    execution_count?: true
  }

  export type Automation_rulesSumAggregateInputType = {
    is_active?: true
    execution_count?: true
  }

  export type Automation_rulesMinAggregateInputType = {
    id?: true
    name?: true
    description?: true
    is_active?: true
    graph_data?: true
    trigger_type?: true
    created_at?: true
    updated_at?: true
    last_triggered_at?: true
    execution_count?: true
  }

  export type Automation_rulesMaxAggregateInputType = {
    id?: true
    name?: true
    description?: true
    is_active?: true
    graph_data?: true
    trigger_type?: true
    created_at?: true
    updated_at?: true
    last_triggered_at?: true
    execution_count?: true
  }

  export type Automation_rulesCountAggregateInputType = {
    id?: true
    name?: true
    description?: true
    is_active?: true
    graph_data?: true
    trigger_type?: true
    created_at?: true
    updated_at?: true
    last_triggered_at?: true
    execution_count?: true
    _all?: true
  }

  export type Automation_rulesAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which automation_rules to aggregate.
     */
    where?: automation_rulesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of automation_rules to fetch.
     */
    orderBy?: automation_rulesOrderByWithRelationInput | automation_rulesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: automation_rulesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` automation_rules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` automation_rules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned automation_rules
    **/
    _count?: true | Automation_rulesCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: Automation_rulesAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: Automation_rulesSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: Automation_rulesMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: Automation_rulesMaxAggregateInputType
  }

  export type GetAutomation_rulesAggregateType<T extends Automation_rulesAggregateArgs> = {
        [P in keyof T & keyof AggregateAutomation_rules]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAutomation_rules[P]>
      : GetScalarType<T[P], AggregateAutomation_rules[P]>
  }




  export type automation_rulesGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: automation_rulesWhereInput
    orderBy?: automation_rulesOrderByWithAggregationInput | automation_rulesOrderByWithAggregationInput[]
    by: Automation_rulesScalarFieldEnum[] | Automation_rulesScalarFieldEnum
    having?: automation_rulesScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: Automation_rulesCountAggregateInputType | true
    _avg?: Automation_rulesAvgAggregateInputType
    _sum?: Automation_rulesSumAggregateInputType
    _min?: Automation_rulesMinAggregateInputType
    _max?: Automation_rulesMaxAggregateInputType
  }

  export type Automation_rulesGroupByOutputType = {
    id: string
    name: string
    description: string | null
    is_active: number | null
    graph_data: string
    trigger_type: string | null
    created_at: string
    updated_at: string
    last_triggered_at: string | null
    execution_count: number | null
    _count: Automation_rulesCountAggregateOutputType | null
    _avg: Automation_rulesAvgAggregateOutputType | null
    _sum: Automation_rulesSumAggregateOutputType | null
    _min: Automation_rulesMinAggregateOutputType | null
    _max: Automation_rulesMaxAggregateOutputType | null
  }

  type GetAutomation_rulesGroupByPayload<T extends automation_rulesGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<Automation_rulesGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof Automation_rulesGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], Automation_rulesGroupByOutputType[P]>
            : GetScalarType<T[P], Automation_rulesGroupByOutputType[P]>
        }
      >
    >


  export type automation_rulesSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    is_active?: boolean
    graph_data?: boolean
    trigger_type?: boolean
    created_at?: boolean
    updated_at?: boolean
    last_triggered_at?: boolean
    execution_count?: boolean
  }, ExtArgs["result"]["automation_rules"]>

  export type automation_rulesSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    is_active?: boolean
    graph_data?: boolean
    trigger_type?: boolean
    created_at?: boolean
    updated_at?: boolean
    last_triggered_at?: boolean
    execution_count?: boolean
  }, ExtArgs["result"]["automation_rules"]>

  export type automation_rulesSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    description?: boolean
    is_active?: boolean
    graph_data?: boolean
    trigger_type?: boolean
    created_at?: boolean
    updated_at?: boolean
    last_triggered_at?: boolean
    execution_count?: boolean
  }, ExtArgs["result"]["automation_rules"]>

  export type automation_rulesSelectScalar = {
    id?: boolean
    name?: boolean
    description?: boolean
    is_active?: boolean
    graph_data?: boolean
    trigger_type?: boolean
    created_at?: boolean
    updated_at?: boolean
    last_triggered_at?: boolean
    execution_count?: boolean
  }

  export type automation_rulesOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "description" | "is_active" | "graph_data" | "trigger_type" | "created_at" | "updated_at" | "last_triggered_at" | "execution_count", ExtArgs["result"]["automation_rules"]>

  export type $automation_rulesPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "automation_rules"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      name: string
      description: string | null
      is_active: number | null
      graph_data: string
      trigger_type: string | null
      created_at: string
      updated_at: string
      last_triggered_at: string | null
      execution_count: number | null
    }, ExtArgs["result"]["automation_rules"]>
    composites: {}
  }

  type automation_rulesGetPayload<S extends boolean | null | undefined | automation_rulesDefaultArgs> = $Result.GetResult<Prisma.$automation_rulesPayload, S>

  type automation_rulesCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<automation_rulesFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: Automation_rulesCountAggregateInputType | true
    }

  export interface automation_rulesDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['automation_rules'], meta: { name: 'automation_rules' } }
    /**
     * Find zero or one Automation_rules that matches the filter.
     * @param {automation_rulesFindUniqueArgs} args - Arguments to find a Automation_rules
     * @example
     * // Get one Automation_rules
     * const automation_rules = await prisma.automation_rules.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends automation_rulesFindUniqueArgs>(args: SelectSubset<T, automation_rulesFindUniqueArgs<ExtArgs>>): Prisma__automation_rulesClient<$Result.GetResult<Prisma.$automation_rulesPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Automation_rules that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {automation_rulesFindUniqueOrThrowArgs} args - Arguments to find a Automation_rules
     * @example
     * // Get one Automation_rules
     * const automation_rules = await prisma.automation_rules.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends automation_rulesFindUniqueOrThrowArgs>(args: SelectSubset<T, automation_rulesFindUniqueOrThrowArgs<ExtArgs>>): Prisma__automation_rulesClient<$Result.GetResult<Prisma.$automation_rulesPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Automation_rules that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {automation_rulesFindFirstArgs} args - Arguments to find a Automation_rules
     * @example
     * // Get one Automation_rules
     * const automation_rules = await prisma.automation_rules.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends automation_rulesFindFirstArgs>(args?: SelectSubset<T, automation_rulesFindFirstArgs<ExtArgs>>): Prisma__automation_rulesClient<$Result.GetResult<Prisma.$automation_rulesPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Automation_rules that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {automation_rulesFindFirstOrThrowArgs} args - Arguments to find a Automation_rules
     * @example
     * // Get one Automation_rules
     * const automation_rules = await prisma.automation_rules.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends automation_rulesFindFirstOrThrowArgs>(args?: SelectSubset<T, automation_rulesFindFirstOrThrowArgs<ExtArgs>>): Prisma__automation_rulesClient<$Result.GetResult<Prisma.$automation_rulesPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Automation_rules that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {automation_rulesFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Automation_rules
     * const automation_rules = await prisma.automation_rules.findMany()
     * 
     * // Get first 10 Automation_rules
     * const automation_rules = await prisma.automation_rules.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const automation_rulesWithIdOnly = await prisma.automation_rules.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends automation_rulesFindManyArgs>(args?: SelectSubset<T, automation_rulesFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$automation_rulesPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Automation_rules.
     * @param {automation_rulesCreateArgs} args - Arguments to create a Automation_rules.
     * @example
     * // Create one Automation_rules
     * const Automation_rules = await prisma.automation_rules.create({
     *   data: {
     *     // ... data to create a Automation_rules
     *   }
     * })
     * 
     */
    create<T extends automation_rulesCreateArgs>(args: SelectSubset<T, automation_rulesCreateArgs<ExtArgs>>): Prisma__automation_rulesClient<$Result.GetResult<Prisma.$automation_rulesPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Automation_rules.
     * @param {automation_rulesCreateManyArgs} args - Arguments to create many Automation_rules.
     * @example
     * // Create many Automation_rules
     * const automation_rules = await prisma.automation_rules.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends automation_rulesCreateManyArgs>(args?: SelectSubset<T, automation_rulesCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Automation_rules and returns the data saved in the database.
     * @param {automation_rulesCreateManyAndReturnArgs} args - Arguments to create many Automation_rules.
     * @example
     * // Create many Automation_rules
     * const automation_rules = await prisma.automation_rules.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Automation_rules and only return the `id`
     * const automation_rulesWithIdOnly = await prisma.automation_rules.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends automation_rulesCreateManyAndReturnArgs>(args?: SelectSubset<T, automation_rulesCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$automation_rulesPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Automation_rules.
     * @param {automation_rulesDeleteArgs} args - Arguments to delete one Automation_rules.
     * @example
     * // Delete one Automation_rules
     * const Automation_rules = await prisma.automation_rules.delete({
     *   where: {
     *     // ... filter to delete one Automation_rules
     *   }
     * })
     * 
     */
    delete<T extends automation_rulesDeleteArgs>(args: SelectSubset<T, automation_rulesDeleteArgs<ExtArgs>>): Prisma__automation_rulesClient<$Result.GetResult<Prisma.$automation_rulesPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Automation_rules.
     * @param {automation_rulesUpdateArgs} args - Arguments to update one Automation_rules.
     * @example
     * // Update one Automation_rules
     * const automation_rules = await prisma.automation_rules.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends automation_rulesUpdateArgs>(args: SelectSubset<T, automation_rulesUpdateArgs<ExtArgs>>): Prisma__automation_rulesClient<$Result.GetResult<Prisma.$automation_rulesPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Automation_rules.
     * @param {automation_rulesDeleteManyArgs} args - Arguments to filter Automation_rules to delete.
     * @example
     * // Delete a few Automation_rules
     * const { count } = await prisma.automation_rules.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends automation_rulesDeleteManyArgs>(args?: SelectSubset<T, automation_rulesDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Automation_rules.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {automation_rulesUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Automation_rules
     * const automation_rules = await prisma.automation_rules.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends automation_rulesUpdateManyArgs>(args: SelectSubset<T, automation_rulesUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Automation_rules and returns the data updated in the database.
     * @param {automation_rulesUpdateManyAndReturnArgs} args - Arguments to update many Automation_rules.
     * @example
     * // Update many Automation_rules
     * const automation_rules = await prisma.automation_rules.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Automation_rules and only return the `id`
     * const automation_rulesWithIdOnly = await prisma.automation_rules.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends automation_rulesUpdateManyAndReturnArgs>(args: SelectSubset<T, automation_rulesUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$automation_rulesPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Automation_rules.
     * @param {automation_rulesUpsertArgs} args - Arguments to update or create a Automation_rules.
     * @example
     * // Update or create a Automation_rules
     * const automation_rules = await prisma.automation_rules.upsert({
     *   create: {
     *     // ... data to create a Automation_rules
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Automation_rules we want to update
     *   }
     * })
     */
    upsert<T extends automation_rulesUpsertArgs>(args: SelectSubset<T, automation_rulesUpsertArgs<ExtArgs>>): Prisma__automation_rulesClient<$Result.GetResult<Prisma.$automation_rulesPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Automation_rules.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {automation_rulesCountArgs} args - Arguments to filter Automation_rules to count.
     * @example
     * // Count the number of Automation_rules
     * const count = await prisma.automation_rules.count({
     *   where: {
     *     // ... the filter for the Automation_rules we want to count
     *   }
     * })
    **/
    count<T extends automation_rulesCountArgs>(
      args?: Subset<T, automation_rulesCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], Automation_rulesCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Automation_rules.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Automation_rulesAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends Automation_rulesAggregateArgs>(args: Subset<T, Automation_rulesAggregateArgs>): Prisma.PrismaPromise<GetAutomation_rulesAggregateType<T>>

    /**
     * Group by Automation_rules.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {automation_rulesGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends automation_rulesGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: automation_rulesGroupByArgs['orderBy'] }
        : { orderBy?: automation_rulesGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, automation_rulesGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAutomation_rulesGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the automation_rules model
   */
  readonly fields: automation_rulesFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for automation_rules.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__automation_rulesClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the automation_rules model
   */
  interface automation_rulesFieldRefs {
    readonly id: FieldRef<"automation_rules", 'String'>
    readonly name: FieldRef<"automation_rules", 'String'>
    readonly description: FieldRef<"automation_rules", 'String'>
    readonly is_active: FieldRef<"automation_rules", 'Int'>
    readonly graph_data: FieldRef<"automation_rules", 'String'>
    readonly trigger_type: FieldRef<"automation_rules", 'String'>
    readonly created_at: FieldRef<"automation_rules", 'String'>
    readonly updated_at: FieldRef<"automation_rules", 'String'>
    readonly last_triggered_at: FieldRef<"automation_rules", 'String'>
    readonly execution_count: FieldRef<"automation_rules", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * automation_rules findUnique
   */
  export type automation_rulesFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the automation_rules
     */
    select?: automation_rulesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the automation_rules
     */
    omit?: automation_rulesOmit<ExtArgs> | null
    /**
     * Filter, which automation_rules to fetch.
     */
    where: automation_rulesWhereUniqueInput
  }

  /**
   * automation_rules findUniqueOrThrow
   */
  export type automation_rulesFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the automation_rules
     */
    select?: automation_rulesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the automation_rules
     */
    omit?: automation_rulesOmit<ExtArgs> | null
    /**
     * Filter, which automation_rules to fetch.
     */
    where: automation_rulesWhereUniqueInput
  }

  /**
   * automation_rules findFirst
   */
  export type automation_rulesFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the automation_rules
     */
    select?: automation_rulesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the automation_rules
     */
    omit?: automation_rulesOmit<ExtArgs> | null
    /**
     * Filter, which automation_rules to fetch.
     */
    where?: automation_rulesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of automation_rules to fetch.
     */
    orderBy?: automation_rulesOrderByWithRelationInput | automation_rulesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for automation_rules.
     */
    cursor?: automation_rulesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` automation_rules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` automation_rules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of automation_rules.
     */
    distinct?: Automation_rulesScalarFieldEnum | Automation_rulesScalarFieldEnum[]
  }

  /**
   * automation_rules findFirstOrThrow
   */
  export type automation_rulesFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the automation_rules
     */
    select?: automation_rulesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the automation_rules
     */
    omit?: automation_rulesOmit<ExtArgs> | null
    /**
     * Filter, which automation_rules to fetch.
     */
    where?: automation_rulesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of automation_rules to fetch.
     */
    orderBy?: automation_rulesOrderByWithRelationInput | automation_rulesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for automation_rules.
     */
    cursor?: automation_rulesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` automation_rules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` automation_rules.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of automation_rules.
     */
    distinct?: Automation_rulesScalarFieldEnum | Automation_rulesScalarFieldEnum[]
  }

  /**
   * automation_rules findMany
   */
  export type automation_rulesFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the automation_rules
     */
    select?: automation_rulesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the automation_rules
     */
    omit?: automation_rulesOmit<ExtArgs> | null
    /**
     * Filter, which automation_rules to fetch.
     */
    where?: automation_rulesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of automation_rules to fetch.
     */
    orderBy?: automation_rulesOrderByWithRelationInput | automation_rulesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing automation_rules.
     */
    cursor?: automation_rulesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` automation_rules from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` automation_rules.
     */
    skip?: number
    distinct?: Automation_rulesScalarFieldEnum | Automation_rulesScalarFieldEnum[]
  }

  /**
   * automation_rules create
   */
  export type automation_rulesCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the automation_rules
     */
    select?: automation_rulesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the automation_rules
     */
    omit?: automation_rulesOmit<ExtArgs> | null
    /**
     * The data needed to create a automation_rules.
     */
    data: XOR<automation_rulesCreateInput, automation_rulesUncheckedCreateInput>
  }

  /**
   * automation_rules createMany
   */
  export type automation_rulesCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many automation_rules.
     */
    data: automation_rulesCreateManyInput | automation_rulesCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * automation_rules createManyAndReturn
   */
  export type automation_rulesCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the automation_rules
     */
    select?: automation_rulesSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the automation_rules
     */
    omit?: automation_rulesOmit<ExtArgs> | null
    /**
     * The data used to create many automation_rules.
     */
    data: automation_rulesCreateManyInput | automation_rulesCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * automation_rules update
   */
  export type automation_rulesUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the automation_rules
     */
    select?: automation_rulesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the automation_rules
     */
    omit?: automation_rulesOmit<ExtArgs> | null
    /**
     * The data needed to update a automation_rules.
     */
    data: XOR<automation_rulesUpdateInput, automation_rulesUncheckedUpdateInput>
    /**
     * Choose, which automation_rules to update.
     */
    where: automation_rulesWhereUniqueInput
  }

  /**
   * automation_rules updateMany
   */
  export type automation_rulesUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update automation_rules.
     */
    data: XOR<automation_rulesUpdateManyMutationInput, automation_rulesUncheckedUpdateManyInput>
    /**
     * Filter which automation_rules to update
     */
    where?: automation_rulesWhereInput
    /**
     * Limit how many automation_rules to update.
     */
    limit?: number
  }

  /**
   * automation_rules updateManyAndReturn
   */
  export type automation_rulesUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the automation_rules
     */
    select?: automation_rulesSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the automation_rules
     */
    omit?: automation_rulesOmit<ExtArgs> | null
    /**
     * The data used to update automation_rules.
     */
    data: XOR<automation_rulesUpdateManyMutationInput, automation_rulesUncheckedUpdateManyInput>
    /**
     * Filter which automation_rules to update
     */
    where?: automation_rulesWhereInput
    /**
     * Limit how many automation_rules to update.
     */
    limit?: number
  }

  /**
   * automation_rules upsert
   */
  export type automation_rulesUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the automation_rules
     */
    select?: automation_rulesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the automation_rules
     */
    omit?: automation_rulesOmit<ExtArgs> | null
    /**
     * The filter to search for the automation_rules to update in case it exists.
     */
    where: automation_rulesWhereUniqueInput
    /**
     * In case the automation_rules found by the `where` argument doesn't exist, create a new automation_rules with this data.
     */
    create: XOR<automation_rulesCreateInput, automation_rulesUncheckedCreateInput>
    /**
     * In case the automation_rules was found with the provided `where` argument, update it with this data.
     */
    update: XOR<automation_rulesUpdateInput, automation_rulesUncheckedUpdateInput>
  }

  /**
   * automation_rules delete
   */
  export type automation_rulesDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the automation_rules
     */
    select?: automation_rulesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the automation_rules
     */
    omit?: automation_rulesOmit<ExtArgs> | null
    /**
     * Filter which automation_rules to delete.
     */
    where: automation_rulesWhereUniqueInput
  }

  /**
   * automation_rules deleteMany
   */
  export type automation_rulesDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which automation_rules to delete
     */
    where?: automation_rulesWhereInput
    /**
     * Limit how many automation_rules to delete.
     */
    limit?: number
  }

  /**
   * automation_rules without action
   */
  export type automation_rulesDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the automation_rules
     */
    select?: automation_rulesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the automation_rules
     */
    omit?: automation_rulesOmit<ExtArgs> | null
  }


  /**
   * Model banned_ips
   */

  export type AggregateBanned_ips = {
    _count: Banned_ipsCountAggregateOutputType | null
    _avg: Banned_ipsAvgAggregateOutputType | null
    _sum: Banned_ipsSumAggregateOutputType | null
    _min: Banned_ipsMinAggregateOutputType | null
    _max: Banned_ipsMaxAggregateOutputType | null
  }

  export type Banned_ipsAvgAggregateOutputType = {
    id: number | null
    expires_at: number | null
    created_at: number | null
  }

  export type Banned_ipsSumAggregateOutputType = {
    id: bigint | null
    expires_at: bigint | null
    created_at: bigint | null
  }

  export type Banned_ipsMinAggregateOutputType = {
    id: bigint | null
    ip: string | null
    reason: string | null
    banned_by: string | null
    expires_at: bigint | null
    created_at: bigint | null
  }

  export type Banned_ipsMaxAggregateOutputType = {
    id: bigint | null
    ip: string | null
    reason: string | null
    banned_by: string | null
    expires_at: bigint | null
    created_at: bigint | null
  }

  export type Banned_ipsCountAggregateOutputType = {
    id: number
    ip: number
    reason: number
    banned_by: number
    expires_at: number
    created_at: number
    _all: number
  }


  export type Banned_ipsAvgAggregateInputType = {
    id?: true
    expires_at?: true
    created_at?: true
  }

  export type Banned_ipsSumAggregateInputType = {
    id?: true
    expires_at?: true
    created_at?: true
  }

  export type Banned_ipsMinAggregateInputType = {
    id?: true
    ip?: true
    reason?: true
    banned_by?: true
    expires_at?: true
    created_at?: true
  }

  export type Banned_ipsMaxAggregateInputType = {
    id?: true
    ip?: true
    reason?: true
    banned_by?: true
    expires_at?: true
    created_at?: true
  }

  export type Banned_ipsCountAggregateInputType = {
    id?: true
    ip?: true
    reason?: true
    banned_by?: true
    expires_at?: true
    created_at?: true
    _all?: true
  }

  export type Banned_ipsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which banned_ips to aggregate.
     */
    where?: banned_ipsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of banned_ips to fetch.
     */
    orderBy?: banned_ipsOrderByWithRelationInput | banned_ipsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: banned_ipsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` banned_ips from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` banned_ips.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned banned_ips
    **/
    _count?: true | Banned_ipsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: Banned_ipsAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: Banned_ipsSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: Banned_ipsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: Banned_ipsMaxAggregateInputType
  }

  export type GetBanned_ipsAggregateType<T extends Banned_ipsAggregateArgs> = {
        [P in keyof T & keyof AggregateBanned_ips]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateBanned_ips[P]>
      : GetScalarType<T[P], AggregateBanned_ips[P]>
  }




  export type banned_ipsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: banned_ipsWhereInput
    orderBy?: banned_ipsOrderByWithAggregationInput | banned_ipsOrderByWithAggregationInput[]
    by: Banned_ipsScalarFieldEnum[] | Banned_ipsScalarFieldEnum
    having?: banned_ipsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: Banned_ipsCountAggregateInputType | true
    _avg?: Banned_ipsAvgAggregateInputType
    _sum?: Banned_ipsSumAggregateInputType
    _min?: Banned_ipsMinAggregateInputType
    _max?: Banned_ipsMaxAggregateInputType
  }

  export type Banned_ipsGroupByOutputType = {
    id: bigint
    ip: string
    reason: string | null
    banned_by: string | null
    expires_at: bigint | null
    created_at: bigint
    _count: Banned_ipsCountAggregateOutputType | null
    _avg: Banned_ipsAvgAggregateOutputType | null
    _sum: Banned_ipsSumAggregateOutputType | null
    _min: Banned_ipsMinAggregateOutputType | null
    _max: Banned_ipsMaxAggregateOutputType | null
  }

  type GetBanned_ipsGroupByPayload<T extends banned_ipsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<Banned_ipsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof Banned_ipsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], Banned_ipsGroupByOutputType[P]>
            : GetScalarType<T[P], Banned_ipsGroupByOutputType[P]>
        }
      >
    >


  export type banned_ipsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    ip?: boolean
    reason?: boolean
    banned_by?: boolean
    expires_at?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["banned_ips"]>

  export type banned_ipsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    ip?: boolean
    reason?: boolean
    banned_by?: boolean
    expires_at?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["banned_ips"]>

  export type banned_ipsSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    ip?: boolean
    reason?: boolean
    banned_by?: boolean
    expires_at?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["banned_ips"]>

  export type banned_ipsSelectScalar = {
    id?: boolean
    ip?: boolean
    reason?: boolean
    banned_by?: boolean
    expires_at?: boolean
    created_at?: boolean
  }

  export type banned_ipsOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "ip" | "reason" | "banned_by" | "expires_at" | "created_at", ExtArgs["result"]["banned_ips"]>

  export type $banned_ipsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "banned_ips"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: bigint
      ip: string
      reason: string | null
      banned_by: string | null
      expires_at: bigint | null
      created_at: bigint
    }, ExtArgs["result"]["banned_ips"]>
    composites: {}
  }

  type banned_ipsGetPayload<S extends boolean | null | undefined | banned_ipsDefaultArgs> = $Result.GetResult<Prisma.$banned_ipsPayload, S>

  type banned_ipsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<banned_ipsFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: Banned_ipsCountAggregateInputType | true
    }

  export interface banned_ipsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['banned_ips'], meta: { name: 'banned_ips' } }
    /**
     * Find zero or one Banned_ips that matches the filter.
     * @param {banned_ipsFindUniqueArgs} args - Arguments to find a Banned_ips
     * @example
     * // Get one Banned_ips
     * const banned_ips = await prisma.banned_ips.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends banned_ipsFindUniqueArgs>(args: SelectSubset<T, banned_ipsFindUniqueArgs<ExtArgs>>): Prisma__banned_ipsClient<$Result.GetResult<Prisma.$banned_ipsPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Banned_ips that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {banned_ipsFindUniqueOrThrowArgs} args - Arguments to find a Banned_ips
     * @example
     * // Get one Banned_ips
     * const banned_ips = await prisma.banned_ips.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends banned_ipsFindUniqueOrThrowArgs>(args: SelectSubset<T, banned_ipsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__banned_ipsClient<$Result.GetResult<Prisma.$banned_ipsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Banned_ips that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {banned_ipsFindFirstArgs} args - Arguments to find a Banned_ips
     * @example
     * // Get one Banned_ips
     * const banned_ips = await prisma.banned_ips.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends banned_ipsFindFirstArgs>(args?: SelectSubset<T, banned_ipsFindFirstArgs<ExtArgs>>): Prisma__banned_ipsClient<$Result.GetResult<Prisma.$banned_ipsPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Banned_ips that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {banned_ipsFindFirstOrThrowArgs} args - Arguments to find a Banned_ips
     * @example
     * // Get one Banned_ips
     * const banned_ips = await prisma.banned_ips.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends banned_ipsFindFirstOrThrowArgs>(args?: SelectSubset<T, banned_ipsFindFirstOrThrowArgs<ExtArgs>>): Prisma__banned_ipsClient<$Result.GetResult<Prisma.$banned_ipsPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Banned_ips that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {banned_ipsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Banned_ips
     * const banned_ips = await prisma.banned_ips.findMany()
     * 
     * // Get first 10 Banned_ips
     * const banned_ips = await prisma.banned_ips.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const banned_ipsWithIdOnly = await prisma.banned_ips.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends banned_ipsFindManyArgs>(args?: SelectSubset<T, banned_ipsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$banned_ipsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Banned_ips.
     * @param {banned_ipsCreateArgs} args - Arguments to create a Banned_ips.
     * @example
     * // Create one Banned_ips
     * const Banned_ips = await prisma.banned_ips.create({
     *   data: {
     *     // ... data to create a Banned_ips
     *   }
     * })
     * 
     */
    create<T extends banned_ipsCreateArgs>(args: SelectSubset<T, banned_ipsCreateArgs<ExtArgs>>): Prisma__banned_ipsClient<$Result.GetResult<Prisma.$banned_ipsPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Banned_ips.
     * @param {banned_ipsCreateManyArgs} args - Arguments to create many Banned_ips.
     * @example
     * // Create many Banned_ips
     * const banned_ips = await prisma.banned_ips.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends banned_ipsCreateManyArgs>(args?: SelectSubset<T, banned_ipsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Banned_ips and returns the data saved in the database.
     * @param {banned_ipsCreateManyAndReturnArgs} args - Arguments to create many Banned_ips.
     * @example
     * // Create many Banned_ips
     * const banned_ips = await prisma.banned_ips.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Banned_ips and only return the `id`
     * const banned_ipsWithIdOnly = await prisma.banned_ips.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends banned_ipsCreateManyAndReturnArgs>(args?: SelectSubset<T, banned_ipsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$banned_ipsPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Banned_ips.
     * @param {banned_ipsDeleteArgs} args - Arguments to delete one Banned_ips.
     * @example
     * // Delete one Banned_ips
     * const Banned_ips = await prisma.banned_ips.delete({
     *   where: {
     *     // ... filter to delete one Banned_ips
     *   }
     * })
     * 
     */
    delete<T extends banned_ipsDeleteArgs>(args: SelectSubset<T, banned_ipsDeleteArgs<ExtArgs>>): Prisma__banned_ipsClient<$Result.GetResult<Prisma.$banned_ipsPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Banned_ips.
     * @param {banned_ipsUpdateArgs} args - Arguments to update one Banned_ips.
     * @example
     * // Update one Banned_ips
     * const banned_ips = await prisma.banned_ips.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends banned_ipsUpdateArgs>(args: SelectSubset<T, banned_ipsUpdateArgs<ExtArgs>>): Prisma__banned_ipsClient<$Result.GetResult<Prisma.$banned_ipsPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Banned_ips.
     * @param {banned_ipsDeleteManyArgs} args - Arguments to filter Banned_ips to delete.
     * @example
     * // Delete a few Banned_ips
     * const { count } = await prisma.banned_ips.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends banned_ipsDeleteManyArgs>(args?: SelectSubset<T, banned_ipsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Banned_ips.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {banned_ipsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Banned_ips
     * const banned_ips = await prisma.banned_ips.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends banned_ipsUpdateManyArgs>(args: SelectSubset<T, banned_ipsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Banned_ips and returns the data updated in the database.
     * @param {banned_ipsUpdateManyAndReturnArgs} args - Arguments to update many Banned_ips.
     * @example
     * // Update many Banned_ips
     * const banned_ips = await prisma.banned_ips.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Banned_ips and only return the `id`
     * const banned_ipsWithIdOnly = await prisma.banned_ips.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends banned_ipsUpdateManyAndReturnArgs>(args: SelectSubset<T, banned_ipsUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$banned_ipsPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Banned_ips.
     * @param {banned_ipsUpsertArgs} args - Arguments to update or create a Banned_ips.
     * @example
     * // Update or create a Banned_ips
     * const banned_ips = await prisma.banned_ips.upsert({
     *   create: {
     *     // ... data to create a Banned_ips
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Banned_ips we want to update
     *   }
     * })
     */
    upsert<T extends banned_ipsUpsertArgs>(args: SelectSubset<T, banned_ipsUpsertArgs<ExtArgs>>): Prisma__banned_ipsClient<$Result.GetResult<Prisma.$banned_ipsPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Banned_ips.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {banned_ipsCountArgs} args - Arguments to filter Banned_ips to count.
     * @example
     * // Count the number of Banned_ips
     * const count = await prisma.banned_ips.count({
     *   where: {
     *     // ... the filter for the Banned_ips we want to count
     *   }
     * })
    **/
    count<T extends banned_ipsCountArgs>(
      args?: Subset<T, banned_ipsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], Banned_ipsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Banned_ips.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Banned_ipsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends Banned_ipsAggregateArgs>(args: Subset<T, Banned_ipsAggregateArgs>): Prisma.PrismaPromise<GetBanned_ipsAggregateType<T>>

    /**
     * Group by Banned_ips.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {banned_ipsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends banned_ipsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: banned_ipsGroupByArgs['orderBy'] }
        : { orderBy?: banned_ipsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, banned_ipsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetBanned_ipsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the banned_ips model
   */
  readonly fields: banned_ipsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for banned_ips.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__banned_ipsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the banned_ips model
   */
  interface banned_ipsFieldRefs {
    readonly id: FieldRef<"banned_ips", 'BigInt'>
    readonly ip: FieldRef<"banned_ips", 'String'>
    readonly reason: FieldRef<"banned_ips", 'String'>
    readonly banned_by: FieldRef<"banned_ips", 'String'>
    readonly expires_at: FieldRef<"banned_ips", 'BigInt'>
    readonly created_at: FieldRef<"banned_ips", 'BigInt'>
  }
    

  // Custom InputTypes
  /**
   * banned_ips findUnique
   */
  export type banned_ipsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the banned_ips
     */
    select?: banned_ipsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the banned_ips
     */
    omit?: banned_ipsOmit<ExtArgs> | null
    /**
     * Filter, which banned_ips to fetch.
     */
    where: banned_ipsWhereUniqueInput
  }

  /**
   * banned_ips findUniqueOrThrow
   */
  export type banned_ipsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the banned_ips
     */
    select?: banned_ipsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the banned_ips
     */
    omit?: banned_ipsOmit<ExtArgs> | null
    /**
     * Filter, which banned_ips to fetch.
     */
    where: banned_ipsWhereUniqueInput
  }

  /**
   * banned_ips findFirst
   */
  export type banned_ipsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the banned_ips
     */
    select?: banned_ipsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the banned_ips
     */
    omit?: banned_ipsOmit<ExtArgs> | null
    /**
     * Filter, which banned_ips to fetch.
     */
    where?: banned_ipsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of banned_ips to fetch.
     */
    orderBy?: banned_ipsOrderByWithRelationInput | banned_ipsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for banned_ips.
     */
    cursor?: banned_ipsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` banned_ips from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` banned_ips.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of banned_ips.
     */
    distinct?: Banned_ipsScalarFieldEnum | Banned_ipsScalarFieldEnum[]
  }

  /**
   * banned_ips findFirstOrThrow
   */
  export type banned_ipsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the banned_ips
     */
    select?: banned_ipsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the banned_ips
     */
    omit?: banned_ipsOmit<ExtArgs> | null
    /**
     * Filter, which banned_ips to fetch.
     */
    where?: banned_ipsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of banned_ips to fetch.
     */
    orderBy?: banned_ipsOrderByWithRelationInput | banned_ipsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for banned_ips.
     */
    cursor?: banned_ipsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` banned_ips from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` banned_ips.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of banned_ips.
     */
    distinct?: Banned_ipsScalarFieldEnum | Banned_ipsScalarFieldEnum[]
  }

  /**
   * banned_ips findMany
   */
  export type banned_ipsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the banned_ips
     */
    select?: banned_ipsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the banned_ips
     */
    omit?: banned_ipsOmit<ExtArgs> | null
    /**
     * Filter, which banned_ips to fetch.
     */
    where?: banned_ipsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of banned_ips to fetch.
     */
    orderBy?: banned_ipsOrderByWithRelationInput | banned_ipsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing banned_ips.
     */
    cursor?: banned_ipsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` banned_ips from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` banned_ips.
     */
    skip?: number
    distinct?: Banned_ipsScalarFieldEnum | Banned_ipsScalarFieldEnum[]
  }

  /**
   * banned_ips create
   */
  export type banned_ipsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the banned_ips
     */
    select?: banned_ipsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the banned_ips
     */
    omit?: banned_ipsOmit<ExtArgs> | null
    /**
     * The data needed to create a banned_ips.
     */
    data: XOR<banned_ipsCreateInput, banned_ipsUncheckedCreateInput>
  }

  /**
   * banned_ips createMany
   */
  export type banned_ipsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many banned_ips.
     */
    data: banned_ipsCreateManyInput | banned_ipsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * banned_ips createManyAndReturn
   */
  export type banned_ipsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the banned_ips
     */
    select?: banned_ipsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the banned_ips
     */
    omit?: banned_ipsOmit<ExtArgs> | null
    /**
     * The data used to create many banned_ips.
     */
    data: banned_ipsCreateManyInput | banned_ipsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * banned_ips update
   */
  export type banned_ipsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the banned_ips
     */
    select?: banned_ipsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the banned_ips
     */
    omit?: banned_ipsOmit<ExtArgs> | null
    /**
     * The data needed to update a banned_ips.
     */
    data: XOR<banned_ipsUpdateInput, banned_ipsUncheckedUpdateInput>
    /**
     * Choose, which banned_ips to update.
     */
    where: banned_ipsWhereUniqueInput
  }

  /**
   * banned_ips updateMany
   */
  export type banned_ipsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update banned_ips.
     */
    data: XOR<banned_ipsUpdateManyMutationInput, banned_ipsUncheckedUpdateManyInput>
    /**
     * Filter which banned_ips to update
     */
    where?: banned_ipsWhereInput
    /**
     * Limit how many banned_ips to update.
     */
    limit?: number
  }

  /**
   * banned_ips updateManyAndReturn
   */
  export type banned_ipsUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the banned_ips
     */
    select?: banned_ipsSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the banned_ips
     */
    omit?: banned_ipsOmit<ExtArgs> | null
    /**
     * The data used to update banned_ips.
     */
    data: XOR<banned_ipsUpdateManyMutationInput, banned_ipsUncheckedUpdateManyInput>
    /**
     * Filter which banned_ips to update
     */
    where?: banned_ipsWhereInput
    /**
     * Limit how many banned_ips to update.
     */
    limit?: number
  }

  /**
   * banned_ips upsert
   */
  export type banned_ipsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the banned_ips
     */
    select?: banned_ipsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the banned_ips
     */
    omit?: banned_ipsOmit<ExtArgs> | null
    /**
     * The filter to search for the banned_ips to update in case it exists.
     */
    where: banned_ipsWhereUniqueInput
    /**
     * In case the banned_ips found by the `where` argument doesn't exist, create a new banned_ips with this data.
     */
    create: XOR<banned_ipsCreateInput, banned_ipsUncheckedCreateInput>
    /**
     * In case the banned_ips was found with the provided `where` argument, update it with this data.
     */
    update: XOR<banned_ipsUpdateInput, banned_ipsUncheckedUpdateInput>
  }

  /**
   * banned_ips delete
   */
  export type banned_ipsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the banned_ips
     */
    select?: banned_ipsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the banned_ips
     */
    omit?: banned_ipsOmit<ExtArgs> | null
    /**
     * Filter which banned_ips to delete.
     */
    where: banned_ipsWhereUniqueInput
  }

  /**
   * banned_ips deleteMany
   */
  export type banned_ipsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which banned_ips to delete
     */
    where?: banned_ipsWhereInput
    /**
     * Limit how many banned_ips to delete.
     */
    limit?: number
  }

  /**
   * banned_ips without action
   */
  export type banned_ipsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the banned_ips
     */
    select?: banned_ipsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the banned_ips
     */
    omit?: banned_ipsOmit<ExtArgs> | null
  }


  /**
   * Model device_logs
   */

  export type AggregateDevice_logs = {
    _count: Device_logsCountAggregateOutputType | null
    _avg: Device_logsAvgAggregateOutputType | null
    _sum: Device_logsSumAggregateOutputType | null
    _min: Device_logsMinAggregateOutputType | null
    _max: Device_logsMaxAggregateOutputType | null
  }

  export type Device_logsAvgAggregateOutputType = {
    id: number | null
    created_at: number | null
  }

  export type Device_logsSumAggregateOutputType = {
    id: bigint | null
    created_at: bigint | null
  }

  export type Device_logsMinAggregateOutputType = {
    id: bigint | null
    device_name: string | null
    action: string | null
    operator: string | null
    details: string | null
    created_at: bigint | null
  }

  export type Device_logsMaxAggregateOutputType = {
    id: bigint | null
    device_name: string | null
    action: string | null
    operator: string | null
    details: string | null
    created_at: bigint | null
  }

  export type Device_logsCountAggregateOutputType = {
    id: number
    device_name: number
    action: number
    operator: number
    details: number
    created_at: number
    _all: number
  }


  export type Device_logsAvgAggregateInputType = {
    id?: true
    created_at?: true
  }

  export type Device_logsSumAggregateInputType = {
    id?: true
    created_at?: true
  }

  export type Device_logsMinAggregateInputType = {
    id?: true
    device_name?: true
    action?: true
    operator?: true
    details?: true
    created_at?: true
  }

  export type Device_logsMaxAggregateInputType = {
    id?: true
    device_name?: true
    action?: true
    operator?: true
    details?: true
    created_at?: true
  }

  export type Device_logsCountAggregateInputType = {
    id?: true
    device_name?: true
    action?: true
    operator?: true
    details?: true
    created_at?: true
    _all?: true
  }

  export type Device_logsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which device_logs to aggregate.
     */
    where?: device_logsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of device_logs to fetch.
     */
    orderBy?: device_logsOrderByWithRelationInput | device_logsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: device_logsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` device_logs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` device_logs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned device_logs
    **/
    _count?: true | Device_logsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: Device_logsAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: Device_logsSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: Device_logsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: Device_logsMaxAggregateInputType
  }

  export type GetDevice_logsAggregateType<T extends Device_logsAggregateArgs> = {
        [P in keyof T & keyof AggregateDevice_logs]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateDevice_logs[P]>
      : GetScalarType<T[P], AggregateDevice_logs[P]>
  }




  export type device_logsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: device_logsWhereInput
    orderBy?: device_logsOrderByWithAggregationInput | device_logsOrderByWithAggregationInput[]
    by: Device_logsScalarFieldEnum[] | Device_logsScalarFieldEnum
    having?: device_logsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: Device_logsCountAggregateInputType | true
    _avg?: Device_logsAvgAggregateInputType
    _sum?: Device_logsSumAggregateInputType
    _min?: Device_logsMinAggregateInputType
    _max?: Device_logsMaxAggregateInputType
  }

  export type Device_logsGroupByOutputType = {
    id: bigint
    device_name: string
    action: string
    operator: string
    details: string | null
    created_at: bigint
    _count: Device_logsCountAggregateOutputType | null
    _avg: Device_logsAvgAggregateOutputType | null
    _sum: Device_logsSumAggregateOutputType | null
    _min: Device_logsMinAggregateOutputType | null
    _max: Device_logsMaxAggregateOutputType | null
  }

  type GetDevice_logsGroupByPayload<T extends device_logsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<Device_logsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof Device_logsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], Device_logsGroupByOutputType[P]>
            : GetScalarType<T[P], Device_logsGroupByOutputType[P]>
        }
      >
    >


  export type device_logsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    device_name?: boolean
    action?: boolean
    operator?: boolean
    details?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["device_logs"]>

  export type device_logsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    device_name?: boolean
    action?: boolean
    operator?: boolean
    details?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["device_logs"]>

  export type device_logsSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    device_name?: boolean
    action?: boolean
    operator?: boolean
    details?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["device_logs"]>

  export type device_logsSelectScalar = {
    id?: boolean
    device_name?: boolean
    action?: boolean
    operator?: boolean
    details?: boolean
    created_at?: boolean
  }

  export type device_logsOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "device_name" | "action" | "operator" | "details" | "created_at", ExtArgs["result"]["device_logs"]>

  export type $device_logsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "device_logs"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: bigint
      device_name: string
      action: string
      operator: string
      details: string | null
      created_at: bigint
    }, ExtArgs["result"]["device_logs"]>
    composites: {}
  }

  type device_logsGetPayload<S extends boolean | null | undefined | device_logsDefaultArgs> = $Result.GetResult<Prisma.$device_logsPayload, S>

  type device_logsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<device_logsFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: Device_logsCountAggregateInputType | true
    }

  export interface device_logsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['device_logs'], meta: { name: 'device_logs' } }
    /**
     * Find zero or one Device_logs that matches the filter.
     * @param {device_logsFindUniqueArgs} args - Arguments to find a Device_logs
     * @example
     * // Get one Device_logs
     * const device_logs = await prisma.device_logs.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends device_logsFindUniqueArgs>(args: SelectSubset<T, device_logsFindUniqueArgs<ExtArgs>>): Prisma__device_logsClient<$Result.GetResult<Prisma.$device_logsPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Device_logs that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {device_logsFindUniqueOrThrowArgs} args - Arguments to find a Device_logs
     * @example
     * // Get one Device_logs
     * const device_logs = await prisma.device_logs.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends device_logsFindUniqueOrThrowArgs>(args: SelectSubset<T, device_logsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__device_logsClient<$Result.GetResult<Prisma.$device_logsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Device_logs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {device_logsFindFirstArgs} args - Arguments to find a Device_logs
     * @example
     * // Get one Device_logs
     * const device_logs = await prisma.device_logs.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends device_logsFindFirstArgs>(args?: SelectSubset<T, device_logsFindFirstArgs<ExtArgs>>): Prisma__device_logsClient<$Result.GetResult<Prisma.$device_logsPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Device_logs that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {device_logsFindFirstOrThrowArgs} args - Arguments to find a Device_logs
     * @example
     * // Get one Device_logs
     * const device_logs = await prisma.device_logs.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends device_logsFindFirstOrThrowArgs>(args?: SelectSubset<T, device_logsFindFirstOrThrowArgs<ExtArgs>>): Prisma__device_logsClient<$Result.GetResult<Prisma.$device_logsPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Device_logs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {device_logsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Device_logs
     * const device_logs = await prisma.device_logs.findMany()
     * 
     * // Get first 10 Device_logs
     * const device_logs = await prisma.device_logs.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const device_logsWithIdOnly = await prisma.device_logs.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends device_logsFindManyArgs>(args?: SelectSubset<T, device_logsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$device_logsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Device_logs.
     * @param {device_logsCreateArgs} args - Arguments to create a Device_logs.
     * @example
     * // Create one Device_logs
     * const Device_logs = await prisma.device_logs.create({
     *   data: {
     *     // ... data to create a Device_logs
     *   }
     * })
     * 
     */
    create<T extends device_logsCreateArgs>(args: SelectSubset<T, device_logsCreateArgs<ExtArgs>>): Prisma__device_logsClient<$Result.GetResult<Prisma.$device_logsPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Device_logs.
     * @param {device_logsCreateManyArgs} args - Arguments to create many Device_logs.
     * @example
     * // Create many Device_logs
     * const device_logs = await prisma.device_logs.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends device_logsCreateManyArgs>(args?: SelectSubset<T, device_logsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Device_logs and returns the data saved in the database.
     * @param {device_logsCreateManyAndReturnArgs} args - Arguments to create many Device_logs.
     * @example
     * // Create many Device_logs
     * const device_logs = await prisma.device_logs.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Device_logs and only return the `id`
     * const device_logsWithIdOnly = await prisma.device_logs.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends device_logsCreateManyAndReturnArgs>(args?: SelectSubset<T, device_logsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$device_logsPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Device_logs.
     * @param {device_logsDeleteArgs} args - Arguments to delete one Device_logs.
     * @example
     * // Delete one Device_logs
     * const Device_logs = await prisma.device_logs.delete({
     *   where: {
     *     // ... filter to delete one Device_logs
     *   }
     * })
     * 
     */
    delete<T extends device_logsDeleteArgs>(args: SelectSubset<T, device_logsDeleteArgs<ExtArgs>>): Prisma__device_logsClient<$Result.GetResult<Prisma.$device_logsPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Device_logs.
     * @param {device_logsUpdateArgs} args - Arguments to update one Device_logs.
     * @example
     * // Update one Device_logs
     * const device_logs = await prisma.device_logs.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends device_logsUpdateArgs>(args: SelectSubset<T, device_logsUpdateArgs<ExtArgs>>): Prisma__device_logsClient<$Result.GetResult<Prisma.$device_logsPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Device_logs.
     * @param {device_logsDeleteManyArgs} args - Arguments to filter Device_logs to delete.
     * @example
     * // Delete a few Device_logs
     * const { count } = await prisma.device_logs.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends device_logsDeleteManyArgs>(args?: SelectSubset<T, device_logsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Device_logs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {device_logsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Device_logs
     * const device_logs = await prisma.device_logs.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends device_logsUpdateManyArgs>(args: SelectSubset<T, device_logsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Device_logs and returns the data updated in the database.
     * @param {device_logsUpdateManyAndReturnArgs} args - Arguments to update many Device_logs.
     * @example
     * // Update many Device_logs
     * const device_logs = await prisma.device_logs.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Device_logs and only return the `id`
     * const device_logsWithIdOnly = await prisma.device_logs.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends device_logsUpdateManyAndReturnArgs>(args: SelectSubset<T, device_logsUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$device_logsPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Device_logs.
     * @param {device_logsUpsertArgs} args - Arguments to update or create a Device_logs.
     * @example
     * // Update or create a Device_logs
     * const device_logs = await prisma.device_logs.upsert({
     *   create: {
     *     // ... data to create a Device_logs
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Device_logs we want to update
     *   }
     * })
     */
    upsert<T extends device_logsUpsertArgs>(args: SelectSubset<T, device_logsUpsertArgs<ExtArgs>>): Prisma__device_logsClient<$Result.GetResult<Prisma.$device_logsPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Device_logs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {device_logsCountArgs} args - Arguments to filter Device_logs to count.
     * @example
     * // Count the number of Device_logs
     * const count = await prisma.device_logs.count({
     *   where: {
     *     // ... the filter for the Device_logs we want to count
     *   }
     * })
    **/
    count<T extends device_logsCountArgs>(
      args?: Subset<T, device_logsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], Device_logsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Device_logs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Device_logsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends Device_logsAggregateArgs>(args: Subset<T, Device_logsAggregateArgs>): Prisma.PrismaPromise<GetDevice_logsAggregateType<T>>

    /**
     * Group by Device_logs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {device_logsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends device_logsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: device_logsGroupByArgs['orderBy'] }
        : { orderBy?: device_logsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, device_logsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetDevice_logsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the device_logs model
   */
  readonly fields: device_logsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for device_logs.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__device_logsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the device_logs model
   */
  interface device_logsFieldRefs {
    readonly id: FieldRef<"device_logs", 'BigInt'>
    readonly device_name: FieldRef<"device_logs", 'String'>
    readonly action: FieldRef<"device_logs", 'String'>
    readonly operator: FieldRef<"device_logs", 'String'>
    readonly details: FieldRef<"device_logs", 'String'>
    readonly created_at: FieldRef<"device_logs", 'BigInt'>
  }
    

  // Custom InputTypes
  /**
   * device_logs findUnique
   */
  export type device_logsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the device_logs
     */
    select?: device_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the device_logs
     */
    omit?: device_logsOmit<ExtArgs> | null
    /**
     * Filter, which device_logs to fetch.
     */
    where: device_logsWhereUniqueInput
  }

  /**
   * device_logs findUniqueOrThrow
   */
  export type device_logsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the device_logs
     */
    select?: device_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the device_logs
     */
    omit?: device_logsOmit<ExtArgs> | null
    /**
     * Filter, which device_logs to fetch.
     */
    where: device_logsWhereUniqueInput
  }

  /**
   * device_logs findFirst
   */
  export type device_logsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the device_logs
     */
    select?: device_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the device_logs
     */
    omit?: device_logsOmit<ExtArgs> | null
    /**
     * Filter, which device_logs to fetch.
     */
    where?: device_logsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of device_logs to fetch.
     */
    orderBy?: device_logsOrderByWithRelationInput | device_logsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for device_logs.
     */
    cursor?: device_logsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` device_logs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` device_logs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of device_logs.
     */
    distinct?: Device_logsScalarFieldEnum | Device_logsScalarFieldEnum[]
  }

  /**
   * device_logs findFirstOrThrow
   */
  export type device_logsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the device_logs
     */
    select?: device_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the device_logs
     */
    omit?: device_logsOmit<ExtArgs> | null
    /**
     * Filter, which device_logs to fetch.
     */
    where?: device_logsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of device_logs to fetch.
     */
    orderBy?: device_logsOrderByWithRelationInput | device_logsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for device_logs.
     */
    cursor?: device_logsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` device_logs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` device_logs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of device_logs.
     */
    distinct?: Device_logsScalarFieldEnum | Device_logsScalarFieldEnum[]
  }

  /**
   * device_logs findMany
   */
  export type device_logsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the device_logs
     */
    select?: device_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the device_logs
     */
    omit?: device_logsOmit<ExtArgs> | null
    /**
     * Filter, which device_logs to fetch.
     */
    where?: device_logsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of device_logs to fetch.
     */
    orderBy?: device_logsOrderByWithRelationInput | device_logsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing device_logs.
     */
    cursor?: device_logsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` device_logs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` device_logs.
     */
    skip?: number
    distinct?: Device_logsScalarFieldEnum | Device_logsScalarFieldEnum[]
  }

  /**
   * device_logs create
   */
  export type device_logsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the device_logs
     */
    select?: device_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the device_logs
     */
    omit?: device_logsOmit<ExtArgs> | null
    /**
     * The data needed to create a device_logs.
     */
    data: XOR<device_logsCreateInput, device_logsUncheckedCreateInput>
  }

  /**
   * device_logs createMany
   */
  export type device_logsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many device_logs.
     */
    data: device_logsCreateManyInput | device_logsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * device_logs createManyAndReturn
   */
  export type device_logsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the device_logs
     */
    select?: device_logsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the device_logs
     */
    omit?: device_logsOmit<ExtArgs> | null
    /**
     * The data used to create many device_logs.
     */
    data: device_logsCreateManyInput | device_logsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * device_logs update
   */
  export type device_logsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the device_logs
     */
    select?: device_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the device_logs
     */
    omit?: device_logsOmit<ExtArgs> | null
    /**
     * The data needed to update a device_logs.
     */
    data: XOR<device_logsUpdateInput, device_logsUncheckedUpdateInput>
    /**
     * Choose, which device_logs to update.
     */
    where: device_logsWhereUniqueInput
  }

  /**
   * device_logs updateMany
   */
  export type device_logsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update device_logs.
     */
    data: XOR<device_logsUpdateManyMutationInput, device_logsUncheckedUpdateManyInput>
    /**
     * Filter which device_logs to update
     */
    where?: device_logsWhereInput
    /**
     * Limit how many device_logs to update.
     */
    limit?: number
  }

  /**
   * device_logs updateManyAndReturn
   */
  export type device_logsUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the device_logs
     */
    select?: device_logsSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the device_logs
     */
    omit?: device_logsOmit<ExtArgs> | null
    /**
     * The data used to update device_logs.
     */
    data: XOR<device_logsUpdateManyMutationInput, device_logsUncheckedUpdateManyInput>
    /**
     * Filter which device_logs to update
     */
    where?: device_logsWhereInput
    /**
     * Limit how many device_logs to update.
     */
    limit?: number
  }

  /**
   * device_logs upsert
   */
  export type device_logsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the device_logs
     */
    select?: device_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the device_logs
     */
    omit?: device_logsOmit<ExtArgs> | null
    /**
     * The filter to search for the device_logs to update in case it exists.
     */
    where: device_logsWhereUniqueInput
    /**
     * In case the device_logs found by the `where` argument doesn't exist, create a new device_logs with this data.
     */
    create: XOR<device_logsCreateInput, device_logsUncheckedCreateInput>
    /**
     * In case the device_logs was found with the provided `where` argument, update it with this data.
     */
    update: XOR<device_logsUpdateInput, device_logsUncheckedUpdateInput>
  }

  /**
   * device_logs delete
   */
  export type device_logsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the device_logs
     */
    select?: device_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the device_logs
     */
    omit?: device_logsOmit<ExtArgs> | null
    /**
     * Filter which device_logs to delete.
     */
    where: device_logsWhereUniqueInput
  }

  /**
   * device_logs deleteMany
   */
  export type device_logsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which device_logs to delete
     */
    where?: device_logsWhereInput
    /**
     * Limit how many device_logs to delete.
     */
    limit?: number
  }

  /**
   * device_logs without action
   */
  export type device_logsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the device_logs
     */
    select?: device_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the device_logs
     */
    omit?: device_logsOmit<ExtArgs> | null
  }


  /**
   * Model email_verifications
   */

  export type AggregateEmail_verifications = {
    _count: Email_verificationsCountAggregateOutputType | null
    _avg: Email_verificationsAvgAggregateOutputType | null
    _sum: Email_verificationsSumAggregateOutputType | null
    _min: Email_verificationsMinAggregateOutputType | null
    _max: Email_verificationsMaxAggregateOutputType | null
  }

  export type Email_verificationsAvgAggregateOutputType = {
    id: number | null
    expires_at: number | null
    used: number | null
    created_at: number | null
  }

  export type Email_verificationsSumAggregateOutputType = {
    id: bigint | null
    expires_at: bigint | null
    used: number | null
    created_at: bigint | null
  }

  export type Email_verificationsMinAggregateOutputType = {
    id: bigint | null
    email: string | null
    code: string | null
    expires_at: bigint | null
    used: number | null
    created_at: bigint | null
  }

  export type Email_verificationsMaxAggregateOutputType = {
    id: bigint | null
    email: string | null
    code: string | null
    expires_at: bigint | null
    used: number | null
    created_at: bigint | null
  }

  export type Email_verificationsCountAggregateOutputType = {
    id: number
    email: number
    code: number
    expires_at: number
    used: number
    created_at: number
    _all: number
  }


  export type Email_verificationsAvgAggregateInputType = {
    id?: true
    expires_at?: true
    used?: true
    created_at?: true
  }

  export type Email_verificationsSumAggregateInputType = {
    id?: true
    expires_at?: true
    used?: true
    created_at?: true
  }

  export type Email_verificationsMinAggregateInputType = {
    id?: true
    email?: true
    code?: true
    expires_at?: true
    used?: true
    created_at?: true
  }

  export type Email_verificationsMaxAggregateInputType = {
    id?: true
    email?: true
    code?: true
    expires_at?: true
    used?: true
    created_at?: true
  }

  export type Email_verificationsCountAggregateInputType = {
    id?: true
    email?: true
    code?: true
    expires_at?: true
    used?: true
    created_at?: true
    _all?: true
  }

  export type Email_verificationsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which email_verifications to aggregate.
     */
    where?: email_verificationsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of email_verifications to fetch.
     */
    orderBy?: email_verificationsOrderByWithRelationInput | email_verificationsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: email_verificationsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` email_verifications from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` email_verifications.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned email_verifications
    **/
    _count?: true | Email_verificationsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: Email_verificationsAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: Email_verificationsSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: Email_verificationsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: Email_verificationsMaxAggregateInputType
  }

  export type GetEmail_verificationsAggregateType<T extends Email_verificationsAggregateArgs> = {
        [P in keyof T & keyof AggregateEmail_verifications]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateEmail_verifications[P]>
      : GetScalarType<T[P], AggregateEmail_verifications[P]>
  }




  export type email_verificationsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: email_verificationsWhereInput
    orderBy?: email_verificationsOrderByWithAggregationInput | email_verificationsOrderByWithAggregationInput[]
    by: Email_verificationsScalarFieldEnum[] | Email_verificationsScalarFieldEnum
    having?: email_verificationsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: Email_verificationsCountAggregateInputType | true
    _avg?: Email_verificationsAvgAggregateInputType
    _sum?: Email_verificationsSumAggregateInputType
    _min?: Email_verificationsMinAggregateInputType
    _max?: Email_verificationsMaxAggregateInputType
  }

  export type Email_verificationsGroupByOutputType = {
    id: bigint
    email: string
    code: string
    expires_at: bigint
    used: number | null
    created_at: bigint
    _count: Email_verificationsCountAggregateOutputType | null
    _avg: Email_verificationsAvgAggregateOutputType | null
    _sum: Email_verificationsSumAggregateOutputType | null
    _min: Email_verificationsMinAggregateOutputType | null
    _max: Email_verificationsMaxAggregateOutputType | null
  }

  type GetEmail_verificationsGroupByPayload<T extends email_verificationsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<Email_verificationsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof Email_verificationsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], Email_verificationsGroupByOutputType[P]>
            : GetScalarType<T[P], Email_verificationsGroupByOutputType[P]>
        }
      >
    >


  export type email_verificationsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    code?: boolean
    expires_at?: boolean
    used?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["email_verifications"]>

  export type email_verificationsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    code?: boolean
    expires_at?: boolean
    used?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["email_verifications"]>

  export type email_verificationsSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    code?: boolean
    expires_at?: boolean
    used?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["email_verifications"]>

  export type email_verificationsSelectScalar = {
    id?: boolean
    email?: boolean
    code?: boolean
    expires_at?: boolean
    used?: boolean
    created_at?: boolean
  }

  export type email_verificationsOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "email" | "code" | "expires_at" | "used" | "created_at", ExtArgs["result"]["email_verifications"]>

  export type $email_verificationsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "email_verifications"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: bigint
      email: string
      code: string
      expires_at: bigint
      used: number | null
      created_at: bigint
    }, ExtArgs["result"]["email_verifications"]>
    composites: {}
  }

  type email_verificationsGetPayload<S extends boolean | null | undefined | email_verificationsDefaultArgs> = $Result.GetResult<Prisma.$email_verificationsPayload, S>

  type email_verificationsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<email_verificationsFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: Email_verificationsCountAggregateInputType | true
    }

  export interface email_verificationsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['email_verifications'], meta: { name: 'email_verifications' } }
    /**
     * Find zero or one Email_verifications that matches the filter.
     * @param {email_verificationsFindUniqueArgs} args - Arguments to find a Email_verifications
     * @example
     * // Get one Email_verifications
     * const email_verifications = await prisma.email_verifications.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends email_verificationsFindUniqueArgs>(args: SelectSubset<T, email_verificationsFindUniqueArgs<ExtArgs>>): Prisma__email_verificationsClient<$Result.GetResult<Prisma.$email_verificationsPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Email_verifications that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {email_verificationsFindUniqueOrThrowArgs} args - Arguments to find a Email_verifications
     * @example
     * // Get one Email_verifications
     * const email_verifications = await prisma.email_verifications.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends email_verificationsFindUniqueOrThrowArgs>(args: SelectSubset<T, email_verificationsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__email_verificationsClient<$Result.GetResult<Prisma.$email_verificationsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Email_verifications that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {email_verificationsFindFirstArgs} args - Arguments to find a Email_verifications
     * @example
     * // Get one Email_verifications
     * const email_verifications = await prisma.email_verifications.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends email_verificationsFindFirstArgs>(args?: SelectSubset<T, email_verificationsFindFirstArgs<ExtArgs>>): Prisma__email_verificationsClient<$Result.GetResult<Prisma.$email_verificationsPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Email_verifications that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {email_verificationsFindFirstOrThrowArgs} args - Arguments to find a Email_verifications
     * @example
     * // Get one Email_verifications
     * const email_verifications = await prisma.email_verifications.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends email_verificationsFindFirstOrThrowArgs>(args?: SelectSubset<T, email_verificationsFindFirstOrThrowArgs<ExtArgs>>): Prisma__email_verificationsClient<$Result.GetResult<Prisma.$email_verificationsPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Email_verifications that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {email_verificationsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Email_verifications
     * const email_verifications = await prisma.email_verifications.findMany()
     * 
     * // Get first 10 Email_verifications
     * const email_verifications = await prisma.email_verifications.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const email_verificationsWithIdOnly = await prisma.email_verifications.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends email_verificationsFindManyArgs>(args?: SelectSubset<T, email_verificationsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$email_verificationsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Email_verifications.
     * @param {email_verificationsCreateArgs} args - Arguments to create a Email_verifications.
     * @example
     * // Create one Email_verifications
     * const Email_verifications = await prisma.email_verifications.create({
     *   data: {
     *     // ... data to create a Email_verifications
     *   }
     * })
     * 
     */
    create<T extends email_verificationsCreateArgs>(args: SelectSubset<T, email_verificationsCreateArgs<ExtArgs>>): Prisma__email_verificationsClient<$Result.GetResult<Prisma.$email_verificationsPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Email_verifications.
     * @param {email_verificationsCreateManyArgs} args - Arguments to create many Email_verifications.
     * @example
     * // Create many Email_verifications
     * const email_verifications = await prisma.email_verifications.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends email_verificationsCreateManyArgs>(args?: SelectSubset<T, email_verificationsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Email_verifications and returns the data saved in the database.
     * @param {email_verificationsCreateManyAndReturnArgs} args - Arguments to create many Email_verifications.
     * @example
     * // Create many Email_verifications
     * const email_verifications = await prisma.email_verifications.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Email_verifications and only return the `id`
     * const email_verificationsWithIdOnly = await prisma.email_verifications.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends email_verificationsCreateManyAndReturnArgs>(args?: SelectSubset<T, email_verificationsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$email_verificationsPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Email_verifications.
     * @param {email_verificationsDeleteArgs} args - Arguments to delete one Email_verifications.
     * @example
     * // Delete one Email_verifications
     * const Email_verifications = await prisma.email_verifications.delete({
     *   where: {
     *     // ... filter to delete one Email_verifications
     *   }
     * })
     * 
     */
    delete<T extends email_verificationsDeleteArgs>(args: SelectSubset<T, email_verificationsDeleteArgs<ExtArgs>>): Prisma__email_verificationsClient<$Result.GetResult<Prisma.$email_verificationsPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Email_verifications.
     * @param {email_verificationsUpdateArgs} args - Arguments to update one Email_verifications.
     * @example
     * // Update one Email_verifications
     * const email_verifications = await prisma.email_verifications.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends email_verificationsUpdateArgs>(args: SelectSubset<T, email_verificationsUpdateArgs<ExtArgs>>): Prisma__email_verificationsClient<$Result.GetResult<Prisma.$email_verificationsPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Email_verifications.
     * @param {email_verificationsDeleteManyArgs} args - Arguments to filter Email_verifications to delete.
     * @example
     * // Delete a few Email_verifications
     * const { count } = await prisma.email_verifications.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends email_verificationsDeleteManyArgs>(args?: SelectSubset<T, email_verificationsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Email_verifications.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {email_verificationsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Email_verifications
     * const email_verifications = await prisma.email_verifications.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends email_verificationsUpdateManyArgs>(args: SelectSubset<T, email_verificationsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Email_verifications and returns the data updated in the database.
     * @param {email_verificationsUpdateManyAndReturnArgs} args - Arguments to update many Email_verifications.
     * @example
     * // Update many Email_verifications
     * const email_verifications = await prisma.email_verifications.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Email_verifications and only return the `id`
     * const email_verificationsWithIdOnly = await prisma.email_verifications.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends email_verificationsUpdateManyAndReturnArgs>(args: SelectSubset<T, email_verificationsUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$email_verificationsPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Email_verifications.
     * @param {email_verificationsUpsertArgs} args - Arguments to update or create a Email_verifications.
     * @example
     * // Update or create a Email_verifications
     * const email_verifications = await prisma.email_verifications.upsert({
     *   create: {
     *     // ... data to create a Email_verifications
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Email_verifications we want to update
     *   }
     * })
     */
    upsert<T extends email_verificationsUpsertArgs>(args: SelectSubset<T, email_verificationsUpsertArgs<ExtArgs>>): Prisma__email_verificationsClient<$Result.GetResult<Prisma.$email_verificationsPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Email_verifications.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {email_verificationsCountArgs} args - Arguments to filter Email_verifications to count.
     * @example
     * // Count the number of Email_verifications
     * const count = await prisma.email_verifications.count({
     *   where: {
     *     // ... the filter for the Email_verifications we want to count
     *   }
     * })
    **/
    count<T extends email_verificationsCountArgs>(
      args?: Subset<T, email_verificationsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], Email_verificationsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Email_verifications.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Email_verificationsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends Email_verificationsAggregateArgs>(args: Subset<T, Email_verificationsAggregateArgs>): Prisma.PrismaPromise<GetEmail_verificationsAggregateType<T>>

    /**
     * Group by Email_verifications.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {email_verificationsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends email_verificationsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: email_verificationsGroupByArgs['orderBy'] }
        : { orderBy?: email_verificationsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, email_verificationsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetEmail_verificationsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the email_verifications model
   */
  readonly fields: email_verificationsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for email_verifications.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__email_verificationsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the email_verifications model
   */
  interface email_verificationsFieldRefs {
    readonly id: FieldRef<"email_verifications", 'BigInt'>
    readonly email: FieldRef<"email_verifications", 'String'>
    readonly code: FieldRef<"email_verifications", 'String'>
    readonly expires_at: FieldRef<"email_verifications", 'BigInt'>
    readonly used: FieldRef<"email_verifications", 'Int'>
    readonly created_at: FieldRef<"email_verifications", 'BigInt'>
  }
    

  // Custom InputTypes
  /**
   * email_verifications findUnique
   */
  export type email_verificationsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the email_verifications
     */
    select?: email_verificationsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the email_verifications
     */
    omit?: email_verificationsOmit<ExtArgs> | null
    /**
     * Filter, which email_verifications to fetch.
     */
    where: email_verificationsWhereUniqueInput
  }

  /**
   * email_verifications findUniqueOrThrow
   */
  export type email_verificationsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the email_verifications
     */
    select?: email_verificationsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the email_verifications
     */
    omit?: email_verificationsOmit<ExtArgs> | null
    /**
     * Filter, which email_verifications to fetch.
     */
    where: email_verificationsWhereUniqueInput
  }

  /**
   * email_verifications findFirst
   */
  export type email_verificationsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the email_verifications
     */
    select?: email_verificationsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the email_verifications
     */
    omit?: email_verificationsOmit<ExtArgs> | null
    /**
     * Filter, which email_verifications to fetch.
     */
    where?: email_verificationsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of email_verifications to fetch.
     */
    orderBy?: email_verificationsOrderByWithRelationInput | email_verificationsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for email_verifications.
     */
    cursor?: email_verificationsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` email_verifications from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` email_verifications.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of email_verifications.
     */
    distinct?: Email_verificationsScalarFieldEnum | Email_verificationsScalarFieldEnum[]
  }

  /**
   * email_verifications findFirstOrThrow
   */
  export type email_verificationsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the email_verifications
     */
    select?: email_verificationsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the email_verifications
     */
    omit?: email_verificationsOmit<ExtArgs> | null
    /**
     * Filter, which email_verifications to fetch.
     */
    where?: email_verificationsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of email_verifications to fetch.
     */
    orderBy?: email_verificationsOrderByWithRelationInput | email_verificationsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for email_verifications.
     */
    cursor?: email_verificationsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` email_verifications from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` email_verifications.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of email_verifications.
     */
    distinct?: Email_verificationsScalarFieldEnum | Email_verificationsScalarFieldEnum[]
  }

  /**
   * email_verifications findMany
   */
  export type email_verificationsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the email_verifications
     */
    select?: email_verificationsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the email_verifications
     */
    omit?: email_verificationsOmit<ExtArgs> | null
    /**
     * Filter, which email_verifications to fetch.
     */
    where?: email_verificationsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of email_verifications to fetch.
     */
    orderBy?: email_verificationsOrderByWithRelationInput | email_verificationsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing email_verifications.
     */
    cursor?: email_verificationsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` email_verifications from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` email_verifications.
     */
    skip?: number
    distinct?: Email_verificationsScalarFieldEnum | Email_verificationsScalarFieldEnum[]
  }

  /**
   * email_verifications create
   */
  export type email_verificationsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the email_verifications
     */
    select?: email_verificationsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the email_verifications
     */
    omit?: email_verificationsOmit<ExtArgs> | null
    /**
     * The data needed to create a email_verifications.
     */
    data: XOR<email_verificationsCreateInput, email_verificationsUncheckedCreateInput>
  }

  /**
   * email_verifications createMany
   */
  export type email_verificationsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many email_verifications.
     */
    data: email_verificationsCreateManyInput | email_verificationsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * email_verifications createManyAndReturn
   */
  export type email_verificationsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the email_verifications
     */
    select?: email_verificationsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the email_verifications
     */
    omit?: email_verificationsOmit<ExtArgs> | null
    /**
     * The data used to create many email_verifications.
     */
    data: email_verificationsCreateManyInput | email_verificationsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * email_verifications update
   */
  export type email_verificationsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the email_verifications
     */
    select?: email_verificationsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the email_verifications
     */
    omit?: email_verificationsOmit<ExtArgs> | null
    /**
     * The data needed to update a email_verifications.
     */
    data: XOR<email_verificationsUpdateInput, email_verificationsUncheckedUpdateInput>
    /**
     * Choose, which email_verifications to update.
     */
    where: email_verificationsWhereUniqueInput
  }

  /**
   * email_verifications updateMany
   */
  export type email_verificationsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update email_verifications.
     */
    data: XOR<email_verificationsUpdateManyMutationInput, email_verificationsUncheckedUpdateManyInput>
    /**
     * Filter which email_verifications to update
     */
    where?: email_verificationsWhereInput
    /**
     * Limit how many email_verifications to update.
     */
    limit?: number
  }

  /**
   * email_verifications updateManyAndReturn
   */
  export type email_verificationsUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the email_verifications
     */
    select?: email_verificationsSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the email_verifications
     */
    omit?: email_verificationsOmit<ExtArgs> | null
    /**
     * The data used to update email_verifications.
     */
    data: XOR<email_verificationsUpdateManyMutationInput, email_verificationsUncheckedUpdateManyInput>
    /**
     * Filter which email_verifications to update
     */
    where?: email_verificationsWhereInput
    /**
     * Limit how many email_verifications to update.
     */
    limit?: number
  }

  /**
   * email_verifications upsert
   */
  export type email_verificationsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the email_verifications
     */
    select?: email_verificationsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the email_verifications
     */
    omit?: email_verificationsOmit<ExtArgs> | null
    /**
     * The filter to search for the email_verifications to update in case it exists.
     */
    where: email_verificationsWhereUniqueInput
    /**
     * In case the email_verifications found by the `where` argument doesn't exist, create a new email_verifications with this data.
     */
    create: XOR<email_verificationsCreateInput, email_verificationsUncheckedCreateInput>
    /**
     * In case the email_verifications was found with the provided `where` argument, update it with this data.
     */
    update: XOR<email_verificationsUpdateInput, email_verificationsUncheckedUpdateInput>
  }

  /**
   * email_verifications delete
   */
  export type email_verificationsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the email_verifications
     */
    select?: email_verificationsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the email_verifications
     */
    omit?: email_verificationsOmit<ExtArgs> | null
    /**
     * Filter which email_verifications to delete.
     */
    where: email_verificationsWhereUniqueInput
  }

  /**
   * email_verifications deleteMany
   */
  export type email_verificationsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which email_verifications to delete
     */
    where?: email_verificationsWhereInput
    /**
     * Limit how many email_verifications to delete.
     */
    limit?: number
  }

  /**
   * email_verifications without action
   */
  export type email_verificationsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the email_verifications
     */
    select?: email_verificationsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the email_verifications
     */
    omit?: email_verificationsOmit<ExtArgs> | null
  }


  /**
   * Model friend_requests
   */

  export type AggregateFriend_requests = {
    _count: Friend_requestsCountAggregateOutputType | null
    _avg: Friend_requestsAvgAggregateOutputType | null
    _sum: Friend_requestsSumAggregateOutputType | null
    _min: Friend_requestsMinAggregateOutputType | null
    _max: Friend_requestsMaxAggregateOutputType | null
  }

  export type Friend_requestsAvgAggregateOutputType = {
    id: number | null
    requester_id: number | null
    addressee_id: number | null
    created_at: number | null
    updated_at: number | null
  }

  export type Friend_requestsSumAggregateOutputType = {
    id: bigint | null
    requester_id: number | null
    addressee_id: number | null
    created_at: bigint | null
    updated_at: bigint | null
  }

  export type Friend_requestsMinAggregateOutputType = {
    id: bigint | null
    requester_id: number | null
    addressee_id: number | null
    status: string | null
    created_at: bigint | null
    updated_at: bigint | null
  }

  export type Friend_requestsMaxAggregateOutputType = {
    id: bigint | null
    requester_id: number | null
    addressee_id: number | null
    status: string | null
    created_at: bigint | null
    updated_at: bigint | null
  }

  export type Friend_requestsCountAggregateOutputType = {
    id: number
    requester_id: number
    addressee_id: number
    status: number
    created_at: number
    updated_at: number
    _all: number
  }


  export type Friend_requestsAvgAggregateInputType = {
    id?: true
    requester_id?: true
    addressee_id?: true
    created_at?: true
    updated_at?: true
  }

  export type Friend_requestsSumAggregateInputType = {
    id?: true
    requester_id?: true
    addressee_id?: true
    created_at?: true
    updated_at?: true
  }

  export type Friend_requestsMinAggregateInputType = {
    id?: true
    requester_id?: true
    addressee_id?: true
    status?: true
    created_at?: true
    updated_at?: true
  }

  export type Friend_requestsMaxAggregateInputType = {
    id?: true
    requester_id?: true
    addressee_id?: true
    status?: true
    created_at?: true
    updated_at?: true
  }

  export type Friend_requestsCountAggregateInputType = {
    id?: true
    requester_id?: true
    addressee_id?: true
    status?: true
    created_at?: true
    updated_at?: true
    _all?: true
  }

  export type Friend_requestsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which friend_requests to aggregate.
     */
    where?: friend_requestsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of friend_requests to fetch.
     */
    orderBy?: friend_requestsOrderByWithRelationInput | friend_requestsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: friend_requestsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` friend_requests from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` friend_requests.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned friend_requests
    **/
    _count?: true | Friend_requestsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: Friend_requestsAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: Friend_requestsSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: Friend_requestsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: Friend_requestsMaxAggregateInputType
  }

  export type GetFriend_requestsAggregateType<T extends Friend_requestsAggregateArgs> = {
        [P in keyof T & keyof AggregateFriend_requests]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateFriend_requests[P]>
      : GetScalarType<T[P], AggregateFriend_requests[P]>
  }




  export type friend_requestsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: friend_requestsWhereInput
    orderBy?: friend_requestsOrderByWithAggregationInput | friend_requestsOrderByWithAggregationInput[]
    by: Friend_requestsScalarFieldEnum[] | Friend_requestsScalarFieldEnum
    having?: friend_requestsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: Friend_requestsCountAggregateInputType | true
    _avg?: Friend_requestsAvgAggregateInputType
    _sum?: Friend_requestsSumAggregateInputType
    _min?: Friend_requestsMinAggregateInputType
    _max?: Friend_requestsMaxAggregateInputType
  }

  export type Friend_requestsGroupByOutputType = {
    id: bigint
    requester_id: number
    addressee_id: number
    status: string | null
    created_at: bigint
    updated_at: bigint
    _count: Friend_requestsCountAggregateOutputType | null
    _avg: Friend_requestsAvgAggregateOutputType | null
    _sum: Friend_requestsSumAggregateOutputType | null
    _min: Friend_requestsMinAggregateOutputType | null
    _max: Friend_requestsMaxAggregateOutputType | null
  }

  type GetFriend_requestsGroupByPayload<T extends friend_requestsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<Friend_requestsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof Friend_requestsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], Friend_requestsGroupByOutputType[P]>
            : GetScalarType<T[P], Friend_requestsGroupByOutputType[P]>
        }
      >
    >


  export type friend_requestsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    requester_id?: boolean
    addressee_id?: boolean
    status?: boolean
    created_at?: boolean
    updated_at?: boolean
  }, ExtArgs["result"]["friend_requests"]>

  export type friend_requestsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    requester_id?: boolean
    addressee_id?: boolean
    status?: boolean
    created_at?: boolean
    updated_at?: boolean
  }, ExtArgs["result"]["friend_requests"]>

  export type friend_requestsSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    requester_id?: boolean
    addressee_id?: boolean
    status?: boolean
    created_at?: boolean
    updated_at?: boolean
  }, ExtArgs["result"]["friend_requests"]>

  export type friend_requestsSelectScalar = {
    id?: boolean
    requester_id?: boolean
    addressee_id?: boolean
    status?: boolean
    created_at?: boolean
    updated_at?: boolean
  }

  export type friend_requestsOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "requester_id" | "addressee_id" | "status" | "created_at" | "updated_at", ExtArgs["result"]["friend_requests"]>

  export type $friend_requestsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "friend_requests"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: bigint
      requester_id: number
      addressee_id: number
      status: string | null
      created_at: bigint
      updated_at: bigint
    }, ExtArgs["result"]["friend_requests"]>
    composites: {}
  }

  type friend_requestsGetPayload<S extends boolean | null | undefined | friend_requestsDefaultArgs> = $Result.GetResult<Prisma.$friend_requestsPayload, S>

  type friend_requestsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<friend_requestsFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: Friend_requestsCountAggregateInputType | true
    }

  export interface friend_requestsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['friend_requests'], meta: { name: 'friend_requests' } }
    /**
     * Find zero or one Friend_requests that matches the filter.
     * @param {friend_requestsFindUniqueArgs} args - Arguments to find a Friend_requests
     * @example
     * // Get one Friend_requests
     * const friend_requests = await prisma.friend_requests.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends friend_requestsFindUniqueArgs>(args: SelectSubset<T, friend_requestsFindUniqueArgs<ExtArgs>>): Prisma__friend_requestsClient<$Result.GetResult<Prisma.$friend_requestsPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Friend_requests that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {friend_requestsFindUniqueOrThrowArgs} args - Arguments to find a Friend_requests
     * @example
     * // Get one Friend_requests
     * const friend_requests = await prisma.friend_requests.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends friend_requestsFindUniqueOrThrowArgs>(args: SelectSubset<T, friend_requestsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__friend_requestsClient<$Result.GetResult<Prisma.$friend_requestsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Friend_requests that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {friend_requestsFindFirstArgs} args - Arguments to find a Friend_requests
     * @example
     * // Get one Friend_requests
     * const friend_requests = await prisma.friend_requests.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends friend_requestsFindFirstArgs>(args?: SelectSubset<T, friend_requestsFindFirstArgs<ExtArgs>>): Prisma__friend_requestsClient<$Result.GetResult<Prisma.$friend_requestsPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Friend_requests that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {friend_requestsFindFirstOrThrowArgs} args - Arguments to find a Friend_requests
     * @example
     * // Get one Friend_requests
     * const friend_requests = await prisma.friend_requests.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends friend_requestsFindFirstOrThrowArgs>(args?: SelectSubset<T, friend_requestsFindFirstOrThrowArgs<ExtArgs>>): Prisma__friend_requestsClient<$Result.GetResult<Prisma.$friend_requestsPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Friend_requests that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {friend_requestsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Friend_requests
     * const friend_requests = await prisma.friend_requests.findMany()
     * 
     * // Get first 10 Friend_requests
     * const friend_requests = await prisma.friend_requests.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const friend_requestsWithIdOnly = await prisma.friend_requests.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends friend_requestsFindManyArgs>(args?: SelectSubset<T, friend_requestsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$friend_requestsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Friend_requests.
     * @param {friend_requestsCreateArgs} args - Arguments to create a Friend_requests.
     * @example
     * // Create one Friend_requests
     * const Friend_requests = await prisma.friend_requests.create({
     *   data: {
     *     // ... data to create a Friend_requests
     *   }
     * })
     * 
     */
    create<T extends friend_requestsCreateArgs>(args: SelectSubset<T, friend_requestsCreateArgs<ExtArgs>>): Prisma__friend_requestsClient<$Result.GetResult<Prisma.$friend_requestsPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Friend_requests.
     * @param {friend_requestsCreateManyArgs} args - Arguments to create many Friend_requests.
     * @example
     * // Create many Friend_requests
     * const friend_requests = await prisma.friend_requests.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends friend_requestsCreateManyArgs>(args?: SelectSubset<T, friend_requestsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Friend_requests and returns the data saved in the database.
     * @param {friend_requestsCreateManyAndReturnArgs} args - Arguments to create many Friend_requests.
     * @example
     * // Create many Friend_requests
     * const friend_requests = await prisma.friend_requests.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Friend_requests and only return the `id`
     * const friend_requestsWithIdOnly = await prisma.friend_requests.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends friend_requestsCreateManyAndReturnArgs>(args?: SelectSubset<T, friend_requestsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$friend_requestsPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Friend_requests.
     * @param {friend_requestsDeleteArgs} args - Arguments to delete one Friend_requests.
     * @example
     * // Delete one Friend_requests
     * const Friend_requests = await prisma.friend_requests.delete({
     *   where: {
     *     // ... filter to delete one Friend_requests
     *   }
     * })
     * 
     */
    delete<T extends friend_requestsDeleteArgs>(args: SelectSubset<T, friend_requestsDeleteArgs<ExtArgs>>): Prisma__friend_requestsClient<$Result.GetResult<Prisma.$friend_requestsPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Friend_requests.
     * @param {friend_requestsUpdateArgs} args - Arguments to update one Friend_requests.
     * @example
     * // Update one Friend_requests
     * const friend_requests = await prisma.friend_requests.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends friend_requestsUpdateArgs>(args: SelectSubset<T, friend_requestsUpdateArgs<ExtArgs>>): Prisma__friend_requestsClient<$Result.GetResult<Prisma.$friend_requestsPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Friend_requests.
     * @param {friend_requestsDeleteManyArgs} args - Arguments to filter Friend_requests to delete.
     * @example
     * // Delete a few Friend_requests
     * const { count } = await prisma.friend_requests.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends friend_requestsDeleteManyArgs>(args?: SelectSubset<T, friend_requestsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Friend_requests.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {friend_requestsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Friend_requests
     * const friend_requests = await prisma.friend_requests.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends friend_requestsUpdateManyArgs>(args: SelectSubset<T, friend_requestsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Friend_requests and returns the data updated in the database.
     * @param {friend_requestsUpdateManyAndReturnArgs} args - Arguments to update many Friend_requests.
     * @example
     * // Update many Friend_requests
     * const friend_requests = await prisma.friend_requests.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Friend_requests and only return the `id`
     * const friend_requestsWithIdOnly = await prisma.friend_requests.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends friend_requestsUpdateManyAndReturnArgs>(args: SelectSubset<T, friend_requestsUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$friend_requestsPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Friend_requests.
     * @param {friend_requestsUpsertArgs} args - Arguments to update or create a Friend_requests.
     * @example
     * // Update or create a Friend_requests
     * const friend_requests = await prisma.friend_requests.upsert({
     *   create: {
     *     // ... data to create a Friend_requests
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Friend_requests we want to update
     *   }
     * })
     */
    upsert<T extends friend_requestsUpsertArgs>(args: SelectSubset<T, friend_requestsUpsertArgs<ExtArgs>>): Prisma__friend_requestsClient<$Result.GetResult<Prisma.$friend_requestsPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Friend_requests.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {friend_requestsCountArgs} args - Arguments to filter Friend_requests to count.
     * @example
     * // Count the number of Friend_requests
     * const count = await prisma.friend_requests.count({
     *   where: {
     *     // ... the filter for the Friend_requests we want to count
     *   }
     * })
    **/
    count<T extends friend_requestsCountArgs>(
      args?: Subset<T, friend_requestsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], Friend_requestsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Friend_requests.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Friend_requestsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends Friend_requestsAggregateArgs>(args: Subset<T, Friend_requestsAggregateArgs>): Prisma.PrismaPromise<GetFriend_requestsAggregateType<T>>

    /**
     * Group by Friend_requests.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {friend_requestsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends friend_requestsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: friend_requestsGroupByArgs['orderBy'] }
        : { orderBy?: friend_requestsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, friend_requestsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetFriend_requestsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the friend_requests model
   */
  readonly fields: friend_requestsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for friend_requests.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__friend_requestsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the friend_requests model
   */
  interface friend_requestsFieldRefs {
    readonly id: FieldRef<"friend_requests", 'BigInt'>
    readonly requester_id: FieldRef<"friend_requests", 'Int'>
    readonly addressee_id: FieldRef<"friend_requests", 'Int'>
    readonly status: FieldRef<"friend_requests", 'String'>
    readonly created_at: FieldRef<"friend_requests", 'BigInt'>
    readonly updated_at: FieldRef<"friend_requests", 'BigInt'>
  }
    

  // Custom InputTypes
  /**
   * friend_requests findUnique
   */
  export type friend_requestsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the friend_requests
     */
    select?: friend_requestsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the friend_requests
     */
    omit?: friend_requestsOmit<ExtArgs> | null
    /**
     * Filter, which friend_requests to fetch.
     */
    where: friend_requestsWhereUniqueInput
  }

  /**
   * friend_requests findUniqueOrThrow
   */
  export type friend_requestsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the friend_requests
     */
    select?: friend_requestsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the friend_requests
     */
    omit?: friend_requestsOmit<ExtArgs> | null
    /**
     * Filter, which friend_requests to fetch.
     */
    where: friend_requestsWhereUniqueInput
  }

  /**
   * friend_requests findFirst
   */
  export type friend_requestsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the friend_requests
     */
    select?: friend_requestsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the friend_requests
     */
    omit?: friend_requestsOmit<ExtArgs> | null
    /**
     * Filter, which friend_requests to fetch.
     */
    where?: friend_requestsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of friend_requests to fetch.
     */
    orderBy?: friend_requestsOrderByWithRelationInput | friend_requestsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for friend_requests.
     */
    cursor?: friend_requestsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` friend_requests from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` friend_requests.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of friend_requests.
     */
    distinct?: Friend_requestsScalarFieldEnum | Friend_requestsScalarFieldEnum[]
  }

  /**
   * friend_requests findFirstOrThrow
   */
  export type friend_requestsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the friend_requests
     */
    select?: friend_requestsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the friend_requests
     */
    omit?: friend_requestsOmit<ExtArgs> | null
    /**
     * Filter, which friend_requests to fetch.
     */
    where?: friend_requestsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of friend_requests to fetch.
     */
    orderBy?: friend_requestsOrderByWithRelationInput | friend_requestsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for friend_requests.
     */
    cursor?: friend_requestsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` friend_requests from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` friend_requests.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of friend_requests.
     */
    distinct?: Friend_requestsScalarFieldEnum | Friend_requestsScalarFieldEnum[]
  }

  /**
   * friend_requests findMany
   */
  export type friend_requestsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the friend_requests
     */
    select?: friend_requestsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the friend_requests
     */
    omit?: friend_requestsOmit<ExtArgs> | null
    /**
     * Filter, which friend_requests to fetch.
     */
    where?: friend_requestsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of friend_requests to fetch.
     */
    orderBy?: friend_requestsOrderByWithRelationInput | friend_requestsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing friend_requests.
     */
    cursor?: friend_requestsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` friend_requests from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` friend_requests.
     */
    skip?: number
    distinct?: Friend_requestsScalarFieldEnum | Friend_requestsScalarFieldEnum[]
  }

  /**
   * friend_requests create
   */
  export type friend_requestsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the friend_requests
     */
    select?: friend_requestsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the friend_requests
     */
    omit?: friend_requestsOmit<ExtArgs> | null
    /**
     * The data needed to create a friend_requests.
     */
    data: XOR<friend_requestsCreateInput, friend_requestsUncheckedCreateInput>
  }

  /**
   * friend_requests createMany
   */
  export type friend_requestsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many friend_requests.
     */
    data: friend_requestsCreateManyInput | friend_requestsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * friend_requests createManyAndReturn
   */
  export type friend_requestsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the friend_requests
     */
    select?: friend_requestsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the friend_requests
     */
    omit?: friend_requestsOmit<ExtArgs> | null
    /**
     * The data used to create many friend_requests.
     */
    data: friend_requestsCreateManyInput | friend_requestsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * friend_requests update
   */
  export type friend_requestsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the friend_requests
     */
    select?: friend_requestsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the friend_requests
     */
    omit?: friend_requestsOmit<ExtArgs> | null
    /**
     * The data needed to update a friend_requests.
     */
    data: XOR<friend_requestsUpdateInput, friend_requestsUncheckedUpdateInput>
    /**
     * Choose, which friend_requests to update.
     */
    where: friend_requestsWhereUniqueInput
  }

  /**
   * friend_requests updateMany
   */
  export type friend_requestsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update friend_requests.
     */
    data: XOR<friend_requestsUpdateManyMutationInput, friend_requestsUncheckedUpdateManyInput>
    /**
     * Filter which friend_requests to update
     */
    where?: friend_requestsWhereInput
    /**
     * Limit how many friend_requests to update.
     */
    limit?: number
  }

  /**
   * friend_requests updateManyAndReturn
   */
  export type friend_requestsUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the friend_requests
     */
    select?: friend_requestsSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the friend_requests
     */
    omit?: friend_requestsOmit<ExtArgs> | null
    /**
     * The data used to update friend_requests.
     */
    data: XOR<friend_requestsUpdateManyMutationInput, friend_requestsUncheckedUpdateManyInput>
    /**
     * Filter which friend_requests to update
     */
    where?: friend_requestsWhereInput
    /**
     * Limit how many friend_requests to update.
     */
    limit?: number
  }

  /**
   * friend_requests upsert
   */
  export type friend_requestsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the friend_requests
     */
    select?: friend_requestsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the friend_requests
     */
    omit?: friend_requestsOmit<ExtArgs> | null
    /**
     * The filter to search for the friend_requests to update in case it exists.
     */
    where: friend_requestsWhereUniqueInput
    /**
     * In case the friend_requests found by the `where` argument doesn't exist, create a new friend_requests with this data.
     */
    create: XOR<friend_requestsCreateInput, friend_requestsUncheckedCreateInput>
    /**
     * In case the friend_requests was found with the provided `where` argument, update it with this data.
     */
    update: XOR<friend_requestsUpdateInput, friend_requestsUncheckedUpdateInput>
  }

  /**
   * friend_requests delete
   */
  export type friend_requestsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the friend_requests
     */
    select?: friend_requestsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the friend_requests
     */
    omit?: friend_requestsOmit<ExtArgs> | null
    /**
     * Filter which friend_requests to delete.
     */
    where: friend_requestsWhereUniqueInput
  }

  /**
   * friend_requests deleteMany
   */
  export type friend_requestsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which friend_requests to delete
     */
    where?: friend_requestsWhereInput
    /**
     * Limit how many friend_requests to delete.
     */
    limit?: number
  }

  /**
   * friend_requests without action
   */
  export type friend_requestsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the friend_requests
     */
    select?: friend_requestsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the friend_requests
     */
    omit?: friend_requestsOmit<ExtArgs> | null
  }


  /**
   * Model friends
   */

  export type AggregateFriends = {
    _count: FriendsCountAggregateOutputType | null
    _avg: FriendsAvgAggregateOutputType | null
    _sum: FriendsSumAggregateOutputType | null
    _min: FriendsMinAggregateOutputType | null
    _max: FriendsMaxAggregateOutputType | null
  }

  export type FriendsAvgAggregateOutputType = {
    id: number | null
    user_id: number | null
    friend_id: number | null
    created_at: number | null
    is_blocked: number | null
  }

  export type FriendsSumAggregateOutputType = {
    id: bigint | null
    user_id: number | null
    friend_id: number | null
    created_at: bigint | null
    is_blocked: number | null
  }

  export type FriendsMinAggregateOutputType = {
    id: bigint | null
    user_id: number | null
    friend_id: number | null
    created_at: bigint | null
    is_blocked: number | null
  }

  export type FriendsMaxAggregateOutputType = {
    id: bigint | null
    user_id: number | null
    friend_id: number | null
    created_at: bigint | null
    is_blocked: number | null
  }

  export type FriendsCountAggregateOutputType = {
    id: number
    user_id: number
    friend_id: number
    created_at: number
    is_blocked: number
    _all: number
  }


  export type FriendsAvgAggregateInputType = {
    id?: true
    user_id?: true
    friend_id?: true
    created_at?: true
    is_blocked?: true
  }

  export type FriendsSumAggregateInputType = {
    id?: true
    user_id?: true
    friend_id?: true
    created_at?: true
    is_blocked?: true
  }

  export type FriendsMinAggregateInputType = {
    id?: true
    user_id?: true
    friend_id?: true
    created_at?: true
    is_blocked?: true
  }

  export type FriendsMaxAggregateInputType = {
    id?: true
    user_id?: true
    friend_id?: true
    created_at?: true
    is_blocked?: true
  }

  export type FriendsCountAggregateInputType = {
    id?: true
    user_id?: true
    friend_id?: true
    created_at?: true
    is_blocked?: true
    _all?: true
  }

  export type FriendsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which friends to aggregate.
     */
    where?: friendsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of friends to fetch.
     */
    orderBy?: friendsOrderByWithRelationInput | friendsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: friendsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` friends from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` friends.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned friends
    **/
    _count?: true | FriendsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: FriendsAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: FriendsSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: FriendsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: FriendsMaxAggregateInputType
  }

  export type GetFriendsAggregateType<T extends FriendsAggregateArgs> = {
        [P in keyof T & keyof AggregateFriends]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateFriends[P]>
      : GetScalarType<T[P], AggregateFriends[P]>
  }




  export type friendsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: friendsWhereInput
    orderBy?: friendsOrderByWithAggregationInput | friendsOrderByWithAggregationInput[]
    by: FriendsScalarFieldEnum[] | FriendsScalarFieldEnum
    having?: friendsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: FriendsCountAggregateInputType | true
    _avg?: FriendsAvgAggregateInputType
    _sum?: FriendsSumAggregateInputType
    _min?: FriendsMinAggregateInputType
    _max?: FriendsMaxAggregateInputType
  }

  export type FriendsGroupByOutputType = {
    id: bigint
    user_id: number
    friend_id: number
    created_at: bigint
    is_blocked: number | null
    _count: FriendsCountAggregateOutputType | null
    _avg: FriendsAvgAggregateOutputType | null
    _sum: FriendsSumAggregateOutputType | null
    _min: FriendsMinAggregateOutputType | null
    _max: FriendsMaxAggregateOutputType | null
  }

  type GetFriendsGroupByPayload<T extends friendsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<FriendsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof FriendsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], FriendsGroupByOutputType[P]>
            : GetScalarType<T[P], FriendsGroupByOutputType[P]>
        }
      >
    >


  export type friendsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    user_id?: boolean
    friend_id?: boolean
    created_at?: boolean
    is_blocked?: boolean
  }, ExtArgs["result"]["friends"]>

  export type friendsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    user_id?: boolean
    friend_id?: boolean
    created_at?: boolean
    is_blocked?: boolean
  }, ExtArgs["result"]["friends"]>

  export type friendsSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    user_id?: boolean
    friend_id?: boolean
    created_at?: boolean
    is_blocked?: boolean
  }, ExtArgs["result"]["friends"]>

  export type friendsSelectScalar = {
    id?: boolean
    user_id?: boolean
    friend_id?: boolean
    created_at?: boolean
    is_blocked?: boolean
  }

  export type friendsOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "user_id" | "friend_id" | "created_at" | "is_blocked", ExtArgs["result"]["friends"]>

  export type $friendsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "friends"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: bigint
      user_id: number
      friend_id: number
      created_at: bigint
      is_blocked: number | null
    }, ExtArgs["result"]["friends"]>
    composites: {}
  }

  type friendsGetPayload<S extends boolean | null | undefined | friendsDefaultArgs> = $Result.GetResult<Prisma.$friendsPayload, S>

  type friendsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<friendsFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: FriendsCountAggregateInputType | true
    }

  export interface friendsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['friends'], meta: { name: 'friends' } }
    /**
     * Find zero or one Friends that matches the filter.
     * @param {friendsFindUniqueArgs} args - Arguments to find a Friends
     * @example
     * // Get one Friends
     * const friends = await prisma.friends.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends friendsFindUniqueArgs>(args: SelectSubset<T, friendsFindUniqueArgs<ExtArgs>>): Prisma__friendsClient<$Result.GetResult<Prisma.$friendsPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Friends that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {friendsFindUniqueOrThrowArgs} args - Arguments to find a Friends
     * @example
     * // Get one Friends
     * const friends = await prisma.friends.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends friendsFindUniqueOrThrowArgs>(args: SelectSubset<T, friendsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__friendsClient<$Result.GetResult<Prisma.$friendsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Friends that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {friendsFindFirstArgs} args - Arguments to find a Friends
     * @example
     * // Get one Friends
     * const friends = await prisma.friends.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends friendsFindFirstArgs>(args?: SelectSubset<T, friendsFindFirstArgs<ExtArgs>>): Prisma__friendsClient<$Result.GetResult<Prisma.$friendsPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Friends that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {friendsFindFirstOrThrowArgs} args - Arguments to find a Friends
     * @example
     * // Get one Friends
     * const friends = await prisma.friends.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends friendsFindFirstOrThrowArgs>(args?: SelectSubset<T, friendsFindFirstOrThrowArgs<ExtArgs>>): Prisma__friendsClient<$Result.GetResult<Prisma.$friendsPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Friends that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {friendsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Friends
     * const friends = await prisma.friends.findMany()
     * 
     * // Get first 10 Friends
     * const friends = await prisma.friends.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const friendsWithIdOnly = await prisma.friends.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends friendsFindManyArgs>(args?: SelectSubset<T, friendsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$friendsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Friends.
     * @param {friendsCreateArgs} args - Arguments to create a Friends.
     * @example
     * // Create one Friends
     * const Friends = await prisma.friends.create({
     *   data: {
     *     // ... data to create a Friends
     *   }
     * })
     * 
     */
    create<T extends friendsCreateArgs>(args: SelectSubset<T, friendsCreateArgs<ExtArgs>>): Prisma__friendsClient<$Result.GetResult<Prisma.$friendsPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Friends.
     * @param {friendsCreateManyArgs} args - Arguments to create many Friends.
     * @example
     * // Create many Friends
     * const friends = await prisma.friends.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends friendsCreateManyArgs>(args?: SelectSubset<T, friendsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Friends and returns the data saved in the database.
     * @param {friendsCreateManyAndReturnArgs} args - Arguments to create many Friends.
     * @example
     * // Create many Friends
     * const friends = await prisma.friends.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Friends and only return the `id`
     * const friendsWithIdOnly = await prisma.friends.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends friendsCreateManyAndReturnArgs>(args?: SelectSubset<T, friendsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$friendsPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Friends.
     * @param {friendsDeleteArgs} args - Arguments to delete one Friends.
     * @example
     * // Delete one Friends
     * const Friends = await prisma.friends.delete({
     *   where: {
     *     // ... filter to delete one Friends
     *   }
     * })
     * 
     */
    delete<T extends friendsDeleteArgs>(args: SelectSubset<T, friendsDeleteArgs<ExtArgs>>): Prisma__friendsClient<$Result.GetResult<Prisma.$friendsPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Friends.
     * @param {friendsUpdateArgs} args - Arguments to update one Friends.
     * @example
     * // Update one Friends
     * const friends = await prisma.friends.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends friendsUpdateArgs>(args: SelectSubset<T, friendsUpdateArgs<ExtArgs>>): Prisma__friendsClient<$Result.GetResult<Prisma.$friendsPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Friends.
     * @param {friendsDeleteManyArgs} args - Arguments to filter Friends to delete.
     * @example
     * // Delete a few Friends
     * const { count } = await prisma.friends.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends friendsDeleteManyArgs>(args?: SelectSubset<T, friendsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Friends.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {friendsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Friends
     * const friends = await prisma.friends.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends friendsUpdateManyArgs>(args: SelectSubset<T, friendsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Friends and returns the data updated in the database.
     * @param {friendsUpdateManyAndReturnArgs} args - Arguments to update many Friends.
     * @example
     * // Update many Friends
     * const friends = await prisma.friends.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Friends and only return the `id`
     * const friendsWithIdOnly = await prisma.friends.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends friendsUpdateManyAndReturnArgs>(args: SelectSubset<T, friendsUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$friendsPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Friends.
     * @param {friendsUpsertArgs} args - Arguments to update or create a Friends.
     * @example
     * // Update or create a Friends
     * const friends = await prisma.friends.upsert({
     *   create: {
     *     // ... data to create a Friends
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Friends we want to update
     *   }
     * })
     */
    upsert<T extends friendsUpsertArgs>(args: SelectSubset<T, friendsUpsertArgs<ExtArgs>>): Prisma__friendsClient<$Result.GetResult<Prisma.$friendsPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Friends.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {friendsCountArgs} args - Arguments to filter Friends to count.
     * @example
     * // Count the number of Friends
     * const count = await prisma.friends.count({
     *   where: {
     *     // ... the filter for the Friends we want to count
     *   }
     * })
    **/
    count<T extends friendsCountArgs>(
      args?: Subset<T, friendsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], FriendsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Friends.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FriendsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends FriendsAggregateArgs>(args: Subset<T, FriendsAggregateArgs>): Prisma.PrismaPromise<GetFriendsAggregateType<T>>

    /**
     * Group by Friends.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {friendsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends friendsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: friendsGroupByArgs['orderBy'] }
        : { orderBy?: friendsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, friendsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetFriendsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the friends model
   */
  readonly fields: friendsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for friends.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__friendsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the friends model
   */
  interface friendsFieldRefs {
    readonly id: FieldRef<"friends", 'BigInt'>
    readonly user_id: FieldRef<"friends", 'Int'>
    readonly friend_id: FieldRef<"friends", 'Int'>
    readonly created_at: FieldRef<"friends", 'BigInt'>
    readonly is_blocked: FieldRef<"friends", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * friends findUnique
   */
  export type friendsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the friends
     */
    select?: friendsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the friends
     */
    omit?: friendsOmit<ExtArgs> | null
    /**
     * Filter, which friends to fetch.
     */
    where: friendsWhereUniqueInput
  }

  /**
   * friends findUniqueOrThrow
   */
  export type friendsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the friends
     */
    select?: friendsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the friends
     */
    omit?: friendsOmit<ExtArgs> | null
    /**
     * Filter, which friends to fetch.
     */
    where: friendsWhereUniqueInput
  }

  /**
   * friends findFirst
   */
  export type friendsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the friends
     */
    select?: friendsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the friends
     */
    omit?: friendsOmit<ExtArgs> | null
    /**
     * Filter, which friends to fetch.
     */
    where?: friendsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of friends to fetch.
     */
    orderBy?: friendsOrderByWithRelationInput | friendsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for friends.
     */
    cursor?: friendsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` friends from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` friends.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of friends.
     */
    distinct?: FriendsScalarFieldEnum | FriendsScalarFieldEnum[]
  }

  /**
   * friends findFirstOrThrow
   */
  export type friendsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the friends
     */
    select?: friendsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the friends
     */
    omit?: friendsOmit<ExtArgs> | null
    /**
     * Filter, which friends to fetch.
     */
    where?: friendsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of friends to fetch.
     */
    orderBy?: friendsOrderByWithRelationInput | friendsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for friends.
     */
    cursor?: friendsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` friends from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` friends.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of friends.
     */
    distinct?: FriendsScalarFieldEnum | FriendsScalarFieldEnum[]
  }

  /**
   * friends findMany
   */
  export type friendsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the friends
     */
    select?: friendsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the friends
     */
    omit?: friendsOmit<ExtArgs> | null
    /**
     * Filter, which friends to fetch.
     */
    where?: friendsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of friends to fetch.
     */
    orderBy?: friendsOrderByWithRelationInput | friendsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing friends.
     */
    cursor?: friendsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` friends from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` friends.
     */
    skip?: number
    distinct?: FriendsScalarFieldEnum | FriendsScalarFieldEnum[]
  }

  /**
   * friends create
   */
  export type friendsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the friends
     */
    select?: friendsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the friends
     */
    omit?: friendsOmit<ExtArgs> | null
    /**
     * The data needed to create a friends.
     */
    data: XOR<friendsCreateInput, friendsUncheckedCreateInput>
  }

  /**
   * friends createMany
   */
  export type friendsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many friends.
     */
    data: friendsCreateManyInput | friendsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * friends createManyAndReturn
   */
  export type friendsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the friends
     */
    select?: friendsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the friends
     */
    omit?: friendsOmit<ExtArgs> | null
    /**
     * The data used to create many friends.
     */
    data: friendsCreateManyInput | friendsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * friends update
   */
  export type friendsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the friends
     */
    select?: friendsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the friends
     */
    omit?: friendsOmit<ExtArgs> | null
    /**
     * The data needed to update a friends.
     */
    data: XOR<friendsUpdateInput, friendsUncheckedUpdateInput>
    /**
     * Choose, which friends to update.
     */
    where: friendsWhereUniqueInput
  }

  /**
   * friends updateMany
   */
  export type friendsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update friends.
     */
    data: XOR<friendsUpdateManyMutationInput, friendsUncheckedUpdateManyInput>
    /**
     * Filter which friends to update
     */
    where?: friendsWhereInput
    /**
     * Limit how many friends to update.
     */
    limit?: number
  }

  /**
   * friends updateManyAndReturn
   */
  export type friendsUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the friends
     */
    select?: friendsSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the friends
     */
    omit?: friendsOmit<ExtArgs> | null
    /**
     * The data used to update friends.
     */
    data: XOR<friendsUpdateManyMutationInput, friendsUncheckedUpdateManyInput>
    /**
     * Filter which friends to update
     */
    where?: friendsWhereInput
    /**
     * Limit how many friends to update.
     */
    limit?: number
  }

  /**
   * friends upsert
   */
  export type friendsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the friends
     */
    select?: friendsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the friends
     */
    omit?: friendsOmit<ExtArgs> | null
    /**
     * The filter to search for the friends to update in case it exists.
     */
    where: friendsWhereUniqueInput
    /**
     * In case the friends found by the `where` argument doesn't exist, create a new friends with this data.
     */
    create: XOR<friendsCreateInput, friendsUncheckedCreateInput>
    /**
     * In case the friends was found with the provided `where` argument, update it with this data.
     */
    update: XOR<friendsUpdateInput, friendsUncheckedUpdateInput>
  }

  /**
   * friends delete
   */
  export type friendsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the friends
     */
    select?: friendsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the friends
     */
    omit?: friendsOmit<ExtArgs> | null
    /**
     * Filter which friends to delete.
     */
    where: friendsWhereUniqueInput
  }

  /**
   * friends deleteMany
   */
  export type friendsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which friends to delete
     */
    where?: friendsWhereInput
    /**
     * Limit how many friends to delete.
     */
    limit?: number
  }

  /**
   * friends without action
   */
  export type friendsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the friends
     */
    select?: friendsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the friends
     */
    omit?: friendsOmit<ExtArgs> | null
  }


  /**
   * Model group_members
   */

  export type AggregateGroup_members = {
    _count: Group_membersCountAggregateOutputType | null
    _avg: Group_membersAvgAggregateOutputType | null
    _sum: Group_membersSumAggregateOutputType | null
    _min: Group_membersMinAggregateOutputType | null
    _max: Group_membersMaxAggregateOutputType | null
  }

  export type Group_membersAvgAggregateOutputType = {
    id: number | null
    group_id: number | null
    user_id: number | null
    is_muted: number | null
    joined_at: number | null
    last_read_at: number | null
  }

  export type Group_membersSumAggregateOutputType = {
    id: bigint | null
    group_id: number | null
    user_id: number | null
    is_muted: number | null
    joined_at: bigint | null
    last_read_at: bigint | null
  }

  export type Group_membersMinAggregateOutputType = {
    id: bigint | null
    group_id: number | null
    user_id: number | null
    role: string | null
    is_muted: number | null
    joined_at: bigint | null
    last_read_at: bigint | null
  }

  export type Group_membersMaxAggregateOutputType = {
    id: bigint | null
    group_id: number | null
    user_id: number | null
    role: string | null
    is_muted: number | null
    joined_at: bigint | null
    last_read_at: bigint | null
  }

  export type Group_membersCountAggregateOutputType = {
    id: number
    group_id: number
    user_id: number
    role: number
    is_muted: number
    joined_at: number
    last_read_at: number
    _all: number
  }


  export type Group_membersAvgAggregateInputType = {
    id?: true
    group_id?: true
    user_id?: true
    is_muted?: true
    joined_at?: true
    last_read_at?: true
  }

  export type Group_membersSumAggregateInputType = {
    id?: true
    group_id?: true
    user_id?: true
    is_muted?: true
    joined_at?: true
    last_read_at?: true
  }

  export type Group_membersMinAggregateInputType = {
    id?: true
    group_id?: true
    user_id?: true
    role?: true
    is_muted?: true
    joined_at?: true
    last_read_at?: true
  }

  export type Group_membersMaxAggregateInputType = {
    id?: true
    group_id?: true
    user_id?: true
    role?: true
    is_muted?: true
    joined_at?: true
    last_read_at?: true
  }

  export type Group_membersCountAggregateInputType = {
    id?: true
    group_id?: true
    user_id?: true
    role?: true
    is_muted?: true
    joined_at?: true
    last_read_at?: true
    _all?: true
  }

  export type Group_membersAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which group_members to aggregate.
     */
    where?: group_membersWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of group_members to fetch.
     */
    orderBy?: group_membersOrderByWithRelationInput | group_membersOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: group_membersWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` group_members from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` group_members.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned group_members
    **/
    _count?: true | Group_membersCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: Group_membersAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: Group_membersSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: Group_membersMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: Group_membersMaxAggregateInputType
  }

  export type GetGroup_membersAggregateType<T extends Group_membersAggregateArgs> = {
        [P in keyof T & keyof AggregateGroup_members]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateGroup_members[P]>
      : GetScalarType<T[P], AggregateGroup_members[P]>
  }




  export type group_membersGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: group_membersWhereInput
    orderBy?: group_membersOrderByWithAggregationInput | group_membersOrderByWithAggregationInput[]
    by: Group_membersScalarFieldEnum[] | Group_membersScalarFieldEnum
    having?: group_membersScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: Group_membersCountAggregateInputType | true
    _avg?: Group_membersAvgAggregateInputType
    _sum?: Group_membersSumAggregateInputType
    _min?: Group_membersMinAggregateInputType
    _max?: Group_membersMaxAggregateInputType
  }

  export type Group_membersGroupByOutputType = {
    id: bigint
    group_id: number
    user_id: number
    role: string | null
    is_muted: number | null
    joined_at: bigint
    last_read_at: bigint | null
    _count: Group_membersCountAggregateOutputType | null
    _avg: Group_membersAvgAggregateOutputType | null
    _sum: Group_membersSumAggregateOutputType | null
    _min: Group_membersMinAggregateOutputType | null
    _max: Group_membersMaxAggregateOutputType | null
  }

  type GetGroup_membersGroupByPayload<T extends group_membersGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<Group_membersGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof Group_membersGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], Group_membersGroupByOutputType[P]>
            : GetScalarType<T[P], Group_membersGroupByOutputType[P]>
        }
      >
    >


  export type group_membersSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    group_id?: boolean
    user_id?: boolean
    role?: boolean
    is_muted?: boolean
    joined_at?: boolean
    last_read_at?: boolean
  }, ExtArgs["result"]["group_members"]>

  export type group_membersSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    group_id?: boolean
    user_id?: boolean
    role?: boolean
    is_muted?: boolean
    joined_at?: boolean
    last_read_at?: boolean
  }, ExtArgs["result"]["group_members"]>

  export type group_membersSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    group_id?: boolean
    user_id?: boolean
    role?: boolean
    is_muted?: boolean
    joined_at?: boolean
    last_read_at?: boolean
  }, ExtArgs["result"]["group_members"]>

  export type group_membersSelectScalar = {
    id?: boolean
    group_id?: boolean
    user_id?: boolean
    role?: boolean
    is_muted?: boolean
    joined_at?: boolean
    last_read_at?: boolean
  }

  export type group_membersOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "group_id" | "user_id" | "role" | "is_muted" | "joined_at" | "last_read_at", ExtArgs["result"]["group_members"]>

  export type $group_membersPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "group_members"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: bigint
      group_id: number
      user_id: number
      role: string | null
      is_muted: number | null
      joined_at: bigint
      last_read_at: bigint | null
    }, ExtArgs["result"]["group_members"]>
    composites: {}
  }

  type group_membersGetPayload<S extends boolean | null | undefined | group_membersDefaultArgs> = $Result.GetResult<Prisma.$group_membersPayload, S>

  type group_membersCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<group_membersFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: Group_membersCountAggregateInputType | true
    }

  export interface group_membersDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['group_members'], meta: { name: 'group_members' } }
    /**
     * Find zero or one Group_members that matches the filter.
     * @param {group_membersFindUniqueArgs} args - Arguments to find a Group_members
     * @example
     * // Get one Group_members
     * const group_members = await prisma.group_members.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends group_membersFindUniqueArgs>(args: SelectSubset<T, group_membersFindUniqueArgs<ExtArgs>>): Prisma__group_membersClient<$Result.GetResult<Prisma.$group_membersPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Group_members that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {group_membersFindUniqueOrThrowArgs} args - Arguments to find a Group_members
     * @example
     * // Get one Group_members
     * const group_members = await prisma.group_members.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends group_membersFindUniqueOrThrowArgs>(args: SelectSubset<T, group_membersFindUniqueOrThrowArgs<ExtArgs>>): Prisma__group_membersClient<$Result.GetResult<Prisma.$group_membersPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Group_members that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {group_membersFindFirstArgs} args - Arguments to find a Group_members
     * @example
     * // Get one Group_members
     * const group_members = await prisma.group_members.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends group_membersFindFirstArgs>(args?: SelectSubset<T, group_membersFindFirstArgs<ExtArgs>>): Prisma__group_membersClient<$Result.GetResult<Prisma.$group_membersPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Group_members that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {group_membersFindFirstOrThrowArgs} args - Arguments to find a Group_members
     * @example
     * // Get one Group_members
     * const group_members = await prisma.group_members.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends group_membersFindFirstOrThrowArgs>(args?: SelectSubset<T, group_membersFindFirstOrThrowArgs<ExtArgs>>): Prisma__group_membersClient<$Result.GetResult<Prisma.$group_membersPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Group_members that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {group_membersFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Group_members
     * const group_members = await prisma.group_members.findMany()
     * 
     * // Get first 10 Group_members
     * const group_members = await prisma.group_members.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const group_membersWithIdOnly = await prisma.group_members.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends group_membersFindManyArgs>(args?: SelectSubset<T, group_membersFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$group_membersPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Group_members.
     * @param {group_membersCreateArgs} args - Arguments to create a Group_members.
     * @example
     * // Create one Group_members
     * const Group_members = await prisma.group_members.create({
     *   data: {
     *     // ... data to create a Group_members
     *   }
     * })
     * 
     */
    create<T extends group_membersCreateArgs>(args: SelectSubset<T, group_membersCreateArgs<ExtArgs>>): Prisma__group_membersClient<$Result.GetResult<Prisma.$group_membersPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Group_members.
     * @param {group_membersCreateManyArgs} args - Arguments to create many Group_members.
     * @example
     * // Create many Group_members
     * const group_members = await prisma.group_members.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends group_membersCreateManyArgs>(args?: SelectSubset<T, group_membersCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Group_members and returns the data saved in the database.
     * @param {group_membersCreateManyAndReturnArgs} args - Arguments to create many Group_members.
     * @example
     * // Create many Group_members
     * const group_members = await prisma.group_members.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Group_members and only return the `id`
     * const group_membersWithIdOnly = await prisma.group_members.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends group_membersCreateManyAndReturnArgs>(args?: SelectSubset<T, group_membersCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$group_membersPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Group_members.
     * @param {group_membersDeleteArgs} args - Arguments to delete one Group_members.
     * @example
     * // Delete one Group_members
     * const Group_members = await prisma.group_members.delete({
     *   where: {
     *     // ... filter to delete one Group_members
     *   }
     * })
     * 
     */
    delete<T extends group_membersDeleteArgs>(args: SelectSubset<T, group_membersDeleteArgs<ExtArgs>>): Prisma__group_membersClient<$Result.GetResult<Prisma.$group_membersPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Group_members.
     * @param {group_membersUpdateArgs} args - Arguments to update one Group_members.
     * @example
     * // Update one Group_members
     * const group_members = await prisma.group_members.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends group_membersUpdateArgs>(args: SelectSubset<T, group_membersUpdateArgs<ExtArgs>>): Prisma__group_membersClient<$Result.GetResult<Prisma.$group_membersPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Group_members.
     * @param {group_membersDeleteManyArgs} args - Arguments to filter Group_members to delete.
     * @example
     * // Delete a few Group_members
     * const { count } = await prisma.group_members.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends group_membersDeleteManyArgs>(args?: SelectSubset<T, group_membersDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Group_members.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {group_membersUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Group_members
     * const group_members = await prisma.group_members.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends group_membersUpdateManyArgs>(args: SelectSubset<T, group_membersUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Group_members and returns the data updated in the database.
     * @param {group_membersUpdateManyAndReturnArgs} args - Arguments to update many Group_members.
     * @example
     * // Update many Group_members
     * const group_members = await prisma.group_members.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Group_members and only return the `id`
     * const group_membersWithIdOnly = await prisma.group_members.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends group_membersUpdateManyAndReturnArgs>(args: SelectSubset<T, group_membersUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$group_membersPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Group_members.
     * @param {group_membersUpsertArgs} args - Arguments to update or create a Group_members.
     * @example
     * // Update or create a Group_members
     * const group_members = await prisma.group_members.upsert({
     *   create: {
     *     // ... data to create a Group_members
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Group_members we want to update
     *   }
     * })
     */
    upsert<T extends group_membersUpsertArgs>(args: SelectSubset<T, group_membersUpsertArgs<ExtArgs>>): Prisma__group_membersClient<$Result.GetResult<Prisma.$group_membersPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Group_members.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {group_membersCountArgs} args - Arguments to filter Group_members to count.
     * @example
     * // Count the number of Group_members
     * const count = await prisma.group_members.count({
     *   where: {
     *     // ... the filter for the Group_members we want to count
     *   }
     * })
    **/
    count<T extends group_membersCountArgs>(
      args?: Subset<T, group_membersCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], Group_membersCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Group_members.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Group_membersAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends Group_membersAggregateArgs>(args: Subset<T, Group_membersAggregateArgs>): Prisma.PrismaPromise<GetGroup_membersAggregateType<T>>

    /**
     * Group by Group_members.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {group_membersGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends group_membersGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: group_membersGroupByArgs['orderBy'] }
        : { orderBy?: group_membersGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, group_membersGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetGroup_membersGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the group_members model
   */
  readonly fields: group_membersFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for group_members.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__group_membersClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the group_members model
   */
  interface group_membersFieldRefs {
    readonly id: FieldRef<"group_members", 'BigInt'>
    readonly group_id: FieldRef<"group_members", 'Int'>
    readonly user_id: FieldRef<"group_members", 'Int'>
    readonly role: FieldRef<"group_members", 'String'>
    readonly is_muted: FieldRef<"group_members", 'Int'>
    readonly joined_at: FieldRef<"group_members", 'BigInt'>
    readonly last_read_at: FieldRef<"group_members", 'BigInt'>
  }
    

  // Custom InputTypes
  /**
   * group_members findUnique
   */
  export type group_membersFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the group_members
     */
    select?: group_membersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the group_members
     */
    omit?: group_membersOmit<ExtArgs> | null
    /**
     * Filter, which group_members to fetch.
     */
    where: group_membersWhereUniqueInput
  }

  /**
   * group_members findUniqueOrThrow
   */
  export type group_membersFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the group_members
     */
    select?: group_membersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the group_members
     */
    omit?: group_membersOmit<ExtArgs> | null
    /**
     * Filter, which group_members to fetch.
     */
    where: group_membersWhereUniqueInput
  }

  /**
   * group_members findFirst
   */
  export type group_membersFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the group_members
     */
    select?: group_membersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the group_members
     */
    omit?: group_membersOmit<ExtArgs> | null
    /**
     * Filter, which group_members to fetch.
     */
    where?: group_membersWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of group_members to fetch.
     */
    orderBy?: group_membersOrderByWithRelationInput | group_membersOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for group_members.
     */
    cursor?: group_membersWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` group_members from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` group_members.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of group_members.
     */
    distinct?: Group_membersScalarFieldEnum | Group_membersScalarFieldEnum[]
  }

  /**
   * group_members findFirstOrThrow
   */
  export type group_membersFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the group_members
     */
    select?: group_membersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the group_members
     */
    omit?: group_membersOmit<ExtArgs> | null
    /**
     * Filter, which group_members to fetch.
     */
    where?: group_membersWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of group_members to fetch.
     */
    orderBy?: group_membersOrderByWithRelationInput | group_membersOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for group_members.
     */
    cursor?: group_membersWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` group_members from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` group_members.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of group_members.
     */
    distinct?: Group_membersScalarFieldEnum | Group_membersScalarFieldEnum[]
  }

  /**
   * group_members findMany
   */
  export type group_membersFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the group_members
     */
    select?: group_membersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the group_members
     */
    omit?: group_membersOmit<ExtArgs> | null
    /**
     * Filter, which group_members to fetch.
     */
    where?: group_membersWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of group_members to fetch.
     */
    orderBy?: group_membersOrderByWithRelationInput | group_membersOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing group_members.
     */
    cursor?: group_membersWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` group_members from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` group_members.
     */
    skip?: number
    distinct?: Group_membersScalarFieldEnum | Group_membersScalarFieldEnum[]
  }

  /**
   * group_members create
   */
  export type group_membersCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the group_members
     */
    select?: group_membersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the group_members
     */
    omit?: group_membersOmit<ExtArgs> | null
    /**
     * The data needed to create a group_members.
     */
    data: XOR<group_membersCreateInput, group_membersUncheckedCreateInput>
  }

  /**
   * group_members createMany
   */
  export type group_membersCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many group_members.
     */
    data: group_membersCreateManyInput | group_membersCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * group_members createManyAndReturn
   */
  export type group_membersCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the group_members
     */
    select?: group_membersSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the group_members
     */
    omit?: group_membersOmit<ExtArgs> | null
    /**
     * The data used to create many group_members.
     */
    data: group_membersCreateManyInput | group_membersCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * group_members update
   */
  export type group_membersUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the group_members
     */
    select?: group_membersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the group_members
     */
    omit?: group_membersOmit<ExtArgs> | null
    /**
     * The data needed to update a group_members.
     */
    data: XOR<group_membersUpdateInput, group_membersUncheckedUpdateInput>
    /**
     * Choose, which group_members to update.
     */
    where: group_membersWhereUniqueInput
  }

  /**
   * group_members updateMany
   */
  export type group_membersUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update group_members.
     */
    data: XOR<group_membersUpdateManyMutationInput, group_membersUncheckedUpdateManyInput>
    /**
     * Filter which group_members to update
     */
    where?: group_membersWhereInput
    /**
     * Limit how many group_members to update.
     */
    limit?: number
  }

  /**
   * group_members updateManyAndReturn
   */
  export type group_membersUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the group_members
     */
    select?: group_membersSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the group_members
     */
    omit?: group_membersOmit<ExtArgs> | null
    /**
     * The data used to update group_members.
     */
    data: XOR<group_membersUpdateManyMutationInput, group_membersUncheckedUpdateManyInput>
    /**
     * Filter which group_members to update
     */
    where?: group_membersWhereInput
    /**
     * Limit how many group_members to update.
     */
    limit?: number
  }

  /**
   * group_members upsert
   */
  export type group_membersUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the group_members
     */
    select?: group_membersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the group_members
     */
    omit?: group_membersOmit<ExtArgs> | null
    /**
     * The filter to search for the group_members to update in case it exists.
     */
    where: group_membersWhereUniqueInput
    /**
     * In case the group_members found by the `where` argument doesn't exist, create a new group_members with this data.
     */
    create: XOR<group_membersCreateInput, group_membersUncheckedCreateInput>
    /**
     * In case the group_members was found with the provided `where` argument, update it with this data.
     */
    update: XOR<group_membersUpdateInput, group_membersUncheckedUpdateInput>
  }

  /**
   * group_members delete
   */
  export type group_membersDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the group_members
     */
    select?: group_membersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the group_members
     */
    omit?: group_membersOmit<ExtArgs> | null
    /**
     * Filter which group_members to delete.
     */
    where: group_membersWhereUniqueInput
  }

  /**
   * group_members deleteMany
   */
  export type group_membersDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which group_members to delete
     */
    where?: group_membersWhereInput
    /**
     * Limit how many group_members to delete.
     */
    limit?: number
  }

  /**
   * group_members without action
   */
  export type group_membersDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the group_members
     */
    select?: group_membersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the group_members
     */
    omit?: group_membersOmit<ExtArgs> | null
  }


  /**
   * Model groups
   */

  export type AggregateGroups = {
    _count: GroupsCountAggregateOutputType | null
    _avg: GroupsAvgAggregateOutputType | null
    _sum: GroupsSumAggregateOutputType | null
    _min: GroupsMinAggregateOutputType | null
    _max: GroupsMaxAggregateOutputType | null
  }

  export type GroupsAvgAggregateOutputType = {
    id: number | null
    owner_id: number | null
    created_at: number | null
  }

  export type GroupsSumAggregateOutputType = {
    id: bigint | null
    owner_id: number | null
    created_at: bigint | null
  }

  export type GroupsMinAggregateOutputType = {
    id: bigint | null
    name: string | null
    owner_id: number | null
    avatar_url: string | null
    created_at: bigint | null
  }

  export type GroupsMaxAggregateOutputType = {
    id: bigint | null
    name: string | null
    owner_id: number | null
    avatar_url: string | null
    created_at: bigint | null
  }

  export type GroupsCountAggregateOutputType = {
    id: number
    name: number
    owner_id: number
    avatar_url: number
    created_at: number
    _all: number
  }


  export type GroupsAvgAggregateInputType = {
    id?: true
    owner_id?: true
    created_at?: true
  }

  export type GroupsSumAggregateInputType = {
    id?: true
    owner_id?: true
    created_at?: true
  }

  export type GroupsMinAggregateInputType = {
    id?: true
    name?: true
    owner_id?: true
    avatar_url?: true
    created_at?: true
  }

  export type GroupsMaxAggregateInputType = {
    id?: true
    name?: true
    owner_id?: true
    avatar_url?: true
    created_at?: true
  }

  export type GroupsCountAggregateInputType = {
    id?: true
    name?: true
    owner_id?: true
    avatar_url?: true
    created_at?: true
    _all?: true
  }

  export type GroupsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which groups to aggregate.
     */
    where?: groupsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of groups to fetch.
     */
    orderBy?: groupsOrderByWithRelationInput | groupsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: groupsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` groups from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` groups.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned groups
    **/
    _count?: true | GroupsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: GroupsAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: GroupsSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: GroupsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: GroupsMaxAggregateInputType
  }

  export type GetGroupsAggregateType<T extends GroupsAggregateArgs> = {
        [P in keyof T & keyof AggregateGroups]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateGroups[P]>
      : GetScalarType<T[P], AggregateGroups[P]>
  }




  export type groupsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: groupsWhereInput
    orderBy?: groupsOrderByWithAggregationInput | groupsOrderByWithAggregationInput[]
    by: GroupsScalarFieldEnum[] | GroupsScalarFieldEnum
    having?: groupsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: GroupsCountAggregateInputType | true
    _avg?: GroupsAvgAggregateInputType
    _sum?: GroupsSumAggregateInputType
    _min?: GroupsMinAggregateInputType
    _max?: GroupsMaxAggregateInputType
  }

  export type GroupsGroupByOutputType = {
    id: bigint
    name: string
    owner_id: number
    avatar_url: string | null
    created_at: bigint
    _count: GroupsCountAggregateOutputType | null
    _avg: GroupsAvgAggregateOutputType | null
    _sum: GroupsSumAggregateOutputType | null
    _min: GroupsMinAggregateOutputType | null
    _max: GroupsMaxAggregateOutputType | null
  }

  type GetGroupsGroupByPayload<T extends groupsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<GroupsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof GroupsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], GroupsGroupByOutputType[P]>
            : GetScalarType<T[P], GroupsGroupByOutputType[P]>
        }
      >
    >


  export type groupsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    owner_id?: boolean
    avatar_url?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["groups"]>

  export type groupsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    owner_id?: boolean
    avatar_url?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["groups"]>

  export type groupsSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    owner_id?: boolean
    avatar_url?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["groups"]>

  export type groupsSelectScalar = {
    id?: boolean
    name?: boolean
    owner_id?: boolean
    avatar_url?: boolean
    created_at?: boolean
  }

  export type groupsOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "owner_id" | "avatar_url" | "created_at", ExtArgs["result"]["groups"]>

  export type $groupsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "groups"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: bigint
      name: string
      owner_id: number
      avatar_url: string | null
      created_at: bigint
    }, ExtArgs["result"]["groups"]>
    composites: {}
  }

  type groupsGetPayload<S extends boolean | null | undefined | groupsDefaultArgs> = $Result.GetResult<Prisma.$groupsPayload, S>

  type groupsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<groupsFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: GroupsCountAggregateInputType | true
    }

  export interface groupsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['groups'], meta: { name: 'groups' } }
    /**
     * Find zero or one Groups that matches the filter.
     * @param {groupsFindUniqueArgs} args - Arguments to find a Groups
     * @example
     * // Get one Groups
     * const groups = await prisma.groups.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends groupsFindUniqueArgs>(args: SelectSubset<T, groupsFindUniqueArgs<ExtArgs>>): Prisma__groupsClient<$Result.GetResult<Prisma.$groupsPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Groups that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {groupsFindUniqueOrThrowArgs} args - Arguments to find a Groups
     * @example
     * // Get one Groups
     * const groups = await prisma.groups.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends groupsFindUniqueOrThrowArgs>(args: SelectSubset<T, groupsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__groupsClient<$Result.GetResult<Prisma.$groupsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Groups that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {groupsFindFirstArgs} args - Arguments to find a Groups
     * @example
     * // Get one Groups
     * const groups = await prisma.groups.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends groupsFindFirstArgs>(args?: SelectSubset<T, groupsFindFirstArgs<ExtArgs>>): Prisma__groupsClient<$Result.GetResult<Prisma.$groupsPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Groups that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {groupsFindFirstOrThrowArgs} args - Arguments to find a Groups
     * @example
     * // Get one Groups
     * const groups = await prisma.groups.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends groupsFindFirstOrThrowArgs>(args?: SelectSubset<T, groupsFindFirstOrThrowArgs<ExtArgs>>): Prisma__groupsClient<$Result.GetResult<Prisma.$groupsPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Groups that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {groupsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Groups
     * const groups = await prisma.groups.findMany()
     * 
     * // Get first 10 Groups
     * const groups = await prisma.groups.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const groupsWithIdOnly = await prisma.groups.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends groupsFindManyArgs>(args?: SelectSubset<T, groupsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$groupsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Groups.
     * @param {groupsCreateArgs} args - Arguments to create a Groups.
     * @example
     * // Create one Groups
     * const Groups = await prisma.groups.create({
     *   data: {
     *     // ... data to create a Groups
     *   }
     * })
     * 
     */
    create<T extends groupsCreateArgs>(args: SelectSubset<T, groupsCreateArgs<ExtArgs>>): Prisma__groupsClient<$Result.GetResult<Prisma.$groupsPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Groups.
     * @param {groupsCreateManyArgs} args - Arguments to create many Groups.
     * @example
     * // Create many Groups
     * const groups = await prisma.groups.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends groupsCreateManyArgs>(args?: SelectSubset<T, groupsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Groups and returns the data saved in the database.
     * @param {groupsCreateManyAndReturnArgs} args - Arguments to create many Groups.
     * @example
     * // Create many Groups
     * const groups = await prisma.groups.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Groups and only return the `id`
     * const groupsWithIdOnly = await prisma.groups.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends groupsCreateManyAndReturnArgs>(args?: SelectSubset<T, groupsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$groupsPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Groups.
     * @param {groupsDeleteArgs} args - Arguments to delete one Groups.
     * @example
     * // Delete one Groups
     * const Groups = await prisma.groups.delete({
     *   where: {
     *     // ... filter to delete one Groups
     *   }
     * })
     * 
     */
    delete<T extends groupsDeleteArgs>(args: SelectSubset<T, groupsDeleteArgs<ExtArgs>>): Prisma__groupsClient<$Result.GetResult<Prisma.$groupsPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Groups.
     * @param {groupsUpdateArgs} args - Arguments to update one Groups.
     * @example
     * // Update one Groups
     * const groups = await prisma.groups.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends groupsUpdateArgs>(args: SelectSubset<T, groupsUpdateArgs<ExtArgs>>): Prisma__groupsClient<$Result.GetResult<Prisma.$groupsPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Groups.
     * @param {groupsDeleteManyArgs} args - Arguments to filter Groups to delete.
     * @example
     * // Delete a few Groups
     * const { count } = await prisma.groups.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends groupsDeleteManyArgs>(args?: SelectSubset<T, groupsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Groups.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {groupsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Groups
     * const groups = await prisma.groups.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends groupsUpdateManyArgs>(args: SelectSubset<T, groupsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Groups and returns the data updated in the database.
     * @param {groupsUpdateManyAndReturnArgs} args - Arguments to update many Groups.
     * @example
     * // Update many Groups
     * const groups = await prisma.groups.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Groups and only return the `id`
     * const groupsWithIdOnly = await prisma.groups.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends groupsUpdateManyAndReturnArgs>(args: SelectSubset<T, groupsUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$groupsPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Groups.
     * @param {groupsUpsertArgs} args - Arguments to update or create a Groups.
     * @example
     * // Update or create a Groups
     * const groups = await prisma.groups.upsert({
     *   create: {
     *     // ... data to create a Groups
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Groups we want to update
     *   }
     * })
     */
    upsert<T extends groupsUpsertArgs>(args: SelectSubset<T, groupsUpsertArgs<ExtArgs>>): Prisma__groupsClient<$Result.GetResult<Prisma.$groupsPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Groups.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {groupsCountArgs} args - Arguments to filter Groups to count.
     * @example
     * // Count the number of Groups
     * const count = await prisma.groups.count({
     *   where: {
     *     // ... the filter for the Groups we want to count
     *   }
     * })
    **/
    count<T extends groupsCountArgs>(
      args?: Subset<T, groupsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], GroupsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Groups.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {GroupsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends GroupsAggregateArgs>(args: Subset<T, GroupsAggregateArgs>): Prisma.PrismaPromise<GetGroupsAggregateType<T>>

    /**
     * Group by Groups.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {groupsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends groupsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: groupsGroupByArgs['orderBy'] }
        : { orderBy?: groupsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, groupsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetGroupsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the groups model
   */
  readonly fields: groupsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for groups.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__groupsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the groups model
   */
  interface groupsFieldRefs {
    readonly id: FieldRef<"groups", 'BigInt'>
    readonly name: FieldRef<"groups", 'String'>
    readonly owner_id: FieldRef<"groups", 'Int'>
    readonly avatar_url: FieldRef<"groups", 'String'>
    readonly created_at: FieldRef<"groups", 'BigInt'>
  }
    

  // Custom InputTypes
  /**
   * groups findUnique
   */
  export type groupsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the groups
     */
    select?: groupsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the groups
     */
    omit?: groupsOmit<ExtArgs> | null
    /**
     * Filter, which groups to fetch.
     */
    where: groupsWhereUniqueInput
  }

  /**
   * groups findUniqueOrThrow
   */
  export type groupsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the groups
     */
    select?: groupsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the groups
     */
    omit?: groupsOmit<ExtArgs> | null
    /**
     * Filter, which groups to fetch.
     */
    where: groupsWhereUniqueInput
  }

  /**
   * groups findFirst
   */
  export type groupsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the groups
     */
    select?: groupsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the groups
     */
    omit?: groupsOmit<ExtArgs> | null
    /**
     * Filter, which groups to fetch.
     */
    where?: groupsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of groups to fetch.
     */
    orderBy?: groupsOrderByWithRelationInput | groupsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for groups.
     */
    cursor?: groupsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` groups from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` groups.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of groups.
     */
    distinct?: GroupsScalarFieldEnum | GroupsScalarFieldEnum[]
  }

  /**
   * groups findFirstOrThrow
   */
  export type groupsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the groups
     */
    select?: groupsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the groups
     */
    omit?: groupsOmit<ExtArgs> | null
    /**
     * Filter, which groups to fetch.
     */
    where?: groupsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of groups to fetch.
     */
    orderBy?: groupsOrderByWithRelationInput | groupsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for groups.
     */
    cursor?: groupsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` groups from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` groups.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of groups.
     */
    distinct?: GroupsScalarFieldEnum | GroupsScalarFieldEnum[]
  }

  /**
   * groups findMany
   */
  export type groupsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the groups
     */
    select?: groupsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the groups
     */
    omit?: groupsOmit<ExtArgs> | null
    /**
     * Filter, which groups to fetch.
     */
    where?: groupsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of groups to fetch.
     */
    orderBy?: groupsOrderByWithRelationInput | groupsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing groups.
     */
    cursor?: groupsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` groups from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` groups.
     */
    skip?: number
    distinct?: GroupsScalarFieldEnum | GroupsScalarFieldEnum[]
  }

  /**
   * groups create
   */
  export type groupsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the groups
     */
    select?: groupsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the groups
     */
    omit?: groupsOmit<ExtArgs> | null
    /**
     * The data needed to create a groups.
     */
    data: XOR<groupsCreateInput, groupsUncheckedCreateInput>
  }

  /**
   * groups createMany
   */
  export type groupsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many groups.
     */
    data: groupsCreateManyInput | groupsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * groups createManyAndReturn
   */
  export type groupsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the groups
     */
    select?: groupsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the groups
     */
    omit?: groupsOmit<ExtArgs> | null
    /**
     * The data used to create many groups.
     */
    data: groupsCreateManyInput | groupsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * groups update
   */
  export type groupsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the groups
     */
    select?: groupsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the groups
     */
    omit?: groupsOmit<ExtArgs> | null
    /**
     * The data needed to update a groups.
     */
    data: XOR<groupsUpdateInput, groupsUncheckedUpdateInput>
    /**
     * Choose, which groups to update.
     */
    where: groupsWhereUniqueInput
  }

  /**
   * groups updateMany
   */
  export type groupsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update groups.
     */
    data: XOR<groupsUpdateManyMutationInput, groupsUncheckedUpdateManyInput>
    /**
     * Filter which groups to update
     */
    where?: groupsWhereInput
    /**
     * Limit how many groups to update.
     */
    limit?: number
  }

  /**
   * groups updateManyAndReturn
   */
  export type groupsUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the groups
     */
    select?: groupsSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the groups
     */
    omit?: groupsOmit<ExtArgs> | null
    /**
     * The data used to update groups.
     */
    data: XOR<groupsUpdateManyMutationInput, groupsUncheckedUpdateManyInput>
    /**
     * Filter which groups to update
     */
    where?: groupsWhereInput
    /**
     * Limit how many groups to update.
     */
    limit?: number
  }

  /**
   * groups upsert
   */
  export type groupsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the groups
     */
    select?: groupsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the groups
     */
    omit?: groupsOmit<ExtArgs> | null
    /**
     * The filter to search for the groups to update in case it exists.
     */
    where: groupsWhereUniqueInput
    /**
     * In case the groups found by the `where` argument doesn't exist, create a new groups with this data.
     */
    create: XOR<groupsCreateInput, groupsUncheckedCreateInput>
    /**
     * In case the groups was found with the provided `where` argument, update it with this data.
     */
    update: XOR<groupsUpdateInput, groupsUncheckedUpdateInput>
  }

  /**
   * groups delete
   */
  export type groupsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the groups
     */
    select?: groupsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the groups
     */
    omit?: groupsOmit<ExtArgs> | null
    /**
     * Filter which groups to delete.
     */
    where: groupsWhereUniqueInput
  }

  /**
   * groups deleteMany
   */
  export type groupsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which groups to delete
     */
    where?: groupsWhereInput
    /**
     * Limit how many groups to delete.
     */
    limit?: number
  }

  /**
   * groups without action
   */
  export type groupsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the groups
     */
    select?: groupsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the groups
     */
    omit?: groupsOmit<ExtArgs> | null
  }


  /**
   * Model login_logs
   */

  export type AggregateLogin_logs = {
    _count: Login_logsCountAggregateOutputType | null
    _avg: Login_logsAvgAggregateOutputType | null
    _sum: Login_logsSumAggregateOutputType | null
    _min: Login_logsMinAggregateOutputType | null
    _max: Login_logsMaxAggregateOutputType | null
  }

  export type Login_logsAvgAggregateOutputType = {
    id: number | null
    user_id: number | null
    created_at: number | null
  }

  export type Login_logsSumAggregateOutputType = {
    id: bigint | null
    user_id: number | null
    created_at: bigint | null
  }

  export type Login_logsMinAggregateOutputType = {
    id: bigint | null
    user_id: number | null
    ip: string | null
    country: string | null
    region: string | null
    city: string | null
    user_agent: string | null
    device_type: string | null
    created_at: bigint | null
  }

  export type Login_logsMaxAggregateOutputType = {
    id: bigint | null
    user_id: number | null
    ip: string | null
    country: string | null
    region: string | null
    city: string | null
    user_agent: string | null
    device_type: string | null
    created_at: bigint | null
  }

  export type Login_logsCountAggregateOutputType = {
    id: number
    user_id: number
    ip: number
    country: number
    region: number
    city: number
    user_agent: number
    device_type: number
    created_at: number
    _all: number
  }


  export type Login_logsAvgAggregateInputType = {
    id?: true
    user_id?: true
    created_at?: true
  }

  export type Login_logsSumAggregateInputType = {
    id?: true
    user_id?: true
    created_at?: true
  }

  export type Login_logsMinAggregateInputType = {
    id?: true
    user_id?: true
    ip?: true
    country?: true
    region?: true
    city?: true
    user_agent?: true
    device_type?: true
    created_at?: true
  }

  export type Login_logsMaxAggregateInputType = {
    id?: true
    user_id?: true
    ip?: true
    country?: true
    region?: true
    city?: true
    user_agent?: true
    device_type?: true
    created_at?: true
  }

  export type Login_logsCountAggregateInputType = {
    id?: true
    user_id?: true
    ip?: true
    country?: true
    region?: true
    city?: true
    user_agent?: true
    device_type?: true
    created_at?: true
    _all?: true
  }

  export type Login_logsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which login_logs to aggregate.
     */
    where?: login_logsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of login_logs to fetch.
     */
    orderBy?: login_logsOrderByWithRelationInput | login_logsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: login_logsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` login_logs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` login_logs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned login_logs
    **/
    _count?: true | Login_logsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: Login_logsAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: Login_logsSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: Login_logsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: Login_logsMaxAggregateInputType
  }

  export type GetLogin_logsAggregateType<T extends Login_logsAggregateArgs> = {
        [P in keyof T & keyof AggregateLogin_logs]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateLogin_logs[P]>
      : GetScalarType<T[P], AggregateLogin_logs[P]>
  }




  export type login_logsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: login_logsWhereInput
    orderBy?: login_logsOrderByWithAggregationInput | login_logsOrderByWithAggregationInput[]
    by: Login_logsScalarFieldEnum[] | Login_logsScalarFieldEnum
    having?: login_logsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: Login_logsCountAggregateInputType | true
    _avg?: Login_logsAvgAggregateInputType
    _sum?: Login_logsSumAggregateInputType
    _min?: Login_logsMinAggregateInputType
    _max?: Login_logsMaxAggregateInputType
  }

  export type Login_logsGroupByOutputType = {
    id: bigint
    user_id: number
    ip: string
    country: string | null
    region: string | null
    city: string | null
    user_agent: string | null
    device_type: string | null
    created_at: bigint
    _count: Login_logsCountAggregateOutputType | null
    _avg: Login_logsAvgAggregateOutputType | null
    _sum: Login_logsSumAggregateOutputType | null
    _min: Login_logsMinAggregateOutputType | null
    _max: Login_logsMaxAggregateOutputType | null
  }

  type GetLogin_logsGroupByPayload<T extends login_logsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<Login_logsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof Login_logsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], Login_logsGroupByOutputType[P]>
            : GetScalarType<T[P], Login_logsGroupByOutputType[P]>
        }
      >
    >


  export type login_logsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    user_id?: boolean
    ip?: boolean
    country?: boolean
    region?: boolean
    city?: boolean
    user_agent?: boolean
    device_type?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["login_logs"]>

  export type login_logsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    user_id?: boolean
    ip?: boolean
    country?: boolean
    region?: boolean
    city?: boolean
    user_agent?: boolean
    device_type?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["login_logs"]>

  export type login_logsSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    user_id?: boolean
    ip?: boolean
    country?: boolean
    region?: boolean
    city?: boolean
    user_agent?: boolean
    device_type?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["login_logs"]>

  export type login_logsSelectScalar = {
    id?: boolean
    user_id?: boolean
    ip?: boolean
    country?: boolean
    region?: boolean
    city?: boolean
    user_agent?: boolean
    device_type?: boolean
    created_at?: boolean
  }

  export type login_logsOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "user_id" | "ip" | "country" | "region" | "city" | "user_agent" | "device_type" | "created_at", ExtArgs["result"]["login_logs"]>

  export type $login_logsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "login_logs"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: bigint
      user_id: number
      ip: string
      country: string | null
      region: string | null
      city: string | null
      user_agent: string | null
      device_type: string | null
      created_at: bigint
    }, ExtArgs["result"]["login_logs"]>
    composites: {}
  }

  type login_logsGetPayload<S extends boolean | null | undefined | login_logsDefaultArgs> = $Result.GetResult<Prisma.$login_logsPayload, S>

  type login_logsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<login_logsFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: Login_logsCountAggregateInputType | true
    }

  export interface login_logsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['login_logs'], meta: { name: 'login_logs' } }
    /**
     * Find zero or one Login_logs that matches the filter.
     * @param {login_logsFindUniqueArgs} args - Arguments to find a Login_logs
     * @example
     * // Get one Login_logs
     * const login_logs = await prisma.login_logs.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends login_logsFindUniqueArgs>(args: SelectSubset<T, login_logsFindUniqueArgs<ExtArgs>>): Prisma__login_logsClient<$Result.GetResult<Prisma.$login_logsPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Login_logs that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {login_logsFindUniqueOrThrowArgs} args - Arguments to find a Login_logs
     * @example
     * // Get one Login_logs
     * const login_logs = await prisma.login_logs.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends login_logsFindUniqueOrThrowArgs>(args: SelectSubset<T, login_logsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__login_logsClient<$Result.GetResult<Prisma.$login_logsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Login_logs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {login_logsFindFirstArgs} args - Arguments to find a Login_logs
     * @example
     * // Get one Login_logs
     * const login_logs = await prisma.login_logs.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends login_logsFindFirstArgs>(args?: SelectSubset<T, login_logsFindFirstArgs<ExtArgs>>): Prisma__login_logsClient<$Result.GetResult<Prisma.$login_logsPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Login_logs that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {login_logsFindFirstOrThrowArgs} args - Arguments to find a Login_logs
     * @example
     * // Get one Login_logs
     * const login_logs = await prisma.login_logs.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends login_logsFindFirstOrThrowArgs>(args?: SelectSubset<T, login_logsFindFirstOrThrowArgs<ExtArgs>>): Prisma__login_logsClient<$Result.GetResult<Prisma.$login_logsPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Login_logs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {login_logsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Login_logs
     * const login_logs = await prisma.login_logs.findMany()
     * 
     * // Get first 10 Login_logs
     * const login_logs = await prisma.login_logs.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const login_logsWithIdOnly = await prisma.login_logs.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends login_logsFindManyArgs>(args?: SelectSubset<T, login_logsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$login_logsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Login_logs.
     * @param {login_logsCreateArgs} args - Arguments to create a Login_logs.
     * @example
     * // Create one Login_logs
     * const Login_logs = await prisma.login_logs.create({
     *   data: {
     *     // ... data to create a Login_logs
     *   }
     * })
     * 
     */
    create<T extends login_logsCreateArgs>(args: SelectSubset<T, login_logsCreateArgs<ExtArgs>>): Prisma__login_logsClient<$Result.GetResult<Prisma.$login_logsPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Login_logs.
     * @param {login_logsCreateManyArgs} args - Arguments to create many Login_logs.
     * @example
     * // Create many Login_logs
     * const login_logs = await prisma.login_logs.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends login_logsCreateManyArgs>(args?: SelectSubset<T, login_logsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Login_logs and returns the data saved in the database.
     * @param {login_logsCreateManyAndReturnArgs} args - Arguments to create many Login_logs.
     * @example
     * // Create many Login_logs
     * const login_logs = await prisma.login_logs.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Login_logs and only return the `id`
     * const login_logsWithIdOnly = await prisma.login_logs.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends login_logsCreateManyAndReturnArgs>(args?: SelectSubset<T, login_logsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$login_logsPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Login_logs.
     * @param {login_logsDeleteArgs} args - Arguments to delete one Login_logs.
     * @example
     * // Delete one Login_logs
     * const Login_logs = await prisma.login_logs.delete({
     *   where: {
     *     // ... filter to delete one Login_logs
     *   }
     * })
     * 
     */
    delete<T extends login_logsDeleteArgs>(args: SelectSubset<T, login_logsDeleteArgs<ExtArgs>>): Prisma__login_logsClient<$Result.GetResult<Prisma.$login_logsPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Login_logs.
     * @param {login_logsUpdateArgs} args - Arguments to update one Login_logs.
     * @example
     * // Update one Login_logs
     * const login_logs = await prisma.login_logs.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends login_logsUpdateArgs>(args: SelectSubset<T, login_logsUpdateArgs<ExtArgs>>): Prisma__login_logsClient<$Result.GetResult<Prisma.$login_logsPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Login_logs.
     * @param {login_logsDeleteManyArgs} args - Arguments to filter Login_logs to delete.
     * @example
     * // Delete a few Login_logs
     * const { count } = await prisma.login_logs.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends login_logsDeleteManyArgs>(args?: SelectSubset<T, login_logsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Login_logs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {login_logsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Login_logs
     * const login_logs = await prisma.login_logs.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends login_logsUpdateManyArgs>(args: SelectSubset<T, login_logsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Login_logs and returns the data updated in the database.
     * @param {login_logsUpdateManyAndReturnArgs} args - Arguments to update many Login_logs.
     * @example
     * // Update many Login_logs
     * const login_logs = await prisma.login_logs.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Login_logs and only return the `id`
     * const login_logsWithIdOnly = await prisma.login_logs.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends login_logsUpdateManyAndReturnArgs>(args: SelectSubset<T, login_logsUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$login_logsPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Login_logs.
     * @param {login_logsUpsertArgs} args - Arguments to update or create a Login_logs.
     * @example
     * // Update or create a Login_logs
     * const login_logs = await prisma.login_logs.upsert({
     *   create: {
     *     // ... data to create a Login_logs
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Login_logs we want to update
     *   }
     * })
     */
    upsert<T extends login_logsUpsertArgs>(args: SelectSubset<T, login_logsUpsertArgs<ExtArgs>>): Prisma__login_logsClient<$Result.GetResult<Prisma.$login_logsPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Login_logs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {login_logsCountArgs} args - Arguments to filter Login_logs to count.
     * @example
     * // Count the number of Login_logs
     * const count = await prisma.login_logs.count({
     *   where: {
     *     // ... the filter for the Login_logs we want to count
     *   }
     * })
    **/
    count<T extends login_logsCountArgs>(
      args?: Subset<T, login_logsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], Login_logsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Login_logs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Login_logsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends Login_logsAggregateArgs>(args: Subset<T, Login_logsAggregateArgs>): Prisma.PrismaPromise<GetLogin_logsAggregateType<T>>

    /**
     * Group by Login_logs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {login_logsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends login_logsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: login_logsGroupByArgs['orderBy'] }
        : { orderBy?: login_logsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, login_logsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetLogin_logsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the login_logs model
   */
  readonly fields: login_logsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for login_logs.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__login_logsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the login_logs model
   */
  interface login_logsFieldRefs {
    readonly id: FieldRef<"login_logs", 'BigInt'>
    readonly user_id: FieldRef<"login_logs", 'Int'>
    readonly ip: FieldRef<"login_logs", 'String'>
    readonly country: FieldRef<"login_logs", 'String'>
    readonly region: FieldRef<"login_logs", 'String'>
    readonly city: FieldRef<"login_logs", 'String'>
    readonly user_agent: FieldRef<"login_logs", 'String'>
    readonly device_type: FieldRef<"login_logs", 'String'>
    readonly created_at: FieldRef<"login_logs", 'BigInt'>
  }
    

  // Custom InputTypes
  /**
   * login_logs findUnique
   */
  export type login_logsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the login_logs
     */
    select?: login_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the login_logs
     */
    omit?: login_logsOmit<ExtArgs> | null
    /**
     * Filter, which login_logs to fetch.
     */
    where: login_logsWhereUniqueInput
  }

  /**
   * login_logs findUniqueOrThrow
   */
  export type login_logsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the login_logs
     */
    select?: login_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the login_logs
     */
    omit?: login_logsOmit<ExtArgs> | null
    /**
     * Filter, which login_logs to fetch.
     */
    where: login_logsWhereUniqueInput
  }

  /**
   * login_logs findFirst
   */
  export type login_logsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the login_logs
     */
    select?: login_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the login_logs
     */
    omit?: login_logsOmit<ExtArgs> | null
    /**
     * Filter, which login_logs to fetch.
     */
    where?: login_logsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of login_logs to fetch.
     */
    orderBy?: login_logsOrderByWithRelationInput | login_logsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for login_logs.
     */
    cursor?: login_logsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` login_logs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` login_logs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of login_logs.
     */
    distinct?: Login_logsScalarFieldEnum | Login_logsScalarFieldEnum[]
  }

  /**
   * login_logs findFirstOrThrow
   */
  export type login_logsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the login_logs
     */
    select?: login_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the login_logs
     */
    omit?: login_logsOmit<ExtArgs> | null
    /**
     * Filter, which login_logs to fetch.
     */
    where?: login_logsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of login_logs to fetch.
     */
    orderBy?: login_logsOrderByWithRelationInput | login_logsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for login_logs.
     */
    cursor?: login_logsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` login_logs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` login_logs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of login_logs.
     */
    distinct?: Login_logsScalarFieldEnum | Login_logsScalarFieldEnum[]
  }

  /**
   * login_logs findMany
   */
  export type login_logsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the login_logs
     */
    select?: login_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the login_logs
     */
    omit?: login_logsOmit<ExtArgs> | null
    /**
     * Filter, which login_logs to fetch.
     */
    where?: login_logsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of login_logs to fetch.
     */
    orderBy?: login_logsOrderByWithRelationInput | login_logsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing login_logs.
     */
    cursor?: login_logsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` login_logs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` login_logs.
     */
    skip?: number
    distinct?: Login_logsScalarFieldEnum | Login_logsScalarFieldEnum[]
  }

  /**
   * login_logs create
   */
  export type login_logsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the login_logs
     */
    select?: login_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the login_logs
     */
    omit?: login_logsOmit<ExtArgs> | null
    /**
     * The data needed to create a login_logs.
     */
    data: XOR<login_logsCreateInput, login_logsUncheckedCreateInput>
  }

  /**
   * login_logs createMany
   */
  export type login_logsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many login_logs.
     */
    data: login_logsCreateManyInput | login_logsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * login_logs createManyAndReturn
   */
  export type login_logsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the login_logs
     */
    select?: login_logsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the login_logs
     */
    omit?: login_logsOmit<ExtArgs> | null
    /**
     * The data used to create many login_logs.
     */
    data: login_logsCreateManyInput | login_logsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * login_logs update
   */
  export type login_logsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the login_logs
     */
    select?: login_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the login_logs
     */
    omit?: login_logsOmit<ExtArgs> | null
    /**
     * The data needed to update a login_logs.
     */
    data: XOR<login_logsUpdateInput, login_logsUncheckedUpdateInput>
    /**
     * Choose, which login_logs to update.
     */
    where: login_logsWhereUniqueInput
  }

  /**
   * login_logs updateMany
   */
  export type login_logsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update login_logs.
     */
    data: XOR<login_logsUpdateManyMutationInput, login_logsUncheckedUpdateManyInput>
    /**
     * Filter which login_logs to update
     */
    where?: login_logsWhereInput
    /**
     * Limit how many login_logs to update.
     */
    limit?: number
  }

  /**
   * login_logs updateManyAndReturn
   */
  export type login_logsUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the login_logs
     */
    select?: login_logsSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the login_logs
     */
    omit?: login_logsOmit<ExtArgs> | null
    /**
     * The data used to update login_logs.
     */
    data: XOR<login_logsUpdateManyMutationInput, login_logsUncheckedUpdateManyInput>
    /**
     * Filter which login_logs to update
     */
    where?: login_logsWhereInput
    /**
     * Limit how many login_logs to update.
     */
    limit?: number
  }

  /**
   * login_logs upsert
   */
  export type login_logsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the login_logs
     */
    select?: login_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the login_logs
     */
    omit?: login_logsOmit<ExtArgs> | null
    /**
     * The filter to search for the login_logs to update in case it exists.
     */
    where: login_logsWhereUniqueInput
    /**
     * In case the login_logs found by the `where` argument doesn't exist, create a new login_logs with this data.
     */
    create: XOR<login_logsCreateInput, login_logsUncheckedCreateInput>
    /**
     * In case the login_logs was found with the provided `where` argument, update it with this data.
     */
    update: XOR<login_logsUpdateInput, login_logsUncheckedUpdateInput>
  }

  /**
   * login_logs delete
   */
  export type login_logsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the login_logs
     */
    select?: login_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the login_logs
     */
    omit?: login_logsOmit<ExtArgs> | null
    /**
     * Filter which login_logs to delete.
     */
    where: login_logsWhereUniqueInput
  }

  /**
   * login_logs deleteMany
   */
  export type login_logsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which login_logs to delete
     */
    where?: login_logsWhereInput
    /**
     * Limit how many login_logs to delete.
     */
    limit?: number
  }

  /**
   * login_logs without action
   */
  export type login_logsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the login_logs
     */
    select?: login_logsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the login_logs
     */
    omit?: login_logsOmit<ExtArgs> | null
  }


  /**
   * Model login_tickets
   */

  export type AggregateLogin_tickets = {
    _count: Login_ticketsCountAggregateOutputType | null
    _avg: Login_ticketsAvgAggregateOutputType | null
    _sum: Login_ticketsSumAggregateOutputType | null
    _min: Login_ticketsMinAggregateOutputType | null
    _max: Login_ticketsMaxAggregateOutputType | null
  }

  export type Login_ticketsAvgAggregateOutputType = {
    created_at: number | null
  }

  export type Login_ticketsSumAggregateOutputType = {
    created_at: bigint | null
  }

  export type Login_ticketsMinAggregateOutputType = {
    ticket: string | null
    jwt: string | null
    created_at: bigint | null
  }

  export type Login_ticketsMaxAggregateOutputType = {
    ticket: string | null
    jwt: string | null
    created_at: bigint | null
  }

  export type Login_ticketsCountAggregateOutputType = {
    ticket: number
    jwt: number
    created_at: number
    _all: number
  }


  export type Login_ticketsAvgAggregateInputType = {
    created_at?: true
  }

  export type Login_ticketsSumAggregateInputType = {
    created_at?: true
  }

  export type Login_ticketsMinAggregateInputType = {
    ticket?: true
    jwt?: true
    created_at?: true
  }

  export type Login_ticketsMaxAggregateInputType = {
    ticket?: true
    jwt?: true
    created_at?: true
  }

  export type Login_ticketsCountAggregateInputType = {
    ticket?: true
    jwt?: true
    created_at?: true
    _all?: true
  }

  export type Login_ticketsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which login_tickets to aggregate.
     */
    where?: login_ticketsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of login_tickets to fetch.
     */
    orderBy?: login_ticketsOrderByWithRelationInput | login_ticketsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: login_ticketsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` login_tickets from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` login_tickets.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned login_tickets
    **/
    _count?: true | Login_ticketsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: Login_ticketsAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: Login_ticketsSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: Login_ticketsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: Login_ticketsMaxAggregateInputType
  }

  export type GetLogin_ticketsAggregateType<T extends Login_ticketsAggregateArgs> = {
        [P in keyof T & keyof AggregateLogin_tickets]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateLogin_tickets[P]>
      : GetScalarType<T[P], AggregateLogin_tickets[P]>
  }




  export type login_ticketsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: login_ticketsWhereInput
    orderBy?: login_ticketsOrderByWithAggregationInput | login_ticketsOrderByWithAggregationInput[]
    by: Login_ticketsScalarFieldEnum[] | Login_ticketsScalarFieldEnum
    having?: login_ticketsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: Login_ticketsCountAggregateInputType | true
    _avg?: Login_ticketsAvgAggregateInputType
    _sum?: Login_ticketsSumAggregateInputType
    _min?: Login_ticketsMinAggregateInputType
    _max?: Login_ticketsMaxAggregateInputType
  }

  export type Login_ticketsGroupByOutputType = {
    ticket: string
    jwt: string | null
    created_at: bigint
    _count: Login_ticketsCountAggregateOutputType | null
    _avg: Login_ticketsAvgAggregateOutputType | null
    _sum: Login_ticketsSumAggregateOutputType | null
    _min: Login_ticketsMinAggregateOutputType | null
    _max: Login_ticketsMaxAggregateOutputType | null
  }

  type GetLogin_ticketsGroupByPayload<T extends login_ticketsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<Login_ticketsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof Login_ticketsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], Login_ticketsGroupByOutputType[P]>
            : GetScalarType<T[P], Login_ticketsGroupByOutputType[P]>
        }
      >
    >


  export type login_ticketsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    ticket?: boolean
    jwt?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["login_tickets"]>

  export type login_ticketsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    ticket?: boolean
    jwt?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["login_tickets"]>

  export type login_ticketsSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    ticket?: boolean
    jwt?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["login_tickets"]>

  export type login_ticketsSelectScalar = {
    ticket?: boolean
    jwt?: boolean
    created_at?: boolean
  }

  export type login_ticketsOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"ticket" | "jwt" | "created_at", ExtArgs["result"]["login_tickets"]>

  export type $login_ticketsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "login_tickets"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      ticket: string
      jwt: string | null
      created_at: bigint
    }, ExtArgs["result"]["login_tickets"]>
    composites: {}
  }

  type login_ticketsGetPayload<S extends boolean | null | undefined | login_ticketsDefaultArgs> = $Result.GetResult<Prisma.$login_ticketsPayload, S>

  type login_ticketsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<login_ticketsFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: Login_ticketsCountAggregateInputType | true
    }

  export interface login_ticketsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['login_tickets'], meta: { name: 'login_tickets' } }
    /**
     * Find zero or one Login_tickets that matches the filter.
     * @param {login_ticketsFindUniqueArgs} args - Arguments to find a Login_tickets
     * @example
     * // Get one Login_tickets
     * const login_tickets = await prisma.login_tickets.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends login_ticketsFindUniqueArgs>(args: SelectSubset<T, login_ticketsFindUniqueArgs<ExtArgs>>): Prisma__login_ticketsClient<$Result.GetResult<Prisma.$login_ticketsPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Login_tickets that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {login_ticketsFindUniqueOrThrowArgs} args - Arguments to find a Login_tickets
     * @example
     * // Get one Login_tickets
     * const login_tickets = await prisma.login_tickets.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends login_ticketsFindUniqueOrThrowArgs>(args: SelectSubset<T, login_ticketsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__login_ticketsClient<$Result.GetResult<Prisma.$login_ticketsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Login_tickets that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {login_ticketsFindFirstArgs} args - Arguments to find a Login_tickets
     * @example
     * // Get one Login_tickets
     * const login_tickets = await prisma.login_tickets.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends login_ticketsFindFirstArgs>(args?: SelectSubset<T, login_ticketsFindFirstArgs<ExtArgs>>): Prisma__login_ticketsClient<$Result.GetResult<Prisma.$login_ticketsPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Login_tickets that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {login_ticketsFindFirstOrThrowArgs} args - Arguments to find a Login_tickets
     * @example
     * // Get one Login_tickets
     * const login_tickets = await prisma.login_tickets.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends login_ticketsFindFirstOrThrowArgs>(args?: SelectSubset<T, login_ticketsFindFirstOrThrowArgs<ExtArgs>>): Prisma__login_ticketsClient<$Result.GetResult<Prisma.$login_ticketsPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Login_tickets that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {login_ticketsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Login_tickets
     * const login_tickets = await prisma.login_tickets.findMany()
     * 
     * // Get first 10 Login_tickets
     * const login_tickets = await prisma.login_tickets.findMany({ take: 10 })
     * 
     * // Only select the `ticket`
     * const login_ticketsWithTicketOnly = await prisma.login_tickets.findMany({ select: { ticket: true } })
     * 
     */
    findMany<T extends login_ticketsFindManyArgs>(args?: SelectSubset<T, login_ticketsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$login_ticketsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Login_tickets.
     * @param {login_ticketsCreateArgs} args - Arguments to create a Login_tickets.
     * @example
     * // Create one Login_tickets
     * const Login_tickets = await prisma.login_tickets.create({
     *   data: {
     *     // ... data to create a Login_tickets
     *   }
     * })
     * 
     */
    create<T extends login_ticketsCreateArgs>(args: SelectSubset<T, login_ticketsCreateArgs<ExtArgs>>): Prisma__login_ticketsClient<$Result.GetResult<Prisma.$login_ticketsPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Login_tickets.
     * @param {login_ticketsCreateManyArgs} args - Arguments to create many Login_tickets.
     * @example
     * // Create many Login_tickets
     * const login_tickets = await prisma.login_tickets.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends login_ticketsCreateManyArgs>(args?: SelectSubset<T, login_ticketsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Login_tickets and returns the data saved in the database.
     * @param {login_ticketsCreateManyAndReturnArgs} args - Arguments to create many Login_tickets.
     * @example
     * // Create many Login_tickets
     * const login_tickets = await prisma.login_tickets.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Login_tickets and only return the `ticket`
     * const login_ticketsWithTicketOnly = await prisma.login_tickets.createManyAndReturn({
     *   select: { ticket: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends login_ticketsCreateManyAndReturnArgs>(args?: SelectSubset<T, login_ticketsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$login_ticketsPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Login_tickets.
     * @param {login_ticketsDeleteArgs} args - Arguments to delete one Login_tickets.
     * @example
     * // Delete one Login_tickets
     * const Login_tickets = await prisma.login_tickets.delete({
     *   where: {
     *     // ... filter to delete one Login_tickets
     *   }
     * })
     * 
     */
    delete<T extends login_ticketsDeleteArgs>(args: SelectSubset<T, login_ticketsDeleteArgs<ExtArgs>>): Prisma__login_ticketsClient<$Result.GetResult<Prisma.$login_ticketsPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Login_tickets.
     * @param {login_ticketsUpdateArgs} args - Arguments to update one Login_tickets.
     * @example
     * // Update one Login_tickets
     * const login_tickets = await prisma.login_tickets.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends login_ticketsUpdateArgs>(args: SelectSubset<T, login_ticketsUpdateArgs<ExtArgs>>): Prisma__login_ticketsClient<$Result.GetResult<Prisma.$login_ticketsPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Login_tickets.
     * @param {login_ticketsDeleteManyArgs} args - Arguments to filter Login_tickets to delete.
     * @example
     * // Delete a few Login_tickets
     * const { count } = await prisma.login_tickets.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends login_ticketsDeleteManyArgs>(args?: SelectSubset<T, login_ticketsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Login_tickets.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {login_ticketsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Login_tickets
     * const login_tickets = await prisma.login_tickets.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends login_ticketsUpdateManyArgs>(args: SelectSubset<T, login_ticketsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Login_tickets and returns the data updated in the database.
     * @param {login_ticketsUpdateManyAndReturnArgs} args - Arguments to update many Login_tickets.
     * @example
     * // Update many Login_tickets
     * const login_tickets = await prisma.login_tickets.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Login_tickets and only return the `ticket`
     * const login_ticketsWithTicketOnly = await prisma.login_tickets.updateManyAndReturn({
     *   select: { ticket: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends login_ticketsUpdateManyAndReturnArgs>(args: SelectSubset<T, login_ticketsUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$login_ticketsPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Login_tickets.
     * @param {login_ticketsUpsertArgs} args - Arguments to update or create a Login_tickets.
     * @example
     * // Update or create a Login_tickets
     * const login_tickets = await prisma.login_tickets.upsert({
     *   create: {
     *     // ... data to create a Login_tickets
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Login_tickets we want to update
     *   }
     * })
     */
    upsert<T extends login_ticketsUpsertArgs>(args: SelectSubset<T, login_ticketsUpsertArgs<ExtArgs>>): Prisma__login_ticketsClient<$Result.GetResult<Prisma.$login_ticketsPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Login_tickets.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {login_ticketsCountArgs} args - Arguments to filter Login_tickets to count.
     * @example
     * // Count the number of Login_tickets
     * const count = await prisma.login_tickets.count({
     *   where: {
     *     // ... the filter for the Login_tickets we want to count
     *   }
     * })
    **/
    count<T extends login_ticketsCountArgs>(
      args?: Subset<T, login_ticketsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], Login_ticketsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Login_tickets.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Login_ticketsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends Login_ticketsAggregateArgs>(args: Subset<T, Login_ticketsAggregateArgs>): Prisma.PrismaPromise<GetLogin_ticketsAggregateType<T>>

    /**
     * Group by Login_tickets.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {login_ticketsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends login_ticketsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: login_ticketsGroupByArgs['orderBy'] }
        : { orderBy?: login_ticketsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, login_ticketsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetLogin_ticketsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the login_tickets model
   */
  readonly fields: login_ticketsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for login_tickets.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__login_ticketsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the login_tickets model
   */
  interface login_ticketsFieldRefs {
    readonly ticket: FieldRef<"login_tickets", 'String'>
    readonly jwt: FieldRef<"login_tickets", 'String'>
    readonly created_at: FieldRef<"login_tickets", 'BigInt'>
  }
    

  // Custom InputTypes
  /**
   * login_tickets findUnique
   */
  export type login_ticketsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the login_tickets
     */
    select?: login_ticketsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the login_tickets
     */
    omit?: login_ticketsOmit<ExtArgs> | null
    /**
     * Filter, which login_tickets to fetch.
     */
    where: login_ticketsWhereUniqueInput
  }

  /**
   * login_tickets findUniqueOrThrow
   */
  export type login_ticketsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the login_tickets
     */
    select?: login_ticketsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the login_tickets
     */
    omit?: login_ticketsOmit<ExtArgs> | null
    /**
     * Filter, which login_tickets to fetch.
     */
    where: login_ticketsWhereUniqueInput
  }

  /**
   * login_tickets findFirst
   */
  export type login_ticketsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the login_tickets
     */
    select?: login_ticketsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the login_tickets
     */
    omit?: login_ticketsOmit<ExtArgs> | null
    /**
     * Filter, which login_tickets to fetch.
     */
    where?: login_ticketsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of login_tickets to fetch.
     */
    orderBy?: login_ticketsOrderByWithRelationInput | login_ticketsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for login_tickets.
     */
    cursor?: login_ticketsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` login_tickets from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` login_tickets.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of login_tickets.
     */
    distinct?: Login_ticketsScalarFieldEnum | Login_ticketsScalarFieldEnum[]
  }

  /**
   * login_tickets findFirstOrThrow
   */
  export type login_ticketsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the login_tickets
     */
    select?: login_ticketsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the login_tickets
     */
    omit?: login_ticketsOmit<ExtArgs> | null
    /**
     * Filter, which login_tickets to fetch.
     */
    where?: login_ticketsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of login_tickets to fetch.
     */
    orderBy?: login_ticketsOrderByWithRelationInput | login_ticketsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for login_tickets.
     */
    cursor?: login_ticketsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` login_tickets from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` login_tickets.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of login_tickets.
     */
    distinct?: Login_ticketsScalarFieldEnum | Login_ticketsScalarFieldEnum[]
  }

  /**
   * login_tickets findMany
   */
  export type login_ticketsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the login_tickets
     */
    select?: login_ticketsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the login_tickets
     */
    omit?: login_ticketsOmit<ExtArgs> | null
    /**
     * Filter, which login_tickets to fetch.
     */
    where?: login_ticketsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of login_tickets to fetch.
     */
    orderBy?: login_ticketsOrderByWithRelationInput | login_ticketsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing login_tickets.
     */
    cursor?: login_ticketsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` login_tickets from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` login_tickets.
     */
    skip?: number
    distinct?: Login_ticketsScalarFieldEnum | Login_ticketsScalarFieldEnum[]
  }

  /**
   * login_tickets create
   */
  export type login_ticketsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the login_tickets
     */
    select?: login_ticketsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the login_tickets
     */
    omit?: login_ticketsOmit<ExtArgs> | null
    /**
     * The data needed to create a login_tickets.
     */
    data: XOR<login_ticketsCreateInput, login_ticketsUncheckedCreateInput>
  }

  /**
   * login_tickets createMany
   */
  export type login_ticketsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many login_tickets.
     */
    data: login_ticketsCreateManyInput | login_ticketsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * login_tickets createManyAndReturn
   */
  export type login_ticketsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the login_tickets
     */
    select?: login_ticketsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the login_tickets
     */
    omit?: login_ticketsOmit<ExtArgs> | null
    /**
     * The data used to create many login_tickets.
     */
    data: login_ticketsCreateManyInput | login_ticketsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * login_tickets update
   */
  export type login_ticketsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the login_tickets
     */
    select?: login_ticketsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the login_tickets
     */
    omit?: login_ticketsOmit<ExtArgs> | null
    /**
     * The data needed to update a login_tickets.
     */
    data: XOR<login_ticketsUpdateInput, login_ticketsUncheckedUpdateInput>
    /**
     * Choose, which login_tickets to update.
     */
    where: login_ticketsWhereUniqueInput
  }

  /**
   * login_tickets updateMany
   */
  export type login_ticketsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update login_tickets.
     */
    data: XOR<login_ticketsUpdateManyMutationInput, login_ticketsUncheckedUpdateManyInput>
    /**
     * Filter which login_tickets to update
     */
    where?: login_ticketsWhereInput
    /**
     * Limit how many login_tickets to update.
     */
    limit?: number
  }

  /**
   * login_tickets updateManyAndReturn
   */
  export type login_ticketsUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the login_tickets
     */
    select?: login_ticketsSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the login_tickets
     */
    omit?: login_ticketsOmit<ExtArgs> | null
    /**
     * The data used to update login_tickets.
     */
    data: XOR<login_ticketsUpdateManyMutationInput, login_ticketsUncheckedUpdateManyInput>
    /**
     * Filter which login_tickets to update
     */
    where?: login_ticketsWhereInput
    /**
     * Limit how many login_tickets to update.
     */
    limit?: number
  }

  /**
   * login_tickets upsert
   */
  export type login_ticketsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the login_tickets
     */
    select?: login_ticketsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the login_tickets
     */
    omit?: login_ticketsOmit<ExtArgs> | null
    /**
     * The filter to search for the login_tickets to update in case it exists.
     */
    where: login_ticketsWhereUniqueInput
    /**
     * In case the login_tickets found by the `where` argument doesn't exist, create a new login_tickets with this data.
     */
    create: XOR<login_ticketsCreateInput, login_ticketsUncheckedCreateInput>
    /**
     * In case the login_tickets was found with the provided `where` argument, update it with this data.
     */
    update: XOR<login_ticketsUpdateInput, login_ticketsUncheckedUpdateInput>
  }

  /**
   * login_tickets delete
   */
  export type login_ticketsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the login_tickets
     */
    select?: login_ticketsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the login_tickets
     */
    omit?: login_ticketsOmit<ExtArgs> | null
    /**
     * Filter which login_tickets to delete.
     */
    where: login_ticketsWhereUniqueInput
  }

  /**
   * login_tickets deleteMany
   */
  export type login_ticketsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which login_tickets to delete
     */
    where?: login_ticketsWhereInput
    /**
     * Limit how many login_tickets to delete.
     */
    limit?: number
  }

  /**
   * login_tickets without action
   */
  export type login_ticketsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the login_tickets
     */
    select?: login_ticketsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the login_tickets
     */
    omit?: login_ticketsOmit<ExtArgs> | null
  }


  /**
   * Model messages
   */

  export type AggregateMessages = {
    _count: MessagesCountAggregateOutputType | null
    _avg: MessagesAvgAggregateOutputType | null
    _sum: MessagesSumAggregateOutputType | null
    _min: MessagesMinAggregateOutputType | null
    _max: MessagesMaxAggregateOutputType | null
  }

  export type MessagesAvgAggregateOutputType = {
    id: number | null
    sender_id: number | null
    receiver_id: number | null
    group_id: number | null
    read_at: number | null
    created_at: number | null
  }

  export type MessagesSumAggregateOutputType = {
    id: bigint | null
    sender_id: number | null
    receiver_id: number | null
    group_id: number | null
    read_at: bigint | null
    created_at: bigint | null
  }

  export type MessagesMinAggregateOutputType = {
    id: bigint | null
    sender_id: number | null
    receiver_id: number | null
    group_id: number | null
    content: string | null
    type: string | null
    file_url: string | null
    read_at: bigint | null
    created_at: bigint | null
  }

  export type MessagesMaxAggregateOutputType = {
    id: bigint | null
    sender_id: number | null
    receiver_id: number | null
    group_id: number | null
    content: string | null
    type: string | null
    file_url: string | null
    read_at: bigint | null
    created_at: bigint | null
  }

  export type MessagesCountAggregateOutputType = {
    id: number
    sender_id: number
    receiver_id: number
    group_id: number
    content: number
    type: number
    file_url: number
    read_at: number
    created_at: number
    _all: number
  }


  export type MessagesAvgAggregateInputType = {
    id?: true
    sender_id?: true
    receiver_id?: true
    group_id?: true
    read_at?: true
    created_at?: true
  }

  export type MessagesSumAggregateInputType = {
    id?: true
    sender_id?: true
    receiver_id?: true
    group_id?: true
    read_at?: true
    created_at?: true
  }

  export type MessagesMinAggregateInputType = {
    id?: true
    sender_id?: true
    receiver_id?: true
    group_id?: true
    content?: true
    type?: true
    file_url?: true
    read_at?: true
    created_at?: true
  }

  export type MessagesMaxAggregateInputType = {
    id?: true
    sender_id?: true
    receiver_id?: true
    group_id?: true
    content?: true
    type?: true
    file_url?: true
    read_at?: true
    created_at?: true
  }

  export type MessagesCountAggregateInputType = {
    id?: true
    sender_id?: true
    receiver_id?: true
    group_id?: true
    content?: true
    type?: true
    file_url?: true
    read_at?: true
    created_at?: true
    _all?: true
  }

  export type MessagesAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which messages to aggregate.
     */
    where?: messagesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of messages to fetch.
     */
    orderBy?: messagesOrderByWithRelationInput | messagesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: messagesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` messages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` messages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned messages
    **/
    _count?: true | MessagesCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: MessagesAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: MessagesSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: MessagesMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: MessagesMaxAggregateInputType
  }

  export type GetMessagesAggregateType<T extends MessagesAggregateArgs> = {
        [P in keyof T & keyof AggregateMessages]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateMessages[P]>
      : GetScalarType<T[P], AggregateMessages[P]>
  }




  export type messagesGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: messagesWhereInput
    orderBy?: messagesOrderByWithAggregationInput | messagesOrderByWithAggregationInput[]
    by: MessagesScalarFieldEnum[] | MessagesScalarFieldEnum
    having?: messagesScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: MessagesCountAggregateInputType | true
    _avg?: MessagesAvgAggregateInputType
    _sum?: MessagesSumAggregateInputType
    _min?: MessagesMinAggregateInputType
    _max?: MessagesMaxAggregateInputType
  }

  export type MessagesGroupByOutputType = {
    id: bigint
    sender_id: number
    receiver_id: number
    group_id: number | null
    content: string | null
    type: string | null
    file_url: string | null
    read_at: bigint | null
    created_at: bigint
    _count: MessagesCountAggregateOutputType | null
    _avg: MessagesAvgAggregateOutputType | null
    _sum: MessagesSumAggregateOutputType | null
    _min: MessagesMinAggregateOutputType | null
    _max: MessagesMaxAggregateOutputType | null
  }

  type GetMessagesGroupByPayload<T extends messagesGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<MessagesGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof MessagesGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], MessagesGroupByOutputType[P]>
            : GetScalarType<T[P], MessagesGroupByOutputType[P]>
        }
      >
    >


  export type messagesSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    sender_id?: boolean
    receiver_id?: boolean
    group_id?: boolean
    content?: boolean
    type?: boolean
    file_url?: boolean
    read_at?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["messages"]>

  export type messagesSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    sender_id?: boolean
    receiver_id?: boolean
    group_id?: boolean
    content?: boolean
    type?: boolean
    file_url?: boolean
    read_at?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["messages"]>

  export type messagesSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    sender_id?: boolean
    receiver_id?: boolean
    group_id?: boolean
    content?: boolean
    type?: boolean
    file_url?: boolean
    read_at?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["messages"]>

  export type messagesSelectScalar = {
    id?: boolean
    sender_id?: boolean
    receiver_id?: boolean
    group_id?: boolean
    content?: boolean
    type?: boolean
    file_url?: boolean
    read_at?: boolean
    created_at?: boolean
  }

  export type messagesOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "sender_id" | "receiver_id" | "group_id" | "content" | "type" | "file_url" | "read_at" | "created_at", ExtArgs["result"]["messages"]>

  export type $messagesPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "messages"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: bigint
      sender_id: number
      receiver_id: number
      group_id: number | null
      content: string | null
      type: string | null
      file_url: string | null
      read_at: bigint | null
      created_at: bigint
    }, ExtArgs["result"]["messages"]>
    composites: {}
  }

  type messagesGetPayload<S extends boolean | null | undefined | messagesDefaultArgs> = $Result.GetResult<Prisma.$messagesPayload, S>

  type messagesCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<messagesFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: MessagesCountAggregateInputType | true
    }

  export interface messagesDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['messages'], meta: { name: 'messages' } }
    /**
     * Find zero or one Messages that matches the filter.
     * @param {messagesFindUniqueArgs} args - Arguments to find a Messages
     * @example
     * // Get one Messages
     * const messages = await prisma.messages.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends messagesFindUniqueArgs>(args: SelectSubset<T, messagesFindUniqueArgs<ExtArgs>>): Prisma__messagesClient<$Result.GetResult<Prisma.$messagesPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Messages that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {messagesFindUniqueOrThrowArgs} args - Arguments to find a Messages
     * @example
     * // Get one Messages
     * const messages = await prisma.messages.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends messagesFindUniqueOrThrowArgs>(args: SelectSubset<T, messagesFindUniqueOrThrowArgs<ExtArgs>>): Prisma__messagesClient<$Result.GetResult<Prisma.$messagesPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Messages that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {messagesFindFirstArgs} args - Arguments to find a Messages
     * @example
     * // Get one Messages
     * const messages = await prisma.messages.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends messagesFindFirstArgs>(args?: SelectSubset<T, messagesFindFirstArgs<ExtArgs>>): Prisma__messagesClient<$Result.GetResult<Prisma.$messagesPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Messages that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {messagesFindFirstOrThrowArgs} args - Arguments to find a Messages
     * @example
     * // Get one Messages
     * const messages = await prisma.messages.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends messagesFindFirstOrThrowArgs>(args?: SelectSubset<T, messagesFindFirstOrThrowArgs<ExtArgs>>): Prisma__messagesClient<$Result.GetResult<Prisma.$messagesPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Messages that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {messagesFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Messages
     * const messages = await prisma.messages.findMany()
     * 
     * // Get first 10 Messages
     * const messages = await prisma.messages.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const messagesWithIdOnly = await prisma.messages.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends messagesFindManyArgs>(args?: SelectSubset<T, messagesFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$messagesPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Messages.
     * @param {messagesCreateArgs} args - Arguments to create a Messages.
     * @example
     * // Create one Messages
     * const Messages = await prisma.messages.create({
     *   data: {
     *     // ... data to create a Messages
     *   }
     * })
     * 
     */
    create<T extends messagesCreateArgs>(args: SelectSubset<T, messagesCreateArgs<ExtArgs>>): Prisma__messagesClient<$Result.GetResult<Prisma.$messagesPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Messages.
     * @param {messagesCreateManyArgs} args - Arguments to create many Messages.
     * @example
     * // Create many Messages
     * const messages = await prisma.messages.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends messagesCreateManyArgs>(args?: SelectSubset<T, messagesCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Messages and returns the data saved in the database.
     * @param {messagesCreateManyAndReturnArgs} args - Arguments to create many Messages.
     * @example
     * // Create many Messages
     * const messages = await prisma.messages.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Messages and only return the `id`
     * const messagesWithIdOnly = await prisma.messages.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends messagesCreateManyAndReturnArgs>(args?: SelectSubset<T, messagesCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$messagesPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Messages.
     * @param {messagesDeleteArgs} args - Arguments to delete one Messages.
     * @example
     * // Delete one Messages
     * const Messages = await prisma.messages.delete({
     *   where: {
     *     // ... filter to delete one Messages
     *   }
     * })
     * 
     */
    delete<T extends messagesDeleteArgs>(args: SelectSubset<T, messagesDeleteArgs<ExtArgs>>): Prisma__messagesClient<$Result.GetResult<Prisma.$messagesPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Messages.
     * @param {messagesUpdateArgs} args - Arguments to update one Messages.
     * @example
     * // Update one Messages
     * const messages = await prisma.messages.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends messagesUpdateArgs>(args: SelectSubset<T, messagesUpdateArgs<ExtArgs>>): Prisma__messagesClient<$Result.GetResult<Prisma.$messagesPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Messages.
     * @param {messagesDeleteManyArgs} args - Arguments to filter Messages to delete.
     * @example
     * // Delete a few Messages
     * const { count } = await prisma.messages.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends messagesDeleteManyArgs>(args?: SelectSubset<T, messagesDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Messages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {messagesUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Messages
     * const messages = await prisma.messages.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends messagesUpdateManyArgs>(args: SelectSubset<T, messagesUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Messages and returns the data updated in the database.
     * @param {messagesUpdateManyAndReturnArgs} args - Arguments to update many Messages.
     * @example
     * // Update many Messages
     * const messages = await prisma.messages.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Messages and only return the `id`
     * const messagesWithIdOnly = await prisma.messages.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends messagesUpdateManyAndReturnArgs>(args: SelectSubset<T, messagesUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$messagesPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Messages.
     * @param {messagesUpsertArgs} args - Arguments to update or create a Messages.
     * @example
     * // Update or create a Messages
     * const messages = await prisma.messages.upsert({
     *   create: {
     *     // ... data to create a Messages
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Messages we want to update
     *   }
     * })
     */
    upsert<T extends messagesUpsertArgs>(args: SelectSubset<T, messagesUpsertArgs<ExtArgs>>): Prisma__messagesClient<$Result.GetResult<Prisma.$messagesPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Messages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {messagesCountArgs} args - Arguments to filter Messages to count.
     * @example
     * // Count the number of Messages
     * const count = await prisma.messages.count({
     *   where: {
     *     // ... the filter for the Messages we want to count
     *   }
     * })
    **/
    count<T extends messagesCountArgs>(
      args?: Subset<T, messagesCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], MessagesCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Messages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {MessagesAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends MessagesAggregateArgs>(args: Subset<T, MessagesAggregateArgs>): Prisma.PrismaPromise<GetMessagesAggregateType<T>>

    /**
     * Group by Messages.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {messagesGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends messagesGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: messagesGroupByArgs['orderBy'] }
        : { orderBy?: messagesGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, messagesGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMessagesGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the messages model
   */
  readonly fields: messagesFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for messages.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__messagesClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the messages model
   */
  interface messagesFieldRefs {
    readonly id: FieldRef<"messages", 'BigInt'>
    readonly sender_id: FieldRef<"messages", 'Int'>
    readonly receiver_id: FieldRef<"messages", 'Int'>
    readonly group_id: FieldRef<"messages", 'Int'>
    readonly content: FieldRef<"messages", 'String'>
    readonly type: FieldRef<"messages", 'String'>
    readonly file_url: FieldRef<"messages", 'String'>
    readonly read_at: FieldRef<"messages", 'BigInt'>
    readonly created_at: FieldRef<"messages", 'BigInt'>
  }
    

  // Custom InputTypes
  /**
   * messages findUnique
   */
  export type messagesFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the messages
     */
    select?: messagesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the messages
     */
    omit?: messagesOmit<ExtArgs> | null
    /**
     * Filter, which messages to fetch.
     */
    where: messagesWhereUniqueInput
  }

  /**
   * messages findUniqueOrThrow
   */
  export type messagesFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the messages
     */
    select?: messagesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the messages
     */
    omit?: messagesOmit<ExtArgs> | null
    /**
     * Filter, which messages to fetch.
     */
    where: messagesWhereUniqueInput
  }

  /**
   * messages findFirst
   */
  export type messagesFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the messages
     */
    select?: messagesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the messages
     */
    omit?: messagesOmit<ExtArgs> | null
    /**
     * Filter, which messages to fetch.
     */
    where?: messagesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of messages to fetch.
     */
    orderBy?: messagesOrderByWithRelationInput | messagesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for messages.
     */
    cursor?: messagesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` messages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` messages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of messages.
     */
    distinct?: MessagesScalarFieldEnum | MessagesScalarFieldEnum[]
  }

  /**
   * messages findFirstOrThrow
   */
  export type messagesFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the messages
     */
    select?: messagesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the messages
     */
    omit?: messagesOmit<ExtArgs> | null
    /**
     * Filter, which messages to fetch.
     */
    where?: messagesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of messages to fetch.
     */
    orderBy?: messagesOrderByWithRelationInput | messagesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for messages.
     */
    cursor?: messagesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` messages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` messages.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of messages.
     */
    distinct?: MessagesScalarFieldEnum | MessagesScalarFieldEnum[]
  }

  /**
   * messages findMany
   */
  export type messagesFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the messages
     */
    select?: messagesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the messages
     */
    omit?: messagesOmit<ExtArgs> | null
    /**
     * Filter, which messages to fetch.
     */
    where?: messagesWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of messages to fetch.
     */
    orderBy?: messagesOrderByWithRelationInput | messagesOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing messages.
     */
    cursor?: messagesWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` messages from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` messages.
     */
    skip?: number
    distinct?: MessagesScalarFieldEnum | MessagesScalarFieldEnum[]
  }

  /**
   * messages create
   */
  export type messagesCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the messages
     */
    select?: messagesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the messages
     */
    omit?: messagesOmit<ExtArgs> | null
    /**
     * The data needed to create a messages.
     */
    data: XOR<messagesCreateInput, messagesUncheckedCreateInput>
  }

  /**
   * messages createMany
   */
  export type messagesCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many messages.
     */
    data: messagesCreateManyInput | messagesCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * messages createManyAndReturn
   */
  export type messagesCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the messages
     */
    select?: messagesSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the messages
     */
    omit?: messagesOmit<ExtArgs> | null
    /**
     * The data used to create many messages.
     */
    data: messagesCreateManyInput | messagesCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * messages update
   */
  export type messagesUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the messages
     */
    select?: messagesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the messages
     */
    omit?: messagesOmit<ExtArgs> | null
    /**
     * The data needed to update a messages.
     */
    data: XOR<messagesUpdateInput, messagesUncheckedUpdateInput>
    /**
     * Choose, which messages to update.
     */
    where: messagesWhereUniqueInput
  }

  /**
   * messages updateMany
   */
  export type messagesUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update messages.
     */
    data: XOR<messagesUpdateManyMutationInput, messagesUncheckedUpdateManyInput>
    /**
     * Filter which messages to update
     */
    where?: messagesWhereInput
    /**
     * Limit how many messages to update.
     */
    limit?: number
  }

  /**
   * messages updateManyAndReturn
   */
  export type messagesUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the messages
     */
    select?: messagesSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the messages
     */
    omit?: messagesOmit<ExtArgs> | null
    /**
     * The data used to update messages.
     */
    data: XOR<messagesUpdateManyMutationInput, messagesUncheckedUpdateManyInput>
    /**
     * Filter which messages to update
     */
    where?: messagesWhereInput
    /**
     * Limit how many messages to update.
     */
    limit?: number
  }

  /**
   * messages upsert
   */
  export type messagesUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the messages
     */
    select?: messagesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the messages
     */
    omit?: messagesOmit<ExtArgs> | null
    /**
     * The filter to search for the messages to update in case it exists.
     */
    where: messagesWhereUniqueInput
    /**
     * In case the messages found by the `where` argument doesn't exist, create a new messages with this data.
     */
    create: XOR<messagesCreateInput, messagesUncheckedCreateInput>
    /**
     * In case the messages was found with the provided `where` argument, update it with this data.
     */
    update: XOR<messagesUpdateInput, messagesUncheckedUpdateInput>
  }

  /**
   * messages delete
   */
  export type messagesDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the messages
     */
    select?: messagesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the messages
     */
    omit?: messagesOmit<ExtArgs> | null
    /**
     * Filter which messages to delete.
     */
    where: messagesWhereUniqueInput
  }

  /**
   * messages deleteMany
   */
  export type messagesDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which messages to delete
     */
    where?: messagesWhereInput
    /**
     * Limit how many messages to delete.
     */
    limit?: number
  }

  /**
   * messages without action
   */
  export type messagesDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the messages
     */
    select?: messagesSelect<ExtArgs> | null
    /**
     * Omit specific fields from the messages
     */
    omit?: messagesOmit<ExtArgs> | null
  }


  /**
   * Model scheduled_tasks
   */

  export type AggregateScheduled_tasks = {
    _count: Scheduled_tasksCountAggregateOutputType | null
    _avg: Scheduled_tasksAvgAggregateOutputType | null
    _sum: Scheduled_tasksSumAggregateOutputType | null
    _min: Scheduled_tasksMinAggregateOutputType | null
    _max: Scheduled_tasksMaxAggregateOutputType | null
  }

  export type Scheduled_tasksAvgAggregateOutputType = {
    id: number | null
    execute_at: number | null
    device_id: number | null
    is_active: number | null
    created_at: number | null
    updated_at: number | null
  }

  export type Scheduled_tasksSumAggregateOutputType = {
    id: bigint | null
    execute_at: bigint | null
    device_id: number | null
    is_active: number | null
    created_at: bigint | null
    updated_at: bigint | null
  }

  export type Scheduled_tasksMinAggregateOutputType = {
    id: bigint | null
    title: string | null
    cron_expression: string | null
    execute_at: bigint | null
    action_type: string | null
    device_id: number | null
    params: string | null
    is_active: number | null
    created_at: bigint | null
    updated_at: bigint | null
  }

  export type Scheduled_tasksMaxAggregateOutputType = {
    id: bigint | null
    title: string | null
    cron_expression: string | null
    execute_at: bigint | null
    action_type: string | null
    device_id: number | null
    params: string | null
    is_active: number | null
    created_at: bigint | null
    updated_at: bigint | null
  }

  export type Scheduled_tasksCountAggregateOutputType = {
    id: number
    title: number
    cron_expression: number
    execute_at: number
    action_type: number
    device_id: number
    params: number
    is_active: number
    created_at: number
    updated_at: number
    _all: number
  }


  export type Scheduled_tasksAvgAggregateInputType = {
    id?: true
    execute_at?: true
    device_id?: true
    is_active?: true
    created_at?: true
    updated_at?: true
  }

  export type Scheduled_tasksSumAggregateInputType = {
    id?: true
    execute_at?: true
    device_id?: true
    is_active?: true
    created_at?: true
    updated_at?: true
  }

  export type Scheduled_tasksMinAggregateInputType = {
    id?: true
    title?: true
    cron_expression?: true
    execute_at?: true
    action_type?: true
    device_id?: true
    params?: true
    is_active?: true
    created_at?: true
    updated_at?: true
  }

  export type Scheduled_tasksMaxAggregateInputType = {
    id?: true
    title?: true
    cron_expression?: true
    execute_at?: true
    action_type?: true
    device_id?: true
    params?: true
    is_active?: true
    created_at?: true
    updated_at?: true
  }

  export type Scheduled_tasksCountAggregateInputType = {
    id?: true
    title?: true
    cron_expression?: true
    execute_at?: true
    action_type?: true
    device_id?: true
    params?: true
    is_active?: true
    created_at?: true
    updated_at?: true
    _all?: true
  }

  export type Scheduled_tasksAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which scheduled_tasks to aggregate.
     */
    where?: scheduled_tasksWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of scheduled_tasks to fetch.
     */
    orderBy?: scheduled_tasksOrderByWithRelationInput | scheduled_tasksOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: scheduled_tasksWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` scheduled_tasks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` scheduled_tasks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned scheduled_tasks
    **/
    _count?: true | Scheduled_tasksCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: Scheduled_tasksAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: Scheduled_tasksSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: Scheduled_tasksMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: Scheduled_tasksMaxAggregateInputType
  }

  export type GetScheduled_tasksAggregateType<T extends Scheduled_tasksAggregateArgs> = {
        [P in keyof T & keyof AggregateScheduled_tasks]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateScheduled_tasks[P]>
      : GetScalarType<T[P], AggregateScheduled_tasks[P]>
  }




  export type scheduled_tasksGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: scheduled_tasksWhereInput
    orderBy?: scheduled_tasksOrderByWithAggregationInput | scheduled_tasksOrderByWithAggregationInput[]
    by: Scheduled_tasksScalarFieldEnum[] | Scheduled_tasksScalarFieldEnum
    having?: scheduled_tasksScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: Scheduled_tasksCountAggregateInputType | true
    _avg?: Scheduled_tasksAvgAggregateInputType
    _sum?: Scheduled_tasksSumAggregateInputType
    _min?: Scheduled_tasksMinAggregateInputType
    _max?: Scheduled_tasksMaxAggregateInputType
  }

  export type Scheduled_tasksGroupByOutputType = {
    id: bigint
    title: string
    cron_expression: string | null
    execute_at: bigint | null
    action_type: string
    device_id: number | null
    params: string
    is_active: number | null
    created_at: bigint
    updated_at: bigint
    _count: Scheduled_tasksCountAggregateOutputType | null
    _avg: Scheduled_tasksAvgAggregateOutputType | null
    _sum: Scheduled_tasksSumAggregateOutputType | null
    _min: Scheduled_tasksMinAggregateOutputType | null
    _max: Scheduled_tasksMaxAggregateOutputType | null
  }

  type GetScheduled_tasksGroupByPayload<T extends scheduled_tasksGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<Scheduled_tasksGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof Scheduled_tasksGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], Scheduled_tasksGroupByOutputType[P]>
            : GetScalarType<T[P], Scheduled_tasksGroupByOutputType[P]>
        }
      >
    >


  export type scheduled_tasksSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    title?: boolean
    cron_expression?: boolean
    execute_at?: boolean
    action_type?: boolean
    device_id?: boolean
    params?: boolean
    is_active?: boolean
    created_at?: boolean
    updated_at?: boolean
  }, ExtArgs["result"]["scheduled_tasks"]>

  export type scheduled_tasksSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    title?: boolean
    cron_expression?: boolean
    execute_at?: boolean
    action_type?: boolean
    device_id?: boolean
    params?: boolean
    is_active?: boolean
    created_at?: boolean
    updated_at?: boolean
  }, ExtArgs["result"]["scheduled_tasks"]>

  export type scheduled_tasksSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    title?: boolean
    cron_expression?: boolean
    execute_at?: boolean
    action_type?: boolean
    device_id?: boolean
    params?: boolean
    is_active?: boolean
    created_at?: boolean
    updated_at?: boolean
  }, ExtArgs["result"]["scheduled_tasks"]>

  export type scheduled_tasksSelectScalar = {
    id?: boolean
    title?: boolean
    cron_expression?: boolean
    execute_at?: boolean
    action_type?: boolean
    device_id?: boolean
    params?: boolean
    is_active?: boolean
    created_at?: boolean
    updated_at?: boolean
  }

  export type scheduled_tasksOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "title" | "cron_expression" | "execute_at" | "action_type" | "device_id" | "params" | "is_active" | "created_at" | "updated_at", ExtArgs["result"]["scheduled_tasks"]>

  export type $scheduled_tasksPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "scheduled_tasks"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: bigint
      title: string
      cron_expression: string | null
      execute_at: bigint | null
      action_type: string
      device_id: number | null
      params: string
      is_active: number | null
      created_at: bigint
      updated_at: bigint
    }, ExtArgs["result"]["scheduled_tasks"]>
    composites: {}
  }

  type scheduled_tasksGetPayload<S extends boolean | null | undefined | scheduled_tasksDefaultArgs> = $Result.GetResult<Prisma.$scheduled_tasksPayload, S>

  type scheduled_tasksCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<scheduled_tasksFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: Scheduled_tasksCountAggregateInputType | true
    }

  export interface scheduled_tasksDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['scheduled_tasks'], meta: { name: 'scheduled_tasks' } }
    /**
     * Find zero or one Scheduled_tasks that matches the filter.
     * @param {scheduled_tasksFindUniqueArgs} args - Arguments to find a Scheduled_tasks
     * @example
     * // Get one Scheduled_tasks
     * const scheduled_tasks = await prisma.scheduled_tasks.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends scheduled_tasksFindUniqueArgs>(args: SelectSubset<T, scheduled_tasksFindUniqueArgs<ExtArgs>>): Prisma__scheduled_tasksClient<$Result.GetResult<Prisma.$scheduled_tasksPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Scheduled_tasks that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {scheduled_tasksFindUniqueOrThrowArgs} args - Arguments to find a Scheduled_tasks
     * @example
     * // Get one Scheduled_tasks
     * const scheduled_tasks = await prisma.scheduled_tasks.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends scheduled_tasksFindUniqueOrThrowArgs>(args: SelectSubset<T, scheduled_tasksFindUniqueOrThrowArgs<ExtArgs>>): Prisma__scheduled_tasksClient<$Result.GetResult<Prisma.$scheduled_tasksPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Scheduled_tasks that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {scheduled_tasksFindFirstArgs} args - Arguments to find a Scheduled_tasks
     * @example
     * // Get one Scheduled_tasks
     * const scheduled_tasks = await prisma.scheduled_tasks.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends scheduled_tasksFindFirstArgs>(args?: SelectSubset<T, scheduled_tasksFindFirstArgs<ExtArgs>>): Prisma__scheduled_tasksClient<$Result.GetResult<Prisma.$scheduled_tasksPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Scheduled_tasks that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {scheduled_tasksFindFirstOrThrowArgs} args - Arguments to find a Scheduled_tasks
     * @example
     * // Get one Scheduled_tasks
     * const scheduled_tasks = await prisma.scheduled_tasks.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends scheduled_tasksFindFirstOrThrowArgs>(args?: SelectSubset<T, scheduled_tasksFindFirstOrThrowArgs<ExtArgs>>): Prisma__scheduled_tasksClient<$Result.GetResult<Prisma.$scheduled_tasksPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Scheduled_tasks that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {scheduled_tasksFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Scheduled_tasks
     * const scheduled_tasks = await prisma.scheduled_tasks.findMany()
     * 
     * // Get first 10 Scheduled_tasks
     * const scheduled_tasks = await prisma.scheduled_tasks.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const scheduled_tasksWithIdOnly = await prisma.scheduled_tasks.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends scheduled_tasksFindManyArgs>(args?: SelectSubset<T, scheduled_tasksFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$scheduled_tasksPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Scheduled_tasks.
     * @param {scheduled_tasksCreateArgs} args - Arguments to create a Scheduled_tasks.
     * @example
     * // Create one Scheduled_tasks
     * const Scheduled_tasks = await prisma.scheduled_tasks.create({
     *   data: {
     *     // ... data to create a Scheduled_tasks
     *   }
     * })
     * 
     */
    create<T extends scheduled_tasksCreateArgs>(args: SelectSubset<T, scheduled_tasksCreateArgs<ExtArgs>>): Prisma__scheduled_tasksClient<$Result.GetResult<Prisma.$scheduled_tasksPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Scheduled_tasks.
     * @param {scheduled_tasksCreateManyArgs} args - Arguments to create many Scheduled_tasks.
     * @example
     * // Create many Scheduled_tasks
     * const scheduled_tasks = await prisma.scheduled_tasks.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends scheduled_tasksCreateManyArgs>(args?: SelectSubset<T, scheduled_tasksCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Scheduled_tasks and returns the data saved in the database.
     * @param {scheduled_tasksCreateManyAndReturnArgs} args - Arguments to create many Scheduled_tasks.
     * @example
     * // Create many Scheduled_tasks
     * const scheduled_tasks = await prisma.scheduled_tasks.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Scheduled_tasks and only return the `id`
     * const scheduled_tasksWithIdOnly = await prisma.scheduled_tasks.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends scheduled_tasksCreateManyAndReturnArgs>(args?: SelectSubset<T, scheduled_tasksCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$scheduled_tasksPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Scheduled_tasks.
     * @param {scheduled_tasksDeleteArgs} args - Arguments to delete one Scheduled_tasks.
     * @example
     * // Delete one Scheduled_tasks
     * const Scheduled_tasks = await prisma.scheduled_tasks.delete({
     *   where: {
     *     // ... filter to delete one Scheduled_tasks
     *   }
     * })
     * 
     */
    delete<T extends scheduled_tasksDeleteArgs>(args: SelectSubset<T, scheduled_tasksDeleteArgs<ExtArgs>>): Prisma__scheduled_tasksClient<$Result.GetResult<Prisma.$scheduled_tasksPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Scheduled_tasks.
     * @param {scheduled_tasksUpdateArgs} args - Arguments to update one Scheduled_tasks.
     * @example
     * // Update one Scheduled_tasks
     * const scheduled_tasks = await prisma.scheduled_tasks.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends scheduled_tasksUpdateArgs>(args: SelectSubset<T, scheduled_tasksUpdateArgs<ExtArgs>>): Prisma__scheduled_tasksClient<$Result.GetResult<Prisma.$scheduled_tasksPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Scheduled_tasks.
     * @param {scheduled_tasksDeleteManyArgs} args - Arguments to filter Scheduled_tasks to delete.
     * @example
     * // Delete a few Scheduled_tasks
     * const { count } = await prisma.scheduled_tasks.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends scheduled_tasksDeleteManyArgs>(args?: SelectSubset<T, scheduled_tasksDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Scheduled_tasks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {scheduled_tasksUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Scheduled_tasks
     * const scheduled_tasks = await prisma.scheduled_tasks.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends scheduled_tasksUpdateManyArgs>(args: SelectSubset<T, scheduled_tasksUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Scheduled_tasks and returns the data updated in the database.
     * @param {scheduled_tasksUpdateManyAndReturnArgs} args - Arguments to update many Scheduled_tasks.
     * @example
     * // Update many Scheduled_tasks
     * const scheduled_tasks = await prisma.scheduled_tasks.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Scheduled_tasks and only return the `id`
     * const scheduled_tasksWithIdOnly = await prisma.scheduled_tasks.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends scheduled_tasksUpdateManyAndReturnArgs>(args: SelectSubset<T, scheduled_tasksUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$scheduled_tasksPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Scheduled_tasks.
     * @param {scheduled_tasksUpsertArgs} args - Arguments to update or create a Scheduled_tasks.
     * @example
     * // Update or create a Scheduled_tasks
     * const scheduled_tasks = await prisma.scheduled_tasks.upsert({
     *   create: {
     *     // ... data to create a Scheduled_tasks
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Scheduled_tasks we want to update
     *   }
     * })
     */
    upsert<T extends scheduled_tasksUpsertArgs>(args: SelectSubset<T, scheduled_tasksUpsertArgs<ExtArgs>>): Prisma__scheduled_tasksClient<$Result.GetResult<Prisma.$scheduled_tasksPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Scheduled_tasks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {scheduled_tasksCountArgs} args - Arguments to filter Scheduled_tasks to count.
     * @example
     * // Count the number of Scheduled_tasks
     * const count = await prisma.scheduled_tasks.count({
     *   where: {
     *     // ... the filter for the Scheduled_tasks we want to count
     *   }
     * })
    **/
    count<T extends scheduled_tasksCountArgs>(
      args?: Subset<T, scheduled_tasksCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], Scheduled_tasksCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Scheduled_tasks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Scheduled_tasksAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends Scheduled_tasksAggregateArgs>(args: Subset<T, Scheduled_tasksAggregateArgs>): Prisma.PrismaPromise<GetScheduled_tasksAggregateType<T>>

    /**
     * Group by Scheduled_tasks.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {scheduled_tasksGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends scheduled_tasksGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: scheduled_tasksGroupByArgs['orderBy'] }
        : { orderBy?: scheduled_tasksGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, scheduled_tasksGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetScheduled_tasksGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the scheduled_tasks model
   */
  readonly fields: scheduled_tasksFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for scheduled_tasks.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__scheduled_tasksClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the scheduled_tasks model
   */
  interface scheduled_tasksFieldRefs {
    readonly id: FieldRef<"scheduled_tasks", 'BigInt'>
    readonly title: FieldRef<"scheduled_tasks", 'String'>
    readonly cron_expression: FieldRef<"scheduled_tasks", 'String'>
    readonly execute_at: FieldRef<"scheduled_tasks", 'BigInt'>
    readonly action_type: FieldRef<"scheduled_tasks", 'String'>
    readonly device_id: FieldRef<"scheduled_tasks", 'Int'>
    readonly params: FieldRef<"scheduled_tasks", 'String'>
    readonly is_active: FieldRef<"scheduled_tasks", 'Int'>
    readonly created_at: FieldRef<"scheduled_tasks", 'BigInt'>
    readonly updated_at: FieldRef<"scheduled_tasks", 'BigInt'>
  }
    

  // Custom InputTypes
  /**
   * scheduled_tasks findUnique
   */
  export type scheduled_tasksFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the scheduled_tasks
     */
    select?: scheduled_tasksSelect<ExtArgs> | null
    /**
     * Omit specific fields from the scheduled_tasks
     */
    omit?: scheduled_tasksOmit<ExtArgs> | null
    /**
     * Filter, which scheduled_tasks to fetch.
     */
    where: scheduled_tasksWhereUniqueInput
  }

  /**
   * scheduled_tasks findUniqueOrThrow
   */
  export type scheduled_tasksFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the scheduled_tasks
     */
    select?: scheduled_tasksSelect<ExtArgs> | null
    /**
     * Omit specific fields from the scheduled_tasks
     */
    omit?: scheduled_tasksOmit<ExtArgs> | null
    /**
     * Filter, which scheduled_tasks to fetch.
     */
    where: scheduled_tasksWhereUniqueInput
  }

  /**
   * scheduled_tasks findFirst
   */
  export type scheduled_tasksFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the scheduled_tasks
     */
    select?: scheduled_tasksSelect<ExtArgs> | null
    /**
     * Omit specific fields from the scheduled_tasks
     */
    omit?: scheduled_tasksOmit<ExtArgs> | null
    /**
     * Filter, which scheduled_tasks to fetch.
     */
    where?: scheduled_tasksWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of scheduled_tasks to fetch.
     */
    orderBy?: scheduled_tasksOrderByWithRelationInput | scheduled_tasksOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for scheduled_tasks.
     */
    cursor?: scheduled_tasksWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` scheduled_tasks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` scheduled_tasks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of scheduled_tasks.
     */
    distinct?: Scheduled_tasksScalarFieldEnum | Scheduled_tasksScalarFieldEnum[]
  }

  /**
   * scheduled_tasks findFirstOrThrow
   */
  export type scheduled_tasksFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the scheduled_tasks
     */
    select?: scheduled_tasksSelect<ExtArgs> | null
    /**
     * Omit specific fields from the scheduled_tasks
     */
    omit?: scheduled_tasksOmit<ExtArgs> | null
    /**
     * Filter, which scheduled_tasks to fetch.
     */
    where?: scheduled_tasksWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of scheduled_tasks to fetch.
     */
    orderBy?: scheduled_tasksOrderByWithRelationInput | scheduled_tasksOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for scheduled_tasks.
     */
    cursor?: scheduled_tasksWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` scheduled_tasks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` scheduled_tasks.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of scheduled_tasks.
     */
    distinct?: Scheduled_tasksScalarFieldEnum | Scheduled_tasksScalarFieldEnum[]
  }

  /**
   * scheduled_tasks findMany
   */
  export type scheduled_tasksFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the scheduled_tasks
     */
    select?: scheduled_tasksSelect<ExtArgs> | null
    /**
     * Omit specific fields from the scheduled_tasks
     */
    omit?: scheduled_tasksOmit<ExtArgs> | null
    /**
     * Filter, which scheduled_tasks to fetch.
     */
    where?: scheduled_tasksWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of scheduled_tasks to fetch.
     */
    orderBy?: scheduled_tasksOrderByWithRelationInput | scheduled_tasksOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing scheduled_tasks.
     */
    cursor?: scheduled_tasksWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` scheduled_tasks from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` scheduled_tasks.
     */
    skip?: number
    distinct?: Scheduled_tasksScalarFieldEnum | Scheduled_tasksScalarFieldEnum[]
  }

  /**
   * scheduled_tasks create
   */
  export type scheduled_tasksCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the scheduled_tasks
     */
    select?: scheduled_tasksSelect<ExtArgs> | null
    /**
     * Omit specific fields from the scheduled_tasks
     */
    omit?: scheduled_tasksOmit<ExtArgs> | null
    /**
     * The data needed to create a scheduled_tasks.
     */
    data: XOR<scheduled_tasksCreateInput, scheduled_tasksUncheckedCreateInput>
  }

  /**
   * scheduled_tasks createMany
   */
  export type scheduled_tasksCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many scheduled_tasks.
     */
    data: scheduled_tasksCreateManyInput | scheduled_tasksCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * scheduled_tasks createManyAndReturn
   */
  export type scheduled_tasksCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the scheduled_tasks
     */
    select?: scheduled_tasksSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the scheduled_tasks
     */
    omit?: scheduled_tasksOmit<ExtArgs> | null
    /**
     * The data used to create many scheduled_tasks.
     */
    data: scheduled_tasksCreateManyInput | scheduled_tasksCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * scheduled_tasks update
   */
  export type scheduled_tasksUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the scheduled_tasks
     */
    select?: scheduled_tasksSelect<ExtArgs> | null
    /**
     * Omit specific fields from the scheduled_tasks
     */
    omit?: scheduled_tasksOmit<ExtArgs> | null
    /**
     * The data needed to update a scheduled_tasks.
     */
    data: XOR<scheduled_tasksUpdateInput, scheduled_tasksUncheckedUpdateInput>
    /**
     * Choose, which scheduled_tasks to update.
     */
    where: scheduled_tasksWhereUniqueInput
  }

  /**
   * scheduled_tasks updateMany
   */
  export type scheduled_tasksUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update scheduled_tasks.
     */
    data: XOR<scheduled_tasksUpdateManyMutationInput, scheduled_tasksUncheckedUpdateManyInput>
    /**
     * Filter which scheduled_tasks to update
     */
    where?: scheduled_tasksWhereInput
    /**
     * Limit how many scheduled_tasks to update.
     */
    limit?: number
  }

  /**
   * scheduled_tasks updateManyAndReturn
   */
  export type scheduled_tasksUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the scheduled_tasks
     */
    select?: scheduled_tasksSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the scheduled_tasks
     */
    omit?: scheduled_tasksOmit<ExtArgs> | null
    /**
     * The data used to update scheduled_tasks.
     */
    data: XOR<scheduled_tasksUpdateManyMutationInput, scheduled_tasksUncheckedUpdateManyInput>
    /**
     * Filter which scheduled_tasks to update
     */
    where?: scheduled_tasksWhereInput
    /**
     * Limit how many scheduled_tasks to update.
     */
    limit?: number
  }

  /**
   * scheduled_tasks upsert
   */
  export type scheduled_tasksUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the scheduled_tasks
     */
    select?: scheduled_tasksSelect<ExtArgs> | null
    /**
     * Omit specific fields from the scheduled_tasks
     */
    omit?: scheduled_tasksOmit<ExtArgs> | null
    /**
     * The filter to search for the scheduled_tasks to update in case it exists.
     */
    where: scheduled_tasksWhereUniqueInput
    /**
     * In case the scheduled_tasks found by the `where` argument doesn't exist, create a new scheduled_tasks with this data.
     */
    create: XOR<scheduled_tasksCreateInput, scheduled_tasksUncheckedCreateInput>
    /**
     * In case the scheduled_tasks was found with the provided `where` argument, update it with this data.
     */
    update: XOR<scheduled_tasksUpdateInput, scheduled_tasksUncheckedUpdateInput>
  }

  /**
   * scheduled_tasks delete
   */
  export type scheduled_tasksDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the scheduled_tasks
     */
    select?: scheduled_tasksSelect<ExtArgs> | null
    /**
     * Omit specific fields from the scheduled_tasks
     */
    omit?: scheduled_tasksOmit<ExtArgs> | null
    /**
     * Filter which scheduled_tasks to delete.
     */
    where: scheduled_tasksWhereUniqueInput
  }

  /**
   * scheduled_tasks deleteMany
   */
  export type scheduled_tasksDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which scheduled_tasks to delete
     */
    where?: scheduled_tasksWhereInput
    /**
     * Limit how many scheduled_tasks to delete.
     */
    limit?: number
  }

  /**
   * scheduled_tasks without action
   */
  export type scheduled_tasksDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the scheduled_tasks
     */
    select?: scheduled_tasksSelect<ExtArgs> | null
    /**
     * Omit specific fields from the scheduled_tasks
     */
    omit?: scheduled_tasksOmit<ExtArgs> | null
  }


  /**
   * Model sensor_readings
   */

  export type AggregateSensor_readings = {
    _count: Sensor_readingsCountAggregateOutputType | null
    _avg: Sensor_readingsAvgAggregateOutputType | null
    _sum: Sensor_readingsSumAggregateOutputType | null
    _min: Sensor_readingsMinAggregateOutputType | null
    _max: Sensor_readingsMaxAggregateOutputType | null
  }

  export type Sensor_readingsAvgAggregateOutputType = {
    id: number | null
    temperature: number | null
    humidity: number | null
    light: number | null
    co2: number | null
    soil_moisture: number | null
    earth_n: number | null
    earth_p: number | null
    earth_k: number | null
    rainfall: number | null
    created_at: number | null
  }

  export type Sensor_readingsSumAggregateOutputType = {
    id: bigint | null
    temperature: number | null
    humidity: number | null
    light: number | null
    co2: number | null
    soil_moisture: number | null
    earth_n: number | null
    earth_p: number | null
    earth_k: number | null
    rainfall: number | null
    created_at: bigint | null
  }

  export type Sensor_readingsMinAggregateOutputType = {
    id: bigint | null
    device_id: string | null
    temperature: number | null
    humidity: number | null
    light: number | null
    co2: number | null
    soil_moisture: number | null
    earth_n: number | null
    earth_p: number | null
    earth_k: number | null
    rainfall: number | null
    created_at: bigint | null
  }

  export type Sensor_readingsMaxAggregateOutputType = {
    id: bigint | null
    device_id: string | null
    temperature: number | null
    humidity: number | null
    light: number | null
    co2: number | null
    soil_moisture: number | null
    earth_n: number | null
    earth_p: number | null
    earth_k: number | null
    rainfall: number | null
    created_at: bigint | null
  }

  export type Sensor_readingsCountAggregateOutputType = {
    id: number
    device_id: number
    temperature: number
    humidity: number
    light: number
    co2: number
    soil_moisture: number
    earth_n: number
    earth_p: number
    earth_k: number
    rainfall: number
    created_at: number
    _all: number
  }


  export type Sensor_readingsAvgAggregateInputType = {
    id?: true
    temperature?: true
    humidity?: true
    light?: true
    co2?: true
    soil_moisture?: true
    earth_n?: true
    earth_p?: true
    earth_k?: true
    rainfall?: true
    created_at?: true
  }

  export type Sensor_readingsSumAggregateInputType = {
    id?: true
    temperature?: true
    humidity?: true
    light?: true
    co2?: true
    soil_moisture?: true
    earth_n?: true
    earth_p?: true
    earth_k?: true
    rainfall?: true
    created_at?: true
  }

  export type Sensor_readingsMinAggregateInputType = {
    id?: true
    device_id?: true
    temperature?: true
    humidity?: true
    light?: true
    co2?: true
    soil_moisture?: true
    earth_n?: true
    earth_p?: true
    earth_k?: true
    rainfall?: true
    created_at?: true
  }

  export type Sensor_readingsMaxAggregateInputType = {
    id?: true
    device_id?: true
    temperature?: true
    humidity?: true
    light?: true
    co2?: true
    soil_moisture?: true
    earth_n?: true
    earth_p?: true
    earth_k?: true
    rainfall?: true
    created_at?: true
  }

  export type Sensor_readingsCountAggregateInputType = {
    id?: true
    device_id?: true
    temperature?: true
    humidity?: true
    light?: true
    co2?: true
    soil_moisture?: true
    earth_n?: true
    earth_p?: true
    earth_k?: true
    rainfall?: true
    created_at?: true
    _all?: true
  }

  export type Sensor_readingsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which sensor_readings to aggregate.
     */
    where?: sensor_readingsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of sensor_readings to fetch.
     */
    orderBy?: sensor_readingsOrderByWithRelationInput | sensor_readingsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: sensor_readingsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` sensor_readings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` sensor_readings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned sensor_readings
    **/
    _count?: true | Sensor_readingsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: Sensor_readingsAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: Sensor_readingsSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: Sensor_readingsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: Sensor_readingsMaxAggregateInputType
  }

  export type GetSensor_readingsAggregateType<T extends Sensor_readingsAggregateArgs> = {
        [P in keyof T & keyof AggregateSensor_readings]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSensor_readings[P]>
      : GetScalarType<T[P], AggregateSensor_readings[P]>
  }




  export type sensor_readingsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: sensor_readingsWhereInput
    orderBy?: sensor_readingsOrderByWithAggregationInput | sensor_readingsOrderByWithAggregationInput[]
    by: Sensor_readingsScalarFieldEnum[] | Sensor_readingsScalarFieldEnum
    having?: sensor_readingsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: Sensor_readingsCountAggregateInputType | true
    _avg?: Sensor_readingsAvgAggregateInputType
    _sum?: Sensor_readingsSumAggregateInputType
    _min?: Sensor_readingsMinAggregateInputType
    _max?: Sensor_readingsMaxAggregateInputType
  }

  export type Sensor_readingsGroupByOutputType = {
    id: bigint
    device_id: string | null
    temperature: number | null
    humidity: number | null
    light: number | null
    co2: number | null
    soil_moisture: number | null
    earth_n: number | null
    earth_p: number | null
    earth_k: number | null
    rainfall: number | null
    created_at: bigint
    _count: Sensor_readingsCountAggregateOutputType | null
    _avg: Sensor_readingsAvgAggregateOutputType | null
    _sum: Sensor_readingsSumAggregateOutputType | null
    _min: Sensor_readingsMinAggregateOutputType | null
    _max: Sensor_readingsMaxAggregateOutputType | null
  }

  type GetSensor_readingsGroupByPayload<T extends sensor_readingsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<Sensor_readingsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof Sensor_readingsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], Sensor_readingsGroupByOutputType[P]>
            : GetScalarType<T[P], Sensor_readingsGroupByOutputType[P]>
        }
      >
    >


  export type sensor_readingsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    device_id?: boolean
    temperature?: boolean
    humidity?: boolean
    light?: boolean
    co2?: boolean
    soil_moisture?: boolean
    earth_n?: boolean
    earth_p?: boolean
    earth_k?: boolean
    rainfall?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["sensor_readings"]>

  export type sensor_readingsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    device_id?: boolean
    temperature?: boolean
    humidity?: boolean
    light?: boolean
    co2?: boolean
    soil_moisture?: boolean
    earth_n?: boolean
    earth_p?: boolean
    earth_k?: boolean
    rainfall?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["sensor_readings"]>

  export type sensor_readingsSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    device_id?: boolean
    temperature?: boolean
    humidity?: boolean
    light?: boolean
    co2?: boolean
    soil_moisture?: boolean
    earth_n?: boolean
    earth_p?: boolean
    earth_k?: boolean
    rainfall?: boolean
    created_at?: boolean
  }, ExtArgs["result"]["sensor_readings"]>

  export type sensor_readingsSelectScalar = {
    id?: boolean
    device_id?: boolean
    temperature?: boolean
    humidity?: boolean
    light?: boolean
    co2?: boolean
    soil_moisture?: boolean
    earth_n?: boolean
    earth_p?: boolean
    earth_k?: boolean
    rainfall?: boolean
    created_at?: boolean
  }

  export type sensor_readingsOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "device_id" | "temperature" | "humidity" | "light" | "co2" | "soil_moisture" | "earth_n" | "earth_p" | "earth_k" | "rainfall" | "created_at", ExtArgs["result"]["sensor_readings"]>

  export type $sensor_readingsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "sensor_readings"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: bigint
      device_id: string | null
      temperature: number | null
      humidity: number | null
      light: number | null
      co2: number | null
      soil_moisture: number | null
      earth_n: number | null
      earth_p: number | null
      earth_k: number | null
      rainfall: number | null
      created_at: bigint
    }, ExtArgs["result"]["sensor_readings"]>
    composites: {}
  }

  type sensor_readingsGetPayload<S extends boolean | null | undefined | sensor_readingsDefaultArgs> = $Result.GetResult<Prisma.$sensor_readingsPayload, S>

  type sensor_readingsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<sensor_readingsFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: Sensor_readingsCountAggregateInputType | true
    }

  export interface sensor_readingsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['sensor_readings'], meta: { name: 'sensor_readings' } }
    /**
     * Find zero or one Sensor_readings that matches the filter.
     * @param {sensor_readingsFindUniqueArgs} args - Arguments to find a Sensor_readings
     * @example
     * // Get one Sensor_readings
     * const sensor_readings = await prisma.sensor_readings.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends sensor_readingsFindUniqueArgs>(args: SelectSubset<T, sensor_readingsFindUniqueArgs<ExtArgs>>): Prisma__sensor_readingsClient<$Result.GetResult<Prisma.$sensor_readingsPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Sensor_readings that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {sensor_readingsFindUniqueOrThrowArgs} args - Arguments to find a Sensor_readings
     * @example
     * // Get one Sensor_readings
     * const sensor_readings = await prisma.sensor_readings.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends sensor_readingsFindUniqueOrThrowArgs>(args: SelectSubset<T, sensor_readingsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__sensor_readingsClient<$Result.GetResult<Prisma.$sensor_readingsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Sensor_readings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {sensor_readingsFindFirstArgs} args - Arguments to find a Sensor_readings
     * @example
     * // Get one Sensor_readings
     * const sensor_readings = await prisma.sensor_readings.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends sensor_readingsFindFirstArgs>(args?: SelectSubset<T, sensor_readingsFindFirstArgs<ExtArgs>>): Prisma__sensor_readingsClient<$Result.GetResult<Prisma.$sensor_readingsPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Sensor_readings that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {sensor_readingsFindFirstOrThrowArgs} args - Arguments to find a Sensor_readings
     * @example
     * // Get one Sensor_readings
     * const sensor_readings = await prisma.sensor_readings.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends sensor_readingsFindFirstOrThrowArgs>(args?: SelectSubset<T, sensor_readingsFindFirstOrThrowArgs<ExtArgs>>): Prisma__sensor_readingsClient<$Result.GetResult<Prisma.$sensor_readingsPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Sensor_readings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {sensor_readingsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Sensor_readings
     * const sensor_readings = await prisma.sensor_readings.findMany()
     * 
     * // Get first 10 Sensor_readings
     * const sensor_readings = await prisma.sensor_readings.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const sensor_readingsWithIdOnly = await prisma.sensor_readings.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends sensor_readingsFindManyArgs>(args?: SelectSubset<T, sensor_readingsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$sensor_readingsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Sensor_readings.
     * @param {sensor_readingsCreateArgs} args - Arguments to create a Sensor_readings.
     * @example
     * // Create one Sensor_readings
     * const Sensor_readings = await prisma.sensor_readings.create({
     *   data: {
     *     // ... data to create a Sensor_readings
     *   }
     * })
     * 
     */
    create<T extends sensor_readingsCreateArgs>(args: SelectSubset<T, sensor_readingsCreateArgs<ExtArgs>>): Prisma__sensor_readingsClient<$Result.GetResult<Prisma.$sensor_readingsPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Sensor_readings.
     * @param {sensor_readingsCreateManyArgs} args - Arguments to create many Sensor_readings.
     * @example
     * // Create many Sensor_readings
     * const sensor_readings = await prisma.sensor_readings.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends sensor_readingsCreateManyArgs>(args?: SelectSubset<T, sensor_readingsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Sensor_readings and returns the data saved in the database.
     * @param {sensor_readingsCreateManyAndReturnArgs} args - Arguments to create many Sensor_readings.
     * @example
     * // Create many Sensor_readings
     * const sensor_readings = await prisma.sensor_readings.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Sensor_readings and only return the `id`
     * const sensor_readingsWithIdOnly = await prisma.sensor_readings.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends sensor_readingsCreateManyAndReturnArgs>(args?: SelectSubset<T, sensor_readingsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$sensor_readingsPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Sensor_readings.
     * @param {sensor_readingsDeleteArgs} args - Arguments to delete one Sensor_readings.
     * @example
     * // Delete one Sensor_readings
     * const Sensor_readings = await prisma.sensor_readings.delete({
     *   where: {
     *     // ... filter to delete one Sensor_readings
     *   }
     * })
     * 
     */
    delete<T extends sensor_readingsDeleteArgs>(args: SelectSubset<T, sensor_readingsDeleteArgs<ExtArgs>>): Prisma__sensor_readingsClient<$Result.GetResult<Prisma.$sensor_readingsPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Sensor_readings.
     * @param {sensor_readingsUpdateArgs} args - Arguments to update one Sensor_readings.
     * @example
     * // Update one Sensor_readings
     * const sensor_readings = await prisma.sensor_readings.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends sensor_readingsUpdateArgs>(args: SelectSubset<T, sensor_readingsUpdateArgs<ExtArgs>>): Prisma__sensor_readingsClient<$Result.GetResult<Prisma.$sensor_readingsPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Sensor_readings.
     * @param {sensor_readingsDeleteManyArgs} args - Arguments to filter Sensor_readings to delete.
     * @example
     * // Delete a few Sensor_readings
     * const { count } = await prisma.sensor_readings.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends sensor_readingsDeleteManyArgs>(args?: SelectSubset<T, sensor_readingsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Sensor_readings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {sensor_readingsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Sensor_readings
     * const sensor_readings = await prisma.sensor_readings.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends sensor_readingsUpdateManyArgs>(args: SelectSubset<T, sensor_readingsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Sensor_readings and returns the data updated in the database.
     * @param {sensor_readingsUpdateManyAndReturnArgs} args - Arguments to update many Sensor_readings.
     * @example
     * // Update many Sensor_readings
     * const sensor_readings = await prisma.sensor_readings.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Sensor_readings and only return the `id`
     * const sensor_readingsWithIdOnly = await prisma.sensor_readings.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends sensor_readingsUpdateManyAndReturnArgs>(args: SelectSubset<T, sensor_readingsUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$sensor_readingsPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Sensor_readings.
     * @param {sensor_readingsUpsertArgs} args - Arguments to update or create a Sensor_readings.
     * @example
     * // Update or create a Sensor_readings
     * const sensor_readings = await prisma.sensor_readings.upsert({
     *   create: {
     *     // ... data to create a Sensor_readings
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Sensor_readings we want to update
     *   }
     * })
     */
    upsert<T extends sensor_readingsUpsertArgs>(args: SelectSubset<T, sensor_readingsUpsertArgs<ExtArgs>>): Prisma__sensor_readingsClient<$Result.GetResult<Prisma.$sensor_readingsPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Sensor_readings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {sensor_readingsCountArgs} args - Arguments to filter Sensor_readings to count.
     * @example
     * // Count the number of Sensor_readings
     * const count = await prisma.sensor_readings.count({
     *   where: {
     *     // ... the filter for the Sensor_readings we want to count
     *   }
     * })
    **/
    count<T extends sensor_readingsCountArgs>(
      args?: Subset<T, sensor_readingsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], Sensor_readingsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Sensor_readings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {Sensor_readingsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends Sensor_readingsAggregateArgs>(args: Subset<T, Sensor_readingsAggregateArgs>): Prisma.PrismaPromise<GetSensor_readingsAggregateType<T>>

    /**
     * Group by Sensor_readings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {sensor_readingsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends sensor_readingsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: sensor_readingsGroupByArgs['orderBy'] }
        : { orderBy?: sensor_readingsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, sensor_readingsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSensor_readingsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the sensor_readings model
   */
  readonly fields: sensor_readingsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for sensor_readings.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__sensor_readingsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the sensor_readings model
   */
  interface sensor_readingsFieldRefs {
    readonly id: FieldRef<"sensor_readings", 'BigInt'>
    readonly device_id: FieldRef<"sensor_readings", 'String'>
    readonly temperature: FieldRef<"sensor_readings", 'Float'>
    readonly humidity: FieldRef<"sensor_readings", 'Float'>
    readonly light: FieldRef<"sensor_readings", 'Float'>
    readonly co2: FieldRef<"sensor_readings", 'Float'>
    readonly soil_moisture: FieldRef<"sensor_readings", 'Float'>
    readonly earth_n: FieldRef<"sensor_readings", 'Float'>
    readonly earth_p: FieldRef<"sensor_readings", 'Float'>
    readonly earth_k: FieldRef<"sensor_readings", 'Float'>
    readonly rainfall: FieldRef<"sensor_readings", 'Float'>
    readonly created_at: FieldRef<"sensor_readings", 'BigInt'>
  }
    

  // Custom InputTypes
  /**
   * sensor_readings findUnique
   */
  export type sensor_readingsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sensor_readings
     */
    select?: sensor_readingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sensor_readings
     */
    omit?: sensor_readingsOmit<ExtArgs> | null
    /**
     * Filter, which sensor_readings to fetch.
     */
    where: sensor_readingsWhereUniqueInput
  }

  /**
   * sensor_readings findUniqueOrThrow
   */
  export type sensor_readingsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sensor_readings
     */
    select?: sensor_readingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sensor_readings
     */
    omit?: sensor_readingsOmit<ExtArgs> | null
    /**
     * Filter, which sensor_readings to fetch.
     */
    where: sensor_readingsWhereUniqueInput
  }

  /**
   * sensor_readings findFirst
   */
  export type sensor_readingsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sensor_readings
     */
    select?: sensor_readingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sensor_readings
     */
    omit?: sensor_readingsOmit<ExtArgs> | null
    /**
     * Filter, which sensor_readings to fetch.
     */
    where?: sensor_readingsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of sensor_readings to fetch.
     */
    orderBy?: sensor_readingsOrderByWithRelationInput | sensor_readingsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for sensor_readings.
     */
    cursor?: sensor_readingsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` sensor_readings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` sensor_readings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of sensor_readings.
     */
    distinct?: Sensor_readingsScalarFieldEnum | Sensor_readingsScalarFieldEnum[]
  }

  /**
   * sensor_readings findFirstOrThrow
   */
  export type sensor_readingsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sensor_readings
     */
    select?: sensor_readingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sensor_readings
     */
    omit?: sensor_readingsOmit<ExtArgs> | null
    /**
     * Filter, which sensor_readings to fetch.
     */
    where?: sensor_readingsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of sensor_readings to fetch.
     */
    orderBy?: sensor_readingsOrderByWithRelationInput | sensor_readingsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for sensor_readings.
     */
    cursor?: sensor_readingsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` sensor_readings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` sensor_readings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of sensor_readings.
     */
    distinct?: Sensor_readingsScalarFieldEnum | Sensor_readingsScalarFieldEnum[]
  }

  /**
   * sensor_readings findMany
   */
  export type sensor_readingsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sensor_readings
     */
    select?: sensor_readingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sensor_readings
     */
    omit?: sensor_readingsOmit<ExtArgs> | null
    /**
     * Filter, which sensor_readings to fetch.
     */
    where?: sensor_readingsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of sensor_readings to fetch.
     */
    orderBy?: sensor_readingsOrderByWithRelationInput | sensor_readingsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing sensor_readings.
     */
    cursor?: sensor_readingsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` sensor_readings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` sensor_readings.
     */
    skip?: number
    distinct?: Sensor_readingsScalarFieldEnum | Sensor_readingsScalarFieldEnum[]
  }

  /**
   * sensor_readings create
   */
  export type sensor_readingsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sensor_readings
     */
    select?: sensor_readingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sensor_readings
     */
    omit?: sensor_readingsOmit<ExtArgs> | null
    /**
     * The data needed to create a sensor_readings.
     */
    data: XOR<sensor_readingsCreateInput, sensor_readingsUncheckedCreateInput>
  }

  /**
   * sensor_readings createMany
   */
  export type sensor_readingsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many sensor_readings.
     */
    data: sensor_readingsCreateManyInput | sensor_readingsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * sensor_readings createManyAndReturn
   */
  export type sensor_readingsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sensor_readings
     */
    select?: sensor_readingsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the sensor_readings
     */
    omit?: sensor_readingsOmit<ExtArgs> | null
    /**
     * The data used to create many sensor_readings.
     */
    data: sensor_readingsCreateManyInput | sensor_readingsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * sensor_readings update
   */
  export type sensor_readingsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sensor_readings
     */
    select?: sensor_readingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sensor_readings
     */
    omit?: sensor_readingsOmit<ExtArgs> | null
    /**
     * The data needed to update a sensor_readings.
     */
    data: XOR<sensor_readingsUpdateInput, sensor_readingsUncheckedUpdateInput>
    /**
     * Choose, which sensor_readings to update.
     */
    where: sensor_readingsWhereUniqueInput
  }

  /**
   * sensor_readings updateMany
   */
  export type sensor_readingsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update sensor_readings.
     */
    data: XOR<sensor_readingsUpdateManyMutationInput, sensor_readingsUncheckedUpdateManyInput>
    /**
     * Filter which sensor_readings to update
     */
    where?: sensor_readingsWhereInput
    /**
     * Limit how many sensor_readings to update.
     */
    limit?: number
  }

  /**
   * sensor_readings updateManyAndReturn
   */
  export type sensor_readingsUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sensor_readings
     */
    select?: sensor_readingsSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the sensor_readings
     */
    omit?: sensor_readingsOmit<ExtArgs> | null
    /**
     * The data used to update sensor_readings.
     */
    data: XOR<sensor_readingsUpdateManyMutationInput, sensor_readingsUncheckedUpdateManyInput>
    /**
     * Filter which sensor_readings to update
     */
    where?: sensor_readingsWhereInput
    /**
     * Limit how many sensor_readings to update.
     */
    limit?: number
  }

  /**
   * sensor_readings upsert
   */
  export type sensor_readingsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sensor_readings
     */
    select?: sensor_readingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sensor_readings
     */
    omit?: sensor_readingsOmit<ExtArgs> | null
    /**
     * The filter to search for the sensor_readings to update in case it exists.
     */
    where: sensor_readingsWhereUniqueInput
    /**
     * In case the sensor_readings found by the `where` argument doesn't exist, create a new sensor_readings with this data.
     */
    create: XOR<sensor_readingsCreateInput, sensor_readingsUncheckedCreateInput>
    /**
     * In case the sensor_readings was found with the provided `where` argument, update it with this data.
     */
    update: XOR<sensor_readingsUpdateInput, sensor_readingsUncheckedUpdateInput>
  }

  /**
   * sensor_readings delete
   */
  export type sensor_readingsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sensor_readings
     */
    select?: sensor_readingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sensor_readings
     */
    omit?: sensor_readingsOmit<ExtArgs> | null
    /**
     * Filter which sensor_readings to delete.
     */
    where: sensor_readingsWhereUniqueInput
  }

  /**
   * sensor_readings deleteMany
   */
  export type sensor_readingsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which sensor_readings to delete
     */
    where?: sensor_readingsWhereInput
    /**
     * Limit how many sensor_readings to delete.
     */
    limit?: number
  }

  /**
   * sensor_readings without action
   */
  export type sensor_readingsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the sensor_readings
     */
    select?: sensor_readingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the sensor_readings
     */
    omit?: sensor_readingsOmit<ExtArgs> | null
  }


  /**
   * Model system_settings
   */

  export type AggregateSystem_settings = {
    _count: System_settingsCountAggregateOutputType | null
    _avg: System_settingsAvgAggregateOutputType | null
    _sum: System_settingsSumAggregateOutputType | null
    _min: System_settingsMinAggregateOutputType | null
    _max: System_settingsMaxAggregateOutputType | null
  }

  export type System_settingsAvgAggregateOutputType = {
    updated_at: number | null
  }

  export type System_settingsSumAggregateOutputType = {
    updated_at: bigint | null
  }

  export type System_settingsMinAggregateOutputType = {
    key: string | null
    value: string | null
    updated_at: bigint | null
  }

  export type System_settingsMaxAggregateOutputType = {
    key: string | null
    value: string | null
    updated_at: bigint | null
  }

  export type System_settingsCountAggregateOutputType = {
    key: number
    value: number
    updated_at: number
    _all: number
  }


  export type System_settingsAvgAggregateInputType = {
    updated_at?: true
  }

  export type System_settingsSumAggregateInputType = {
    updated_at?: true
  }

  export type System_settingsMinAggregateInputType = {
    key?: true
    value?: true
    updated_at?: true
  }

  export type System_settingsMaxAggregateInputType = {
    key?: true
    value?: true
    updated_at?: true
  }

  export type System_settingsCountAggregateInputType = {
    key?: true
    value?: true
    updated_at?: true
    _all?: true
  }

  export type System_settingsAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which system_settings to aggregate.
     */
    where?: system_settingsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of system_settings to fetch.
     */
    orderBy?: system_settingsOrderByWithRelationInput | system_settingsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: system_settingsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` system_settings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` system_settings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned system_settings
    **/
    _count?: true | System_settingsCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: System_settingsAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: System_settingsSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: System_settingsMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: System_settingsMaxAggregateInputType
  }

  export type GetSystem_settingsAggregateType<T extends System_settingsAggregateArgs> = {
        [P in keyof T & keyof AggregateSystem_settings]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSystem_settings[P]>
      : GetScalarType<T[P], AggregateSystem_settings[P]>
  }




  export type system_settingsGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: system_settingsWhereInput
    orderBy?: system_settingsOrderByWithAggregationInput | system_settingsOrderByWithAggregationInput[]
    by: System_settingsScalarFieldEnum[] | System_settingsScalarFieldEnum
    having?: system_settingsScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: System_settingsCountAggregateInputType | true
    _avg?: System_settingsAvgAggregateInputType
    _sum?: System_settingsSumAggregateInputType
    _min?: System_settingsMinAggregateInputType
    _max?: System_settingsMaxAggregateInputType
  }

  export type System_settingsGroupByOutputType = {
    key: string
    value: string
    updated_at: bigint
    _count: System_settingsCountAggregateOutputType | null
    _avg: System_settingsAvgAggregateOutputType | null
    _sum: System_settingsSumAggregateOutputType | null
    _min: System_settingsMinAggregateOutputType | null
    _max: System_settingsMaxAggregateOutputType | null
  }

  type GetSystem_settingsGroupByPayload<T extends system_settingsGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<System_settingsGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof System_settingsGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], System_settingsGroupByOutputType[P]>
            : GetScalarType<T[P], System_settingsGroupByOutputType[P]>
        }
      >
    >


  export type system_settingsSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    key?: boolean
    value?: boolean
    updated_at?: boolean
  }, ExtArgs["result"]["system_settings"]>

  export type system_settingsSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    key?: boolean
    value?: boolean
    updated_at?: boolean
  }, ExtArgs["result"]["system_settings"]>

  export type system_settingsSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    key?: boolean
    value?: boolean
    updated_at?: boolean
  }, ExtArgs["result"]["system_settings"]>

  export type system_settingsSelectScalar = {
    key?: boolean
    value?: boolean
    updated_at?: boolean
  }

  export type system_settingsOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"key" | "value" | "updated_at", ExtArgs["result"]["system_settings"]>

  export type $system_settingsPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "system_settings"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      key: string
      value: string
      updated_at: bigint
    }, ExtArgs["result"]["system_settings"]>
    composites: {}
  }

  type system_settingsGetPayload<S extends boolean | null | undefined | system_settingsDefaultArgs> = $Result.GetResult<Prisma.$system_settingsPayload, S>

  type system_settingsCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<system_settingsFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: System_settingsCountAggregateInputType | true
    }

  export interface system_settingsDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['system_settings'], meta: { name: 'system_settings' } }
    /**
     * Find zero or one System_settings that matches the filter.
     * @param {system_settingsFindUniqueArgs} args - Arguments to find a System_settings
     * @example
     * // Get one System_settings
     * const system_settings = await prisma.system_settings.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends system_settingsFindUniqueArgs>(args: SelectSubset<T, system_settingsFindUniqueArgs<ExtArgs>>): Prisma__system_settingsClient<$Result.GetResult<Prisma.$system_settingsPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one System_settings that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {system_settingsFindUniqueOrThrowArgs} args - Arguments to find a System_settings
     * @example
     * // Get one System_settings
     * const system_settings = await prisma.system_settings.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends system_settingsFindUniqueOrThrowArgs>(args: SelectSubset<T, system_settingsFindUniqueOrThrowArgs<ExtArgs>>): Prisma__system_settingsClient<$Result.GetResult<Prisma.$system_settingsPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first System_settings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {system_settingsFindFirstArgs} args - Arguments to find a System_settings
     * @example
     * // Get one System_settings
     * const system_settings = await prisma.system_settings.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends system_settingsFindFirstArgs>(args?: SelectSubset<T, system_settingsFindFirstArgs<ExtArgs>>): Prisma__system_settingsClient<$Result.GetResult<Prisma.$system_settingsPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first System_settings that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {system_settingsFindFirstOrThrowArgs} args - Arguments to find a System_settings
     * @example
     * // Get one System_settings
     * const system_settings = await prisma.system_settings.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends system_settingsFindFirstOrThrowArgs>(args?: SelectSubset<T, system_settingsFindFirstOrThrowArgs<ExtArgs>>): Prisma__system_settingsClient<$Result.GetResult<Prisma.$system_settingsPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more System_settings that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {system_settingsFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all System_settings
     * const system_settings = await prisma.system_settings.findMany()
     * 
     * // Get first 10 System_settings
     * const system_settings = await prisma.system_settings.findMany({ take: 10 })
     * 
     * // Only select the `key`
     * const system_settingsWithKeyOnly = await prisma.system_settings.findMany({ select: { key: true } })
     * 
     */
    findMany<T extends system_settingsFindManyArgs>(args?: SelectSubset<T, system_settingsFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$system_settingsPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a System_settings.
     * @param {system_settingsCreateArgs} args - Arguments to create a System_settings.
     * @example
     * // Create one System_settings
     * const System_settings = await prisma.system_settings.create({
     *   data: {
     *     // ... data to create a System_settings
     *   }
     * })
     * 
     */
    create<T extends system_settingsCreateArgs>(args: SelectSubset<T, system_settingsCreateArgs<ExtArgs>>): Prisma__system_settingsClient<$Result.GetResult<Prisma.$system_settingsPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many System_settings.
     * @param {system_settingsCreateManyArgs} args - Arguments to create many System_settings.
     * @example
     * // Create many System_settings
     * const system_settings = await prisma.system_settings.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends system_settingsCreateManyArgs>(args?: SelectSubset<T, system_settingsCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many System_settings and returns the data saved in the database.
     * @param {system_settingsCreateManyAndReturnArgs} args - Arguments to create many System_settings.
     * @example
     * // Create many System_settings
     * const system_settings = await prisma.system_settings.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many System_settings and only return the `key`
     * const system_settingsWithKeyOnly = await prisma.system_settings.createManyAndReturn({
     *   select: { key: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends system_settingsCreateManyAndReturnArgs>(args?: SelectSubset<T, system_settingsCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$system_settingsPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a System_settings.
     * @param {system_settingsDeleteArgs} args - Arguments to delete one System_settings.
     * @example
     * // Delete one System_settings
     * const System_settings = await prisma.system_settings.delete({
     *   where: {
     *     // ... filter to delete one System_settings
     *   }
     * })
     * 
     */
    delete<T extends system_settingsDeleteArgs>(args: SelectSubset<T, system_settingsDeleteArgs<ExtArgs>>): Prisma__system_settingsClient<$Result.GetResult<Prisma.$system_settingsPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one System_settings.
     * @param {system_settingsUpdateArgs} args - Arguments to update one System_settings.
     * @example
     * // Update one System_settings
     * const system_settings = await prisma.system_settings.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends system_settingsUpdateArgs>(args: SelectSubset<T, system_settingsUpdateArgs<ExtArgs>>): Prisma__system_settingsClient<$Result.GetResult<Prisma.$system_settingsPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more System_settings.
     * @param {system_settingsDeleteManyArgs} args - Arguments to filter System_settings to delete.
     * @example
     * // Delete a few System_settings
     * const { count } = await prisma.system_settings.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends system_settingsDeleteManyArgs>(args?: SelectSubset<T, system_settingsDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more System_settings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {system_settingsUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many System_settings
     * const system_settings = await prisma.system_settings.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends system_settingsUpdateManyArgs>(args: SelectSubset<T, system_settingsUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more System_settings and returns the data updated in the database.
     * @param {system_settingsUpdateManyAndReturnArgs} args - Arguments to update many System_settings.
     * @example
     * // Update many System_settings
     * const system_settings = await prisma.system_settings.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more System_settings and only return the `key`
     * const system_settingsWithKeyOnly = await prisma.system_settings.updateManyAndReturn({
     *   select: { key: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends system_settingsUpdateManyAndReturnArgs>(args: SelectSubset<T, system_settingsUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$system_settingsPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one System_settings.
     * @param {system_settingsUpsertArgs} args - Arguments to update or create a System_settings.
     * @example
     * // Update or create a System_settings
     * const system_settings = await prisma.system_settings.upsert({
     *   create: {
     *     // ... data to create a System_settings
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the System_settings we want to update
     *   }
     * })
     */
    upsert<T extends system_settingsUpsertArgs>(args: SelectSubset<T, system_settingsUpsertArgs<ExtArgs>>): Prisma__system_settingsClient<$Result.GetResult<Prisma.$system_settingsPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of System_settings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {system_settingsCountArgs} args - Arguments to filter System_settings to count.
     * @example
     * // Count the number of System_settings
     * const count = await prisma.system_settings.count({
     *   where: {
     *     // ... the filter for the System_settings we want to count
     *   }
     * })
    **/
    count<T extends system_settingsCountArgs>(
      args?: Subset<T, system_settingsCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], System_settingsCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a System_settings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {System_settingsAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends System_settingsAggregateArgs>(args: Subset<T, System_settingsAggregateArgs>): Prisma.PrismaPromise<GetSystem_settingsAggregateType<T>>

    /**
     * Group by System_settings.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {system_settingsGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends system_settingsGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: system_settingsGroupByArgs['orderBy'] }
        : { orderBy?: system_settingsGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, system_settingsGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSystem_settingsGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the system_settings model
   */
  readonly fields: system_settingsFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for system_settings.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__system_settingsClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the system_settings model
   */
  interface system_settingsFieldRefs {
    readonly key: FieldRef<"system_settings", 'String'>
    readonly value: FieldRef<"system_settings", 'String'>
    readonly updated_at: FieldRef<"system_settings", 'BigInt'>
  }
    

  // Custom InputTypes
  /**
   * system_settings findUnique
   */
  export type system_settingsFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the system_settings
     */
    select?: system_settingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the system_settings
     */
    omit?: system_settingsOmit<ExtArgs> | null
    /**
     * Filter, which system_settings to fetch.
     */
    where: system_settingsWhereUniqueInput
  }

  /**
   * system_settings findUniqueOrThrow
   */
  export type system_settingsFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the system_settings
     */
    select?: system_settingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the system_settings
     */
    omit?: system_settingsOmit<ExtArgs> | null
    /**
     * Filter, which system_settings to fetch.
     */
    where: system_settingsWhereUniqueInput
  }

  /**
   * system_settings findFirst
   */
  export type system_settingsFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the system_settings
     */
    select?: system_settingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the system_settings
     */
    omit?: system_settingsOmit<ExtArgs> | null
    /**
     * Filter, which system_settings to fetch.
     */
    where?: system_settingsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of system_settings to fetch.
     */
    orderBy?: system_settingsOrderByWithRelationInput | system_settingsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for system_settings.
     */
    cursor?: system_settingsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` system_settings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` system_settings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of system_settings.
     */
    distinct?: System_settingsScalarFieldEnum | System_settingsScalarFieldEnum[]
  }

  /**
   * system_settings findFirstOrThrow
   */
  export type system_settingsFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the system_settings
     */
    select?: system_settingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the system_settings
     */
    omit?: system_settingsOmit<ExtArgs> | null
    /**
     * Filter, which system_settings to fetch.
     */
    where?: system_settingsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of system_settings to fetch.
     */
    orderBy?: system_settingsOrderByWithRelationInput | system_settingsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for system_settings.
     */
    cursor?: system_settingsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` system_settings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` system_settings.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of system_settings.
     */
    distinct?: System_settingsScalarFieldEnum | System_settingsScalarFieldEnum[]
  }

  /**
   * system_settings findMany
   */
  export type system_settingsFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the system_settings
     */
    select?: system_settingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the system_settings
     */
    omit?: system_settingsOmit<ExtArgs> | null
    /**
     * Filter, which system_settings to fetch.
     */
    where?: system_settingsWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of system_settings to fetch.
     */
    orderBy?: system_settingsOrderByWithRelationInput | system_settingsOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing system_settings.
     */
    cursor?: system_settingsWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` system_settings from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` system_settings.
     */
    skip?: number
    distinct?: System_settingsScalarFieldEnum | System_settingsScalarFieldEnum[]
  }

  /**
   * system_settings create
   */
  export type system_settingsCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the system_settings
     */
    select?: system_settingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the system_settings
     */
    omit?: system_settingsOmit<ExtArgs> | null
    /**
     * The data needed to create a system_settings.
     */
    data: XOR<system_settingsCreateInput, system_settingsUncheckedCreateInput>
  }

  /**
   * system_settings createMany
   */
  export type system_settingsCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many system_settings.
     */
    data: system_settingsCreateManyInput | system_settingsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * system_settings createManyAndReturn
   */
  export type system_settingsCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the system_settings
     */
    select?: system_settingsSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the system_settings
     */
    omit?: system_settingsOmit<ExtArgs> | null
    /**
     * The data used to create many system_settings.
     */
    data: system_settingsCreateManyInput | system_settingsCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * system_settings update
   */
  export type system_settingsUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the system_settings
     */
    select?: system_settingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the system_settings
     */
    omit?: system_settingsOmit<ExtArgs> | null
    /**
     * The data needed to update a system_settings.
     */
    data: XOR<system_settingsUpdateInput, system_settingsUncheckedUpdateInput>
    /**
     * Choose, which system_settings to update.
     */
    where: system_settingsWhereUniqueInput
  }

  /**
   * system_settings updateMany
   */
  export type system_settingsUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update system_settings.
     */
    data: XOR<system_settingsUpdateManyMutationInput, system_settingsUncheckedUpdateManyInput>
    /**
     * Filter which system_settings to update
     */
    where?: system_settingsWhereInput
    /**
     * Limit how many system_settings to update.
     */
    limit?: number
  }

  /**
   * system_settings updateManyAndReturn
   */
  export type system_settingsUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the system_settings
     */
    select?: system_settingsSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the system_settings
     */
    omit?: system_settingsOmit<ExtArgs> | null
    /**
     * The data used to update system_settings.
     */
    data: XOR<system_settingsUpdateManyMutationInput, system_settingsUncheckedUpdateManyInput>
    /**
     * Filter which system_settings to update
     */
    where?: system_settingsWhereInput
    /**
     * Limit how many system_settings to update.
     */
    limit?: number
  }

  /**
   * system_settings upsert
   */
  export type system_settingsUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the system_settings
     */
    select?: system_settingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the system_settings
     */
    omit?: system_settingsOmit<ExtArgs> | null
    /**
     * The filter to search for the system_settings to update in case it exists.
     */
    where: system_settingsWhereUniqueInput
    /**
     * In case the system_settings found by the `where` argument doesn't exist, create a new system_settings with this data.
     */
    create: XOR<system_settingsCreateInput, system_settingsUncheckedCreateInput>
    /**
     * In case the system_settings was found with the provided `where` argument, update it with this data.
     */
    update: XOR<system_settingsUpdateInput, system_settingsUncheckedUpdateInput>
  }

  /**
   * system_settings delete
   */
  export type system_settingsDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the system_settings
     */
    select?: system_settingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the system_settings
     */
    omit?: system_settingsOmit<ExtArgs> | null
    /**
     * Filter which system_settings to delete.
     */
    where: system_settingsWhereUniqueInput
  }

  /**
   * system_settings deleteMany
   */
  export type system_settingsDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which system_settings to delete
     */
    where?: system_settingsWhereInput
    /**
     * Limit how many system_settings to delete.
     */
    limit?: number
  }

  /**
   * system_settings without action
   */
  export type system_settingsDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the system_settings
     */
    select?: system_settingsSelect<ExtArgs> | null
    /**
     * Omit specific fields from the system_settings
     */
    omit?: system_settingsOmit<ExtArgs> | null
  }


  /**
   * Model users
   */

  export type AggregateUsers = {
    _count: UsersCountAggregateOutputType | null
    _avg: UsersAvgAggregateOutputType | null
    _sum: UsersSumAggregateOutputType | null
    _min: UsersMinAggregateOutputType | null
    _max: UsersMaxAggregateOutputType | null
  }

  export type UsersAvgAggregateOutputType = {
    id: number | null
    daily_ai_limit: number | null
    daily_ai_usage: number | null
    ai_balance: number | null
    email_verified: number | null
    email_verified_at: number | null
    created_at: number | null
    updated_at: number | null
  }

  export type UsersSumAggregateOutputType = {
    id: bigint | null
    daily_ai_limit: number | null
    daily_ai_usage: number | null
    ai_balance: number | null
    email_verified: number | null
    email_verified_at: bigint | null
    created_at: bigint | null
    updated_at: bigint | null
  }

  export type UsersMinAggregateOutputType = {
    id: bigint | null
    uid: string | null
    email: string | null
    password_hash: string | null
    username: string | null
    avatar_url: string | null
    role: string | null
    permissions: string | null
    wechat_openid: string | null
    wechat_unionid: string | null
    wework_userid: string | null
    qq_openid: string | null
    alipay_user_id: string | null
    notification_settings: string | null
    daily_ai_limit: number | null
    daily_ai_usage: number | null
    last_ai_usage_date: string | null
    ai_balance: number | null
    email_verified: number | null
    email_verified_at: bigint | null
    public_key: string | null
    created_at: bigint | null
    updated_at: bigint | null
  }

  export type UsersMaxAggregateOutputType = {
    id: bigint | null
    uid: string | null
    email: string | null
    password_hash: string | null
    username: string | null
    avatar_url: string | null
    role: string | null
    permissions: string | null
    wechat_openid: string | null
    wechat_unionid: string | null
    wework_userid: string | null
    qq_openid: string | null
    alipay_user_id: string | null
    notification_settings: string | null
    daily_ai_limit: number | null
    daily_ai_usage: number | null
    last_ai_usage_date: string | null
    ai_balance: number | null
    email_verified: number | null
    email_verified_at: bigint | null
    public_key: string | null
    created_at: bigint | null
    updated_at: bigint | null
  }

  export type UsersCountAggregateOutputType = {
    id: number
    uid: number
    email: number
    password_hash: number
    username: number
    avatar_url: number
    role: number
    permissions: number
    wechat_openid: number
    wechat_unionid: number
    wework_userid: number
    qq_openid: number
    alipay_user_id: number
    notification_settings: number
    daily_ai_limit: number
    daily_ai_usage: number
    last_ai_usage_date: number
    ai_balance: number
    email_verified: number
    email_verified_at: number
    public_key: number
    created_at: number
    updated_at: number
    _all: number
  }


  export type UsersAvgAggregateInputType = {
    id?: true
    daily_ai_limit?: true
    daily_ai_usage?: true
    ai_balance?: true
    email_verified?: true
    email_verified_at?: true
    created_at?: true
    updated_at?: true
  }

  export type UsersSumAggregateInputType = {
    id?: true
    daily_ai_limit?: true
    daily_ai_usage?: true
    ai_balance?: true
    email_verified?: true
    email_verified_at?: true
    created_at?: true
    updated_at?: true
  }

  export type UsersMinAggregateInputType = {
    id?: true
    uid?: true
    email?: true
    password_hash?: true
    username?: true
    avatar_url?: true
    role?: true
    permissions?: true
    wechat_openid?: true
    wechat_unionid?: true
    wework_userid?: true
    qq_openid?: true
    alipay_user_id?: true
    notification_settings?: true
    daily_ai_limit?: true
    daily_ai_usage?: true
    last_ai_usage_date?: true
    ai_balance?: true
    email_verified?: true
    email_verified_at?: true
    public_key?: true
    created_at?: true
    updated_at?: true
  }

  export type UsersMaxAggregateInputType = {
    id?: true
    uid?: true
    email?: true
    password_hash?: true
    username?: true
    avatar_url?: true
    role?: true
    permissions?: true
    wechat_openid?: true
    wechat_unionid?: true
    wework_userid?: true
    qq_openid?: true
    alipay_user_id?: true
    notification_settings?: true
    daily_ai_limit?: true
    daily_ai_usage?: true
    last_ai_usage_date?: true
    ai_balance?: true
    email_verified?: true
    email_verified_at?: true
    public_key?: true
    created_at?: true
    updated_at?: true
  }

  export type UsersCountAggregateInputType = {
    id?: true
    uid?: true
    email?: true
    password_hash?: true
    username?: true
    avatar_url?: true
    role?: true
    permissions?: true
    wechat_openid?: true
    wechat_unionid?: true
    wework_userid?: true
    qq_openid?: true
    alipay_user_id?: true
    notification_settings?: true
    daily_ai_limit?: true
    daily_ai_usage?: true
    last_ai_usage_date?: true
    ai_balance?: true
    email_verified?: true
    email_verified_at?: true
    public_key?: true
    created_at?: true
    updated_at?: true
    _all?: true
  }

  export type UsersAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which users to aggregate.
     */
    where?: usersWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of users to fetch.
     */
    orderBy?: usersOrderByWithRelationInput | usersOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: usersWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned users
    **/
    _count?: true | UsersCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: UsersAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: UsersSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UsersMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UsersMaxAggregateInputType
  }

  export type GetUsersAggregateType<T extends UsersAggregateArgs> = {
        [P in keyof T & keyof AggregateUsers]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUsers[P]>
      : GetScalarType<T[P], AggregateUsers[P]>
  }




  export type usersGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: usersWhereInput
    orderBy?: usersOrderByWithAggregationInput | usersOrderByWithAggregationInput[]
    by: UsersScalarFieldEnum[] | UsersScalarFieldEnum
    having?: usersScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UsersCountAggregateInputType | true
    _avg?: UsersAvgAggregateInputType
    _sum?: UsersSumAggregateInputType
    _min?: UsersMinAggregateInputType
    _max?: UsersMaxAggregateInputType
  }

  export type UsersGroupByOutputType = {
    id: bigint
    uid: string | null
    email: string | null
    password_hash: string | null
    username: string
    avatar_url: string | null
    role: string | null
    permissions: string | null
    wechat_openid: string | null
    wechat_unionid: string | null
    wework_userid: string | null
    qq_openid: string | null
    alipay_user_id: string | null
    notification_settings: string | null
    daily_ai_limit: number | null
    daily_ai_usage: number | null
    last_ai_usage_date: string | null
    ai_balance: number | null
    email_verified: number | null
    email_verified_at: bigint | null
    public_key: string | null
    created_at: bigint
    updated_at: bigint
    _count: UsersCountAggregateOutputType | null
    _avg: UsersAvgAggregateOutputType | null
    _sum: UsersSumAggregateOutputType | null
    _min: UsersMinAggregateOutputType | null
    _max: UsersMaxAggregateOutputType | null
  }

  type GetUsersGroupByPayload<T extends usersGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UsersGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UsersGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UsersGroupByOutputType[P]>
            : GetScalarType<T[P], UsersGroupByOutputType[P]>
        }
      >
    >


  export type usersSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    uid?: boolean
    email?: boolean
    password_hash?: boolean
    username?: boolean
    avatar_url?: boolean
    role?: boolean
    permissions?: boolean
    wechat_openid?: boolean
    wechat_unionid?: boolean
    wework_userid?: boolean
    qq_openid?: boolean
    alipay_user_id?: boolean
    notification_settings?: boolean
    daily_ai_limit?: boolean
    daily_ai_usage?: boolean
    last_ai_usage_date?: boolean
    ai_balance?: boolean
    email_verified?: boolean
    email_verified_at?: boolean
    public_key?: boolean
    created_at?: boolean
    updated_at?: boolean
  }, ExtArgs["result"]["users"]>

  export type usersSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    uid?: boolean
    email?: boolean
    password_hash?: boolean
    username?: boolean
    avatar_url?: boolean
    role?: boolean
    permissions?: boolean
    wechat_openid?: boolean
    wechat_unionid?: boolean
    wework_userid?: boolean
    qq_openid?: boolean
    alipay_user_id?: boolean
    notification_settings?: boolean
    daily_ai_limit?: boolean
    daily_ai_usage?: boolean
    last_ai_usage_date?: boolean
    ai_balance?: boolean
    email_verified?: boolean
    email_verified_at?: boolean
    public_key?: boolean
    created_at?: boolean
    updated_at?: boolean
  }, ExtArgs["result"]["users"]>

  export type usersSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    uid?: boolean
    email?: boolean
    password_hash?: boolean
    username?: boolean
    avatar_url?: boolean
    role?: boolean
    permissions?: boolean
    wechat_openid?: boolean
    wechat_unionid?: boolean
    wework_userid?: boolean
    qq_openid?: boolean
    alipay_user_id?: boolean
    notification_settings?: boolean
    daily_ai_limit?: boolean
    daily_ai_usage?: boolean
    last_ai_usage_date?: boolean
    ai_balance?: boolean
    email_verified?: boolean
    email_verified_at?: boolean
    public_key?: boolean
    created_at?: boolean
    updated_at?: boolean
  }, ExtArgs["result"]["users"]>

  export type usersSelectScalar = {
    id?: boolean
    uid?: boolean
    email?: boolean
    password_hash?: boolean
    username?: boolean
    avatar_url?: boolean
    role?: boolean
    permissions?: boolean
    wechat_openid?: boolean
    wechat_unionid?: boolean
    wework_userid?: boolean
    qq_openid?: boolean
    alipay_user_id?: boolean
    notification_settings?: boolean
    daily_ai_limit?: boolean
    daily_ai_usage?: boolean
    last_ai_usage_date?: boolean
    ai_balance?: boolean
    email_verified?: boolean
    email_verified_at?: boolean
    public_key?: boolean
    created_at?: boolean
    updated_at?: boolean
  }

  export type usersOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "uid" | "email" | "password_hash" | "username" | "avatar_url" | "role" | "permissions" | "wechat_openid" | "wechat_unionid" | "wework_userid" | "qq_openid" | "alipay_user_id" | "notification_settings" | "daily_ai_limit" | "daily_ai_usage" | "last_ai_usage_date" | "ai_balance" | "email_verified" | "email_verified_at" | "public_key" | "created_at" | "updated_at", ExtArgs["result"]["users"]>

  export type $usersPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "users"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: bigint
      uid: string | null
      email: string | null
      password_hash: string | null
      username: string
      avatar_url: string | null
      role: string | null
      permissions: string | null
      wechat_openid: string | null
      wechat_unionid: string | null
      wework_userid: string | null
      qq_openid: string | null
      alipay_user_id: string | null
      notification_settings: string | null
      daily_ai_limit: number | null
      daily_ai_usage: number | null
      last_ai_usage_date: string | null
      ai_balance: number | null
      email_verified: number | null
      email_verified_at: bigint | null
      public_key: string | null
      created_at: bigint
      updated_at: bigint
    }, ExtArgs["result"]["users"]>
    composites: {}
  }

  type usersGetPayload<S extends boolean | null | undefined | usersDefaultArgs> = $Result.GetResult<Prisma.$usersPayload, S>

  type usersCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<usersFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UsersCountAggregateInputType | true
    }

  export interface usersDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['users'], meta: { name: 'users' } }
    /**
     * Find zero or one Users that matches the filter.
     * @param {usersFindUniqueArgs} args - Arguments to find a Users
     * @example
     * // Get one Users
     * const users = await prisma.users.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends usersFindUniqueArgs>(args: SelectSubset<T, usersFindUniqueArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Users that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {usersFindUniqueOrThrowArgs} args - Arguments to find a Users
     * @example
     * // Get one Users
     * const users = await prisma.users.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends usersFindUniqueOrThrowArgs>(args: SelectSubset<T, usersFindUniqueOrThrowArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {usersFindFirstArgs} args - Arguments to find a Users
     * @example
     * // Get one Users
     * const users = await prisma.users.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends usersFindFirstArgs>(args?: SelectSubset<T, usersFindFirstArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Users that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {usersFindFirstOrThrowArgs} args - Arguments to find a Users
     * @example
     * // Get one Users
     * const users = await prisma.users.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends usersFindFirstOrThrowArgs>(args?: SelectSubset<T, usersFindFirstOrThrowArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {usersFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.users.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.users.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const usersWithIdOnly = await prisma.users.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends usersFindManyArgs>(args?: SelectSubset<T, usersFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Users.
     * @param {usersCreateArgs} args - Arguments to create a Users.
     * @example
     * // Create one Users
     * const Users = await prisma.users.create({
     *   data: {
     *     // ... data to create a Users
     *   }
     * })
     * 
     */
    create<T extends usersCreateArgs>(args: SelectSubset<T, usersCreateArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {usersCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const users = await prisma.users.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends usersCreateManyArgs>(args?: SelectSubset<T, usersCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {usersCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const users = await prisma.users.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const usersWithIdOnly = await prisma.users.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends usersCreateManyAndReturnArgs>(args?: SelectSubset<T, usersCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Users.
     * @param {usersDeleteArgs} args - Arguments to delete one Users.
     * @example
     * // Delete one Users
     * const Users = await prisma.users.delete({
     *   where: {
     *     // ... filter to delete one Users
     *   }
     * })
     * 
     */
    delete<T extends usersDeleteArgs>(args: SelectSubset<T, usersDeleteArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Users.
     * @param {usersUpdateArgs} args - Arguments to update one Users.
     * @example
     * // Update one Users
     * const users = await prisma.users.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends usersUpdateArgs>(args: SelectSubset<T, usersUpdateArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {usersDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.users.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends usersDeleteManyArgs>(args?: SelectSubset<T, usersDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {usersUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const users = await prisma.users.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends usersUpdateManyArgs>(args: SelectSubset<T, usersUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {usersUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const users = await prisma.users.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `id`
     * const usersWithIdOnly = await prisma.users.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends usersUpdateManyAndReturnArgs>(args: SelectSubset<T, usersUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Users.
     * @param {usersUpsertArgs} args - Arguments to update or create a Users.
     * @example
     * // Update or create a Users
     * const users = await prisma.users.upsert({
     *   create: {
     *     // ... data to create a Users
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Users we want to update
     *   }
     * })
     */
    upsert<T extends usersUpsertArgs>(args: SelectSubset<T, usersUpsertArgs<ExtArgs>>): Prisma__usersClient<$Result.GetResult<Prisma.$usersPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {usersCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.users.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends usersCountArgs>(
      args?: Subset<T, usersCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UsersCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UsersAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UsersAggregateArgs>(args: Subset<T, UsersAggregateArgs>): Prisma.PrismaPromise<GetUsersAggregateType<T>>

    /**
     * Group by Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {usersGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends usersGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: usersGroupByArgs['orderBy'] }
        : { orderBy?: usersGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, usersGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUsersGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the users model
   */
  readonly fields: usersFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for users.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__usersClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the users model
   */
  interface usersFieldRefs {
    readonly id: FieldRef<"users", 'BigInt'>
    readonly uid: FieldRef<"users", 'String'>
    readonly email: FieldRef<"users", 'String'>
    readonly password_hash: FieldRef<"users", 'String'>
    readonly username: FieldRef<"users", 'String'>
    readonly avatar_url: FieldRef<"users", 'String'>
    readonly role: FieldRef<"users", 'String'>
    readonly permissions: FieldRef<"users", 'String'>
    readonly wechat_openid: FieldRef<"users", 'String'>
    readonly wechat_unionid: FieldRef<"users", 'String'>
    readonly wework_userid: FieldRef<"users", 'String'>
    readonly qq_openid: FieldRef<"users", 'String'>
    readonly alipay_user_id: FieldRef<"users", 'String'>
    readonly notification_settings: FieldRef<"users", 'String'>
    readonly daily_ai_limit: FieldRef<"users", 'Int'>
    readonly daily_ai_usage: FieldRef<"users", 'Int'>
    readonly last_ai_usage_date: FieldRef<"users", 'String'>
    readonly ai_balance: FieldRef<"users", 'Int'>
    readonly email_verified: FieldRef<"users", 'Int'>
    readonly email_verified_at: FieldRef<"users", 'BigInt'>
    readonly public_key: FieldRef<"users", 'String'>
    readonly created_at: FieldRef<"users", 'BigInt'>
    readonly updated_at: FieldRef<"users", 'BigInt'>
  }
    

  // Custom InputTypes
  /**
   * users findUnique
   */
  export type usersFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the users
     */
    omit?: usersOmit<ExtArgs> | null
    /**
     * Filter, which users to fetch.
     */
    where: usersWhereUniqueInput
  }

  /**
   * users findUniqueOrThrow
   */
  export type usersFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the users
     */
    omit?: usersOmit<ExtArgs> | null
    /**
     * Filter, which users to fetch.
     */
    where: usersWhereUniqueInput
  }

  /**
   * users findFirst
   */
  export type usersFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the users
     */
    omit?: usersOmit<ExtArgs> | null
    /**
     * Filter, which users to fetch.
     */
    where?: usersWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of users to fetch.
     */
    orderBy?: usersOrderByWithRelationInput | usersOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for users.
     */
    cursor?: usersWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of users.
     */
    distinct?: UsersScalarFieldEnum | UsersScalarFieldEnum[]
  }

  /**
   * users findFirstOrThrow
   */
  export type usersFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the users
     */
    omit?: usersOmit<ExtArgs> | null
    /**
     * Filter, which users to fetch.
     */
    where?: usersWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of users to fetch.
     */
    orderBy?: usersOrderByWithRelationInput | usersOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for users.
     */
    cursor?: usersWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of users.
     */
    distinct?: UsersScalarFieldEnum | UsersScalarFieldEnum[]
  }

  /**
   * users findMany
   */
  export type usersFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the users
     */
    omit?: usersOmit<ExtArgs> | null
    /**
     * Filter, which users to fetch.
     */
    where?: usersWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of users to fetch.
     */
    orderBy?: usersOrderByWithRelationInput | usersOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing users.
     */
    cursor?: usersWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` users.
     */
    skip?: number
    distinct?: UsersScalarFieldEnum | UsersScalarFieldEnum[]
  }

  /**
   * users create
   */
  export type usersCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the users
     */
    omit?: usersOmit<ExtArgs> | null
    /**
     * The data needed to create a users.
     */
    data: XOR<usersCreateInput, usersUncheckedCreateInput>
  }

  /**
   * users createMany
   */
  export type usersCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many users.
     */
    data: usersCreateManyInput | usersCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * users createManyAndReturn
   */
  export type usersCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the users
     */
    omit?: usersOmit<ExtArgs> | null
    /**
     * The data used to create many users.
     */
    data: usersCreateManyInput | usersCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * users update
   */
  export type usersUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the users
     */
    omit?: usersOmit<ExtArgs> | null
    /**
     * The data needed to update a users.
     */
    data: XOR<usersUpdateInput, usersUncheckedUpdateInput>
    /**
     * Choose, which users to update.
     */
    where: usersWhereUniqueInput
  }

  /**
   * users updateMany
   */
  export type usersUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update users.
     */
    data: XOR<usersUpdateManyMutationInput, usersUncheckedUpdateManyInput>
    /**
     * Filter which users to update
     */
    where?: usersWhereInput
    /**
     * Limit how many users to update.
     */
    limit?: number
  }

  /**
   * users updateManyAndReturn
   */
  export type usersUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the users
     */
    omit?: usersOmit<ExtArgs> | null
    /**
     * The data used to update users.
     */
    data: XOR<usersUpdateManyMutationInput, usersUncheckedUpdateManyInput>
    /**
     * Filter which users to update
     */
    where?: usersWhereInput
    /**
     * Limit how many users to update.
     */
    limit?: number
  }

  /**
   * users upsert
   */
  export type usersUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the users
     */
    omit?: usersOmit<ExtArgs> | null
    /**
     * The filter to search for the users to update in case it exists.
     */
    where: usersWhereUniqueInput
    /**
     * In case the users found by the `where` argument doesn't exist, create a new users with this data.
     */
    create: XOR<usersCreateInput, usersUncheckedCreateInput>
    /**
     * In case the users was found with the provided `where` argument, update it with this data.
     */
    update: XOR<usersUpdateInput, usersUncheckedUpdateInput>
  }

  /**
   * users delete
   */
  export type usersDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the users
     */
    omit?: usersOmit<ExtArgs> | null
    /**
     * Filter which users to delete.
     */
    where: usersWhereUniqueInput
  }

  /**
   * users deleteMany
   */
  export type usersDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which users to delete
     */
    where?: usersWhereInput
    /**
     * Limit how many users to delete.
     */
    limit?: number
  }

  /**
   * users without action
   */
  export type usersDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the users
     */
    select?: usersSelect<ExtArgs> | null
    /**
     * Omit specific fields from the users
     */
    omit?: usersOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const AgriKnowledgeScalarFieldEnum: {
    id: 'id',
    title: 'title',
    content: 'content',
    category: 'category',
    tags: 'tags',
    source: 'source',
    isActive: 'isActive',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type AgriKnowledgeScalarFieldEnum = (typeof AgriKnowledgeScalarFieldEnum)[keyof typeof AgriKnowledgeScalarFieldEnum]


  export const DailyReportScalarFieldEnum: {
    id: 'id',
    date: 'date',
    imageUrl: 'imageUrl',
    imageAnalysis: 'imageAnalysis',
    sensorData: 'sensorData',
    environmentAnalysis: 'environmentAnalysis',
    weatherInfo: 'weatherInfo',
    suggestions: 'suggestions',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type DailyReportScalarFieldEnum = (typeof DailyReportScalarFieldEnum)[keyof typeof DailyReportScalarFieldEnum]


  export const Access_logsScalarFieldEnum: {
    id: 'id',
    ip: 'ip',
    method: 'method',
    path: 'path',
    status: 'status',
    duration: 'duration',
    user_id: 'user_id',
    user_agent: 'user_agent',
    created_at: 'created_at'
  };

  export type Access_logsScalarFieldEnum = (typeof Access_logsScalarFieldEnum)[keyof typeof Access_logsScalarFieldEnum]


  export const Automation_rulesScalarFieldEnum: {
    id: 'id',
    name: 'name',
    description: 'description',
    is_active: 'is_active',
    graph_data: 'graph_data',
    trigger_type: 'trigger_type',
    created_at: 'created_at',
    updated_at: 'updated_at',
    last_triggered_at: 'last_triggered_at',
    execution_count: 'execution_count'
  };

  export type Automation_rulesScalarFieldEnum = (typeof Automation_rulesScalarFieldEnum)[keyof typeof Automation_rulesScalarFieldEnum]


  export const Banned_ipsScalarFieldEnum: {
    id: 'id',
    ip: 'ip',
    reason: 'reason',
    banned_by: 'banned_by',
    expires_at: 'expires_at',
    created_at: 'created_at'
  };

  export type Banned_ipsScalarFieldEnum = (typeof Banned_ipsScalarFieldEnum)[keyof typeof Banned_ipsScalarFieldEnum]


  export const Device_logsScalarFieldEnum: {
    id: 'id',
    device_name: 'device_name',
    action: 'action',
    operator: 'operator',
    details: 'details',
    created_at: 'created_at'
  };

  export type Device_logsScalarFieldEnum = (typeof Device_logsScalarFieldEnum)[keyof typeof Device_logsScalarFieldEnum]


  export const Email_verificationsScalarFieldEnum: {
    id: 'id',
    email: 'email',
    code: 'code',
    expires_at: 'expires_at',
    used: 'used',
    created_at: 'created_at'
  };

  export type Email_verificationsScalarFieldEnum = (typeof Email_verificationsScalarFieldEnum)[keyof typeof Email_verificationsScalarFieldEnum]


  export const Friend_requestsScalarFieldEnum: {
    id: 'id',
    requester_id: 'requester_id',
    addressee_id: 'addressee_id',
    status: 'status',
    created_at: 'created_at',
    updated_at: 'updated_at'
  };

  export type Friend_requestsScalarFieldEnum = (typeof Friend_requestsScalarFieldEnum)[keyof typeof Friend_requestsScalarFieldEnum]


  export const FriendsScalarFieldEnum: {
    id: 'id',
    user_id: 'user_id',
    friend_id: 'friend_id',
    created_at: 'created_at',
    is_blocked: 'is_blocked'
  };

  export type FriendsScalarFieldEnum = (typeof FriendsScalarFieldEnum)[keyof typeof FriendsScalarFieldEnum]


  export const Group_membersScalarFieldEnum: {
    id: 'id',
    group_id: 'group_id',
    user_id: 'user_id',
    role: 'role',
    is_muted: 'is_muted',
    joined_at: 'joined_at',
    last_read_at: 'last_read_at'
  };

  export type Group_membersScalarFieldEnum = (typeof Group_membersScalarFieldEnum)[keyof typeof Group_membersScalarFieldEnum]


  export const GroupsScalarFieldEnum: {
    id: 'id',
    name: 'name',
    owner_id: 'owner_id',
    avatar_url: 'avatar_url',
    created_at: 'created_at'
  };

  export type GroupsScalarFieldEnum = (typeof GroupsScalarFieldEnum)[keyof typeof GroupsScalarFieldEnum]


  export const Login_logsScalarFieldEnum: {
    id: 'id',
    user_id: 'user_id',
    ip: 'ip',
    country: 'country',
    region: 'region',
    city: 'city',
    user_agent: 'user_agent',
    device_type: 'device_type',
    created_at: 'created_at'
  };

  export type Login_logsScalarFieldEnum = (typeof Login_logsScalarFieldEnum)[keyof typeof Login_logsScalarFieldEnum]


  export const Login_ticketsScalarFieldEnum: {
    ticket: 'ticket',
    jwt: 'jwt',
    created_at: 'created_at'
  };

  export type Login_ticketsScalarFieldEnum = (typeof Login_ticketsScalarFieldEnum)[keyof typeof Login_ticketsScalarFieldEnum]


  export const MessagesScalarFieldEnum: {
    id: 'id',
    sender_id: 'sender_id',
    receiver_id: 'receiver_id',
    group_id: 'group_id',
    content: 'content',
    type: 'type',
    file_url: 'file_url',
    read_at: 'read_at',
    created_at: 'created_at'
  };

  export type MessagesScalarFieldEnum = (typeof MessagesScalarFieldEnum)[keyof typeof MessagesScalarFieldEnum]


  export const Scheduled_tasksScalarFieldEnum: {
    id: 'id',
    title: 'title',
    cron_expression: 'cron_expression',
    execute_at: 'execute_at',
    action_type: 'action_type',
    device_id: 'device_id',
    params: 'params',
    is_active: 'is_active',
    created_at: 'created_at',
    updated_at: 'updated_at'
  };

  export type Scheduled_tasksScalarFieldEnum = (typeof Scheduled_tasksScalarFieldEnum)[keyof typeof Scheduled_tasksScalarFieldEnum]


  export const Sensor_readingsScalarFieldEnum: {
    id: 'id',
    device_id: 'device_id',
    temperature: 'temperature',
    humidity: 'humidity',
    light: 'light',
    co2: 'co2',
    soil_moisture: 'soil_moisture',
    earth_n: 'earth_n',
    earth_p: 'earth_p',
    earth_k: 'earth_k',
    rainfall: 'rainfall',
    created_at: 'created_at'
  };

  export type Sensor_readingsScalarFieldEnum = (typeof Sensor_readingsScalarFieldEnum)[keyof typeof Sensor_readingsScalarFieldEnum]


  export const System_settingsScalarFieldEnum: {
    key: 'key',
    value: 'value',
    updated_at: 'updated_at'
  };

  export type System_settingsScalarFieldEnum = (typeof System_settingsScalarFieldEnum)[keyof typeof System_settingsScalarFieldEnum]


  export const UsersScalarFieldEnum: {
    id: 'id',
    uid: 'uid',
    email: 'email',
    password_hash: 'password_hash',
    username: 'username',
    avatar_url: 'avatar_url',
    role: 'role',
    permissions: 'permissions',
    wechat_openid: 'wechat_openid',
    wechat_unionid: 'wechat_unionid',
    wework_userid: 'wework_userid',
    qq_openid: 'qq_openid',
    alipay_user_id: 'alipay_user_id',
    notification_settings: 'notification_settings',
    daily_ai_limit: 'daily_ai_limit',
    daily_ai_usage: 'daily_ai_usage',
    last_ai_usage_date: 'last_ai_usage_date',
    ai_balance: 'ai_balance',
    email_verified: 'email_verified',
    email_verified_at: 'email_verified_at',
    public_key: 'public_key',
    created_at: 'created_at',
    updated_at: 'updated_at'
  };

  export type UsersScalarFieldEnum = (typeof UsersScalarFieldEnum)[keyof typeof UsersScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullableJsonNullValueInput: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull
  };

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'BigInt'
   */
  export type BigIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'BigInt'>
    


  /**
   * Reference to a field of type 'BigInt[]'
   */
  export type ListBigIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'BigInt[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type AgriKnowledgeWhereInput = {
    AND?: AgriKnowledgeWhereInput | AgriKnowledgeWhereInput[]
    OR?: AgriKnowledgeWhereInput[]
    NOT?: AgriKnowledgeWhereInput | AgriKnowledgeWhereInput[]
    id?: StringFilter<"AgriKnowledge"> | string
    title?: StringFilter<"AgriKnowledge"> | string
    content?: StringFilter<"AgriKnowledge"> | string
    category?: StringFilter<"AgriKnowledge"> | string
    tags?: StringNullableListFilter<"AgriKnowledge">
    source?: StringNullableFilter<"AgriKnowledge"> | string | null
    isActive?: BoolFilter<"AgriKnowledge"> | boolean
    createdAt?: DateTimeFilter<"AgriKnowledge"> | Date | string
    updatedAt?: DateTimeFilter<"AgriKnowledge"> | Date | string
  }

  export type AgriKnowledgeOrderByWithRelationInput = {
    id?: SortOrder
    title?: SortOrder
    content?: SortOrder
    category?: SortOrder
    tags?: SortOrder
    source?: SortOrderInput | SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AgriKnowledgeWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: AgriKnowledgeWhereInput | AgriKnowledgeWhereInput[]
    OR?: AgriKnowledgeWhereInput[]
    NOT?: AgriKnowledgeWhereInput | AgriKnowledgeWhereInput[]
    title?: StringFilter<"AgriKnowledge"> | string
    content?: StringFilter<"AgriKnowledge"> | string
    category?: StringFilter<"AgriKnowledge"> | string
    tags?: StringNullableListFilter<"AgriKnowledge">
    source?: StringNullableFilter<"AgriKnowledge"> | string | null
    isActive?: BoolFilter<"AgriKnowledge"> | boolean
    createdAt?: DateTimeFilter<"AgriKnowledge"> | Date | string
    updatedAt?: DateTimeFilter<"AgriKnowledge"> | Date | string
  }, "id">

  export type AgriKnowledgeOrderByWithAggregationInput = {
    id?: SortOrder
    title?: SortOrder
    content?: SortOrder
    category?: SortOrder
    tags?: SortOrder
    source?: SortOrderInput | SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: AgriKnowledgeCountOrderByAggregateInput
    _max?: AgriKnowledgeMaxOrderByAggregateInput
    _min?: AgriKnowledgeMinOrderByAggregateInput
  }

  export type AgriKnowledgeScalarWhereWithAggregatesInput = {
    AND?: AgriKnowledgeScalarWhereWithAggregatesInput | AgriKnowledgeScalarWhereWithAggregatesInput[]
    OR?: AgriKnowledgeScalarWhereWithAggregatesInput[]
    NOT?: AgriKnowledgeScalarWhereWithAggregatesInput | AgriKnowledgeScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"AgriKnowledge"> | string
    title?: StringWithAggregatesFilter<"AgriKnowledge"> | string
    content?: StringWithAggregatesFilter<"AgriKnowledge"> | string
    category?: StringWithAggregatesFilter<"AgriKnowledge"> | string
    tags?: StringNullableListFilter<"AgriKnowledge">
    source?: StringNullableWithAggregatesFilter<"AgriKnowledge"> | string | null
    isActive?: BoolWithAggregatesFilter<"AgriKnowledge"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"AgriKnowledge"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"AgriKnowledge"> | Date | string
  }

  export type DailyReportWhereInput = {
    AND?: DailyReportWhereInput | DailyReportWhereInput[]
    OR?: DailyReportWhereInput[]
    NOT?: DailyReportWhereInput | DailyReportWhereInput[]
    id?: StringFilter<"DailyReport"> | string
    date?: DateTimeFilter<"DailyReport"> | Date | string
    imageUrl?: StringNullableFilter<"DailyReport"> | string | null
    imageAnalysis?: StringNullableFilter<"DailyReport"> | string | null
    sensorData?: JsonNullableFilter<"DailyReport">
    environmentAnalysis?: StringNullableFilter<"DailyReport"> | string | null
    weatherInfo?: JsonNullableFilter<"DailyReport">
    suggestions?: StringNullableFilter<"DailyReport"> | string | null
    createdAt?: DateTimeFilter<"DailyReport"> | Date | string
    updatedAt?: DateTimeFilter<"DailyReport"> | Date | string
  }

  export type DailyReportOrderByWithRelationInput = {
    id?: SortOrder
    date?: SortOrder
    imageUrl?: SortOrderInput | SortOrder
    imageAnalysis?: SortOrderInput | SortOrder
    sensorData?: SortOrderInput | SortOrder
    environmentAnalysis?: SortOrderInput | SortOrder
    weatherInfo?: SortOrderInput | SortOrder
    suggestions?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type DailyReportWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: DailyReportWhereInput | DailyReportWhereInput[]
    OR?: DailyReportWhereInput[]
    NOT?: DailyReportWhereInput | DailyReportWhereInput[]
    date?: DateTimeFilter<"DailyReport"> | Date | string
    imageUrl?: StringNullableFilter<"DailyReport"> | string | null
    imageAnalysis?: StringNullableFilter<"DailyReport"> | string | null
    sensorData?: JsonNullableFilter<"DailyReport">
    environmentAnalysis?: StringNullableFilter<"DailyReport"> | string | null
    weatherInfo?: JsonNullableFilter<"DailyReport">
    suggestions?: StringNullableFilter<"DailyReport"> | string | null
    createdAt?: DateTimeFilter<"DailyReport"> | Date | string
    updatedAt?: DateTimeFilter<"DailyReport"> | Date | string
  }, "id">

  export type DailyReportOrderByWithAggregationInput = {
    id?: SortOrder
    date?: SortOrder
    imageUrl?: SortOrderInput | SortOrder
    imageAnalysis?: SortOrderInput | SortOrder
    sensorData?: SortOrderInput | SortOrder
    environmentAnalysis?: SortOrderInput | SortOrder
    weatherInfo?: SortOrderInput | SortOrder
    suggestions?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: DailyReportCountOrderByAggregateInput
    _max?: DailyReportMaxOrderByAggregateInput
    _min?: DailyReportMinOrderByAggregateInput
  }

  export type DailyReportScalarWhereWithAggregatesInput = {
    AND?: DailyReportScalarWhereWithAggregatesInput | DailyReportScalarWhereWithAggregatesInput[]
    OR?: DailyReportScalarWhereWithAggregatesInput[]
    NOT?: DailyReportScalarWhereWithAggregatesInput | DailyReportScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"DailyReport"> | string
    date?: DateTimeWithAggregatesFilter<"DailyReport"> | Date | string
    imageUrl?: StringNullableWithAggregatesFilter<"DailyReport"> | string | null
    imageAnalysis?: StringNullableWithAggregatesFilter<"DailyReport"> | string | null
    sensorData?: JsonNullableWithAggregatesFilter<"DailyReport">
    environmentAnalysis?: StringNullableWithAggregatesFilter<"DailyReport"> | string | null
    weatherInfo?: JsonNullableWithAggregatesFilter<"DailyReport">
    suggestions?: StringNullableWithAggregatesFilter<"DailyReport"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"DailyReport"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"DailyReport"> | Date | string
  }

  export type access_logsWhereInput = {
    AND?: access_logsWhereInput | access_logsWhereInput[]
    OR?: access_logsWhereInput[]
    NOT?: access_logsWhereInput | access_logsWhereInput[]
    id?: BigIntFilter<"access_logs"> | bigint | number
    ip?: StringFilter<"access_logs"> | string
    method?: StringNullableFilter<"access_logs"> | string | null
    path?: StringNullableFilter<"access_logs"> | string | null
    status?: IntNullableFilter<"access_logs"> | number | null
    duration?: IntNullableFilter<"access_logs"> | number | null
    user_id?: IntNullableFilter<"access_logs"> | number | null
    user_agent?: StringNullableFilter<"access_logs"> | string | null
    created_at?: BigIntFilter<"access_logs"> | bigint | number
  }

  export type access_logsOrderByWithRelationInput = {
    id?: SortOrder
    ip?: SortOrder
    method?: SortOrderInput | SortOrder
    path?: SortOrderInput | SortOrder
    status?: SortOrderInput | SortOrder
    duration?: SortOrderInput | SortOrder
    user_id?: SortOrderInput | SortOrder
    user_agent?: SortOrderInput | SortOrder
    created_at?: SortOrder
  }

  export type access_logsWhereUniqueInput = Prisma.AtLeast<{
    id?: bigint | number
    AND?: access_logsWhereInput | access_logsWhereInput[]
    OR?: access_logsWhereInput[]
    NOT?: access_logsWhereInput | access_logsWhereInput[]
    ip?: StringFilter<"access_logs"> | string
    method?: StringNullableFilter<"access_logs"> | string | null
    path?: StringNullableFilter<"access_logs"> | string | null
    status?: IntNullableFilter<"access_logs"> | number | null
    duration?: IntNullableFilter<"access_logs"> | number | null
    user_id?: IntNullableFilter<"access_logs"> | number | null
    user_agent?: StringNullableFilter<"access_logs"> | string | null
    created_at?: BigIntFilter<"access_logs"> | bigint | number
  }, "id">

  export type access_logsOrderByWithAggregationInput = {
    id?: SortOrder
    ip?: SortOrder
    method?: SortOrderInput | SortOrder
    path?: SortOrderInput | SortOrder
    status?: SortOrderInput | SortOrder
    duration?: SortOrderInput | SortOrder
    user_id?: SortOrderInput | SortOrder
    user_agent?: SortOrderInput | SortOrder
    created_at?: SortOrder
    _count?: access_logsCountOrderByAggregateInput
    _avg?: access_logsAvgOrderByAggregateInput
    _max?: access_logsMaxOrderByAggregateInput
    _min?: access_logsMinOrderByAggregateInput
    _sum?: access_logsSumOrderByAggregateInput
  }

  export type access_logsScalarWhereWithAggregatesInput = {
    AND?: access_logsScalarWhereWithAggregatesInput | access_logsScalarWhereWithAggregatesInput[]
    OR?: access_logsScalarWhereWithAggregatesInput[]
    NOT?: access_logsScalarWhereWithAggregatesInput | access_logsScalarWhereWithAggregatesInput[]
    id?: BigIntWithAggregatesFilter<"access_logs"> | bigint | number
    ip?: StringWithAggregatesFilter<"access_logs"> | string
    method?: StringNullableWithAggregatesFilter<"access_logs"> | string | null
    path?: StringNullableWithAggregatesFilter<"access_logs"> | string | null
    status?: IntNullableWithAggregatesFilter<"access_logs"> | number | null
    duration?: IntNullableWithAggregatesFilter<"access_logs"> | number | null
    user_id?: IntNullableWithAggregatesFilter<"access_logs"> | number | null
    user_agent?: StringNullableWithAggregatesFilter<"access_logs"> | string | null
    created_at?: BigIntWithAggregatesFilter<"access_logs"> | bigint | number
  }

  export type automation_rulesWhereInput = {
    AND?: automation_rulesWhereInput | automation_rulesWhereInput[]
    OR?: automation_rulesWhereInput[]
    NOT?: automation_rulesWhereInput | automation_rulesWhereInput[]
    id?: StringFilter<"automation_rules"> | string
    name?: StringFilter<"automation_rules"> | string
    description?: StringNullableFilter<"automation_rules"> | string | null
    is_active?: IntNullableFilter<"automation_rules"> | number | null
    graph_data?: StringFilter<"automation_rules"> | string
    trigger_type?: StringNullableFilter<"automation_rules"> | string | null
    created_at?: StringFilter<"automation_rules"> | string
    updated_at?: StringFilter<"automation_rules"> | string
    last_triggered_at?: StringNullableFilter<"automation_rules"> | string | null
    execution_count?: IntNullableFilter<"automation_rules"> | number | null
  }

  export type automation_rulesOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    is_active?: SortOrderInput | SortOrder
    graph_data?: SortOrder
    trigger_type?: SortOrderInput | SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    last_triggered_at?: SortOrderInput | SortOrder
    execution_count?: SortOrderInput | SortOrder
  }

  export type automation_rulesWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: automation_rulesWhereInput | automation_rulesWhereInput[]
    OR?: automation_rulesWhereInput[]
    NOT?: automation_rulesWhereInput | automation_rulesWhereInput[]
    name?: StringFilter<"automation_rules"> | string
    description?: StringNullableFilter<"automation_rules"> | string | null
    is_active?: IntNullableFilter<"automation_rules"> | number | null
    graph_data?: StringFilter<"automation_rules"> | string
    trigger_type?: StringNullableFilter<"automation_rules"> | string | null
    created_at?: StringFilter<"automation_rules"> | string
    updated_at?: StringFilter<"automation_rules"> | string
    last_triggered_at?: StringNullableFilter<"automation_rules"> | string | null
    execution_count?: IntNullableFilter<"automation_rules"> | number | null
  }, "id">

  export type automation_rulesOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrderInput | SortOrder
    is_active?: SortOrderInput | SortOrder
    graph_data?: SortOrder
    trigger_type?: SortOrderInput | SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    last_triggered_at?: SortOrderInput | SortOrder
    execution_count?: SortOrderInput | SortOrder
    _count?: automation_rulesCountOrderByAggregateInput
    _avg?: automation_rulesAvgOrderByAggregateInput
    _max?: automation_rulesMaxOrderByAggregateInput
    _min?: automation_rulesMinOrderByAggregateInput
    _sum?: automation_rulesSumOrderByAggregateInput
  }

  export type automation_rulesScalarWhereWithAggregatesInput = {
    AND?: automation_rulesScalarWhereWithAggregatesInput | automation_rulesScalarWhereWithAggregatesInput[]
    OR?: automation_rulesScalarWhereWithAggregatesInput[]
    NOT?: automation_rulesScalarWhereWithAggregatesInput | automation_rulesScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"automation_rules"> | string
    name?: StringWithAggregatesFilter<"automation_rules"> | string
    description?: StringNullableWithAggregatesFilter<"automation_rules"> | string | null
    is_active?: IntNullableWithAggregatesFilter<"automation_rules"> | number | null
    graph_data?: StringWithAggregatesFilter<"automation_rules"> | string
    trigger_type?: StringNullableWithAggregatesFilter<"automation_rules"> | string | null
    created_at?: StringWithAggregatesFilter<"automation_rules"> | string
    updated_at?: StringWithAggregatesFilter<"automation_rules"> | string
    last_triggered_at?: StringNullableWithAggregatesFilter<"automation_rules"> | string | null
    execution_count?: IntNullableWithAggregatesFilter<"automation_rules"> | number | null
  }

  export type banned_ipsWhereInput = {
    AND?: banned_ipsWhereInput | banned_ipsWhereInput[]
    OR?: banned_ipsWhereInput[]
    NOT?: banned_ipsWhereInput | banned_ipsWhereInput[]
    id?: BigIntFilter<"banned_ips"> | bigint | number
    ip?: StringFilter<"banned_ips"> | string
    reason?: StringNullableFilter<"banned_ips"> | string | null
    banned_by?: StringNullableFilter<"banned_ips"> | string | null
    expires_at?: BigIntNullableFilter<"banned_ips"> | bigint | number | null
    created_at?: BigIntFilter<"banned_ips"> | bigint | number
  }

  export type banned_ipsOrderByWithRelationInput = {
    id?: SortOrder
    ip?: SortOrder
    reason?: SortOrderInput | SortOrder
    banned_by?: SortOrderInput | SortOrder
    expires_at?: SortOrderInput | SortOrder
    created_at?: SortOrder
  }

  export type banned_ipsWhereUniqueInput = Prisma.AtLeast<{
    id?: bigint | number
    ip?: string
    AND?: banned_ipsWhereInput | banned_ipsWhereInput[]
    OR?: banned_ipsWhereInput[]
    NOT?: banned_ipsWhereInput | banned_ipsWhereInput[]
    reason?: StringNullableFilter<"banned_ips"> | string | null
    banned_by?: StringNullableFilter<"banned_ips"> | string | null
    expires_at?: BigIntNullableFilter<"banned_ips"> | bigint | number | null
    created_at?: BigIntFilter<"banned_ips"> | bigint | number
  }, "id" | "ip">

  export type banned_ipsOrderByWithAggregationInput = {
    id?: SortOrder
    ip?: SortOrder
    reason?: SortOrderInput | SortOrder
    banned_by?: SortOrderInput | SortOrder
    expires_at?: SortOrderInput | SortOrder
    created_at?: SortOrder
    _count?: banned_ipsCountOrderByAggregateInput
    _avg?: banned_ipsAvgOrderByAggregateInput
    _max?: banned_ipsMaxOrderByAggregateInput
    _min?: banned_ipsMinOrderByAggregateInput
    _sum?: banned_ipsSumOrderByAggregateInput
  }

  export type banned_ipsScalarWhereWithAggregatesInput = {
    AND?: banned_ipsScalarWhereWithAggregatesInput | banned_ipsScalarWhereWithAggregatesInput[]
    OR?: banned_ipsScalarWhereWithAggregatesInput[]
    NOT?: banned_ipsScalarWhereWithAggregatesInput | banned_ipsScalarWhereWithAggregatesInput[]
    id?: BigIntWithAggregatesFilter<"banned_ips"> | bigint | number
    ip?: StringWithAggregatesFilter<"banned_ips"> | string
    reason?: StringNullableWithAggregatesFilter<"banned_ips"> | string | null
    banned_by?: StringNullableWithAggregatesFilter<"banned_ips"> | string | null
    expires_at?: BigIntNullableWithAggregatesFilter<"banned_ips"> | bigint | number | null
    created_at?: BigIntWithAggregatesFilter<"banned_ips"> | bigint | number
  }

  export type device_logsWhereInput = {
    AND?: device_logsWhereInput | device_logsWhereInput[]
    OR?: device_logsWhereInput[]
    NOT?: device_logsWhereInput | device_logsWhereInput[]
    id?: BigIntFilter<"device_logs"> | bigint | number
    device_name?: StringFilter<"device_logs"> | string
    action?: StringFilter<"device_logs"> | string
    operator?: StringFilter<"device_logs"> | string
    details?: StringNullableFilter<"device_logs"> | string | null
    created_at?: BigIntFilter<"device_logs"> | bigint | number
  }

  export type device_logsOrderByWithRelationInput = {
    id?: SortOrder
    device_name?: SortOrder
    action?: SortOrder
    operator?: SortOrder
    details?: SortOrderInput | SortOrder
    created_at?: SortOrder
  }

  export type device_logsWhereUniqueInput = Prisma.AtLeast<{
    id?: bigint | number
    AND?: device_logsWhereInput | device_logsWhereInput[]
    OR?: device_logsWhereInput[]
    NOT?: device_logsWhereInput | device_logsWhereInput[]
    device_name?: StringFilter<"device_logs"> | string
    action?: StringFilter<"device_logs"> | string
    operator?: StringFilter<"device_logs"> | string
    details?: StringNullableFilter<"device_logs"> | string | null
    created_at?: BigIntFilter<"device_logs"> | bigint | number
  }, "id">

  export type device_logsOrderByWithAggregationInput = {
    id?: SortOrder
    device_name?: SortOrder
    action?: SortOrder
    operator?: SortOrder
    details?: SortOrderInput | SortOrder
    created_at?: SortOrder
    _count?: device_logsCountOrderByAggregateInput
    _avg?: device_logsAvgOrderByAggregateInput
    _max?: device_logsMaxOrderByAggregateInput
    _min?: device_logsMinOrderByAggregateInput
    _sum?: device_logsSumOrderByAggregateInput
  }

  export type device_logsScalarWhereWithAggregatesInput = {
    AND?: device_logsScalarWhereWithAggregatesInput | device_logsScalarWhereWithAggregatesInput[]
    OR?: device_logsScalarWhereWithAggregatesInput[]
    NOT?: device_logsScalarWhereWithAggregatesInput | device_logsScalarWhereWithAggregatesInput[]
    id?: BigIntWithAggregatesFilter<"device_logs"> | bigint | number
    device_name?: StringWithAggregatesFilter<"device_logs"> | string
    action?: StringWithAggregatesFilter<"device_logs"> | string
    operator?: StringWithAggregatesFilter<"device_logs"> | string
    details?: StringNullableWithAggregatesFilter<"device_logs"> | string | null
    created_at?: BigIntWithAggregatesFilter<"device_logs"> | bigint | number
  }

  export type email_verificationsWhereInput = {
    AND?: email_verificationsWhereInput | email_verificationsWhereInput[]
    OR?: email_verificationsWhereInput[]
    NOT?: email_verificationsWhereInput | email_verificationsWhereInput[]
    id?: BigIntFilter<"email_verifications"> | bigint | number
    email?: StringFilter<"email_verifications"> | string
    code?: StringFilter<"email_verifications"> | string
    expires_at?: BigIntFilter<"email_verifications"> | bigint | number
    used?: IntNullableFilter<"email_verifications"> | number | null
    created_at?: BigIntFilter<"email_verifications"> | bigint | number
  }

  export type email_verificationsOrderByWithRelationInput = {
    id?: SortOrder
    email?: SortOrder
    code?: SortOrder
    expires_at?: SortOrder
    used?: SortOrderInput | SortOrder
    created_at?: SortOrder
  }

  export type email_verificationsWhereUniqueInput = Prisma.AtLeast<{
    id?: bigint | number
    AND?: email_verificationsWhereInput | email_verificationsWhereInput[]
    OR?: email_verificationsWhereInput[]
    NOT?: email_verificationsWhereInput | email_verificationsWhereInput[]
    email?: StringFilter<"email_verifications"> | string
    code?: StringFilter<"email_verifications"> | string
    expires_at?: BigIntFilter<"email_verifications"> | bigint | number
    used?: IntNullableFilter<"email_verifications"> | number | null
    created_at?: BigIntFilter<"email_verifications"> | bigint | number
  }, "id">

  export type email_verificationsOrderByWithAggregationInput = {
    id?: SortOrder
    email?: SortOrder
    code?: SortOrder
    expires_at?: SortOrder
    used?: SortOrderInput | SortOrder
    created_at?: SortOrder
    _count?: email_verificationsCountOrderByAggregateInput
    _avg?: email_verificationsAvgOrderByAggregateInput
    _max?: email_verificationsMaxOrderByAggregateInput
    _min?: email_verificationsMinOrderByAggregateInput
    _sum?: email_verificationsSumOrderByAggregateInput
  }

  export type email_verificationsScalarWhereWithAggregatesInput = {
    AND?: email_verificationsScalarWhereWithAggregatesInput | email_verificationsScalarWhereWithAggregatesInput[]
    OR?: email_verificationsScalarWhereWithAggregatesInput[]
    NOT?: email_verificationsScalarWhereWithAggregatesInput | email_verificationsScalarWhereWithAggregatesInput[]
    id?: BigIntWithAggregatesFilter<"email_verifications"> | bigint | number
    email?: StringWithAggregatesFilter<"email_verifications"> | string
    code?: StringWithAggregatesFilter<"email_verifications"> | string
    expires_at?: BigIntWithAggregatesFilter<"email_verifications"> | bigint | number
    used?: IntNullableWithAggregatesFilter<"email_verifications"> | number | null
    created_at?: BigIntWithAggregatesFilter<"email_verifications"> | bigint | number
  }

  export type friend_requestsWhereInput = {
    AND?: friend_requestsWhereInput | friend_requestsWhereInput[]
    OR?: friend_requestsWhereInput[]
    NOT?: friend_requestsWhereInput | friend_requestsWhereInput[]
    id?: BigIntFilter<"friend_requests"> | bigint | number
    requester_id?: IntFilter<"friend_requests"> | number
    addressee_id?: IntFilter<"friend_requests"> | number
    status?: StringNullableFilter<"friend_requests"> | string | null
    created_at?: BigIntFilter<"friend_requests"> | bigint | number
    updated_at?: BigIntFilter<"friend_requests"> | bigint | number
  }

  export type friend_requestsOrderByWithRelationInput = {
    id?: SortOrder
    requester_id?: SortOrder
    addressee_id?: SortOrder
    status?: SortOrderInput | SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type friend_requestsWhereUniqueInput = Prisma.AtLeast<{
    id?: bigint | number
    requester_id_addressee_id?: friend_requestsRequester_idAddressee_idCompoundUniqueInput
    AND?: friend_requestsWhereInput | friend_requestsWhereInput[]
    OR?: friend_requestsWhereInput[]
    NOT?: friend_requestsWhereInput | friend_requestsWhereInput[]
    requester_id?: IntFilter<"friend_requests"> | number
    addressee_id?: IntFilter<"friend_requests"> | number
    status?: StringNullableFilter<"friend_requests"> | string | null
    created_at?: BigIntFilter<"friend_requests"> | bigint | number
    updated_at?: BigIntFilter<"friend_requests"> | bigint | number
  }, "id" | "requester_id_addressee_id">

  export type friend_requestsOrderByWithAggregationInput = {
    id?: SortOrder
    requester_id?: SortOrder
    addressee_id?: SortOrder
    status?: SortOrderInput | SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    _count?: friend_requestsCountOrderByAggregateInput
    _avg?: friend_requestsAvgOrderByAggregateInput
    _max?: friend_requestsMaxOrderByAggregateInput
    _min?: friend_requestsMinOrderByAggregateInput
    _sum?: friend_requestsSumOrderByAggregateInput
  }

  export type friend_requestsScalarWhereWithAggregatesInput = {
    AND?: friend_requestsScalarWhereWithAggregatesInput | friend_requestsScalarWhereWithAggregatesInput[]
    OR?: friend_requestsScalarWhereWithAggregatesInput[]
    NOT?: friend_requestsScalarWhereWithAggregatesInput | friend_requestsScalarWhereWithAggregatesInput[]
    id?: BigIntWithAggregatesFilter<"friend_requests"> | bigint | number
    requester_id?: IntWithAggregatesFilter<"friend_requests"> | number
    addressee_id?: IntWithAggregatesFilter<"friend_requests"> | number
    status?: StringNullableWithAggregatesFilter<"friend_requests"> | string | null
    created_at?: BigIntWithAggregatesFilter<"friend_requests"> | bigint | number
    updated_at?: BigIntWithAggregatesFilter<"friend_requests"> | bigint | number
  }

  export type friendsWhereInput = {
    AND?: friendsWhereInput | friendsWhereInput[]
    OR?: friendsWhereInput[]
    NOT?: friendsWhereInput | friendsWhereInput[]
    id?: BigIntFilter<"friends"> | bigint | number
    user_id?: IntFilter<"friends"> | number
    friend_id?: IntFilter<"friends"> | number
    created_at?: BigIntFilter<"friends"> | bigint | number
    is_blocked?: IntNullableFilter<"friends"> | number | null
  }

  export type friendsOrderByWithRelationInput = {
    id?: SortOrder
    user_id?: SortOrder
    friend_id?: SortOrder
    created_at?: SortOrder
    is_blocked?: SortOrderInput | SortOrder
  }

  export type friendsWhereUniqueInput = Prisma.AtLeast<{
    id?: bigint | number
    user_id_friend_id?: friendsUser_idFriend_idCompoundUniqueInput
    AND?: friendsWhereInput | friendsWhereInput[]
    OR?: friendsWhereInput[]
    NOT?: friendsWhereInput | friendsWhereInput[]
    user_id?: IntFilter<"friends"> | number
    friend_id?: IntFilter<"friends"> | number
    created_at?: BigIntFilter<"friends"> | bigint | number
    is_blocked?: IntNullableFilter<"friends"> | number | null
  }, "id" | "user_id_friend_id">

  export type friendsOrderByWithAggregationInput = {
    id?: SortOrder
    user_id?: SortOrder
    friend_id?: SortOrder
    created_at?: SortOrder
    is_blocked?: SortOrderInput | SortOrder
    _count?: friendsCountOrderByAggregateInput
    _avg?: friendsAvgOrderByAggregateInput
    _max?: friendsMaxOrderByAggregateInput
    _min?: friendsMinOrderByAggregateInput
    _sum?: friendsSumOrderByAggregateInput
  }

  export type friendsScalarWhereWithAggregatesInput = {
    AND?: friendsScalarWhereWithAggregatesInput | friendsScalarWhereWithAggregatesInput[]
    OR?: friendsScalarWhereWithAggregatesInput[]
    NOT?: friendsScalarWhereWithAggregatesInput | friendsScalarWhereWithAggregatesInput[]
    id?: BigIntWithAggregatesFilter<"friends"> | bigint | number
    user_id?: IntWithAggregatesFilter<"friends"> | number
    friend_id?: IntWithAggregatesFilter<"friends"> | number
    created_at?: BigIntWithAggregatesFilter<"friends"> | bigint | number
    is_blocked?: IntNullableWithAggregatesFilter<"friends"> | number | null
  }

  export type group_membersWhereInput = {
    AND?: group_membersWhereInput | group_membersWhereInput[]
    OR?: group_membersWhereInput[]
    NOT?: group_membersWhereInput | group_membersWhereInput[]
    id?: BigIntFilter<"group_members"> | bigint | number
    group_id?: IntFilter<"group_members"> | number
    user_id?: IntFilter<"group_members"> | number
    role?: StringNullableFilter<"group_members"> | string | null
    is_muted?: IntNullableFilter<"group_members"> | number | null
    joined_at?: BigIntFilter<"group_members"> | bigint | number
    last_read_at?: BigIntNullableFilter<"group_members"> | bigint | number | null
  }

  export type group_membersOrderByWithRelationInput = {
    id?: SortOrder
    group_id?: SortOrder
    user_id?: SortOrder
    role?: SortOrderInput | SortOrder
    is_muted?: SortOrderInput | SortOrder
    joined_at?: SortOrder
    last_read_at?: SortOrderInput | SortOrder
  }

  export type group_membersWhereUniqueInput = Prisma.AtLeast<{
    id?: bigint | number
    group_id_user_id?: group_membersGroup_idUser_idCompoundUniqueInput
    AND?: group_membersWhereInput | group_membersWhereInput[]
    OR?: group_membersWhereInput[]
    NOT?: group_membersWhereInput | group_membersWhereInput[]
    group_id?: IntFilter<"group_members"> | number
    user_id?: IntFilter<"group_members"> | number
    role?: StringNullableFilter<"group_members"> | string | null
    is_muted?: IntNullableFilter<"group_members"> | number | null
    joined_at?: BigIntFilter<"group_members"> | bigint | number
    last_read_at?: BigIntNullableFilter<"group_members"> | bigint | number | null
  }, "id" | "group_id_user_id">

  export type group_membersOrderByWithAggregationInput = {
    id?: SortOrder
    group_id?: SortOrder
    user_id?: SortOrder
    role?: SortOrderInput | SortOrder
    is_muted?: SortOrderInput | SortOrder
    joined_at?: SortOrder
    last_read_at?: SortOrderInput | SortOrder
    _count?: group_membersCountOrderByAggregateInput
    _avg?: group_membersAvgOrderByAggregateInput
    _max?: group_membersMaxOrderByAggregateInput
    _min?: group_membersMinOrderByAggregateInput
    _sum?: group_membersSumOrderByAggregateInput
  }

  export type group_membersScalarWhereWithAggregatesInput = {
    AND?: group_membersScalarWhereWithAggregatesInput | group_membersScalarWhereWithAggregatesInput[]
    OR?: group_membersScalarWhereWithAggregatesInput[]
    NOT?: group_membersScalarWhereWithAggregatesInput | group_membersScalarWhereWithAggregatesInput[]
    id?: BigIntWithAggregatesFilter<"group_members"> | bigint | number
    group_id?: IntWithAggregatesFilter<"group_members"> | number
    user_id?: IntWithAggregatesFilter<"group_members"> | number
    role?: StringNullableWithAggregatesFilter<"group_members"> | string | null
    is_muted?: IntNullableWithAggregatesFilter<"group_members"> | number | null
    joined_at?: BigIntWithAggregatesFilter<"group_members"> | bigint | number
    last_read_at?: BigIntNullableWithAggregatesFilter<"group_members"> | bigint | number | null
  }

  export type groupsWhereInput = {
    AND?: groupsWhereInput | groupsWhereInput[]
    OR?: groupsWhereInput[]
    NOT?: groupsWhereInput | groupsWhereInput[]
    id?: BigIntFilter<"groups"> | bigint | number
    name?: StringFilter<"groups"> | string
    owner_id?: IntFilter<"groups"> | number
    avatar_url?: StringNullableFilter<"groups"> | string | null
    created_at?: BigIntFilter<"groups"> | bigint | number
  }

  export type groupsOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    owner_id?: SortOrder
    avatar_url?: SortOrderInput | SortOrder
    created_at?: SortOrder
  }

  export type groupsWhereUniqueInput = Prisma.AtLeast<{
    id?: bigint | number
    AND?: groupsWhereInput | groupsWhereInput[]
    OR?: groupsWhereInput[]
    NOT?: groupsWhereInput | groupsWhereInput[]
    name?: StringFilter<"groups"> | string
    owner_id?: IntFilter<"groups"> | number
    avatar_url?: StringNullableFilter<"groups"> | string | null
    created_at?: BigIntFilter<"groups"> | bigint | number
  }, "id">

  export type groupsOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    owner_id?: SortOrder
    avatar_url?: SortOrderInput | SortOrder
    created_at?: SortOrder
    _count?: groupsCountOrderByAggregateInput
    _avg?: groupsAvgOrderByAggregateInput
    _max?: groupsMaxOrderByAggregateInput
    _min?: groupsMinOrderByAggregateInput
    _sum?: groupsSumOrderByAggregateInput
  }

  export type groupsScalarWhereWithAggregatesInput = {
    AND?: groupsScalarWhereWithAggregatesInput | groupsScalarWhereWithAggregatesInput[]
    OR?: groupsScalarWhereWithAggregatesInput[]
    NOT?: groupsScalarWhereWithAggregatesInput | groupsScalarWhereWithAggregatesInput[]
    id?: BigIntWithAggregatesFilter<"groups"> | bigint | number
    name?: StringWithAggregatesFilter<"groups"> | string
    owner_id?: IntWithAggregatesFilter<"groups"> | number
    avatar_url?: StringNullableWithAggregatesFilter<"groups"> | string | null
    created_at?: BigIntWithAggregatesFilter<"groups"> | bigint | number
  }

  export type login_logsWhereInput = {
    AND?: login_logsWhereInput | login_logsWhereInput[]
    OR?: login_logsWhereInput[]
    NOT?: login_logsWhereInput | login_logsWhereInput[]
    id?: BigIntFilter<"login_logs"> | bigint | number
    user_id?: IntFilter<"login_logs"> | number
    ip?: StringFilter<"login_logs"> | string
    country?: StringNullableFilter<"login_logs"> | string | null
    region?: StringNullableFilter<"login_logs"> | string | null
    city?: StringNullableFilter<"login_logs"> | string | null
    user_agent?: StringNullableFilter<"login_logs"> | string | null
    device_type?: StringNullableFilter<"login_logs"> | string | null
    created_at?: BigIntFilter<"login_logs"> | bigint | number
  }

  export type login_logsOrderByWithRelationInput = {
    id?: SortOrder
    user_id?: SortOrder
    ip?: SortOrder
    country?: SortOrderInput | SortOrder
    region?: SortOrderInput | SortOrder
    city?: SortOrderInput | SortOrder
    user_agent?: SortOrderInput | SortOrder
    device_type?: SortOrderInput | SortOrder
    created_at?: SortOrder
  }

  export type login_logsWhereUniqueInput = Prisma.AtLeast<{
    id?: bigint | number
    AND?: login_logsWhereInput | login_logsWhereInput[]
    OR?: login_logsWhereInput[]
    NOT?: login_logsWhereInput | login_logsWhereInput[]
    user_id?: IntFilter<"login_logs"> | number
    ip?: StringFilter<"login_logs"> | string
    country?: StringNullableFilter<"login_logs"> | string | null
    region?: StringNullableFilter<"login_logs"> | string | null
    city?: StringNullableFilter<"login_logs"> | string | null
    user_agent?: StringNullableFilter<"login_logs"> | string | null
    device_type?: StringNullableFilter<"login_logs"> | string | null
    created_at?: BigIntFilter<"login_logs"> | bigint | number
  }, "id">

  export type login_logsOrderByWithAggregationInput = {
    id?: SortOrder
    user_id?: SortOrder
    ip?: SortOrder
    country?: SortOrderInput | SortOrder
    region?: SortOrderInput | SortOrder
    city?: SortOrderInput | SortOrder
    user_agent?: SortOrderInput | SortOrder
    device_type?: SortOrderInput | SortOrder
    created_at?: SortOrder
    _count?: login_logsCountOrderByAggregateInput
    _avg?: login_logsAvgOrderByAggregateInput
    _max?: login_logsMaxOrderByAggregateInput
    _min?: login_logsMinOrderByAggregateInput
    _sum?: login_logsSumOrderByAggregateInput
  }

  export type login_logsScalarWhereWithAggregatesInput = {
    AND?: login_logsScalarWhereWithAggregatesInput | login_logsScalarWhereWithAggregatesInput[]
    OR?: login_logsScalarWhereWithAggregatesInput[]
    NOT?: login_logsScalarWhereWithAggregatesInput | login_logsScalarWhereWithAggregatesInput[]
    id?: BigIntWithAggregatesFilter<"login_logs"> | bigint | number
    user_id?: IntWithAggregatesFilter<"login_logs"> | number
    ip?: StringWithAggregatesFilter<"login_logs"> | string
    country?: StringNullableWithAggregatesFilter<"login_logs"> | string | null
    region?: StringNullableWithAggregatesFilter<"login_logs"> | string | null
    city?: StringNullableWithAggregatesFilter<"login_logs"> | string | null
    user_agent?: StringNullableWithAggregatesFilter<"login_logs"> | string | null
    device_type?: StringNullableWithAggregatesFilter<"login_logs"> | string | null
    created_at?: BigIntWithAggregatesFilter<"login_logs"> | bigint | number
  }

  export type login_ticketsWhereInput = {
    AND?: login_ticketsWhereInput | login_ticketsWhereInput[]
    OR?: login_ticketsWhereInput[]
    NOT?: login_ticketsWhereInput | login_ticketsWhereInput[]
    ticket?: StringFilter<"login_tickets"> | string
    jwt?: StringNullableFilter<"login_tickets"> | string | null
    created_at?: BigIntFilter<"login_tickets"> | bigint | number
  }

  export type login_ticketsOrderByWithRelationInput = {
    ticket?: SortOrder
    jwt?: SortOrderInput | SortOrder
    created_at?: SortOrder
  }

  export type login_ticketsWhereUniqueInput = Prisma.AtLeast<{
    ticket?: string
    AND?: login_ticketsWhereInput | login_ticketsWhereInput[]
    OR?: login_ticketsWhereInput[]
    NOT?: login_ticketsWhereInput | login_ticketsWhereInput[]
    jwt?: StringNullableFilter<"login_tickets"> | string | null
    created_at?: BigIntFilter<"login_tickets"> | bigint | number
  }, "ticket">

  export type login_ticketsOrderByWithAggregationInput = {
    ticket?: SortOrder
    jwt?: SortOrderInput | SortOrder
    created_at?: SortOrder
    _count?: login_ticketsCountOrderByAggregateInput
    _avg?: login_ticketsAvgOrderByAggregateInput
    _max?: login_ticketsMaxOrderByAggregateInput
    _min?: login_ticketsMinOrderByAggregateInput
    _sum?: login_ticketsSumOrderByAggregateInput
  }

  export type login_ticketsScalarWhereWithAggregatesInput = {
    AND?: login_ticketsScalarWhereWithAggregatesInput | login_ticketsScalarWhereWithAggregatesInput[]
    OR?: login_ticketsScalarWhereWithAggregatesInput[]
    NOT?: login_ticketsScalarWhereWithAggregatesInput | login_ticketsScalarWhereWithAggregatesInput[]
    ticket?: StringWithAggregatesFilter<"login_tickets"> | string
    jwt?: StringNullableWithAggregatesFilter<"login_tickets"> | string | null
    created_at?: BigIntWithAggregatesFilter<"login_tickets"> | bigint | number
  }

  export type messagesWhereInput = {
    AND?: messagesWhereInput | messagesWhereInput[]
    OR?: messagesWhereInput[]
    NOT?: messagesWhereInput | messagesWhereInput[]
    id?: BigIntFilter<"messages"> | bigint | number
    sender_id?: IntFilter<"messages"> | number
    receiver_id?: IntFilter<"messages"> | number
    group_id?: IntNullableFilter<"messages"> | number | null
    content?: StringNullableFilter<"messages"> | string | null
    type?: StringNullableFilter<"messages"> | string | null
    file_url?: StringNullableFilter<"messages"> | string | null
    read_at?: BigIntNullableFilter<"messages"> | bigint | number | null
    created_at?: BigIntFilter<"messages"> | bigint | number
  }

  export type messagesOrderByWithRelationInput = {
    id?: SortOrder
    sender_id?: SortOrder
    receiver_id?: SortOrder
    group_id?: SortOrderInput | SortOrder
    content?: SortOrderInput | SortOrder
    type?: SortOrderInput | SortOrder
    file_url?: SortOrderInput | SortOrder
    read_at?: SortOrderInput | SortOrder
    created_at?: SortOrder
  }

  export type messagesWhereUniqueInput = Prisma.AtLeast<{
    id?: bigint | number
    AND?: messagesWhereInput | messagesWhereInput[]
    OR?: messagesWhereInput[]
    NOT?: messagesWhereInput | messagesWhereInput[]
    sender_id?: IntFilter<"messages"> | number
    receiver_id?: IntFilter<"messages"> | number
    group_id?: IntNullableFilter<"messages"> | number | null
    content?: StringNullableFilter<"messages"> | string | null
    type?: StringNullableFilter<"messages"> | string | null
    file_url?: StringNullableFilter<"messages"> | string | null
    read_at?: BigIntNullableFilter<"messages"> | bigint | number | null
    created_at?: BigIntFilter<"messages"> | bigint | number
  }, "id">

  export type messagesOrderByWithAggregationInput = {
    id?: SortOrder
    sender_id?: SortOrder
    receiver_id?: SortOrder
    group_id?: SortOrderInput | SortOrder
    content?: SortOrderInput | SortOrder
    type?: SortOrderInput | SortOrder
    file_url?: SortOrderInput | SortOrder
    read_at?: SortOrderInput | SortOrder
    created_at?: SortOrder
    _count?: messagesCountOrderByAggregateInput
    _avg?: messagesAvgOrderByAggregateInput
    _max?: messagesMaxOrderByAggregateInput
    _min?: messagesMinOrderByAggregateInput
    _sum?: messagesSumOrderByAggregateInput
  }

  export type messagesScalarWhereWithAggregatesInput = {
    AND?: messagesScalarWhereWithAggregatesInput | messagesScalarWhereWithAggregatesInput[]
    OR?: messagesScalarWhereWithAggregatesInput[]
    NOT?: messagesScalarWhereWithAggregatesInput | messagesScalarWhereWithAggregatesInput[]
    id?: BigIntWithAggregatesFilter<"messages"> | bigint | number
    sender_id?: IntWithAggregatesFilter<"messages"> | number
    receiver_id?: IntWithAggregatesFilter<"messages"> | number
    group_id?: IntNullableWithAggregatesFilter<"messages"> | number | null
    content?: StringNullableWithAggregatesFilter<"messages"> | string | null
    type?: StringNullableWithAggregatesFilter<"messages"> | string | null
    file_url?: StringNullableWithAggregatesFilter<"messages"> | string | null
    read_at?: BigIntNullableWithAggregatesFilter<"messages"> | bigint | number | null
    created_at?: BigIntWithAggregatesFilter<"messages"> | bigint | number
  }

  export type scheduled_tasksWhereInput = {
    AND?: scheduled_tasksWhereInput | scheduled_tasksWhereInput[]
    OR?: scheduled_tasksWhereInput[]
    NOT?: scheduled_tasksWhereInput | scheduled_tasksWhereInput[]
    id?: BigIntFilter<"scheduled_tasks"> | bigint | number
    title?: StringFilter<"scheduled_tasks"> | string
    cron_expression?: StringNullableFilter<"scheduled_tasks"> | string | null
    execute_at?: BigIntNullableFilter<"scheduled_tasks"> | bigint | number | null
    action_type?: StringFilter<"scheduled_tasks"> | string
    device_id?: IntNullableFilter<"scheduled_tasks"> | number | null
    params?: StringFilter<"scheduled_tasks"> | string
    is_active?: IntNullableFilter<"scheduled_tasks"> | number | null
    created_at?: BigIntFilter<"scheduled_tasks"> | bigint | number
    updated_at?: BigIntFilter<"scheduled_tasks"> | bigint | number
  }

  export type scheduled_tasksOrderByWithRelationInput = {
    id?: SortOrder
    title?: SortOrder
    cron_expression?: SortOrderInput | SortOrder
    execute_at?: SortOrderInput | SortOrder
    action_type?: SortOrder
    device_id?: SortOrderInput | SortOrder
    params?: SortOrder
    is_active?: SortOrderInput | SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type scheduled_tasksWhereUniqueInput = Prisma.AtLeast<{
    id?: bigint | number
    AND?: scheduled_tasksWhereInput | scheduled_tasksWhereInput[]
    OR?: scheduled_tasksWhereInput[]
    NOT?: scheduled_tasksWhereInput | scheduled_tasksWhereInput[]
    title?: StringFilter<"scheduled_tasks"> | string
    cron_expression?: StringNullableFilter<"scheduled_tasks"> | string | null
    execute_at?: BigIntNullableFilter<"scheduled_tasks"> | bigint | number | null
    action_type?: StringFilter<"scheduled_tasks"> | string
    device_id?: IntNullableFilter<"scheduled_tasks"> | number | null
    params?: StringFilter<"scheduled_tasks"> | string
    is_active?: IntNullableFilter<"scheduled_tasks"> | number | null
    created_at?: BigIntFilter<"scheduled_tasks"> | bigint | number
    updated_at?: BigIntFilter<"scheduled_tasks"> | bigint | number
  }, "id">

  export type scheduled_tasksOrderByWithAggregationInput = {
    id?: SortOrder
    title?: SortOrder
    cron_expression?: SortOrderInput | SortOrder
    execute_at?: SortOrderInput | SortOrder
    action_type?: SortOrder
    device_id?: SortOrderInput | SortOrder
    params?: SortOrder
    is_active?: SortOrderInput | SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    _count?: scheduled_tasksCountOrderByAggregateInput
    _avg?: scheduled_tasksAvgOrderByAggregateInput
    _max?: scheduled_tasksMaxOrderByAggregateInput
    _min?: scheduled_tasksMinOrderByAggregateInput
    _sum?: scheduled_tasksSumOrderByAggregateInput
  }

  export type scheduled_tasksScalarWhereWithAggregatesInput = {
    AND?: scheduled_tasksScalarWhereWithAggregatesInput | scheduled_tasksScalarWhereWithAggregatesInput[]
    OR?: scheduled_tasksScalarWhereWithAggregatesInput[]
    NOT?: scheduled_tasksScalarWhereWithAggregatesInput | scheduled_tasksScalarWhereWithAggregatesInput[]
    id?: BigIntWithAggregatesFilter<"scheduled_tasks"> | bigint | number
    title?: StringWithAggregatesFilter<"scheduled_tasks"> | string
    cron_expression?: StringNullableWithAggregatesFilter<"scheduled_tasks"> | string | null
    execute_at?: BigIntNullableWithAggregatesFilter<"scheduled_tasks"> | bigint | number | null
    action_type?: StringWithAggregatesFilter<"scheduled_tasks"> | string
    device_id?: IntNullableWithAggregatesFilter<"scheduled_tasks"> | number | null
    params?: StringWithAggregatesFilter<"scheduled_tasks"> | string
    is_active?: IntNullableWithAggregatesFilter<"scheduled_tasks"> | number | null
    created_at?: BigIntWithAggregatesFilter<"scheduled_tasks"> | bigint | number
    updated_at?: BigIntWithAggregatesFilter<"scheduled_tasks"> | bigint | number
  }

  export type sensor_readingsWhereInput = {
    AND?: sensor_readingsWhereInput | sensor_readingsWhereInput[]
    OR?: sensor_readingsWhereInput[]
    NOT?: sensor_readingsWhereInput | sensor_readingsWhereInput[]
    id?: BigIntFilter<"sensor_readings"> | bigint | number
    device_id?: StringNullableFilter<"sensor_readings"> | string | null
    temperature?: FloatNullableFilter<"sensor_readings"> | number | null
    humidity?: FloatNullableFilter<"sensor_readings"> | number | null
    light?: FloatNullableFilter<"sensor_readings"> | number | null
    co2?: FloatNullableFilter<"sensor_readings"> | number | null
    soil_moisture?: FloatNullableFilter<"sensor_readings"> | number | null
    earth_n?: FloatNullableFilter<"sensor_readings"> | number | null
    earth_p?: FloatNullableFilter<"sensor_readings"> | number | null
    earth_k?: FloatNullableFilter<"sensor_readings"> | number | null
    rainfall?: FloatNullableFilter<"sensor_readings"> | number | null
    created_at?: BigIntFilter<"sensor_readings"> | bigint | number
  }

  export type sensor_readingsOrderByWithRelationInput = {
    id?: SortOrder
    device_id?: SortOrderInput | SortOrder
    temperature?: SortOrderInput | SortOrder
    humidity?: SortOrderInput | SortOrder
    light?: SortOrderInput | SortOrder
    co2?: SortOrderInput | SortOrder
    soil_moisture?: SortOrderInput | SortOrder
    earth_n?: SortOrderInput | SortOrder
    earth_p?: SortOrderInput | SortOrder
    earth_k?: SortOrderInput | SortOrder
    rainfall?: SortOrderInput | SortOrder
    created_at?: SortOrder
  }

  export type sensor_readingsWhereUniqueInput = Prisma.AtLeast<{
    id?: bigint | number
    AND?: sensor_readingsWhereInput | sensor_readingsWhereInput[]
    OR?: sensor_readingsWhereInput[]
    NOT?: sensor_readingsWhereInput | sensor_readingsWhereInput[]
    device_id?: StringNullableFilter<"sensor_readings"> | string | null
    temperature?: FloatNullableFilter<"sensor_readings"> | number | null
    humidity?: FloatNullableFilter<"sensor_readings"> | number | null
    light?: FloatNullableFilter<"sensor_readings"> | number | null
    co2?: FloatNullableFilter<"sensor_readings"> | number | null
    soil_moisture?: FloatNullableFilter<"sensor_readings"> | number | null
    earth_n?: FloatNullableFilter<"sensor_readings"> | number | null
    earth_p?: FloatNullableFilter<"sensor_readings"> | number | null
    earth_k?: FloatNullableFilter<"sensor_readings"> | number | null
    rainfall?: FloatNullableFilter<"sensor_readings"> | number | null
    created_at?: BigIntFilter<"sensor_readings"> | bigint | number
  }, "id">

  export type sensor_readingsOrderByWithAggregationInput = {
    id?: SortOrder
    device_id?: SortOrderInput | SortOrder
    temperature?: SortOrderInput | SortOrder
    humidity?: SortOrderInput | SortOrder
    light?: SortOrderInput | SortOrder
    co2?: SortOrderInput | SortOrder
    soil_moisture?: SortOrderInput | SortOrder
    earth_n?: SortOrderInput | SortOrder
    earth_p?: SortOrderInput | SortOrder
    earth_k?: SortOrderInput | SortOrder
    rainfall?: SortOrderInput | SortOrder
    created_at?: SortOrder
    _count?: sensor_readingsCountOrderByAggregateInput
    _avg?: sensor_readingsAvgOrderByAggregateInput
    _max?: sensor_readingsMaxOrderByAggregateInput
    _min?: sensor_readingsMinOrderByAggregateInput
    _sum?: sensor_readingsSumOrderByAggregateInput
  }

  export type sensor_readingsScalarWhereWithAggregatesInput = {
    AND?: sensor_readingsScalarWhereWithAggregatesInput | sensor_readingsScalarWhereWithAggregatesInput[]
    OR?: sensor_readingsScalarWhereWithAggregatesInput[]
    NOT?: sensor_readingsScalarWhereWithAggregatesInput | sensor_readingsScalarWhereWithAggregatesInput[]
    id?: BigIntWithAggregatesFilter<"sensor_readings"> | bigint | number
    device_id?: StringNullableWithAggregatesFilter<"sensor_readings"> | string | null
    temperature?: FloatNullableWithAggregatesFilter<"sensor_readings"> | number | null
    humidity?: FloatNullableWithAggregatesFilter<"sensor_readings"> | number | null
    light?: FloatNullableWithAggregatesFilter<"sensor_readings"> | number | null
    co2?: FloatNullableWithAggregatesFilter<"sensor_readings"> | number | null
    soil_moisture?: FloatNullableWithAggregatesFilter<"sensor_readings"> | number | null
    earth_n?: FloatNullableWithAggregatesFilter<"sensor_readings"> | number | null
    earth_p?: FloatNullableWithAggregatesFilter<"sensor_readings"> | number | null
    earth_k?: FloatNullableWithAggregatesFilter<"sensor_readings"> | number | null
    rainfall?: FloatNullableWithAggregatesFilter<"sensor_readings"> | number | null
    created_at?: BigIntWithAggregatesFilter<"sensor_readings"> | bigint | number
  }

  export type system_settingsWhereInput = {
    AND?: system_settingsWhereInput | system_settingsWhereInput[]
    OR?: system_settingsWhereInput[]
    NOT?: system_settingsWhereInput | system_settingsWhereInput[]
    key?: StringFilter<"system_settings"> | string
    value?: StringFilter<"system_settings"> | string
    updated_at?: BigIntFilter<"system_settings"> | bigint | number
  }

  export type system_settingsOrderByWithRelationInput = {
    key?: SortOrder
    value?: SortOrder
    updated_at?: SortOrder
  }

  export type system_settingsWhereUniqueInput = Prisma.AtLeast<{
    key?: string
    AND?: system_settingsWhereInput | system_settingsWhereInput[]
    OR?: system_settingsWhereInput[]
    NOT?: system_settingsWhereInput | system_settingsWhereInput[]
    value?: StringFilter<"system_settings"> | string
    updated_at?: BigIntFilter<"system_settings"> | bigint | number
  }, "key">

  export type system_settingsOrderByWithAggregationInput = {
    key?: SortOrder
    value?: SortOrder
    updated_at?: SortOrder
    _count?: system_settingsCountOrderByAggregateInput
    _avg?: system_settingsAvgOrderByAggregateInput
    _max?: system_settingsMaxOrderByAggregateInput
    _min?: system_settingsMinOrderByAggregateInput
    _sum?: system_settingsSumOrderByAggregateInput
  }

  export type system_settingsScalarWhereWithAggregatesInput = {
    AND?: system_settingsScalarWhereWithAggregatesInput | system_settingsScalarWhereWithAggregatesInput[]
    OR?: system_settingsScalarWhereWithAggregatesInput[]
    NOT?: system_settingsScalarWhereWithAggregatesInput | system_settingsScalarWhereWithAggregatesInput[]
    key?: StringWithAggregatesFilter<"system_settings"> | string
    value?: StringWithAggregatesFilter<"system_settings"> | string
    updated_at?: BigIntWithAggregatesFilter<"system_settings"> | bigint | number
  }

  export type usersWhereInput = {
    AND?: usersWhereInput | usersWhereInput[]
    OR?: usersWhereInput[]
    NOT?: usersWhereInput | usersWhereInput[]
    id?: BigIntFilter<"users"> | bigint | number
    uid?: StringNullableFilter<"users"> | string | null
    email?: StringNullableFilter<"users"> | string | null
    password_hash?: StringNullableFilter<"users"> | string | null
    username?: StringFilter<"users"> | string
    avatar_url?: StringNullableFilter<"users"> | string | null
    role?: StringNullableFilter<"users"> | string | null
    permissions?: StringNullableFilter<"users"> | string | null
    wechat_openid?: StringNullableFilter<"users"> | string | null
    wechat_unionid?: StringNullableFilter<"users"> | string | null
    wework_userid?: StringNullableFilter<"users"> | string | null
    qq_openid?: StringNullableFilter<"users"> | string | null
    alipay_user_id?: StringNullableFilter<"users"> | string | null
    notification_settings?: StringNullableFilter<"users"> | string | null
    daily_ai_limit?: IntNullableFilter<"users"> | number | null
    daily_ai_usage?: IntNullableFilter<"users"> | number | null
    last_ai_usage_date?: StringNullableFilter<"users"> | string | null
    ai_balance?: IntNullableFilter<"users"> | number | null
    email_verified?: IntNullableFilter<"users"> | number | null
    email_verified_at?: BigIntNullableFilter<"users"> | bigint | number | null
    public_key?: StringNullableFilter<"users"> | string | null
    created_at?: BigIntFilter<"users"> | bigint | number
    updated_at?: BigIntFilter<"users"> | bigint | number
  }

  export type usersOrderByWithRelationInput = {
    id?: SortOrder
    uid?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    password_hash?: SortOrderInput | SortOrder
    username?: SortOrder
    avatar_url?: SortOrderInput | SortOrder
    role?: SortOrderInput | SortOrder
    permissions?: SortOrderInput | SortOrder
    wechat_openid?: SortOrderInput | SortOrder
    wechat_unionid?: SortOrderInput | SortOrder
    wework_userid?: SortOrderInput | SortOrder
    qq_openid?: SortOrderInput | SortOrder
    alipay_user_id?: SortOrderInput | SortOrder
    notification_settings?: SortOrderInput | SortOrder
    daily_ai_limit?: SortOrderInput | SortOrder
    daily_ai_usage?: SortOrderInput | SortOrder
    last_ai_usage_date?: SortOrderInput | SortOrder
    ai_balance?: SortOrderInput | SortOrder
    email_verified?: SortOrderInput | SortOrder
    email_verified_at?: SortOrderInput | SortOrder
    public_key?: SortOrderInput | SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type usersWhereUniqueInput = Prisma.AtLeast<{
    id?: bigint | number
    uid?: string
    email?: string
    wechat_openid?: string
    qq_openid?: string
    alipay_user_id?: string
    AND?: usersWhereInput | usersWhereInput[]
    OR?: usersWhereInput[]
    NOT?: usersWhereInput | usersWhereInput[]
    password_hash?: StringNullableFilter<"users"> | string | null
    username?: StringFilter<"users"> | string
    avatar_url?: StringNullableFilter<"users"> | string | null
    role?: StringNullableFilter<"users"> | string | null
    permissions?: StringNullableFilter<"users"> | string | null
    wechat_unionid?: StringNullableFilter<"users"> | string | null
    wework_userid?: StringNullableFilter<"users"> | string | null
    notification_settings?: StringNullableFilter<"users"> | string | null
    daily_ai_limit?: IntNullableFilter<"users"> | number | null
    daily_ai_usage?: IntNullableFilter<"users"> | number | null
    last_ai_usage_date?: StringNullableFilter<"users"> | string | null
    ai_balance?: IntNullableFilter<"users"> | number | null
    email_verified?: IntNullableFilter<"users"> | number | null
    email_verified_at?: BigIntNullableFilter<"users"> | bigint | number | null
    public_key?: StringNullableFilter<"users"> | string | null
    created_at?: BigIntFilter<"users"> | bigint | number
    updated_at?: BigIntFilter<"users"> | bigint | number
  }, "id" | "uid" | "email" | "wechat_openid" | "qq_openid" | "alipay_user_id">

  export type usersOrderByWithAggregationInput = {
    id?: SortOrder
    uid?: SortOrderInput | SortOrder
    email?: SortOrderInput | SortOrder
    password_hash?: SortOrderInput | SortOrder
    username?: SortOrder
    avatar_url?: SortOrderInput | SortOrder
    role?: SortOrderInput | SortOrder
    permissions?: SortOrderInput | SortOrder
    wechat_openid?: SortOrderInput | SortOrder
    wechat_unionid?: SortOrderInput | SortOrder
    wework_userid?: SortOrderInput | SortOrder
    qq_openid?: SortOrderInput | SortOrder
    alipay_user_id?: SortOrderInput | SortOrder
    notification_settings?: SortOrderInput | SortOrder
    daily_ai_limit?: SortOrderInput | SortOrder
    daily_ai_usage?: SortOrderInput | SortOrder
    last_ai_usage_date?: SortOrderInput | SortOrder
    ai_balance?: SortOrderInput | SortOrder
    email_verified?: SortOrderInput | SortOrder
    email_verified_at?: SortOrderInput | SortOrder
    public_key?: SortOrderInput | SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    _count?: usersCountOrderByAggregateInput
    _avg?: usersAvgOrderByAggregateInput
    _max?: usersMaxOrderByAggregateInput
    _min?: usersMinOrderByAggregateInput
    _sum?: usersSumOrderByAggregateInput
  }

  export type usersScalarWhereWithAggregatesInput = {
    AND?: usersScalarWhereWithAggregatesInput | usersScalarWhereWithAggregatesInput[]
    OR?: usersScalarWhereWithAggregatesInput[]
    NOT?: usersScalarWhereWithAggregatesInput | usersScalarWhereWithAggregatesInput[]
    id?: BigIntWithAggregatesFilter<"users"> | bigint | number
    uid?: StringNullableWithAggregatesFilter<"users"> | string | null
    email?: StringNullableWithAggregatesFilter<"users"> | string | null
    password_hash?: StringNullableWithAggregatesFilter<"users"> | string | null
    username?: StringWithAggregatesFilter<"users"> | string
    avatar_url?: StringNullableWithAggregatesFilter<"users"> | string | null
    role?: StringNullableWithAggregatesFilter<"users"> | string | null
    permissions?: StringNullableWithAggregatesFilter<"users"> | string | null
    wechat_openid?: StringNullableWithAggregatesFilter<"users"> | string | null
    wechat_unionid?: StringNullableWithAggregatesFilter<"users"> | string | null
    wework_userid?: StringNullableWithAggregatesFilter<"users"> | string | null
    qq_openid?: StringNullableWithAggregatesFilter<"users"> | string | null
    alipay_user_id?: StringNullableWithAggregatesFilter<"users"> | string | null
    notification_settings?: StringNullableWithAggregatesFilter<"users"> | string | null
    daily_ai_limit?: IntNullableWithAggregatesFilter<"users"> | number | null
    daily_ai_usage?: IntNullableWithAggregatesFilter<"users"> | number | null
    last_ai_usage_date?: StringNullableWithAggregatesFilter<"users"> | string | null
    ai_balance?: IntNullableWithAggregatesFilter<"users"> | number | null
    email_verified?: IntNullableWithAggregatesFilter<"users"> | number | null
    email_verified_at?: BigIntNullableWithAggregatesFilter<"users"> | bigint | number | null
    public_key?: StringNullableWithAggregatesFilter<"users"> | string | null
    created_at?: BigIntWithAggregatesFilter<"users"> | bigint | number
    updated_at?: BigIntWithAggregatesFilter<"users"> | bigint | number
  }

  export type AgriKnowledgeCreateInput = {
    id: string
    title: string
    content: string
    category: string
    tags?: AgriKnowledgeCreatetagsInput | string[]
    source?: string | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt: Date | string
  }

  export type AgriKnowledgeUncheckedCreateInput = {
    id: string
    title: string
    content: string
    category: string
    tags?: AgriKnowledgeCreatetagsInput | string[]
    source?: string | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt: Date | string
  }

  export type AgriKnowledgeUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    tags?: AgriKnowledgeUpdatetagsInput | string[]
    source?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AgriKnowledgeUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    tags?: AgriKnowledgeUpdatetagsInput | string[]
    source?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AgriKnowledgeCreateManyInput = {
    id: string
    title: string
    content: string
    category: string
    tags?: AgriKnowledgeCreatetagsInput | string[]
    source?: string | null
    isActive?: boolean
    createdAt?: Date | string
    updatedAt: Date | string
  }

  export type AgriKnowledgeUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    tags?: AgriKnowledgeUpdatetagsInput | string[]
    source?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AgriKnowledgeUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    title?: StringFieldUpdateOperationsInput | string
    content?: StringFieldUpdateOperationsInput | string
    category?: StringFieldUpdateOperationsInput | string
    tags?: AgriKnowledgeUpdatetagsInput | string[]
    source?: NullableStringFieldUpdateOperationsInput | string | null
    isActive?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DailyReportCreateInput = {
    id?: string
    date?: Date | string
    imageUrl?: string | null
    imageAnalysis?: string | null
    sensorData?: NullableJsonNullValueInput | InputJsonValue
    environmentAnalysis?: string | null
    weatherInfo?: NullableJsonNullValueInput | InputJsonValue
    suggestions?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type DailyReportUncheckedCreateInput = {
    id?: string
    date?: Date | string
    imageUrl?: string | null
    imageAnalysis?: string | null
    sensorData?: NullableJsonNullValueInput | InputJsonValue
    environmentAnalysis?: string | null
    weatherInfo?: NullableJsonNullValueInput | InputJsonValue
    suggestions?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type DailyReportUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    imageAnalysis?: NullableStringFieldUpdateOperationsInput | string | null
    sensorData?: NullableJsonNullValueInput | InputJsonValue
    environmentAnalysis?: NullableStringFieldUpdateOperationsInput | string | null
    weatherInfo?: NullableJsonNullValueInput | InputJsonValue
    suggestions?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DailyReportUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    imageAnalysis?: NullableStringFieldUpdateOperationsInput | string | null
    sensorData?: NullableJsonNullValueInput | InputJsonValue
    environmentAnalysis?: NullableStringFieldUpdateOperationsInput | string | null
    weatherInfo?: NullableJsonNullValueInput | InputJsonValue
    suggestions?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DailyReportCreateManyInput = {
    id?: string
    date?: Date | string
    imageUrl?: string | null
    imageAnalysis?: string | null
    sensorData?: NullableJsonNullValueInput | InputJsonValue
    environmentAnalysis?: string | null
    weatherInfo?: NullableJsonNullValueInput | InputJsonValue
    suggestions?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type DailyReportUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    imageAnalysis?: NullableStringFieldUpdateOperationsInput | string | null
    sensorData?: NullableJsonNullValueInput | InputJsonValue
    environmentAnalysis?: NullableStringFieldUpdateOperationsInput | string | null
    weatherInfo?: NullableJsonNullValueInput | InputJsonValue
    suggestions?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DailyReportUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    date?: DateTimeFieldUpdateOperationsInput | Date | string
    imageUrl?: NullableStringFieldUpdateOperationsInput | string | null
    imageAnalysis?: NullableStringFieldUpdateOperationsInput | string | null
    sensorData?: NullableJsonNullValueInput | InputJsonValue
    environmentAnalysis?: NullableStringFieldUpdateOperationsInput | string | null
    weatherInfo?: NullableJsonNullValueInput | InputJsonValue
    suggestions?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type access_logsCreateInput = {
    id?: bigint | number
    ip: string
    method?: string | null
    path?: string | null
    status?: number | null
    duration?: number | null
    user_id?: number | null
    user_agent?: string | null
    created_at: bigint | number
  }

  export type access_logsUncheckedCreateInput = {
    id?: bigint | number
    ip: string
    method?: string | null
    path?: string | null
    status?: number | null
    duration?: number | null
    user_id?: number | null
    user_agent?: string | null
    created_at: bigint | number
  }

  export type access_logsUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    ip?: StringFieldUpdateOperationsInput | string
    method?: NullableStringFieldUpdateOperationsInput | string | null
    path?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableIntFieldUpdateOperationsInput | number | null
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    user_id?: NullableIntFieldUpdateOperationsInput | number | null
    user_agent?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type access_logsUncheckedUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    ip?: StringFieldUpdateOperationsInput | string
    method?: NullableStringFieldUpdateOperationsInput | string | null
    path?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableIntFieldUpdateOperationsInput | number | null
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    user_id?: NullableIntFieldUpdateOperationsInput | number | null
    user_agent?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type access_logsCreateManyInput = {
    id?: bigint | number
    ip: string
    method?: string | null
    path?: string | null
    status?: number | null
    duration?: number | null
    user_id?: number | null
    user_agent?: string | null
    created_at: bigint | number
  }

  export type access_logsUpdateManyMutationInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    ip?: StringFieldUpdateOperationsInput | string
    method?: NullableStringFieldUpdateOperationsInput | string | null
    path?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableIntFieldUpdateOperationsInput | number | null
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    user_id?: NullableIntFieldUpdateOperationsInput | number | null
    user_agent?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type access_logsUncheckedUpdateManyInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    ip?: StringFieldUpdateOperationsInput | string
    method?: NullableStringFieldUpdateOperationsInput | string | null
    path?: NullableStringFieldUpdateOperationsInput | string | null
    status?: NullableIntFieldUpdateOperationsInput | number | null
    duration?: NullableIntFieldUpdateOperationsInput | number | null
    user_id?: NullableIntFieldUpdateOperationsInput | number | null
    user_agent?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type automation_rulesCreateInput = {
    id: string
    name: string
    description?: string | null
    is_active?: number | null
    graph_data: string
    trigger_type?: string | null
    created_at: string
    updated_at: string
    last_triggered_at?: string | null
    execution_count?: number | null
  }

  export type automation_rulesUncheckedCreateInput = {
    id: string
    name: string
    description?: string | null
    is_active?: number | null
    graph_data: string
    trigger_type?: string | null
    created_at: string
    updated_at: string
    last_triggered_at?: string | null
    execution_count?: number | null
  }

  export type automation_rulesUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    is_active?: NullableIntFieldUpdateOperationsInput | number | null
    graph_data?: StringFieldUpdateOperationsInput | string
    trigger_type?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: StringFieldUpdateOperationsInput | string
    updated_at?: StringFieldUpdateOperationsInput | string
    last_triggered_at?: NullableStringFieldUpdateOperationsInput | string | null
    execution_count?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type automation_rulesUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    is_active?: NullableIntFieldUpdateOperationsInput | number | null
    graph_data?: StringFieldUpdateOperationsInput | string
    trigger_type?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: StringFieldUpdateOperationsInput | string
    updated_at?: StringFieldUpdateOperationsInput | string
    last_triggered_at?: NullableStringFieldUpdateOperationsInput | string | null
    execution_count?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type automation_rulesCreateManyInput = {
    id: string
    name: string
    description?: string | null
    is_active?: number | null
    graph_data: string
    trigger_type?: string | null
    created_at: string
    updated_at: string
    last_triggered_at?: string | null
    execution_count?: number | null
  }

  export type automation_rulesUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    is_active?: NullableIntFieldUpdateOperationsInput | number | null
    graph_data?: StringFieldUpdateOperationsInput | string
    trigger_type?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: StringFieldUpdateOperationsInput | string
    updated_at?: StringFieldUpdateOperationsInput | string
    last_triggered_at?: NullableStringFieldUpdateOperationsInput | string | null
    execution_count?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type automation_rulesUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    description?: NullableStringFieldUpdateOperationsInput | string | null
    is_active?: NullableIntFieldUpdateOperationsInput | number | null
    graph_data?: StringFieldUpdateOperationsInput | string
    trigger_type?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: StringFieldUpdateOperationsInput | string
    updated_at?: StringFieldUpdateOperationsInput | string
    last_triggered_at?: NullableStringFieldUpdateOperationsInput | string | null
    execution_count?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type banned_ipsCreateInput = {
    id?: bigint | number
    ip: string
    reason?: string | null
    banned_by?: string | null
    expires_at?: bigint | number | null
    created_at: bigint | number
  }

  export type banned_ipsUncheckedCreateInput = {
    id?: bigint | number
    ip: string
    reason?: string | null
    banned_by?: string | null
    expires_at?: bigint | number | null
    created_at: bigint | number
  }

  export type banned_ipsUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    ip?: StringFieldUpdateOperationsInput | string
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    banned_by?: NullableStringFieldUpdateOperationsInput | string | null
    expires_at?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type banned_ipsUncheckedUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    ip?: StringFieldUpdateOperationsInput | string
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    banned_by?: NullableStringFieldUpdateOperationsInput | string | null
    expires_at?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type banned_ipsCreateManyInput = {
    id?: bigint | number
    ip: string
    reason?: string | null
    banned_by?: string | null
    expires_at?: bigint | number | null
    created_at: bigint | number
  }

  export type banned_ipsUpdateManyMutationInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    ip?: StringFieldUpdateOperationsInput | string
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    banned_by?: NullableStringFieldUpdateOperationsInput | string | null
    expires_at?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type banned_ipsUncheckedUpdateManyInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    ip?: StringFieldUpdateOperationsInput | string
    reason?: NullableStringFieldUpdateOperationsInput | string | null
    banned_by?: NullableStringFieldUpdateOperationsInput | string | null
    expires_at?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type device_logsCreateInput = {
    id?: bigint | number
    device_name: string
    action: string
    operator: string
    details?: string | null
    created_at: bigint | number
  }

  export type device_logsUncheckedCreateInput = {
    id?: bigint | number
    device_name: string
    action: string
    operator: string
    details?: string | null
    created_at: bigint | number
  }

  export type device_logsUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    device_name?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    operator?: StringFieldUpdateOperationsInput | string
    details?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type device_logsUncheckedUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    device_name?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    operator?: StringFieldUpdateOperationsInput | string
    details?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type device_logsCreateManyInput = {
    id?: bigint | number
    device_name: string
    action: string
    operator: string
    details?: string | null
    created_at: bigint | number
  }

  export type device_logsUpdateManyMutationInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    device_name?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    operator?: StringFieldUpdateOperationsInput | string
    details?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type device_logsUncheckedUpdateManyInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    device_name?: StringFieldUpdateOperationsInput | string
    action?: StringFieldUpdateOperationsInput | string
    operator?: StringFieldUpdateOperationsInput | string
    details?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type email_verificationsCreateInput = {
    id?: bigint | number
    email: string
    code: string
    expires_at: bigint | number
    used?: number | null
    created_at: bigint | number
  }

  export type email_verificationsUncheckedCreateInput = {
    id?: bigint | number
    email: string
    code: string
    expires_at: bigint | number
    used?: number | null
    created_at: bigint | number
  }

  export type email_verificationsUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    email?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    expires_at?: BigIntFieldUpdateOperationsInput | bigint | number
    used?: NullableIntFieldUpdateOperationsInput | number | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type email_verificationsUncheckedUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    email?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    expires_at?: BigIntFieldUpdateOperationsInput | bigint | number
    used?: NullableIntFieldUpdateOperationsInput | number | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type email_verificationsCreateManyInput = {
    id?: bigint | number
    email: string
    code: string
    expires_at: bigint | number
    used?: number | null
    created_at: bigint | number
  }

  export type email_verificationsUpdateManyMutationInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    email?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    expires_at?: BigIntFieldUpdateOperationsInput | bigint | number
    used?: NullableIntFieldUpdateOperationsInput | number | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type email_verificationsUncheckedUpdateManyInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    email?: StringFieldUpdateOperationsInput | string
    code?: StringFieldUpdateOperationsInput | string
    expires_at?: BigIntFieldUpdateOperationsInput | bigint | number
    used?: NullableIntFieldUpdateOperationsInput | number | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type friend_requestsCreateInput = {
    id?: bigint | number
    requester_id: number
    addressee_id: number
    status?: string | null
    created_at: bigint | number
    updated_at: bigint | number
  }

  export type friend_requestsUncheckedCreateInput = {
    id?: bigint | number
    requester_id: number
    addressee_id: number
    status?: string | null
    created_at: bigint | number
    updated_at: bigint | number
  }

  export type friend_requestsUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    requester_id?: IntFieldUpdateOperationsInput | number
    addressee_id?: IntFieldUpdateOperationsInput | number
    status?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
    updated_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type friend_requestsUncheckedUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    requester_id?: IntFieldUpdateOperationsInput | number
    addressee_id?: IntFieldUpdateOperationsInput | number
    status?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
    updated_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type friend_requestsCreateManyInput = {
    id?: bigint | number
    requester_id: number
    addressee_id: number
    status?: string | null
    created_at: bigint | number
    updated_at: bigint | number
  }

  export type friend_requestsUpdateManyMutationInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    requester_id?: IntFieldUpdateOperationsInput | number
    addressee_id?: IntFieldUpdateOperationsInput | number
    status?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
    updated_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type friend_requestsUncheckedUpdateManyInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    requester_id?: IntFieldUpdateOperationsInput | number
    addressee_id?: IntFieldUpdateOperationsInput | number
    status?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
    updated_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type friendsCreateInput = {
    id?: bigint | number
    user_id: number
    friend_id: number
    created_at: bigint | number
    is_blocked?: number | null
  }

  export type friendsUncheckedCreateInput = {
    id?: bigint | number
    user_id: number
    friend_id: number
    created_at: bigint | number
    is_blocked?: number | null
  }

  export type friendsUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    user_id?: IntFieldUpdateOperationsInput | number
    friend_id?: IntFieldUpdateOperationsInput | number
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
    is_blocked?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type friendsUncheckedUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    user_id?: IntFieldUpdateOperationsInput | number
    friend_id?: IntFieldUpdateOperationsInput | number
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
    is_blocked?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type friendsCreateManyInput = {
    id?: bigint | number
    user_id: number
    friend_id: number
    created_at: bigint | number
    is_blocked?: number | null
  }

  export type friendsUpdateManyMutationInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    user_id?: IntFieldUpdateOperationsInput | number
    friend_id?: IntFieldUpdateOperationsInput | number
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
    is_blocked?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type friendsUncheckedUpdateManyInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    user_id?: IntFieldUpdateOperationsInput | number
    friend_id?: IntFieldUpdateOperationsInput | number
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
    is_blocked?: NullableIntFieldUpdateOperationsInput | number | null
  }

  export type group_membersCreateInput = {
    id?: bigint | number
    group_id: number
    user_id: number
    role?: string | null
    is_muted?: number | null
    joined_at: bigint | number
    last_read_at?: bigint | number | null
  }

  export type group_membersUncheckedCreateInput = {
    id?: bigint | number
    group_id: number
    user_id: number
    role?: string | null
    is_muted?: number | null
    joined_at: bigint | number
    last_read_at?: bigint | number | null
  }

  export type group_membersUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    group_id?: IntFieldUpdateOperationsInput | number
    user_id?: IntFieldUpdateOperationsInput | number
    role?: NullableStringFieldUpdateOperationsInput | string | null
    is_muted?: NullableIntFieldUpdateOperationsInput | number | null
    joined_at?: BigIntFieldUpdateOperationsInput | bigint | number
    last_read_at?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
  }

  export type group_membersUncheckedUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    group_id?: IntFieldUpdateOperationsInput | number
    user_id?: IntFieldUpdateOperationsInput | number
    role?: NullableStringFieldUpdateOperationsInput | string | null
    is_muted?: NullableIntFieldUpdateOperationsInput | number | null
    joined_at?: BigIntFieldUpdateOperationsInput | bigint | number
    last_read_at?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
  }

  export type group_membersCreateManyInput = {
    id?: bigint | number
    group_id: number
    user_id: number
    role?: string | null
    is_muted?: number | null
    joined_at: bigint | number
    last_read_at?: bigint | number | null
  }

  export type group_membersUpdateManyMutationInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    group_id?: IntFieldUpdateOperationsInput | number
    user_id?: IntFieldUpdateOperationsInput | number
    role?: NullableStringFieldUpdateOperationsInput | string | null
    is_muted?: NullableIntFieldUpdateOperationsInput | number | null
    joined_at?: BigIntFieldUpdateOperationsInput | bigint | number
    last_read_at?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
  }

  export type group_membersUncheckedUpdateManyInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    group_id?: IntFieldUpdateOperationsInput | number
    user_id?: IntFieldUpdateOperationsInput | number
    role?: NullableStringFieldUpdateOperationsInput | string | null
    is_muted?: NullableIntFieldUpdateOperationsInput | number | null
    joined_at?: BigIntFieldUpdateOperationsInput | bigint | number
    last_read_at?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
  }

  export type groupsCreateInput = {
    id?: bigint | number
    name: string
    owner_id: number
    avatar_url?: string | null
    created_at: bigint | number
  }

  export type groupsUncheckedCreateInput = {
    id?: bigint | number
    name: string
    owner_id: number
    avatar_url?: string | null
    created_at: bigint | number
  }

  export type groupsUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    name?: StringFieldUpdateOperationsInput | string
    owner_id?: IntFieldUpdateOperationsInput | number
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type groupsUncheckedUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    name?: StringFieldUpdateOperationsInput | string
    owner_id?: IntFieldUpdateOperationsInput | number
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type groupsCreateManyInput = {
    id?: bigint | number
    name: string
    owner_id: number
    avatar_url?: string | null
    created_at: bigint | number
  }

  export type groupsUpdateManyMutationInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    name?: StringFieldUpdateOperationsInput | string
    owner_id?: IntFieldUpdateOperationsInput | number
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type groupsUncheckedUpdateManyInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    name?: StringFieldUpdateOperationsInput | string
    owner_id?: IntFieldUpdateOperationsInput | number
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type login_logsCreateInput = {
    id?: bigint | number
    user_id: number
    ip: string
    country?: string | null
    region?: string | null
    city?: string | null
    user_agent?: string | null
    device_type?: string | null
    created_at: bigint | number
  }

  export type login_logsUncheckedCreateInput = {
    id?: bigint | number
    user_id: number
    ip: string
    country?: string | null
    region?: string | null
    city?: string | null
    user_agent?: string | null
    device_type?: string | null
    created_at: bigint | number
  }

  export type login_logsUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    user_id?: IntFieldUpdateOperationsInput | number
    ip?: StringFieldUpdateOperationsInput | string
    country?: NullableStringFieldUpdateOperationsInput | string | null
    region?: NullableStringFieldUpdateOperationsInput | string | null
    city?: NullableStringFieldUpdateOperationsInput | string | null
    user_agent?: NullableStringFieldUpdateOperationsInput | string | null
    device_type?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type login_logsUncheckedUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    user_id?: IntFieldUpdateOperationsInput | number
    ip?: StringFieldUpdateOperationsInput | string
    country?: NullableStringFieldUpdateOperationsInput | string | null
    region?: NullableStringFieldUpdateOperationsInput | string | null
    city?: NullableStringFieldUpdateOperationsInput | string | null
    user_agent?: NullableStringFieldUpdateOperationsInput | string | null
    device_type?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type login_logsCreateManyInput = {
    id?: bigint | number
    user_id: number
    ip: string
    country?: string | null
    region?: string | null
    city?: string | null
    user_agent?: string | null
    device_type?: string | null
    created_at: bigint | number
  }

  export type login_logsUpdateManyMutationInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    user_id?: IntFieldUpdateOperationsInput | number
    ip?: StringFieldUpdateOperationsInput | string
    country?: NullableStringFieldUpdateOperationsInput | string | null
    region?: NullableStringFieldUpdateOperationsInput | string | null
    city?: NullableStringFieldUpdateOperationsInput | string | null
    user_agent?: NullableStringFieldUpdateOperationsInput | string | null
    device_type?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type login_logsUncheckedUpdateManyInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    user_id?: IntFieldUpdateOperationsInput | number
    ip?: StringFieldUpdateOperationsInput | string
    country?: NullableStringFieldUpdateOperationsInput | string | null
    region?: NullableStringFieldUpdateOperationsInput | string | null
    city?: NullableStringFieldUpdateOperationsInput | string | null
    user_agent?: NullableStringFieldUpdateOperationsInput | string | null
    device_type?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type login_ticketsCreateInput = {
    ticket: string
    jwt?: string | null
    created_at: bigint | number
  }

  export type login_ticketsUncheckedCreateInput = {
    ticket: string
    jwt?: string | null
    created_at: bigint | number
  }

  export type login_ticketsUpdateInput = {
    ticket?: StringFieldUpdateOperationsInput | string
    jwt?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type login_ticketsUncheckedUpdateInput = {
    ticket?: StringFieldUpdateOperationsInput | string
    jwt?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type login_ticketsCreateManyInput = {
    ticket: string
    jwt?: string | null
    created_at: bigint | number
  }

  export type login_ticketsUpdateManyMutationInput = {
    ticket?: StringFieldUpdateOperationsInput | string
    jwt?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type login_ticketsUncheckedUpdateManyInput = {
    ticket?: StringFieldUpdateOperationsInput | string
    jwt?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type messagesCreateInput = {
    id?: bigint | number
    sender_id: number
    receiver_id: number
    group_id?: number | null
    content?: string | null
    type?: string | null
    file_url?: string | null
    read_at?: bigint | number | null
    created_at: bigint | number
  }

  export type messagesUncheckedCreateInput = {
    id?: bigint | number
    sender_id: number
    receiver_id: number
    group_id?: number | null
    content?: string | null
    type?: string | null
    file_url?: string | null
    read_at?: bigint | number | null
    created_at: bigint | number
  }

  export type messagesUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    sender_id?: IntFieldUpdateOperationsInput | number
    receiver_id?: IntFieldUpdateOperationsInput | number
    group_id?: NullableIntFieldUpdateOperationsInput | number | null
    content?: NullableStringFieldUpdateOperationsInput | string | null
    type?: NullableStringFieldUpdateOperationsInput | string | null
    file_url?: NullableStringFieldUpdateOperationsInput | string | null
    read_at?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type messagesUncheckedUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    sender_id?: IntFieldUpdateOperationsInput | number
    receiver_id?: IntFieldUpdateOperationsInput | number
    group_id?: NullableIntFieldUpdateOperationsInput | number | null
    content?: NullableStringFieldUpdateOperationsInput | string | null
    type?: NullableStringFieldUpdateOperationsInput | string | null
    file_url?: NullableStringFieldUpdateOperationsInput | string | null
    read_at?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type messagesCreateManyInput = {
    id?: bigint | number
    sender_id: number
    receiver_id: number
    group_id?: number | null
    content?: string | null
    type?: string | null
    file_url?: string | null
    read_at?: bigint | number | null
    created_at: bigint | number
  }

  export type messagesUpdateManyMutationInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    sender_id?: IntFieldUpdateOperationsInput | number
    receiver_id?: IntFieldUpdateOperationsInput | number
    group_id?: NullableIntFieldUpdateOperationsInput | number | null
    content?: NullableStringFieldUpdateOperationsInput | string | null
    type?: NullableStringFieldUpdateOperationsInput | string | null
    file_url?: NullableStringFieldUpdateOperationsInput | string | null
    read_at?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type messagesUncheckedUpdateManyInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    sender_id?: IntFieldUpdateOperationsInput | number
    receiver_id?: IntFieldUpdateOperationsInput | number
    group_id?: NullableIntFieldUpdateOperationsInput | number | null
    content?: NullableStringFieldUpdateOperationsInput | string | null
    type?: NullableStringFieldUpdateOperationsInput | string | null
    file_url?: NullableStringFieldUpdateOperationsInput | string | null
    read_at?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type scheduled_tasksCreateInput = {
    id?: bigint | number
    title: string
    cron_expression?: string | null
    execute_at?: bigint | number | null
    action_type: string
    device_id?: number | null
    params: string
    is_active?: number | null
    created_at: bigint | number
    updated_at: bigint | number
  }

  export type scheduled_tasksUncheckedCreateInput = {
    id?: bigint | number
    title: string
    cron_expression?: string | null
    execute_at?: bigint | number | null
    action_type: string
    device_id?: number | null
    params: string
    is_active?: number | null
    created_at: bigint | number
    updated_at: bigint | number
  }

  export type scheduled_tasksUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    title?: StringFieldUpdateOperationsInput | string
    cron_expression?: NullableStringFieldUpdateOperationsInput | string | null
    execute_at?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
    action_type?: StringFieldUpdateOperationsInput | string
    device_id?: NullableIntFieldUpdateOperationsInput | number | null
    params?: StringFieldUpdateOperationsInput | string
    is_active?: NullableIntFieldUpdateOperationsInput | number | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
    updated_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type scheduled_tasksUncheckedUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    title?: StringFieldUpdateOperationsInput | string
    cron_expression?: NullableStringFieldUpdateOperationsInput | string | null
    execute_at?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
    action_type?: StringFieldUpdateOperationsInput | string
    device_id?: NullableIntFieldUpdateOperationsInput | number | null
    params?: StringFieldUpdateOperationsInput | string
    is_active?: NullableIntFieldUpdateOperationsInput | number | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
    updated_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type scheduled_tasksCreateManyInput = {
    id?: bigint | number
    title: string
    cron_expression?: string | null
    execute_at?: bigint | number | null
    action_type: string
    device_id?: number | null
    params: string
    is_active?: number | null
    created_at: bigint | number
    updated_at: bigint | number
  }

  export type scheduled_tasksUpdateManyMutationInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    title?: StringFieldUpdateOperationsInput | string
    cron_expression?: NullableStringFieldUpdateOperationsInput | string | null
    execute_at?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
    action_type?: StringFieldUpdateOperationsInput | string
    device_id?: NullableIntFieldUpdateOperationsInput | number | null
    params?: StringFieldUpdateOperationsInput | string
    is_active?: NullableIntFieldUpdateOperationsInput | number | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
    updated_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type scheduled_tasksUncheckedUpdateManyInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    title?: StringFieldUpdateOperationsInput | string
    cron_expression?: NullableStringFieldUpdateOperationsInput | string | null
    execute_at?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
    action_type?: StringFieldUpdateOperationsInput | string
    device_id?: NullableIntFieldUpdateOperationsInput | number | null
    params?: StringFieldUpdateOperationsInput | string
    is_active?: NullableIntFieldUpdateOperationsInput | number | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
    updated_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type sensor_readingsCreateInput = {
    id?: bigint | number
    device_id?: string | null
    temperature?: number | null
    humidity?: number | null
    light?: number | null
    co2?: number | null
    soil_moisture?: number | null
    earth_n?: number | null
    earth_p?: number | null
    earth_k?: number | null
    rainfall?: number | null
    created_at: bigint | number
  }

  export type sensor_readingsUncheckedCreateInput = {
    id?: bigint | number
    device_id?: string | null
    temperature?: number | null
    humidity?: number | null
    light?: number | null
    co2?: number | null
    soil_moisture?: number | null
    earth_n?: number | null
    earth_p?: number | null
    earth_k?: number | null
    rainfall?: number | null
    created_at: bigint | number
  }

  export type sensor_readingsUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    device_id?: NullableStringFieldUpdateOperationsInput | string | null
    temperature?: NullableFloatFieldUpdateOperationsInput | number | null
    humidity?: NullableFloatFieldUpdateOperationsInput | number | null
    light?: NullableFloatFieldUpdateOperationsInput | number | null
    co2?: NullableFloatFieldUpdateOperationsInput | number | null
    soil_moisture?: NullableFloatFieldUpdateOperationsInput | number | null
    earth_n?: NullableFloatFieldUpdateOperationsInput | number | null
    earth_p?: NullableFloatFieldUpdateOperationsInput | number | null
    earth_k?: NullableFloatFieldUpdateOperationsInput | number | null
    rainfall?: NullableFloatFieldUpdateOperationsInput | number | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type sensor_readingsUncheckedUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    device_id?: NullableStringFieldUpdateOperationsInput | string | null
    temperature?: NullableFloatFieldUpdateOperationsInput | number | null
    humidity?: NullableFloatFieldUpdateOperationsInput | number | null
    light?: NullableFloatFieldUpdateOperationsInput | number | null
    co2?: NullableFloatFieldUpdateOperationsInput | number | null
    soil_moisture?: NullableFloatFieldUpdateOperationsInput | number | null
    earth_n?: NullableFloatFieldUpdateOperationsInput | number | null
    earth_p?: NullableFloatFieldUpdateOperationsInput | number | null
    earth_k?: NullableFloatFieldUpdateOperationsInput | number | null
    rainfall?: NullableFloatFieldUpdateOperationsInput | number | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type sensor_readingsCreateManyInput = {
    id?: bigint | number
    device_id?: string | null
    temperature?: number | null
    humidity?: number | null
    light?: number | null
    co2?: number | null
    soil_moisture?: number | null
    earth_n?: number | null
    earth_p?: number | null
    earth_k?: number | null
    rainfall?: number | null
    created_at: bigint | number
  }

  export type sensor_readingsUpdateManyMutationInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    device_id?: NullableStringFieldUpdateOperationsInput | string | null
    temperature?: NullableFloatFieldUpdateOperationsInput | number | null
    humidity?: NullableFloatFieldUpdateOperationsInput | number | null
    light?: NullableFloatFieldUpdateOperationsInput | number | null
    co2?: NullableFloatFieldUpdateOperationsInput | number | null
    soil_moisture?: NullableFloatFieldUpdateOperationsInput | number | null
    earth_n?: NullableFloatFieldUpdateOperationsInput | number | null
    earth_p?: NullableFloatFieldUpdateOperationsInput | number | null
    earth_k?: NullableFloatFieldUpdateOperationsInput | number | null
    rainfall?: NullableFloatFieldUpdateOperationsInput | number | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type sensor_readingsUncheckedUpdateManyInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    device_id?: NullableStringFieldUpdateOperationsInput | string | null
    temperature?: NullableFloatFieldUpdateOperationsInput | number | null
    humidity?: NullableFloatFieldUpdateOperationsInput | number | null
    light?: NullableFloatFieldUpdateOperationsInput | number | null
    co2?: NullableFloatFieldUpdateOperationsInput | number | null
    soil_moisture?: NullableFloatFieldUpdateOperationsInput | number | null
    earth_n?: NullableFloatFieldUpdateOperationsInput | number | null
    earth_p?: NullableFloatFieldUpdateOperationsInput | number | null
    earth_k?: NullableFloatFieldUpdateOperationsInput | number | null
    rainfall?: NullableFloatFieldUpdateOperationsInput | number | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type system_settingsCreateInput = {
    key: string
    value: string
    updated_at: bigint | number
  }

  export type system_settingsUncheckedCreateInput = {
    key: string
    value: string
    updated_at: bigint | number
  }

  export type system_settingsUpdateInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    updated_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type system_settingsUncheckedUpdateInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    updated_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type system_settingsCreateManyInput = {
    key: string
    value: string
    updated_at: bigint | number
  }

  export type system_settingsUpdateManyMutationInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    updated_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type system_settingsUncheckedUpdateManyInput = {
    key?: StringFieldUpdateOperationsInput | string
    value?: StringFieldUpdateOperationsInput | string
    updated_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type usersCreateInput = {
    id?: bigint | number
    uid?: string | null
    email?: string | null
    password_hash?: string | null
    username: string
    avatar_url?: string | null
    role?: string | null
    permissions?: string | null
    wechat_openid?: string | null
    wechat_unionid?: string | null
    wework_userid?: string | null
    qq_openid?: string | null
    alipay_user_id?: string | null
    notification_settings?: string | null
    daily_ai_limit?: number | null
    daily_ai_usage?: number | null
    last_ai_usage_date?: string | null
    ai_balance?: number | null
    email_verified?: number | null
    email_verified_at?: bigint | number | null
    public_key?: string | null
    created_at: bigint | number
    updated_at: bigint | number
  }

  export type usersUncheckedCreateInput = {
    id?: bigint | number
    uid?: string | null
    email?: string | null
    password_hash?: string | null
    username: string
    avatar_url?: string | null
    role?: string | null
    permissions?: string | null
    wechat_openid?: string | null
    wechat_unionid?: string | null
    wework_userid?: string | null
    qq_openid?: string | null
    alipay_user_id?: string | null
    notification_settings?: string | null
    daily_ai_limit?: number | null
    daily_ai_usage?: number | null
    last_ai_usage_date?: string | null
    ai_balance?: number | null
    email_verified?: number | null
    email_verified_at?: bigint | number | null
    public_key?: string | null
    created_at: bigint | number
    updated_at: bigint | number
  }

  export type usersUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    uid?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    password_hash?: NullableStringFieldUpdateOperationsInput | string | null
    username?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    role?: NullableStringFieldUpdateOperationsInput | string | null
    permissions?: NullableStringFieldUpdateOperationsInput | string | null
    wechat_openid?: NullableStringFieldUpdateOperationsInput | string | null
    wechat_unionid?: NullableStringFieldUpdateOperationsInput | string | null
    wework_userid?: NullableStringFieldUpdateOperationsInput | string | null
    qq_openid?: NullableStringFieldUpdateOperationsInput | string | null
    alipay_user_id?: NullableStringFieldUpdateOperationsInput | string | null
    notification_settings?: NullableStringFieldUpdateOperationsInput | string | null
    daily_ai_limit?: NullableIntFieldUpdateOperationsInput | number | null
    daily_ai_usage?: NullableIntFieldUpdateOperationsInput | number | null
    last_ai_usage_date?: NullableStringFieldUpdateOperationsInput | string | null
    ai_balance?: NullableIntFieldUpdateOperationsInput | number | null
    email_verified?: NullableIntFieldUpdateOperationsInput | number | null
    email_verified_at?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
    public_key?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
    updated_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type usersUncheckedUpdateInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    uid?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    password_hash?: NullableStringFieldUpdateOperationsInput | string | null
    username?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    role?: NullableStringFieldUpdateOperationsInput | string | null
    permissions?: NullableStringFieldUpdateOperationsInput | string | null
    wechat_openid?: NullableStringFieldUpdateOperationsInput | string | null
    wechat_unionid?: NullableStringFieldUpdateOperationsInput | string | null
    wework_userid?: NullableStringFieldUpdateOperationsInput | string | null
    qq_openid?: NullableStringFieldUpdateOperationsInput | string | null
    alipay_user_id?: NullableStringFieldUpdateOperationsInput | string | null
    notification_settings?: NullableStringFieldUpdateOperationsInput | string | null
    daily_ai_limit?: NullableIntFieldUpdateOperationsInput | number | null
    daily_ai_usage?: NullableIntFieldUpdateOperationsInput | number | null
    last_ai_usage_date?: NullableStringFieldUpdateOperationsInput | string | null
    ai_balance?: NullableIntFieldUpdateOperationsInput | number | null
    email_verified?: NullableIntFieldUpdateOperationsInput | number | null
    email_verified_at?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
    public_key?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
    updated_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type usersCreateManyInput = {
    id?: bigint | number
    uid?: string | null
    email?: string | null
    password_hash?: string | null
    username: string
    avatar_url?: string | null
    role?: string | null
    permissions?: string | null
    wechat_openid?: string | null
    wechat_unionid?: string | null
    wework_userid?: string | null
    qq_openid?: string | null
    alipay_user_id?: string | null
    notification_settings?: string | null
    daily_ai_limit?: number | null
    daily_ai_usage?: number | null
    last_ai_usage_date?: string | null
    ai_balance?: number | null
    email_verified?: number | null
    email_verified_at?: bigint | number | null
    public_key?: string | null
    created_at: bigint | number
    updated_at: bigint | number
  }

  export type usersUpdateManyMutationInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    uid?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    password_hash?: NullableStringFieldUpdateOperationsInput | string | null
    username?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    role?: NullableStringFieldUpdateOperationsInput | string | null
    permissions?: NullableStringFieldUpdateOperationsInput | string | null
    wechat_openid?: NullableStringFieldUpdateOperationsInput | string | null
    wechat_unionid?: NullableStringFieldUpdateOperationsInput | string | null
    wework_userid?: NullableStringFieldUpdateOperationsInput | string | null
    qq_openid?: NullableStringFieldUpdateOperationsInput | string | null
    alipay_user_id?: NullableStringFieldUpdateOperationsInput | string | null
    notification_settings?: NullableStringFieldUpdateOperationsInput | string | null
    daily_ai_limit?: NullableIntFieldUpdateOperationsInput | number | null
    daily_ai_usage?: NullableIntFieldUpdateOperationsInput | number | null
    last_ai_usage_date?: NullableStringFieldUpdateOperationsInput | string | null
    ai_balance?: NullableIntFieldUpdateOperationsInput | number | null
    email_verified?: NullableIntFieldUpdateOperationsInput | number | null
    email_verified_at?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
    public_key?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
    updated_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type usersUncheckedUpdateManyInput = {
    id?: BigIntFieldUpdateOperationsInput | bigint | number
    uid?: NullableStringFieldUpdateOperationsInput | string | null
    email?: NullableStringFieldUpdateOperationsInput | string | null
    password_hash?: NullableStringFieldUpdateOperationsInput | string | null
    username?: StringFieldUpdateOperationsInput | string
    avatar_url?: NullableStringFieldUpdateOperationsInput | string | null
    role?: NullableStringFieldUpdateOperationsInput | string | null
    permissions?: NullableStringFieldUpdateOperationsInput | string | null
    wechat_openid?: NullableStringFieldUpdateOperationsInput | string | null
    wechat_unionid?: NullableStringFieldUpdateOperationsInput | string | null
    wework_userid?: NullableStringFieldUpdateOperationsInput | string | null
    qq_openid?: NullableStringFieldUpdateOperationsInput | string | null
    alipay_user_id?: NullableStringFieldUpdateOperationsInput | string | null
    notification_settings?: NullableStringFieldUpdateOperationsInput | string | null
    daily_ai_limit?: NullableIntFieldUpdateOperationsInput | number | null
    daily_ai_usage?: NullableIntFieldUpdateOperationsInput | number | null
    last_ai_usage_date?: NullableStringFieldUpdateOperationsInput | string | null
    ai_balance?: NullableIntFieldUpdateOperationsInput | number | null
    email_verified?: NullableIntFieldUpdateOperationsInput | number | null
    email_verified_at?: NullableBigIntFieldUpdateOperationsInput | bigint | number | null
    public_key?: NullableStringFieldUpdateOperationsInput | string | null
    created_at?: BigIntFieldUpdateOperationsInput | bigint | number
    updated_at?: BigIntFieldUpdateOperationsInput | bigint | number
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type StringNullableListFilter<$PrismaModel = never> = {
    equals?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    has?: string | StringFieldRefInput<$PrismaModel> | null
    hasEvery?: string[] | ListStringFieldRefInput<$PrismaModel>
    hasSome?: string[] | ListStringFieldRefInput<$PrismaModel>
    isEmpty?: boolean
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type AgriKnowledgeCountOrderByAggregateInput = {
    id?: SortOrder
    title?: SortOrder
    content?: SortOrder
    category?: SortOrder
    tags?: SortOrder
    source?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AgriKnowledgeMaxOrderByAggregateInput = {
    id?: SortOrder
    title?: SortOrder
    content?: SortOrder
    category?: SortOrder
    source?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AgriKnowledgeMinOrderByAggregateInput = {
    id?: SortOrder
    title?: SortOrder
    content?: SortOrder
    category?: SortOrder
    source?: SortOrder
    isActive?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }
  export type JsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type DailyReportCountOrderByAggregateInput = {
    id?: SortOrder
    date?: SortOrder
    imageUrl?: SortOrder
    imageAnalysis?: SortOrder
    sensorData?: SortOrder
    environmentAnalysis?: SortOrder
    weatherInfo?: SortOrder
    suggestions?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type DailyReportMaxOrderByAggregateInput = {
    id?: SortOrder
    date?: SortOrder
    imageUrl?: SortOrder
    imageAnalysis?: SortOrder
    environmentAnalysis?: SortOrder
    suggestions?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type DailyReportMinOrderByAggregateInput = {
    id?: SortOrder
    date?: SortOrder
    imageUrl?: SortOrder
    imageAnalysis?: SortOrder
    environmentAnalysis?: SortOrder
    suggestions?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
  }

  export type BigIntFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntFilter<$PrismaModel> | bigint | number
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type access_logsCountOrderByAggregateInput = {
    id?: SortOrder
    ip?: SortOrder
    method?: SortOrder
    path?: SortOrder
    status?: SortOrder
    duration?: SortOrder
    user_id?: SortOrder
    user_agent?: SortOrder
    created_at?: SortOrder
  }

  export type access_logsAvgOrderByAggregateInput = {
    id?: SortOrder
    status?: SortOrder
    duration?: SortOrder
    user_id?: SortOrder
    created_at?: SortOrder
  }

  export type access_logsMaxOrderByAggregateInput = {
    id?: SortOrder
    ip?: SortOrder
    method?: SortOrder
    path?: SortOrder
    status?: SortOrder
    duration?: SortOrder
    user_id?: SortOrder
    user_agent?: SortOrder
    created_at?: SortOrder
  }

  export type access_logsMinOrderByAggregateInput = {
    id?: SortOrder
    ip?: SortOrder
    method?: SortOrder
    path?: SortOrder
    status?: SortOrder
    duration?: SortOrder
    user_id?: SortOrder
    user_agent?: SortOrder
    created_at?: SortOrder
  }

  export type access_logsSumOrderByAggregateInput = {
    id?: SortOrder
    status?: SortOrder
    duration?: SortOrder
    user_id?: SortOrder
    created_at?: SortOrder
  }

  export type BigIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntWithAggregatesFilter<$PrismaModel> | bigint | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedBigIntFilter<$PrismaModel>
    _min?: NestedBigIntFilter<$PrismaModel>
    _max?: NestedBigIntFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type automation_rulesCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    is_active?: SortOrder
    graph_data?: SortOrder
    trigger_type?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    last_triggered_at?: SortOrder
    execution_count?: SortOrder
  }

  export type automation_rulesAvgOrderByAggregateInput = {
    is_active?: SortOrder
    execution_count?: SortOrder
  }

  export type automation_rulesMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    is_active?: SortOrder
    graph_data?: SortOrder
    trigger_type?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    last_triggered_at?: SortOrder
    execution_count?: SortOrder
  }

  export type automation_rulesMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    description?: SortOrder
    is_active?: SortOrder
    graph_data?: SortOrder
    trigger_type?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
    last_triggered_at?: SortOrder
    execution_count?: SortOrder
  }

  export type automation_rulesSumOrderByAggregateInput = {
    is_active?: SortOrder
    execution_count?: SortOrder
  }

  export type BigIntNullableFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel> | null
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel> | null
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel> | null
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntNullableFilter<$PrismaModel> | bigint | number | null
  }

  export type banned_ipsCountOrderByAggregateInput = {
    id?: SortOrder
    ip?: SortOrder
    reason?: SortOrder
    banned_by?: SortOrder
    expires_at?: SortOrder
    created_at?: SortOrder
  }

  export type banned_ipsAvgOrderByAggregateInput = {
    id?: SortOrder
    expires_at?: SortOrder
    created_at?: SortOrder
  }

  export type banned_ipsMaxOrderByAggregateInput = {
    id?: SortOrder
    ip?: SortOrder
    reason?: SortOrder
    banned_by?: SortOrder
    expires_at?: SortOrder
    created_at?: SortOrder
  }

  export type banned_ipsMinOrderByAggregateInput = {
    id?: SortOrder
    ip?: SortOrder
    reason?: SortOrder
    banned_by?: SortOrder
    expires_at?: SortOrder
    created_at?: SortOrder
  }

  export type banned_ipsSumOrderByAggregateInput = {
    id?: SortOrder
    expires_at?: SortOrder
    created_at?: SortOrder
  }

  export type BigIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel> | null
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel> | null
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel> | null
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntNullableWithAggregatesFilter<$PrismaModel> | bigint | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedBigIntNullableFilter<$PrismaModel>
    _min?: NestedBigIntNullableFilter<$PrismaModel>
    _max?: NestedBigIntNullableFilter<$PrismaModel>
  }

  export type device_logsCountOrderByAggregateInput = {
    id?: SortOrder
    device_name?: SortOrder
    action?: SortOrder
    operator?: SortOrder
    details?: SortOrder
    created_at?: SortOrder
  }

  export type device_logsAvgOrderByAggregateInput = {
    id?: SortOrder
    created_at?: SortOrder
  }

  export type device_logsMaxOrderByAggregateInput = {
    id?: SortOrder
    device_name?: SortOrder
    action?: SortOrder
    operator?: SortOrder
    details?: SortOrder
    created_at?: SortOrder
  }

  export type device_logsMinOrderByAggregateInput = {
    id?: SortOrder
    device_name?: SortOrder
    action?: SortOrder
    operator?: SortOrder
    details?: SortOrder
    created_at?: SortOrder
  }

  export type device_logsSumOrderByAggregateInput = {
    id?: SortOrder
    created_at?: SortOrder
  }

  export type email_verificationsCountOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    code?: SortOrder
    expires_at?: SortOrder
    used?: SortOrder
    created_at?: SortOrder
  }

  export type email_verificationsAvgOrderByAggregateInput = {
    id?: SortOrder
    expires_at?: SortOrder
    used?: SortOrder
    created_at?: SortOrder
  }

  export type email_verificationsMaxOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    code?: SortOrder
    expires_at?: SortOrder
    used?: SortOrder
    created_at?: SortOrder
  }

  export type email_verificationsMinOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    code?: SortOrder
    expires_at?: SortOrder
    used?: SortOrder
    created_at?: SortOrder
  }

  export type email_verificationsSumOrderByAggregateInput = {
    id?: SortOrder
    expires_at?: SortOrder
    used?: SortOrder
    created_at?: SortOrder
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type friend_requestsRequester_idAddressee_idCompoundUniqueInput = {
    requester_id: number
    addressee_id: number
  }

  export type friend_requestsCountOrderByAggregateInput = {
    id?: SortOrder
    requester_id?: SortOrder
    addressee_id?: SortOrder
    status?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type friend_requestsAvgOrderByAggregateInput = {
    id?: SortOrder
    requester_id?: SortOrder
    addressee_id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type friend_requestsMaxOrderByAggregateInput = {
    id?: SortOrder
    requester_id?: SortOrder
    addressee_id?: SortOrder
    status?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type friend_requestsMinOrderByAggregateInput = {
    id?: SortOrder
    requester_id?: SortOrder
    addressee_id?: SortOrder
    status?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type friend_requestsSumOrderByAggregateInput = {
    id?: SortOrder
    requester_id?: SortOrder
    addressee_id?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type friendsUser_idFriend_idCompoundUniqueInput = {
    user_id: number
    friend_id: number
  }

  export type friendsCountOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    friend_id?: SortOrder
    created_at?: SortOrder
    is_blocked?: SortOrder
  }

  export type friendsAvgOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    friend_id?: SortOrder
    created_at?: SortOrder
    is_blocked?: SortOrder
  }

  export type friendsMaxOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    friend_id?: SortOrder
    created_at?: SortOrder
    is_blocked?: SortOrder
  }

  export type friendsMinOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    friend_id?: SortOrder
    created_at?: SortOrder
    is_blocked?: SortOrder
  }

  export type friendsSumOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    friend_id?: SortOrder
    created_at?: SortOrder
    is_blocked?: SortOrder
  }

  export type group_membersGroup_idUser_idCompoundUniqueInput = {
    group_id: number
    user_id: number
  }

  export type group_membersCountOrderByAggregateInput = {
    id?: SortOrder
    group_id?: SortOrder
    user_id?: SortOrder
    role?: SortOrder
    is_muted?: SortOrder
    joined_at?: SortOrder
    last_read_at?: SortOrder
  }

  export type group_membersAvgOrderByAggregateInput = {
    id?: SortOrder
    group_id?: SortOrder
    user_id?: SortOrder
    is_muted?: SortOrder
    joined_at?: SortOrder
    last_read_at?: SortOrder
  }

  export type group_membersMaxOrderByAggregateInput = {
    id?: SortOrder
    group_id?: SortOrder
    user_id?: SortOrder
    role?: SortOrder
    is_muted?: SortOrder
    joined_at?: SortOrder
    last_read_at?: SortOrder
  }

  export type group_membersMinOrderByAggregateInput = {
    id?: SortOrder
    group_id?: SortOrder
    user_id?: SortOrder
    role?: SortOrder
    is_muted?: SortOrder
    joined_at?: SortOrder
    last_read_at?: SortOrder
  }

  export type group_membersSumOrderByAggregateInput = {
    id?: SortOrder
    group_id?: SortOrder
    user_id?: SortOrder
    is_muted?: SortOrder
    joined_at?: SortOrder
    last_read_at?: SortOrder
  }

  export type groupsCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    owner_id?: SortOrder
    avatar_url?: SortOrder
    created_at?: SortOrder
  }

  export type groupsAvgOrderByAggregateInput = {
    id?: SortOrder
    owner_id?: SortOrder
    created_at?: SortOrder
  }

  export type groupsMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    owner_id?: SortOrder
    avatar_url?: SortOrder
    created_at?: SortOrder
  }

  export type groupsMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    owner_id?: SortOrder
    avatar_url?: SortOrder
    created_at?: SortOrder
  }

  export type groupsSumOrderByAggregateInput = {
    id?: SortOrder
    owner_id?: SortOrder
    created_at?: SortOrder
  }

  export type login_logsCountOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    ip?: SortOrder
    country?: SortOrder
    region?: SortOrder
    city?: SortOrder
    user_agent?: SortOrder
    device_type?: SortOrder
    created_at?: SortOrder
  }

  export type login_logsAvgOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    created_at?: SortOrder
  }

  export type login_logsMaxOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    ip?: SortOrder
    country?: SortOrder
    region?: SortOrder
    city?: SortOrder
    user_agent?: SortOrder
    device_type?: SortOrder
    created_at?: SortOrder
  }

  export type login_logsMinOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    ip?: SortOrder
    country?: SortOrder
    region?: SortOrder
    city?: SortOrder
    user_agent?: SortOrder
    device_type?: SortOrder
    created_at?: SortOrder
  }

  export type login_logsSumOrderByAggregateInput = {
    id?: SortOrder
    user_id?: SortOrder
    created_at?: SortOrder
  }

  export type login_ticketsCountOrderByAggregateInput = {
    ticket?: SortOrder
    jwt?: SortOrder
    created_at?: SortOrder
  }

  export type login_ticketsAvgOrderByAggregateInput = {
    created_at?: SortOrder
  }

  export type login_ticketsMaxOrderByAggregateInput = {
    ticket?: SortOrder
    jwt?: SortOrder
    created_at?: SortOrder
  }

  export type login_ticketsMinOrderByAggregateInput = {
    ticket?: SortOrder
    jwt?: SortOrder
    created_at?: SortOrder
  }

  export type login_ticketsSumOrderByAggregateInput = {
    created_at?: SortOrder
  }

  export type messagesCountOrderByAggregateInput = {
    id?: SortOrder
    sender_id?: SortOrder
    receiver_id?: SortOrder
    group_id?: SortOrder
    content?: SortOrder
    type?: SortOrder
    file_url?: SortOrder
    read_at?: SortOrder
    created_at?: SortOrder
  }

  export type messagesAvgOrderByAggregateInput = {
    id?: SortOrder
    sender_id?: SortOrder
    receiver_id?: SortOrder
    group_id?: SortOrder
    read_at?: SortOrder
    created_at?: SortOrder
  }

  export type messagesMaxOrderByAggregateInput = {
    id?: SortOrder
    sender_id?: SortOrder
    receiver_id?: SortOrder
    group_id?: SortOrder
    content?: SortOrder
    type?: SortOrder
    file_url?: SortOrder
    read_at?: SortOrder
    created_at?: SortOrder
  }

  export type messagesMinOrderByAggregateInput = {
    id?: SortOrder
    sender_id?: SortOrder
    receiver_id?: SortOrder
    group_id?: SortOrder
    content?: SortOrder
    type?: SortOrder
    file_url?: SortOrder
    read_at?: SortOrder
    created_at?: SortOrder
  }

  export type messagesSumOrderByAggregateInput = {
    id?: SortOrder
    sender_id?: SortOrder
    receiver_id?: SortOrder
    group_id?: SortOrder
    read_at?: SortOrder
    created_at?: SortOrder
  }

  export type scheduled_tasksCountOrderByAggregateInput = {
    id?: SortOrder
    title?: SortOrder
    cron_expression?: SortOrder
    execute_at?: SortOrder
    action_type?: SortOrder
    device_id?: SortOrder
    params?: SortOrder
    is_active?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type scheduled_tasksAvgOrderByAggregateInput = {
    id?: SortOrder
    execute_at?: SortOrder
    device_id?: SortOrder
    is_active?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type scheduled_tasksMaxOrderByAggregateInput = {
    id?: SortOrder
    title?: SortOrder
    cron_expression?: SortOrder
    execute_at?: SortOrder
    action_type?: SortOrder
    device_id?: SortOrder
    params?: SortOrder
    is_active?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type scheduled_tasksMinOrderByAggregateInput = {
    id?: SortOrder
    title?: SortOrder
    cron_expression?: SortOrder
    execute_at?: SortOrder
    action_type?: SortOrder
    device_id?: SortOrder
    params?: SortOrder
    is_active?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type scheduled_tasksSumOrderByAggregateInput = {
    id?: SortOrder
    execute_at?: SortOrder
    device_id?: SortOrder
    is_active?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type FloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type sensor_readingsCountOrderByAggregateInput = {
    id?: SortOrder
    device_id?: SortOrder
    temperature?: SortOrder
    humidity?: SortOrder
    light?: SortOrder
    co2?: SortOrder
    soil_moisture?: SortOrder
    earth_n?: SortOrder
    earth_p?: SortOrder
    earth_k?: SortOrder
    rainfall?: SortOrder
    created_at?: SortOrder
  }

  export type sensor_readingsAvgOrderByAggregateInput = {
    id?: SortOrder
    temperature?: SortOrder
    humidity?: SortOrder
    light?: SortOrder
    co2?: SortOrder
    soil_moisture?: SortOrder
    earth_n?: SortOrder
    earth_p?: SortOrder
    earth_k?: SortOrder
    rainfall?: SortOrder
    created_at?: SortOrder
  }

  export type sensor_readingsMaxOrderByAggregateInput = {
    id?: SortOrder
    device_id?: SortOrder
    temperature?: SortOrder
    humidity?: SortOrder
    light?: SortOrder
    co2?: SortOrder
    soil_moisture?: SortOrder
    earth_n?: SortOrder
    earth_p?: SortOrder
    earth_k?: SortOrder
    rainfall?: SortOrder
    created_at?: SortOrder
  }

  export type sensor_readingsMinOrderByAggregateInput = {
    id?: SortOrder
    device_id?: SortOrder
    temperature?: SortOrder
    humidity?: SortOrder
    light?: SortOrder
    co2?: SortOrder
    soil_moisture?: SortOrder
    earth_n?: SortOrder
    earth_p?: SortOrder
    earth_k?: SortOrder
    rainfall?: SortOrder
    created_at?: SortOrder
  }

  export type sensor_readingsSumOrderByAggregateInput = {
    id?: SortOrder
    temperature?: SortOrder
    humidity?: SortOrder
    light?: SortOrder
    co2?: SortOrder
    soil_moisture?: SortOrder
    earth_n?: SortOrder
    earth_p?: SortOrder
    earth_k?: SortOrder
    rainfall?: SortOrder
    created_at?: SortOrder
  }

  export type FloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type system_settingsCountOrderByAggregateInput = {
    key?: SortOrder
    value?: SortOrder
    updated_at?: SortOrder
  }

  export type system_settingsAvgOrderByAggregateInput = {
    updated_at?: SortOrder
  }

  export type system_settingsMaxOrderByAggregateInput = {
    key?: SortOrder
    value?: SortOrder
    updated_at?: SortOrder
  }

  export type system_settingsMinOrderByAggregateInput = {
    key?: SortOrder
    value?: SortOrder
    updated_at?: SortOrder
  }

  export type system_settingsSumOrderByAggregateInput = {
    updated_at?: SortOrder
  }

  export type usersCountOrderByAggregateInput = {
    id?: SortOrder
    uid?: SortOrder
    email?: SortOrder
    password_hash?: SortOrder
    username?: SortOrder
    avatar_url?: SortOrder
    role?: SortOrder
    permissions?: SortOrder
    wechat_openid?: SortOrder
    wechat_unionid?: SortOrder
    wework_userid?: SortOrder
    qq_openid?: SortOrder
    alipay_user_id?: SortOrder
    notification_settings?: SortOrder
    daily_ai_limit?: SortOrder
    daily_ai_usage?: SortOrder
    last_ai_usage_date?: SortOrder
    ai_balance?: SortOrder
    email_verified?: SortOrder
    email_verified_at?: SortOrder
    public_key?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type usersAvgOrderByAggregateInput = {
    id?: SortOrder
    daily_ai_limit?: SortOrder
    daily_ai_usage?: SortOrder
    ai_balance?: SortOrder
    email_verified?: SortOrder
    email_verified_at?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type usersMaxOrderByAggregateInput = {
    id?: SortOrder
    uid?: SortOrder
    email?: SortOrder
    password_hash?: SortOrder
    username?: SortOrder
    avatar_url?: SortOrder
    role?: SortOrder
    permissions?: SortOrder
    wechat_openid?: SortOrder
    wechat_unionid?: SortOrder
    wework_userid?: SortOrder
    qq_openid?: SortOrder
    alipay_user_id?: SortOrder
    notification_settings?: SortOrder
    daily_ai_limit?: SortOrder
    daily_ai_usage?: SortOrder
    last_ai_usage_date?: SortOrder
    ai_balance?: SortOrder
    email_verified?: SortOrder
    email_verified_at?: SortOrder
    public_key?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type usersMinOrderByAggregateInput = {
    id?: SortOrder
    uid?: SortOrder
    email?: SortOrder
    password_hash?: SortOrder
    username?: SortOrder
    avatar_url?: SortOrder
    role?: SortOrder
    permissions?: SortOrder
    wechat_openid?: SortOrder
    wechat_unionid?: SortOrder
    wework_userid?: SortOrder
    qq_openid?: SortOrder
    alipay_user_id?: SortOrder
    notification_settings?: SortOrder
    daily_ai_limit?: SortOrder
    daily_ai_usage?: SortOrder
    last_ai_usage_date?: SortOrder
    ai_balance?: SortOrder
    email_verified?: SortOrder
    email_verified_at?: SortOrder
    public_key?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type usersSumOrderByAggregateInput = {
    id?: SortOrder
    daily_ai_limit?: SortOrder
    daily_ai_usage?: SortOrder
    ai_balance?: SortOrder
    email_verified?: SortOrder
    email_verified_at?: SortOrder
    created_at?: SortOrder
    updated_at?: SortOrder
  }

  export type AgriKnowledgeCreatetagsInput = {
    set: string[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type AgriKnowledgeUpdatetagsInput = {
    set?: string[]
    push?: string | string[]
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type BigIntFieldUpdateOperationsInput = {
    set?: bigint | number
    increment?: bigint | number
    decrement?: bigint | number
    multiply?: bigint | number
    divide?: bigint | number
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableBigIntFieldUpdateOperationsInput = {
    set?: bigint | number | null
    increment?: bigint | number
    decrement?: bigint | number
    multiply?: bigint | number
    divide?: bigint | number
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableFloatFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }
  export type NestedJsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedBigIntFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntFilter<$PrismaModel> | bigint | number
  }

  export type NestedBigIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel>
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntWithAggregatesFilter<$PrismaModel> | bigint | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedBigIntFilter<$PrismaModel>
    _min?: NestedBigIntFilter<$PrismaModel>
    _max?: NestedBigIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedBigIntNullableFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel> | null
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel> | null
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel> | null
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntNullableFilter<$PrismaModel> | bigint | number | null
  }

  export type NestedBigIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: bigint | number | BigIntFieldRefInput<$PrismaModel> | null
    in?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel> | null
    notIn?: bigint[] | number[] | ListBigIntFieldRefInput<$PrismaModel> | null
    lt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    lte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gt?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    gte?: bigint | number | BigIntFieldRefInput<$PrismaModel>
    not?: NestedBigIntNullableWithAggregatesFilter<$PrismaModel> | bigint | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedBigIntNullableFilter<$PrismaModel>
    _min?: NestedBigIntNullableFilter<$PrismaModel>
    _max?: NestedBigIntNullableFilter<$PrismaModel>
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}