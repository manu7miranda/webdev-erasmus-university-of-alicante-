const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  terminal: false
});

const TOOLS = [
  {
    name: 'find_lecture',
    description: 'Finds and retrieves course lecture details by its lecture number. Returns the title and topics.',
    inputSchema: {
      type: 'object',
      properties: {
        number: {
          type: 'number',
          description: 'The sequential number of the course lecture to look up.'
        }
      },
      required: ['number']
    }
  },
  {
    name: 'ping_server',
    description: 'Pings the MCP server to verify that the communication channel and standard input/output are operational.',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'An optional greeting or ping string to echo back.'
        }
      }
    }
  }
];

rl.on('line', (line) => {
  console.error('got: ' + line);

  const msg = JSON.parse(line);

  // 1. Handshake inicial
  if (msg.method === 'initialize') {
    const response = {
      jsonrpc: '2.0',
      id: msg.id,
      result: {
        protocolVersion: msg.params.protocolVersion,
        capabilities: { tools: {} },
        serverInfo: {
          name: 'my-server',
          version: '1.0.0'
        }
      }
    };
    return console.log(JSON.stringify(response));
  }

  // 2. Notificación
  if (msg.method === 'notifications/initialized') {
    return;
  }

  // 3. Catálogo de herramientas
  if (msg.method === 'tools/list') {
    const response = {
      jsonrpc: '2.0',
      id: msg.id,
      result: {
        tools: TOOLS
      }
    };
    return console.log(JSON.stringify(response));
  }

  // 4. Ejecución de herramientas
  if (msg.method === 'tools/call') {
    const toolName = msg.params?.name;

    if (toolName === 'find_lecture') {
      const lecturesFilePath = path.join(__dirname, 'lectures.json');
      const lectures = JSON.parse(fs.readFileSync(lecturesFilePath, 'utf8'));
      const targetNumber = msg.params?.arguments?.number;
      const lecture = lectures.find((l) => l.number === targetNumber);

      // Caso 1: Error si no existe la lección
      if (!lecture) {
        const response = {
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            content: [
              {
                type: 'text',
                text: `Lecture ${targetNumber} not found.`
              }
            ],
            isError: true
          }
        };
        return console.log(JSON.stringify(response));
      }

      // Caso éxito
      const topicsText = Array.isArray(lecture.topics)
        ? lecture.topics.join(', ')
        : lecture.topics;

      const response = {
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          content: [
            {
              type: 'text',
              text: `Lecture ${lecture.number}: ${lecture.title}. Topics: ${topicsText}`
            }
          ],
          isError: false
        }
      };
      return console.log(JSON.stringify(response));
    }

    if (toolName === 'ping_server') {
      const response = {
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          content: [
            {
              type: 'text',
              text: msg.params?.arguments?.message || 'pong'
            }
          ],
          isError: false
        }
      };
      return console.log(JSON.stringify(response));
    }

    // Caso 2: Herramienta desconocida
    const errorResponse = {
      jsonrpc: '2.0',
      id: msg.id,
      error: {
        code: -32602,
        message: `Unknown tool: ${toolName}`
      }
    };
    return console.log(JSON.stringify(errorResponse));
  }

  // Caso 3: Cualquier otro método desconocido que lleve 'id'
  if (msg.id !== undefined) {
    const errorResponse = {
      jsonrpc: '2.0',
      id: msg.id,
      error: {
        code: -32601,
        message: `Unknown method: ${msg.method}`
      }
    };
    return console.log(JSON.stringify(errorResponse));
  }
});