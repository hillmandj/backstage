/*
 * Copyright 2022 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { CatalogApi } from '@backstage/catalog-client';
import {
  Entity,
  CompoundEntityRef,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { Config } from '@backstage/config';

/** @public **/
export interface SentryInfoProvider {
  getInstance(options: {
    /*
     * The entity to get the info about
     */
    entityRef: CompoundEntityRef;
    backstageToken?: string;
  }): Promise<SentryInfo>;
}

/** @publc **/
export interface SentryInfo {
  baseUrl: string;
  headers?: Record<string, string | string[]>;
}

/** @public **/
export interface SentryInstanceConfig {
  name: string;
  baseUrl: string;
  authToken: string;
}

/**
 * Holds multiple Sentry configurations.
 *
 * @public
 */
export class SentryConfig {
  constructor(public readonly instances: SentryInstanceConfig[]) {}

  /**
   * Read all Sentry instance configurations.
   * @param config - Root configuration
   * @returns A SentryConfig that contains all configured Sentry instances.
   */

  static fromConfig(config: Config): SentryConfig {
    const DEFAULT_SENTRY_NAME = 'default';

    const sentryConfig = config.getConfig('sentry');

    const namedInstanceConfig =
      sentryConfig.getOptionalConfigArray('instances')?.map(c => ({
        name: c.getString('name'),
        baseUrl: c.getString('baseUrl'),
        authToken: c.getString('authToken'),
      })) || [];

    const hasNamedDefault = namedInstanceConfig.some(
      instance => instance.name === DEFAULT_SENTRY_NAME,
    );

    // Get these as optional strings and check to give a better error message
    const baseUrl = sentryConfig.getOptionalString('baseUrl');
    const authToken = sentryConfig.getOptionalString('authToken');

    if (hasNamedDefault && (baseUrl || authToken)) {
      throw new Error(
        `Found both a named sentry instance with name ${DEFAULT_SENTRY_NAME} and top level baseUrl or authToken config. Use only one style of config.`,
      );
    }

    const unnamedNonePresent = !baseUrl && !authToken;
    const unnamedAllPresent = baseUrl && authToken;
    if (!(unnamedAllPresent || unnamedNonePresent)) {
      throw new Error(
        `Found partial default sentry config. All (or none) of baseUrl and authToken must be provided.`,
      );
    }

    if (unnamedAllPresent) {
      const unnamedInstanceConfig = [
        { name: DEFAULT_SENTRY_NAME, baseUrl, authToken },
      ] as {
        name: string;
        baseUrl: string;
        authToken: string;
      }[];

      return new SentryConfig([
        ...namedInstanceConfig,
        ...unnamedInstanceConfig,
      ]);
    }

    return new SentryConfig(namedInstanceConfig);
  }

  /**
   * Gets a Sentry instance configuration by name, or the default one if no
   * name is provided.
   * @param instanceName - Optional name of the Sentry instance.
   * @returns The requested Sentry instance.
   */
  getInstanceConfig(instanceName?: string): SentryInstanceConfig {
    const DEFAULT_SENTRY_NAME = 'default';

    if (!instanceName || instanceName === DEFAULT_SENTRY_NAME) {
      // no new name provided, use default configuration
      const instanceConfig = this.instances.find(
        c => c.name === DEFAULT_SENTRY_NAME,
      );

      if (!instanceConfig) {
        throw new Error(
          `Couldn't find a default sentry instance in the config. Either configure an instance with name ${DEFAULT_SENTRY_NAME} or add a prefix to your annotation value.`,
        );
      }

      return instanceConfig;
    }

    // A name is provided
    const instanceConfig = this.instances.find(c => c.name === instanceName);
    if (!instanceConfig) {
      throw new Error(
        `Couldn't find a sentry instance in the config with name ${instanceName}`,
      );
    }

    return instanceConfig;
  }
}

/**
 * Use default config and annotations, build using fromConfig static function.
 *
 * @public
 */
export class DefaultSentryInfoProvider implements SentryInfoProvider {
  static readonly SENTRY_ANNOTATION = 'sentry.io/project-slug';

  private constructor(
    private readonly config: SentryConfig,
    private readonly catalog: CatalogApi,
  ) {}

  static fromConfig(options: {
    config: Config;
    catalog: CatalogApi;
  }): DefaultSentryInfoProvider {
    return new DefaultSentryInfoProvider(
      SentryConfig.fromConfig(options.config),
      options.catalog,
    );
  }

  async getInstance(opt: {
    entityRef: CompoundEntityRef;
    backstageToken?: string;
  }): Promise<SentryInfo> {
    // load entity
    const entity = await this.catalog.getEntityByRef(opt.entityRef, {
      token: opt.backstageToken,
    });

    const entityName = stringifyEntityRef(opt.entityRef);

    if (!entity) {
      throw new Error(`Couldn't find entity with name: ${entityName}`);
    }

    // lookup `[sentryInstanceName#]projectSlug` from entity annotation
    const sentryInstanceAndProject =
      entity.metadata.annotations?.[
        DefaultSentryInfoProvider.SENTRY_ANNOTATION
      ];

    if (!sentryInstanceAndProject) {
      throw new Error(
        `Couldn't find sentry annotation (${DefaultSentryInfoProvider.SENTRY_ANNOTATION}) on entity with name ${entityName}`,
      );
    }

    let projectSlug;
    let sentryInstanceName: string | undefined;
    const splitIndex = sentryInstanceAndProject.indexOf(':');

    if (splitIndex === -1) {
      // no sentryInstanceName specified, use default
      sentryInstanceName = sentryInstanceAndProject;
    } else {
      // sentryInstanceName specified
      sentryInstanceName = sentryInstanceAndProject.substring(0, splitIndex);
      projectSlug = sentryInstanceAndProject.substring(
        splitIndex + 1,
        sentryInstanceAndProject.length,
      );
    }

    // lookup baseUrl + creds from config
    const instanceConfig = this.config.getInstanceConfig(sentryInstanceName);

    return {
      baseUrl: instanceConfig.baseUrl,
      headers: {
        Authorization: `Bearer ${instanceConfig.authToken}`,
      },
    };
  }
}
