
import { db } from '../lib/supabase.js'

// Safe ID quoting for onclick attrs: integers pass as-is, UUID strings get single-quoted
const Q = id => typeof id === 'string' ? `'${id}'` : id

/* ════════ DATA ════════ */
const ROLES={
  legal:      {name:"Nitin",        role:"Legal Team",      av:"NI", team:"L", canCreate:true},
  finance:    {name:"Neha",         role:"Finance Team",    av:"NE", team:"F", canCreate:false},
  business:   {name:"Pankaj Mehta", role:"Business Team",   av:"PM", team:"B", canCreate:false},
  compliance: {name:"Nikhil",       role:"Compliance Team", av:"NK", team:"C", canCreate:false}
};

// teamAging: days each team has been in current status (for display)
let AGs=[
  // ── 1. Meridian Finance — E2E (Buy & Sell, Excel fulfilment) ───────────────────
  {
    id:1, client:'Meridian Finance Limited', tag:'MFL', ct:'ct-b',
    sD:'2026-01-10', type:'API / Direct', st:'review', clientStatus:'responded',
    tm:{L:'tc-green',F:'tc-yellow',C:'tc-none',B:'tc-green'},
    ms:{L:'Approved',F:'Under Review',C:'Pending',B:'Approved'},
    teamAging:{L:null,F:'+3d',C:null,B:null},
    ag:'+3d', ac:'ag-warn', lu:'2026-06-10',
    sp:{L:'Nitin',F:'Neha',C:'Nikhil',B:'Pankaj Mehta'},
    pd:'2026-07-01',
    clientDates:{draftStart:'2026-01-10',latestModified:'2026-06-04',effectiveDate:'2026-07-01',signingDate:'',endDate:'2027-01-09'},
    doc:'https://docs.google.com/document/d/1mtLDflMAwkKM-RGZ1pABfJEpS1GcWAqW/edit',
    remarks:[
      {author:'Nitin',role:'Legal',ts:'2026-05-15 10:00',txt:'D1 sent — standard E2E Buy & Sell template used. Revenue share at 15% as per business approval.'},
      {author:'Pankaj Mehta',role:'Business',ts:'2026-05-20 14:30',txt:'Meridian confirmed interest. Client wants payment cycle changed from 30 to 45 days.'},
      {author:'Neha',role:'Finance',ts:'2026-06-10 11:00',txt:'45-day payment cycle acceptable but need prefunded advance account clause confirmed. Awaiting Legal to revise Annexure A.'}
    ],
    hist:[
      {d:'2026-01-10 10:00',t:'Legal',b:'Nitin',f:'—',to:'Pending'},
      {d:'2026-05-15 10:00',t:'Legal',b:'Nitin',f:'Pending',to:'Approved'},
      {d:'2026-05-18 09:00',t:'Business',b:'Pankaj Mehta',f:'Pending',to:'Approved'},
      {d:'2026-06-10 11:00',t:'Finance',b:'Neha',f:'Pending',to:'Under Review'}
    ],
    drafts:[
      {n:'D1',date:'2026-01-15',dir:'sent',note:'Initial draft — GyfTR standard E2E Buy & Sell template. Revenue share 15%, 30-day payment cycle, 12-month term.'},
      {n:'D2',date:'2026-02-01',dir:'received',note:'Meridian returned with 4 changes: payment cycle 45 days, liability cap increase, non-solicitation period reduced to 6 months, added KYC clause.'},
      {n:'D3',date:'2026-02-20',dir:'sent',note:'GyfTR counter: accepted 45-day payment cycle. Liability cap at 3 months fees. Non-solicitation held at 12 months.'},
      {n:'D4',date:'2026-06-04',dir:'received',note:'Meridian accepted D3 terms. Minor edit on escalation matrix contact details only.'}
    ],
    clauses:[
      {
        no:'2',name:'Scope of Work — Fulfilment Method',outcome:'accepted',
        full:'Meridian requested addition of API fulfilment alongside Excel file delivery. GyfTR agreed to include API as an optional fulfilment channel subject to technical integration.',
        changes:[
          'GyFTR to send GV/Coupons to Client in a password protected excel file to registered email ID.',
          'Client requested API integration as primary fulfilment channel in addition to Excel.',
          'GyfTR accepted. Clause updated: fulfilment via (a) password-protected Excel, or (b) API/Proprietary Software at Client option.',
          'No further change.'
        ]
      },
      {
        no:'5',name:'Consideration — Payment Cycle',outcome:'partial',
        full:'Initial template had 30-day payment cycle. Meridian cited internal finance processing time and requested 45 days. GyfTR accepted subject to prefunded advance account being maintained.',
        changes:[
          'Client to pay Consideration within 30 days of invoice date. Prefunded advance account to be maintained.',
          'Client requested 45-day payment cycle citing internal finance approval timelines.',
          'GyfTR counter-accepted 45 days subject to minimum prefunded balance of Rs 5 Lakhs being maintained at all times.',
          'Client accepted 45-day cycle and prefunded balance requirement.'
        ]
      },
      {
        no:'11',name:'Non-Solicitation and Anti-Poaching',outcome:'held',
        full:'Meridian proposed reducing the non-solicitation period from 12 months to 6 months post-termination. GyfTR held firm at 12 months citing merchant relationship protection.',
        changes:[
          'Non-solicitation period: 12 months post termination. Client shall not approach GyfTR merchants directly.',
          'Client proposed reducing non-solicitation to 6 months post termination.',
          'GyfTR declined — 12 months is non-negotiable to protect merchant network investment.',
          'Client accepted 12-month non-solicitation period.'
        ]
      },
      {
        no:'13',name:'Indemnity — Liability Cap',outcome:'partial',
        full:'Template had liability cap at 3 months fees. Meridian requested increase to 6 months. Settled at 4 months as a compromise.',
        changes:[
          'Liability of GyfTR capped at Consideration paid during 3 months prior to the date of claim.',
          'Client requested liability cap increased to 6 months of fees paid.',
          'GyfTR counter-proposed 4 months as compromise.',
          'Both parties agreed on 4-month liability cap.'
        ]
      },
      {
        no:'4',name:'Permitted Use — KYC Obligations',outcome:'accepted',
        full:'Meridian added a clause requiring GyfTR to confirm KYC compliance of End Customers for semi-closed PPI instruments. GyfTR accepted as it aligns with existing RBI obligations.',
        changes:[
          'Client responsible for KYC of End Customers as per PPI regulations.',
          'Client proposed GyfTR to also confirm KYC-compliant merchant list and share periodically.',
          'GyfTR accepted — will share KYC-compliant merchant list quarterly.',
          'No further change.'
        ]
      }
    ],
    _docComments:[
      {id:'cmt-mfl-1',quote:'Client to pay Consideration within 45 days of invoice date. Prefunded advance account to be maintained.',author:'Neha',role:'Finance Team',team:'F',avatar:'NE',ts:'4 Jun, 11:30',text:'The 45-day cycle is approved by Finance. However, Annexure A must be updated to formally capture the Rs 5L prefunded balance requirement — without this it remains an oral commitment only and cannot be enforced if the client defaults.',resolved:false,replies:[{author:'Nitin',role:'Legal Team',team:'L',avatar:'NI',ts:'4 Jun, 14:15',body:'Noted — I will revise Annexure A this week to include the prefund clause explicitly. Will circulate draft by Friday EOD for Finance sign-off before we send D5.'}]},
      {id:'cmt-mfl-2',quote:'Liability of GyfTR capped at Consideration paid during 4 months prior to the date of claim.',author:'Nitin',role:'Legal Team',team:'L',avatar:'NI',ts:'5 Jun, 09:45',text:'The 4-month cap is a step up from our standard 3-month. Based on current fee run-rate (~Rs 3L/month), maximum exposure is Rs 12L. Finance please confirm this is within acceptable risk bounds.',resolved:false,replies:[{author:'Neha',role:'Finance Team',team:'F',avatar:'NE',ts:'5 Jun, 11:00',body:'Finance reviewed — Rs 12L exposure at current run-rate is within acceptable risk limits. Approved. Proceed with 4-month cap.'},{author:'Pankaj Mehta',role:'Business Team',team:'B',avatar:'PM',ts:'5 Jun, 13:30',body:'Business also aligned. Meridian is a strategic account — this is a reasonable concession to close the deal.'}]},
      {id:'cmt-mfl-3',quote:'GyfTR shall share KYC-compliant merchant list to the Client on a quarterly basis.',author:'Nikhil',role:'Compliance Team',team:'C',avatar:'NK',ts:'6 Jun, 10:20',text:"Compliance reviewed this obligation. The quarterly merchant list must follow RBI's updated PPI guidelines (Circular DPSS.CO.PD No. 1022, 2026). Ensure list format and data fields are aligned before the first quarterly submission.",resolved:false,replies:[]},
      {id:'cmt-mfl-4',quote:'Non-solicitation period: 12 months post termination. Client shall not approach GyfTR merchants directly.',author:'Pankaj Mehta',role:'Business Team',team:'B',avatar:'PM',ts:'7 Jun, 16:00',text:'Business fully supports the 12-month non-solicitation. Meridian has shown interest in directly onboarding 2-3 of our merchant partners — this clause is critical protection.',resolved:true,replies:[{author:'Nitin',role:'Legal Team',team:'L',avatar:'NI',ts:'7 Jun, 16:45',body:'Agreed. Clause held firm in D3, accepted by Meridian in D4. Marking resolved.'}]}
    ]
  },

  // ── 2. Meridian Finance — API Integration Agreement ────────────────────────────
  {
    id:2, client:'Meridian Finance — API', tag:'MFA', ct:'ct-p',
    sD:'2026-03-05', type:'API / Direct', st:'review', clientStatus:'negotiating',
    tm:{L:'tc-yellow',F:'tc-yellow',C:'tc-none',B:'tc-green'},
    ms:{L:'Under Review',F:'Under Review',C:'Pending',B:'Approved'},
    teamAging:{L:'+2d',F:'+1d',C:null,B:null},
    ag:'+2d', ac:'ag-warn', lu:'2026-06-08',
    sp:{L:'Nitin',F:'Neha',C:'Nikhil',B:'Pankaj Mehta'},
    pd:'2026-06-30',
    clientDates:{draftStart:'2026-03-05',latestModified:'2026-06-01',effectiveDate:'2026-07-01',signingDate:'',endDate:'2027-03-04'},
    doc:'https://docs.google.com/document/d/19GynpWHuPzVZqyQXCIcRkkXCl4Zaji0P/edit',
    remarks:[
      {author:'Nitin',role:'Legal',ts:'2026-03-10 09:00',txt:'API template sent. Key additions vs E2E: Proprietary Software clause, API uptime SLA, data security obligations.'},
      {author:'Pankaj Mehta',role:'Business',ts:'2026-04-05 15:00',txt:'Meridian happy with API access. Dispute on uptime SLA — they want 99.9%, we offered 99.5%.'},
      {author:'Neha',role:'Finance',ts:'2026-06-08 10:30',txt:'Revenue share model needs clarification. Is it on MRP or selling price? Need Legal to specify in Annexure A clearly.'}
    ],
    hist:[
      {d:'2026-03-05 09:00',t:'Legal',b:'Nitin',f:'—',to:'Pending'},
      {d:'2026-03-10 09:00',t:'Legal',b:'Nitin',f:'Pending',to:'Under Review'},
      {d:'2026-04-02 10:00',t:'Business',b:'Pankaj Mehta',f:'Pending',to:'Approved'},
      {d:'2026-06-08 10:30',t:'Finance',b:'Neha',f:'Pending',to:'Under Review'}
    ],
    drafts:[
      {n:'D1',date:'2026-03-10',dir:'sent',note:'Initial draft — API integration template. Includes Proprietary Software clause (Cl.3), API SLA at 99.5% uptime, 30-day payment cycle.'},
      {n:'D2',date:'2026-04-01',dir:'received',note:'Client returned: requested 99.9% uptime SLA, unlimited liability for data breach, removed non-solicitation entirely.'},
      {n:'D3',date:'2026-05-02',dir:'sent',note:'GyfTR counter: 99.7% uptime (compromise), liability cap maintained at 3 months fees, non-solicitation held at 12 months.'},
      {n:'D4',date:'2026-06-01',dir:'received',note:'Client accepted uptime 99.7%. Still disputing liability cap for data breach — wants carve-out for data breach from overall cap.'}
    ],
    clauses:[
      {
        no:'2',name:'Scope — API Access & Proprietary Software',outcome:'accepted',
        full:'API template includes Proprietary Software access via secure login. Client to use Digital Code Management System (DCMS) to manage and track GV/Coupon inventory in real time.',
        changes:[
          'GyfTR to provide API or username/password access to pull GV/Coupons from GyfTR server in real time. Client to use Proprietary Software (DCMS) for tracking.',
          'Client requested dedicated sandbox environment for testing before go-live.',
          'GyfTR accepted — sandbox access for 30 days pre-launch included.',
          'No further change.'
        ]
      },
      {
        no:'3',name:'Use of Proprietary Software — Security',outcome:'accepted',
        full:'Client solely responsible for all actions under its account. GyfTR not liable for unauthorized use arising from Client failure to maintain account confidentiality.',
        changes:[
          'Client solely responsible for account security. Must notify GyfTR immediately of any breach.',
          'Client requested GyfTR to implement 2FA on the Proprietary Software.',
          'GyfTR accepted — 2FA to be implemented within 60 days of signing.',
          'Client accepted. No further change.'
        ]
      },
      {
        no:'6',name:'API Uptime SLA',outcome:'partial',
        full:'Client requested 99.9% uptime which GyfTR could not guarantee given current infrastructure. Settled at 99.7% with 4-hour P1 resolution window and monthly credit mechanism.',
        changes:[
          'API uptime SLA: 99.5% monthly measured availability. No penalty specified.',
          'Client requested upgrade to 99.9% uptime with hourly measurement window and 10% credit per breach.',
          'GyfTR counter: 99.7% uptime, 4-hour P1 resolution, 5% credit per breach capped at 15% per quarter.',
          'Client accepted 99.7% SLA and 5% credit mechanism.'
        ]
      },
      {
        no:'13',name:'Indemnity — Data Breach Carve-out',outcome:'pending',
        full:'Client wants data breach liability carved out from the overall 3-month fee cap, arguing data breach exposure is unlimited under IT Act. GyfTR legal reviewing with compliance. Still unresolved.',
        changes:[
          'Liability of GyfTR capped at Consideration paid during 3 months prior to date of claim. All liabilities subject to this cap.',
          'Client demanded data breach liability carved out from cap — unlimited liability for any breach of data security obligations.',
          'GyfTR declined unlimited liability. Counter: data breach cap at 12 months fees paid, separate from operational cap of 3 months.',
          'Client partially accepted. Still negotiating cap amount for data breach — client wants 24 months, GyfTR offered 12 months.'
        ]
      },
      {
        no:'11',name:'Non-Solicitation',outcome:'held',
        full:'Client attempted to remove non-solicitation clause entirely, arguing it restricts their ability to work with merchants independently. GyfTR held firm — this clause is in every agreement.',
        changes:[
          'Non-solicitation period: 12 months post termination.',
          'Client proposed removing non-solicitation clause entirely.',
          'GyfTR declined — non-negotiable. Clause retained as drafted.',
          'Client accepted non-solicitation clause at 12 months.'
        ]
      }
    ],
    _docComments:[
      {id:'cmt-api-1',quote:'GyfTR accepted — 2FA to be implemented within 60 days of signing.',author:'Nikhil',role:'Compliance Team',team:'C',avatar:'NK',ts:'10 Jun, 10:05',text:'From a compliance standpoint, 60 days is on the longer end for a security commitment of this nature. CERT-In guidelines recommend MFA deployment within 30 days for platforms handling financial data. Recommend pushing back to 45 days max.',resolved:false,replies:[{author:'Nitin',role:'Legal Team',team:'L',avatar:'NI',ts:'10 Jun, 11:30',body:'Good catch. I will propose a 45-day timeline in the next revision and update Cl.3 before sending D5.'}]},
      {id:'cmt-api-2',quote:'99.7% uptime, 4-hour P1 resolution, 5% credit per breach capped at 15% per quarter.',author:'Neha',role:'Finance Team',team:'F',avatar:'NE',ts:'11 Jun, 09:20',text:'Finance concern: the 5% credit cap per breach translates to approximately Rs 15K per quarter at current revenue run-rate. This is too low to be a meaningful deterrent for Meridian. Suggest we move credit to 10% per breach.',resolved:false,replies:[{author:'Pankaj Mehta',role:'Business Team',team:'B',avatar:'PM',ts:'11 Jun, 14:00',body:'Agreed with Finance. Meridian is a high-volume API client — downtime directly impacts their ability to disburse GVs. 10% credit per breach is more appropriate for this SLA tier.'},{author:'Nitin',role:'Legal Team',team:'L',avatar:'NI',ts:'11 Jun, 16:45',body:'Noted. Will revise credit to 8% per breach (compromise) and increase quarterly cap to 20%. This aligns us closer to market and reduces escalation risk.'}]},
      {id:'cmt-api-3',quote:'Client demands unlimited liability for data breaches, citing concerns over potential exposure under the IT Act.',author:'Nitin',role:'Legal Team',team:'L',avatar:'NI',ts:'12 Jun, 08:50',text:'This is the most critical open point. Unlimited liability for data breach is a non-starter. However, the client has valid concerns under the DPDP Act 2023. Compliance to assess what a defensible cap looks like given our ISO 27001 certification plan.',resolved:false,replies:[{author:'Nikhil',role:'Compliance Team',team:'C',avatar:'NK',ts:'12 Jun, 10:15',body:'Compliance position: 12-month cap is reasonable given our PCI-DSS compliance and upcoming ISO 27001 audit. We can offer 24 months ONLY if Meridian agrees to a cybersecurity audit clause and incident response SLA.'}]},
      {id:'cmt-api-4',quote:'Revenue share model needs clarification. Is it on MRP or selling price?',author:'Neha',role:'Finance Team',team:'F',avatar:'NE',ts:'13 Jun, 11:00',text:'This ambiguity in Annexure A must be resolved before signing. MRP vs selling price can create a 3–8% variance on high-denomination GVs. At projected GMV of Rs 2Cr, that is a Rs 6L–16L revenue impact per year. Finance requires this to be explicitly stated as selling price (net of discount).',resolved:true,replies:[{author:'Nitin',role:'Legal Team',team:'L',avatar:'NI',ts:'13 Jun, 15:30',body:'Resolved. Annexure A updated in D4: revenue share is on selling price net of agreed client discount. Language confirmed by Finance. Marking resolved.'}]}
    ]
  },

  // ── 3. Ironclad — White Label Solution ─────────────────────────────────
  {
    id:3, client:'Ironclad Industries', tag:'IRON', ct:'ct-g',
    sD:'2026-04-01', type:'White Label', st:'pending', clientStatus:'awaiting',
    tm:{L:'tc-yellow',F:'tc-none',C:'tc-none',B:'tc-none'},
    ms:{L:'Under Review',F:'Pending',C:'Pending',B:'Pending'},
    teamAging:{L:'+1d',F:null,C:null,B:null},
    ag:'On time', ac:'ag-ok', lu:'2026-06-01',
    sp:{L:'Nitin',F:'Neha',C:'Nikhil',B:'Pankaj Mehta'},
    pd:'2026-07-15',
    clientDates:{draftStart:'2026-04-01',latestModified:'2026-06-01',effectiveDate:'2026-08-01',signingDate:'',endDate:'2027-07-31'},
    doc:'https://docs.google.com/document/d/17-mhtub5pwUDQT__kfNI8e1Liy5Ox9WA/edit',
    remarks:[
      {author:'Nitin',role:'Legal',ts:'2026-04-05 09:00',txt:'WL template sent. This is more complex — includes WhiteLabel website development, payment gateway, API, and direct sending module. All 4 fulfilment methods included.'},
      {author:'Pankaj Mehta',role:'Business',ts:'2026-04-10 11:00',txt:'Ironclad is for channel incentivization. Large deal — ~Rs 2Cr annual GMV expected. Client wants custom branding on WL site.'},
      {author:'Nitin',role:'Legal',ts:'2026-06-01 14:00',txt:'D1 sent. Awaiting client response. Remind in 7 days if no reply.'}
    ],
    hist:[
      {d:'2026-04-01 09:00',t:'Legal',b:'Nitin',f:'—',to:'Pending'},
      {d:'2026-06-01 14:00',t:'Legal',b:'Nitin',f:'Pending',to:'Under Review'}
    ],
    drafts:[
      {n:'D1',date:'2026-06-01',dir:'sent',note:'Initial White Label draft sent — includes WL website development (Annexure C), payment gateway integration, API access, direct sending module, and channel incentivization terms.'}
    ],
    clauses:[
      {
        no:'2',name:'Scope — White Label Website Development',outcome:'pending',
        full:'GyfTR to build and manage a fully branded White Label website for Ironclad channel partners. Includes GV catalogue, payment gateway, order management, and inventory management. Client wants custom domain and branding.',
        changes:[
          'GyfTR to develop WhiteLabel Solution / Website for Client. GVs listed by GyfTR. Payment gateway provided by GyfTR. End-to-end management by GyfTR including orders, inventory, brand vouchers and promotions.'
        ]
      },
      {
        no:'3',name:'API + Direct Sending Module',outcome:'pending',
        full:'In addition to WL website, agreement covers API access for real-time GV pull and direct sending module where GyfTR sends GV directly to End Customer mobile/email.',
        changes:[
          'GyfTR to provide API or username/password for real-time GV/Coupon pull. Additionally, direct sending module: Client shares End Customer mobile/email with GyfTR; GyfTR sends GV directly via email/SMS. All orders to orders@example.com.'
        ]
      },
      {
        no:'5',name:'Consideration — Revenue Share Model',outcome:'pending',
        full:'White Label deals typically have different revenue share structure. To be finalized in Annexure A based on GMV projections. Business has agreed to 12% discount on MRP.',
        changes:[
          'Consideration as per Annexure A. Client to maintain prefunded advance account. Invoice frequency and payment terms as per Annexure A.'
        ]
      }
    ]
  },

  // ── 4. Summit Life Insurance — Placeholder for demo ──────────────────────────
  {
    id:4, client:'Summit Life Insurance', tag:'SLI', ct:'ct-b',
    sD:'2026-05-12', type:'API / Direct', st:'review', clientStatus:'responded',
    tm:{L:'tc-green',F:'tc-yellow',C:'tc-none',B:'tc-green'},
    ms:{L:'Approved',F:'Under Review',C:'Pending',B:'Approved'},
    teamAging:{L:null,F:'+3d',C:null,B:null},
    ag:'+3d', ac:'ag-warn', lu:'2026-06-05',
    sp:{L:'Nitin',F:'Neha',C:'Nikhil',B:'Pankaj Mehta'},
    pd:'2026-07-01',
    clientDates:{draftStart:'2026-05-12',latestModified:'2026-06-04',effectiveDate:'2026-07-01',signingDate:'',endDate:'2027-05-11'},
    doc:'https://docs.google.com/document/d/1mtLDflMAwkKM-RGZ1pABfJEpS1GcWAqW/edit',
    remarks:[
      {author:'Nitin',role:'Legal',ts:'2026-06-01 09:00',txt:'Draft shared with finance team for review.'},
      {author:'Neha',role:'Finance',ts:'2026-06-05 14:22',txt:'Awaiting clarification on revenue share clause — is the 17% on MRP or selling price?'}
    ],
    hist:[
      {d:'2026-05-12 11:30',t:'Legal',b:'Nitin',f:'—',to:'Pending'},
      {d:'2026-06-01 09:00',t:'Legal',b:'Nitin',f:'Pending',to:'Approved'},
      {d:'2026-06-03 10:05',t:'Business',b:'Pankaj Mehta',f:'Pending',to:'Approved'},
      {d:'2026-06-05 14:22',t:'Finance',b:'Neha',f:'Pending',to:'Under Review'}
    ],
    drafts:[
      {n:'D1',date:'2026-05-14',dir:'sent',note:'Initial draft sent to Summit Life. Standard API template. Revenue share 17%.'},
      {n:'D2',date:'2026-05-22',dir:'received',note:'Client returned — 4 changes: revenue share basis clarification, payment cycle 45 days, SLA uptime 99.7%, liability cap increase.'},
      {n:'D3',date:'2026-05-30',dir:'sent',note:'GyfTR counter sent — accepted 45-day cycle, clarified 17% on selling price, held SLA at 99.5%.'},
      {n:'D4',date:'2026-06-04',dir:'received',note:'Summit Life accepted most terms. Still pushing on SLA — want 99.7%.'}
    ],
    clauses:[
      {
        no:'4',name:'Revenue Share — Basis of Calculation',outcome:'partial',
        full:'Dispute on whether the 17% revenue share applies to MRP or actual selling price. Significant financial impact. Settled on selling price.',
        changes:[
          'Revenue share: 17% of net GMV processed through platform.',
          'Client requested clarification — is 17% on MRP or selling price? Client proposed MRP basis.',
          'GyfTR counter: 17% on selling price (discounted price at which GV sold to End Customer). Non-negotiable.',
          'Client accepted 17% on selling price.'
        ]
      },
      {
        no:'5',name:'Payment Cycle',outcome:'accepted',
        full:'Template was 30 days. Summit Life requested 45 days citing internal finance processing. Accepted.',
        changes:[
          'Payment due within 30 days of invoice date.',
          'Client requested 45-day payment cycle.',
          'GyfTR accepted 45-day cycle.',
          'No further change.'
        ]
      },
      {
        no:'6',name:'API Uptime SLA',outcome:'pending',
        full:'Summit Life wants 99.7% SLA. GyfTR currently offering 99.5%. Gap remains. Finance also needs to approve the penalty structure before Legal can agree.',
        changes:[
          'API uptime SLA: 99.5% monthly measured availability.',
          'Client requested upgrade to 99.7% uptime with 5% monthly credit per breach.',
          'GyfTR counter: will match 99.7% if penalty capped at 10% per quarter. Sent to Finance for approval.',
          'Finance has not yet responded. Pending internal approval before GyfTR can confirm.'
        ]
      },
      {
        no:'13',name:'Liability Cap',outcome:'accepted',
        full:'Template at 3 months fees. Client requested 6 months. Settled at 4 months.',
        changes:[
          'Liability cap: 3 months fees paid prior to claim.',
          'Client requested 6-month liability cap.',
          'GyfTR counter: 4 months as compromise.',
          'Client accepted 4-month cap.'
        ]
      }
    ]
  },

  // ── 5. Crestview Bank — Closed / Executed ──────────────────────────────────────
  {
    id:5, client:'Crestview Bank', tag:'CVB', ct:'ct-t',
    sD:'2026-01-05', type:'API / Direct', st:'closed', clientStatus:'finalised',
    tm:{L:'tc-green',F:'tc-green',C:'tc-green',B:'tc-green'},
    ms:{L:'Approved',F:'Approved',C:'Approved',B:'Approved'},
    teamAging:{L:null,F:null,C:null,B:null},
    ag:'On time', ac:'ag-ok', lu:'2026-04-10',
    sp:{L:'Nitin',F:'Neha',C:'Nikhil',B:'Pankaj Mehta'},
    pd:'2026-04-01',
    clientDates:{draftStart:'2026-01-05',latestModified:'2026-04-01',effectiveDate:'2026-05-01',signingDate:'2026-04-10',endDate:'2027-04-30'},
    doc:'https://docs.google.com/document/d/1mtLDflMAwkKM-RGZ1pABfJEpS1GcWAqW/edit',
    remarks:[{author:'Nitin',role:'Legal',ts:'2026-04-10 12:00',txt:'Fully executed. Signed copies filed. Agreement live from 1 May 2026.'}],
    hist:[
      {d:'2026-01-05 09:00',t:'Legal',b:'Nitin',f:'—',to:'Pending'},
      {d:'2026-02-10 10:00',t:'Legal',b:'Nitin',f:'Pending',to:'Approved'},
      {d:'2026-02-15 11:00',t:'Business',b:'Pankaj Mehta',f:'Pending',to:'Approved'},
      {d:'2026-03-01 09:00',t:'Finance',b:'Neha',f:'Under Review',to:'Approved'},
      {d:'2026-03-10 14:00',t:'Compliance',b:'Nikhil',f:'Under Review',to:'Approved'},
      {d:'2026-04-10 12:00',t:'Legal',b:'Nitin',f:'Final Sign',to:'Closed'}
    ],
    drafts:[
      {n:'D1',date:'2026-01-10',dir:'sent',note:'Initial draft sent'},
      {n:'D2',date:'2026-01-25',dir:'received',note:'Client returned with minor edits on payment terms and liability cap'},
      {n:'D3',date:'2026-02-10',dir:'sent',note:'Revised and sent back — all terms agreed'},
      {n:'D4',date:'2026-04-01',dir:'sent',note:'Execution copy sent for signature'}
    ],
    clauses:[
      {no:'5',name:'Payment Terms',outcome:'accepted',full:'Payment cycle changed from 30 to 45 days.',changes:['30 days','Crestview requested 45 days','Accepted','Final']},
      {no:'13',name:'Liability Cap',outcome:'partial',full:'Settled at 4 months from template 3 months.',changes:['3 months fees','Crestview requested 6 months','Counter at 4 months','Agreed 4 months']}
    ]
  },

  // ── 6. Vantage Bank — Reopened ───────────────────────────────────────────────
  {
    id:6, client:'Vantage Bank', tag:'VTB', ct:'ct-r',
    sD:'2026-02-01', type:'Reseller', st:'reopen', clientStatus:'responded',
    tm:{L:'tc-yellow',F:'tc-red',C:'tc-none',B:'tc-green'},
    ms:{L:'Under Review',F:'Pending',C:'Pending',B:'Approved'},
    teamAging:{L:'+3d',F:'+5d',C:null,B:null},
    ag:'+5d', ac:'ag-over', lu:'2026-06-06',
    sp:{L:'Nitin',F:'Neha',C:'Nikhil',B:'Pankaj Mehta'},
    pd:'2026-05-30',
    clientDates:{draftStart:'2026-02-01',latestModified:'2026-06-06',effectiveDate:'',signingDate:'',endDate:''},
    doc:'https://docs.google.com/document/d/1mtLDflMAwkKM-RGZ1pABfJEpS1GcWAqW/edit',
    remarks:[
      {author:'Neha',role:'Finance',ts:'2026-06-06 15:00',txt:'Rejected. Revenue share of 17% is below our minimum threshold of 18% for resellers. Please rework Annexure A and resubmit.'},
      {author:'Nitin',role:'Legal',ts:'2026-06-07 10:30',txt:'Noted. Will rework clauses 5 and Annexure A. New draft by June 15.'}
    ],
    hist:[
      {d:'2026-02-01 11:00',t:'Legal',b:'Nitin',f:'—',to:'Pending'},
      {d:'2026-03-10 09:00',t:'Business',b:'Pankaj Mehta',f:'Pending',to:'Approved'},
      {d:'2026-04-20 10:00',t:'Finance',b:'Neha',f:'Under Review',to:'Approved'},
      {d:'2026-06-06 15:00',t:'Finance',b:'Neha',f:'Approved',to:'Rejected'}
    ],
    drafts:[
      {n:'D1',date:'2026-02-05',dir:'sent',note:'Initial reseller draft. Revenue share 17%. Non-solicitation 12 months. Payment cycle 30 days.'},
      {n:'D2',date:'2026-03-01',dir:'received',note:'Vantage proposed major revision: revenue share 12%, exclusivity in banking channel, 2-year term.'},
      {n:'D3',date:'2026-04-01',dir:'sent',note:'GyfTR counter: revenue share 17% (firm), no exclusivity, 18-month term.'},
      {n:'D4',date:'2026-05-15',dir:'received',note:'Vantage accepted 17% and 18-month term. Withdrew exclusivity request.'},
      {n:'D5',date:'2026-06-01',dir:'sent',note:'Near-final draft sent for internal approval.'},
      {n:'D6',date:'2026-06-06',dir:'received',note:'Finance internally rejected — needs rework'}
    ],
    clauses:[
      {
        no:'5',name:'Revenue Share',outcome:'pending',
        full:'GyfTR standard reseller revenue share is 18% minimum. Business agreed to 17% without Finance sign-off. Finance has now rejected. Needs rework.',
        changes:[
          'GyfTR revenue share: 18% of net GMV (standard reseller rate).',
          'Vantage proposed 12% citing thin reseller margin.',
          'GyfTR counter: 17% flat — accepted by Business team without Finance approval.',
          'Vantage accepted 17%. Sent for internal GyfTR approval.',
          'Near-final at 17% submitted to Finance.',
          'Finance rejected 17% — minimum 18% required for reseller agreements. Must be reworked.'
        ]
      },
      {
        no:'11',name:'Non-Solicitation',outcome:'held',
        full:'Vantage attempted to remove non-solicitation clause citing it restricts their reseller model. GyfTR held firm.',
        changes:[
          'Non-solicitation: 12 months post termination.',
          'Vantage requested removal of non-solicitation clause entirely.',
          'GyfTR declined — mandatory in all reseller agreements.',
          'Vantage accepted 12-month non-solicitation.',
          'No change.',
          'No change.'
        ]
      },
      {
        no:'12',name:'Term',outcome:'partial',
        full:'Template 12 months. Vantage wanted 24 months. Settled at 18 months.',
        changes:[
          '12-month term with auto-renewal on 30-day notice.',
          'Vantage requested 24-month term.',
          'GyfTR counter: 18 months as compromise.',
          'Vantage accepted 18 months.',
          'No change.',
          'No change.'
        ]
      }
    ]
  }
];

