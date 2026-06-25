import { ApprovalRulesService } from './ApprovalRules.service';

/**
 * Tests the rule-selection logic of resolveRequiredLevels. The DB where-clauses
 * are stubbed (the mock returns the candidate rules already "matched"), so the
 * assertions focus on the JS preference: a type-specific rule beats an any-type
 * rule, then the lowest priority wins; the result is floored at 1 level.
 */
describe('ApprovalRulesService.resolveRequiredLevels', () => {
  const makeService = (rules: any[]) => {
    const query: any = {};
    query.where = jest.fn(() => query);
    query.orderBy = jest.fn(() => query);
    query.then = (resolve: any) => resolve(rules);
    const model: any = () => ({ query: () => query });
    return new ApprovalRulesService(model);
  };

  it('defaults to a single level when no rule matches', async () => {
    const service = makeService([]);
    await expect(service.resolveRequiredLevels('Bill', 5000)).resolves.toBe(1);
  });

  it('returns the matching rule required levels', async () => {
    const service = makeService([
      { documentType: null, priority: 20, requiredLevels: 2 },
    ]);
    await expect(
      service.resolveRequiredLevels('Bill', 250000),
    ).resolves.toBe(2);
  });

  it('prefers a document-type rule over an any-type rule', async () => {
    const service = makeService([
      { documentType: null, priority: 5, requiredLevels: 1 },
      { documentType: 'Bill', priority: 50, requiredLevels: 2 },
    ]);
    await expect(service.resolveRequiredLevels('Bill', 250000)).resolves.toBe(
      2,
    );
  });

  it('breaks ties on priority (lowest wins)', async () => {
    const service = makeService([
      { documentType: null, priority: 30, requiredLevels: 3 },
      { documentType: null, priority: 10, requiredLevels: 1 },
    ]);
    await expect(service.resolveRequiredLevels('Bill', 5000)).resolves.toBe(1);
  });

  it('never returns fewer than one level', async () => {
    const service = makeService([
      { documentType: null, priority: 10, requiredLevels: 0 },
    ]);
    await expect(service.resolveRequiredLevels('Bill', 5000)).resolves.toBe(1);
  });
});
