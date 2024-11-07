/*
Wrapper for OpenAI API tool description, example:
    {
      "function": {
        "description": "Search Google and return top 10 results",
        "name": "web_search",
        "parameters": {
          "properties": {
            "requestBody": {
              "type": "object",
              "required": [
                "query"
              ],
              "properties": {
                "query": {
                  "type": "string",
                  "example": "nice places to visit"
                }
              }
            }
          },
          "type": "object"
        }
      },
      "type": "function"
    }
 */

export interface ToolProperty {
  name: string;
  type: string;
  description: string;
}

export interface Tool {
  name: string;
  description: string;
  requiredProperties: string[];
  properties: ToolProperty[];
}

export function toolsToApiFormat(tools: Tool[] | undefined): any | null {
  if (!tools || !tools.length) {
    return null;
  }
  return tools.map(tool => {
    const properties: any = {};
    tool.properties.forEach(property => {
      properties[property.name] = {
        type: property.type,
        description: property.description,
      };
    });
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: properties,
          required: tool.requiredProperties,
        },
      },
    };
  });
}
