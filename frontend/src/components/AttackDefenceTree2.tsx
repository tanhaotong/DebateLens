import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import dagre from 'dagre';
import type { AnalysisItem } from '../types/analysis';

interface TreeNode {
  id: string;
  summary: string;
  speaker: string;
  analysis_type: string;
  content: string;
  technique: string;
  target: string | null;
  base: string | null;
  goal: string;
  pros_gain: number;
  cons_gain: number;
  children: TreeNode[];
  side: 'left' | 'right';
  isAnchor: boolean;
  value?: number;
}

interface Props {
  analysis: any;
  currentTime: number;
  onNodeSelect?: (analysisId: string) => void;
  selectedId?: string;
}

function parseTime(fs: string): number {
  const parts = fs.replace('[', '').replace(']', '').split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

const colorMap = {
  left: '#1976d2',
  right: '#d32f2f',
  anchor_left: '#e3f2fd',
  anchor_right: '#ffebee',
  attack: '#e53935',
  defence: '#fbc02d',
  affirmation: '#4caf50',
  example: '#ff9800',
  definition: '#9c27b0',
};

function getSide(speaker: string): 'left' | 'right' {
  return speaker && speaker.includes('正方') ? 'left' : 'right';
}

const AttackDefenceTree2: React.FC<Props> = ({ analysis, currentTime, onNodeSelect, selectedId }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 解析分析数据
  const analysisRaw: AnalysisItem[] = useMemo(() => {
    if (!analysis) return [];
    let arr: AnalysisItem[] = [];
    if (Array.isArray(analysis)) {
      if (analysis.length === 0) return [];
      if ('data' in analysis[0]) {
        arr = analysis.map((d: any) => d.data).filter(Boolean);
      } else if ('analysis_id' in analysis[0]) {
        arr = analysis as AnalysisItem[];
      }
    } else if ('analysis' in analysis && Array.isArray(analysis.analysis)) {
      arr = analysis.analysis as AnalysisItem[];
    }
    return arr.map(a => ({ 
      ...a, 
      pros_gain: a.pros_gain ?? 0, 
      cons_gain: a.cons_gain ?? 0 
    }));
  }, [analysis]);

  // 按时间过滤可见的分析
  const visibleAnalysis = useMemo(() => {
    return analysisRaw.filter(a => parseTime(a.global_fs) <= currentTime);
  }, [analysisRaw, currentTime]);

  // 检查数据是否真正改变
  const prevVisibleAnalysisRef = useRef<AnalysisItem[]>([]);
  const hasDataChanged = useMemo(() => {
    const prev = prevVisibleAnalysisRef.current;
    const current = visibleAnalysis;
    
    if (prev.length !== current.length) {
      prevVisibleAnalysisRef.current = current;
      return true;
    }
    
    // 检查每个节点的关键属性是否改变
    for (let i = 0; i < current.length; i++) {
      const prevItem = prev[i];
      const currentItem = current[i];
      
      if (!prevItem || 
          prevItem.analysis_id !== currentItem.analysis_id ||
          prevItem.summary !== currentItem.summary ||
          prevItem.target !== currentItem.target ||
          prevItem.base !== currentItem.base) {
        prevVisibleAnalysisRef.current = current;
        return true;
      }
    }
    
    return false;
  }, [visibleAnalysis]);

  // 递归加分函数（与AttackDefenceBubble保持一致）
  function addScore(node: any, delta: number) {
    node.value = Math.max(0, Math.min(100, node.value + delta));
    if (node.parent) addScore(node.parent, delta);
  }

  // 构建树形数据
  const treeData = useMemo(() => {
    if (!visibleAnalysis.length) {
      return {
        leftTree: { 
          id: 'anchor-left', 
          summary: '正方', 
          speaker: '正方',
          analysis_type: 'anchor',
          content: '',
          technique: '',
          target: null,
          base: null,
          goal: '',
          pros_gain: 0,
          cons_gain: 0,
          children: [], 
          side: 'left' as const, 
          isAnchor: true,
          value: 50
        },
        rightTree: { 
          id: 'anchor-right', 
          summary: '反方', 
          speaker: '反方',
          analysis_type: 'anchor',
          content: '',
          technique: '',
          target: null,
          base: null,
          goal: '',
          pros_gain: 0,
          cons_gain: 0,
          children: [], 
          side: 'right' as const, 
          isAnchor: true,
          value: 50
        }
      };
    }

    // 创建节点映射
    const nodeMap = new Map<string, TreeNode>();
    
    // 创建锚点
    const leftAnchor: TreeNode = {
      id: 'anchor-left',
      summary: '正方',
      speaker: '正方',
      analysis_type: 'anchor',
      content: '',
      technique: '',
      target: null,
      base: null,
      goal: '',
      pros_gain: 0,
      cons_gain: 0,
      children: [],
      side: 'left',
      isAnchor: true,
    };
    
    const rightAnchor: TreeNode = {
      id: 'anchor-right',
      summary: '反方',
      speaker: '反方',
      analysis_type: 'anchor',
      content: '',
      technique: '',
      target: null,
      base: null,
      goal: '',
      pros_gain: 0,
      cons_gain: 0,
      children: [],
      side: 'right',
      isAnchor: true,
    };

    nodeMap.set('anchor-left', leftAnchor);
    nodeMap.set('anchor-right', rightAnchor);

    // 创建所有节点
    visibleAnalysis.forEach(item => {
      const node: TreeNode = {
        id: String(item.analysis_id),
        summary: item.summary ?? '',
        speaker: item.speaker ?? '',
        analysis_type: item.analysis_type ?? '',
        content: item.content ?? '',
        technique: item.technique ?? '',
        target: item.target ? String(item.target) : null,
        base: item.base ? String(item.base) : null,
        goal: item.goal ?? '',
        pros_gain: Number(item.pros_gain) || 0,
        cons_gain: Number(item.cons_gain) || 0,
        children: [],
        side: getSide(item.speaker),
        isAnchor: false,
      };
      nodeMap.set(String(item.analysis_id), node);
    });

    // 建立父子关系
    visibleAnalysis.forEach(item => {
      const node = nodeMap.get(String(item.analysis_id));
      if (!node) return;

      let parent: TreeNode | null = null;

      // 优先连接到base
      if (item.base && nodeMap.has(String(item.base))) {
        parent = nodeMap.get(String(item.base))!;
      }
      // 其次连接到target
      else if (item.target && nodeMap.has(String(item.target))) {
        parent = nodeMap.get(String(item.target))!;
      }
      // 最后连接到锚点
      else {
        parent = node.side === 'left' ? leftAnchor : rightAnchor;
      }

      if (parent) {
        parent.children.push(node);
      }
    });

    // 计算节点分数（与AttackDefenceBubble保持一致）
    const tempIdMap: Record<string, any> = {};
    
    // 初始化临时节点
    visibleAnalysis.forEach(item => {
      const node = {
        id: String(item.analysis_id),
        value: 50, // INIT_SCORE
        side: getSide(item.speaker),
        pros_gain: Number(item.pros_gain) || 0,
        cons_gain: Number(item.cons_gain) || 0,
        target: item.target ? String(item.target) : null,
        parent: null as any,
      };
      tempIdMap[String(item.analysis_id)] = node;
    });

    // 建立临时父子关系
    visibleAnalysis.forEach(item => {
      const node = tempIdMap[String(item.analysis_id)];
      if (!node) return;

      if (item.base && tempIdMap[String(item.base)]) {
        node.parent = tempIdMap[String(item.base)];
      } else if (item.target && tempIdMap[String(item.target)]) {
        node.parent = tempIdMap[String(item.target)];
      }
    });
    
    // 应用评分逻辑计算value
    visibleAnalysis.forEach(item => {
      const pros = Number(item.pros_gain) || 0;
      const cons = Number(item.cons_gain) || 0;
      const isLeft = item.speaker && item.speaker.includes('正方');
      const isRight = item.speaker && item.speaker.includes('反方');
      
      if (isLeft) {
        addScore(tempIdMap[String(item.analysis_id)], pros);
        if (item.target && tempIdMap[String(item.target)]) {
          addScore(tempIdMap[String(item.target)], cons);
        } else {
          // 没有target时，对另一方分数变化乘以0.6
          Object.values(tempIdMap).forEach(n => {
            if (n.side === 'right') addScore(n, cons * 0.6);
          });
        }
      }
      
      if (isRight) {
        addScore(tempIdMap[String(item.analysis_id)], cons);
        if (item.target && tempIdMap[String(item.target)]) {
          addScore(tempIdMap[String(item.target)], pros);
        } else {
          // 没有target时，对另一方分数变化乘以0.6
          Object.values(tempIdMap).forEach(n => {
            if (n.side === 'left') addScore(n, pros * 0.6);
          });
        }
      }
    });

    // 更新树节点的value值
    visibleAnalysis.forEach(item => {
      const treeNode = nodeMap.get(String(item.analysis_id));
      const tempNode = tempIdMap[String(item.analysis_id)];
      if (treeNode && tempNode) {
        treeNode.value = tempNode.value;
      }
    });

    return {
      leftTree: leftAnchor,
      rightTree: rightAnchor,
    };
  }, [visibleAnalysis]);

  // 渲染树形图
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    
    // 如果数据没有真正改变，不重新渲染
    if (!hasDataChanged) return;

    const container = containerRef.current;
    const svg = d3.select(svgRef.current);
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 清空SVG
    svg.selectAll("*").remove();

    // 创建缩放行为
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom as any);

    // 创建主容器组
    const g = svg.append("g");

    const nodeWidth = 120;
    const nodeHeight = 60;

    // 使用dagre进行布局
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ 
      rankdir: 'LR', 
      nodesep: 80, 
      ranksep: 120,
      align: 'DL'
    });
    
    // 设置锚点的约束，确保它们在最左和最右
    dagreGraph.setNode('anchor-left', { 
      width: nodeWidth, 
      height: nodeHeight
    });
    dagreGraph.setNode('anchor-right', { 
      width: nodeWidth, 
      height: nodeHeight
    });



    // 添加所有节点
    visibleAnalysis.forEach(item => {
      dagreGraph.setNode(String(item.analysis_id), { width: nodeWidth, height: nodeHeight });
    });

    // 添加边 - 采用与ArgumentMap相同的箭头逻辑
    visibleAnalysis.forEach(item => {
      const nodeId = String(item.analysis_id);
      const side = getSide(item.speaker);
      
      // 检查target关系
      if (item.target && visibleAnalysis.some(a => String(a.analysis_id) === String(item.target))) {
        const targetId = String(item.target);
        const targetItem = visibleAnalysis.find(a => String(a.analysis_id) === String(item.target));
        if (targetItem) {
          const targetSide = getSide(targetItem.speaker);
          if (targetSide === side) {
            // 己方节点：从target指向当前节点，绿色
            dagreGraph.setEdge(targetId, nodeId);
          } else {
            // 对方节点：从当前节点指向target，红色
            dagreGraph.setEdge(nodeId, targetId);
          }
        }
      }
      
      // 检查base关系
      if (item.base && visibleAnalysis.some(a => String(a.analysis_id) === String(item.base))) {
        const baseId = String(item.base);
        const baseItem = visibleAnalysis.find(a => String(a.analysis_id) === String(item.base));
        if (baseItem) {
          const baseSide = getSide(baseItem.speaker);
          if (baseSide === side) {
            // 己方节点：从base指向当前节点，绿色
            dagreGraph.setEdge(baseId, nodeId);
          } else {
            // 对方节点：从当前节点指向base，红色
            dagreGraph.setEdge(nodeId, baseId);
          }
        }
      }
      
      // 如果既没有target也没有base，连接到己方锚点
      if (!item.target && !item.base) {
        const anchorId = side === 'left' ? 'anchor-left' : 'anchor-right';
        dagreGraph.setEdge(anchorId, nodeId);
      }
    });

    // 计算布局
    dagre.layout(dagreGraph);

    // 获取所有节点和边的位置
    const nodes: any[] = [];
    const edges: any[] = [];

    // 收集节点位置
    dagreGraph.nodes().forEach(nodeId => {
      const node = dagreGraph.node(nodeId);
      nodes.push({
        id: nodeId,
        x: node.x,
        y: node.y,
        width: node.width,
        height: node.height
      });
    });



    // 收集边
    dagreGraph.edges().forEach(edge => {
      const edgeData = dagreGraph.edge(edge);
      edges.push({
        source: edge.v,
        target: edge.w,
        points: edgeData.points
      });
    });

    // 绘制连接线
    g.append("g")
      .selectAll("path")
      .data(edges)
      .enter().append("path")
      .attr("d", (d: any) => {
        if (d.points && d.points.length > 0) {
          const points = d.points.map((p: any) => [p.x, p.y]);
          return d3.line()(points as any);
        } else {
          const sourceNode = nodes.find(n => n.id === d.source);
          const targetNode = nodes.find(n => n.id === d.target);
          if (sourceNode && targetNode) {
            return `M${sourceNode.x},${sourceNode.y}L${targetNode.x},${targetNode.y}`;
          }
          return '';
        }
      })
      .attr("fill", "none")
      .attr("stroke", (d: any) => {
        // 根据连接方向判断颜色：从己方指向己方为绿色，从己方指向对方为红色
        const sourceNode = visibleAnalysis.find(a => String(a.analysis_id) === d.source);
        const targetNode = visibleAnalysis.find(a => String(a.analysis_id) === d.target);
        
        if (sourceNode && targetNode) {
          // 两个都是分析节点
          const sourceSide = getSide(sourceNode.speaker);
          const targetSide = getSide(targetNode.speaker);
          
          if (sourceSide === targetSide) {
            return '#44aa44'; // 绿色 - 己方支持己方
          } else {
            return '#ff4444'; // 红色 - 己方攻击对方
          }
        } else if (targetNode) {
          // 从锚点到分析节点（锚点总是己方）
          const targetSide = getSide(targetNode.speaker);
          const anchorSide = d.source === 'anchor-left' ? 'left' : 'right';
          
          if (targetSide === anchorSide) {
            return '#44aa44'; // 绿色 - 锚点支持己方
          } else {
            return '#ff4444'; // 红色 - 锚点攻击对方
          }
        } else if (sourceNode) {
          // 从分析节点到锚点
          const sourceSide = getSide(sourceNode.speaker);
          const anchorSide = d.target === 'anchor-left' ? 'left' : 'right';
          
          if (sourceSide === anchorSide) {
            return '#44aa44'; // 绿色 - 己方支持锚点
          } else {
            return '#ff4444'; // 红色 - 己方攻击锚点
          }
        }
        
        return '#44aa44'; // 默认绿色（锚点之间的连接）
      })
      .attr("stroke-width", 2)
      .attr("opacity", 0.6)
      .attr("marker-end", "url(#arrowhead)");

    // 添加箭头标记
    g.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#888");

    // 创建节点组
    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .enter().append("g")
      .attr("class", "node")
      .attr("transform", (d: any) => `translate(${d.x - d.width/2},${d.y - d.height/2})`);

    // 添加节点背景
    node.append("rect")
      .attr("width", (d: any) => d.width)
      .attr("height", (d: any) => d.height)
      .attr("rx", 8)
      .attr("ry", 8)
      .attr("fill", (d: any) => {
        if (d.id === 'anchor-left') return colorMap.anchor_left;
        if (d.id === 'anchor-right') return colorMap.anchor_right;
        const analysisItem = visibleAnalysis.find(a => String(a.analysis_id) === d.id);
        if (analysisItem) {
          const side = getSide(analysisItem.speaker);
          return side === 'left' ? colorMap.left : colorMap.right;
        }
        return '#ccc';
      })
      .attr("stroke", (d: any) => {
        if (d.id === selectedId) return '#ff9800';
        return '#333';
      })
      .attr("stroke-width", (d: any) => d.id === selectedId ? 3 : 2)
      .attr("opacity", (d: any) => {
        if (d.id === 'anchor-left' || d.id === 'anchor-right') return 0.8;
        return 1; // 所有分析节点都使用相同透明度
      });

    // 添加节点文本
    node.append("text")
      .text((d: any) => {
        if (d.id === 'anchor-left') return '正方';
        if (d.id === 'anchor-right') return '反方';
        const analysisItem = visibleAnalysis.find(a => String(a.analysis_id) === d.id);
        return analysisItem?.summary || '';
      })
      .attr("x", (d: any) => d.width / 2)
      .attr("y", (d: any) => d.height / 2 - 5)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("fill", "#fff")
      .attr("pointer-events", "none");

    // 添加分数文本
    node.append("text")
      .text((d: any) => {
        if (d.id === 'anchor-left' || d.id === 'anchor-right') return '';
        const analysisItem = visibleAnalysis.find(a => String(a.analysis_id) === d.id);
        return analysisItem ? `(${Math.round((analysisItem as any).value || 50)})` : '';
      })
      .attr("x", (d: any) => d.width / 2)
      .attr("y", (d: any) => d.height / 2 + 10)
      .attr("text-anchor", "middle")
      .attr("font-size", "9px")
      .attr("font-weight", "bold")
      .attr("fill", "#fff")
      .attr("pointer-events", "none");

    // 添加点击事件
    node.on("click", (_, d: any) => {
      if (onNodeSelect && d.id !== 'anchor-left' && d.id !== 'anchor-right') {
        onNodeSelect(d.id);
      }
    });

    // 自动适应视图
    setTimeout(() => {
      const bounds = g.node()?.getBBox();
      if (bounds) {
        const scale = Math.min(width / bounds.width, height / bounds.height) * 0.8;
        const transform = d3.zoomIdentity
          .translate(width / 2 - (bounds.x + bounds.width / 2) * scale, 
                    height / 2 - (bounds.y + bounds.height / 2) * scale)
          .scale(scale);
        svg.call(zoom.transform as any, transform);
      }
    }, 100);

  }, [treeData, onNodeSelect, selectedId, visibleAnalysis, hasDataChanged]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <svg
        ref={svgRef}
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        }}
      />
    </div>
  );
};

export default AttackDefenceTree2; 