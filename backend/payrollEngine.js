const { createId } = require("./models");

class PayrollEngine {
  generate({ worker, project, entries, countryPolicy, scopeLabel }) {
    const totals = entries.reduce((sum, entry) => ({
      regularHours: sum.regularHours + entry.buckets.planned + entry.buckets.extra,
      otHours: sum.otHours + entry.buckets.ot,
      ptoHours: sum.ptoHours + entry.buckets.pto,
      holidayHours: sum.holidayHours + entry.buckets.holiday,
      regularPay: sum.regularPay + ((entry.buckets.planned + entry.buckets.extra) * entry.hourlyRate),
      otPay: sum.otPay + (entry.buckets.ot * entry.hourlyRate * entry.otMultiplier),
      ptoPay: sum.ptoPay + ((entry.buckets.pto + entry.buckets.holiday) * entry.hourlyRate),
    }), {
      regularHours: 0,
      otHours: 0,
      ptoHours: 0,
      holidayHours: 0,
      regularPay: 0,
      otPay: 0,
      ptoPay: 0,
    });

    const gross = totals.regularPay + totals.otPay + totals.ptoPay;
    const deductions = buildDeductions(worker, gross, countryPolicy);
    const totalDeductions = deductions.reduce((sum, item) => sum + item.amount, 0);

    return {
      id: createId("PAY"),
      workerId: worker.id,
      workerName: worker.name,
      projectId: project.id,
      projectName: project.name,
      country: project.country,
      currency: project.currency,
      payPeriod: project.payPeriod,
      scopeLabel,
      generatedAt: new Date().toISOString(),
      hours: {
        regular: totals.regularHours,
        ot: totals.otHours,
        pto: totals.ptoHours,
        holiday: totals.holidayHours,
      },
      earnings: {
        regularPay: totals.regularPay,
        otPay: totals.otPay,
        ptoPay: totals.ptoPay,
      },
      gross,
      deductions,
      totalDeductions,
      net: gross - totalDeductions,
    };
  }
}

function buildDeductions(worker, gross, countryPolicy) {
  if (countryPolicy.compliance.type === "us") {
    const federalTaxRate = Number(worker.federalTaxRate ?? countryPolicy.compliance.federalTaxRate);
    const stateTaxRate = Number(worker.stateTaxRate ?? countryPolicy.compliance.stateTaxRate);
    const socialSecurityRate = Number(countryPolicy.compliance.socialSecurityRate);
    const medicareRate = Number(countryPolicy.compliance.medicareRate);

    return [
      { label: "Federal Tax", amount: gross * federalTaxRate },
      { label: "State Tax", amount: gross * stateTaxRate },
      { label: "Social Security", amount: gross * socialSecurityRate },
      { label: "Medicare", amount: gross * medicareRate },
    ];
  }

  const basicPercent = Number(worker.basicPercent ?? countryPolicy.compliance.basicPercent);
  const tdsRate = Number(worker.tdsRate ?? countryPolicy.compliance.tdsRate);
  const basicPay = gross * basicPercent;
  const deductions = [
    { label: "PF", amount: basicPay * Number(countryPolicy.compliance.pfRate) },
  ];

  if (gross <= Number(countryPolicy.compliance.esiThreshold)) {
    deductions.push({
      label: "ESI",
      amount: gross * Number(countryPolicy.compliance.esiRate),
    });
  }

  deductions.push({
    label: "Professional Tax",
    amount: Number(countryPolicy.compliance.professionalTax),
  });
  deductions.push({
    label: "TDS",
    amount: gross * tdsRate,
  });

  return deductions;
}

module.exports = PayrollEngine;