/* ════════ SUPABASE INTEGRATION ════════ */
const _SB_STATUS_MAP={'Pending':'tc-none','Under Review':'tc-yellow','Approved':'tc-green','Rejected':'tc-red'};
function _sbColorFromType(t){
  if(!t)return'ct-q';const tl=t.toLowerCase();
  if(tl.includes('api'))return'ct-b';if(tl.includes('white'))return'ct-t';
  if(tl.includes('reseller'))return'ct-p';if(tl.includes('enterprise'))return'ct-a';
  return'ct-q';
}
function _mapSbRow(row,idx){
  const tm={},ms={},teamAging={};
  (row.team_statuses||[]).forEach(ts=>{
    tm[ts.team_code]=_SB_STATUS_MAP[ts.status]||'tc-none';
    ms[ts.team_code]=ts.status;
    teamAging[ts.team_code]=ts.aging_days>0?`+${ts.aging_days}d`:null;
  });
  const drafts=(row.drafts||[]).map(d=>({n:d.draft_no,date:d.date,dir:d.direction,note:d.note||'',filePath:d.file_path}));
  const clauses=(row.clauses||[]).map(c=>({
    no:c.clause_no,name:c.clause_name,outcome:c.outcome,full:c.full_context,
    changes:(c.clause_changes||[]).sort((a,b)=>a.draft_no.localeCompare(b.draft_no)).map(cc=>cc.change_text)
  }));
  const ag={
    id:row.id,_sbId:row.id,
    client:row.client,tag:row.tag||row.client.slice(0,4).toUpperCase(),
    ct:_sbColorFromType(row.type),
    sD:row.start_date,type:row.type,
    st:row.status,clientStatus:row.client_status||'awaiting',
    pd:row.promise_date||'',
    tm,ms,teamAging,
    ag:'On time',ac:'ag-ok',
    lu:(row.updated_at||row.created_at||'').split('T')[0],
    doc:row.doc_link||'',
    sp:{L:row.spoc_legal||'—',F:row.spoc_finance||'—',C:row.spoc_compliance||'—',B:row.spoc_business||'—'},
    remarks:(row.remarks||[]).map(r=>({author:r.author_name,role:r.author_role,ts:(r.created_at||'').replace('T',' ').slice(0,16),txt:r.text})),
    hist:(row.history_log||[]).map(h=>({d:(h.created_at||'').replace('T',' ').slice(0,16),t:h.team,b:h.changed_by,f:h.from_status,to:h.to_status})),
    drafts,clauses,
    clientDates:row.client_dates||{}
  };
  return ag;
}
async function _loadFromSupabase(){
  try{
    const{data,error}=await db.from('agreements').select(`
      *,
      drafts(*),
      team_statuses(*),
      remarks(*),
      history_log(*),
      clauses(*,clause_changes(*))
    `).order('created_at',{ascending:false});
    if(error||!data||data.length===0)return false;
    // Remove previously-loaded Supabase AGs (UUID string IDs), keep sample AGs (integer IDs)
    for(let i=AGs.length-1;i>=0;i--){if(typeof AGs[i].id==='string')AGs.splice(i,1);}
    data.map(_mapSbRow).forEach(a=>AGs.push(a));
    return true;
  }catch(e){return false;}
}

/* ══ GLOBAL STATE ══ */
let reminderLog={};   // {key: [{ts, count}]}
let lastSeenRemarks={}; // {agId: count at last open}

/* ══ PROMISE DATE HELPERS ══ */
function promiseDaysLeft(pd){
  if(!pd)return null;
  return Math.floor((new Date(pd)-new Date())/86400000);
}
function renderPromiseBadge(pd){
  if(!pd)return'<span style="color:#c4cfc7;font-size:11px">—</span>';
  const d=promiseDaysLeft(pd);
  if(d<0)return`<span class="pd-over">Overdue ${Math.abs(d)}d</span>`;
  if(d<=3)return`<span class="pd-warn">Due in ${d}d</span>`;
  return`<span class="pd-ok">Due ${fd(pd)}</span>`;
}

