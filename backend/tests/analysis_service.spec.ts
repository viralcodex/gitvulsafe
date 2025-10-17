import axios from 'axios';

import { Ecosystem } from '../constants/model';
import GithubService from '../service/analysis_service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedVulnIDsResponse = {
  data: {
    results: [
      { vulns: [{ id: 'OSV-EXP-001' }] }, // main dep
      { vulns: [{ id: 'OSV-QS-002' }] }, // transitive dep
      { vulns: [] }, // another transitive dep
    ],
  },
};

const mockedVulnDetailsResponse = [
  {
    data: {
      id: 'OSV-EXP-001',
      summary: 'Main vuln',
      severity: [
        { type: 'cvss_v3', score: 'AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H' },
      ],
    },
  },
  {
    data: {
      id: 'OSV-QS-002',
      summary: 'Transitive vuln',
      severity: [
        { type: 'cvss_v3', score: 'AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:L' },
      ],
    },
  },
];

const mockedDependencies = {
  'package.json': [
    {
      name: 'express',
      version: '4.18.2',
      ecosystem: Ecosystem.NPM,
      vulnerabilities: [],
      transitiveDependencies: {
        nodes: [
          {
            name: 'qs',
            version: '6.10.3',
            ecosystem: Ecosystem.NPM,
            vulnerabilities: [],
          },
          {
            name: 'debug',
            version: '2.6.9',
            ecosystem: Ecosystem.NPM,
            vulnerabilities: [],
          },
        ],
        edges: [{ source: 0, target: 1, requirement: '^2.6.9' }],
      },
    },
  ],
};

const expectedAnalyzedDependencies = {
  'package.json': [
    {
      name: 'express',
      version: '4.18.2',
      ecosystem: 'npm',
      vulnerabilities: [
        {
          id: 'OSV-EXP-001',
          summary: 'Main vuln',
          details: undefined,
          severityScore: { cvss_v3: '9.8', cvss_v4: '0' },
          references: [],
          affected: [],
          aliases: [],
          fixAvailable: '',
        },
      ],
      transitiveDependencies: {
        nodes: [
          {
            name: 'qs',
            version: '6.10.3',
            ecosystem: 'npm',
            vulnerabilities: [
              {
                id: 'OSV-QS-002',
                summary: 'Transitive vuln',
                details: undefined,
                severityScore: { cvss_v3: '7.3', cvss_v4: '0' },
                references: [],
                affected: [],
                aliases: [],
                fixAvailable: '',
              },
            ],
          },
        ],
        edges: [],
      },
    },
  ],
};
describe('GithubService transitive vulnerability enrichment', () => {
  it('attaches vulnerabilities to main and transitive dependencies', async () => {
    // Mock OSV batch response
    mockedAxios.post.mockResolvedValueOnce(mockedVulnIDsResponse);

    // Mock OSV vuln details
    mockedAxios.get.mockImplementation((url) => {
      if (url.includes('OSV-EXP-001')) {
        return Promise.resolve(mockedVulnDetailsResponse[0]);
      }
      if (url.includes('OSV-QS-002')) {
        return Promise.resolve(mockedVulnDetailsResponse[1]);
      }
      return Promise.resolve({ data: {} });
    });

    const service = new GithubService();
    const result =
      await service.enrichDependenciesWithVulnerabilities(mockedDependencies);

    // Main dep should have vuln
    expect(result['package.json'][0].vulnerabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'OSV-EXP-001', summary: 'Main vuln' }),
      ]),
    );

    // Transitive dep 'qs' should have vuln
    expect(
      result['package.json'][0].transitiveDependencies?.nodes?.[0]
        ?.vulnerabilities,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'OSV-QS-002',
          summary: 'Transitive vuln',
        }),
      ]),
    );

    //expect dep 'debug' to have no vulnerabilities
    expect(
      result['package.json'][0].transitiveDependencies?.nodes?.[1]
        ?.vulnerabilities,
    ).toBeUndefined();

    expect(result).toEqual(expectedAnalyzedDependencies);
  });
});
