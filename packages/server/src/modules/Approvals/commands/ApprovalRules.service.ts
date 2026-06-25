import { Inject, Injectable } from '@nestjs/common';
import { TenantModelProxy } from '@/modules/System/models/TenantBaseModel';
import { ApprovalRule } from '../models/ApprovalRule.model';

@Injectable()
export class ApprovalRulesService {
  constructor(
    @Inject(ApprovalRule.name)
    private readonly approvalRuleModel: TenantModelProxy<typeof ApprovalRule>,
  ) {}

  /**
   * Resolves how many approval levels a document needs given its type and
   * amount. The matching active rule with the lowest `priority` wins; a rule
   * scoped to the exact document type beats an any-type (null) rule. Falls back
   * to a single level when no rule matches.
   * @param {string} documentType
   * @param {number} amount
   * @returns {Promise<number>}
   */
  public async resolveRequiredLevels(
    documentType: string,
    amount: number,
  ): Promise<number> {
    const value = Number(amount) || 0;

    const rules = await this.approvalRuleModel()
      .query()
      .where('active', true)
      .where((builder) => {
        builder
          .where('documentType', documentType)
          .orWhereNull('documentType');
      })
      .where('minAmount', '<=', value)
      .where((builder) => {
        builder.whereNull('maxAmount').orWhere('maxAmount', '>=', value);
      });

    if (rules.length === 0) {
      return 1;
    }
    // Prefer the most specific (typed) rule, then the lowest priority number.
    const sorted = rules.sort((a, b) => {
      const aTyped = a.documentType ? 0 : 1;
      const bTyped = b.documentType ? 0 : 1;
      if (aTyped !== bTyped) {
        return aTyped - bTyped;
      }
      return a.priority - b.priority;
    });
    return Math.max(1, sorted[0].requiredLevels);
  }

  /**
   * Lists the configured approval rules ordered by priority.
   */
  public async getRules(): Promise<ApprovalRule[]> {
    return this.approvalRuleModel().query().orderBy('priority', 'asc');
  }

  /**
   * Creates a new approval rule.
   */
  public async createRule(data: Partial<ApprovalRule>): Promise<ApprovalRule> {
    return this.approvalRuleModel()
      .query()
      .insertAndFetch({
        documentType: data.documentType ?? null,
        minAmount: data.minAmount ?? 0,
        maxAmount: data.maxAmount ?? null,
        requiredLevels: data.requiredLevels ?? 1,
        active: data.active ?? true,
        priority: data.priority ?? 100,
        description: data.description ?? null,
      } as any);
  }

  /**
   * Updates the given approval rule.
   */
  public async updateRule(
    id: number,
    data: Partial<ApprovalRule>,
  ): Promise<ApprovalRule> {
    return this.approvalRuleModel()
      .query()
      .patchAndFetchById(id, data as any);
  }
}