const SC={pending:{l:"Pending",c:"b-pending"},review:{l:"Under Review",c:"b-review"},final:{l:"Final Sign",c:"b-final"},closed:{l:"Closed",c:"b-closed"},reopen:{l:"Reopened",c:"b-reopen"}};
const TF={L:"Legal",F:"Finance",C:"Compliance",B:"Business"};
const TCL={"tc-green":"Approved","tc-yellow":"Under Review","tc-none":"Pending","tc-red":"Rejected"};
// dot CSS class per state
const DOT_CLS={"tc-green":"dot-approved","tc-yellow":"dot-review","tc-none":"dot-pending","tc-red":"dot-rejected"};
const TXT_CLS={"tc-green":"txt-approved","tc-yellow":"txt-review","tc-none":"txt-pending","tc-red":"txt-rejected"};
const CYC=["tc-none","tc-yellow","tc-green","tc-red"];
// aging CSS for per-team aging
function agTeamCls(ag){if(!ag||ag==="On time")return"";if(ag.startsWith("+"))return parseInt(ag)>=5?"ag-team-over":"ag-team-warn";return "";}

let role="legal",selRole="legal",cfKey="all",remAgId=null;
let teamFilterVis={L:true,F:true,C:true,B:true};

/* ════════ HELPERS ════════ */
const fd=d=>{if(!d)return"—";const[y,m,dy]=d.split("-");return`${parseInt(dy)} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m-1]}`};
const ns=()=>{const n=new Date();return`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")} ${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`};
const td=()=>new Date().toISOString().split("T")[0];

// parse "2026-06-05 14:22" → Date
function parseTs(s){const[d,t]=s.split(" ");const[y,mo,dy]=d.split("-");const[h,mi]=(t||"00:00").split(":");return new Date(+y,+mo-1,+dy,+h,+mi);}

// compute duration between two timestamps → "2d 3h" or "45m" etc.
function diffLabel(t1,t2){
  const ms=Math.abs(parseTs(t2)-parseTs(t1));
  const mins=Math.floor(ms/60000);
  if(mins<60)return`${mins}m`;
  const hrs=Math.floor(mins/60),rm=mins%60;
  if(hrs<24)return rm>0?`${hrs}h ${rm}m`:`${hrs}h`;
  const days=Math.floor(hrs/24),rh=hrs%24;
  return rh>0?`${days}d ${rh}h`:`${days}d`;
}

function showToast(m,type=""){
  const t=document.getElementById("toast");
  t.textContent=m;t.className="toast show"+(type?" "+type:"");
  setTimeout(()=>t.classList.remove("show"),2400);
}

/* ════════ LOGIN ════════ */
function pickRole(el,k){
  document.querySelectorAll(".role-pill").forEach(b=>b.classList.remove("sel"));
  el.classList.add("sel");selRole=k;
  const em={legal:"nitin@gyftr.net",finance:"neha@gyftr.net",business:"pankaj.mehta@gyftr.net",compliance:"nikhil@gyftr.net"};
  document.getElementById("loginEmail").value=em[k];
  const pw=document.getElementById("loginPass");if(pw)pw.value="ChangeMe123!";
}
async function doLogin(){
  role=selRole;
  const R=ROLES[role];
  // Try real Supabase auth — falls back silently if offline or unconfigured
  const email=document.getElementById("loginEmail").value.trim();
  const pass=document.getElementById("loginPass").value.trim();
  if(email&&pass){
    try{
      const{error}=await db.auth.signInWithPassword({email,password:pass});
      if(!error){
        const loaded=await _loadFromSupabase();
        if(loaded)showToast("Live data loaded from Supabase","green");
      }
    }catch(e){/* offline / not configured — continue with sample data */}
  }
  document.getElementById("uName").textContent=R.name;
  document.getElementById("uRole").textContent=R.role;
  document.getElementById("uAv").textContent=R.av;
  document.getElementById("newWrap").style.display=R.canCreate?"block":"none";
  const rb=document.getElementById("restrictBar");
  if(!R.canCreate){rb.style.display="block";document.getElementById("restrictRole").textContent=R.role}
  else rb.style.display="none";
  document.getElementById("loginScreen").style.display="none";
  document.getElementById("appShell").style.display="flex";
  // set last login tooltip
  const now=new Date();
  const timeStr=now.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit",hour12:true});
  const tt=document.getElementById("avTooltip");
  if(tt)tt.textContent=`Signed in today at ${timeStr}`;
  updateStats();render(gf());
  checkReminderNotifications();
}
function doSignout(){
  sessionStorage.removeItem('demo_role');
  sessionStorage.removeItem('profile');
  db.auth.signOut().catch(()=>{});
  window.location.href='/index.html';
}

/* ════════ REMINDER NOTIFICATIONS ════════ */
function checkReminderNotifications(){
  const bar=document.getElementById("reminderNotifBar");
  const myTeam=ROLES[role].team;
  if(role==="legal"){bar.classList.remove("show");return;}

  // find all reminders that include my team
  const myReminders=[];
  Object.values(reminderLog).forEach(logs=>{
    logs.forEach(log=>{
      if(log.teams&&log.teams.includes(myTeam)){
        myReminders.push(log);
      }
    });
  });

  if(!myReminders.length){bar.classList.remove("show");return;}

  // show the bar
  bar.classList.add("show");
  document.getElementById("rnTitle").textContent=
    `${myReminders.length} pending reminder${myReminders.length>1?"s":""} from Legal — please action`;

  const items=document.getElementById("rnItems");
  items.innerHTML=myReminders.map(log=>`
    <div class="rn-item">
      <div class="rn-item-client">${log.client}</div>
      <div class="rn-item-from">Reminder from <b>${log.from}</b></div>
      <div class="rn-item-ts">${log.ts}</div>
      <span class="rn-item-badge">Action needed</span>
    </div>`).join("");
}

function dismissReminderBar(){
  document.getElementById("reminderNotifBar").classList.remove("show");
}

/* ════════ STATS ════════ */
function updateStats(){
  const c={all:AGs.length,pending:0,review:0,final:0,closed:0,reopen:0};
  AGs.forEach(a=>{if(c[a.st]!==undefined)c[a.st]++});
  Object.keys(c).forEach(k=>{const el=document.getElementById("s-"+k);if(el)el.textContent=c[k]});
}

/* ════════ RENDER TABLE ════════ */
function render(data){
  const tb=document.getElementById("tbody"),mt=ROLES[role].team;
  tb.innerHTML="";
  data.forEach(a=>{
    const sm=SC[a.st];
    const myS=a.ms[mt]||"Pending";
    const lastRem=a.remarks&&a.remarks.length?a.remarks[a.remarks.length-1]:null;
    const remCount=a.remarks?a.remarks.length:0;

    // Team Review: one row per team — circle · name · aging
    const visTeams=["L","F","C","B"].filter(t=>teamFilterVis[t]);
    const trRows=visTeams.map(t=>{
      const state=a.tm[t];
      const dotCls=DOT_CLS[state]||"dot-pending";
      const statusTxt=TCL[state]||"Pending";
      const ag=a.teamAging?a.teamAging[t]:null;
      const agCls=ag?(parseInt(ag)>=5?"ag-team-over":"ag-team-warn"):"";
      return `<div class="tr-row">
        <span class="tr-dot ${dotCls}" title="${TF[t]}: ${statusTxt}"></span>
        <span class="tr-name">${TF[t]}</span>
        ${ag?`<span class="tr-aging-val ${agCls}">${ag}</span>`:`<span style="font-size:10px;color:#c4cfc7">—</span>`}
      </div>`;
    }).join("");

    // Can this user click team circles? Only their own team (or legal = all)
    const tr=document.createElement("tr");
    const pdLeft=a.pd?promiseDaysLeft(a.pd):null;
    if(pdLeft!==null&&pdLeft<0)tr.classList.add("row-overdue");
    else if(pdLeft!==null&&pdLeft<=3)tr.classList.add("row-dueSoon");
    tr.innerHTML=`
      <td class="gx-td">
        <div style="display:flex;align-items:center;gap:6px">
          <span class="ctag ${a.ct}">${a.tag}</span>
          <div>
            <div style="font-weight:700;font-size:12.5px">${a.client}
              ${role==="legal"?`<button class="pencil-btn" onclick="openClientScreen(${Q(a.id)})" title="Edit client details" style="margin-left:3px">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-9 9H2v-3l9-9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
              </button>`:""}
              <button class="share-btn" onclick="copyAgLink(${Q(a.id)},event)" title="Copy link to this agreement">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M10 2h4v4M14 2l-6 6M7 4H3a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
            </div>
            <div style="font-size:10.5px;color:var(--ink-soft);margin-top:1px">${a.type} · ${fd(a.sD)}</div>
            <div style="margin-top:3px">${renderPromiseBadge(a.pd)}</div>
          </div>
        </div>
      </td>
      <td class="gx-td">${renderClientStatusBadge(a.clientStatus||"awaiting",a.id)}</td>
      <td class="gx-td">
        ${role==="legal"
          ? `<select class="status-sel" onchange="updateAgreementStatus(${Q(a.id)},this.value)">
              <option value="pending"  ${a.st==="pending" ?"selected":""}>Pending</option>
              <option value="review"   ${a.st==="review"  ?"selected":""}>Under Review</option>
              <option value="final"    ${a.st==="final"   ?"selected":""}>Final Sign</option>
              <option value="closed"   ${a.st==="closed"  ?"selected":""}>Closed</option>
              <option value="reopen"   ${a.st==="reopen"  ?"selected":""}>Reopened</option>
            </select>`
          : `<span class="badge ${sm.c}"><span class="bdot"></span>${sm.l}</span>`
        }
      </td>
      <td class="gx-td">
        <select class="mss" onchange="ums(${Q(a.id)},this.value)">
          <option ${myS==="Pending"?"selected":""}>Pending</option>
          <option ${myS==="Under Review"?"selected":""}>Under Review</option>
          <option ${myS==="Approved"?"selected":""}>Approved</option>
        </select>
      </td>
      <td class="gx-td" style="min-width:160px">
        <div class="tr-col" id="trcol-${a.id}">${trRows}</div>
      </td>
      <td class="gx-td" style="min-width:140px">
        <div class="rem-cell">
          ${(lastSeenRemarks[a.id]!==undefined&&remCount>lastSeenRemarks[a.id])?'<span class="rem-new-dot" title="New remarks"></span>':''}
          <span class="rem-preview ${lastRem?'':'empty'}" onclick="openRem(${Q(a.id)})">${lastRem?lastRem.txt:'No remarks yet'}</span>
          <button class="rem-plus" onclick="openRem(${Q(a.id)})" title="${remCount} remark${remCount!==1?'s':''}">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
          ${remCount?`<span class="rem-badge" onclick="openRem(${Q(a.id)})">${remCount}</span>`:""}
        </div>
      </td>
      <td class="gx-td">
        <div style="display:flex;flex-direction:column;gap:4px">
          ${(a.drafts&&a.drafts.length)?`<button class="gx-btn gx-btn-soft" style="padding:4px 9px;font-size:11px;font-weight:700" onclick="openDraftsModal(${Q(a.id)})">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M3 2h8l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.4"/><path d="M11 2v4h3" stroke="currentColor" stroke-width="1.4"/><path d="M5 9h6M5 12h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
            Drafts&nbsp;<span style="background:var(--pop-deep);color:#fff;border-radius:99px;padding:0px 5px;font-size:9px">${a.drafts.length}</span>
          </button>`:`<button class="gx-btn gx-btn-ghost" style="padding:4px 9px;font-size:11px;opacity:.5" onclick="openDraftsModal(${Q(a.id)})">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M3 2h8l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.4"/><path d="M11 2v4h3" stroke="currentColor" stroke-width="1.4"/></svg>
            Drafts
          </button>`}
          <button class="gx-btn gx-btn-ghost" style="padding:4px 9px;font-size:11px" onclick="openHist(${Q(a.id)})">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.5v4l2.5 1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
            Log
          </button>
        </div>
      </td>
      <td class="gx-td">
        <button class="gx-btn gx-btn-soft" style="padding:4px 9px;font-size:11px" onclick="openDoc(${Q(a.id)})">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M3 2h8l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.5"/><path d="M11 2v4h3" stroke="currentColor" stroke-width="1.5"/></svg>Doc
        </button>
      </td>`;
    tr.addEventListener("keydown",e=>{
      if(e.key==="ArrowDown"){const next=tr.nextElementSibling;if(next){next.focus();e.preventDefault();}}
      if(e.key==="ArrowUp"){const prev=tr.previousElementSibling;if(prev){prev.focus();e.preventDefault();}}
    });
    tb.appendChild(tr);
  });
  document.getElementById("rcount").textContent=`${data.length} of ${AGs.length} agreements`;
}

/* ════════ FILTERS ════════ */
function gf(){
  const q=(document.getElementById("sb")?.value||"").toLowerCase();
  const fs=document.getElementById("fSt")?.value||"";
  const ft=document.getElementById("fTy")?.value||"";
  const fm=document.getElementById("fMs")?.value||"";
  const fts=document.getElementById("fTeamSt")?.value||"";
  const mt=ROLES[role].team;
  return AGs.filter(a=>{
    if(q&&!a.client.toLowerCase().includes(q))return false;
    if(fs&&a.st!==fs)return false;
    if(ft&&!a.type.includes(ft))return false;
    if(fm&&a.ms[mt]!==fm)return false;
    if(cfKey!=="all"&&a.st!==cfKey)return false;
    if(fts){
      const active=["L","F","C","B"].filter(k=>teamFilterVis[k]);
      if(!active.some(k=>TCL[a.tm[k]]===fts))return false;
    }
    return true;
  });
}
function ftbl(){render(gf())}
function fstat(el,k){
  document.querySelectorAll(".stat-card").forEach(c=>c.classList.remove("on"));
  el.classList.add("on");cfKey=k;ftbl();
  // scroll table back to top
  const scroll=document.querySelector(".table-scroll");
  if(scroll)scroll.scrollTop=0;
}

/* ════════ TEAM FILTER DROPDOWN ════════ */
function toggleTeamDD(e){
  e.stopPropagation();
  const dd=document.getElementById("teamDD");
  dd.style.display=dd.style.display==="none"?"block":"none";
}
function toggleTeamOpt(team,el){
  teamFilterVis[team]=!teamFilterVis[team];
  const cb=document.getElementById("tcb-"+team);
  if(teamFilterVis[team]){cb.classList.add("on");cb.textContent="✓";}
  else{cb.classList.remove("on");cb.textContent="";}
  const anyOff=Object.values(teamFilterVis).some(v=>!v)||document.getElementById("fTeamSt").value!=="";
  document.getElementById("teamFilterBtn").classList.toggle("on",anyOff);
  ftbl();
}
document.addEventListener("click",e=>{
  if(!document.getElementById("teamFilterWrap").contains(e.target))
    document.getElementById("teamDD").style.display="none";
});
document.getElementById("fTeamSt").addEventListener("change",()=>{
  const anyOff=Object.values(teamFilterVis).some(v=>!v)||document.getElementById("fTeamSt").value!=="";
  document.getElementById("teamFilterBtn").classList.toggle("on",anyOff);
});


/* My Status dropdown → syncs to Team Review + logs history */
const MS_TO_TC={"Pending":"tc-none","Under Review":"tc-yellow","Approved":"tc-green","Rejected":"tc-red"};
const TC_TO_MS={"tc-none":"Pending","tc-yellow":"Under Review","tc-green":"Approved","tc-red":"Rejected"};
function ums(id,v){
  const a=AGs.find(x=>x.id===id);
  const mt=ROLES[role].team;
  const prevTm=a.tm[mt]||"tc-none";
  const prev=TC_TO_MS[prevTm]||"Pending";
  a.ms[mt]=v;
  a.tm[mt]=MS_TO_TC[v]||"tc-none";
  if(prev!==v){
    a.hist.push({d:ns(),t:TF[mt],b:ROLES[role].name,f:prev,to:v});
    showToast(TF[mt]+" → "+v,"green");
  } else {
    showToast("Status updated");
  }
  ftbl();
  // Persist to Supabase
  if(a._sbId){
    db.from('team_statuses').upsert({
      agreement_id:a._sbId,team_code:mt,status:v,
      updated_at:new Date().toISOString(),updated_by:ROLES[role].name
    },{onConflict:'agreement_id,team_code'}).catch(()=>{});
    if(prev!==v){
      db.from('history_log').insert({
        agreement_id:a._sbId,team:TF[mt],
        changed_by:ROLES[role].name,from_status:prev,to_status:v
      }).catch(()=>{});
    }
  }
}
/* Legal only: change overall agreement status */
function updateAgreementStatus(id,v){
  const a=AGs.find(x=>x.id===id);
  const prev=SC[a.st]?SC[a.st].l:a.st;
  a.st=v;
  const next=SC[v]?SC[v].l:v;
  a.hist.push({d:ns(),t:"Legal",b:ROLES[role].name,f:prev,to:next});
  updateStats();ftbl();
  showToast("Agreement status → "+next,"green");
  // Persist to Supabase
  if(a._sbId){
    db.from('agreements').update({status:v,updated_at:new Date().toISOString()}).eq('id',a._sbId).catch(()=>{});
    db.from('history_log').insert({
      agreement_id:a._sbId,team:"Legal",
      changed_by:ROLES[role].name,from_status:prev,to_status:next
    }).catch(()=>{});
  }
}

function updateLU(id,v){
  const a=AGs.find(x=>x.id===id);a.lu=v;showToast("Saved","green");ftbl();
}

/* ════════ HISTORY MODAL ════════ */
let histAllRows=[];
function openHist(id){
  const a=AGs.find(x=>x.id===id);
  document.getElementById("histTitle").textContent=`Status History — ${a.client}`;
  // reset filters
  document.getElementById("histSearch").value="";
  document.getElementById("histTeamFilter").value="";
  document.getElementById("histChangeFilter").value="";

  // sort ascending
  const sorted=[...a.hist].sort((x,y)=>parseTs(x.d)-parseTs(y.d));
  const teamLastEntry={};
  histAllRows=sorted.map(h=>{
    const prev=teamLastEntry[h.t];
    const oldDt=prev?prev.d:"—";
    const timeTaken=prev?diffLabel(prev.d,h.d):"—";
    teamLastEntry[h.t]=h;
    return {h,oldDt,timeTaken};
  });

  renderHistRows(histAllRows);
  document.getElementById("histModal").classList.add("show");
}
function renderHistRows(rows){
  document.getElementById("histBody").innerHTML=rows.map(({h,oldDt,timeTaken})=>`
    <tr>
      <td style="font-weight:700;white-space:nowrap">${h.t}</td>
      <td style="color:var(--ink-soft)">${h.b}</td>
      <td style="color:var(--ink-soft);font-size:11px;white-space:nowrap">${oldDt!=="—"?oldDt:'<span style="color:#c4cfc7">—</span>'}</td>
      <td style="font-size:11px;white-space:nowrap;font-weight:600;color:var(--ink)">${h.d}</td>
      <td><span class="hf">${h.f}</span><span class="harr">→</span><span class="ht2">${h.to}</span></td>
      <td>${timeTaken!=="—"?`<span class="ht-time-taken">${timeTaken}</span>`:'<span style="color:#c4cfc7;font-size:11px">—</span>'}</td>
    </tr>`).join("")||`<tr><td colspan="6" style="text-align:center;padding:22px;color:#94a59b;font-size:13px">No entries match the filter.</td></tr>`;
  document.getElementById("histCount").textContent=`${rows.length} of ${histAllRows.length} entries`;
}
function filterHist(){
  const q=(document.getElementById("histSearch").value||"").toLowerCase();
  const team=document.getElementById("histTeamFilter").value;
  const change=document.getElementById("histChangeFilter").value;
  const filtered=histAllRows.filter(({h})=>{
    if(q&&!(h.t+h.b+h.f+h.to).toLowerCase().includes(q))return false;
    if(team&&h.t!==team)return false;
    if(change&&h.to!==change)return false;
    return true;
  });
  renderHistRows(filtered);
}
function closeHist(){document.getElementById("histModal").classList.remove("show")}

