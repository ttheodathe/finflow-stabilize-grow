// Pure payroll calculation engine. Deliberately has zero hardcoded tax
// rates — everything comes from payroll_tax_brackets /
// payroll_statutory_contributions, so a rate change (e.g. RSSB's own
// published 2027-2030 pension schedule) is a data edit, not a code change.
//
// Sourcing for the Rwanda defaults seeded alongside this (see the
// "create_payroll_tax_rules" migration for full citations):
//   - PAYE brackets: RRA's own PDF (rra.gov.rw), rates effective Nov 2023
//   - RSSB Pension 12% total (6%+6%): RSSB's own site + two independent
//     Rwandan outlets (IGIHE, KT Press) quoting RSSB's CEO directly,
//     effective Jan 2025
//   - RSSB Maternity 0.6% total, RSSB Medical 15% total: RRA's tax handbook
//
// Two assumptions this makes, both stated in the migration's source_note
// and both correctable by editing config rows, not code:
//   1. PAYE is computed on full gross (statutory contributions do NOT
//      reduce the taxable base) unless a contribution row has
//      affects_paye_base = true.
//   2. RSSB Medical is seeded but inactive by default — flip is_active
//      once confirmed applicable.

export type TaxBracket = {
  min_income: number;
  max_income: number | null;
  rate: number;
};

export type StatutoryContribution = {
  name: string;
  employee_rate: number;
  employer_rate: number;
  is_active: boolean;
  affects_paye_base: boolean;
};

/**
 * Progressive/marginal bracket tax — only the slice of income inside each
 * band is taxed at that band's rate, standard PAYE behavior. Brackets must
 * be sorted by min_income ascending; this sorts defensively either way.
 */
export function calculateProgressiveTax(income: number, brackets: TaxBracket[]): number {
  if (income <= 0 || brackets.length === 0) return 0;
  const sorted = [...brackets].sort((a, b) => a.min_income - b.min_income);
  let tax = 0;
  for (const b of sorted) {
    if (income <= b.min_income) continue;
    const upper = b.max_income === null ? income : Math.min(income, b.max_income);
    const sliceAmount = Math.max(0, upper - b.min_income);
    tax += sliceAmount * b.rate;
  }
  return Math.round(tax * 100) / 100;
}

export type ContributionLine = {
  name: string;
  employeeAmount: number;
  employerAmount: number;
};

export type PayrollResult = {
  grossSalary: number;
  taxableIncome: number;
  paye: number;
  contributions: ContributionLine[];
  totalEmployeeDeductions: number; // PAYE + all active employee-side contributions
  totalEmployerContributions: number; // employer-side contributions only
  netPay: number; // gross - totalEmployeeDeductions
  totalEmployerCost: number; // gross + totalEmployerContributions
};

/**
 * Computes a full payslip breakdown for one employee's gross salary against
 * a company's configured tax brackets and statutory contributions.
 *
 * `brackets` must already be filtered to the right employee_category
 * (permanent/casual/secondary_employer) and effective date by the caller —
 * this function is intentionally just arithmetic over whatever set it's given.
 */
export function calculatePayroll(
  grossSalary: number,
  brackets: TaxBracket[],
  statutory: StatutoryContribution[],
): PayrollResult {
  const active = statutory.filter((s) => s.is_active);

  // affects_paye_base contributions reduce the PAYE taxable base; per the
  // seeded Rwanda defaults, none do (PAYE is on full gross), but this stays
  // generic so a future correction is a data edit.
  const baseReduction = active
    .filter((s) => s.affects_paye_base)
    .reduce((sum, s) => sum + grossSalary * s.employee_rate, 0);
  const taxableIncome = Math.max(0, grossSalary - baseReduction);

  const paye = calculateProgressiveTax(taxableIncome, brackets);

  const contributions: ContributionLine[] = active.map((s) => ({
    name: s.name,
    employeeAmount: Math.round(grossSalary * s.employee_rate * 100) / 100,
    employerAmount: Math.round(grossSalary * s.employer_rate * 100) / 100,
  }));

  const totalEmployeeContributions = contributions.reduce((s, c) => s + c.employeeAmount, 0);
  const totalEmployerContributions = contributions.reduce((s, c) => s + c.employerAmount, 0);
  const totalEmployeeDeductions = Math.round((paye + totalEmployeeContributions) * 100) / 100;

  return {
    grossSalary,
    taxableIncome,
    paye,
    contributions,
    totalEmployeeDeductions,
    totalEmployerContributions,
    netPay: Math.round((grossSalary - totalEmployeeDeductions) * 100) / 100,
    totalEmployerCost: Math.round((grossSalary + totalEmployerContributions) * 100) / 100,
  };
}
