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
    description: 'Explore the physical diagnostic indicators, redundant fiber uplinks, and management ports on enterprise edge hardware.',
    domain: 'Field Engineering',
    config: {
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
          y: '35'
        },
        {
          title: 'Out-of-Band (OOB) Console & Management Port',
          content: 'Dedicated RJ-45 serial and Ethernet management interface isolated from customer traffic planes for emergency remote recovery and firmware flashing.',
          x: '48',
          y: '32'
        },
        {
          title: 'System Health & Alarm Status LEDs',
          content: 'Tri-color status LEDs indicating power supply health, thermal sensor thresholds, fan tray tachometer telemetry, and active environmental alarms.',
          x: '75',
          y: '28'
        },
        {
          title: 'Redundant Hot-Swappable Power Supply Unit (PSU)',
          content: 'Dual AC/DC redundant power supply modules supporting zero-downtime field replacement during active customer traffic forwarding.',
          x: '82',
          y: '70'
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
  }
];

export function getPresetsForComponent(componentId) {
  if (!componentId) return [];
  return WORKPLACE_PRESETS.filter(preset => preset.componentId === componentId);
}

export function getPresetById(presetId) {
  return WORKPLACE_PRESETS.find(preset => preset.id === presetId) || null;
}