/* ════════ REMARKS MODAL ════════ */
function openRem(id){
  remAgId=id;
  const a=AGs.find(x=>x.id===id);
  lastSeenRemarks[id]=(a.remarks||[]).length;
  document.getElementById("remTitle").textContent=`Remarks — ${a.client}`;
  // reset filters
  document.getElementById("remSearch").value="";
  document.getElementById("remRoleFilter").value="";
  document.getElementById("remInput").value="";
  renderRemFiltered(a);
  document.getElementById("remModal").classList.add("show");
}
function renderRemFiltered(a){
  const src=a||(remAgId?AGs.find(x=>x.id===remAgId):null);
  if(!src)return;
  const q=(document.getElementById("remSearch").value||"").toLowerCase();
  const roleF=document.getElementById("remRoleFilter").value;
  const all=src.remarks||[];
  const filtered=all.filter(r=>{
    if(q&&!(r.author+r.txt+r.role).toLowerCase().includes(q))return false;
    if(roleF&&r.role!==roleF)return false;
    return true;
  });
  const list=document.getElementById("remList");
  document.getElementById("remCount").textContent=`${filtered.length} of ${all.length} remarks`;
  if(all.length===0){
    list.innerHTML=`<div style="text-align:center;padding:28px 0;color:var(--ink-soft);font-size:13px">No remarks yet.</div>`;return;
  }
  if(filtered.length===0){
    list.innerHTML=`<div style="text-align:center;padding:22px 0;color:#94a59b;font-size:13px">No remarks match the filter.</div>`;return;
  }
  list.innerHTML=filtered.map(r=>`
    <div class="rem-entry gx-fade">
      <div class="rem-entry-meta">
        <span class="rem-entry-author">${r.author}</span>
        <span class="rem-entry-role">${r.role}</span>
        <span class="rem-entry-ts">${r.ts}</span>
      </div>
      <div class="rem-entry-txt">${r.txt}</div>
    </div>`).join("");
  list.scrollTop=list.scrollHeight;
}
function filterRem(){renderRemFiltered(null);}
function renderRemList(a){renderRemFiltered(a);}
function submitRem(){
  const txt=document.getElementById("remInput").value.trim();
  if(!txt)return;
  const a=AGs.find(x=>x.id===remAgId);
  const R=ROLES[role];
  if(!a.remarks)a.remarks=[];
  a.remarks.push({author:R.name,role:R.role.replace(" Team",""),ts:ns(),txt});
  a.lu=td();
  document.getElementById("remInput").value="";
  renderRemFiltered(a);
  ftbl();
  showToast("Remark added","green");
  // Persist to Supabase
  if(a._sbId){
    const R2=ROLES[role];
    db.from('remarks').insert({
      agreement_id:a._sbId,author_name:R2.name,
      author_role:R2.role.replace(" Team",""),text:txt
    }).then(({error})=>{
      if(!error)db.from('agreements').update({updated_at:new Date().toISOString()}).eq('id',a._sbId).catch(()=>{});
    }).catch(()=>{});
  }
}
function closeRem(){document.getElementById("remModal").classList.remove("show");remAgId=null;}

