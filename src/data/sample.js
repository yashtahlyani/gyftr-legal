// ─── SAMPLE DATA — Based on real GyfTR agreement templates ────────────────────
export const ROLES = {
  legal:      { name:'Alex Carter',  role:'Legal Team',      av:'AC', team:'L', canCreate:true },
  finance:    { name:'Jordan Lee', role:'Finance Team',    av:'JL', team:'F', canCreate:false },
  business:   { name:'Sam Rivera', role:'Business Team',   av:'SR', team:'B', canCreate:false },
  compliance: { name:'Riley Quinn', role:'Compliance Team', av:'RQ', team:'C', canCreate:false }
}

export let AGs = [

  // ── 1. Meridian Finance — E2E (Buy & Sell, Excel fulfilment) ───────────────────
  {
    id:1, client:'Meridian Finance Limited', tag:'MFL', ct:'ct-b',
    sD:'2026-01-10', type:'API / Direct', st:'review', clientStatus:'responded',
    tm:{L:'tc-green',F:'tc-yellow',C:'tc-none',B:'tc-green'},
    ms:{L:'Approved',F:'Under Review',C:'Pending',B:'Approved'},
    teamAging:{L:null,F:'+3d',C:null,B:null},
    ag:'+3d', ac:'ag-warn', lu:'2026-06-10',
    sp:{L:'Alex Carter',F:'Jordan Lee',C:'Riley Quinn',B:'Sam Rivera'},
    pd:'2026-07-01',
    clientDates:{draftStart:'2026-01-10',latestModified:'2026-06-04',effectiveDate:'2026-07-01',signingDate:'',endDate:'2027-01-09'},
    doc:'https://docs.google.com/document/d/1mtLDflMAwkKM-RGZ1pABfJEpS1GcWAqW/edit',
    remarks:[
      {author:'Alex Carter',role:'Legal',ts:'2026-05-15 10:00',txt:'D1 sent — standard E2E Buy & Sell template used. Revenue share at 15% as per business approval.'},
      {author:'Sam Rivera',role:'Business',ts:'2026-05-20 14:30',txt:'Meridian confirmed interest. Client wants payment cycle changed from 30 to 45 days.'},
      {author:'Jordan Lee',role:'Finance',ts:'2026-06-10 11:00',txt:'45-day payment cycle acceptable but need prefunded advance account clause confirmed. Awaiting Legal to revise Annexure A.'}
    ],
    hist:[
      {d:'2026-01-10 10:00',t:'Legal',b:'Alex Carter',f:'—',to:'Pending'},
      {d:'2026-05-15 10:00',t:'Legal',b:'Alex Carter',f:'Pending',to:'Approved'},
      {d:'2026-05-18 09:00',t:'Business',b:'Sam Rivera',f:'Pending',to:'Approved'},
      {d:'2026-06-10 11:00',t:'Finance',b:'Jordan Lee',f:'Pending',to:'Under Review'}
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
      {id:'cmt-mfl-1',quote:'Client to pay Consideration within 45 days of invoice date. Prefunded advance account to be maintained.',author:'Jordan Lee',role:'Finance Team',team:'F',avatar:'JL',ts:'4 Jun, 11:30',text:'The 45-day cycle is approved by Finance. However, Annexure A must be updated to formally capture the Rs 5L prefunded balance requirement — without this it remains an oral commitment only and cannot be enforced if the client defaults.',resolved:false,replies:[{author:'Alex Carter',role:'Legal Team',team:'L',avatar:'AC',ts:'4 Jun, 14:15',body:'Noted — I will revise Annexure A this week to include the prefund clause explicitly. Will circulate draft by Friday EOD for Finance sign-off before we send D5.'}]},
      {id:'cmt-mfl-2',quote:'Liability of GyfTR capped at Consideration paid during 4 months prior to the date of claim.',author:'Alex Carter',role:'Legal Team',team:'L',avatar:'AC',ts:'5 Jun, 09:45',text:'The 4-month cap is a step up from our standard 3-month. Based on current fee run-rate (~Rs 3L/month), maximum exposure is Rs 12L. Finance please confirm this is within acceptable risk bounds.',resolved:false,replies:[{author:'Jordan Lee',role:'Finance Team',team:'F',avatar:'JL',ts:'5 Jun, 11:00',body:'Finance reviewed — Rs 12L exposure at current run-rate is within acceptable risk limits. Approved. Proceed with 4-month cap.'},{author:'Sam Rivera',role:'Business Team',team:'B',avatar:'SR',ts:'5 Jun, 13:30',body:'Business also aligned. Meridian is a strategic account — this is a reasonable concession to close the deal.'}]},
      {id:'cmt-mfl-3',quote:'GyfTR shall share KYC-compliant merchant list to the Client on a quarterly basis.',author:'Riley Quinn',role:'Compliance Team',team:'C',avatar:'RQ',ts:'6 Jun, 10:20',text:"Compliance reviewed this obligation. The quarterly merchant list must follow RBI's updated PPI guidelines (Circular DPSS.CO.PD No. 1022, 2026). Ensure list format and data fields are aligned before the first quarterly submission.",resolved:false,replies:[]},
      {id:'cmt-mfl-4',quote:'Non-solicitation period: 12 months post termination. Client shall not approach GyfTR merchants directly.',author:'Sam Rivera',role:'Business Team',team:'B',avatar:'SR',ts:'7 Jun, 16:00',text:'Business fully supports the 12-month non-solicitation. Meridian has shown interest in directly onboarding 2-3 of our merchant partners — this clause is critical protection.',resolved:true,replies:[{author:'Alex Carter',role:'Legal Team',team:'L',avatar:'AC',ts:'7 Jun, 16:45',body:'Agreed. Clause held firm in D3, accepted by Meridian in D4. Marking resolved.'}]}
    ],
    _aiAnalysis:{
      riskScore:45,riskLevel:"medium",dealHealth:"caution",
      summary:"The deal has several negotiated clauses that present moderate risks, particularly around payment cycles and liability caps. The lack of an updated Annexure A poses a risk of misalignment in expectations regarding the prefunded balance.",
      clauses:[
        {no:"2",name:"Fulfilment Method",outcome:"accepted",clientPush:"The client pushed for API integration as the primary channel to streamline operations and enhance efficiency. They wanted to ensure that the fulfilment method aligned with their technological capabilities.",gyftrGot:"GyfTR accepted to provide fulfilment via either Excel or API at the client's option. This flexibility allows GyfTR to cater to the client's preferences while maintaining its existing processes.",risk:"low",observation:"This clause presents a low risk as it allows for operational flexibility. However, GyfTR must ensure that both fulfilment methods are adequately supported to prevent potential service delivery issues.",recommendation:"GyfTR's technical team should ensure that both Excel and API fulfilment methods are robustly tested and documented to avoid any operational hiccups."},
        {no:"5",name:"Payment Cycle",outcome:"partial",clientPush:"The client requested a 45-day payment cycle to accommodate their internal finance approval timelines, which could impact cash flow management.",gyftrGot:"GyfTR accepted a 45-day payment cycle but required a minimum prefunded balance of Rs 5 Lakhs to mitigate cash flow risks. This condition helps protect GyfTR's financial interests.",risk:"medium",observation:"The acceptance of a 45-day cycle introduces a moderate risk, especially since the prefunded balance clause is not yet reflected in Annexure A. This could lead to disputes if the client does not maintain the required balance.",recommendation:"The legal team should prioritize updating Annexure A to include the prefunded balance clause to ensure clarity and prevent potential disputes."},
        {no:"11",name:"Non-Solicitation",outcome:"held",clientPush:"The client proposed reducing the non-solicitation period from 12 months to 6 months to allow for more flexibility in their business operations.",gyftrGot:"GyfTR firmly maintained the 12-month non-solicitation period to protect its merchant network from potential poaching. The client ultimately accepted the 12-month term.",risk:"low",observation:"This clause is a win for GyfTR as it protects its business interests and relationships. The 12-month period is standard in the industry and minimizes the risk of losing key partnerships.",recommendation:"Continue to monitor compliance with this clause to ensure that the client does not engage in any activities that could undermine GyfTR's merchant relationships."},
        {no:"13",name:"Liability Cap",outcome:"partial",clientPush:"The client sought to increase the liability cap from 3 months to 6 months to provide greater financial security in case of issues arising from the agreement.",gyftrGot:"GyfTR counter-proposed a compromise of a 4-month liability cap, which was accepted by both parties. This provides a balance between the client's concerns and GyfTR's risk management.",risk:"medium",observation:"While the 4-month cap is an improvement from the original terms, it still exposes GyfTR to potential liabilities that could exceed its financial forecasts. This necessitates careful risk assessment and management.",recommendation:"The risk management team should conduct a thorough analysis of potential liabilities under this cap and ensure that adequate insurance coverage is in place."},
        {no:"4",name:"KYC Obligations",outcome:"accepted",clientPush:"The client requested that GyfTR also share a KYC-compliant merchant list quarterly to enhance their compliance efforts.",gyftrGot:"GyfTR accepted the client's request to share the KYC-compliant merchant list quarterly, which supports the client's compliance needs.",risk:"low",observation:"This clause poses a low risk as it enhances collaboration and compliance between GyfTR and the client. Sharing the KYC-compliant list can help mitigate regulatory risks for both parties.",recommendation:"Ensure that the process for sharing the KYC-compliant merchant list is clearly defined and that data privacy regulations are adhered to."}
      ]
    }
  },

  // ── 2. Meridian Finance — API Integration Agreement ────────────────────────────
  {
    id:2, client:'Meridian Finance — API', tag:'MFA', ct:'ct-p',
    sD:'2026-03-05', type:'API / Direct', st:'review', clientStatus:'negotiating',
    tm:{L:'tc-yellow',F:'tc-yellow',C:'tc-none',B:'tc-green'},
    ms:{L:'Under Review',F:'Under Review',C:'Pending',B:'Approved'},
    teamAging:{L:'+2d',F:'+1d',C:null,B:null},
    ag:'+2d', ac:'ag-warn', lu:'2026-06-08',
    sp:{L:'Alex Carter',F:'Jordan Lee',C:'Riley Quinn',B:'Sam Rivera'},
    pd:'2026-06-30',
    clientDates:{draftStart:'2026-03-05',latestModified:'2026-06-01',effectiveDate:'2026-07-01',signingDate:'',endDate:'2027-03-04'},
    doc:'https://docs.google.com/document/d/19GynpWHuPzVZqyQXCIcRkkXCl4Zaji0P/edit',
    remarks:[
      {author:'Alex Carter',role:'Legal',ts:'2026-03-10 09:00',txt:'API template sent. Key additions vs E2E: Proprietary Software clause, API uptime SLA, data security obligations.'},
      {author:'Sam Rivera',role:'Business',ts:'2026-04-05 15:00',txt:'Meridian happy with API access. Dispute on uptime SLA — they want 99.9%, we offered 99.5%.'},
      {author:'Jordan Lee',role:'Finance',ts:'2026-06-08 10:30',txt:'Revenue share model needs clarification. Is it on MRP or selling price? Need Legal to specify in Annexure A clearly.'}
    ],
    hist:[
      {d:'2026-03-05 09:00',t:'Legal',b:'Alex Carter',f:'—',to:'Pending'},
      {d:'2026-03-10 09:00',t:'Legal',b:'Alex Carter',f:'Pending',to:'Under Review'},
      {d:'2026-04-02 10:00',t:'Business',b:'Sam Rivera',f:'Pending',to:'Approved'},
      {d:'2026-06-08 10:30',t:'Finance',b:'Jordan Lee',f:'Pending',to:'Under Review'}
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
    _aiAnalysis:{
      riskScore:65,riskLevel:"medium",dealHealth:"caution",
      summary:"The deal is progressing but has significant unresolved issues, particularly around data breach liability which could expose GyfTR to substantial risks. The uptime SLA is also a concern as it may not fully meet client expectations, potentially impacting client satisfaction.",
      clauses:[
        {no:"2",name:"API Scope",outcome:"accepted",clientPush:"The client requested a dedicated sandbox environment for testing to ensure smooth integration and functionality before going live. This is a common request to mitigate risks associated with API deployment.",gyftrGot:"GyfTR accepted to provide a 30-day sandbox pre-launch, which allows the client to test the API without impacting production. This is a reasonable compromise that balances client needs with operational capabilities.",risk:"low",observation:"The acceptance of a 30-day sandbox period mitigates integration risks and demonstrates GyfTR's commitment to client satisfaction. This clause is well-aligned with industry standards and poses minimal risk.",recommendation:"Ensure that the sandbox environment is robust and well-documented to facilitate client testing and reduce potential integration issues."},
        {no:"3",name:"Security / 2FA",outcome:"accepted",clientPush:"The client requested GyfTR to implement two-factor authentication on proprietary software to enhance security measures. This reflects the client's concern for safeguarding sensitive data.",gyftrGot:"GyfTR agreed to implement 2FA within 60 days of signing, which shows responsiveness to the client's security needs. This commitment enhances the overall security posture of the platform.",risk:"low",observation:"Implementing 2FA is a proactive measure that reduces the risk of unauthorized access and data breaches. This clause strengthens GyfTR's security framework and builds trust with the client.",recommendation:"Prioritize the implementation of 2FA and communicate progress to the client to reinforce confidence in GyfTR's security measures."},
        {no:"6",name:"Uptime SLA",outcome:"partial",clientPush:"The client demanded a 99.9% uptime SLA with hourly measurement and a 10% credit per breach, indicating a strong emphasis on reliability and service continuity.",gyftrGot:"GyfTR countered with a 99.7% uptime SLA, a 4-hour P1 resolution window, and a 5% credit per breach capped at 15% per quarter.",risk:"medium",observation:"While 99.7% uptime is a reasonable standard, it falls short of the client's expectations which could lead to dissatisfaction. The capped credit may limit GyfTR's exposure but could be perceived as insufficient by the client.",recommendation:"Monitor SLA performance closely in Year 1 and proactively communicate any downtime events to maintain client confidence."},
        {no:"13",name:"Data Breach Liability",outcome:"pending",clientPush:"The client demanded unlimited liability for data breaches, citing concerns over potential exposure under the IT Act. This indicates a high level of concern regarding data security and regulatory compliance.",gyftrGot:"GyfTR proposed a 12-month cap on data breach liability, separate from the 3-month operational cap. The client partially accepted the carve-out but insists on a 24-month cap — still unresolved.",risk:"high",observation:"The unresolved nature of this clause poses the highest risk in this agreement. A 24-month cap could expose GyfTR to substantial financial liability in the event of a data breach, well beyond industry norms for a deal of this size.",recommendation:"Engage Compliance to confirm the maximum acceptable data breach cap before the next response. Consider offering additional data security assurances such as ISO 27001 certification commitment to meet the client halfway."},
        {no:"11",name:"Non-Solicitation",outcome:"held",clientPush:"The client proposed removing the non-solicitation clause entirely, likely to maintain flexibility in hiring practices and direct merchant relationships post-termination.",gyftrGot:"GyfTR maintained the non-solicitation clause for 12 months post-termination as a standard protective measure. The client ultimately accepted.",risk:"low",observation:"Retaining the non-solicitation clause helps protect GyfTR's workforce and merchant network, reducing the risk of losing key relationships to the client. This is a clear win for GyfTR.",recommendation:"Continue to enforce this clause and include it as non-negotiable in all future API agreements of this type."}
      ]
    },
    _docComments:[
      {id:'cmt-api-1',quote:'GyfTR agreed to implement 2FA within 60 days of signing.',author:'Riley Quinn',role:'Compliance Team',team:'C',avatar:'RQ',ts:'10 Jun, 10:05',text:'From a compliance standpoint, 60 days is on the longer end for a security commitment of this nature. CERT-In guidelines recommend MFA deployment within 30 days for platforms handling financial data. Recommend pushing back to 45 days max.',resolved:false,replies:[{author:'Alex Carter',role:'Legal Team',team:'L',avatar:'AC',ts:'10 Jun, 11:30',body:'Good catch. I will propose 45-day timeline in the next revision. Will update Cl.3 before sending D5.'}]},
      {id:'cmt-api-2',quote:'99.7% uptime SLA, a 4-hour P1 resolution window, and a 5% credit per breach capped at 15% per quarter.',author:'Jordan Lee',role:'Finance Team',team:'F',avatar:'JL',ts:'11 Jun, 09:20',text:'Finance concern: the 5% credit cap per breach translates to approximately Rs 15K per quarter at current revenue run-rate. This is too low to be a meaningful deterrent for Meridian. They may accept now but escalate if an outage impacts their business. Suggest we move credit to 10% per breach.',resolved:false,replies:[{author:'Sam Rivera',role:'Business Team',team:'B',avatar:'SR',ts:'11 Jun, 14:00',body:'Agreed with Finance. Meridian is a high-volume API client — downtime directly impacts their ability to disburse GVs to employees. 10% credit per breach is more appropriate for this SLA tier.'},{author:'Alex Carter',role:'Legal Team',team:'L',avatar:'AC',ts:'11 Jun, 16:45',body:'Noted both inputs. Will revise credit to 8% per breach (compromise) and increase quarterly cap to 20%. This aligns us closer to market and reduces escalation risk.'}]},
      {id:'cmt-api-3',quote:'Client demands unlimited liability for data breaches, citing concerns over potential exposure under the IT Act.',author:'Alex Carter',role:'Legal Team',team:'L',avatar:'AC',ts:'12 Jun, 08:50',text:'This is the most critical open point in this agreement. Unlimited liability for data breach is a non-starter — GyfTR cannot accept. However, the client has valid concerns under the DPDP Act 2023 (Digital Personal Data Protection Act). Compliance to assess what a defensible cap looks like given our ISO 27001 certification plan.',resolved:false,replies:[{author:'Riley Quinn',role:'Compliance Team',team:'C',avatar:'RQ',ts:'12 Jun, 10:15',body:'Compliance position: 12-month cap on data breach liability is reasonable given our PCI-DSS compliance and upcoming ISO 27001 audit. We can offer a 24-month cap ONLY if Meridian agrees to a cybersecurity audit clause and incident response SLA. Do not agree to 24 months without these conditions.'}]},
      {id:'cmt-api-4',quote:'Revenue share model needs clarification. Is it on MRP or selling price?',author:'Jordan Lee',role:'Finance Team',team:'F',avatar:'JL',ts:'13 Jun, 11:00',text:'This ambiguity in Annexure A must be resolved before signing. MRP vs selling price can create a 3–8% variance on high-denomination GVs. At projected GMV of Rs 2Cr, that is a Rs 6L–16L revenue impact per year. Finance requires this to be explicitly stated as selling price (net of discount).',resolved:true,replies:[{author:'Alex Carter',role:'Legal Team',team:'L',avatar:'AC',ts:'13 Jun, 15:30',body:'Resolved. Annexure A updated in D4: revenue share is on selling price net of agreed client discount. Language confirmed by Finance. Marking resolved.'}]}
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
    sp:{L:'Alex Carter',F:'Jordan Lee',C:'Riley Quinn',B:'Sam Rivera'},
    pd:'2026-07-15',
    clientDates:{draftStart:'2026-04-01',latestModified:'2026-06-01',effectiveDate:'2026-08-01',signingDate:'',endDate:'2027-07-31'},
    doc:'https://docs.google.com/document/d/17-mhtub5pwUDQT__kfNI8e1Liy5Ox9WA/edit',
    remarks:[
      {author:'Alex Carter',role:'Legal',ts:'2026-04-05 09:00',txt:'WL template sent. This is more complex — includes WhiteLabel website development, payment gateway, API, and direct sending module. All 4 fulfilment methods included.'},
      {author:'Sam Rivera',role:'Business',ts:'2026-04-10 11:00',txt:'Ironclad is for channel incentivization. Large deal — ~Rs 2Cr annual GMV expected. Client wants custom branding on WL site.'},
      {author:'Alex Carter',role:'Legal',ts:'2026-06-01 14:00',txt:'D1 sent. Awaiting client response. Remind in 7 days if no reply.'}
    ],
    hist:[
      {d:'2026-04-01 09:00',t:'Legal',b:'Alex Carter',f:'—',to:'Pending'},
      {d:'2026-06-01 14:00',t:'Legal',b:'Alex Carter',f:'Pending',to:'Under Review'}
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
    sp:{L:'Alex Carter',F:'Jordan Lee',C:'Riley Quinn',B:'Sam Rivera'},
    pd:'2026-07-01',
    clientDates:{draftStart:'2026-05-12',latestModified:'2026-06-04',effectiveDate:'2026-07-01',signingDate:'',endDate:'2027-05-11'},
    doc:null,
    remarks:[
      {author:'Alex Carter',role:'Legal',ts:'2026-06-01 09:00',txt:'Draft shared with finance team for review.'},
      {author:'Jordan Lee',role:'Finance',ts:'2026-06-05 14:22',txt:'Awaiting clarification on revenue share clause — is the 17% on MRP or selling price?'}
    ],
    hist:[
      {d:'2026-05-12 11:30',t:'Legal',b:'Alex Carter',f:'—',to:'Pending'},
      {d:'2026-06-01 09:00',t:'Legal',b:'Alex Carter',f:'Pending',to:'Approved'},
      {d:'2026-06-03 10:05',t:'Business',b:'Sam Rivera',f:'Pending',to:'Approved'},
      {d:'2026-06-05 14:22',t:'Finance',b:'Jordan Lee',f:'Pending',to:'Under Review'}
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
    sp:{L:'Alex Carter',F:'Jordan Lee',C:'Riley Quinn',B:'Sam Rivera'},
    pd:'2026-04-01',
    clientDates:{draftStart:'2026-01-05',latestModified:'2026-04-01',effectiveDate:'2026-05-01',signingDate:'2026-04-10',endDate:'2027-04-30'},
    doc:null,
    remarks:[{author:'Alex Carter',role:'Legal',ts:'2026-04-10 12:00',txt:'Fully executed. Signed copies filed. Agreement live from 1 May 2026.'}],
    hist:[
      {d:'2026-01-05 09:00',t:'Legal',b:'Alex Carter',f:'—',to:'Pending'},
      {d:'2026-02-10 10:00',t:'Legal',b:'Alex Carter',f:'Pending',to:'Approved'},
      {d:'2026-02-15 11:00',t:'Business',b:'Sam Rivera',f:'Pending',to:'Approved'},
      {d:'2026-03-01 09:00',t:'Finance',b:'Jordan Lee',f:'Under Review',to:'Approved'},
      {d:'2026-03-10 14:00',t:'Compliance',b:'Riley Quinn',f:'Under Review',to:'Approved'},
      {d:'2026-04-10 12:00',t:'Legal',b:'Alex Carter',f:'Final Sign',to:'Closed'}
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

  // ── 6. Vantage Bank — Reopened ────────────────────────────────────────────────
  {
    id:6, client:'Vantage Bank', tag:'VTB', ct:'ct-r',
    sD:'2026-02-01', type:'Reseller', st:'reopen', clientStatus:'responded',
    tm:{L:'tc-yellow',F:'tc-red',C:'tc-none',B:'tc-green'},
    ms:{L:'Under Review',F:'Pending',C:'Pending',B:'Approved'},
    teamAging:{L:'+3d',F:'+5d',C:null,B:null},
    ag:'+5d', ac:'ag-over', lu:'2026-06-06',
    sp:{L:'Alex Carter',F:'Jordan Lee',C:'Riley Quinn',B:'Sam Rivera'},
    pd:'2026-05-30',
    clientDates:{draftStart:'2026-02-01',latestModified:'2026-06-06',effectiveDate:'',signingDate:'',endDate:''},
    doc:null,
    remarks:[
      {author:'Jordan Lee',role:'Finance',ts:'2026-06-06 15:00',txt:'Rejected. Revenue share of 17% is below our minimum threshold of 18% for resellers. Please rework Annexure A and resubmit.'},
      {author:'Alex Carter',role:'Legal',ts:'2026-06-07 10:30',txt:'Noted. Will rework clauses 5 and Annexure A. New draft by June 15.'}
    ],
    hist:[
      {d:'2026-02-01 11:00',t:'Legal',b:'Alex Carter',f:'—',to:'Pending'},
      {d:'2026-03-10 09:00',t:'Business',b:'Sam Rivera',f:'Pending',to:'Approved'},
      {d:'2026-04-20 10:00',t:'Finance',b:'Jordan Lee',f:'Under Review',to:'Approved'},
      {d:'2026-06-06 15:00',t:'Finance',b:'Jordan Lee',f:'Approved',to:'Rejected'}
    ],
    drafts:[
      {n:'D1',date:'2026-02-05',dir:'sent',note:'Initial reseller draft. Revenue share 17%. Non-solicitation 12 months. Payment cycle 30 days.'},
      {n:'D2',date:'2026-03-01',dir:'received',note:'Vantage proposed major revision: revenue share 12%, exclusivity in banking channel, 2-year term.'},
      {n:'D3',date:'2026-04-01',dir:'sent',note:'GyfTR counter: revenue share 17% (firm), no exclusivity, 18-month term.'},
      {n:'D4',date:'2026-05-15',dir:'received',note:'Vantage accepted 17% and 18-month term. Withdrew exclusivity request.'},
      {n:'D5',date:'2026-06-01',dir:'sent',note:'Near-final draft sent for internal approval.'},
      {n:'D6',date:'2026-06-06',dir:'received',note:'Finance internally rejected — revenue share must be minimum 18% for resellers. Sent back for rework.'}
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
]
