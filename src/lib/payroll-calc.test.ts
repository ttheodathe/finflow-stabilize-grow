import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculatePayroll,
  calculateProgressiveTax,
  type StatutoryContribution,
  type TaxBracket,
} from "./payroll-calc.ts";

const brackets: TaxBracket[] = [
  { min_income: 1000, max_income: null, rate: 0.2 },
  { min_income: 0, max_income: 1000, rate: 0.1 },
];

const contribution = (
  overrides: Partial<StatutoryContribution> = {},
): StatutoryContribution => ({
  name: "Pension",
  employee_rate: 0.06,
  employer_rate: 0.06,
  is_active: true,
  affects_paye_base: false,
  ...overrides,
});

test("progressive tax applies each marginal rate only to its own income band", () => {
  assert.equal(calculateProgressiveTax(500, brackets), 50);
  assert.equal(calculateProgressiveTax(1000, brackets), 100);
  assert.equal(calculateProgressiveTax(1500, brackets), 200);
});

test("progressive tax sorts brackets defensively and handles non-positive income", () => {
  assert.equal(calculateProgressiveTax(1500, [...brackets].reverse()), 200);
  assert.equal(calculateProgressiveTax(0, brackets), 0);
  assert.equal(calculateProgressiveTax(-100, brackets), 0);
  assert.equal(calculateProgressiveTax(1500, []), 0);
});

test("payroll includes active employee and employer contributions but ignores inactive rules", () => {
  const result = calculatePayroll(1500, brackets, [
    contribution(),
    contribution({
      name: "Inactive levy",
      employee_rate: 0.01,
      employer_rate: 0.02,
      is_active: false,
    }),
  ]);

  assert.equal(result.grossSalary, 1500);
  assert.equal(result.taxableIncome, 1500);
  assert.equal(result.paye, 200);
  assert.deepEqual(result.contributions, [
    { name: "Pension", employeeAmount: 90, employerAmount: 90 },
  ]);
  assert.equal(result.totalEmployeeDeductions, 290);
  assert.equal(result.netPay, 1210);
  assert.equal(result.totalEmployerContributions, 90);
  assert.equal(result.totalEmployerCost, 1590);
});

test("only contributions configured to affect the PAYE base reduce taxable income", () => {
  const result = calculatePayroll(
    1000,
    [{ min_income: 0, max_income: null, rate: 0.1 }],
    [contribution({ employee_rate: 0.1, employer_rate: 0.05, affects_paye_base: true })],
  );

  assert.equal(result.taxableIncome, 900);
  assert.equal(result.paye, 90);
  assert.equal(result.totalEmployeeDeductions, 190);
  assert.equal(result.netPay, 810);
  assert.equal(result.totalEmployerCost, 1050);
});

test("contribution amounts and final payroll totals are rounded to cents", () => {
  const result = calculatePayroll(
    123.45,
    [],
    [contribution({ employee_rate: 0.03, employer_rate: 0.02 })],
  );

  assert.equal(result.contributions[0].employeeAmount, 3.7);
  assert.equal(result.contributions[0].employerAmount, 2.47);
  assert.equal(result.totalEmployeeDeductions, 3.7);
  assert.equal(result.netPay, 119.75);
  assert.equal(result.totalEmployerCost, 125.92);
});

test("payroll with no active statutory contributions has no contribution deductions", () => {
  const result = calculatePayroll(
    1000,
    [{ min_income: 0, max_income: null, rate: 0.1 }],
    [contribution({ is_active: false })],
  );

  assert.equal(result.paye, 100);
  assert.deepEqual(result.contributions, []);
  assert.equal(result.totalEmployeeDeductions, 100);
  assert.equal(result.netPay, 900);
  assert.equal(result.totalEmployerContributions, 0);
  assert.equal(result.totalEmployerCost, 1000);
});