/* ════════ DOC SIMULATION ════════ */
function buildDocSimulation(a){
  // Delegate to google-api.js version if available (loaded separately)
  if(window.buildDocSimulation && window.buildDocSimulation !== buildDocSimulation){
    return window.buildDocSimulation(a);
  }
  const clauses=a.clauses||[];
  const drafts=a.drafts||[];
  const lastDraft=drafts.length?drafts[drafts.length-1]:null;
  const clauseHtml=clauses.map(c=>{
    const lastChange=c.changes?.length?c.changes[c.changes.length-1]:"";
    const ocColor=c.outcome==="accepted"?"#15803D":c.outcome==="held"?"#1D4ED8":c.outcome==="partial"?"#D97706":"#DC2626";
    return `<div style="margin-bottom:16px;padding:14px;border:1px solid #e8eee8;border-radius:8px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="font-size:11px;font-weight:700;color:#586860;background:#EEF4EF;padding:2px 8px;border-radius:5px">Clause ${c.no}</span>
        <span style="font-size:12px;font-weight:700;color:#15241B">${c.name}</span>
        <span style="margin-left:auto;font-size:11px;font-weight:700;color:${ocColor};padding:2px 8px;border-radius:5px">${c.outcome||"pending"}</span>
      </div>
      <div style="font-size:12.5px;color:#15241B;line-height:1.55">${lastChange||c.full||"—"}</div>
    </div>`;
  }).join("");
  const sigL=a.signatures?.L?`<span style="color:#15803D">✓ Signed by ${a.signatures.L.name} · ${a.signatures.L.ts}</span>`:`<em style="color:#94a59b">Awaiting signature</em>`;
  const sigB=a.signatures?.B?`<span style="color:#15803D">✓ Signed by ${a.signatures.B.name} · ${a.signatures.B.ts}</span>`:`<em style="color:#94a59b">Awaiting client signature</em>`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f8f9fa;min-height:100vh}
    .toolbar{background:#fff;border-bottom:1px solid #e0e0e0;padding:8px 16px;display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:10}
    .page{background:#fff;margin:14px auto;padding:40px 52px;width:680px;max-width:calc(100% - 40px);box-shadow:0 1px 4px rgba(0,0,0,.12);min-height:500px}
    .sec{font-size:11px;font-weight:700;color:#586860;text-transform:uppercase;letter-spacing:.07em;margin:24px 0 12px;padding-bottom:4px;border-bottom:2px solid #eee}
    .wm{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-20deg);font-size:72px;font-weight:900;color:rgba(0,0,0,.03);pointer-events:none;white-space:nowrap}
  </style></head><body>
  <div class="wm">DRAFT</div>
  <div class="toolbar">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 2h8l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#62A92A" stroke-width="1.5"/></svg>
    <span style="font-size:13px;font-weight:700;color:#15241B">${a.client} — ${a.type} Agreement</span>
    <span style="font-size:11.5px;color:#94a59b;margin-left:auto">Last modified: ${lastDraft?lastDraft.date:"—"} · ${drafts.length} draft${drafts.length!==1?"s":""}</span>
  </div>
  <div class="page">
    <div style="text-align:center;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #eee">
      <div style="font-size:11px;font-weight:700;color:#62A92A;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px">GyfTR Legal Portal</div>
      <h1 style="font-size:22px;font-weight:800;color:#15241B;margin:0 0 4px">${a.type} Agreement</h1>
      <div style="font-size:15px;color:#586860">GyFTR × ${a.client}</div>
      <div style="display:flex;justify-content:center;gap:20px;margin-top:12px;font-size:12px;color:#94a59b">
        <span>Draft start: ${a.clientDates?.draftStart||"—"}</span>
        <span>Current: ${lastDraft?lastDraft.n:"D1"}</span>
        <span>Promise: ${a.pd||"TBD"}</span>
      </div>
    </div>
    ${lastDraft?`<div style="background:#FFF8E1;border-left:3px solid #F59E0B;padding:10px 14px;border-radius:0 8px 8px 0;margin-bottom:20px;font-size:12.5px"><strong>Note:</strong> Latest draft: ${lastDraft.n} (${lastDraft.dir}) — ${lastDraft.note}</div>`:""}
    ${clauseHtml?`<div class="sec">Negotiated Clauses</div>${clauseHtml}`:`<p style="color:#94a59b;font-size:13px;margin:16px 0">No clause data available.</p>`}
    <div class="sec">Execution Block</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:12px">
      <div style="padding:16px;border:1px solid #e8eee8;border-radius:8px">
        <div style="font-size:11px;font-weight:700;color:#586860;margin-bottom:8px">For GyfTR (Authorised Signatory)</div>
        <div style="font-size:12.5px;font-weight:700;color:#15241B">${a.sp?.L||"Authorised Signatory"}</div>
        <div style="font-size:12px;color:#586860;margin-top:6px">${sigL}</div>
      </div>
      <div style="padding:16px;border:1px solid #e8eee8;border-radius:8px">
        <div style="font-size:11px;font-weight:700;color:#586860;margin-bottom:8px">For ${a.client}</div>
        <div style="font-size:12.5px;font-weight:700;color:#15241B">Authorised Signatory</div>
        <div style="font-size:12px;color:#586860;margin-top:6px">${sigB}</div>
      </div>
    </div>
  </div>
  </body></html>`;
}

/* ════════ DOC FULL SCREEN ════════ */
function openDoc(id){
  const a=AGs.find(x=>x.id===id);

  // Tell google-api.js about the current agreement
  if(window.gSetAgreement) window.gSetAgreement(a);

  document.getElementById("docClientName").textContent=a.client;
  document.getElementById("docTypeTag").textContent=a.type;

  // status chip in topbar
  const sm=SC[a.st];
  document.getElementById("docStatusArea").innerHTML=`<span class="badge ${sm.c}"><span class="bdot"></span>${sm.l}</span>`;

  // build info panel
  const lastRem=a.remarks&&a.remarks.length?a.remarks[a.remarks.length-1]:null;
  const teamRows=["L","F","C","B"].map(t=>{
    const dotCls=DOT_CLS[a.tm[t]]||"dot-pending";
    const txtCls=TXT_CLS[a.tm[t]]||"txt-pending";
    const ag=a.teamAging?a.teamAging[t]:null;
    const agCls=agTeamCls(ag);
    return `<div class="doc-team-row">
      <span class="doc-team-dot ${dotCls}"></span>
      <span class="doc-team-name">${TF[t]}</span>
      <span class="doc-team-status ${txtCls}">${TCL[a.tm[t]]}</span>
      ${ag?`<span class="${agCls}" style="margin-left:4px">${ag}</span>`:""}
    </div>`;
  }).join("");

  document.getElementById("docInfoPanel").innerHTML=`
    <div class="doc-info-title">Agreement Details</div>
    <div class="di-row"><span class="di-key">Client</span><span class="di-val" style="font-weight:700;font-family:var(--font-d);font-size:14px">${a.client}</span></div>
    <div class="di-row"><span class="di-key">Type</span><span class="di-val">${a.type}</span></div>
    <div class="di-row"><span class="di-key">Start Date</span><span class="di-val">${fd(a.sD)}</span></div>
    <div class="di-row"><span class="di-key">Promise</span><span class="di-val">${a.pd?fd(a.pd):"—"}</span></div>
    <div class="di-row"><span class="di-key">Overall Aging</span><span class="di-val"><span class="${a.ac}">${a.ag}</span></span></div>
    <div class="di-row"><span class="di-key">Last Updated</span><span class="di-val">${fd(a.lu)}</span></div>
    <div class="di-row"><span class="di-key">SPOCs</span><span class="di-val" style="font-size:12px;color:var(--ink-soft)">
      L: ${a.sp.L} &nbsp;·&nbsp; F: ${a.sp.F}<br>C: ${a.sp.C} &nbsp;·&nbsp; B: ${a.sp.B}
    </span></div>
    <div style="height:12px"></div>
    <div class="doc-info-title">Team Review</div>
    ${teamRows}
    <div style="height:12px"></div>
    <div class="doc-info-title">Latest Remark</div>
    ${lastRem?`
      <div style="background:#F4F8F4;border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-top:4px">
        <div style="display:flex;align-items:center;gap:7px;margin-bottom:4px">
          <span style="font-size:12px;font-weight:700;color:var(--ink)">${lastRem.author}</span>
          <span style="font-size:10px;font-weight:700;color:var(--pop-deep);background:var(--pop-soft);padding:1px 7px;border-radius:6px">${lastRem.role}</span>
          <span style="font-size:10.5px;color:#94a59b;margin-left:auto">${lastRem.ts}</span>
        </div>
        <div style="font-size:12.5px;color:var(--ink);line-height:1.45">${lastRem.txt}</div>
      </div>
      ${a.remarks.length>1?`<button class="gx-btn gx-btn-soft" style="margin-top:10px;font-size:12px;padding:6px 12px" onclick="openRem(${Q(a.id)})">View all ${a.remarks.length} remarks</button>`:""}
    `:`<div style="font-size:13px;color:#94a59b;padding:8px 0">No remarks yet.</div>`}
    <div style="height:12px"></div>
    <div class="doc-info-title">Status History</div>
    <div style="display:flex;flex-direction:column;gap:5px;margin-top:4px">
      ${[...a.hist].sort((x,y)=>parseTs(x.d)-parseTs(y.d)).slice(-4).map(h=>`
        <div style="display:flex;align-items:center;gap:6px;font-size:11.5px">
          <span style="font-size:9px;font-weight:700;background:#EEF4EF;color:var(--ink-soft);padding:1px 6px;border-radius:5px;flex-shrink:0">${h.t}</span>
          <span style="color:var(--ink-soft)">${h.d.split(" ")[0]}</span>
          <span style="color:#94a59b;font-size:10px">→</span>
          <span style="font-weight:700;color:var(--ink)">${h.to}</span>
        </div>`).join("")}
    </div>
    <button class="gx-btn gx-btn-ghost" style="margin-top:12px;font-size:12px;padding:6px 12px;width:100%;justify-content:center" onclick="closeDoc();setTimeout(()=>openHist(${Q(a.id)}),100)">
      Full history log →
    </button>`;

  const editor=document.getElementById("docEditor");
  const editorScroll=document.getElementById("docEditorScroll");
  const docIframe=document.getElementById("docIframe");
  const workArea=document.getElementById("docWorkArea");
  const loadingState=document.getElementById("docLoadingState");
  const editToggleBtn=document.getElementById("editToggleBtn");
  const saveDocBtn=document.getElementById("saveDocBtn");

  // Reset all display state
  if(editor){editor.innerHTML="";editor.contentEditable="false";}
  if(editorScroll) editorScroll.style.display="none";
  if(docIframe){docIframe.src="about:blank";docIframe.style.display="none";}
  if(workArea) workArea.style.display="none";
  if(loadingState) loadingState.style.display="none";
  if(editToggleBtn) editToggleBtn.style.display="none";
  if(saveDocBtn) saveDocBtn.style.display="none";

  // Top bar
  const urlEl=document.getElementById("docFrameUrl");
  const linkEl=document.getElementById("docOpenLink");

  // Check for a real Google Doc (linked via picker or a.doc with valid 10+ char ID)
  const docUrl=a._linkedDocUrl||a.doc||"";
  const linkedDocId=a._linkedDocId||(docUrl.match(/\/d\/([a-zA-Z0-9_-]{10,})/)||[])[1];

  if(linkEl){
    if(linkedDocId){linkEl.href=docUrl||`https://docs.google.com/document/d/${linkedDocId}/edit`;linkEl.style.display="";}
    else{linkEl.href="#";linkEl.style.display="none";}
  }

  if(linkedDocId){
    // ── IFRAME MODE: real Google Doc ────────────────────────────────────────
    const baseUrl=docUrl.replace(/[?#].*$/, "").replace(/\/edit$/, "").replace(/\/preview$/, "");
    const embedUrl=`${baseUrl}/edit?rm=minimal`;
    if(urlEl) urlEl.textContent=a._linkedDocName||`${a.client} — ${a.type} Agreement`;
    if(docIframe){docIframe.src=embedUrl;docIframe.style.display="flex";docIframe.style.flex="1";}
    if(workArea) workArea.style.display="flex";
    if(editToggleBtn) editToggleBtn.style.display="none";
    if(saveDocBtn) saveDocBtn.style.display="inline-flex";
    if(window.gRenderComments) window.gRenderComments();
  } else {
    // ── SIMULATION MODE: no real doc linked ─────────────────────────────────
    if(urlEl) urlEl.textContent=`${a.client} — ${a.type} Agreement`;
    if(editor){
      // Restore locally saved edits if any
      const localKey=`doc_ag_${a.id}`;
      const localHtml=localStorage.getItem(localKey);
      if(localHtml){
        editor.innerHTML=localHtml;
      } else {
        const simHtml=buildDocSimulation(a);
        const bodyMatch=simHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        editor.innerHTML=bodyMatch?bodyMatch[1]:"";
      }
    }
    if(editorScroll) editorScroll.style.display="block";
    if(workArea) workArea.style.display="flex";
    if(editToggleBtn) editToggleBtn.style.display="inline-flex";
    if(window.gRenderComments) window.gRenderComments();
    if(window.gEnsureSelectionListener) window.gEnsureSelectionListener();
  }

  // Sign bar — show for legal & business only
  const signBar=document.getElementById("signBar");
  const isSignRole=(role==="legal"||role==="business");
  if(isSignRole){
    signBar.style.display="flex";
    const mt=ROLES[role].team;
    const alreadySigned=a.signatures&&a.signatures[mt];
    const actionArea=document.getElementById("signBarAction");
    if(alreadySigned){
      document.getElementById("signBarTitle").textContent="You've signed this agreement";
      document.getElementById("signBarSub").textContent=`Signed by ${alreadySigned.name} on ${alreadySigned.ts}`;
      actionArea.innerHTML=`<button class="sign-btn signed" disabled>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Signed
      </button>`;
    } else {
      document.getElementById("signBarTitle").textContent="Ready to sign this agreement?";
      document.getElementById("signBarSub").textContent="Review the document on the right, then sign below.";
      actionArea.innerHTML=`<button class="sign-btn" onclick="openSignModal(${Q(a.id)})">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M2 12c1.5-1 3-2 4.5-1S9 13 10.5 12s3-2 3.5-1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          <path d="M3 10l2-5 2 3 2-6 2 4 1.5-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Sign Agreement
      </button>`;
    }
  } else {
    signBar.style.display="none";
  }

  document.getElementById("docScreen").classList.add("vis");
}

function closeDoc(){
  document.getElementById("docScreen").classList.remove("vis");
  const editor=document.getElementById("docEditor");
  if(editor){editor.innerHTML="";editor.contentEditable="false";}
  const editorScroll=document.getElementById("docEditorScroll");
  if(editorScroll) editorScroll.style.display="none";
  const docIframe=document.getElementById("docIframe");
  if(docIframe){docIframe.src="about:blank";docIframe.style.display="none";}
  const workArea=document.getElementById("docWorkArea");
  if(workArea) workArea.style.display="none";
  const loadingState=document.getElementById("docLoadingState");
  if(loadingState) loadingState.style.display="none";
  const editToggleBtn=document.getElementById("editToggleBtn");
  if(editToggleBtn) editToggleBtn.style.display="none";
  const saveDocBtn=document.getElementById("saveDocBtn");
  if(saveDocBtn) saveDocBtn.style.display="none";
  const floatBtn=document.getElementById("commentFloatBtn");
  if(floatBtn) floatBtn.style.display="none";
  if(window.gStopAutoSave) window.gStopAutoSave();
}

/* ════════ SIGN ════════ */
let signAgId=null;
function openSignModal(id){
  signAgId=id;
  const a=AGs.find(x=>x.id===id);
  document.getElementById("signDocName").textContent=a.client;
  document.getElementById("signDocType").textContent=a.type;
  document.getElementById("signName").value=ROLES[role].name;
  document.getElementById("signDesig").value=ROLES[role].role;
  document.getElementById("signModal").classList.add("show");
}
function closeSignModal(){
  document.getElementById("signModal").classList.remove("show");
  signAgId=null;
}
function confirmSign(){
  const name=document.getElementById("signName").value.trim();
  if(!name){showToast("Please enter your full name");return;}
  const desig=document.getElementById("signDesig").value.trim();
  const a=AGs.find(x=>x.id===signAgId);
  const mt=ROLES[role].team;
  if(!a.signatures)a.signatures={};
  const signTs=ns();
  a.signatures[mt]={name,desig,ts:signTs,role:ROLES[role].role};
  // log to history
  a.hist.push({d:signTs,t:TF[mt],b:name,f:"Unsigned",to:"Signed"});
  // also mark their status as Approved
  a.ms[mt]="Approved";
  a.tm[mt]="tc-green";
  closeSignModal();
  ftbl();
  updateStats();
  // refresh sign bar state
  const actionArea=document.getElementById("signBarAction");
  document.getElementById("signBarTitle").textContent="You've signed this agreement";
  document.getElementById("signBarSub").textContent=`Signed by ${name} on ${signTs}`;
  actionArea.innerHTML=`<button class="sign-btn signed" disabled>
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    Signed
  </button>`;
  showToast("Agreement signed successfully ✓","green");
}

/* ════════ CREATE ════════ */
function openCreate(){document.getElementById("createModal").classList.add("show")}
function closeCr(){document.getElementById("createModal").classList.remove("show")}
async function submitCr(){
  const c=document.getElementById("fc").value.trim(),t=document.getElementById("fty").value;
  if(!c||!t){showToast("Fill client name and type");return}
  const R=ROLES[role];
  const spocL=document.getElementById("fleg").value||"—";
  const spocF=document.getElementById("ffin").value||"—";
  const spocC=document.getElementById("fcom").value||"—";
  const spocB=document.getElementById("fb").value||"—";
  const docLink=document.getElementById("fdoc").value||"";
  const pd=document.getElementById("fpd").value||"";
  const newAg={
    id:AGs.length+1,client:c,tag:c.slice(0,4).toUpperCase(),ct:"ct-q",sD:td(),type:t,st:"pending",
    tm:{L:"tc-none",F:"tc-none",C:"tc-none",B:"tc-none"},
    ms:{L:"Pending",F:"Pending",C:"Pending",B:"Pending"},
    teamAging:{L:null,F:null,C:null,B:null},
    ag:"On time",ac:"ag-ok",lu:td(),
    remarks:[{author:R.name,role:R.role.replace(" Team",""),ts:ns(),txt:"Agreement created."}],
    doc:docLink,sp:{B:spocB,L:spocL,F:spocF,C:spocC},pd,
    hist:[{d:ns(),t:"Legal",b:R.name,f:"—",to:"Pending"}]
  };
  AGs.unshift(newAg);
  closeCr();updateStats();ftbl();showToast(`Agreement created for ${c}`,"green");
  ["fc","fty","fpd","fb","fleg","ffin","fcom","fdoc"].forEach(id=>{const el=document.getElementById(id);if(el)el.value=""});
  // Persist to Supabase
  try{
    const{data,error}=await db.from('agreements').insert({
      client:c,tag:c.slice(0,4).toUpperCase(),type:t,
      status:'pending',client_status:'awaiting',
      promise_date:pd||null,
      spoc_legal:spocL==="—"?null:spocL,
      spoc_finance:spocF==="—"?null:spocF,
      spoc_business:spocB==="—"?null:spocB,
      spoc_compliance:spocC==="—"?null:spocC,
      doc_link:docLink||null,
      start_date:new Date().toISOString().split('T')[0]
    }).select().single();
    if(!error&&data){
      newAg._sbId=data.id;
      // Insert default team statuses
      db.from('team_statuses').insert([
        {agreement_id:data.id,team_code:'L',status:'Pending'},
        {agreement_id:data.id,team_code:'F',status:'Pending'},
        {agreement_id:data.id,team_code:'C',status:'Pending'},
        {agreement_id:data.id,team_code:'B',status:'Pending'}
      ]).catch(()=>{});
      // Log initial history
      db.from('history_log').insert({
        agreement_id:data.id,team:'Legal',
        changed_by:R.name,from_status:'—',to_status:'Pending'
      }).catch(()=>{});
      // Save creation remark
      db.from('remarks').insert({
        agreement_id:data.id,author_name:R.name,
        author_role:R.role.replace(' Team',''),text:'Agreement created.'
      }).catch(()=>{});
    }
  }catch(e){/* offline — local only */}
}

/* ════════ CLOSE ON OVERLAY CLICK ════════ */
document.getElementById("createModal").addEventListener("click",e=>{if(e.target===e.currentTarget)closeCr()});
document.getElementById("histModal").addEventListener("click",e=>{if(e.target===e.currentTarget)closeHist()});
document.getElementById("remModal").addEventListener("click",e=>{if(e.target===e.currentTarget)closeRem()});
document.getElementById("remInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submitRem()}});
document.getElementById("signModal").addEventListener("click",e=>{if(e.target===e.currentTarget)closeSignModal()});
document.getElementById("exportModal").addEventListener("click",e=>{if(e.target===e.currentTarget)closeExport();});

/* ════════ SHARE / COPY LINK ════════ */
function copyAgLink(id,e){
  e.stopPropagation();
  const a=AGs.find(x=>x.id===id);
  // In production this would be a real URL; for demo we copy a descriptive reference
  const txt=`GyfTR Legal Portal — ${a.client} (${a.type}) · Status: ${SC[a.st]?SC[a.st].l:a.st}`;
  if(navigator.clipboard){
    navigator.clipboard.writeText(txt).then(()=>showToast("Link copied to clipboard","green")).catch(()=>showToast("Copied: "+txt));
  } else {
    showToast("Agreement reference copied","green");
  }
}

/* ════════ PRINT HELPER ════════ */
function printTable(){window.print();}

/* Promise date alerts now handled inside renderDashboard directly */



/* ════════ GLOBAL SEARCH (Cmd+K) ════════ */
let gsActive=false;
function openGlobalSearch(){
  document.getElementById("globalSearchOverlay").classList.add("show");
  document.getElementById("gsInput").value="";
  document.getElementById("gsResults").innerHTML=`<div class="gs-empty"><div style="font-size:22px;margin-bottom:8px">🔍</div>Start typing to search agreements, clauses and remarks</div>`;
  document.getElementById("gsResultCount").textContent="";
  gsActive=true;
  setTimeout(()=>document.getElementById("gsInput").focus(),80);
}
function closeGlobalSearch(){
  document.getElementById("globalSearchOverlay").classList.remove("show");
  gsActive=false;
}
document.addEventListener("keydown",e=>{
  if((e.metaKey||e.ctrlKey)&&e.key==="k"){e.preventDefault();openGlobalSearch();}
  if(e.key==="Escape"&&gsActive)closeGlobalSearch();
});
function runGlobalSearch(q){
  const res=document.getElementById("gsResults");
  if(!q.trim()){
    res.innerHTML=`<div class="gs-empty"><div style="font-size:22px;margin-bottom:8px">🔍</div>Start typing to search agreements, clauses and remarks</div>`;
    document.getElementById("gsResultCount").textContent="";
    return;
  }
  const ql=q.toLowerCase();
  const agMatches=[],clauseMatches=[],remMatches=[];

  AGs.forEach(a=>{
    // agreement name
    if(a.client.toLowerCase().includes(ql)||a.type.toLowerCase().includes(ql)){
      agMatches.push({type:"ag",label:a.client,sub:a.type+" · "+(SC[a.st]?SC[a.st].l:a.st),ct:a.ct,tag:a.tag,id:a.id});
    }
    // clauses
    (a.clauses||[]).forEach(c=>{
      if(c.name.toLowerCase().includes(ql)||(c.full||"").toLowerCase().includes(ql)){
        clauseMatches.push({type:"clause",label:"Cl."+c.no+" · "+c.name,sub:a.client,ct:a.ct,tag:a.tag,agId:a.id});
      }
    });
    // remarks
    (a.remarks||[]).forEach(r=>{
      if(r.txt.toLowerCase().includes(ql)||r.author.toLowerCase().includes(ql)){
        remMatches.push({type:"remark",label:r.author+": "+r.txt.slice(0,60)+(r.txt.length>60?"…":""),sub:a.client+" · "+r.ts,ct:a.ct,tag:a.tag,agId:a.id});
      }
    });
  });

  const total=agMatches.length+clauseMatches.length+remMatches.length;
  document.getElementById("gsResultCount").textContent=total+" result"+(total!==1?"s":"");

  if(!total){
    res.innerHTML=`<div class="gs-empty">No results for "<b>${q}</b>"</div>`;return;
  }

  const renderItem=(r,onclick)=>`<div class="gs-item" onclick="${onclick}">
    <div class="gs-item-icon" style="background:${CT_COLORS[r.ct]||'#EEF4EF'}">
      <span style="font-size:9px;font-weight:800;color:${CT_TEXT[r.ct]||'#586860'};font-family:var(--font-d)">${r.tag.slice(0,3)}</span>
    </div>
    <div style="flex:1;min-width:0">
      <div class="gs-item-main">${r.label}</div>
      <div class="gs-item-sub">${r.sub}</div>
    </div>
    <span class="gs-item-tag" style="background:${r.type==="ag"?"#EEF4EF":r.type==="clause"?"#EDF6D9":"#EFF6FF"};color:${r.type==="ag"?"var(--ink-soft)":r.type==="clause"?"var(--pop-deep)":"#1D4ED8"}">${r.type==="ag"?"Agreement":r.type==="clause"?"Clause":"Remark"}</span>
  </div>`;

  let html="";
  if(agMatches.length){
    html+=`<div class="gs-section-lbl">Agreements</div>`;
    html+=agMatches.map(r=>renderItem(r,`closeGlobalSearch();ftbl();document.getElementById('sb').value='${r.label}';ftbl()`)).join("");
  }
  if(clauseMatches.length){
    html+=`<div class="gs-section-lbl">Clauses</div>`;
    html+=clauseMatches.map(r=>renderItem(r,`closeGlobalSearch();openAnalyse();setTimeout(()=>selectAnAgreement(${Q(r.agId)}),200)`)).join("");
  }
  if(remMatches.length){
    html+=`<div class="gs-section-lbl">Remarks</div>`;
    html+=remMatches.map(r=>renderItem(r,`closeGlobalSearch();openRem(${Q(r.agId)})`)).join("");
  }
  res.innerHTML=html;
}

/* ════════ EXPORT ════════ */
let exportOpt="all";
function openExport(){
  document.getElementById("exportModal").classList.add("show");
  selectExportOpt(document.getElementById("exportOptAll"),"all");
}
function closeExport(){document.getElementById("exportModal").classList.remove("show");}
function selectExportOpt(el,opt){
  exportOpt=opt;
  document.querySelectorAll(".export-opt").forEach(e=>{
    e.style.border="1.5px solid var(--line)";
    e.style.background="transparent";
  });
  el.style.border="1.5px solid var(--pop)";
  el.style.background="var(--pop-soft)";
}
function doExport(){
  const now=new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"});
  let rows="";
  let data=AGs;
  let title="All Agreements";
  if(exportOpt==="stuck"){
    data=AGs.filter(a=>["L","F","C","B"].some(t=>a.teamAging&&a.teamAging[t]&&parseInt(a.teamAging[t])>=3));
    title="Bottleneck Report";
  } else if(exportOpt==="pending"){
    title="Open Clauses Report";
    let clauseRows="";
    AGs.forEach(a=>{
      (a.clauses||[]).filter(c=>c.outcome==="pending").forEach(c=>{
        clauseRows+=`<tr><td style="padding:9px 12px;border-bottom:1px solid #eee;font-weight:700">${a.client}</td><td style="padding:9px 12px;border-bottom:1px solid #eee">Cl.${c.no} · ${c.name}</td><td style="padding:9px 12px;border-bottom:1px solid #eee;color:#DC2626;font-weight:700">Pending</td><td style="padding:9px 12px;border-bottom:1px solid #eee;font-size:12px">${c.changes[c.changes.length-1]||"—"}</td></tr>`;
      });
    });
    rows=clauseRows;
    const doc=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title} — GyfTR Legal</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#15241B}h1{color:#4C8A1E;font-size:22px;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#EEF4EF;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#586860}tr:hover td{background:#F4F8F4}</style></head><body><h1>GyfTR Legal · ${title}</h1><p style="color:#586860;font-size:13px">Generated ${now}</p><table><thead><tr><th>Agreement</th><th>Clause</th><th>Status</th><th>Last Position</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const blob=new Blob([doc],{type:"text/html"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`GyfTR_${title.replace(/ /g,"_")}_${now}.html`;a.click();
    closeExport();showToast("Report downloaded","green");return;
  }
  data.forEach(a=>{
    const sm=SC[a.st]||{l:a.st};
    const lastRem=a.remarks&&a.remarks.length?a.remarks[a.remarks.length-1]:null;
    const aging=["L","F","C","B"].map(t=>a.teamAging&&a.teamAging[t]?TF[t]+": "+a.teamAging[t]:"").filter(Boolean).join(", ")||"On time";
    rows+=`<tr><td style="padding:9px 12px;border-bottom:1px solid #eee;font-weight:700">${a.client}</td><td style="padding:9px 12px;border-bottom:1px solid #eee">${a.type}</td><td style="padding:9px 12px;border-bottom:1px solid #eee"><b>${sm.l}</b></td><td style="padding:9px 12px;border-bottom:1px solid #eee;font-size:12px">${aging}</td><td style="padding:9px 12px;border-bottom:1px solid #eee;font-size:12px">${a.pd?fd(a.pd):"—"}</td><td style="padding:9px 12px;border-bottom:1px solid #eee;font-size:12px;max-width:200px">${lastRem?lastRem.txt:"—"}</td></tr>`;
  });
  const doc=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title} — GyfTR Legal</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#15241B}h1{color:#4C8A1E;font-size:22px;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#EEF4EF;padding:10px 12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#586860}tr:hover td{background:#F4F8F4}.badge{display:inline-block;padding:2px 8px;border-radius:6px;font-weight:700;font-size:11px}</style></head><body><h1>GyfTR Legal · ${title}</h1><p style="color:#586860;font-size:13px">Generated ${now} · ${data.length} agreements</p><table><thead><tr><th>Client</th><th>Type</th><th>Status</th><th>Team Aging</th><th>Promise Date</th><th>Last Remark</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
  const blob=new Blob([doc],{type:"text/html"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`GyfTR_${title.replace(/ /g,"_")}_${now}.html`;a.click();
  closeExport();showToast("Report downloaded","green");
}

/* ════════ CLIENT STATUS ════════ */
const CS_CFG={
  awaiting: {l:"Awaiting",cls:"cs-awaiting",dot:"#D97706"},
  responded:{l:"Responded",cls:"cs-responded",dot:"#2D7FF9"},
  negotiating:{l:"Negotiating",cls:"cs-negotiating",dot:"#7E22CE"},
  finalised:{l:"Finalised",cls:"cs-finalised",dot:"#15803D"}
};
function renderClientStatusBadge(st,id){
  const c=CS_CFG[st]||CS_CFG.awaiting;
  const opts=Object.keys(CS_CFG).map(k=>`<option value="${k}"${st===k?" selected":""}>${CS_CFG[k].l}</option>`).join("");
  if(role==="legal"){
    return `<select class="cs-sel ${c.cls}" onchange="updateClientStatus(${Q(id)},this.value)">${opts}</select>`;
  }
  return `<span class="cs-badge ${c.cls}"><span style="width:5px;height:5px;border-radius:50%;background:${c.dot};display:inline-block"></span>${c.l}</span>`;
}
function updateClientStatus(id,v){
  const a=AGs.find(x=>x.id===id);
  a.clientStatus=v;
  ftbl();
  showToast("Client status → "+CS_CFG[v].l,"green");
  if(a._sbId){
    db.from('agreements').update({client_status:v,updated_at:new Date().toISOString()}).eq('id',a._sbId).catch(()=>{});
  }
}

/* ════════ DRAFTS MODAL ════════ */
let draftsAgId=null;
function openDraftsModal(id){
  draftsAgId=id;
  renderDraftsModal();
  document.getElementById("draftsModal").classList.add("show");
}
function renderDraftsModal(){
  const a=AGs.find(x=>x.id===draftsAgId);
  const drafts=a.drafts||[];
  document.getElementById("dpTitle").textContent=`Draft Timeline — ${a.client}`;
  document.getElementById("dpSubTitle").textContent=`${drafts.length} draft${drafts.length!==1?"s":""} · ${a.type}`;
  document.getElementById("dpAddWrap").style.display=(role==="legal")?"block":"none";
  if(!drafts.length){
    document.getElementById("dpList").innerHTML=`<div style="text-align:center;padding:32px;color:#94a59b;font-size:13px">No drafts yet. Add the first one below.</div>`;
    return;
  }
  // compute turnaround days between consecutive drafts
  const turnaround=drafts.map((d,i)=>{
    if(i===0)return null;
    const prev=drafts[i-1];
    const days=Math.round((new Date(d.date)-new Date(prev.date))/86400000);
    return days;
  });
  document.getElementById("dpList").innerHTML=drafts.map((d,i)=>{
    const isSent=d.dir==="sent";
    const canToggle=role==="legal";
    const isD1=i===0;
    const ta=turnaround[i];
    const taSlow=ta&&ta>7;
    return `<div class="dp-row">
      <div class="dp-line"></div>
      <button class="dp-icon-wrap ${isSent?"dp-sent":"dp-recv"}" title="${canToggle?"Click to toggle direction":isSent?"Sent to client":"Received from client"}"
        onclick="${canToggle?`toggleDraftDir(${Q(draftsAgId)},${i})`:`showToast('Only Legal can change draft direction')`}">
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
          ${isSent
            ?'<path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
            :'<path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'}
        </svg>
      </button>
      <div class="dp-content">
        <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
          <span class="dp-num">${d.n}</span>
          ${isD1?`<span style="font-size:9.5px;font-weight:700;background:#EDF6D9;color:var(--pop-deep);padding:1px 6px;border-radius:4px;border:1px solid rgba(98,170,42,.25)">GyfTR Initial Draft</span>`:""}
          ${ta!==null&&ta!==undefined?`<span class="dp-turnaround${taSlow?" slow":""}" title="${taSlow?"⚠ Slow turnaround":""}">${taSlow?"⚠ ":""}${ta}d turnaround</span>`:""}
        </div>
        <div class="dp-meta">
          <span class="dp-date-txt">${fd(d.date)}</span>
          <span class="dp-dir-tag ${isSent?"dp-dir-sent":"dp-dir-recv"}">${isSent?"↗ Sent to client":"↙ Received from client"}</span>
        </div>
        <div class="dp-note-txt">${d.note||"No note"}</div>
      </div>
    </div>`;
  }).join("");
}
function toggleDraftDir(agId,idx){
  const a=AGs.find(x=>x.id===agId);
  a.drafts[idx].dir=a.drafts[idx].dir==="sent"?"received":"sent";
  renderDraftsModal();
  showToast("Direction updated","green");
}
function addDraft(){
  const a=AGs.find(x=>x.id===draftsAgId);
  const date=document.getElementById("dpNewDate").value;
  const note=document.getElementById("dpNewNote").value.trim();
  const dir=document.getElementById("dpNewDir").value;
  if(!date||!note){showToast("Fill date and note");return;}
  if(!a.drafts)a.drafts=[];
  a.drafts.push({n:"D"+(a.drafts.length+1),date,dir,note});
  document.getElementById("dpNewDate").value="";
  document.getElementById("dpNewNote").value="";
  renderDraftsModal();
  ftbl();
  showToast("Draft added","green");
}
function closeDraftsModal(){document.getElementById("draftsModal").classList.remove("show");draftsAgId=null;}
document.getElementById("draftsModal").addEventListener("click",e=>{if(e.target===e.currentTarget)closeDraftsModal();});

/* ════════ CLIENT DETAIL SCREEN ════════ */
let csAgId=null;
function openClientScreen(id){
  csAgId=id;
  const a=AGs.find(x=>x.id===id);
  document.getElementById("csClientName").textContent=a.client;
  document.getElementById("csTypeTag").textContent=a.type;
  const cd=a.clientDates||{};
  const csb=CS_CFG[a.clientStatus||"awaiting"];
  document.getElementById("csBody").innerHTML=`
    <div class="cs-section">
      <div class="cs-sec-title">Draft Timeline</div>
      <div class="cs-field"><label class="cs-lbl">Draft Start Date</label><input class="cs-input" type="date" id="cd-draftStart" value="${cd.draftStart||""}"></div>
      <div class="cs-field"><label class="cs-lbl">Latest Draft Modified</label><input class="cs-input" type="date" id="cd-latestModified" value="${cd.latestModified||""}"></div>
      <div class="cs-field"><label class="cs-lbl">Current Draft No.</label>
        <div style="font-size:20px;font-weight:800;font-family:var(--font-d);color:var(--pop)">${a.drafts?a.drafts.length:0} Drafts</div>
      </div>
    </div>
    <div class="cs-section">
      <div class="cs-sec-title">Key Dates</div>
      <div class="cs-field"><label class="cs-lbl">Effective Date</label><input class="cs-input" type="date" id="cd-effectiveDate" value="${cd.effectiveDate||""}"></div>
      <div class="cs-field"><label class="cs-lbl">Signing Date</label><input class="cs-input" type="date" id="cd-signingDate" value="${cd.signingDate||""}"></div>
      <div class="cs-field"><label class="cs-lbl">End / Expiry Date</label><input class="cs-input" type="date" id="cd-endDate" value="${cd.endDate||""}"></div>
    </div>
    <div class="cs-section">
      <div class="cs-sec-title">Client Negotiation Status</div>
      ${Object.keys(CS_CFG).map(k=>{
        const c=CS_CFG[k];
        const sel=k===(a.clientStatus||"awaiting");
        return `<div class="cs-status-row" style="${sel?"background:var(--pop-soft);border-radius:9px;padding:8px 10px;margin:-2px -2px":""}" onclick="setClientStatusFromScreen('${k}')">
          <span class="cs-badge ${c.cls}" style="flex:1"><span style="width:6px;height:6px;border-radius:50%;background:${c.dot};display:inline-block;margin-right:4px"></span>${c.l}</span>
          ${sel?'<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="#15803D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>':""}
        </div>`;
      }).join("")}
    </div>
    <div class="cs-section" style="grid-column:1/-1">
      <div class="cs-sec-title">Draft History</div>
      ${(a.drafts&&a.drafts.length)?`
        <div style="display:flex;flex-direction:column;gap:6px">
          ${a.drafts.map(d=>`
            <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:#FAFCFA">
              <span style="font-family:var(--font-d);font-size:13px;font-weight:800;color:var(--ink);min-width:28px">${d.n}</span>
              <span style="font-size:11.5px;color:var(--ink-soft);min-width:80px">${fd(d.date)}</span>
              <span style="flex:1;font-size:12.5px;color:var(--ink)">${d.note}</span>
              <span style="display:flex;align-items:center;gap:5px;font-size:11px;font-weight:700;${d.dir==="sent"?"color:#15803D":"color:#DC2626"}">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  ${d.dir==="sent"
                    ?'<path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'
                    :'<path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>'}
                </svg>
                ${d.dir==="sent"?"Sent":"Received"}
              </span>
            </div>`).join("")}
        </div>`:'<div style="color:#94a59b;font-size:13px;padding:12px 0">No drafts recorded yet.</div>'}
    </div>`;
  document.getElementById("clientScreen").classList.add("vis");
}
function setClientStatusFromScreen(v){
  const a=AGs.find(x=>x.id===csAgId);
  a.clientStatus=v;
  openClientScreen(csAgId); // re-render
  ftbl();
}
function saveClientDates(){
  const a=AGs.find(x=>x.id===csAgId);
  if(!a.clientDates)a.clientDates={};
  ["draftStart","latestModified","effectiveDate","signingDate","endDate"].forEach(k=>{
    const el=document.getElementById("cd-"+k);
    if(el)a.clientDates[k]=el.value;
  });
  showToast("Client details saved","green");
  ftbl();
}
function closeClientScreen(){
  document.getElementById("clientScreen").classList.remove("vis");
  csAgId=null;
}

/* ════════ ANALYSE SCREEN ════════ */
let anSelId=null, anMode="matrix", anDraftA=0, anDraftB=1;
let anOutcomeFilter="", anClauseSearch="";
let anAISelectedDrafts=null; // null = all drafts; array of indices when user picks specific ones

const OC={
  accepted:{l:"Client accepted",short:"Accepted",cls:"oc-accepted",dot:"#16A34A"},
  held:    {l:"GyfTR held firm",short:"Held Firm",cls:"oc-held",    dot:"#2D7FF9"},
  partial: {l:"Compromise",     short:"Partial",  cls:"oc-partial",  dot:"#D97706"},
  pending: {l:"Still open",     short:"Pending",  cls:"oc-pending",  dot:"#DC2626"}
};

const CT_COLORS={
  "ct-b":"#DBEAFE","ct-g":"#EDF6D9","ct-p":"#EDE9FE",
  "ct-t":"#EAF7F9","ct-a":"#FEF3C7","ct-r":"#FEE2E2","ct-q":"#EEF4EF"
};
const CT_TEXT={
  "ct-b":"#1D4ED8","ct-g":"#3B6B12","ct-p":"#5B21B6",
  "ct-t":"#067A8C","ct-a":"#92400E","ct-r":"#B91C1C","ct-q":"#586860"
};

/* ════════ DASHBOARD ════════ */
let sentReminders={};
function daysAgo(dateStr){
  if(!dateStr)return null;
  return Math.floor((new Date()-new Date(dateStr))/86400000);
}
function openDashboard(){
  document.getElementById("dashScreen").classList.add("vis");
  renderDashboard();
}
function closeDashboard(){document.getElementById("dashScreen").classList.remove("vis");}

function renderDashboard(){
  const active=AGs.filter(a=>a.st!=="closed");

  // ── KPIs ──
  const totalActive=active.length;
  let allPending=[];
  active.forEach(a=>{
    (a.clauses||[]).forEach(c=>{
      if(c.outcome==="pending"&&getChangedClauses([c]).length)
        allPending.push({...c,client:a.client,tag:a.tag,ct:a.ct,agId:a.id});
    });
  });
  // stuck = waiting on someone, derive from team status not approved + aging
  const stuck=active.filter(a=>{
    return ["L","F","C","B"].some(t=>a.teamAging&&a.teamAging[t]&&parseInt(a.teamAging[t])>=3);
  });
  // avg client turnaround (received drafts gap)
  let taSum=0,taCount=0;
  active.forEach(a=>{
    (a.drafts||[]).forEach((d,i)=>{
      if(i>0){const g=Math.round((new Date(d.date)-new Date(a.drafts[i-1].date))/86400000);taSum+=g;taCount++;}
    });
  });
  const avgTa=taCount?Math.round(taSum/taCount):0;

  // ── BOTTLENECKS: who is each agreement stuck on ──
  const bottlenecks=[];
  active.forEach(a=>{
    ["L","F","C","B"].forEach(t=>{
      const ag=a.teamAging&&a.teamAging[t]?parseInt(a.teamAging[t]):0;
      if(ag>=1&&a.tm[t]!=="tc-green"){
        bottlenecks.push({client:a.client,tag:a.tag,ct:a.ct,agId:a.id,team:TF[t],teamCode:t,days:ag,status:TCL[a.tm[t]]});
      }
    });
  });
  bottlenecks.sort((x,y)=>y.days-x.days);

  // ── REMINDERS: stalled drafts waiting on client or team ──
  const reminders=[];
  active.forEach(a=>{
    const lastDraft=a.drafts&&a.drafts.length?a.drafts[a.drafts.length-1]:null;
    if(lastDraft){
      const d=daysAgo(lastDraft.date);
      if(d>=3){
        const isSentToClient=lastDraft.dir==="sent";
        const waitingOn=isSentToClient?"Client":"Internal teams";
        const contactName=isSentToClient?(a.sp&&a.sp.B?a.sp.B:"Client contact"):"";
        const TNAME={L:'Legal',F:'Finance',C:'Compliance',B:'Business'};
        const TCOL={L:'#15803D',F:'#1D4ED8',C:'#B45309',B:'#7C3AED'};
        const TBGCOL={L:'#DCFCE7',F:'#DBEAFE',C:'#FEF3C7',B:'#EDE9FE'};
        const pendingTeams=!isSentToClient
          ?Object.entries(a.tm||{}).filter(([t,s])=>s!=='tc-green').map(([t])=>({code:t,name:TNAME[t]||t,color:TCOL[t]||'#586860',bg:TBGCOL[t]||'#EEF4EF'}))
          :[];
        reminders.push({
          client:a.client,tag:a.tag,ct:a.ct,agId:a.id,
          waitingOn,contactName,days:d,draft:lastDraft.n,
          isSentToClient,pendingTeams
        });
      }
    }
  });
  reminders.sort((x,y)=>y.days-x.days);

  // ── TURNAROUND by team ──
  const teamTa={L:[],F:[],C:[],B:[]};
  active.forEach(a=>{
    ["L","F","C","B"].forEach(t=>{
      if(a.teamAging&&a.teamAging[t])teamTa[t].push(parseInt(a.teamAging[t]));
    });
  });
  const teamAvg=Object.keys(teamTa).map(t=>({
    team:TF[t],
    avg:teamTa[t].length?(teamTa[t].reduce((s,v)=>s+v,0)/teamTa[t].length):0,
    count:teamTa[t].length
  }));
  const maxAvg=Math.max(...teamAvg.map(t=>t.avg),1);

  const body=document.getElementById("dashBody");
  body.innerHTML=`
    <div class="dash-hero">
      <div class="dash-hero-title">Good ${new Date().getHours()<12?"morning":new Date().getHours()<17?"afternoon":"evening"}, ${ROLES[role].name.split(" ")[0]} 👋</div>
      <div class="dash-hero-sub">${
        role==="legal"?"Here's where every agreement stands — and what needs your attention today.":
        role==="finance"?"Agreements awaiting your Finance review are highlighted below.":
        role==="business"?"Track deal progress and see where client negotiations stand.":
        "Your compliance reviews and open items are surfaced below."
      }</div>
    </div>

    <!-- KPIs -->
    <div class="dash-kpi-row">
      <div class="dash-kpi"><div class="dash-kpi-accent" style="background:var(--pop)"></div>
        <div class="dash-kpi-lbl">Active Agreements</div>
        <div class="dash-kpi-num" style="color:var(--ink)">${totalActive}</div>
        <div class="dash-kpi-sub">in progress right now</div>
      </div>
      <div class="dash-kpi"><div class="dash-kpi-accent" style="background:#D97706"></div>
        <div class="dash-kpi-lbl">Stuck / Delayed</div>
        <div class="dash-kpi-num" style="color:#D97706">${stuck.length}</div>
        <div class="dash-kpi-sub">waiting 3+ days on a team</div>
      </div>
      <div class="dash-kpi"><div class="dash-kpi-accent" style="background:#DC2626"></div>
        <div class="dash-kpi-lbl">Open Clauses</div>
        <div class="dash-kpi-num" style="color:#DC2626">${allPending.length}</div>
        <div class="dash-kpi-sub">unresolved across deals</div>
      </div>
      <div class="dash-kpi"><div class="dash-kpi-accent" style="background:#2D7FF9"></div>
        <div class="dash-kpi-lbl">Avg Turnaround</div>
        <div class="dash-kpi-num" style="color:#2D7FF9">${avgTa}<span style="font-size:18px">d</span></div>
        <div class="dash-kpi-sub">between drafts</div>
      </div>
    </div>

    <!-- Row 1: Bottlenecks + Reminders -->
    <div class="dash-grid">
      <div class="dash-card">
        <div class="dash-card-hdr">
          <div class="dash-card-icon" style="background:#FFF8E1"><svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 1h10M3 15h10M4 1v3l4 4 4-4V1M4 15v-3l4-4 4 4v3" stroke="#D97706" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
          <div class="dash-card-title">Where It's Stuck</div>
          <span class="dash-card-count" style="background:#FFFBEB;color:#92400E">${bottlenecks.length}</span>
        </div>
        <div class="dash-card-body">
          ${bottlenecks.length?bottlenecks.map(b=>{
            const cls=b.days>=5?"over":b.days>=3?"warn":"ok";
            return `<div class="bn-row" onclick="closeDashboard()">
              <span class="bn-tag ${b.ct}">${b.tag}</span>
              <div class="bn-info">
                <div class="bn-client">${b.client}</div>
                <div class="bn-detail">Waiting on <b>${b.team}</b> · currently ${b.status}</div>
              </div>
              <span class="bn-stuck ${cls}">${b.days}d</span>
            </div>`;
          }).join(""):'<div class="dash-empty">✓ Nothing is stuck. Everything is moving.</div>'}
        </div>
      </div>

      <div class="dash-card">
        <div class="dash-card-hdr">
          <div class="dash-card-icon" style="background:#EFF6FF"><svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 1.5a4.5 4.5 0 00-4.5 4.5c0 3.5-1.5 4.5-1.5 4.5h12s-1.5-1-1.5-4.5A4.5 4.5 0 008 1.5zM6.5 13a1.5 1.5 0 003 0" stroke="#2D7FF9" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
          <div class="dash-card-title">Needs a Nudge</div>
          <span class="dash-card-count" style="background:#EFF6FF;color:#1D4ED8">${reminders.length}</span>
        </div>
        <div class="dash-card-body">
          ${reminders.length?reminders.map((r,i)=>{
            const key=`${r.agId}-${r.draft}`;
            const log=reminderLog[key]||[];
            const sent=log.length>0;
            const lastSent=sent?log[log.length-1].ts:"";
            const teamBadges=(r.pendingTeams||[]).map(t=>`<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;background:${t.bg};color:${t.color}">${t.name}</span>`).join('');
            const nudgeLabel=r.isSentToClient?"Nudge Client":(r.pendingTeams&&r.pendingTeams.length?`Nudge ${r.pendingTeams.map(t=>t.name).join(' & ')}`:"Nudge");
            return `<div class="rm-row" id="rmrow-${key}">
              <div class="rm-avatar" style="background:${CT_COLORS[r.ct]||'#EEF4EF'};color:${CT_TEXT[r.ct]||'#586860'}">${r.tag.slice(0,2)}</div>
              <div class="rm-info">
                <div class="rm-who">${r.client}</div>
                <div class="rm-what">
                  <b>${r.draft}</b> · ${r.days}d ago
                  · waiting on <b style="color:${r.isSentToClient?"#1D4ED8":"#D97706"}">${r.waitingOn}</b>
                  ${r.contactName?`<span style="color:#94a59b">·</span><span style="font-size:10.5px;color:var(--ink-soft)">${r.contactName}</span>`:""}
                </div>
                ${teamBadges?`<div style="display:flex;gap:4px;margin-top:5px;flex-wrap:wrap">${teamBadges}</div>`:""}
                ${sent?`<div class="rm-hist" style="color:var(--pop-deep);font-size:10.5px;margin-top:4px;font-weight:600">
                  ✓ Nudge sent ${log.length}× · last at ${lastSent}
                </div>`:""}
              </div>
              <button class="rm-nudge ${sent?"sent":""}" onclick="sendNudge('${key}',${Q(r.agId)},'${r.client}',this)"
                style="${sent?"background:#F0FDF4;color:#15803D;border-color:#BBF7D0":""}">
                ${sent
                  ?`<svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Nudge again`
                  :`<svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M2 8h10M8 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> ${nudgeLabel}`}
              </button>
            </div>`;
          }).join(""):'<div class="dash-empty">✓ No follow-ups pending.</div>'}
        </div>
      </div>
    </div>

    <!-- Row 2: Pending clauses + Turnaround -->
    <div class="dash-grid">
      <div class="dash-card">
        <div class="dash-card-hdr">
          <div class="dash-card-icon" style="background:#FEF2F2"><svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M3 2h7l3 3v9H3V2z" stroke="#DC2626" stroke-width="1.3" stroke-linejoin="round"/><path d="M6 8h4M6 11h3" stroke="#DC2626" stroke-width="1.2" stroke-linecap="round"/></svg></div>
          <div class="dash-card-title">All Open Clauses</div>
          <span class="dash-card-count" style="background:#FEF2F2;color:#DC2626">${allPending.length}</span>
        </div>
        <div class="dash-card-body">
          ${allPending.length?allPending.map(p=>`
            <div class="pc-row" onclick="closeDashboard();setTimeout(()=>{openAnalyse();setTimeout(()=>selectAnAgreement(${Q(p.agId)}),120)},120)">
              <span class="pc-cl">Cl.${p.no}</span>
              <div class="pc-info">
                <div class="pc-name">${p.name}</div>
                <div class="pc-client">${p.client}</div>
              </div>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;opacity:.4"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>`).join(""):'<div class="dash-empty">✓ No open clauses. All negotiated.</div>'}
        </div>
      </div>

      <div class="dash-card">
        <div class="dash-card-hdr">
          <div class="dash-card-icon" style="background:#F0FDF4"><svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 13l4-4 3 3 5-6" stroke="#16A34A" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
          <div class="dash-card-title">Team Turnaround</div>
        </div>
        <div class="dash-card-body">
          ${teamAvg.map(t=>{
            const pct=Math.round((t.avg/maxAvg)*100);
            const color=t.avg>=4?"#DC2626":t.avg>=2?"#D97706":"#16A34A";
            return `<div class="ta-row">
              <div class="ta-head">
                <span class="ta-name">${t.team}</span>
                <span class="ta-val" style="color:${color}">${t.avg?t.avg.toFixed(1)+"d avg":"On time"}</span>
              </div>
              <div class="ta-bar-track"><div class="ta-bar-fill" style="width:${t.avg?Math.max(pct,8):4}%;background:${color}"></div></div>
            </div>`;
          }).join("")}
          <div style="padding:10px 18px;font-size:11px;color:#94a59b;border-top:1px solid var(--line-soft);margin-top:4px">Average days each team holds an agreement before actioning it.</div>
        </div>
      </div>
    </div>`;
}

function sendNudge(key,agId,client,btn){
  const a=AGs.find(x=>x.id===agId);
  // determine which team to notify — whoever hasn't approved yet
  const teamsToNotify=["L","F","C","B"].filter(t=>a&&a.tm[t]!=="tc-green"&&t!==ROLES[role].team);
  // log the reminder with timestamp + teams
  if(!reminderLog[key])reminderLog[key]=[];
  reminderLog[key].push({ts:ns(),from:ROLES[role].name,fromRole:role,teams:teamsToNotify,client,agId});
  sentReminders[key]=true;
  const log=reminderLog[key];
  const cnt=log.length;
  const lastTs=log[log.length-1].ts;

  // update button in place — allow "remind again"
  btn.style.background="#F0FDF4";
  btn.style.color="#15803D";
  btn.style.borderColor="#BBF7D0";
  btn.innerHTML=`<svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Remind again`;

  // update or insert the history line below the rm-what line
  const row=document.getElementById("rmrow-"+key);
  if(row){
    let hist=row.querySelector(".rm-hist");
    if(!hist){
      hist=document.createElement("div");
      hist.className="rm-hist";
      hist.style.cssText="color:var(--pop-deep);font-size:10.5px;margin-top:2px;font-weight:600";
      const info=row.querySelector(".rm-info");
      if(info)info.appendChild(hist);
    }
    hist.textContent=`✓ Reminded ${cnt}× · last at ${lastTs}`;
  }

  showToast(`Reminder sent for ${client} (×${cnt})`,"green");
  // update notification bar if visible (same session demo)
  checkReminderNotifications();
}

function openAnalyse(){
  document.getElementById("analyseScreen").classList.add("vis");
  // always start at picker
  anSelId=null;
  document.getElementById("anPickerStep").style.display="flex";
  document.getElementById("anMatrixStep").classList.remove("vis");
  renderAnList();
}
function closeAnalyse(){
  document.getElementById("analyseScreen").classList.remove("vis");
  anSelId=null;
}
function anGoBack(){
  anSelId=null; anMode="matrix"; anDraftA=0; anDraftB=1;
  anOutcomeFilter=""; anClauseSearch="";
  document.getElementById("anPickerStep").style.display="flex";
  document.getElementById("anMatrixStep").classList.remove("vis");
  renderAnList();
}
function filterAnList(){anClauseSearch="";renderAnCardGrid();}

function renderAnList(){renderAnCardGrid();}

function renderAnCardGrid(){
  const q=(document.getElementById("anSearch")?.value||"").toLowerCase();
  const ty=document.getElementById("anTypeFilter")?.value||"";
  const st=document.getElementById("anStatusFilter")?.value||"";

  const items=AGs.filter(a=>{
    if(!a.drafts||!a.drafts.length)return false;
    if(q&&!a.client.toLowerCase().includes(q))return false;
    if(ty&&!a.type.includes(ty))return false;
    if(st&&a.st!==st)return false;
    return true;
  });

  const countEl=document.getElementById("anPickerCount");
  if(countEl)countEl.textContent=items.length+" agreement"+(items.length!==1?"s":"");

  const grid=document.getElementById("anCardGrid");
  if(!items.length){
    grid.innerHTML=`<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#94a59b;font-size:14px">No agreements with draft data found.</div>`;
    return;
  }

  grid.innerHTML=items.map(a=>{
    const changed=getChangedClauses(a.clauses||[]);
    const pending=changed.filter(c=>c.outcome==="pending").length;
    const accepted=changed.filter(c=>c.outcome==="accepted").length;
    const held=changed.filter(c=>c.outcome==="held").length;
    const partial=changed.filter(c=>c.outcome==="partial").length;
    const lastDraft=a.drafts[a.drafts.length-1];
    const daysSince=lastDraft?Math.floor((new Date()-new Date(lastDraft.date))/86400000):null;
    const daysColor=daysSince>7?"#DC2626":daysSince>3?"#D97706":"#15803D";
    const daysLabel=daysSince===0?"Today":daysSince===1?"Yesterday":daysSince+"d ago";
    const sm=SC[a.st]||{l:a.st,c:""};
    const tagBg=CT_COLORS[a.ct]||"#EEF4EF";
    const tagTx=CT_TEXT[a.ct]||"#586860";

    // outcome mini-bars
    const ocBars=[
      accepted?`<span class="an-card-oc oc-accepted">${accepted} accepted</span>`:"",
      held?`<span class="an-card-oc oc-held">${held} held firm</span>`:"",
      partial?`<span class="an-card-oc oc-partial">${partial} partial</span>`:"",
      pending?`<span class="an-card-oc oc-pending">${pending} pending</span>`:"",
    ].filter(Boolean).join("");

    return `<div class="an-card" onclick="selectAnAgreement(${Q(a.id)})">
      ${pending?`<div class="an-card-pending">⚠ ${pending} open</div>`:""}
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span class="an-card-tag" style="background:${tagBg};color:${tagTx}">${a.tag}</span>
        <span class="badge ${sm.c}" style="font-size:10px;padding:2px 8px"><span class="bdot"></span>${sm.l}</span>
      </div>
      <div class="an-card-name">${a.client}</div>
      <div class="an-card-type">${a.type}</div>
      <div class="an-card-stats">
        <div class="an-card-stat">
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M3 2h8l3 3v9H3V2z" stroke="currentColor" stroke-width="1.4"/></svg>
          ${a.drafts.length} drafts
        </div>
        <div class="an-card-stat">
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
          ${changed.length} clauses tracked
        </div>
        ${daysSince!==null?`<div class="an-card-stat" style="color:${daysColor}">
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.4"/><path d="M8 5v3.5l2 1.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
          ${daysLabel}
        </div>`:""}
      </div>
      ${ocBars?`<div class="an-card-outcome-row">${ocBars}</div>`:""}
      <div class="an-card-footer">
        <span class="an-card-last">${lastDraft?`Latest: ${lastDraft.n} · ${fd(lastDraft.date)}`:"No drafts"}</span>
        <div class="an-card-cta">
          Analyse
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
      </div>
    </div>`;
  }).join("");
}

