# Data Breach Notification Plan (Internal)

In accordance with GDPR Article 33, this document outlines our internal procedure if a data breach occurs.

## 1. Discovery and Assessment
- Any team member who discovers or suspects a data leak must immediately notify the technical lead and the DPO (`privacy@example.com`).
- The DPO will assess the risk to user rights and freedoms.

## 2. Containment
- Identify the source of the breach.
- Revoke compromised credentials, isolate affected servers, or temporarily take the service offline if necessary.

## 3. Notification (Within 72 Hours)
If the breach poses a risk to users:
- **Supervisory Authority**: Notify the relevant national data protection authority within 72 hours of becoming aware of the breach.
- **Affected Users**: If there is a *high risk* to user data (e.g. passwords or OAuth tokens leaked), we must email all affected users without undue delay.

## 4. Remediation and Logs
- Patch the vulnerability.
- Maintain an internal log of the breach, its effects, and the remedial actions taken (GDPR Article 33(5)).
