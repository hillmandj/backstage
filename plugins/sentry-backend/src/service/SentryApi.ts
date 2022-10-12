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
import { SentryIssue } from '@backstage/plugin-sentry';
import type { SentryInfo } from './SentryInfoProvider';

export class SentryApi {
  async fetchIssues(
    sentryInfo: SentryInfo,
    options: {
      statsPeriod: string;
    },
  ): Promise<SentryIssue[]> {
    const { baseUrl, headers, organization, project } = sentryInfo;
    const { statsPeriod } = options;

    if (!project) {
      return [];
    }

    const response = await fetch(
      `${baseUrl}/0/projects/${organization}/${project}/issues/?statsPeriod=${options.statsPeriod}`,
      headers,
    );

    if (response.status >= 400 && response.status < 600) {
      throw new Error('Failed fetching Sentry issues');
    }

    return (await response.json()) as SentryIssue[];
  }
}
