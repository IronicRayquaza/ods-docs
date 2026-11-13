function shouldInclude(rel) {
  if (!rel.endsWith('.md')) return false;
  
  const SKIP = ['CONTRIBUTOR-LEDGER', 'MAINTENANCE-AUDIT', 'MAINTAINER_RUNBOOK', 'HIGH_RISK_CHANGE_MAP', 'BRANCH_HYGIENE', 'AI_WORKFLOW_GUARDRAILS', 'DOCUMENTATION-HYGIENE', 'OSS-LAUNCH-CHECKLIST', 'PUBLIC_BETA_PROMOTION', 'SECURITY_REMEDIATION', 'RELEASE_NOTES', 'VALIDATION', 'CHANGELOG', 'SWITCHBOARD', 'ADR-', '_PLAN', 'HARNESS-MIGRATION', 'WINDOWS-INSTALL-WALKTHROUGH'];
  
  for (const skip of SKIP) {
    if (rel.includes(skip)) return false;
  }
  
  if (rel.startsWith('ods/docs/')) return true;
  if (rel === 'ods/README.md' || rel === 'ods/QUICKSTART.md' || rel === 'ods/FAQ.md') return true;
  if (rel.match(/^ods\/extensions\/services\/[^\/]+\/README\.md$/)) return true;
  
  return false;
}

function isErrorSource(rel) {
  if (rel.includes('/tests/') || rel.includes('.test.')) return false;
  if (rel === 'install.sh' || rel === 'install.ps1' || rel === 'ods/install-core.sh' || rel === 'ods/ods-cli') return true;
  if ((rel.startsWith('ods/installers/') || rel.startsWith('ods/scripts/') || rel.startsWith('ods/lib/')) && (rel.endsWith('.sh') || rel.endsWith('.ps1'))) return true;
  
  return false;
}

if (typeof module !== 'undefined') module.exports = { shouldInclude, isErrorSource };