import type { Scenario } from './types';

export const scenarios: Scenario[] = [
  {
    id: 'developer-dependency-map',
    title: 'Understand a class before changing it',
    shortTitle: 'Class dependencies',
    subtitle: 'VS Code replay showing SAPContext, dependency contracts, source grep, and where-used context.',
    theme: 'vscode',
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
  }
];

export const defaultScenarioId = 'developer-dependency-map';

export function getScenario(id: string): Scenario | undefined {
  return scenarios.find((scenario) => scenario.id === id);
}
