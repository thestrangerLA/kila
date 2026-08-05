// Product Cost & Profit Margin Calculator Module

export function calculateProductCost({ sellingPrice = 0, materialCost = 0, laborCost = 0, overheadCost = 0 }) {
  const price = parseFloat(sellingPrice) || 0;
  const mat = parseFloat(materialCost) || 0;
  const labor = parseFloat(laborCost) || 0;
  const overhead = parseFloat(overheadCost) || 0;

  const totalUnitCost = mat + labor + overhead;
  const grossProfitPerUnit = price - totalUnitCost;
  const grossMarginPercent = price > 0 ? (grossProfitPerUnit / price) * 100 : 0;
  const markupPercent = totalUnitCost > 0 ? (grossProfitPerUnit / totalUnitCost) * 100 : 0;

  // Calculate recommended selling price for target margins (20%, 30%, 50%)
  const recommendedPrices = {
    margin20: totalUnitCost / 0.8,
    margin30: totalUnitCost / 0.7,
    margin50: totalUnitCost / 0.5
  };

  return {
    totalUnitCost,
    grossProfitPerUnit,
    grossMarginPercent,
    markupPercent,
    recommendedPrices
  };
}

export function calculateBreakEven({ fixedCosts = 0, sellingPrice = 0, variableCostPerUnit = 0 }) {
  const fixed = parseFloat(fixedCosts) || 0;
  const price = parseFloat(sellingPrice) || 0;
  const variable = parseFloat(variableCostPerUnit) || 0;

  const contributionMargin = price - variable;
  const breakEvenUnits = contributionMargin > 0 ? Math.ceil(fixed / contributionMargin) : 0;
  const breakEvenRevenue = breakEvenUnits * price;

  return {
    contributionMargin,
    breakEvenUnits,
    breakEvenRevenue
  };
}
