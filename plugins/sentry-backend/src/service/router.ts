/*
 * Copyright 2020 The Backstage Authors
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

import { SentryInfoProvider } from './SentryInfoProvider';
import { SentryApi } from './SentryApi';
import { errorHandler } from '@backstage/backend-common';
import { getBearerTokenFromAuthorizationHeader } from '@backstage/plugin-auth-node';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';

export interface RouterOptions {
  logger: Logger;
  sentryInfoProvider: SentryInfoProvider;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { sentryInfoProvider, logger } = options;

  const router = Router();
  router.use(express.json());

  router.get(
    '/v1/entity/:namespace/:kind/:name/issues',
    async (request, response) => {
      const { namespace, kind, name } = request.params;
      const token = getBearerTokenFromAuthorizationHeader(
        request.header('authorization'),
      );

      const sentryInfo = await sentryInfoProvider.getInstance({
        entityRef: {
          kind,
          namespace,
          name,
        },
        backstageToken: token,
      });

      // need this to be a json array of type SentryIssue
      const issues = await sentryApi.fetchIssues(sentryInfo);

      // response.json({ issues: issues });
    },
  );

  router.use(errorHandler());
  return router;
}
