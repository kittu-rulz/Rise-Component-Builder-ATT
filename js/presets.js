/**
 * Starter Presets & Real Workplace Scenarios
 * Section 7 of Rise Component Builder Next-Level Architecture
 * Covers all 26 components with authentic, production-grade enterprise scenarios.
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
          content: 'Activate the dedicated CSIRT bridge and invite the Incident Commander, Lead Forensics Analyst, and Systems Operations SME. Establish an authoritative communication channel and assign a dedicated communications scribe.',
          badge: 'Priority',
          badgeType: 'warning'
        },
        {
          title: 'Phase 3: Threat Containment & Credential Invalidation',
          subtitle: 'SLA: Within 30 Minutes',
          content: 'Revoke compromised Active Directory and single sign-on user sessions, rotate service account credentials, and push emergency firewall ACL rules to block command-and-control (C2) IP addresses and domain hashes.',
          badge: 'Critical',
          badgeType: 'info'
        },
        {
          title: 'Phase 4: Post-Incident Review & Root Cause Analysis',
          subtitle: 'SLA: Within 48 Hours of Resolution',
          content: 'Conduct a formal blameless post-mortem with cross-functional stakeholders. Document technical timeline, initial intrusion vector, gap analysis, and submit tickets for security control hardening.',
          badge: 'Wrap-up',
          badgeType: 'success'
        }
      ]
    }
  },

  // 2. Horizontal Tabs (tab-blocks)
  {
    id: 'tab-multicloud-security',
    componentId: 'tab-blocks',
    title: 'Enterprise Multi-Cloud Security Architecture',
    name: 'Enterprise Multi-Cloud Security Architecture',
    description: 'Explore the defense-in-depth principles across public cloud, hybrid edge, and zero-trust identity layers.',
    domain: 'Cloud Architecture',
    config: {
      tabsOrientation: 'horizontal',
      tabsSequential: false,
      tabsShowProgress: true,
      tabsShowVisitedBadge: true,
      tabsNumbered: true,
      tabsCompareMode: false,
      items: [
        {
          title: 'Cloud Edge & WAF',
          content: 'Deploy distributed Denial-of-Service (DDoS) scrubbing and Web Application Firewall (WAF) rule sets at the ingress perimeter to filter malicious payloads and automated bot traffic before hitting internal VPCs.'
        },
        {
          title: 'Zero-Trust Microsegmentation',
          content: 'Enforce strict lateral movement controls between Kubernetes clusters, container pods, and backend database instances using mutual TLS (mTLS) authentication and fine-grained network security policies.'
        },
        {
          title: 'Unified Identity & Access (IAM)',
          content: 'Implement least-privilege role-based access control (RBAC), context-aware conditional access policies, and mandatory hardware security key multi-factor authentication (MFA) across all cloud provider tenants.'
        },
        {
          title: 'Continuous Compliance & SIEM',
          content: 'Stream real-time CloudTrail, audit, and VPC flow logs into centralized security analytics engines for automated anomaly detection, vulnerability posture evaluation, and regulatory compliance reporting.'
        }
      ]
    }
  },

  // 3. 3D Flip Cards / Study Cards (flip-cards)
  {
    id: 'fc-5g-cband-terminology',
    componentId: 'flip-cards',
    title: '5G C-Band & RAN Terminology Mastery',
    name: '5G C-Band & RAN Terminology Mastery',
    description: 'Study mode flashcards drilling essential 5G radio access network engineering concepts and spectrum fundamentals.',
    domain: 'Network Engineering',
    config: {
      flipCardsMode: 'study',
      flipCardsShuffle: true,
      flipCardsCategories: true,
      flipCardsSummary: true,
      flipCardsReset: true,
      flipCardsFrontLabel: 'Term & Frequency',
      flipCardsBackLabel: 'Technical Definition',
      items: [
        {
          title: 'C-Band Spectrum (3.7 - 3.98 GHz)',
          content: 'Mid-band radio frequency spectrum delivering the optimal balance between ultra-fast multi-gigabit throughput and wide geographic area coverage for 5G Ultra Wideband deployments.',
          category: 'Spectrum'
        },
        {
          title: 'C-Band Deployment Role',
          content: 'Provides the high-capacity backbone for urban and suburban 5G performance without requiring the dense cell grid spacing needed for millimeter-wave (mmWave).',
          category: 'Spectrum'
        },
        {
          title: 'Massive MIMO (Multiple-Input Multiple-Output)',
          content: 'Advanced antenna technology utilizing large arrays (e.g. 64T64R) to transmit and receive multiple data signals simultaneously over the same radio channel.',
          category: 'Radio Hardware'
        },
        {
          title: 'Massive MIMO Operational Benefit',
          content: 'Significantly increases cell sector spectral efficiency and capacity in densely populated areas by serving dozens of simultaneous users with spatial multiplexing.',
          category: 'Radio Hardware'
        },
        {
          title: 'Beamforming Technology',
          content: 'Signal processing technique that directs radio frequency signals directly toward specific active user devices rather than broadcasting in a wide broadcast pattern.',
          category: 'RF Processing'
        },
        {
          title: 'Beamforming Advantage',
          content: 'Reduces inter-cell interference, improves signal-to-noise ratio (SNR), and extends reliable coverage reaches for high-speed mobile data connections.',
          category: 'RF Processing'
        },
        {
          title: 'Open RAN (O-RAN) Architecture',
          content: 'Disaggregated radio access network architecture built on open standards and vendor-neutral hardware/software interfaces (split Option 7-2x).',
          category: 'Architecture'
        },
        {
          title: 'O-RAN Strategic Impact',
          content: 'Enables rapid software innovation, automated AI-driven radio resource management (RIC), and multi-vendor supply chain flexibility across mobile networks.',
          category: 'Architecture'
        }
      ]
    }
  },

  // 4. Interactive Hotspots (hotspots)
  {
    id: 'hs-edge-router-diagnostics',
    componentId: 'hotspots',
    title: 'Enterprise Edge Router Hardware Diagnostics',
    name: 'Enterprise Edge Router Hardware Diagnostics',
    description: 'Explore physical diagnostic indicators, redundant fiber uplinks, and management ports on enterprise edge hardware with interactive zoom and drawer details.',
    domain: 'Field Engineering',
    config: {
      title: 'Enterprise Edge Router Hardware Diagnostics',
      content: 'Select the highlighted markers or use the zoom controls to inspect network components and operational zones.',
      calloutMode: 'drawer',
      showProgress: true,
      enableZoomPan: true,
      autoplayAudio: false,
      backgroundImage: '',
      backgroundAltText: 'Enterprise Edge Router Front Panel Schematic Diagram',
      backgroundDecorative: false,
      backgroundFit: 'contain',
      backgroundFocalX: 50,
      backgroundFocalY: 50,
      items: [
        {
          title: 'Primary 100G Optical SFP+ Uplink',
          content: 'Dual LC connector fiber transceiver port providing core backbone connectivity with active link status and loss-of-signal (LOS) telemetry LED indicators.',
          x: '22',
          y: '35',
          markerType: 'icon',
          iconName: 'fiber',
          audioUrl: '',
          audioTranscript: ''
        },
        {
          title: 'Out-of-Band (OOB) Console & Management Port',
          content: 'Dedicated RJ-45 serial and Ethernet management interface isolated from customer traffic planes for emergency remote recovery and firmware flashing.',
          x: '48',
          y: '32',
          markerType: 'icon',
          iconName: 'ethernet',
          audioUrl: '',
          audioTranscript: ''
        },
        {
          title: 'System Health & Alarm Status LEDs',
          content: 'Tri-color status LEDs indicating power supply health, thermal sensor thresholds, fan tray tachometer telemetry, and active environmental alarms.',
          x: '75',
          y: '28',
          markerType: 'icon',
          iconName: 'alert',
          audioUrl: '',
          audioTranscript: ''
        },
        {
          title: 'Redundant Hot-Swappable Power Supply Unit (PSU)',
          content: 'Dual AC/DC redundant power supply modules supporting zero-downtime field replacement during active customer traffic forwarding.',
          x: '82',
          y: '70',
          markerType: 'icon',
          iconName: 'shield',
          audioUrl: '',
          audioTranscript: ''
        }
      ]
    }
  },
  {
    id: 'hs-5g-tower-architecture',
    componentId: 'hotspots',
    title: '5G Cell Site & Optical Fronthaul Architecture',
    name: '5G Cell Site & Optical Fronthaul Architecture',
    description: 'Detailed exploration of 5G macro cell towers, Massive MIMO radio heads, and optical fronthaul distribution with modal callouts.',
    domain: 'Network Engineering',
    config: {
      title: '5G Macro Cell Site Infrastructure Explorer',
      content: 'Inspect the primary radio frequency, digital baseband, and optical distribution subsystems on a modern 5G tower site.',
      calloutMode: 'modal',
      showProgress: true,
      enableZoomPan: true,
      autoplayAudio: false,
      backgroundImage: '',
      backgroundAltText: '5G Cell Tower Infrastructure Schematic',
      backgroundDecorative: false,
      backgroundFit: 'contain',
      backgroundFocalX: 50,
      backgroundFocalY: 50,
      items: [
        {
          title: 'Massive MIMO 64T64R Antenna Array',
          content: 'High-gain beamforming active antenna unit operating in the C-Band (3.7 - 3.98 GHz) delivering multi-gigabit throughput to dense urban user clusters.',
          x: '30',
          y: '20',
          markerType: 'icon',
          iconName: 'network',
          audioUrl: '',
          audioTranscript: ''
        },
        {
          title: 'Remote Radio Unit (RRU) Power & Fiber Junction',
          content: 'IP67-rated weatherized power distribution and optical CPRI/eCPRI fronthaul interface connecting tower-mounted radios to ground baseband units.',
          x: '50',
          y: '45',
          markerType: 'icon',
          iconName: 'fiber',
          audioUrl: '',
          audioTranscript: ''
        },
        {
          title: 'Ground Baseband Processing Unit (BBU)',
          content: 'Centralized Open RAN digital signal processor coordinating beamforming weights, carrier aggregation, and core 5G packet forwarding.',
          x: '70',
          y: '75',
          markerType: 'icon',
          iconName: 'ethernet',
          audioUrl: '',
          audioTranscript: ''
        }
      ]
    }
  },

  // 5. Quick Link Buttons (button-list)
  {
    id: 'bl-incident-response-tools',
    componentId: 'button-list',
    title: 'Critical Incident Operations Toolkit',
    name: 'Critical Incident Operations Toolkit',
    description: 'Instant launchpad for frontline incident responders connecting to diagnostic telemetry, bridges, and status dashboards.',
    domain: 'Operations & Support',
    config: {
      items: [
        { title: 'Active Incident Command War Room', content: 'https://operations.corp.att.com/bridge/live' },
        { title: 'Global Network Operations Center (GNOC) Telemetry', content: 'https://gnoc.corp.att.com/dashboards/realtime' },
        { title: 'CSIRT Threat Escalation Portal', content: 'https://security.corp.att.com/csirt/report' },
        { title: 'Fiber Cut & Field Dispatch Locator', content: 'https://fieldops.corp.att.com/dispatch/map' }
      ]
    }
  },

  // 6. Secondary Menu Drawer / Reference Explorer (menu-list)
  {
    id: 'ml-field-safety-handbook',
    componentId: 'menu-list',
    title: 'High-Voltage & Cell Tower Safety Procedures',
    name: 'High-Voltage & Cell Tower Safety Procedures',
    description: 'Quick-reference operating handbook detailing mandatory PPE, RF radiation boundaries, and emergency rescue protocols.',
    domain: 'Safety & Compliance',
    config: {
      items: [
        {
          title: 'Section 01: Mandatory Personal Protective Equipment (PPE)',
          content: 'Full-body climbing harness with dual lanyard tie-off, ANSI-certified Class E hard hat, high-dexterity insulated gloves, and composite-toe electrical hazard footwear must be inspected and donned before entering the tower zone.'
        },
        {
          title: 'Section 02: RF Radiation Exposure Boundaries',
          content: 'Maintain a minimum 10-foot radial separation from active 5G Massive MIMO and high-power macro antennas. Use calibrated RF personal monitors set to 100% FCC occupational exposure threshold at all times.'
        },
        {
          title: 'Section 03: Lockout / Tagout (LOTO) Electrical Protocol',
          content: 'De-energize main AC distribution panels, attach individual red safety padlocks with personal ID tags, and test with a calibrated multimeter to confirm zero voltage before servicing rectifier banks.'
        },
        {
          title: 'Section 04: Emergency Tower Rescue & Evacuation Plan',
          content: 'Designate an on-ground rescue lead equipped with an automatic descent control kit. Ensure direct radio communication with regional emergency dispatch and confirm nearest trauma center coordinates.'
        }
      ]
    }
  },

  // 7. Multiple Choice Knowledge Check (multiple-choice)
  {
    id: 'mc-sim-swap-fraud',
    componentId: 'multiple-choice',
    title: 'High-Risk SIM-Swap Escalation Verification Check',
    name: 'High-Risk SIM-Swap Escalation Verification Check',
    description: 'Test frontline customer care knowledge on detecting social engineering and executing mandatory CPNI identity verification.',
    domain: 'Fraud Prevention',
    config: {
      mcConfidenceMode: true,
      mcRequireConfidence: true,
      mcConfidenceLowLabel: 'Uncertain',
      mcConfidenceMidLabel: 'Somewhat Confident',
      mcConfidenceHighLabel: 'Highly Confident',
      mcMaxAttempts: 2,
      mcShowCorrectAfterFinal: true,
      mcHintText: 'Remember that account PIN knowledge alone does not bypass mandatory multi-factor identity proofing when a device change is requested remotely.',
      mcFinalExplanation: 'Correct Protocol: Whenever an urgent remote SIM-swap is requested, agents must complete two-factor customer identity verification via an authorized one-time passcode or in-store government photo ID verification to prevent unauthorized account takeover.',
      mcAllowReset: true,
      mcShowResultSummary: true,
      mcSubmitButtonText: 'Verify Security Protocol',
      items: [
        {
          label: 'Process the SIM swap immediately since the caller provided the correct billing address and account PIN.',
          content: 'Incorrect. Attackers frequently obtain billing details and PINs through database leaks or phishing. Bypassing two-factor verification violates CPNI policy.',
          correct: false
        },
        {
          label: 'Enforce out-of-band two-factor verification or require an authorized in-store identity check with government photo ID.',
          content: 'Correct! Mandatory out-of-band verification prevents fraudulent SIM-swap takeovers and protects customer financial and personal accounts.',
          correct: true
        },
        {
          label: 'Ask the caller for the last 4 digits of their Social Security number and proceed with the hardware change without secondary authentication.',
          content: 'Incorrect. Static personally identifiable information (PII) is not an authorized standalone verification method for high-risk device swaps.',
          correct: false
        },
        {
          label: 'Transfer the customer directly to the collections department without placing any security hold flags on the profile.',
          content: 'Incorrect. Unverified high-risk requests must be logged in the Fraud Prevention Portal to alert downstream support teams.',
          correct: false
        }
      ]
    }
  },

  // 8. Multiple Select Knowledge Check (multiple-select)
  {
    id: 'ms-zerotrust-containment',
    componentId: 'multiple-select',
    title: 'Security Incident Containment Checklist',
    name: 'Security Incident Containment Checklist',
    description: 'Select all mandatory operational controls required when containing a confirmed active ransomware or lateral intrusion threat.',
    domain: 'Cybersecurity',
    config: {
      items: [
        {
          label: 'Isolate affected host endpoints from both wired and wireless network segments immediately.',
          content: 'Correct. Network isolation blocks further malware propagation and command-and-control communication.',
          correct: true
        },
        {
          label: 'Power off and wipe all host hard drives before collecting forensic artifacts.',
          content: 'Incorrect. Powering off destroys volatile RAM forensics and uncommitted logs needed for root cause analysis.',
          correct: false
        },
        {
          label: 'Revoke active single sign-on (SSO) sessions and rotate compromised service account credentials.',
          content: 'Correct. Invalidating active credentials prevents attackers from maintaining persistence using stolen session tokens.',
          correct: true
        },
        {
          label: 'Deploy emergency firewall egress rules to block identified malicious C2 IP addresses and domain indicators.',
          content: 'Correct. Perimeter egress filtering stops active data exfiltration and callback beacons.',
          correct: true
        }
      ]
    }
  },

  // 9. Sorting Activity (sorting-activity)
  {
    id: 'sa-data-classification',
    componentId: 'sorting-activity',
    title: 'Enterprise Data Classification & Handling',
    name: 'Enterprise Data Classification & Handling',
    description: 'Sort enterprise information assets into their correct security classifications: Public, Confidential, or Restricted.',
    domain: 'Information Security',
    config: {
      items: [
        {
          title: 'Public Marketing Press Releases',
          content: 'Approved marketing announcements and public annual shareholder reports.',
          category: 'Public'
        },
        {
          title: 'Customer Proprietary Network Info (CPNI)',
          content: 'Call detail records, customer billing addresses, and unlisted mobile numbers.',
          category: 'Restricted'
        },
        {
          title: 'Internal Team Process Wiki',
          content: 'Standard team meeting notes, departmental onboarding guides, and non-sensitive sprint documentation.',
          category: 'Confidential'
        },
        {
          title: 'Cryptographic Root Certificates & Private Keys',
          content: 'Core network SSL/TLS root private keys, HSM seed tokens, and admin database credentials.',
          category: 'Restricted'
        }
      ]
    }
  },

  // 10. Fill in the Blank (fill-blank)
  {
    id: 'fb-cpni-compliance-scripting',
    componentId: 'fill-blank',
    title: 'CPNI Customer Identity Verification Scripting',
    name: 'CPNI Customer Identity Verification Scripting',
    description: 'Reinforce precise regulatory terminology and compliance scripting required during customer identity verification.',
    domain: 'Customer Operations',
    config: {
      items: [
        {
          title: 'Before disclosing customer proprietary network information, agents must complete [blank] factor authentication.',
          content: 'two'
        },
        {
          title: 'Customer authentication passcodes and temporary verification codes must never be transmitted via unencrypted [blank] messages.',
          content: 'email'
        },
        {
          title: 'Suspected fraudulent account takeover attempts must be reported to the [blank] portal within 10 minutes.',
          content: 'fraud'
        }
      ]
    }
  },

  // 11. Guided Vertical Timeline (vertical-timeline)
  {
    id: 'vt-fiber-outage-restoration',
    componentId: 'vertical-timeline',
    title: 'Critical Fiber Cut Outage & Restoration Timeline',
    name: 'Critical Fiber Cut Outage & Restoration Timeline',
    description: 'Walk through the step-by-step restoration lifecycle of a major metro optical backbone sever from alarm to traffic restoration.',
    domain: 'Incident Management',
    config: {
      timelineCategoriesEnabled: true,
      timelineCompareMode: false,
      timelineCollapsibleDetails: true,
      timelineShowProgress: true,
      timelineChronologicalReveal: true,
      timelineAllowReset: true,
      items: [
        {
          title: 'T+00:00 — Optical Loss of Signal (LOS) Alarm Triggered',
          content: 'Automated DWDM telemetry detects simultaneous loss of signal across 48 dark fiber strands along Interstate 85. Incident ticket auto-generates with P1 urgency in GNOC systems.',
          category: 'Detection'
        },
        {
          title: 'T+00:15 — OTDR Laser Distance Fault Localization',
          content: 'Optical Time-Domain Reflectometer (OTDR) trace isolates the physical fiber cut precisely at Mile Marker 114.8, caused by unauthorized third-party civil excavation.',
          category: 'Diagnosis'
        },
        {
          title: 'T+00:45 — Emergency Field Crew & Splicing Trailer On-Site',
          content: 'Field technicians establish a secure work zone, pull 150 feet of slack armored cable, and prepare the mobile fiber splicing trailer for ribbon cable fusion.',
          category: 'Field Action'
        },
        {
          title: 'T+02:30 — Core Fusion Splicing & Loopback Power Verification',
          content: 'All 48 fiber pairs spliced with an average optical loss under 0.02 dB per joint. GNOC confirms laser power levels within standard operating thresholds and reroutes live traffic.',
          category: 'Restoration'
        }
      ]
    }
  },

  // 12. Horizontal Timeline / Journey Map (horizontal-timeline)
  {
    id: 'ht-continuous-delivery-lifecycle',
    componentId: 'horizontal-timeline',
    title: 'Enterprise Software Continuous Delivery Lifecycle',
    name: 'Enterprise Software Continuous Delivery Lifecycle',
    description: 'Explore the sequential milestones in our automated CI/CD pipeline from code commit to zero-downtime production deployment.',
    domain: 'Software Engineering',
    config: {
      items: [
        {
          title: '1. Automated Lint & Static Analysis',
          content: 'Every git push triggers automated unit testing, SonarQube code quality scans, brand compliance checks, and container vulnerability scanning.',
          markerLabel: '01'
        },
        {
          title: '2. Ephemeral Staging & Canary Test',
          content: 'Deploy the build into an isolated Kubernetes preview namespace and run automated Playwright end-to-end integration and accessibility test suites.',
          markerLabel: '02'
        },
        {
          title: '3. Blue/Green Production Deployment',
          content: 'Route 10% of live traffic to the new Green container cluster, monitoring latency and error budgets for 15 minutes before shifting 100% of user traffic.',
          markerLabel: '03'
        },
        {
          title: '4. Telemetry Verification & Closure',
          content: 'Confirm APM error rates remain below 0.01%, verify CDN cache invalidation, and automatically update deployment changelogs in Jira.',
          markerLabel: '04'
        }
      ]
    }
  },

  // 13. Step-by-Step Process Flow (process-flow)
  {
    id: 'pf-optical-fusion-splicing',
    componentId: 'process-flow',
    title: 'Optical Fiber Fusion Splicing Standard Operating Procedure',
    name: 'Optical Fiber Fusion Splicing Standard Operating Procedure',
    description: 'Gated step-by-step procedure guiding technicians through high-precision fiber preparation and fusion alignment.',
    domain: 'Optical Engineering',
    config: {
      items: [
        {
          title: 'Cable Sheath Stripping & Buffer Tube Prep',
          content: 'Carefully strip the outer polyethylene jacket using a longitudinal slit tool without scoring the internal buffer tubes. Secure the aramid strength member to the splice tray clamp.',
          durationMinutes: 10
        },
        {
          title: 'Precision Fiber Cleaving & Cleaning',
          content: 'Strip the 250µm acrylate coating down to bare 125µm silica glass using thermal strippers. Clean the fiber with 99% isopropyl alcohol wipes and cleave with an angle under 0.5 degrees.',
          durationMinutes: 5
        },
        {
          title: 'Core Alignment & Arc Fusion Splicing',
          content: 'Place fiber ends into the fusion splicer V-grooves. Execute automated core-to-core profile alignment and electric arc fusion, verifying estimated loss is under 0.02 dB.',
          durationMinutes: 5
        },
        {
          title: 'Heat Shrink Sleeve & Splice Tray Placement',
          content: 'Center the steel-reinforced heat shrink protective sleeve over the fusion point and heat-cure in the oven. Route fiber loops into the splice tray adhering to minimum bend radius rules.',
          durationMinutes: 10
        },
        {
          title: 'Bidirectional OTDR Certification Test',
          content: 'Perform bidirectional OTDR trace testing at 1310nm and 1550nm wavelengths to confirm end-to-end optical attenuation meets engineering specifications.',
          durationMinutes: 15
        }
      ]
    }
  },

  // 14. Branching Scenario Card (scenario)
  {
    id: 'sc-executive-outage-dialogue',
    componentId: 'scenario',
    title: 'High-Priority Healthcare Network Outage Escalation',
    name: 'High-Priority Healthcare Network Outage Escalation',
    description: 'Lead a high-stakes customer conversation when an enterprise hospital network circuit experiences an unexpected service disruption.',
    domain: 'Customer Operations',
    config: {
      items: [
        {
          title: 'The Chief Information Officer of a major regional hospital calls your priority escalation line during an active fiber cut. They are frustrated and demanding a guaranteed resolution time within 15 minutes. How do you lead this conversation?',
          content: 'Scenario Prompt'
        },
        {
          title: 'Provide a quick promise of 15 minutes to de-escalate the tension immediately.',
          content: 'Incorrect approach: Giving an unverified timeline creates severe distrust and operational chaos when the deadline is missed during active field splicing.'
        },
        {
          title: 'Acknowledge the critical patient care impact with empathy, share confirmed diagnostic facts, and commit to an authoritative bridge update in 20 minutes.',
          content: 'Role Model response! Validating impact, being transparent about active diagnostic steps, and setting clear update commitments rebuilds executive trust.'
        },
        {
          title: 'Advise the CIO that field technicians are busy and ask them to monitor the automated public web portal for updates.',
          content: 'Incorrect approach: Executive enterprise clients require dedicated incident management leadership and personal accountability during major disruptions.'
        }
      ]
    }
  },

  // 15. Modern Profile Grid (profile-cards)
  {
    id: 'pc-incident-command-roster',
    componentId: 'profile-cards',
    title: 'Critical Incident Command & Technical Roster',
    name: 'Critical Incident Command & Technical Roster',
    description: 'Meet the key operational command roles responsible for coordinating cross-functional recovery during major network outages.',
    domain: 'Incident Command',
    config: {
      items: [
        {
          title: 'Elena Rostova',
          content: 'Major Incident Commander (MIC) • Owns executive command bridge, coordinates technical workstreams, and makes authoritative operational go/no-go decisions during P1 events.',
          imageCrop: 'circle'
        },
        {
          title: 'Marcus Vance',
          content: 'Lead Transport Network Architect • Directs core optical routing, DWDM wavelength reconfiguration, and field splice triage across regional fiber rings.',
          imageCrop: 'circle'
        },
        {
          title: 'Dr. Priya Patel',
          content: 'Chief Information Security Officer • Authorizes emergency threat containment protocols, legal forensic preservation, and external regulatory communications.',
          imageCrop: 'circle'
        }
      ]
    }
  },

  // 16. Multi-Column Info Grid (info-grid)
  {
    id: 'ig-operational-pillars',
    componentId: 'info-grid',
    title: 'AT&T Enterprise Operational Excellence Pillars',
    name: 'AT&T Enterprise Operational Excellence Pillars',
    description: 'Core architectural and cultural principles guiding enterprise reliability, security by design, and proactive customer success.',
    domain: 'Core Strategy',
    config: {
      items: [
        {
          title: 'Relentless Network Reliability',
          content: 'Engineering five-nines (99.999%) availability across core transport backbones with self-healing optical meshes and automated fast-reroute protocols.',
          accentColor: '#009FDB'
        },
        {
          title: 'Zero-Trust Security by Design',
          content: 'Verifying every request, user identity, and endpoint continuously with microsegmented networks and hardware-backed multi-factor authentication.',
          accentColor: '#0568AE'
        },
        {
          title: 'Proactive Telemetry & Support',
          content: 'Leveraging real-time machine learning telemetry to predict optical degradation and dispatch repair crews before customer impact occurs.',
          accentColor: '#00A3E0'
        }
      ]
    }
  },

  // 17. Comparison Matrix / Product Matrix Cards (pricing-comparison)
  {
    id: 'pc-enterprise-connectivity-tiers',
    componentId: 'pricing-comparison',
    title: 'Enterprise Dedicated Connectivity Tiers',
    name: 'Enterprise Dedicated Connectivity Tiers',
    description: 'Interactive comparison matrix comparing business broadband, dedicated internet access (ADI), and wavelength optical services.',
    domain: 'Product Architecture',
    config: {
      items: [
        {
          title: 'Business Fiber Pro',
          content: 'Shared Fiber Bandwidth • Symmetrical Speeds up to 1 Gbps • 99.9% Uptime SLA • Next Business Day On-Site Repair • Cloud Management Portal',
          highlighted: false,
          actionUrl: 'https://business.att.com/fiber-pro'
        },
        {
          title: 'AT&T Dedicated Internet (ADI)',
          content: '100% Dedicated Unshared Bandwidth • 99.999% Availability SLA • Symmetrical Speeds 100 Mbps to 100 Gbps • 24/7/365 Proactive NOC Monitoring • 4-Hour MTTR Guarantee with SLA Credits',
          highlighted: true,
          actionUrl: 'https://business.att.com/adi'
        },
        {
          title: 'Optical Wavelength Service',
          content: 'Private Point-to-Point Optical Path • Ultra-Low Latency DWDM • Dedicated 100G / 400G Wavelengths • Diverse Geographic Physical Route Protection • Mission-Critical Data Center Interconnect',
          highlighted: false,
          actionUrl: 'https://business.att.com/wavelength'
        }
      ]
    }
  },

  // 18. Learning Audio Player (audio-player)
  {
    id: 'ap-executive-transformation-podcast',
    componentId: 'audio-player',
    title: 'Executive Insights: Leading Through Operational Change',
    name: 'Executive Insights: Leading Through Operational Change',
    description: 'Audio masterclass featuring executive perspectives on digital modernization, psychological safety, and cross-functional leadership.',
    domain: 'Leadership & Culture',
    config: {
      presentationMode: 'podcast',
      chapters: '0:00 | Introduction & Strategic Vision | Overview of the modernization imperative\n0:45 | Breaking Down Operational Silos | Fostering cross-team collaboration\n1:30 | Sustaining High Performance | Coaching and psychological safety',
      transcriptSegments: '0:00 | Host | Welcome to Executive Insights. Today we discuss operational transformation at enterprise scale.\n0:45 | VP Operations | Real transformation succeeds only when engineering and frontline care operate with shared metrics.\n1:30 | VP Operations | Psychological safety empowers teams to flag risks early before customer impact emerges.',
      progressPersistence: true,
      takeaways: 'Align engineering metrics with end-customer experience outcomes.\nCreate blameless post-mortem environments to encourage early risk escalation.\nInvest continuously in frontline tooling and micro-learning mastery.',
      takeawaysVisibility: 'always',
      items: [
        {
          title: 'Episode 12: Building Resilient Operations at Scale',
          seriesLabel: 'EXECUTIVE LEADERSHIP SERIES',
          description: 'A deep-dive conversation on leading enterprise engineering teams through cloud transitions and cultural modernization.',
          content: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
          transcript: 'Full episode transcript discussing operational excellence, cross-functional collaboration, and sustaining continuous learning in distributed organizations.'
        }
      ]
    }
  },

  // 19. Learning Video Player (video-frame)
  {
    id: 'vf-gnoc-operations-briefing',
    componentId: 'video-frame',
    title: 'Global Network Operations Center (GNOC) Tour & Triage Overview',
    name: 'Global Network Operations Center (GNOC) Tour & Triage Overview',
    description: 'Video overview illustrating how 24/7 network surveillance teams triage alarms, orchestrate dispatch, and safeguard core infrastructure.',
    domain: 'Network Operations',
    config: {
      chapters: '0:00 | GNOC Mission Overview | Real-time global telemetry monitoring\n0:10 | Automated Alarm Correlation | AI-driven root cause identification\n0:20 | Multi-Team Incident Response | Rapid mobilization and recovery orchestration',
      transcriptSegments: '0:00 | Narrator | The Global Network Operations Center monitors petabytes of live network traffic every second across our international footprint.\n0:10 | Lead Engineer | Advanced telemetry correlation isolates fiber anomalies and hardware alarms in milliseconds.\n0:20 | Incident Manager | Specialized incident response teams coordinate with local field dispatchers for immediate physical triage.',
      progressPersistence: true,
      takeaways: 'Automated alarm correlation cuts incident detection time by over 70%.\nUnified telemetry bridges allow engineers and field techs to collaborate in real-time.\nProactive fiber monitoring prevents network disruptions before customer impact occurs.',
      takeawaysVisibility: 'always',
      items: [
        {
          title: 'Inside the Global Network Operations Center',
          content: 'https://www.w3schools.com/html/mov_bbb.mp4',
          transcript: 'Video briefing showing the physical and virtual command center operations that safeguard enterprise connectivity around the clock.',
          audioDescription: 'Video shows panoramic view of the operations center video wall displaying global traffic heat maps and active telemetry streams.'
        }
      ]
    }
  },

  // 20. Grid Photo Gallery (image-gallery)
  {
    id: 'ig-5g-cell-hardware-inspection',
    componentId: 'image-gallery',
    title: '5G Cell Site Hardware & Field Inspection Gallery',
    name: '5G Cell Site Hardware & Field Inspection Gallery',
    description: 'Visual reference gallery showcasing compliant installation standards for 5G Massive MIMO antennas, basebands, and fiber terminals.',
    domain: 'Field Engineering',
    config: {
      items: [
        {
          title: '5G Massive MIMO Antenna Assembly',
          caption: '64T64R C-Band beamforming antenna securely mounted to monopole tower mount with weatherized RF jumpers.',
          content: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800',
          altText: 'High-gain 5G cellular antenna installed on tower top'
        },
        {
          title: 'Centralized Baseband Unit (BBU) Rack',
          caption: 'High-density digital signal processing rack with dual DC power feeds and redundant fiber optic fronthaul patch cords.',
          content: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800',
          altText: 'Network server rack with clean fiber cabling and LED status indicators'
        },
        {
          title: 'Weatherproof Fiber Distribution Terminal (FDT)',
          caption: 'Outdoor IP67-rated enclosure housing 24 fusion splices with sealed compression grommets and ground bonding.',
          content: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800',
          altText: 'Enclosed optical fiber distribution panel with organized buffer tubes'
        }
      ]
    }
  },

  // 21. Confidence Matrix (confidence-matrix) — Scenario A
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

  // 22. Confidence Matrix (confidence-matrix) — Scenario B
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

  // 23. Interactive Gauge (dial-gauge) — Scenario A
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

  // 24. Interactive Gauge (dial-gauge) — Scenario B
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

  // 25. Card Carousel (card-carousel)
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

  // 26. Policy & Alert Cards (callout-box)
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
      layout: 'grid-2',
      requireAcknowledgment: true,
      acknowledgmentText: 'I confirm that I have reviewed the CPNI handling directives and will protect all proprietary customer data.',
      items: [
        {
          title: 'CPNI Data Protection',
          tone: 'primary',
          category: 'MANDATORY DIRECTIVE',
          content: 'Never disclose call detail records, billing addresses, or account PINs without completing two-factor customer identity verification.'
        },
        {
          title: 'Clean Desk & Screen Security',
          tone: 'warning',
          category: 'SECURITY AUDIT',
          content: 'Lock workstations whenever stepping away (Win+L). Physical documents containing customer identifiers must be shredded immediately after processing.'
        },
        {
          title: 'Authorized Verification Tools',
          tone: 'info',
          category: 'OPERATIONAL GUIDANCE',
          content: 'Only use enterprise-approved authentication portals. Third-party messaging or unencrypted email exchanges are strictly prohibited.'
        },
        {
          title: 'Rapid Incident Escalation',
          tone: 'tip',
          category: 'BEST PRACTICE',
          content: 'If you suspect an unauthorized attempt to access customer records (SIM-swap social engineering), flag the account in the Fraud Portal within 10 minutes.'
        }
      ]
    }
  },

  // 27. Comparison Slider (comparison-slider)
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

  // 28. Interactive Video (interactive-video)
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
  },

  // 29. Confidence Matrix Preset 2: Leadership & Strategic Decision-Making
  {
    id: 'cm-leadership-strategic-execution',
    componentId: 'confidence-matrix',
    title: 'Executive Leadership & Strategic Decision-Making',
    name: 'Executive Leadership & Strategic Decision-Making',
    description: 'Self-assess executive leadership capabilities across vision setting, psychological safety, change resilience, and conflict resolution.',
    domain: 'Leadership Development',
    config: {
      title: 'Executive Leadership & Strategic Execution Matrix',
      content: 'Assess your capability to guide high-performing teams, navigate complex organizational ambiguity, and drive decisive strategic outcomes.',
      showBreakdown: true,
      scaleLabel: 'Leadership Mastery Scale',
      items: [
        {
          title: 'Visionary Strategic Clarity',
          category: 'Strategy & Direction',
          content: 'Translate high-level corporate objectives into actionable, measurable team roadmaps with clear quarterly OKRs and KPIs.'
        },
        {
          title: 'High-Trust Psychological Safety',
          category: 'Team Culture',
          content: 'Foster an environment where team members openly challenge assumptions, report early mistakes without fear, and propose bold innovations.'
        },
        {
          title: 'Agile Change Leadership',
          category: 'Organizational Agility',
          content: 'Lead cross-functional stakeholders smoothly through operational pivots, technological shifts, and structural reorganizations.'
        },
        {
          title: 'Decisive Conflict Resolution',
          category: 'Interpersonal Leadership',
          content: 'Address interpersonal friction and competing departmental priorities directly with objective, principle-centered mediation.'
        }
      ]
    }
  },

  // 30. Confidence Matrix Preset 3: Enterprise Generative AI Adoption & Governance
  {
    id: 'cm-enterprise-genai-governance',
    componentId: 'confidence-matrix',
    title: 'Enterprise Generative AI Adoption & Governance',
    name: 'Enterprise Generative AI Adoption & Governance',
    description: 'Evaluate technical team readiness for enterprise AI workflows across prompt engineering, PII boundaries, hallucination checks, and ethical governance.',
    domain: 'Artificial Intelligence',
    config: {
      title: 'Generative AI Practitioner Readiness Assessment',
      content: 'Measure your proficiency in applying generative AI models responsibly within enterprise environments, maintaining strict data security and compliance.',
      showBreakdown: true,
      scaleLabel: 'AI Practitioner Maturity Scale',
      items: [
        {
          title: 'System Prompt Engineering & Context Design',
          category: 'AI Engineering',
          content: 'Structure complex few-shot prompts with role framing, markdown output schemas, and strict boundary constraints to minimize hallucinations.'
        },
        {
          title: 'Data Confidentiality & PII Protection',
          category: 'Security & Privacy',
          content: 'Ensure sensitive customer records, proprietary source code, and confidential network configurations are never ingested into non-approved external models.'
        },
        {
          title: 'Hallucination Verification & Fact-Checking',
          category: 'Quality Assurance',
          content: 'Systematically cross-verify synthetic outputs against authoritative engineering documentation before committing deliverables to production.'
        },
        {
          title: 'Responsible AI & Ethical Bias Governance',
          category: 'Ethical Governance',
          content: 'Evaluate model fairness, explainability, accessibility considerations, and adherence to company AI ethics guidelines.'
        }
      ]
    }
  },

  // 31. Confidence Matrix Preset 4: Customer Operations & SLA De-escalation
  {
    id: 'cm-customer-sla-deescalation',
    componentId: 'confidence-matrix',
    title: 'Customer Operations & SLA De-escalation Mastery',
    name: 'Customer Operations & SLA De-escalation Mastery',
    description: 'Assess frontline and tier-2 support capabilities across executive de-escalation, rapid root-cause diagnosis, and cross-functional handoffs.',
    domain: 'Customer Operations',
    config: {
      title: 'Customer Excellence & Outage De-escalation Matrix',
      content: 'Evaluate your operational confidence in managing high-stakes client communications during mission-critical network disruptions.',
      showBreakdown: true,
      scaleLabel: 'Operational Capability Scale',
      items: [
        {
          title: 'High-Stakes Executive De-escalation',
          category: 'Customer Engagement',
          content: 'Calm urgent customer executive escalations using empathetic listening, confirmed factual status, and clear accountability commitments.'
        },
        {
          title: 'First-Contact Diagnostic Precision',
          category: 'Technical Triage',
          content: 'Isolate circuit impairments and service faults accurately within the initial 15 minutes of customer ticket submission.'
        },
        {
          title: 'Cross-Functional Technical Handoffs',
          category: 'Operational Collaboration',
          content: 'Provide complete, structured diagnostic documentation to Tier-3 NOC and field splice engineers without communication gaps.'
        },
        {
          title: 'Quality & Contractual SLA Compliance',
          category: 'Compliance & Standards',
          content: 'Track and enforce contractual Mean Time to Restore (MTTR) milestones and submit required outage credit paperwork accurately.'
        }
      ]
    }
  },

  // 32. Interactive Gauge Preset 2: Enterprise Cyber Risk Exposure Index
  {
    id: 'dg-cyber-risk-index',
    componentId: 'dial-gauge',
    title: 'Enterprise Cyber Risk Exposure Index',
    name: 'Enterprise Cyber Risk Exposure Index',
    description: 'Interactive risk posture dial evaluating organizational vulnerability from Low Exposure (<25) to Critical Breach Risk (>75).',
    domain: 'Cybersecurity & Risk',
    config: {
      title: 'Enterprise Threat & Vulnerability Exposure Index',
      content: 'Select a risk threshold or drag the needle to review required containment controls, escalation protocols, and mitigation mandates.',
      unit: 'Risk Score',
      minValue: 0,
      maxValue: 100,
      initialValue: 35,
      step: 5,
      items: [
        {
          title: 'Zone 1: Controlled Baseline (<25)',
          rangeMin: 0,
          rangeMax: 25,
          badgeLabel: 'Low Threat Exposure',
          badgeTone: 'neutral',
          content: '<strong>Status: Optimal Security Posture</strong><br>All critical security patches deployed within 72 hours. Zero-day vulnerability signatures blocked at edge perimeter. Multi-factor authentication 100% active.'
        },
        {
          title: 'Zone 2: Monitored Exposure (26-55)',
          rangeMin: 26,
          rangeMax: 55,
          badgeLabel: 'Moderate Attention Required',
          badgeTone: 'info',
          content: '<strong>Status: Elevated Security Telemetry</strong><br>Moderate unpatched CVEs detected on internal test subnets. Heighten automated SIEM correlation and enforce 48-hour patch compliance for all internet-facing servers.'
        },
        {
          title: 'Zone 3: High Vulnerability Deficit (56-80)',
          rangeMin: 56,
          rangeMax: 80,
          badgeLabel: 'High Risk Warning',
          badgeTone: 'warning',
          content: '<strong>Status: High Vulnerability Exposure</strong><br>Multiple critical CVEs active without compensating microsegmentation controls. Initiate emergency maintenance window to patch vulnerable libraries and isolate affected host nodes.'
        },
        {
          title: 'Zone 4: Critical Threat & Active Compromise (81-100)',
          rangeMin: 81,
          rangeMax: 100,
          badgeLabel: 'Critical Threat Level',
          badgeTone: 'danger',
          content: '<strong>Status: Emergency Incident Triggered</strong><br>Confirmed command-and-control beaconing or credential dumping detected. Activate Level-1 CSIRT war room immediately and sever compromised subnets from corporate WAN.'
        }
      ]
    }
  },

  // 33. Interactive Gauge Preset 3: Enterprise Cloud Transformation Maturity Index
  {
    id: 'dg-cloud-maturity-index',
    componentId: 'dial-gauge',
    title: 'Enterprise Cloud Transformation Maturity Index',
    name: 'Enterprise Cloud Transformation Maturity Index',
    description: 'Assess architecture progression from Legacy On-Premises Silos (Level 1) to Autonomous Self-Healing Hybrid Cloud (Level 5).',
    domain: 'Cloud Architecture',
    config: {
      title: 'Cloud Transformation & DevOps Maturity Model',
      content: 'Explore the architectural milestones, deployment cadences, and observability patterns associated with each cloud maturity stage.',
      unit: 'Level',
      minValue: 1,
      maxValue: 5,
      initialValue: 3,
      step: 1,
      items: [
        {
          title: 'Level 1: Legacy Siloed Infrastructure',
          rangeMin: 1,
          rangeMax: 1,
          badgeLabel: 'Traditional On-Prem',
          badgeTone: 'neutral',
          content: '<strong>Cadence: Quarterly Releases</strong><br>Manual bare-metal server provisioning, physical datacenter dependency, and monolithic application codebases with significant operational overhead.'
        },
        {
          title: 'Level 2: Cloud-Aware Lift-and-Shift',
          rangeMin: 2,
          rangeMax: 2,
          badgeLabel: 'IaaS Migration',
          badgeTone: 'info',
          content: '<strong>Cadence: Monthly Releases</strong><br>Virtual machine rehosting in public cloud VPCs. Basic auto-scaling implemented for compute nodes, but database and storage backends remain tightly coupled.'
        },
        {
          title: 'Level 3: Containerized Microservices',
          rangeMin: 3,
          rangeMax: 3,
          badgeLabel: 'Cloud Native',
          badgeTone: 'primary',
          content: '<strong>Cadence: Bi-Weekly Releases</strong><br>Dockerized microservices managed by Kubernetes clusters. Automated CI/CD build pipelines and centralized cloud telemetry logging active.'
        },
        {
          title: 'Level 4: Automated Policy-as-Code',
          rangeMin: 4,
          rangeMax: 4,
          badgeLabel: 'DevSecOps & GitOps',
          badgeTone: 'primary',
          content: '<strong>Cadence: Daily Deployments</strong><br>Declarative Infrastructure as Code (Terraform), automated security scanning in PRs, canary deployments, and distributed OpenTelemetry tracing.'
        },
        {
          title: 'Level 5: Autonomous Self-Healing Mesh',
          rangeMin: 5,
          rangeMax: 5,
          badgeLabel: 'Autonomous Mesh',
          badgeTone: 'success',
          content: '<strong>Cadence: Continuous On-Demand</strong><br>Multi-cloud service mesh with automated anomaly remediation, predictive autoscaling, zero-trust cryptographic identities, and zero downtime.'
        }
      ]
    }
  },

  // 34. Interactive Video Preset 2: Fiber Splice Quality & Fusion Splicer Calibration
  {
    id: 'iv-fiber-splice-calibration',
    componentId: 'interactive-video',
    title: 'Fiber Splice Quality & Fusion Splicer Calibration',
    name: 'Fiber Splice Quality & Fusion Splicer Calibration',
    description: 'Field engineering video walkthrough detailing precision optical fiber cleaving, V-groove cleaning, and insertion loss verification.',
    domain: 'Field Engineering',
    config: {
      blockTitle: 'FIELD OPTICAL ENGINEERING',
      blockHeadline: 'Precision Fiber Splicing & Quality Assurance',
      blockDesc: 'Watch the optical splicing procedure. Review the timestamped technical callouts to ensure zero-defect optical loss standards.',
      resumeBehaviour: 'manual',
      completionRule: 'allRequiredInteractionsCompleted',
      items: [
        {
          type: 'information',
          timestamp: 15,
          title: 'Safety & Cleave Angle Verification',
          content: 'Always wear safety glasses with side shields. Strip the 250µm buffer coating smoothly and inspect the fiber endface with a precision cleaver to ensure a cleave angle under 0.5°.'
        },
        {
          type: 'information',
          timestamp: 45,
          title: 'V-Groove Cleaning & Electrode Alignment',
          content: 'Clean the splicer V-grooves using 99% electronic-grade isopropyl alcohol. Ensure both single-mode fiber cores are aligned within 0.1µm before initiating the arc discharge.'
        },
        {
          type: 'multipleChoice',
          timestamp: 75,
          title: 'Quality Gate: Estimated Insertion Loss',
          prompt: 'The fusion splicer display reports an estimated loss of 0.08 dB on a critical long-haul DWDM link. What is the mandatory standard operating procedure?',
          options: [
            { text: 'Accept the splice and apply the protective heat shrink sleeve immediately.', correct: false, feedback: 'Incorrect. For core long-haul DWDM links, insertion loss must not exceed 0.02 dB.' },
            { text: 'Cut the splice, re-clean the V-grooves, re-cleave both fiber ends, and execute a fresh fusion arc.', correct: true, feedback: 'Correct! Re-cleaving and re-splicing ensures network reliability and prevents premature optical budget depletion.' },
            { text: 'Increase optical amplifier laser gain downstream to compensate for the loss.', correct: false, feedback: 'Incorrect. Over-amplification introduces non-linear distortion across wavelength channels.' }
          ]
        }
      ]
    }
  },

  // 35. Comparison Matrix Preset 2: Zero Trust SASE vs Legacy Perimeter VPN
  {
    id: 'pm-zerotrust-vs-vpn',
    componentId: 'pricing-comparison',
    title: 'Zero Trust SASE vs Legacy Perimeter VPN Architecture',
    name: 'Zero Trust SASE vs Legacy Perimeter VPN Architecture',
    description: 'Architectural comparison matrix evaluating legacy castle-and-moat VPN security against identity-first Zero Trust SASE.',
    domain: 'Cybersecurity Architecture',
    config: {
      blockTitle: 'ARCHITECTURE COMPARISON',
      blockHeadline: 'Zero Trust SASE vs Legacy Perimeter Security',
      blockDesc: 'Compare foundational security characteristics, lateral movement risks, and user performance metrics across architectures.',
      items: [
        {
          title: 'Legacy Perimeter VPN',
          planName: 'Castle-and-Moat VPN',
          price: 'High Risk',
          priceSub: 'Implicit Trust Model',
          isPopular: false,
          badgeText: 'Legacy Baseline',
          features: [
            { text: 'Broad network-layer access upon login', included: true },
            { text: 'High risk of lateral threat movement', included: true },
            { text: 'Centralized datacenter traffic backhauling', included: true },
            { text: 'Continuous context-aware verification', included: false },
            { text: 'Direct secure cloud SaaS access', included: false },
            { text: 'Microsegmented application boundaries', included: false }
          ],
          buttonText: 'Review Legacy Constraints'
        },
        {
          title: 'Zero Trust SASE Architecture',
          planName: 'Cloud-Delivered SASE',
          price: 'Zero Trust',
          priceSub: 'Least-Privilege Model',
          isPopular: true,
          badgeText: 'Recommended Standard',
          features: [
            { text: 'Application-level microsegmented access', included: true },
            { text: 'Lateral movement blocked by default', included: true },
            { text: 'Distributed local edge cloud breakouts', included: true },
            { text: 'Continuous context-aware verification', included: true },
            { text: 'Direct secure cloud SaaS access', included: true },
            { text: 'Microsegmented application boundaries', included: true }
          ],
          buttonText: 'Adopt Zero Trust SASE'
        }
      ]
    }
  },

  // 36. Learning Audio Player Preset 2: Executive Briefing on 5G Standalone & Slicing
  {
    id: 'ap-5g-standalone-slicing',
    componentId: 'audio-player',
    title: 'Executive Briefing: 5G Standalone & Dynamic Network Slicing',
    name: 'Executive Briefing: 5G Standalone & Dynamic Network Slicing',
    description: 'Chaptered executive audio overview exploring how 5G Standalone Core enables dedicated enterprise virtual network slices with guaranteed QoS.',
    domain: 'Executive Briefing',
    config: {
      audioTitle: '5G Standalone Core & Enterprise Network Slicing',
      audioSubtitle: 'Strategic Technology Briefing for Enterprise Leaders',
      audioDescription: 'Listen to this chaptered briefing to understand how 5G Standalone architectures unlock dedicated virtual network slices for public safety, IoT, and ultra-reliable low latency applications.',
      playerMode: 'learning',
      items: [
        {
          title: 'Chapter 1: The Transition to 5G Standalone Core',
          timestamp: 0,
          duration: 75,
          content: 'Unlike Non-Standalone 5G which relies on 4G LTE control planes, 5G Standalone (SA) introduces a completely cloud-native, microservices-based core network architecture. This eliminates legacy bottlenecks and enables end-to-end multi-gigabit throughput.',
          takeaway: '5G Standalone is fully decoupled from 4G core, enabling cloud-native orchestration.'
        },
        {
          title: 'Chapter 2: Dynamic Network Slicing Architecture',
          timestamp: 75,
          duration: 90,
          content: 'Network slicing allows physical infrastructure to be partitioned into multiple isolated, independent virtual networks. Each slice can be tailored with specific latency, throughput, jitter, and security profiles guaranteed by SLA.',
          takeaway: 'Slicing creates isolated virtual networks with dedicated quality of service on shared spectrum.'
        },
        {
          title: 'Chapter 3: Enterprise Use Cases & Public Safety',
          timestamp: 165,
          duration: 80,
          content: 'From FirstNet priority preemption for emergency responders to ultra-low-latency remote robotics in smart manufacturing plants, network slicing provides guaranteed performance regardless of surrounding public network congestion.',
          takeaway: 'Critical enterprise and emergency traffic remains protected and prioritized during peak events.'
        }
      ]
    }
  },

  // 37. Comparison Slider Preset 2: Optical Fiber Endface Inspection
  {
    id: 'cs-optical-fiber-inspection',
    componentId: 'comparison-slider',
    title: 'Optical Fiber Endface Inspection: Contaminated vs Cleaned',
    name: 'Optical Fiber Endface Inspection: Contaminated vs Cleaned',
    description: 'Visual before-and-after microscopic inspection comparing contaminated optical fiber ferrule against an IEC 61300-3-35 compliant cleaned endface.',
    domain: 'Fiber Optics & Quality',
    config: {
      blockTitle: 'OPTICAL QUALITY ASSURANCE',
      blockHeadline: 'Microscopic Fiber Endface Inspection',
      blockDesc: 'Drag the slider to inspect the optical fiber ferrule under 400x magnification before and after precision dry-cleaning.',
      beforeLabel: 'Contaminated Fiber Endface (High dB Loss)',
      afterLabel: 'IEC Compliant Cleaned Endface (Zero Defect)',
      items: [
        {
          beforeLabel: 'Contaminated (High Loss)',
          afterLabel: 'IEC Cleaned (Zero Defect)',
          beforeAltText: 'Microscope view of fiber endface with oil and dust particles covering the core',
          afterAltText: 'Microscope view of pristine fiber core free of all debris and scratches'
        }
      ]
    }
  },

  // 38. Horizontal Timeline Preset 2: Mobile Telecommunications Generational Evolution
  {
    id: 'ht-telecom-evolution',
    componentId: 'horizontal-timeline',
    title: 'Generational Mobile Evolution: 1G Analog to 5G Advanced & 6G',
    name: 'Generational Mobile Evolution: 1G Analog to 5G Advanced & 6G',
    description: 'Chronological roadmap tracing the revolutionary leaps in wireless networking speed, architecture, and connected ecosystems.',
    domain: 'Telecommunications History',
    config: {
      blockTitle: 'WIRELESS GENERATIONS',
      blockHeadline: 'The Evolution of Mobile Connectivity',
      blockDesc: 'Explore how mobile network architectures evolved from early analog voice channels to intelligent 5G and future 6G networks.',
      items: [
        {
          date: '1980s (1G)',
          title: '1G: Analog Voice Services',
          content: 'Introduction of cellular analog voice telephony using AMPS standards. Bulky handsets, unencrypted radio links, and basic voice-only calling.',
          badge: 'Analog Voice',
          badgeType: 'info'
        },
        {
          date: '1990s (2G)',
          title: '2G: Digital Voice & SMS',
          content: 'Transition to digital GSM/CDMA networks introducing text messaging (SMS), digital encryption, and basic circuit-switched data (9.6 kbps).',
          badge: 'Digital Text',
          badgeType: 'info'
        },
        {
          date: '2000s (3G)',
          title: '3G: Mobile Broadband & Web',
          content: 'Packet-switched mobile internet (HSPA/UMTS) enabling web browsing, email on smartphones, and early streaming media at megabit speeds.',
          badge: 'Mobile Web',
          badgeType: 'info'
        },
        {
          date: '2010s (4G LTE)',
          title: '4G LTE: All-IP & App Ecosystem',
          content: 'All-IP flat network architecture powering the global app economy, HD mobile video streaming, mobile banking, and high-speed multi-megabit connectivity.',
          badge: 'All-IP Broadband',
          badgeType: 'primary'
        },
        {
          date: '2020s (5G & Beyond)',
          title: '5G & 6G: Intelligent Edge Mesh',
          content: 'Ultra-low sub-millisecond latency, multi-gigabit throughput, dynamic network slicing, massive IoT scale, and foundation for AI-native 6G networks.',
          badge: 'Gigabit & Edge AI',
          badgeType: 'success'
        }
      ]
    }
  },

  // 39. Interactive Video Preset 3: High-Voltage Substation Field Safety Protocol
  {
    id: 'iv-high-voltage-safety',
    componentId: 'interactive-video',
    title: 'High-Voltage Substation Field Safety & Lockout/Tagout',
    name: 'High-Voltage Substation Field Safety & Lockout/Tagout',
    description: 'Critical safety video with embedded compliance checkpoints for personal protective equipment, voltage testing, and isolation boundaries.',
    domain: 'Field Safety & EHS',
    config: {
      blockTitle: 'FIELD SAFETY PROTOCOLS',
      blockHeadline: 'Substation High-Voltage Safety & LOTO Verification',
      blockDesc: 'Follow the field technician through the substation entry protocol. Respond to safety verification prompts before energized work begins.',
      resumeBehaviour: 'automaticAfterCorrectAnswer',
      completionRule: 'allRequiredInteractionsCompleted',
      items: [
        {
          type: 'information',
          timestamp: 20,
          title: 'Step 1: Arc Flash PPE & Perimeter Boundary',
          content: 'Verify Category 4 Arc Flash suit, voltage-rated rubber gloves with leather protectors (tested within 6 months), and full-face shield before entering the secondary transformer enclosure.'
        },
        {
          type: 'multipleChoice',
          timestamp: 50,
          title: 'Step 2: Live-Dead-Live Voltage Testing Verification',
          prompt: 'Before applying grounding clamps to an isolated bus bar, what is the mandatory sequence for testing your digital voltage detector?',
          options: [
            { text: 'Test the detector on a known live source, verify the de-energized bus bar reads zero, then immediately re-test the detector on the known live source.', correct: true, feedback: 'Correct! The three-point Live-Dead-Live test proves your measurement device did not fail during testing.' },
            { text: 'Visual inspection of the breaker disconnect switch is sufficient if the red indicator flag is visible.', correct: false, feedback: 'Incorrect. Mechanical indicators can fail; physical voltage testing is non-negotiable.' },
            { text: 'Touch the back of your gloved hand lightly against the conduit to check for static discharge.', correct: false, feedback: 'Incorrect. Never use personal touch to verify electrical isolation.' }
          ]
        },
        {
          type: 'information',
          timestamp: 85,
          title: 'Step 3: Multi-Lock Hasp & Zero Energy Lockout',
          content: 'Apply your personal safety padlock and danger tag to the master lockout hasp. Retain your individual key on your person; never share or leave lockout keys unattended.'
        }
      ]
    }
  },

  // 40. Learning Audio Player Preset 3: Mentorship on Transitioning to Tech Leadership
  {
    id: 'ap-mentorship-leadership',
    componentId: 'audio-player',
    title: 'Mentorship Dialogue: Transitioning from Engineer to Technical Leader',
    name: 'Mentorship Dialogue: Transitioning from Engineer to Technical Leader',
    description: 'In-depth mentor discussion exploring the mindset shift from individual technical delivery to delegation, coaching, and strategic influence.',
    domain: 'Professional Mentorship',
    config: {
      audioTitle: 'Transitioning from Senior Engineer to Technical Leader',
      audioSubtitle: 'Executive Mentorship & Engineering Career Development',
      audioDescription: 'Join our Distinguished Network Architect as they unpack key inflection points, common pitfalls, and leverage multipliers when advancing into technical leadership roles.',
      playerMode: 'podcast',
      items: [
        {
          title: '1. The Multiplier Mindset',
          timestamp: 0,
          duration: 90,
          content: 'As an individual contributor, your output was measured by lines of code, tickets resolved, and architecture documents authored. As a lead, your success is measured by the output, velocity, and psychological safety of the entire engineering team.',
          takeaway: 'Shift from personal output to team leverage and capability building.'
        },
        {
          title: '2. The Art of Strategic Delegation',
          timestamp: 90,
          duration: 85,
          content: 'Resist the temptation to take on the hardest technical tasks yourself during crunches. Delegating high-visibility challenges with clear guardrails accelerates your team’s technical maturity.',
          takeaway: 'Delegate problems and boundaries, not just repetitive tasks.'
        },
        {
          title: '3. Communicating with Business Stakeholders',
          timestamp: 175,
          duration: 95,
          content: 'Executive leaders think in terms of risk mitigation, revenue enablement, and customer time-to-market. Frame technical debt and refactoring proposals in terms of business velocity and SLA protection.',
          takeaway: 'Translate technical architecture into measurable business value.'
        }
      ]
    }
  },

  // 41. Comparison Slider Preset 3: Brand Guidelines Compliance vs Non-Compliant
  {
    id: 'cs-brand-identity-compliance',
    componentId: 'comparison-slider',
    title: 'Design System Inspection: Brand Compliant vs Non-Compliant Layout',
    name: 'Design System Inspection: Brand Compliant vs Non-Compliant Layout',
    description: 'Interactive QA inspection highlighting compliant AT&T Blue/Aleck Sans typography vs unapproved legacy colors and low-contrast elements.',
    domain: 'Brand & UX Standards',
    config: {
      blockTitle: 'BRAND QUALITY CONTROL',
      blockHeadline: 'Enterprise Design System Compliance Review',
      blockDesc: 'Drag the inspection slider to compare an unapproved, low-contrast legacy mockup against an official AT&T Brand Design System certified layout.',
      beforeLabel: 'Non-Compliant Mockup (Contrast & Color Violations)',
      afterLabel: 'Certified AT&T Layout (100% Brand & WCAG AA)',
      items: [
        {
          beforeLabel: 'Non-Compliant (Violations)',
          afterLabel: 'Certified (100% Brand)',
          beforeAltText: 'UI mockup with unapproved grey colors and failing contrast ratios',
          afterAltText: 'UI mockup with official AT&T Blue, Aleck Sans typography, and passing WCAG contrast'
        }
      ]
    }
  },

  // 42. Comparison Matrix Preset 3: Enterprise Learning Pathways
  {
    id: 'pm-career-pathways',
    componentId: 'pricing-comparison',
    title: 'Enterprise Technical Learning Pathways: Cloud Architect vs DevOps Lead',
    name: 'Enterprise Technical Learning Pathways: Cloud Architect vs DevOps Lead',
    description: 'Compare curriculum milestones, lab prerequisites, certification requirements, and career specializations across technical tracks.',
    domain: 'Workforce Development',
    config: {
      blockTitle: 'CAREER ACCELERATION PATHWAYS',
      blockHeadline: 'Choose Your Advanced Technical Specialization',
      blockDesc: 'Compare curriculum roadmaps, hands-on lab hours, and industry certifications across our two flagship engineering academies.',
      items: [
        {
          title: 'Cloud Solutions Architect Track',
          planName: 'Cloud Solutions Architect',
          price: '120 Hours',
          priceSub: 'Comprehensive Track',
          isPopular: false,
          badgeText: 'Architecture Focus',
          features: [
            { text: 'Multi-cloud networking & hybrid VPC design', included: true },
            { text: 'Zero-trust identity & data governance models', included: true },
            { text: 'High-availability & disaster recovery planning', included: true },
            { text: 'Hands-on architectural review board defense', included: true },
            { text: 'Kubernetes GitOps & CI/CD deployment pipelines', included: false },
            { text: 'Custom Linux kernel tuning & eBPF tracing', included: false }
          ],
          buttonText: 'Enroll in Architecture Track'
        },
        {
          title: 'DevOps & Site Reliability Lead Track',
          planName: 'DevSecOps & SRE Lead',
          price: '140 Hours',
          priceSub: 'Intensive Hands-On Track',
          isPopular: true,
          badgeText: 'High Demand',
          features: [
            { text: 'Infrastructure as Code (IaC) with Terraform & Ansible', included: true },
            { text: 'Production Kubernetes cluster automation & mesh', included: true },
            { text: 'Automated canary rollouts & chaos engineering', included: true },
            { text: 'OpenTelemetry, Prometheus & Grafana alerting', included: true },
            { text: '24/7 incident response & blameless post-mortem SLA', included: true },
            { text: 'Full-stack multi-cloud architecture review', included: true }
          ],
          buttonText: 'Enroll in DevOps/SRE Track'
        }
      ]
    }
  },

  // 43. Vertical Timeline Preset 2: Major Network Incident Triage & Recovery
  {
    id: 'vt-outage-recovery-timeline',
    componentId: 'vertical-timeline',
    title: 'Critical P1 Outage Incident Triage & Recovery (0 to 180 Minutes)',
    name: 'Critical P1 Outage Incident Triage & Recovery (0 to 180 Minutes)',
    description: 'Time-critical operational milestones from automated telemetry alarm, war room creation, splice repair, to customer executive signoff.',
    domain: 'Incident Operations',
    config: {
      blockTitle: 'INCIDENT RESPONSE TIMELINE',
      blockHeadline: 'P1 Transport Network Fiber Cut Recovery',
      blockDesc: 'Chronological timeline of operational actions executed by the Global NOC, field splicing crews, and executive incident commanders.',
      timelineCategoriesEnabled: true,
      timelineCollapsibleDetails: true,
      timelineChronologicalReveal: true,
      timelineShowProgress: true,
      items: [
        {
          date: '00:00 - T+5 min',
          title: 'Optical Loss Alarm & Automated SIEM Correlation',
          content: 'DWDM optical transponder loses signal on redundant Metro Fiber Ring Segment B. Real-time telemetry correlates optical loss with a third-party construction utility dig.',
          category: 'DETECTION'
        },
        {
          date: 'T+15 min',
          title: 'CSIRT & NOC Level-1 Priority Bridge Activated',
          content: 'Incident Commander opens the executive bridge. Traffic automatically reroutes over Segment A with zero packet drop while field technicians are dispatched to splice location.',
          category: 'TRIAGE'
        },
        {
          date: 'T+45 min',
          title: 'Field Crew On-Site & OTDR Fault Localization',
          content: 'Field optical engineers pinpoint the physical fiber damage 3.2 miles east of Central Office using Optical Time-Domain Reflectometry (OTDR).',
          category: 'FIELD REPAIR'
        },
        {
          date: 'T+120 min',
          title: 'Fusion Splicing & Optical Link Budget Testing',
          content: 'Engineers complete precision fusion splicing of 48 optical strands with average splice loss under 0.02 dB across all DWDM channels.',
          category: 'VERIFICATION'
        },
        {
          date: 'T+180 min',
          title: 'Full Service Restoration & Executive Signoff',
          content: 'BGP peering routes return to optimal symmetric paths. The Incident Commander issues the final all-clear resolution notice to enterprise stakeholders.',
          category: 'RESOLUTION'
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


