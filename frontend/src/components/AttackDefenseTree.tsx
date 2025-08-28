import React, { useCallback, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType
} from 'reactflow';
import type { Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import type { AnalysisItem as RawAnalysisItem } from "../types/analysis";
import dagre from 'dagre';

// 扩展AnalysisItem类型
interface AnalysisItem extends RawAnalysisItem {
  summary: string;
  base?: string;
  side?: string;
}

interface Props {
  analysis: AnalysisItem[];
  currentTime: number;
  onNodeSelect?: (analysisId: string) => void;
  selectedId?: string;
}

const colorMap = {
  left: '#1976d2', // 正方
  right: '#d32f2f', // 反方
  attack: '#ff4444',
  defence: '#fbc02d',
  anchor: '#888',
  affirmation_left: '#5CA0A3',
  affirmation_right: '#E86B4B',
  support: '#44aa44'
};

function getSide(speaker: string) {
  return speaker.includes('正方') ? 'left' : 'right';
}

function parseTime(fs: string): number {
  const parts = fs.replace("[", "").replace("]", "").split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

const nodeWidth = 120, nodeHeight = 48;

const AttackDefenseTree: React.FC<Props> = ({ analysis, currentTime,  onNodeSelect, selectedId }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    // 1. 过滤可见节点
    const visible = analysis.filter(item => parseTime(item.global_fs) <= currentTime);
    
    // 2. Dagre自动布局
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 120 });

    // 锚点
    const anchorLeft = { id: 'anchor-left', data: { label: '正方' }, style: { background: colorMap.left, color: '#fff' } };
    const anchorRight = { id: 'anchor-right', data: { label: '反方' }, style: { background: colorMap.right, color: '#fff' } };
    dagreGraph.setNode(anchorLeft.id, { width: nodeWidth, height: nodeHeight });
    dagreGraph.setNode(anchorRight.id, { width: nodeWidth, height: nodeHeight });

    // 添加节点
    visible.forEach(item => {
      dagreGraph.setNode(String(item.analysis_id), { width: nodeWidth, height: nodeHeight });
    });

    // 添加边
    visible.forEach(item => {
      const side = getSide(item.speaker);
      item.side = side;
      // base边
      // if (item.base) {
      //   if (side === getSide(visible.find(item => item.analysis_id === item.base)?.speaker ?? '')) {
      //     dagreGraph.setEdge(String(item.base), String(item.analysis_id));
      //   } else {
      //     dagreGraph.setEdge(String(item.analysis_id), String(item.base));
      //   } 
      // }

      // if (item.target) {
      //   if (side === getSide(visible.find(item => item.analysis_id === item.target)?.speaker ?? '')) {
      //     dagreGraph.setEdge(String(item.target), String(item.analysis_id));
      //   } else {
      //     dagreGraph.setEdge(String(item.analysis_id), String(item.target))
      //   }
      // }
      if (item.base) {
        dagreGraph.setEdge(String(item.base), String(item.analysis_id));
      } else if (item.analysis_type === 'affirmation' || item.analysis_type === 'example' || item.analysis_type === 'definition') {
        // 无base的立论/定义/举例连到锚点
        dagreGraph.setEdge(side === 'left' ? anchorLeft.id : anchorRight.id, String(item.analysis_id));
      }
      // target边
      if (item.target) {
        dagreGraph.setEdge(String(item.analysis_id), String(item.target));
      }
    });

    dagre.layout(dagreGraph);

    // 3. 构建ReactFlow节点和边
    const reactFlowNodes: Node[] = [
      // { id: anchorLeft.id, data: anchorLeft.data, position: { x: 0, y: 0 }, type: 'default', style: { ...anchorLeft.style, width: nodeWidth, height: nodeHeight } },
      // { id: anchorRight.id, data: anchorRight.data, position: { x: 0, y: 0 }, type: 'default', style: { ...anchorRight.style, width: nodeWidth, height: nodeHeight } }
    ];
    const reactFlowEdges: Edge[] = [];

    visible.forEach(item => {
      const nodeId = String(item.analysis_id);
      const node = dagreGraph.node(nodeId);
      const side = getSide(item.speaker);
      const isExample = item.analysis_type === 'example';
      reactFlowNodes.push({
        id: nodeId,
        data: { label: item.summary, side },
        position: { x: node.x - nodeWidth / 2, y: node.y - nodeHeight / 2 },
        style: {
          background: colorMap[side],
          color: '#fff',
          width: nodeWidth,
          height: nodeHeight,
          border: selectedId === item.analysis_id ? '3px solid #ff9800' : '2px solid #333',
          opacity: isExample ? 0.6 : 1,
        },
        type: 'default',
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });

      if (item.base) {
        const baseItem = visible.find(baseItem => baseItem.analysis_id === item.base);
        const baseSide = getSide(baseItem?.speaker ?? '');
        
        if (side === baseSide) {
          // 同方：support，base指向当前节点
          reactFlowEdges.push({ 
            id: `base-${nodeId}`, 
            source: String(item.base), 
            target: nodeId, 
            type: 'bezier', 
            markerEnd: { type: MarkerType.ArrowClosed, color: colorMap['support'] }, 
            style: { stroke: colorMap['support'] } 
          });
        } else {
          // 对方：attack，当前节点指向base
          reactFlowEdges.push({ 
            id: `base-${nodeId}`, 
            source: nodeId, 
            target: String(item.base), 
            type: 'bezier', 
            markerEnd: { type: MarkerType.ArrowClosed, color: colorMap['attack'] }, 
            style: { stroke: colorMap['attack'] } 
          });
        } 
      }
      
      if (item.target) {
        const targetItem = visible.find(targetItem => targetItem.analysis_id === item.target);
        const targetSide = getSide(targetItem?.speaker ?? '');
        
        if (side === targetSide) {
          // 同方：support，当前节点指向target
          reactFlowEdges.push({ 
            id: `target-${nodeId}`, 
            source: nodeId, 
            target: String(item.target), 
            type: 'bezier', 
            markerEnd: { type: MarkerType.ArrowClosed, color: colorMap['support'] }, 
            style: { stroke: colorMap['support'] } 
          });
        } else {
          // 对方：attack，当前节点指向target
          reactFlowEdges.push({ 
            id: `target-${nodeId}`, 
            source: nodeId, 
            target: String(item.target), 
            type: 'bezier', 
            markerEnd: { type: MarkerType.ArrowClosed, color: colorMap['attack'] }, 
            style: { stroke: colorMap['attack'] } 
          });
        }
      }
      // base边
    //   if (item.base) {
    //     reactFlowEdges.push({ id: `base-${nodeId}`, source: String(item.base), target: nodeId, type: 'bezier', markerEnd: { type: MarkerType.ArrowClosed, color: colorMap[side] } });
    //   } else if (item.analysis_type === 'affirmation' || item.analysis_type === 'example' || item.analysis_type === 'definition') {
    //     let edgeColor = side === 'left' ? colorMap.affirmation_left : colorMap.affirmation_right;
    //     reactFlowEdges.push({ id: `anchor-${nodeId}`, source: side === 'left' ? anchorLeft.id : anchorRight.id, target: nodeId, type: 'bezier', style: { stroke: edgeColor }, markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor } });
    //   }
    //   // target边
    //   if (item.target) {
    //     const type = item.analysis_type as keyof typeof colorMap;
    //     reactFlowEdges.push({ id: `target-${nodeId}`, source: nodeId, target: String(item.target), type: 'bezier', animated: true, style: { stroke: colorMap[type], strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: colorMap[type] } });
    //   }
    });
    
    // 定位锚点
    // const leftAnchorNode = dagreGraph.node(anchorLeft.id);
    // const rightAnchorNode = dagreGraph.node(anchorRight.id);
    // reactFlowNodes[0].position = { x: leftAnchorNode.x - nodeWidth/2, y: leftAnchorNode.y - nodeHeight/2 };
    // reactFlowNodes[1].position = { x: rightAnchorNode.x - nodeWidth/2, y: rightAnchorNode.y - nodeHeight/2 };

    setNodes(reactFlowNodes);
    setEdges(reactFlowEdges);

  }, [analysis, currentTime, selectedId]);

  // 事件
  const onNodeClick = useCallback((_: any, node: Node) => {
    if (node.id !== 'anchor-left' && node.id !== 'anchor-right' && onNodeSelect) {
      onNodeSelect(node.id);
    }
  }, [onNodeSelect]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        onNodeClick={onNodeClick}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        minZoom={0.3}
        maxZoom={2}
      >
        <Background />
        <Controls />
        <MiniMap nodeColor={(n: any) => n.data?.side === 'left' ? colorMap.left : n.data?.side === 'right' ? colorMap.right : '#888'} />
      </ReactFlow>
    </div>
  );
};

export default AttackDefenseTree;