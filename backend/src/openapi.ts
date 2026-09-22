export const openApiSpec = {
  openapi: '3.2.1',
  info: {
    title: 'LLM Chart Maker API',
    version: '1.0.0',
    description:
      'Generate, refine, fix, describe, and auto-suggest Mermaid diagrams from natural language.',
  },
  servers: [{ url: '/' }],
  security: [{ apiKey: [] }],
  paths: {
    '/health': {
      get: {
        summary: 'Health & runtime metrics',
        description: 'Reports service health, fallback mode, uptime, memory, and in-memory metrics.',
        responses: {
          '200': { description: 'Service healthy', content: { 'application/json': { schema: { $ref: '#/components/schemas/Health' } } } },
        },
      },
    },
    '/api/diagram': {
      post: {
        summary: 'Generate a diagram',
        description: 'Generate a Mermaid diagram from a natural-language description.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/DiagramRequest' } } } },
        responses: {
          '200': { description: 'Generated Mermaid code', content: { 'application/json': { schema: { type: 'object', properties: { mermaid: { type: 'string' } } } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '429': { description: 'Rate limited', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/refine': {
      post: {
        summary: 'Refine an existing diagram',
        description: 'Edit an existing diagram using a natural-language instruction.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RefineRequest' } } } },
        responses: {
          '200': { description: 'Refined Mermaid code', content: { 'application/json': { schema: { type: 'object', properties: { mermaid: { type: 'string' } } } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/fix': {
      post: {
        summary: 'Fix invalid Mermaid',
        description: 'Repair a Mermaid code block that failed to parse, given the error message.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/FixRequest' } } } },
        responses: {
          '200': { description: 'Fixed Mermaid code', content: { 'application/json': { schema: { type: 'object', properties: { mermaid: { type: 'string' } } } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/describe': {
      post: {
        summary: 'Describe a diagram',
        description: 'Return a natural-language summary of a Mermaid diagram.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/DescribeRequest' } } } },
        responses: {
          '200': { description: 'Diagram description', content: { 'application/json': { schema: { type: 'object', properties: { description: { type: 'string' } } } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/api/suggest-type': {
      post: {
        summary: 'Suggest a diagram type',
        description: 'Suggest the best diagram type for a given text description.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SuggestRequest' } } } },
        responses: {
          '200': { description: 'Type suggestion', content: { 'application/json': { schema: { $ref: '#/components/schemas/Suggestion' } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'API secret key required for all /api/* endpoints.',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          code: { type: 'string' },
          requestId: { type: 'string' },
        },
      },
      Health: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          fallback: { type: 'boolean' },
          uptime: { type: 'number' },
          memory: {
            type: 'object',
            properties: { rss: { type: 'number' }, heapUsed: { type: 'number' }, heapTotal: { type: 'number' } },
          },
          metrics: {
            type: 'object',
            properties: {
              totalRequests: { type: 'number' },
              fallbackCount: { type: 'number' },
              lastError: { type: 'object', nullable: true, properties: { message: { type: 'string' }, code: { type: 'string' }, statusCode: { type: 'number' }, path: { type: 'string' }, at: { type: 'string' } } },
              endpoints: { type: 'object', additionalProperties: { type: 'object', properties: { count: { type: 'number' }, errors: { type: 'number' }, lastMs: { type: 'number' } } } },
            },
          },
        },
      },
      DiagramRequest: {
        type: 'object',
        required: ['text'],
        properties: {
          diagramType: { type: 'string', enum: ['flowchart', 'gantt', 'timeline', 'er', 'gitgraph', 'mindmap', 'rules'] },
          direction: { type: 'string', enum: ['auto', 'TD', 'LR', 'RL', 'BT'] },
          text: { type: 'string' },
        },
      },
      RefineRequest: {
        type: 'object',
        required: ['currentDiagram', 'instruction', 'diagramType'],
        properties: {
          currentDiagram: { type: 'string' },
          instruction: { type: 'string' },
          diagramType: { type: 'string' },
        },
      },
      FixRequest: {
        type: 'object',
        required: ['mermaid', 'error'],
        properties: { mermaid: { type: 'string' }, error: { type: 'string' } },
      },
      DescribeRequest: {
        type: 'object',
        required: ['mermaid'],
        properties: { mermaid: { type: 'string' } },
      },
      SuggestRequest: {
        type: 'object',
        required: ['text'],
        properties: { text: { type: 'string' } },
      },
      Suggestion: {
        type: 'object',
        properties: {
          suggestedType: { type: 'string' },
          reason: { type: 'string' },
          confidence: { type: 'number' },
        },
      },
    },
  },
};
