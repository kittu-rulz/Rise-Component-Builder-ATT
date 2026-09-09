/**
 * Starter Presets & Real Workplace Scenarios
 * Section 7 of Rise Component Builder Next-Level Architecture
 */

export const WORKPLACE_PRESETS = [
  // 1. Accordion (accordion)
  {
    id: 'cybersecurity-incident-response',
    componentId: 'accordion',
    title: 'Cybersecurity Incident Response Protocols',
    name: 'Cybersecurity Incident Response Protocols',
    description: 'Standard operating procedures for identifying, containing, and remediating high-severity security incidents.',
    domain: 'Cybersecurity',
    config: {
      blockTitle: 'SECURITY STANDARD OPERATING PROCEDURE',
      blockHeadline: 'Tier-1 Security Incident Response Workflow',
      blockDesc: 'Expand each phase to review mandatory response actions and communication SLAs during active threat containment.',
      accordionMulti: false,
      accordionAnimation: true,
      accordionSequential: true,
      accordionShowProgress: true,
      accordionShowVisitedBadge: true,
      accordionExpandCollapseAll: true,
      accordionSearch: true,
      accordionAllowReset: true,
      items: [
        {
          title: 'Phase 1: Immediate Triage & Endpoint Isolation',
          subtitle: 'SLA: Within 5 Minutes of Alert',
          content: 'Upon receiving high-confidence SIEM alerts, disconnect the endpoint from all wired and wireless network segments immediately. Do not power off or reboot the system in order to preserve volatile memory (RAM) evidence.',
          badge: 'Immediate',
          badgeType: 'danger'
        },
        {
          title: 'Phase 2: CSIRT War Room & Bridge Activation',
          subtitle: 'SLA: Within 15 Minutes of Confirmation',
          content: 'Activate the dedicated CSIRT bridge and invite the Incident Commander, Lead Forensics Analyst, and Systems Operations SME. Establish an authoritative Slack/Teams channel and assign a dedicated communications scribe.',
          badge: 'Priority',
          badgeType: 'warning'
        },
        {
          title: 'Phase 3: Threat Containment & Credential Invalidation',
          subtitle: 'SLA: Within 30 Minutes',
          content: 'Revoke compromised Active Directory / Okta user sessions, rotate service account credentials, and push emergency firewall ACL rules to block command-and-control (C2) IP addresses and domain hashes.',
          badge: 'Critical',
          badgeType: 'info'
        },
        {
          title: 'Phase 4: Post-Incident Review & Root Cause Analysis',
          subtitle: 'SLA: Within 48 Hours of Resolution',
          content: 'Conduct a formal blameless post-mortem with cross-functional stakeholders. Document technical timeline, initial intrusion vector, gap analysis, and submit Jira tickets for security control hardening.',
          badge: 'Wrap-up',
          badgeType: 'success'
        }
      ]
    }
  },

  // 2. Confidence Matrix (confidence-matrix)
  {
    id: 'cm-cybersecurity-incident',
    componentId: 'confidence-matrix',
    title: 'Cybersecurity Incident Response Readiness',
    name: 'Cybersecurity Incident Response Readiness',
    description: 'Self-assessment measuring frontline readiness to detect, isolate, and report security threats.',
    domain: 'Security & Compliance',
    config: {
      blockTitle: 'SECURITY READINESS AUDIT',
      blockHeadline: 'Cybersecurity Incident Response Self-Assessment',
      blockDesc: 'Rate your operational confidence across key threat detection and escalation protocols. Your diagnostic score helps identify focused growth areas.',
      scaleLabels: [
        'Novice: Need Guidance',
        'Capable: With Checklist',
        'Proficient: Autonomous',
        'Expert: Can Coach Others'
      ],
      items: [
        {
          id: 'cm-item-1',
          domain: 'Threat Recognition',
          skill: 'Identify targeted spear-phishing and social engineering attacks',
          description: 'Recognize sophisticated spoofed sender domains, urgency signals, and suspicious payload attachments before clicking.',
          rating: 2
        },
        {
          id: 'cm-item-2',
          domain: 'Threat Recognition',
          skill: 'Detect unauthorized endpoint access and anomalous login activity',
          description: 'Spot unusual MFA prompts, concurrent geographic session alerts, and unexpected credential usage.',
          rating: 1
        },
        {
          id: 'cm-item-3',
          domain: 'Containment Protocol',
          skill: 'Execute immediate device network isolation',
          description: 'Disconnect compromised endpoints from Ethernet/Wi-Fi immediately without powering off the machine (preserving RAM forensics).',
          rating: 3
        },
        {
          id: 'cm-item-4',
          domain: 'Containment Protocol',
          skill: 'Preserve audit logs and incident timeline data',
          description: 'Document timestamps, suspicious URLs, recipient lists, and message headers accurately for the CSIRT team.',
          rating: 2
        },
        {
          id: 'cm-item-5',
          domain: 'Escalation & Communication',
          skill: 'Follow the 15-Minute CSIRT Priority Escalation SLA',
          description: 'Submit high-severity incident tickets and notify the on-call Security Operations Center incident manager directly.',
          rating: 3
        }
      ]
    }
  },
  {
    id: 'cm-customer-escalation',
    componentId: 'confidence-matrix',
    title: 'Customer Escalation & De-escalation Mastery',
    name: 'Customer Escalation & De-escalation Mastery',
    description: 'Diagnostic assessment for customer care specialists handling high-stakes accounts and service outages.',
    domain: 'Customer Operations',
    config: {
      blockTitle: 'EXCELLENCE IN SERVICE',
      blockHeadline: 'Critical Escalation Management Assessment',
      blockDesc: 'Evaluate your ability to lead challenging customer conversations, rebuild trust, and coordinate rapid resolution during service disruptions.',
      scaleLabels: [
        'Developing',
        'Competent',
        'Advanced',
        'Role Model'
      ],
      items: [
        {
          id: 'cm-esc-1',
          domain: 'Empathy & Rapport',
          skill: 'Validate customer frustration without admitting premature liability',
          description: 'Acknowledge operational impact with authentic empathy while maintaining professional brand boundaries.',
          rating: 3
        },
        {
          id: 'cm-esc-2',
          domain: 'Technical Triage',
          skill: 'Diagnose enterprise circuit outage root causes across tier-2 logs',
          description: 'Isolate fiber cut vs BGP routing anomalies quickly using network diagnostic telemetry.',
          rating: 2
        },
        {
          id: 'cm-esc-3',
          domain: 'Resolution Planning',
          skill: 'Negotiate realistic service restoration timelines (ETR)',
          description: 'Provide clear, defensible milestone commitments rather than vague promises.',
          rating: 3
        },
        {
          id: 'cm-esc-4',
          domain: 'Retention & Follow-up',
          skill: 'Lead Post-Incident Service Reviews (PIR) with executive stakeholders',
          description: 'Present corrective action plans that restore long-term client confidence and prevent account churn.',
          rating: 2
        }
      ]
    }
  },

  // 3. Dial Gauge (dial-gauge)
  {
    id: 'dg-csat-target',
    componentId: 'dial-gauge',
    title: 'Quarterly Customer Satisfaction (CSAT) Goal',
    name: 'Quarterly Customer Satisfaction (CSAT) Goal',
    description: 'Interactive metric gauge showing CSAT target performance tiers from critical attention to benchmark excellence.',
    domain: 'Performance Management',
    config: {
      blockTitle: 'KEY PERFORMANCE INDICATOR',
      blockHeadline: 'Quarterly CSAT Performance Explorer',
      blockDesc: 'Drag the gauge or use the arrow keys to explore CSAT score thresholds, executive milestones, and required coaching actions.',
      gaugeValue: 88,
      gaugeMin: 50,
      gaugeMax: 100,
      unitLabel: '% CSAT',
      zones: [
        { min: 50, max: 70, label: 'Critical Attention', colorTone: 'danger', feedback: 'Immediate tier-1 coaching and quality audit required. Identify systemic root causes.' },
        { min: 71, max: 84, label: 'Operational Standard', colorTone: 'warning', feedback: 'Meeting baseline expectations. Target opportunities for proactive resolution and first-contact resolution.' },
        { min: 85, max: 94, label: 'Target Excellence', colorTone: 'success', feedback: 'Strong performance exceeding quarterly benchmarks. Consistent customer delight.' },
        { min: 95, max: 100, label: 'Benchmark Leader', colorTone: 'primary', feedback: 'World-class customer experience. Eligible for President’s Service Award.' }
      ]
    }
  },
  {
    id: 'dg-uptime-sla',
    componentId: 'dial-gauge',
    title: 'Network Availability & SLA Compliance',
    name: 'Network Availability & SLA Compliance',
    description: 'Interactive SLA tracker demonstrating financial penalty thresholds and high-availability targets.',
    domain: 'Network Operations',
    config: {
      blockTitle: 'INFRASTRUCTURE TELEMETRY',
      blockHeadline: 'Enterprise Core Network SLA Monitor',
      blockDesc: 'Adjust the availability slider to inspect downtime consequences, credits, and operational escalation levels.',
      gaugeValue: 99.95,
      gaugeMin: 98.0,
      gaugeMax: 100.0,
      unitLabel: '% Uptime',
      zones: [
        { min: 98.0, max: 99.0, label: 'Severe SLA Breach', colorTone: 'danger', feedback: 'Major contractual penalties triggered. VP Network Operations incident bridge active.' },
        { min: 99.1, max: 99.89, label: 'At-Risk Margin', colorTone: 'warning', feedback: 'Maintenance window overruns threatening monthly availability threshold.' },
        { min: 99.9, max: 99.99, label: 'Four Nines (SLA Met)', colorTone: 'success', feedback: 'Target availability achieved. Normal change freeze guidelines apply.' },
        { min: 100.0, max: 100.0, label: 'Zero Outage Period', colorTone: 'primary', feedback: 'Flawless execution across all regional optical rings and IP backbones.' }
      ]
    }
  },

  // 4. Card Carousel (card-carousel)
  {
    id: 'cc-coaching-framework',
    componentId: 'card-carousel',
    title: 'The 5-Step Operational Coaching Framework',
    name: 'The 5-Step Operational Coaching Framework',
    description: 'Structured leadership model for conducting impactful 1-on-1 development sessions.',
    domain: 'Leadership & Development',
    config: {
      blockTitle: 'LEADERSHIP TOOLKIT',
      blockHeadline: 'The 5-Step Continuous Coaching Model',
      blockDesc: 'Navigate through each phase of the developmental coaching cycle to prepare for meaningful employee performance check-ins.',
      items: [
        {
          title: '1. Connect & Establish Purpose',
          category: 'PHASE 1',
          content: 'Begin with genuine rapport. Clearly frame the conversation as a collaborative growth discussion rather than an audit.',
          summary: 'Set psychological safety and agree on the focal topic.'
        },
        {
          title: '2. Explore Current Reality',
          category: 'PHASE 2',
          content: 'Ask open-ended diagnostic questions. Encourage the team member to self-assess recent metrics and customer interactions first.',
          summary: 'Uncover obstacles and celebrate positive micro-behaviors.'
        },
        {
          title: '3. Define the Target Outcome',
          category: 'PHASE 3',
          content: 'Establish what great performance looks like. Align on specific, measurable behaviors that drive customer satisfaction.',
          summary: 'Co-create a shared vision of success.'
        },
        {
          title: '4. Build the Action Plan',
          category: 'PHASE 4',
          content: 'Identify 1 or 2 high-leverage micro-actions the employee will practice over the next 14 days with peer shadow support.',
          summary: 'Commit to concrete, timebound practice steps.'
        },
        {
          title: '5. Follow-Up & Accountability',
          category: 'PHASE 5',
          content: 'Schedule the exact date for the progress review. Reinforce your commitment to removing blockers and supporting their trajectory.',
          summary: 'Lock in calendar review and ongoing check-ins.'
        }
      ]
    }
  },

  // 5. Callout Matrix (callout-box)
  {
    id: 'cb-privacy-guidelines',
    componentId: 'callout-box',
    title: 'Customer Data Privacy & Handling Guidelines',
    name: 'Customer Data Privacy & Handling Guidelines',
    description: 'Comprehensive compliance matrix detailing confidential information tiers and required safeguards.',
    domain: 'Legal & Privacy',
    config: {
      blockTitle: 'COMPLIANCE MANDATE',
      blockHeadline: 'Customer Proprietary Information (CPNI) Protocols',
      blockDesc: 'Review the mandatory data classification standards below. You must acknowledge understanding before processing customer records.',
      layout: 'grid',
      requireAcknowledgment: true,
      acknowledgmentText: 'I confirm that I have reviewed the CPNI handling directives and will protect all proprietary customer data.',
      items: [
        {
          title: 'CPNI Data Protection',
          tone: 'policy',
          category: 'MANDATORY DIRECTIVE',
          body: 'Never disclose call detail records, billing addresses, or account PINs without completing two-factor customer identity verification.'
        },
        {
          title: 'Clean Desk & Screen Security',
          tone: 'warning',
          category: 'SECURITY AUDIT',
          body: 'Lock workstations whenever stepping away (Win+L). Physical documents containing customer identifiers must be shredded immediately after processing.'
        },
        {
          title: 'Authorized Verification Tools',
          tone: 'info',
          category: 'OPERATIONAL GUIDANCE',
          body: 'Only use enterprise-approved authentication portals. Third-party messaging or unencrypted email exchanges are strictly prohibited.'
        },
        {
          title: 'Rapid Incident Escalation',
          tone: 'tip',
          category: 'BEST PRACTICE',
          body: 'If you suspect an unauthorized attempt to access customer records (SIM-swap social engineering), flag the account in the Fraud Portal within 10 minutes.'
        }
      ]
    }
  },

  // 6. Comparison Slider (comparison-slider)
  {
    id: 'cs-legacy-vs-modern',
    componentId: 'comparison-slider',
    title: 'Legacy Manual Workflow vs Automated Cloud Delivery',
    name: 'Legacy Manual Workflow vs Automated Cloud Delivery',
    description: 'Visual before-and-after comparison of manual ticketing vs modern continuous deployment pipelines.',
    domain: 'Digital Transformation',
    config: {
      blockTitle: 'OPERATIONAL EVOLUTION',
      blockHeadline: 'Network Modernization: Manual vs Automated',
      blockDesc: 'Drag the slider to compare our legacy configuration change process with our automated software-defined network deployment.',
      beforeLabel: 'Legacy Manual Provisioning (2020)',
      afterLabel: 'Modern CI/CD Cloud Pipeline (Current)',
      beforeDetails: 'Manual CLI entries, 14-day change approval cycles, high human error risk, rollbacks taking hours.',
      afterDetails: 'Declarative Infrastructure as Code (IaC), automated canary testing, zero-downtime rollouts in under 3 minutes.'
    }
  },

  // 7. Interactive Video (interactive-video)
  {
    id: 'iv-executive-briefing',
    componentId: 'interactive-video',
    title: 'Executive Briefing & Crisis Communications',
    name: 'Executive Briefing & Crisis Communications',
    description: 'Interactive scenario coaching managers on delivering clear, authoritative operational updates during major incidents.',
    domain: 'Leadership Communication',
    config: {
      blockTitle: 'EXECUTIVE COMMUNICATION',
      blockHeadline: 'Critical Incident Executive Briefing',
      blockDesc: 'Watch the executive briefing simulation. Respond to the checkpoint prompts at critical junctures to guide the communication strategy.',
      resumeBehaviour: 'automaticAfterCorrectAnswer',
      completionRule: 'allRequiredInteractionsCompleted',
      items: [
        {
          type: 'information',
          timestamp: 15,
          title: 'Framework: BLUF (Bottom Line Up Front)',
          content: 'When briefing executive leaders during an active outage, state the operational status and customer impact in the first 30 seconds before detailing technical root causes.'
        },
        {
          type: 'multipleChoice',
          timestamp: 45,
          title: 'Checkpoint: Responding to Incomplete Diagnostic Data',
          prompt: 'The VP asks for the exact time the primary fiber router will be fully restored, but field technicians are still diagnosing the splice point. How do you respond?',
          options: [
            { text: 'Provide an optimistic estimate of 30 minutes to calm leadership concerns.', correct: false, feedback: 'Incorrect. Giving unverified commitments erodes trust when deadlines are missed.' },
            { text: 'State the current confirmed facts, explain the active diagnostic step, and commit to a specific update window (e.g. "Next update at 14:30").', correct: true, feedback: 'Correct! Transparent communication with a committed update interval establishes credibility.' },
            { text: 'Transfer the question directly to the field technician on the main bridge.', correct: false, feedback: 'Incorrect. Incident commanders must protect field engineers from operational distractions.' }
          ]
        }
      ]
    }
  }
];

export function getPresetsForComponent(componentId) {
  if (!componentId) return [];
  return WORKPLACE_PRESETS.filter(preset => preset.componentId === componentId);
}

export function getPresetById(presetId) {
  return WORKPLACE_PRESETS.find(preset => preset.id === presetId) || null;
}