function selectAnAgreement(id){
  anSelId=id; anMode="matrix"; anDraftA=0; anDraftB=1; anAISelectedDrafts=null;
  anOutcomeFilter=""; anClauseSearch="";
  // switch to matrix step
  document.getElementById("anPickerStep").style.display="none";
  document.getElementById("anMatrixStep").classList.add("vis");
  const a=AGs.find(x=>x.id===id);
  document.getElementById("anMatrixClientName").textContent=a.client;
  document.getElementById("anMatrixTypeBadge").textContent=a.type;
  renderAnMain();
}

function renderAnMain(){
  const a=AGs.find(x=>x.id===anSelId);
  if(!a)return;
  const drafts=a.drafts||[];
  const clauses=a.clauses||[];
  const main=document.getElementById("anMain");
  // sync tab buttons
  document.getElementById("anTabMatrix").className="an-tab"+(anMode==="matrix"?" on":"");
  document.getElementById("anTabCompare").className="an-tab"+(anMode==="compare"?" on":"");
  const aiTab=document.getElementById("anTabAI");
  if(aiTab) aiTab.className="an-tab an-tab-ai"+(anMode==="ai"?" on":"");
  if(anMode==="ai"){renderAnAiMode(a,main);return;}
  if(!drafts.length||!clauses.length){
    main.innerHTML=`<div class="an-upload-prompt">
      <div class="an-upload-icon">
        <svg width="30" height="30" viewBox="0 0 32 32" fill="none"><path d="M6 4h16l6 6v18a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="var(--pop-deep)" stroke-width="1.8" stroke-linejoin="round"/><path d="M22 4v8h6M16 14v10M12 20l4 4 4-4" stroke="var(--pop-deep)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <div class="an-upload-title">No drafts tracked yet for ${a.client}</div>
      <div class="an-upload-sub">Once your team uploads drafts and Legal logs clause changes, the full negotiation matrix will appear here.</div>
      <div class="an-upload-steps">
        <div class="an-upload-step"><div class="an-step-num">1</div><div><div class="an-step-txt">Upload D1 to S3</div><div class="an-step-sub">Legal uploads the initial draft from GyfTR's template</div></div></div>
        <div class="an-upload-step"><div class="an-step-num">2</div><div><div class="an-step-txt">Client returns with changes</div><div class="an-step-sub">Upload D2 — the redlined version from the client</div></div></div>
        <div class="an-upload-step"><div class="an-step-num">3</div><div><div class="an-step-txt">Clause matrix auto-generates</div><div class="an-step-sub">AI compares both drafts and populates this screen</div></div></div>
      </div>
    </div>`;
    return;
  }
  const changed=getChangedClauses(clauses);
  // negotiation summary counts
  const nAcc=changed.filter(c=>c.outcome==="accepted").length;
  const nHeld=changed.filter(c=>c.outcome==="held").length;
  const nPart=changed.filter(c=>c.outcome==="partial").length;
  const nPend=changed.filter(c=>c.outcome==="pending").length;

  main.innerHTML=`
    <!-- negotiation summary strip -->
    <div class="an-summary">
      <span style="font-size:11.5px;font-weight:700;color:var(--ink-soft)">Negotiation outcome:</span>
      <div class="an-sum-chip oc-accepted" onclick="setAnOutcomeFilter('accepted')">
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        ${nAcc} Accepted by GyfTR
      </div>
      <div class="an-sum-chip oc-held" onclick="setAnOutcomeFilter('held')">
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M8 3v10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        ${nHeld} GyfTR Held Firm
      </div>
      <div class="an-sum-chip oc-partial" onclick="setAnOutcomeFilter('partial')">
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M3 8h10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        ${nPart} Compromise
      </div>
      ${nPend?`<div class="an-sum-chip oc-pending" onclick="setAnOutcomeFilter('pending')">
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v3.5l2 1.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        ${nPend} Still Pending
      </div>`:""}
      ${anOutcomeFilter?`<button onclick="setAnOutcomeFilter('')" style="font-size:11px;font-weight:700;color:var(--pop-deep);background:var(--pop-soft);border:none;padding:4px 10px;border-radius:6px;cursor:pointer;margin-left:4px">✕ Clear filter</button>`:""}
      <span style="margin-left:auto;font-size:12px;font-weight:700;color:var(--ink-soft)">${drafts.length} drafts · ${changed.length} clauses tracked</span>
    </div>

    ${nPend?`<!-- open issues strip -->
    <div class="an-issues-strip">
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="#D97706" stroke-width="1.5"/><path d="M8 5v3M8 11v.5" stroke="#D97706" stroke-width="1.5" stroke-linecap="round"/></svg>
      <span style="font-size:11.5px;font-weight:700;color:#92400E">${nPend} unresolved clause${nPend!==1?"s":""} need attention:</span>
      ${changed.filter(c=>c.outcome==="pending").map(c=>`<span class="an-issue-chip">Cl.${c.no} ${c.name}</span>`).join("")}
    </div>`:""}

    <!-- filter bar -->
    <div class="an-filter-bar">
      <div style="position:relative">
        <svg style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:#94a59b;pointer-events:none" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6.5" cy="6.5" r="5"/><path d="M10.5 10.5l4 4" stroke-linecap="round"/></svg>
        <input class="an-filter-inp" type="text" placeholder="Filter clauses…" id="anClauseSearch" oninput="anClauseSearch=this.value;renderAnContent(AGs.find(x=>x.id===anSelId),AGs.find(x=>x.id===anSelId).drafts,AGs.find(x=>x.id===anSelId).clauses)" value="${anClauseSearch}">
      </div>
      <select class="an-filter-sel" id="anOcFilter" onchange="setAnOutcomeFilter(this.value)">
        <option value="">All outcomes</option>
        <option value="accepted" ${anOutcomeFilter==="accepted"?"selected":""}>✓ Accepted by GyfTR</option>
        <option value="held" ${anOutcomeFilter==="held"?"selected":""}>◉ GyfTR Held Firm</option>
        <option value="partial" ${anOutcomeFilter==="partial"?"selected":""}>◑ Compromise</option>
        <option value="pending" ${anOutcomeFilter==="pending"?"selected":""}>⚠ Still Pending</option>
      </select>
      <span style="font-size:11.5px;color:var(--ink-soft)">
        <span style="background:#EDF6D9;border:1px solid rgba(98,170,42,.3);padding:2px 7px;border-radius:5px;font-size:10.5px;font-weight:700;color:var(--pop-deep)">D1</span>
        = GyfTR initial position (baseline)
      </span>
      <span style="margin-left:auto;font-size:11px;font-weight:600;color:var(--ink-soft)" id="anClauseCount"></span>
    </div>

    <div style="flex:1;overflow:hidden;display:flex;flex-direction:column;min-height:0" id="anContent"></div>`;

  renderAnContent(a,drafts,clauses);
}

