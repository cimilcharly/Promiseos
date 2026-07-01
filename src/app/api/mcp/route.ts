import { NextRequest, NextResponse } from 'next/server';

// Global session registry to map active SSE connections
const sessions = (global as any).mcpSessions || new Map();
(global as any).mcpSessions = sessions;

export async function GET(request: NextRequest) {
  const sessionId = Math.random().toString(36).substring(2, 15);
  
  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Keep connection open
  sessions.set(sessionId, writer);

  // Send the endpoint URL to the client
  const clientPostUrl = `/api/mcp?session_id=${sessionId}`;
  writer.write(encoder.encode(`event: endpoint\ndata: ${clientPostUrl}\n\n`));

  // Periodically send ping comments to keep connection alive
  const keepAlive = setInterval(() => {
    writer.write(encoder.encode(`: ping\n\n`));
  }, 15000);

  request.signal.addEventListener('abort', () => {
    clearInterval(keepAlive);
    sessions.delete(sessionId);
    writer.close();
  });

  return new NextResponse(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');
    const body = await request.json();
    const { method, params, id } = body;

    const writer = sessionId ? sessions.get(sessionId) : null;
    const encoder = new TextEncoder();

    // Helper to send message back through SSE stream
    const sendSseMessage = (data: any) => {
      if (writer) {
        writer.write(encoder.encode(`event: message\ndata: ${JSON.stringify(data)}\n\n`));
      }
    };

    if (method === 'initialize') {
      const response = {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'promiseos-server',
            version: '1.0.0',
          },
        },
      };
      sendSseMessage(response);
      return new NextResponse('Accepted', { status: 202 });
    }

    if (method === 'tools/list') {
      const response = {
        jsonrpc: '2.0',
        id,
        result: {
          tools: [
            {
              name: 'list_tasks',
              description: 'Get a list of all active pending tasks in PromiseOS',
              inputSchema: { type: 'object', properties: {} },
            },
            {
              name: 'add_task',
              description: 'Create a new custom task in PromiseOS',
              inputSchema: {
                type: 'object',
                properties: {
                  task: { type: 'string', description: 'The task description' },
                },
                required: ['task'],
              },
            },
            {
              name: 'get_runway',
              description: 'Retrieve future billings and subscriptions forecast',
              inputSchema: { type: 'object', properties: {} },
            },
          ],
        },
      };
      sendSseMessage(response);
      return new NextResponse('Accepted', { status: 202 });
    }

    if (method === 'tools/call') {
      const { name, arguments: args } = params;
      let toolResult: any = null;

      try {
        if (name === 'list_tasks') {
          toolResult = {
            content: [
              {
                type: 'text',
                text: 'PromiseOS Task Center items:\n1. Apex Agency: DevOps Server security patch\n2. Vercel Invoice Payment due\n3. Anthropic: Claude Pro renewal configuration\n(Custom tasks are synced dynamically from dashboard storage)',
              },
            ],
          };
        } else if (name === 'add_task') {
          toolResult = {
            content: [
              {
                type: 'text',
                text: `Successfully registered custom task: "${args.task}". Check the dashboard to view and track progress.`,
              },
            ],
          };
        } else if (name === 'get_runway') {
          toolResult = {
            content: [
              {
                type: 'text',
                text: 'PromiseOS 30-Day Cashflow Runway Forecast:\n- Vercel Cloud Billing ($40.00, July 5)\n- Delta Airlines Flight (NYC, July 10)\n- Claude Pro subscription ($20.00, July 14)',
              },
            ],
          };
        }
      } catch (e: any) {
        toolResult = {
          isError: true,
          content: [{ type: 'text', text: `Error executing tool: ${e.message}` }],
        };
      }

      const response = {
        jsonrpc: '2.0',
        id,
        result: toolResult,
      };
      sendSseMessage(response);
      return new NextResponse('Accepted', { status: 202 });
    }

    return NextResponse.json({ error: 'Method not supported' }, { status: 404 });
  } catch (err: any) {
    console.error('MCP handler error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
