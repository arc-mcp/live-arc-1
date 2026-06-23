import type { Scenario } from './types';

export const scenarios: Scenario[] = [
  {
    id: 'developer-dependency-map',
    title: 'Understand a class before changing it',
    shortTitle: 'Class dependencies',
    subtitle: 'VS Code replay showing SAPContext, dependency contracts, source grep, and where-used context.',
    theme: 'vscode',
    group: 'Understanding',
    audience: 'developer',
    estimatedMinutes: 2,
    tags: ['VS Code', 'SAPContext', 'Dependencies', 'Read-only'],
    outcome: 'A dependency map and safe next-step plan before any code is touched.',
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        type: 'message',
        role: 'user',
        text: 'I need to change ZCL_BILLING. First show me what it depends on and where the risky edges are.',
        next: 'context'
      },
      context: {
        id: 'context',
        type: 'tool',
        toolName: 'SAPContext',
        callId: 'ctx-zcl-billing',
        args: { action: 'deps', type: 'CLAS', name: 'ZCL_BILLING' },
        summary: 'ARC-1 reads dependency context instead of pulling the full system into the prompt.',
        resultFormat: 'graph',
        result:
          'Compressed dependency context for ZCL_BILLING: interface ZIF_BILLING_CALCULATOR, class ZCL_TAX_ENGINE, CDS ZI_BILLING_ITEM, domain ZAMOUNT_DOM. 54 lines returned from 410 lines of related source.',
        panel: {
          title: 'Dependency context',
          kind: 'graph',
          eyebrow: 'SAPContext(action="deps")',
          body: 'ZCL_BILLING depends on one public calculator interface, one tax engine class, one CDS view, and a shared amount domain. ARC-1 returns contracts and relevant snippets instead of entire objects.',
          items: [
            { label: 'Compression', value: '54 lines from 410', tone: 'good' },
            { label: 'Risk edge', value: 'ZCL_TAX_ENGINE performs external tax lookup', tone: 'warn' },
            { label: 'Stable contract', value: 'ZIF_BILLING_CALCULATOR', tone: 'good' }
          ]
        },
        next: 'grep'
      },
      grep: {
        id: 'grep',
        type: 'tool',
        toolName: 'SAPRead',
        callId: 'read-zcl-billing-process',
        args: { type: 'CLAS', name: 'ZCL_BILLING', grep: 'calculate|tax|amount', context: 2 },
        summary: 'ARC-1 narrows the source read to the relevant method lines.',
        resultFormat: 'text',
        result:
          'METHOD process.\n  DATA(total) = calculator->calculate( items ).\n  DATA(tax) = tax_engine->compute_tax( total ).\n  rv_amount = total + tax.\nENDMETHOD.',
        panel: {
          title: 'Relevant source lines',
          kind: 'source',
          eyebrow: 'SAPRead(grep)',
          language: 'abap',
          code:
            'METHOD process.\n' +
            '  DATA(total) = calculator->calculate( items ).\n' +
            '  DATA(tax) = tax_engine->compute_tax( total ).\n' +
            '  rv_amount = total + tax.\n' +
            'ENDMETHOD.'
        },
        next: 'references'
      },
      references: {
        id: 'references',
        type: 'tool',
        toolName: 'SAPNavigate',
        callId: 'refs-zcl-billing',
        args: { action: 'references', type: 'CLAS', name: 'ZCL_BILLING' },
        summary: 'ARC-1 asks ADT for references before recommending a change plan.',
        resultFormat: 'table',
        result: '3 direct callers: ZCL_INVOICE_SERVICE, ZCL_REBATE_JOB, ZTEST_BILLING_FLOW.',
        panel: {
          title: 'Where-used context',
          kind: 'table',
          eyebrow: 'SAPNavigate(action="references")',
          items: [
            { label: 'ZCL_INVOICE_SERVICE', value: 'productive billing path', tone: 'warn' },
            { label: 'ZCL_REBATE_JOB', value: 'nightly batch consumer', tone: 'warn' },
            { label: 'ZTEST_BILLING_FLOW', value: 'unit test coverage exists', tone: 'good' }
          ]
        },
        next: 'decision'
      },
      decision: {
        id: 'decision',
        type: 'decision',
        prompt: 'What should the replay show next?',
        options: [
          {
            id: 'risk-plan',
            label: 'Show change plan',
            description: 'Summarize the safe edit path from the dependency evidence.',
            recommended: true,
            next: 'risk-plan'
          },
          {
            id: 'open-tax',
            label: 'Inspect tax engine',
            description: 'Drill into the riskiest dependency before editing billing.',
            next: 'tax-context'
          }
        ]
      },
      'risk-plan': {
        id: 'risk-plan',
        type: 'message',
        role: 'assistant',
        text:
          'Recommended path: keep the public interface stable, change only ZCL_BILLING->PROCESS, run ABAP Unit for ZTEST_BILLING_FLOW, and review the nightly batch caller because it shares the tax-engine dependency.',
        next: 'done'
      },
      'tax-context': {
        id: 'tax-context',
        type: 'tool',
        toolName: 'SAPContext',
        callId: 'ctx-tax-engine',
        args: { action: 'deps', type: 'CLAS', name: 'ZCL_TAX_ENGINE' },
        summary: 'The replay drills into the tax engine dependency without losing the original class context.',
        resultFormat: 'text',
        result: 'ZCL_TAX_ENGINE calls external destination TAX_RFC and table ZTAX_RULES. No public method signature change needed.',
        panel: {
          title: 'Tax engine risk',
          kind: 'report',
          eyebrow: 'Dependency drilldown',
          body: 'The risky part is not the billing class itself. It is the tax engine dependency and the batch caller that reuses the same calculation result.'
        },
        next: 'done'
      },
      done: {
        id: 'done',
        type: 'message',
        role: 'assistant',
        text:
          'This is the ARC-1 pattern: start with system context, then open only the source and callers that matter. The user gets a bounded change plan instead of a giant class dump.'
      }
    }
  },
  {
    id: 'claude-billing-graph',
    title: 'Claude builds a SAP dependency graph',
    shortTitle: 'Claude graph',
    subtitle: 'Claude-style replay that turns ARC-1 dependency and where-used results into an object graph.',
    theme: 'claude',
    group: 'Understanding',
    audience: 'architect',
    estimatedMinutes: 3,
    tags: ['Claude', 'Graph', 'SAPContext', 'Dependencies'],
    outcome: 'A graph-first explanation of billing objects, risky callers, and validation gates.',
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        type: 'message',
        role: 'user',
        text:
          'In Claude, map the billing change as a graph before touching code. I want to see classes, CDS views, callers, and tests.',
        next: 'search'
      },
      search: {
        id: 'search',
        type: 'tool',
        toolName: 'SAPSearch',
        callId: 'search-billing-allocator',
        args: { query: 'ZCL_BILLING_ALLOCATOR', searchType: 'object' },
        summary: 'ARC-1 resolves the concrete SAP object before graphing surrounding context.',
        resultFormat: 'table',
        result: 'CLAS ZCL_BILLING_ALLOCATOR in package ZARC_BILLING. Related: ZIF_BILLING_RULE, ZCL_PRICING_RULES.',
        panel: {
          title: 'Resolved object',
          kind: 'table',
          eyebrow: 'SAPSearch(searchType="object")',
          items: [
            { label: 'Root object', value: 'ZCL_BILLING_ALLOCATOR', tone: 'warn' },
            { label: 'Package', value: 'ZARC_BILLING', tone: 'neutral' },
            { label: 'Related hits', value: 'ZIF_BILLING_RULE, ZCL_PRICING_RULES', tone: 'good' }
          ]
        },
        next: 'context'
      },
      context: {
        id: 'context',
        type: 'tool',
        toolName: 'SAPContext',
        callId: 'ctx-billing-graph',
        args: { action: 'deps', type: 'CLAS', name: 'ZCL_BILLING_ALLOCATOR', format: 'graph' },
        summary: 'ARC-1 compresses source, DDIC, and CDS relationships into a graph-shaped dependency result.',
        resultFormat: 'graph',
        result:
          'Root graph: ZCL_BILLING_ALLOCATOR -> ZIF_BILLING_RULE, ZCL_PRICING_RULES, ZI_BILLING_ITEM. CDS view ZI_BILLING_ITEM reads ZBILLING_ITEM. Tests cover allocator but not the rebate batch edge.',
        panel: {
          title: 'Billing dependency graph',
          kind: 'graph',
          eyebrow: 'SAPContext(action="deps")',
          body:
            'Claude can keep the conversation readable while ARC-1 returns a graph of the SAP objects that matter: contracts, implementation classes, CDS views, tables, callers, and tests.',
          graph: {
            nodes: [
              { id: 'allocator', label: 'ZCL_BILLING_ALLOCATOR', kind: 'class', x: 50, y: 16, tone: 'warn' },
              { id: 'rule', label: 'ZIF_BILLING_RULE', kind: 'interface', x: 21, y: 34, tone: 'good' },
              { id: 'pricing', label: 'ZCL_PRICING_RULES', kind: 'class', x: 49, y: 38, tone: 'warn' },
              { id: 'cds', label: 'ZI_BILLING_ITEM', kind: 'CDS view', x: 74, y: 34, tone: 'warn' },
              { id: 'table', label: 'ZBILLING_ITEM', kind: 'table', x: 74, y: 59, tone: 'danger' },
              { id: 'invoice', label: 'ZCL_INVOICE_SERVICE', kind: 'caller', x: 35, y: 70, tone: 'warn' },
              { id: 'rebate', label: 'ZCL_REBATE_JOB', kind: 'batch caller', x: 63, y: 73, tone: 'danger' },
              { id: 'test', label: 'ZTEST_BILLING_ALLOCATOR', kind: 'unit test', x: 19, y: 78, tone: 'good' }
            ],
            edges: [
              { from: 'allocator', to: 'rule', label: 'implements', tone: 'good' },
              { from: 'allocator', to: 'pricing', label: 'uses', tone: 'warn' },
              { from: 'allocator', to: 'cds', label: 'reads', tone: 'warn' },
              { from: 'cds', to: 'table', label: 'selects', tone: 'danger' },
              { from: 'invoice', to: 'allocator', label: 'calls', tone: 'warn' },
              { from: 'rebate', to: 'allocator', label: 'calls nightly', tone: 'danger' },
              { from: 'test', to: 'allocator', label: 'covers', tone: 'good' }
            ]
          },
          items: [
            { label: 'Compression', value: 'Graph plus 61 focused source lines', tone: 'good' },
            { label: 'Highest risk', value: 'Batch caller shares allocator behavior', tone: 'danger' },
            { label: 'Coverage', value: 'Unit test covers allocator but not rebate job', tone: 'warn' }
          ]
        },
        next: 'refs'
      },
      refs: {
        id: 'refs',
        type: 'tool',
        toolName: 'SAPNavigate',
        callId: 'where-used-billing-graph',
        args: { action: 'references', type: 'CLAS', name: 'ZCL_BILLING_ALLOCATOR', depth: 2 },
        summary: 'ARC-1 overlays where-used edges so Claude can distinguish design dependencies from runtime callers.',
        resultFormat: 'graph',
        result:
          'Where-used overlay: ZCL_INVOICE_SERVICE -> ZCL_BILLING_ALLOCATOR, ZCL_REBATE_JOB -> ZCL_BILLING_ALLOCATOR, ZSRV_BILLING_API -> ZCL_INVOICE_SERVICE.',
        panel: {
          title: 'Where-used overlay',
          kind: 'graph',
          eyebrow: 'SAPNavigate(action="references")',
          body:
            'The second graph answers a different question: who will feel this change? That is why ARC-1 separates dependency context from where-used navigation.',
          graph: {
            nodes: [
              { id: 'api', label: 'ZSRV_BILLING_API', kind: 'service', x: 19, y: 22, tone: 'warn' },
              { id: 'invoice', label: 'ZCL_INVOICE_SERVICE', kind: 'online caller', x: 42, y: 42, tone: 'warn' },
              { id: 'allocator', label: 'ZCL_BILLING_ALLOCATOR', kind: 'change target', x: 64, y: 42, tone: 'danger' },
              { id: 'rebate', label: 'ZCL_REBATE_JOB', kind: 'nightly batch', x: 42, y: 72, tone: 'danger' },
              { id: 'test', label: 'ZTEST_BILLING_ALLOCATOR', kind: 'unit test', x: 72, y: 75, tone: 'good' }
            ],
            edges: [
              { from: 'api', to: 'invoice', label: 'calls', tone: 'warn' },
              { from: 'invoice', to: 'allocator', label: 'online path', tone: 'warn' },
              { from: 'rebate', to: 'allocator', label: 'batch path', tone: 'danger' },
              { from: 'test', to: 'allocator', label: 'covers', tone: 'good' }
            ]
          },
          items: [
            { label: 'Online path', value: 'Service -> invoice service -> allocator', tone: 'warn' },
            { label: 'Batch path', value: 'Rebate job -> allocator', tone: 'danger' },
            { label: 'Test path', value: 'Unit test -> allocator', tone: 'good' }
          ]
        },
        next: 'decision'
      },
      decision: {
        id: 'decision',
        type: 'decision',
        prompt: 'What should Claude do with the graph?',
        options: [
          {
            id: 'explain',
            label: 'Explain graph',
            description: 'Turn graph edges into a change and test plan.',
            recommended: true,
            next: 'explain'
          },
          {
            id: 'risky-edge',
            label: 'Open risky edge',
            description: 'Drill into the batch caller before recommending edits.',
            next: 'risky-edge'
          }
        ]
      },
      explain: {
        id: 'explain',
        type: 'message',
        role: 'assistant',
        text:
          'Graph readout: keep ZIF_BILLING_RULE stable, inspect ZCL_PRICING_RULES before changing allocator behavior, and add a batch-path test for ZCL_REBATE_JOB. The table edge is read-only evidence, not the first edit target.',
        next: 'atc'
      },
      'risky-edge': {
        id: 'risky-edge',
        type: 'tool',
        toolName: 'SAPRead',
        callId: 'read-rebate-edge',
        args: { type: 'CLAS', name: 'ZCL_REBATE_JOB', grep: 'ZCL_BILLING_ALLOCATOR|allocate', context: 3 },
        summary: 'ARC-1 opens only the caller lines behind the dangerous graph edge.',
        resultFormat: 'text',
        result:
          'METHOD run.\n  DATA(allocator) = NEW zcl_billing_allocator( ).\n  allocator->allocate( EXPORTING iv_mode = batch_mode ).\nENDMETHOD.',
        panel: {
          title: 'Risky batch edge',
          kind: 'source',
          eyebrow: 'SAPRead(grep)',
          language: 'abap',
          code:
            'METHOD run.\n' +
            '  DATA(allocator) = NEW zcl_billing_allocator( ).\n' +
            '  allocator->allocate( EXPORTING iv_mode = batch_mode ).\n' +
            'ENDMETHOD.'
        },
        next: 'atc'
      },
      atc: {
        id: 'atc',
        type: 'tool',
        toolName: 'SAPDiagnose',
        callId: 'atc-billing-graph',
        args: { action: 'atc', type: 'CLAS', name: 'ZCL_BILLING_ALLOCATOR', includeDependencies: true },
        summary: 'ARC-1 adds SAP-side quality signals after the graph identifies what needs validation.',
        resultFormat: 'json',
        result: '{"variant":"DEFAULT","findings":[{"severity":"warning","object":"ZCL_REBATE_JOB","message":"batch path not covered by test"}]}',
        panel: {
          title: 'Validation gates from graph',
          kind: 'report',
          body: 'The graph becomes a validation checklist: online caller, batch caller, CDS/table read path, and allocator tests.',
          items: [
            { label: 'ATC', value: '1 warning on batch-path coverage', tone: 'warn' },
            { label: 'Unit tests', value: 'Add rebate allocation fixture', tone: 'warn' },
            { label: 'Manual review', value: 'No interface change needed', tone: 'good' }
          ]
        },
        next: 'done'
      },
      done: {
        id: 'done',
        type: 'message',
        role: 'assistant',
        text:
          'This is the Claude demo angle: a readable conversation plus a graph artifact, backed by concrete ARC-1 tool calls instead of generic architecture guessing.'
      }
    }
  },
  {
    id: 'developer-cds-impact',
    title: 'CDS impact analysis',
    shortTitle: 'CDS impact',
    subtitle: 'VS Code replay for "what breaks if I change this CDS view?" using SAPContext impact.',
    theme: 'vscode',
    group: 'Understanding',
    audience: 'architect',
    estimatedMinutes: 1,
    tags: ['VS Code', 'SAPContext', 'CDS', 'Impact'],
    outcome: 'A blast-radius view with upstream sources and downstream consumers.',
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        type: 'message',
        role: 'user',
        text: 'In my SAP system, what breaks if I change the CDS view I_COUNTRY?',
        next: 'impact'
      },
      impact: {
        id: 'impact',
        type: 'tool',
        toolName: 'SAPContext',
        callId: 'impact-i-country',
        args: { action: 'impact', type: 'DDLS', name: 'I_COUNTRY' },
        summary: 'ARC-1 routes the blast-radius question to the dedicated CDS impact tool.',
        resultFormat: 'graph',
        result:
          'Upstream: T005, I_Language. Downstream: C_COUNTRY, CL_COUNTRY_API. Summary: 2 direct consumers, 0 indirect consumers.',
        panel: {
          title: 'CDS blast radius',
          kind: 'graph',
          eyebrow: 'SAPContext(action="impact")',
          body: 'ARC-1 avoids ad-hoc SQL scans over DDDDLSRC and uses the dependency classifier for the connected system.',
          items: [
            { label: 'Upstream', value: 'T005, I_Language', tone: 'neutral' },
            { label: 'Projection view', value: 'C_COUNTRY', tone: 'warn' },
            { label: 'ABAP consumer', value: 'CL_COUNTRY_API', tone: 'warn' }
          ]
        },
        next: 'decision'
      },
      decision: {
        id: 'decision',
        type: 'decision',
        prompt: 'Choose the view of the impact result.',
        options: [
          {
            id: 'business',
            label: 'Business summary',
            description: 'Explain the impact for a product owner.',
            recommended: true,
            next: 'business'
          },
          {
            id: 'technical',
            label: 'Technical details',
            description: 'Show the downstream object list and the avoided anti-pattern.',
            next: 'technical'
          }
        ]
      },
      business: {
        id: 'business',
        type: 'message',
        role: 'assistant',
        text:
          'Low blast radius: one projection and one ABAP consumer depend directly on I_COUNTRY. Review C_COUNTRY and CL_COUNTRY_API before changing fields or semantics.',
        next: 'done'
      },
      technical: {
        id: 'technical',
        type: 'panel',
        panel: {
          title: 'Why not SQL scan?',
          kind: 'terminal',
          body: 'The forbidden route is SELECTing DDDDLSRC/ACMDCLSRC manually. ARC-1 exposes SAPContext impact so the model does not burn tokens guessing where CDS consumers live.',
          code:
            'Forbidden anti-pattern:\n' +
            '  SAPQuery("SELECT * FROM DDDDLSRC WHERE source LIKE ...")\n\n' +
            'Preferred:\n' +
            '  SAPContext(action="impact", type="DDLS", name="I_COUNTRY")'
        },
        next: 'done'
      },
      done: {
        id: 'done',
        type: 'message',
        role: 'assistant',
        text: 'The impact result is scoped enough to become a review checklist instead of a broad source search.'
      }
    }
  },
  {
    id: 'developer-method-surgery',
    title: 'Method-level surgery with checks',
    shortTitle: 'Edit method',
    subtitle: 'VS Code replay showing a focused method edit, diff, syntax check, and ABAP Unit.',
    theme: 'vscode',
    group: 'Build & Test',
    audience: 'developer',
    estimatedMinutes: 2,
    tags: ['VS Code', 'SAPWrite', 'Diff', 'ABAP Unit'],
    outcome: 'A proposed method patch with validation gates shown before simulated apply.',
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        type: 'message',
        role: 'user',
        text: 'Update get_name in ZCL_CUSTOMER to return first_name and last_name instead of only name.',
        next: 'read-method'
      },
      'read-method': {
        id: 'read-method',
        type: 'tool',
        toolName: 'SAPRead',
        callId: 'read-get-name',
        args: { type: 'CLAS', name: 'ZCL_CUSTOMER', method: 'GET_NAME' },
        summary: 'ARC-1 reads only the target method body.',
        resultFormat: 'text',
        result: 'METHOD get_name.\n  rv_name = me->name.\nENDMETHOD.',
        panel: {
          title: 'Current method',
          kind: 'source',
          language: 'abap',
          code: 'METHOD get_name.\n  rv_name = me->name.\nENDMETHOD.'
        },
        next: 'write'
      },
      write: {
        id: 'write',
        type: 'tool',
        toolName: 'SAPWrite',
        callId: 'edit-get-name',
        args: {
          action: 'edit_method',
          type: 'CLAS',
          name: 'ZCL_CUSTOMER',
          method: 'GET_NAME',
          source: "rv_name = |{ me->first_name } { me->last_name }|."
        },
        summary: 'ARC-1 uses method-level surgery instead of replacing the full class source.',
        resultFormat: 'diff',
        result:
          '-  rv_name = me->name.\n+  rv_name = |{ me->first_name } { me->last_name }|.',
        panel: {
          title: 'Proposed method diff',
          kind: 'diff',
          language: 'diff',
          code:
            ' METHOD get_name.\n' +
            '-  rv_name = me->name.\n' +
            '+  rv_name = |{ me->first_name } { me->last_name }|.\n' +
            ' ENDMETHOD.'
        },
        next: 'decision'
      },
      decision: {
        id: 'decision',
        type: 'decision',
        prompt: 'Where should the replay go from the proposed diff?',
        options: [
          {
            id: 'checks',
            label: 'Run checks',
            description: 'Show syntax and ABAP Unit gates after the simulated patch.',
            recommended: true,
            next: 'syntax'
          },
          {
            id: 'stop',
            label: 'Stop at proposal',
            description: 'Show the human-review stopping point.',
            next: 'proposal'
          }
        ]
      },
      syntax: {
        id: 'syntax',
        type: 'tool',
        toolName: 'SAPDiagnose',
        callId: 'syntax-customer',
        args: { action: 'syntax', type: 'CLAS', name: 'ZCL_CUSTOMER' },
        summary: 'Syntax check passes after the simulated method update.',
        resultFormat: 'json',
        result: '{"status":"ok","messages":[]}',
        panel: {
          title: 'Syntax check',
          kind: 'terminal',
          body: 'SAPDiagnose returned no syntax messages.',
          items: [{ label: 'Status', value: 'ok', tone: 'good' }]
        },
        next: 'unit'
      },
      unit: {
        id: 'unit',
        type: 'tool',
        toolName: 'SAPDiagnose',
        callId: 'unit-customer',
        args: { action: 'unittest', type: 'CLAS', name: 'ZCL_CUSTOMER' },
        summary: 'ABAP Unit verifies the expected name formatting behavior.',
        resultFormat: 'json',
        result: '{"passed":4,"failed":0,"errors":0}',
        panel: {
          title: 'ABAP Unit',
          kind: 'table',
          items: [
            { label: 'Passed', value: '4', tone: 'good' },
            { label: 'Failed', value: '0', tone: 'good' },
            { label: 'Errors', value: '0', tone: 'good' }
          ]
        },
        next: 'done'
      },
      proposal: {
        id: 'proposal',
        type: 'message',
        role: 'assistant',
        text:
          'Stopping at the diff is a valid setup for a public demo or read-only rollout. The developer keeps the review gate and applies the patch manually.',
        next: 'done'
      },
      done: {
        id: 'done',
        type: 'message',
        role: 'assistant',
        text: 'The value is the narrow edit surface: one method, one diff, then SAP-side checks.'
      }
    }
  },
  {
    id: 'teams-sharepoint-impact',
    title: 'SharePoint change request to SAP impact',
    shortTitle: 'SharePoint impact',
    subtitle: 'Teams replay where Copilot turns a business memo into SAP dependency evidence.',
    theme: 'teams',
    group: 'Business Impact',
    audience: 'consultant',
    estimatedMinutes: 2,
    tags: ['Teams', 'SharePoint', 'Impact', 'Read-only'],
    outcome: 'A business summary plus the technical SAP chain behind the change.',
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        type: 'message',
        role: 'user',
        text: 'Read the SharePoint change request in IT/Clean Core and tell me what would break.',
        next: 'doc'
      },
      doc: {
        id: 'doc',
        type: 'panel',
        panel: {
          title: 'SharePoint memo',
          kind: 'document',
          eyebrow: 'IT/Clean Core/change-request-amount-domain.md',
          body:
            'Request: widen ZARC1_DEMO_AMOUNT_DOM from CURR 13,2 to CURR 23,2 because international project budgets can exceed the current limit.'
        },
        next: 'search'
      },
      search: {
        id: 'search',
        type: 'tool',
        toolName: 'SAPSearch',
        callId: 'search-domain',
        args: { query: 'ZARC1_DEMO_AMOUNT_DOM', searchType: 'object' },
        summary: 'ARC-1 finds the real domain object in SAP.',
        resultFormat: 'table',
        result: 'DOMA ZARC1_DEMO_AMOUNT_DOM in package $TMP.',
        next: 'read'
      },
      read: {
        id: 'read',
        type: 'tool',
        toolName: 'SAPRead',
        callId: 'read-domain',
        args: { type: 'DOMA', name: 'ZARC1_DEMO_AMOUNT_DOM' },
        summary: 'ARC-1 reads current domain metadata before giving advice.',
        resultFormat: 'json',
        result: '{"datatype":"CURR","length":13,"decimals":2}',
        panel: {
          title: 'Current domain',
          kind: 'table',
          items: [
            { label: 'Type', value: 'CURR', tone: 'neutral' },
            { label: 'Length', value: '13', tone: 'warn' },
            { label: 'Decimals', value: '2', tone: 'neutral' }
          ]
        },
        next: 'refs'
      },
      refs: {
        id: 'refs',
        type: 'tool',
        toolName: 'SAPNavigate',
        callId: 'refs-domain',
        args: { action: 'references', type: 'DOMA', name: 'ZARC1_DEMO_AMOUNT_DOM' },
        summary: 'ARC-1 follows the domain usage chain through data element, table, and report.',
        resultFormat: 'graph',
        result: 'ZARC1_DEMO_AMOUNT_DOM -> ZARC1_DEMO_AMOUNT -> ZARC1_DEMO_BUDGET -> ZARC1_DEMO_BUDGET_RPT',
        panel: {
          title: 'SAP dependency chain',
          kind: 'graph',
          items: [
            { label: 'Domain', value: 'ZARC1_DEMO_AMOUNT_DOM', tone: 'warn' },
            { label: 'Data element', value: 'ZARC1_DEMO_AMOUNT', tone: 'warn' },
            { label: 'Table', value: 'ZARC1_DEMO_BUDGET', tone: 'danger' },
            { label: 'Report', value: 'ZARC1_DEMO_BUDGET_RPT', tone: 'warn' }
          ]
        },
        next: 'decision'
      },
      decision: {
        id: 'decision',
        type: 'decision',
        prompt: 'Choose how Copilot should respond in Teams.',
        options: [
          {
            id: 'business',
            label: 'Draft Teams summary',
            description: 'Translate the SAP evidence into a business-readable answer.',
            recommended: true,
            next: 'business'
          },
          {
            id: 'technical',
            label: 'Show technical risks',
            description: 'Open the detailed risk list for the SAP team.',
            next: 'technical'
          }
        ]
      },
      business: {
        id: 'business',
        type: 'message',
        role: 'assistant',
        text:
          'The change is feasible but not isolated. It affects a domain, a data element, a budget table, and one report layout. The SAP team should plan activation order and check table locks before changing the domain.',
        next: 'done'
      },
      technical: {
        id: 'technical',
        type: 'panel',
        panel: {
          title: 'Technical risk list',
          kind: 'report',
          items: [
            { label: 'Activation order', value: 'Domain -> data element -> table -> report', tone: 'warn' },
            { label: 'Table conversion', value: 'Budget table may require lock/window', tone: 'danger' },
            { label: 'UI/report layout', value: 'Hardcoded output length must be reviewed', tone: 'warn' }
          ]
        },
        next: 'done'
      },
      done: {
        id: 'done',
        type: 'message',
        role: 'assistant',
        text: 'This is the end-user story: SharePoint explains the request, ARC-1 proves the real SAP blast radius.'
      }
    }
  },
  {
    id: 'outlook-dump-triage',
    title: 'Short dump triage from an Outlook mail',
    shortTitle: 'Dump triage',
    subtitle: 'Outlook replay where Copilot reads a weak support mail, checks ST22, and drafts a reply.',
    theme: 'outlook',
    group: 'Operations',
    audience: 'support',
    estimatedMinutes: 2,
    tags: ['Outlook', 'ST22', 'SAPDiagnose', 'Support'],
    outcome: 'Root cause, evidence, and a support reply drafted from SAP diagnostics.',
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        type: 'message',
        role: 'user',
        text: 'This overnight job short dumped. Can you investigate and draft a reply?',
        next: 'mail'
      },
      mail: {
        id: 'mail',
        type: 'panel',
        panel: {
          title: 'Outlook message',
          kind: 'email',
          eyebrow: 'From: operations@example.com',
          body:
            'Subject: Overnight ABAP dump in DEV\n\nZARC1_DEMO_DUMP_RPT failed around 02:13. ST22 should have the dump. Please check whether this is a code issue.'
        },
        next: 'dumps'
      },
      dumps: {
        id: 'dumps',
        type: 'tool',
        toolName: 'SAPDiagnose',
        callId: 'recent-dumps',
        args: { action: 'dumps', object: 'ZARC1_DEMO_DUMP_RPT' },
        summary: 'ARC-1 reads the recent dump list from the SAP system.',
        resultFormat: 'json',
        result: '{"program":"ZARC1_DEMO_DUMP_RPT","error":"DBSQL_SQL_ERROR","time":"02:13:42"}',
        panel: {
          title: 'ST22 evidence',
          kind: 'table',
          items: [
            { label: 'Program', value: 'ZARC1_DEMO_DUMP_RPT', tone: 'warn' },
            { label: 'Runtime error', value: 'DBSQL_SQL_ERROR', tone: 'danger' },
            { label: 'Time', value: '02:13:42', tone: 'neutral' }
          ]
        },
        next: 'source'
      },
      source: {
        id: 'source',
        type: 'tool',
        toolName: 'SAPRead',
        callId: 'read-dump-report',
        args: { type: 'PROG', name: 'ZARC1_DEMO_DUMP_RPT', grep: 'SELECT FROM \\(p_table\\)|p_table' },
        summary: 'ARC-1 reads the risky dynamic SELECT area, not the whole report.',
        resultFormat: 'text',
        result: 'SELECT * FROM (p_table) INTO TABLE @DATA(result).',
        panel: {
          title: 'Risky source line',
          kind: 'source',
          language: 'abap',
          code: "PARAMETERS p_table TYPE tabname.\n\nSELECT * FROM (p_table) INTO TABLE @DATA(result)."
        },
        next: 'decision'
      },
      decision: {
        id: 'decision',
        type: 'decision',
        prompt: 'Choose the support view.',
        options: [
          {
            id: 'reply',
            label: 'Draft Outlook reply',
            description: 'Write a clear reply with root cause and next action.',
            recommended: true,
            next: 'reply'
          },
          {
            id: 'patch',
            label: 'Show defensive patch',
            description: 'Show the simulated validation diff that would prevent this dump.',
            next: 'patch'
          }
        ]
      },
      reply: {
        id: 'reply',
        type: 'message',
        role: 'assistant',
        text:
          'Draft reply: I found a DBSQL_SQL_ERROR in ZARC1_DEMO_DUMP_RPT at 02:13. The report accepts a dynamic table name and executes SELECT FROM (p_table) without validating the input. This is a code issue. Recommended fix: validate the table name against DDIC metadata before the SELECT and return a controlled error for invalid input.',
        next: 'done'
      },
      patch: {
        id: 'patch',
        type: 'panel',
        panel: {
          title: 'Defensive validation diff',
          kind: 'diff',
          language: 'diff',
          code:
            '+SELECT SINGLE tabname FROM dd02l\n' +
            '+  WHERE tabname = @p_table AND as4local = @space\n' +
            '+  INTO @DATA(valid_table).\n' +
            '+IF sy-subrc <> 0.\n' +
            '+  MESSAGE e001(zarc1) WITH p_table.\n' +
            '+ENDIF.\n' +
            ' SELECT * FROM (p_table) INTO TABLE @DATA(result).'
        },
        next: 'done'
      },
      done: {
        id: 'done',
        type: 'message',
        role: 'assistant',
        text: 'Support users do not need ADT open to get the initial SAP evidence, but the fix still stays a human-reviewed development task.'
      }
    }
  },
  {
    id: 'teams-clean-core',
    title: 'Clean Core readiness in Teams',
    shortTitle: 'Clean Core',
    subtitle: 'Teams replay showing custom-code evidence, release state, and a modernization summary.',
    theme: 'teams',
    group: 'Governance',
    audience: 'architect',
    estimatedMinutes: 2,
    tags: ['Teams', 'Clean Core', 'ATC', 'API state'],
    outcome: 'A risk card with evidence and released successor suggestions.',
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        type: 'message',
        role: 'user',
        text: 'Is ZCL_ARC1_DEMO_CCORE clean-core ready?',
        next: 'read'
      },
      read: {
        id: 'read',
        type: 'tool',
        toolName: 'SAPRead',
        callId: 'read-clean-core',
        args: { type: 'CLAS', name: 'ZCL_ARC1_DEMO_CCORE', grep: 'SELECT|USR02|BUT000', context: 2 },
        summary: 'ARC-1 reads the relevant custom-code evidence.',
        resultFormat: 'text',
        result: 'SELECT * FROM usr02 ...\nSELECT * FROM but000 ...',
        panel: {
          title: 'Custom-code evidence',
          kind: 'source',
          language: 'abap',
          code:
            'SELECT SINGLE * FROM usr02 INTO @DATA(user_row) WHERE bname = @iv_user.\n' +
            'SELECT SINGLE * FROM but000 INTO @DATA(bp_row) WHERE partner = @iv_partner.'
        },
        next: 'api-state'
      },
      'api-state': {
        id: 'api-state',
        type: 'tool',
        toolName: 'SAPRead',
        callId: 'api-state',
        args: { type: 'API_STATE', name: 'USR02,BUT000' },
        summary: 'ARC-1 asks the SAP system for release-state evidence.',
        resultFormat: 'table',
        result: 'USR02: internal table, no released contract. BUT000: use released business partner API/view.',
        panel: {
          title: 'Release-state evidence',
          kind: 'table',
          items: [
            { label: 'USR02', value: 'Internal table; use I_BUSINESSUSERBASIC where applicable', tone: 'danger' },
            { label: 'BUT000', value: 'Prefer released business partner APIs/views', tone: 'warn' }
          ]
        },
        next: 'atc'
      },
      atc: {
        id: 'atc',
        type: 'tool',
        toolName: 'SAPDiagnose',
        callId: 'atc-clean-core',
        args: { action: 'atc', type: 'CLAS', name: 'ZCL_ARC1_DEMO_CCORE' },
        summary: 'ARC-1 adds SAP-side quality signals to the source evidence.',
        resultFormat: 'json',
        result: '{"findings":[],"variant":"DEFAULT"}',
        next: 'decision'
      },
      decision: {
        id: 'decision',
        type: 'decision',
        prompt: 'What should Teams show?',
        options: [
          {
            id: 'risk-card',
            label: 'Risk card',
            description: 'Show the concise architecture view.',
            recommended: true,
            next: 'risk-card'
          },
          {
            id: 'backlog',
            label: 'Backlog item',
            description: 'Turn the evidence into a modernization task.',
            next: 'backlog'
          }
        ]
      },
      'risk-card': {
        id: 'risk-card',
        type: 'panel',
        panel: {
          title: 'Clean Core risk card',
          kind: 'report',
          body: 'Not clean-core ready. The class directly reads internal SAP tables and should be refactored toward released APIs or released CDS views before a cloud-readiness target.',
          items: [
            { label: 'Risk', value: 'Direct table access', tone: 'danger' },
            { label: 'Evidence', value: 'USR02 and BUT000 reads', tone: 'warn' },
            { label: 'Next step', value: 'Replace with released APIs/views', tone: 'good' }
          ]
        },
        next: 'done'
      },
      backlog: {
        id: 'backlog',
        type: 'message',
        role: 'assistant',
        text:
          'Backlog item: Refactor ZCL_ARC1_DEMO_CCORE away from direct USR02/BUT000 reads. Acceptance: no direct internal SAP table reads, replacement uses released API/view where available, ATC stays clean, and behavior is covered by unit tests.',
        next: 'done'
      },
      done: {
        id: 'done',
        type: 'message',
        role: 'assistant',
        text: 'This is useful in Teams because the answer is evidence-backed, not a generic Clean Core explanation.'
      }
    }
  },
  {
    id: 'segw-to-rap-guided',
    title: 'SEGW to RAP guided modernization',
    shortTitle: 'SEGW to RAP',
    subtitle: 'Longer VS Code replay showing discovery, approval, generated RAP artifacts, and validation gates.',
    theme: 'vscode',
    group: 'Modernization',
    audience: 'developer',
    estimatedMinutes: 4,
    tags: ['VS Code', 'RAP', 'SEGW', 'Modernization'],
    outcome: 'A legacy OData V2 service becomes a planned RAP/OData V4 replacement.',
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        type: 'message',
        role: 'user',
        text: 'Migrate ZDEMO_MIG_PROJECTS_SRV from SEGW to RAP. Stop before writes and show the extracted model.',
        next: 'features'
      },
      features: {
        id: 'features',
        type: 'tool',
        toolName: 'SAPManage',
        callId: 'feature-probe',
        args: { action: 'features' },
        summary: 'ARC-1 probes the real backend before choosing a generation path.',
        resultFormat: 'json',
        result: '{"release":"7.58","rap":true,"serviceBinding":true,"transport":true}',
        panel: {
          title: 'System constraints',
          kind: 'table',
          items: [
            { label: 'ABAP release', value: '7.58', tone: 'neutral' },
            { label: 'RAP', value: 'available', tone: 'good' },
            { label: 'Service binding', value: 'available', tone: 'good' }
          ]
        },
        next: 'search'
      },
      search: {
        id: 'search',
        type: 'tool',
        toolName: 'SAPSearch',
        callId: 'search-segw',
        args: { query: 'ZDEMO_MIG_PROJECTS', searchType: 'object' },
        summary: 'ARC-1 discovers the generated SEGW classes and project objects.',
        resultFormat: 'table',
        result: 'ZCL_ZDEMO_MIG_PROJECTS_MPC, ZCL_ZDEMO_MIG_PROJECTS_DPC_EXT, ZDEMO_MIG_PROJECTS_SRV_0001.',
        next: 'read-mpc'
      },
      'read-mpc': {
        id: 'read-mpc',
        type: 'tool',
        toolName: 'SAPRead',
        callId: 'read-mpc',
        args: { type: 'CLAS', name: 'ZCL_ZDEMO_MIG_PROJECTS_MPC', method: 'DEFINE' },
        summary: 'ARC-1 reads the legacy service model from MPC.',
        resultFormat: 'text',
        result: 'Entities: ProjectSet, TaskSet, TimeEntrySet. Associations: Project->Tasks, Task->TimeEntries.',
        next: 'read-dpc'
      },
      'read-dpc': {
        id: 'read-dpc',
        type: 'tool',
        toolName: 'SAPRead',
        callId: 'read-dpc',
        args: { type: 'CLAS', name: 'ZCL_ZDEMO_MIG_PROJECTS_DPC_EXT', method: 'EXECUTE_ACTION' },
        summary: 'ARC-1 reads the behavior that matters, not only the metadata.',
        resultFormat: 'text',
        result: 'Function import ApproveProject updates status and commits directly.',
        panel: {
          title: 'Extracted legacy contract',
          kind: 'graph',
          items: [
            { label: 'Project', value: 'Root entity with Tasks navigation', tone: 'neutral' },
            { label: 'Task', value: 'Child entity with TimeEntries navigation', tone: 'neutral' },
            { label: 'ApproveProject', value: 'Function import -> RAP action', tone: 'warn' }
          ]
        },
        next: 'decision'
      },
      decision: {
        id: 'decision',
        type: 'decision',
        prompt: 'The replay reached the human approval gate.',
        options: [
          {
            id: 'plan',
            label: 'Show RAP plan',
            description: 'Continue to the generated artifact plan without applying writes.',
            recommended: true,
            next: 'plan'
          },
          {
            id: 'writes',
            label: 'Simulate writes',
            description: 'Show what ARC-1 would create after approval.',
            next: 'writes'
          }
        ]
      },
      plan: {
        id: 'plan',
        type: 'panel',
        panel: {
          title: 'RAP artifact plan',
          kind: 'table',
          items: [
            { label: 'ZI_DM_PROJECT / ZC_DM_PROJECT', value: 'interface + projection CDS', tone: 'good' },
            { label: 'ZI_DM_PROJECT BDEF', value: 'managed draft behavior', tone: 'good' },
            { label: 'approve_project', value: 'bound RAP action replacing function import', tone: 'good' },
            { label: 'ZUI_DM_PROJECTS_O4', value: 'OData V4 service binding', tone: 'good' }
          ]
        },
        next: 'done'
      },
      writes: {
        id: 'writes',
        type: 'tool',
        toolName: 'SAPWrite',
        callId: 'batch-create-rap',
        args: { action: 'batch_create', package: 'ZDEMO_MIG_RAP', activateAtEnd: true, objectCount: 14 },
        summary: 'After approval, ARC-1 can batch-create interdependent RAP artifacts and activate at the end.',
        resultFormat: 'text',
        result: 'Created 14 objects. Activation deferred until the complete RAP stack exists.',
        next: 'activate'
      },
      activate: {
        id: 'activate',
        type: 'tool',
        toolName: 'SAPActivate',
        callId: 'activate-rap',
        args: { objects: ['ZI_DM_PROJECT', 'ZC_DM_PROJECT', 'ZUI_DM_PROJECTS', 'ZUI_DM_PROJECTS_O4'] },
        summary: 'The generated stack is activated together so CDS and behavior dependencies resolve.',
        resultFormat: 'json',
        result: '{"status":"ok","activated":14}',
        next: 'done'
      },
      done: {
        id: 'done',
        type: 'message',
        role: 'assistant',
        text:
          'The important part is the workflow shape: discover the real legacy contract, stop for approval, then create and validate the RAP replacement in a controlled sequence.'
      }
    }
  },
  {
    id: 'github-abap-pr-review',
    title: 'Claude reviews an ABAP pull request with SAP context',
    shortTitle: 'PR review',
    subtitle: 'Claude/GitHub replay based on the ABAP CI/CD sample: activated source, syntax, ABAP Unit, ATC, and review evidence.',
    theme: 'claude',
    group: 'Build & Test',
    audience: 'developer',
    estimatedMinutes: 4,
    tags: ['Claude', 'GitHub', 'ABAP Unit', 'ATC'],
    outcome: 'A PR review that cites live SAP evidence instead of only reading the Git diff.',
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        type: 'message',
        role: 'user',
        text:
          'Review PR #20 in the ABAP CI/CD sample. The diff touches ZCL_ARC1_TEST_HELPERS and ZCL_ARC1_TASK_SERVICE. Use ARC-1 read-only context from SAP before commenting.',
        next: 'pr'
      },
      pr: {
        id: 'pr',
        type: 'panel',
        panel: {
          title: 'GitHub pull request',
          kind: 'document',
          eyebrow: 'arc-1-abap-cicd-review #20',
          body:
            'Changed files: src/zcl_arc1_test_helpers.clas.abap, src/zcl_arc1_task_service.clas.testclasses.abap. Local diff adds a helper for cancelled tasks and extends the ABAP Unit fixture. GitHub has the diff; ARC-1 checks what the SAP system has activated.'
        },
        next: 'read-service'
      },
      'read-service': {
        id: 'read-service',
        type: 'tool',
        toolName: 'SAPRead',
        callId: 'read-task-service-active',
        args: { type: 'CLAS', name: 'ZCL_ARC1_TASK_SERVICE', method: 'LIST_TASKS' },
        summary: 'ARC-1 reads the activated method from SAP so Claude can compare the PR against runtime truth.',
        resultFormat: 'text',
        result:
          'METHOD list_tasks. SELECT * FROM zarc1_t_task WHERE status IN @status_range INTO TABLE @rt_tasks. SORT rt_tasks BY priority due_date. ENDMETHOD.',
        panel: {
          title: 'Activated SAP source',
          kind: 'source',
          eyebrow: 'SAPRead(type="CLAS", method="LIST_TASKS")',
          language: 'abap',
          code:
            'METHOD list_tasks.\n' +
            '  SELECT * FROM zarc1_t_task\n' +
            '    WHERE status IN @status_range\n' +
            '    INTO TABLE @rt_tasks.\n' +
            '  SORT rt_tasks BY priority due_date.\n' +
            'ENDMETHOD.'
        },
        next: 'read-domain'
      },
      'read-domain': {
        id: 'read-domain',
        type: 'tool',
        toolName: 'SAPRead',
        callId: 'read-status-domain',
        args: { type: 'DOMA', name: 'ZARC1_D_STATUS' },
        summary: 'The review checks the domain values the helper is supposed to normalize.',
        resultFormat: 'table',
        result: 'Fixed values: A = Active, D = Done, X = Cancelled. Data element ZARC1_E_STATUS uses this domain.',
        panel: {
          title: 'Status contract',
          kind: 'table',
          eyebrow: 'SAPRead(type="DOMA")',
          items: [
            { label: 'A', value: 'Active', tone: 'good' },
            { label: 'D', value: 'Done', tone: 'good' },
            { label: 'X', value: 'Cancelled', tone: 'warn' }
          ]
        },
        next: 'syntax'
      },
      syntax: {
        id: 'syntax',
        type: 'tool',
        toolName: 'SAPDiagnose',
        callId: 'syntax-pr20',
        args: { action: 'syntax', type: 'CLAS', name: 'ZCL_ARC1_TEST_HELPERS' },
        summary: 'The review runs the SAP syntax check, not just abaplint.',
        resultFormat: 'json',
        result: '{"status":"ok","messages":[]}',
        panel: {
          title: 'SAP syntax check',
          kind: 'terminal',
          body: 'The changed helper class is syntactically valid in the target SAP system.',
          items: [{ label: 'Syntax', value: 'ok', tone: 'good' }]
        },
        next: 'unit'
      },
      unit: {
        id: 'unit',
        type: 'tool',
        toolName: 'SAPDiagnose',
        callId: 'unit-pr20',
        args: { action: 'unittest', type: 'CLAS', name: 'ZCL_ARC1_TEST_HELPERS' },
        summary: 'ARC-1 runs ABAP Unit in SAP for the changed class.',
        resultFormat: 'json',
        result:
          '{"class":"ZCL_ARC1_TEST_HELPERS","tests":7,"passed":7,"failed":0,"errors":0,"durationMs":814}',
        panel: {
          title: 'ABAP Unit result',
          kind: 'table',
          items: [
            { label: 'Tests', value: '7', tone: 'neutral' },
            { label: 'Passed', value: '7', tone: 'good' },
            { label: 'Failed', value: '0', tone: 'good' },
            { label: 'Errors', value: '0', tone: 'good' }
          ]
        },
        next: 'atc'
      },
      atc: {
        id: 'atc',
        type: 'tool',
        toolName: 'SAPDiagnose',
        callId: 'atc-pr20',
        args: { action: 'atc', type: 'CLAS', name: 'ZCL_ARC1_TEST_HELPERS', variant: 'DEFAULT' },
        summary: 'ATC is included as a deterministic SAP-side gate before the AI posts a review.',
        resultFormat: 'json',
        result:
          '{"variant":"DEFAULT","findings":[{"priority":"P3","object":"ZCL_ARC1_TEST_HELPERS","message":"Test helper has no production usage. Informational only."}]}',
        panel: {
          title: 'ATC review signal',
          kind: 'report',
          body:
            'The PR is not blocked. Claude can mention the P3 warning as low severity and avoid inventing a higher-risk issue.',
          items: [
            { label: 'P1/P2', value: '0', tone: 'good' },
            { label: 'P3', value: '1 informational', tone: 'warn' },
            { label: 'Merge gate', value: 'passes', tone: 'good' }
          ]
        },
        next: 'decision'
      },
      decision: {
        id: 'decision',
        type: 'decision',
        prompt: 'How should Claude finish the PR review?',
        options: [
          {
            id: 'review',
            label: 'Post review',
            description: 'Generate the evidence-backed pull request review.',
            recommended: true,
            next: 'review'
          },
          {
            id: 'dump',
            label: 'Check dumps',
            description: 'Show the operations follow-up path before posting.',
            next: 'dump'
          }
        ]
      },
      review: {
        id: 'review',
        type: 'message',
        role: 'assistant',
        text:
          'PR review: no blocking issue found. I checked activated ZCL_ARC1_TASK_SERVICE->LIST_TASKS, confirmed ZARC1_D_STATUS allows X = Cancelled, ran SAP syntax on ZCL_ARC1_TEST_HELPERS, and ran ABAP Unit with 7/7 passing tests. ATC reports one P3 informational finding on the test helper only. Suggested human check: keep the new cancelled-task fixture readable and ensure the PR description says why X is now covered.',
        next: 'done'
      },
      dump: {
        id: 'dump',
        type: 'tool',
        toolName: 'SAPDiagnose',
        callId: 'recent-dumps-pr20',
        args: { action: 'dumps', sinceHours: 24, package: 'ZARC1_DEMO' },
        summary: 'The same GitHub workflow pattern can attach ST22 evidence to a PR or issue.',
        resultFormat: 'json',
        result: '{"dumps":[],"windowHours":24,"package":"ZARC1_DEMO"}',
        panel: {
          title: 'ST22 follow-up',
          kind: 'table',
          items: [
            { label: 'Window', value: '24 hours', tone: 'neutral' },
            { label: 'Package', value: 'ZARC1_DEMO', tone: 'neutral' },
            { label: 'New dumps', value: '0', tone: 'good' }
          ]
        },
        next: 'review'
      },
      done: {
        id: 'done',
        type: 'message',
        role: 'assistant',
        text:
          'This scenario showcases the GitHub pattern from the sample repo: abapGit and abaplint cover the file workflow, while ARC-1 contributes activated source, SAP diagnostics, ATC, ABAP Unit, and ST22 evidence.'
      }
    }
  },
  {
    id: 'copilot-package-clean-core-backlog',
    title: 'Copilot turns package evidence into a Clean Core backlog',
    shortTitle: 'Package backlog',
    subtitle: 'Copilot replay for package-level Clean Core planning: enumerate objects, run ATC, read release state, and group backlog items.',
    theme: 'copilot',
    group: 'Governance',
    audience: 'architect',
    estimatedMinutes: 4,
    tags: ['Copilot', 'Clean Core', 'Package', 'Backlog'],
    outcome: 'A grouped modernization backlog with risk levels and SAP evidence.',
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        type: 'message',
        role: 'user',
        text:
          'Analyze package ZSD_LEGACY for Clean Core and ABAP Cloud risks. Do not change code. Group findings into a modernization backlog.',
        next: 'package'
      },
      package: {
        id: 'package',
        type: 'tool',
        toolName: 'SAPRead',
        callId: 'read-zsd-legacy-package',
        args: { type: 'DEVC', name: 'ZSD_LEGACY', includeSubpackages: true },
        summary: 'ARC-1 starts with package inventory, not a single hand-picked class.',
        resultFormat: 'table',
        result:
          '28 custom objects found: 9 CLAS, 3 INTF, 5 PROG, 6 DDLS, 2 TABL, 2 MSAG, 1 SRVD. 7 objects are in $TMP and need ownership cleanup.',
        panel: {
          title: 'Package inventory',
          kind: 'table',
          eyebrow: 'SAPRead(type="DEVC")',
          items: [
            { label: 'Objects', value: '28', tone: 'neutral' },
            { label: 'Development style', value: 'Classic + RAP mix', tone: 'warn' },
            { label: '$TMP leftovers', value: '7', tone: 'danger' }
          ]
        },
        next: 'atc'
      },
      atc: {
        id: 'atc',
        type: 'tool',
        toolName: 'SAPDiagnose',
        callId: 'atc-zsd-legacy',
        args: { action: 'atc', package: 'ZSD_LEGACY', variant: 'ABAP_CLOUD_READINESS' },
        summary: 'ATC gives the package-wide cloud-readiness signal used by the Clean Core skill.',
        resultFormat: 'json',
        result:
          '{"objectsChecked":28,"findings":[{"priority":"P1","count":3,"topic":"direct SAP table access"},{"priority":"P2","count":5,"topic":"unreleased APIs"},{"priority":"P3","count":11,"topic":"classic syntax and style"}]}',
        panel: {
          title: 'ATC package result',
          kind: 'report',
          items: [
            { label: 'P1', value: '3 direct SAP table accesses', tone: 'danger' },
            { label: 'P2', value: '5 unreleased API usages', tone: 'warn' },
            { label: 'P3', value: '11 style/readiness findings', tone: 'neutral' }
          ]
        },
        next: 'api-state'
      },
      'api-state': {
        id: 'api-state',
        type: 'tool',
        toolName: 'SAPRead',
        callId: 'api-state-zsd-legacy',
        args: { type: 'API_STATE', name: 'USR02,VBAK,VBAP,BUT000' },
        summary: 'ARC-1 reads release-state evidence so the backlog has successor direction.',
        resultFormat: 'table',
        result:
          'USR02: not released. VBAK/VBAP: direct table access not cloud-ready. BUT000: use released business partner APIs or released interface views where applicable.',
        panel: {
          title: 'Release-state evidence',
          kind: 'table',
          items: [
            { label: 'USR02', value: 'internal; replace with released user API/view', tone: 'danger' },
            { label: 'VBAK/VBAP', value: 'review against released sales APIs', tone: 'warn' },
            { label: 'BUT000', value: 'prefer released business partner views', tone: 'warn' }
          ]
        },
        next: 'where-used'
      },
      'where-used': {
        id: 'where-used',
        type: 'tool',
        toolName: 'SAPNavigate',
        callId: 'refs-risky-objects',
        args: { action: 'references', names: ['ZCL_SD_ORDER_READER', 'ZCL_SD_USER_LOOKUP'], depth: 2 },
        summary: 'Where-used evidence separates high-risk central utilities from isolated cleanup candidates.',
        resultFormat: 'graph',
        result:
          'ZCL_SD_ORDER_READER is used by three reports and one service. ZCL_SD_USER_LOOKUP is used by batch job ZSD_SYNC_USERS only.',
        panel: {
          title: 'Usage-driven priority',
          kind: 'graph',
          items: [
            { label: 'Central utility', value: 'ZCL_SD_ORDER_READER: 4 consumers', tone: 'danger' },
            { label: 'Isolated job', value: 'ZCL_SD_USER_LOOKUP: 1 consumer', tone: 'warn' },
            { label: 'Candidate retirement', value: '2 reports have no references', tone: 'good' }
          ]
        },
        next: 'decision'
      },
      decision: {
        id: 'decision',
        type: 'decision',
        prompt: 'Which artifact should Copilot show?',
        options: [
          {
            id: 'backlog',
            label: 'Backlog board',
            description: 'Group findings into execution-ready modernization items.',
            recommended: true,
            next: 'backlog'
          },
          {
            id: 'exec',
            label: 'Executive summary',
            description: 'Create a shorter Teams-ready summary.',
            next: 'exec'
          }
        ]
      },
      backlog: {
        id: 'backlog',
        type: 'panel',
        panel: {
          title: 'Modernization backlog',
          kind: 'report',
          body:
            'The backlog is grouped by fixability rather than by raw ATC severity. That makes the output useful for planning instead of a long finding dump.',
          items: [
            { label: 'Priority 1', value: 'Replace direct table readers in central utilities', tone: 'danger' },
            { label: 'Priority 2', value: 'Refactor unreleased API calls with released successors', tone: 'warn' },
            { label: 'Priority 3', value: 'Move $TMP objects into owned packages or retire', tone: 'warn' },
            { label: 'Priority 4', value: 'Investigate two apparently unused reports', tone: 'good' }
          ]
        },
        next: 'done'
      },
      exec: {
        id: 'exec',
        type: 'message',
        role: 'assistant',
        text:
          'Teams summary: ZSD_LEGACY is not clean-core ready yet. Highest risk is central direct table access in order and user lookup utilities. I recommend a two-sprint plan: first replace central readers with released APIs/views, then clean up ownership and likely-unused reports. No code was changed.',
        next: 'done'
      },
      done: {
        id: 'done',
        type: 'message',
        role: 'assistant',
        text:
          'This replay mirrors the package-level Clean Core skill: package inventory, ATC, API release state, where-used priority, then a human-owned backlog.'
      }
    }
  },
  {
    id: 'transport-release-risk',
    title: 'Teams release review for open SAP transports',
    shortTitle: 'Transport risk',
    subtitle: 'Release-manager replay that inventories modifiable transports, detects risky locks, and prepares a Teams release summary.',
    theme: 'teams',
    group: 'Operations',
    audience: 'release-manager',
    estimatedMinutes: 3,
    tags: ['Teams', 'Transport', 'Release', 'Risk'],
    outcome: 'A transport risk view before the release manager asks teams to release requests.',
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        type: 'message',
        role: 'user',
        text:
          'Before tomorrow morning release, show me open transports in DEV and the risky objects. I need a Teams summary, not raw CTS output.',
        next: 'overview'
      },
      overview: {
        id: 'overview',
        type: 'tool',
        toolName: 'SAPTransport',
        callId: 'open-transport-overview',
        args: { action: 'overview', status: 'modifiable', includeObjects: true },
        summary: 'ARC-1 reads the CTS inventory and groups transports by owner and risk.',
        resultFormat: 'table',
        result:
          '12 modifiable requests. 4 owned by SD team, 3 by FI team, 5 by platform. Risks: 2 stale requests older than 14 days, 1 object locked in two requests, 3 $TMP objects referenced by transportable code.',
        panel: {
          title: 'Open transport inventory',
          kind: 'transport',
          eyebrow: 'SAPTransport(action="overview")',
          items: [
            { label: 'Modifiable requests', value: '12', tone: 'warn' },
            { label: 'Stale requests', value: '2 older than 14 days', tone: 'danger' },
            { label: 'Duplicate locks', value: 'ZCL_SD_PRICING in two requests', tone: 'danger' }
          ]
        },
        next: 'history'
      },
      history: {
        id: 'history',
        type: 'tool',
        toolName: 'SAPTransport',
        callId: 'history-pricing',
        args: { action: 'history', object: { type: 'CLAS', name: 'ZCL_SD_PRICING' } },
        summary: 'Transport history explains whether a duplicate lock is harmless or a release conflict.',
        resultFormat: 'table',
        result:
          'ZCL_SD_PRICING appears in A4HK903812 (SD pricing fix, owner MEIER) and A4HK903799 (old migration cleanup, owner SCHULZ). Last changed 2026-06-19 and 2026-05-30.',
        panel: {
          title: 'Duplicate lock detail',
          kind: 'table',
          items: [
            { label: 'A4HK903812', value: 'Current SD pricing fix, changed 2026-06-19', tone: 'warn' },
            { label: 'A4HK903799', value: 'Old migration cleanup, changed 2026-05-30', tone: 'danger' },
            { label: 'Risk', value: 'Release order conflict', tone: 'danger' }
          ]
        },
        next: 'object-state'
      },
      'object-state': {
        id: 'object-state',
        type: 'tool',
        toolName: 'SAPDiagnose',
        callId: 'object-state-release',
        args: { action: 'object_state', objects: ['ZCL_SD_PRICING', 'ZSD_ORDER_RPT', 'ZCL_FI_TAX_HELPER'] },
        summary: 'ARC-1 checks activation state before the release manager asks teams to release requests.',
        resultFormat: 'json',
        result:
          '{"inactive":["ZSD_ORDER_RPT"],"syntaxErrors":[],"warnings":["ZCL_FI_TAX_HELPER generated warning in last check"]}',
        panel: {
          title: 'Release readiness checks',
          kind: 'report',
          items: [
            { label: 'Inactive object', value: 'ZSD_ORDER_RPT', tone: 'danger' },
            { label: 'Syntax errors', value: '0', tone: 'good' },
            { label: 'Warnings', value: '1 FI helper warning', tone: 'warn' }
          ]
        },
        next: 'decision'
      },
      decision: {
        id: 'decision',
        type: 'decision',
        prompt: 'What should the release manager send to Teams?',
        options: [
          {
            id: 'summary',
            label: 'Release summary',
            description: 'Prepare the channel update with owners and blockers.',
            recommended: true,
            next: 'summary'
          },
          {
            id: 'owner-list',
            label: 'Owner actions',
            description: 'Show the detailed owner-by-owner action list.',
            next: 'owner-list'
          }
        ]
      },
      summary: {
        id: 'summary',
        type: 'message',
        role: 'assistant',
        text:
          'Teams update: release is not ready yet. Please resolve three blockers before tomorrow: MEIER/SCHULZ need to decide ownership and release order for ZCL_SD_PRICING, SD team must activate ZSD_ORDER_RPT, and FI should review the warning on ZCL_FI_TAX_HELPER. No transport changes were made by this replay.',
        next: 'done'
      },
      'owner-list': {
        id: 'owner-list',
        type: 'panel',
        panel: {
          title: 'Owner action list',
          kind: 'transport',
          items: [
            { label: 'MEIER', value: 'Confirm A4HK903812 can wait for cleanup request or move object', tone: 'danger' },
            { label: 'SCHULZ', value: 'Close or release stale A4HK903799', tone: 'danger' },
            { label: 'SD team', value: 'Activate ZSD_ORDER_RPT before release cut', tone: 'danger' },
            { label: 'FI team', value: 'Review warning on ZCL_FI_TAX_HELPER', tone: 'warn' }
          ]
        },
        next: 'done'
      },
      done: {
        id: 'done',
        type: 'message',
        role: 'assistant',
        text:
          'This is a low-cost high-value operations demo: ARC-1 reads transport and activation evidence, then Teams gets a clear action list.'
      }
    }
  },
  {
    id: 'ui5-typescript-modernization',
    title: 'Modernize legacy UI5 after SEGW to RAP',
    shortTitle: 'UI5 modernization',
    subtitle: 'VS Code replay showing how ARC-1 anchors a UI5 TypeScript or Fiori Elements migration in the generated RAP service.',
    theme: 'vscode',
    group: 'Modernization',
    audience: 'developer',
    estimatedMinutes: 4,
    tags: ['VS Code', 'UI5', 'RAP', 'Fiori'],
    outcome: 'A UI migration plan tied to the real RAP service binding, projection entities, and legacy SEGW behavior.',
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        type: 'message',
        role: 'user',
        text:
          'The backend migration created ZUI_DM_PROJECTS_O4. Show how the legacy UI5 app maps to either Fiori Elements or a TypeScript freestyle app.',
        next: 'legacy'
      },
      legacy: {
        id: 'legacy',
        type: 'panel',
        panel: {
          title: 'Legacy UI5 scan',
          kind: 'document',
          eyebrow: 'legacy-ui5-app',
          body:
            'The app is a UI5 1.84 freestyle JavaScript master-detail app. It uses a hardcoded OData V2 model, ProjectSet -> Tasks navigation, Task -> TimeEntries navigation, and a function import ApproveProject.'
        },
        next: 'srvb'
      },
      srvb: {
        id: 'srvb',
        type: 'tool',
        toolName: 'SAPRead',
        callId: 'read-rap-service-binding',
        args: { type: 'SRVB', name: 'ZUI_DM_PROJECTS_O4' },
        summary: 'ARC-1 reads the V4 service binding that the UI migration must target.',
        resultFormat: 'json',
        result:
          '{"service":"ZUI_DM_PROJECTS","protocol":"OData V4","entities":["Project","Task","TimeEntry"],"bindingStatus":"published"}',
        panel: {
          title: 'Published RAP service',
          kind: 'table',
          items: [
            { label: 'Service binding', value: 'ZUI_DM_PROJECTS_O4', tone: 'good' },
            { label: 'Protocol', value: 'OData V4', tone: 'good' },
            { label: 'Entities', value: 'Project, Task, TimeEntry', tone: 'neutral' }
          ]
        },
        next: 'projection'
      },
      projection: {
        id: 'projection',
        type: 'tool',
        toolName: 'SAPRead',
        callId: 'read-project-projection',
        args: { type: 'DDLS', name: 'ZC_DM_PROJECT', include: 'elements' },
        summary: 'The replay reads the projection fields and association names before designing UI bindings.',
        resultFormat: 'table',
        result:
          'Fields: ProjectId, Name, Customer, Status, TotalBudget, Criticality. Associations: _Tasks. Actions exposed by behavior: approve_project.',
        panel: {
          title: 'Projection contract',
          kind: 'table',
          eyebrow: 'SAPRead(type="DDLS", include="elements")',
          items: [
            { label: 'Root entity', value: 'ZC_DM_PROJECT', tone: 'good' },
            { label: 'Navigation', value: '_Tasks, _TimeEntries', tone: 'warn' },
            { label: 'Action', value: 'approve_project', tone: 'good' }
          ]
        },
        next: 'legacy-action'
      },
      'legacy-action': {
        id: 'legacy-action',
        type: 'tool',
        toolName: 'SAPRead',
        callId: 'read-legacy-approve-action',
        args: { type: 'CLAS', name: 'ZCL_ZDEMO_MIG_PROJECTS_DPC_EXT', method: 'EXECUTE_ACTION' },
        summary: 'ARC-1 reads the old function-import behavior so the UI action is not guessed from the UI code alone.',
        resultFormat: 'text',
        result:
          'Legacy ApproveProject(ProjectId) validates status = DRAFT, updates ZDM_PROJECT-STATUS = APPROVED, and commits directly.',
        panel: {
          title: 'Action migration mapping',
          kind: 'report',
          body:
            'The V2 function import maps to the RAP bound action approve_project. The UI must call the V4 bound action, not recreate the old function-import URL.',
          items: [
            { label: 'Old UI call', value: '/ApproveProject(ProjectId=...)', tone: 'danger' },
            { label: 'New UI call', value: 'bound action approve_project', tone: 'good' },
            { label: 'Binding caveat', value: 'RAP associations use underscore names', tone: 'warn' }
          ]
        },
        next: 'decision'
      },
      decision: {
        id: 'decision',
        type: 'decision',
        prompt: 'Which UI target should the replay show?',
        options: [
          {
            id: 'fe',
            label: 'Fiori Elements',
            description: 'Use annotations and a generated LROP app when the UX is standard CRUD.',
            recommended: true,
            next: 'fe'
          },
          {
            id: 'ts',
            label: 'UI5 TypeScript',
            description: 'Use a freestyle TypeScript app when custom interaction stays important.',
            next: 'ts'
          }
        ]
      },
      fe: {
        id: 'fe',
        type: 'panel',
        panel: {
          title: 'Fiori Elements plan',
          kind: 'report',
          body:
            'Backend first: write @UI.HeaderInfo, @UI.LineItem, @UI.Facet, @Search, and action annotations to the RAP projections, activate them, republish the service binding, then let the Fiori MCP generator read the annotated metadata.',
          items: [
            { label: 'Annotations', value: 'ZME_DM_PROJECT, ZME_DM_TASK, ZME_DM_TIMEENTRY', tone: 'good' },
            { label: 'Service', value: 'Republish ZUI_DM_PROJECTS_O4', tone: 'warn' },
            { label: 'Custom code', value: 'Only extensions for behavior not covered by annotations', tone: 'good' }
          ]
        },
        next: 'done'
      },
      ts: {
        id: 'ts',
        type: 'panel',
        panel: {
          title: 'UI5 TypeScript plan',
          kind: 'report',
          body:
            'Freestyle path: scaffold UI5 1.147 TypeScript, move the OData V4 model into manifest.json, replace ProjectSet/Tasks bindings with Project/_Tasks, and replace the old function import with a V4 bound action execution.',
          items: [
            { label: 'Framework', value: 'SAPUI5 1.147 + TypeScript', tone: 'good' },
            { label: 'Routing', value: 'FlexibleColumnLayout with typed controllers', tone: 'good' },
            { label: 'Validation', value: 'Typecheck, UI5 linter, manifest validation, browser smoke', tone: 'warn' }
          ]
        },
        next: 'done'
      },
      done: {
        id: 'done',
        type: 'message',
        role: 'assistant',
        text:
          'This modernization scenario is valuable because ARC-1 keeps the UI migration anchored in the live RAP service contract instead of treating UI5 as a detached frontend rewrite.'
      }
    }
  },
  {
    id: 'analytics-star-schema',
    title: 'Generate a CDS analytics model from operational tables',
    shortTitle: 'Analytics model',
    subtitle: 'Copilot replay showing a governed analytics path: table inspection, reusable dimensions, cube generation, activation, and optional query.',
    theme: 'copilot',
    group: 'Analytics',
    audience: 'consultant',
    estimatedMinutes: 3,
    tags: ['Copilot', 'Analytics', 'CDS', 'SAPWrite'],
    outcome: 'A planned CDS star schema and query layer from SAP system metadata.',
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        type: 'message',
        role: 'user',
        text:
          'Create an analytics model for billing items. I want a cube with dimensions and a query, but show me the plan before any write.',
        next: 'table'
      },
      table: {
        id: 'table',
        type: 'tool',
        toolName: 'SAPRead',
        callId: 'read-billing-table',
        args: { type: 'TABL', name: 'ZBILLING_ITEM', include: 'fields' },
        summary: 'ARC-1 reads DDIC metadata before proposing analytical CDS artifacts.',
        resultFormat: 'table',
        result:
          'Fields: Client, BillingDocument, Item, CompanyCode, Customer, Currency, NetAmount, TaxAmount, BillingDate, Product.',
        panel: {
          title: 'Operational table metadata',
          kind: 'table',
          eyebrow: 'SAPRead(type="TABL")',
          items: [
            { label: 'Measures', value: 'NetAmount, TaxAmount', tone: 'good' },
            { label: 'Currency', value: 'Currency field available', tone: 'good' },
            { label: 'Dimensions', value: 'CompanyCode, Customer, Product, Date', tone: 'neutral' }
          ]
        },
        next: 'reuse'
      },
      reuse: {
        id: 'reuse',
        type: 'tool',
        toolName: 'SAPSearch',
        callId: 'search-analytics-dimensions',
        args: { query: 'I_CompanyCode I_Customer I_Product I_CalendarDate', searchType: 'object' },
        summary: 'The analytics skill prefers reusable released dimensions over inventing every view.',
        resultFormat: 'table',
        result:
          'Reusable views found: I_CompanyCode, I_Customer, I_Product, I_CalendarDate. No custom text view needed for CompanyCode.',
        panel: {
          title: 'Reusable dimension candidates',
          kind: 'table',
          items: [
            { label: 'Company', value: 'I_CompanyCode', tone: 'good' },
            { label: 'Customer', value: 'I_Customer', tone: 'good' },
            { label: 'Product', value: 'I_Product', tone: 'good' },
            { label: 'Date', value: 'I_CalendarDate', tone: 'good' }
          ]
        },
        next: 'decision'
      },
      decision: {
        id: 'decision',
        type: 'decision',
        prompt: 'The analytics plan is ready. What should the replay show next?',
        options: [
          {
            id: 'plan',
            label: 'Show plan only',
            description: 'Stop at a human approval artifact.',
            recommended: true,
            next: 'plan'
          },
          {
            id: 'create',
            label: 'Simulate create',
            description: 'Show the batch_create and activation sequence.',
            next: 'create'
          }
        ]
      },
      plan: {
        id: 'plan',
        type: 'panel',
        panel: {
          title: 'CDS analytics plan',
          kind: 'report',
          body:
            'The safe approval artifact lists every object before writes: interface cube ZI_BILLING_CUBE, projection cube ZC_BILLING_CUBE, optional text/dimension helpers only where released SAP views are missing, and query ZQ_BILLING_OVERVIEW.',
          items: [
            { label: 'Cube', value: 'ZI_BILLING_CUBE / ZC_BILLING_CUBE', tone: 'good' },
            { label: 'Measures', value: 'NetAmount, TaxAmount with currency semantics', tone: 'good' },
            { label: 'Dimensions', value: 'Reuse released I_* views', tone: 'good' }
          ]
        },
        next: 'done'
      },
      create: {
        id: 'create',
        type: 'tool',
        toolName: 'SAPWrite',
        callId: 'batch-create-analytics',
        args: {
          action: 'batch_create',
          package: 'ZANALYTICS',
          activateAtEnd: true,
          objects: ['ZI_BILLING_CUBE', 'ZC_BILLING_CUBE', 'ZQ_BILLING_OVERVIEW']
        },
        summary: 'Interdependent CDS objects are created together and activated at the end.',
        resultFormat: 'text',
        result: 'Created 3 DDLS objects. Activation deferred until the cube and query are both present.',
        next: 'activate'
      },
      activate: {
        id: 'activate',
        type: 'tool',
        toolName: 'SAPActivate',
        callId: 'activate-analytics',
        args: { objects: ['ZI_BILLING_CUBE', 'ZC_BILLING_CUBE', 'ZQ_BILLING_OVERVIEW'] },
        summary: 'Activation validates provider contracts and dependencies in SAP.',
        resultFormat: 'json',
        result: '{"status":"ok","activated":3,"warnings":[]}',
        panel: {
          title: 'Analytics activation result',
          kind: 'terminal',
          items: [
            { label: 'Activated', value: '3 DDLS objects', tone: 'good' },
            { label: 'Warnings', value: '0', tone: 'good' },
            { label: 'Next validation', value: 'Read query elements and run consumer smoke', tone: 'warn' }
          ]
        },
        next: 'done'
      },
      done: {
        id: 'done',
        type: 'message',
        role: 'assistant',
        text:
          'This replay turns the analytics skills into a product demo: inspect real table metadata, reuse released dimensions, stop for approval, and only then generate the analytical CDS stack.'
      }
    }
  }
];

export const defaultScenarioId = 'developer-dependency-map';

export function getScenario(id: string): Scenario | undefined {
  return scenarios.find((scenario) => scenario.id === id);
}