/* ════════ AI ANALYSIS MODE ════════ */
function renderAnAiMode(a,main){
  const hasKey=!!(window.gAIGetKey&&window.gAIGetKey());
  const cachedResult=a._aiAnalysis||null;
  const drafts=a.drafts||[];

  // default: all drafts selected
  if(!anAISelectedDrafts||anAISelectedDrafts.length===0){
    anAISelectedDrafts=drafts.map((_,i)=>i);
  }
  // clamp in case agreement changed
  anAISelectedDrafts=anAISelectedDrafts.filter(i=>i<drafts.length);
  if(!anAISelectedDrafts.length) anAISelectedDrafts=drafts.map((_,i)=>i);

  const selCount=anAISelectedDrafts.length;
  const draftPills=drafts.map((d,i)=>{
    const on=anAISelectedDrafts.includes(i);
    return `<button class="ai-draft-pill${on?" on":""}" onclick="window._toggleAIDraft(${i},${Q(a.id)})"
      title="${d.n} · ${d.date} · ${d.dir==='sent'?'↗ Sent':'↙ Received'}">${d.n}</button>`;
  }).join("");

  main.innerHTML=`
    <div class="ai-mode-wrap">
      <div id="aiKeyBar" style="display:none"></div>

      <!-- Run bar: draft selector + analyse button -->
      <div class="ai-run-bar" id="aiRunBar">
        <div style="display:flex;flex-direction:column;gap:7px">
          <div style="font-size:14px;font-weight:700;color:var(--ink)">${a.client} — ${a.type} Agreement</div>
          <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
            <span style="font-size:11px;font-weight:700;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em">Analyse drafts:</span>
            ${draftPills}
            ${selCount<drafts.length?`<button style="font-size:10.5px;color:var(--pop-deep);background:none;border:none;cursor:pointer;padding:0;font-weight:700" onclick="window._selectAllAIDrafts(${Q(a.id)})">Select all</button>`:""}
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">
          <button class="gx-btn gx-btn-dark" id="aiRunBtn" style="font-size:12.5px;padding:7px 18px;gap:7px" onclick="window._runAIAnalysis(${Q(a.id)})">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2l1.5 3.5L13 7l-3.5 1.5L8 12l-1.5-3.5L3 7l3.5-1.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>
            ${cachedResult?"Re-Analyse":"Analyse with AI"}
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div id="aiLoadingState" style="display:none;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:16px;padding:40px">
        <div style="display:flex;gap:5px"><div class="ai-dot"></div><div class="ai-dot" style="animation-delay:.2s"></div><div class="ai-dot" style="animation-delay:.4s"></div></div>
        <div id="aiLoadingMsg" style="font-size:13.5px;font-weight:700;color:var(--ink-soft)">Sending to GPT-4o mini…</div>
        <div style="font-size:11.5px;color:#94a59b">Analysing ${selCount} draft${selCount!==1?"s":""} · ${(a.clauses||[]).length} clauses</div>
      </div>

      <!-- Result area -->
      <div id="aiResultArea" style="flex:1;overflow-y:auto;padding:0 0 24px"></div>
    </div>`;

  if(cachedResult&&window.gAIRender){
    window.gAIRender(cachedResult,document.getElementById("aiResultArea"));
  }
}

window._toggleAIDraft=function(idx,agId){
  const a=AGs.find(x=>x.id===agId); if(!a)return;
  const i=anAISelectedDrafts.indexOf(idx);
  if(i===-1){
    anAISelectedDrafts=[...anAISelectedDrafts,idx].sort((a,b)=>a-b);
  } else if(anAISelectedDrafts.length>1){
    anAISelectedDrafts=anAISelectedDrafts.filter(x=>x!==idx);
  }
  // re-render just the run bar area
  const main=document.getElementById("anMain");
  const a2=AGs.find(x=>x.id===anSelId);
  if(a2) renderAnAiMode(a2,main);
};

window._selectAllAIDrafts=function(agId){
  const a=AGs.find(x=>x.id===agId); if(!a)return;
  anAISelectedDrafts=(a.drafts||[]).map((_,i)=>i);
  const main=document.getElementById("anMain");
  renderAnAiMode(a,main);
};

window._saveAIKey=function(){
  const v=document.getElementById("aiKeyInput")?.value?.trim();
  if(!v){showToast("Enter your OpenAI key first");return;}
  if(window.gAISaveKey) window.gAISaveKey(v);
  showToast("Key saved","green");
  document.getElementById("aiKeyBar").style.display="none";
  // re-render to show Analyse button enabled state
  renderAnMain();
};

