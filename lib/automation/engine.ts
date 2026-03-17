
import { AutomationRule } from '@/lib/db/automation-service';

export interface AutomationContext {
  sensorData?: Record<string, number>; // { temperature: 25, humidity: 60 }
  vlmResult?: {
    confidence: number;
    label: string;
    description: string;
  };
  timestamp: number;
}

export interface AutomationAction {
  type: string;
  params: Record<string, any>;
}

export class AutomationEngine {
  /**
   * Evaluate a rule against the current context
   */
  static evaluate(rule: AutomationRule | { graph_data: string, is_active: boolean }, context: AutomationContext): AutomationAction[] {
    if (!rule.is_active) return [];

    let graph;
    try {
      graph = typeof rule.graph_data === 'string' ? JSON.parse(rule.graph_data) : rule.graph_data;
    } catch (e) {
      console.error(`Failed to parse graph data`, e);
      return [];
    }

    const { nodes, edges } = graph;
    const actions: AutomationAction[] = [];

    // 1. Find Trigger Nodes
    const triggerNodes = nodes.filter((n: any) => n.type === 'triggerNode');

    for (const trigger of triggerNodes) {
      if (this.checkTrigger(trigger, context)) {
        // Trigger matched, traverse graph
        this.traverse(trigger.id, nodes, edges, context, actions);
      }
    }

    return actions;
  }

  /**
   * Force execution of all paths from triggers, bypassing trigger conditions
   */
  static forceExecute(graphData: any, context: AutomationContext): AutomationAction[] {
    const { nodes, edges } = graphData;
    const actions: AutomationAction[] = [];

    // 1. Try Trigger Nodes first
    let startNodes = nodes.filter((n: any) => n.type === 'triggerNode');

    // 2. If no triggers, find root nodes (nodes with no incoming edges)
    if (startNodes.length === 0) {
        // Find nodes that are not targets of any edge
        const targetIds = new Set(edges.map((e: any) => e.target));
        startNodes = nodes.filter((n: any) => !targetIds.has(n.id));
    }

    for (const node of startNodes) {
        this.traverse(node.id, nodes, edges, context, actions);
    }

    return actions;
  }

  private static checkTrigger(node: any, context: AutomationContext): boolean {
    const { type } = node.data;
    // Basic implementation assumes triggers are always active if data is present
    // In a real system, we'd check schedules, specific events, etc.
    return !!context.sensorData;
  }

  private static traverse(
    currentId: string, 
    nodes: any[], 
    edges: any[], 
    context: AutomationContext, 
    actions: AutomationAction[]
  ) {
    const currentNode = nodes.find(n => n.id === currentId);
    if (!currentNode) return;

    // If current node is action node, add it
    if (currentNode.type === 'actionNode') {
        // Enhance action with context info for smart notifications
        const enhancedParams = {
            ...currentNode.data,
            _context: {
                sensorData: context.sensorData,
                triggerId: currentId,
                timestamp: context.timestamp
            }
        };
        actions.push({
            type: currentNode.data.type,
            params: enhancedParams
        });
        return; // Leaf node
    }

    // Find outgoing edges
    const outgoingEdges = edges.filter((e: any) => e.source === currentId);

    for (const edge of outgoingEdges) {
      const targetNode = nodes.find((n: any) => n.id === edge.target);
      if (!targetNode) continue;

      // Check logic if target is logic node
      if (targetNode.type === 'logicNode') {
        if (this.evaluateLogic(targetNode, context)) {
          this.traverse(targetNode.id, nodes, edges, context, actions);
        }
      } else {
          // Direct connection to action or other node
          this.traverse(targetNode.id, nodes, edges, context, actions);
      }
    }
  }

  private static evaluateLogic(node: any, context: AutomationContext): boolean {
    const { type } = node.data;
    const config = node.data.config || node.data; // Fallback to root data if config missing

    if (type === 'compare') {
        const threshold = parseFloat(config.value || config.threshold || '0');
        const operator = config.operator || 'gt';
        
        // Use the sensor from config (e.g. 'co2', 'temp'), default to 'temperature'
        const variable = config.sensor || 'temperature';
        
        // Map sensor alias to sensorData keys
        const sensorKeyMap: Record<string, string> = {
            'temp': 'temperature',
            'hum': 'humidity',
            'soil': 'soil_moisture',
            'co2': 'co2',
            // Add more mappings if needed
        };
        
        const dataKey = sensorKeyMap[variable] || variable;
        const val = context.sensorData?.[dataKey] ?? 0;

        // Store evaluation result in context for smart notification usage later if needed
        // (This simple implementation doesn't pass modified context down, but could be enhanced)

        switch (operator) {
            case 'gt': return val > threshold;
            case 'lt': return val < threshold;
            case 'eq': return val == threshold; // Loose equality for string/number mix
            case 'gte': return val >= threshold;
            case 'lte': return val <= threshold;
            default: return false;
        }
    }

    if (type === 'range') {
        const min = parseFloat(config.min || '-Infinity');
        const max = parseFloat(config.max || 'Infinity');
        
        // Use the sensor from config
        const variable = config.sensor || 'temperature';
        
        // Map sensor alias to sensorData keys
        const sensorKeyMap: Record<string, string> = {
            'temp': 'temperature',
            'hum': 'humidity',
            'soil': 'soil_moisture',
            'co2': 'co2',
        };
        
        const dataKey = sensorKeyMap[variable] || variable;
        const val = context.sensorData?.[dataKey] ?? 0;
        
        return val > min && val < max;
    }

    if (type === 'condition') {
        // AND / OR logic would require multiple inputs. 
        // Graph traversal here is DFS. Handling multi-input AND is complex in DFS.
        // For MVP, treat 'condition' as a pass-through or simple check.
        return true; 
    }
    
    // Pass through for unknown logic
    return true;
  }
}