const AI_LOADING_MSGS=["Sending to GPT-4o mini…","Reading draft history…","Mapping clause outcomes…","Checking what's still open…","Writing negotiation brief…"];
window._runAIAnalysis=async function(agId){
  const a=AGs.find(x=>x.id===agId);
  if(!a)return;
  const key=window.gAIGetKey?window.gAIGetKey():"";
  if(!key){showToast("OpenAI key not configured");return;}
  const loadEl=document.getElementById("aiLoadingState");
  const resultEl=document.getElementById("aiResultArea");
  const runBtn=document.getElementById("aiRunBtn");
  if(loadEl){loadEl.style.display="flex";resultEl.style.display="none";}
  if(runBtn){runBtn.disabled=true;runBtn.textContent="Analysing…";}

  // cycle loading messages
  let mi=0;
  const msgEl=document.getElementById("aiLoadingMsg");
  const interval=setInterval(()=>{mi=(mi+1)%AI_LOADING_MSGS.length;if(msgEl)msgEl.textContent=AI_LOADING_MSGS[mi];},1200);

  // build a filtered agreement with only selected drafts
  const selectedIdxs=anAISelectedDrafts&&anAISelectedDrafts.length?(anAISelectedDrafts):(a.drafts||[]).map((_,i)=>i);
  const aFiltered={
    ...a,
    drafts:(a.drafts||[]).filter((_,i)=>selectedIdxs.includes(i)),
    clauses:(a.clauses||[]).map(c=>({
      ...c,
      changes:selectedIdxs.map(i=>c.changes?.[i]||"")
    }))
  };

  // get doc text from editor if open
  let docText="";
  const editor=document.getElementById("docEditor");
  if(editor&&editor.textContent&&editor.textContent.trim().length>100){
    docText=editor.textContent.trim().slice(0,4000);
  }

  try{
    const result=await window.gAIAnalyze(aFiltered,key,docText);
    a._aiAnalysis=result;
    clearInterval(interval);
    if(loadEl) loadEl.style.display="none";
    if(resultEl){resultEl.style.display="";if(window.gAIRender)window.gAIRender(result,resultEl);}
    if(runBtn){runBtn.disabled=false;runBtn.innerHTML='<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2l1.5 3.5L13 7l-3.5 1.5L8 12l-1.5-3.5L3 7l3.5-1.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg> Re-Analyse with AI';}
    showToast("AI analysis complete","green");
  }catch(e){
    clearInterval(interval);
    if(loadEl) loadEl.style.display="none";
    if(resultEl){resultEl.style.display="";}
    if(runBtn){runBtn.disabled=false;runBtn.innerHTML='<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2l1.5 3.5L13 7l-3.5 1.5L8 12l-1.5-3.5L3 7l3.5-1.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg> Re-Analyse with AI';}
    if(e.message==="no_key"){document.getElementById("aiKeyBar").style.display="flex";showToast("Enter your OpenAI API key");}
    else if(e.message==="invalid_key"){showToast("Invalid OpenAI key — check and try again");}
    else{showToast("AI error: "+e.message);}
  }
};

function setAnOutcomeFilter(v){
  anOutcomeFilter=v;
  const sel=document.getElementById("anOcFilter");
  if(sel)sel.value=v;
  const a=AGs.find(x=>x.id===anSelId);
  if(a)renderAnContent(a,a.drafts,a.clauses);
  // update summary chips active state — re-render full main to reflect cleared/set filter
  renderAnMain();
}

function anSetMode(m){
  anMode=m;
  document.getElementById("anTabMatrix").className="an-tab"+(m==="matrix"?" on":"");
  document.getElementById("anTabCompare").className="an-tab"+(m==="compare"?" on":"");
  const aiTab=document.getElementById("anTabAI");
  if(aiTab) aiTab.className="an-tab an-tab-ai"+(m==="ai"?" on":"");
  renderAnMain();
}

// Only include clauses that have at least one non-empty change across any draft
function getChangedClauses(clauses){
  return (clauses||[]).filter(c=>c.changes&&c.changes.some(ch=>ch&&ch!=="NA"&&ch.trim()));
}

// Word-diff: highlight words in newTxt not in oldTxt
function wordDiff(oldTxt,newTxt){
  if(!oldTxt)return`<span class="an-new-line">${newTxt}</span>`;
  const oldWords=new Set(oldTxt.split(/[\s,]+/));
  return newTxt.split(/(\s+)/).map(tok=>
    /^\s+$/.test(tok)?tok:(oldWords.has(tok)?tok:`<span class="an-new-line">${tok}</span>`)
  ).join("");
}

// Clause outcome select — legal can change per clause
function setClauseOutcome(agId,clauseNo,val){
  const a=AGs.find(x=>x.id===agId);
  if(!a||!a.clauses)return;
  const c=a.clauses.find(x=>x.no===clauseNo);
  if(c){c.outcome=val;renderAnMain();}
  showToast("Outcome updated","green");
}

function renderAnContent(a,drafts,clauses){
  const wrap=document.getElementById("anContent");
  if(!wrap)return;
  let changed=getChangedClauses(clauses);

  // apply outcome filter
  if(anOutcomeFilter)changed=changed.filter(c=>c.outcome===anOutcomeFilter);
  // apply clause search
  if(anClauseSearch){
    const q=anClauseSearch.toLowerCase();
    changed=changed.filter(c=>c.name.toLowerCase().includes(q)||c.no.includes(q));
  }

  const countEl=document.getElementById("anClauseCount");
  if(countEl)countEl.textContent=changed.length+" clause"+(changed.length!==1?"s":"")+" shown";

  if(!changed.length){
    wrap.innerHTML=`<div class="an-placeholder"><div class="an-placeholder-icon">${anOutcomeFilter?"🔍":"✓"}</div><div style="font-size:14px;font-weight:600">${anOutcomeFilter?"No clauses match this filter":"No clause changes tracked"}</div></div>`;
    return;
  }

  if(anMode==="matrix"){
    // ── MATRIX MODE ──
    // D1 is always the first column — GyfTR initial position, visually distinct
    const cols=drafts.map((d,i)=>{
      const isD1=i===0;
      const hasAny=changed.some(c=>c.changes[i]&&c.changes[i].trim()&&c.changes[i]!=="NA");
      const changeCount=changed.filter(c=>c.changes[i]&&c.changes[i].trim()&&c.changes[i]!=="NA").length;
      return `<th class="an-th an-th-draft${isD1?" an-th-d1":""}" style="${hasAny?"":"opacity:.5"}">
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px">
          <span style="font-size:13px;font-weight:800">${d.n}</span>
          ${isD1?`<span style="font-size:9px;font-weight:700;background:rgba(98,170,42,.2);color:var(--pop-deep);padding:1px 5px;border-radius:4px">Baseline</span>`:""}
        </div>
        <div style="font-size:9.5px;color:var(--ink-soft);margin-bottom:3px">${fd(d.date)}</div>
        <span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;${d.dir==="sent"?"background:#F0FDF4;color:#15803D":"background:#FEF2F2;color:#DC2626"}">
          ${d.dir==="sent"?"↗ Sent":"↙ Received"}
        </span>
        ${hasAny&&!isD1?`<div style="font-size:9px;color:var(--pop-deep);margin-top:4px;font-weight:700">${changeCount} change${changeCount!==1?"s":""}</div>`:""}
      </th>`;
    }).join("");

    const rows=changed.map(c=>{
      const oc=OC[c.outcome]||null;
      const changeCount=c.changes.filter(ch=>ch&&ch.trim()&&ch!=="NA").length;
      const cells=drafts.map((d,di)=>{
        const isD1=di===0;
        const txt=(c.changes[di]||"").trim();
        const isEmpty=!txt||txt==="NA";
        const id=`cl-${c.no}-d${di}`;
        // D1: show as GyfTR's original position — green tinted, labelled
        if(isD1){
          return `<td class="an-td an-td-d1">
            <div class="an-cell-inner">
              ${isEmpty
                ?`<span class="an-no-change">GyfTR standard</span>`
                :`<div style="font-size:12px;color:#15803D;font-weight:600;line-height:1.45">${txt}</div>`}
            </div>
          </td>`;
        }
        if(isEmpty)return`<td class="an-td"><div class="an-cell-inner"><span class="an-no-change">—</span></div></td>`;
        const d1txt=(c.changes[0]||"").trim();
        const snippet=txt.length>60?txt.slice(0,60)+"…":txt;
        return `<td class="an-td an-draft-cell">
          <div class="an-cell-inner">
            <div class="an-has-change"><span class="an-diff-highlight">${snippet}</span></div>
            <button class="an-expand-btn" onclick="toggleAnExpand('${id}',this)">▸ Expand</button>
            <div class="an-full-clause" id="${id}">
              <div style="font-size:11px;font-weight:700;color:#94a59b;text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">Change in this draft</div>
              <div style="font-size:12.5px;color:var(--ink);line-height:1.55;margin-bottom:8px">${wordDiff(d1txt,txt)}</div>
              ${c.full?`<div style="padding:8px 10px;background:#F4F8F4;border-radius:8px;border-left:3px solid var(--pop)">
                <div style="font-size:10px;font-weight:700;color:#94a59b;text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">Negotiation context</div>
                <div style="font-size:11.5px;color:var(--ink-soft);line-height:1.55">${c.full}</div>
              </div>`:""}
            </div>
          </div>
        </td>`;
      }).join("");

      return `<tr>
        <td class="an-td" style="background:#FAFCFA;position:sticky;left:0;z-index:1;min-width:170px;border-right:2px solid var(--line)">
          <div class="an-clause-cell">
            <div style="display:flex;align-items:center;gap:5px;margin-bottom:4px;flex-wrap:wrap">
              <span class="an-clause-no">Cl. ${c.no}</span>
              <span style="font-size:9.5px;font-weight:700;color:var(--pop-deep);background:var(--pop-soft);padding:1px 6px;border-radius:4px">${changeCount} round${changeCount!==1?"s":""}</span>
              ${oc?`<span class="oc-badge ${oc.cls}" style="cursor:default"><span style="width:5px;height:5px;border-radius:50%;background:${oc.dot};display:inline-block"></span>${oc.short}</span>`:""}
            </div>
            <span class="an-clause-name">${c.name}</span>
            ${role==="legal"?`<select style="margin-top:5px;font-family:var(--font-b);font-size:10.5px;color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:5px;padding:2px 18px 2px 5px;outline:none;cursor:pointer;appearance:none;background-image:url('data:image/svg+xml,%3Csvg xmlns%3D%22http%3A//www.w3.org/2000/svg%22 width%3D%228%22 height%3D%224%22%3E%3Cpath d%3D%22M1 1l3 2 3-2%22 stroke%3D%22%2394a59b%22 stroke-width%3D%221.2%22 fill%3D%22none%22 stroke-linecap%3D%22round%22/%3E%3C/svg%3E');background-repeat:no-repeat;background-position:right 4px center" onchange="setClauseOutcome(${Q(a.id)},'${c.no}',this.value)">
              <option value="">Set outcome…</option>
              <option value="accepted" ${c.outcome==="accepted"?"selected":""}>✓ Accepted</option>
              <option value="held" ${c.outcome==="held"?"selected":""}>◉ Held Firm</option>
              <option value="partial" ${c.outcome==="partial"?"selected":""}>◑ Partial</option>
              <option value="pending" ${c.outcome==="pending"?"selected":""}>⚠ Pending</option>
            </select>`:""}
          </div>
        </td>
        ${cells}
      </tr>`;
    }).join("");

    wrap.innerHTML=`<div class="an-matrix-wrap"><table class="an-table">
      <thead><tr>
        <th class="an-th" style="position:sticky;left:0;z-index:4;min-width:170px;background:#EEF4EF;border-right:2px solid var(--line)">
          Clause
        </th>${cols}
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;

  } else {
    // ── COMPARE MODE ── default: D1 (baseline) vs latest
    const da=Math.min(anDraftA, drafts.length-1);
    const draftB=Math.min(anDraftB, drafts.length-1);const db=draftB;
    const dOpts=drafts.map((d,i)=>`<option value="${i}">${d.n}${i===0?" (GyfTR Baseline)":""} — ${fd(d.date)}</option>`).join("");

    const cmpClauses=changed.filter(c=>{
      const ot=(c.changes[da]||"").trim(), nt=(c.changes[db]||"").trim();
      return ot||nt;
    });
    const nActualChanged=cmpClauses.filter(c=>{
      const ot=(c.changes[da]||"").trim(), nt=(c.changes[db]||"").trim();
      return ot!==nt&&(ot||nt);
    }).length;

    const rowsHtml=cmpClauses.map(c=>{
      const oldTxt=(c.changes[da]||"").trim();
      const newTxt=(c.changes[db]||"").trim();
      const hasChange=oldTxt!==newTxt&&(oldTxt||newTxt);
      const oc=OC[c.outcome]||null;
      const expandId=`cmp-${c.no}-${da}-${db}`;
      return `<tr>
        <td style="background:#FAFCFA;padding:10px 14px;border-bottom:1px solid var(--line-soft);vertical-align:top;min-width:150px;border-right:1px solid var(--line)">
          <span style="font-size:10px;font-weight:700;color:#94a59b;display:block">Cl. ${c.no}</span>
          <span style="font-size:12.5px;font-weight:700;color:var(--ink);display:block;margin-bottom:4px">${c.name}</span>
          ${oc?`<span class="oc-badge ${oc.cls}" style="cursor:default"><span style="width:5px;height:5px;border-radius:50%;background:${oc.dot};display:inline-block"></span>${oc.short}</span>`:""}
          ${hasChange?`<span style="display:block;margin-top:4px;font-size:9.5px;font-weight:700;color:#D97706;background:#FFFBEB;padding:1px 6px;border-radius:4px;width:fit-content">Changed</span>`:`<span style="display:block;margin-top:4px;font-size:9.5px;color:#94a59b">No change</span>`}
        </td>
        <td class="an-ct-td${hasChange?" changed":""}" style="width:35%;vertical-align:top">
          ${da===0?`<div style="font-size:9px;font-weight:700;color:var(--pop-deep);background:var(--pop-soft);display:inline-block;padding:1px 6px;border-radius:4px;margin-bottom:5px">GyfTR Initial</div><br>`:``}
          ${oldTxt?`<span class="an-changed-line">${oldTxt}</span>`:`<span style="color:#c4cfc7;font-style:italic;font-size:12px">Not in this draft</span>`}
        </td>
        <td class="an-ct-td${hasChange?" changed":""}" style="width:35%;vertical-align:top">
          ${newTxt
            ?(hasChange&&oldTxt?`<span class="an-new-line">${wordDiff(oldTxt,newTxt)}</span>`:`<span class="an-new-line">${newTxt}</span>`)
            :`<span style="color:#c4cfc7;font-style:italic;font-size:12px">Not in this draft</span>`}
          ${c.full&&hasChange?`<button class="an-expand-btn" style="margin-top:6px" onclick="toggleAnExpand('${expandId}',this)">▸ View context</button>
            <div class="an-full-clause" id="${expandId}">
              <div style="font-size:10px;font-weight:700;color:#94a59b;text-transform:uppercase;margin-bottom:3px">Why this changed</div>
              <div style="font-size:11.5px;color:var(--ink-soft);line-height:1.55">${c.full}</div>
            </div>`:""}
        </td>
      </tr>`;
    }).join("");

    wrap.innerHTML=`<div class="an-compare-wrap">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap;padding-bottom:12px;border-bottom:1px solid var(--line)">
        <span style="font-size:13px;font-weight:700;color:var(--ink)">Compare</span>
        <select class="an-draft-sel" onchange="anDraftA=+this.value;renderAnContent(AGs.find(x=>x.id===anSelId),AGs.find(x=>x.id===anSelId).drafts,AGs.find(x=>x.id===anSelId).clauses)">${dOpts.replace(`value="${da}"`,`value="${da}" selected`)}</select>
        <span class="an-vs">vs</span>
        <select class="an-draft-sel" onchange="anDraftB=+this.value;renderAnContent(AGs.find(x=>x.id===anSelId),AGs.find(x=>x.id===anSelId).drafts,AGs.find(x=>x.id===anSelId).clauses)">${dOpts.replace(`value="${db}"`,`value="${db}" selected`)}</select>
        <div style="margin-left:auto;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <span style="font-size:12px;font-weight:700;color:#D97706;background:#FFFBEB;padding:3px 10px;border-radius:7px">${nActualChanged} clause${nActualChanged!==1?"s":""} differ</span>
          <span style="font-size:11px;color:var(--ink-soft)"><span class="an-changed-line" style="font-size:11px">Old</span> → <span class="an-new-line" style="font-size:11px">New (changed words lit)</span></span>
        </div>
      </div>
      <table class="an-compare-table">
        <thead><tr>
          <th class="an-ct-th" style="min-width:150px">Clause</th>
          <th class="an-ct-th">${drafts[da]?drafts[da].n+(da===0?" · GyfTR Baseline":"")+` · ${fd(drafts[da].date)} · ${drafts[da].dir==="sent"?"↗ Sent":"↙ Received"}`:""}</th>
          <th class="an-ct-th">${drafts[db]?drafts[db].n+(db===0?" · GyfTR Baseline":"")+` · ${fd(drafts[db].date)} · ${drafts[db].dir==="sent"?"↗ Sent":"↙ Received"}`:""}</th>
        </tr></thead>
        <tbody>${rowsHtml||`<tr><td colspan="3" style="text-align:center;padding:32px;color:#94a59b;font-size:13px">No clause differences between these two drafts.</td></tr>`}</tbody>
      </table>
    </div>`;
  }
}

function toggleAnExpand(id,btn){
  const el=document.getElementById(id);
  if(!el)return;
  el.classList.toggle("vis");
  btn.textContent=el.classList.contains("vis")?"▾ Collapse":"▸ Expand";
}


/* ════════ EXPOSE ALL FUNCTIONS TO WINDOW ════════ */
// Required because HTML uses inline onclick="functionName()" handlers
// which need functions on window scope when using ES modules
Object.assign(window, {
  // Auth
  doLogin, doSignout,
  // Table
  fstat, ftbl, render, gf, updateStats,
  // Team filter
  toggleTeamDD, toggleTeamOpt,
  // Status
  ums, updateAgreementStatus, updateClientStatus, updateLU,
  // Client status
  renderClientStatusBadge, CS_CFG,
  // Create agreement
  openCreate, closeCr, submitCr,
  // History modal
  openHist, closeHist, filterHist, renderHistRows,
  // Remarks modal
  openRem, closeRem, submitRem, filterRem, renderRemList, renderRemFiltered,
  // Drafts modal
  openDraftsModal, closeDraftsModal, renderDraftsModal, toggleDraftDir, addDraft,
  // Doc screen
  openDoc, closeDoc,
  // Client detail screen
  openClientScreen, closeClientScreen, saveClientDates, setClientStatusFromScreen,
  // Sign
  openSignModal, closeSignModal, confirmSign,
  // Dashboard
  openDashboard, closeDashboard, renderDashboard, sendNudge,
  checkReminderNotifications, dismissReminderBar,
  // Analyse
  openAnalyse, closeAnalyse, anGoBack, anSetMode,
  selectAnAgreement, renderAnCardGrid, filterAnList,
  renderAnMain, renderAnContent, setAnOutcomeFilter,
  setClauseOutcome, toggleAnExpand,
  // Global search
  openGlobalSearch, closeGlobalSearch, runGlobalSearch,
  // Export
  openExport, closeExport, doExport, selectExportOpt,
  // Utils
  copyAgLink, printTable,
  // Constants
  SC, TF, TCL, DOT_CLS, OC,
  // Supabase loader — called by main.js after portal shows
  _loadFromSupabase,
})
